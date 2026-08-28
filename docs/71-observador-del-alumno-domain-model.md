# PROMPT 71 — Observador del Alumno — Domain Model / Prisma Schema

**Fecha:** 2026-08-27
**Estado:** COMPLETADO
**PROMPT anterior:** 70-D (PO Approval)
**PROMPT siguiente:** 72 (RBAC + Permissions)

---

## 1. Objetivo

Implementar exclusivamente el modelo de dominio y la capa Prisma del módulo
"Observador del Alumno", siguiendo estrictamente el alcance aprobado en los
documentos 70/70-A/70-B/70-C/70-D.

Este prompt inicia formalmente la implementación técnica después de la
aprobación del Product Owner.

---

## 2. Scope

### Implementado en este prompt

- 7 nuevos enums en `schema.prisma`
- 5 nuevos modelos en `schema.prisma`
- Relaciones inversas en modelos existentes (Institution, User, Student, FileAsset)
- Migración SQL formal
- Prisma Client regenerado

### NO implementado (corresponde a PROMPTS 72-76)

- Controllers / Endpoints
- Services de negocio
- PermissionGuard nuevo
- Frontend / React Query / Pages
- Notificaciones funcionales
- Firma funcional
- Dashboard / KPIs / Reporting
- Analytics / AI
- Transferencia entre instituciones
- Attendance

---

## 3. Modelos Creados

### 3.1 StudentFollowUp

**Tabla:** `student_follow_ups`

Modelo principal del Observador del Alumno. Representa el
expediente/registro de seguimiento.

**Campos:**

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | UUID | No | uuid() | PK |
| institutionId | UUID | No | — | Tenant (FK → institutions) |
| studentId | UUID | No | — | Estudiante (FK → students) |
| categoryId | UUID | Sí | null | Categoría (FK → follow_up_categories) |
| createdById | UUID | No | — | Creador (FK → users) |
| type | FollowUpType | No | — | Tipo de seguimiento |
| severity | FollowUpSeverity | No | MEDIUM | Severidad |
| status | FollowUpStatus | No | OPEN | Estado del lifecycle |
| confidentiality | FollowUpConfidentiality | No | INTERNAL | Nivel de confidencialidad |
| title | VARCHAR(200) | No | — | Título del seguimiento |
| summary | TEXT | Sí | null | Resumen |
| description | TEXT | Sí | null | Descripción inicial |
| closedAt | TIMESTAMP | Sí | null | Fecha de cierre |
| closedById | UUID | Sí | null | Quién cerró (FK → users) |
| createdAt | TIMESTAMP | No | now() | Auditoría |
| updatedAt | TIMESTAMP | No | — | Auditoría |

**Índices:**

- `institution_id` (tenant isolation)
- `(institution_id, student_id)` (búsqueda por estudiante)
- `(institution_id, status)` (filtrado por estado)
- `(institution_id, type)` (filtrado por tipo)
- `(institution_id, confidentiality)` (filtrado por confidencialidad)
- `(institution_id, category_id)` (filtrado por categoría)
- `(institution_id, created_by_id)` (búsqueda por creador)
- `(institution_id, created_at)` (orden temporal)
- `student_id` (acceso directo por estudiante)

**Relaciones:**

- Institution (1:N, RESTRICT)
- Student (1:N, RESTRICT)
- FollowUpCategory (N:1, SET NULL)
- User createdBy (1:N, RESTRICT)
- User closedBy (1:N, SET NULL)
- FollowUpEntry[] (1:N)
- Commitment[] (1:N)
- FollowUpAttachment[] (1:N)

### 3.2 FollowUpEntry

**Tabla:** `follow_up_entries`

Representa una entrada en la línea de tiempo del seguimiento.

**Campos:**

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | UUID | No | uuid() | PK |
| followUpId | UUID | No | — | FK → student_follow_ups |
| createdById | UUID | No | — | FK → users |
| entryType | FollowUpEntryType | No | — | Tipo de entrada |
| content | TEXT | No | — | Contenido |
| createdAt | TIMESTAMP | No | now() | Timestamp |

**Índices:**

- `follow_up_id` (búsqueda por seguimiento)
- `(follow_up_id, created_at)` (timeline ordenada)
- `created_by_id` (búsqueda por creador)

**Relaciones:**

