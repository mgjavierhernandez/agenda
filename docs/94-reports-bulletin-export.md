# PROMPT 94 — REPORTES, BOLETÍN Y EXPORTACIÓN (PDF/CSV)

> **Fecha:** 2026-08-30
> **Tipo:** Implementación funcional (backend consolidación + exportación PDF/CSV + RBAC multi-rol + frontend páginas/hooks/tests + docs).
> **Rama:** `main` (working tree; **sin commit/push/tag**)

---

## 1. Executive Summary

PROMPT 94 implementa el módulo de **reportes académicos, boletín y
exportación** en Agenda, sobre los datos ya consolidados de asignaciones,
matrículas, calificaciones y asistencia.

Lo entregado:

- **Backend — `ReportsModule`** (`/api/v1/reports`): 6 endpoints —
  reporte de estudiante, boletín de estudiante, reporte de curso, y las 3
  variantes de exportación (`format=pdf|csv`):
  - `GET /reports/students/:studentId` (lectura, `reports:read`)
  - `GET /reports/students/:studentId/bulletin` (lectura, `reports:read`)
  - `GET /reports/courses/:courseId` (lectura, `reports:read`)
  - `GET /reports/students/:studentId/export` (PDF/CSV, `reports:export`)
  - `GET /reports/students/:studentId/bulletin/export` (PDF/CSV, `reports:export`)
  - `GET /reports/courses/:courseId/export` (CSV únicamente, `reports:export`)
- **Backend — consolidación**: un solo pipeline `buildStudentConsolidation()`
  calcula por estudiante: datos de matrícula (curso/grado), rendimiento
  académico por asignatura (nombre del docente, notas `period: score`,
  `simpleAverage`), resumen de asistencia (Presente/Tarde/Ausente/Justificado)
  y resumen del observador (total/abiertos/resueltos + desglose por
  confidencialidad). El reporte de curso agrega por matrícula activa:
  resumen (total, con notas, con asistencia) y tabla de estudiantes con
  `simpleAverage` y asistencia en formato `P/A/T`.
- **Backend — privacidad del observador**: los apuntes de seguimiento
  `CONFIDENTIAL`/`SENSITIVE` se muestran solo a quien alcance ese nivel de
  confidencialidad (reutilizando `StudentFollowUpAuthorizationService` —
  mismo criterio que los permisos de visualización del observador; **no se
  duplica lógica**).
- **Backend — exportación auditable**: PDF y CSV streamed con `@Res()`,
  `Content-Disposition` con nombre de archivo descriptivo, registro de
  auditoría `REPORT_EXPORTED`/`BULLETIN_EXPORTED` (entityType `ReportExport`);
  CSV con `toCsv()` RFC 4180 + BOM para Excel. Dependencia `pdfkit` +
  `@types/pdfkit` (dev).
- **Seed — permisos nuevos**: `reports:read` y `reports:export`. **Importante
  para el gate**: la fuente de verdad para crear los rows de `Permission` es el
  array `permissionData`, no los arrays de asignación de rol — ambos se
  actualizaron; `TEACHER_PERMISSIONS` fue corregido (inicialmente se había
  omitido y el docente no tenía permisos de reportes). Total seed: **75
  permisos**. No hubo cambios de schema ni migraciones (solo datos seed).
- **Frontend**: tipos de DTO, constantes `REPORTS_READ`/`REPORTS_EXPORT`,
  método `apiClient.download()` (facturación `Content-Disposition`,
  auto-descarga blob), 3 hooks TanStack Query (`useStudentReport`,
  `useStudentBulletin`, `useCourseReport`) y helpers de exportación
  (`useExportReport.ts`, con corrección de un bug de construcción de URL en
  los exports CSV), 2 páginas (`/reports`, `/reports/course`) + componente
  compartido `StudentReportView`, rutas y enlaces en el Sidebar gated por
  `reports:read`.
- **Tests**: backend unit + e2e (`reports.e2e-spec.ts`, 18 casos con fixtures
  resueltas en runtime) y web vitest (17 casos). Todo verde (ver secciones
  23/27).

