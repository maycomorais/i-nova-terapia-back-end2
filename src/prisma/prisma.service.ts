import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getTenantId } from '../common/tenant.context';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();

    this.$use(async (params, next) => {
      const tenantId = getTenantId();

      if (tenantId) {
        // Adicionar tenantId a todas as operações exceto auth
        if (params.model && !['User'].includes(params.model)) {
          if (params.action === 'create') {
            params.args.data = { ...params.args.data, tenantId };
          } else if (params.action === 'createMany') {
            params.args.data = params.args.data.map((data: any) => ({
              ...data,
              tenantId,
            }));
          } else if (
            [
              'findUnique',
              'findFirst',
              'findMany',
              'update',
              'delete',
            ].includes(params.action)
          ) {
            if (!params.args.where) {
              params.args.where = { tenantId };
            } else {
              params.args.where = { ...params.args.where, tenantId };
            }
          }
        }
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
