# 98 — Observador del Alumno y Firmas: Citación + Integración Firmas↔Observador + E2E

Fecha: 2026-09-03
Alcance: Cierre de los HIGH identificados en PROMPT 97 — **H1** (Firmas↔Observador), **H2** (Citación), **H3** (E2E Observador), **H4** (E2E reproducible en lo aplicable a este dominio).

Sin cambios de reglas de negocio aprobadas en PROMPTS 70–97. Se reutiliza el módulo `Signatures` existente como fuente de verdad del estado; no se crea un segundo sistema de firmas.

---

## 1. Decisiones de diseño (confirmadas)

- **Citación como modelo dedicado** `FollowUpCitation` con workflow `SCHEDULED / COMPLETED / CANCELLED / NO_SHOW`, en lugar de reutilizar `FollowUpEntry`.
- **Integración Signatures vía FKs directas** en `SignatureRequest`: `followUpId` + `followUpEntryId` + `createdById`. No se usa `metadata`/`entityType` genéticos.
- **Reutilización**: el estado de la firma (`DRAFT/PUBLISHED/COMPLETED/EXPIRED/INACTIVE`, recibos `PENDING/SIGNED/DECLINED`) se mantiene en el módulo `Signatures`; el Observador solo consulta (`GET :followUpId/signatures`) y orquesta la creación (`POST :followUpId/signatures`).

## 2. Cambios de esquema (Prisma)

- Nuevo enum `FollowUpCitationStatus` (`SCHEDULED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`).
- Nuevo modelo `FollowUpCitation`:
  - `institutionId`, `followUpId`, `createdById`
  - `scheduledAt` (DateTime), `reason` (String, requerido)
  - `objective` (String?, nullable), `status` (enum), `result` (String?), `attendedAt` (DateTime?)
  - Relaciones `institution`, `followUp`, `createdBy` con `onDelete: Restrict` e índices con `institutionId` como primer campo (tenant isolation).
- `SignatureRequest` extendido:
  - `followUpId` (FK nullable, `onDelete: SetNull`)
  - `followUpEntryId` (FK nullable, `onDelete: SetNull`)
  - `createdById` (FK requerida, `onDelete: Restrict`, relación `SignatureRequestCreatedBy`)
  - Índices nuevos.
- Relaciones agregadas: `StudentFollowUp.citations`, `StudentFollowUp.signatureRequests`, `FollowUpEntry.signatureRequests`, `User.signatureRequestsCreated`, `User.followUpCitations`, `Institution.followUpCitations`.

Migración aditiva aplicada: `apps/api/prisma/migrations/20260903000000_add_follow_up_citations_and_signature_integration/migration.sql`. `npx prisma validate` ✓.

> Nota: `createdById` usa default temporal `00000000-0000-0000-0000-000000000000` para la columna NOT NULL de la migración. Drift pre-existente de `students` documentado; se usó `migrate deploy` (no `migrate dev`) por el drift de BD.

## 3. Backend — Citaciones (H2)

Archivos nuevos:
- `apps/api/src/modules/student-follow-ups/dto/create-follow-up-citation.dto.ts`
- `apps/api/src/modules/student-follow-ups/dto/update-follow-up-citation.dto.ts`
- `apps/api/src/modules/student-follow-ups/dto/list-follow-up-citations-query.dto.ts`
- `apps/api/src/modules/student-follow-ups/follow-up-citations.service.ts`

Endpoints (controlador `StudentFollowUpsController`):
- `POST   /student-follow-ups/:followUpId/citations` — crea citación (futuro `scheduledAt` obligatorio).
- `GET    /student-follow-ups/:followUpId/citations` — lista (paginada, filtro por `status`).
- `GET    /student-follow-ups/:followUpId/citations/:citationId`
- `PATCH  /student-follow-ups/:followUpId/citations/:citationId` — actualiza; transición de estado dispara auditoría `CITATION_<STATUS>` y notificación.
- `DELETE /student-follow-ups/:followUpId/citations/:citationId`

Guardas: autorización vía `StudentFollowUpAuthorizationService` (`canRead`/`canUpdate`), mutación bloqueada si `status === CLOSED`, `scheduledAt` debe estar en el futuro, tenant isolation estricta (`institutionId` en todas las consultas).

