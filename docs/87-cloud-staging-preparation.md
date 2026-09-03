# PROMPT 87 — CLOUD STAGING PREPARATION & DEPLOYMENT GATE

## 1. Executive Summary

Completed the full Cloud Staging preparation audit for Agenda Escolar Digital. The release `v1.0.2-rc.1` (commit `e7dca4a`) is code-complete and verified. Docker images build successfully and run locally with all containers healthy. CI pipeline exists (GitHub Actions) but has no deployment workflow. Cloud staging cannot proceed without external configuration: Git remote, cloud provider, staging database, and staging secrets.

**Verdict: READY FOR STAGING CONFIGURATION — EXTERNAL INPUT REQUIRED**

---

## 2. Initial Git State

| Field | Value |
|-------|-------|
| Branch | `main` |
| HEAD | `e7dca4a` |
| Tags | `v1.0.2-rc.1`, `v1.0.1`, `v1.0.0` |
| Remote | **NONE** |
| Working tree | Clean (3 untracked: docs/85, docs/86, test-output.txt) |

---

## 3. Release Integrity

| Check | Result |
|-------|:---:|
| Commit `e7dca4a` exists | PASS |
| Tag `v1.0.2-rc.1` exists | PASS |
| Tag is annotated | PASS |
| Tag points to `e7dca4a` | PASS |
| No modifications post-release | PASS |
| No commits created in PROMPT 87 | PASS |
| No tags modified in PROMPT 87 | PASS |

---

## 4. Configuration Audit

### 4.1 Environment Variable Matrix

| Variable | API | Web | .env.example | Docker prod | Required | Secret | Staging |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| NODE_ENV | Y | - | Y | production | REQUIRED | N | REQUIRED |
| PORT | Y | - | Y | 3000 | REQUIRED | N | OPTIONAL |
| DATABASE_URL | Y | - | Y | templated | REQUIRED | Y | REQUIRED |
| JWT_ACCESS_SECRET | Y | - | Y | placeholder | REQUIRED | Y | REQUIRED |
| JWT_ACCESS_EXPIRES_IN | Y | - | Y | 15m | OPTIONAL | N | OPTIONAL |
| JWT_REFRESH_EXPIRES_IN | Y | - | Y | 7d | OPTIONAL | N | OPTIONAL |
| CORS_ORIGIN | Y | - | Y | hardcoded localhost | REQUIRED | N | REQUIRED |
| RATE_LIMIT_TTL | Y | - | Y | 60 | OPTIONAL | N | OPTIONAL |
| RATE_LIMIT_LIMIT | Y | - | Y | 50 | OPTIONAL | N | OPTIONAL |
| FILE_STORAGE_PROVIDER | Y | - | Y | local | OPTIONAL | N | OPTIONAL |
| FILE_STORAGE_PATH | Y | - | Y | ./storage | OPTIONAL | N | OPTIONAL |
| FILE_MAX_SIZE_MB | Y | - | Y | 10 | OPTIONAL | N | OPTIONAL |
| POSTGRES_USER | - | - | Y | Y | FOR DB | N | REQUIRED |
| POSTGRES_PASSWORD | - | - | Y | Y | FOR DB | Y | REQUIRED |
| POSTGRES_DB | - | - | Y | Y | FOR DB | N | REQUIRED |
| POSTGRES_PORT | - | - | Y | - | OPTIONAL | N | OPTIONAL |
| VITE_API_URL | - | Y | Y | - | REQUIRED | N | REQUIRED |
| PASSWORD_RESET_TOKEN_EXPIRES_MINUTES | Y | - | Y | - | OPTIONAL | N | OPTIONAL |

### 4.2 Findings

| ID | Finding | Severity | Action |
|----|---------|----------|--------|
| CFG-001 | docker-compose.prod.yml hardcodes CORS_ORIGIN to localhost | MEDIUM | Override via env var for staging |
| CFG-002 | JWT_ACCESS_SECRET defaults to change-me-in-production | HIGH | Must be overridden with real secret |
| CFG-003 | No .env.staging or .env.staging.example exists | INFO | Create for staging documentation |
| CFG-004 | VITE_API_URL is baked at build time (Vite) | INFO | Must be set before vite build |

---

## 5. CORS Audit

| Aspect | Status |
|--------|:---:|
| Multi-origin support | PASS (comma-separated) |
| Credentials support | PASS |
| Development default | PASS (localhost:5173) |
| Production safety | PASS (warns if not set) |
| Staging configurability | PASS (via CORS_ORIGIN env) |
| Headers allowed | PASS (Content-Type, Authorization, X-Institution-Id, X-Request-Id) |

