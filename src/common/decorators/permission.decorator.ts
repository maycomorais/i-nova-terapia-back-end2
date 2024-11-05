// src/common/decorators/permission.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ACTION_KEY = 'action';
export const RequirePermission = (action: string) =>
  SetMetadata(ACTION_KEY, action);
