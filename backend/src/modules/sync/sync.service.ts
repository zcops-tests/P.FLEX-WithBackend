import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  SyncPullRequestDto,
  SyncPushRequestDto,
  SyncMutationDto,
} from './dto/sync.dto';

type SyncMutationStatus = 'SUCCESS' | 'CONFLICT' | 'ERROR';

interface ParsedSyncMutation {
  normalizedEndpoint: string;
  entity: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly syncEndpointMap: Record<string, string> = {
    'work-orders': 'work_orders',
    'quality/incidents': 'incidents',
    'quality/capa-actions': 'capa_actions',
    'production/printing/reports': 'print_reports',
    'production/diecutting/reports': 'diecut_reports',
    'production/rewinding/reports': 'rewind_reports',
    'production/packaging/reports': 'packaging_reports',
    'inventory/stock': 'stock_items',
    'inventory/clises': 'clises',
    'inventory/dies': 'dies',
  };

  constructor(
    private prisma: PrismaService,
    // We could use HttpService to re-route push mutations to actual controllers
    // or call services directly. Calling services is safer/faster.
  ) {}

  async pullChanges(dto: SyncPullRequestDto) {
    const { last_changed_at, last_id, batch_size = 1000, scopes } = dto;

    // Strong cursor implementation: (changed_at > last_changed_at) OR (changed_at == last_changed_at AND id > last_id)
    // Profile-based filtering logic
    const profile = dto.device_profile || 'DEFAULT';
    const allowedEntities = this.getAllowedEntitiesForProfile(profile, scopes);

    const lastTimestamp = new Date(last_changed_at);
    const lastId = BigInt(last_id || '0');

    const logs = await this.prisma.changeLog.findMany({
      where: {
        AND: [
          {
            OR: [
              { changed_at: { gt: lastTimestamp } },
              {
                AND: [{ changed_at: lastTimestamp }, { id: { gt: lastId } }],
              },
            ],
          },
          { entity: { in: allowedEntities } },
        ],
      },
      orderBy: [{ changed_at: 'asc' }, { id: 'asc' }],
      take: batch_size,
    });

    const hasMore = logs.length === batch_size;
    const newCursor =
      logs.length > 0
        ? {
            last_changed_at: logs[logs.length - 1].changed_at.toISOString(),
            last_id: logs[logs.length - 1].id.toString(),
          }
        : { last_changed_at, last_id };

    // Fetch the actual data
    const results = await Promise.all(
      logs.map(async (log) => {
        const model = this.mapEntityToModel(log.entity);
        const delegate = this.prisma[model] as
          | {
              findUnique?: (args: {
                where: { id: string };
              }) => Promise<unknown>;
            }
          | undefined;
        const data = delegate?.findUnique
          ? await delegate.findUnique({ where: { id: log.entity_id } })
          : null;

        return {
          log_id: log.id.toString(),
          entity: log.entity,
          entity_id: log.entity_id,
          operation: log.operation,
          data: data || { deleted: true },
        };
      }),
    );

    return {
      items: results,
      new_cursor: newCursor,
      has_more: hasMore,
    };
  }

