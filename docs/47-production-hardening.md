# PROMPT 47 — Production Hardening and Release Readiness Audit

## Executive Summary

The Agenda Escolar Digital platform underwent a comprehensive production hardening audit covering security, configuration, infrastructure, and deployment readiness. This document details all findings, implemented fixes, and remaining recommendations.

**Overall Production Readiness Score: 7.5 / 10**

| Category | Score | Notes |
|---|---|---|
| Backend Security | 8/10 | JWT auth, Argon2, RBAC, CORS tightened |
| Frontend Security | 7/10 | Token storage fixed, auth store consistent |
| Infrastructure | 5/10 | Dockerfiles + CI added; E2E still needed |
| Testing | 9/10 | 804 tests (395 FE + 409 BE), 0 failures |
| Code Quality | 9/10 | 0 TS errors, 0 lint errors, 0 console.log in app code |
| Documentation | 8/10 | Swagger, .env.example, this document |

---

## Findings and Fixes Implemented

### 1. CRITICAL — Token Storage Inconsistency (FIXED)

**Issue:** `useDownloadFile.ts` read tokens from `localStorage` using a raw key `'auth-storage'`, while the auth store uses `sessionStorage` with key `'agenda_access_token'`.

**Fix:** Updated `apps/web/src/modules/files/hooks/useDownloadFile.ts` to read from `sessionStorage.getItem('agenda_access_token')`, matching the auth store's storage mechanism.

### 2. HIGH — Password Policy Too Lenient (FIXED)

**Issue:** Password validation only checked length (8–128 chars). No complexity requirements.

**Fix:** Enhanced `apps/api/src/modules/auth/services/password.service.ts` with:
- At least one uppercase letter
- At least one lowercase letter
- At least one digit

Updated tests in `password.service.spec.ts` to match new policy.

### 3. HIGH — CORS `origin: true` in Development (FIXED)

**Issue:** Development CORS used `origin: true`, which reflects any requesting origin.

**Fix:** Changed to `origin: 'http://localhost:5173'` in development mode. Production requires explicit `CORS_ORIGIN` configuration.

### 4. HIGH — Missing Trust Proxy (FIXED)

**Issue:** No `trust proxy` configuration, meaning `req.ip` always returns the load balancer's IP.

**Fix:** Added `app.set('trust proxy', 1)` in `main.ts` using `NestExpressApplication` generic type.

### 5. MEDIUM — Swagger Enabled in Staging (FIXED)

**Issue:** Swagger UI was available whenever `NODE_ENV !== 'production'`, including staging.

**Fix:** Changed condition to `nodeEnv === 'development'` only.

### 6. MEDIUM — Rate Limit Too Generous (FIXED)

**Issue:** Global rate limit defaulted to 100 requests per 60s per IP.

**Fix:** Reduced default to 50 requests per 60s in `app.module.ts`.

### 7. MEDIUM — Misplaced Dependencies (FIXED)

**Issue:** `helmet` and `@nestjs/throttler` were in root `package.json` instead of `apps/api/package.json`.

**Fix:** Moved both to `apps/api/package.json` dependencies. Removed `@types/helmet` from root devDependencies (unnecessary).

### 8. MEDIUM — Storage Directory Not Gitignored (FIXED)

**Issue:** `storage/` directory (file uploads) was not in `.gitignore`.

**Fix:** Added `storage/` to root `.gitignore`.

### 9. LOW — Missing `.env.example` for Web (FIXED)

**Issue:** `apps/web/.env.example` had only one line with no documentation.

**Fix:** Rewrote with section header and explanatory comments.

### 10. LOW — CORS `maxAge` Not Set (FIXED)

**Issue:** CORS preflight requests were not cached.

**Fix:** Added `maxAge: 86400` (24h) to CORS configuration.

---

## Infrastructure Added

### Dockerfiles

- **`apps/api/Dockerfile`**: Multi-stage build (Node 20 Alpine → production)
- **`apps/web/Dockerfile`**: Multi-stage build (Node 20 → Nginx alpine)
- **`apps/web/nginx.conf`**: SPA fallback, API proxy, security headers, cache control
- **`.dockerignore`**: Excludes node_modules, dist, .env, storage, .git

### CI/CD Pipeline

- **`.github/workflows/ci.yml`**: 4-job pipeline (lint, typecheck, test, build)
  - Tests run against PostgreSQL 16 service container
  - Build depends on lint + typecheck + test passing
  - Caches npm dependencies
  - Node 20, ubuntu-latest

### .env.example Improvements

- Root `.env.example`: Added production warnings, JWT secret generation instructions, rate limit documentation
- `apps/web/.env.example`: Added section header and purpose documentation

---

## Audit Findings — Not Fixed (Recommendations)

### Security (Backend)

| Priority | Finding | Recommendation |
|---|---|---|
| HIGH | No client-side route-level RBAC guards | Implement `permissions` endpoint on backend; resolve via React Context |
| MEDIUM | Dev email provider logs password reset tokens | Add conditional provider registration based on `NODE_ENV` |
| MEDIUM | No request timeout on API client | Add AbortController with 30s timeout |
| MEDIUM | JWT secrets default to weak dev values | Add startup validation that production secrets differ from defaults |
| LOW | No CSP headers from Helmet | Configure Helmet with CSP directives for production |
| LOW | Argon2 memory cost at 64MB | Consider reducing to 32MB for memory-constrained environments |

### Infrastructure

| Priority | Finding | Recommendation |
|---|---|---|
| HIGH | No E2E test suite | Add Playwright smoke tests (login, dashboard, CRUD) |
| MEDIUM | No health check distinction | Differentiate `/health/live` vs `/health/ready` |
| MEDIUM | No request ID middleware | Add UUID-based request ID propagation |
| LOW | No structured JSON logging | Replace console.log with structured logger (e.g., pino/winston) |

### Frontend

| Priority | Finding | Recommendation |
|---|---|---|
| MEDIUM | No error boundary component | Add `ErrorBoundary` at route level |
| MEDIUM | No lazy loading in router | Add `React.lazy()` for route-level code splitting |
| LOW | Sidebar has no collapsed state | Add collapsible sidebar for mobile |

---

## Validation Results

| Check | Result |
|---|---|
| Frontend Tests | 395/395 passing (49 files) |
| Backend Tests | 409/409 passing (30 files) |
| Frontend TypeScript | 0 errors |
| Backend TypeScript | 0 errors |
| Frontend ESLint | 0 errors |
| Backend ESLint | 0 errors |
| Console.log in app code | 0 |
| TODO/FIXME/HACK | 0 |
| Hardcoded secrets | 0 |
| Eval/dangerouslySetInnerHTML | 0 |

---

## Release Recommendation

**Status: READY FOR STAGING**

The platform is functionally complete and production-hardened for staging deployment. Before production release:

1. **MUST**: Configure strong JWT secrets (generate with `openssl rand -base64 32`)
2. **MUST**: Set `CORS_ORIGIN` to production domain(s)
3. **SHOULD**: Add client-side RBAC (permissions endpoint)
4. **SHOULD**: Add E2E test suite (Playwright)
5. **NICE TO HAVE**: Error boundaries, lazy loading, structured logging
