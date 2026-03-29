import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateSystemConfigDto } from './dto/system-config.dto';
import { toFrontendSystemConfig } from '../../common/utils/frontend-entity.util';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const config = await this.prisma.systemConfig.findFirst();
    if (!config) {
      // Should be initialized via seeding, but as a fallback:
      const created = await this.prisma.systemConfig.create({
        data: {
          plant_name: 'P.FLEX-SYSTEM',
        },
      });
      return toFrontendSystemConfig(created);
    }
    return toFrontendSystemConfig(config);
  }

  async update(dto: UpdateSystemConfigDto) {
    const existing = await this.get();

    const updated = await this.prisma.systemConfig.update({
      where: { id: existing.id },
      data: dto,
    });

    return toFrontendSystemConfig(updated);
  }

  async getPlantName(): Promise<string> {
    const config = await this.get();
    return config.plantName || config.plant_name;
  }
}
