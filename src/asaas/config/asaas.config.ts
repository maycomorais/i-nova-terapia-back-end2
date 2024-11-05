export const ASAAS_CONFIG = {
  apiUrl:
    process.env.ASAAS_ENV === 'production'
      ? 'https://www.asaas.com/api/v3'
      : 'https://sandbox.asaas.com/api/v3',
  apiKey: process.env.ASAAS_API_KEY,
  webhookToken: process.env.ASAAS_WEBHOOK_TOKEN,
};
