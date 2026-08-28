# PROMPT 72 — Observador del Alumno — RBAC + Permissions + Resource-Level Authorization

**Fecha:** 2026-08-27
**Estado:** COMPLETADO
**PROMPT anterior:** 71 (Domain Model)
**PROMPT siguiente:** 73 (Backend CRUD)

---

## 1. Permissions Creadas

11 nuevas permissions agregadas al módulo `student-follow-ups`:

| Permission Code | Descripción |
|----------------|-------------|
| student-follow-ups:read | Read student follow-up records |
| student-follow-ups:create | Create student follow-up records |
| student-follow-ups:update | Update student follow-up records |
| student-follow-ups:close | Close student follow-up records |
| student-follow-ups:escalate | Escalate student follow-up records |
| student-follow-ups:follow_up | Add follow-up entries to records |
| student-follow-ups:commit | Create commitments in follow-up records |
| student-follow-ups:attach | Attach files to follow-up records |
| student-follow-ups:manage | Full management of student follow-up module |
| student-follow-ups:stats | View student follow-up statistics |
| student-follow-ups:categories | Manage follow-up categories |

---

## 2. Role → Permission Matrix

| Permission | INSTITUTION_ADMIN | TEACHER | PARENT | STUDENT | SUPER_ADMIN |
|------------|:-----------------:|:-------:|:------:|:-------:|:-----------:|
| read | ✅ | ✅ | ✅ | ✅ | ❌ |
| create | ✅ | ✅ | ❌ | ❌ | ❌ |
| update | ✅ | ✅ | ❌ | ❌ | ❌ |
| close | ✅ | ✅ | ❌ | ❌ | ❌ |
| escalate | ✅ | ✅ | ❌ | ❌ | ❌ |
| follow_up | ✅ | ✅ | ❌ | ❌ | ❌ |
| commit | ✅ | ✅ | ❌ | ❌ | ❌ |
| attach | ✅ | ✅ | ❌ | ❌ | ❌ |
| manage | ✅ | ❌ | ❌ | ❌ | ❌ |
| stats | ✅ | ❌ | ❌ | ❌ | ❌ |
| categories | ✅ | ❌ | ❌ | ❌ | ❌ |

**Totales:**
- INSTITUTION_ADMIN: 11
- TEACHER: 8
- PARENT: 1
- STUDENT: 1
- SUPER_ADMIN: 0

---

## 3. Resource-Level Authorization

### 3.1 INSTITUTION_ADMIN

- Acceso a todos los StudentFollowUp de su institución
- Tenant isolation: `institutionId` del token
- No puede acceder a registros de otras instituciones

### 3.2 TEACHER

Cadena de autorización:
```
Teacher
  → TeacherAssignment (teacherUserId, status=ACTIVE)
    → Course (institutionId)
      → Enrollment (studentId, status=ACTIVE)
        → Student
          → StudentFollowUp
```

- Solo puede acceder a follow-ups de estudiantes en sus cursos asignados
- No puede ver follow-ups de estudiantes no asignados

### 3.3 PARENT

Cadena de autorización:
```
Parent
  → GuardianStudent (guardianUserId, status=ACTIVE)
    → Student
      → StudentFollowUp
```

- Solo puede acceder a follow-ups de estudiantes vinculados
- No puede ver follow-up de estudiantes no vinculados

### 3.4 STUDENT

Relación:
```
Student.userId === currentUserId
```

- Solo puede acceder a sus propios follow-ups
- No puede ver follow-ups de otros estudiantes

### 3.5 SUPER_ADMIN

- **Sin acceso** al módulo
- Recibe 403 en cualquier endpoint protegido por permisos del módulo
- No hay bypass especial

---

## 4. Confidentiality Matrix

| Nivel | INSTITUTION_ADMIN | TEACHER | PARENT | STUDENT | SUPER_ADMIN |
|-------|:-----------------:|:-------:|:------:|:-------:|:-----------:|
| PUBLIC | ✅ | ✅ | ✅ | ✅ | ❌ |
| INTERNAL | ✅ | ✅ | ✅ | ✅ | ❌ |
| CONFIDENTIAL | ✅ | ❌ | ❌ | ❌ | ❌ |
| SENSITIVE | ✅ | ❌ | ❌ | ❌ | ❌ |

**Orden de validación:**
1. Authentication
2. Tenant context
3. RBAC permission
4. Resource relationship
5. Confidentiality
6. Business constraints

---

## 5. Tenant Isolation

Preservada la arquitectura existente:

```
X-Institution-Id
  → TenantContextGuard
    → request.tenant.institutionId
      → service authorization
```

Nunca se toma `institutionId` del DTO/body/query.

---

## 6. IDOR/BOLA Protection

| Actor | Escenario | Resultado |
|-------|-----------|-----------|
| Parent | Acceder a follow-up de estudiante no vinculado | 404 |
| Student | Acceder a follow-up de otro estudiante | 404 |
| Teacher | Acceder a follow-up de estudiante no asignado | 404 |
| Admin | Acceder a follow-up de otra institución | 404 |
| SUPER_ADMIN | Cualquier follow-up | 403 |

---

## 7. Error Semantics

| Codigo | Significado |
|--------|-------------|
| 401 | Token faltante o inválido |
| 403 | Tenant faltante, permiso insuficiente, SUPER_ADMIN denegado |
| 404 | Recurso no existe o no autorizado (evita enumeración) |

---

## 8. Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `apps/api/src/common/auth/student-follow-up-authorization.ts` | Servicio de autorización resource-level |
| `apps/api/src/common/auth/student-follow-up-authorization.spec.ts` | Tests (42 casos) |
| `docs/72-observador-del-alumno-authorization.md` | Este documento |

## 9. Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `apps/api/prisma/seed.ts` | +11 permissions, +role mappings |
| `apps/web/src/permissions/permission.constants.ts` | +11 permission constants |

## 10. Archivos NO Modificados

- Auth module / PermissionGuard / TenantContextGuard
- AuthorizationService (no se modificó)
- StudentsService / GuardiansService
- TeacherAssignment / Enrollment
- Frontend UI / Sidebar / Dashboard
- Dominio Prisma (PROMPT 71)

---

## 11. Tests

| Métrica | Valor |
|---------|-------|
| Backend tests | 483/483 PASS (441 existentes + 42 nuevos) |
| TypeScript API | PASS |
| TypeScript Web | PASS |
| ESLint | 11 pre-existentes (0 nuevos) |
| Prisma validate | PASS |
| Prisma generate | PASS |

---

## 12. Limitaciones / Queda para PROMPT 73

- CRUD completo de StudentFollowUp (endpoints, DTOs, controller, service)
- FollowUpEntry funcional
- Commitments funcionales
- Attachments funcionales
- Notifications específicas
- Signatures
- Dashboard / KPIs
- Reporting / Export
- Seed de categorías demo

---

## 13. Veredicto Final

**PASS**

Todos los 30 criterios de aceptación cumplidos:
- 11 permissions creadas y asignadas
- SUPER_ADMIN sin acceso
- Resource-level authorization implementada
- Confidentiality matrix implementada
- Tenant isolation preservada
- 483/483 tests PASS
- Sin regresiones
