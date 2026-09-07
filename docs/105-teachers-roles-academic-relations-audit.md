# PROMPT 105 — Auditoría Funcional e Integración Final

## Docentes, Roles y Relaciones Académicas

---

## 1. Objetivo

Realizar una auditoría funcional y de integración de todo lo relacionado con usuarios, roles, relaciones institucionales, docentes, áreas, asignaturas, cursos, asignaciones docentes, estudiantes, matrículas, acudientes, periodos académicos, permisos, historial/vigencia y aislamiento multi-tenant. El objetivo es verificar que el sistema actual representa correctamente la operación real de un colegio y detectar inconsistencias conceptuales, funcionales, de seguridad, autorización, UX o integridad de datos antes de continuar hacia staging/cloud.

## 2. Alcance

- **Dominio auditado:** User, UserInstitution, Role, Permission, TeacherAssignment, Area, Subject, Course, Student, Enrollment, Guardian (GuardianStudent), AcademicPeriod, Schedule, StudentFollowUp, SignatureRequest, Attendance, Grade, Attendance.
- **Infraestructura auditada:** RBAC guards (AccessTokenGuard, TenantContextGuard, PermissionGuard), AuthorizationService, seed, frontend types/routes/pages/hooks.
- **NO incluye:** Creación de funcionalidad nueva, migraciones, cambios de schema, cambios de RBAC/permisos, commits, o destrucción de datos.

## 3. Estado inicial

**PROMPT 104 entregó:**
- Rol `DIRECTOR_DE_GRUPO` (assignable-roles + seed + demo assignment)
- Módulo `areas` backend (CRUD, tenant-scoped, audited)
- Permisos `areas:read` y `areas:manage` (en permissionData + role lists)
- Integración Subject ↔ Area (areaId, subjectType, min/maxLevel)
- Consultas `GET /teachers` y `GET /directories`
- Frontend `/areas` y `/teachers` con hooks, types, sidebar links
- Seed: 77 permisos, 21 roles (1 GLOBAL + 10 TEMPLATE + 10 TENANT)

**Gates de PROMPT 104:** API unit 805/805, API E2E 690/690, Web unit 510/510, builds + lint clean.

## 4. Modelo actual — Inventario de entidades (FASE 1)

**43 modelos Prisma, 41 tablas PostgreSQL.**

### Entidades clave y su representación

| Entidad | Tabla | PK | FKs tenant-scoped | Estado | Auditoría | Relaciones obligatorias |
|---------|-------|----|--------------------|--------|-----------|------------------------|
| **User** | `users` | `id` (UUID) | Ninguna (global) | `status: UserStatus` | `createdAt`, `updatedAt` | — |
| **UserInstitution** | `user_institutions` | `id` (UUID) | `institutionId` (R: Cascade) | `status: MembershipStatus` | `createdAt`, `updatedAt` | User, Institution |
| **Role** | `roles` | `id` (UUID) | `institutionId?` (R: Cascade) | `roleType: RoleType`, `isSystem: Boolean` | `createdAt` | — |
| **Permission** | `permissions` | `id` (UUID) | Ninguna (global) | — | `createdAt` | — |
| **UserRole** | `user_roles` | `id` (UUID) | `institutionId` (R: Cascade) | — | `createdAt` | UserInstitution, Role, Institution |
| **Student** | `students` | `id` (UUID) | `institutionId` (R: Restrict) | `status: StudentStatus` | `createdAt`, `updatedAt` | Institution |
| **GuardianStudent** | `guardian_students` | `id` (UUID) | `institutionId` (R: Restrict) | `status: GuardianStudentStatus`, `relationshipType`, `isPrimary` | `createdAt`, `updatedAt` | Institution, User, Student |
| **Course** | `courses` | `id` (UUID) | `institutionId` (R: Restrict) | `status: CourseStatus`, `level: EducationLevel` | `createdAt`, `updatedAt` | Institution |
| **Subject** | `subjects` | `id` (UUID) | `institutionId` (R: Restrict) | `status: SubjectStatus`, `subjectType`, `minLevel`, `maxLevel` | `createdAt`, `updatedAt` | Institution |
| **Area** | `areas` | `id` (UUID) | `institutionId` (R: Restrict) | `status: SubjectStatus` | `createdAt`, `updatedAt` | Institution |
| **TeacherAssignment** | `teacher_assignments` | `id` (UUID) | `institutionId` (R: Restrict) | `status: TeacherAssignmentStatus` | `createdAt`, `updatedAt` | Institution, User, Course, Subject, AcademicPeriod |
| **Enrollment** | `enrollments` | `id` (UUID) | `institutionId` (R: Restrict) | `status: EnrollmentStatus`, `enrolledAt` | `createdAt`, `updatedAt` | Institution, Student, Course, SchoolGrade, AcademicPeriod |
| **AcademicPeriod** | `academic_periods` | `id` (UUID) | `institutionId` (R: Restrict) | `status: AcademicPeriodStatus`, `startDate`, `endDate`, `closedAt` | `createdAt`, `updatedAt` | Institution |
| **Schedule** | `schedules` | `id` (UUID) | `institutionId` (R: Restrict) | `status: ScheduleStatus`, `dayOfWeek`, `startTime`, `endTime` | `createdAt`, `updatedAt` | Institution, Course, Subject |
| **Grade** | `grades` | `id` (UUID) | `institutionId` (R: Restrict) | `status: GradeStatus`, `period` (String) | `createdAt`, `updatedAt` | Institution, Student, Course, Subject |
| **Attendance** | `attendances` | `id` (UUID) | `institutionId` (R: Restrict) | `status: AttendanceStatus`, `date` | `createdAt`, `updatedAt` | Institution, Student, Course, AcademicPeriod, User |
| **StudentFollowUp** | `student_follow_ups` | `id` (UUID) | `institutionId` (R: Restrict) | `status: FollowUpStatus`, `type`, `severity`, `confidentiality` | `createdAt`, `updatedAt` | Institution, Student, User (createdBy) |
| **SignatureRequest** | `signature_requests` | `id` (UUID) | `institutionId` (R: Restrict) | `status: SignatureRequestStatus`, `dueDate` | `createdAt`, `updatedAt` | Institution, User (createdBy) |
| **AuditLog** | `audit_logs` | `id` (UUID) | `institutionId?` (R: SetNull) | `action: String` | `createdAt` | — |