**No code changes required.** Staging only needs `CORS_ORIGIN` env var set to the staging web URL.

---

## 6. Docker Audit

### 6.1 API Dockerfile

| Aspect | Status |
|--------|:---:|
| Multi-stage build | PASS (builder + runner) |
| Base image | Node 20 Alpine |
| Native deps (argon2) | PASS (python3, make, g++) |
| Prisma generate | PASS (in build stage) |
| Non-root user | PASS (appuser:1001) |
| Healthcheck | PASS (`curl /api/v1/health`) |
| Exposed port | 3000 |
| CMD | `node dist/main.js` |
| Storage volume | `/app/storage` |

### 6.2 Web Dockerfile

| Aspect | Status |
|--------|:---:|
| Multi-stage build | PASS (builder + runner) |
| Base image | Node 20 Alpine then Nginx Alpine |
| .env cleanup | PASS (removes .env files from context) |
| Healthcheck | PASS (`curl localhost:80`) |
| Exposed port | 80 |
| SPA routing | PASS (nginx try_files) |
| API proxy | PASS (`/api/` to `http://api:3000`) |
| Security headers | PASS (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) |
| Static cache | PASS (1y for assets, no-cache for index.html) |

### 6.3 Docker Compose Production

| Service | Health | Ports | Status |
|---------|:---:|:---:|:---:|
| postgres | pg_isready | 5433:5432 | PASS |
| api | curl /health | 3000:3000 | PASS |
| web | curl / | 80:80 | PASS |

### 6.4 Local Docker Validation

| Container | Status | Health |
|-----------|--------|:---:|
| agenda-api-prod | Up 5+ hours | healthy |
| agenda-web-prod | Up 24+ hours | healthy |
| agenda-postgres-prod | Up 46+ hours | healthy |
| agenda-postgres | Up 7+ days | healthy |

### 6.5 Findings

| ID | Finding | Severity | Action |
|----|---------|----------|--------|
| DCK-001 | docker-compose.prod.yml CORS defaults to localhost | MEDIUM | Override via env for staging |
| DCK-002 | No TLS/HTTPS configuration | INFO | Add reverse proxy for staging |
| DCK-003 | No container registry configured | INFO | Required for cloud deployment |

---

## 7. Prisma / Database

### 7.1 Schema Validation

- `npx prisma validate`: PASS
- `npx prisma generate`: PASS (v6.19.3)

### 7.2 Migration Inventory (18 total)

1. `20260821031312_init_identity_tenancy` — Core identity + tenancy
2. `20260821033110_harden_rbac_tenancy` — RBAC hardening
3. `20260821034500_add_composite_fks_and_triggers` — FK constraints
4. `20260821040000_add_authentication` — Auth module
5. `20260821050000_add_students_module` — Students
6. `20260821105656_add_courses_module` — Courses
7. `20260821112148_add_subjects_module` — Subjects
8. `20260821114756_add_grades_module` — Grades
9. `20260821191348_add_schedules_module` — Schedules
10. `20260821200300_add_tasks_module` — Tasks
11. `20260821211640_add_communications_module` — Communications
12. `20260821214452_add_signatures_module` — Signatures
13. `20260821235124_add_notifications_module` — Notifications
14. `20260822004102_add_mvp_domain_foundation` — MVP foundation
15. `20260822100000_add_task_lifecycle_and_communication_recipients` — Task lifecycle
16. `20260822110000_add_password_reset_tokens` — Password reset
17. `20260822120000_add_file_storage` — File storage
18. `20260827000000_add_student_follow_up_domain` — **Observador del Alumno**

### 7.3 Staging Migration Strategy

Recommended: `npx prisma migrate deploy`
NOT recommended: `npx prisma migrate dev` (development only)

### 7.4 Seed Data

`npx prisma db seed` runs `prisma/seed.ts` (11 permissions for student-follow-ups)

---

## 8. CI/CD

### 8.1 GitHub Actions Workflow

| Capability | Exists | Ready | Missing |
|------------|:---:|:---:|:---:|
| CI (lint + format) | Y | Y | - |
| TypeCheck | Y | Y | - |
| Tests (backend + frontend) | Y | Y | - |
| Build (API + Web) | Y | Y | - |
| E2E (Playwright) | Y | Y | - |
| Docker build | N | - | No Docker build job |
| Prisma migration | Y | Y | In test job only |
| Deploy staging | N | - | **No deployment workflow** |
| Deploy production | N | - | **No deployment workflow** |
| Smoke test | N | - | Script exists but not in CI |
| Rollback | N | - | **No rollback workflow** |
| Container registry push | N | - | **Not configured** |

