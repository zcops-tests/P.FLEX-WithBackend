import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FileUploadDto } from './dto/file.dto';
import { createHash } from 'crypto';
import { join } from 'path';
import { createReadStream, promises as fs } from 'fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadDir: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.uploadDir = this.configService.get('UPLOAD_DIR', './uploads');
  }

  async uploadFile(
    file: Express.Multer.File,
    dto: FileUploadDto,
    userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const fileHash = createHash('sha256').update(file.buffer).digest('hex');
    const objectKey = `${dto.entity_name}/${dto.entity_id}/${Date.now()}-${file.originalname}`;
    const filePath = join(this.uploadDir, objectKey);

    // Create directory if not exists
    await fs.mkdir(join(this.uploadDir, dto.entity_name, dto.entity_id), {
      recursive: true,
    });
    await fs.writeFile(filePath, file.buffer);

    const fileObject = await this.prisma.fileObject.create({
      data: {
        entity_name: dto.entity_name,
        entity_id: dto.entity_id,
        file_name: dto.file_name || file.originalname,
        mime_type: file.mimetype,
        file_hash: fileHash,
        size_bytes: BigInt(file.size),
        storage_provider: 'LOCAL',
        object_key: objectKey,
        uploaded_by_user_id: userId,
      },
    });

    return {
      ...fileObject,
      size_bytes: fileObject.size_bytes.toString(),
    };
  }

  async getFileMetadata(id: string) {
    const file = await this.prisma.fileObject.findUnique({
      where: { id },
    });

    if (!file || file.deleted_at) {
      throw new NotFoundException('File not found');
    }

    return {
      ...file,
      size_bytes: file.size_bytes.toString(),
    };
  }

  async getFileStream(id: string) {
    const file = await this.getFileMetadata(id);
    const filePath = join(this.uploadDir, file.object_key);

    try {
      await fs.access(filePath);
      return createReadStream(filePath);
    } catch (error) {
      throw new NotFoundException('Physical file not found');
    }
  }

  async deleteFile(id: string) {
    const file = await this.getFileMetadata(id);

    await this.prisma.fileObject.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { success: true };
  }
}