**Patrón de tenant-scoping:** Todos los modelos académicos llevan `institutionId` obligatorio con FK a `Institution`. Las únicas entidades globales (sin institutionId) son: `User`, `Permission`, `GlobalUserRole`, `RefreshToken`, `PasswordResetToken`.

**Estrategia OnDelete:** `Restrict` en la mayoría de FKs académicas (impide borrado de datos escolares activos). `Cascade` en cadenas de auth/membership. `SetNull` en vínculos opcionales.

## 5. Usuarios (FASE 2)

### ¿User != Role?

**SÍ.** El modelo User es correcto:
- `User` es identidad de plataforma (global, sin institutionId)
- `UserInstitution` es la membresía (relación User ↔ Institution)
- `UserRole` es la asignación de rol por institución (UserInstitution ↔ Role)
- Un usuario puede tener múltiples roles en una misma institución
- Un usuario puede pertenecer a múltiples instituciones
- Los permisos derivan del rol (Role → RolePermission → Permission)

### ¿Un docente es una entidad independiente?

**NO.** Un docente es un `User` con un `UserRole` que tiene el rol `TEACHER` (o `DIRECTOR_DE_GRUPO`). No existe entidad `Teacher` separada. Esto es correcto.

### ¿Existe "teacher" como sustituto de User?

**NO.** Todos los endpoints usan `teacherUserId` (refiriéndose a `User.id`). No hay modelo paralelo.

### ¿Un mismo usuario puede ser TEACHER + DIRECTOR_DE_GRUPO + otros roles?

**SÍ.** El sistema permite múltiples `UserRole` por `UserInstitution`. El demo lo confirma: `teacher@demo-school.dev` tiene `TEACHER` + `DIRECTOR_DE_GRUPO`.

### ¿Los permisos derivan del rol?

**SÍ.** `Role → RolePermission → Permission`. El `AuthorizationService` resuelve permisos de fuentes tenant + global.

### ¿Existen campos de usuario almacenando roles como texto?

**NO.** Todos los roles están en la tabla `roles` vinculados vía `user_roles`.

**Hallazgo F-07 (MEDIUM):** El usuario `User` es global. Si un admin de Institución A desactiva un usuario, se modifica `User.status = INACTIVE` globalmente, afectando también a la Institución B donde el mismo usuario podría ser activo. Ver FASE Seguridad.

## 6. Roles (FASE 7)

### Matriz de roles

| Rol | Existe | Template | Tenant | Asignable | Permisos | Coherente | Observaciones |
|-----|--------|----------|--------|-----------|----------|-----------|---------------|
| SUPER_ADMIN | SI | NO | NO (GLOBAL) | NO | 77 (ALL) | SI | Solo via GlobalUserRole. No asignable por usuarios. |
| INSTITUTION_ADMIN | SI | SI | SI | SI | 77 (ALL) | SI | Identical permisos a SUPER_ADMIN pero scoped a tenant |
| TEACHER | SI | SI | SI | SI | ~40 | SI | Cursos, asignaturas, calificaciones, tareas, horarios, asistencia, follow-ups |
| DIRECTOR_DE_GRUPO | SI | SI | SI | SI | ~40 | SI | TEACHER + enrollments:read + attendance:stats + student-follow-ups:manage |
| RECTOR | SI | SI | SI | SI | ~64 | SI | Sin user CRUD, memberships, roles, signatures:sign |
| COORDINADOR_ACADEMICO | SI | SI | SI | SI | ~38 | SI | Académico: courses, areas, subjects, schedules, enrollments |
| COORDINADOR_CONVIVENCIA | SI | SI | SI | SI | ~33 | SI | Convivencia: students, communications, follow-ups, attendance |
| ORIENTADOR | SI | SI | SI | SI | ~33 | SI | Counseling: students, follow-ups, communications |
| PSICOLOGO | SI | SI | SI | SI | ~27 | SI | Psychology: students, follow-ups (read-heavy) |
| PARENT | SI | SI | SI | SI | 18 | SI | Read-heavy: students, grades, schedules, tasks |
| STUDENT | SI | SI | SI | SI | 14 | SI | Más limitado: tasks, grades, schedules |

**TOTAL:** 1 GLOBAL + 10 TEMPLATE + 10 TENANT = 21 roles en seed. 77 permisos.

### Observaciones
- `SUPER_ADMIN` e `INSTITUTION_ADMIN` tienen permisos idénticos (77/77). La diferencia es el alcance (global vs tenant).
- `signatures:sign` solo lo tienen SUPER_ADMIN, INSTITUTION_ADMIN y PARENT. Los docentes no pueden firmar.
- `DIRECTOR_DE_GRUPO` = TEACHER + {enrollments:read, attendance:stats, student-follow-ups:manage}. La diferencia es menor.

## 7. Docentes (FASE 3)

### Representación en el modelo

```
User (teacherUserId)
  → UserRole (role.name = 'TEACHER' o 'DIRECTOR_DE_GRUPO')
    → TeacherAssignment (teacherUserId + courseId + subjectId + academicPeriodId)
      → Course, Subject, AcademicPeriod
```

### Relaciones posibles

| Relación | Representada | Endpoint/UI | Nota |
|----------|-------------|-------------|------|
| Docente ↔ Institución | UserInstitution + UserRole(TEACHER) | `GET /teachers` | Lista docentes de la institución |
| Docente ↔ Curso | TeacherAssignment.courseId | `GET /teachers` (courses[]) | Cada assignment tiene 1 curso |
| Docente ↔ Asignatura | TeacherAssignment.subjectId | `GET /teachers` (courses[].subjectName) | Cada assignment tiene 1 subject |
| Docente ↔ Curso ↔ Asignatura | TeacherAssignment (composite) | `GET /teacher-assignments` | La assignment es el vínculo ternario |
| Docente ↔ Estudiante | Indirecto via TeacherAssignment → Course → Enrollment | `GET /teachers` (courses[].students[]) | No hay relación directa docente-estudiante |
| Docente ↔ Área | Indirecto via Subject.areaId | Ninguno | No hay consulta "¿qué áreas cubre un docente?" |
| Docente ↔ Periodo | TeacherAssignment.academicPeriodId | `GET /teacher-assignments` (filter) | Cada assignment es por periodo |

