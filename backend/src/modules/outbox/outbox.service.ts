import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private prisma: PrismaService) {}

  async createEvent(name: string, type: string, id: string, payload: any) {
    return this.prisma.outboxEvent.create({
      data: {
        event_name: name,
        aggregate_type: type,
        aggregate_id: id,
        payload: payload as any,
        status: 'PENDING',
      },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingEvents() {
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      take: 100,
      orderBy: { available_at: 'asc' },
    });

    for (const event of events) {
      try {
        await this.handleEvent(event);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PUBLISHED',
            published_at: new Date(),
          },
        });
      } catch (error) {
        this.logger.error(`Failed to process outbox event ${event.id}: ${error.message}`);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'FAILED',
            attempts: event.attempts + 1,
          },
        });
      }
    }
  }

  private async handleEvent(event: any) {
    // In a real system, this would publish to AWS SNS, RabbitMQ, Kafka, etc.
    this.logger.log(`Publishing event ${event.event_name} for ${event.aggregate_type}:${event.aggregate_id}`);
    // Simulated publication
  }
}
