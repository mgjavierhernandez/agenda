import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';
import { RequestWithId } from '../middleware/request-id.middleware';

interface UserPayload {
  userId?: string;
}

interface TenantPayload {
  institutionId?: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithId>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, url } = req;
    const requestId = req.requestId;
    const user = (req as unknown as { user?: UserPayload }).user;
    const tenant = (req as unknown as { tenant?: TenantPayload }).tenant;
    const userId = user?.userId;
    const institutionId = tenant?.institutionId;

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = res.statusCode;
          const duration = Date.now() - now;
          this.logger.log(
            `${method} ${url} ${statusCode} ${duration}ms` +
              (requestId ? ` [rid:${requestId}]` : '') +
              (userId ? ` [uid:${userId}]` : '') +
              (institutionId ? ` [tid:${institutionId}]` : ''),
          );
        },
        error: (err: unknown) => {
          const statusCode =
            typeof err === 'object' && err !== null && 'status' in err
              ? (err as { status: number }).status
              : 500;
          const duration = Date.now() - now;
          this.logger.error(
            `${method} ${url} ${statusCode} ${duration}ms` +
              (requestId ? ` [rid:${requestId}]` : '') +
              (userId ? ` [uid:${userId}]` : '') +
              (institutionId ? ` [tid:${institutionId}]` : ''),
          );
        },
      }),
    );
  }
}
