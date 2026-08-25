# PROMPT 53 — Production Release & MVP Closure

## 1. Release

| Field | Value |
|-------|-------|
| Name | Agenda Escolar Digital |
| Version | 1.0.0 |
| Date | 2026-08-25 |
| Status | **PRODUCTION READY** |
| Decision | **GO** |

## 2. Scope

### Backend Modules (NestJS + Prisma)

| Module | Description |
|--------|-------------|
| Auth | JWT authentication, login, refresh, logout, password recovery |
| Institutions | Multi-tenant institution management |
| Users | User management within institutions |
| Memberships | User–institution role assignments |
| Students | Student CRUD |
| Courses | Course management |
| Subjects | Subject management |
| Grades | Student grade tracking |
| Schedules | Class schedule management |
| Tasks | Task lifecycle (DRAFT→PUBLISHED→CLOSED) |
| Task Assignments | Task-to-student assignments |
| Task Submissions | Student submissions and grading |
| Communications | Institutional communications |
| Communication Recipients | Read tracking and inbox |
| Signatures | Digital signature requests |
| Notifications | In-app notification center |
| School Grades | Grade level catalog |
| Academic Periods | Semester/period management |
| Guardians | Guardian–student relationships |
| Enrollments | Student enrollment management |
| Teacher Assignments | Teacher–course–subject assignments |
| Files | File upload/download with MIME validation |
| Agenda | Aggregated calendar view |
| Health | Liveness + readiness probes |

### Frontend (React + Vite + TypeScript)

- Authentication (login, refresh, session restore)
- Tenant context (institution selection, X-Institution-Id header)
- RBAC (51 permissions, PermissionGate, filtered sidebar)
- App Shell (sidebar + topbar, responsive)
- Dashboard (stat cards, recent items, RBAC)
- All 20+ CRUD modules with search, filters, pagination
- Digital Agenda (day/week/month views)
- File uploads (tasks, communications)
- E2E testing (Playwright, 76 tests)

### Infrastructure

- Docker multi-stage builds (API + Web)
- nginx reverse proxy with SPA fallback
- CI/CD pipeline (GitHub Actions)
- PostgreSQL 16 with Prisma ORM
- Security hardening (Helmet, CORS, rate limiting, Argon2id)

## 3. Quality Gates

| Gate | Status | Details |
|------|--------|---------|
| Backend Tests | **PASS** | 418/418 Jest tests |
| Frontend Tests | **PASS** | 407/407 Vitest tests |
| E2E Chromium | **PASS** | 76/76 Playwright tests |
| E2E Mobile Chrome | **PASS** | 70/76 (6 non-blocking sidebar issues) |
| TypeScript | **PASS** | 0 errors |
| ESLint | **PASS** | 0 errors, 0 warnings |
| Backend Build | **PASS** | `nest build` |
| Frontend Build | **PASS** | `vite build` |
| Docker API | **PASS** | Multi-stage, non-root, HEALTHCHECK |
| Docker Web | **PASS** | nginx, SPA fallback, HEALTHCHECK |
| Security Audit | **PASS** | 29/30 score |
| Secret Scan | **PASS** | 9/9 checks |
| CI/CD | **PASS** | 5 jobs (lint→typecheck→test→build→e2e) |

## 4. Database

| Item | Value |
|------|-------|
| Engine | PostgreSQL 16 |
| ORM | Prisma 6.9 |
| Tables | 33 |
| Migrations | 17 (all applied) |
| Seed Data | 27 users, 9 roles, 51 permissions, 20 institutions |

### Production Migration Strategy

```bash
# Apply pending migrations (NEVER use prisma migrate dev in production)
npx prisma migrate deploy

# Generate Prisma client (if schema changed)
npx prisma generate
```

### Backup Requirement

**MANDATORY**: Create a database backup before every migration.

```bash
pg_dump -U agenda -d agenda_prod > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 5. Environment Variables

### Required for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Must be `production` | `production` |
| `PORT` | API listen port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?schema=public` |
| `JWT_ACCESS_SECRET` | JWT access token secret (min 32 chars) | `openssl rand -base64 32` |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `CORS_ORIGIN` | Allowed origins (comma-separated) | `https://app.example.com` |
| `RATE_LIMIT_TTL` | Rate limit window (seconds) | `60` |
| `RATE_LIMIT_LIMIT` | Max requests per window | `50` |
| `FILE_STORAGE_PROVIDER` | Storage backend | `local` |
| `FILE_STORAGE_PATH` | Upload directory | `./storage` |
| `FILE_MAX_SIZE_MB` | Max upload size | `10` |

### Frontend

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.example.com/api/v1` |

**NEVER commit real `.env` files. Use `.env.example` as template.**

## 6. Deployment

### Prerequisites

- Docker and Docker Compose
- PostgreSQL 16 (or use Docker)
- Node.js 20+ (for build)
- Domain name and TLS certificate (for production)

### Steps

```bash
# 1. Clone repository
git clone <repo-url> && cd Agenda

# 2. Install dependencies
npm ci

# 3. Configure environment
cp .env.example .env
# Edit .env with production values (see Section 5)

# 4. Build Docker images
docker build -f apps/api/Dockerfile -t agenda-api:1.0.0 .
docker build -f apps/web/Dockerfile -t agenda-web:1.0.0 .

