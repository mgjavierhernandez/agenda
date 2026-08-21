# 02 - Modelo de Datos: Identidad y Tenancy

**Version:** 0.1.0
**Fecha:** 20 de agosto de 2026
**Estado:** Implementado

Este documento describe el modelo de datos initial del sistema de identidad, tenancy y RBAC.

---

## 1. Entidades

| Modelo | Proposito |
| ------ | --------- |
| `Institution` | Tenant / colegio. Entidad principal del aislamiento multi-tenant. |
| `User` | Identidad de plataforma. Email globalmente unico. |
| `UserInstitution` | Membresia de un User dentro de una Institution. |
| `Role` | Rol dentro de una Institution (o global si institutionId es null). |
| `Permission` | Definicion global de un permiso granular (code unico). |
| `RolePermission` | Relacion Role <-> Permission (N:N). |
| `UserRole` | Asignacion de un Role a un User dentro de una Institution (via UserInstitution). |
| `GlobalUserRole` | Asignacion de un Role global a un User (ej: SUPER_ADMIN). |
| `AuditLog` | Preparado para auditoria futura. No implementado completamente. |

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
```

- Un usuario dentro de una institucion puede tener multiples roles.
- Un rol puede ser asignado a multiples usuarios dentro de una institucion.
- `UserRole` depende de `UserInstitution` (no directamente de User ni Role).

### 2.3 Role <-> Permission (via RolePermission)

```
Role 1 ──< RolePermission >── 1 Permission
```

- Un rol puede tener multiples permisos.
- Un permiso puede pertenecer a multiples roles.
- Relacion N:N normalizada (no JSON en Role).

### 2.4 GlobalUserRole (Platform-level)

```
User 1 ──< GlobalUserRole >── 1 Role (global)
```

- Para roles de plataforma como SUPER_ADMIN.
- Separado fisicamente de UserRole para evitar escalada de privilegios.
- Un usuario puede tener multiples roles globales.

### 2.5 User <-> AuditLog

```
User 1 ──< AuditLog
```

- Un usuario puede tener multiples registros de auditoria.
- `userId` es nullable (acciones del sistema).

---

## 3. Multi-Tenancy

### 3.1 Estrategia

Shared Database + `tenant_id` (como recomienda `docs/00-analisis-y-arquitectura.md` seccion 8.1).

### 3.2 Aislamiento

El aislamiento se logra via `UserInstitution`:

1. Un User se autentica (identidad global).
2. Selecciona una Institution ( tenant).
3. Todas las operaciones se filtran por `institutionId` del contexto activo.
4. Los roles y permisos se evaluan dentro del contexto de la Institution seleccionada.

### 3.3 Tenant Context (Backend)

```
Request → JWT contiene userId + institutionId
        → Middleware extrae institutionId
        → Todas las queries aplican WHERE institution_id = :currentTenant
