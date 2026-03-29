import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_pass'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
    refreshToken: {
      deleteMany: jest.fn(),
    },
    userSession: {
      deleteMany: jest.fn(),
    },
    area: {
      findUnique: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    userAssignedArea: {
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if username exists', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        code: 'SUPERVISOR',
        active: true,
        deleted_at: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        deleted_at: null,
      });
      await expect(
        service.create({
          username: '12345678',
          password: 'Temp123!',
          role_id: 'role-1',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should create a user with hashed password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        code: 'SUPERVISOR',
        active: true,
        deleted_at: null,
      });
      mockPrisma.user.create.mockResolvedValue({
        id: '1',
        username: '12345678',
        role: { permissions: [] },
        assignedAreas: [],
      });

      const result = await service.create({
        username: '12345678',
        password: '123',
        name: 'New',
        role_id: 'role-1',
      } as any);
      expect(result.username).toBe('12345678');
      expect(bcrypt.hash).toHaveBeenCalled();
    });

    it('should create an operator without explicit password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role-operator',
        code: 'OPERATOR',
        active: true,
        deleted_at: null,
      });
      mockPrisma.user.create.mockResolvedValue({
        id: '2',
        username: '87654321',
        role: { permissions: [] },
        assignedAreas: [],
      });

      const result = await service.create({
        username: '87654321',
        name: 'Operario',
        role_id: 'role-operator',
      } as any);
      expect(result.username).toBe('87654321');
      expect(bcrypt.hash).toHaveBeenCalled();
    });

    it('should require password for non-operator users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        code: 'SUPERVISOR',
        active: true,
        deleted_at: null,
      });

      await expect(
        service.create({
          username: '12345678',
          name: 'Sin Password',
          role_id: 'role-1',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should purge a soft-deleted user before recreating the DNI', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role-operator',
        code: 'OPERATOR',
        active: true,
        deleted_at: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'deleted-user',
        username: '77777777',
        deleted_at: new Date('2026-03-28T10:00:00.000Z'),
      });
      mockPrisma.user.delete.mockResolvedValue({
        id: 'deleted-user',
      });
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        username: '77777777',
        name: 'Operario Nuevo',
        role: { permissions: [] },
        assignedAreas: [],
      });

      const result = await service.create({
        username: '77777777',
        name: 'Operario Nuevo',
        role_id: 'role-operator',
      } as any);

      expect(mockPrisma.userAssignedArea.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'deleted-user' },
      });
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'deleted-user' },
      });
      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'deleted-user' },
      });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'deleted-user' },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: '77777777',
            role_id: 'role-operator',
          }),
        }),
      );
      expect(result.id).toBe('new-user');
    });

    it('should throw ConflictException when a deleted user with history cannot be purged', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role-operator',
        code: 'OPERATOR',
        active: true,
        deleted_at: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'deleted-user',
        username: '77777777',
        deleted_at: new Date('2026-03-28T10:00:00.000Z'),
      });
      mockPrisma.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('FK', {
          code: 'P2003',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create({
          username: '77777777',
          name: 'Operario Nuevo',
          role_id: 'role-operator',
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