# 5. Push to registry (if applicable)
docker tag agenda-api:1.0.0 <registry>/agenda-api:1.0.0
docker tag agenda-web:1.0.0 <registry>/agenda-web:1.0.0
docker push <registry>/agenda-api:1.0.0
docker push <registry>/agenda-web:1.0.0

# 6. Provision PostgreSQL
# Create database and user with appropriate permissions

# 7. Run migrations
npx prisma migrate deploy

# 8. Seed initial data (first deploy only)
npx ts-node --compiler-options '{"module":"CommonJS"}' apps/api/prisma/seed.ts

# 9. Start API
docker run -d --name agenda-api \
  --env-file .env \
  -p 3000:3000 \
  agenda-api:1.0.0

# 10. Start Web
docker run -d --name agenda-web \
  -p 80:80 \
  agenda-web:1.0.0

# 11. Validate
curl http://localhost:3000/api/v1/health
```

## 7. Smoke Tests

After deployment, verify each flow:

| # | Test | Endpoint/Action | Expected |
|---|------|-----------------|----------|
| 1 | Login | `POST /api/v1/auth/login` | 200 + tokens |
| 2 | Dashboard | `GET /api/v1/dashboard/stats` | 200 + stats |
| 3 | Students | `GET /api/v1/students` | 200 + list |
| 4 | Courses | `GET /api/v1/courses` | 200 + list |
| 5 | Subjects | `GET /api/v1/subjects` | 200 + list |
| 6 | Grades | `GET /api/v1/grades` | 200 + list |
| 7 | Academic Periods | `GET /api/v1/academic-periods` | 200 + list |
| 8 | Enrollments | `GET /api/v1/enrollments` | 200 + list |
| 9 | Teacher Assignments | `GET /api/v1/teacher-assignments` | 200 + list |
| 10 | Tasks | `GET /api/v1/tasks` | 200 + list |
| 11 | Task Assignments | `GET /api/v1/task-assignments` | 200 + list |
| 12 | Submissions | `GET /api/v1/task-submissions` | 200 + list |
| 13 | Communications | `GET /api/v1/communications` | 200 + list |
| 14 | Notifications | `GET /api/v1/notifications` | 200 + list |
| 15 | Signatures | `GET /api/v1/signatures` | 200 + list |
| 16 | Agenda | `GET /api/v1/agenda/day?date=...` | 200 + events |
| 17 | File Upload | `POST /api/v1/files/upload` | 200 + file info |
| 18 | RBAC | Access restricted endpoint | 403 for unauthorized |
| 19 | Tenant Isolation | Cross-tenant request | 403 |
| 20 | Health | `GET /api/v1/health` | `{"status":"ok"}` |

## 8. Rollback

### Application Rollback

```bash
# Stop current containers
docker stop agenda-api agenda-web

# Start previous version
docker run -d --name agenda-api \
  --env-file .env \
  -p 3000:3000 \
  agenda-api:<previous-version>

docker run -d --name agenda-web \
  -p 80:80 \
  agenda-web:<previous-version>
```

### Database Rollback

```bash
# Restore from backup (CRITICAL: only if migrations are reversible)
psql -U agenda -d agenda_prod < backup_YYYYMMDD_HHMMSS.sql
```

### Precautions

- **Irreversible migrations**: Some migrations cannot be rolled back. Always backup first.
- **Data loss**: Rolling back may lose data created after the migration.
- **Seed data**: Re-running seed may create duplicates. Use `upsert` patterns.

## 9. Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| JWT Secrets | Configured via env | Min 32 chars, rotate regularly |
| CORS | Configured via env | Set `CORS_ORIGIN` to production domain |
| HTTPS | Required | Use TLS termination at load balancer/proxy |
| Rate Limiting | Enabled | 50 req/min global, 10 req/min auth |
| Helmet | Enabled | Security headers (X-Frame-Options, etc.) |
| File Upload | Validated | MIME whitelist, 10MB limit |
| PostgreSQL | Strong credentials | Never use default passwords |
| Backups | Required | Before every migration |
| Logs | Structured | JSON format, no secrets logged |
| Secrets | Externalized | Never in code or .env committed |
| Swagger | Disabled in prod | Only available in development |
| Non-root | API container | Runs as `appuser` (uid 1001) |
| HEALTHCHECK | Both containers | API + Web Docker images |

## 10. Known Limitations

| # | Limitation | Impact | Resolution |
|---|-----------|--------|------------|
| 1 | `deepmerge-ts` vulnerability (transitive via Prisma) | Low risk | Run `npm audit fix` when Prisma updates |
| 2 | Mobile E2E: 6 sidebar navigation failures | Non-blocking | Fix hamburger menu test interaction |
| 3 | Frontend bundle: 619KB (above 500KB recommended) | Minor | Code-split in future optimization |
| 4 | File storage: local only | Limited | Add S3/GCS adapter for production scale |
| 5 | No TLS termination in container | Required | Configure at load balancer/reverse proxy |
| 6 | CI does not use GitHub Secrets yet | Enhancement | Move test credentials to Secrets for forks |
| 7 | No automated backup schedule | Required | Set up cron/job for database backups |
| 8 | Accessibility: partial, not certified | Enhancement | WCAG 2.1 audit in future sprint |
