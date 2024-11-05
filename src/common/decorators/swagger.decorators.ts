// src/common/decorators/swagger.decorators.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

export function SwaggerRoute(summary: string, description?: string) {
  return applyDecorators(
    ApiOperation({ summary, description }),
    ApiBearerAuth('JWT-auth'),
  );
}

export function SwaggerResponse(statusCode: number, description: string) {
  return ApiResponse({ status: statusCode, description });
}
