import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
}

export const tenantContext = new AsyncLocalStorage<TenantContext>();

export const getTenantId = (): string | undefined => {
  const context = tenantContext.getStore();
  return context?.tenantId;
};
