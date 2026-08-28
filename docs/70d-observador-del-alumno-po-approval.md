# PROMPT 70-D — PO DECISION APPROVAL & MVP BASELINE
## Agenda Escolar Digital v1.0.1 — Observador del Alumno

**Date:** 2026-08-27
**Status:** PO APPROVAL BASELINE — READY FOR PROMPT 71
**Version:** 1.0.0
**Scope:** Formal PO approval, MVP baseline, security acceptance criteria

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [PO Approval Statement](#2-po-approval-statement)
3. [D01 Approval](#3-d01-approval)
4. [D02 Approval](#4-d02-approval)
5. [D03 Approval](#5-d03-approval)
6. [D09 Approval](#6-d09-approval)
7. [Full D01-D12 Decision Register](#7-full-d01-d12-decision-register)
8. [Approved MVP Scope](#8-approved-mvp-scope)
9. [Out-of-Scope](#9-out-of-scope)
10. [Confidentiality Matrix](#10-confidentiality-matrix)
11. [Resource-Level Authorization Model](#11-resource-level-authorization-model)
12. [RBAC Baseline](#12-rbac-baseline)
13. [Lifecycle Baseline](#13-lifecycle-baseline)
14. [Domain Model Baseline](#14-domain-model-baseline)
15. [Security Acceptance Criteria](#15-security-acceptance-criteria)
16. [Legal/Privacy Caveats](#16-legalprivacy-caveats)
17. [Codebase Consistency Audit](#17-codebase-consistency-audit)
18. [Cloud Staging Status](#18-cloud-staging-status)
19. [PROMPT 71 Entry Criteria](#19-prompt-71-entry-criteria)
20. [Roadmap 71-76](#20-roadmap-71-76)
21. [Risks](#21-risks)
22. [Final Approval Status](#22-final-approval-status)

---

## 1. EXECUTIVE SUMMARY

This document formally records the Product Owner's approval of the 4 remaining decisions (D01, D02, D03, D09) for the "Observador del Alumno" module, establishes the MVP baseline, and confirms readiness for PROMPT 71.

### Approval Summary

| Decision | Status | Effective Date |
|----------|--------|---------------|
| D01 — Student visibility | **APPROVED** | 2026-08-27 |
| D02 — Parent access | **APPROVED** | 2026-08-27 |
| D03 — CONVIVENCIA creation | **APPROVED** | 2026-08-27 |
| D09 — MVP record types | **APPROVED** | 2026-08-27 |

### Baseline Established

- **MVP Scope**: FROZEN
- **Out-of-Scope**: FROZEN
- **Confidentiality Model**: FROZEN
- **Authorization Model**: FROZEN
- **Lifecycle**: FROZEN
- **Domain Model**: FROZEN
- **Security Acceptance Criteria**: DEFINED

### Codebase Validation

All 15 architectural requirements validated against the actual codebase. **No BLOCKER contradictions found.** Two minor documentation discrepancies identified (INFORMATIONAL only).

### Final Status

**PO APPROVAL BASELINE — READY FOR PROMPT 71**

---

## 2. PO APPROVAL STATEMENT

The Product Owner of Agenda Escolar Digital hereby formally approves the following decisions for the "Observador del Alumno" module:

1. **D01**: Students can access records at PUBLIC and INTERNAL confidentiality levels only.
2. **D02**: Parents can access records at PUBLIC and INTERNAL confidentiality levels only.
3. **D03**: INSTITUTION_ADMIN and TEACHER can create CONVIVENCIA records.
4. **D09**: The MVP includes ACADEMICO, CONVIVENCIA, and FORMATIVO record types.

These approvals are:
- Based on the discovery (PROMPT 70), product review (PROMPT 70-A), decision closure (PROMPT 70-B), and decision workshop (PROMPT 70-C)
- Validated against the actual codebase for architectural consistency
- Effective immediately for PROMPT 71 implementation
- Subject to legal/privacy review for D02 (parent access)

---

## 3. D01 — APPROVAL

### Decision

**Student Visibility of Own Records**

### Question

What information from the Observador can the student themselves consult?

### Approved Answer

The student can consult records at:

- **PUBLIC** → VISIBLE
- **INTERNAL** → VISIBLE

The student CANNOT consult:

- **CONFIDENTIAL** → NOT VISIBLE
- **SENSITIVE** → NOT VISIBLE

### Technical Implementation

- Filter: `confidentiality IN ('PUBLIC', 'INTERNAL')` for student queries
- Authorization: `Student.userId === currentUserId`
- No IDOR: studentId in URL must match authenticated user's Student record

### Status

**CLOSED — PO APPROVED**

### Legal Note

This decision has privacy implications. Legal review recommended but not blocking for PROMPT 71.

---

## 4. D02 — APPROVAL

### Decision

**Parent Access to Confidential Records**

### Question

What confidentiality levels can a parent access for a student linked via GuardianStudent?

### Approved Answer

The parent can consult records at:

- **PUBLIC** → VISIBLE
- **INTERNAL** → VISIBLE

The parent CANNOT consult:

- **CONFIDENTIAL** → NOT VISIBLE
- **SENSITIVE** → NOT VISIBLE

### Technical Implementation

- Filter: `confidentiality IN ('PUBLIC', 'INTERNAL')` for parent queries
- Authorization: `GuardianStudent → Student` relationship
- No IDOR: followUpId/studentId must resolve to a student linked via GuardianStudent

### Status

**CLOSED — PO APPROVED**

### Legal Note

**LEGAL REVIEW REQUIRED.** This decision has implications under Colombian data protection law (Ley 1581/2012). The PO should consult legal counsel on parent access rights to student data. This legal review can proceed in parallel with PROMPT 71 implementation.

---

## 5. D03 — APPROVAL

### Decision

**Who Creates CONVIVENCIA Records**

### Question

Who can create records of type CONVIVENCIA?

### Approved Answer

The following profiles CAN create CONVIVENCIA records:

- **INSTITUTION_ADMIN** ✓
- **TEACHER** ✓ (for assigned students only)

The following profiles CANNOT create CONVIVENCIA records:

- **PARENT** ✗
- **STUDENT** ✗
- **SUPER_ADMIN** ✗

### Technical Implementation

- Permission: `student-follow-ups:create` assigned to INSTITUTION_ADMIN and TEACHER roles
- Resource-level authorization: Teacher → TeacherAssignment → Enrollment → Student
- SUPER_ADMIN: No `student-follow-ups:*` permissions assigned

### Status

**CLOSED — PO APPROVED**

### Note

No new roles (COORDINATOR, COUNSELOR, ORIENTADOR) will be created in the MVP. If institutions need custom roles, they can be created by INSTITUTION_ADMIN with appropriate permissions.

---

## 6. D09 — APPROVAL

### Decision

**MVP Record Types**

### Question

Which record types should be included in the MVP?

### Approved Answer

The MVP includes:

1. **ACADEMICO** ✓
2. **CONVIVENCIA** ✓
3. **FORMATIVO** ✓

The following are OUT-OF-SCOPE for MVP:

- ASISTENCIA
- ORIENTACION
- RECONOCIMIENTO
- SALUD
- PSICOLOGICO
- DISCIPLINARIO (adicional)
- BIENESTAR

### Technical Implementation

- Enum: `FollowUpType { ACADEMICO, CONVIVENCIA, FORMATIVO }`
- Other types can be added in Phase 2 without restructuring

### Status

**CLOSED — PO APPROVED**

---

## 7. FULL D01-D12 DECISION REGISTER

| ID | Decision | Status | Approved By | Legal Required | Implementation Prompt |
|----|----------|--------|-------------|----------------|----------------------|
| D01 | Student visibility | **APPROVED** | PO | Recommended | 72 (auth), 73 (service) |
| D02 | Parent access | **APPROVED** | PO | **YES** | 72 (auth), 73 (service) |
| D03 | CONVIVENCIA creation | **APPROVED** | PO | No | 72 (RBAC) |
| D04 | Signatures on commitments | **CLOSED** | Technical | No | 74 (commitments) |
| D05 | Institution transfer | **DEFERRED** | PO | YES | Future phase |
| D06 | Reopening closed records | **CLOSED** | Technical | No | 73 (service) |
| D07 | SUPER_ADMIN access | **CLOSED** | Technical | Recommended | 72 (RBAC) |
| D08 | Attendance tracking | **CLOSED** | Technical | No | Out of scope |
| D09 | MVP record types | **APPROVED** | PO | No | 71 (schema) |
| D10 | Notification preferences | **CLOSED** | Technical | No | 74 (notifications) |
| D11 | Form UX | **CLOSED** | Technical | No | 75 (frontend) |
| D12 | Timeline commitment status | **CLOSED** | Technical | No | 75 (frontend) |

---

## 8. APPROVED MVP SCOPE

### 8.1 Entities

| Entity | CRUD | Description |
|--------|------|-------------|
| StudentFollowUp | Create, Read, Update, Close | Primary record |
| FollowUpEntry | Create, Read | Tracking entries |
| Commitment | Create, Update, Complete | Agreed actions |
| FollowUpAttachment | Create, Read, Delete | File evidence |
| FollowUpCategory | Create, Read, Update, Deactivate | Institution-configurable |

### 8.2 Record Types (D09)

- ACADEMICO
- CONVIVENCIA
- FORMATIVO

### 8.3 States

- OPEN, IN_PROGRESS, ESCALATED, PENDING_FOLLOW_UP, RESOLVED, CLOSED

### 8.4 Confidentiality Levels

- PUBLIC, INTERNAL, CONFIDENTIAL, SENSITIVE

### 8.5 Severity Levels

- LOW, MEDIUM, HIGH, CRITICAL

### 8.6 Features

- StudentFollowUp CRUD
- Follow-up entries (add, view)
- Commitments (create, complete, cancel)
- File attachment (evidence)
- Role-based access (Admin, Teacher, Parent, Student)
- Resource-level authorization (Teacher → students, Parent → children, Student → self)
- Status lifecycle (6 states)
- Audit trail (AuditLog integration)
- Notifications (on create, escalation, commitment, closure)
- Institution-scoped categories (admin configurable)
- List view with filters
- Detail view with timeline
- Form wizard for creation

---

## 9. OUT-OF-SCOPE

The following are explicitly OUT-OF-SCOPE for the Observador del Alumno MVP:

1. Attendance tracking
2. Institution transfer
3. Transferencia entre colegios
4. Retention policies
5. Advanced analytics
6. AI/ML
7. Reporting/export
8. Dashboard KPIs
9. Agenda integration
10. Mobile app
11. Offline mode
12. Bulk operations
13. Internationalization
14. New roles (COORDINATOR, COUNSELOR, ORIENTADOR)
15. Configurable templates
16. Signature integration completa
17. Automatizaciones complejas
18. Workflows externos
19. ASISTENCIA, ORIENTACION, RECONOCIMIENTO types
20. SALUD, PSICOLOGICO, DISCIPLINARIO types

---

## 10. CONFIDENTIALITY MATRIX

### 10.1 Access by Confidentiality Level (APPROVED)

| Level | INSTITUTION_ADMIN | TEACHER | PARENT | STUDENT | SUPER_ADMIN |
|-------|-------------------|---------|--------|---------|-------------|
| **PUBLIC** | ✓ | ✓ | ✓ | ✓ | ✗ |
| **INTERNAL** | ✓ | ✓ | ✓ | ✓ | ✗ |
| **CONFIDENTIAL** | ✓ | ✗ | ✗ | ✗ | ✗ |
| **SENSITIVE** | ✓ (audited) | ✗ | ✗ | ✗ | ✗ |

### 10.2 Confidentiality Behaviors

**In listings:**
- PUBLIC: Full title and details shown
- INTERNAL: Full title and details shown
- CONFIDENTIAL: Shows "Registro confidencial" (title hidden)
- SENSITIVE: Shows "Registro restringido" (title hidden)

**In detail view:**
- PUBLIC: Full access
- INTERNAL: Full access
- CONFIDENTIAL: Only INSTITUTION_ADMIN can see full detail
- SENSITIVE: Only INSTITUTION_ADMIN can see full detail, access logged

**In notifications:**
- Never reveal sensitive content in notification titles/messages
- Generic messages only

---

## 11. RESOURCE-LEVEL AUTHORIZATION MODEL

### 11.1 Authorization Rules (APPROVED)

| Actor | Relationship | Resolution |
|-------|-------------|------------|
| **INSTITUTION_ADMIN** | institution scope | `institutionId` from TenantContextGuard |
| **TEACHER** | TeacherAssignment → Enrollment → Student | Query chain |
| **PARENT** | GuardianStudent → Student | Query chain |
| **STUDENT** | Student.userId === currentUserId | Direct match |
| **SUPER_ADMIN** | NO ACCESS | No permissions assigned |

### 11.2 Relationship Chains

**Teacher → Student:**
```
Teacher (User)
    ↓
TeacherAssignment (teacherUserId, courseId, subjectId, academicPeriodId)
    ↓
Enrollment (studentId, courseId, academicPeriodId)
    ↓
Student (studentId)
```

**Parent → Student:**
```
GuardianStudent (guardianUserId, studentId)
    ↓
Student (studentId)
```

**Student → Self:**
```
Student (userId = currentUserId)
```

### 11.3 Three Layers of Authorization

1. **RBAC** (PermissionGuard): Does the user have the permission code?
2. **Resource-Level** (Service layer): Is the user related to this specific student?
3. **Confidentiality** (Service layer): Can the user see this confidentiality level?

**All three layers must pass for access to be granted.**

---

## 12. RBAC BASELINE

### 12.1 Permission Codes (11 total)

| Code | Purpose |
|------|---------|
| `student-follow-ups:read` | View records |
| `student-follow-ups:create` | Create new records |
| `student-follow-ups:update` | Modify records |
| `student-follow-ups:close` | Close cases |
| `student-follow-ups:escalate` | Escalate cases |
| `student-follow-ups:follow_up` | Add follow-up entries |
| `student-follow-ups:commit` | Create/manage commitments |
| `student-follow-ups:attach` | Attach/remove evidence |
| `student-follow-ups:manage` | Full management (admin) |
| `student-follow-ups:stats` | View statistics |
| `student-follow-ups:categories` | Manage categories |

### 12.2 Role Permission Mapping (APPROVED)

| Permission | INSTITUTION_ADMIN | TEACHER | PARENT | STUDENT |
|------------|------------------|---------|--------|---------|
| `:read` | ✓ | ✓ | ✓ | ✓* |
| `:create` | ✓ | ✓ | — | — |
| `:update` | ✓ | ✓ | — | — |
| `:close` | ✓ | — | — | — |
| `:escalate` | ✓ | ✓ | — | — |
| `:follow_up` | ✓ | ✓ | — | — |
| `:commit` | ✓ | ✓ | — | — |
| `:attach` | ✓ | ✓ | ✓ | — |
| `:manage` | ✓ | — | — | — |
| `:stats` | ✓ | ✓ | — | — |
| `:categories` | ✓ | — | — | — |

\* = resource-level filtered + confidentiality filter

### 12.3 SUPER_ADMIN

**No `student-follow-ups:*` permissions assigned.** This is a deliberate design decision.

---

## 13. LIFECYCLE BASELINE

### 13.1 States (APPROVED)

| State | Description | Terminal? |
|-------|-------------|-----------|
| **OPEN** | Record created, awaiting action | No |
| **IN_PROGRESS** | Active follow-up in progress | No |
| **ESCALATED** | Escalated to higher authority | No |
| **PENDING_FOLLOW_UP** | Awaiting response from responsible party | No |
| **RESOLVED** | Issue resolved, pending closure | No |
| **CLOSED** | Case closed, record immutable | Yes |

### 13.2 Transition Matrix (APPROVED)

| From | To | Authorized Actor | Audit Event | Notification |
|------|----|-----------------|-----------|------------| 
| — | OPEN | Admin, Teacher | FOLLOW_UP_CREATED | Director de grupo |
| OPEN | IN_PROGRESS | Admin, Teacher | FOLLOW_UP_STATUS_CHANGED | — |
| OPEN | ESCALATED | Admin, Teacher | FOLLOW_UP_ESCALATED | Target role |
| OPEN | CLOSED | Admin | FOLLOW_UP_CLOSED | All involved |
| IN_PROGRESS | IN_PROGRESS | Admin, Teacher | FOLLOW_UP_ENTRY_ADDED | — |
| IN_PROGRESS | ESCALATED | Admin, Teacher | FOLLOW_UP_ESCALATED | Target role |
| IN_PROGRESS | PENDING_FOLLOW_UP | Admin | FOLLOW_UP_STATUS_CHANGED | Responsible party |
| IN_PROGRESS | RESOLVED | Admin | FOLLOW_UP_STATUS_CHANGED | — |
| IN_PROGRESS | CLOSED | Admin | FOLLOW_UP_CLOSED | All involved |
| ESCALATED | IN_PROGRESS | Admin | FOLLOW_UP_STATUS_CHANGED | — |
| ESCALATED | CLOSED | Admin | FOLLOW_UP_CLOSED | All involved |
| PENDING_FOLLOW_UP | IN_PROGRESS | Admin, Teacher | FOLLOW_UP_STATUS_CHANGED | — |
| PENDING_FOLLOW_UP | CLOSED | Admin | FOLLOW_UP_CLOSED | All involved |
| RESOLVED | CLOSED | Admin | FOLLOW_UP_CLOSED | All involved |
| CLOSED | OPEN | Admin | FOLLOW_UP_REOPENED | All involved |

### 13.3 Closed Record Immutability

Once CLOSED:
- No new follow-up entries
- No new commitments
- No modifications
- Read-only
- Reopenable by Admin only (D06)

---

## 14. DOMAIN MODEL BASELINE

### 14.1 Entities (APPROVED)

```
StudentFollowUp
├── FollowUpEntry[]
├── Commitment[]
├── FollowUpAttachment[]
└── SignatureRequest[] (optional / future integration)

FollowUpCategory
```

### 14.2 New Models

1. StudentFollowUp
2. FollowUpEntry
3. Commitment
4. FollowUpAttachment
5. FollowUpCategory

### 14.3 New Enums

1. FollowUpType (ACADEMICO, CONVIVENCIA, FORMATIVO)
2. FollowUpSeverity (LOW, MEDIUM, HIGH, CRITICAL)
3. FollowUpStatus (OPEN, IN_PROGRESS, ESCALATED, PENDING_FOLLOW_UP, RESOLVED, CLOSED)
4. FollowUpConfidentiality (PUBLIC, INTERNAL, CONFIDENTIAL, SENSITIVE)
5. FollowUpEntryType (INTERVENCION, SEGUIMIENTO, NOTA, COMPROMISO_CUMPLIDO, COMPROMISO_INCUMPLIDO, ESCALACION)
6. CommitmentStatus (PENDING, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED)
7. CommitmentResponsibleRole (STUDENT, PARENT, TEACHER, INSTITUTION)

### 14.4 Relations to Existing Models

- StudentFollowUp → Student (FK)
- StudentFollowUp → Institution (FK)
- StudentFollowUp → User (createdBy, lastModifiedBy, closedBy)
- FollowUpEntry → StudentFollowUp (FK, cascade)
- Commitment → StudentFollowUp (FK, cascade)
- FollowUpAttachment → StudentFollowUp (FK, cascade)
- FollowUpAttachment → FileAsset (FK, restrict)
- Commitment → SignatureRequest (FK, optional, set null)
- FollowUpCategory → Institution (FK, cascade)

---

## 15. SECURITY ACCEPTANCE CRITERIA

### 15.1 Mandatory Criteria for PROMPT 71-76

| ID | Criterion | Description |
|----|-----------|-------------|
| SC-001 | No cross-tenant access | institutionId on every query, TenantContextGuard enforced |
| SC-002 | Parent cannot access unlinked student | GuardianStudent relationship required |
| SC-003 | Student cannot access another student's record | Student.userId === currentUserId enforced |
| SC-004 | Teacher cannot access student outside scope | TeacherAssignment → Enrollment → Student required |
| SC-005 | CONFIDENTIAL inaccessible to Teacher, Parent, Student | Confidentiality filter enforced |
| SC-006 | SENSITIVE inaccessible to Teacher, Parent, Student | Confidentiality filter enforced |
| SC-007 | SUPER_ADMIN cannot access Observador content | No permissions assigned |
| SC-008 | institutionId cannot be controlled via DTO | From TenantContextGuard only |
| SC-009 | Changing followUpId in URL cannot bypass authorization | Resource-level auth required |
| SC-010 | Changing studentId cannot bypass authorization | Resource-level auth required |
| SC-011 | Mutations generate required audit records | AuditService.log() called |
| SC-012 | Frontend must never be treated as security boundary | UX-only, server-side enforced |
| SC-013 | Backend PermissionGuard remains authoritative | PermissionGuard + TenantContextGuard |
| SC-014 | Unauthorized resources must not leak sensitive existence/details | 404 for unauthorized access |
| SC-015 | Parent filtering must use GuardianStudent | resolveParentContext() utility |
| SC-016 | Student filtering must use Student.userId | Direct match required |
| SC-017 | Teacher filtering must use TeacherAssignment → Enrollment → Student | Query chain required |

---

## 16. LEGAL/PRIVACY CAVEATS

### 16.1 Important Disclaimers

1. **This approval does NOT constitute legal advice.** The PO's functional approval does not replace legal/privacy validation.

2. **Student data protection:** The treatment of student information must comply with applicable institutional policies and legal obligations (including Ley 1581/2012).

3. **D02 requires special attention:** Parent access to student records involves data of minors and requires careful consideration.

4. **Institution transfer:** Transfer between institutions is OUT-OF-SCOPE and will require specific legal review before implementation.

5. **SUPER_ADMIN restriction:** SUPER_ADMIN access to institutional content is restricted by design in this MVP.

6. **Legal review recommended for:**
   - D02: Parent access to student records
   - D05: Institution transfer implications
   - General: Ley 1581/2012 compliance

---

## 17. CODEBASE CONSISTENCY AUDIT

### 17.1 Validation Results

| # | Requirement | Status | File | Notes |
|---|-------------|--------|------|-------|
| 1 | TenantContextGuard | **EXISTS** | `apps/api/src/modules/auth/tenant/tenant-context.guard.ts:17` | Uses X-Institution-Id header |
| 2 | PermissionGuard | **EXISTS** | `apps/api/src/modules/auth/authorization/permission.guard.ts:14` | Checks via AuthorizationService |
| 3 | AccessTokenGuard | **EXISTS** | `apps/api/src/modules/auth/guards/access-token.guard.ts:5` | JWT Bearer token |
| 4 | Guard chain pattern | **EXISTS** | 22+ controllers | Consistent triple-guard |
| 5 | Student model | **EXISTS** | `prisma/schema.prisma:446` | userId nullable, @unique |
| 6 | GuardianStudent model | **EXISTS** | `prisma/schema.prisma:835` | guardianUserId, studentId, institutionId |
| 7 | TeacherAssignment model | **EXISTS** | `prisma/schema.prisma:804` | Links Course, Subject, AcademicPeriod |
| 8 | Enrollment model | **EXISTS** | `prisma/schema.prisma:771` | Links Student to Course |
| 9 | FileAsset model | **EXISTS** | `prisma/schema.prisma:946` | storageKey, mimeType, sizeBytes |
| 10 | SignatureRequest model | **EXISTS** | `prisma/schema.prisma:648` | One-to-many with SignatureRecipient |
| 11 | Notification model | **EXISTS** | `prisma/schema.prisma:694` | type, title, message, status |
| 12 | AuditLog model | **EXISTS** | `prisma/schema.prisma:379` | action, entityType, entityId, oldValues, newValues |
| 13 | parent-context.ts | **EXISTS** | `apps/api/src/common/auth/parent-context.ts:1` | resolveParentContext(), findGuardianUserIds() |
| 14 | Permission constants | **EXISTS** | `apps/web/src/permissions/permission.constants.ts:1` | 51 codes |
| 15 | PermissionGate | **EXISTS** | `apps/web/src/permissions/PermissionGate.tsx:13` | UX-only |

### 17.2 Findings

| ID | Finding | Severity | Impact | Resolution |
|----|---------|----------|--------|------------|
| F01 | Permission constants: 51 codes (doc says 53) | INFORMATIONAL | None | Document discrepancy |
| F02 | StudentsService does not use shared resolveParentContext() | LOW | Inconsistency | New module should use shared utility |

### 17.3 BLOCKER Contradictions

**None found.** All 15 architectural requirements are met.

---

## 18. CLOUD STAGING STATUS

### 18.1 Status

- **Cloud Staging (FASE 1.9)**: PENDING
- **Evidence**: Documented in PROMPT 69 as next step after GO decision
- **Infrastructure**: Docker Compose configuration exists for local development
- **Cloud deployment**: Not yet executed

### 18.2 Impact on PROMPT 71

Cloud Staging can remain as a parallel activity. The design and implementation of the Observador module can proceed without Cloud Staging being complete. However, Cloud Staging should complete before the module is deployed to production.

---

## 19. PROMPT 71 ENTRY CRITERIA

### All criteria met:

| # | Criterion | Status |
|---|-----------|--------|
| 1 | D01 approved | ✓ |
| 2 | D02 approved | ✓ |
| 3 | D03 approved | ✓ |
| 4 | D09 approved | ✓ |
| 5 | MVP scope approved | ✓ |
| 6 | Confidentiality baseline approved | ✓ |
| 7 | Resource-level authorization baseline approved | ✓ |
| 8 | Lifecycle baseline approved | ✓ |
| 9 | No unresolved BLOCKER contradictions | ✓ |
| 10 | Domain model conceptually approved | ✓ |

**PROMPT 71 CAN INITIATE.**

---

## 20. ROADMAP 71-76

| Prompt | Name | Status | Dependencies |
|--------|------|--------|-------------|
| 70 | Discovery | COMPLETED | — |
| 70-A | Product Review | COMPLETED | 70 |
| 70-B | Decision Closure | COMPLETED | 70-A |
| 70-C | Decision Workshop | COMPLETED | 70-B |
| 70-D | PO Approval & Baseline | **THIS DOCUMENT** | 70-C |
| 71 | Domain Model / Prisma Schema | **NEXT** | 70-D |
| 72 | RBAC + Resource-Level Authorization | AFTER 71 | 71 |
| 73 | Backend CRUD | AFTER 72 | 72 |
| 74 | Follow-ups + Commitments + Lifecycle | AFTER 73 | 73 |
| 75 | Frontend | AFTER 74 | 74 |
| 76 | E2E + Security + Acceptance | AFTER 75 | 75 |

---

## 21. RISKS

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R01 | Privacy violation via data exposure | CRITICAL | Confidentiality field + strict access rules + audit |
| R02 | Overexposure to parents | HIGH | Confidentiality-based access restriction |
| R03 | Overexposure to teachers | HIGH | Resource-level authorization + confidentiality |
| R04 | SUPER_ADMIN data access | CRITICAL | Do not assign permissions |
| R05 | Cross-tenant data leakage | CRITICAL | TenantContextGuard + institutionId on every query |
| R06 | Resource-level authorization bypass | HIGH | TeacherAssignment → Enrollment → Student verification |
| R07 | Lifecycle inconsistency | MEDIUM | Formal state machine documentation |
| R08 | Audit incompleteness | HIGH | Require audit on all mutations |
| R09 | Attachment leakage | MEDIUM | Tenant-scoped file access |
| R10 | Signature semantics confusion | LOW | Optional in MVP, clear documentation |
| R11 | Institution transfer data breach | CRITICAL | Defer to Phase 2.5+ |
| R12 | Legal retention/deletion conflicts | HIGH | Conservative approach, no auto-deletion |
| R13 | Scope creep delays Cloud Staging | HIGH | Defer to Phase 2, don't block Cloud |
| R14 | Module becomes catch-all | MEDIUM | Clear scope: educational follow-up only |
| R15 | Performance with large datasets | MEDIUM | Proper indexing + pagination |

---

## 22. FINAL APPROVAL STATUS

### PO APPROVAL BASELINE — READY FOR PROMPT 71

All 4 pending decisions (D01, D02, D03, D09) have been formally approved by the Product Owner. The MVP baseline is frozen. No BLOCKER contradictions exist in the codebase.

### What This Means

1. **PROMPT 71 can initiate** — Domain Model / Prisma Schema
2. **The MVP scope is frozen** — no additions without new PO approval
3. **The authorization model is frozen** — three-layer approach confirmed
4. **The confidentiality model is frozen** — PUBLIC + INTERNAL for parents and students
5. **The lifecycle is frozen** — 6 states with defined transitions
6. **Security acceptance criteria are defined** — 17 mandatory criteria

### What Happens Next

1. **PROMPT 71**: Domain Model / Prisma Schema
   - Create 7 enums
   - Create 5 models
   - Add relations to existing models
   - Run migration
   - Seed default categories

2. **PROMPT 72**: RBAC + Resource-Level Authorization
   - Add 11 permission codes
   - Map permissions to roles
   - Implement resource-level authorization
   - Add permission guard tests

3. **PROMPT 73-76**: Backend, Follow-ups, Frontend, E2E

### Legal Note

The PO's functional approval does not replace legal/privacy validation. Legal review of D02 (parent access) and general Ley 1581/2012 compliance should proceed in parallel with implementation.

---

*Document generated by PROMPT 70-D — PO Decision Approval & MVP Baseline. No functional code was modified.*
