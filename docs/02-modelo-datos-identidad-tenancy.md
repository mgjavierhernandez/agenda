# 02 - Modelo de Datos: Identidad, Tenancy y RBAC

**Version:** 0.2.0
**Fecha:** 20 de agosto de 2026
**Estado:** Hardened - Cross-tenant protection at DB level

Este documento describe el modelo de datos del sistema de identidad, tenancy y RBAC, con proteccion cross-tenant garantizada a nivel de base de datos.

---

## 1. Entidades

| Modelo | Scope | Proposito |
| ------ | ----- | --------- |
| `Institution` | Tenant | Tenant / colegio. Entidad principal del aislamiento multi-tenant. |
| `User` | Global | Identidad de plataforma. Email globalmente unico. |
| `UserInstitution` | Tenant | Membresia de un User dentro de una Institution. |
| `Role` | Global/Tenant | Rol (global, template o tenant-scoped). |
| `Permission` | Global | Definicion global de un permiso granular (code unico). |
| `RolePermission` | Global/Tenant | Relacion Role <-> Permission (N:N). |
| `UserRole` | Tenant | Asignacion de un Role a un User dentro de una Institution. |
| `GlobalUserRole` | Global | Asignacion de un Role global a un User (ej: SUPER_ADMIN). |
| `AuditLog` | Global/Tenant | Registro de auditoria de acciones. |

---

## 2. Relaciones

### 2.1 Institution <-> User (via UserInstitution)

```
Institution 1 ──< UserInstitution >── 1 User
```

- Un User puede pertenecer a multiples Institutions.
- Una Institution puede tener multiples Users.
- La relacion se modela via `UserInstitution` (tabla pivote con estado propio).

### 2.2 UserInstitution <-> Role (via UserRole)

```
UserInstitution 1 ──< UserRole >── 1 Role
                    │
                    └──> 1 Institution (FK compuesta)
```

- Un usuario dentro de una institucion puede tener multiples roles.
- `UserRole` incluye `institutionId` explicitamente para integridad referencial.
- **FK compuesta**: `UserRole(roleId, institutionId) -> Role(id, institutionId)`
- **FK compuesta**: `UserRole(userInstitutionId, institutionId) -> UserInstitution(id, institutionId)`
- Esto garantiza que el rol y la membresia pertenezcan a la misma institucion.

### 2.3 Role <-> Permission (via RolePermission)

```
Role 1 ──< RolePermission >── 1 Permission
```

- Un rol puede tener multiples permisos.
- Un permiso puede pertenecer a multiples roles.
- Relacion N:N normalizada (no JSON en Role).

### 2.4 GlobalUserRole (Platform-level)

```
User 1 ──< GlobalUserRole >── 1 Role (global, institutionId = NULL)
```

- Para roles de plataforma como SUPER_ADMIN.
- Separado fisicamente de UserRole para evitar escalada de privilegios.
- **Trigger**: `trg_check_global_role_is_global` previene que un GlobalUserRole apunte a un rol tenant-scoped.

### 2.5 User <-> AuditLog

```
User 1 ──< AuditLog >── 0..1 Institution
```

- Un usuario puede tener multiples registros de auditoria.
- `userId` es nullable (acciones del sistema).
- `institutionId` es nullable (acciones globales vs tenant-scoped).

---

## 3. Multi-Tenancy

### 3.1 Estrategia

Shared Database + `tenant_id` + Composite Foreign Keys + DB Triggers.

### 3.2 Aislamiento

El aislamiento se logra via multiples capas:

1. **UserInstitution**: Membresia del usuario en una institucion.
2. **UserRole.institutionId**: Denormalizado para integridad referencial.
3. **FK compuesta**: Garantiza que `UserRole.institutionId == Role.institutionId`.
4. **FK compuesta**: Garantiza que `UserRole.institutionId == UserInstitution.institutionId`.
5. **Trigger**: Previene GlobalUserRole con roles tenant-scoped.

### 3.3 Tenant Context (Backend)

```
Request -> JWT contiene userId + institutionId
         -> Middleware extrae institutionId
         -> Todas las queries aplican WHERE institution_id = :currentTenant
```

