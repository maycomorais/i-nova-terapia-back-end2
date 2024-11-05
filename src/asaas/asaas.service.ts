import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ASAAS_CONFIG } from './config/asaas.config';
import {
  AsaasCustomer,
  AsaasPayment,
  AsaasBankAccount,
} from './interfaces/asaas.interface';

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private readonly api = axios.create({
    baseURL: ASAAS_CONFIG.apiUrl,
    headers: {
      access_token: ASAAS_CONFIG.apiKey,
    },
  });

  /**
   * Cria um novo cliente no Asaas
   * @param customerData Dados do cliente
   * @returns Dados do cliente criado
   */
  async createCustomer(customerData: AsaasCustomer) {
    try {
      const { data } = await this.api.post('/customers', customerData);
      return data;
    } catch (error) {
      this.logger.error(`Erro ao criar cliente no Asaas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria um novo pagamento no Asaas
   * @param paymentData Dados do pagamento
   * @returns Dados do pagamento criado
   */
  async createPayment(paymentData: AsaasPayment) {
    try {
      const { data } = await this.api.post('/payments', paymentData);
      return data;
    } catch (error) {
      this.logger.error(`Erro ao criar pagamento no Asaas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria uma conta bancária no Asaas
   * @param bankAccountData Dados da conta bancária
   * @returns Dados da conta bancária criada
   */
  async createBankAccount(bankAccountData: AsaasBankAccount) {
    try {
      const { data } = await this.api.post('/bankAccounts', bankAccountData);
      return data;
    } catch (error) {
      this.logger.error(
        `Erro ao criar conta bancária no Asaas: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Gera um QR Code PIX para pagamento
   * @param paymentId ID do pagamento
   * @returns Dados do QR Code PIX
   */
  async generatePixQRCode(paymentId: string) {
    try {
      const { data } = await this.api.get(`/payments/${paymentId}/pixQrCode`);
      return data;
    } catch (error) {
      this.logger.error(`Erro ao gerar QR Code PIX: ${error.message}`);
      throw error;
    }
  }

  /**
   * Consulta o status de um pagamento
   * @param paymentId ID do pagamento
   * @returns Status atual do pagamento
   */
  async getPaymentStatus(paymentId: string) {
    try {
      const { data } = await this.api.get(`/payments/${paymentId}`);
      return data.status;
    } catch (error) {
      this.logger.error(
        `Erro ao consultar status do pagamento: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Cancela um pagamento
   * @param paymentId ID do pagamento
   * @returns Dados do pagamento cancelado
   */
  async cancelPayment(paymentId: string) {
    try {
      const { data } = await this.api.delete(`/payments/${paymentId}`);
      return data;
    } catch (error) {
      this.logger.error(`Erro ao cancelar pagamento: ${error.message}`);
      throw error;
    }
  }

  /**
   * Processa webhook do Asaas
   * @param event Evento recebido do webhook
   * @returns Dados processados do evento
   */
  async processWebhook(event: any) {
    try {
      this.logger.log(`Processando webhook do Asaas: ${JSON.stringify(event)}`);
      // Implementar lógica de processamento do webhook
      return event;
    } catch (error) {
      this.logger.error(`Erro ao processar webhook: ${error.message}`);
      throw error;
    }
  }
}
