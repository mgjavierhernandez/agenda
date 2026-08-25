# Agenda Escolar Digital

Plataforma **SaaS multi-institucion** de gestion y comunicacion escolar que centraliza la comunicacion entre **Colegio - Docentes - Estudiantes - Padres/Acudientes**.

**Principio de UX:** la plataforma debe ser mas facil de usar que un grupo de WhatsApp.

## Arquitectura

- **Monolito modular** para el MVP (no microservicios).
- **SaaS multi-tenant**: base de datos compartida con `tenant_id`.
- Separacion clara entre `apps/api` (backend), `apps/web` (frontend) y `packages/shared` (codigo compartido).

> Documento funcional y arquitectonico principal: [`docs/00-analisis-y-arquitectura.md`](docs/00-analisis-y-arquitectura.md)
> Documento de arquitectura tecnica de esta base: [`docs/01-arquitectura-tecnica.md`](docs/01-arquitectura-tecnica.md)

## Stack

| Componente | Tecnologia |
| --- | --- |
| Backend | NestJS + TypeScript |
| Frontend Web | React + Vite + TypeScript |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Infraestructura | Docker (local), preparada para AWS |
| Package manager | npm (workspaces) |

## Estructura del proyecto

```text
Agenda/
+-- apps/
|   +-- api/        # Backend NestJS
|   +-- web/        # Frontend React + Vite
+-- packages/
|   +-- shared/     # Codigo compartido
+-- docs/           # Documentacion
+-- infra/
|   +-- docker/     # Docker Compose (PostgreSQL local)
+-- package.json    # Workspace raiz
+-- .env.example    # Variables de entorno (ejemplo)
```

## Requisitos

- **Node.js** >= 20 (probado con v24)
- **npm** >= 10
- **Docker** (para levantar PostgreSQL local)

> Nota: Git y Docker deben instalarse manualmente. Este proyecto no los instala automaticamente.

## Instalacion

```bash
npm install
```

Copia las variables de entorno:

```bash
cp .env.example .env
```

## Configuracion de variables

Ver `.env.example`. Variables principales:

| Variable | Descripcion |
| --- | --- |
| `NODE_ENV` | `development`, `test`, `production` |
| `PORT` | Puerto del backend (default `3000`) |
| `CORS_ORIGIN` | Origenes permitidos para CORS, separados por coma |
| `DATABASE_URL` | Cadena de conexion PostgreSQL para Prisma |
| `POSTGRES_*` | Credenciales del contenedor PostgreSQL local |
| `JWT_ACCESS_SECRET` | Secreto JWT (min 32 caracteres, generar con `openssl rand -base64 32`) |

**Nunca** se debe commitear el archivo `.env`.

## Levantar PostgreSQL (Docker)

```bash
npm run db:up
```

Detener:

```bash
npm run db:down
```

## Ejecutar backend

```bash
npm run dev:api
```

Health check: `GET http://localhost:3000/api/v1/health`

## API Documentation (Swagger / OpenAPI)

Available in development/test environments:

- **Swagger UI**: `http://localhost:3000/api/docs`
- **OpenAPI JSON**: `http://localhost:3000/api/docs-json`

Swagger is **disabled** in production (`NODE_ENV=production`).

```bash
npm run prisma:generate   # Generar Prisma Client
npm run prisma:migrate    # Aplicar migraciones (requiere PostgreSQL arriba)
npm run prisma:studio     # Interfaz visual de la base de datos
```

## Ejecutar frontend

```bash
npm run dev:web
```

Abrir `http://localhost:5173`.

## Comandos disponibles (desde la raiz)

```bash
npm run build          # Compilar todos los workspaces
npm run lint           # ESLint en todos los workspaces
npm run format         # Formatear con Prettier
npm run format:check   # Verificar formato
npm run typecheck      # TypeScript sin emit
npm test               # Tests unitarios (api)
npm run test:e2e       # Tests E2E con Playwright (requiere backend corriendo)
npm run test:e2e:ui    # E2E con interfaz grafica de Playwright
npm run test:e2e:headed # E2E con navegador visible
npm run test:e2e:report # Abrir reporte HTML de Playwright
npm run test --workspace @agenda/web  # Tests frontend (407 tests)
```

### Variables de entorno para E2E

