# PROMPT 74 — Observador del Alumno: Follow-Up Entries, Commitments, Attachments & Lifecycle Extensions

**Status:** COMPLETE
**Date:** 2026-08-27
**Depends on:** PROMPT 73 (Backend CRUD), PROMPT 72 (Authorization)

## Summary

Extended the `StudentFollowUpsModule` with full sub-resource operations for entries, commitments, attachments, and lifecycle state transitions. All operations inherit parent follow-up authorization.

## Files Modified/Created

| File | Action |
|------|--------|
| `apps/api/src/modules/student-follow-ups/dto/create-follow-up-entry.dto.ts` | Created |
| `apps/api/src/modules/student-follow-ups/dto/update-follow-up-entry.dto.ts` | Created |
| `apps/api/src/modules/student-follow-ups/dto/create-commitment.dto.ts` | Created |
| `apps/api/src/modules/student-follow-ups/dto/update-commitment.dto.ts` | Created |
| `apps/api/src/modules/student-follow-ups/dto/create-follow-up-attachment.dto.ts` | Created |
| `apps/api/src/modules/student-follow-ups/student-follow-ups.service.ts` | Extended |
| `apps/api/src/modules/student-follow-ups/student-follow-ups.controller.ts` | Extended |
| `apps/api/src/modules/student-follow-ups/student-follow-ups.module.ts` | Updated (FilesModule import) |
| `apps/api/src/modules/student-follow-ups/student-follow-ups.service.spec.ts` | Extended (109 tests) |

## API Endpoints

### Entries (immutable history — no DELETE)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `POST` | `/:followUpId/entries` | `follow_up` | Create entry |
| `GET` | `/:followUpId/entries` | `read` | List entries (paginated) |
| `GET` | `/:followUpId/entries/:entryId` | `read` | Get single entry |
| `PATCH` | `/:followUpId/entries/:entryId` | `follow_up` | Update entry |

### Commitments

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `POST` | `/:followUpId/commitments` | `commit` | Create commitment |
| `GET` | `/:followUpId/commitments` | `read` | List commitments (paginated) |
| `GET` | `/:followUpId/commitments/:commitmentId` | `read` | Get single commitment |
| `PATCH` | `/:followUpId/commitments/:commitmentId` | `commit` | Update commitment |

### Attachments

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `POST` | `/:followUpId/attachments` | `attach` | Attach file |
| `GET` | `/:followUpId/attachments` | `read` | List attachments |
| `DELETE` | `/:followUpId/attachments/:attachmentId` | `attach` | Remove attachment (relation only, not FileAsset) |

### Lifecycle Transitions

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `POST` | `/:id/escalate` | `escalate` | ESCALATED status |
| `POST` | `/:id/follow-up` | `follow_up` | IN_PROGRESS status |
| `POST` | `/:id/resolve` | `update` | RESOLVED status |
| `POST` | `/:id/reopen` | `manage` | CLOSED → IN_PROGRESS (ADMIN only) |

## Valid State Transitions

```
OPEN → IN_PROGRESS → ESCALATED → PENDING_FOLLOW_UP → RESOLVED → CLOSED
```

Additional valid transitions:
- `OPEN → ESCALATED`, `OPEN → CLOSED`
- `IN_PROGRESS → ESCALATED`, `IN_PROGRESS → PENDING_FOLLOW_UP`, `IN_PROGRESS → RESOLVED`, `IN_PROGRESS → CLOSED`
- `ESCALATED → IN_PROGRESS`, `ESCALATED → PENDING_FOLLOW_UP`, `ESCALATED → CLOSED`
- `PENDING_FOLLOW_UP → IN_PROGRESS`, `PENDING_FOLLOW_UP → RESOLVED`, `PENDING_FOLLOW_UP → CLOSED`
- `RESOLVED → IN_PROGRESS`, `RESOLVED → CLOSED`
- `CLOSED → IN_PROGRESS` (reopen only, via `POST /:id/reopen`, ADMIN only)

## Key Design Decisions

1. **Child resources inherit parent authorization** — `canRead`/`canUpdate` on parent follow-up controls all sub-resource access
2. **Entries are immutable history** — no DELETE endpoint; only content/type updates allowed
3. **Attachments use existing FilesModule** — reuses `FileAsset` model and `FilesService`, no new upload system
4. **Duplicate attachment prevention** — compound unique constraint `followUpId_fileAssetId`
5. **Reopen restricted to ADMIN** — uses `canManage` which only allows `INSTITUTION_ADMIN`
6. **CLOSED records block mutations** — entries, commitments, attachments, and updates all rejected on closed follow-ups

## Audit Events

| Event | Entity |
|-------|--------|
| `STUDENT_FOLLOW_UP_ENTRY_CREATED` | FollowUpEntry |
| `STUDENT_FOLLOW_UP_ENTRY_UPDATED` | FollowUpEntry |
| `STUDENT_FOLLOW_UP_COMMITMENT_CREATED` | Commitment |
| `STUDENT_FOLLOW_UP_COMMITMENT_UPDATED` | Commitment |
| `STUDENT_FOLLOW_UP_ATTACHMENT_ADDED` | FollowUpAttachment |
| `STUDENT_FOLLOW_UP_ATTACHMENT_REMOVED` | FollowUpAttachment |
| `STUDENT_FOLLOW_UP_ESCALATED` | StudentFollowUp |
| `STUDENT_FOLLOW_UP_FOLLOW_UP` | StudentFollowUp |
| `STUDENT_FOLLOW_UP_RESOLVED` | StudentFollowUp |
| `STUDENT_FOLLOW_UP_REOPENED` | StudentFollowUp |

## Verification

- **TypeScript:** `npx tsc --noEmit` — zero errors
- **ESLint:** zero warnings/errors
- **Unit tests:** 109/109 passing (592 total across all modules)