**Resultado de pruebas (gate completo, ver sección 27):** API unit **777/777**
(42 suites, incluidos 33 nuevos de reports); API E2E **660/660** en 29 suites
`--runInBand` (incl. `reports` **18/18**); Web vitest **512/512** (63 archivos,
incl. reports **17/17**); `tsc` limpio (api + web); builds api (`nest build`) y
web (`vite build`) exitosos; lint limpio para todos los archivos de PROMPT 94
(errores de lint restantes son **preexistentes**, ver sección 20).

**Estado: IMPLEMENTED — PROMPT 94 COMPLETE (sin commit/push/tag, según instrucciones).**

---

## 2. Git / Working-Tree State

- **No** se ejecutó `git commit`, `git push` ni `git tag`.
- El working tree acumula cambios **sin commitear** de prompts anteriores
  (70–93) más PROMPT 94; `git diff --stat` refleja ese estado combinado.
- Archivos nuevos de PROMPT 94 listados en la sección 28.
- Tags protegidos intactos: `v1.0.2-rc.1`; commit `e7dca4a` sin alterar.
- Los cambios de PROMPT 94 sobre `seed.ts` se limitan a las líneas de
  `report:*` (verificado con `git diff`): los errores de lint que reporta
  eslint en `seed.ts` (líneas 606/615/761/844/866) son **preexistentes**.

## 3. Objective & Scope

1. Backend: endpoints de reporte de estudiante, boletín y reporte de curso
   (lectura) y sus exportaciones PDF/CSV.
2. Backend: consolidación académica (matrícula, notas, simpleAverage,
   asistencia, observador con desglose por confidencialidad).
3. Backend: RBAC `reports:read` (lectura) y `reports:export` (exportación);
   aislamiento de tenant (BOLA/IDOR-safe); auditoría de exports.
4. Seed: permisos `reports:read`/`reports:export` correctamente
   materializados (incl. TEACHER).
5. Frontend: tipos, constantes, `apiClient.download()`, hooks de datos y de
   exportación, vistas de reporte/boletín por estudiante (flujo padre con
   hijos y flujo admin/teacher con buscador) y reporte de curso, rutas y nav.
6. Tests: unit + e2e backend y vitest web + gate de regresión completo.

## 4. Non-Goals (explícito)

- **No** reportes por SEO/IA/estructura jerárquica (scope del proyecto).
- **No** promedios oficiales ponderados: `simpleAverage` es un promedio
  **descriptivo** sobre calificaciones registradas (etiquetado en UI como
  tal, no como promedio oficial).
- **No** pantalla de exportación batch del curso completo en PDF (solo CSV).
- **No** auto-derivación de calificaciones desde asistencia.
- **No** modificaciones a `prisma migrate dev` ni a migraciones pasadas
  (drift preexistente; este prompt **no** agrega migraciones).
- `GET /reports/courses/:courseId` (JSON) se mantiene: es la fuente para la
  tabla del front; la exportación CSV del curso reusa el mismo consolidado.

## 5. Security Pipeline (recap)

Cadena de seguridad aplicada por el proyecto y usada por este módulo:
guards globales `AccessTokenGuard → TenantContextGuard` + `PermissionGuard`;
`ValidationPipe{ whitelist, transform, forbidNonWhitelisted }`; autoridad
`institutionId` siempre desde el contexto (header `x-institution-id`),
nunca del body o de la URL del recurso. **Requisito clave**: todo request
autorizado debe enviar `X-Institution-Id`; sin él el `TenantContextGuard`
responde **403** ("Institution context required").

Resolución de permisos por `PermissionGuard`:
- Sin contexto de tenant → se evalúan solo códigos del rol global.
- Con `request.tenant.institutionId` → `hasAllPermissions(userId,
  institutionId, codes)` (unión de permisos globales + del tenant).

## 6. Data Model

**Sin cambios de schema.** NO se agregó ninguna migración ni columna en este
prompt: el módulo consolida modelos existentes (enrollment, course,
course_teacher, student, school_grade, grade, attendance, follow_up,
guardian_student, academic_period, school_grade? — ver el pipeline).

La única novedad estructurada es la **materialización de 2 permisos** en
`permissionData` (Datos de seed, no schema):

| Código | Módulo | Descripción |
|---|---|---|
| `reports:read` | reports | View academic reports and bulletins |
| `reports:export` | reports | Export academic reports (PDF/CSV) |

