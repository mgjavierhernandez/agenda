# PROMPT 70-A — PRODUCT OWNER REVIEW & DECISION RESOLUTION
## OBSERVADOR DEL ALUMNO — AGENDA ESCOLAR DIGITAL

**Date:** 2026-08-27
**Status:** PRODUCT REVIEW — AWAITING PO APPROVAL
**Version:** 1.0.0
**Scope:** Functional specification, security analysis, decision resolution for the "Observador del Alumno" module

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Context](#2-context)
3. [Discovery Review](#3-discovery-review)
4. [D01-D12 Decision Analysis](#4-d01-d12-decision-analysis)
5. [Functional Definition](#5-functional-definition)
6. [MVP Scope](#6-mvp-scope)
7. [Lifecycle](#7-lifecycle)
8. [Roles & Authorization](#8-roles--authorization)
9. [Confidentiality](#9-confidentiality)
10. [Auditability](#10-auditability)
11. [Retention](#11-retention)
12. [Attachments](#12-attachments)
13. [Signatures](#13-signatures)
14. [Notifications](#14-notifications)
15. [Agenda](#15-agenda)
16. [Institution Transfer](#16-institution-transfer)
17. [Domain Model Review](#17-domain-model-review)
18. [Permissions](#18-permissions)
19. [UX](#19-ux)
20. [Security](#20-security)
21. [Risk Register](#21-risk-register)
22. [PO Decisions](#22-po-decisions)
23. [Proposed MVP Specification](#23-proposed-mvp-specification)
24. [Roadmap](#24-roadmap)
25. [Dependencies](#25-dependencies)
26. [PROMPT 71 Entry Criteria](#26-prompt-71-entry-criteria)
27. [Open Questions](#27-open-questions)
28. [Final Recommendation](#28-final-recommendation)

---

## 1. EXECUTIVE SUMMARY

This document is the formal product review of the "Observador del Alumno" (Student Observer) module for Agenda Escolar Digital. It converts the technical discovery from PROMPT 70 into a functional specification suitable for Product Owner review and approval.

### What is the Observador?

The Observador del Alumno is an **institutional tool for registering and tracking relevant aspects of a student's school trajectory**. It is NOT a legally mandated system — it operates under institutional autonomy (PEI, Manual de Convivencia).

### What it is NOT:

- It is NOT a grade book (grades remain in `Grade` model)
- It is NOT an attendance system (attendance tracking remains separate)
- It is NOT a psychological record (orientation records are a type, not the whole module)
- It is NOT a discipline system (convivencia is one type, but the module is formative, not punitive)
- It is NOT a communication channel (communications remain in `Communication` model)
- It is NOT a file repository (files remain in `FileAsset` model)

### Key findings:

| Dimension | Finding |
|-----------|---------|
| **Complexity** | HIGH — touches RBAC, multi-tenancy, students, guardians, files, notifications, signatures |
| **Reusability** | MEDIUM-HIGH — 7 existing modules partially reusable |
| **Risk** | MEDIUM — privacy, data sensitivity, RBAC escalation are primary concerns |
| **Phase placement** | FASE 2 (post-Cloud Staging) |
| **Estimated prompts** | 6 prompts (71-76) |

### Status:

- PROMPT 70 (Discovery): COMPLETED
- **PROMPT 70-A (Product Review): THIS DOCUMENT — AWAITING PO APPROVAL**
- Cloud Staging (FASE 1.9): PENDING — should proceed first
- PROMPT 71 (Domain Model): BLOCKED on PO decisions

---

## 2. CONTEXT

### 2.1 Project State

Agenda Escolar Digital v1.0.1 has been validated and is ready for Cloud Staging. A new functional requirement emerged: the Observador del Alumno module. The decision is to NOT deploy yet — first define correctly.

### 2.2 Architecture Context

```
AccessTokenGuard → TenantContextGuard → PermissionGuard → Controller → Service → Prisma
```

- Multi-tenant via `X-Institution-Id` header
- RBAC with 52 permissions, 5 roles
- Resource-level authorization via `GuardianStudent` and `TeacherAssignment`
- 32 existing Prisma models
- Backend: NestJS + TypeScript strict + Prisma 6.19.3 + PostgreSQL 16
- Frontend: React + Vite + Tailwind + TanStack React Query

### 2.3 Existing Patterns

The system already has proven patterns for:
- Parent filtering: `resolveParentContext()` in `apps/api/src/common/auth/parent-context.ts`
- Teacher-student relationship: `TeacherAssignment → Enrollment → Student`
- Guardian access: `GuardianStudent` model
- File attachments: `FileAsset` + join tables (`TaskAttachment`, `CommunicationAttachment`)
- Signatures: `SignatureRequest` + `SignatureRecipient`
- Notifications: `Notification` model with fan-out pattern
- Audit: `AuditLog` model

---

## 3. DISCOVERY REVIEW

### 3.1 PROMPT 70 Deliverables

PROMPT 70 produced:
- Complete technical discovery document (2051 lines)
- Domain model proposal (5 entities, 7 enums)
- RBAC matrix (11 new permissions)
- Security threat model (12 threats)
- Risk register (10 risks)
- 6-prompt implementation roadmap

### 3.2 What is Good

1. **Entity design is sound**: `StudentFollowUp → FollowUpEntry → Commitment → Attachment` is a natural hierarchy
2. **Reuse strategy is correct**: Leveraging `FileAsset`, `SignatureRequest`, `Notification`, `AuditLog`
3. **Authorization model extends existing patterns**: TeacherAssignment for teachers, GuardianStudent for parents
4. **Privacy model is appropriate**: 4-level confidentiality with role-based access
5. **Multi-tenancy is properly scoped**: `institutionId` on every entity

### 3.3 What Needs Decision

12 product decisions (D01-D12) remain OPEN
Legal/privacy considerations need validation
Some design choices depend on institutional policies

### 3.4 What Needs Correction

1. Discovery introduces "COORDINATOR" and "COUNSELOR" roles that don't exist in the current system
2. The state machine has 8 states — may be excessive for MVP
3. 6 record types proposed — only 3 recommended for MVP

---

## 4. D01-D12 DECISION ANALYSIS

### D01 — Student Visibility of Own Records

------------------------------------------------------------
**D01 — ¿Qué registros puede ver el estudiante?**
------------------------------------------------------------

**1. Pregunta que debemos resolver**

¿Debe el estudiante poder ver TODOS sus registros en el Observador, solo los PUBLIC/INTERNAL, o ninguno?

**2. Contexto encontrado en PROMPT 70**

PROMPT 70 propone que el estudiante pueda ver sus propios registros pero no define si la confidencialidad restringe esto. El campo `confidentiality` tiene 4 niveles: PUBLIC, INTERNAL, CONFIDENTIAL, SENSITIVE.

**3. Decisión que actualmente está abierta**

Sí — el alcance de visibilidad del estudiante no está definido.

**4. Alternativas posibles**

**Opción A: Ver todos sus registros (independiente de confidencialidad)**
- Descripción: El estudiante ve todo lo que se registra sobre él
- Ventajas: Transparencia total, auto-conocimiento
- Desventajas: Puede ver información sensible (ej. situaciones familiares)
- Impacto técnico: Bajo — solo filtrar por `Student.userId === currentUserId`
- Impacto funcional: Alto — el estudiante ve todo
- Impacto de seguridad/privacidad: MEDIO — puede exponer información confidencial
- Impacto futuro: Requiere considerar derecho de acceso (habeas data)

**Opción B: Ver solo PUBLIC + INTERNAL (excluir CONFIDENTIAL y SENSITIVE)**
- Descripción: El estudiante ve registros públicos e internales, pero no confidenciales ni sensibles
- Ventajas: Balance entre transparencia y privacidad
- Desventajas: El estudiante no ve registros de orientación psicológica
- Impacto técnico: Bajo — filtrar por `confidentiality IN ('PUBLIC', 'INTERNAL')`
- Impacto funcional: MEDIO — el estudiante tiene visibilidad parcial
- Impacto de seguridad/privacidad: BAJO — protege información sensible
- Impacto futuro: Alineado con principios de minimización

**Opción C: No ver ningún registro**
- Descripción: El estudiante no tiene acceso al Observador
- Ventajas: Máxima protección
- Desventajas: viola derecho de acceso del estudiante
- Impacto técnico: Bajo
- Impacto funcional: Alto — el estudiante queda excluido
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Puede generar problemas legales

**5. Recomendación de arquitectura/producto**

**Opción B: Ver solo PUBLIC + INTERNAL**

**6. Justificación**

El estudiante tiene derecho a conocer su proceso educativo, pero existen registros (orientación psicológica, situaciones familiares) que no deberían ser visibles para él. Esto平衡 transparencia con protección.

**7. ¿Bloquea PROMPT 71?**

Parcialmente — afecta las reglas de autorización en el servicio.

**8. ¿Requiere validación jurídica/privacidad?**

Recomendable — el derecho de acceso del estudiante debe considerarse.

**9. Estado**

REQUIERE DECISIÓN PO

---

### D02 — Parent Visibility of Confidential Records

------------------------------------------------------------
**D02 — ¿Puede el acudiente ver registros CONFIDENTIAL?**
------------------------------------------------------------

**1. Pregunta que debemos resolver**

¿Debe el acudiente poder ver registros marcados como CONFIDENTIAL, o estos deben estar restringidos solo al personal de orientación?

**2. Contexto encontrado en PROMPT 70**

PROMPT 70 propone que los padres vean registros de sus hijos mediante `GuardianStudent`, pero no define si la confidencialidad aplica.

**3. Decisión que actualmente está abierta**

Sí — el acceso de padres a registros confidenciales no está definido.

**4. Alternativas posibles**

**Opción A: Padre ve todos los registros (incluyendo CONFIDENTIAL)**
- Descripción: El padre tiene acceso completo a los registros de su hijo
- Ventajas: Transparencia familiar, participación informada
- Desventajas: Puede exponer información sensible (ej. notas de orientación)
- Impacto técnico: Bajo — solo filtrar por `GuardianStudent`
- Impacto funcional: Alto — el padre ve todo
- Impacto de seguridad/privacidad: ALTO — puede violar confidencialidad del menor
- Impacto futuro: Puede generar conflictos legales

**Opción B: Padre ve PUBLIC + INTERNAL (excluir CONFIDENTIAL y SENSITIVE)**
- Descripción: El padre ve registros públicos e internales, pero no confidenciales
- Ventajas: Protege confidencialidad de orientación
- Desventajas: El padre no conoce registros de orientación psicológica
- Impacto técnico: Bajo — filtrar por `confidentiality IN ('PUBLIC', 'INTERNAL')`
- Impacto funcional: MEDIO — acceso parcial
- Impacto de seguridad/privacidad: BAJO — protege información sensible
- Impacto futuro: Alineado con buenas prácticas

**Opción C: Padre ve PUBLIC + INTERNAL + CONFIDENTIAL (excluir SENSITIVE)**
- Descripción: El padre ve todo excepto registros sensibles
- Ventajas: Mayor transparencia
- Desventajas: Puede exponer información confidencial
- Impacto técnico: Bajo
- Impacto funcional: MEDIO-Alto
- Impacto de seguridad/privacidad: MEDIO
- Impacto futuro: Requiere validación

**5. Recomendación de arquitectura/producto**

**Opción B: Padre ve solo PUBLIC + INTERNAL**

**6. Justificación**

Los registros CONFIDENTIAL típicamente contienen notas de orientación psicológica que son confidenciales entre el estudiante y el orientador. El padre no necesita acceder a esta información para participar en el proceso educativo.

**7. ¿Bloquea PROMPT 71?**

Parcialmente — afecta las reglas de autorización.

**8. ¿Requiere validación jurídica/privacidad?**

Sí — la confidencialidad de registros de orientación puede tener implicaciones legales.

**9. Estado**

REQUIERE DECISIÓN PO + VALIDACIÓN LEGAL

---

### D03 — Who Can Create CONVIVENCIA Records

------------------------------------------------------------
**D03 — ¿Quién puede crear registros de CONVIVENCIA?**
------------------------------------------------------------

**1. Pregunta que debemos resolver**

¿Solo el administrador puede crear registros de convivencia, o también los docentes?

**2. Contexto encontrado en PROMPT 70**

PROMPT 70 propone que TEACHER + INSTITUTION_ADMIN puedan crear registros CONVIVENCIA para sus estudiantes.

**3. Decisión que actualmente está abierta**

Sí — los roles con permiso de creación no están definidos.

**4. Alternativas posibles**

**Opción A: Solo INSTITUTION_ADMIN**
- Descripción: Solo el administrador puede crear registros de convivencia
- Ventajas: Control centralizado, consistencia
- Desventajas: El docente no puede reportar situaciones directamente
- Impacto técnico: Bajo
- Impacto funcional: ALTO — genera cuello de botella
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Limita escalabilidad

**Opción B: INSTITUTION_ADMIN + TEACHER (con sus estudiantes)**
- Descripción: El docente puede crear registros para sus estudiantes asignados
- Ventajas: Reporte ágil, documentación en el momento
- Desventajas: Riesgo de registros inconsistentes
- Impacto técnico: MEDIO — requiere verificación `TeacherAssignment → Enrollment`
- Impacto funcional: MEDIO — distribuido pero controlado
- Impacto de seguridad/privacidad: MEDIO — requiere(resource-level auth)
- Impacto futuro: Escalable

**Opción C: Todos los staff (admin, teacher, coordinator, counselor)**
- Descripción: Cualquier miembro del staff puede crear registros
- Ventajas: Máxima cobertura
- Desventajas: Difícil control de calidad
- Impacto técnico: MEDIO
- Impacto funcional: BAJO — difícil gobernanza
- Impacto de seguridad/privacidad: ALTO — más puntos de acceso
- Impacto futuro: Requiere roles adicionales

**5. Recomendación de arquitectura/producto**

**Opción B: INSTITUTION_ADMIN + TEACHER**

**6. Justificación**

El docente es quien tiene contacto directo con el estudiante y puede observar situaciones que requieren registro. El administrador necesita acceso para registros institucionales. Los roles "COORDINATOR" y "COUNSELOR" no existen actualmente — pueden ser creados como roles personalizados por el INSTITUTION_ADMIN con permisos similares.

**7. ¿Bloquea PROMPT 71?**

Sí — define quién tiene `student-follow-ups:create`.

**8. ¿Requiere validación jurídica/privacidad?**

No

**9. Estado**

REQUIERE DECISIÓN PO

---

### D04 — Signatures on Commitments

------------------------------------------------------------
**D04 — ¿Los compromisos deben requerir firmas?**
------------------------------------------------------------

**1. Pregunta que debemos resolver**

¿Debe cada compromiso tener una firma digital asociada, o esto es opcional?

**2. Contexto encontrado en PROMPT 70**

PROMPT 70 propone que las firmas sean OPCIONALES en el MVP, reutilizando `SignatureRequest`.

**3. Decisión que actualmente está abierta**

Sí — la política de firmas no está definida.

**4. Alternativas posibles**

**Opción A: Siempre requerir firma**
- Descripción: Todo compromiso debe ser firmado por las partes
- Ventajas: Formalidad, trazabilidad legal
- Desventajas: Complejidad adicional, puede ser excesivo para compromisos simples
- Impacto técnico: MEDIO — crear `SignatureRequest` automáticamente
- Impacto funcional: ALTO —增加了flujo
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Bueno para formalización

**Opción B: Opcional (configurable por institución)**
- Descripción: La institución decide si requiere firmas
- Ventajas: Flexibilidad
- Desventajas: Inconsistencia entre instituciones
- Impacto técnico: BAJO — flag en `Commitment.requestSignature`
- Impacto funcional: BAJO — flexibilidad
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Permite iteración

**Opción C: Nunca en MVP**
- Descripción: No incluir firmas en el MVP
- Ventajas: Simplicidad, rapídez de implementación
- Desventajas: Falta formalidad
- Impacto técnico: BAJO
- Impacto funcional: BAJO
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Puede agregarse después

**5. Recomendación de arquitectura/producto**

**Opción B: Opcional (configurable por institución)**

**6. Justificación**

Las instituciones tienen diferentes niveles de formalidad. Algunas pueden requerir firmas para compromisos formales, otras pueden no necesitarlas. La opción B permite que cada institución decida.

**7. ¿Bloquea PROMPT 71?**

No — se puede implementar el flag `requestSignature` y agregar firmas después.

**8. ¿Requiere validación jurídica/privacidad?**

No

**9. Estado**

RECOMENDADO

---

### D05 — Institution Transfer in MVP

------------------------------------------------------------
**D05 — ¿Incluir transferencia entre instituciones en el MVP?**
------------------------------------------------------------

**1. Pregunta que debemos resolver**

¿Debe el MVP soportar la transferencia de registros entre instituciones?

**2. Contexto encontrado en PROMPT 70**

PROMPT 70 propone transferencia controlada como Fase 2.5+.

**3. Decisión que actualmente está abierta**

Sí — el alcance de transferencia no está definido.

**4. Alternativas posibles**

**Opción A: Incluir en MVP**
- Descripción: Implementar transferencia controlada desde el inicio
- Ventajas: Continuidad desde el día 1
- Desventajas: Alta complejidad, retrasa MVP
- Impacto técnico: ALTO — modelo `StudentTransferRecord`, validación cross-tenant
- Impacto funcional: MEDIO — uso infrecuente al inicio
- Impacto de seguridad/privacidad: ALTO — requiere validación legal
- Impacto futuro: Bueno para escalabilidad

**Opción B: Diferir a Fase 2.5+**
- Descripción: No implementar transferencia en MVP
- Ventajas: Simplifica MVP, reduce riesgo
- Desventajas: Los registros quedan aislados por institución
- Impacto técnico: BAJO
- Impacto funcional: BAJO — uso infrecuente
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Puede agregarse después

**5. Recomendación de arquitectura/producto**

**Opción B: Diferir a Fase 2.5+**

**6. Justificación**

La transferencia entre instituciones es un caso de uso infrecuente que introduce complejidad significativa (multi-tenancy, privacidad, trazabilidad). El MVP debe enfocarse en el seguimiento dentro de una institución.

**7. ¿Bloquea PROMPT 71?**

No — se puede implementar sin transferencia.

**8. ¿Requiere validación jurídica/privacidad?**

Sí — la Ley 1581/2012 tiene implicaciones sobre transferencia de datos personales.

**9. Estado**

RECOMENDADO (diferir)

---

### D06 — Reopening Closed Records

------------------------------------------------------------
**D06 — ¿Se pueden reabrir registros cerrados?**
------------------------------------------------------------

**1. Pregunta que debemos resolver**

¿Debe permitirse la reapertura de registros cerrados, y bajo qué condiciones?

**2. Contexto encontrado en PROMPT 70**

PROMPT 70 define CLOSED como estado terminal e inmutable.

**3. Decisión que actualmente está abierta**

Sí — la política de reapertura no está definida.

**4. Alternativas posibles**

**Opción A: Nunca reabrir**
- Descripción: Una vez cerrado, el registro es inmutable
- Ventajas: Integridad del historial
- Desventajas: No permite correcciones
- Impacto técnico: BAJO
- Impacto funcional: MEDIO — rigidez
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Histórico limpio

**Opción B: Solo administrador, con justificación**
- Descripción: El administrador puede reabrir con auditoría
- Ventajas: Flexibilidad controlada
- Desventajas: Complejidad adicional
- Impacto técnico: MEDIO — nuevo estado `REOPENED`, auditoría
- Impacto funcional: BAJO — uso excepcional
- Impacto de seguridad/privacidad: MEDIO — requiere auditoría
- Impacto futuro: Permite correcciones

**Opción C: Cualquier rol autorizado, con justificación**
- Descripción: El docente o coordinador pueden reabrir
- Ventajas: Máxima flexibilidad
- Desventajas: Riesgo de manipulación
- Impacto técnico: MEDIO
- Impacto funcional: MEDIO
- Impacto de seguridad/privacidad: ALTO — riesgo de alteración
- Impacto futuro: Requiere control estricto

**5. Recomendación de arquitectura/producto**

**Opción B: Solo administrador, con justificación y auditoría**

**6. Justificación**

La reapertura debe ser excepcional y estar documentada. Solo el administrador tiene la autoridad para reabrir un caso cerrado, y debe registrar la justificación.

**7. ¿Bloquea PROMPT 71?**

Parcialmente — afecta el modelo de estados.

**8. ¿Requiere validación jurídica/privacidad?**

No

**9. Estado**

RECOMENDADO

---

### D07 — SUPER_ADMIN Access to Student Data

------------------------------------------------------------
**D07 — ¿Puede SUPER_ADMIN ver datos de estudiantes?**
------------------------------------------------------------

**1. Pregunta que debemos resolver**

¿Debe el SUPER_ADMIN tener acceso a los registros del Observador a nivel global?

**2. Contexto encontrado en PROMPT 70**

PROMPT 70 recomienda NO dar acceso automático a SUPER_ADMIN por privacidad.

**3. Decisión que actualmente está abierta**

Sí — la política de SUPER_ADMIN no está definida.

**4. Alternativas posibles**

**Opción A: SUPER_ADMIN ve todo**
- Descripción: Acceso global a todos los registros
- Ventajas: Supervisión total
- Desventajas: Riesgo de privacidad, acceso excesivo
- Impacto técnico: BAJO
- Impacto funcional: ALTO — acceso sin restricciones
- Impacto de seguridad/privacidad: ALTO — acceso a datos sensibles
- Impacto futuro: Puede violar principios de minimización

**Opción B: SUPER_ADMIN NO ve datos de estudiantes**
- Descripción: SUPER_ADMIN gestiona plataformas, no ve datos personales
- Ventajas: Protección de privacidad
- Desventajas: No puede supervisar contenido
- Impacto técnico: BAJO
- Impacto funcional: BAJO — supervisión limitada
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Alineado con minimización

**Opción C: SUPER_ADMIN ve solo metadatos (sin contenido)**
- Descripción: Ve estadísticas agregadas, no registros individuales
- Ventajas: Supervisión sin exposición
- Desventajas: Complejidad adicional
- Impacto técnico: MEDIO
- Impacto funcional: MEDIO
- Impacto de seguridad/privacidad: MEDIO
- Impacto futuro: Buen balance

**5. Recomendación de arquitectura/producto**

**Opción B: SUPER_ADMIN NO ve datos de estudiantes**

**6. Justificación**

SUPER_ADMIN gestiona la plataforma (instituciones, usuarios, configuración). No necesita acceder a datos personales de estudiantes. Esto sigue el principio de minimización de datos.

**7. ¿Bloquea PROMPT 71?**

No — se puede implementar sin acceso de SUPER_ADMIN.

**8. ¿Requiere validación jurídica/privacidad?**

Recomendable

**9. Estado**

RECOMENDADO

---

### D08 — Attendance Tracking

------------------------------------------------------------
**D08 — ¿Incluir asistencia en el Observador?**
------------------------------------------------------------

**1. Pregunta que debemos resolver**

¿Debe el Observador incluir un sistema de asistencia integrado?

**2. Contexto encontrado en PROMPT 70**

PROMPT 70 propone tipo ASISTENCIA pero sugiere no incluirlo en MVP.

**3. Decisión que actualmente está abierta**

Sí — el alcance de asistencia no está definido.

**4. Alternativas posibles**

**Opción A: Incluir tipo ASISTENCIA en MVP**
- Descripción: Tipos predefinidos para asistencia
- Ventajas: Seguimiento integral
- Desventajas: El Observador no es un sistema de asistencia
- Impacto técnico: BAJO — solo enum value
- Impacto funcional: MEDIO — requiere campos específicos
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Confunde propósito del módulo

**Opción B: No incluir ASISTENCIA en MVP**
- Descripción: Mantener Observador enfocado en seguimiento formativo
- Ventajas: Claridad de propósito
- Desventajas: No integra asistencia
- Impacto técnico: BAJO
- Impacto funcional: BAJO
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Sistema de asistencia separado

**5. Recomendación de arquitectura/producto**

**Opción B: No incluir ASISTENCIA en MVP**

**6. Justificación**

El Observador es un módulo de seguimiento formativo, no un sistema de asistencia. La asistencia debe ser un módulo separado con su propia lógica (biometría, QR, listas de cotejo).

**7. ¿Bloquea PROMPT 71?**

No

**8. ¿Requiere validación jurídica/privacidad?**

No

**9. Estado**

RECOMENDADO

---

### D09 — Minimum Viable Record Types

------------------------------------------------------------
**D09 — ¿Cuáles tipos de registro incluir en MVP?**
------------------------------------------------------------

**1. Pregunta que debemos resolver**

¿Cuántos tipos de registro debe soportar el MVP?

**2. Contexto encontrado en PROMPT 70**

PROMPT 70 propone 6 tipos: ACADEMICO, CONVIVENCIA, FORMATIVO, ASISTENCIA, ORIENTACION, RECONOCIMIENTO.

**3. Decisión que actualmente está abierta**

Sí — el conjunto mínimo no está definido.

**4. Alternativas posibles**

**Opción A: Los 6 tipos**
- Descripción: Implementar todos los tipos desde el inicio
- Ventajas: Cobertura completa
- Desventajas: Complejidad innecesaria para MVP
- Impacto técnico: BAJO — solo enums
- Impacto funcional: MEDIO — más opciones de las necesarias
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Sobrecarga inicial

**Opción B: Core 3 (ACADEMICO, CONVIVENCIA, FORMATIVO)**
- Descripción: Solo los 3 tipos esenciales
- Ventajas: MVP enfocado, iteración rápida
- Desventajas: No cubre orientación ni reconocimiento
- Impacto técnico: BAJO
- Impacto funcional: BAJO — alcance mínimo
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Fácil de extender

**Opción C: 4 tipos (agregar RECONOCIMIENTO)**
- Descripción: Core 3 + reconocimientos positivos
- Ventajas: Incluye aspectos positivos
- Desventajas: Complejidad adicional
- Impacto técnico: BAJO
- Impacto funcional: BAJO-MEDIO
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Buen balance

**5. Recomendación de arquitectura/producto**

**Opción B: Core 3 (ACADEMICO, CONVIVENCIA, FORMATIVO)**

**6. Justificación**

Los 3 tipos cubren el 80% de los casos de uso. ASISTENCIA, ORIENTACION y RECONOCIMIENTO pueden agregarse en fases posteriores sin reestructuración.

**7. ¿Bloquea PROMPT 71?**

Sí — define los valores del enum `FollowUpType`.

**8. ¿Requiere validación jurídica/privacidad?**

No

**9. Estado**

RECOMENDADO

---

### D10 — Notification Preferences

------------------------------------------------------------
**D10 — ¿El Observador tiene preferencias de notificación propias?**
------------------------------------------------------------

**1. Pregunta que debemos resolver**

¿Debe el Observador tener un sistema de preferencias de notificación separado?

**2. Contexto encontrado en PROMPT 70**

PROMPT 70 propone reutilizar el sistema de notificaciones existente.

**3. Decisión que actualmente está abierta**

Sí — la política de notificaciones no está definida.

**4. Alternativas posibles**

**Opción A: Preferencias propias**
- Descripción: El usuario puede configurar qué eventos notificar
- Ventajas: Control granular
- Desventajas: Complejidad adicional
- Impacto técnico: ALTO — nuevo modelo de preferencias
- Impacto funcional: MEDIO — más configuración
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Más trabajo

**Opción B: Reutilizar preferencias globales**
- Descripción: Usar las preferencias de notificación existentes
- Ventajas: Consistencia, simplicidad
- Desventajas: Menos control específico
- Impacto técnico: BAJO
- Impacto funcional: BAJO — consistencia
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Mantenimiento mínimo

**5. Recomendación de arquitectura/producto**

**Opción B: Reutilizar preferencias globales**

**6. Justificación**

El sistema de notificaciones existente ya soporta preferencias. No es necesario duplicar esta funcionalidad para un solo módulo.

**7. ¿Bloquea PROMPT 71?**

No

**8. ¿Requiere validación jurídica/privacidad?**

No

**9. Estado**

RECOMENDADO

---

### D11 — Form UX (Wizard vs Single Form)

------------------------------------------------------------
**D11 — ¿Formulario paso a paso o formulario único?**
------------------------------------------------------------

**1. Pregunta que debemos resolver**

¿Debe el formulario de creación ser un wizard paso a paso o un formulario completo?

**2. Contexto encontrado en PROMPT 70**

PROMPT 70 propone un wizard de 5 pasos.

**3. Decisión que actualmente está abierta**

Sí — la experiencia de usuario no está definida.

**4. Alternativas posibles**

**Opción A: Wizard paso a paso**
- Descripción: Formulario dividido en 5 pasos
- Ventajas: Mejor UX para docentes, reduce carga cognitiva
- Desventajas: Más componentes, más complejidad técnica
- Impacto técnico: MEDIO — más componentes
- Impacto funcional: ALTO — mejor experiencia
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Más mantenimiento

**Opción B: Formulario único**
- Descripción: Todo el formulario en una sola página
- Ventajas: Simplicidad técnica
- Desventajas: Formulario largo, overwhelm
- Impacto técnico: BAJO
- Impacto funcional: MEDIO — puede ser abrumador
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Menos mantenimiento

**5. Recomendación de arquitectura/producto**

**Opción A: Wizard paso a paso**

**6. Justificación**

Los docentes no son usuarios técnicos. Un wizard reduce la carga cognitiva y guía el proceso. El formulario completo puede ser abrumador con 5+ campos.

**7. ¿Bloquea PROMPT 71?**

No — afecta solo el frontend (PROMPT 75).

**8. ¿Requiere validación jurídica/privacidad?**

No

**9. Estado**

RECOMENDADO

---

### D12 — Timeline Commitment Status Changes

------------------------------------------------------------
**D12 — ¿El timeline muestra cambios de estado de compromisos?**
------------------------------------------------------------

**1. Pregunta que debemos resolver**

¿Debe el timeline mostrar cuándo un compromiso cambia de estado?

**2. Contexto encontrado en PROMPT 70**

PROMPT 70 propone un timeline completo con todos los eventos.

**3. Decisión que actualmente está abierta**

Sí — el alcance del timeline no está definido.

**4. Alternativas posibles**

**Opción A: Timeline completo (con cambios de estado)**
- Descripción: Mostrar todos los eventos incluyendo cambios de estado
- Ventajas: Trazabilidad completa
- Desventajas: Timeline saturado
- Impacto técnico: MEDIO — más eventos que renderizar
- Impacto funcional: ALTO — transparencia total
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Más datos

**Opción B: Timeline filtrado (solo eventos principales)**
- Descripción: Mostrar solo creaciones, entradas, evidencias, cierre
- Ventajas: Timeline limpio
- Desventajas: Menos trazabilidad
- Impacto técnico: BAJO
- Impacto funcional: MEDIO
- Impacto de seguridad/privacidad: BAJO
- Impacto futuro: Menos datos

**5. Recomendación de arquitectura/producto**

**Opción A: Timeline completo**

**6. Justificación**

El Observador requiere trazabilidad completa. Los cambios de estado son eventos importantes que deben registrarse. El usuario puede filtrar si el timeline es muy largo.

**7. ¿Bloquea PROMPT 71?**

No — afecta solo el frontend (PROMPT 75).

**8. ¿Requiere validación jurídica/privacidad?**

No

**9. Estado**

RECOMENDADO

---

## 5. FUNCTIONAL DEFINITION

### 5.1 What is "Observador del Alumno"?

The Observador del Alumno is a **parametrizable student follow-up engine** that allows educational institutions to:

1. **Register** relevant situations in a student's trajectory
2. **Track** interventions and follow-up actions
3. **Establish** commitments with responsible parties and deadlines
4. **Attach** evidence (files, documents)
5. **Audit** who did what and when
6. **Control** access based on confidentiality levels

### 5.2 What it is NOT

| Concept | Belongs to Observador? | Reason |
|---------|----------------------|--------|
| **Grades** | NO — `Grade` model | Academic performance is tracked separately |
| **Attendance** | NO — separate module | Requires different logic (biometry, QR) |
| **Communications** | NO — `Communication` model | Institutional broadcasts, not student-specific |
| **Discipline** | PARTIALLY — CONVIVENCIA type | Only as one type of record, not the whole module |
| **Psychology** | PARTIALLY — ORIENTACION type | Only as one type, defer to Phase 2 |
| **Evidences** | YES — `FollowUpAttachment` | File evidence attached to records |
| **Commitments** | YES — `Commitment` entity | Agreed actions with deadlines |
| **Signatures** | OPTIONAL — reuses `SignatureRequest` | For formal agreements, optional in MVP |
| **Notifications** | YES — reuses `Notification` | Fan-out on events |
| **History** | YES — `FollowUpEntry[]` + `AuditLog` | Chronological trail |

### 5.3 Core Value Proposition

> "Transform the Observador from a simple annotation log into a parametrizable follow-up engine with typed records, workflow tracking, role-based access, and full audit trail."

---

## 6. MVP SCOPE

### 6.1 INCLUDED in MVP

- **StudentFollowUp CRUD** (create, read, update, close)
- **3 record types**: ACADEMIC, CONVIVENCIA, FORMATIVO
- **Follow-up entries** (add, view)
- **Commitments** (create, complete)
- **File attachment** (evidence)
- **Role-based access** (Admin, Teacher, Parent, Student)
- **Resource-level authorization** (Teacher → students, Parent → children, Student → self)
- **Status lifecycle** (OPEN → IN_PROGRESS → RESOLVED → CLOSED)
- **Severity levels** (LOW, MEDIUM, HIGH, CRITICAL)
- **Confidentiality levels** (PUBLIC, INTERNAL, CONFIDENTIAL, SENSITIVE)
- **Audit trail** (AuditLog integration)
- **Notifications** (on create, escalation, commitment)
- **Institution-scoped categories** (admin configurable)
- **List view with filters**
- **Detail view with timeline**
- **Form wizard for creation**

### 6.2 DEFERRED to Future Phases

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

---

## 7. LIFECYCLE

### 7.1 Proposed States (Simplified for MVP)

```
         ┌──────────┐
         │   OPEN   │ (initial)
         └────┬─────┘
              │ assign/act
              ▼
         ┌────────────┐
         │ IN_PROGRESS│◄──────────────┐
         └────┬───────┘               │
              │                       │
              │ add follow-up ────────┘
              │
              ├── escalate
              ▼
         ┌──────────┐
         │ESCALATED │
         └────┬─────┘
              │ resolve
              ▼
         ┌────────────┐
         │  PENDING   │
         │ FOLLOW_UP  │
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

**Removed from MVP:** DRAFT, REMITTED — these add complexity without core value.

### 7.2 State Transition Rules

| From | To | Allowed Roles | Conditions |
|------|----|--------------|------------|
| — | OPEN | Admin, Teacher | Initial creation |
| OPEN | IN_PROGRESS | Admin, Teacher | Action taken |
| IN_PROGRESS | IN_PROGRESS | Admin, Teacher | Follow-up added |
| IN_PROGRESS | ESCALATED | Admin, Teacher | Escalation |
| ESCALATED | IN_PROGRESS | Admin | Reassignment |
| IN_PROGRESS | PENDING_FOLLOW_UP | Admin | Awaiting response |
| PENDING_FOLLOW_UP | IN_PROGRESS | Admin, Teacher | Response received |
| IN_PROGRESS | RESOLVED | Admin | Issue resolved |
| RESOLVED | CLOSED | Admin | Final close |
| Any active | CLOSED | Admin | Admin override |

### 7.3 Closed Record Immutability

Once CLOSED:
- No new follow-up entries can be added
- No commitments can be created
- No modifications allowed
- The record becomes read-only
- Only viewing and export are permitted
- **Reopening**: Only by INSTITUTION_ADMIN with audit trail (D06)

---

## 8. ROLES & AUTHORIZATION

### 8.1 Existing Roles (No New Roles in MVP)

| Role | Type | Current Permissions | Observador Access |
|------|------|--------------------|--------------------|
| `SUPER_ADMIN` | GLOBAL | All 52 | NO student data access (D07) |
| `INSTITUTION_ADMIN` | TENANT | All 52 | Full access |
| `TEACHER` | TENANT | 21 permissions | Own students only |
| `PARENT` | TENANT | 15 permissions | Own children only |
| `STUDENT` | TENANT | 11 permissions | Own records only |

### 8.2 Observador Access Matrix

| Action | INSTITUTION_ADMIN | TEACHER | PARENT | STUDENT |
|--------|------------------|---------|--------|---------|
| **Create record** | ✓ | ✓ (own students) | — | — |
| **View records** | ✓ | ✓ (own students) | ✓* (PUBLIC+INTERNAL) | ✓* (PUBLIC+INTERNAL) |
| **Modify record** | ✓ | ✓ (own created) | — | — |
| **Add follow-up entry** | ✓ | ✓ | — | — |
| **Create commitment** | ✓ | ✓ | — | — |
| **Update commitment** | ✓ | ✓ | — | — |
| **Attach evidence** | ✓ | ✓ | ✓ (own records) | — |
| **Close case** | ✓ | — | — | — |
| **Escalate** | ✓ | ✓ | — | — |
| **View statistics** | ✓ | ✓ (own students) | — | — |
| **Manage categories** | ✓ | — | — | — |

\* = resource-level filtered + confidentiality filter

### 8.3 Resource-Level Authorization

**Teacher access:**
- Can create/view records ONLY for students with active `TeacherAssignment → Enrollment` relationship
- Query: `TeacherAssignment (teacherUserId, courseId, subjectId, academicPeriodId) → Enrollment (studentId, courseId) → Student`

**Parent access:**
- Can view records ONLY for students linked via `GuardianStudent`
- Already implemented via `resolveParentContext()`
- Cannot create, modify, or close records

**Student access:**
- Can view ONLY their own records
- Relationship: `Student.userId === currentUserId`
- Cannot create, modify, or close records
- **Confidentiality filter**: Can see only PUBLIC + INTERNAL (D01)

### 8.4 RBAC vs Resource-Level Authorization

**Critical distinction:**

```
TEACHER + student-follow-ups:read
    ↓
Does NOT mean: "can see all student follow-ups"
    ↓
MUST ALSO verify: TeacherAssignment → Enrollment → Student
```

The PermissionGuard checks RBAC. The Service layer checks resource-level authorization.

---

## 9. CONFIDENTIALITY

### 9.1 Confidentiality Levels

| Level | Description | Example | Access |
|-------|-------------|---------|--------|
| **PUBLIC** | Open recognition | Awards, positive feedback | All roles with access |
| **INTERNAL** | Institutional follow-up | Academic follow-up, attendance notes | Involved roles only |
| **CONFIDENTIAL** | Restricted access | Counseling records, psychological notes | Admin + Counselor only |
| **SENSITIVE** | Highly restricted | Family situations, health info, third-party data | Admin only, with audit |

### 9.2 Access Rules by Confidentiality

| Level | Admin | Teacher | Parent | Student |
|-------|-------|---------|--------|---------|
| PUBLIC | ✓ | ✓ | ✓ | ✓ |
| INTERNAL | ✓ | ✓ | ✓ | ✓ |
| CONFIDENTIAL | ✓ | — | — | — |
| SENSITIVE | ✓ (with audit) | — | — | — |

### 9.3 Confidentiality Behaviors

**In listings:**
- CONFIDENTIAL records show as "Registro confidencial" (no title/detail)
- SENSITIVE records show as "Registro restringido"

**In detail view:**
- CONFIDENTIAL: Only Admin can see full detail
- SENSITIVE: Only Admin can see full detail, access logged

**In notifications:**
- Never reveal sensitive content in notification titles/messages
- Generic messages: "Nuevo seguimiento registrado para [student]"

**In exports (future):**
- CONFIDENTIAL and SENSITIVE records excluded from parent/student exports
- Admin exports include all records

### 9.4 Legal Considerations

| Point | Status | Notes |
|-------|--------|-------|
| Can parents access CONFIDENTIAL records? | REQUIRES VALIDATION | Third-party data may be restricted |
| Can students access their own CONFIDENTIAL records? | REQUIRES VALIDATION | Habeas data considerations |
| Must access to SENSITIVE data be logged? | YES | Already in AuditLog |

---

## 10. AUDITABILITY

### 10.1 Audit Events (MVP)

| Event | Description | Data | Required |
|-------|-------------|------|----------|
| `FOLLOW_UP_CREATED` | New record created | Record snapshot | YES |
| `FOLLOW_UP_UPDATED` | Record modified | Old + new values | YES |
| `FOLLOW_UP_STATUS_CHANGED` | Status transition | Old + new status | YES |
| `FOLLOW_UP_CLOSED` | Case closed | Closure details | YES |
| `FOLLOW_UP_ENTRY_ADDED` | Follow-up entry created | Entry snapshot | YES |
| `COMMITMENT_CREATED` | Commitment created | Commitment snapshot | YES |
| `COMMITMENT_COMPLETED` | Commitment completed | Completion details | YES |
| `FOLLOW_UP_ATTACHMENT_ADDED` | File attached | File metadata | YES |
| `FOLLOW_UP_ACCESSED` | Record viewed (for sensitive) | Viewer, timestamp | YES |
| `FOLLOW_UP_ESCALATED` | Record escalated | Escalation target | YES |

### 10.2 Audit Log Structure

Uses existing `AuditLog` model:
- `userId` — who performed the action
- `institutionId` — tenant scope
- `action` — event type
- `entityType` — `StudentFollowUp`, `FollowUpEntry`, `Commitment`
- `entityId` — the specific record
- `oldValues` — previous state (for updates)
- `newValues` — new state
- `ipAddress` — request origin

### 10.3 Immutability

- AuditLog records are append-only (no update, no delete)
- FollowUpEntry records are immutable after creation
- Commitment status changes are logged, not overwritten
- CLOSED records cannot be modified

---

## 11. RETENTION

### 11.1 MVP Approach

- No automatic deletion in MVP
- Records persist until manually archived
- Institution configures retention policy (future phase)

### 11.2 Future Considerations

| Consideration | Status |
|---------------|--------|
| Automatic deletion after X years | DEFERRED — requires legal validation |
| Archive vs delete | DEFERRED |
| Student right to deletion | REQUIRES LEGAL VALIDATION |
| Backup requirements | Standard infrastructure |

---

## 12. ATTACHMENTS

### 12.1 MVP Approach

- Reuse existing `FileAsset` model
- Create `FollowUpAttachment` join table
- Upload via existing `FilesService`

### 12.2 Rules

| Rule | Value |
|------|-------|
| Max file size | Institution-configurable (default 10MB) |
| Allowed MIME types | Institution-configurable (default: PDF, images, docs) |
| Who can upload | Admin, Teacher, Parent (own records) |
| Who can download | Users with access to the record |
| Who can remove | Admin, uploader |
| Remove means | Unlink only (FileAsset preserved) |

### 12.3 Metadata

- `description` (optional) — context for the file
- `createdByUserId` — who uploaded
- `createdAt` — when uploaded

---

## 13. SIGNATURES

### 13.1 MVP Approach

- OPTIONAL in MVP (D04)
- Commitment can exist without signature
- Signature integration via existing `SignatureRequest`

### 13.2 Future Use Cases

| Use Case | Phase |
|----------|-------|
| Commitment agreement signatures | Phase 2.3 |
| Closure confirmation signatures | Phase 2.3 |
| Formal agreement signatures | Phase 2.3 |

---

## 14. NOTIFICATIONS

### 14.1 MVP Events

| Event | Recipients | Message Template |
|-------|-----------|-----------------|
| Record created | Director de grupo, Coordinador | "Nuevo seguimiento registrado para [student]" |
| Record escalated | Target role | "Seguimiento escalado: [title]" |
| Commitment created | Responsible party | "Nuevo compromiso: [description]" |
| Commitment overdue | Responsible party + teacher | "Compromiso vencido: [description]" |
| Record closed | All involved parties | "Caso cerrado: [title]" |

### 14.2 Privacy-Aware Messages

- Never reveal sensitive information in notifications
- Generic messages only
- No details about CONFIDENTIAL/SENSITIVE content

---

## 15. AGENDA

### 15.1 MVP Approach

- DEFERRED to Phase 2.4
- Core module first, integration later

### 15.2 Future Events

| Event Type | Source | Date |
|-----------|--------|------|
| Follow-up deadline | `FollowUpEntry.nextFollowUpDate` | Specific date |
| Commitment deadline | `Commitment.deadline` | Specific date |

---

## 16. INSTITUTION TRANSFER

### 16.1 MVP Approach

- DEFERRED to Phase 2.5+ (D05)
- Records remain in originating institution

### 16.2 Why Deferred

1. **Complexity**: Cross-tenant access introduces significant complexity
2. **Legal**: Ley 1581/2012 has implications for data transfer
3. **Privacy**: Student data must be protected during transfer
4. **Infrequent**: Transfer is not a daily operation
5. **Can be added later**: No architectural barrier

### 16.3 Future Architecture (Option C: Controlled Transfer)

- Original records stay in Institution A
- Institution B receives a summary/manifest
- No direct cross-tenant database access
- Transfer requires authorization
- Full audit trail

---

## 17. DOMAIN MODEL REVIEW

### 17.1 Proposed Entities

| Entity | Necessary? | Can Reuse? | Notes |
|--------|-----------|-----------|-------|
| `StudentFollowUp` | YES | No | Primary entity — new model |
| `FollowUpEntry` | YES | No | Tracking entries — new model |
| `Commitment` | YES | No | Agreed actions — new model |
| `FollowUpAttachment` | YES | Join table | Links `FileAsset` to `StudentFollowUp` |
| `FollowUpCategory` | YES | No | Institution-configurable categories |

### 17.2 Assessment

- **No duplication** with existing models
- **No unnecessary entities**
- **Relations are correct**: `StudentFollowUp → FollowUpEntry[]`, `Commitment[]`, `FollowUpAttachment[]`
- **FileAsset reuse is correct**: `FollowUpAttachment` is a join table
- **SignatureRequest reuse is correct**: Optional FK on `Commitment`

### 17.3 Corrections Needed

1. Remove DRAFT and REMITTED states from `FollowUpStatus` (simplify for MVP)
2. Remove ASISTENCIA, ORIENTACION, RECONOCIMIENTO from `FollowUpType` (Phase 2)
3. Add `@@unique([institutionId, studentFollowUpId, fileAssetId])` on `FollowUpAttachment`

---

## 18. PERMISSIONS

### 18.1 Proposed Permission Codes

| Code | Purpose | Risk | Recommendation |
|------|---------|------|----------------|
| `student-follow-ups:read` | View records | LOW | KEEP |
| `student-follow-ups:create` | Create new records | MEDIUM | KEEP |
| `student-follow-ups:update` | Modify records | MEDIUM | KEEP |
| `student-follow-ups:close` | Close cases | HIGH | KEEP |
| `student-follow-ups:escalate` | Escalate cases | MEDIUM | KEEP |
| `student-follow-ups:follow_up` | Add follow-up entries | MEDIUM | KEEP |
| `student-follow-ups:commit` | Create/manage commitments | MEDIUM | KEEP |
| `student-follow-ups:attach` | Attach/remove evidence | LOW | KEEP |
| `student-follow-ups:manage` | Full management (admin) | HIGH | KEEP |
| `student-follow-ups:stats` | View statistics | LOW | KEEP |
| `student-follow-ups:categories` | Manage categories | LOW | KEEP |

### 18.2 Assessment

- 11 permissions is appropriate granularity
- Each permission maps to a distinct action
- All require resource-level authorization in addition to RBAC
- No permissions need to be merged or eliminated

### 18.3 Role Permission Mapping

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

## 19. UX

### 19.1 List View

**Filters:**
- Student name (search)
- Type (dropdown: ACADEMIC, CONVIVENCIA, FORMATIVO)
- Category (dropdown, dependent on type)
- Status (dropdown: OPEN, IN_PROGRESS, ESCALATED, PENDING_FOLLOW_UP, RESOLVED, CLOSED)
- Severity (dropdown: LOW, MEDIUM, HIGH, CRITICAL)
- Date range (from/to)

**Columns:**
- Student name
- Type badge
- Category
- Title
- Severity badge
- Status badge
- Created date
- Actions (view)

### 19.2 Detail View

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

### 19.3 Form Wizard (5 Steps)

1. **Student selection** (searchable dropdown, filtered by role)
2. **Type selection** (cards: ACADEMIC, CONVIVENCIA, FORMATIVO)
3. **Category selection** (filtered by type, institution-configurable)
4. **Details** (title, description, severity)
5. **Review & submit**

### 19.4 Role-Based UX Differences

| Feature | Admin | Teacher | Parent | Student |
|---------|-------|---------|--------|---------|
| Create button | ✓ | ✓ | — | — |
| Edit button | ✓ | ✓ (own) | — | — |
| Close button | ✓ | — | — | — |
| Escalate button | ✓ | ✓ | — | — |
| Add follow-up | ✓ | ✓ | — | — |
| Create commitment | ✓ | ✓ | — | — |
| Attach evidence | ✓ | ✓ | ✓ (own) | — |
| View statistics | ✓ | ✓ | — | — |
| Manage categories | ✓ | — | — | — |

---

## 20. SECURITY

### 20.1 Threat Matrix

| ID | Threat | Risk | Mitigation | MVP? |
|----|--------|------|------------|------|
| T01 | IDOR — Access another student's records | HIGH | Resource-level authorization via GuardianStudent / TeacherAssignment | YES |
| T02 | BOLA — Access another institution's records | CRITICAL | TenantContextGuard + institutionId on every query | YES |
| T03 | Privilege escalation — Teacher creates records for any student | HIGH | TeacherAssignment → Enrollment relationship verification | YES |
| T04 | Data leakage — Sensitive info exposed in notifications | HIGH | Privacy-aware notification messages, no sensitive content in titles | YES |
| T05 | Unauthorized file download | MEDIUM | FileAsset ownership + tenant isolation + access control | YES |
| T06 | Mass assignment — Modify institutionId via DTO | CRITICAL | institutionId from TenantContextGuard, never from DTO | YES |
| T07 | Sensitive data exposure to parents | HIGH | Confidentiality field + access rules per confidentiality level | YES |
| T08 | Student sees other students' records | HIGH | Student self-access via Student.userId === currentUserId | YES |
| T09 | Unauthorized case closure | MEDIUM | Role-based closure permission (admin only) | YES |
| T10 | Audit trail tampering | HIGH | Append-only audit log, no delete/update on AuditLog | YES |
| T11 | Commitment signature bypass | LOW | Signature optional in MVP | DEFERRED |
| T12 | Category manipulation | LOW | Institution-scoped categories, admin-only management | YES |

### 20.2 Key Security Rules

1. **institutionId** always from `TenantContextGuard`, never from request body
2. **Resource-level authorization** always verified in Service layer
3. **Confidentiality filter** applied before returning records
4. **AuditLog** used for all mutations and sensitive access
5. **No cross-tenant access** under any circumstances

---

## 21. RISK REGISTER

| ID | Risk | Probability | Impact | Severity | Mitigation | Owner | Blocks PROMPT 71? |
|----|------|------------|--------|----------|------------|-------|-------------------|
| R01 | Over-engineering the module | Medium | High | HIGH | Start with minimal MVP, iterate | PO | No |
| R02 | RBAC complexity explosion | Medium | Medium | MEDIUM | Keep permission count minimal | Dev | No |
| R03 | Privacy violation via data exposure | Low | Critical | CRITICAL | Confidentiality field + strict access rules + audit | Dev + PO | No |
| R04 | Teacher creates inappropriate records | Medium | High | HIGH | Category validation + admin oversight + audit | PO | No |
| R05 | Parent access to confidential records | Medium | High | HIGH | Confidentiality-based access restriction | Dev + PO | No |
| R06 | Student tracking becomes punitive | Medium | High | HIGH | Product guidance: focus on formative, not disciplinary | PO | No |
| R07 | Institution transfer data breach | Low | Critical | CRITICAL | Controlled transfer + no direct cross-tenant access | Dev + PO | No |
| R08 | Module becomes a "catch-all" for everything | Medium | Medium | MEDIUM | Clear scope: educational follow-up only | PO | No |
| R09 | Performance with large datasets | Low | Medium | MEDIUM | Proper indexing + pagination + query optimization | Dev | No |
| R10 | Scope creep delays Cloud Staging | High | High | HIGH | Defer to Phase 2, don't block Cloud | PO | No |

---

## 22. PO DECISIONS

### Summary Table

| ID | Decision | Recommendation | Requires PO | Requires Legal | Blocks PROMPT 71 |
|----|----------|---------------|-------------|----------------|------------------|
| D01 | Student visibility of own records | PUBLIC+INTERNAL only | YES | Recommended | Partially |
| D02 | Parent visibility of confidential records | PUBLIC+INTERNAL only | YES | YES | Partially |
| D03 | Who can create CONVIVENCIA records | Admin + Teacher | YES | No | YES |
| D04 | Signatures on commitments | Optional (configurable) | YES | No | No |
| D05 | Institution transfer in MVP | Defer to Phase 2.5+ | YES | YES | No |
| D06 | Reopening closed records | Admin only, with audit | YES | No | Partially |
| D07 | SUPER_ADMIN access to student data | NO | YES | Recommended | No |
| D08 | Attendance tracking in MVP | NO | YES | No | No |
| D09 | Minimum viable record types | Core 3 (ACADEMICO, CONVIVENCIA, FORMATIVO) | YES | No | YES |
| D10 | Notification preferences | Reuse global settings | YES | No | No |
| D11 | Form UX | Wizard | YES | No | No |
| D12 | Timeline commitment status | Yes (complete) | YES | No | No |

### Decisions That Can Be Closed Technically

- **D04**: Optional signatures — technical decision, implement flag
- **D10**: Reuse global notifications — technical decision
- **D11**: Wizard UX — frontend decision, no backend impact
- **D12**: Complete timeline — frontend decision, no backend impact

### Decisions Requiring Product Owner

- **D01**: Student visibility scope
- **D02**: Parent access to confidential records
- **D03**: Who can create CONVIVENCIA records
- **D05**: Institution transfer scope
- **D06**: Reopening policy
- **D07**: SUPER_ADMIN access
- **D08**: Attendance inclusion
- **D09**: MVP record types

### Decisions Requiring Legal/Privacy Validation

- **D02**: Parent access to CONFIDENTIAL records
- **D05**: Institution transfer implications (Ley 1581/2012)
- **D07**: SUPER_ADMIN data access policy

---

## 23. PROPOSED MVP SPECIFICATION

### Objetivo

Implementar un módulo de seguimiento integral del estudiante que permita a las instituciones educativas registrar, dar seguimiento y resolver situaciones relevantes en la trayectoria escolar de sus estudiantes.

### Usuarios

- **INSTITUTION_ADMIN**: Gestión completa
- **TEACHER**: Crear registros para sus estudiantes, dar seguimiento
- **PARENT**: Ver registros de sus hijos (solo PUBLIC/INTERNAL)
- **STUDENT**: Ver sus propios registros (solo PUBLIC/INTERNAL)

### Alcance

- CRUD de StudentFollowUp
- 3 tipos: ACADEMICO, CONVIVENCIA, FORMATIVO
- Entradas de seguimiento (FollowUpEntry)
- Compromisos (Commitment)
- Evidencias (FollowUpAttachment)
- Ciclo de vida (OPEN → IN_PROGRESS → RESOLVED → CLOSED)
- Niveles de severidad (LOW, MEDIUM, HIGH, CRITICAL)
- Niveles de confidencialidad (PUBLIC, INTERNAL, CONFIDENTIAL, SENSITIVE)
- Auditoría completa
- Notificaciones en eventos clave
- Categorías configurables por institución
- Vista de lista con filtros
- Vista de detalle con timeline
- Formulario wizard

### Fuera de alcance

- Tipos ASISTENCIA, ORIENTACION, RECONOCIMIENTO
- Plantillas configurables
- Integración con firmas
- Integración con agenda
- KPIs de dashboard
- Reportes/exportación
- Transferencia entre instituciones
- Políticas de retención
- Analíticas avanzadas

### Tipos de observador

MVP: ACADEMICO, CONVIVENCIA, FORMATIVO

### Estados

OPEN, IN_PROGRESS, ESCALATED, PENDING_FOLLOW_UP, RESOLVED, CLOSED

### Entradas

Cada registro puede tener múltiples FollowUpEntry que documentan el proceso.

### Compromisos

Compromisos con responsable, fecha límite y estado. Opcionalmente firmados.

### Evidencias

Archivos adjuntos via FileAsset. máx 10MB, tipos configurables.

### Confidencialidad

4 niveles: PUBLIC, INTERNAL, CONFIDENTIAL, SENSITIVE. Acceso basado en rol y nivel.

### Firmas

Opcional en MVP. Puede agregarse en fase posterior.

### Notificaciones

Reutiliza sistema existente. Eventos: creación, escalamiento, compromiso, cierre.

### Agenda

Diferida a fase posterior.

### Auditoría

Todos los eventos principales auditados via AuditLog. Registros inmutables después de cierre.

### Autorización

RBAC + resource-level authorization. Teacher → TeacherAssignment → Enrollment → Student. Parent → GuardianStudent → Student. Student → self only.

### Retención

Sin eliminación automática en MVP. Persistencia hasta archivo manual.

### Transferencia

Diferida a fase posterior.

### Reportes/estadísticas

Estadísticas básicas en MVP. Reportes avanzados en fase posterior.

### Integraciones

- FileAsset (evidencias)
- SignatureRequest (opcional)
- Notification (notificaciones)
- AuditLog (auditoría)
- Agenda (diferida)

### Seguridad

- Tenant isolation via institutionId
- Resource-level authorization
- Confidentiality-based access
- Audit trail
- No cross-tenant access
- institutionId from TenantContextGuard only

### Criterios de aceptación de alto nivel

1. Admin puede crear registros con tipo, categoría, título, descripción
2. Teacher puede crear registros para sus estudiantes asignados
3. Parent puede ver registros de sus hijos (solo PUBLIC/INTERNAL)
4. Student puede ver sus propios registros (solo PUBLIC/INTERNAL)
5. Entradas de seguimiento se agregan a registros existentes
6. Compromisos se crean con fechas límite y responsables
7. Registros se cierran por roles autorizados
8. Transiciones de estado siguen el ciclo definido
9. Niveles de confidencialidad restringen acceso apropiadamente
10. Evidencias se adjuntan a registros
11. Notificaciones se envían en eventos relevantes
12. Auditoría captura todas las mutaciones
13. Categorías son configurables por institución
14. Vista de lista soporta filtros por tipo, estado, severidad, estudiante, fecha
15. Vista de detalle muestra timeline completo

---

## 24. ROADMAP

### 24.1 Prompt Sequence

| Prompt | Name | Dependencies | Estimated Effort |
|--------|------|-------------|-----------------|
| 70 | Discovery / Architecture | — | COMPLETED |
| 70-A | Product Review / PO Decisions | 70 | THIS DOCUMENT |
| 71 | Domain Model / Prisma Schema | 70-A | Small |
| 72 | RBAC / Permissions | 71 | Medium |
| 73 | Backend CRUD | 72 | Large |
| 74 | Follow-ups / Commitments | 73 | Medium-Large |
| 75 | Frontend | 74 | Large |
| 76 | E2E / Security / Acceptance | 75 | Medium |

### 24.2 Phase Placement

```
FASE 1.9 — Cloud Staging
    │
    ▼
FASE 2 — Observador del Alumno
    │
    ├── PROMPT 70: Discovery (COMPLETED)
    ├── PROMPT 70-A: Product Review (THIS DOCUMENT)
    ├── PROMPT 71: Domain Model
    ├── PROMPT 72: RBAC
    ├── PROMPT 73: Backend CRUD
    ├── PROMPT 74: Follow-ups / Commitments
    ├── PROMPT 75: Frontend
    └── PROMPT 76: E2E / Acceptance
    │
    ▼
FASE 2.5 — Integrations (Signatures, Agenda, Dashboard)
    │
    ▼
FASE 3 — Reporting + Analytics + Transfer
```

### 24.3 Key Principle

**Cloud Staging (FASE 1.9) must complete BEFORE Observador implementation begins.**

---

## 25. DEPENDENCIES

### 25.1 Dependency Graph

```
PROMPT 71 (Domain Model)
   ↓
   └── DEPENDS ON: 70-A (PO decisions)
   └── DELIVERS: Prisma schema, enums, models, migration
   └── VALIDATED BY: Schema compiles, migration runs

PROMPT 72 (RBAC)
   ↓
   └── DEPENDS ON: 71 (Prisma schema)
   └── DELIVERS: Permission codes, role mapping, authorization service
   └── VALIDATED BY: Permission guard tests pass

PROMPT 73 (Backend CRUD)
   ↓
   └── DEPENDS ON: 72 (RBAC)
   └── DELIVERS: Controller, service, DTOs, unit tests
   └── VALIDATED BY: Backend tests pass

PROMPT 74 (Follow-ups / Commitments)
   ↓
   └── DEPENDS ON: 73 (Backend CRUD)
   └── DELIVERS: FollowUpEntry CRUD, Commitment CRUD, notifications
   └── VALIDATED BY: Backend tests pass

PROMPT 75 (Frontend)
   ↓
   └── DEPENDS ON: 74 (Backend complete)
   └── DELIVERS: React components, hooks, pages
   └── VALIDATED BY: Frontend tests pass

PROMPT 76 (E2E / Acceptance)
   ↓
   └── DEPENDS ON: 75 (Frontend complete)
   └── DELIVERS: Playwright tests, security validation, documentation
   └── VALIDATED BY: E2E tests pass, security audit clean
```

---

## 26. PROMPT 71 ENTRY CRITERIA

PROMPT 71 may initiate ONLY when ALL of the following are true:

- [ ] D01-D12 reviewed by Product Owner
- [ ] PO decisions closed for D01 (student visibility)
- [ ] PO decisions closed for D02 (parent access)
- [ ] PO decisions closed for D03 (who creates CONVIVENCIA)
- [ ] PO decisions closed for D05 (institution transfer)
- [ ] PO decisions closed for D06 (reopening policy)
- [ ] PO decisions closed for D07 (SUPER_ADMIN access)
- [ ] PO decisions closed for D08 (attendance)
- [ ] PO decisions closed for D09 (MVP record types)
- [ ] Legal/privacy decisions identified (D02, D05, D07)
- [ ] MVP scope approved
- [ ] Record types defined (Core 3 confirmed)
- [ ] States defined (6 states confirmed)
- [ ] Actors defined (4 roles confirmed)
- [ ] Confidentiality defined (4 levels confirmed)
- [ ] Authorization rules defined
- [ ] Retention defined at functional level
- [ ] Integrations defined (FileAsset, Notification, AuditLog)
- [ ] Transfer deferred
- [ ] Domain model conceptual approval

---

## 27. OPEN QUESTIONS

1. **Legal review**: Has Colombian data protection law (Ley 1581/2012) been reviewed for implications on student follow-up data?
2. **Institutional policy**: Do participating institutions have existing "Observador" policies that should inform the module design?
3. **User research**: Have teachers been consulted on the proposed workflow?
4. **Naming**: Is "Observador del Alumno" the final user-facing name, or should it be "Seguimiento del Estudiante"?
5. **Mobile**: Is mobile access a requirement for the MVP?

---

## 28. FINAL RECOMMENDATION

### The Observador del Alumno is ready for PO review and approval.

**What is good:**
- The concept is well-understood and well-scoped
- The existing architecture supports it fully
- 7 existing modules can be reused
- The domain model is sound
- The authorization model extends existing patterns
- The privacy model is appropriate

**What needs PO decision:**
- D01: Student visibility scope
- D02: Parent access to confidential records
- D03: Who creates CONVIVENCIA records
- D05: Institution transfer scope
- D06: Reopening policy
- D07: SUPER_ADMIN access
- D08: Attendance inclusion
- D09: MVP record types

**Recommended next steps:**
1. **PO reviews this document**
2. **PO resolves D01-D12**
3. **Cloud Staging (FASE 1.9) proceeds**
4. **PROMPT 71 initiates after PO approval + Cloud Staging**

**The module is architecturally sound, technically feasible, and productively valuable. It should be implemented after Cloud Staging, following the 6-prompt roadmap defined in this document.**

---

*Document generated by PROMPT 70-A — Product Owner Review & Decision Resolution. No functional code was modified.*
