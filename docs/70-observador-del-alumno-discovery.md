# PROMPT 70 — OBSERVADOR DEL ALUMNO: DISCOVERY, ARCHITECTURE & ROADMAP

**Date:** 2026-08-27
**Status:** ANALYSIS ONLY — NO CODE MODIFIED
**Version:** 1.0.0
**Scope:** Discovery, Architecture, Roadmap for the "Observador del Alumno" module

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Current System Analysis](#2-current-system-analysis)
3. [Existing Capabilities Reuse Matrix](#3-existing-capabilities-reuse-matrix)
4. [Observador Conceptual Domain Model](#4-observador-conceptual-domain-model)
5. [Actors and Roles](#5-actors-and-roles)
6. [Resource-Level Authorization Model](#6-resource-level-authorization-model)
7. [Multi-Tenant Model](#7-multi-tenant-model)
8. [Institution Transfer Analysis](#8-institution-transfer-analysis)
9. [Privacy / Legal Considerations](#9-privacy--legal-considerations)
10. [Parameterization Model](#10-parameterization-model)
11. [Functional Workflows](#11-functional-workflows)
12. [Lifecycle](#12-lifecycle)
13. [Audit / Traceability](#13-audit--traceability)
14. [Files Integration](#14-files-integration)
15. [Signatures Integration](#15-signatures-integration)
16. [Notifications Integration](#16-notifications-integration)
17. [Agenda Integration](#17-agenda-integration)
18. [Dashboard / KPI Analysis](#18-dashboard--kpi-analysis)
19. [Reporting](#19-reporting)
20. [Frontend Architecture](#20-frontend-architecture)
21. [API Architecture](#21-api-architecture)
22. [Database Architecture](#22-database-architecture)
23. [Permission Model](#23-permission-model)
24. [Testing Strategy](#24-testing-strategy)
25. [Security Threat Model](#25-security-threat-model)
26. [Impact Analysis](#26-impact-analysis)
27. [Risk Register](#27-risk-register)
28. [Product Owner Decisions](#28-product-owner-decisions)
29. [Recommended Product Scope](#29-recommended-product-scope)
30. [Roadmap](#30-roadmap)
31. [Recommended Prompt Sequence](#31-recommended-prompt-sequence)
32. [Acceptance Criteria for Future Implementation](#32-acceptance-criteria-for-future-implementation)
33. [Documentation Created](#33-documentation-created)
34. [Files Modified](#34-files-modified)
35. [Git Status](#35-git-status)
36. [Final Verdict](#36-final-verdict)

---

## 1. EXECUTIVE SUMMARY

### What is the Observador del Alumno?

The "Observador del Alumno" (Student Observer) is a concept used in Colombian educational institutions to register and track relevant aspects of a student's school trajectory. It is NOT a legally mandated national system — it is an institutional tool adopted within the school's autonomy (PEI, Manual de Convivencia).

### What does this analysis produce?

A complete technical blueprint for integrating the Observador into Agenda Escolar Digital v1.0.1 as a **"Módulo de Seguimiento Integral del Estudiante"** (Student Integral Follow-up Module). The module transforms the Observador from a simple annotation log into a parametrizable follow-up engine with:

- **Typed records** (academic, convivencia, formative, recognition, orientation)
- **Follow-up workflows** (situation → action → commitment → follow-up → result)
- **Role-based access** (admin, teacher, coordinator, counselor, parent, student)
- **Institutional parametrization** (configurable types, categories, templates)
- **Full audit trail** (who created, who modified, who viewed, when)
- **Data sensitivity controls** (public, internal, confidential, sensitive)
- **File evidence attachment** (reusing FileAsset)
- **Signature integration** (reusing SignatureRequest)
- **Notification fan-out** (reusing Notification)
- **Agenda events** (reusing AgendaEvent)
- **Multi-tenant isolation** (institutionId on every entity)

### Key findings:

| Dimension | Finding |
|-----------|---------|
| **Complexity** | HIGH — touches RBAC, multi-tenancy, students, guardians, communications, files, signatures, notifications, agenda, dashboard |
| **Reusability** | MEDIUM-HIGH — 7 existing modules can be partially reused |
| **Risk** | MEDIUM — privacy, data sensitivity, and RBAC escalation are primary concerns |
| **Scope** | Large module, requires 4-6 implementation prompts |
| **Phase placement** | FASE 2 (post-Cloud Staging) |
| **Estimated prompts** | 6 prompts (Discovery → Domain Model → Backend CRUD → Follow-ups → Frontend → E2E) |

---

## 2. CURRENT SYSTEM ANALYSIS

### 2.1 Architecture Overview

```
AccessTokenGuard
    ↓
TenantContextGuard
    ↓
PermissionGuard
    ↓
Controller
    ↓
Service
    ↓
Prisma
```

- **Backend:** NestJS + TypeScript strict + Prisma 6.19.3 + PostgreSQL 16
- **Frontend:** React 18+ + Vite + Tailwind + TanStack React Query + React Router v6
- **Auth:** JWT (access + refresh tokens) + argon2id password hashing
- **Multi-tenancy:** `X-Institution-Id` header → `TenantContextGuard` → `institutionId` on every entity
- **RBAC:** 52 permissions, 5 roles (SUPER_ADMIN, INSTITUTION_ADMIN, TEACHER, PARENT, STUDENT)
- **Resource-level authorization:** `GuardianStudent` model for parent → student filtering

### 2.2 Domain Model (32 Prisma Models)

**Identity & Auth:**
- `User` (platform-level, not scoped to institution)
- `UserInstitution` (many-to-many: user ↔ institution)
- `UserRole` (tenant-scoped role assignment)
- `GlobalUserRole` (platform-level role)
- `Role` (GLOBAL / TEMPLATE / TENANT)
- `Permission` (52 codes, module:action pattern)
- `RolePermission` (many-to-many: role ↔ permission)
- `RefreshToken`, `PasswordResetToken`
- `AuditLog`

**Academic Structure:**
- `Institution` (top-level tenant)
- `SchoolGrade` (grade levels: Preescolar, Primero, Segundo, etc.)
- `AcademicPeriod` (date-bounded periods)
- `Course` (class/section)
- `Subject` (discipline)
- `Student` (academic record, optionally linked to User)
- `Enrollment` (student ↔ course + schoolGrade + academicPeriod)
- `TeacherAssignment` (teacher ↔ course + subject + academicPeriod)
- `Schedule` (time slots for courses)
- `Grade` (individual grade records)

**Guardian System:**
- `GuardianStudent` (guardian ↔ student, with relationshipType)

**Task System:**
- `Task`, `TaskAssignment`, `TaskSubmission`, `TaskAttachment`

**Communication:**
- `Communication`, `CommunicationRecipient`, `CommunicationAttachment`

**Signature:**
- `SignatureRequest`, `SignatureRecipient`

**Notification:**
- `Notification`

**File Management:**
- `FileAsset`, `TaskAttachment`, `CommunicationAttachment`

### 2.3 Existing RBAC Matrix

| Permission | Admin | Teacher | Parent | Student |
|------------|-------|---------|--------|---------|
| `students:read` | ✓ | ✓ | ✓* | — |
| `students:manage` | ✓ | — | — | — |
| `grades:read` | ✓ | ✓ | ✓* | ✓ |
| `grades:manage` | ✓ | ✓ | — | — |
| `tasks:read` | ✓ | ✓ | ✓* | ✓ |
| `tasks:manage` | ✓ | ✓ | — | — |
| `communications:read` | ✓ | ✓ | ✓ | ✓ |
| `communications:manage` | ✓ | — | — | — |
| `signatures:read` | ✓ | ✓ | ✓ | — |
| `signatures:sign` | ✓ | ✓ | ✓ | — |
| `notifications:read` | ✓ | ✓ | ✓ | ✓ |
| `files:upload` | ✓ | ✓ | — | — |
| `files:read` | ✓ | ✓ | ✓ | ✓ |
| `guardians:read` | ✓ | — | ✓ | — |
| `guardians:manage` | ✓ | — | — | — |
| `enrollments:read` | ✓ | — | ✓ | ✓ |
| `agenda:read` | ✓ | ✓ | ✓ | ✓ |

\* = resource-level filtered to linked students only

### 2.4 Existing Parent Filtering Pattern

The `resolveParentContext(prisma, institutionId, userId)` function in `apps/api/src/common/auth/parent-context.ts`:

```typescript
interface ParentContext {
  isParent: boolean;
  studentIds: string[];
}
```

This is already used by:
- `StudentsService.findAll` / `findOne` — filters students
- `TasksService.findAll` — filters tasks via TaskAssignment
- `GradesService.findAll` — filters grades
- `AgendaService.resolveUserContext` — resolves parent context for agenda events

### 2.5 Test Counts

| Suite | Count | Status |
|-------|-------|--------|
| Backend (Jest) | 441 | ALL PASS |
| Frontend (Vitest) | 418 | ALL PASS |
| Playwright E2E | 258 | 191 PASS (67 infra timeouts) |

---

## 3. EXISTING CAPABILITIES REUSE MATRIX

| Current Capability | Can Reuse? | Needs Extension? | New Module? | Notes |
|-------------------|-----------|-----------------|-------------|-------|
| **Student** | ✓ Core | No | No | Student entity is the anchor. Observador links to Student. |
| **GuardianStudent** | ✓ Core | No | No | Used for parent access control. Already filters data by studentId. |
| **Enrollment** | ✓ Context | Minimal | No | Provides course/schoolGrade/academicPeriod context for records. |
| **User** | ✓ Core | No | No | Creator/responder identity. |
| **Institution** | ✓ Core | No | No | Tenant scope. |
| **RBAC / Permissions** | ✓ Core | Extension needed | No | New permission codes for the Observador module. |
| **Resource Authorization** | ✓ Pattern | Extension needed | No | Teacher → student filtering via TeacherAssignment pattern. |
| **AuditLog** | ✓ Direct | Minimal | No | Already logs actions. Can be extended for Observador events. |
| **FileAsset** | ✓ Direct | Minor extension | No | Attach evidence files to records. New join table `FollowUpAttachment`. |
| **Signatures** | ✓ Potential | Moderate extension | No | For commitments and agreements. New integration point needed. |
| **Notifications** | ✓ Direct | Minor extension | No | Fan-out notifications on follow-up events. |
| **Communications** | ⚠ Related | Different purpose | No | Communications are institutional broadcasts, not student-specific observations. |
| **Agenda** | ✓ Potential | Moderate extension | No | Add follow-up deadline events to AgendaEvent aggregation. |
| **Dashboard** | ✓ Potential | Minor extension | No | Add KPIs: pending follow-ups, open cases, overdue commitments. |
| **Prisma Schema** | ✓ Direct | Significant extension | No | New models + new join tables. |

### Summary: 7 modules directly reusable, 3 need extension, 1 new module (Observador service/controller)

---

## 4. OBSERVADOR CONCEPTUAL DOMAIN MODEL

### 4.1 Naming Convention

| Concept | Name | Rationale |
|---------|------|-----------|
| Module name (internal) | `student-follow-ups` | Technical name for the module |
| Module name (UI) | `Observador del Alumno` | Colombian term, user-facing |
| Primary entity | `StudentFollowUp` | Single observation/record/event |
| Follow-up entity | `FollowUpEntry` | Subsequent tracking entry on a record |
| Commitment entity | `Commitment` | Agreed action with deadline and responsible |
| Evidence entity | `FollowUpAttachment` | File attachment to a record |

### 4.2 Core Entities

```
Student
    │
    ▼
StudentFollowUp (the primary record)
    │
    ├── FollowUpEntry[] (subsequent tracking entries)
    ├── Commitment[] (agreed actions)
    ├── FollowUpAttachment[] (file evidence)
    └── SignatureRequest[] (optional, for agreements)
```

### 4.3 Entity: StudentFollowUp

The primary record. Represents a single observation, situation, or event in the student's trajectory.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | PK | Primary key |
| `institutionId` | UUID | FK → Institution | Tenant scope |
| `studentId` | UUID | FK → Student | The student being observed |
| `type` | Enum | Required | ACADEMICO, CONVIVENCIA, FORMATIVO, ASISTENCIA, ORIENTACION, RECONOCIMIENTO |
| `category` | String | Configurable | Subcategory within type (e.g., "Bajo desempeño") |
| `title` | String(200) | Required | Brief title of the situation |
| `description` | Text | Required | Detailed description of the situation |
| `context` | Json? | Optional | Structured context data (place, moment, people involved) |
| `severity` | Enum? | Optional | LOW, MEDIUM, HIGH, CRITICAL |
| `status` | Enum | Required | DRAFT, OPEN, IN_PROGRESS, PENDING_FOLLOW_UP, RESOLVED, CLOSED, ESCALATED, REMITTED |
| `confidentiality` | Enum | Required | PUBLIC, INTERNAL, CONFIDENTIAL, SENSITIVE |
| `createdByUserId` | UUID | FK → User | Who created the record |
| `lastModifiedByUserId` | UUID? | FK → User | Who last modified |
| `closedByUserId` | UUID? | FK → User | Who closed the case |
| `createdAt` | DateTime | Auto | Creation timestamp |
| `updatedAt` | DateTime | Auto | Last modification timestamp |
| `closedAt` | DateTime? | Optional | When the case was closed |

**Relations:**
- `student` → Student
- `institution` → Institution
- `createdByUser` → User
- `followUpEntries` → FollowUpEntry[]
- `commitments` → Commitment[]
- `attachments` → FollowUpAttachment[]

### 4.4 Entity: FollowUpEntry

A subsequent tracking entry on an existing record. Represents "what happened next."

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | PK | Primary key |
| `institutionId` | UUID | FK → Institution | Tenant scope |
| `studentFollowUpId` | UUID | FK → StudentFollowUp | Parent record |
| `type` | Enum | Required | INTERVENCION, SEGUIMIENTO, NOTA, COMPROMISO_CUMPLIDO, COMPROMISO_INCUMPLIDO, ESCALACION |
| `description` | Text | Required | What happened |
| `actionTaken` | String? | Optional | Specific action taken |
| `responsibleUserId` | UUID? | FK → User | Who is responsible for next step |
| `nextFollowUpDate` | DateTime? | Optional | When to follow up next |
| `createdByUserId` | UUID | FK → User | Who created this entry |
| `createdAt` | DateTime | Auto | Timestamp |

**Relations:**
- `studentFollowUp` → StudentFollowUp
- `createdByUser` → User
- `responsibleUser` → User

### 4.5 Entity: Commitment

An agreed action with a deadline and responsible person.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | PK | Primary key |
| `institutionId` | UUID | FK → Institution | Tenant scope |
| `studentFollowUpId` | UUID | FK → StudentFollowUp | Parent record |
| `description` | Text | Required | What was agreed |
| `responsibleRole` | Enum | Required | STUDENT, PARENT, TEACHER, INSTITUTION |
| `responsibleUserId` | UUID? | FK → User | Specific person responsible |
| `deadline` | DateTime | Required | When it should be completed |
| `status` | Enum | Required | PENDING, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED |
| `completedAt` | DateTime? | Optional | When completed |
| `completionNotes` | Text? | Optional | Notes on completion |
| `createdByUserId` | UUID | FK → User | Who created |
| `signatureRequestId` | UUID? | FK → SignatureRequest | Optional signature for formal agreements |
| `createdAt` | DateTime | Auto | |
| `updatedAt` | DateTime | Auto | |

**Relations:**
- `studentFollowUp` → StudentFollowUp
- `responsibleUser` → User
- `createdByUser` → User
- `signatureRequest` → SignatureRequest

### 4.6 Entity: FollowUpAttachment

File attachment for evidence.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | PK | Primary key |
| `institutionId` | UUID | FK → Institution | Tenant scope |
| `studentFollowUpId` | UUID | FK → StudentFollowUp | Parent record |
| `fileAssetId` | UUID | FK → FileAsset | The file |
| `description` | String(500)? | Optional | Context for the file |
| `createdByUserId` | UUID | FK → User | Who uploaded |
| `createdAt` | DateTime | Auto | |

**Relations:**
- `studentFollowUp` → StudentFollowUp
- `fileAsset` → FileAsset
- `createdByUser` → User

---

## 5. ACTORS AND ROLES

### 5.1 Existing Roles in the System

| Role | Type | Current Permissions | Observador Relevance |
|------|------|--------------------|--------------------|
| `SUPER_ADMIN` | GLOBAL | All 52 | Platform oversight (NOT student data access by default) |
| `INSTITUTION_ADMIN` | TENANT | All 52 | Full institution management |
| `TEACHER` | TENANT | 21 permissions | Creates/consults academic records |
| `PARENT` | TENANT | 15 permissions | Views their children's records |
| `STUDENT` | TENANT | 11 permissions | Views own records |

### 5.2 Observador-Specific Access Matrix

| Action | INSTITUTION_ADMIN | TEACHER | COORDINATOR | COUNSELOR | PARENT | STUDENT |
|--------|------------------|---------|-------------|-----------|--------|---------|
| **Create record (academic)** | ✓ | ✓ | ✓ | — | — | — |
| **Create record (convivencia)** | ✓ | ✓ (own students) | ✓ | ✓ | — | — |
| **Create record (formativo)** | ✓ | ✓ | ✓ | — | — | — |
| **Create record (asistencia)** | ✓ | ✓ | ✓ | — | — | — |
| **Create record (orientacion)** | ✓ | — | — | ✓ | — | — |
| **Create record (reconocimiento)** | ✓ | ✓ | ✓ | — | — | — |
| **View records (all)** | ✓ | — | ✓ | ✓ | — | — |
| **View records (own students)** | — | ✓ | — | — | — | — |
| **View records (own children)** | — | — | — | — | ✓* | — |
| **View records (own)** | — | — | — | — | — | ✓* |
| **Modify record** | ✓ | ✓ (own created) | ✓ | ✓ (own created) | — | — |
| **Add follow-up entry** | ✓ | ✓ | ✓ | ✓ | — | — |
| **Create commitment** | ✓ | ✓ | ✓ | ✓ | — | — |
| **Close case** | ✓ | — | ✓ | ✓ | — | — |
| **Escalate** | ✓ | ✓ | ✓ | ✓ | — | — |
| **Attach evidence** | ✓ | ✓ | ✓ | ✓ | ✓ (own records) | — |
| **Request signature** | ✓ | ✓ | ✓ | ✓ | — | — |
| **View statistics** | ✓ | ✓ (own students) | ✓ | ✓ | — | — |

\* = resource-level filtered to linked/own students only

**NOTE:** The roles "COORDINATOR" and "COUNSELOR" do NOT exist as named roles in the current system. They would need to be either:
- New custom roles created by INSTITUTION_ADMIN within their institution
- Mapped to existing roles (e.g., TEACHER with extended permissions)
- **REQUIRES PRODUCT OWNER DECISION**

### 5.3 Resource-Level Authorization Rules

**Teacher access:**
- A teacher can create/view records ONLY for students they have an academic relationship with.
- Relationship is determined by: `TeacherAssignment` (course + subject + academicPeriod) → `Enrollment` (student + course) → Student.
- The teacher must have an ACTIVE `TeacherAssignment` for the course the student is enrolled in.

**Parent access:**
- A parent can view records ONLY for students linked via `GuardianStudent`.
- Already implemented via `resolveParentContext()`.
- Parent CANNOT create records, add follow-ups, or close cases.

**Student access:**
- A student can view ONLY their own records.
- Relationship determined by: `Student.userId === currentUserId` OR `Student` record linked to current user.
- Student CANNOT create, modify, or close records.

**REQUIRES PRODUCT OWNER DECISION:** Should students be able to view ALL their records, or only those marked as PUBLIC/INTERNAL?

---

## 6. RESOURCE-LEVEL AUTHORIZATION MODEL

### 6.1 Authorization Flow

```
Request
    │
    ▼
AccessTokenGuard
    │ req.user.userId = JWT.sub
    ▼
TenantContextGuard
    │ req.tenant.institutionId = X-Institution-Id
    ▼
PermissionGuard
    │ @RequirePermission('student-follow-ups:read')
    │ → checks user has permission in institution
    ▼
Service Layer (resource-level)
    │ → TeacherAssignment? → Enrollment? → Student?
    │ → GuardianStudent? → Student?
    │ → Student.userId === currentUserId?
    ▼
Controller Response
```

### 6.2 Teacher → Student Relationship Chain

```
Teacher (User)
    │
    ▼
TeacherAssignment (teacherUserId, courseId, subjectId, academicPeriodId)
    │
    ▼
Course (courseId)
    │
    ▼
Enrollment (studentId, courseId, academicPeriodId)
    │
    ▼
Student (studentId)
```

**Query to verify teacher-student relationship:**
```sql
SELECT DISTINCT e.studentId
FROM enrollments e
JOIN teacher_assignments t ON t.courseId = e.courseId
  AND t.academicPeriodId = e.academicPeriodId
WHERE t.teacherUserId = :userId
  AND t.institutionId = :institutionId
  AND t.status = 'ACTIVE'
  AND e.status = 'ACTIVE'
```

### 6.3 Parent → Student Relationship

Already implemented via `resolveParentContext()`:
```sql
SELECT gs.studentId
FROM guardian_students gs
JOIN students s ON gs.studentId = s.id
WHERE gs.guardianUserId = :userId
  AND gs.status = 'ACTIVE'
  AND s.institutionId = :institutionId
```

### 6.4 Student Self-Access

```sql
SELECT id FROM students
WHERE userId = :currentUserId
  AND institutionId = :institutionId
  AND status = 'ACTIVE'
```

---

## 7. MULTI-TENANT MODEL

### 7.1 Tenant Isolation Pattern

Every entity in the Observador module MUST have `institutionId` as a required field.

### 7.2 Guard Chain Enforcement

```typescript
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
@Controller('student-follow-ups')
export class StudentFollowUpsController {
  // institutionId comes from TenantContextGuard (req.tenant.institutionId)
  // NEVER from DTO or request body
}
```

### 7.3 Query Scoping

Every query MUST include `institutionId` in the WHERE clause:

```typescript
const where = {
  institutionId,  // from TenantContextGuard
  studentId,
  // ...other filters
};
```

### 7.4 SUPER_ADMIN Access

SUPER_ADMIN has global permissions but should NOT automatically access student personal data.

**REQUIRES PRODUCT OWNER DECISION:** Should SUPER_ADMIN have read access to all StudentFollowUp records across institutions? Recommendation: NO for data privacy. SUPER_ADMIN should manage institutions, not view student data.

---

## 8. INSTITUTION TRANSFER ANALYSIS

### 8.1 Scenario

Student transfers from Institution A to Institution B.

### 8.2 Architectural Options

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Complete transfer** | All records move to Institution B | Simple | Privacy risk, loses institutional context |
| **B. Institutional isolation** | Each institution keeps its own records | Privacy-safe | No continuity, new institution starts blind |
| **C. Controlled transfer** | Selective transfer with audit trail | Balanced | More complex to implement |
| **D. Read-only access** | Institution B gets read access to Institution A's records | Continuity without data copy | Complex access control |

### 8.3 Recommended Architecture: Option C (Controlled Transfer)

```
INSTITUTION A (origin)
    │
    │ StudentFollowUp records (institutionId = A)
    │ Remain in Institution A's database
    │
    │ Transfer process:
    │ 1. Admin selects records to transfer
    │ 2. System creates StudentTransferRecord
    │ 3. Selected records are NOT copied
    │ 4. Institution B receives a summary/manifest
    │
    ▼
StudentTransferRecord
    │
    ├── originInstitutionId
    ├── destinationInstitutionId
    ├── studentId (reference)
    ├── transferredByUserId
    ├── transferredAt
    ├── records manifest (JSON)
    │   ├── followUpIds[]
    │   ├── types included
    │   ├── date range
    │   └── summary
    └── status: PENDING | ACCEPTED | REJECTED
```

**Key principles:**
- Original records stay in Institution A (institutionId preserved)
- Institution B does NOT get direct access to Institution A's database
- A transfer manifest summarizes what was shared
- The student's identity is referenced, not duplicated
- Consent/authorization is required

**REQUIRES PRODUCT OWNER DECISION:**
- Should institution transfer be part of MVP?
- Who can initiate a transfer?
- Is student/parent consent required?
- Should transferred records be visible in Institution B's Observador?

**REQUIRES LEGAL VALIDATION:**
- Colombian data protection law (Ley 1581/2012) implications
- Student/parent rights over the data
- Retention requirements

---

## 9. PRIVACY / LEGAL CONSIDERATIONS

### 9.1 Data Sensitivity Classification

| Classification | Example | Access |
|---------------|---------|--------|
| **PUBLIC** | Recognition, award | Broad access according to role |
| **INTERNAL** | Academic follow-up, attendance | Restricted to involved roles |
| **CONFIDENTIAL** | Counseling records, psychological notes | Very restricted (counselor + admin only) |
| **SENSITIVE** | Family situations, health info, third-party data | Highly restricted (admin + counselor, with audit) |

### 9.2 Privacy Principles

1. **Minimization:** Only collect what is necessary for the educational purpose.
2. **Purpose limitation:** Data collected for student follow-up cannot be repurposed without authorization.
3. **Access control:** Role-based + resource-level + sensitivity-based.
4. **Audit trail:** All access to sensitive data must be logged.
5. **Retention:** Records should have configurable retention periods.
6. **Right of access:** Students/parents should be able to view their own data (with exceptions for third-party data).

### 9.3 Legal Validation Points

| Point | Status | Notes |
|-------|--------|-------|
| Is the Observador legally required? | NO | Institutional autonomy |
| Can it contain personal data? | YES, with controls | Ley 1581/2012 applies |
| Can parents access it? | YES, with exceptions | Third-party data may be restricted |
| Can students access it? | YES, with exceptions | Confidential counseling may be restricted |
| Can data be transferred between institutions? | Controlled transfer only | Requires authorization |
| Must data be deleted on request? | Not automatically | Habeas data does not mean automatic deletion |
| Is consent required for creation? | REQUIRES VALIDATION | Educational necessity may override |
| Must the student be notified? | REQUIRES VALIDATION | Due process considerations |

### 9.4 Data Protection Controls in the Module

| Control | Implementation |
|---------|---------------|
| Minimization | Type/category fields ensure only relevant data is collected |
| Purpose limitation | Module scope is educational follow-up only |
| Access control | RBAC + resource-level + confidentiality field |
| Audit trail | AuditLog + dedicated access log |
| Encryption | PostgreSQL encryption at rest (infrastructure level) |
| Backup | Standard backup procedures |
| Retention | Configurable per institution (future) |
| Export | Student data export capability (future) |

---

## 10. PARAMETERIZATION MODEL

### 10.1 Parameterization Levels

| Level | Configurable By | Examples |
|-------|----------------|----------|
| **Platform** | Developer | Base types, security rules, field constraints |
| **Institution** | INSTITUTION_ADMIN | Custom categories, templates, workflows, states |
| **Role** | System | Permission checks, access rules |
| **User** | End user | Form input, record creation |

### 10.2 Fixed Enums (Platform Level)

```typescript
enum FollowUpType {
  ACADEMIC
  CONVIVENCIA
  FORMATIVO
  ASISTENCIA
  ORIENTACION
  RECONOCIMIENTO
}

enum FollowUpSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum FollowUpStatus {
  DRAFT
  OPEN
  IN_PROGRESS
  PENDING_FOLLOW_UP
  RESOLVED
  CLOSED
  ESCALATED
  REMITTED
}

enum FollowUpConfidentiality {
  PUBLIC
  INTERNAL
  CONFIDENTIAL
  SENSITIVE
}
```

### 10.3 Configurable Categories (Institution Level)

Categories are configurable per institution via a `FollowUpCategory` entity:

```prisma
model FollowUpCategory {
  id            String   @id @default(uuid()) @db.Uuid
  institutionId String   @map("institution_id") @db.Uuid
  type          FollowUpType
  name          String   @db.VarChar(100)
  code          String   @db.VarChar(50)
  sortOrder     Int      @default(0) @map("sort_order")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  
  @@unique([institutionId, code])
  @@index([institutionId, type])
}
```

### 10.4 Recommendation for MVP

For the MVP implementation:
- Use **fixed enums** for type, severity, status, confidentiality
- Use **configurable categories** per institution (CRUD for INSTITUTION_ADMIN)
- Defer **configurable templates** to a future phase
- Keep the form fields simple and fixed in the MVP

---

## 11. FUNCTIONAL WORKFLOWS

### 11.1 FLOW 1: Teacher Creates Academic Record

```
Teacher
  │
  ▼
Selects Student (filtered by TeacherAssignment)
  │
  ▼
Selects Type: ACADEMIC
  │
  ▼
Selects Category: "Bajo desempeño" (institution-configurable)
  │
  ▼
Enters: Title, Description
  │
  ▼
System validates:
  ✓ Teacher has relationship with student
  ✓ Student exists in institution
  ✓ Category is valid for this type
  │
  ▼
System creates StudentFollowUp:
  status = OPEN
  createdByUserId = teacher.userId
  confidentiality = INTERNAL
  │
  ▼
System audits: FOLLOW_UP_CREATED
  │
  ▼
System optionally notifies:
  → Director de grupo (if configured)
  → Coordinador (if severity >= MEDIUM)
  │
  ▼
Response: { id, status: "OPEN" }
```

### 11.2 FLOW 2: Follow-Up Entry Added

```
Any authorized user (teacher, admin, counselor)
  │
  ▼
Opens existing StudentFollowUp
  │
  ▼
Clicks "Agregar seguimiento"
  │
  ▼
Selects Entry Type: SEGUIMIENTO
  │
  ▼
Enters: Description, Action Taken
  │
  ▼
Optionally sets: Next Follow-Up Date
  │
  ▼
System creates FollowUpEntry
  │
  ▼
System updates StudentFollowUp:
  status = IN_PROGRESS (if was OPEN)
  updatedAt = now()
  │
  ▼
If nextFollowUpDate is set:
  System creates AgendaEvent for follow-up reminder
```

### 11.3 FLOW 3: Commitment Created

```
Authorized user
  │
  ▼
Opens StudentFollowUp
  │
  ▼
Clicks "Crear compromiso"
  │
  ▼
Enters:
  - Description
  - Responsible: STUDENT / PARENT / TEACHER / INSTITUTION
  - Deadline
  │
  ▼
Optionally requests signature (via SignatureRequest)
  │
  ▼
System creates Commitment:
  status = PENDING
  │
  ▼
System notifies responsible party
  │
  ▼
System optionally creates AgendaEvent for deadline
```

### 11.4 FLOW 4: Parent Participation

```
Parent
  │
  ▼
Logs in → Dashboard shows "Seguimientos activos" for linked children
  │
  ▼
Clicks child name → sees list of records (filtered by GuardianStudent)
  │
  ▼
Can:
  ✓ View record details
  ✓ View follow-up entries
  ✓ View commitments
  ✓ Attach evidence (if allowed by institution)
  ✗ Cannot create records
  ✗ Cannot modify records
  ✗ Cannot close cases
```

### 11.5 FLOW 5: Case Escalation

```
Teacher or Counselor
  │
  ▼
Opens StudentFollowUp with severity >= MEDIUM
  │
  ▼
Clicks "Escalar"
  │
  ▼
Selects escalation target: Coordinador / Orientación / Rectoría
  │
  ▼
System:
  status = ESCALATED
  Creates FollowUpEntry (type = ESCALACION)
  Notifies target role
```

### 11.6 FLOW 6: Case Closure

```
Admin or Coordinator or Counselor
  │
  ▼
Opens StudentFollowUp
  │
  ▼
Verifies:
  ✓ All commitments resolved or addressed
  ✓ Follow-up entries document the process
  │
  ▼
Clicks "Cerrar caso"
  │
  ▼
System:
  status = CLOSED
  closedByUserId = currentUser
  closedAt = now()
  │
  ▼
System audits: FOLLOW_UP_CLOSED
  │
  ▼
System notifies:
  → All involved parties
  → Parents (if applicable)
```

---

## 12. LIFECYCLE

### 12.1 Status State Machine

```
                ┌──────────┐
                │  DRAFT   │ (optional, for admin review)
                └────┬─────┘
                     │ publish
                     ▼
                ┌──────────┐
           ┌────│   OPEN   │
           │    └────┬─────┘
           │         │ assign/act
           │         ▼
           │    ┌────────────┐
           │    │ IN_PROGRESS│◄──────────────┐
           │    └────┬───────┘               │
           │         │                       │
           │         ├── add follow-up ──────┘
           │         │
           │         ├── escalate
           │         ▼
           │    ┌──────────┐
           │    │ESCALATED │
           │    └────┬─────┘
           │         │ resolve
           │         ▼
           │    ┌────────────┐
           └───►│  PENDING   │
                │FOLLOW_UP  │
                └────┬───────┘
                     │
                     ├── resolve
                     ▼
                ┌──────────┐
                │ RESOLVED │
                └────┬─────┘
                     │ close
                     ▼
                ┌──────────┐
                │  CLOSED  │ (terminal)
                └──────────┘
```

### 12.2 State Transition Rules

| From | To | Allowed Roles | Conditions |
|------|----|--------------|------------|
| — | DRAFT | Admin, Teacher | Initial creation |
| DRAFT | OPEN | Admin, Teacher | Publish |
| — | OPEN | Admin, Teacher, Counselor | Direct creation |
| OPEN | IN_PROGRESS | Admin, Teacher, Counselor | Action taken |
| IN_PROGRESS | IN_PROGRESS | Admin, Teacher, Counselor | Follow-up added |
| IN_PROGRESS | ESCALATED | Admin, Teacher, Counselor | Escalation |
| ESCALATED | IN_PROGRESS | Admin, Counselor | Reassignment |
| IN_PROGRESS | PENDING_FOLLOW_UP | Admin, Counselor | Awaiting response |
| PENDING_FOLLOW_UP | IN_PROGRESS | Admin, Teacher, Counselor | Response received |
| IN_PROGRESS | RESOLVED | Admin, Counselor | Issue resolved |
| RESOLVED | CLOSED | Admin | Final close |
| Any active | CLOSED | Admin | Admin override |
| Any active | REMITTED | Admin, Counselor | Referred externally |

### 12.3 Closed Record Immutability

Once CLOSED:
- No new follow-up entries can be added
- No commitments can be created
- No modifications allowed
- The record becomes read-only
- Only viewing and export are permitted

**REQUIRES PRODUCT OWNER DECISION:** Should a closed record ever be reopened? If so, under what conditions?

---

## 13. AUDIT / TRACEABILITY

### 13.1 Audit Events

| Event | Description | Data |
|-------|-------------|------|
| `FOLLOW_UP_CREATED` | New record created | Record snapshot |
| `FOLLOW_UP_UPDATED` | Record modified | Old + new values |
| `FOLLOW_UP_STATUS_CHANGED` | Status transition | Old + new status |
| `FOLLOW_UP_CLOSED` | Case closed | Closure details |
| `FOLLOW_UP_ENTRY_ADDED` | Follow-up entry created | Entry snapshot |
| `COMMITMENT_CREATED` | Commitment created | Commitment snapshot |
| `COMMITMENT_COMPLETED` | Commitment completed | Completion details |
| `COMMITMENT_OVERDUE` | Commitment passed deadline | Deadline info |
| `FOLLOW_UP_ATTACHMENT_ADDED` | File attached | File metadata |
| `FOLLOW_UP_ACCESSED` | Record viewed (for sensitive) | Viewer, timestamp |
| `FOLLOW_UP_ESCALATED` | Record escalated | Escalation target |

### 13.2 Audit Log Fields

Every audit event includes:
- `userId` — who performed the action
- `institutionId` — tenant scope
- `action` — event type (e.g., `FOLLOW_UP_CREATED`)
- `entityType` — `StudentFollowUp`, `FollowUpEntry`, `Commitment`
- `entityId` — the specific record
- `oldValues` — previous state (for updates)
- `newValues` — new state
- `ipAddress` — request origin

### 13.3 History Trail

The combination of `StudentFollowUp` → `FollowUpEntry[]` creates a natural chronological trail:

```
2026-02-12  Teacher creates record (FOLLOW_UP_CREATED)
2026-02-15  Teacher adds follow-up (INTERVENCION)
2026-02-20  Teacher creates commitment (COMPROMISO)
2026-03-01  Parent attaches evidence (FOLLOW_UP_ATTACHMENT_ADDED)
2026-03-05  Student completes commitment (COMMITMENT_COMPLETED)
2026-03-10  Teacher adds follow-up (SEGUIMIENTO)
2026-03-20  Record closed (FOLLOW_UP_CLOSED)
```

---

## 14. FILES INTEGRATION

### 14.1 Reusing FileAsset

The existing `FileAsset` model and `FilesService` can be reused for evidence attachments.

**New join table needed:**

```prisma
model FollowUpAttachment {
  id                  String   @id @default(uuid()) @db.Uuid
  institutionId       String   @map("institution_id") @db.Uuid
  studentFollowUpId   String   @map("student_follow_up_id") @db.Uuid
  fileAssetId         String   @map("file_asset_id") @db.Uuid
  description         String?  @db.VarChar(500)
  createdByUserId     String   @map("created_by_user_id") @db.Uuid
  createdAt           DateTime @default(now()) @map("created_at")
  
  @@unique([id, institutionId])
  @@unique([studentFollowUpId, fileAssetId])
  @@index([institutionId, studentFollowUpId])
}
```

### 14.2 Upload Flow

```
User clicks "Adjuntar evidencia"
  │
  ▼
FileUploader component (existing)
  │
  ▼
POST /files (multipart/form-data)
  → Creates FileAsset
  → Returns fileAssetId
  │
  ▼
POST /student-follow-ups/:id/attachments
  body: { fileAssetId, description }
  │
  ▼
Service creates FollowUpAttachment
  │
  ▼
Audit: FOLLOW_UP_ATTACHMENT_ADDED
```

### 14.3 MVP Recommendation

File attachment should be included in the MVP. It reuses existing infrastructure and provides immediate value.

---

## 15. SIGNATURES INTEGRATION

### 15.1 Use Cases

| Use Case | Description |
|----------|-------------|
| **Commitment agreement** | Parent + teacher sign a commitment |
| **Closure confirmation** | Admin confirms case closure with signature |
| **Formal agreement** | Multiple parties agree on a plan |

### 15.2 Integration Pattern

The existing `SignatureRequest` + `SignatureRecipient` models can be reused:

```
Commitment
  │
  ├── signatureRequestId (optional FK)
  │
  ▼
SignatureRequest
  ├── title: "Compromiso: [description]"
  ├── status: PUBLISHED
  └── recipients: [parent, teacher]
```

### 15.3 MVP Recommendation

For the MVP, signatures are OPTIONAL. The commitment can exist without a signature request. Signature integration can be added in a future phase.

---

## 16. NOTIFICATIONS INTEGRATION

### 16.1 Notification Events

| Event | Recipients | Message Template |
|-------|-----------|-----------------|
| Record created | Director de grupo, Coordinador | "Nuevo seguimiento registrado para [student]" |
| Record escalated | Target role | "Seguimiento escalado: [title]" |
| Commitment created | Responsible party | "Nuevo compromiso: [description]" |
| Commitment overdue | Responsible party + teacher | "Compromiso vencido: [description]" |
| Commitment completed | Teacher + admin | "Compromiso cumplido: [description]" |
| Follow-up reminder | Assigned follow-up person | "Seguimiento pendiente: [title]" |
| Record closed | All involved parties | "Caso cerrado: [title]" |

### 16.2 Notification Fan-Out Pattern

Reusing the existing pattern from `GradesService` and `TaskAssignmentsService`:

```typescript
// After creating a record
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

### 16.3 Privacy-Aware Notifications

Notifications must NOT reveal sensitive information:
- ❌ "Seguimiento por situación familiar delicada"
- ✓ "Nuevo seguimiento registrado para [student]"

---

## 17. AGENDA INTEGRATION

### 17.1 Events to Add to Agenda

| Event Type | Source | Date | Description |
|-----------|--------|------|-------------|
| **Follow-up deadline** | FollowUpEntry.nextFollowUpDate | Specific date | "Seguimiento pendiente: [title]" |
| **Commitment deadline** | Commitment.deadline | Specific date | "Compromiso: [description]" |

### 17.2 MVP Recommendation

Agenda integration is a **nice-to-have** for the MVP. It can be added in a subsequent phase after the core module is stable.

---

## 18. DASHBOARD / KPI ANALYSIS

### 18.1 Potential KPIs

| KPI | Description | Scope |
|-----|-------------|-------|
| Active follow-ups | Records with status IN_PROGRESS or PENDING_FOLLOW_UP | Institution / Teacher |
| Open cases | Records with status OPEN | Institution |
| Overdue commitments | Commitments with status OVERDUE | Institution / Teacher |
| Pending follow-ups | Entries with nextFollowUpDate <= today | Teacher |
| Follow-ups this period | Records created in current academic period | Institution |
| Resolved this period | Records closed in current academic period | Institution |
| Escalated cases | Records with status ESCALATED | Institution |

### 18.2 MVP Recommendation

Dashboard KPIs are a **nice-to-have** for the MVP. Focus on the core CRUD and follow-up workflow first.

---

## 19. REPORTING

### 19.1 Potential Reports

| Report | Description | Audience |
|--------|-------------|----------|
| Student history | Complete follow-up history for a student | Admin, Teacher (own students) |
| Period summary | Follow-ups created/resolved in a period | Admin |
| Convivencia report | All CONVIVENCIA type records | Admin, Coordinator |
| Commitment compliance | % of commitments completed on time | Admin |

### 19.2 MVP Recommendation

Reporting is a **future phase** feature. The MVP should focus on the list view with filters and the detail view with timeline.

---

## 20. FRONTEND ARCHITECTURE

### 20.1 Module Structure

Following the existing pattern:

```
apps/web/src/modules/student-follow-ups/
├── index.ts
├── pages/
│   ├── StudentFollowUpsPage.tsx       # list view
│   ├── StudentFollowUpDetailPage.tsx  # detail + timeline
│   └── StudentFollowUpFormPage.tsx    # create form
├── hooks/
│   ├── useStudentFollowUps.ts         # list query
│   ├── useStudentFollowUp.ts          # detail query
│   ├── useCreateStudentFollowUp.ts    # create mutation
│   ├── useUpdateStudentFollowUp.ts    # update mutation
│   ├── useCloseStudentFollowUp.ts     # close mutation
│   ├── useFollowUpEntries.ts          # entries list
│   ├── useCreateFollowUpEntry.ts      # add entry mutation
│   ├── useCommitments.ts              # commitments list
│   ├── useCreateCommitment.ts         # create commitment
│   └── useCompleteCommitment.ts       # complete commitment
└── __tests__/
```

### 20.2 Routes

```
/student-follow-ups                    # List (with filters)
/student-follow-ups/new                # Create form
/student-follow-ups/:id                # Detail + timeline
/student-follow-ups/:id/edit           # Edit form
```

### 20.3 List Page (StudentFollowUpsPage)

**Filters:**
- Student name (search)
- Type (dropdown: all types)
- Category (dropdown, dependent on type)
- Status (dropdown: all statuses)
- Severity (dropdown: all severities)
- Date range (from/to)
- My students only (checkbox, for teachers)

**Columns:**
- Student name
- Type badge
- Category
- Title
- Severity badge
- Status badge
- Created date
- Actions (view, edit)

### 20.4 Detail Page (StudentFollowUpDetailPage)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Header: Student name | Type | Status | Actions  │
├─────────────────────────────────────────────────┤
│ Info Card:                                      │
│   Category | Severity | Confidentiality         │
│   Created by | Created at                       │
│   Description                                   │
├─────────────────────────────────────────────────┤
│ Timeline:                                       │
│   2026-02-12  Record created                    │
│   2026-02-15  Follow-up: Intervention...        │
│   2026-02-20  Commitment created                │
│   2026-03-01  Evidence attached                 │
│   2026-03-05  Commitment completed              │
│   2026-03-20  Record closed                     │
├─────────────────────────────────────────────────┤
│ Commitments:                                    │
│   [Commitment 1] Status | Deadline | Responsible│
│   [Commitment 2] Status | Deadline | Responsible│
├─────────────────────────────────────────────────┤
│ Actions:                                        │
│   [Agregar seguimiento] [Crear compromiso]      │
│   [Adjuntar evidencia] [Cerrar caso]            │
└─────────────────────────────────────────────────┘
```

### 20.5 Form Page (StudentFollowUpFormPage)

**Step-by-step wizard:**
1. Student selection (searchable dropdown)
2. Type selection (cards with icons)
3. Category selection (filtered by type)
4. Details (title, description, severity)
5. Review & submit

### 20.6 Key Components

| Component | Description |
|-----------|-------------|
| `FollowUpTimeline` | Chronological list of entries, commitments, and events |
| `FollowUpTypeCard` | Selectable card for record type |
| `CommitmentCard` | Commitment display with status and actions |
| `SeverityBadge` | Color-coded severity indicator |
| `ConfidentialityBadge` | Confidentiality level indicator |
| `FollowUpFilters` | Advanced filter panel |

---

## 21. API ARCHITECTURE

### 21.1 Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/student-follow-ups` | `student-follow-ups:create` | Create a new record |
| `GET` | `/student-follow-ups` | `student-follow-ups:read` | List records (filtered by role) |
| `GET` | `/student-follow-ups/:id` | `student-follow-ups:read` | Get record detail |
| `PATCH` | `/student-follow-ups/:id` | `student-follow-ups:update` | Update record |
| `PATCH` | `/student-follow-ups/:id/close` | `student-follow-ups:close` | Close record |
| `PATCH` | `/student-follow-ups/:id/escalate` | `student-follow-ups:escalate` | Escalate record |
| `POST` | `/student-follow-ups/:id/entries` | `student-follow-ups:follow_up` | Add follow-up entry |
| `POST` | `/student-follow-ups/:id/commitments` | `student-follow-ups:commit` | Create commitment |
| `PATCH` | `/student-follow-ups/:id/commitments/:commitmentId/complete` | `student-follow-ups:commit` | Complete commitment |
| `POST` | `/student-follow-ups/:id/attachments` | `student-follow-ups:attach` | Attach file |
| `DELETE` | `/student-follow-ups/:id/attachments/:attachmentId` | `student-follow-ups:attach` | Remove attachment |
| `GET` | `/student-follow-ups/stats` | `student-follow-ups:read` | Get statistics |
| `GET` | `/student-follow-ups/categories` | `student-follow-ups:read` | List categories |

### 21.2 DTOs

**CreateStudentFollowUpDto:**
```typescript
{
  studentId: string;          // UUID, required
  type: FollowUpType;        // enum, required
  category: string;           // institution-configurable, required
  title: string;              // 3-200 chars, required
  description: string;        // 1-5000 chars, required
  severity?: FollowUpSeverity; // enum, optional
  confidentiality?: FollowUpConfidentiality; // enum, optional, default INTERNAL
  context?: Record<string, unknown>; // structured context, optional
}
```

**CreateFollowUpEntryDto:**
```typescript
{
  type: FollowUpEntryType;    // enum, required
  description: string;        // 1-5000 chars, required
  actionTaken?: string;       // max 1000 chars, optional
  responsibleUserId?: string; // UUID, optional
  nextFollowUpDate?: string;  // ISO date, optional
}
```

**CreateCommitmentDto:**
```typescript
{
  description: string;        // 1-5000 chars, required
  responsibleRole: CommitmentResponsibleRole; // enum, required
  responsibleUserId?: string; // UUID, conditional
  deadline: string;           // ISO date, required, must be future
  requestSignature?: boolean; // default false
}
```

**ListStudentFollowUpsQueryDto:**
```typescript
{
  page?: number;              // default 1
  limit?: number;             // default 20, max 100
  search?: string;            // free text
  studentId?: string;         // UUID filter
  type?: FollowUpType;        // enum filter
  category?: string;          // category filter
  status?: FollowUpStatus;    // enum filter
  severity?: FollowUpSeverity; // enum filter
  createdByUserId?: string;   // UUID filter
  createdFrom?: string;       // ISO date
  createdTo?: string;         // ISO date
  myStudentsOnly?: boolean;   // teacher filter
}
```

---

## 22. DATABASE ARCHITECTURE

### 22.1 New Prisma Models

```prisma
// === ENUMS ===

enum FollowUpType {
  ACADEMIC
  CONVIVENCIA
  FORMATIVO
  ASISTENCIA
  ORIENTACION
  RECONOCIMIENTO
}

enum FollowUpSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum FollowUpStatus {
  DRAFT
  OPEN
  IN_PROGRESS
  PENDING_FOLLOW_UP
  RESOLVED
  CLOSED
  ESCALATED
  REMITTED
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

// === MODELS ===

model StudentFollowUp {
  id                    String                   @id @default(uuid()) @db.Uuid
  institutionId         String                   @map("institution_id") @db.Uuid
  studentId             String                   @map("student_id") @db.Uuid
  type                  FollowUpType
  category              String                   @db.VarChar(100)
  title                 String                   @db.VarChar(200)
  description           String                   @db.Text
  context               Json?                    @db.Json
  severity              FollowUpSeverity?
  status                FollowUpStatus           @default(OPEN)
  confidentiality       FollowUpConfidentiality  @default(INTERNAL)
  createdByUserId       String                   @map("created_by_user_id") @db.Uuid
  lastModifiedByUserId  String?                  @map("last_modified_by_user_id") @db.Uuid
  closedByUserId        String?                  @map("closed_by_user_id") @db.Uuid
  closedAt              DateTime?                @map("closed_at")
  createdAt             DateTime                 @default(now()) @map("created_at")
  updatedAt             DateTime                 @updatedAt @map("updated_at")

  institution           Institution              @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  student               Student                  @relation(fields: [studentId], references: [id], onDelete: Restrict)
  createdByUser         User                     @relation("FollowUpCreator", fields: [createdByUserId], references: [id], onDelete: Restrict)
  lastModifiedByUser    User?                    @relation("FollowUpModifier", fields: [lastModifiedByUserId], references: [id], onDelete: SetNull)
  closedByUser          User?                    @relation("FollowUpCloser", fields: [closedByUserId], references: [id], onDelete: SetNull)
  followUpEntries       FollowUpEntry[]
  commitments           Commitment[]
  attachments           FollowUpAttachment[]

  @@unique([id, institutionId])
  @@index([institutionId, studentId])
  @@index([institutionId, status])
  @@index([institutionId, type])
  @@index([institutionId, createdByUserId])
  @@index([institutionId, createdAt])
}

model FollowUpEntry {
  id                    String              @id @default(uuid()) @db.Uuid
  institutionId         String              @map("institution_id") @db.Uuid
  studentFollowUpId     String              @map("student_follow_up_id") @db.Uuid
  type                  FollowUpEntryType
  description           String              @db.Text
  actionTaken           String?             @map("action_taken") @db.VarChar(1000)
  responsibleUserId     String?             @map("responsible_user_id") @db.Uuid
  nextFollowUpDate      DateTime?           @map("next_follow_up_date")
  createdByUserId       String              @map("created_by_user_id") @db.Uuid
  createdAt             DateTime            @default(now()) @map("created_at")

  studentFollowUp       StudentFollowUp     @relation(fields: [studentFollowUpId], references: [id], onDelete: Cascade)
  createdByUser         User                @relation("EntryCreator", fields: [createdByUserId], references: [id], onDelete: Restrict)
  responsibleUser       User?               @relation("EntryResponsible", fields: [responsibleUserId], references: [id], onDelete: SetNull)

  @@unique([id, institutionId])
  @@index([institutionId, studentFollowUpId])
  @@index([institutionId, nextFollowUpDate])
}

model Commitment {
  id                    String                    @id @default(uuid()) @db.Uuid
  institutionId         String                    @map("institution_id") @db.Uuid
  studentFollowUpId     String                    @map("student_follow_up_id") @db.Uuid
  description           String                    @db.Text
  responsibleRole       CommitmentResponsibleRole @map("responsible_role")
  responsibleUserId     String?                   @map("responsible_user_id") @db.Uuid
  deadline              DateTime
  status                CommitmentStatus          @default(PENDING)
  completedAt           DateTime?                 @map("completed_at")
  completionNotes       String?                   @map("completion_notes") @db.Text
  createdByUserId       String                    @map("created_by_user_id") @db.Uuid
  signatureRequestId    String?                   @map("signature_request_id") @db.Uuid
  createdAt             DateTime                  @default(now()) @map("created_at")
  updatedAt             DateTime                  @updatedAt @map("updated_at")

  studentFollowUp       StudentFollowUp           @relation(fields: [studentFollowUpId], references: [id], onDelete: Cascade)
  createdByUser         User                      @relation("CommitmentCreator", fields: [createdByUserId], references: [id], onDelete: Restrict)
  responsibleUser       User?                     @relation("CommitmentResponsible", fields: [responsibleUserId], references: [id], onDelete: SetNull)
  signatureRequest      SignatureRequest?         @relation(fields: [signatureRequestId], references: [id], onDelete: SetNull)

  @@unique([id, institutionId])
  @@index([institutionId, studentFollowUpId])
  @@index([institutionId, status])
  @@index([institutionId, deadline])
  @@index([institutionId, responsibleUserId])
}

model FollowUpAttachment {
  id                    String          @id @default(uuid()) @db.Uuid
  institutionId         String          @map("institution_id") @db.Uuid
  studentFollowUpId     String          @map("student_follow_up_id") @db.Uuid
  fileAssetId           String          @map("file_asset_id") @db.Uuid
  description           String?         @db.VarChar(500)
  createdByUserId       String          @map("created_by_user_id") @db.Uuid
  createdAt             DateTime        @default(now()) @map("created_at")

  studentFollowUp       StudentFollowUp @relation(fields: [studentFollowUpId], references: [id], onDelete: Cascade)
  fileAsset             FileAsset       @relation(fields: [fileAssetId], references: [id], onDelete: Restrict)
  createdByUser         User            @relation("AttachmentCreator", fields: [createdByUserId], references: [id], onDelete: Restrict)

  @@unique([id, institutionId])
  @@unique([studentFollowUpId, fileAssetId])
  @@index([institutionId, studentFollowUpId])
}

model FollowUpCategory {
  id                    String          @id @default(uuid()) @db.Uuid
  institutionId         String          @map("institution_id") @db.Uuid
  type                  FollowUpType
  name                  String          @db.VarChar(100)
  code                  String          @db.VarChar(50)
  sortOrder             Int             @default(0) @map("sort_order")
  isActive              Boolean         @default(true) @map("is_active")
  createdAt             DateTime        @default(now()) @map("created_at")

  institution           Institution     @relation(fields: [institutionId], references: [id], onDelete: Cascade)

  @@unique([institutionId, code])
  @@index([institutionId, type])
}
```

### 22.2 Relations to Existing Models

Add to existing models:

```prisma
// In Student model, add:
model Student {
  // ... existing fields ...
  followUps StudentFollowUp[]
}

// In User model, add:
model User {
  // ... existing fields ...
  createdFollowUps       StudentFollowUp[]     @relation("FollowUpCreator")
  modifiedFollowUps      StudentFollowUp[]     @relation("FollowUpModifier")
  closedFollowUps        StudentFollowUp[]     @relation("FollowUpCloser")
  createdEntries         FollowUpEntry[]       @relation("EntryCreator")
  responsibleEntries     FollowUpEntry[]       @relation("EntryResponsible")
  createdCommitments     Commitment[]          @relation("CommitmentCreator")
  responsibleCommitments Commitment[]          @relation("CommitmentResponsible")
  createdAttachments     FollowUpAttachment[]  @relation("AttachmentCreator")
}

// In Institution model, add:
model Institution {
  // ... existing fields ...
  followUps           StudentFollowUp[]
  followUpCategories  FollowUpCategory[]
}

// In FileAsset model, add:
model FileAsset {
  // ... existing fields ...
  followUpAttachments FollowUpAttachment[]
}

// In SignatureRequest model, add:
model SignatureRequest {
  // ... existing fields ...
  commitments Commitment[]
}
```

### 22.3 Index Strategy

| Index | Columns | Purpose |
|-------|---------|---------|
| Primary | `id, institutionId` | Composite PK for tenant isolation |
| Student lookup | `institutionId, studentId` | Get all records for a student |
| Status filter | `institutionId, status` | Filter by status |
| Type filter | `institutionId, type` | Filter by type |
| Creator lookup | `institutionId, createdByUserId` | Filter by creator |
| Date range | `institutionId, createdAt` | Date range queries |
| Follow-up reminders | `institutionId, nextFollowUpDate` | Pending follow-ups |
| Commitment deadlines | `institutionId, deadline` | Overdue commitments |

---

## 23. PERMISSION MODEL

### 23.1 New Permission Codes

| Code | Module | Description |
|------|--------|-------------|
| `student-follow-ups:read` | student-follow-ups | View records |
| `student-follow-ups:create` | student-follow-ups | Create new records |
| `student-follow-ups:update` | student-follow-ups | Modify records |
| `student-follow-ups:close` | student-follow-ups | Close cases |
| `student-follow-ups:escalate` | student-follow-ups | Escalate cases |
| `student-follow-ups:follow_up` | student-follow-ups | Add follow-up entries |
| `student-follow-ups:commit` | student-follow-ups | Create/manage commitments |
| `student-follow-ups:attach` | student-follow-ups | Attach/remove evidence |
| `student-follow-ups:manage` | student-follow-ups | Full management (admin) |
| `student-follow-ups:stats` | student-follow-ups | View statistics |
| `student-follow-ups:categories` | student-follow-ups | Manage categories |

### 23.2 Role Permission Mapping (MVP)

| Permission | INSTITUTION_ADMIN | TEACHER | PARENT | STUDENT |
|------------|------------------|---------|--------|---------|
| `student-follow-ups:read` | ✓ | ✓ | ✓ | ✓* |
| `student-follow-ups:create` | ✓ | ✓ | — | — |
| `student-follow-ups:update` | ✓ | ✓ | — | — |
| `student-follow-ups:close` | ✓ | — | — | — |
| `student-follow-ups:escalate` | ✓ | ✓ | — | — |
| `student-follow-ups:follow_up` | ✓ | ✓ | — | — |
| `student-follow-ups:commit` | ✓ | ✓ | — | — |
| `student-follow-ups:attach` | ✓ | ✓ | ✓ | — |
| `student-follow-ups:manage` | ✓ | — | — | — |
| `student-follow-ups:stats` | ✓ | ✓ | — | — |
| `student-follow-ups:categories` | ✓ | — | — | — |

\* = resource-level filtered to own records only

### 23.3 Permission Constants (Frontend)

```typescript
export const PERMISSIONS = {
  // ... existing permissions ...
  STUDENT_FOLLOW_UPS_READ: 'student-follow-ups:read',
  STUDENT_FOLLOW_UPS_CREATE: 'student-follow-ups:create',
  STUDENT_FOLLOW_UPS_UPDATE: 'student-follow-ups:update',
  STUDENT_FOLLOW_UPS_CLOSE: 'student-follow-ups:close',
  STUDENT_FOLLOW_UPS_ESCALATE: 'student-follow-ups:escalate',
  STUDENT_FOLLOW_UPS_FOLLOW_UP: 'student-follow-ups:follow_up',
  STUDENT_FOLLOW_UPS_COMMIT: 'student-follow-ups:commit',
  STUDENT_FOLLOW_UPS_ATTACH: 'student-follow-ups:attach',
  STUDENT_FOLLOW_UPS_MANAGE: 'student-follow-ups:manage',
  STUDENT_FOLLOW_UPS_STATS: 'student-follow-ups:stats',
  STUDENT_FOLLOW_UPS_CATEGORIES: 'student-follow-ups:categories',
} as const;
```

---

## 24. TESTING STRATEGY

### 24.1 Backend Tests

| Test Type | Scope | Count (est.) |
|-----------|-------|-------------|
| Unit (Jest) | Service methods, parent filtering, validation | 30-40 |
| Integration (Jest) | Controller + service + Prisma | 15-20 |
| Authorization | Permission guard + resource-level auth | 10-15 |
| Tenant isolation | Cross-tenant access denial | 5-8 |
| Lifecycle | Status transitions | 8-12 |
| Validation | DTO validation, business rules | 10-15 |

**Total estimated: 78-110 backend tests**

### 24.2 Frontend Tests

| Test Type | Scope | Count (est.) |
|-----------|-------|-------------|
| Component (Vitest) | Form, list, detail, timeline | 15-20 |
| Hook (Vitest) | Data fetching, mutations | 10-15 |
| PermissionGate | Access control rendering | 5-8 |

**Total estimated: 30-43 frontend tests**

### 24.3 E2E Tests (Playwright)

| Scenario | Actor | Steps |
|----------|-------|-------|
| Create academic record | Teacher | Login → Student → Follow-ups → New → Fill → Submit |
| View records (parent) | Parent | Login → Dashboard → Child selector → Follow-ups → Detail |
| Close case | Admin | Login → Follow-ups → Detail → Close → Verify |
| Commitment workflow | Teacher | Create → Add commitment → Student completes → Close |
| Permission denied | Student | Attempt to create → Verify 403 |
| Cross-tenant denial | User | Attempt to access other tenant's records → Verify 404 |
| Escalation | Teacher | Create → Escalate → Verify notification |

**Total estimated: 8-12 E2E scenarios**

---

## 25. SECURITY THREAT MODEL

| ID | Threat | Probability | Impact | Severity | Mitigation | Requires Legal Validation |
|----|--------|------------|--------|----------|------------|--------------------------|
| T01 | IDOR — Access another student's records | Medium | High | HIGH | Resource-level authorization via GuardianStudent / TeacherAssignment | No |
| T02 | BOLA — Access another institution's records | Low | Critical | CRITICAL | TenantContextGuard + institutionId on every query | No |
| T03 | Privilege escalation — Teacher creates records for any student | Medium | High | HIGH | TeacherAssignment → Enrollment relationship verification | No |
| T04 | Data leakage — Sensitive info exposed in notifications | Medium | High | HIGH | Privacy-aware notification messages, no sensitive content in titles | No |
| T05 | Unauthorized file download | Low | Medium | MEDIUM | FileAsset ownership + tenant isolation + access control | No |
| T06 | Mass assignment — Modify institutionId via DTO | Low | Critical | CRITICAL | institutionId from TenantContextGuard, never from DTO | No |
| T07 | Sensitive data exposure to parents | Medium | High | HIGH | Confidentiality field + access rules per confidentiality level | REQUIRES VALIDATION |
| T08 | Student sees other students' records | Medium | High | HIGH | Student self-access via Student.userId === currentUserId | No |
| T09 | Unauthorized case closure | Low | Medium | MEDIUM | Role-based closure permission | No |
| T10 | Audit trail tampering | Low | High | HIGH | Append-only audit log, no delete/update on AuditLog | No |
| T11 | Commitment signature bypass | Low | Low | LOW | Signature optional in MVP, can be required later | No |
| T12 | Category manipulation | Low | Low | LOW | Institution-scoped categories, admin-only management | No |

---

## 26. IMPACT ANALYSIS

| Area | Impact | Complexity | Risk | Reutilization |
|------|--------|-----------|------|---------------|
| **Prisma Schema** | HIGH | MEDIUM | LOW | New models + relations to existing |
| **Backend** | HIGH | HIGH | MEDIUM | New module following existing patterns |
| **Frontend** | HIGH | HIGH | MEDIUM | New module following existing patterns |
| **RBAC** | MEDIUM | LOW | LOW | New permission codes + role mapping |
| **Resource Authorization** | HIGH | MEDIUM | HIGH | Extend TeacherAssignment + GuardianStudent patterns |
| **Multi-tenancy** | MEDIUM | LOW | LOW | Follow existing institutionId pattern |
| **Files** | LOW | LOW | LOW | Direct reuse of FileAsset + new join table |
| **Signatures** | LOW | MEDIUM | LOW | Optional integration, can defer |
| **Notifications** | MEDIUM | LOW | LOW | Reuse existing Notification model + fan-out pattern |
| **Agenda** | LOW | MEDIUM | LOW | Add new event source, can defer |
| **Dashboard** | LOW | LOW | LOW | Add KPIs, can defer |
| **Reports** | LOW | MEDIUM | LOW | New feature, can defer |
| **E2E** | MEDIUM | MEDIUM | MEDIUM | New test scenarios |
| **Security** | HIGH | MEDIUM | HIGH | New authorization patterns + data sensitivity |
| **Documentation** | MEDIUM | LOW | LOW | New module docs |
| **Docker** | LOW | LOW | LOW | No changes needed |
| **CI/CD** | LOW | LOW | LOW | No changes needed |

---

## 27. RISK REGISTER

| ID | Risk | Probability | Impact | Severity | Mitigation | Owner | Requires Legal Validation |
|----|------|------------|--------|----------|------------|-------|--------------------------|
| R01 | Over-engineering the module | Medium | High | HIGH | Start with minimal MVP, iterate | PO | No |
| R02 | RBAC complexity explosion | Medium | Medium | MEDIUM | Keep permission count minimal, use resource-level auth | Dev | No |
| R03 | Privacy violation via data exposure | Low | Critical | CRITICAL | Confidentiality field + strict access rules + audit | Dev + PO | YES |
| R04 | Teacher creates inappropriate records | Medium | High | HIGH | Category validation + admin oversight + audit | PO | YES |
| R05 | Parent access to confidential records | Medium | High | HIGH | Confidentiality-based access restriction | Dev + PO | YES |
| R06 | Student tracking becomes punitive | Medium | High | HIGH | Product guidance: focus on formative, not disciplinary | PO | YES |
| R07 | Institution transfer data breach | Low | Critical | CRITICAL | Controlled transfer + no direct cross-tenant access | Dev + PO | YES |
| R08 | Module becomes a "catch-all" for everything | Medium | Medium | MEDIUM | Clear scope: educational follow-up only | PO | No |
| R09 | Performance with large datasets | Low | Medium | MEDIUM | Proper indexing + pagination + query optimization | Dev | No |
| R10 | Scope creep delays Cloud Staging | High | High | HIGH | Defer to Phase 2, don't block Cloud | PO | No |

---

## 28. PRODUCT OWNER DECISIONS

### DECISIONS THAT THE PRODUCT OWNER MUST DEFINE

| ID | Decision | Options | Recommendation | Status |
|----|----------|---------|---------------|--------|
| D01 | Should students see ALL their records or only PUBLIC/INTERNAL? | All / Public+Internal / None | Public+Internal (exclude CONFIDENTIAL) | OPEN |
| D02 | Should parents see CONFIDENTIAL records? | Yes / No / With approval | No (respect counseling confidentiality) | OPEN |
| D03 | Who can create CONVIVENCIA records? | Admin only / Teachers + Admin / All staff | Teachers + Admin (with their students) | OPEN |
| D04 | Should commitments require signatures? | Always / Optional / Never | Optional (configurable per institution) | OPEN |
| D05 | Should the module include institution transfer in MVP? | Yes / No / Phase 2 | Phase 2 (defer to avoid scope creep) | OPEN |
| D06 | Should closed records be reopenable? | Never / Admin only / With justification | Admin only, with audit trail | OPEN |
| D07 | Should SUPER_ADMIN see student data? | Yes / No / With justification | No (platform management only) | OPEN |
| D08 | Should the module track attendance separately? | Yes / No / Integrate with existing | No (use ASISTENCIA type in follow-ups) | OPEN |
| D09 | What is the minimum viable set of record types? | All 6 / Academic + Convivencia + Formativo / Core 3 | Core 3 (Academic, Convivencia, Formativo) for MVP | OPEN |
| D10 | Should the module have its own notification preferences? | Yes / No | No (reuse global notification settings) | OPEN |
| D11 | Should the form use a step-by-step wizard or single form? | Wizard / Single form | Wizard (better UX for teachers) | OPEN |
| D12 | Should the timeline show commitment status changes? | Yes / No | Yes (comprehensive trail) | OPEN |

---

## 29. RECOMMENDED PRODUCT SCOPE

### 29.1 MVP Scope (Phase 2, Prompt 71-76)

**INCLUDED:**
- StudentFollowUp CRUD (create, read, update, close)
- 3 record types: ACADEMIC, CONVIVENCIA, FORMATIVO
- Follow-up entries (add, view)
- Commitments (create, complete)
- File attachment (evidence)
- Role-based access (Admin, Teacher, Parent, Student)
- Resource-level authorization (Teacher → students, Parent → children, Student → self)
- Status lifecycle (OPEN → IN_PROGRESS → RESOLVED → CLOSED)
- Severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- Confidentiality levels (PUBLIC, INTERNAL, CONFIDENTIAL, SENSITIVE)
- Audit trail (AuditLog integration)
- Notifications (on create, escalation, commitment)
- Institution-scoped categories (admin configurable)
- List view with filters
- Detail view with timeline
- Form wizard for creation

**DEFERRED to future phases:**
- ASISTENCIA, ORIENTACION, RECONOCIMIENTO types
- Configurable templates
- Signature integration
- Agenda integration
- Dashboard KPIs
- Reporting / export
- Institution transfer
- Retention policies
- Advanced analytics

### 29.2 Phase Placement Recommendation

| Phase | Content | Status |
|-------|---------|--------|
| FASE 0 | Architecture | COMPLETED |
| FASE 1 | MVP | COMPLETED |
| FASE 1.5 | Validation | COMPLETED |
| FASE 1.9 | Cloud Staging | PENDING (should proceed first) |
| **FASE 2** | **Observador del Alumno** | **RECOMMENDED** |
| FASE 2.5 | Signatures + Agenda + Dashboard integration | Future |
| FASE 3 | Reporting + Analytics + Transfer | Future |

**Recommendation:** The Observador module should be FASE 2, implemented AFTER Cloud Staging (FASE 1.9) is complete.

---

## 30. ROADMAP

### 30.1 High-Level Roadmap

```
FASE 1.9 — Cloud Staging
    │
    ▼ PROMPT 70 (this document)
    │ Discovery, Architecture, Roadmap
    │
    ▼ PROMPT 71
    │ Domain Model / Prisma Schema
    │ - New enums
    │ - New models (StudentFollowUp, FollowUpEntry, Commitment, FollowUpAttachment, FollowUpCategory)
    │ - Relations to existing models
    │ - Migration
    │ - Seed data
    │
    ▼ PROMPT 72
    │ RBAC / Permissions
    │ - New permission codes
    │ - Role mapping
    │ - Authorization service extension
    │ - Resource-level authorization (Teacher, Parent, Student)
    │ - Backend permission guard tests
    │
    ▼ PROMPT 73
    │ Backend CRUD
    │ - StudentFollowUpsController
    │ - StudentFollowUpsService
    │ - DTOs + validation
    │ - CRUD operations
    │ - Status lifecycle
    │ - Audit trail
    │ - Unit tests
    │
    ▼ PROMPT 74
    │ Follow-ups / Commitments
    │ - FollowUpEntry CRUD
    │ - Commitment CRUD
    │ - Status transitions
    │ - Notifications fan-out
    │ - File attachment
    │ - Unit tests
    │
    ▼ PROMPT 75
    │ Frontend
    │ - Module structure
    │ - List page with filters
    │ - Detail page with timeline
    │ - Form wizard
    │ - PermissionGate integration
    │ - ChildSelector integration
    │ - Component tests
    │
    ▼ PROMPT 76
       E2E / Security / Acceptance
       - Playwright E2E tests
       - Security validation
       - Cross-tenant tests
       - Performance validation
       - Documentation
       - Release candidate
```

---

## 31. RECOMMENDED PROMPT SEQUENCE

| Prompt | Name | Phase | Dependencies | Estimated Effort |
|--------|------|-------|-------------|-----------------|
| 70 | Discovery / Architecture | Analysis | — | Completed (this document) |
| 71 | Domain Model / Prisma | FASE 2 | 70 | Small |
| 72 | RBAC / Permissions | FASE 2 | 71 | Medium |
| 73 | Backend CRUD | FASE 2 | 72 | Large |
| 74 | Follow-ups / Commitments | FASE 2 | 73 | Medium-Large |
| 75 | Frontend | FASE 2 | 74 | Large |
| 76 | E2E / Security / Acceptance | FASE 2 | 75 | Medium |

**Total estimated prompts:** 6 (71-76)
**Total estimated new tests:** 120-160 (backend + frontend + E2E)

---

## 32. ACCEPTANCE CRITERIA FOR FUTURE IMPLEMENTATION

### 32.1 Functional Acceptance Criteria

- [ ] Admin can create a student follow-up record with type, category, title, description
- [ ] Teacher can create records for students they have an academic relationship with
- [ ] Parent can view records for their linked children only
- [ ] Student can view their own records only
- [ ] Follow-up entries can be added to existing records
- [ ] Commitments can be created with deadlines and responsible parties
- [ ] Records can be closed by authorized roles
- [ ] Status transitions follow the defined lifecycle
- [ ] Confidentiality levels restrict access appropriately
- [ ] File evidence can be attached to records
- [ ] Notifications are sent on relevant events
- [ ] Audit trail captures all mutations
- [ ] Categories are configurable per institution
- [ ] List view supports filtering by type, status, severity, student, date
- [ ] Detail view shows complete timeline

### 32.2 Non-Functional Acceptance Criteria

- [ ] All queries are scoped to institutionId (tenant isolation)
- [ ] Teacher access is limited to their assigned students
- [ ] Parent access is limited to their linked children
- [ ] Student access is limited to their own records
- [ ] Sensitive data access is logged
- [ ] No IDOR vulnerabilities (resource-level authorization)
- [ ] No cross-tenant data leakage
- [ ] Backend tests: 100+ passing
- [ ] Frontend tests: 30+ passing
- [ ] E2E tests: 8+ scenarios passing
- [ ] ESLint: 0 errors
- [ ] TypeScript: strict mode, no errors
- [ ] Docker: builds and runs successfully

---

## 33. DOCUMENTATION CREATED

| File | Description |
|------|-------------|
| `docs/70-observador-del-alumno-discovery.md` | This document — complete discovery, architecture, and roadmap |

---

## 34. FILES MODIFIED

**NONE.** This is a read-only analysis prompt. No files were modified.

---

## 35. GIT STATUS

```
On branch main
Last commit: 0c27580 — feat(auth): add parent multi-child filtering and guardian notifications
Working tree: clean (no uncommitted changes)
```

---

## 36. FINAL VERDICT

### The Observador del Alumno is a significant but well-scoped module.

**What we know:**
- The concept is well-understood: a parametrizable student follow-up system
- The existing architecture supports it: RBAC, multi-tenancy, parent filtering, files, notifications, signatures
- 7 existing modules can be partially reused
- The domain model is clear: StudentFollowUp → FollowUpEntry → Commitment → Attachment
- The authorization model extends existing patterns (GuardianStudent for parents, TeacherAssignment for teachers)
- The privacy model uses 4 confidentiality levels with role-based access

**What we need to decide (PO):**
- Student/parent access to confidential records (D01, D02)
- Minimum viable record types (D09)
- Institution transfer scope (D05)
- Closed record reopening policy (D06)
- SUPER_ADMIN data access policy (D07)

**Recommended next step:**
- Proceed with Cloud Staging (FASE 1.9) first
- Then implement the Observador as FASE 2
- Start with PROMPT 71 (Domain Model / Prisma Schema)

**The module is architecturally sound, technically feasible, and productively valuable. It should be implemented after Cloud Staging, following the 6-prompt roadmap defined in this document.**

---

*Document generated by PROMPT 70 — Discovery, Architecture & Roadmap. No functional code was modified.*