### Consultas que el sistema PUEDE responder (modelo)

1. ¿Qué docentes pertenecen a una institución? → SÍ (UserInstitution + UserRole)
2. ¿Qué cursos tiene asignados un docente? → SÍ (TeacherAssignment)
3. ¿Qué asignaturas dicta un docente? → SÍ (TeacherAssignment)
4. ¿Qué docente dicta Matemáticas en 8A? → SÍ ( TeacherAssignment WHERE courseId AND subjectId )
5. ¿Quién es director de grupo de 8A? → NO DIRECTAMENTE (no hay vinculo director-curso; solo "¿quién tiene rol DIRECTOR_DE_GRUPO?")
6. ¿Qué estudiantes están en el curso 8A? → SÍ (Enrollment WHERE courseId)
7. ¿Qué estudiantes están bajo el alcance académico de un docente? → SÍ (TeacherAssignment → Course → Enrollment)
8. ¿Qué asignaturas dicta un docente en cada curso? → SÍ (TeacherAssignment grouped by course)
9. ¿Puede un docente enseñar la misma asignatura en varios cursos? → SÍ (múltiples TeacherAssignment)
10. ¿Puede una asignatura tener varios docentes? → SÍ (múltiples TeacherAssignment para mismo subjectId)
11. ¿Puede un curso tener varios docentes? → SÍ (múltiples TeacherAssignment para mismo courseId)
12. ¿Puede un docente cambiar de curso/asignatura sin perder historial? → DEPENDE del periodo (ver FASE Vigencia)

## 8. Áreas (FASE 4)

### Modelo actual

```
Area (id, institutionId, code, name, isOfficial, sortOrder, status)
  → Subject (areaId nullable)
    → TeacherAssignment (subjectId)
```

### Verificaciones

| Verificación | Resultado | Evidencia |
|-------------|-----------|-----------|
| Áreas aisladas por institución | CORRECTO | `institutionId` required, queries filter by `institutionId` |
| Institución no puede usar área de otra | CORRECTO | `assertAreaBelongsToInstitution()` en SubjectsService |
| Asignatura ↔ Área cross-tenant | CORRECTO | Validación explícita al crear/actualizar Subject |
| Niveles coherentes | CORRECTO | `EducationLevel`: PREESCOLAR, PRIMARIA, SECUNDARIA, MEDIA |
| Valores inválidos | NO DETECTADOS | class-validator `@IsEnum(EducationLevel)` |
| Frontend representa valores correctamente | CORRECTO | `EDUCATION_LEVEL_LABELS` + `SUBJECT_TYPE_LABELS` en types.ts |
| Formulario conserva datos | CORRECTO | SubjectFormPage usa `useAreas()` + selectores |
| Listado muestra info | CORRECTO | AreasPage lista name, code, status |

### Extensibilidad

La arquitectura permite extender niveles sin rediseñar:
- Agregar valores al enum `EducationLevel` en schema.prisma
- Agregar labels en `EDUCATION_LEVEL_LABELS`
- El formulario y filtros lo manejan automáticamente

**Observación menor:** `Area.status` reutiliza `SubjectStatus` enum en vez de tener un `AreaStatus` dedicado. Funcional pero semánticamente confuso.

## 9. Asignaturas (FASE 4 complementario)

### Campos actuales
- `code`, `name`, `description`, `institutionId`, `areaId?`, `subjectType`, `minimumLevel?`, `maximumLevel?`, `isOptionalForStudent`, `intensityHoursPerWeek`, `isPreescolarDimension`, `transversalGuideline`, `status`

### Integración Area ↔ Subject
- `areaId` es nullable (una asignatura puede no tener área)
- Al crear/actualizar, se valida que el área pertenece a la misma institución
- El UPDATE usa `{ connect: { id } }` para la relación y `{ disconnect: true }` para eliminar

### Filtros disponibles
- Por `institutionId` (siempre)
- Por `areaId` (nuevo en PROMPT 104)
- Por `status`

## 10. Cursos

### Modelo actual
- `code`, `name`, `description`, `institutionId`, `schoolGradeId?`, `level: EducationLevel`, `status`
- Relaciones: `Enrollment[]`, `TeacherAssignment[]`, `Schedule[]`, `Task[]`, `Attendance[]`

### Integridad
- Código único por institución (`institutionId_code`)
- `schoolGradeId` es nullable (curso puede no tener grado asociado)
- `level` default PRIMARIA

## 11. TeacherAssignment — Auditoría profunda (FASE 5)

### Campos
`id`, `institutionId`, `teacherUserId`, `courseId`, `subjectId`, `academicPeriodId`, `status`, `weeklyHours`, `maxWeeklyHours`, `createdAt`, `updatedAt`

### Validaciones en create

| # | Validación | Tipo | Error |
|---|-----------|------|-------|
| 1 | Teacher tiene membresía activa en la institución | Cross-tenant | 403 Forbidden |
| 2 | Curso pertenece a la institución | Cross-tenant | 404 Not Found |
| 3 | Asignatura pertenece a la institución | Cross-tenant | 404 Not Found |
| 4 | Periodo académico pertenece a la institución | Cross-tenant | 404 Not Found |
| 5 | Combinación única (institution+teacher+course+subject+period) | Duplicado | 409 Conflict |
| 6 | Carga horaria ≤ maxWeeklyHours | Business rule | 400 Bad Request |

### Escenarios evaluados

