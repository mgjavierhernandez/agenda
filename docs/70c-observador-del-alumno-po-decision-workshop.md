# PROMPT 70-C — PRODUCT OWNER DECISION WORKSHOP + D01-D09 FORMAL CLOSURE
## OBSERVADOR DEL ALUMNO — AGENDA ESCOLAR DIGITAL

**Date:** 2026-08-27
**Status:** DECISION WORKSHOP — PENDING PO DECISIONS
**Version:** 1.0.0
**Scope:** Formal decision closure for D01-D09, MVP baseline confirmation

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Decisions Reviewed](#2-decisions-reviewed)
3. [D01 Final Decision](#3-d01-final-decision)
4. [D02 Final Decision](#4-d02-final-decision)
5. [D03 Final Decision](#5-d03-final-decision)
6. [D09 Final Decision](#6-d09-final-decision)
7. [Legal / Privacy Questions](#7-legal--privacy-questions)
8. [Final Role Matrix](#8-final-role-matrix)
9. [Resource-Level Authorization](#9-resource-level-authorization)
10. [Confidentiality Matrix](#10-confidentiality-matrix)
11. [Creation-by-Type Matrix](#11-creation-by-type-matrix)
12. [Lifecycle Confirmation](#12-lifecycle-confirmation)
13. [Commitment Rules](#13-commitment-rules)
14. [Signature Rules](#14-signature-rules)
15. [Attachment Rules](#15-attachment-rules)
16. [Notification Rules](#16-notification-rules)
17. [Audit Rules](#17-audit-rules)
18. [Category Rules](#18-category-rules)
19. [Data Model Impact](#19-data-model-impact)
20. [RBAC Impact](#20-rbac-impact)
21. [MVP Final Baseline](#21-mvp-final-baseline)
22. [Out-of-Scope](#22-out-of-scope)
23. [Remaining Open Decisions](#23-remaining-open-decisions)
24. [Prompt 71 Entry Criteria](#24-prompt-71-entry-criteria)
25. [Roadmap 71-76](#25-roadmap-71-76)
26. [Risks](#26-risks)
27. [Final Verdict](#27-final-verdict)

---

## 1. EXECUTIVE SUMMARY

This document is the formal Decision Workshop for the "Observador del Alumno" module. Its purpose is to present the 4 remaining open decisions (D01, D02, D03, D09) to the Product Owner for explicit approval, and to establish the final MVP baseline.

### Current Status

| Category | Count | Status |
|----------|-------|--------|
| ALREADY CLOSED (D04-D08, D10-D12) | 8 | No action needed |
| REQUIRES PO APPROVAL (D01, D02, D03, D09) | 4 | BLOCKS PROMPT 71 |
| LEGAL/PRIVACY QUESTIONS (L01-L05) | 5 | Identified, not blocking |

### The 4 Decisions That Block PROMPT 71

| ID | Decision | Recommendation | PO Must Say |
|----|----------|---------------|-------------|
| D01 | Student visibility | PUBLIC + INTERNAL only | "Students see PUBLIC + INTERNAL, not CONFIDENTIAL or SENSITIVE" |
| D02 | Parent access | PUBLIC + INTERNAL only | "Parents see PUBLIC + INTERNAL, not CONFIDENTIAL or SENSITIVE" |
| D03 | CONVIVENCIA creation | Admin + Teacher | "Teachers and Admins can create CONVIVENCIA records" |
| D09 | MVP record types | ACADEMICO + CONVIVENCIA + FORMATIVO | "MVP includes these 3 types" |

### Key Principle

**RECOMMENDED ≠ APPROVED.** Only an explicit response from the Product Owner can convert "REQUIRES PO" to "CLOSED — PO APPROVED."

---

## 2. DECISIONS REVIEWED

### 2.1 Already Closed (No Re-Debate Needed)

| ID | Decision | Final Status | Basis |
|----|----------|-------------|-------|
| D04 | Signatures on commitments | CLOSED | Optional, configurable per institution |
| D05 | Institution transfer | DEFERRED | Out of MVP, Phase 2.5+ |
| D06 | Reopening closed records | CLOSED | Admin only, with audit trail |
| D07 | SUPER_ADMIN access | CLOSED | No access to student data |
| D08 | Attendance tracking | CLOSED | Separate module, out of scope |
| D10 | Notification preferences | CLOSED | Reuse global notification system |
| D11 | Form UX | CLOSED | Wizard (5-6 steps) |
| D12 | Timeline commitment status | CLOSED | Yes, complete timeline |

### 2.2 Require PO Approval

| ID | Decision | Current Status | Recommendation |
|----|----------|---------------|---------------|
| D01 | Student visibility | REQUIRES PO | PUBLIC + INTERNAL only |
| D02 | Parent access to confidential | REQUIRES PO + LEGAL | PUBLIC + INTERNAL only |
| D03 | Who creates CONVIVENCIA | REQUIRES PO | Admin + Teacher |
| D09 | MVP record types | REQUIRES PO | ACADEMICO + CONVIVENCIA + FORMATIVO |

---

## 3. D01 — FINAL DECISION

### Question

**What information from the Observador can the student themselves consult?**

### Current Proposal

The student can see records at PUBLIC and INTERNAL confidentiality levels, but NOT CONFIDENTIAL or SENSITIVE.

### Alternatives

| Option | Description | Consequence |
|--------|-------------|-------------|
| **A. PUBLIC + INTERNAL** | Student sees public and internal records only | Protects counseling/psychological data; student cannot see CONFIDENTIAL records |
| **B. PUBLIC + INTERNAL + CONFIDENTIAL** | Student sees everything except SENSITIVE | Student can see counseling notes; may expose third-party data |
| **C. ALL** | Student sees everything including SENSITIVE | Maximum transparency; high privacy risk; may expose family/health data |
| **D. Other** | PO defines custom policy | Requires explicit description |

### Technical Recommendation

**Option A: PUBLIC + INTERNAL only**

### Justification

1. **Minimization principle**: Only collect and expose what is necessary
2. **Counseling confidentiality**: CONFIDENTIAL records typically contain psychological notes that are confidential between student and counselor
3. **Third-party protection**: SENSITIVE records may contain family/health data about third parties
4. **Existing pattern**: The system already uses confidentiality levels for access control

### Consequences if PO Chooses Option A

- Student can see: academic follow-ups (INTERNAL), recognitions (PUBLIC), formative records (INTERNAL)
- Student cannot see: counseling records (CONFIDENTIAL), family situations (SENSITIVE)
- Service layer must filter: `confidentiality IN ('PUBLIC', 'INTERNAL')` for student queries

### Consequences if PO Chooses Option B

- Student can see everything except SENSITIVE
- Counseling records become visible to student
- May be appropriate if institution wants full transparency

### Consequences if PO Chooses Option C

- Student sees everything
- High privacy risk
- May violate third-party data protection

### PO Decision Required

```
D01 = [PO MUST SELECT: A, B, C, or D]

RECOMMENDATION: A (PUBLIC + INTERNAL only)

STATUS: REQUIRES PO
```

### Legal Note

This decision has privacy implications. The PO should consider consulting legal counsel on student access rights (habeas data) before finalizing.

---

## 4. D02 — FINAL DECISION

### Question

**What confidentiality levels can a parent access for a student linked via GuardianStudent?**

### Current Proposal

The parent can see records at PUBLIC and INTERNAL confidentiality levels, but NOT CONFIDENTIAL or SENSITIVE.

### Alternatives

| Option | Description | Consequence |
|--------|-------------|-------------|
| **A. PUBLIC + INTERNAL** | Parent sees public and internal records only | Protects counseling confidentiality; parent cannot see CONFIDENTIAL records |
| **B. PUBLIC + INTERNAL + CONFIDENTIAL** | Parent sees everything except SENSITIVE | Parent can see counseling notes; may be appropriate for involved parenting |
| **C. ALL** | Parent sees everything | Maximum transparency; high risk of exposing third-party data |
| **D. Other** | PO defines custom policy | Requires explicit description |

### Technical Recommendation

**Option A: PUBLIC + INTERNAL only**

### Justification

1. **Counseling confidentiality**: CONFIDENTIAL records typically contain notes from student-counselor sessions; parent access may violate this relationship
2. **Minimum privilege**: Parents need enough information to participate in education, not full access to all data
3. **Third-party protection**: SENSITIVE records may contain information about other students, family members, or staff
4. **Consistency with D01**: Student and parent visibility should be aligned

### Consequences if PO Chooses Option A

- Parent sees: academic follow-ups (INTERNAL), recognitions (PUBLIC), formative records (INTERNAL)
- Parent does not see: counseling records (CONFIDENTIAL), family situations (SENSITIVE)
- Parent can still attach evidence to records they can access

### Consequences if PO Chooses Option B

- Parent sees everything except SENSITIVE
- Counseling records become visible to parent
- May be appropriate for institutions with strong parent involvement culture

### Consequences if PO Chooses Option C

- Parent sees everything including SENSITIVE
- May expose third-party data (other students, family members)
- High privacy risk

### PO Decision Required

```
D02 = [PO MUST SELECT: A, B, C, or D]

RECOMMENDATION: A (PUBLIC + INTERNAL only)

STATUS: REQUIRES PO + LEGAL VALIDATION
```

### Legal Note

**LEGAL REVIEW REQUIRED.** This decision has implications under Colombian data protection law (Ley 1581/2012). The PO should consult legal counsel on:
- Parent access rights to student data
- Counseling confidentiality obligations
- Third-party data protection

---

## 5. D03 — FINAL DECISION

### Question

**Who can create CONVIVENCIA records?**

### Current Proposal

INSTITUTION_ADMIN + TEACHER (with assigned students via TeacherAssignment).

### Alternatives

| Option | Description | Consequence |
|--------|-------------|-------------|
| **A. Admin + Teacher** | Both roles can create | Distributed reporting; teachers report in real-time |
| **B. Admin only** | Only administrators can create | Centralized control; bottleneck for teachers |
| **C. Admin + Teacher + other** | Include other existing roles | Requires defining which roles |
| **D. Other** | PO defines custom policy | Requires explicit description |

### Technical Recommendation

**Option A: Admin + Teacher**

### Justification

1. **Teacher proximity**: Teachers have direct contact with students and observe situations requiring immediate documentation
2. **Real-time reporting**: Teachers can document incidents as they occur, not after the fact
3. **Existing roles**: No new roles needed; COORDINATOR and COUNSELOR can be custom roles created by Admin
4. **Resource-level auth**: Teacher access is naturally limited to their assigned students via TeacherAssignment

### Important Constraint

**No new roles will be created in the MVP.** If the institution wants COORDINATOR or COUNSELOR roles, they can be created as custom roles by INSTITUTION_ADMIN with appropriate permissions.

### PO Decision Required

```
D03 = [PO MUST SELECT: A, B, C, or D]

RECOMMENDATION: A (Admin + Teacher)

STATUS: REQUIRES PO
```

---

## 6. D09 — FINAL DECISION

### Question

**Which record types should be included in the MVP?**

### Current Proposal

ACADEMICO + CONVIVENCIA + FORMATIVO (Core 3).

### Alternatives

| Option | Description | Consequence |
|--------|-------------|-------------|
| **A. Core 3** | ACADEMICO + CONVIVENCIA + FORMATIVO | Covers 80% of use cases; focused MVP |
| **B. Core 2** | ACADEMICO + CONVIVENCIA | Missing formative tracking |
| **C. Core 2** | ACADEMICO + FORMATIVO | Missing convivencia tracking |
| **D. Other** | PO defines custom set | Requires explicit list |

### Technical Recommendation

**Option A: Core 3 (ACADEMICO + CONVIVENCIA + FORMATIVO)**

### Justification

1. **Comprehensive coverage**: These 3 types cover the vast majority of student follow-up scenarios
2. **Academic**: Low performance, excellent performance, academic support needs
3. **Convivencia**: Behavioral issues, peer conflicts, risk situations
4. **Formative**: Socio-emotional development, study habits, positive reinforcement
5. **Extensibility**: Other types (ASISTENCIA, ORIENTACION, RECONOCIMIENTO) can be added in Phase 2 without restructuring

### PO Decision Required

```
D09 = [PO MUST SELECT: A, B, C, or D]

RECOMMENDATION: A (Core 3)

STATUS: REQUIRES PO
```

---

## 7. LEGAL / PRIVACY QUESTIONS

### 7.1 Questions Identified

| ID | Question | Related Decision | Status |
|----|----------|-----------------|--------|
| L01 | Can a parent access CONFIDENTIAL records? | D02 | REQUIRES LEGAL REVIEW |
| L02 | Can a student access their own CONFIDENTIAL records? | D01 | REQUIRES LEGAL REVIEW |
| L03 | What are the privacy obligations for Observador data (Ley 1581/2012)? | General | REQUIRES LEGAL REVIEW |
| L04 | Should SUPER_ADMIN have exceptional access for operational/support reasons? | D07 | REQUIRES INSTITUTIONAL POLICY |
| L05 | Do schools have internal policies on who can register convivencia/formativa information? | D03 | REQUIRES INSTITUTIONAL POLICY |

### 7.2 Separation: PRODUCT DECISION vs. LEGAL VALIDATION

| Decision Type | Examples | Action |
|---------------|----------|--------|
| **PRODUCT DECISION** | "Parents see PUBLIC + INTERNAL" | PO decides |
| **LEGAL VALIDATION** | "Is this compliant with Ley 1581/2012?" | Lawyer reviews |
| **INSTITUTIONAL POLICY** | "Does the school allow parent access to counseling data?" | School decides |

### 7.3 Important Note

**Legal questions do not necessarily block PROMPT 71.** The technical recommendation (PUBLIC + INTERNAL only for parents and students) is conservative and protective, which is the safer default. If legal review later requires changes, the confidentiality filter can be adjusted without restructuring the schema.

---

## 8. FINAL ROLE MATRIX

### 8.1 Complete Capability Matrix

| Capability | SUPER_ADMIN | INSTITUTION_ADMIN | TEACHER | PARENT | STUDENT |
|------------|------------|-------------------|---------|--------|---------|
| **discover** | NO | YES | YES (own students) | YES (own children) | YES (own records) |
| **list** | NO | YES | YES (own students) | YES* (PUBLIC+INTERNAL) | YES* (PUBLIC+INTERNAL) |
| **read** | NO | YES | YES (own students) | YES* (PUBLIC+INTERNAL) | YES* (PUBLIC+INTERNAL) |
| **create** | NO | YES | YES (own students) | NO | NO |
| **update** | NO | YES | YES (own created) | NO | NO |
| **follow-up** | NO | YES | YES | NO | NO |
| **commit** | NO | YES | YES | NO | NO |
| **attach** | NO | YES | YES | YES (own records) | NO |
| **escalate** | NO | YES | YES | NO | NO |
| **resolve** | NO | YES | NO | NO | NO |
| **close** | NO | YES | NO | NO | NO |
| **reopen** | NO | YES (with audit) | NO | NO | NO |
| **stats** | NO | YES | YES (own students) | NO | NO |
| **categories** | NO | YES | NO | NO | NO |
| **sign** | NO | YES | YES | YES | NO |

\* = filtered by confidentiality level

### 8.2 Three Layers of Authorization

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

## 9. RESOURCE-LEVEL AUTHORIZATION

### 9.1 Authorization Rules

| Actor | Relationship | Resolution Method |
|-------|-------------|-------------------|
| **INSTITUTION_ADMIN** | institution scope | `institutionId` from TenantContextGuard |
| **TEACHER** | TeacherAssignment → Enrollment → Student | Query: teacherAssignment WHERE teacherUserId = :userId → enrollment → student |
| **PARENT** | GuardianStudent → Student | Query: guardianStudent WHERE guardianUserId = :userId → student |
| **STUDENT** | Student.userId === currentUserId | Query: student WHERE userId = :currentUserId |
| **SUPER_ADMIN** | NO ACCESS | Do not assign permissions |

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

### 9.3 Existing Utilities to Reuse

| Utility | Location | Purpose |
|---------|----------|---------|
| `resolveParentContext()` | `apps/api/src/common/auth/parent-context.ts` | Get parent's student IDs |
| `findGuardianUserIds()` | `apps/api/src/common/auth/parent-context.ts` | Find guardians for notifications |
| `TenantContextGuard` | `apps/api/src/modules/auth/tenant/tenant-context.guard.ts` | Resolve institutionId |
| `PermissionGuard` | `apps/api/src/modules/auth/authorization/permission.guard.ts` | Check RBAC |

---

## 10. CONFIDENTIALITY MATRIX

### 10.1 Access by Confidentiality Level

| Level | Description | INSTITUTION_ADMIN | TEACHER | PARENT | STUDENT | SUPER_ADMIN |
|-------|-------------|-------------------|---------|--------|---------|-------------|
| **PUBLIC** | Open recognition, awards | ✓ | ✓ | ✓ | ✓ | NO |
| **INTERNAL** | Academic follow-up, institutional | ✓ | ✓ | ✓ | ✓ | NO |
| **CONFIDENTIAL** | Counseling, psychological | ✓ | NO | TBD (D02) | TBD (D01) | NO |
| **SENSITIVE** | Family, health, third-party | ✓ (with audit) | NO | NO | NO | NO |

### 10.2 Pending D01/D02 Resolution

Once D01 and D02 are resolved, the CONFIDENTIAL column will be:

| If D01 = A (recommended) | If D02 = A (recommended) |
|---------------------------|---------------------------|
| STUDENT: NO | PARENT: NO |

### 10.3 Confidentiality Behaviors

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

## 11. CREATION-BY-TYPE MATRIX

### 11.1 Who Can Create Each Type

| Type | INSTITUTION_ADMIN | TEACHER | PARENT | STUDENT | SUPER_ADMIN |
|------|-------------------|---------|--------|---------|-------------|
| **ACADEMICO** | ✓ | YES (own students) | NO | NO | NO |
| **CONVIVENCIA** | ✓ | YES (own students) | NO | NO | NO |
| **FORMATIVO** | ✓ | YES (own students) | NO | NO | NO |

### 11.2 Notes

- All 3 types have the same creation rules
- Teacher creation is limited to students via TeacherAssignment → Enrollment → Student
- Admin can create for any student in their institution
- No additional types in MVP

---

## 12. LIFECYCLE CONFIRMATION

### 12.1 States

| State | Description | Terminal? |
|-------|-------------|-----------|
| **OPEN** | Record created, awaiting action | No |
| **IN_PROGRESS** | Active follow-up in progress | No |
| **ESCALATED** | Escalated to higher authority | No |
| **PENDING_FOLLOW_UP** | Awaiting response from responsible party | No |
| **RESOLVED** | Issue resolved, pending closure | No |
| **CLOSED** | Case closed, record immutable | Yes |

### 12.2 Transition Matrix

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

### 12.3 Closed Record Immutability

Once CLOSED:
- No new follow-up entries
- No new commitments
- No modifications
- Read-only
- Reopenable by Admin only (D06)

---

## 13. COMMITMENT RULES

### 13.1 Commitment States

| State | Description |
|-------|-------------|
| **PENDING** | Not yet started |
| **IN_PROGRESS** | Work in progress |
| **COMPLETED** | Finished successfully |
| **OVERDUE** | Past deadline, not completed |
| **CANCELLED** | No longer required |

### 13.2 Commitment Rules

1. **Who creates**: Admin or Teacher (with `student-follow-ups:commit` permission)
2. **Who is responsible**: STUDENT, PARENT, TEACHER, or INSTITUTION (role-based)
3. **Deadline**: Must be in the future at creation
4. **Completion**: Responsible party or admin can mark as completed
5. **Overdue**: System automatically marks as OVERDUE when deadline passes
6. **Cancellation**: Admin can cancel with reason

### 13.3 Signature Integration

- **Optional** in MVP (D04)
- Commitment has `requestSignature` boolean flag
- When true, system creates `SignatureRequest` + `SignatureRecipient`
- Commitment waits for signature before progressing

---

## 14. SIGNATURE RULES

### 14.1 MVP Approach

- OPTIONAL in MVP (D04)
- Commitment can exist without signature
- Signature integration via existing `SignatureRequest`

### 14.2 When Signatures Are Created

| Trigger | Condition | Recipients |
|---------|-----------|-----------|
| Commitment creation | `requestSignature = true` | Responsible party + creator |

### 14.3 Signature Rules

1. **Who requests**: Admin or Teacher
2. **Who signs**: Assigned recipient only
3. **Can decline**: Yes, with reason
4. **On decline**: Commitment cancelled, all parties notified
5. **On complete**: All signed → commitment progresses

---

## 15. ATTACHMENT RULES

### 15.1 MVP Approach

- Reuse existing `FileAsset` model
- Create `FollowUpAttachment` join table
- Upload via existing `FilesService`

### 15.2 Attachment Rules

| Rule | Value |
|------|-------|
| Max file size | 10MB (institution-configurable) |
| Allowed MIME types | PDF, PNG, JPEG, WebP, TXT, Word, Excel, PowerPoint |
| Who can upload | Admin, Teacher, Parent (own records only) |
| Who can download | Users with access to the record |
| Who can remove | Admin, uploader |
| Remove means | Unlink only (FileAsset preserved for audit) |

---

## 16. NOTIFICATION RULES

### 16.1 MVP Events

| Event | Recipients | Message Template |
|-------|-----------|-----------------|
| Record created | Director de grupo (if configured) | "Nuevo seguimiento registrado para [student]" |
| Record escalated | Target role/person | "Seguimiento escalado: [title]" |
| Commitment created | Responsible party | "Nuevo compromiso: [description]" |
| Commitment approaching deadline | Responsible party | "Compromiso próximo a vencer: [description]" |
| Commitment overdue | Responsible party + teacher | "Compromiso vencido: [description]" |
| Record closed | All involved parties | "Caso cerrado: [title]" |
| Record reopened | All involved parties | "Caso reabierto: [title]" |

### 16.2 Privacy-Aware Messages

- **Never** reveal sensitive information in notifications
- **Always** use generic messages
- **Never** include CONFIDENTIAL or SENSITIVE content

---

## 17. AUDIT RULES

### 17.1 Required Audit Events

| Event | Description | Required |
|-------|-------------|----------|
| FOLLOW_UP_CREATED | New record created | YES |
| FOLLOW_UP_UPDATED | Record modified | YES |
| FOLLOW_UP_STATUS_CHANGED | Status transition | YES |
| FOLLOW_UP_CLOSED | Case closed | YES |
| FOLLOW_UP_REOPENED | Case reopened | YES |
| FOLLOW_UP_ENTRY_ADDED | Follow-up entry created | YES |
| COMMITMENT_CREATED | Commitment created | YES |
| COMMITMENT_COMPLETED | Commitment completed | YES |
| COMMITMENT_OVERDUE | Commitment passed deadline | YES |
| FOLLOW_UP_ATTACHMENT_ADDED | File attached | YES |
| FOLLOW_UP_ACCESSED | Record viewed (CONFIDENTIAL/SENSITIVE) | YES |
| FOLLOW_UP_ESCALATED | Record escalated | YES |

### 17.2 Immutability

- AuditLog records are append-only
- FollowUpEntry records are immutable after creation
- CLOSED records cannot be modified

---

## 18. CATEGORY RULES

### 18.1 Category Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | PK | Primary key |
| `institutionId` | UUID | FK | Tenant scope |
| `type` | FollowUpType | Required | ACADEMICO, CONVIVENCIA, FORMATIVO |
| `name` | String(100) | Required | Display name |
| `code` | String(50) | Required | Unique code within institution |
| `sortOrder` | Int | Default 0 | Display order |
| `isActive` | Boolean | Default true | Active/inactive |

### 18.2 Category Rules

| Rule | Value |
|------|-------|
| Scope | Per institution |
| Who creates | INSTITUTION_ADMIN only |
| Who modifies | INSTITUTION_ADMIN only |
| Who deactivates | INSTITUTION_ADMIN only |
| Can delete | Only if not used by any record |
| Required | Yes (every record must have a category) |
| Different per type | Yes (categories are typed) |

---

## 19. DATA MODEL IMPACT

### 19.1 Impact of D01-D09 on Schema

| Decision | Schema Impact | Notes |
|----------|--------------|-------|
| D01 (Student visibility) | Service layer filter | No schema change needed |
| D02 (Parent access) | Service layer filter | No schema change needed |
| D03 (CONVIVENCIA creation) | Permission assignment | No schema change needed |
| D09 (MVP types) | FollowUpType enum values | Defines enum: ACADEMICO, CONVIVENCIA, FORMATIVO |

### 19.2 Enums to Create

```prisma
enum FollowUpType {
  ACADEMICO
  CONVIVENCIA
  FORMATIVO
}

enum FollowUpSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum FollowUpStatus {
  OPEN
  IN_PROGRESS
  ESCALATED
  PENDING_FOLLOW_UP
  RESOLVED
  CLOSED
}

enum FollowUpConfidentiality {
  PUBLIC
  INTERNAL
  CONFIDENTIAL
  SENSITIVE
}

enum FollowUpEntryType {
  INTERVENCION
  SEGUIMIENTO
  NOTA
  COMPROMISO_CUMPLIDO
  COMPROMISO_INCUMPLIDO
  ESCALACION
}

enum CommitmentStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  OVERDUE
  CANCELLED
}

enum CommitmentResponsibleRole {
  STUDENT
  PARENT
  TEACHER
  INSTITUTION
}
```

### 19.3 Models to Create

1. StudentFollowUp
2. FollowUpEntry
3. Commitment
4. FollowUpAttachment
5. FollowUpCategory

---

## 20. RBAC IMPACT

### 20.1 Permission Codes

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

### 20.2 Role Permission Mapping

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

---

## 21. MVP FINAL BASELINE

### 21.1 INCLUDED in MVP

**Entities:**
- StudentFollowUp (CRUD)
- FollowUpEntry (create, read)
- Commitment (create, update, complete)
- FollowUpAttachment (create, read, delete)
- FollowUpCategory (CRUD by admin)

**Record Types (D09):**
- ACADEMICO
- CONVIVENCIA
- FORMATIVO

**States:**
- OPEN, IN_PROGRESS, ESCALATED, PENDING_FOLLOW_UP, RESOLVED, CLOSED

**Features:**
- StudentFollowUp CRUD
- Follow-up entries
- Commitments
- File attachment
- Role-based access
- Resource-level authorization
- Status lifecycle
- Severity levels
- Confidentiality levels
- Audit trail
- Notifications
- Institution-scoped categories
- List view with filters
- Detail view with timeline
- Form wizard

### 21.2 DEFERRED

- ASISTENCIA, ORIENTACION, RECONOCIMIENTO types
- Configurable templates
- Signature integration (flag only)
- Agenda integration
- Dashboard KPIs
- Reporting / export
- Institution transfer
- Retention policies
- Advanced analytics

---

## 22. OUT-OF-SCOPE

1. Attendance tracking
2. Institution transfer
3. Configurable templates
4. Signature integration (flag only)
5. Agenda integration
6. Dashboard KPIs
7. Reporting/export
8. Retention policies
9. Advanced analytics
10. AI/ML features
11. New roles (COORDINATOR, COUNSELOR)
12. Internationalization
13. Mobile app
14. Offline mode
15. Bulk operations

---

## 23. REMAINING OPEN DECISIONS

### 23.1 PO Decisions Required

| ID | Decision | Recommendation | Status |
|----|----------|---------------|--------|
| D01 | Student visibility | PUBLIC + INTERNAL only | REQUIRES PO |
| D02 | Parent access | PUBLIC + INTERNAL only | REQUIRES PO + LEGAL |
| D03 | CONVIVENCIA creation | Admin + Teacher | REQUIRES PO |
| D09 | MVP record types | Core 3 | REQUIRES PO |

### 23.2 Legal Questions

| ID | Question | Related Decision |
|----|----------|-----------------|
| L01 | Can parents access CONFIDENTIAL records? | D02 |
| L02 | Can students access their own CONFIDENTIAL records? | D01 |
| L03 | Ley 1581/2012 implications | General |
| L04 | SUPER_ADMIN exceptional access? | D07 |
| L05 | School internal policies? | D03 |

---

## 24. PROMPT 71 ENTRY CRITERIA

### PROMPT 71 may initiate ONLY when ALL of the following are true:

| # | Criterion | Type | Owner |
|---|-----------|------|-------|
| 1 | D01: Student visibility PO-approved | BLOCKER | PO |
| 2 | D02: Parent access PO-approved | BLOCKER | PO |
| 3 | D03: CONVIVENCIA creation PO-approved | BLOCKER | PO |
| 4 | D09: MVP record types PO-approved | BLOCKER | PO |
| 5 | Legal questions L01-L03 identified | NON-BLOCKING | Legal |
| 6 | MVP scope approved | BLOCKER | PO |
| 7 | Confidentiality levels approved | BLOCKER | PO |
| 8 | Lifecycle states approved | BLOCKER | PO |
| 9 | Authorization model approved | BLOCKER | PO |
| 10 | Cloud Staging (FASE 1.9) completed | BLOCKER | Dev |

---

## 25. ROADMAP 71-76

### 25.1 Prompt Sequence

| Prompt | Name | Dependencies | Effort |
|--------|------|-------------|--------|
| 71 | Domain Model / Prisma Schema | 70-C (PO decisions) | Small |
| 72 | RBAC + Resource-Level Authorization | 71 | Medium |
| 73 | Backend CRUD | 72 | Large |
| 74 | Follow-ups + Commitments + Lifecycle | 73 | Medium-Large |
| 75 | Frontend | 74 | Large |
| 76 | E2E + Security + Acceptance | 75 | Medium |

### 25.2 Phase Placement

```
FASE 1.9 — Cloud Staging
    │
    ▼
FASE 2 — Observador del Alumno
    │
    ├── PROMPT 70: Discovery (COMPLETED)
    ├── PROMPT 70-A: Product Review (COMPLETED)
    ├── PROMPT 70-B: Decision Closure (COMPLETED)
    ├── PROMPT 70-C: Decision Workshop (THIS DOCUMENT)
    ├── PROMPT 71: Domain Model / Prisma Schema
    ├── PROMPT 72: RBAC + Resource-Level Authorization
    ├── PROMPT 73: Backend CRUD
    ├── PROMPT 74: Follow-ups + Commitments + Lifecycle
    ├── PROMPT 75: Frontend
    └── PROMPT 76: E2E + Security + Acceptance
```

---

## 26. RISKS

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

## 27. FINAL VERDICT

### PO DECISION WORKSHOP — PENDING PO DECISIONS

The Decision Workshop is complete and ready for Product Owner review. However, 4 decisions (D01, D02, D03, D09) require explicit PO approval before PROMPT 71 can initiate.

### Decisions That Need PO Response

| ID | Question | Recommendation | PO Must Say |
|----|----------|---------------|-------------|
| D01 | What can students see? | PUBLIC + INTERNAL only | "Students see PUBLIC + INTERNAL" |
| D02 | What can parents see? | PUBLIC + INTERNAL only | "Parents see PUBLIC + INTERNAL" |
| D03 | Who creates CONVIVENCIA? | Admin + Teacher | "Teachers and Admins can create" |
| D09 | What types in MVP? | Core 3 | "MVP includes ACADEMICO, CONVIVENCIA, FORMATIVO" |

### Next Steps

1. **PO responds to D01, D02, D03, D09**
2. **Legal reviews L01-L03** (can proceed in parallel)
3. **Cloud Staging (FASE 1.9) proceeds**
4. **PROMPT 71 initiates** after all blockers resolved

### Key Principle

**RECOMMENDED ≠ APPROVED.** Only an explicit response from the Product Owner can convert "REQUIRES PO" to "CLOSED — PO APPROVED."

---

## VALIDATION CHECKLIST

- [x] Discovery leído
- [x] Product review leído
- [x] Decision closure leído
- [x] D01-D09 revisadas
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
- [x] Data model impact
- [x] RBAC impact
- [x] Risk register
- [x] Prompt 71 entry criteria
- [x] Roadmap 71-76
- [x] No se modificó código
- [x] No se implementó PROMPT 71

---

*Document generated by PROMPT 70-C — Product Owner Decision Workshop + D01-D09 Formal Closure. No functional code was modified.*
