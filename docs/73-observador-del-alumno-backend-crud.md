# PROMPT 73 — Observador del Alumno — Backend CRUD

**Fecha:** 2026-08-27
**Estado:** COMPLETADO
**PROMPT anterior:** 72 (RBAC + Permissions + Resource-Level Authorization)
**PROMPT siguiente:** 74 (Follow-Up Entries + Commitments + Attachments)

---

## 1. Executive Summary

Implementación completa del Backend CRUD principal del módulo Observador del Alumno
(Student Follow-Ups). Incluye 5 endpoints funcionales con autenticación JWT,
multi-tenancy, RBAC, autorización a nivel de recurso, confidencialidad,
lifecycle y auditoría.

**Resultado: BACKEND CRUD — PASS**

---

## 2. Endpoints Implementados

| Method | Path | Permission | Roles Autorizados | Descripción |
|--------|------|------------|-------------------|-------------|
| `POST` | `/student-follow-ups` | `student-follow-ups:create` | ADMIN, TEACHER | Crear registro |
| `GET` | `/student-follow-ups` | `student-follow-ups:read` | ADMIN, TEACHER, PARENT, STUDENT | Listar registros (filtrado por rol) |
| `GET` | `/student-follow-ups/:id` | `student-follow-ups:read` | ADMIN, TEACHER, PARENT, STUDENT | Detalle de registro |
| `PATCH` | `/student-follow-ups/:id` | `student-follow-ups:update` | ADMIN, TEACHER | Actualizar registro |
| `POST` | `/student-follow-ups/:id/close` | `student-follow-ups:close` | ADMIN, TEACHER | Cerrar registro |

---

## 3. DTOs

### CreateStudentFollowUpDto

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| studentId | UUID | Sí | UUID válido |
| type | Enum | Sí | ACADEMICO, CONVIVENCIA, FORMATIVO |
| severity | Enum | No | LOW, MEDIUM, HIGH, CRITICAL (default: MEDIUM) |
| confidentiality | Enum | No | PUBLIC, INTERNAL, CONFIDENTIAL, SENSITIVE (default: INTERNAL) |
| categoryId | UUID | No | UUID válido, categoría activa del tenant |
| title | String | Sí | 3-200 caracteres |
| summary | String | No | Max 500 caracteres |
| description | String | No | Sin límite |

### UpdateStudentFollowUpDto

Todos los campos opcionales. studentId es inmutable después de la creación.

### ListStudentFollowUpsQueryDto

| Filtro | Tipo | Descripción |
|--------|------|-------------|
| page | Number | Página (default: 1) |
| limit | Number | Items por página (default: 20, max: 100) |
| search | String | Búsqueda por título, resumen, descripción |
| studentId | UUID | Filtrar por estudiante |
| type | Enum | Filtrar por tipo |
| severity | Enum | Filtrar por severidad |
| status | Enum | Filtrar por estado |
| confidentiality | Enum | Filtrar por confidencialidad |
| categoryId | UUID | Filtrar por categoría |
| createdById | UUID | Filtrar por creador |
| createdFrom | ISO Date | Fecha inicio |
| createdTo | ISO Date | Fecha fin |

---

## 4. RBAC Validation

### Matriz de Permisos

| Permission | ADMIN | TEACHER | PARENT | STUDENT | SUPER_ADMIN |
|------------|:-----:|:-------:|:------:|:-------:|:-----------:|
| read | ✅ | ✅ | ✅ | ✅ | ❌ |
| create | ✅ | ✅ | ❌ | ❌ | ❌ |
| update | ✅ | ✅ | ❌ | ❌ | ❌ |
| close | ✅ | ✅ | ❌ | ❌ | ❌ |

### Roles Rechazados

- **PARENT**: create, update, close → 403
- **STUDENT**: create, update, close → 403
- **SUPER_ADMIN**: todos → 403

---

## 5. Resource-Level Authorization

### ADMIN

- Acceso a todos los StudentFollowUp de su institución
- Condición: `followUp.institutionId === currentInstitutionId`

### TEACHER

- Solo acceso a follow-ups de estudiantes asignados
- Cadena: TeacherAssignment → Course → Enrollment → Student

### PARENT

- Solo acceso a follow-ups de estudiantes vinculados
- Cadena: GuardianStudent → Student

### STUDENT

- Solo acceso a sus propios follow-ups
- Condición: `Student.userId === currentUserId`

### SUPER_ADMIN

