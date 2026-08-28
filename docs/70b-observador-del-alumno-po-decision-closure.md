# PROMPT 70-B — PRODUCT OWNER DECISION CLOSURE + MVP SCOPE BASELINE
## OBSERVADOR DEL ALUMNO — AGENDA ESCOLAR DIGITAL

**Date:** 2026-08-27
**Status:** PO DECISION CLOSURE — BLOCKED BY OPEN DECISIONS
**Version:** 1.0.0
**Scope:** Decision closure, MVP scope baseline, authorization model, lifecycle, roadmap

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Scope](#2-scope)
3. [Source Documents](#3-source-documents)
4. [Decision Matrix D01-D12](#4-decision-matrix-d01-d12)
5. [Final Decision Status](#5-final-decision-status)
6. [PO Decisions Required](#6-po-decisions-required)
7. [Legal/Privacy Decisions Required](#7-legalprivacy-decisions-required)
8. [Role Capability Matrix](#8-role-capability-matrix)
9. [Resource-Level Authorization Matrix](#9-resource-level-authorization-matrix)
10. [Confidentiality Matrix](#10-confidentiality-matrix)
11. [Lifecycle Matrix](#11-lifecycle-matrix)
12. [Commitment Rules](#12-commitment-rules)
13. [Signature Rules](#13-signature-rules)
14. [Attachment Rules](#14-attachment-rules)
15. [Notification Rules](#15-notification-rules)
16. [Audit Rules](#16-audit-rules)
17. [Category Rules](#17-category-rules)
18. [Explicit MVP Scope](#18-explicit-mvp-scope)
19. [Explicit Out-of-Scope](#19-explicit-out-of-scope)
20. [Open Questions](#20-open-questions)
21. [Risk Register](#21-risk-register)
22. [PROMPT 71 Entry Criteria](#22-prompt-71-entry-criteria)
23. [Roadmap PROMPTS 71-76](#23-roadmap-prompts-71-76)
24. [Recommended Implementation Sequence](#24-recommended-implementation-sequence)
25. [Definition of Done for the Module](#25-definition-of-done-for-the-module)
26. [Implementation Rules](#26-implementation-rules)
27. [Architectural Gaps](#27-architectural-gaps)
28. [Final Recommendation](#28-final-recommendation)

---

## 1. EXECUTIVE SUMMARY

This document completes the formal decision closure for the "Observador del Alumno" module. After reviewing the discovery (PROMPT 70), product review (PROMPT 70-A), and validating against the actual codebase, this document:

1. **Classifies each D01-D12 decision** with a final status
2. **Identifies which decisions are truly closed** vs. which require explicit PO approval
3. **Separates product decisions from legal/privacy decisions**
4. **Establishes the functional baseline** for the MVP
5. **Defines the authorization model** with complete matrices
6. **Validates architectural compatibility** with existing code patterns

### Key Finding

**The MVP cannot start until 8 product decisions and 3 legal questions are resolved.** The recommendations from PROMPT 70 and 70-A are technically sound but constitute recommendations, not approvals. A recommendation is not a decision.

### Decision Summary

| Category | Count | Status |
|----------|-------|--------|
| CLOSED (technically resolvable) | 4 | Ready for PROMPT 71 |
| REQUIRES PO (explicit approval needed) | 5 | BLOCKS PROMPT 71 |
| REQUIRES LEGAL (validation needed) | 3 | May BLOCK depending on PO |
| DEFERRED (out of MVP) | 2 | No blocks |

---

## 2. SCOPE

This document is exclusively for:

- Decision closure and baseline establishment
- Authorization model definition
- Lifecycle formalization
- Risk identification
- Roadmap finalization

**NOT included:**
- Code implementation
- Prisma schema changes
- Endpoint creation
- Frontend development
- Test execution
- Git commits

---

## 3. SOURCE DOCUMENTS

| Document | Path | Status |
|----------|------|--------|
| Discovery | `docs/70-observador-del-alumno-discovery.md` | REVIEWED |
| Product Review | `docs/70a-observador-del-alumno-product-review.md` | REVIEWED |
| Prisma Schema | `apps/api/prisma/schema.prisma` | REVIEWED |
| Seed Data | `apps/api/prisma/seed.ts` | REVIEWED |
| Parent Context | `apps/api/src/common/auth/parent-context.ts` | REVIEWED |
| Permission Guard | `apps/api/src/modules/auth/authorization/permission.guard.ts` | REVIEWED |
| Tenant Context Guard | `apps/api/src/modules/auth/tenant/tenant-context.guard.ts` | REVIEWED |
| Authorization Service | `apps/api/src/modules/auth/authorization/authorization.service.ts` | REVIEWED |
| Students Service | `apps/api/src/modules/students/students.service.ts` | REVIEWED |
| Tasks Service | `apps/api/src/modules/tasks/tasks.service.ts` | REVIEWED |
| Grades Service | `apps/api/src/modules/grades/grades.service.ts` | REVIEWED |
| Files Service | `apps/api/src/modules/files/files.service.ts` | REVIEWED |
| Signatures Service | `apps/api/src/modules/signatures/signatures.service.ts` | REVIEWED |
| Notifications Service | `apps/api/src/modules/notifications/notifications.service.ts` | REVIEWED |
| Audit Service | `apps/api/src/common/audit/audit.service.ts` | REVIEWED |
| Permission Constants | `apps/web/src/permissions/permission.constants.ts` | REVIEWED |
| PermissionGate | `apps/web/src/permissions/PermissionGate.tsx` | REVIEWED |
| usePermissions | `apps/web/src/permissions/usePermissions.ts` | REVIEWED |
| RBAC E2E Tests | `apps/api/test/rbac-authorization.e2e-spec.ts` | REVIEWED |

---

## 4. DECISION MATRIX D01-D12

### D01 — Student Visibility of Own Records

| Field | Value |
|-------|-------|
| **Question** | Can students see ALL their records, or only PUBLIC+INTERNAL? |
| **Recommendation** | PUBLIC + INTERNAL only (exclude CONFIDENTIAL and SENSITIVE) |
| **Status** | **REQUIRES PO** |
| **Requires PO** | YES |
| **Requires Legal** | Recommended |
| **Blocks PROMPT 71** | YES — affects confidentiality filter in service layer |
| **Justification** | Students have a right to know their educational process, but counseling records (CONFIDENTIAL) and family/health situations (SENSITIVE) should not be visible to them. This balances transparency with protection. |
| **Dependencies** | D02 (parent visibility should align) |
| **Risk** | If student can see everything, may expose sensitive third-party data |
| **Code Impact** | Service layer must filter by `confidentiality IN ('PUBLIC', 'INTERNAL')` for student queries |

### D02 — Parent Access to Confidential Records

| Field | Value |
|-------|-------|
| **Question** | Can parents see CONFIDENTIAL records of their children? |
| **Recommendation** | PUBLIC + INTERNAL only (exclude CONFIDENTIAL and SENSITIVE) |
| **Status** | **REQUIRES PO + LEGAL** |
| **Requires PO** | YES |
| **Requires Legal** | YES — counseling confidentiality may have legal implications |
| **Blocks PROMPT 71** | YES — affects confidentiality filter in service layer |
| **Justification** | CONFIDENTIAL records typically contain psychological counseling notes that are confidential between the student and counselor. Parents do not need this information to participate in the educational process. |
| **Dependencies** | D01 (student and parent visibility should be consistent) |
| **Risk** | If parent can see CONFIDENTIAL, may violate student-counselor confidentiality |
| **Code Impact** | Service layer must filter by `confidentiality IN ('PUBLIC', 'INTERNAL')` for parent queries |

### D03 — Who Creates CONVIVENCIA Records

| Field | Value |
|-------|-------|
| **Question** | Can teachers create CONVIVENCIA records, or only admins? |
| **Recommendation** | INSTITUTION_ADMIN + TEACHER (with assigned students) |
| **Status** | **REQUIRES PO** |
| **Requires PO** | YES |
| **Requires Legal** | No |
| **Blocks PROMPT 71** | YES — defines who has `student-follow-ups:create` permission |
| **Justification** | Teachers have direct contact with students and can observe situations requiring documentation. Admins need access for institutional records. The "COORDINATOR" and "COUNSELOR" roles do not exist in the current system and should be created as custom roles by INSTITUTION_ADMIN. |
| **Dependencies** | None |
| **Risk** | If teacher cannot create, bottlenecks reporting; if too many can create, quality issues |
| **Code Impact** | Permission assignment in seed.ts, resource-level auth via TeacherAssignment |

### D04 — Signatures on Commitments

| Field | Value |
|-------|-------|
| **Question** | Must every commitment have a digital signature? |
| **Recommendation** | Optional (configurable per institution) |
| **Status** | **CLOSED — TECHNICALLY RESOLVABLE** |
| **Requires PO** | No — technical decision |
| **Requires Legal** | No |
| **Blocks PROMPT 71** | No — implement flag, add signatures in Phase 2.3 |
| **Justification** | Institutions have different formality levels. Some may require signatures for formal commitments, others may not. A `requestSignature` boolean flag on Commitment allows configuration. |
| **Dependencies** | None |
| **Risk** | Low — optional feature can be added later |
| **Code Impact** | Add `requestSignature` field to Commitment model; create SignatureRequest only when flag is true |

### D05 — Institution Transfer in MVP

| Field | Value |
|-------|-------|
| **Question** | Should the MVP support transfer of records between institutions? |
| **Recommendation** | Defer to Phase 2.5+ |
| **Status** | **DEFERRED** |
| **Requires PO** | Yes — to confirm deferral |
| **Requires Legal** | YES — Ley 1581/2012 implications |
| **Blocks PROMPT 71** | No |
| **Justification** | Transfer is an infrequent operation that introduces significant complexity (cross-tenant access, privacy, traceability). The MVP should focus on follow-up within a single institution. |
| **Dependencies** | None |
| **Risk** | Low — infrequent use case; can be added later without architectural changes |
| **Code Impact** | None in MVP |

### D06 — Reopening Closed Records

| Field | Value |
|-------|-------|
| **Question** | Should closed records ever be reopened? |
| **Recommendation** | Admin only, with audit trail |
| **Status** | **CLOSED — TECHNICALLY RESOLVABLE** |
| **Requires PO** | No — technical decision |
| **Requires Legal** | No |
| **Blocks PROMPT 71** | Partially — affects lifecycle model |
| **Justification** | Reopening must be exceptional and documented. Only INSTITUTION_ADMIN has authority to reopen a closed case, and must register the justification in the audit trail. |
| **Dependencies** | None |
| **Risk** | Low — admin-only action with audit |
| **Code Impact** | Add REOPENED state or handle via status transition; log audit event |

### D07 — SUPER_ADMIN Access to Student Data

| Field | Value |
|-------|-------|
| **Question** | Should SUPER_ADMIN have read access to StudentFollowUp records? |
| **Recommendation** | NO — platform management only |
| **Status** | **CLOSED — TECHNICALLY RESOLVABLE** |
| **Requires PO** | No — aligns with minimization principle |
| **Requires Legal** | Recommended — data minimization |
| **Blocks PROMPT 71** | No |
| **Justification** | SUPER_ADMIN manages the platform (institutions, users, configuration). They do not need to access student personal data. This follows the principle of data minimization. |
| **Dependencies** | None |
| **Risk** | Low — SUPER_ADMIN can manage institutions without seeing student data |
| **Code Impact** | Do not assign `student-follow-ups:*` permissions to SUPER_ADMIN role |

### D08 — Attendance Tracking in MVP

| Field | Value |
|-------|-------|
| **Question** | Should the Observador include an attendance system? |
| **Recommendation** | NO — separate module |
| **Status** | **CLOSED — TECHNICALLY RESOLVABLE** |
| **Requires PO** | No |
| **Requires Legal** | No |
| **Blocks PROMPT 71** | No |
| **Justification** | The Observador is a formative follow-up module, not an attendance system. Attendance requires different logic (biometry, QR, checklists) and should be a separate module. |
| **Dependencies** | None |
| **Risk** | None |
| **Code Impact** | Do not include ASISTENCIA in FollowUpType enum |

### D09 — MVP Record Types

| Field | Value |
|-------|-------|
| **Question** | Which record types should the MVP support? |
| **Recommendation** | Core 3: ACADEMICO, CONVIVENCIA, FORMATIVO |
| **Status** | **REQUIRES PO** |
| **Requires PO** | YES |
| **Requires Legal** | No |
| **Blocks PROMPT 71** | YES — defines FollowUpType enum values |
| **Justification** | The 3 types cover 80% of use cases. ASISTENCIA, ORIENTACION, RECONOCIMIENTO can be added in Phase 2 without restructuring. |
| **Dependencies** | None |
| **Risk** | Low — types can be added later |
| **Code Impact** | Defines enum values in Prisma schema |

### D10 — Notification Preferences

| Field | Value |
|-------|-------|
| **Question** | Should the Observador have its own notification preferences? |
| **Recommendation** | Reuse global notification settings |
| **Status** | **CLOSED — TECHNICALLY RESOLVABLE** |
| **Requires PO** | No |
| **Requires Legal** | No |
| **Blocks PROMPT 71** | No |
| **Justification** | The existing notification system already supports preferences. No need to duplicate for a single module. |
| **Dependencies** | None |
| **Risk** | None |
| **Code Impact** | Use existing Notification model and PatternsService |

### D11 — Form UX

| Field | Value |
|-------|-------|
| **Question** | Should the creation form be a wizard or single form? |
| **Recommendation** | Wizard (5-6 steps) |
| **Status** | **CLOSED — TECHNICALLY RESOLVABLE** |
| **Requires PO** | No — frontend decision |
| **Requires Legal** | No |
| **Blocks PROMPT 71** | No — affects PROMPT 75 only |
| **Justification** | Teachers are not technical users. A wizard reduces cognitive load and guides the process. The full form can be overwhelming with 5+ fields. |
| **Dependencies** | None |
| **Risk** | None |
| **Code Impact** | Frontend components only (PROMPT 75) |

### D12 — Timeline Commitment Status Changes

| Field | Value |
|-------|-------|
| **Question** | Should the timeline show commitment status changes? |
| **Recommendation** | Yes (complete timeline) |
| **Status** | **CLOSED — TECHNICALLY RESOLVABLE** |
| **Requires PO** | No — frontend decision |
| **Requires Legal** | No |
| **Blocks PROMPT 71** | No — affects PROMPT 75 only |
| **Justification** | The Observador requires complete traceability. Status changes are important events that must be recorded. Users can filter if the timeline is too long. |
| **Dependencies** | None |
| **Risk** | None |
| **Code Impact** | Frontend components only (PROMPT 75) |

---

## 5. FINAL DECISION STATUS

| ID | Decision | Final Status | Blocks PROMPT 71? |
|----|----------|-------------|-------------------|
| D01 | Student visibility | **REQUIRES PO** | YES |
| D02 | Parent access to confidential | **REQUIRES PO + LEGAL** | YES |
| D03 | Who creates CONVIVENCIA | **REQUIRES PO** | YES |
| D04 | Signatures on commitments | **CLOSED** | No |
| D05 | Institution transfer | **DEFERRED** | No |
| D06 | Reopening closed records | **CLOSED** | No |
| D07 | SUPER_ADMIN access | **CLOSED** | No |
| D08 | Attendance tracking | **CLOSED** | No |
| D09 | MVP record types | **REQUIRES PO** | YES |
| D10 | Notification preferences | **CLOSED** | No |
| D11 | Form UX | **CLOSED** | No |
| D12 | Timeline commitment status | **CLOSED** | No |

### Summary

- **CLOSED (technically resolvable):** D04, D06, D07, D08, D10, D11, D12 — 7 decisions
- **REQUIRES PO:** D01, D03, D09 — 3 decisions
- **REQUIRES PO + LEGAL:** D02 — 1 decision
- **DEFERRED:** D05 — 1 decision

**Total blocking decisions: 4 (D01, D02, D03, D09)**

---

## 6. PO DECISIONS REQUIRED

### 6.1 Decisions That Need Explicit PO Approval

| ID | Decision | What PO Must Say |
|----|----------|-----------------|
| D01 | Student visibility | "Students can see records at PUBLIC and INTERNAL confidentiality levels, but NOT CONFIDENTIAL or SENSITIVE" |
| D02 | Parent access | "Parents can see records at PUBLIC and INTERNAL confidentiality levels, but NOT CONFIDENTIAL or SENSITIVE" |
| D03 | CONVIVENCIA creation | "Teachers AND admins can create CONVIVENCIA records for assigned students" |
| D09 | MVP record types | "The MVP will include only ACADEMICO, CONVIVENCIA, and FORMATIVO types" |

### 6.2 Decisions That Can Be Inferred

| ID | Decision | Basis for Inference |
|----|----------|-------------------|
| D05 | Institution transfer | Existing documentation consistently recommends deferral |
| D06 | Reopening | Existing documentation consistently recommends admin-only |
| D07 | SUPER_ADMIN | Existing documentation consistently recommends no access |
| D08 | Attendance | Existing documentation consistently recommends exclusion |

### 6.3 Recommendation

**Before PROMPT 71 can start, the PO must explicitly confirm:**

1. D01: Student sees PUBLIC + INTERNAL only
2. D02: Parent sees PUBLIC + INTERNAL only
3. D03: Teacher + Admin create CONVIVENCIA
4. D09: MVP types are ACADEMICO, CONVIVENCIA, FORMATIVO

Without these confirmations, the schema, authorization, and confidentiality filters cannot be implemented.

---

## 7. LEGAL/PRIVACY DECISIONS REQUIRED

### 7.1 Legal Questions Identified

| ID | Question | Related Decision | Impact |
|----|----------|-----------------|--------|
| L01 | Can parents access CONFIDENTIAL records? | D02 | Confidentiality filter design |
| L02 | Can students access their own CONFIDENTIAL records? | D01 | Confidentiality filter design |
| L03 | What are the implications of Ley 1581/2012 for student follow-up data? | D05 | Data handling, retention, transfer |
| L04 | Is consent required for creating follow-up records? | General | Record creation workflow |
| L05 | Must students be notified when records are created? | General | Notification requirements |
| L06 | What are the retention requirements for student follow-up data? | General | Data lifecycle |

### 7.2 Legal vs. Product

| Question Type | Examples | Action |
|---------------|----------|--------|
| **LEGAL QUESTION** | "Is counseling data protected by professional secrecy?" | Requires lawyer input |
| **PRODUCT DECISION** | "Should parents see CONFIDENTIAL records?" | PO decides based on legal input |

### 7.3 Recommendation

The PO should consult with legal counsel on questions L01-L06 before finalizing D01 and D02. However, the technical recommendation (PUBLIC + INTERNAL only for parents and students) is conservative and protective, which is the safer default.

---

## 8. ROLE CAPABILITY MATRIX

### 8.1 Complete Capability Matrix

| Capability | SUPER_ADMIN | INSTITUTION_ADMIN | TEACHER | PARENT | STUDENT |
|------------|------------|-------------------|---------|--------|---------|
| **discover** (knows record exists) | NO | YES | YES (own students) | YES (own children) | YES (own records) |
| **list** (see record titles) | NO | YES | YES (own students) | YES* (PUBLIC+INTERNAL) | YES* (PUBLIC+INTERNAL) |
| **read** (open full detail) | NO | YES | YES (own students) | YES* (PUBLIC+INTERNAL) | YES* (PUBLIC+INTERNAL) |
| **create** (new record) | NO | YES | YES (own students) | NO | NO |
| **update** (modify record) | NO | YES | YES (own created) | NO | NO |
| **follow-up** (add entry) | NO | YES | YES | NO | NO |
| **commit** (create commitment) | NO | YES | YES | NO | NO |
| **attach** (upload evidence) | NO | YES | YES | YES (own records) | NO |
| **escalate** | NO | YES | YES | NO | NO |
| **resolve** | NO | YES | NO | NO | NO |
| **close** | NO | YES | NO | NO | NO |
| **reopen** | NO | YES (with audit) | NO | NO | NO |
| **stats** (view statistics) | NO | YES | YES (own students) | NO | NO |
| **categories** (manage) | NO | YES | NO | NO | NO |
| **sign** (sign commitment) | NO | YES | YES | YES | NO |

\* = filtered by confidentiality level

### 8.2 RBAC vs. Resource-Level vs. Confidentiality

**Three layers of authorization:**

```
Layer 1: RBAC (PermissionGuard)
  → Does the user have the permission code?
  → Example: TEACHER has student-follow-ups:create

Layer 2: Resource-Level Authorization (Service layer)
  → Is the user related to this specific student?
  → Example: Teacher → TeacherAssignment → Enrollment → Student

Layer 3: Confidentiality (Service layer)
  → Can the user see this confidentiality level?
  → Example: Parent cannot see CONFIDENTIAL records
```

**All three layers must pass for access to be granted.**

---

## 9. RESOURCE-LEVEL AUTHORIZATION MATRIX

### 9.1 Authorization Rules

| Actor | Relationship | Resolution Method | Code Reference |
|-------|-------------|-------------------|----------------|
| **INSTITUTION_ADMIN** | institution scope | `institutionId` from TenantContextGuard | `req.tenant.institutionId` |
| **TEACHER** | TeacherAssignment → Enrollment → Student | Query: `teacherAssignment WHERE teacherUserId = :userId AND courseId = :courseId` → `enrollment WHERE courseId = :courseId` → `student` | `TasksService.validateTeacherAuthorization()` (currently unused) |
| **PARENT** | GuardianStudent → Student | Query: `guardianStudent WHERE guardianUserId = :userId` → `student` | `parent-context.ts:resolveParentContext()` |
| **STUDENT** | Student.userId === currentUserId | Query: `student WHERE userId = :currentUserId` | Inline in services |
| **SUPER_ADMIN** | NO ACCESS | Do not assign permissions | N/A |

### 9.2 Relationship Chains

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

### 9.3 Code Patterns

**Existing utility (REUSE):**
```typescript
// parent-context.ts
resolveParentContext(prisma, institutionId, userId) → { isParent, studentIds[] }
findGuardianUserIds(prisma, institutionId, studentIds[]) → string[]
```

**Pattern to follow (from TasksService, GradesService):**
```typescript
// In service.findAll():
const parentCtx = await resolveParentContext(this.prisma, institutionId, userId);
if (parentCtx.isParent) {
  // Filter to only parent's students
}
```

**Teacher authorization pattern (to implement):**
```typescript
// Verify teacher has assignment for the student's course
const hasAssignment = await this.prisma.teacherAssignment.findFirst({
  where: {
    institutionId,
    teacherUserId: userId,
    course: { enrollments: { some: { studentId } } },
  },
});
if (!hasAssignment) throw new ForbiddenException('No relationship with this student');
```

---

## 10. CONFIDENTIALITY MATRIX

### 10.1 Access by Confidentiality Level

| Level | Description | INSTITUTION_ADMIN | TEACHER | PARENT | STUDENT | SUPER_ADMIN |
|-------|-------------|-------------------|---------|--------|---------|-------------|
| **PUBLIC** | Open recognition, awards | ✓ | ✓ | ✓ | ✓ | NO |
| **INTERNAL** | Academic follow-up, institutional | ✓ | ✓ | ✓ | ✓ | NO |
| **CONFIDENTIAL** | Counseling, psychological | ✓ | NO | NO | NO | NO |
| **SENSITIVE** | Family, health, third-party | ✓ (with audit) | NO | NO | NO | NO |

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
- Generic messages only: "Nuevo seguimiento registrado para [student]"

**In exports (future):**
- CONFIDENTIAL and SENSITIVE excluded from parent/student exports
- Admin exports include all records

### 10.3 Minimum Privilege Principle

- Default confidentiality: `INTERNAL`
- Only creators and admins can set `CONFIDENTIAL` or `SENSITIVE`
- Students and parents cannot override confidentiality filters
- Teachers cannot see `CONFIDENTIAL` or `SENSITIVE` records

---

## 11. LIFECYCLE MATRIX

### 11.1 State Definitions

| State | Description | Terminal? |
|-------|-------------|-----------|
| **OPEN** | Record created, awaiting action | No |
| **IN_PROGRESS** | Active follow-up in progress | No |
| **ESCALATED** | Escalated to higher authority | No |
| **PENDING_FOLLOW_UP** | Awaiting response from responsible party | No |
| **RESOLVED** | Issue resolved, pending closure | No |
| **CLOSED** | Case closed, record immutable | Yes |

### 11.2 State Transition Matrix

| From | To | Authorized Actor | Permission Required | Audit Event | Notification | Required |
|------|----|-----------------|--------------------|-----------|------------|----------| 
| — | OPEN | Admin, Teacher | `student-follow-ups:create` | FOLLOW_UP_CREATED | Director de grupo | Description in entry |
| OPEN | IN_PROGRESS | Admin, Teacher | `student-follow-ups:update` | FOLLOW_UP_STATUS_CHANGED | — | Action taken |
| OPEN | ESCALATED | Admin, Teacher | `student-follow-ups:escalate` | FOLLOW_UP_ESCALATED | Target role | Escalation reason |
| OPEN | CLOSED | Admin | `student-follow-ups:close` | FOLLOW_UP_CLOSED | All involved | Closure reason |
| IN_PROGRESS | IN_PROGRESS | Admin, Teacher | `student-follow-ups:follow_up` | FOLLOW_UP_ENTRY_ADDED | — | Entry description |
| IN_PROGRESS | ESCALATED | Admin, Teacher | `student-follow-ups:escalate` | FOLLOW_UP_ESCALATED | Target role | Escalation reason |
| IN_PROGRESS | PENDING_FOLLOW_UP | Admin | `student-follow-ups:update` | FOLLOW_UP_STATUS_CHANGED | Responsible party | — |
| IN_PROGRESS | RESOLVED | Admin | `student-follow-ups:update` | FOLLOW_UP_STATUS_CHANGED | — | Resolution notes |
| IN_PROGRESS | CLOSED | Admin | `student-follow-ups:close` | FOLLOW_UP_CLOSED | All involved | Closure reason |
| ESCALATED | IN_PROGRESS | Admin | `student-follow-ups:update` | FOLLOW_UP_STATUS_CHANGED | — | Reassignment |
| ESCALATED | CLOSED | Admin | `student-follow-ups:close` | FOLLOW_UP_CLOSED | All involved | Closure reason |
| PENDING_FOLLOW_UP | IN_PROGRESS | Admin, Teacher | `student-follow-ups:update` | FOLLOW_UP_STATUS_CHANGED | — | Response received |
| PENDING_FOLLOW_UP | CLOSED | Admin | `student-follow-ups:close` | FOLLOW_UP_CLOSED | All involved | Closure reason |
| RESOLVED | CLOSED | Admin | `student-follow-ups:close` | FOLLOW_UP_CLOSED | All involved | Closure reason |
| CLOSED | OPEN | Admin | `student-follow-ups:manage` | FOLLOW_UP_REOPENED | All involved | Reopen justification |

### 11.3 Closed Record Immutability

Once CLOSED:
- No new follow-up entries can be added
- No commitments can be created
- No modifications allowed
- Record becomes read-only
- Only viewing and export permitted
- Reopening: Only by INSTITUTION_ADMIN with audit trail

### 11.4 Notification on Transitions

| Transition | Notification Recipients |
|-----------|------------------------|
| Created | Director de grupo, Coordinador (if configured) |
| Escalated | Target role/person |
| Closed | All involved parties, parents (if applicable) |
| Reopened | All involved parties |

---

## 12. COMMITMENT RULES

### 12.1 Commitment Lifecycle

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | PK | Primary key |
| `institutionId` | UUID | FK | Tenant scope |
| `studentFollowUpId` | UUID | FK | Parent record |
| `description` | Text | Required | What was agreed |
| `responsibleRole` | Enum | Required | STUDENT, PARENT, TEACHER, INSTITUTION |
| `responsibleUserId` | UUID? | Optional | Specific person responsible |
| `deadline` | DateTime | Required | When it should be completed |
| `status` | Enum | Required | PENDING, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED |
| `completedAt` | DateTime? | Optional | When completed |
| `completionNotes` | Text? | Optional | Notes on completion |
| `createdByUserId` | UUID | FK | Who created |
| `requestSignature` | Boolean | Default false | Whether signature is required |
| `signatureRequestId` | UUID? | FK | Optional signature request |

### 12.2 Commitment States

| State | Description |
|-------|-------------|
| **PENDING** | Not yet started |
| **IN_PROGRESS** | Work in progress |
| **COMPLETED** | Finished successfully |
| **OVERDUE** | Past deadline, not completed |
| **CANCELLED** | No longer required |

### 12.3 Commitment Rules

1. **Who creates**: Admin or Teacher (with `student-follow-ups:commit` permission)
2. **Who is responsible**: STUDENT, PARENT, TEACHER, or INSTITUTION (role-based)
3. **Deadline**: Must be in the future at creation
4. **Completion**: Responsible party or admin can mark as completed
5. **Overdue**: System automatically marks as OVERDUE when deadline passes
6. **Cancellation**: Admin can cancel with reason

### 12.4 Commitment Notifications

| Event | Recipients |
|-------|-----------|
| Created | Responsible party |
| Approaching deadline (3 days) | Responsible party |
| Overdue | Responsible party + teacher |
| Completed | Teacher + admin |

---

## 13. SIGNATURE RULES

### 13.1 MVP Approach

- **OPTIONAL** in MVP (D04)
- Commitment can exist without signature
- Signature integration via existing `SignatureRequest`

### 13.2 When Signatures Are Created

| Trigger | Condition | Recipients |
|---------|-----------|-----------|
| Commitment creation | `requestSignature = true` | Responsible party + creator |

### 13.3 Signature Lifecycle

1. Admin/Teacher creates commitment with `requestSignature = true`
2. System creates `SignatureRequest` with title "Compromiso: [description]"
3. System adds `SignatureRecipient` for responsible party
4. Responsible party signs or declines
5. If all sign: commitment status → IN_PROGRESS
6. If any decline: commitment status → CANCELLED

### 13.4 Signature Rules (MVP)

1. **Who requests**: Admin or Teacher (with `student-follow-ups:commit` permission)
2. **Who signs**: Assigned recipient only
3. **Can decline**: Yes, with reason
4. **On decline**: Commitment cancelled, all parties notified
5. **On complete**: All signed → commitment progresses

---

## 14. ATTACHMENT RULES

### 14.1 MVP Approach

- Reuse existing `FileAsset` model
- Create `FollowUpAttachment` join table
- Upload via existing `FilesService`

### 14.2 Attachment Rules

| Rule | Value |
|------|-------|
| Max file size | 10MB (institution-configurable) |
| Allowed MIME types | PDF, PNG, JPEG, WebP, TXT, Word, Excel, PowerPoint |
| Who can upload | Admin, Teacher, Parent (own records only) |
| Who can download | Users with access to the record |
| Who can remove | Admin, uploader |
| Remove means | Unlink only (FileAsset preserved for audit) |

### 14.3 Attachment Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | PK | Primary key |
| `institutionId` | UUID | FK | Tenant scope |
| `studentFollowUpId` | UUID | FK | Parent record |
| `fileAssetId` | UUID | FK | The file |
| `description` | String(500)? | Optional | Context for the file |
| `createdByUserId` | UUID | FK | Who uploaded |
| `createdAt` | DateTime | Auto | When uploaded |

### 14.4 Attachment Audit

| Event | Data |
|-------|------|
| FOLLOW_UP_ATTACHMENT_ADDED | fileAssetId, fileName, mimeType, sizeBytes, uploadedByUserId |

---

## 15. NOTIFICATION RULES

### 15.1 MVP Events

| Event | Recipients | Message Template | Priority |
|-------|-----------|-----------------|----------|
| Record created | Director de grupo (if configured) | "Nuevo seguimiento registrado para [student]" | Normal |
| Record escalated | Target role/person | "Seguimiento escalado: [title]" | High |
| Commitment created | Responsible party | "Nuevo compromiso: [description]" | Normal |
| Commitment approaching deadline | Responsible party | "Compromiso próximo a vencer: [description]" | High |
| Commitment overdue | Responsible party + teacher | "Compromiso vencido: [description]" | High |
| Record closed | All involved parties | "Caso cerrado: [title]" | Normal |
| Record reopened | All involved parties | "Caso reabierto: [title]" | High |

### 15.2 Privacy-Aware Messages

- **Never** reveal sensitive information in notifications
- **Never** include CONFIDENTIAL or SENSITIVE content in titles/messages
- **Always** use generic messages: "Nuevo seguimiento registrado para [student]"
- **Never** include details about the nature of the issue

### 15.3 Notification Pattern

```typescript
// Reuse existing pattern from GradesService
const guardianIds = await findGuardianUserIds(this.prisma, institutionId, [studentId]);
for (const guardianId of guardianIds) {
  await this.prisma.notification.create({
    data: {
      institutionId,
      userId: guardianId,
      type: 'GENERAL',
      title: 'Nuevo seguimiento registrado',
      message: `Se ha registrado un seguimiento para el estudiante ${studentName}`,
      entityType: 'StudentFollowUp',
      entityId: followUp.id,
    },
  });
}
```

---

## 16. AUDIT RULES

### 16.1 Required Audit Events

| Event | Description | Data Captured | Required |
|-------|-------------|---------------|----------|
| FOLLOW_UP_CREATED | New record created | Record snapshot | YES |
| FOLLOW_UP_UPDATED | Record modified | Old + new values | YES |
| FOLLOW_UP_STATUS_CHANGED | Status transition | Old + new status | YES |
| FOLLOW_UP_CLOSED | Case closed | Closure details | YES |
| FOLLOW_UP_REOPENED | Case reopened | Reopen justification | YES |
| FOLLOW_UP_ENTRY_ADDED | Follow-up entry created | Entry snapshot | YES |
| COMMITMENT_CREATED | Commitment created | Commitment snapshot | YES |
| COMMITMENT_COMPLETED | Commitment completed | Completion details | YES |
| COMMITMENT_OVERDUE | Commitment passed deadline | Deadline info | YES |
| FOLLOW_UP_ATTACHMENT_ADDED | File attached | File metadata | YES |
| FOLLOW_UP_ACCESSED | Record viewed (CONFIDENTIAL/SENSITIVE) | Viewer, timestamp | YES |
| FOLLOW_UP_ESCALATED | Record escalated | Escalation target | YES |

### 16.2 Audit Log Structure

Uses existing `AuditLog` model:
- `userId` — who performed the action
- `institutionId` — tenant scope
- `action` — event type (e.g., `FOLLOW_UP_CREATED`)
- `entityType` — `StudentFollowUp`, `FollowUpEntry`, `Commitment`
- `entityId` — the specific record
- `oldValues` — previous state (for updates)
- `newValues` — new state
- `ipAddress` — request origin

### 16.3 Immutability

- AuditLog records are append-only (no update, no delete)
- FollowUpEntry records are immutable after creation
- Commitment status changes are logged, not overwritten
- CLOSED records cannot be modified

---

## 17. CATEGORY RULES

### 17.1 Category Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | PK | Primary key |
| `institutionId` | UUID | FK | Tenant scope |
| `type` | FollowUpType | Required | ACADEMICO, CONVIVENCIA, FORMATIVO |
| `name` | String(100) | Required | Display name |
| `code` | String(50) | Required | Unique code within institution |
| `sortOrder` | Int | Default 0 | Display order |
| `isActive` | Boolean | Default true | Active/inactive |
| `createdAt` | DateTime | Auto | Creation timestamp |

### 17.2 Category Rules

| Rule | Value |
|------|-------|
| Scope | Per institution (`institutionId`) |
| Who creates | INSTITUTION_ADMIN only |
| Who modifies | INSTITUTION_ADMIN only |
| Who deactivates | INSTITUTION_ADMIN only |
| Can delete | Only if not used by any record |
| History preserved | Yes (isActive = false) |
| Required | Yes (every record must have a category) |
| Different per type | Yes (categories are typed) |

### 17.3 Default Categories (Seed)

**ACADEMICO:**
- Bajo desempeño
- Excelente desempeño
- Necesidad de apoyo
- Seguimiento académico

**CONVIVENCIA:**
- Comportamiento inapropiado
- Conflicto entre pares
- Situación de riesgo
- Seguimiento convivencial

**FORMATIVO:**
- Desarrollo socioemocional
- Hábitos de estudio
- Seguimiento formativo
- Refuerzo positivo

---

## 18. EXPLICIT MVP SCOPE

### 18.1 INCLUDED in MVP

**Entities:**
- StudentFollowUp (CRUD)
- FollowUpEntry (create, read)
- Commitment (create, update, complete)
- FollowUpAttachment (create, read, delete)
- FollowUpCategory (CRUD by admin)

**Record Types:**
- ACADEMICO
- CONVIVENCIA
- FORMATIVO

**States:**
- OPEN, IN_PROGRESS, ESCALATED, PENDING_FOLLOW_UP, RESOLVED, CLOSED

**Features:**
- StudentFollowUp CRUD (create, read, update, close)
- Follow-up entries (add, view)
- Commitments (create, complete, cancel)
- File attachment (evidence)
- Role-based access (Admin, Teacher, Parent, Student)
- Resource-level authorization (Teacher → students, Parent → children, Student → self)
- Status lifecycle (6 states)
- Severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- Confidentiality levels (PUBLIC, INTERNAL, CONFIDENTIAL, SENSITIVE)
- Audit trail (AuditLog integration)
- Notifications (on create, escalation, commitment, closure)
- Institution-scoped categories (admin configurable)
- List view with filters
- Detail view with timeline
- Form wizard for creation

### 18.2 DEFERRED to Future Phases

| Feature | Phase | Reason |
|---------|-------|--------|
| ASISTENCIA, ORIENTACION, RECONOCIMIENTO types | Phase 2.1 | Not core MVP |
| Configurable templates | Phase 2.2 | Nice-to-have |
| Signature integration | Phase 2.3 | Optional, can add later |
| Agenda integration | Phase 2.4 | Nice-to-have |
| Dashboard KPIs | Phase 2.5 | Analytics, not core |
| Reporting / export | Phase 2.6 | Future feature |
| Institution transfer | Phase 2.5+ | Complex, legal |
| Retention policies | Phase 3 | Legal requirements |
| Advanced analytics | Phase 3 | Future feature |
| Attendance tracking | Separate module | Different scope |

---

## 19. EXPLICIT OUT-OF-SCOPE

The following are explicitly OUT OF SCOPE for the Observador del Alumno MVP:

1. **Attendance tracking** — separate module
2. **Institution transfer** — Phase 2.5+
3. **Configurable templates** — Phase 2.2
4. **Signature integration** — Phase 2.3 (optional flag only)
5. **Agenda integration** — Phase 2.4
6. **Dashboard KPIs** — Phase 2.5
7. **Reporting / export** — Phase 2.6
8. **Retention policies** — Phase 3
9. **Advanced analytics** — Phase 3
10. **AI/ML features** — not in scope
11. **New roles** (COORDINATOR, COUNSELOR) — use custom roles
12. **Internationalization** — Spanish only in MVP
13. **Mobile app** — responsive web only
14. **Offline mode** — not in scope
15. **Bulk operations** — not in MVP

---

## 20. OPEN QUESTIONS

| ID | Question | Impact | Blocks PROMPT 71? |
|----|----------|--------|-------------------|
| Q01 | Has Colombian data protection law (Ley 1581/2012) been reviewed? | Privacy model | Yes (D02) |
| Q02 | Do participating institutions have existing "Observador" policies? | Workflow design | No |
| Q03 | Have teachers been consulted on the proposed workflow? | UX design | No |
| Q04 | Is "Observador del Alumno" the final user-facing name? | UI text | No |
| Q05 | Is mobile access a requirement for the MVP? | Frontend scope | No |
| Q06 | What is the expected volume of records per student? | Performance | No |
| Q07 | Should DRAFT state be included for record review before publishing? | Lifecycle | No |

---

## 21. RISK REGISTER

| ID | Risk | Probability | Impact | Severity | Mitigation | Owner | Blocks P71? |
|----|------|------------|--------|----------|------------|-------|-------------|
| R01 | Privacy violation via data exposure | Low | Critical | CRITICAL | Confidentiality field + strict access rules + audit | Dev + PO | No |
| R02 | Overexposure to parents | Medium | High | HIGH | Confidentiality-based access restriction | Dev + PO | No |
| R03 | Overexposure to teachers | Medium | High | HIGH | Resource-level authorization + confidentiality | Dev | No |
| R04 | SUPER_ADMIN data access | Low | Critical | CRITICAL | Do not assign permissions | Dev | No |
| R05 | Cross-tenant data leakage | Low | Critical | CRITICAL | TenantContextGuard + institutionId on every query | Dev | No |
| R06 | Resource-level authorization bypass | Medium | High | HIGH | TeacherAssignment → Enrollment → Student verification | Dev | No |
| R07 | Lifecycle inconsistency | Low | Medium | MEDIUM | Formal state machine documentation | Dev | No |
| R08 | Audit incompleteness | Low | High | HIGH | Require audit on all mutations | Dev | No |
| R09 | Attachment leakage | Low | Medium | MEDIUM | Tenant-scoped file access | Dev | No |
| R10 | Signature semantics confusion | Low | Low | LOW | Optional in MVP, clear documentation | Dev | No |
| R11 | Institution transfer data breach | Low | Critical | CRITICAL | Defer to Phase 2.5+ | PO | No |
| R12 | Legal retention/deletion conflicts | Medium | High | HIGH | Conservative approach, no auto-deletion | PO + Legal | No |
| R13 | Scope creep delays Cloud Staging | High | High | HIGH | Defer to Phase 2, don't block Cloud | PO | No |
| R14 | Module becomes catch-all | Medium | Medium | MEDIUM | Clear scope: educational follow-up only | PO | No |
| R15 | Performance with large datasets | Low | Medium | MEDIUM | Proper indexing + pagination | Dev | No |

---

## 22. PROMPT 71 ENTRY CRITERIA

### PROMPT 71 may initiate ONLY when ALL of the following are true:

| # | Criterion | Type | Owner |
|---|-----------|------|-------|
| 1 | D01: Student visibility PO-approved | BLOCKER | PO |
| 2 | D02: Parent access PO-approved | BLOCKER | PO |
| 3 | D03: CONVIVENCIA creation PO-approved | BLOCKER | PO |
| 4 | D05: Institution transfer deferred (confirmed) | BLOCKER | PO |
| 5 | D07: SUPER_ADMIN access confirmed (no access) | BLOCKER | PO |
| 6 | D09: MVP record types PO-approved | BLOCKER | PO |
| 7 | D08: Attendance excluded (confirmed) | BLOCKER | PO |
| 8 | Legal questions L01-L06 identified | NON-BLOCKING | Legal |
| 9 | MVP scope approved | BLOCKER | PO |
| 10 | Confidentiality levels approved | BLOCKER | PO |
| 11 | Lifecycle states approved | BLOCKER | PO |
| 12 | Authorization model approved | BLOCKER | PO |
| 13 | Cloud Staging (FASE 1.9) completed | BLOCKER | Dev |

### Non-Blocking Follow-Ups (can proceed in parallel):

- Legal review of L01-L06
- Teacher user research
- Naming confirmation (Q04)
- Mobile requirement confirmation (Q05)
- Volume expectations (Q06)

---

## 23. ROADMAP PROMPTS 71-76

### 23.1 Prompt Sequence

| Prompt | Name | Dependencies | Estimated Effort | Deliverables |
|--------|------|-------------|-----------------|--------------|
| 71 | Domain Model / Prisma Schema | 70-B (PO decisions) | Small | Enums, models, relations, migration, seed |
| 72 | RBAC + Resource-Level Authorization | 71 | Medium | Permission codes, role mapping, authorization service, guards |
| 73 | Backend CRUD | 72 | Large | Controller, service, DTOs, validation, tests |
| 74 | Follow-ups + Commitments + Lifecycle | 73 | Medium-Large | FollowUpEntry CRUD, Commitment CRUD, status transitions, notifications |
| 75 | Frontend | 74 | Large | Module structure, list, detail, timeline, form wizard, tests |
| 76 | E2E + Security + Acceptance | 75 | Medium | Playwright tests, security validation, documentation |

### 23.2 Phase Placement

```
FASE 1.9 — Cloud Staging
    │
    ▼
FASE 2 — Observador del Alumno
    │
    ├── PROMPT 70: Discovery (COMPLETED)
    ├── PROMPT 70-A: Product Review (COMPLETED)
    ├── PROMPT 70-B: Decision Closure (THIS DOCUMENT)
    ├── PROMPT 71: Domain Model / Prisma Schema
    ├── PROMPT 72: RBAC + Resource-Level Authorization
    ├── PROMPT 73: Backend CRUD
    ├── PROMPT 74: Follow-ups + Commitments + Lifecycle
    ├── PROMPT 75: Frontend
    └── PROMPT 76: E2E + Security + Acceptance
    │
    ▼
FASE 2.5 — Integrations (Signatures, Agenda, Dashboard)
    │
    ▼
FASE 3 — Reporting + Analytics + Transfer
```

### 23.3 Key Principle

**Cloud Staging (FASE 1.9) must complete BEFORE Observador implementation begins.**

---

## 24. RECOMMENDED IMPLEMENTATION SEQUENCE

### PROMPT 71: Domain Model / Prisma Schema

**Scope:**
- 7 new enums (FollowUpType, FollowUpSeverity, FollowUpStatus, FollowUpConfidentiality, FollowUpEntryType, CommitmentStatus, CommitmentResponsibleRole)
- 5 new models (StudentFollowUp, FollowUpEntry, Commitment, FollowUpAttachment, FollowUpCategory)
- Relations to existing models (Student, User, Institution, FileAsset, SignatureRequest)
- Database migration
- Seed data (default categories)

**Validation:**
- Schema compiles
- Migration runs successfully
- Seed data populates correctly
- Relations are correct

### PROMPT 72: RBAC + Resource-Level Authorization

**Scope:**
- 11 new permission codes
- Role mapping (which permissions for which roles)
- Authorization service extension
- Resource-level authorization (Teacher, Parent, Student)
- Backend permission guard tests

**Validation:**
- Permission guard tests pass
- Resource-level authorization tests pass
- Tenant isolation tests pass

### PROMPT 73: Backend CRUD

**Scope:**
- StudentFollowUpsController
- StudentFollowUpsService
- DTOs + validation
- CRUD operations
- Status lifecycle
- Audit trail
- Unit tests

**Validation:**
- Backend tests pass
- ESLint 0 errors
- TypeScript strict mode

### PROMPT 74: Follow-ups + Commitments + Lifecycle

**Scope:**
- FollowUpEntry CRUD
- Commitment CRUD
- Status transitions
- Notifications fan-out
- File attachment
- Unit tests

**Validation:**
- Backend tests pass
- Notification tests pass
- File attachment tests pass

### PROMPT 75: Frontend

**Scope:**
- Module structure
- List page with filters
- Detail page with timeline
- Form wizard
- PermissionGate integration
- ChildSelector integration
- Component tests

**Validation:**
- Frontend tests pass
- ESLint 0 errors
- Responsive design
- Accessibility

### PROMPT 76: E2E + Security + Acceptance

**Scope:**
- Playwright E2E tests
- Security validation
- Cross-tenant tests
- Performance validation
- Documentation
- Release candidate

**Validation:**
- E2E tests pass
- Security audit clean
- Documentation complete

---

## 25. DEFINITION OF DONE FOR THE MODULE

### Backend

- [ ] Schema validated and migrated
- [ ] Seed data populated
- [ ] CRUD operations working
- [ ] Resource-level authorization implemented
- [ ] Tenant isolation verified
- [ ] Confidentiality filtering implemented
- [ ] Lifecycle transitions working
- [ ] Commitments working
- [ ] Attachments working
- [ ] Notifications working
- [ ] Audit trail complete
- [ ] Unit tests passing (100+)
- [ ] Integration tests passing
- [ ] ESLint 0 errors
- [ ] TypeScript strict mode

### Frontend

- [ ] List page with filters
- [ ] Detail page with timeline
- [ ] Create form (wizard)
- [ ] Edit form
- [ ] Follow-up entry form
- [ ] Commitment form
- [ ] Attachment upload
- [ ] PermissionGate integration
- [ ] ChildSelector integration
- [ ] Responsive design
- [ ] Accessibility
- [ ] Component tests passing (30+)
- [ ] ESLint 0 errors

### Testing

- [ ] Unit tests (backend + frontend)
- [ ] Integration tests (backend)
- [ ] E2E tests (8+ scenarios)
- [ ] RBAC tests (all roles)
- [ ] IDOR/BOLA tests
- [ ] Tenant isolation tests
- [ ] Confidentiality tests
- [ ] Parent filtering tests
- [ ] Teacher filtering tests
- [ ] Student own-record filtering tests

### Documentation

- [ ] API documentation (Swagger)
- [ ] User guide
- [ ] Admin guide
- [ ] Technical documentation

---

## 26. IMPLEMENTATION RULES

### 26.1 Architecture Rules

1. `institutionId` MUST come from `TenantContextGuard`, NOT from DTO
2. Tenant context MUST come from `X-Institution-Id` header
3. RBAC does NOT replace resource-level authorization
4. Frontend permissions are UX only; backend is the authority
5. Never trust frontend for security
6. Parent access MUST be filtered by `GuardianStudent`
7. Teacher access MUST be filtered by `TeacherAssignment → Enrollment → Student`
8. Student access MUST be filtered by `Student.userId`
9. SUPER_ADMIN MUST NOT get automatic access
10. CONFIDENTIAL/SENSITIVE MUST have explicit rules
11. All mutations MUST be audited
12. Reuse `FileAsset` for attachments
13. Reuse `SignatureRequest` for signatures
14. Reuse `Notification` for notifications
15. Reuse `AuditLog` for audit trail
16. Do not duplicate existing infrastructure
17. Do not introduce Attendance in MVP
18. Do not introduce institution transfer in MVP
19. Do not introduce AI in this module MVP
20. Do not introduce advanced analytics in this module MVP

### 26.2 Code Pattern Rules

1. Follow existing controller pattern: `@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)`
2. Follow existing service pattern: inject `PrismaService` and `AuditService`
3. Follow existing DTO pattern: `class-validator` + `@nestjs/swagger`
4. Follow existing test pattern: Jest for backend, Vitest for frontend
5. Follow existing naming conventions: `student-follow-ups` (kebab-case)
6. Follow existing file structure: `modules/student-follow-ups/`

---

## 27. ARCHITECTURAL GAPS

### 27.1 Gaps Found During Codebase Review

| Gap | Description | Impact | Resolution |
|-----|-------------|--------|------------|
| AG01 | `StudentsService` does not use `resolveParentContext()` from parent-context.ts — it does its own inline queries | Inconsistency | New module should use shared utility |
| AG02 | `TasksService.validateTeacherAuthorization()` exists but is never called | Dead code | New module should implement proper teacher auth |
| AG03 | Notifications created inline in `GradesService` and `TaskAssignmentsService` bypass `NotificationsService` | Inconsistency | New module should use consistent pattern |
| AG04 | No `ListStudentsQueryDto` enum validation for `status` field | Missing validation | New DTOs should include proper enum validation |

### 27.2 Recommendations

1. **AG01**: Use `resolveParentContext()` from parent-context.ts consistently
2. **AG02**: Implement teacher authorization properly in new module
3. **AG03**: Use `prisma.notification.create()` directly (matching existing pattern) rather than `NotificationsService`
4. **AG04**: Include proper enum validation in all DTOs

---

## 28. FINAL RECOMMENDATION

### The Observador del Alumno is ready for decision closure, but BLOCKED by 4 PO decisions.

**What is closed (7 decisions):**
- D04: Signatures — optional
- D05: Transfer — deferred
- D06: Reopening — admin only
- D07: SUPER_ADMIN — no access
- D08: Attendance — excluded
- D10: Notifications — reuse global
- D11: Form UX — wizard
- D12: Timeline — complete

**What needs PO approval (4 decisions):**
- D01: Student visibility (PUBLIC + INTERNAL only)
- D02: Parent access (PUBLIC + INTERNAL only)
- D03: CONVIVENCIA creation (Teacher + Admin)
- D09: MVP record types (Core 3)

**What needs legal review (3 questions):**
- L01: Parent access to CONFIDENTIAL records
- L02: Student access to CONFIDENTIAL records
- L03: Ley 1581/2012 implications

**Recommended next steps:**
1. **PO resolves D01, D02, D03, D09** — explicitly confirms the recommendations
2. **Legal reviews L01-L03** — provides input on privacy questions
3. **Cloud Staging (FASE 1.9) proceeds** — completes before FASE 2
4. **PROMPT 71 initiates** — after all blockers resolved

**The module is architecturally sound, technically feasible, and productively valuable. It should be implemented after Cloud Staging, following the 6-prompt roadmap defined in this document.**

---

## VALIDATION CHECKLIST

- [x] Discovery leído
- [x] Product review leído
- [x] D01-D12 revisadas
- [x] Estados finales asignados
- [x] PO decisions identificadas
- [x] Legal decisions identificadas
- [x] Scope MVP explícito
- [x] Out-of-scope explícito
- [x] Role matrix
- [x] Resource authorization matrix
- [x] Confidentiality matrix
- [x] Lifecycle matrix
- [x] Commitment rules
- [x] Signature rules
- [x] Attachment rules
- [x] Notification rules
- [x] Audit rules
- [x] Category rules
- [x] Risk register
- [x] Prompt 71 entry criteria
- [x] Roadmap 71-76
- [x] Definition of Done
- [x] Compatibilidad arquitectónica revisada
- [x] No se modificó código
- [x] No se implementó PROMPT 71

---

*Document generated by PROMPT 70-B — Product Owner Decision Closure + MVP Scope Baseline. No functional code was modified.*
