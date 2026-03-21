import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { FileUploadDto } from './dto/file.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Response } from 'express';

@ApiTags('File Management')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file associated with an entity' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        entity_name: { type: 'string' },
        entity_id: { type: 'string' },
        file_name: { type: 'string' },
      },
    },
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: FileUploadDto,
    @Request() req,
  ) {
    return this.filesService.uploadFile(file, dto, req.user.sub || req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file metadata' })
  async getMetadata(@Param('id') id: string) {
    return this.filesService.getFileMetadata(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download/Stream file' })
  async download(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const metadata = await this.filesService.getFileMetadata(id);
    const stream = await this.filesService.getFileStream(id);

    res.set({
      'Content-Type': metadata.mime_type,
      'Content-Disposition': `attachment; filename="${metadata.file_name}"`,
    });

    return new StreamableFile(stream);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a file' })
  async delete(@Param('id') id: string) {
    return this.filesService.deleteFile(id);
  }
}