```

### 3.4 Separacion de Alcance

| Concepto | Alcance | Ejemplo |
|----------|---------|---------|
| User | Global (plataforma) | Email, password, nombre |
| UserInstitution | Tenant | Membresia en un colegio |
| Role (institutionId != null) | Tenant | INSTITUTION_ADMIN, TEACHER |
| Role (institutionId == null) | Global | SUPER_ADMIN |
| Permission | Global | Definiciones de permisos |
| UserRole | Tenant | Asignacion de rol dentro de tenant |
| GlobalUserRole | Global | Asignacion de rol de plataforma |

---

## 4. RBAC

### 4.1 Roles

| Rol | Scope | Descripcion |
|-----|-------|-------------|
| `SUPER_ADMIN` | Global | Administrador de la plataforma. No pertenece a ningun tenant. |
| `INSTITUTION_ADMIN` | Tenant | Administrador de una institucion especifica. |
| `TEACHER` | Tenant | Docente asignado a cursos. |
| `PARENT` | Tenant | Padre/madre/acudiente. |
| `STUDENT` | Tenant | Estudiante matriculado. |

### 4.2 Permisos (Ejemplos iniciales)

| Codigo | Modulo | Descripcion |
|--------|--------|-------------|
| `institution:read` | institution | Leer datos de institucion |
| `institution:update` | institution | Actualizar configuracion |
| `users:read` | users | Listar y leer usuarios |
| `users:create` | users | Crear usuarios |
| `users:update` | users | Actualizar usuarios |
| `users:delete` | users | Desactivar/eliminar usuarios |
| `roles:read` | roles | Listar y leer roles |
| `roles:manage` | roles | CRUD de roles |
| `grades:read` | grades | Leer grados |
| `grades:manage` | grades | CRUD de grados |
| `courses:read` | courses | Leer cursos |
| `courses:manage` | courses | CRUD de cursos |
| `subjects:read` | subjects | Leer asignaturas |
| `subjects:manage` | subjects | CRUD de asignaturas |
| `students:read` | students | Leer estudiantes |
| `students:manage` | students | CRUD de estudiantes |
| `schedules:read` | schedules | Leer horarios |
| `schedules:manage` | schedules | CRUD de horarios |
| `tasks:read` | tasks | Leer tareas |
| `tasks:create` | tasks | Crear tareas |
| `tasks:update` | tasks | Actualizar tareas |
| `tasks:delete` | tasks | Eliminar tareas |
| `communications:read` | communications | Leer comunicaciones |
| `communications:create` | communications | Crear comunicaciones |
| `communications:send_bulk` | communications | Enviar comunicaciones masivas |
| `signatures:read` | signatures | Leer firmas |
| `signatures:request` | signatures | Solicitar firmas |
| `signatures:sign` | signatures | Firmar documentos |
| `notifications:read` | notifications | Leer notificaciones |
| `audit:read` | audit | Leer logs de auditoria |
| `files:upload` | files | Subir archivos |
| `files:read` | files | Leer/descargar archivos |

### 4.3 Evolucion de Permisos

Los permisos se definen como tablas (no como enum) para permitir:
- Agregar nuevos permisos sin migraciones de esquema.
- Asignar permisos a multiples roles.
- Personalizar permisos por institucion en el futuro.

### 4.4 UserRole (Tenant-scoped)

```
UserRole = UserInstitution + Role
```

Ejemplo:
```
User A
  ├── UserInstitution (Institution X)
  │     ├── UserRole → TEACHER
  │     └── UserRole → INSTITUTION_ADMIN
  └── UserInstitution (Institution Y)
        └── UserRole → PARENT
