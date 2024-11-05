// src/common/decorators/resource.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const RESOURCE_KEY = 'resource';
export const Resource = (resource: string) =>
  SetMetadata(RESOURCE_KEY, resource);
