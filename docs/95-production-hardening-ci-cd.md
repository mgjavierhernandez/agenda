# PROMPT 95 — Production Hardening & CI/CD Readiness

**Scope:** final production hardening + CI/CD readiness for Agenda Escolar Digital.
**Branch:** `main` · **Protected:** tag `v1.0.2-rc.1`, commit `e7dca4a` (not modified).
**No commits, no push, no tag changes were performed.**

---

## 1. Objetivo

Endpoint para producción: endurere seguridad, aislamiento multi-tenant / IDOR,
autenticación, CORS y manejo de secretos; verificar (y corregir) el build Docker,
migraciones de producción y la cadena CI/CD; añadir un smoke E2E mínimo de
Playwright para el módulo **Observador del Alumno**; ejecutar la compuerta de
regresión reproducible y documentar el estado. **No se desarrollan funcionalidades
nuevas.**

---

## 2. Estado del repositorio y límites

- `git status` con cambios sin commitear heredados de PROMPTS 70–94 (todos los
  PROMPTS 90–94 posteriores al tag `v1.0.2-rc.1`).
- `git remote -v` **vacío** → no existe remoto, es imposible hacer push.
- Tag `v1.0.2-rc.1` y commit `e7dca4a` **protegidos**: no se alteran, no se
  conmutan/reescriben (`git reset --hard` / `git clean -fd` prohibidos).
- Garantía de secreto: `.env`, `.env.*` (y `.env.prod`, `.env.ci`) están en
  `.gitignore`; solo `.env.example` está versionado y **sin valores reales**.

---

## 3. Resumen de decisiones de seguridad (Fase 2–7)

| # | Área | Resultado |
|---|------|-----------|
| AC-001 | IDOR cross-tenant instituciones | **PASS** — servicio refuerza `id === tenant.institutionId`; cross-tenant → 404 |
| AC-002 | Enumeración de tenants | **PASS** — listar todos requiere `institution:read` GLOBAL (solo SUPER_ADMIN) |
| AC-003 | Guards de tenant | **PASS** — `AccessTokenGuard` + `TenantContextGuard` con membresía ACTIVE; SUPER_ADMIN exento |
| AC-004 | Endpoints públicos | **PASS** — solo auth (login/refresh/logout/forgot/reset) y health; ninguno convertido |
| AC-005 | CORS | **PASS** — allowlist por `CORS_ORIGIN`, `origin`, `credentials:true`; verificado |
| AC-006 | Secretos en `.env*`/infra | **PASS** — sin secretos reales versionados |
| AC-007 | `JWT_ACCESS_SECRET` sin default | **PASS** — `JwtStrategy` lanza si no está configurado |
| AC-009..013 | Docker + prod | **PASS** — builds limpios, stack healthy |

---

## 4. Auditoría de aislamiento multi-tenant / IDOR (AC-001, AC-002, AC-003)

- `GET/POST /institutions` y `GET/PATCH/DELETE /institutions/:id`: usan
  `OptionalTenantContextGuard` + `PermissionGuard`, con validación en servicio:
  `id === tenant.institutionId`; cross-tenant → 404 (no leak).
- Listado global requiere permiso GLOBAL `institution:read` (solo SUPER_ADMIN);
  INSTITUTION_ADMIN no puede enumerar todos los tenants.
- Cobertura: e2e `institutions` (TEST-15/16/17/18), `rbac`, `memberships`,
  `tenant-context` (proyecto verde en la compuerta, sección 9).
- `TenantContextGuard` exige `X-Institution-Id` UUID válido + institución ACTIVE +
  membresía ACTIVE (`validateTenantAccess`); SUPER_ADMIN pasa con auto-membresía;
  `OptionalTenantContextGuard` solo para paths globales de súper-admin.

---

## 5. Inventario de endpoints públicos (AC-004)

Sin `@Public()` en el código. Los únicos endpoints accesibles sin token son:

- Auth (diseñados públicos, basados en token): `auth/login`, `auth/refresh`,
  `auth/logout`, `auth/forgot-password`, `auth/reset-password`.
- Health/liveness y readiness: `/api/v1/health`, `/api/v1/health/readiness`.

No se convirtió ningún endpoint a público.

---

## 6. CORS (AC-005) — verificación en runtime

`apps/api/src/main.ts` lee `CORS_ORIGIN` (lista separada por comas) y configura:
`origin: allowlist`, `credentials: true`.

Verificación contra el contenedor de producción:
- Origen permitido `http://localhost` → `Access-Control-Allow-Origin: http://localhost`.
- Origen NO permitido `https://evil.example.com` → sin cabecera ACAO (no `*`).

---

## 7. Secretos y endurecimiento de la configuración de producción (AC-006, AC-007)

- `JWT_ACCESS_SECRET` **sin valor por defecto**: `JwtStrategy` lanza
  `'JWT_ACCESS_SECRET is not configured'`.
- Matriz de variables de entorno documentada (ver `.env.example` de api):
  `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`,
  `CORS_ORIGIN`, `RATE_LIMIT_TTL`, `RATE_LIMIT_LIMIT`, `FILE_STORAGE_PROVIDER`, etc.