### 3.4 Separacion de Alcance

| Concepto | Alcance | Ejemplo |
|----------|---------|---------|
| User | Global (plataforma) | Email, password, nombre |
| UserInstitution | Tenant | Membresia en un colegio |
| Role (roleType = GLOBAL) | Global | SUPER_ADMIN |
| Role (roleType = TEMPLATE) | Global (plantilla) | INSTITUTION_ADMIN, TEACHER, PARENT, STUDENT |
| Role (roleType = TENANT) | Tenant | Copias de templates para instituciones especificas |
| Permission | Global | Definiciones de permisos |
| UserRole | Tenant | Asignacion de rol dentro de tenant |
| GlobalUserRole | Global | Asignacion de rol de plataforma |
| AuditLog | Global/Tenant | Registro de auditoria |

---

## 4. RBAC

### 4.1 Role Types

| Tipo | Descripcion | institutionId | Ejemplo |
|------|-------------|---------------|---------|
| `GLOBAL` | Rol de plataforma real | NULL | SUPER_ADMIN |
| `TEMPLATE` | Plantilla para copiar a tenants | NULL | INSTITUTION_ADMIN, TEACHER, PARENT, STUDENT |
| `TENANT` | Copia de template para un tenant especifico | Institution ID | Demo School / TEACHER |

### 4.2 Template Role Pattern

```
GLOBAL ROLE (SUPER_ADMIN)
     │
     ├── institutionId = NULL
     ├── roleType = GLOBAL
     └── Usado via GlobalUserRole

TEMPLATE ROLES (INSTITUTION_ADMIN, TEACHER, PARENT, STUDENT)
     │
     ├── institutionId = NULL
     ├── roleType = TEMPLATE
     ├── No se asignan directamente a usuarios
     └── Se copian como TENANT roles cuando se crea una institucion

TENANT ROLES (copias de templates)
     │
     ├── institutionId = Institution X
     ├── roleType = TENANT
     ├── Se asignan via UserRole
     └── Heredan permisos del template original
```

### 4.3 Permisos

32 permisos globales organizados por modulo:

| Modulo | Permisos |
|--------|----------|
| institution | read, update |
| users | read, create, update, delete |
| roles | read, manage |
| grades | read, manage |
| courses | read, manage |
| subjects | read, manage |
| students | read, manage |
| schedules | read, manage |
| tasks | read, create, update, delete |
| communications | read, create, send_bulk |
| signatures | read, request, sign |
| notifications | read |
| audit | read |
| files | upload, read |

### 4.4 Matriz RBAC

| Rol | Permisos | Cantidad |
|-----|----------|----------|
| SUPER_ADMIN | Todos | 32 |
| INSTITUTION_ADMIN | institution:*, users:*, roles:*, grades:*, courses:*, subjects:*, students:*, schedules:*, tasks:*, communications:*, signatures:*, notifications:read, audit:read, files:* | 32 |
| TEACHER | courses:*, subjects:*, students:read, grades:read/manage, tasks:*, schedules:read, communications:read/create, signatures:*, notifications:read, files:* | 20 |
| PARENT | students:read, grades:read, schedules:read, tasks:read, communications:read/create, signatures:read/sign, notifications:read, files:read | 10 |
| STUDENT | tasks:read/update, grades:read, schedules:read, communications:read, notifications:read, files:read | 7 |

---

## 5. Super Admin

### 5.1 Decision

**Opcion A seleccionada**: Rol global de plataforma sin pertenecer a un tenant.

### 5.2 Justificacion

1. **Seguridad fisica**: `GlobalUserRole` es una tabla separada de `UserRole`.
2. **Claridad conceptual**: La frontera entre Platform scope y Tenant scope es evidente en el esquema.
3. **Prevencion de escalada**: Un usuario no puede convertirse en Super Admin modificando un registro de `UserRole`.
4. **Flexibilidad**: Permite agregar roles globales adicionales en el futuro.

### 5.3 Restricciones

