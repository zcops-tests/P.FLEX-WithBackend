import { Test, TestingModule } from '@nestjs/testing';
import { AuditInterceptor } from './audit.interceptor';
import { PrismaService } from '../../database/prisma.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let prisma: PrismaService;

  const mockPrisma = {
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'log-1' }),
    },
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        method: 'POST',
        url: '/test',
        body: { name: 'test' },
        user: { sub: 'user-1', username: 'admin' },
        headers: { 'user-agent': 'jest' },
        ip: '127.0.0.1',
      }),
    }),
  } as unknown as ExecutionContext;

  const mockCallHandler = {
    handle: jest.fn().mockReturnValue(of({ success: true })),
  } as CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    interceptor = module.get<AuditInterceptor>(AuditInterceptor);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should call prisma.auditLog.create on successful operation', async () => {
    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    
    // We must subscribe and wait for the observable to complete
    await result$.toPromise();
    await new Promise((resolve) => setImmediate(resolve));

    // Check if auditLog.create was called
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });
});
