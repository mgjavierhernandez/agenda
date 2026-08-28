# 75 — Observador del Alumno — Frontend Implementation

## Overview

Complete frontend implementation for the **Observador del Alumno** module, integrated against real backend endpoints (PROMPTS 72-74). Full RBAC, resource-level authorization, confidentiality, lifecycle state management, responsive design, and accessibility compliance.

## Architecture

```
apps/web/src/modules/student-follow-ups/
├── index.ts                         # Barrel export
├── hooks/
│   ├── index.ts                     # All 18 hooks barrel export
│   ├── useStudentFollowUps.ts       # Paginated list with filters
│   ├── useStudentFollowUp.ts        # Detail by ID
│   ├── useCreateStudentFollowUp.ts  # Create mutation
│   ├── useUpdateStudentFollowUp.ts  # Update mutation
│   ├── useCloseStudentFollowUp.ts   # CLOSE transition
│   ├── useEscalateStudentFollowUp.ts# ESCALATED transition
│   ├── useFollowUpStudentFollowUp.ts# IN_PROGRESS transition
│   ├── useResolveStudentFollowUp.ts # RESOLVED transition
│   ├── useReopenStudentFollowUp.ts  # Reopen closed follow-up
│   ├── useFollowUpEntries.ts        # Entries list
│   ├── useCreateFollowUpEntry.ts    # Create entry
│   ├── useUpdateFollowUpEntry.ts    # Update entry
│   ├── useFollowUpCommitments.ts    # Commitments list
│   ├── useCreateCommitment.ts       # Create commitment
│   ├── useUpdateCommitment.ts       # Update commitment
│   ├── useFollowUpAttachments.ts    # Attachments list
│   ├── useCreateFollowUpAttachment.ts# Create attachment
│   └── useRemoveFollowUpAttachment.ts# Remove attachment
├── pages/
│   ├── StudentFollowUpsPage.tsx     # List page
│   ├── StudentFollowUpDetailPage.tsx # Detail with tabs
│   └── StudentFollowUpFormPage.tsx  # Create/edit form
└── __tests__/                       # (skipped — Babel config issues)
```

## Routes

| Path | Component | Permission |
|---|---|---|
| `/student-follow-ups` | `StudentFollowUpsPage` | `STUDENT_FOLLOW_UPS_READ` |
| `/student-follow-ups/new` | `StudentFollowUpFormPage` | `STUDENT_FOLLOW_UPS_CREATE` |
| `/student-follow-ups/:id` | `StudentFollowUpDetailPage` | `STUDENT_FOLLOW_UPS_READ` |
| `/student-follow-ups/:id/edit` | `StudentFollowUpFormPage` | `STUDENT_FOLLOW_UPS_UPDATE` |

## Sidebar Navigation

- **Label**: "Observador del Alumno"
- **Icon**: `BookOpen`
- **Permission gate**: `STUDENT_FOLLOW_UPS_READ`

## Pages

### List Page (`StudentFollowUpsPage.tsx`)

- **Filters**: Search (title/student), Type (academic/behavioral/health/family/other), Status (OPEN/IN_PROGRESS/RESOLVED/CLOSED/ESCALATED), Severity (LOW/MEDIUM/HIGH/CRITICAL)
- **Desktop**: Full table with columns — Title, Student, Type (Badge), Severity (Badge), Status (Badge), Created, Actions
- **Mobile**: Card layout with compact info
- **Pagination**: Page/limit from API, Previous/Next controls
- **Create button**: Permission-gated with `STUDENT_FOLLOW_UPS_CREATE`
- **States**: Loading spinner, empty state ("No se encontraron observadores"), error state with retry

### Detail Page (`StudentFollowUpDetailPage.tsx`)

- **Info cards**: Student, Type, Severity, Status, Confidentiality, Created/Updated dates
- **Tabs**:
  - **Timeline** (entries): List of follow-up entries with author, date, type badge, content
  - **Commitments**: Commitment cards with status, responsible, due date, progress bar
  - **Attachments**: File list with download, upload via drag-and-drop (reuses `useUploadFile`)
- **Lifecycle actions**: Button bar with confirmation modal per action:
  - OPEN → IN_PROGRESS, ESCALATED, CLOSED
  - IN_PROGRESS → RESOLVED, ESCALATED, CLOSED
  - ESCALATED → IN_PROGRESS, RESOLVED, CLOSED
  - RESOLVED → CLOSED (re-open not allowed)
  - CLOSED → Reopen (separate confirmation)
- **Inline forms**: Entry creation, commitment creation
- **Permission-gated actions**: All mutations respect RBAC + resource authorization

### Form Page (`StudentFollowUpFormPage.tsx`)

- **Fields**: Title, Student (create only, searchable), Type, Severity, Confidentiality, Summary, Description
- **Validation**: Required fields enforced client-side
- **Permission gate**: `STUDENT_FOLLOW_UPS_CREATE` or `STUDENT_FOLLOW_UPS_UPDATE`

## Hooks (18 total)

All hooks use `apiClient` + React Query pattern matching existing modules. Each hook invalidates relevant query caches on mutation.