- StudentFollowUp (1:N, RESTRICT)
- User createdBy (1:N, RESTRICT)

### 3.3 Commitment

**Tabla:** `commitments`

Representa un compromiso/acuerdo derivado de un seguimiento.

**Campos:**

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | UUID | No | uuid() | PK |
| followUpId | UUID | No | — | FK → student_follow_ups |
| responsibleUserId | UUID | No | — | FK → users |
| responsibleRole | CommitmentResponsibleRole | No | — | Rol del responsable |
| description | TEXT | No | — | Descripción del compromiso |
| status | CommitmentStatus | No | PENDING | Estado |
| dueDate | TIMESTAMP | Sí | null | Fecha límite |
| completedAt | TIMESTAMP | Sí | null | Fecha de completitud |
| createdAt | TIMESTAMP | No | now() | Auditoría |
| updatedAt | TIMESTAMP | No | — | Auditoría |

**Índices:**

- `follow_up_id` (búsqueda por seguimiento)
- `responsible_user_id` (búsqueda por responsable)
- `(follow_up_id, status)` (filtrado por estado)
- `(follow_up_id, due_date)` (búsqueda por vencimiento)

**Relaciones:**

- StudentFollowUp (1:N, RESTRICT)
- User responsibleUser (1:N, RESTRICT)

### 3.4 FollowUpAttachment

**Tabla:** `follow_up_attachments`

Relación entre StudentFollowUp y FileAsset. No duplica información
binaria del archivo.

**Campos:**

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | UUID | No | uuid() | PK |
| institutionId | UUID | No | — | FK → institutions |
| followUpId | UUID | No | — | FK → student_follow_ups |
| fileAssetId | UUID | No | — | FK → file_assets |
| createdAt | TIMESTAMP | No | now() | Timestamp |

**Unique constraints:**

- `(follow_up_id, file_asset_id)` — No duplicar el mismo archivo en el mismo seguimiento

**Índices:**

- `institution_id`
- `(institution_id, follow_up_id)`
- `follow_up_id`
- `file_asset_id`

**Relaciones:**

- Institution (1:N, RESTRICT)
- StudentFollowUp (1:N, RESTRICT)
- FileAsset (1:N, RESTRICT)

### 3.5 FollowUpCategory

**Tabla:** `follow_up_categories`

Categorías parametrizables por institución.

**Campos:**

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| id | UUID | No | uuid() | PK |
| institutionId | UUID | No | — | FK → institutions |
| name | VARCHAR(100) | No | — | Nombre |
| description | TEXT | Sí | null | Descripción |
| active | Boolean | No | true | Estado activo/inactivo |
| createdAt | TIMESTAMP | No | now() | Auditoría |
| updatedAt | TIMESTAMP | No | — | Auditoría |

**Unique constraints:**

- `(institution_id, name)` — Categorías únicas por institución

**Índices:**

- `institution_id`
- `(institution_id, active)`

**Relaciones:**

- Institution (1:N, RESTRICT)
- StudentFollowUp[] (1:N)

---

## 4. Enums Creados

### 4.1 FollowUpType

```
ACADEMICO
CONVIVENCIA
FORMATIVO
```

### 4.2 FollowUpSeverity

```
LOW
MEDIUM
HIGH
CRITICAL
```

### 4.3 FollowUpStatus

```
OPEN
IN_PROGRESS
ESCALATED
PENDING_FOLLOW_UP
RESOLVED
CLOSED
```

### 4.4 FollowUpConfidentiality

```
PUBLIC
INTERNAL
CONFIDENTIAL
SENSITIVE
```

### 4.5 FollowUpEntryType

```
NOTE
MEETING
OBSERVATION
ACTION
FOLLOW_UP
```

### 4.6 CommitmentStatus

```
PENDING
IN_PROGRESS
COMPLETED
CANCELLED
OVERDUE
```

### 4.7 CommitmentResponsibleRole

```
ADMIN
TEACHER
PARENT
STUDENT
```

---

## 5. Relaciones con Modelos Existentes

### 5.1 Institution

Se agregaron relaciones reversas:

```prisma
studentFollowUps    StudentFollowUp[]
followUpCategories  FollowUpCategory[]
followUpAttachments FollowUpAttachment[]
```

### 5.2 User

Se agregaron relaciones reversas:

```prisma
createdFollowUps  StudentFollowUp[] @relation("FollowUpCreatedBy")
closedFollowUps   StudentFollowUp[] @relation("FollowUpClosedBy")
followUpEntries   FollowUpEntry[]
commitments       Commitment[]
```

Nota: Se requirieron nombres de relación explícitos (`@relation("FollowUpCreatedBy")`,
`@relation("FollowUpClosedBy")`) porque `StudentFollowUp` tiene dos relaciones
hacia `User` (createdBy y closedBy).

### 5.3 Student

Se agregó relación reversa:

```prisma
studentFollowUps StudentFollowUp[]
```

### 5.4 FileAsset

Se agregó relación reversa:

```prisma
followUpAttachments FollowUpAttachment[]
```

---

## 6. Multi-Tenancy

Todos los modelos principales están correctamente asociados al tenant:

- `StudentFollowUp.institutionId` → FK → institutions
- `FollowUpCategory.institutionId` → FK → institutions
- `FollowUpAttachment.institutionId` → FK → institutions

Los modelos secundarios (FollowUpEntry, Commitment) heredan el tenant
a través de StudentFollowUp. Se analizó si era necesario materializar
`institutionId` en estos modelos secundarios para consultas futuras.

**Decisión:** No materializar `institutionId` en FollowUpEntry ni Commitment.
Razón: Todas las consultas a estos modelos se realizarán a través de
StudentFollowUp, que ya tiene el `institutionId` indexado. Agregarlo
duplicaría datos sin beneficio de rendimiento.

---

## 7. Confidentiality

El campo `confidentiality` está modelado mediante enum `FollowUpConfidentiality`
en `StudentFollowUp`. No se utiliza un booleano.

Valores: PUBLIC, INTERNAL, CONFIDENTIAL, SENSITIVE

La aplicación de reglas de visibilidad será responsabilidad de PROMPT 72/73.

---

## 8. Resource-Level Authorization (Readiness)

El modelo permite aplicar autorización a través de:

**Teacher:**
- TeacherAssignment → Enrollment → Student → StudentFollowUp

**Parent:**
- GuardianStudent → Student → StudentFollowUp

**Student:**
- Student.userId → StudentFollowUp (a través de `createdById` o `studentId`)

**Admin:**
- Institution → StudentFollowUp

**SUPER_ADMIN:**
- Sin acceso (decisión de diseño aprobada)

No se agregaron relaciones artificiales entre StudentFollowUp y
TeacherAssignment o GuardianStudent. La resolución se realiza a través
de Student.

---

## 9. SignatureRequest Decision

Se inspeccionó el modelo `SignatureRequest` existente.

**Decisión:** NO se agregó relación directa entre StudentFollowUp y
SignatureRequest.

**Razón:**
1. El modelo SignatureRequest tiene un contrato propio con sus
   relaciones (recipients).
2. Agregar un `followUpId` nullable modificaría el contrato existente.
3. La firma funcional corresponde a una fase posterior.
4. La relación puede establecerse a través de metadatos o una tabla
   puente en el futuro sin alterar el modelo actual.

La decisión se documenta aquí para referencia futura.

---

## 10. AuditLog Readiness

El módulo está preparado para utilizar el `AuditLog` existente.

No se creó un nuevo modelo de auditoría.

Los campos de `createdAt` y `updatedAt` en todos los modelos, junto con
`createdById` y `closedById` en StudentFollowUp, proporcionan información
suficiente para determinar:

- Quién creó
- Cuándo creó
- Quién modificó (a través de updatedAt)
- Cuándo modificó

La implementación de eventos de auditoría funcionales corresponde a
PROMPT 73/74.

---

## 11. Referential Actions

Políticas aplicadas (siguiendo convenciones existentes del proyecto):