- Siempre DENIED
- Sin bypass global

---

## 6. Confidentiality Validation

| Nivel | ADMIN | TEACHER | PARENT | STUDENT |
|-------|:-----:|:-------:|:------:|:-------:|
| PUBLIC | ✅ | ✅ | ✅ | ✅ |
| INTERNAL | ✅ | ✅ | ✅ | ✅ |
| CONFIDENTIAL | ✅ | ❌ | ❌ | ❌ |
| SENSITIVE | ✅ | ❌ | ❌ | ❌ |

La confidencialidad se aplica en:
- **LIST**: `WHERE confidentiality IN (visibleLevels)`
- **DETAIL**: verificación vía `canRead()`
- Nunca se confía en el frontend

---

## 7. Tenant Isolation

```
X-Institution-Id
  → TenantContextGuard
    → request.tenant.institutionId
      → service layer
        → institutionId from context (NEVER from client)
```

- DTOs NO aceptan `institutionId`
- Queries siempre incluyen `WHERE institutionId = tenant`
- Cross-tenant → 404 (no revelar existencia)

---

## 8. Lifecycle

```
OPEN (default en CREATE)
  ↓
IN_PROGRESS (implícito en futuras entradas)
  ↓
CLOSED (vía POST /:id/close)
```

### Reglas

- CREATE → status = OPEN (default)
- UPDATE → Solo registros OPEN, IN_PROGRESS, etc. (no CLOSED)
- CLOSE → Solo registros no cerrados
- CLOSED → Terminal, no modificable

---

## 9. Audit Validation

Acciones auditadas:

| Acción | Evento |
|--------|--------|
| CREATE | `STUDENT_FOLLOW_UP_CREATED` |
| UPDATE | `STUDENT_FOLLOW_UP_UPDATED` |
| CLOSE | `STUDENT_FOLLOW_UP_CLOSED` |

Campos de auditoría protegidos:
- `createdById` — establecido por servidor
- `closedById` — establecido por servidor
- `createdAt` — automático
- `updatedAt` — automático

---

## 10. IDOR/BOLA Validation

| Actor | Escenario | Resultado |
|-------|-----------|-----------|
| Parent | follow-up de estudiante no vinculado | 404 |
| Student | follow-up de otro estudiante | 404 |
| Teacher | follow-up de estudiante no asignado | 404 |
| Admin Tenant A | follow-up Tenant B | 404 |
| SUPER_ADMIN | cualquier follow-up | 403 |

Todos los escenarios verificados en tests unitarios.

---

## 11. Unit Tests

**66 tests unitarios** cubriendo:

### CREATE (9 tests)
- ADMIN crear para estudiante propio → PASS
- TEACHER crear para estudiante asignado → PASS
- TEACHER crear para estudiante no asignado → DENIED
- PARENT intentar crear → DENIED
- STUDENT intentar crear → DENIED
- SUPER_ADMIN intentar crear → DENIED
- Estudiante de otro tenant → DENIED
- Categoría inexistente → DENIED
- Todos los campos opcionales → PASS

### DETAIL (8 tests)
- ADMIN → own tenant → PASS
- Cross-tenant → 404
- TEACHER → estudiante no asignado → 404
- PARENT → estudiante no vinculado → 404
- STUDENT → otro estudiante → 404
- SUPER_ADMIN → 404
- CONFIDENTIAL → TEACHER → 404
- SENSITIVE → PARENT → 404

### LIST (12 tests)
- SUPER_ADMIN → vacío
- Sin rol → vacío
- ADMIN → todos del tenant
- TEACHER → solo PUBLIC/INTERNAL
- PARENT → solo hijos vinculados
- STUDENT → solo propios registros
- Filtros: studentId, type, status, search, date range
- Paginación
- Nunca datos cross-tenant

### UPDATE (9 tests)
- ADMIN → PASS
- CLOSED → DENIED
- TEACHER no asignado → 404
- PARENT → 403
- STUDENT → 403
- SUPER_ADMIN → 403
- Cross-tenant → 404
- institutionId inmutable
- createdById inmutable

### CLOSE (9 tests)
- ADMIN → PASS
- TEACHER → PASS
- Ya cerrado → 400
- Doble cierre → 400
- TEACHER no asignado → 404
- PARENT → 403
- STUDENT → 403
- SUPER_ADMIN → 403
- Cross-tenant → 404

