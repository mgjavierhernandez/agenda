# PROMPT 96 — Role Dashboards + Real Email (SMTP)

## 1. Objetivo
Implementar:
- **Dashboards por rol** (`ADMIN`/`INSTITUTION_ADMIN`, `TEACHER`, `PARENT`, `STUDENT`; conservando `SUPER_ADMIN`) a través de un endpoint único `GET /api/v1/dashboard` que adapta su contenido al rol resuelto del usuario autenticado.
- **Envío de email real (SMTP vía nodemailer)** reutilizando la infraestructura de email existente en `apps/api/src/modules/auth/services/email/`, conectada a:
  - **Communications**: al publicar un comunicado se envían emails a los destinatarios.
  - **Signatures**: al publicar una plantilla de firma se crean notificaciones in-app (tipo `SIGNATURE_REQUEST`) y se envían emails a los firmantes.

Se respetan las restricciones del prompt: sin nuevos módulos fuera de alcance, **0 migraciones**, sin segundo sistema de notificaciones/auditoría/RBAC/tenancy, sin Redis/colas (fire-and-forget asíncrono), sin commits/push/tags, sin rediseño frontal total.

## 2. Límites y restricciones aplicadas
- No se modificó el esquema de Prisma (0 migraciones).
- Reutilización de `NotificationsService.create` (validación de membresía + auditoría) para las notificaciones de firma.
- Reutilización de `AuthorizationService.getUserRoles` para la resolución de roles del dashboard.
- Fire-and-forget asíncrono para correos (no bloquean la transacción del negocio; errores sanitizados y capturados).
- No hay credenciales SMTP en CI (solo variables de entorno en `.env.example` / entorno real).

## 3. Arquitectura de email
- `EmailProvider` (interfaz) expone 3 métodos: `sendPasswordReset`, `sendCommunication`, `sendSignatureRequest`.
- `EMAIL_PROVIDER` es un token de inyección exportado desde `AuthModule`.
- Factory en `AuthModule`: si `SMTP_HOST` está definido → `SmtpEmailProvider`; si no → `DevEmailProvider` (solo log).
- `EmailTemplates` (inyectable, exportado desde `AuthModule`) recibe `ConfigService` y lee `APP_WEB_URL` para generar asunto/texto/HTML con escape de HTML.
- Config: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `SMTP_FROM`, `APP_WEB_URL`.

Archivos:
- `email-provider.interface.ts` — tipos de datos por email + interfaz + token `EMAIL_PROVIDER`.
- `email-templates.ts` — plantillas en español (reset/comm/signature), escape HTML.
- `dev-email.provider.ts` — proveedor de desarrollo (log).
- `smtp-email.provider.ts` — proveedor real (nodemailer `createTransport`, errores sanitizados).
- `index.ts` — re-exporta tipos/proveedores/plantillas.
- `auth.module.ts` — factory + exports `EMAIL_PROVIDER` y `EmailTemplates`.

## 4. Configuración SMTP (env)
`apps/api/.env.example`:
```
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_SECURE=false
SMTP_FROM="Agenda Escolar <no-reply@example.com>"
APP_WEB_URL=https://agenda.example.com
```
Seguridad: no se logean contraseñas; los errores SMTP se sanitizan; el fallo de envío nunca revierte la operación de negocio ni rompe la petición (siempre `try/catch` + fire-and-forget).

## 5. Plantillas de email
- `sendPasswordReset` — enlace `/reset-password?token=...` y minutos de expiración (reutiliza flujo de password-recovery).
- `sendCommunication` — título, contenido, remitente.
- `sendSignatureRequest` — título, descripción, fecha límite, nombre de institución.
- Todas en español (idioma del producto), con `text/plain` y `text/html`, y escape de HTML para evitar inyección.

## 6. Communications → email
En `CommunicationsService.publish()` se invoca (fire-and-forget) `sendCommunicationEmails(...)`:
- Destinatarios vía `communicationRecipient` (userId + email capturado).
- Se excluye al publicador (`publisherId`).
- Deduplicación por email.
- Cada envío con `try/catch`; errores sanitizados; no se propaga ni revierte.
- La entrega real depende del proveedor (Dev vs SMTP).

## 7. Signatures → notificación in-app + email
En `SignaturesService.publish()` se invoca (fire-and-forget) `notifySigners(...)`:
- Por cada firmante (signatureRecipient) se crea una notificación in-app con `NotificationsService.create` y tipo `SIGNATURE_REQUEST` (validación + auditoría).
- Se envía email `sendSignatureRequest` con nombre de institución.
- `try/catch` por firmante; errores no bloquean el publish.

`SignaturesModule` ahora importa `NotificationsModule`.

