import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ExportRequestDto } from './dto/export.dto';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    @InjectQueue('exports') private exportsQueue: Queue,
  ) {}

  async requestExport(dto: ExportRequestDto, userId: string) {
    const job = await this.exportsQueue.add('generate-export', {
      ...dto,
      userId,
    }, {
      removeOnComplete: true,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    return {
      jobId: job.id,
      status: 'QUEUED',
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.exportsQueue.getJob(jobId);
    if (!job) return { status: 'NOT_FOUND' };

    const state = await job.getState();
    const result = job.returnvalue;

    return {
      id: job.id,
      status: state.toUpperCase(),
      progress: job.progress,
      result: result || null,
    };
  }
}