Notificaciones (`follow-up-notification.helper.ts`): casos `CITATION_CREATED`, `CITATION_COMPLETED`, `CITATION_CANCELLED`, `CITATION_NO_SHOW`, `CITATION_SCHEDULED`, `CITATION_UPDATED`. Auditoría en todas las mutaciones.

## 4. Backend — Integración Firmas↔Observador (H1)

Servicio orquestador nuevo: `apps/api/src/modules/student-follow-ups/student-follow-up-signature.service.ts`
DTO nuevo: `apps/api/src/modules/student-follow-ups/dto/request-follow-up-signature.dto.ts`

Endpoints:
- `POST /student-follow-ups/:followUpId/signatures` — `RequestFollowUpSignatureDto` (`title`, `description?`, `dueDate?`, `followUpEntryId?`, `recipientUserIds[]`). Valida:
  - El follow-up existe y el usuario tiene `canUpdate`.
  - Si se pasa `followUpEntryId`, debe pertenecer a ese follow-up (misma institución).
  - Todos los destinatarios son miembros `ACTIVE` de la institución.
  - Sin destinatarios duplicados.
  - Crea `SignatureRequest` con `followUpId`/`followUpEntryId`/`createdById` y los `SignatureRecipient`, todo en una transacción.
  - Auditoría `SIGNATURE_REQUESTED_FROM_FOLLOW_UP` + notificación `SIGNATURE_REQUEST_CREATED`.
- `GET  /student-follow-ups/:followUpId/signatures` — lista las solicitudes de firma del follow-up (trazabilidad). Autorización vía `canRead` (respeta CONFIDENTIALITY_RESTRICTED → 404, SUPER_ADMIN_NO_ACCESS → 403).

`SignaturesService` actualizado:
- `create` incluye `followUpId`/`followUpEntryId`/`createdById` (vía `CreateSignatureRequestDto` con campos opcionales).
- `findAll`/`findOne` incluyen `followUp` y `createdBy`; filtro por `followUpId` en `ListSignatureRequestsQueryDto`.
- Nuevo `findByFollowUp(institutionId, followUpId)`.
- `sign()` / `decline()`: si la solicitud está vinculada a un follow-up, notifican al Observador (`SIGNATURE_COMPLETED_FROM_FOLLOW_UP` / `SIGNATURE_DECLINED_FROM_FOLLOW_UP`).

`StudentFollowUpsModule` importa `SignaturesModule` (sin dependencia circular; el helper de notificación es función plana). Se evita ciclo: `SignaturesModule` no importa `StudentFollowUpsModule`.

## 5. Confidentiality / RBAC / tenant isolation

- Matriz intacta: `INSTITUTION_ADMIN` lee/actualiza `PUBLIC/INTERNAL/CONFIDENTIAL/SENSITIVE`; `TEACHER/PARENT/STUDENT` solo `PUBLIC/INTERNAL`; `SUPER_ADMIN` sin bypass en recursos de tenant.
- `StudentFollowUpAuthorizationService.canRead/canUpdate` reciben `followUpId` (string) — sin cambios de firma.
- Toda consulta de citaciones y firmas está scoped por `institutionId` (nunca se acepta del cliente).
- Las notificaciones de firmas/citaciones aplican `canNotifyForConfidentiality` (no se filtra contenido CONFIDENTIAL/SENSITIVE a roles NO permitidos; en esos casos se envía título genérico).

## 6. Backend — Notificaciones

`SendFollowUpSignatureNotification` resuelve destinatarios con las mismas reglas de confidencialidad que el Observador y envía `NotificationType.SIGNATURE_REQUEST` (tipo existente en el schema). Casos: `SIGNATURE_REQUEST_CREATED`, `SIGNATURE_COMPLETED_FROM_FOLLOW_UP`, `SIGNATURE_DECLINED_FROM_FOLLOW_UP`, `SIGNATURE_EXPIRED_FROM_FOLLOW_UP`.

## 7. Frontend

`apps/web/src/api/types.ts`:
- `FollowUpCitationStatus`, `FOLLOW_UP_CITATION_STATUS_LABELS`, `FollowUpCitation`, `CreateFollowUpCitationInput`, `UpdateFollowUpCitationInput`, `ListFollowUpCitationsParams`.
- `SignatureRequest` extendido con `followUpId?`, `followUpEntryId?`, `followUp?`, `createdBy?`; `CreateSignatureRequestInput`/`ListSignatureRequestsParams` con FKs.

