import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from './files.service';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('FilesService', () => {
  let service: FilesService;
  let prisma: PrismaService;

  const mockPrisma = {
    fileObject: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue('./uploads'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should save file and create metadata', async () => {
      const mockFile = {
        buffer: Buffer.from('test content'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 12,
      } as Express.Multer.File;

      const dto = {
        entity_name: 'WORK_ORDER',
        entity_id: 'uuid-1',
        file_name: 'custom.txt',
      };

      mockPrisma.fileObject.create.mockResolvedValue({
        id: 'file-1',
        ...dto,
        size_bytes: BigInt(12),
      });

      const result = await service.uploadFile(mockFile, dto, 'user-1');

      expect(prisma.fileObject.create).toHaveBeenCalled();
      expect(result.id).toBe('file-1');
    });
  });
});