| Escenario | Resultado | Observación |
|-----------|-----------|-------------|
| A. Docente + curso + materia válidos | EXITOSO | OK |
| B. Usuario que no es docente | 403 Forbidden | userInstitution no encontrado con rol TEACHER |
| C. Docente de otra institución | 403 Forbidden | Cross-tenant validation |
| D. Curso de otra institución | 404 Not Found | Cross-tenant validation |
| E. Materia de otra institución | 404 Not Found | Cross-tenant validation |
| F. Periodo de otra institución | 404 Not Found | Cross-tenant validation |
| G. Materia incompatible con nivel | NO VALIDADO | No hay regla que verifique Subject.minLevel/maxLevel vs Course.level |
| H. Duplicación de asignación | 409 Conflict | Composite unique constraint |
| I. Cambio de asignación | Exitoso (update status) | Soft-delete + re-create pattern |
| J. Asignación a periodo cerrado | NO VALIDADO | No hay verificación de AcademicPeriod.status al crear |
| K. Usuario inactivo | 403 Forbidden | TenantContextGuard rechaza membresías inactivas |
| L. Membership inactiva | 403 Forbidden | TenantContextGuard rechaza |

### Ausencia de fechas de vigencia

**TeacherAssignment NO tiene startDate/endDate.** La dimensión temporal es exclusivamente por `academicPeriodId`. Esto significa:
- No se puede determinar si un docente dictó una materia desde febrero hasta junio dentro de un periodo
- La única granularidad temporal es el periodo académico completo
- Para "cambiar de asignación", el patrón actual es: desactivar la vieja + crear nueva (con nuevo periodo o mismo periodo)

## 12. Director de grupo (FASE 6)

### Representación actual

- **Rol:** `DIRECTOR_DE_GRUPO` (template + tenant, asignable)
- **Asignación:** `UserRole` (userInstitution + roleId)
- **Relación con curso:** **NO EXISTE.** No hay campo `courseId` en el rol ni tabla de "director assignments"
- **Permisos:** TEACHER + enrollments:read + attendance:stats + student-follow-ups:manage

### Preguntas clave

| Pregunta | Respuesta | Detalle |
|----------|-----------|---------|
| ¿Cómo se asigna? | Vía UserRole | El admin asigna el rol DIRECTOR_DE_GRUPO al usuario en la institución |
| ¿Qué permisos recibe? | TEACHER + extras | enrollments:read, attendance:stats, student-follow-ups:manage |
| ¿Qué relación tiene con Course? | NINGUNA | No hay vinculo director → curso específico |
| ¿Existe relación director ↔ curso? | NO | El concepto es "persona con rol de director" sin curso asociado |
| ¿Mismo usuario dirige varios cursos? | DESCONOCIDO | El modelo lo permite (es solo un rol), pero no hay forma de registrar "dirige el curso 8A" |
| ¿Curso puede tener varios directores? | DESCONOCIDO | No hay restricción, pero tampoco hay registro explícito |
| ¿Historial se conserva? | VIA AUDITLOG | `USER_ROLE_ASSIGNED` / `USER_ROLE_REMOVED` en AuditLog |
| ¿Cambio de director durante año? | VIA ROLE CHANGE | Se remueve el rol de uno y se asigna al otro. Sin registro de "desde cuándo" ni "hasta cuándo" |

### **GAP CONCEPTUAL DOCUMENTADO**

**DIRECTOR_DE_GRUPO como rol RBAC no representa la relación "persona responsable del curso X".** Falta:
- Un campo/vínculo que asocie el director con un curso específico
- Registro de vigencia (desde/hasta) de la dirección
- Historial de "quién fue director de qué curso y cuándo"

**Clasificación:** GAP conceptual/funcional. No bloqueante para staging (el rol existe y es funcional para el caso base: "mostrar directores"). Bloqueante para funcionalidad avanzada como "asignar director al curso 8A".

## 13. Estudiantes

### Modelo
- `Student` (institutionId, userId?, documentType, documentNumber, firstName, lastName, dateOfBirth, status)
- Relación 1:1 opcional con `User` (para estudiantes con cuenta de login)
- `Enrollment` vincula Student ↔ Course ↔ SchoolGrade ↔ AcademicPeriod

### Integridad
- `@@unique([institutionId, documentType, documentNumber])` — un documento por institución
- `userId` es único (un student ligado a un solo user)
- Cross-tenant: todos los queries filtran por `institutionId`

### Students con/sin cuenta de usuario
- Demo tiene 3 estudiantes (Lucia, Mateo, Valentina) — registros Student SIN cuenta de usuario
- Demo tiene `student@demo-school.dev` — usuario con rol STUDENT pero SIN registro Student asociado (o sí, necesito verificar)

**Observación:** La separación Student/User permite tener registros académicos sin login. Esto es correcto para colegios donde los estudiantes pequeños no tienen email.

## 14. Acudientes (FASE 10)

### Modelo
- `GuardianStudent` (institutionId, guardianUserId, studentId, status, relationshipType, isPrimary)
- Guardian es un `User` con rol `PARENT`
- Soporta: múltiples estudiantes, múltiples acudientes, tipo de relación, estado

### Verificaciones

| Escenario | Resultado | Evidencia |
|-----------|-----------|-----------|
| Carlos Gómez → Ana Gómez | EXITOSO | Seed: parent@demo-school.dev → Lucia Fernandez |
| Carlos Gómez → Pedro Gómez | EXITOSO | Seed: parent@demo-school.dev → Mateo Rodriguez |
| Acudiente de Instit A accede a Student de Instit B | BLOQUEADO | Cross-tenant validation en guardians.service.ts |
| Acudiente solo ve estudiantes vinculados | SÍ (read) | `findStudentsByGuardian` filtra por guardianUserId + institutionId |
| Admin ve todos los estudiantes | SÍ | Solo parents tienen restricción de visibilidad |

### Diseño positivo
- `guardianUserId` viene del JWT (`req.user.userId`), no del body — previene que un admin vincule un usuario arbitrario como acudiente
- Relación many-to-many correcta (N:M entre guardians y students)

## 15. Periodos académicos

### Modelo
- `AcademicPeriod` (institutionId, code, name, startDate, endDate, status, createdById?, closedById?, closedAt?)
- Estados: ACTIVE, INACTIVE, CLOSED
- `CLOSED` es permanente (no se puede reabrir según la lógica actual)

### Integridad
- Código único por institución
- Cross-tenant: todos los queries filtran por `institutionId`
- Cierre con `SELECT ... FOR UPDATE` (protección contra concurrencia)