## 7. RBAC Mapping

| Operación | Permiso | ADMIN | TEACHER | PARENT | STUDENT | SUPER_ADMIN |
|---|---|---|---|---|---|---|
| `GET /reports/students/:id` | `reports:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /reports/students/:id/bulletin` | `reports:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /reports/courses/:id` | `reports:read` | ✅ | ✅ | ❌ (403) | ❌ (403) | ✅ |
| `GET /reports/students/:id/export` | `reports:export` | ✅ | ✅ | ❌ (403) | ❌ (403) | ✅ |
| `GET /reports/students/:id/bulletin/export` | `reports:export` | ✅ | ✅ | ❌ (403) | ❌ (403) | ✅ |
| `GET /reports/courses/:id/export` | `reports:export` | ✅ | ✅ | ❌ (403) | ❌ (403) | ✅ |

(Verificado por e2e: padre 403 en los 3 exports y lee solo el boletín/reporte
de sus hijos; estudiante lee solo el propio; docente accede al reporte del
curso y a estudiantes de su institución.)

Matriz seed (75 permisos, 14 rows `role_permission` con códigos de reports):

| Rol | reports:read | reports:export |
|---|---|---|
| SUPER_ADMIN (global) | ✅ | ✅ |
| INSTITUTION_ADMIN (global + tenant demo) | ✅ | ✅ |
| TEACHER (global + tenant demo) | ✅ | ✅ |
| PARENT (global + tenant demo) | ✅ | ❌ |
| STUDENT (global + tenant demo) | ✅ | ❌ |

## 8. Grants / Ownership Rules (reglas de acceso a recursos)

Las reglas de quién ve cada reporte viven en `reports-authorization.service.ts`
y se aplican **antes** de consolidar:

- **STUDENT**: solo puede acceder a su propio reporte/boletín.
- **PARENT**: solo reportes de estudiantes vinculados (guardian_student).
- **TEACHER / ADMIN / SUPER_ADMIN**: acceso institucional (estudiante debe
  pertenecer al tenant), con el alcance adicional de matrícula activa para el
  reporte de curso.
- Matrícula requerida (rol estudiante/observador) o `SUPER_ADMIN` según el
  caso; estudiante sin matrícula activa en el periodo → **404**.
- Cross-tenant (`:id` de otra institución) → **404** en todos los casos
  (BOLA/IDOR safe). `X-Institution-Id` ausente → **403** (TenantContextGuard).

## 9. Backend — ReportsService (consolidación)

`reports.service.ts` implementa:

- `getStudentReport(...)` / `getStudentBulletin(...)`: autorizan y delegán en
  `buildStudentConsolidation(userId, institutionId, studentId, period, role,
  includeConfidential?)` — el flag controla si se exponen los apuntes
  `CONFIDENTIAL`: el **boletín** NO incluye detalles de confidencialidad (es
  la pieza que pueden compartir los padres); el **reporte** sí los agrupa con
  badge (para admin/teacher).
- Consolidación de estudiante:
  - matrícula activa (curso, código, grado),
  - rendimiento por asignatura (docente + notas en `period: score` +
    `simpleAverage` descriptivo),
  - asistencia agregada (PR/TR/AU/JS),
  - observador total/abiertos/resueltos + desglose por confidencialidad.
- `getCourseReport(...)`: autoriza, resuelve el periodo (ACTIVE por defecto),
  agrupa matrículas activas del curso y por estudiante calcula `subjectCount`,
  `gradeCount`, `simpleAverage` y el resumen de asistencia, con arreglo global
  `{ totalStudents, studentsWithGrades, studentsWithAttendance }`.

## 10. Backend — Controller y streams

`reports.controller.ts` (tag Swagger `Reports`):

- 3 endpoints de lectura (`@RequirePermission('reports:read')`) con query
  `academicPeriodId?` (nulo → consolida todos los periodos).
- 3 endpoints de exportación (`@RequirePermission('reports:export')`) con
  `query.format = pdf|csv` (default pdf) — el archivo se sirve con
  `@Res({ passthrough: false })` + `res.set({ 'Content-Type' ...,
  'Content-Disposition': ... })`; cada export audita
  `REPORT_EXPORTED`/`BULLETIN_EXPORTED` (entityType `ReportExport`,
  ipAddress desde `req.ip`).