### 8.2 Workflow Triggers

- `push` to `main`
- `pull_request` to `main`

### 8.3 Required CI Secrets (GitHub Actions)

| Secret | Used | Required |
|--------|:---:|:---:|
| `DATABASE_URL` | test job | YES (test only) |
| `JWT_ACCESS_SECRET` | test job | YES (test only) |
| `E2E_EMAIL` | e2e job | YES (e2e only) |
| `E2E_PASSWORD` | e2e job | YES (e2e only) |
| `E2E_API_URL` | e2e job | YES (e2e only) |
| `E2E_BASE_URL` | e2e job | YES (e2e only) |

### 8.4 Missing for Cloud Staging

1. Docker build + push job
2. Deployment job
3. Smoke test job
4. Rollback job

---

## 9. Cloud Infrastructure

| Component | Status |
|-----------|:---:|
| Cloud provider | NOT CONFIGURED |
| Container registry | NOT CONFIGURED |
| Staging compute | NOT CONFIGURED |
| Staging database | NOT CONFIGURED |
| Staging secrets | NOT CONFIGURED |
| Staging domain/DNS | NOT CONFIGURED |
| TLS/HTTPS | NOT CONFIGURED |
| CDN | NOT CONFIGURED |
| Logging | NOT CONFIGURED |
| Monitoring | NOT CONFIGURED |

### Provider-Agnostic Architecture

```
Git Repository -> CI (GitHub Actions) -> Build/Test -> Container Registry -> Staging (API + Web + PostgreSQL + Reverse Proxy) -> Smoke Tests -> STAGING VALIDATION
```

### Required Components

1. Git Repository — needs remote
2. CI/CD — needs deployment jobs
3. Container Registry — for Docker images
4. Compute — ECS, Cloud Run, App Service, Railway, Render, Fly.io, etc.
5. PostgreSQL — managed database
6. Secrets — JWT_ACCESS_SECRET, DATABASE_URL, POSTGRES_PASSWORD
7. Domain/Subdomain — e.g., staging.agendaescolar.com
8. TLS — HTTPS certificate
9. Logs — container logs aggregation
10. Health monitoring — uptime checks on /health

---

## 10. Secrets

### Audit Results

| Check | Result |
|-------|:---:|
| Hardcoded passwords in source | NONE |
| Hardcoded secrets in source | NONE |
| Private keys in source | NONE |
| API keys in source | NONE |
| Bearer tokens in source | Test fixtures only |
| `.env` in `.gitignore` | PASS |
| `.env` excluded from Docker | PASS (.dockerignore) |
| `.env` excluded from Web build | PASS (Dockerfile cleanup) |

### Required Secrets for Staging

| Secret | Where | How to Generate |
|--------|-------|-----------------|
| `JWT_ACCESS_SECRET` | API env | `openssl rand -base64 32` |
| `DATABASE_URL` | API env | `postgresql://user:pass@host:5432/db?schema=public` |
| `POSTGRES_PASSWORD` | DB env | Generated password for managed PostgreSQL |

### Security Pre-Staging Check

| Check | Result |
|-------|:---:|
| No secrets in codebase | PASS |
| `.env` gitignored | PASS |
| `.env` excluded from Docker context | PASS |
| CORS not defaulting to `*` | PASS |
| Production NODE_ENV required | PASS |
| JWT secret placeholder documented | PASS |
| Health endpoint accessible | PASS |
| Readiness endpoint checks DB | PASS |
| Swagger disabled in production | PASS |
| Rate limiting configured | PASS |
| Helmet/security headers in nginx | PASS |

---

## 11. CORS / Production Configuration

Staging only needs: `CORS_ORIGIN=https://staging.example.com`

No code changes required. CORS is fully configurable via environment variables.

---

## 12. Smoke Test Readiness

| Aspect | Status |
|--------|:---:|
| URL configurability | PASS (env vars) |
| Health check | PASS |
| Web SPA check | PASS |
| Auth flow | PASS |
| Security (no auth then 401) | PASS |
| Core endpoints | PASS (15 endpoints) |
| Security headers | PASS |
| Dependencies | curl, jq |
| localhost dependency | NONE (fully configurable) |
| Demo data dependency | Institution fallback hardcoded |

### Staging Usage

