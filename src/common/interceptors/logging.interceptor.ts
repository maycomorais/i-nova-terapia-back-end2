import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const userEmail = request.user?.email || 'anonymous';
    const tenantId = request.headers['x-tenant-id'] || 'no-tenant';
    const requestId = request.headers['x-request-id'] || 'no-request-id';

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (data: any) => {
          const response = context.switchToHttp().getResponse();
          const delay = Date.now() - now;
          this.logger.log(
            `[${requestId}] ${tenantId} - ${userEmail} - ${method} ${url} ${
              response.statusCode
            } - ${delay}ms`,
          );

          if (process.env.NODE_ENV === 'development') {
            this.logger.debug(`Request Body: ${JSON.stringify(body)}`);
            this.logger.debug(`Response Body: ${JSON.stringify(data)}`);
          }
        },
        error: (error: any) => {
          const delay = Date.now() - now;
          this.logger.error(
            `[${requestId}] ${tenantId} - ${userEmail} - ${method} ${url} - ${delay}ms`,
            error.stack,
          );
        },
      }),
    );
  }
}