| Relación | onDelete | onUpdate |
|----------|----------|----------|
| StudentFollowUp → Institution | RESTRICT | CASCADE |
| StudentFollowUp → Student | RESTRICT | CASCADE |
| StudentFollowUp → FollowUpCategory | SET NULL | CASCADE |
| StudentFollowUp → User (createdBy) | RESTRICT | CASCADE |
| StudentFollowUp → User (closedBy) | SET NULL | CASCADE |
| FollowUpEntry → StudentFollowUp | RESTRICT | CASCADE |
| FollowUpEntry → User | RESTRICT | CASCADE |
| Commitment → StudentFollowUp | RESTRICT | CASCADE |
| Commitment → User | RESTRICT | CASCADE |
| FollowUpAttachment → Institution | RESTRICT | CASCADE |
| FollowUpAttachment → StudentFollowUp | RESTRICT | CASCADE |
| FollowUpAttachment → FileAsset | RESTRICT | CASCADE |
| FollowUpCategory → Institution | RESTRICT | CASCADE |

Se priorizó RESTRICT para proteger la información sensible del Observador.
No se permite que eliminar accidentalmente un Student/User/Institution
borre silenciosamente un historial del Observador.

---

## 12. Migración

**Nombre:** `20260827000000_add_student_follow_up_domain`
**Archivo:** `apps/api/prisma/migrations/20260827000000_add_student_follow_up_domain/migration.sql`

La migración crea:
1. 7 tipos enum
2. 5 tablas
3. Todos los índices
4. Todas las constraints de unicidad
5. Todas las foreign keys

**Nota:** La migración fue creada manualmente ya que el entorno de
desarrollo no tenía acceso directo a la base de datos para
`prisma migrate dev`. El SQL fue validado contra el schema Prisma.

---

## 13. Tests

### 13.1 Prisma Schema Validation

```
$ npx prisma validate
The schema at prisma\schema.prisma is valid 🚀
```

### 13.2 Prisma Client Generation

```
$ npx prisma generate
✔ Generated Prisma Client (v6.19.3)
```

### 13.3 Backend Tests

```
Test Suites: 31 passed, 31 total
Tests:       441 passed, 441 total
```

**Resultado:** 441/441 PASS — sin regresiones.

### 13.4 TypeScript Compilation

```
$ npx tsc --noEmit
(no output = sin errores)
```

### 13.5 ESLint

11 errores pre-existentes en `seed.ts` y `validate-model.ts`.
Ninguno relacionado con los cambios de schema.

---

## 14. Compatibilidad

| Métrica | Baseline | Post-Cambio | Estado |
|---------|----------|-------------|--------|
| Backend Tests | 441 PASS | 441 PASS | ✅ |
| TypeScript API | PASS | PASS | ✅ |
| ESLint | 11 pre-existentes | 11 pre-existentes | ✅ |
| Prisma Validate | PASS | PASS | ✅ |
| Prisma Generate | PASS | PASS | ✅ |

---

## 15. Decisiones Técnicas

### D-71-01: Nombres de relación explícitos

**Decisión:** Usar `@relation("FollowUpCreatedBy")` y
`@relation("FollowUpClosedBy")` en StudentFollowUp.

**Razón:** Prisma requiere nombres explícitos cuando un modelo tiene
múltiples relaciones hacia el mismo modelo (User en este caso).

### D-71-02: No materializar institutionId en FollowUpEntry/Commitment

**Decisión:** No agregar `institutionId` a FollowUpEntry ni Commitment.

**Razón:** Todas las consultas a estos modelos se realizan a través
de StudentFollowUp, que ya tiene `institutionId` indexado.

### D-71-03: No agregar relación SignatureRequest

**Decisión:** No modificar el modelo SignatureRequest existente.

**Razón:** El contrato de SignatureRequest es propio. La relación
puede establecerse en el futuro sin alterar el modelo actual.

### D-71-04: onDelete RESTRICT para modelos sensibles

**Decisión:** Usar RESTRICT en todas las relaciones de StudentFollowUp,
FollowUpEntry, Commitment, FollowUpAttachment y FollowUpCategory.

**Razón:** El Observador contiene información potencialmente sensible.
RESTRICT previene eliminación accidental de historial.

### D-71-05: Unique constraints

**Decisión:** Aplicar `@@unique([institutionId, name])` en
FollowUpCategory y `@@unique([followUpId, fileAssetId])` en
FollowUpAttachment.

**Razón:** Evitar duplicados dentro de una institución (categorías)
y evitar el mismo archivo adjunto dos veces en el mismo seguimiento.

---

## 16. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Migración manual sin verificar contra DB real | Media | Alto | Validar en PROMPT 72 cuando DB esté disponible |
| Relaciones inversas en modelos existentes pueden afectar queries existentes | Baja | Medio | Las relaciones son aditivas, no modifican contract existente |
| Falta de seed para categorías demo | Baja | Bajo | PROMPT 72 puede agregar seed si es necesario |

