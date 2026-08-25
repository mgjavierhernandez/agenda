# 13. Módulo de Firmas (Signatures)

## Resumen

El módulo de firmas permite crear solicitudes de firma digital con seguimiento de estado por destinatario. Cada solicitud tiene un ciclo de vida: DRAFT → PUBLISHED → COMPLETED/EXPIRED/INACTIVE, con verificación automática de vencimiento y finalización.

## Entidades del Schema

### SignatureRequest (Tenant-scoped)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| institutionId | UUID FK | Institución propietaria |
| title | VARCHAR(200) | Título de la solicitud |
| description | TEXT | Descripción (opcional) |
| status | SignatureRequestStatus | DRAFT, PUBLISHED, COMPLETED, EXPIRED, INACTIVE |
| dueDate | DateTime | Fecha límite (opcional) |
| createdAt/updatedAt | DateTime | Timestamps |

### SignatureRecipient (Links users to requests)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| signatureRequestId | UUID FK | Solicitud asociada |
| userId | UUID FK | Destinatario |
| status | SignatureRecipientStatus | PENDING, SIGNED, DECLINED |
| signedAt | DateTime | Momento de la firma (opcional) |

**Constraints:**
- `@@unique([signatureRequestId, userId])` — un usuario no puede firmar/declinar dos veces
- `onDelete: Restrict` en ambas relaciones FK

## Enumeraciones

```prisma
enum SignatureRequestStatus {
  DRAFT       # Borrador, solo visible para managers
  PUBLISHED   # Publicado, visible para destinatarios
  COMPLETED   # Todos los destinatarios han firmado
  EXPIRED     # Vencido (auto-detectado)
  INACTIVE    # Desactivado por un manager
}

enum SignatureRecipientStatus {
  PENDING    # Esperando firma
  SIGNED     # Firmado
  DECLINED   # Rechazado
}
```

## Endpoints

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | /signature-requests | signatures:request | Crear solicitud con destinatarios |
| GET | /signature-requests | signatures:read | Listar solicitudes (paginado) |
| GET | /signature-requests/:id | signatures:read | Obtener solicitud por ID |
| PATCH | /signature-requests/:id | signatures:request | Actualizar solicitud (solo DRAFT) |
| PATCH | /signature-requests/:id/publish | signatures:request | Publicar solicitud (DRAFT→PUBLISHED) |
| PATCH | /signature-requests/:id/sign | signatures:sign | Firmar solicitud (PENDING→SIGNED) |
| PATCH | /signature-requests/:id/decline | signatures:sign | Rechazar solicitud (PENDING→DECLINED) |
| PATCH | /signature-requests/:id/deactivate | signatures:request | Desactivar solicitud |

## RBAC

| Rol | Permisos |
|-----|----------|
| SUPER_ADMIN | signatures:read, signatures:request, signatures:sign, signatures:manage |
| INSTITUTION_ADMIN | signatures:read, signatures:request, signatures:sign, signatures:manage |
| TEACHER | signatures:read |
| PARENT | signatures:read, signatures:sign |
| STUDENT | (sin permisos de firma) |

**Diseño de autorización:**
- `signatures:request` — CRUD de solicitudes (admin/manager)
- `signatures:sign` — Firmar/rechazar como destinatario (padres/estudiantes)
- `signatures:read` — Ver solicitudes

## Flujo de ciclo de vida

1. Admin crea solicitud en DRAFT con `recipientUserIds[]`
2. Admin puede actualizar título, descripción, fecha límite, destinatarios (solo DRAFT)
3. Admin publica (DRAFT → PUBLISHED) — requiere destinatarios y fecha futura
4. Cada destinatario firma o rechaza individualmente
5. Cuando todos firman → COMPLETED automáticamente
6. Si `dueDate` pasa → EXPIRED automáticamente (lazy check)
7. Admin puede desactivar (→ INACTIVE)

## Visibilidad por rol

- **Managers** (con `signatures:request`): ven todas las solicitudes de su institución
- **Destinatarios** (sin `signatures:request`): solo ven solicitudes PUBLISHED/COMPLETED/EXPIRED donde son destinatarios

## Seguridad IDOR/BOLA

- `institutionId` siempre de `req.tenant`, nunca de body/params
- `req.user.userId` es la ÚNICA fuente de identidad del firmante
- Todas las queries incluyen `institutionId` del tenant
- Cross-tenant: solicitudes de otra institución retornan 404
- Destinatarios no pueden ver solicitudes DRAFT/INACTIVE de otros

## Datos de seed

- 35 permisos (incluye `signatures:manage`)
- 2 solicitudes demo: "Autorización de excursión escolar" (PUBLISHED), "Acuerdo de confidencialidad docente" (DRAFT)
- 4 registros de destinatarios vinculados a teacher y parent

## Archivos creados/modificados

**Nuevos:**
- `src/modules/signatures/signatures.service.ts`
- `src/modules/signatures/signatures.service.spec.ts` (26 tests unitarios)
- `src/modules/signatures/signatures.controller.ts`
- `src/modules/signatures/signatures.module.ts`
- `src/modules/signatures/dto/create-signature-request.dto.ts`
- `src/modules/signatures/dto/update-signature-request.dto.ts`
- `src/modules/signatures/dto/list-signature-requests-query.dto.ts`
- `test/signatures.e2e-spec.ts` (29 tests E2E)

**Modificados:**
- `prisma/schema.prisma` — Enums + modelos SignatureRequest/SignatureRecipient
- `prisma/seed.ts` — `signatures:manage` permiso, asignaciones de roles, datos demo
- `src/app.module.ts` — Importación de SignaturesModule

## Migración

- `20260821214452_add_signatures_module` — Tablas `signature_requests` y `signature_recipients` con índices

## Estadísticas de tests

| Tipo | Suites | Tests | Estado |
|------|--------|-------|--------|
| Unitarios | 15 | 226 | ✅ Todos pasan |
| E2E | 11 de 12 | 296 de 299 | ✅ Signatures: 29/29 |
| **Total** | **26** | **522** | **✅ 0 fallos nuevos** |

> Los 3 fallos de schedules son pre-existentes (issue de validación de horarios en el seed, no relacionado con firmas).