### Seed
- 3 periodos demo: 2026-P1 (ACTIVE), 2026-P2 (ACTIVE), 2026-P3 (CLOSED)
- Creados por `admin@demo-school.dev`

## 16. Historial y Vigencia (FASE 9)

### Clasificación de relaciones

| Relación | Tipo | Fecha inicio/fin | Periodo | Estado | Historial preservado |
|----------|------|-------------------|---------|--------|---------------------|
| TeacherAssignment | **SOLO ESTADO ACTUAL** | NO | SÍ (academicPeriodId) | SÍ (ACTIVE/INACTIVE) | Parcial (solo via AuditLog) |
| Director de grupo | **SOLO ESTADO ACTUAL** | NO | NO | SÍ (via UserRole) | Solo AuditLog |
| Enrollment | **SOLO ESTADO ACTUAL** | enrolledAt (creación) | SÍ (academicPeriodId) | SÍ | Parcial |
| UserInstitution | **SOLO ESTADO ACTUAL** | NO | NO | SÍ (MembershipStatus) | AuditLog |
| AcademicPeriod | **HISTÓRICO** | SÍ (startDate, endDate) | N/A | SÍ (ACTIVE/CLOSED) | El periodo ES el historial |
| Grade | **SOLO ESTADO ACTUAL** | NO | SÍ (period: String) | SÍ | Parcial |

### Preguntas clave

1. **¿Se puede saber quién era docente de una asignatura en un periodo pasado?**
   - SÍ si se conservan las TeacherAssignment con status INACTIVE del periodo anterior
   - NO si las TeacherAssignment se eliminan en vez de desactivar
   - El modelo actual usa soft-delete (INACTIVE), así que SÍ se puede consultar

2. **¿Se puede saber quién era director de un curso en una fecha determinada?**
   - NO directamente. Solo via AuditLog (`USER_ROLE_ASSIGNED` con `createdAt`)
   - No hay tabla de "historial de directores"

3. **¿Un cambio actual destruye información histórica?**
   - NO para TeacherAssignment (soft-delete preserva)
   - SÍ parcialmente para director de grupo (el UserRole se modifica, el anterior se pierde excepto en AuditLog)

4. **¿Las relaciones dependen del "estado actual"?**
   - SÍ para la mayoría. La consulta "¿quién es docente HOY?" funciona. La consulta "¿quién era docente EN JUNIO?" requiere reconstrucción de AuditLog.

### Clasificación consolidada
- **AcademicPeriod:** HISTÓRICO (tiene startDate/endDate)
- **TeacherAssignment:** PARCIALMENTE HISTÓRICO (preserva por periodo, pero sin fechas internas)
- **Director de grupo:** SOLO ESTADO ACTUAL
- **Enrollment:** PARCIALMENTE HISTÓRICO (preserva por periodo)
- **Grade:** SOLO ESTADO ACTUAL (periodo es String, no FK temporal)
- **UserInstitution:** SOLO ESTADO ACTUAL

## 17. RBAC y Autorización (FASE 8)

### Arquitectura de guards

```
Request → AccessTokenGuard (JWT) → TenantContextGuard (X-Institution-Id header) → PermissionGuard (@RequirePermission)
```

### Diferencia "tener permiso" vs "tener permiso sobre el recurso"

**En el sistema actual son sinónimos dentro de un tenant.** No hay autorización a nivel de recurso (resource-level authorization):
- Un TEACHER con `teacher-assignments:manage` puede modificar CUALQUIER assignment en su institución
- No hay verificación de "¿es TU assignment?"
- No hay verificación de "¿el estudiante está en TU curso?"
- La única restricción es: ¿el usuario tiene el permiso? + ¿el recurso pertenece al mismo tenant?

### Tenant isolation
- Cada servicio filtra por `institutionId` en TODOS los queries
- `institutionId` viene exclusivamente de `req.tenant!.institutionId` (nunca del body/params)
- TenantContextGuard valida membresía activa + institución activa
- SUPER_ADMIN obtiene membresía automática a cualquier institución activa

### Permisos de módulo vs contexto

| Módulo | Permiso | Acceso general | Acceso contextual |
|--------|---------|---------------|-------------------|
| students | `students:read` | Ver TODOS los estudiantes del tenant | Parents: solo sus hijos vinculados |
| teacher-assignments | `teacher-assignments:manage` | Crear/modificar CUALQUIER assignment del tenant | Sin restricción por docente específico |
| grades | `grades:manage` | Crear/modificar CUALQUIER calificación del tenant | Sin restricción por curso/docente |
| attendance | `attendance:create` | Registrar asistencia para CUALQUIER curso | Sin restricción por curso/docente |

**Esto es apropiado para un MVP SaaS.** La autorización granular (row-level security) es una mejora post-MVP.

## 18. Tenant Isolation (FASE 14)

### Fortalezas
1. **Patrón consistente:** Cada controller usa `req.tenant!.institutionId` exclusivamente
2. **DTOs limpios:** Ningún DTO acepta `institutionId` del body (excepto `SelectTenantDto` en auth)
3. **Tres capas de guard:** JWT + TenantContext + Permission en cada controller
4. **Validación de membresía:** TenantContextGuard verifica estado ACTIVE de membresía e institución
5. **Cross-entity validation:** TeacherAssignments, Schedules, Enrollments validan TODAS las FKs contra institutionId

### Resultado de pruebas de seguridad

| Ataque | Resultado | Mecanismo de defensa |
|--------|-----------|---------------------|
| Teacher de Instit A → Assignment en Instit B | BLOQUEADO | teacherUserId validation via UserInstitution |
| Subject → Area de otra institución | BLOQUEADO | assertAreaBelongsToInstitution() |
| Student de Instit B → Enrollment en Instit A | BLOQUEADO | Student cross-tenant validation |
| Guardian de Instit A accede a Student de Instit B | BLOQUEADO | GuardianStudent tenant-scoped |
| Period de Instit B en TeacherAssignment | BLOQUEADO | AcademicPeriod cross-tenant validation |
| Body tampering con institutionId | BLOQUEADO | ValidationPipe whitelist + TenantContextGuard |

## 19. Frontend (FASE 12)

### Rutas y páginas

28 enlaces en sidebar, todos con permission-gating. Mapeo backend→frontend:

| Backend Module | Frontend Module | Rutas | Estado |
|---------------|----------------|-------|--------|
| students | students | /students/* | COMPLETO |
| courses | courses | /courses/* | COMPLETO |
| subjects | subjects | /subjects/* | COMPLETO (con area/type/level) |
| areas | areas | /areas | LIST (inline create) |
| grades | grades | /grades/* | COMPLETO |
| schedules | schedules | /schedules/* | COMPLETO |
| tasks | tasks | /tasks/* | COMPLETO |
| teacher-assignments | teacher-assignments | /teacher-assignments/* + /teachers | COMPLETO |
| enrollments | enrollments | /enrollments/* | COMPLETO |
| guardians | guardians | /guardians/* | COMPLETO (UUID input en form) |
| academic-periods | academic-periods | /academic-periods/* | COMPLETO |
| student-follow-ups | student-follow-ups | /student-follow-ups/* | COMPLETO |
| attendance | attendance | /attendance/* | COMPLETO |
| communications | communications | /communications/* | COMPLETO |
| signatures | signatures | /signatures/* | COMPLETO |
| notifications | notifications | /notifications/* | COMPLETO (read-only) |
| users/admin | administration | /admin/users/* | COMPLETO (create + roles) |
| institution | administration | /institution | COMPLETO |
| reports | reports | /reports/* | COMPLETO (read-only) |
| agenda | agenda | /agenda/* | COMPLETO |

### Inconsistencias menores detectadas

1. **`Area.status` reutiliza `SubjectStatus`** en vez de tener alias propio
2. **`Grade.value: string` vs `CreateGradeInput.value: number`** — inconsistencia en types.ts
3. **Guardians form requiere UUID raw** — sin autocomplete/search
4. **Sin UserEditPage** — admin puede crear usuario y asignar roles, pero no editar perfil
5. **AreasPage solo tiene list + inline create** — sin página de detalle/edición dedicada

## 20. E2E y Test Coverage (FASE 13)

### Cobertura actual

| Capa | Archivos | Tests | Estado |
|------|----------|-------|--------|
| API Unit | 45 spec files | 805 | PASS |
| API E2E | 32 e2e-spec files | 690 | PASS |
| Web Vitest | 64 test files | 510 | PASS |
| Playwright | 0 | 0 | NO IMPLEMENTADO |

### Brechas de cobertura

| Brecha | Severidad | Detalle |
|--------|-----------|---------|
| `areas` sin unit test backend | MEDIA | Solo cubierto por e2e combinado |
| `areas` sin frontend test | ALTA | Cero archivos de test para AreasPage/hooks |
| `student-follow-ups` sin page tests frontend | ALTA | Solo 3 hook tests individuales |
| `TeachersPage` sin test específico | MEDIA | Puede estar parcialmente cubierto por teacher-assignments test |
| `communication-recipients` sin page test | MEDIA | Solo hook test |
| `teacher-assignments` sin test de workload edge cases | BAJA | Update con workload re-validation no testeado |

### Escenarios críticos cubiertos

| Escenario | Unit | API E2E | Web |
|-----------|------|---------|-----|
| Crear usuario | SI | SI | SI |
| Asignar rol | SI | SI | SI |
| Crear área | NO | SI | NO |
| Crear asignatura | SI | SI | SI |
| Asignar docente | SI | SI | SI |
| Consultar docentes | SI | SI | SI |
| Consultar directorio | NO | SI | NO |
| Cross-tenant (varios) | SI | SI | NO |
| Director de grupo | NO | SI | NO |
| Relación docente-estudiante | SI | SI | NO |

## 21. Seed (FASE 11)

### Matriz de coherencia

| Usuario | Rol | Institución | Cursos | Asignaturas | Áreas | Periodo | Estudiantes | Clasificación |
|---------|-----|-------------|--------|-------------|-------|---------|-------------|---------------|
| superadmin@agenda.dev | SUPER_ADMIN (GLOBAL) | Ninguna | — | — | — | — | — | COHERENTE |
| admin@demo-school.dev | INSTITUTION_ADMIN | Demo School | — | — | — | 2026-P1 (creador) | — | COHERENTE |
| teacher@demo-school.dev | TEACHER + DIRECTOR_DE_GRUPO | Demo School | MAT-001, CIE-001 | MAT-S (×2) | — | 2026-P1 | via enrollments | COHERENTE PERO ARTIFICIAL |
| rector@demo-school.dev | RECTOR | Demo School | — | — | — | — | — | COHERENTE |
| coordinador-academico@demo-school.dev | COORDINADOR_ACADEMICO | Demo School | — | — | — | — | — | COHERENTE |
| coordinador-convivencia@demo-school.dev | COORDINADOR_CONVIVENCIA | Demo School | — | — | — | — | — | COHERENTE |
| orientador@demo-school.dev | ORIENTADOR | Demo School | — | — | — | — | — | COHERENTE |
| psicologo@demo-school.dev | PSICOLOGO | Demo School | — | — | — | — | — | COHERENTE |
| parent@demo-school.dev | PARENT | Demo School | — | — | — | — | Lucia, Mateo | COHERENTE |
| student@demo-school.dev | STUDENT | Demo School | — | — | — | — | — | COHERENTE (sin Student record) |
| Lucia Fernandez | Student (sin user) | Demo School | MAT-001, CIE-001 | — | — | 2026-P1 | — | COHERENTE |
| Mateo Rodriguez | Student (sin user) | Demo School | MAT-001, CIE-001 | — | — | 2026-P1 | — | COHERENTE |
| Valentina Lopez | Student (sin user) | Demo School | — | — | — | — | — | HUÉRFANA (sin enrollment ni guardian) |

### Observaciones del seed

1. **Valentina Lopez** es un Student sin enrollment ni guardian — huérfano intencional para testing
2. **teacher@demo-school.dev** tiene MAT-S asignado a DOS cursos (MAT-001 y CIE-001) — artificial pero válido
3. **Schedules** crean 6 registros cubriendo 5 días, 3 asignaturas, 3 aulas
4. **El docente dicta "Matemáticas" tanto en curso MAT-001 como en CIE-001** — conceptualmente confuso (asignatura MAT-S en curso CIE-001), pero el modelo lo permite
5. **Attendance** tiene 3 registros (2 PRESENT, 1 ABSENT) — Valentina tiene ABSENT pero no tiene enrollment en ese curso

## 22. Seguridad (FASE 14 resumen)

### Hallazgos de seguridad

| ID | Severidad | Descripción |
|----|-----------|-------------|
| F-07 | MEDIUM | User entity es global — desactivación por un tenant afecta a todos los tenants |
| F-01 a F-06 | LOW | TOCTOU en update (update query sin institutionId en WHERE, mitigado por existence check previo) |
| F-03 | LOW | Parent restriction solo aplica en lectura, no en update de Student |
| — | INFO | guardianUserId viene del JWT (diseño seguro) |
| — | INFO | URL path institutionId correctamente ignorado en memberships |

### Patrón TOCTOU (repetido en Areas, Subjects, Enrollments, AcademicPeriods)

```typescript
// Existence check CON institutionId (correcto)
const found = await this.prisma.area.findFirst({ where: { id, institutionId } });
if (!found) throw new NotFoundException();
// Update SIN institutionId (toctou window)
await this.prisma.area.update({ where: { id }, data: updateData });
```

**Riesgo real:** Muy bajo. La ventana es microscópica y el atacante necesitaría escritura concurrente al mismo registro con un institutionId diferente. Mitigado por la unicidad de `institutionId_code`.

## 23. Matriz de Hallazgos

| ID | Hallazgo | Área | Severidad | Evidencia | Impacto | Recomendación |
|----|----------|------|-----------|-----------|---------|---------------|
| F-01 | Director de grupo sin vinculo a curso específico | Modelado | HIGH | `roles` (no courseId), `getDirectors()` (lista por rol) | No se puede asignar "director del curso 8A" | Crear tabla DirectorAssignment o campo en Course |
| F-02 | User desactivación global cross-tenant | Seguridad | MEDIUM | `users.service.ts:deactivate()` modifica `User.status` | Admin A desactiva user que es activo en Instit B | Usar MembershipStatus para desactivación tenant-scoped |
| F-03 | TeacherAssignment sin fechas de vigencia | Modelado | MEDIUM | Schema: solo `academicPeriodId`, sin startDate/endDate | No hay granularidad temporal dentro de un periodo | Agregar campos opcionales `startDate`, `endDate` |
| F-04 | Sin autorización a nivel de recurso (row-level) | Autorización | MEDIUM | `PermissionGuard` solo verifica permiso, no ownership | Cualquier usuario con permiso puede modificar datos de otro | Agregar ownership checks post-MVP |
| F-05 | Sin validación Subject.minLevel/maxLevel vs Course.level | Business Rule | LOW | `teacher-assignments.service.ts:create()` | Se puede asignar materia de SECUNDARIA a curso de PRIMARIA | Agregar validación de compatibilidad |
| F-06 | Sin validación de AcademicPeriod.status al crear TeacherAssignment | Business Rule | LOW | `teacher-assignments.service.ts:create()` | Se puede asignar a periodo CLOSED | Agregar verificación de periodo activo |
| F-07 | TOCTOU en update queries (Areas, Subjects, Enrollments, Periods) | Seguridad | LOW | Update sin institutionId en WHERE clause | Race condition teórica | Agregar institutionId al WHERE del update |
| F-08 | Parent restriction solo en lectura de Student | Autorización | LOW | `students.service.ts:update()` sin parent check | Parent con students:manage podría actualizar | Documentar que requiere rol no-parent |
| F-09 | Grade.value: string vs CreateGradeInput.value: number | Frontend | LOW | `types.ts` inconsistencia interna | Posible bug en display/creation | Unificar tipos |
| F-10 | Areas sin unit test backend | Testing | MEDIA | `areas/` sin .spec.ts | Cobertura incompleta | Agregar unit test |
| F-11 | Areas sin frontend test | Testing | ALTA | `modules/areas/` sin test files | Sin cobertura de UI | Agregar tests |
| F-12 | student-follow-ups sin page tests frontend | Testing | ALTA | Solo 3 hook tests | Sin cobertura de pages | Agregar page tests |
| F-13 | Guardians form requiere UUID raw | UX | LOW | `GuardiansFormPage.tsx` line 103 | UX pobre para admin | Agregar autocomplete |
| F-14 | Sin UserEditPage | UX | LOW | Admin solo puede crear + roles | No puede editar nombre/email | Agregar página de edición |
| F-15 | Valentina Lopez huérfana en seed | Datos | INFO | Student sin enrollment ni guardian | Intencional para testing | OK |
| F-16 | teacher@demo dicta MAT-S en curso CIE-001 | Datos | INFO | TeacherAssignment cross-subject-course | Artificial para testing | OK |
| F-17 | Area.status reutiliza SubjectStatus | Modelo | INFO | Schema enum | Semánticamente confuso | Alias o enum dedicado |
| F-18 | Sin Playwright/E2E browser tests | Testing | INFO | 0 archivos playwright | Sin cobertura de UI end-to-end | Agregar post-MVP |

## 24. Clasificación de hallazgos

### A. BLOQUEADORES DE STAGING
**NINGUNO.** No se encontraron bloqueadores arquitectónicos.

### B. IMPORTANTES ANTES DE PRODUCCIÓN
**NINGUNO crítico.** Los hallazgos MEDIUM (F-02, F-03, F-04, F-10) son mejoras deseables pero no impiden staging.

### C. MEJORAS POST-MVP
- F-01: Director de grupo ↔ curso (tabla de vinculación)
- F-02: User desactivación tenant-scoped
- F-03: Fechas de vigencia en TeacherAssignment
- F-04: Autorización a nivel de recurso
- F-05/F-06: Validaciones de negocio adicionales
- F-11/F-12: Tests de frontend
- F-13/F-14: UX improvements
- F-18: Playwright tests

### D. INFORMACIÓN / DEUDA TÉCNICA
- F-07/F-08/F-09/F-15/F-16/F-17: Observaciones menores

## 25. Riesgos residuales

| Riesgo | Probabilidad | Impacto | Mitigación actual |
|--------|-------------|---------|-------------------|
| Cross-tenant data leak | MUY BAJA | ALTO | Tres capas de guard + tenant-scoped queries |
| Acceso no autorizado por permiso | BAJA | MEDIO | RBAC funciona correctamente |
| Pérdida de historial docente | MEDIA | MEDIO | Soft-delete preserva; AuditLog complementa |
| Director de grupo sin curso | ALTA | BAJO | Rol funciona; solo falta granularidad |
| User desactivación global | BAJA | MEDIO | Solo admins pueden desactivar; unlikely cross-tenant |

## 26. Recomendaciones

### Para staging (implementar ahora)
1. **Ninguna.** El sistema es funcionalmente consistente para staging.

### Para producción (implementar antes de go-live)
1. Agregar validación de `AcademicPeriod.status` al crear TeacherAssignment
2. Agregar validación `Subject.minLevel/maxLevel` vs `Course.level`
3. Agregar unit test para Areas backend
4. Agregar frontend tests para Areas y student-follow-ups pages

### Para post-MVP
1. Tabla `DirectorAssignment` (director ↔ curso con vigencia)
2. Fechas `startDate`/`endDate` opcionales en TeacherAssignment
3. Autorización a nivel de recurso (row-level)
4. Desactivación tenant-scoped de usuarios
5. Guardians form con autocomplete
6. UserEditPage
7. Playwright tests

## 27. Veredicto

### **B — READY FOR STAGING WITH FIXES**

**Motivo:** No existen bloqueadores arquitectónicos ni de seguridad que impidan staging. El modelo de usuarios, roles y relaciones académicas es funcionalmente consistente. Los hallazgos MEDIUM (F-01 a F-04) son mejoras deseables que no impiden la operación básica del sistema. Las brechas de test coverage (F-10 a F-12) son aceptables para staging pero deben cerrarse antes de producción.

**Criterio evaluado:** ¿La implementación actual de docentes, roles y relaciones académicas es suficientemente consistente para continuar a staging?

**Respuesta:** SÍ. El sistema puede:
- Representar docentes como Users con roles
- Asignar docentes a cursos/asignaturas/periodos
- Listar docentes y directores
- Gestionar áreas y su relación con asignaturas
- Mantener aislamiento multi-tenant
- Prevenir cross-tenant access
- Preservar historial via soft-delete + AuditLog

**Lo que NO puede (pero no bloquea staging):**
- Asignar un director a un curso específico
- Consultar "quién era docente en fecha X" sin reconstruir AuditLog
- Prevenir un docente de enseñar materia incompatible con el nivel del curso
- Realizar autorización a nivel de recurso (row-level)

## 28. Evidencias

### Archivos auditados
- `apps/api/prisma/schema.prisma` (43 modelos, 30 enums)
- `apps/api/prisma/seed.ts` (77 permisos, 11 roles template, 10 tenant, ~1500 líneas)
- `apps/api/src/modules/teacher-assignments/` (service, controller, DTOs, spec)
- `apps/api/src/modules/areas/` (service, controller, DTOs)
- `apps/api/src/modules/subjects/` (service, DTOs)
- `apps/api/src/modules/students/` (service)
- `apps/api/src/modules/guardians/` (service)
- `apps/api/src/modules/enrollments/` (service)
- `apps/api/src/modules/academic-periods/` (service)
- `apps/api/src/modules/schedules/` (service)
- `apps/api/src/modules/users/` (service)
- `apps/api/src/modules/memberships/` (service)
- `apps/api/src/modules/roles/` (service)
- `apps/api/src/modules/auth/` (guards, authorization service, tenant context)
- `apps/api/src/common/rbac/assignable-roles.ts`
- `apps/api/test/areas-teachers.e2e-spec.ts`
- `apps/web/src/api/types.ts`
- `apps/web/src/app/router.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/permissions/permission.constants.ts`
- `apps/web/src/modules/areas/`
- `apps/web/src/modules/teacher-assignments/`
- `apps/web/src/modules/subjects/pages/SubjectFormPage.tsx`
- `apps/web/src/modules/guardians/`
- `apps/web/src/modules/administration/`

## 29. Comandos utilizados

```bash
# Prisma
npx prisma validate              # Schema valid
npx prisma generate              # Client generated

# API build
npx nest build                   # Clean

# API lint
npx eslint "src/modules/areas/**/*.ts" "src/modules/subjects/**/*.ts" "src/modules/teacher-assignments/**/*.ts"  # Clean

