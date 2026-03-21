import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateImportJobDto, ImportStatus, ImportType } from './dto/import-job.dto';
import * as XLSX from 'xlsx';

@Injectable()
export class StagingService {
  private readonly logger = new Logger(StagingService.name);

  constructor(private prisma: PrismaService) {}

  async createJob(dto: CreateImportJobDto, userId: string) {
    return this.prisma.importJob.create({
      data: {
        entity_name: dto.type,
        status: ImportStatus.PENDING,
        created_by_user_id: userId,
        file_name: 'pending_upload',
      },
    });
  }

  async getJob(id: string) {
    const job = await this.prisma.importJob.findUnique({
      where: { id },
      include: {
        workOrderImportRows: true,
        cliseImportRows: true,
        dieImportRows: true,
      },
    });
    if (!job) {
      throw new NotFoundException(`Import job with ID ${id} not found`);
    }
    return job;
  }

  async processFile(jobId: string, file: Express.Multer.File) {
    const job = await this.getJob(jobId);
    
    await this.prisma.importJob.update({
      where: { id: jobId },
      data: { 
        status: 'PROCESSING',
        file_name: file.originalname,
      },
    });

    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      this.logger.log(`Processing ${rows.length} rows for job ${jobId}`);

      if (job.entity_name === ImportType.WORK_ORDER) {
        await this.storeWorkOrderRows(jobId, rows);
      } else if (job.entity_name === ImportType.CLISE) {
        await this.storeCliseRows(jobId, rows);
      } else if (job.entity_name === ImportType.DIE) {
        await this.storeDieRows(jobId, rows);
      }

      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { 
          status: 'COMPLETED',
          total_rows: rows.length,
          summary: { 
            message: 'Parsing completed',
            processed_at: new Date().toISOString()
          },
        },
      });

      return { success: true, total_rows: rows.length };
    } catch (error) {
      this.logger.error(`Error processing import job ${jobId}: ${error.message}`);
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { 
          status: 'FAILED',
          summary: { error: error.message },
        },
      });
      throw new BadRequestException(`Failed to process file: ${error.message}`);
    }
  }

  private async storeWorkOrderRows(jobId: string, rows: any[]) {
    const data = rows.map((row, index) => ({
      import_job_id: jobId,
      row_number: index + 1,
      business_key: row['ot_number']?.toString() || row['OT Number']?.toString(),
      raw_row: row,
      row_status: 'PENDING',
    }));

    await this.prisma.workOrderImportRow.createMany({ data });
  }

  private async storeCliseRows(jobId: string, rows: any[]) {
    const data = rows.map((row, index) => ({
      import_job_id: jobId,
      row_number: index + 1,
      business_key: row['item_code']?.toString() || row['Item Code']?.toString(),
      raw_row: row,
      row_status: 'PENDING',
    }));

    await this.prisma.cliseImportRow.createMany({ data });
  }

  private async storeDieRows(jobId: string, rows: any[]) {
    const data = rows.map((row, index) => ({
      import_job_id: jobId,
      row_number: index + 1,
      business_key: row['serie']?.toString() || row['Serie']?.toString(),
      raw_row: row,
      row_status: 'PENDING',
    }));

    await this.prisma.dieImportRow.createMany({ data });
  }
}
