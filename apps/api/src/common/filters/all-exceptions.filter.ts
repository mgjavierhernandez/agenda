import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { RequestWithId } from '../middleware/request-id.middleware';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = request.requestId;
    const nodeEnv = process.env['NODE_ENV'] ?? 'development';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'string') {
        message = exResponse;
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const obj = exResponse as Record<string, unknown>;
        message = (obj['message'] as string | string[]) ?? message;
      }
    }

    const errorResponse: Record<string, unknown> = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    if (requestId) {
      errorResponse['requestId'] = requestId;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status}` +
        (requestId ? ` [rid:${requestId}]` : ''),
        exception instanceof Error ? exception.stack : undefined,
      );
      if (nodeEnv === 'production') {
        errorResponse['message'] = 'Internal server error';
      }
    }

    response.status(status).json(errorResponse);
  }
}
