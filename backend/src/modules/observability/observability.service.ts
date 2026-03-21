import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

@Injectable()
export class ObservabilityService implements OnModuleInit {
  private readonly logger = new Logger(ObservabilityService.name);

  onModuleInit() {
    this.logger.log('Observability Service Initialized');
    this.initOpenTelemetry();
  }

  private initOpenTelemetry() {
    this.logger.log('Initializing OpenTelemetry instrumentation...');
    // In a real production environment, we would initialize the SDK here
    // with OTLP exporters for Prometheus/Jaeger.
  }

  trackMetric(name: string, value: number, tags: Record<string, string> = {}) {
    // Custom logic to increment counters or record histograms
    this.logger.debug(`Metric [${name}]: ${value} - ${JSON.stringify(tags)}`);
  }

  startTimer(name: string) {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.trackMetric(`${name}_duration_ms`, duration);
    };
  }
}