- CSV del curso → `filename=curso-reporte-...csv`; boletín/estudiante →
  `nombre_estudiante-reporte_pdf`/`...boletin`.

## 11. DTO Security / Authority Fields

- `ReportsQueryDto`: `academicPeriodId?: uuid` (opcional).
- `ReportsExportQueryDto extends ReportsQueryDto`: `format?: pdf|csv`
  (default `pdf`, `@IsEnum`).
- Sin campos de autoridad en el body (no hay body): `institutionId` siempre
  desde `x-institution-id`; `studentId`/`courseId` vienen de la URL y son
  validados contra el tenant.

## 12. Tenant Isolation (mandatory)

- Authority `institutionId` derivada del header `x-institution-id`
  (TenantContextGuard); nunca del body/URL.
- Todo lookup filtra por `institutionId`; `:id` de otra institución → **404**.
- Verificado por `reports.e2e-spec.ts` (estudiante de otro tenant → 404;
  header ausente → 403).

## 13. Exportation — PDF y CSV

- `report-pdf.ts`: generador determinista con `pdfkit` (cabecera institución →
  título → secciones académico/asistencia/observador → tabla; el boletín
  replica el layout sin desglose de confidencialidad). Buffer streamed.
- `report-csv.ts`: `toCsv(rows)` con escaping RFC 4180 + **BOM UTF-8**
  (compatibilidad Excel con acentos).
- `getCourseReportCsv(...)`: filas por estudiante incl.
  `simpleAverage` y `P/A/T`.

## 14. Migration (aditiva)

- **Sin migraciones en este prompt.** Ningún cambio de schema Prisma
  (`git diff` sobre `prisma/schema.prisma` no incluye cambios de PROMPT 94).
- `npx prisma validate` + `npx prisma generate` OK en el gate.
- **Restricción del proyecto**: NUNCA `prisma migrate dev`.

## 15. Seed

`prisma/seed.ts` ampliado (solo filas `reports:*`):

- `permissionData`: `{ code: 'reports:read', module: 'reports', ... }` y
  `{ code: 'reports:export', module: 'reports', ... }` → **75 permisos**.
- Arrays de asignación por rol: `ALL_PERMISSIONS` (SUPER_ADMIN y base),
  `INSTITUTION_ADMIN_PERMISSIONS` (ambos códigos),
  `TEACHER_PERMISSIONS` (ambos códigos — **corregido**: se había omitido en
  la primera pasada y el docente quedó sin permisos de reports),
  `PARENT_PERMISSIONS` y `STUDENT_PERMISSIONS` (solo `reports:read`).
- Ejecutado con `npx ts-node prisma/seed.ts` (el workaround de PowerShell;
  `npm run prisma:seed` sigue roto por quoting, ver sección 20).
- Verificado por script ad-hoc (fuera del repo): 75 permisos y 14 filas de
  `role_permission` con códigos de reports en los 5 roles globales y los 4
  roles del tenant demo.
- Los `communication` adjuntos quedaron en 2 (sin acumulación: el guard de
  seed existente evita duplicar).

## 16. Frontend — Tipos y constantes

- `apps/web/src/api/types.ts` (apéndice): `ReportStudent`, `ReportInstitution`,
  `ReportAcademicPeriod`, `ReportEnrollment`, `ReportGrade`, `ReportSubject`,
  `ReportAttendanceSummary`, `ReportObservador`, `StudentReport`,
  `ReportCourseStudent`, `CourseReportSummary`, `ReportCourse`, `CourseReport`.
- `apps/web/src/permissions/permission.constants.ts`:
  `REPORTS_READ = 'reports:read'`, `REPORTS_EXPORT = 'reports:export'`.
- `apps/web/src/api/client.ts`: nuevo `download(path, fallbackFilename)` —
  arma headers (`Authorization` + `X-Institution-Id` + `X-Request-Id`),
  hace `fetch` con `blob`, maneja 401 vía `onUnauthorized`, extrae el nombre
  real de `Content-Disposition` (regex `filename*=UTF-8''...` /
  `filename="..."`), dispara la descarga con un anchor y revoca el objeto URL.