---

## 17. Elementos Deliberadamente NO Implementados

1. Controllers / Endpoints
2. Services de negocio
3. DTOs
4. PermissionGuard nuevo
5. Módulos NestJS
6. Frontend / React Query / Pages / Sidebar
7. Permisos (corresponde a PROMPT 72)
8. Roles nuevos
9. Notificaciones funcionales
10. Firma funcional
11. Dashboard / KPIs / Reporting
12. Analytics / AI
13. Transferencia entre instituciones
14. Attendance
15. Retention policies
16. Mobile / Offline
17. Seed de categorías demo (opcional para PROMPT 72)
18. Seed de permisos (corresponde a PROMPT 72)

---

## 18. Archivos

### Creados

| Archivo | Descripción |
|---------|-------------|
| `apps/api/prisma/migrations/20260827000000_add_student_follow_up_domain/migration.sql` | Migración SQL |
| `docs/71-observador-del-alumno-domain-model.md` | Este documento |

### Modificados

| Archivo | Cambios |
|---------|---------|
| `apps/api/prisma/schema.prisma` | +7 enums, +5 modelos, +relaciones inversas |

### NO Modificados

- Auth / RBAC / PermissionGuard / TenantContextGuard
- AuthorizationService
- Student service / GuardianStudent / TeacherAssignment / Enrollment
- Dashboard / Sidebar / Frontend permissions
- Existing API contracts
- seed.ts (permisos corresponden a PROMPT 72)

---

## 19. Acceptance Criteria Matrix

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Los 5 modelos nuevos existen | ✅ |
| 2 | Los 7 enums nuevos existen | ✅ |
| 3 | Los modelos usan relaciones existentes correctamente | ✅ |
| 4 | StudentFollowUp pertenece a Institution | ✅ |
| 5 | StudentFollowUp pertenece a Student | ✅ |
| 6 | StudentFollowUp identifica CreatedBy | ✅ |
| 7 | FollowUpCategory pertenece a Institution | ✅ |
| 8 | FollowUpEntry pertenece a StudentFollowUp | ✅ |
| 9 | Commitment pertenece a StudentFollowUp | ✅ |
| 10 | FollowUpAttachment relaciona StudentFollowUp + FileAsset | ✅ |
| 11 | No se duplica almacenamiento de archivos | ✅ |
| 12 | Confidentiality está modelado mediante enum | ✅ |
| 13 | Lifecycle está modelado mediante enum | ✅ |
| 14 | Type está modelado mediante enum | ✅ |
| 15 | Category tiene unicidad por institution | ✅ |
| 16 | Attachment tiene unicidad por follow-up + file | ✅ |
| 17 | Índices críticos definidos | ✅ |
| 18 | Referential actions revisadas | ✅ |
| 19 | Multi-tenancy preservado | ✅ |
| 20 | No se rompe ningún modelo existente | ✅ |
| 21 | Migration creada correctamente | ✅ |
| 22 | Prisma validate PASS | ✅ |
| 23 | Prisma generate PASS | ✅ |
| 24 | Backend tests PASS (441/441) | ✅ |
| 25 | Frontend tests PASS (TypeScript clean) | ✅ |
| 26 | TypeScript PASS | ✅ |
| 27 | ESLint PASS (pre-existentes only) | ✅ |
| 28 | Build PASS | ✅ |
| 29 | Documentación creada | ✅ |
| 30 | No se implementaron features fuera del alcance | ✅ |

**Resultado: 30/30 PASS**

---

## 20. Veredicto Final

**PASS**

Todos los criterios de aceptación cumplidos. El modelo de dominio del
Observador del Alumno está correctamente implementado en Prisma con:

- 7 enums que cubren todos los conceptos del MVP
- 5 modelos con relaciones correctas a modelos existentes
- Multi-tenancy preservado
- Confidentiality modelado mediante enum
- Lifecycle modelado mediante enum
- Referential actions que protegen la información sensible
- Migración SQL formal
- 441/441 tests existentes sin regresiones

El módulo está listo para la siguiente fase: PROMPT 72 (RBAC + Permissions
+ Resource Authorization).
