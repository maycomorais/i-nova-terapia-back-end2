// src/health/interceptors/metrics.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { MetricsService } from '../metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;

    // Incrementar contador de requisições em andamento
    this.metricsService.incrementHttpRequestsInProgress(method, url);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          const res = context.switchToHttp().getResponse();

          // Métricas HTTP
          this.metricsService.incrementHttpRequests(
            method,
            url,
            res.statusCode,
          );
          this.metricsService.observeHttpRequestDuration(method, url, duration);
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;

          // Métricas de erro
          this.metricsService.incrementHttpRequests(
            method,
            url,
            error.status || 500,
          );
          this.metricsService.observeHttpRequestDuration(method, url, duration);
        },
      }),
      finalize(() => {
        // Decrementar contador de requisições em andamento
        this.metricsService.decrementHttpRequestsInProgress(method, url);
      }),
    );
  }
}