### IDOR/BOLA (6 tests)
- Parent → estudiante no vinculado
- Student → otro estudiante
- Teacher → estudiante no asignado
- Admin cross-tenant
- SUPER_ADMIN
- Sin retorno de datos cuando no autorizado

### Confidentiality (4 tests)
- TEACHER → solo PUBLIC/INTERNAL
- PARENT → solo PUBLIC/INTERNAL
- STUDENT → solo PUBLIC/INTERNAL
- ADMIN → todos los niveles

### Tenant Isolation (2 tests)
- Queries scoped a institutionId
- institutionId desde tenant context

### Lifecycle (3 tests)
- Default OPEN
- CLOSE cambia a CLOSED
- CLOSED no modificable

### Audit Fields (3 tests)
- createdById inmutable
- closedById se establece
- closedAt se establece

---

## 12. Regression

| Suite | Baseline | Post-Cambio | Estado |
|-------|----------|-------------|--------|
| Backend Tests | 483 PASS | 549 PASS | ✅ |
| TypeScript API | PASS | PASS | ✅ |
| ESLint | Pre-existentes | 0 nuevos | ✅ |
| Prisma Validate | PASS | PASS | ✅ |
| Prisma Generate | PASS | PASS | ✅ |

---

## 13. Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `apps/api/src/modules/student-follow-ups/student-follow-ups.module.ts` | Módulo NestJS |
| `apps/api/src/modules/student-follow-ups/student-follow-ups.controller.ts` | Controller (5 endpoints) |
| `apps/api/src/modules/student-follow-ups/student-follow-ups.service.ts` | Service con autorización |
| `apps/api/src/modules/student-follow-ups/dto/create-student-follow-up.dto.ts` | DTO de creación |
| `apps/api/src/modules/student-follow-ups/dto/update-student-follow-up.dto.ts` | DTO de actualización |
| `apps/api/src/modules/student-follow-ups/dto/list-student-follow-ups-query.dto.ts` | DTO de listado |
| `apps/api/src/modules/student-follow-ups/student-follow-ups.service.spec.ts` | Tests unitarios (66) |
| `docs/73-observador-del-alumno-backend-crud.md` | Este documento |

---

## 14. Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `apps/api/src/app.module.ts` | +StudentFollowUpsModule import |

---

## 15. Archivos NO Modificados

- Auth architecture (AccessTokenGuard, TenantContextGuard, PermissionGuard)
- AuthorizationService
- StudentFollowUpAuthorizationService (reutilizado)
- Prisma domain model (PROMPT 71)
- Frontend
- Existing RBAC

---

## 16. Decisions

### D-73-01: StudentFollowUpAuthorizationService reutilizado

Se reutilizó el servicio creado en PROMPT 72 en lugar de crear lógica paralela.

### D-73-02: Role-based list filters inline

Los filtros de rol se construyen directamente en el service usando la misma
lógica que `buildListFilter()` pero de forma tipada con Prisma.

### D-73-03: NotFoundException para denegaciones de autorización

Se usa `NotFoundException` (404) en lugar de `ForbiddenException` (403)
para autorizaciones denegadas a nivel de recurso, evitando enumeración
de recursos.

### D-73-04: Category como opcional

`categoryId` es opcional en el DTO de creación, consistente con el schema Prisma.

### D-73-05: StudentId inmutable

`studentId` no es modificable después de la creación para preservar
trazabilidad del follow-up.

---

## 17. Known Limitations

1. **Sin FollowUpEntry funcional**: Los endpoints para entradas de seguimiento
   pertenecen a PROMPT 74.
2. **Sin Commitments funcionales**: Los compromisos pertenecen a PROMPT 74.
3. **Sin Attachments funcionales**: Los archivos adjuntos pertenecen a PROMPT 74.
4. **Sin Notifications específicas**: Las notificaciones del módulo pertenecen a PROMPT 74.
5. **Sin Dashboard/KPIs**: Pertenecen a un prompt futuro.
6. **Sin Reporting/Export**: Pertenecen a un prompt futuro.
7. **Seed de categorías demo**: No creado para no contaminar producción.

---

## 18. Out-of-Scope Confirmation

NO se implementó en este prompt:

- ✅ FollowUpEntry funcional
- ✅ Commitments funcionales
- ✅ FollowUpAttachment funcional
- ✅ Notifications específicas
- ✅ SignatureRequest integration
- ✅ Dashboard KPIs
- ✅ Reporting / Export
- ✅ Analytics / AI
- ✅ Attendance
- ✅ Institution transfer
- ✅ Retention policies
- ✅ Configurable templates
- ✅ New roles (Coordinator, Counselor)
- ✅ Frontend / Mobile
- ✅ Bulk operations
- ✅ Agenda integration