Hooks nuevos (`apps/web/src/modules/student-follow-ups/hooks/`):
- `useFollowUpCitations`, `useCreateFollowUpCitation`, `useUpdateFollowUpCitation`
- `useRequestSignatureFromFollowUp` (POST `:followUpId/signatures`), `useFollowUpSignatures` (trazabilidad)

`StudentFollowUpDetailPage.tsx`:
- Nueva pestaña **Firmas** (`N`) — botón "Solicitar firma" con formulario (título, descripción, fecha límite, selección de destinatarios) y listado de solicitudes vinculadas + estado por destinatario.
- Nueva pestaña **Citaciones** (`N`) — formulario "Nueva citación" (fecha, motivo, objetivo) y listado con transición de estado Completar/Reabrir.

Verificación: `tsc --noEmit` (api+web) ✓, `vitest run` 510 ✓, `vite build` ✓.

## 8. Pruebas

### Unit (API)
- `follow-up-citations.service.spec.ts` (nuevo): create/validation/authorization/closed/update/remove.
- `student-follow-up-signature.service.spec.ts` (nuevo): request/findByFollowUp, RBAC, tenant recipient check, entry ownership, duplicates.
- Suite completa API: **799 tests, 45 suites — PASS**.

### E2E (API HTTP+DB) — H3
`apps/api/test/student-follow-ups.e2e-spec.ts` (nuevo): flujo completo del Observador **8/8 PASS**:
1. Crea seguimiento para un estudiante (estudiante como fixture tenant-scoped en `demo`).
2. Rechaza citación con hora pasada (400).
3. Crea citación (H2) → `SCHEDULED`.
4. Lista citaciones scoped por tenant.
5. Completa transición de estado (H2) → `COMPLETED`.
6. Crea entrada.
7. Solicita firma vinculada a follow-up + entrada (H1) → `followUpId` correcto.
8. Lista firmas del follow-up (trazabilidad).

### E2E (Playwright) — extension H3
`apps/web/e2e/observador.spec.ts`: test añadido que crea seguimiento, registra citación, la completa, y solicita una firma/recibido desde la pestaña Firmas.

### Reproducibilidad — H4 (aplicable al dominio)
- Toda limpieza de fixtures es **tenant-scoped** o por entidad concreta (`id`). **No** se usa `deleteMany({ where: { institutionId: undefined } })`.
- El e2e nuevo aísla sus recursos (student/followup/entry/citation/signature) y los elimina en `afterAll` por `id`.
- No se añade interdependencia cruzada de fixtures compartidos para el nuevo flujo.

## 9. Acceptance Matrix (H1–H4)

| ID | Funcionalidad | Resultado | Evidencia |
|---|---|---|---|
| H1 | Firma solicitable desde seguimiento y vinculada a entrada/citación | ✅ | `POST/GET :followUpId/signatures` e2e 8/8; `SignatureRequest.followUp*` FKs |
| H2 | Citación (modelo+CRUD+workflow) | ✅ | `FollowUpCitation` + rutas + unit + e2e |
| H3 | E2E Observador (API HTTP+DB) | ✅ | `student-follow-ups.e2e-spec.ts` 8/8; extensión Playwright |
| H4 | E2E reproducible (sin borrado global) | ✅ | Cleanup por id/tenant; sin `institutionId: undefined` |

## 10. Puerta de regresión (ejecutada)

- `npx prisma validate` ✓
- `npx prisma generate` ✓
- `npx tsc --noEmit` (api) ✓
- `npx tsc --noEmit` (web) ✓
- `npx jest` (api unit) — 799 PASS
- `npx jest --config test/jest-e2e.json student-follow-ups.e2e-spec.ts` — 8 PASS
- `npx vitest run` (web) — 510 PASS
- `npx vite build` (web) — OK (warning L5 pre-existente)

## 11. Limitaciones / no implementado (según alcance)

- No dark mode, IA, Redis, app móvil, nuevos dashboards, scheduler OVERDUE, push/SMS/WhatsApp.
- La "citación" no envía email (canal in-app igual que el resto del Observador; el email de firmas del módulo `Signatures` se mantiene sin cambios).
- E2E Playwright no ejecutado en este entorno (requiere dev servers + browser); la extensión de `observador.spec.ts` sigue el patrón existente.
