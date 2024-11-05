// src/health/indicators/asaas.health.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthCheckError } from '@nestjs/terminus';
import { HttpService } from '@nestjs/axios';
import { ASAAS_CONFIG } from '../../asaas/config/asaas.config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AsaasHealthIndicator extends HealthIndicator {
  constructor(private http: HttpService) {
    super();
  }

  async isHealthy(key: string = 'asaas') {
    try {
      const response = await firstValueFrom(
        this.http.get(`${ASAAS_CONFIG.apiUrl}/status`, {
          headers: {
            access_token: ASAAS_CONFIG.apiKey,
          },
        }),
      );

      const isHealthy = response.status === 200;

      return this.getStatus(key, isHealthy, {
        statusCode: response.status,
      });
    } catch (error) {
      throw new HealthCheckError(
        'Asaas check failed',
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }
}
