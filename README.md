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
| Mobile | Flutter (aun no implementado) |
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
npm run test:e2e       # Tests end-to-end (api)
```

Tambien se pueden ejecutar por workspace:

```bash
npm run build --workspace @agenda/api
npm run dev --workspace @agenda/web
```

## Estado actual

Etapa de **bootstrap / infraestructura base**. No hay funcionalidad de negocio implementada aun (auth, tenancy, usuarios, tareas, comunicaciones, etc.). El siguiente paso es definir el modelo de datos y los modulos de negocio siguiendo el documento de arquitectura.