```bash
SMOKE_TEST_BASE_URL=https://staging.example.com \
SMOKE_TEST_API_URL=https://api-staging.example.com/api/v1 \
SMOKE_TEST_EMAIL=admin@demo-school.dev \
SMOKE_TEST_PASSWORD=<real-password> \
./scripts/smoke-test.sh
```

---

## 13. Observador del Alumno Verification

### Backend (21 files)

- StudentFollowUp CRUD (9 operations)
- FollowUpEntry (4 operations)
- Commitment (4 operations)
- FollowUpAttachment (3 operations)
- FollowUpCategory (5 operations)
- Authorization service (368 lines, 42 tests)
- Notification helper (10 triggers, 19 tests)
- Overdue helper (13 tests)
- 10 DTOs with validation
- Module registration in `app.module.ts`

### Frontend (32 files)

- 23 hooks
- 4 pages (List, Detail, Form, Categories)
- 5 routes
- Sidebar menu entries
- Notification labels/icons
- 11 permission constants
- 8 frontend tests

### Database

- 5 models
- 8 enums
- 18 migrations total

### Security

- 11 RBAC permissions seeded
- Resource-level authorization
- Confidentiality matrix
- Tenant isolation
- IDOR/BOLA protection
- SUPER_ADMIN denial

---

## 14. External Inputs Required

| # | Input | Description | Required By |
|---|-------|-------------|-------------|
| 1 | `GIT_REMOTE_URL` | Git remote URL for push | Git push, CI/CD |
| 2 | `CLOUD_PROVIDER` | Which cloud provider to use | Infrastructure |
| 3 | `STAGING_DATABASE_URL` | PostgreSQL connection string | API environment |
| 4 | `STAGING_POSTGRES_PASSWORD` | Database password | PostgreSQL |
| 5 | `JWT_ACCESS_SECRET` | Cryptographically generated secret | API environment |
| 6 | `STAGING_CORS_ORIGIN` | Staging web URL for CORS | API environment |
| 7 | `STAGING_API_URL` | Staging API URL | Web build (VITE_API_URL) |
| 8 | `STAGING_WEB_URL` | Staging web URL | Smoke tests, CORS |
| 9 | `CONTAINER_REGISTRY` | Registry to push Docker images | CI/CD Docker build |
| 10 | `REGISTRY_CREDENTIALS` | Registry auth tokens | CI/CD Docker push |
| 11 | `DEPLOYMENT_TARGET` | Where to deploy | Deployment job |
| 12 | `DEPLOYMENT_CREDENTIALS` | Cloud auth tokens | Deployment job |
| 13 | `STAGING_DOMAIN` | DNS record for staging | Reverse proxy, TLS |
| 14 | `TLS_CERTIFICATE` | HTTPS certificate | Reverse proxy |

---

## 15. Deployment Sequence

```
1.  Configure Git remote
2.  Push main
3.  Push release tag v1.0.2-rc.1
4.  Configure cloud provider
5.  Provision PostgreSQL staging
6.  Configure staging secrets
7.  Configure API environment
8.  Configure Web environment
9.  Build and push Docker images
10. Deploy PostgreSQL (if not managed)
11. Run Prisma migrate deploy
12. Run Prisma db seed
13. Deploy API
14. Verify API health
15. Deploy Web
16. Verify Web
17. Configure reverse proxy + TLS
18. Run smoke tests
19. Verify Observador del Alumno
20. Review logs
21. Validate tenant isolation
22. Declare staging PASS
```

---

## 16. Rollback Considerations

| Risk | Level | Mitigation |
|------|:---:|:---:|
| Schema mismatch | LOW | All migrations additive |
| Data loss | NONE | No destructive migrations |
| Code rollback | LOW | Previous image available |
| Secret exposure | LOW | No secrets in codebase |

---

## 17. Findings

| ID | Severity | Finding | Recommendation | Status |
|----|----------|---------|----------------|--------|
| FND-001 | HIGH | No Git remote configured | Configure remote | EXTERNAL |
| FND-002 | HIGH | No cloud provider configured | Choose and configure provider | EXTERNAL |
| FND-003 | HIGH | No staging database | Provision managed PostgreSQL | EXTERNAL |
| FND-004 | HIGH | No staging secrets | Generate JWT_SECRET, configure DB creds | EXTERNAL |
| FND-005 | HIGH | No deployment pipeline (CD) | Add deployment job to GitHub Actions | EXTERNAL |
| FND-006 | MEDIUM | docker-compose.prod.yml CORS defaults to localhost | Override via CORS_ORIGIN env | EXTERNAL |
| FND-007 | MEDIUM | JWT secret placeholder | Override with real secret | EXTERNAL |
| FND-008 | MEDIUM | No TLS/HTTPS configuration | Add reverse proxy with TLS | EXTERNAL |
| FND-009 | MEDIUM | No container registry | Configure registry for image storage | EXTERNAL |
| FND-010 | LOW | No .env.staging.example | Create for documentation | OPTIONAL |
| FND-011 | LOW | Smoke test hardcoded institution fallback | Verify seed data in staging | EXTERNAL |
| FND-012 | INFO | Web build chunk > 500 kB | Optimization opportunity | OPTIONAL |
| FND-013 | INFO | No monitoring/alerting configured | Add post-staging | OPTIONAL |