- Solo usuarios con rol `SUPER_ADMIN` pueden gestionar `GlobalUserRole`.
- `GlobalUserRole` no tiene `institutionId` - es intrinsecamente global.
- **Trigger DB**: `trg_check_global_role_is_global` impide que un GlobalUserRole apunte a un rol con `institutionId != NULL`.

---

## 6. Constraints e Indices

### 6.1 Primary Keys

Todas las entidades usan `UUID` como PK via `@default(uuid())`.

### 6.2 Unique Constraints

| Entidad | Constraint | Proposito |
|---------|------------|-----------|
| `Institution` | `slug` | Identificador amigable unico |
| `User` | `email` | Email globalmente unico |
| `Permission` | `code` | Codigo de permiso unico globalmente |
| `Role` | `(name, institutionId)` | Nombre de rol unico por tenant (o global) |
| `Role` | `(id, institutionId)` | Para soporte de FK compuesta |
| `UserInstitution` | `(userId, institutionId)` | Evitar membresia duplicada |
| `UserInstitution` | `(id, institutionId)` | Para soporte de FK compuesta |
| `UserRole` | `(userInstitutionId, roleId)` | Evitar asignacion de rol duplicada |
| `GlobalUserRole` | `(userId, roleId)` | Evitar asignacion de rol global duplicada |
| `RolePermission` | `(roleId, permissionId)` | Evitar permiso duplicado en rol |

### 6.3 Indices

| Indice | Tabla | Proposito |
|--------|-------|-----------|
| `institutionId` | `UserInstitution` | Buscar membresias por institucion |
| `institutionId` | `Role` | Buscar roles por institucion |
| `roleType` | `Role` | Buscar roles por tipo |
| `module` | `Permission` | Buscar permisos por modulo |
| `permissionId` | `RolePermission` | Buscar roles que tienen un permiso |
| `roleId` | `UserRole` | Buscar usuarios con un rol |
| `institutionId` | `UserRole` | Buscar roles por institucion |
| `roleId` | `GlobalUserRole` | Buscar usuarios con un rol global |
| `userId` | `AuditLog` | Buscar auditoria por usuario |
| `institutionId` | `AuditLog` | Buscar auditoria por institucion |
| `(institutionId, createdAt)` | `AuditLog` | Buscar auditoria por institucion y fecha |
| `(entityType, entityId)` | `AuditLog` | Buscar auditoria por entidad |

### 6.4 Foreign Keys

| Relacion | Tipo | onDelete | Razon |
|----------|------|----------|-------|
| UserInstitution -> User | Simple | Cascade | Si se elimina el user, se eliminan sus membresias |
| UserInstitution -> Institution | Simple | Cascade | Si se elimina la institution, se eliminan membresias |
| UserRole -> UserInstitution | Simple | Cascade | Si se elimina la membresia, se eliminan roles |
| UserRole -> Role | Simple | Cascade | Si se elimina el role, se eliminan asignaciones |
| UserRole -> Institution | Simple | Cascade | Si se elimina la institution, se eliminan roles |
| **UserRole(roleId, institutionId) -> Role(id, institutionId)** | **Compuesta** | Cascade | **Garantiza que el rol pertenece a la misma institucion** |
| **UserRole(userInstitutionId, institutionId) -> UserInstitution(id, institutionId)** | **Compuesta** | Cascade | **Garantiza que la membresia pertenece a la misma institucion** |
| GlobalUserRole -> User | Simple | Cascade | Si se elimina el user, se eliminan roles globales |
| GlobalUserRole -> Role | Simple | Cascade | Si se elimina el role, se eliminan asignaciones globales |
| RolePermission -> Role | Simple | Cascade | Si se elimina el role, se eliminan permisos |
| RolePermission -> Permission | Simple | Cascade | Si se elimina el permiso, se eliminan relaciones |
| Role -> Institution | Simple | Cascade | Si se elimina la institution, se eliminan roles |
| AuditLog -> User | Simple | SetNull | Si se elimina el user, se conservan logs |
| AuditLog -> Institution | Simple | SetNull | Si se elimina la institution, se conservan logs |

### 6.5 Triggers