## 8. Dashboard — resolución de roles
- Nuevo `DashboardModule` con `GET /api/v1/dashboard`.
- Guards: `AccessTokenGuard` + `TenantContextGuard` (NO `PermissionGuard` — es context-role).
- Rol resuelto con `AuthorizationService.getUserRoles` + chequeo global `SUPER_ADMIN`.
- `SUPER_ADMIN` se trata como `INSTITUTION_ADMIN` para el dashboard.
- `SUPER_ADMIN` está exento en `TenantContextGuard` con auto-membresía.

## 9. Dashboard — fuentes y alcance por rol
- `INSTITUTION_ADMIN`/`SUPER_ADMIN`: stats institucionales (estudiantes, docentes, cursos, matrículas, seguimientos), notificaciones, próximos eventos, comunicados recientes, firmas pendientes, follow-ups completos (incluye CONFIDENTIAL/SENSITIVE) vía `StudentFollowUpAuthorizationService.buildListFilter`, compromisos pendientes.
- `TEACHER`: `courses`/`subjects` asignados + stats.
- `PARENT`: `children` (hijos).
- `STUDENT`: `courses` (inscritos) + stats (degrada a vacío si no hay Student vinculado).
- Notificaciones, eventos, comunicados y firmas pendientes se filtran por audiencia/rol (eventos y comunicados), y por membresía (`recentNotifications`).
- Los follow-ups para no-admins usan `buildListFilter` → solo PUBLIC/INTERNAL (oculta CONFIDENTIAL/SENSITIVE).

## 10. Dashboard — Correcciones SSOT aplicadas
- `Commitment` no tiene `institutionId` → se vincula vía `followUp: { institutionId }`.
- `Prisma.count()` no soporta `distinct` → el conteo de estudiantes de docentes usa `enrollment.findMany({ distinct: ['studentId'], select })` + `.length`.
- `buildListFilter` no tiene tipo de retorno explícito → cast a `Prisma.StudentFollowUpWhereInput`.
- `PrismaModule` es `@Global()` → `PrismaService` inyectable en `DashboardModule` sin proveedor extra.
- `DashboardModule` importa `AuthModule` y `StudentFollowUpsModule`.

## 11. Dashboard — Frontend
- `apps/web/src/modules/dashboard/hooks/useRoleDashboard.ts` (nuevo) + export en `hooks/index.ts`.
- `apps/web/src/pages/DashboardPage.tsx` reescrito: render por rol, grid de stats, secciones, "Accesos rápidos" (links condicionados por permiso), estados de loading/error/vacío ("No hay información disponible todavía.").
- Los hooks antiguos (`useDashboardStats`, etc.) se conservan y siguen exportados/no eliminados.

## 12. Seguridad del dashboard
- Cada consulta está acotada por `institutionId` del tenant (aislamiento multi-tenant).
- Los datos sensibles (confidencialidad de follow-ups) se ocultan a roles no administradores.
- Se verifica membresía activa antes de responder.
- Sin credenciales/sensible en la salida.

## 13. Envío de email — seguridad
- Sin secretos en CI; `.env.example` con placeholders.
- Errores sanitizados; nada de contraseñas o tokens en logs.
- Fire-and-forget: un fallo de SMTP no bloquea/revierte la operación.
- `EMAIL_PROVIDER` Dev en ausencia de `SMTP_HOST`.

## 14. Pruebas — email templates (unit)
- `email-templates.spec.ts`: genera reset/comm/signature con enlaces de `APP_WEB_URL`, expiración, escape de HTML. **5/5 PASS.**

## 15. Pruebas — dashboard (e2e)
- `test/dashboard.e2e-spec.ts` (setup inline, no reutiliza `test-utils.ts` cuyo import está roto porque `jest-e2e.json` tiene `rootDir: "."`).
- Casos: admin institucional, teacher (courses), parent (children), student, aislamiento second-institution, cross-tenant denegado, sin header de tenant → 401/403, sin auth → 401. **8/8 PASS.**

## 16. Pruebas — Frontend (vitest)
- `dashboard-page.test.tsx` (reescrito): admin/teacher/parent/student, loading, error, vacío, quick-links con permisos. **PASS.**
- `use-role-dashboard.test.tsx` (nuevo): fetch cuando enabled, no fetch cuando disabled. **PASS.**
- Suite web completa: **510/510 PASS.**

## 17. CI
- No se añadieron credenciales SMTP al CI.
- No se introducen pasos que dependan de SMTP real (los tests usan DevEmailProvider).

## 18. Variables de entorno nuevas
Ver sección 4. Ninguna se revela por defecto.

## 19. Compuerta de regresión (resultados)
- API e2e: **668/668 PASS** (660 baseline + 8 dashboard).
- API unit: **782/782 PASS** (777 baseline + 5 email templates).
- Web vitest: **510/510 PASS**.
- API typecheck: PASS.
- Web typecheck: PASS.
- Web build (`tsc --noEmit && vite build`): PASS.
- Lint (archivos nuevos TS/TSX): PASS.