  async getStatus() {
    const [
      latestChange,
      latestMutation,
      pendingMutations,
      issues,
      pendingCount,
      conflictCount,
      errorCount,
    ] = await Promise.all([
      this.prisma.changeLog.findFirst({
        orderBy: [{ changed_at: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.syncMutationLog.findFirst({
        orderBy: { processed_at: 'desc' },
      }),
      this.prisma.syncMutationLog.findMany({
        where: { status: 'PENDING' },
        orderBy: { processed_at: 'desc' },
        take: 10,
      }),
      this.prisma.syncMutationLog.findMany({
        where: { status: { in: ['CONFLICT', 'REJECTED'] } },
        orderBy: { processed_at: 'desc' },
        take: 10,
      }),
      this.prisma.syncMutationLog.count({ where: { status: 'PENDING' } }),
      this.prisma.syncMutationLog.count({ where: { status: 'CONFLICT' } }),
      this.prisma.syncMutationLog.count({ where: { status: 'REJECTED' } }),
    ]);

    return {
      connected: true,
      last_server_change_at: latestChange?.changed_at?.toISOString() || null,
      last_sync_activity_at:
        latestMutation?.processed_at?.toISOString() ||
        latestChange?.changed_at?.toISOString() ||
        null,
      counts: {
        pending: pendingCount,
        conflicts: conflictCount,
        errors: errorCount,
      },
      pending_mutations: pendingMutations.map((item) => ({
        mutation_id: item.mutation_id,
        entity: item.entity,
        entity_id: item.entity_id,
        action: item.action,
        client_id: item.client_id,
        processed_at: item.processed_at.toISOString(),
      })),
      issues: issues.map((item) => ({
        mutation_id: item.mutation_id,
        entity: item.entity,
        entity_id: item.entity_id,
        action: item.action,
        client_id: item.client_id,
        status: item.status,
        message: this.extractPayloadMessage(item.response_payload),
        processed_at: item.processed_at.toISOString(),
      })),
    };
  }

  async pushMutations(dto: SyncPushRequestDto, userId: string) {
    const pushResults: Array<{
      mutation_id: string;
      status: SyncMutationStatus;
      response?: any;
      message?: string;
    }> = [];
    const { mutations, device_id } = dto;

    for (const mutation of mutations) {
      const result = await this.processSingleMutation(
        mutation,
        userId,
        device_id,
      );
      pushResults.push(result);
    }

    return {
      processedMutationIds: pushResults
        .filter((r) => r.status === 'SUCCESS')
        .map((r) => r.mutation_id),
      conflicts: pushResults.filter((r) => r.status === 'CONFLICT'),
      validationErrors: pushResults.filter((r) => r.status === 'ERROR'),
    };
  }

  private async processSingleMutation(
    mutation: SyncMutationDto,
    userId: string,
    deviceId: string,
  ) {
    const metadata = this.parseMutationMetadata(mutation);

    // 1. Check idempotency
    const existing = await this.prisma.syncMutationLog.findUnique({
      where: { mutation_id: mutation.mutation_id },
    });

    if (existing) {
      return {
        mutation_id: mutation.mutation_id,
        status: this.mapStoredStatusToResponseStatus(existing.status),
        response: existing.response_payload,
      } as const;
    }

    // 2. Log pending
    await this.prisma.syncMutationLog.create({
      data: {
        mutation_id: mutation.mutation_id,
        entity: metadata.entity,
        entity_id: metadata.entityId,
        user_id: userId,
        client_id: deviceId,
        action: metadata.action,
        request_payload: mutation.payload,
        response_payload: {} as any,
        status: 'PENDING',
        processed_at: new Date(),
      },
    });

    try {
      const response = await this.executeLogic(mutation, userId, metadata);

      await this.prisma.syncMutationLog.update({
        where: { mutation_id: mutation.mutation_id },
        data: {
          status: 'PROCESSED',
          response_payload: response as any,
          processed_at: new Date(),
        },
      });

      return {
        mutation_id: mutation.mutation_id,
        status: 'SUCCESS' as const,
        response,
      };
    } catch (error) {
      this.logger.error(
        `Mutation ${mutation.mutation_id} failed: ${error.message}`,
      );

      const status = error instanceof ConflictException ? 'CONFLICT' : 'ERROR';
      const logStatus =
        error instanceof ConflictException ? 'CONFLICT' : 'REJECTED';

      await this.prisma.syncMutationLog.update({
        where: { mutation_id: mutation.mutation_id },
        data: {
          status: logStatus,
          response_payload: { message: error.message } as any,
          processed_at: new Date(),
        },
      });

      return {
        mutation_id: mutation.mutation_id,
        status: status as SyncMutationStatus,
        message: error.message,
      };
    }
  }

  private async executeLogic(
    mutation: SyncMutationDto,
    userId: string,
    metadata: ParsedSyncMutation,
  ) {
    return {
      success: true,
      accepted: true,
      deferred: true,
      endpoint: metadata.normalizedEndpoint,
      entity: metadata.entity,
      entity_id: metadata.entityId,
      action: metadata.action,
      requested_by: userId,
      client_timestamp: mutation.client_timestamp,
    };
  }

  private mapEntityToModel(entity: string): string {
    const mapping: Record<string, string> = {
      areas: 'area',
      machines: 'machine',
      work_orders: 'workOrder',
      clises: 'clise',
      dies: 'die',
      stock_items: 'stockItem',
      print_reports: 'printReport',
      diecut_reports: 'diecutReport',
      rewind_reports: 'rewindReport',
      packaging_reports: 'packagingReport',
      incidents: 'incident',
    };
    return mapping[entity] || entity;
  }

  private getAllowedEntitiesForProfile(
    profile: string,
    scopes?: string[],
  ): string[] {
    const allSourcedEntities = [
      'areas',
      'machines',
      'shifts',
      'users',
      'roles',
      'permissions',
      'work_orders',
      'clises',
      'dies',
      'racks',
      'stock_items',
      'print_reports',
      'print_activities',
      'diecut_reports',
      'diecut_activities',
      'rewind_reports',
      'packaging_reports',
      'incidents',
      'capa_actions',
    ];

    let allowedEntities = allSourcedEntities;

    if (profile === 'PRINT_STATION') {
      allowedEntities = [
        'areas',
        'machines',
        'shifts',
        'users',
        'work_orders',
        'clises',
        'print_reports',
        'print_activities',
        'incidents',
      ];
    }
    if (profile === 'DIECUT_STATION') {
      allowedEntities = [
        'areas',
        'machines',
        'shifts',
        'users',
        'work_orders',
        'dies',
        'diecut_reports',
        'diecut_activities',
        'incidents',
      ];
    }
    if (profile === 'FINISHING_STATION') {
      allowedEntities = [
        'areas',
        'machines',
        'shifts',
        'users',
        'work_orders',
        'rewind_reports',
        'packaging_reports',
        'stock_items',
        'incidents',
      ];
    }
    if (profile === 'WAREHOUSE') {
      allowedEntities = [
        'areas',
        'users',
        'clises',
        'dies',
        'racks',
        'stock_items',
        'packaging_reports',
      ];
    }

    if (!scopes?.length) {
      return allowedEntities;
    }

    const requestedScopes = new Set(scopes);
    return allowedEntities.filter((entity) => requestedScopes.has(entity));
  }

  private parseMutationMetadata(mutation: SyncMutationDto): ParsedSyncMutation {
    const normalizedEndpoint = this.normalizeEndpoint(mutation.endpoint);
    const resourcePath = normalizedEndpoint.replace(/^\/api\/v\d+\//, '');
    const matchedBasePath = Object.keys(this.syncEndpointMap)
      .sort((a, b) => b.length - a.length)
      .find(
        (candidate) =>
          resourcePath === candidate ||
          resourcePath.startsWith(`${candidate}/`),
      );

    if (!matchedBasePath) {
      throw new BadRequestException(
        `Endpoint ${normalizedEndpoint} is not enabled for sync mutations`,
      );
    }

    const resourceSegments = resourcePath.split('/').filter(Boolean);
    const baseSegments = matchedBasePath.split('/');
    const suffixSegments = resourceSegments.slice(baseSegments.length);
    const explicitEntityId = this.extractEntityId(suffixSegments);
    const payloadId = this.extractPayloadId(mutation.payload);

    return {
      normalizedEndpoint,
      entity: this.syncEndpointMap[matchedBasePath],
      entityId: explicitEntityId || payloadId || 'pending',
      action: this.mapMethodToAction(mutation.method),
    };
  }

  private normalizeEndpoint(endpoint: string) {
    const [rawPath] = endpoint.trim().split('?');
    return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  }

  private extractEntityId(segments: string[]) {
    const dynamicSegment = segments.find(
      (segment) =>
        !['status', 'lock', 'unlock', 'complete', 'capa'].includes(segment),
    );
    return dynamicSegment || null;
  }

  private extractPayloadId(payload: Record<string, unknown>) {
    const payloadId = payload?.id;
    return typeof payloadId === 'string' && payloadId.length > 0
      ? payloadId
      : null;
  }

  private mapMethodToAction(method: string): ParsedSyncMutation['action'] {
    if (method === 'POST') return 'CREATE';
    if (method === 'DELETE') return 'DELETE';
    return 'UPDATE';
  }

  private mapStoredStatusToResponseStatus(status: string): SyncMutationStatus {
    if (status === 'CONFLICT') {
      return 'CONFLICT';
    }
    if (status === 'REJECTED') {
      return 'ERROR';
    }
    return 'SUCCESS';
  }

  private extractPayloadMessage(payload: unknown) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return '';
    }

    const message = (payload as Record<string, unknown>).message;
    return typeof message === 'string' ? message : '';
  }
}