```bash
E2E_EMAIL=admin@demo-school.dev
E2E_PASSWORD=Demo1234!
E2E_BASE_URL=http://localhost:5173
E2E_API_URL=http://localhost:3000/api/v1
```

Tambien se pueden ejecutar por workspace:

```bash
npm run build --workspace @agenda/api
npm run dev --workspace @agenda/web
```

## Produccion

### Build Docker

```bash
docker build -f apps/api/Dockerfile -t agenda-api:1.0.0 .
docker build -f apps/web/Dockerfile -t agenda-web:1.0.0 .
```

### Migraciones en produccion

```bash
# NUNCA usar prisma migrate dev en produccion
npx prisma migrate deploy
```

### Documentacion de release

Ver [`docs/53-production-release.md`](docs/53-production-release.md) para el checklist completo de deployment.

Ver [`docs/production-runbook.md`](docs/production-runbook.md) para el runbook operativo.

## Testing

- **Backend**: 425 tests (Jest) — `npm test`
- **Frontend**: 407 tests (Vitest) — `npm run test --workspace @agenda/web`
- **E2E**: 76 tests (Playwright, Chromium) — `npm run test:e2e`
- **Total**: 908 tests

## Frontend Web (apps/web)

### Stack

- React 19.1 + Vite 6.3 + TypeScript 5.8
- Tailwind CSS 4.3
- react-router-dom 7.18 (routing)
- TanStack Query 5.102 (server state/cache)
- Vitest 4.1 + React Testing Library (testing)

### Estructura

```text
apps/web/src/
+-- api/           # API client, types, errors, query client
+-- app/           # Root App, router, ProtectedRoute
+-- auth/          # AuthProvider (login, refresh, logout, session restore)
+-- components/    # UI components (ui/, layout/, feedback/)
+-- layouts/       # AppLayout (authenticated), AuthLayout (public)
+-- pages/         # LoginPage, InstitutionSelect, Dashboard, 404, 403
+-- permissions/   # RBAC (PermissionGate, usePermissions)
+-- tenant/        # Tenant context (useTenant)
+-- __tests__/     # Frontend tests
```

### Modulos Implementados

- **Autenticacion JWT**: login, refresh, logout, session restore
- **Tenant Context**: seleccion de institucion, X-Institution-Id header
- **RBAC**: 51 permisos, PermissionGate, sidebar filtrado por permisos
- **App Shell**: sidebar + topbar responsive (mobile/desktop)
- **Dashboard**: stat cards, tareas recientes, notificaciones, firmas pendientes
- **Students**: CRUD completo, busqueda, paginacion, RBAC, responsive
- **Courses**: CRUD completo, busqueda, filtro por estado, paginacion, RBAC
- **Subjects**: CRUD completo, busqueda, filtro por estado, paginacion, RBAC
- **Grades**: CRUD completo, busqueda, filtros, RBAC, responsive
- **Schedules**: CRUD completo, busqueda, filtros, RBAC, responsive
- **Tasks**: CRUD con lifecycle (DRAFT→PUBLISHED→CLOSED), RBAC, responsive
- **Task Assignments**: Asignacion con seleccion multiple, filtros, RBAC
- **Task Submissions**: Entregas, calificacion, feedback, RBAC
- **Communications**: CRUD con lifecycle, audiencia, RBAC
- **Communication Recipients**: Bandeja de entrada, read tracking, badge
- **Signatures**: CRUD con lifecycle, multiple firmantes, RBAC
- **Notifications**: Centro de notificaciones, read/unread, badge
- **Academic Periods**: CRUD, busqueda, lifecycle, RBAC
- **School Grades**: CRUD, busqueda, orden, RBAC
- **Guardians**: Vinculaciones acudiente-estudiante, RBAC
- **Enrollments**: CRUD de matriculas, filtros, RBAC
- **Teacher Assignments**: CRUD de asignaciones docentes, RBAC
- **Agenda Digital**: Vista calendario (dia/semana/mes), RBAC, responsive
- **File Uploads**: Upload multipart, MIME validation, 10MB limit

## Estado actual

MVP v1.0.1 completo. Backend: 24 modulos, 425 tests. Frontend: 20+ modulos, 407 tests. E2E: 76 tests. Docker images validados. Security audit 29/30. CI/CD pipeline funcional. Produccion lista para deployment. Ver [`docs/53-production-release.md`](docs/53-production-release.md).