## 20. Fijado de un bug de datos encontrado en e2e
Durante la iteración de los tests e2e del dashboard se detectó que `afterAll` ejecutaba `cleanupSecondInstitution` con un `institutionId` indefinido cuando `beforeAll` fallaba a mitad, y `deleteMany({ where: { institutionId: undefined } })` en Prisma borraba **todas** las filas (membresías y roles de todas las instituciones, incluido demo). Se añadió una guarda `if (!institutionId) return;` en el cleanup y se re-sembró el seed de demo. Documentado como hallazgo.

## 21. Deuda técnica / hallazgos
- El proveedor SMTP requiere configuración real de credenciales para envío en producción (fuera de alcance para el entorno local/CI con DevEmailProvider).
- `Prisma.count()` sin `distinct` limita algunos agregados (se resolvió con `findMany().length`).
- El dashboard del rol `STUDENT` depende de que exista un `Student` vinculado al usuario (el seed demo no lo vincula, por lo que devuelve stats vacías de forma controlada).
- Quedan hooks antiguos del dashboard exportados (compatibilidad).

## 22. Acceptance — Communications
- Publicar un comunicado no falla si el email falla; se envían emails a destinatarios (Dev→log en local, SMTP→real).
- Se excluye al publicador y se deduplican emails.

## 23. Acceptance — Signatures
- Publicar una plantilla crea notificación `SIGNATURE_REQUEST` por firmante y email.
- No falla si la entrega de email falla.

## 24. Acceptance — Dashboard por rol
- `INSTITUTION_ADMIN` ve datos institucionales + follow-ups completos.
- `TEACHER` ve sus cursos/asignaturas.
- `PARENT` ve sus hijos.
- `STUDENT` ve sus cursos/inscripciones.
- `SUPER_ADMIN` tratado como `INSTITUTION_ADMIN`.
- Aislamiento multi-tenant verificado (cross-tenant → 403).

## 25. Seguridad multi-tenant del dashboard (IDOR)
Prueba e2e explícita: un estudiante demo no puede leer el dashboard del second-institution. PASS.

## 26. Sin esquema nuevo
No se ejecutó ninguna migración; se usan tablas/columnas existentes (`NOTIFICATION_TYPE`, `AuditLog`, etc.).

## 27. Estado del repo
Sin commits, sin push, sin tags. Branch `main`, baseline protegida `v1.0.2-rc.1` / `e7dca4a`.

## 28. Veredicto
PROMPT 96 implementado y validado. Compuerta de regresión completa en verde.

---

## FINAL REPORT — PROMPT 96 — ROLE DASHBOARDS + REAL EMAIL IMPLEMENTED — COMPLETE

**Estado:** COMPLETO · Sin commits/push/tags · Branch `main` · 0 migraciones · 0 módulos nuevos fuera de alcance

### Lo implementado
1. **Email real (SMTP/nodemailer)** reutilizando `apps/api/src/modules/auth/services/email/`:
   - `EmailProvider` (interfaz) + `EMAIL_PROVIDER` token + `EmailTemplates` exportados desde `AuthModule`.
   - `SmtpEmailProvider` (nodemailer) y `DevEmailProvider`; factory por `SMTP_HOST`.
   - Plantillas en español (password reset / communication / signature request) con `APP_WEB_URL` y escape de HTML.
   - Config SMTP documentada en `.env.example`. Sin credenciales en CI.
2. **Communications → email**: `publish()` dispara (fire-and-forget) correos a destinatarios (excluye publicador, deduplica).
3. **Signatures → notificación in-app + email**: `publish()` crea notificación `SIGNATURE_REQUEST` por firmante (vía `NotificationsService`) + email; `SignaturesModule` importa `NotificationsModule`.
4. **Dashboards por rol** (`GET /api/v1/dashboard`, `DashboardModule`):
   - Guards `AccessTokenGuard` + `TenantContextGuard` (no PermissionGuard).
   - Roles: `INSTITUTION_ADMIN`/`SUPER_ADMIN`, `TEACHER`, `PARENT`, `STUDENT`; `SUPER_ADMIN` como `INSTITUTION_ADMIN` y exento en tenancy.
   - Follow-ups vía `buildListFilter` (admins ven todo; otros solo PUBLIC/INTERNAL).
   - Frontend: `useRoleDashboard` + `DashboardPage.tsx` reescrito con estados loading/error/vacío y "Accesos rápidos".

### Validación (todo en verde)
- API e2e: **668/668** (8 dashboard).
- API unit: **782/782** (5 email templates).
- Web vitest: **510/510**.
- API typecheck / Web typecheck / Web build / Lint: PASS.

### Hallazgos corregidos
- Bug de datos en e2e: `deleteMany` con `institutionId` indefinido borraba todas las membresías → guarda `if (!institutionId) return;` en el cleanup y re-seed de demo.
- Colisiones de texto en tests web por los quick-links (Estudiantes/Matrículas) → asserts por rol/link.
- Ajuste de tipo `ConfigService` en el spec de templates (sin `any`).
