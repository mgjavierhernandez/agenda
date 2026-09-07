# Brechas del proceso del colegio — implementación (GAP-1 a GAP-8)

Documento operativo de los cambios realizados sobre la plataforma existente para
soportar el proceso real del colegio. No se reconstruyó ningún módulo: todo es
incremental sobre la arquitectura actual (NestJS + Prisma + RBAC + multi-tenant).

## GAP-1 — Perfil de usuario por institución (`UserProfile`)

- Tabla `user_profiles` con unicidad `(userId, institutionId)` y unicidad
  documental `(institutionId, documentType, documentNumber)` (los NULL no
  colisionan en PostgreSQL).
- Endpoints: `POST /users` acepta `profile` anidado opcional;
  `GET /users/:id` lo incluye; `PUT /users/:id/profile` (upsert,
  `users:update`); `GET /users/:id/profile` (`users:read`).
- UI: `CreateUserPage` con secciones de datos personales/profesionales;
  `UserDetailPage` muestra el perfil.
- Vinculación automática cuenta↔ficha: si el documento del perfil coincide
  exactamente con un `Student` sin `userId` de la misma institución, se enlaza.
  Nunca se reasigna un registro ya vinculado. Aplica en alta administrativa,
  `PUT /profile` y autorregistro.

## GAP-2 — Autorregistro y aprobación

- `POST /auth/self-register` (público, throttle 5/hora/IP): crea
  `User(INACTIVE)` + `Membership(PENDING)` + perfil opcional. Roles
  solicitables: `TEACHER`, `PARENT`, `STUDENT`. Por slug o UUID de institución.
- `MembershipStatus` ahora incluye `PENDING` y `REJECTED` (`SUSPENDED` =
  bloqueado, reutilizado). `POST /institutions/:id/memberships/:id/approve` y
  `/reject` (`memberships:manage`). Aprobar activa usuario + membresía y asigna
  el rol solicitado (rol tenant, fallback a template).
- Seguridad: login exige `User.ACTIVE`; `TenantContextGuard` exige membresía
  `ACTIVE`; `GET /auth/institutions` y `tenant/select` solo exponen/aceptan
  membresías `ACTIVE`.
- UI: página pública `/register` (`?i=slug` pre-rellena institución) y bandeja
  `/admin/requests` (pendientes, aprobar/rechazar).

## GAP-3 — Importación masiva (`POST /students/import`, `students:manage`)

- CSV y XLSX (máx. 5 MB). Columnas (insensibles a mayúsculas):
  `firstName,lastName,documentType,documentNumber,dateOfBirth,courseCode,status`.
- `courseCode` por fila o `courseId` por defecto; `academicPeriodId` explícito o
  periodo `ACTIVE` único; el grado se toma del curso (debe tenerlo).
- Crea `Student` + `Enrollment`; duplicados por documento exacto → error de
  fila (no se sobrescribe nada; `updated` siempre 0).
- Respuesta `{ created, updated, enrollments, errors: [{ row, field, message }] }`.
- UI: `/students/import` con selectores de curso/periodo y tabla de errores.
- Cursos: `POST/PATCH /courses` ahora acepta `level`, `schoolGradeId` y
  `section` (campos del modelo que no estaban expuestos; requeridos por el flujo).

## GAP-4 — Google OAuth (sin reemplazar email/password)

- `User.googleId` único nullable. `GET /auth/google` + `GET /auth/google/callback`
  emiten el mismo esquema JWT (access + refresh rotativo).
- Vinculación por email verificado; sin auto-aprovisionamiento: identidades
  desconocidas reciben 403 (deben pasar por autorregistro/aprobación).
- Sin credenciales configuradas, ambos endpoints responden 503.
- Variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
  (ver `.env.example`). Configuración en Google Cloud:
  1. Crear proyecto → APIs y servicios → Credenciales → ID de cliente OAuth.
  2. Origen autorizado: dominio del frontend; URI de redirección autorizada:
     `https://API/auth/google/callback`.
  3. Copiar Client ID/Secret a secretos (staging/producción) o `.env` (local).

## GAP-5 — Scoping (`StudentsService`)

- `TEACHER`/`DIRECTOR_DE_GRUPO`: solo estudiantes matriculados (`ACTIVE`) en
  cursos con `TeacherAssignment`/`CourseDirectorAssignment` activos.
- `STUDENT`: solo su `Student` (`userId` propio).
- `PARENT`: solo vinculados (`GuardianStudent`), como antes.
- Roles administrativos (`INSTITUTION_ADMIN`, `RECTOR`, coordinaciones,
  `ORIENTADOR`, `PSICOLOGO`): acceso total, como antes.
- Sin membresía o sin ámbito reconocido: denegación por defecto (lista vacía /
  404 sin filtrar existencia).
- El rol `STUDENT` ahora incluye el permiso `students:read` (re-ejecutar seed).

## GAP-6 — Franjas y aulas

- Nuevos módulos `schedule-blocks` y `classrooms` (CRUD + desactivar) con
  permisos existentes `schedules:read/manage` (sin permisos nuevos).
- UI dentro del módulo de horarios: `/schedules/blocks`, `/schedules/classrooms`;
  el formulario de horario permite franja y aula opcionales.

## GAP-7 — Backfill de docente

- Al crear `TeacherAssignment`, en la misma transacción se asigna el docente a
  los `Schedule` pendientes (`teacherUserId IS NULL`) del mismo
  curso/materia/periodo. Los que ya tienen docente no se tocan; los que
  generarían conflicto de docente se omiten. Auditoría
  `SCHEDULE_TEACHER_BACKFILLED` con `{ updated, skipped }`.

## GAP-8 — Director de grupo

- Regla: un solo `ACTIVE` por curso+periodo, con histórico ilimitado de
  `INACTIVE`. Implementada con índice parcial
  `course_director_assignments_single_active_idx ... WHERE status='ACTIVE'`
  (migración `fix_course_director_single_active`).
- El servicio valida duplicados `ACTIVE` al crear y al reactivar (409 limpio).

## Migraciones aplicadas (orden)

1. `add_user_profiles` — tabla `user_profiles`.
2. `fix_course_director_single_active` — índice parcial.
3. `add_membership_approval_flow` — enum + `requested_role`.
4. `add_user_google_id` — columna `google_id`.

## Notas operativas

- Re-ejecutar el seed tras desplegar (sincroniza `students:read` del rol
  `STUDENT` y roles/permisos).
- `POST /auth/self-register`: throttle 5/hora/IP (las corridas E2E masivas
  dentro de la misma hora responden 429).
- `POST /guardians/students/:studentId` acepta `guardianUserId` opcional para
  que el administrador vincule cualquier acudiente (por defecto, el llamante).