```

### 4.5 GlobalUserRole (Platform-level)

```
GlobalUserRole = User + Role (global)
```

Ejemplo:
```
User A → GlobalUserRole → SUPER_ADMIN
```

---

## 5. Super Admin

### 5.1 Decision

**Opcion A seleccionada**: Rol global de plataforma sin pertenecer a un tenant.

### 5.2 Justificacion

1. **Seguridad fisica**: `GlobalUserRole` es una tabla separada de `UserRole`. Un tenant admin solo puede gestionar `UserRole` dentro de su tenant. No tiene acceso a `GlobalUserRole`.
2. **Claridad conceptual**: La frontera entre Platform scope y Tenant scope es evidente en el esquema.
3. **Prevencion de escalada**: Un usuario no puede convertirse en Super Admin modificando un registro de `UserRole` porque eso no le da permisos globales.
4. **Flexibilidad**: Permite agregar roles globales adicionales en el futuro (ej: SUPPORT_ADMIN, BILLING_ADMIN).

### 5.3 Restricciones

- Solo usuarios con rol `SUPER_ADMIN` pueden gestionar `GlobalUserRole`.
- El endpoint de asignacion de roles globales debe estar protegido por un Guard especifico.
- `GlobalUserRole` no tiene `institutionId` - es intrinsecamente global.

---

## 6. Constraints e Indices

### 6.1 Primary Keys

Todas las entidades usan `UUID` como PK via `@default(uuid())`.

**Justificacion UUID vs. auto-incremento:**
- Sin colisiones entre tenants.
- Seguro para expose en URLs/APIs.
- Generable client-side sin round-trip a la DB.
- Estandar para sistemas distribuidos.

### 6.2 Unique Constraints

| Entidad | Constraint | Proposito |
|---------|------------|-----------|
| `Institution` | `slug` | Identificador amigable unico |
| `User` | `email` | Email globalmente unico |
| `Permission` | `code` | Codigo de permiso unico globalmente |
| `Role` | `(name, institutionId)` | Nombre de rol unico por tenant (o global) |
| `UserInstitution` | `(userId, institutionId)` | Evitar membresia duplicada |
| `UserRole` | `(userInstitutionId, roleId)` | Evitar asignacion de rol duplicada |
| `GlobalUserRole` | `(userId, roleId)` | Evitar asignacion de rol global duplicada |
| `RolePermission` | `(roleId, permissionId)` | Evitar permiso duplicado en rol |

### 6.3 Indices

| Indice | Tabla | Proposito |
|--------|-------|-----------|
| `institutionId` | `UserInstitution` | Buscar membresias por institucion |
| `institutionId` | `Role` | Buscar roles por institucion |
| `module` | `Permission` | Buscar permisos por modulo |
| `permissionId` | `RolePermission` | Buscar roles que tienen un permiso |
| `roleId` | `UserRole` | Buscar usuarios con un rol |
| `roleId` | `GlobalUserRole` | Buscar usuarios con un rol global |
| `userId` | `AuditLog` | Buscar auditoria por usuario |
| `(entityType, entityId)` | `AuditLog` | Buscar auditoria por entidad |

### 6.4 Foreign Keys

Todas las FK usan `onDelete: Cascade` o `onDelete: SetNull` segun el caso:

| Relacion | onDelete | Razon |
|----------|----------|-------|
| UserInstitution -> User | Cascade | Si se elimina el user, se eliminan sus membresias |
| UserInstitution -> Institution | Cascade | Si se elimina la institution, se eliminan membresias |
| UserRole -> UserInstitution | Cascade | Si se elimina la membresia, se eliminan roles |
| UserRole -> Role | Cascade | Si se elimina el role, se eliminan asignaciones |
| GlobalUserRole -> User | Cascade | Si se elimina el user, se eliminan roles globales |
| GlobalUserRole -> Role | Cascade | Si se elimina el role, se eliminan asignaciones globales |
| RolePermission -> Role | Cascade | Si se elimina el role, se eliminan permisos |
| RolePermission -> Permission | Cascade | Si se elimina el permiso, se eliminan relaciones |
| Role -> Institution | Cascade | Si se elimina la institution, se eliminan roles |
| AuditLog -> User | SetNull | Si se elimina el user, se conservan logs |

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

### 7.3 Evolucion

Si se necesita soft delete en el futuro, se puede agregar `deletedAt` a las entidades que lo requieran (especialmente entidades de dominio como Student, Task, etc.).

---

## 8. Auditoria (Preparacion)

### 8.1 Modelo

```prisma
model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String?  @map("user_id") @db.Uuid
  action     String   @db.VarChar(100)
  entityType String   @map("entity_type") @db.VarChar(50)
  entityId   String?  @map("entity_id") @db.Uuid
  oldValues  Json?    @map("old_values")
  newValues  Json?    @map("new_values")
  ipAddress  String?  @map("ip_address") @db.VarChar(45)
  createdAt  DateTime @default(now()) @map("created_at")
}
```

### 8.2 Uso Futuro

- `userId` nullable permite registrar acciones del sistema.
- `oldValues` / `newValues` permiten comparar cambios.
- `entityType` + `entityId` permiten rastrear que entidad fue afectada.
- `ipAddress` para trazabilidad de seguridad.

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
| `apps/api/src/common/prisma/prisma.service.ts` | Servicio Prisma para NestJS |
| `apps/api/src/common/prisma/prisma.module.ts` | Modulo Prisma global |
