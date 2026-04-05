import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { WorkOrderStatus } from './dto/work-order.dto';

type WorkOrderRecord = Record<string, any>;

function createPrismaMock(
  initialOrders: WorkOrderRecord[] = [],
  activeManagementIds: string[] = [],
) {
  const state = {
    workOrders: initialOrders.map((item) => ({ ...item })),
    activeManagementIds: new Set(activeManagementIds),
  };

  const applyData = (target: WorkOrderRecord, data: Record<string, any>) => {
    const next = { ...target };
    Object.entries(data).forEach(([key, value]) => {
      if (value && typeof value === 'object' && 'increment' in value) {
        next[key] = BigInt(next[key] ?? 0) + BigInt((value as any).increment);
        return;
      }

      next[key] = value;
    });
    return next;
  };

  const prisma = {
    workOrder: {
      findUnique: jest.fn(async ({ where }: any) => {
        return (
          state.workOrders.find(
            (item) =>
              item.id === where.id || item.ot_number === where.ot_number,
          ) ?? null
        );
      }),
      findMany: jest.fn(async ({ where }: any) => {
        const otNumbers: string[] = where?.ot_number?.in ?? [];
        return state.workOrders
          .filter((item) => otNumbers.includes(item.ot_number))
          .map((item) => ({
            id: item.id,
            ot_number: item.ot_number,
            status: item.status,
            fecha_ingreso_planta: item.fecha_ingreso_planta ?? null,
            fecha_programada_produccion:
              item.fecha_programada_produccion ?? null,
            maquina_texto: item.maquina_texto ?? null,
            raw_payload: item.raw_payload ?? {},
            management_entries: state.activeManagementIds.has(item.id)
              ? [{ id: `entry-${item.id}` }]
              : [],
          }));
      }),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const index = state.workOrders.findIndex(
          (item) => item.ot_number === where.ot_number,
        );

        if (index >= 0) {
          state.workOrders[index] = applyData(state.workOrders[index], update);
          return state.workOrders[index];
        }

        const created = {
          id: `wo-${state.workOrders.length + 1}`,
          ot_number: create.ot_number,
          status: create.status ?? WorkOrderStatus.IMPORTED,
          fecha_ingreso_planta: create.fecha_ingreso_planta ?? null,
          fecha_programada_produccion:
            create.fecha_programada_produccion ?? null,
          maquina_texto: create.maquina_texto ?? null,
          raw_payload: create.raw_payload ?? {},
          row_version: BigInt(1),
          deleted_at: null,
          ...create,
        };

        state.workOrders.push(created);
        return created;
      }),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    workOrderManagementEntry: {
      findFirst: jest.fn(async ({ where, select }: any) => {
        const active = state.activeManagementIds.has(where.work_order_id);
        if (!active) {
          return null;
        }

        return select
          ? { id: `entry-${where.work_order_id}` }
          : { id: `entry-${where.work_order_id}` };
      }),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (operations: any) => {
      if (typeof operations === 'function') {
        return operations(prisma);
      }

      return Promise.all(operations);
    }),
    __state: state,
  };

  return prisma;
}