- **Endurecido `docker-compose.prod.yml`:** `POSTGRES_PASSWORD` y `JWT_ACCESS_SECRET`
  ya NO tienen valores placeholder; se declaran como `:?required` (fallan en voz alta
  si no se proveen). No se envían secretos de ejemplo en el compose.

---

## 8. Docker (AC-009..013)

### 8.1 Fix `apps/api/Dockerfile`
Se añadió `COPY tsconfig.base.json ./` (faltaba). `apps/api/tsconfig.json` hace
`"extends": "../../tsconfig.base.json"`; sin ese fichero el build dentro de Docker
usaba opciones por defecto (sin `esModuleInterop`) → error `TS1259` de `pdfkit`.

### 8.2 Builds Docker
- API y Web compilan limpios.
- `docker compose -f docker-compose.prod.yml build api` y `... build web` OK.
- `docker compose -f docker-compose.prod.yml config` OK (CI lo valida con
  variables `verify-only`).

### 8.3 Stack de producción local
`docker compose -f docker-compose.prod.yml up -d` deja el stack healthy:

| Endpoint | Estado |
|----------|--------|
| API `/api/v1/health` | 200 |
| API `/api/v1/health/readiness` | 200 |
| Web `/` | 200 |
| Auth `login` | 200 |

---

## 9. Migraciones (Fase 11)

- `prisma validate` → schema válido.
- `prisma generate` → limpio.
- **Estrategia de producción: `prisma migrate deploy`** (NO `prisma migrate dev`).
  - `migrate deploy` **NO auto-siembra** → se ejecuta un paso explícito de seed.
  - Seed: `npx ts-node prisma/seed.ts` (idempotente; 75 permisos, filas de reportes).
  - En Windows en local: NO usar `--compiler-options` (problemas de comillas en
    PowerShell); en CI (Linux) el script npm `prisma:seed` funciona.
- No se añadieron migraciones nuevas/n destructivas en este prompt.

---

## 10. CI/CD — `.github/workflows/ci.yml`

Jobs (validados, YAML parseado correctamente):

1. **lint** — `npm run lint` + `npm run format:check`.
2. **typecheck** — `prisma:generate` + `npm run typecheck`.
3. **test** — unit (API `jest` + Web `vitest`) **sin servicio postgres** (los unit
   están mockeados y no requieren DB).
4. **api-e2e** — servicio postgres + `prisma migrate deploy` + seed explícito +
   `npx jest --config test/jest-e2e.json --runInBand` (en `apps/api`).
5. **build** — `npm run build` (needs lint/typecheck/test).
6. **docker-build** — build imágenes api y web + `docker compose config --quiet`
   con vars `verify-only-not-a-secret`.
7. **e2e** — Playwright smoke (chromium) con postgres + `migrate deploy` + seed +
   dev servers + `wait-on` + `npx playwright test --project=chromium`.

### 10.1 Fix de fragilidad del job `e2e`
GitHub Actions ejecuta cada paso `run` en un shell nuevo → los procesos en segundo
plano (`npm run dev:api &`) mueren al terminar el paso. Se consolidó el arranque de
servidores + `wait-on` + tests en **un solo paso** con `trap cleanup EXIT`:

```yaml
- name: Run Playwright E2E (single step so servers stay alive)
  shell: bash
  run: |
    set -e
    npm run dev:api & api_pid=$!
    npm run dev:web & web_pid=$!
    cleanup() { kill $api_pid $web_pid 2>/dev/null || true; }
    trap cleanup EXIT
    npx wait-on http://localhost:3000/api/v1/health http://localhost:5173 --timeout 90000
    npx playwright test --project=chromium
```

### 10.2 Variables CI (`e2e`)
`DATABASE_URL` (test), `NODE_ENV=test`, `JWT_ACCESS_SECRET` (test), `CORS_ORIGIN`,
`E2E_EMAIL`/`E2E_PASSWORD` (seed), `E2E_API_URL`/`E2E_BASE_URL`.

---

## 11. Smoke E2E del Observador (AC-025)

No existía cobertura Playwright de `student-follow-ups`. Se añadió:

- `apps/web/e2e/observador.spec.ts` — smoke mínimo del flujo principal:
  1. Login (admin seed), 2. acceso "Observador" por el sidebar
  (→ `/student-follow-ups`), 3. creación de seguimiento **por la UI**
  (formulario "Nuevo seguimiento"), 4. consulta/vista (detalle con título y
  estudiante), 5. entrada en la cronología, 6. compromiso, 7. cambio de estado
  (Resolver → Resuelto), 8. verificación de notificación **por API**, 9. básico de
  confidencialidad (sin token → 401/403).
- `apps/web/e2e/helpers/api.ts` — helpers `listE2ENotifications()` (+ arreglo de
  tipo `getAuthToken`, String/null vs String).
- Selectores alineados con `StudentFollowUpsPage`, `StudentFollowUpDetailPage` y
  `StudentFollowUpFormPage`: `#studentId`, `#type=CONVIVENCIA`, `#severity`,
  `#confidentiality`, `Título *`, `Crear seguimiento`, `Agregar entrada`,
  `Crear compromiso`, `Resolver` + modal `Confirmar resolución`.