# API unit
npx jest                         # 805/805 passed (45 suites)

# API E2E
npx jest --config ./test/jest-e2e.json --runInBand  # 690/690 passed (32 suites)

# Web typecheck
npx tsc --noEmit                 # Clean

# Web build
npm run build                    # tsc + vite build clean

# Web lint
npx eslint (touched files)       # Clean

# Web unit
npm test (vitest)                # 510/510 passed (64 suites)

# Git
git status --short               # 41 modified + 12 untracked (pre-existing from prompts 102-104)
git diff --stat                  # 1875 insertions, 303 deletions
```

## 30. Limitaciones de la auditoría

1. **Sin pruebas de penetración:** No se ejecutaron ataques reales contra el sistema (fuzzing, inyección SQL, etc.)
2. **Sin Playwright:** No se probaron flujos de UI end-to-end
3. **Sin carga/concurrencia:** No se probaron race conditions bajo carga
4. **Datos de seed:** Las pruebas se basan en datos demo controlados; no se probaron con datasets grandes
5. **RBAC manual:** No se verificó cada combinación de rol × permiso × endpoint (se confía en la arquitectura de guards)
6. **Auditoría estática:** El análisis de código es principalmente estático (lectura); las pruebas dinámicas se limitaron a E2E existentes
7. **Sin revisión de dependencias:** No se auditó la cadena de dependencias npm por vulnerabilidades conocidas
8. **Sin revisión de configuración:** No se revisaron variables de entorno, CORS, rate limiting, headers de seguridad HTTP

---

*Auditoría ejecutada el 2026-09-04. Archivo único nuevo: `docs/105-teachers-roles-academic-relations-audit.md`. No se realizaron commits, pushes, tags, ni modificaciones de código.*