describe('WorkOrders bulk-upsert integration', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaMock>;

  const buildModule = async (
    initialOrders: WorkOrderRecord[] = [],
    activeManagementIds: string[] = [],
  ) => {
    prisma = createPrismaMock(initialOrders, activeManagementIds);

    const moduleBuilder = Test.createTestingModule({
      controllers: [WorkOrdersController],
      providers: [
        WorkOrdersService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  };

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('accepts a valid bulk import request and creates or updates work orders', async () => {
    await buildModule([
      {
        id: 'existing-1',
        ot_number: 'OT-1002',
        status: WorkOrderStatus.IMPORTED,
        maquina_texto: 'IMP-01',
        raw_payload: { OT: 'OT-1002', descripcion: 'Anterior' },
        row_version: BigInt(1),
        deleted_at: null,
      },
    ]);

    const response = await request(app.getHttpServer())
      .post('/work-orders/bulk-upsert')
      .send({
        items: [
          {
            ot_number: 'OT-1001',
            descripcion: 'Nueva OT',
            fecha_entrega: '2026-04-01',
            cantidad_pedida: 1500,
            raw_payload: { OT: 'OT-1001', descripcion: 'Nueva OT' },
          },
          {
            ot_number: 'OT-1002',
            descripcion: 'OT actualizada',
            maquina_texto: 'IMP-02',
            raw_payload: { OT: 'OT-1002', descripcion: 'OT actualizada' },
          },
        ],
      })
      .expect(201);

    expect(response.body).toEqual({ created: 1, updated: 1, total: 2 });
    expect(prisma.__state.workOrders).toHaveLength(2);
    expect(
      prisma.__state.workOrders.find((item) => item.ot_number === 'OT-1002')
        ?.descripcion,
    ).toBe('OT actualizada');
  });

  it('accepts frontend-style date and numeric payloads through the real endpoint contract', async () => {
    await buildModule();

    const response = await request(app.getHttpServer())
      .post('/work-orders/bulk-upsert')
      .send({
        items: [
          {
            ot_number: 'OT-2001',
            fecha_entrega: '2026-04-01',
            cantidad_pedida: '1250',
            raw_payload: { OT: 'OT-2001', 'CANT PED': '1250' },
          },
        ],
      })
      .expect(201);

    expect(response.body).toEqual({ created: 1, updated: 0, total: 1 });
    expect(prisma.__state.workOrders[0].fecha_entrega).toEqual(
      new Date('2026-04-01T00:00:00.000Z'),
    );
    expect(prisma.__state.workOrders[0].cantidad_pedida).toBe(1250);
  });

  it('preserves managed fields when an active management OT is imported again', async () => {
    await buildModule(
      [
        {
          id: 'managed-1',
          ot_number: 'OT-3001',
          status: WorkOrderStatus.PLANNED,
          fecha_ingreso_planta: new Date('2026-03-28T00:00:00.000Z'),
          fecha_programada_produccion: new Date('2026-03-30T00:00:00.000Z'),
          maquina_texto: 'IMP-BASE',
          raw_payload: {
            OT: 'OT-3001',
            descripcion: 'Descripcion congelada',
            __management_snapshot: {
              OT: 'OT-3001',
              descripcion: 'Descripcion congelada',
            },
          },
          row_version: BigInt(1),
          deleted_at: null,
        },
      ],
      ['managed-1'],
    );

    await request(app.getHttpServer())
      .post('/work-orders/bulk-upsert')
      .send({
        items: [
          {
            ot_number: 'OT-3001',
            descripcion: 'Descripcion importada',
            maquina_texto: 'IMP-NUEVA',
            fecha_entrega: '2026-04-01',
            raw_payload: {
              OT: 'OT-3001',
              descripcion: 'Descripcion importada',
            },
          },
        ],
      })
      .expect(201);

    const persisted = prisma.__state.workOrders.find(
      (item) => item.ot_number === 'OT-3001',
    );
    expect(persisted?.status).toBe(WorkOrderStatus.PLANNED);
    expect(persisted?.maquina_texto).toBe('IMP-BASE');
    expect(persisted?.raw_payload?.descripcion).toBe('Descripcion importada');
    expect(persisted?.raw_payload?.__management_snapshot?.descripcion).toBe(
      'Descripcion congelada',
    );
  });

  it('processes multiple chunks correctly through the real controller and service', async () => {
    await buildModule();

    const items = Array.from({ length: 401 }, (_, index) => ({
      ot_number: `OT-${index + 1}`,
      descripcion: `Trabajo ${index + 1}`,
      fecha_entrega: '2026-04-01',
      cantidad_pedida: index + 1,
      raw_payload: { OT: `OT-${index + 1}` },
    }));

    const response = await request(app.getHttpServer())
      .post('/work-orders/bulk-upsert')
      .send({ items })
      .expect(201);

    expect(response.body).toEqual({ created: 401, updated: 0, total: 401 });
    expect(prisma.workOrder.findMany).toHaveBeenCalledTimes(3);
  });
});
