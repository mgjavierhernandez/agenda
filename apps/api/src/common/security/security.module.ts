import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import helmet from 'helmet';
import { RequestIdMiddleware } from '../middleware/request-id.middleware';

@Module({})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(helmet({
        crossOriginEmbedderPolicy: false,
      }))
      .forRoutes('*');

    consumer
      .apply(RequestIdMiddleware)
      .forRoutes('*');
  }
}