| Hook | Endpoint | Method |
|---|---|---|
| `useStudentFollowUps` | `GET /student-follow-ups` | Query |
| `useStudentFollowUp` | `GET /student-follow-ups/:id` | Query |
| `useCreateStudentFollowUp` | `POST /student-follow-ups` | Mutation |
| `useUpdateStudentFollowUp` | `PATCH /student-follow-ups/:id` | Mutation |
| `useCloseStudentFollowUp` | `POST /student-follow-ups/:id/close` | Mutation |
| `useEscalateStudentFollowUp` | `POST /student-follow-ups/:id/escalate` | Mutation |
| `useFollowUpStudentFollowUp` | `POST /student-follow-ups/:id/follow-up` | Mutation |
| `useResolveStudentFollowUp` | `POST /student-follow-ups/:id/resolve` | Mutation |
| `useReopenStudentFollowUp` | `POST /student-follow-ups/:id/reopen` | Mutation |
| `useFollowUpEntries` | `GET /student-follow-ups/:id/entries` | Query |
| `useCreateFollowUpEntry` | `POST /student-follow-ups/:id/entries` | Mutation |
| `useUpdateFollowUpEntry` | `PATCH /student-follow-ups/:id/entries/:entryId` | Mutation |
| `useFollowUpCommitments` | `GET /student-follow-ups/:id/commitments` | Query |
| `useCreateCommitment` | `POST /student-follow-ups/:id/commitments` | Mutation |
| `useUpdateCommitment` | `PATCH /student-follow-ups/:id/commitments/:commitmentId` | Mutation |
| `useFollowUpAttachments` | `GET /student-follow-ups/:id/attachments` | Query |
| `useCreateFollowUpAttachment` | `POST /student-follow-ups/:id/attachments` | Mutation |
| `useRemoveFollowUpAttachment` | `DELETE /student-follow-ups/:id/attachments/:attachmentId` | Mutation |

## Permission Mapping

| Frontend Permission | Guard | Usage |
|---|---|---|
| `STUDENT_FOLLOW_UPS_READ` | Read any follow-up | List page, detail page |
| `STUDENT_FOLLOW_UPS_CREATE` | Create follow-ups | Create button, form page |
| `STUDENT_FOLLOW_UPS_UPDATE` | Update own/assigned | Edit button, form page |
| `STUDENT_FOLLOW_UPS_DELETE` | Delete (disabled UI) | Not exposed |
| `STUDENT_FOLLOW_UPS_MANAGE` | Full management | Admin access |
| `STUDENT_FOLLOW_UPS_ENTRIES_READ` | Read entries | Detail tab |
| `STUDENT_FOLLOW_UPS_ENTRIES_CREATE` | Create entries | Inline form |
| `STUDENT_FOLLOW_UPS_ENTRIES_UPDATE` | Update entries | Entry edit |
| `STUDENT_FOLLOW_UPS_COMMITMENTS_READ` | Read commitments | Detail tab |
| `STUDENT_FOLLOW_UPS_COMMITMENTS_CREATE` | Create commitments | Inline form |
| `STUDENT_FOLLOW_UPS_COMMITMENTS_UPDATE` | Update commitments | Status change |

## API Integration Matrix

| Frontend Call | Backend Endpoint | Response Shape |
|---|---|---|
| `useStudentFollowUps(params)` | `GET /student-follow-ups` | `{ data: FollowUp[], meta: PaginationMeta }` |
| `useStudentFollowUp(id)` | `GET /student-follow-ups/:id` | `FollowUp` |
| `useCreateStudentFollowUp(data)` | `POST /student-follow-ups` | `FollowUp` |
| `useUpdateStudentFollowUp(id, data)` | `PATCH /student-follow-ups/:id` | `FollowUp` |
| `useCloseStudentFollowUp(id)` | `POST /student-follow-ups/:id/close` | `FollowUp` |
| `useEscalateStudentFollowUp(id)` | `POST /student-follow-ups/:id/escalate` | `FollowUp` |
| `useFollowUpStudentFollowUp(id)` | `POST /student-follow-ups/:id/follow-up` | `FollowUp` |
| `useResolveStudentFollowUp(id)` | `POST /student-follow-ups/:id/resolve` | `FollowUp` |
| `useReopenStudentFollowUp(id)` | `POST /student-follow-ups/:id/reopen` | `FollowUp` |
| `useFollowUpEntries(id)` | `GET /student-follow-ups/:id/entries` | `{ data: FollowUpEntry[] }` |
| `useCreateFollowUpEntry(id, data)` | `POST /student-follow-ups/:id/entries` | `FollowUpEntry` |
| `useUpdateFollowUpEntry(id, entryId, data)` | `PATCH /student-follow-ups/:id/entries/:entryId` | `FollowUpEntry` |
| `useFollowUpCommitments(id)` | `GET /student-follow-ups/:id/commitments` | `{ data: Commitment[] }` |
| `useCreateCommitment(id, data)` | `POST /student-follow-ups/:id/commitments` | `Commitment` |
| `useUpdateCommitment(id, cId, data)` | `PATCH /student-follow-ups/:id/commitments/:commitmentId` | `Commitment` |
| `useFollowUpAttachments(id)` | `GET /student-follow-ups/:id/attachments` | `{ data: FollowUpAttachment[] }` |
| `useCreateFollowUpAttachment(id, data)` | `POST /student-follow-ups/:id/attachments` | `FollowUpAttachment` |
| `useRemoveFollowUpAttachment(id, aId)` | `DELETE /student-follow-ups/:id/attachments/:attachmentId` | `void` |

## Validation Results

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | Zero errors |
| ESLint (new files) | Zero errors |
| Vite build (`npm run build`) | Successful (8.36s) |
| No backend logic duplicated in frontend | ✓ |
| All API types match backend DTOs | ✓ |
| RBAC enforced via `PermissionGate` + backend guards | ✓ |
| Resource-level authorization via backend service | ✓ |
| Confidentiality via backend filtering (not frontend) | ✓ |
| Lifecycle transitions via dedicated backend endpoints | ✓ |
| Existing tests unchanged | ✓ (pre-existing Babel config failures only) |
| No files pushed, committed, or tagged | ✓ |
