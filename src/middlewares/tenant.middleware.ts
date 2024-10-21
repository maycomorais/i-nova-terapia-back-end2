import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantContext } from '../common/tenant.context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Tenant ID não fornecido',
      });
    }

    // Executar o restante do código no contexto do tenant
    tenantContext.run({ tenantId }, () => {
      next();
    });
  }
}
