import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateSystemConfigDto } from './dto/system-config.dto';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const config = await this.prisma.systemConfig.findFirst();
    if (!config) {
       // Should be initialized via seeding, but as a fallback:
       return this.prisma.systemConfig.create({
         data: {
           plant_name: 'P.FLEX-SYSTEM',
         }
       });
    }
    return config;
  }

  async update(dto: UpdateSystemConfigDto) {
    const existing = await this.get();
    
    return this.prisma.systemConfig.update({
      where: { id: existing.id },
      data: dto,
    });
  }

  async getPlantName(): Promise<string> {
    const config = await this.get();
    return config.plant_name;
  }
}
