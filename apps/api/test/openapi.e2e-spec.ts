import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

describe('OpenAPI / Swagger (e2e)', () => {
  let app: INestApplication;
  let document: ReturnType<typeof SwaggerModule.createDocument>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Agenda Escolar Digital — API')
      .setDescription('REST API for the School Agenda Digital Platform')
      .setVersion('0.1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
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
      .build();

    document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Swagger UI', () => {
    it('GET /api/docs should return HTML with swagger', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/docs/')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('swagger');
    });
  });

  describe('OpenAPI JSON', () => {
    it('GET /api/docs-json should return valid OpenAPI document', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(res.body).toHaveProperty('openapi');
      expect(res.body).toHaveProperty('info');
      expect(res.body).toHaveProperty('paths');
      expect(res.body).toHaveProperty('components');
      expect(res.body.openapi).toMatch(/^3\.\d+\.\d+$/);
    });
  });

  describe('Document structure', () => {
    it('should have valid openapi version', () => {
      expect(document.openapi).toMatch(/^3\.\d+\.\d+$/);
    });

    it('should have info with title and version', () => {
      expect(document.info.title).toContain('Agenda Escolar');
      expect(document.info.version).toBe('0.1.0');
    });

    it('should have security schemes with bearer auth', () => {
      const securitySchemes = document.components?.securitySchemes;
      expect(securitySchemes).toBeDefined();
      const bearer = securitySchemes!['bearer'] as unknown as Record<string, unknown>;
      expect(bearer).toBeDefined();
      expect(bearer['type']).toBe('http');
      expect(bearer['scheme']).toBe('bearer');
    });

    it('should have tags defined', () => {
      expect(document.tags).toBeDefined();
      expect(Array.isArray(document.tags)).toBe(true);
      expect(document.tags!.length).toBeGreaterThanOrEqual(15);
    });

    it('should have Auth tag', () => {
      const authTag = document.tags!.find((t) => t.name === 'Auth');
      expect(authTag).toBeDefined();
    });

    it('should have Health tag', () => {
      const healthTag = document.tags!.find((t) => t.name === 'Health');
      expect(healthTag).toBeDefined();
    });

    it('should have Students tag', () => {
      const tag = document.tags!.find((t) => t.name === 'Students');
      expect(tag).toBeDefined();
    });
  });

  describe('Health endpoints', () => {
    it('should document /api/v1/health', () => {
      expect(document.paths['/api/v1/health']).toBeDefined();
      expect(document.paths['/api/v1/health'].get).toBeDefined();
    });

    it('should document /api/v1/health/readiness', () => {
      expect(document.paths['/api/v1/health/readiness']).toBeDefined();
      expect(document.paths['/api/v1/health/readiness'].get).toBeDefined();
    });
  });

  describe('Auth endpoints', () => {
    it('should document login', () => {
      expect(document.paths['/api/v1/auth/login']).toBeDefined();
      expect(document.paths['/api/v1/auth/login'].post).toBeDefined();
    });

    it('should document refresh', () => {
      expect(document.paths['/api/v1/auth/refresh']).toBeDefined();
    });

    it('should document forgot-password', () => {
      expect(document.paths['/api/v1/auth/forgot-password']).toBeDefined();
    });

    it('should document reset-password', () => {
      expect(document.paths['/api/v1/auth/reset-password']).toBeDefined();
    });

    it('should document profile', () => {
      expect(document.paths['/api/v1/auth/profile']).toBeDefined();
    });

    it('should document logout', () => {
      expect(document.paths['/api/v1/auth/logout']).toBeDefined();
    });

    it('should document tenant endpoints', () => {
      expect(document.paths['/api/v1/auth/tenant']).toBeDefined();
      expect(document.paths['/api/v1/auth/tenant/select']).toBeDefined();
    });
  });

  describe('Core module endpoints', () => {
    it('should document students', () => {
      expect(document.paths['/api/v1/students']).toBeDefined();
      expect(document.paths['/api/v1/students'].get).toBeDefined();
      expect(document.paths['/api/v1/students'].post).toBeDefined();
    });

    it('should document courses', () => {
      expect(document.paths['/api/v1/courses']).toBeDefined();
    });

    it('should document subjects', () => {
      expect(document.paths['/api/v1/subjects']).toBeDefined();
    });

    it('should document grades', () => {
      expect(document.paths['/api/v1/grades']).toBeDefined();
    });

    it('should document schedules', () => {
      expect(document.paths['/api/v1/schedules']).toBeDefined();
    });

    it('should document tasks', () => {
      expect(document.paths['/api/v1/tasks']).toBeDefined();
    });

    it('should document communications', () => {
      expect(document.paths['/api/v1/communications']).toBeDefined();
    });

    it('should document notifications', () => {
      expect(document.paths['/api/v1/notifications']).toBeDefined();
    });

    it('should document signature-requests', () => {
      expect(document.paths['/api/v1/signature-requests']).toBeDefined();
    });

    it('should document institutions', () => {
      expect(document.paths['/api/v1/institutions']).toBeDefined();
    });

    it('should document users', () => {
      expect(document.paths['/api/v1/users']).toBeDefined();
    });

    it('should document files', () => {
      expect(document.paths['/api/v1/files']).toBeDefined();
    });

    it('should document enrollments', () => {
      expect(document.paths['/api/v1/enrollments']).toBeDefined();
    });

    it('should document school-grades', () => {
      expect(document.paths['/api/v1/school-grades']).toBeDefined();
    });

    it('should document academic-periods', () => {
      expect(document.paths['/api/v1/academic-periods']).toBeDefined();
    });

    it('should document guardians (nested paths)', () => {
      const guardianPaths = Object.keys(document.paths).filter((p) =>
        p.startsWith('/api/v1/guardians'),
      );
      expect(guardianPaths.length).toBeGreaterThan(0);
    });

    it('should document teacher-assignments', () => {
      expect(document.paths['/api/v1/teacher-assignments']).toBeDefined();
    });

    it('should document task-assignments', () => {
      expect(document.paths['/api/v1/task-assignments']).toBeDefined();
    });

    it('should document communication-recipients', () => {
      expect(document.paths['/api/v1/communication-recipients']).toBeDefined();
    });

    it('should document memberships (nested under institutions)', () => {
      const membershipPaths = Object.keys(document.paths).filter((p) =>
        p.includes('/memberships'),
      );
      expect(membershipPaths.length).toBeGreaterThan(0);
    });
  });

  describe('Total path count', () => {
    it('should document at least 80 endpoints', () => {
      const totalPaths = Object.keys(document.paths).length;
      expect(totalPaths).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Security', () => {
    it('should not expose password examples in schemas', () => {
      const schemas = document.components?.schemas;
      if (schemas) {
        for (const name of Object.keys(schemas)) {
          const schemaObj = schemas[name] as unknown as {
            properties?: Record<string, unknown>;
          };
          if (schemaObj?.properties) {
            for (const key of Object.keys(schemaObj.properties)) {
              if (key.toLowerCase().includes('password')) {
                const prop = schemaObj.properties[key] as Record<string, unknown>;
                expect(prop.example).toBeUndefined();
              }
            }
          }
        }
      }
    });
  });
});
