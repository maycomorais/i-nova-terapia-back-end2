// src/documents/controllers/documents.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Delete,
  StreamableFile,
  Res,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '@prisma/client';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { DocumentStorageService } from '../services/document-storage.service';
import { GenerateDocumentDto } from '../dto/generate-document.dto';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import * as path from 'path';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('documents')
@ApiBearerAuth('JWT-auth')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly documentStorage: DocumentStorageService,
  ) {}

  @Post('generate')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST)
  @ApiOperation({ summary: 'Gera um novo documento' })
  async generateDocument(
    @Body() generateDocumentDto: GenerateDocumentDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    const result = await this.pdfGenerator.generateDocument({
      ...generateDocumentDto,
      tenantId,
      userId: user.id,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result;
  }

  @Get(':documentUrl')
  @Roles(Role.MASTER, Role.CLINIC, Role.PSYCHOLOGIST, Role.PATIENT)
  @ApiOperation({ summary: 'Recupera um documento específico' })
  async getDocument(
    @Param('documentUrl') documentUrl: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const metadata = await this.documentStorage.getMetadata(documentUrl);

      if (!metadata || metadata.tenantId !== tenantId) {
        this.logger.warn(
          `Tentativa de acesso a documento de outro tenant. URL: ${documentUrl}, Tenant: ${tenantId}`,
        );
        throw new NotFoundException('Documento não encontrado');
      }

      const document = await this.documentStorage.get(documentUrl);

      response.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${
          metadata.fileName || path.basename(documentUrl)
        }"`,
      });

      return new StreamableFile(document);
    } catch (error) {
      this.logger.error(
        `Erro ao recuperar documento. URL: ${documentUrl}, Error: ${error.message}`,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new NotFoundException(
        'Não foi possível recuperar o documento solicitado',
      );
    }
  }

  @Delete(':documentUrl')
  @Roles(Role.MASTER)
  @ApiOperation({ summary: 'Remove um documento' })
  async deleteDocument(
    @Param('documentUrl') documentUrl: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @CurrentTenant() tenantId: string,
  ) {
    await this.documentStorage.delete(documentUrl);
    return { message: 'Documento removido com sucesso' };
  }

  @Post('batch')
  @Roles(Role.MASTER, Role.CLINIC)
  @ApiOperation({ summary: 'Gera múltiplos documentos' })
  async generateBatchDocuments(
    @Body() documents: GenerateDocumentDto[],
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    const results = await Promise.all(
      documents.map((doc) =>
        this.pdfGenerator.generateDocument({
          ...doc,
          tenantId,
          userId: user.id,
        }),
      ),
    );

    return {
      success: results.every((r) => r.success),
      results,
    };
  }
}
