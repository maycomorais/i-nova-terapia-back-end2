import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorMessage = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      errorMessage = exception.message;
      errorCode = 'HTTP_ERROR';
    } else if (exception instanceof PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          errorMessage = 'Dados únicos já existem no sistema';
          errorCode = 'UNIQUE_CONSTRAINT_VIOLATION';
          break;
        case 'P2025':
          errorMessage = 'Registro não encontrado';
          errorCode = 'RECORD_NOT_FOUND';
          break;
        case 'P2003':
          errorMessage = 'Violação de chave estrangeira';
          errorCode = 'FOREIGN_KEY_VIOLATION';
          break;
        default:
          errorMessage = 'Erro no banco de dados';
          errorCode = `DATABASE_ERROR_${exception.code}`;
      }
    }

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      errorCode,
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    this.logger.error(
      `${errorCode} - ${errorMessage} - ${httpAdapter.getRequestUrl(request)}`,
      exception instanceof Error ? exception.stack : '',
    );

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
