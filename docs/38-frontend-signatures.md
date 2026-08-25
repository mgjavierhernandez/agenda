# PROMPT 38 - Firmas Digitales (Frontend)

## Executive Summary

Implementación completa del módulo frontend de **Signatures** (Solicitudes de Firma Digital) para Agenda Escolar Digital. El módulo permite gestionar solicitudes de firma con ciclo de vida completo: DRAFT → PUBLISHED → COMPLETED/EXPIRED → INACTIVE, con soporte para múltiples firmantes y operaciones de firmar/rechazar.

## Backend Contract Verified

### Prisma Models

**SignatureRequest** (`signature_requests`)
| Field | Type | Nullable | Notes |
|---|---|---|---|
| id | UUID | NO | PK |
| institutionId | UUID | NO | FK → Institution |
| title | VARCHAR(200) | NO | |
| description | Text | YES | |
| status | SignatureRequestStatus | NO | Default: DRAFT |
| dueDate | DateTime | YES | Used for auto-expiration |
| createdAt | DateTime | NO | |
| updatedAt | DateTime | NO | |

**SignatureRecipient** (`signature_recipients`)
| Field | Type | Nullable | Notes |
|---|---|---|---|
| id | UUID | NO | PK |
| signatureRequestId | UUID | NO | FK → SignatureRequest |
| userId | UUID | NO | FK → User |
| status | SignatureRecipientStatus | NO | Default: PENDING |
| signedAt | DateTime | YES | Set when signed |
| createdAt | DateTime | NO | |
| updatedAt | DateTime | NO | |

Unique constraint: `[signatureRequestId, userId]`

### Enums

```typescript
SignatureRequestStatus: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'EXPIRED' | 'INACTIVE'
SignatureRecipientStatus: 'PENDING' | 'SIGNED' | 'DECLINED'
```

### Endpoints

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/signature-requests` | `signatures:request` | Create DRAFT request |
| GET | `/signature-requests` | `signatures:read` | List (paginated) |
| GET | `/signature-requests/:id` | `signatures:read` | Get by ID |
| PATCH | `/signature-requests/:id` | `signatures:request` | Update DRAFT request |
| PATCH | `/signature-requests/:id/publish` | `signatures:request` | Publish DRAFT |
| PATCH | `/signature-requests/:id/sign` | `signatures:sign` | Sign as recipient |
| PATCH | `/signature-requests/:id/decline` | `signatures:sign` | Decline as recipient |
| PATCH | `/signature-requests/:id/deactivate` | `signatures:request` | Deactivate any |

### Lifecycle

```
DRAFT → PUBLISHED → COMPLETED (auto when all sign)
  │         │
  │         ├── EXPIRED (auto when dueDate passes)
  │         │
  └── INACTIVE ←──┘ (manual deactivate)
```

### Permissions

| Permission | Roles |
|---|---|
| `signatures:read` | SUPER_ADMIN, INSTITUTION_ADMIN, TEACHER, PARENT |
| `signatures:request` | SUPER_ADMIN, INSTITUTION_ADMIN |
| `signatures:sign` | SUPER_ADMIN, INSTITUTION_ADMIN, PARENT |
| `signatures:manage` | SUPER_ADMIN, INSTITUTION_ADMIN |

## Files Created

```
apps/web/src/modules/signatures/
├── index.ts
├── hooks/
│   ├── index.ts
│   ├── useSignatures.ts
│   ├── useSignature.ts
│   ├── useCreateSignature.ts
│   ├── useUpdateSignature.ts
│   ├── useSignSignature.ts
│   ├── useDeclineSignature.ts
│   ├── usePublishSignature.ts
│   └── useDeactivateSignature.ts
├── pages/
│   ├── SignaturesPage.tsx
│   ├── SignatureDetailPage.tsx
│   └── SignatureFormPage.tsx
└── __tests__/
    ├── signatures-hooks.test.tsx
    └── signatures-pages.test.tsx
```

## Files Modified

- `apps/web/src/api/types.ts` — Added SignatureRequest types and labels
- `apps/web/src/app/router.tsx` — Added signature routes
- `apps/web/src/components/layout/Sidebar.tsx` — Already had Firmas entry (no changes needed)

## Hooks (8)

- `useSignatures(params)` — Paginated list with search, status, dueDate filters
- `useSignature(id)` — Single signature by ID
- `useCreateSignature()` — POST mutation
- `useUpdateSignature()` — PATCH mutation
- `useSignSignature()` — PATCH /sign mutation
- `useDeclineSignature()` — PATCH /decline mutation
- `usePublishSignature()` — PATCH /publish mutation
- `useDeactivateSignature()` — PATCH /deactivate mutation

## Pages (3)

### SignaturesPage
- List with table (desktop) + cards (mobile)
- Search with debounce 400ms
- Status filter dropdown
- Pagination
- "Nueva solicitud" button (permission-gated)

### SignatureDetailPage
- Full signature info with metadata
- Recipients list with status badges and avatars
- Lifecycle actions: Editar, Publicar, Firmar, Rechazar, Desactivar
- Confirmation modals for each action
- Expired warning banner
- Permission-gated actions

### SignatureFormPage
- Create/edit form
- Fields: title, description, dueDate, recipientUserIds (create only)
- Validation: title 3-200 chars, description max 5000, UUID format for recipients
- Permission-gated

## Routing

| Path | Component |
|---|---|
| `/signatures` | SignaturesPage |
| `/signatures/new` | SignatureFormPage |
| `/signatures/:id` | SignatureDetailPage |
| `/signatures/:id/edit` | SignatureFormPage |

## RBAC

- All pages check `PERMISSIONS.SIGNATURES_REQUEST` for create/edit/publish/deactivate
- Sign/decline check `PERMISSIONS.SIGNATURES_SIGN`
- List/detail check `PERMISSIONS.SIGNATURES_READ` (via sidebar visibility)
- Non-managers only see requests where they are recipients (backend enforced)

## Tests (29 new, 182 total)

### Hook tests (10)
- useSignatures: paginated fetch, filter params
- useSignature: fetch by ID, disabled when empty
- useCreateSignature: create + invalidate
- useUpdateSignature: update + invalidate
- useSignSignature: sign mutation
- useDeclineSignature: decline mutation
- usePublishSignature: publish mutation
- useDeactivateSignature: deactivate mutation

### Page tests (19)
- SignaturesPage: header, empty, list, button visibility, permission hiding
- SignatureDetailPage: details, status badge, publish, edit, recipients, sign/decline visibility, expired warning, permission restrictions
- SignatureFormPage: create form, recipient input, validation, permission hiding

## Validation Results

- ✅ ESLint: 0 errors
- ✅ TypeScript: 0 errors
- ✅ Tests: 182 passing
- ✅ Build: successful

## Security Review

- No institutionId in forms (uses X-Institution-Id header)
- No secrets or tokens exposed
- RBAC enforced via permission constants
- Backend is authority for all authorization
- No dangerouslySetInnerHTML or eval
- API centralized through apiClient
- No console.log in production code

## Limitations

1. **Recipient selection**: The form requires UUIDs manually entered. A user picker component would improve UX but is not supported by the current backend (no list-users endpoint available in frontend).
2. **Due date auto-expiration**: Handled by backend; frontend shows expired warning but does not auto-refresh status.
3. **No file/document attachment**: The backend SignatureRequest model does not include document/file fields. This is a backend limitation.
