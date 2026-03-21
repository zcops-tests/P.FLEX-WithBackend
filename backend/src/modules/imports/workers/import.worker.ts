import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ImportsService } from '../imports.service';

@Processor('imports')
export class ImportWorker extends WorkerHost {
  private readonly logger = new Logger(ImportWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly importsService: ImportsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing import job ${job.data.jobId} [${job.name}]`);

    switch (job.name) {
      case 'parse-excel':
        return this.handleParse(job.data);
      case 'apply-import':
        return this.handleApply(job.data);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  private async handleParse(data: any) {
    const { jobId, fileId, options } = data;
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) return;

    this.logger.log(`Performing Tolerant Parse for job ${jobId}`);

    // Simulate 3 rows from an Excel file
    const mockRows = [
      { ot_number: 'OT-1001', cliente_razon_social: 'Client A', cantidad_pedida: 5000 },
      { ot_number: '', cliente_razon_social: 'Client B', cantidad_pedida: 'INVALID' }, // Error: OT required + NaN
      { ot_number: 'OT-1002', cliente_razon_social: 'Client C', cantidad_pedida: 2000 },
    ];

    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < mockRows.length; i++) {
      const rowData = mockRows[i];
      const errors = await this.importsService.validateRow(job.entity_name, rowData);
      const is_valid = errors.length === 0;

      if (is_valid) validCount++;
      else invalidCount++;

      // Create staging row
      if (job.entity_name === 'work_orders') {
        await this.prisma.workOrderImportRow.create({
          data: {
            import_job_id: jobId,
            row_number: i + 1,
            row_status: is_valid ? 'VALID' : 'INVALID',
            business_key: rowData.ot_number || `ROW-${i+1}`,
            raw_row: rowData as any,
            normalized_row: (is_valid ? rowData : null) as any,
            validation_errors: (errors.length > 0 ? errors : null) as any,
          },
        });
      }
    }

    await this.importsService.markJobAsReady(jobId, {
      total: mockRows.length,
      valid: validCount,
      invalid: invalidCount,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Import job ${jobId} staged. Valid: ${validCount}, Invalid: ${invalidCount}`);
  }

  private async handleApply(data: any) {
    const { jobId } = data;
    await this.importsService.applyImport(jobId);
  }
}