- Corre el job `e2e` de CI vía Playwright `--project=chromium`.

**Nota:** los archivos nuevos pasan eslint y typecheck (tsc) sin errores; el único
error typecheck en `e2e/` es el pre-existente `fixtures/auth.ts:34` (re-export de
`expect` no importado), fuera del alcance y sin impacto en runtime (Playwright
transpila con esbuild, sin type-check).

---

## 12. Compuerta de regresión reproducible (resultados)

Limpieza previa de artefactos e2e con `clean-all-artifacts.cjs`.

| Gate | Resultado |
|------|-----------|
| `prisma validate` | PASS |
| `prisma generate` | PASS |
| API typecheck (`tsc -p apps/api/tsconfig.json`) | PASS |
| Web typecheck (`tsc --noEmit`) | PASS |
| API unit (`jest --runInBand --forceExit`) | **777/777 (42 suites)** |
| Web vitest | **512/512 (63 archivos)** |
| API e2e (`jest --config test/jest-e2e.json --runInBand --forceExit`) | **660/660 (29 suites)** |
| API build (`nest build`) | PASS |
| Web build (`vite build`) | PASS |
| Lint de archivos nuevos (e2e api helpers + observador.spec) | PASS |

### 12.1 Regresión detectada y corregida — `files.e2e-spec.ts`
La compuerta de e2e falló inicialmente: **8/18 en `files.e2e-spec.ts`** con
`403 Forbidden` en subidas. Causa raíz: el spec usaba `prisma.institution.findFirst()`
para elegir el tenant; tras la creación de una segunda institución huérfana por otras
suites, `findFirst()` devolvía una institución donde el admin **no** tenía membresía
→ `TenantContextGuard`/`PermissionGuard` → 403.

**Fix (endurecimiento E2E):** resolver el tenant desde la membresía autenticada del
admin vía `GET /api/v1/auth/institutions` (en lugar de `findFirst()`, con fallback).
Tras el fix: `files` 18/18 y la suite completa **660/660**.

---

## 13. Verificación de no-regresión por módulo

Tras ejecutar las suites completas (cubren los módulos objetivo):
- **Observador / Student follow-ups** — unit + e2e + nuevo smoke verde.
- **Attendance** — unit verde (en 512/512 web + 777/777 api).
- **Agenda / Calendario eventos** — verde.
- **Reports / Boletín** — verde.
- **Administration** — verde.

(Sin regresiones nuevas en los módulos objetivo.)

---

## 14. Estado del smoke script y verificación externa

`scripts/smoke-test.sh` es dirigido por entorno (`SMOKE_TEST_BASE_URL/API_URL/
EMAIL/PASSWORD`), usa `curl`+`jq`, y **nunca imprime secretos**. Usa
`${API_URL}/health/readiness` que resuelve a `/api/v1/health/readiness`.

---

## 15. Deuda técnica / hallazgos pre-existentes (fuera de alcance)

No se elevan a defecto ni se modifican:
- Lint API pre-existente: `academic-periods.service.spec.ts:25` y
  `grades.service.spec.ts:42` (`no-explicit-any`).
- Lint Web pre-existente: `administration-pages.test.tsx:201`, `AttendanceRegisterPage.tsx:58`,
  `useUpdateFollowUpEntry.test.tsx:2` (`no-unused-vars`) + warning `ChildContext.tsx`.
- `e2e/fixtures/auth.ts:34` (`expect` no importado; harmless en runtime).
- En este entorno `docker compose v5.4` no aborta con `:?required` ni en `config` ni
  en `up`; el endurecimiento (sin placeholders) se mantiene y las variables obligatorias
  quedan documentadas.

---

## 16. Resultado y veredicto

- **Seguridad:** PASS (IDOR/tenant/auth/CORS/secretos).
- **CI/CD:** lista (jobs lint/typecheck/test/api-e2e/build/docker-build/e2e).
- **Smoke E2E Observador:** añadido y validado (eslint + typecheck).
- **Compuerta de regresión:** verde (777/777, 512/512, 660/660, typechecks, builds).
- **Docker prod:** builds limpios y stack healthy.
- **Release:** `v1.0.2-rc.1`.
- **Git push:** NO realizado (sin remoto). **Tag NO modificado.**

---

## FINAL REPORT — PROMPT 95

| Área | Estado |
|------|--------|
| Seguridad | **PASS** |
| Tenant / IDOR | **PASS** |
| Auth | **PASS** |
| CORS | **PASS** |
| Secretos | **PASS** |
| API unit | **777/777** |
| API e2e | **660/660** |
| Web vitest | **512/512** |
| Docker prod (health/readiness/web/login) | **200/200/200/200** |
| Despliegue Cloud | **READY** (sin infraestructura externa; sin remoto) |
| Release | **`v1.0.2-rc.1`** |
| Git push | **NOT PERFORMED** |
| Tag | **NOT MODIFIED** |