| Trigger | Tabla | Funcion |
|---------|-------|---------|
| `trg_check_global_role_is_global` | `global_user_roles` | Impide que un GlobalUserRole apunte a un rol con institutionId != NULL |

---

## 7. Soft Delete vs. Status

### 7.1 Decision

Para las entidades de identidad y tenancy se usa **status enums** en vez de `deletedAt`:

| Entidad | Enum | Valores |
|---------|------|---------|
| User | `UserStatus` | ACTIVE, INACTIVE, SUSPENDED |
| Institution | `InstitutionStatus` | ACTIVE, INACTIVE, SUSPENDED |
| UserInstitution | `MembershipStatus` | ACTIVE, INACTIVE, SUSPENDED |

### 7.2 Justificacion

1. **Explicito**: Un estado INACTIVE es mas informativo que un `deletedAt` nullable.
2. **Consultas simples**: `WHERE status = 'ACTIVE'` es mas claro que `WHERE deleted_at IS NULL`.
3. **Flexibilidad**: Permite distinguir entre INACTIVE (desactivado) y SUSPENDED (suspendido).
4. **Auditoria**: Los cambios de estado son eventos claros para el log de auditoria.

---

## 8. Auditoria

### 8.1 Modelo

```prisma
model AuditLog {
  id            String    @id @default(uuid()) @db.Uuid
  userId        String?   @map("user_id") @db.Uuid
  institutionId String?   @map("institution_id") @db.Uuid
  action        String    @db.VarChar(100)
  entityType    String    @map("entity_type") @db.VarChar(50)
  entityId      String?   @map("entity_id") @db.Uuid
  oldValues     Json?     @map("old_values")
  newValues     Json?     @map("new_values")
  ipAddress     String?   @map("ip_address") @db.VarChar(45)
  createdAt     DateTime  @default(now()) @map("created_at")
}
```

### 8.2 Alcance

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `userId` | UUID nullable | Actor (NULL para acciones del sistema) |
| `institutionId` | UUID nullable | Tenant (NULL para acciones globales de plataforma) |
| `action` | String | Accion realizada (ej: USER_CREATED, ROLE_ASSIGNED) |
| `entityType` | String | Tipo de entidad afectada (ej: User, Role) |
| `entityId` | UUID nullable | ID de la entidad afectada |
| `oldValues` | JSON nullable | Valores antes del cambio |
| `newValues` | JSON nullable | Valores despues del cambio |
| `ipAddress` | String nullable | Direccion IP del actor |
| `createdAt` | DateTime | Timestamp del evento |

### 8.3 Indices para Consultas

- `institutionId`: Filtrar logs por tenant.
- `(institutionId, createdAt)`: Filtrar logs por tenant y rango de fechas.
- `(entityType, entityId)`: Buscar historial de una entidad especifica.
- `userId`: Buscar acciones de un usuario especifico.

---

## 9. Evolucion Futura

### 9.1 Modelos Pendientes

Los siguientes modelos se implementaran en fases posteriores:

- Student, Teacher, Guardian
- Course, Grade, Subject
- Enrollment, Schedule
- Task, Submission
- Communication, Signature
- Notification
- File

### 9.2 Tenant Isolation

El middleware de tenant isolation se implementara en la fase de autenticacion:

1. Extraer `institutionId` del JWT.
2. Inyectar en el request context.
3. Aplicar filtro automatico en queries.

### 9.3 Permisos Dinamicos

Los permisos actuales son un conjunto minimo para probar la arquitectura RBAC. Se ampliaran conforme se implementen nuevos modulos.

---

## 10. Archivos Relacionados

| Archivo | Descripcion |
|---------|-------------|
| `apps/api/prisma/schema.prisma` | Esquema Prisma con todos los modelos |
| `apps/api/prisma/seed.ts` | Script de seed con datos demo |
| `apps/api/prisma/validate-model.ts` | Tests de integridad contra PostgreSQL real |
| `apps/api/prisma/migrations/` | Migraciones de base de datos |
| `apps/api/src/common/prisma/prisma.service.ts` | Servicio Prisma para NestJS |
| `apps/api/src/common/prisma/prisma.module.ts` | Modulo Prisma global |