## 17. Frontend — Hooks

`apps/web/src/modules/reports/hooks/`:

- `useReports.ts`: `useStudentReport(studentId?, period?)`,
  `useStudentBulletin(studentId?, period?)`, `useCourseReport(courseId?,
  period?)`; habilitados solo cuando hay id; keys
  `['student-report', id, period]`, `['student-bulletin', ...]`,
  `['course-report', ...]`; usan `placeholderData: keepPreviousData` para que
  el cambio de periodo no provoque parpadeo de carga.
- `useExportReport.ts`: `slugify`, `withFormat(period, format)` (corrige un
  bug de construcción de URL: `?academicPeriodId=X&format=csv`, no
  `?format=csv`), y los 4 helpers de descarga
  (`downloadStudentReportPdf/Csv`, `downloadBulletinPdf/Csv`) +
  `downloadCourseReportCsv`.

## 18. Frontend — Páginas

- `StudentReportView.tsx`: componente compartido (título, encabezado con
  botones PDF/CSV gated por `REPORTS_EXPORT`, tarjeta de matrícula, tabla
  académica por asignatura con notas y `simpleAverage`, tarjeta de asistencia
  y tarjeta de observador con badges de confidencialidad para admin/teacher).
- `ReportsPage.tsx` (`/reports`): selector de periodo (default ACTIVE),
  flujo padre (selector de hijos vía `useChildContext`) vs. flujo admin/
  teacher (buscador de estudiantes, `useStudents`), dos vistas (`Reporte
  académico` + `Boletín académico`), estados vacío/error/loading y descargas
  independientes por vista.
- `CourseReportPage.tsx` (`/reports/course`): selectores de curso y periodo,
  tarjetas resumen (total / con notas / con asistencia), tabla de estudiantes
  (grado, asignaturas, notas, promedio, asistencia `P/A/T`) y **Exportar CSV**
  en el encabezado gated por `REPORTS_EXPORT` + curso seleccionado; prefill
  vía `?courseId=&periodId=`.
