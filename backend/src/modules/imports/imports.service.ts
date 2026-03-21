import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateImportJobDto, ImportStatus } from './dto/import.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('imports') private importsQueue: Queue,
  ) {}

  async createJob(dto: CreateImportJobDto, userId: string) {
    const job = await this.prisma.importJob.create({
      data: {
        entity_name: dto.entity_name,
        file_name: 'pending_parse', // Will be updated by worker
        status: ImportStatus.PENDING,
        created_by_user_id: userId,
      },
    });

    // Send to queue for parsing and initial validation
    await this.importsQueue.add('parse-excel', {
      jobId: job.id,
      fileId: dto.file_id,
      options: {
        tolerantMode: true, // Collect errors per row instead of stopping
      }
    });

    return job;
  }

  async getJob(id: string) {
    const job = await this.prisma.importJob.findUnique({
      where: { id },
      include: {
        user: {
          select: { username: true }
        }
      }
    });

    if (!job) throw new NotFoundException('Import job not found');
    return job;
  }

  async confirmImport(id: string, userId: string) {
    const job = await this.getJob(id);
    if (job.status !== ImportStatus.READY) {
      throw new Error('Only jobs in READY status can be confirmed');
    }

    await this.prisma.importJob.update({
      where: { id },
      data: { status: ImportStatus.PROCESSING },
    });

    await this.importsQueue.add('apply-import', { jobId: id });
    return { message: 'Import started' };
  }

  async validateRow(entityName: string, row: any) {
    const errors: string[] = [];
    
    if (entityName === 'work_orders') {
      if (!row.ot_number) errors.push('OT_REQUIRED: Número de OT es obligatorio');
      if (row.cantidad_pedida && isNaN(Number(row.cantidad_pedida))) {
        errors.push('INVALID_QUANTITY: Cantidad pedida debe ser un número');
      }
      if (row.fecha_entrega && isNaN(Date.parse(row.fecha_entrega))) {
        errors.push('INVALID_DATE: Formato de fecha de entrega inválido');
      }
    } else if (entityName === 'clises') {
      if (!row.item_code) errors.push('CODE_REQUIRED: Código de clisé es obligatorio');
      if (row.ancho_mm && isNaN(Number(row.ancho_mm))) {
        errors.push('INVALID_DIMENSION: El ancho debe ser numérico');
      }
    }
    
    return errors;
  }

  async markJobAsReady(jobId: string, summary: any) {
    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: ImportStatus.READY,
        total_rows: summary.total,
        valid_rows: summary.valid,
        invalid_rows: summary.invalid,
        summary: summary,
      },
    });
  }

  async applyImport(jobId: string) {
    const job = await this.getJob(jobId);
    
    // Process in batches
    if (job.entity_name === 'work_orders') {
      const rows = await this.prisma.workOrderImportRow.findMany({
        where: { import_job_id: jobId, row_status: 'VALID' },
      });

      for (const row of rows) {
        const data = row.normalized_row as any;
        await this.prisma.workOrder.upsert({
          where: { ot_number: data.ot_number },
          update: { ...data, row_version: { increment: 1 } },
          create: { ...data },
        });
      }
    }

    await this.prisma.importJob.update({
      where: { id: jobId },
      data: { 
        status: ImportStatus.COMPLETED,
        finished_at: new Date(),
        applied_rows: { increment: 100 }, // Mock progress
      },
    });
  }

  async getStagingRows(jobId: string) {
    return this.prisma.workOrderImportRow.findMany({
      where: { import_job_id: jobId },
      take: 100,
    });
  }
}
