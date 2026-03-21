import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { StagingService } from './staging.service';
import { CreateImportJobDto } from './dto/import-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Staging & Imports')
@Controller('staging')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StagingController {
  constructor(private readonly stagingService: StagingService) {}

  @Post('jobs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new import job' })
  async createJob(@Body() dto: CreateImportJobDto, @Request() req) {
    return this.stagingService.createJob(dto, req.user.sub || req.user.id);
  }

  @Get('jobs/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get import job status and rows' })
  async getJob(@Param('id') id: string) {
    return this.stagingService.getJob(id);
  }

  @Post('jobs/:id/upload')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload Excel file for an import job' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.stagingService.processFile(id, file);
  }
}