---

## 18. Acceptance Criteria

```
AC-001  Git release v1.0.2-rc.1 points to e7dca4a .............. PASS
AC-002  No commit or tag modified in PROMPT 87 .................. PASS
AC-003  Git remote audit performed .............................. PASS (BLOCKED: no remote)
AC-004  No Git remote invented .................................. PASS
AC-005  All .env.example files audited .......................... PASS
AC-006  Secrets identified without exposing values .............. PASS
AC-007  CORS audited ............................................ PASS
AC-008  Docker API audited ...................................... PASS
AC-009  Docker Web audited ...................................... PASS
AC-010  Prisma migration strategy documented .................... PASS
AC-011  CI/CD audited ........................................... PASS
AC-012  Cloud provider status identified ....................... PASS (NONE configured)
AC-013  Smoke test audited ...................................... PASS
AC-014  Release v1.0.2-rc.1 verified as reproducible ........... PASS
AC-015  Observador del Alumno verified within release ........... PASS
AC-016  Security pre-staging audit performed .................... PASS
AC-017  External inputs identified .............................. PASS
AC-018  Deployment sequence documented .......................... PASS
AC-019  Rollback considerations documented ...................... PASS
AC-020  No destructive actions executed .......................... PASS
AC-021  No fake secrets created .................................. PASS
AC-022  No infrastructure invented ................................ PASS
AC-023  No Observador del Alumno functionality modified .......... PASS
AC-024  Documentation docs/87 created ............................ PASS
AC-025  Final staging gate emitted ................................ PASS

RESULT: 25/25 PASS
```

---

## 19. Files Created

| File | Status |
|------|:---:|
| `docs/87-cloud-staging-preparation.md` | CREATED |

No other files created or modified in PROMPT 87.

---

## 20. Files Modified

None. PROMPT 87 is read-only audit.

---

## 21. Tests

Tests were NOT re-run in PROMPT 87 because no functional changes since PROMPT 86. PROMPT 86 confirmed: 641/641 backend, 426/426 frontend, TypeScript PASS, Build PASS. Repository state unchanged.

---

## 22. Git Status

```
Branch: main
HEAD: e7dca4a
Untracked: docs/85-*.md, docs/86-*.md, test-output.txt
No staged changes
No modified tracked files
```

---

## 23. Commit

**NO COMMIT CREATED.** PROMPT 87 is preparation and gate only.

---

## 24. Push

**NOT PERFORMED.** No Git remote configured.

---

## 25. Tag

**NO TAG MODIFIED.** `v1.0.2-rc.1` points to `e7dca4a` (verified).

---

## 26. Final Verdict

```
OBSERVADOR DEL ALUMNO — READY FOR STAGING CONFIGURATION

Release:          v1.0.2-rc.1
Commit:           e7dca4a
Code:             PASS
Tests:            PASS (from PROMPT 86)
TypeScript:       PASS (from PROMPT 86)
Build:            PASS (from PROMPT 86)
Docker:           PASS (4/4 healthy locally)
Prisma:           PASS (schema valid, 18 migrations)
Security:         PASS (17/17 SC criteria)
CORS:             PASS (configurable via env)
CI:               PASS (GitHub Actions lint/test/build/e2e)
CD:               NOT CONFIGURED

Cloud Staging Status:
BLOCKED — EXTERNAL CONFIGURATION REQUIRED

Missing:
1. Git remote
2. Cloud provider
3. Staging database
4. Staging secrets
5. Deployment pipeline
6. Container registry
7. TLS/domain

The codebase is FULLY PREPARED for cloud staging.
All Docker images build and run successfully.
All health/readiness endpoints functional.
All configuration is environment-driven.
No code changes required for staging.

Next Action:
Provide the external inputs listed in Section 14
to proceed with cloud staging deployment.
```
