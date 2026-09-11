import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const port = parseInt(config.get<string>('PORT') ?? '3000', 10);
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const corsOrigins = config.get<string>('CORS_ORIGIN');

  // --- Trust proxy (required for correct req.ip behind load balancers) ---
  app.set('trust proxy', 1);

  // --- Global prefix ---
  app.setGlobalPrefix('api/v1');

  // --- Validation Pipe ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // --- Logging Interceptor ---
  app.useGlobalInterceptors(new LoggingInterceptor());

  // --- Exception Filter ---
  app.useGlobalFilters(new AllExceptionsFilter());

  // --- CORS ---
  if (corsOrigins) {
    const origins = corsOrigins
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    app.enableCors({
      origin: origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Institution-Id', 'X-Request-Id'],
      maxAge: 86400,
    });
  } else if (nodeEnv === 'development') {
    app.enableCors({
      origin: 'http://localhost:5173',
      credentials: true,
    });
  } else {
    logger.warn('CORS_ORIGIN not set in production — no cross-origin requests allowed');
  }

  // --- Swagger / OpenAPI (development only) ---
  if (nodeEnv === 'development') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Agenda Escolar Digital — API')
      .setDescription(
        'REST API for the School Agenda Digital Platform.\n\n' +
          '## Authentication\n' +
          'All protected endpoints require a JWT Bearer token in the `Authorization` header.\n\n' +
          '## Tenant Context\n' +
          'Most endpoints require the `X-Institution-Id` header to scope requests to a specific institution. ' +
          'SUPER_ADMIN users can access cross-tenant endpoints.\n\n' +
          '## Request ID\n' +
          'Every response includes an `X-Request-Id` header. You may supply your own via the `X-Request-Id` request header.',
      )
      .setVersion('1.0.1')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter the JWT access token',
        },
        'bearer',
      )
      .addTag('Auth', 'Authentication, login, refresh, password recovery, tenant selection')
      .addTag('Health', 'Liveness and readiness probes')
      .addTag('Institutions', 'School institution management')
      .addTag('Users', 'User management within an institution')
      .addTag('Memberships', 'User–institution membership and role assignment')
      .addTag('Students', 'Student management')
      .addTag('Courses', 'Course management')
      .addTag('Subjects', 'Subject management')
      .addTag('Grades', 'Student grade management')
      .addTag('Schedules', 'Class schedule management')
      .addTag('Tasks', 'Task/assignment management and attachments')
      .addTag('Task Assignments', 'Task-to-student assignment management')
      .addTag('Task Submissions', 'Student task submissions and grading')
      .addTag('Communications', 'Institutional communications and attachments')
      .addTag('Communication Recipients', 'Communication recipient status and read tracking')
      .addTag('Signatures', 'Digital signature requests and signing')
      .addTag('Notifications', 'In-app notification management')
      .addTag('School Grades', 'School grade level catalog')
      .addTag('Academic Periods', 'Academic period/semester management')
      .addTag('Guardians', 'Guardian–student relationship management')
      .addTag('Enrollments', 'Student enrollment management')
      .addTag('Teacher Assignments', 'Teacher–course–subject assignment management')
      .addTag('Files', 'File upload, download, and management')
      .addTag(
        'Agenda',
        'Aggregated calendar view — custom events, tasks, schedules, communications, signatures',
      )
      .addTag('Agenda Events', 'Custom agenda event CRUD (create, read, update, cancel)')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
        showRequestDuration: true,
      },
    });
    logger.log(`Swagger UI available at http://localhost:${port}/api/docs [${nodeEnv}]`);
  }

  // --- Graceful Shutdown ---
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  logger.log(`API running on http://localhost:${port}/api/v1 [${nodeEnv}]`);
}

void bootstrap();