- Estados vacío: `EmptyState` ("Selecciona un estudiante"/"Selecciona un
  curso"); errores: `ErrorState` con reintento.

## 19. Router y Navegación

- `apps/web/src/app/router.tsx`: `{ path: '/reports', element: <ReportsPage/> }`
  y `{ path: '/reports/course', element: <CourseReportPage/> }`.
- `apps/web/src/components/layout/Sidebar.tsx`: items "Reportes y boletín"
  (📄) y "Reporte de curso" (📈), ambos gated por `PERMISSIONS.REPORTS_READ`.

## 20. Pre-existing / Environment (NO relacionados con PROMPT 94)

Todo lo siguiente es **preexistente** y quedó documentado para el registro;
ninguno fue causado por PROMPT 94:

1. **Drift de migraciones**: `20260822100000_add_task_lifecycle_and_communication_recipients`
   modificada tras aplicarse; tabla `students` con columna `user_id` ausente
   del historial.
2. **`npm run prisma:seed` falla en PowerShell** (quoting JSON de
   `--compiler-options`); workaround `npx ts-node prisma/seed.ts`.
3. **E2E paralelos comparten base dev** y son frágiles (suites chocan por
   estado compartido). **Además**: `TenantContextGuard` exige
   `X-Institution-Id` en todo request autorizado — los e2e de PROMPT 94 lo
   envían en todos; el gate final se ejecuta completo bajo `--runInBand`
   (**29/29 suites, 660/660 PASS**).
4. **Acumulación de adjuntos** por `files.e2e-spec` (máx. 10 por
   comunicación); limpieza via clean-up script antes del gate (adjuntos en
   `Reunión de padres`: 2).
5. **Lint residual** (no toca archivos de PROMPT 94):
   - API: `seed.ts` (líneas 606/615/761/844/866 — `no-explicit-any`,
     `req`/`unused`; sin cambios respecto a HEAD a excepción de las filas
     `reports:*`), y los ya documentados en prompts previos
     (`academic-periods.service.spec.ts:25`, `grades.service.spec.ts:42`).
   - Web: los documentados en prompts previos
     (`administration-pages.test.tsx:201`, `AttendanceRegisterPage.tsx:58`,
     `ChildContext.tsx:81`, `useUpdateFollowUpEntry.test.tsx:2`).
6. **Limpieza durante el gate**: `clean-all-artifacts.cjs` (fuera del repo)
   para datos e2e residuales; también limpia audit_logs de exports
   (`REPORT_EXPORTED`/`BULLETIN_EXPORTED`) de las pruebas de reports.
7. **Nota PowerShell**: el output de node/jest/vitest llega como
   `node.exe : ...` en stderr (cosmético; no es un fallo).

## 21. Security Criteria / G11 / G12

- **G11 (RBAC)**: permisos por operación; matriz de la sección 7 verificada
  por e2e (padre 403 en los 3 exports; estudiante solo su propio reporte;
  docente sin permiso `reports:export` → 403).
- **G12 (BOLA/IDOR)**: cross-tenant → 404 en lectura y export; `X-Institution-Id`
  ausente → 403; no existen campos de autoridad editables por cliente.
- Auditoría: cada export registra `REPORT_EXPORTED`/`BULLETIN_EXPORTED`
  (entityType `ReportExport`). La lectura NO audita (operaciones de consulta
  de bajo volumen; ver sección 26 debrief).

## 22. Typescript / Build / Prisma

- `npx prisma validate` ✅, `npx prisma generate` ✅ (schema sin cambios).
- API `tsc --noEmit` (tsconfig + tsconfig.build) ✅.
- Web `tsc --noEmit` ✅.
- Build API: `npm run build` (`nest build`) ✅.
- Build Web: `npm run build` (`tsc --noEmit && vite build`) ✅ (warning de
  chunk > 500 kB preexistente).

## 23. API Contract (Swagger/OpenAPI)

- Endpoints bajo `@ApiTags('Reports')` (tag registrado en `main.ts`), con
  `@ApiOperation`, `@ApiParam`/`@ApiQuery` (incl. enum `format`),
  `@ApiResponse`.
- Prefijo global `api/v1`; `@agenda/api@1.0.1`.

## 24. Tests — Backend unit

- `reports.service.spec.ts`: consolidación de estudiante/boletín
  (matrícula, notas, asistencia, observador, confidencialidad), reporte de
  curso (resumen + filas + formato asistencia), normalización de periodos.
- `reports-authorization.spec.ts`: reglas por rol (student/own, parent/child,
  teacher/admin/inst), cross-tenant → 404, permisos.
- Total PROMPT 94: **33 unit tests**; API unit global **777/777** (42 suites)

## 25. Tests — Backend e2e (`reports.e2e-spec.ts`)

Fixtures **resueltas en runtime** sobre el seed (no asume ids): teacher →
assignment ACTIVE → enrollment ACTIVE (course+period); student vinculado por
`parent`; estudiante NO vinculado para 404; estudiante "live" creado para
`student@demo-school.dev` (documentNumber único) y borrado en `afterAll`.

Cobertura (18 casos): anónimos 401; RBAC (padre 403 en los 3 exports,
docente 200 PDF); reporte de estudiante (admin 200, docente 200, docente 404
para estudiante ajeno, padre 200 solo hijo, padre 404 hijo ajeno, estudiante
solo propio 200/404, periodo inexistente 404, cross-tenant 404); boletín
(admin 200, padre 200 con `byConfidentiality`); reporte de curso (admin 200
con `totalStudents > 0`, estudiante no matriculado 404); auditoría de exports
(`BULLETIN_EXPORTED` + `REPORT_EXPORTED` en audit log). `--runInBand` = 18/18.

## 26. PO Decisions (Frozen)

- «Reporte académico» ≠ «Boletín académico»: el boletín omite el desglose por
  confidencialidad del observador (apunte CONFIDENTIAL en boletín se agrupa
  como "total" sin detalle) — el boletín es la pieza compartible con la
  familia; el reporte es la vista completa del rol docente/admin.
- `simpleAverage` **descriptivo** (promedio de calificaciones registradas),
  no es nota oficial — la UI lo etiqueta y el backend lo entrega como
  `simpleAverage` (no `average`).
- Filtro por periodo opcional: sin `academicPeriodId` se consolida TODOS los
  periodos (default del front: periodo ACTIVE).
- CSV del curso como única exportación del curso (PDF course no agregado).
- Reutilizar `StudentFollowUpAuthorizationService` para confidencialidad
  (criterio único, sin duplicación).
- `placeholderData: keepPreviousData` en los hooks de reportes para evitar
  parpadeo al cambiar periodo.

## 27. Regression (gate completo — verde)

| Gate | Resultado |
|---|---|
| Prisma validate + generate | ✅ (sin cambios de schema) |
| API tsc (tsconfig + build) | ✅ |
| Web tsc | ✅ |
| API unit (`npx jest --runInBand --forceExit`) | **777/777** (42 suites) |
| API e2e (todos, `--runInBand`) | **29/29** suites, **660/660** |
| API e2e (`reports`) | **18/18** |
| Web vitest (completo) | **512/512** (63 archivos) |
| Web vitest (`modules/reports`) | **17/17** (3 corridas: estable) |
| Build API / Web | ✅ / ✅ |
| Lint archivos PROMPT 94 | ✅ (reports api + módulos web + touched) |

Hallazgo intermedio del gate: los 3 primeros fallos de vitest web eran
**flakiness por parpadeo/duplicados de texto** (`Matemáticas` aparece en las
dos tarjetas → `getByText` lanza "multiple elements"), resueltos
haciendo las aserciones `getAllByText(...).length > 0` y esperando el
contenido ya cargado dentro de `waitFor`, más `keepPreviousData` en los hooks.

## 28. Files (PROMPT 94)

- API nuevos: `apps/api/src/modules/reports/reports.module.ts`,
  `reports.controller.ts`, `reports.service.ts`,
  `reports-authorization.service.ts`, `report-pdf.ts`, `report-csv.ts`,
  `dto/reports-query.dto.ts`, `dto/reports-response.dto.ts`,
  `test/reports.e2e-spec.ts`.
- API modificados: `apps/api/src/app.module.ts`, `apps/api/prisma/seed.ts`,
  `apps/api/src/modules/student-follow-ups/student-follow-ups.module.ts`
  (re-exports `StudentFollowUpAuthorizationService`).
- Web nuevos: `apps/web/src/modules/reports/` (`pages/ReportsPage.tsx`,
  `pages/CourseReportPage.tsx`, `pages/StudentReportView.tsx`,
  `hooks/useReports.ts`, `hooks/useExportReport.ts`, `index.ts`,
  `__tests__/reports-hooks.test.tsx`, `__tests__/reports-pages.test.tsx`).
- Web modificados: `src/api/types.ts`, `src/api/client.ts`,
  `src/permissions/permission.constants.ts`, `src/app/router.tsx`,
  `src/components/layout/Sidebar.tsx`.
- Dependencias: `pdfkit` + `@types/pdfkit` (dev) en `apps/api/package.json`.

## 29. Git Status (working tree)

- Rama `main`; sin commits/pushes/tags en esta sesión.
- Cambios de PROMPT 94 conviven con el working tree sucio heredado (70–93).
- `git status --porcelain` / `git diff apps/api/prisma/seed.ts` verificados:
  el diff de seed solo añade filas `reports:*`.

## 35. Final Report Summary

PROMPT 94 queda **IMPLEMENTED**. Se entregó el módulo de Reportes, Boletín y
Exportación (PDF/CSV) con consolidación académica reutilizando datos
existentes, reglas de confidencialidad del observador unificadas con el
módulo de seguimiento, RBAC `reports:read`/`reports:export`, aislamiento de
tenant (BOLA/IDOR-safe), auditoría de exportaciones, seed corregido (75
permisos) y el frontend completo (2 páginas + hooks + descargas + nav gated).
El gate de regresión completo quedó en verde: API unit 777/777, API e2e
29/29 suites, Web vitest 512/512, tsc limpio y builds OK; el lint de los
archivos nuevos es limpio (los errores restantes son preexistentes). Los
hallazgos del gate fueron flakiness de pruebas resuelta (optimización) y
error de permisos de docente detectado por verificación seed (corregido).
Sin commit/push/tag, según las instrucciones.