---

## 19. Acceptance Criteria Matrix

| # | Criterio | Estado |
|---|----------|--------|
| AC-001 | ADMIN puede crear para estudiante de su institución | ✅ PASS |
| AC-002 | TEACHER puede crear solo para estudiantes asignados | ✅ PASS |
| AC-003 | PARENT no puede crear | ✅ PASS |
| AC-004 | STUDENT no puede crear | ✅ PASS |
| AC-005 | SUPER_ADMIN no puede crear | ✅ PASS |
| AC-006 | ADMIN puede consultar registros sujetos a confidentiality | ✅ PASS |
| AC-007 | TEACHER solo consulta estudiantes relacionados | ✅ PASS |
| AC-008 | PARENT solo consulta hijos vinculados | ✅ PASS |
| AC-009 | STUDENT solo consulta sus propios registros | ✅ PASS |
| AC-010 | CONFIDENTIAL solo visible por ADMIN | ✅ PASS |
| AC-011 | SENSITIVE solo visible por ADMIN | ✅ PASS |
| AC-012 | Ningún usuario accede a registros de otro tenant | ✅ PASS |
| AC-013 | ADMIN/TEACHER pueden actualizar recursos autorizados | ✅ PASS |
| AC-014 | PARENT/STUDENT/SUPER_ADMIN no pueden actualizar | ✅ PASS |
| AC-015 | CLOSED no puede modificarse via update normal | ✅ PASS |
| AC-016 | ADMIN/TEACHER pueden cerrar recursos autorizados | ✅ PASS |
| AC-017 | PARENT/STUDENT/SUPER_ADMIN no pueden cerrar | ✅ PASS |
| AC-018 | Cerrar registra usuario y timestamp | ✅ PASS |
| AC-019 | Campos de autoridad no manipulables desde DTO | ✅ PASS |
| AC-020 | Tests IDOR/BOLA pasan | ✅ PASS |
| AC-021 | No se rompe ningún test existente | ✅ PASS |

---

## 20. Security Findings

**Ningún BLOCKER o HIGH encontrado.**

Todos los criterios de seguridad (SC-001 a SC-017) cumplidos.

---

## 21. Git Status

Cambios sin commit (según instrucciones del prompt):

**Archivos creados:**
- `apps/api/src/modules/student-follow-ups/student-follow-ups.module.ts`
- `apps/api/src/modules/student-follow-ups/student-follow-ups.controller.ts`
- `apps/api/src/modules/student-follow-ups/student-follow-ups.service.ts`
- `apps/api/src/modules/student-follow-ups/dto/create-student-follow-up.dto.ts`
- `apps/api/src/modules/student-follow-ups/dto/update-student-follow-up.dto.ts`
- `apps/api/src/modules/student-follow-ups/dto/list-student-follow-ups-query.dto.ts`
- `apps/api/src/modules/student-follow-ups/student-follow-ups.service.spec.ts`
- `docs/73-observador-del-alumno-backend-crud.md`

**Archivos modificados:**
- `apps/api/src/app.module.ts`

---

## 22. Veredicto Final

**BACKEND CRUD — PASS**

Todos los criterios de aceptación cumplidos:

- ✅ CRUD funcional (Create, List, Detail, Update, Close)
- ✅ RBAC correcto (5 roles, permisos verificados)
- ✅ Resource-level authorization (TeacherAssignment, GuardianStudent, Student.userId)
- ✅ Confidentiality server-side (4 niveles, matrices correctas)
- ✅ Tenant isolation (X-Institution-Id, nunca del cliente)
- ✅ SUPER_ADMIN bloqueado
- ✅ IDOR/BOLA bloqueado (6 escenarios)
- ✅ Lifecycle básico (OPEN → CLOSED)
- ✅ Audit fields protegidos
- ✅ 66 tests nuevos PASS
- ✅ 549/549 tests totales PASS (sin regresiones)
- ✅ TypeScript PASS
- ✅ ESLint PASS (0 nuevos errores)
- ✅ Prisma generate PASS
- ✅ Sin BLOCKER/HIGH

---

## 23. Próximo Paso

PROMPT 74 — Follow-Up Entries + Commitments + Attachments + Lifecycle Extensions

Solo después de revisar y aprobar este resultado.
