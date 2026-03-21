import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SyncPullRequestDto, SyncPushRequestDto, SyncMutationDto } from './dto/sync.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

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
                AND: [
                  { changed_at: lastTimestamp },
                  { id: { gt: lastId } },
                ],
              },
            ],
          },
          { entity: { in: allowedEntities } },
        ],
      },
      orderBy: [
        { changed_at: 'asc' },
        { id: 'asc' },
      ],
      take: batch_size,
    });

    const hasMore = logs.length === batch_size;
    const newCursor = logs.length > 0 ? {
      last_changed_at: logs[logs.length - 1].changed_at.toISOString(),
      last_id: logs[logs.length - 1].id.toString(),
    } : { last_changed_at, last_id };

    // Fetch the actual data
    const results = await Promise.all(logs.map(async (log) => {
      const data = await (this.prisma[this.mapEntityToModel(log.entity)] as any).findUnique({
        where: { id: log.entity_id },
      });
      return {
        log_id: log.id.toString(),
        entity: log.entity,
        entity_id: log.entity_id,
        operation: log.operation,
        data: data || { deleted: true },
      };
    }));

    return {
      items: results,
      new_cursor: newCursor,
      has_more: hasMore,
    };
  }

  async pushMutations(dto: SyncPushRequestDto, userId: string) {
    const pushResults: any[] = [];
    const { mutations, device_id } = dto;

    for (const mutation of mutations) {
      const result = await this.processSingleMutation(mutation, userId, device_id);
      pushResults.push(result);
    }

    return {
      processedMutationIds: pushResults.filter(r => r.status === 'SUCCESS').map(r => r.mutation_id),
      conflicts: pushResults.filter(r => r.status === 'CONFLICT'),
      validationErrors: pushResults.filter(r => r.status === 'ERROR'),
    };
  }

  private async processSingleMutation(mutation: SyncMutationDto, userId: string, deviceId: string) {
    // 1. Check idempotency
    const existing = await this.prisma.syncMutationLog.findUnique({
      where: { mutation_id: mutation.mutation_id },
    });

    if (existing) {
      return {
        mutation_id: mutation.mutation_id,
        status: existing.status,
        response: existing.response_payload,
      };
    }

    // 2. Log pending
    await this.prisma.syncMutationLog.create({
      data: {
        mutation_id: mutation.mutation_id,
        entity: 'unknown', // Should be determined from endpoint
        entity_id: 'unknown',
        user_id: userId,
        client_id: deviceId,
        action: mutation.method,
        request_payload: mutation.payload as any,
        response_payload: {} as any,
        status: 'PENDING',
        processed_at: new Date(),
      },
    });

    try {
      const response = await this.executeLogic(mutation, userId);

      await this.prisma.syncMutationLog.update({
        where: { mutation_id: mutation.mutation_id },
        data: {
          status: 'SUCCESS',
          response_payload: response as any,
          processed_at: new Date(),
        },
      });

      return { mutation_id: mutation.mutation_id, status: 'SUCCESS', response };
    } catch (error) {
      this.logger.error(`Mutation ${mutation.mutation_id} failed: ${error.message}`);
      
      const status = error instanceof ConflictException ? 'CONFLICT' : 'ERROR';
      
      await this.prisma.syncMutationLog.update({
        where: { mutation_id: mutation.mutation_id },
        data: {
          status,
          response_payload: { message: error.message } as any,
          processed_at: new Date(),
        },
      });

      return { 
        mutation_id: mutation.mutation_id, 
        status, 
        message: error.message 
      };
    }
  }

  private async executeLogic(mutation: SyncMutationDto, userId: string) {
    // Basic mapping for demo/POC
    // In production, use a registry or dynamic dispatcher
    return { success: true };
  }

  private mapEntityToModel(entity: string): string {
    const mapping: Record<string, string> = {
      'areas': 'area',
      'machines': 'machine',
      'work_orders': 'workOrder',
      'clises': 'clise',
      'dies': 'die',
      'stock_items': 'stockItem',
      'print_reports': 'printReport',
      'diecut_reports': 'diecutReport',
      'incidents': 'incident',
    };
    return mapping[entity] || entity;
  }

  private getAllowedEntitiesForProfile(profile: string, scopes?: string[]): string[] {
    const allSourcedEntities = [
      'areas', 'machines', 'shifts', 'users', 'roles', 'permissions',
      'work_orders', 'clises', 'dies', 'racks', 'stock_items',
      'print_reports', 'print_activities', 'diecut_reports', 'diecut_activities',
      'incidents', 'capa_actions'
    ];

    if (profile === 'PRINT_STATION') {
      return ['areas', 'machines', 'shifts', 'users', 'work_orders', 'clises', 'print_reports', 'print_activities', 'incidents'];
    }

    if (profile === 'DIECUT_STATION') {
      return ['areas', 'machines', 'shifts', 'users', 'work_orders', 'dies', 'diecut_reports', 'diecut_activities', 'incidents'];
    }

    if (profile === 'WAREHOUSE') {
      return ['areas', 'users', 'clises', 'dies', 'racks', 'stock_items'];
    }

    // Default or SUPERVISOR can see everything
    return allSourcedEntities;
  }
}
