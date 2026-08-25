import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export interface RequestWithId extends Request {
  requestId?: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const clientProvided = req.headers['x-request-id'];
    const requestId =
      typeof clientProvided === 'string' &&
      clientProvided.length > 0 &&
      clientProvided.length <= 128 &&
      /^[a-zA-Z0-9\-_.]+$/.test(clientProvided)
        ? clientProvided
        : randomUUID();

    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}
