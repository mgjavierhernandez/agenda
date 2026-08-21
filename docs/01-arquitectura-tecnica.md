# 01 - Arquitectura Tecnica (Bootstrap)

**Version:** 0.1.0
**Fecha:** 20 de agosto de 2026
**Estado:** Base inicial del proyecto

Este documento describe la infraestructura tecnica creada en la etapa de bootstrap.

El documento funcional y arquitectonico principal sigue siendo:

- [`docs/00-analisis-y-arquitectura.md`](./00-analisis-y-arquitectura.md)

---

## 1. Decisiones aplicadas

| Decision | Valor | Detalle |
| --- | --- | --- |
| Arquitectura | Monolito modular | Un solo backend NestJS; modulos por dominio a futuro |
| Multi-tenancy | Shared DB + `tenant_id` | A implementar en la fase de modelos |
| Repositorio | Monorepo con npm workspaces | `apps/*` y `packages/*` |
| Backend | NestJS + TypeScript | `apps/api` |
| Frontend Web | React + Vite + TypeScript | `apps/web` |
| Mobile | Flutter | Planificado, NO implementado en esta etapa |
| Base de datos | PostgreSQL 16 | Via Docker Compose local |
| ORM | Prisma | Configurado, sin modelos aun |
| Configuracion | Variables de entorno | `@nestjs/config`, archivo `.env` (nunca commiteado) |
| API | Prefijo global + versionado | `api/v1` |
| Con convencion | Health check | `GET /api/v1/health` |

## 2. Estructura del repositorio

```text
Agenda/
+-- apps/
|   +-- api/                    # Backend NestJS
|   |   +-- src/
|   |   |   +-- main.ts
|   |   |   +-- app.module.ts
|   |   |   +-- modules/
|   |   |       +-- health/
|   |   +-- prisma/
|   |   |   +-- schema.prisma
|   |   |   +-- migrations/
|   |   +-- test/               # e2e (supertest)
|   +-- web/                    # Frontend React + Vite
|       +-- src/
|       +-- vite.config.ts
|       +-- index.html
+-- packages/
|   +-- shared/                 # Tipos y constantes compartidas
+-- infra/
|   +-- docker/
|       +-- docker-compose.yml  # PostgreSQL local
+-- docs/
+-- package.json                # Workspace raiz
+-- tsconfig.base.json          # Configuracion TypeScript compartida
+-- .env.example
+-- .gitignore
+-- .prettierrc
+-- .editorconfig
```

## 3. Convenciones aplicadas

### API

- Prefijo global: `api/v1` (se aplica en `main.ts` y en los tests e2e).
- El health check responde `{ "status": "ok" }` en `GET /api/v1/health`.
- Versionado por prefijo de URL (no por headers) para simplicidad inicial.

### Configuracion

- `@nestjs/config` global con `envFilePath: ['.env', '../../.env']`.
- El backend lee el `.env` de la raiz del monorepo.
- No hay secretos commiteados; solo existe `.env.example`.

### TypeScript

- `tsconfig.base.json` en la raiz con `strict: true`.
- Cada workspace extiende la base y ajusta `module`, `target`, `lib`, etc.
- No se usa `any` sin justificacion.

### Calidad de codigo

- ESLint (flat config) en cada workspace.
- Prettier con configuracion compartida en la raiz.
- Scripts `lint`, `format`, `format:check`, `typecheck`, `build`, `test`.

## 4. Componentes de la infraestructura

### Backend (`apps/api`)

- NestJS 11 + TypeScript.
- Modulo de salud (`HealthModule`) unico por ahora.
- `ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`.
- CORS configurable via `CORS_ORIGIN`.
- Prisma configurado con datasource PostgreSQL (sin modelos aun).

### Frontend (`apps/web`)

- React 19 + Vite 6 + TypeScript.
- Pagina inicial estatica con el nombre del producto.
- Consume `@agenda/shared` para constantes/tipos.

### Paquete compartido (`packages/shared`)

- Constantes (`APP_NAME`, `API_PREFIX`).
- Tipos genericos (`ApiResponse`, `PaginatedResult`, `HealthResponse`).
- No duplica modelos de Prisma.

### Infraestructura local (`infra/docker`)

- `docker-compose.yml` levanta PostgreSQL 16 en el puerto `5432`.
- Credenciales de desarrollo configurables via `.env` (valores por defecto claramente marcados como de desarrollo).
- Volume persistente `agenda-postgres-data`.

## 5. Scripts del workspace raiz

| Script | Descripcion |
| --- | --- |
| `npm run build` | Compila todos los workspaces |
| `npm run lint` | ESLint en todos los workspaces |
| `npm run format` / `format:check` | Prettier |
| `npm run typecheck` | TypeScript sin emit |
| `npm test` | Tests unitarios (api) |
| `npm run test:e2e` | Tests e2e (api) |
| `npm run dev:api` | Backend en modo watch |
| `npm run dev:web` | Frontend Vite |
| `npm run db:up` / `db:down` | PostgreSQL local |
| `npm run prisma:*` | Comandos Prisma delegados a `apps/api` |

## 6. Decisiones pendientes / proximos pasos

1. **Instalar Git** manualmente e inicializar el repositorio (`git init`) y hacer el primer commit.
2. **Instalar Docker** manualmente para poder levantar PostgreSQL local y validar migraciones.
3. Definir el **modelo de datos** en Prisma (siguiendo `docs/00-analisis-y-arquitectura.md`).
4. Implementar **auth** y **multi-tenancy** sobre la base creada.

## 7. Notas

- Docker Compose y Dockerfiles de aplicacion no fueron ejecutados porque Docker no esta instalado en el entorno actual.
- Git no esta instalado; el repositorio no se ha inicializado aun.