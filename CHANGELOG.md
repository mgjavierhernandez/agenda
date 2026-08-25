# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.1] - 2026-08-25

### Fixed

- **Agenda Digital**: `parseTime()` now handles Prisma `Date` objects correctly. Previously, `String(time)` on a `Date` produced `"1970-01-01T08:00:00.000Z"`, causing `parseInt("1970-01-01T08")` → `NaN` → `setHours(NaN)` → `RangeError: Invalid time value`. The fix uses `getHours()`/`getMinutes()` for Date objects and returns `null` for invalid values, allowing `getScheduleEvents()` to skip them gracefully.
- **nginx.conf**: Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) now applied in `location /` and `location = /index.html` blocks to prevent nginx header inheritance issues.
- **docker-compose.prod.yml**: `DATABASE_URL` now uses environment variable interpolation instead of hardcoded dev credentials.

### Added

- 8 regression tests for `parseTime()` and `getScheduleEvents()` covering Date objects, null/undefined values, invalid strings, and RangeError prevention.
- Documentation for v1.0.1 changes: `docs/56-agenda-bugfix-hardening.md`, `docs/57-release-candidate.md`.

### Security

- All existing security controls validated: JWT authentication, tenant isolation, RBAC, rate limiting, Helmet, CORS, no stack traces in production responses.

## [1.0.0] - 2026-08-24

### Added

- Initial production release.
- Multi-institution SaaS platform with 32 Prisma models.
- NestJS API with JWT auth, RBAC, tenant isolation, rate limiting.
- React + Vite + TypeScript frontend with protected routes.
- 15+ modules: students, courses, subjects, grades, schedules, tasks, communications, notifications, signatures, agenda, and more.
- Docker Compose production configuration.
- CI/CD pipeline with 5 GitHub Actions jobs.
- 425 backend tests, 407 frontend tests.
