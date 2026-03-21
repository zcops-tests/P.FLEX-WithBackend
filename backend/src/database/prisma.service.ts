import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { rowVersionExtension } from './prisma-extensions';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private _extendedClient: any;

  constructor() {
    super({
      log: ['error', 'warn'],
    });
    this._extendedClient = rowVersionExtension(this);
  }

  async onModuleInit() {
    await this.$connect();
  }

  get extended() {
    return this._extendedClient;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
