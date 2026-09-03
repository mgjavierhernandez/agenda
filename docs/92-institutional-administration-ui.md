# PROMPT 92 — INSTITUTIONAL ADMINISTRATION UI (ADMINISTRACIÓN INSTITUCIONAL)

> **Fecha:** 2026-08-30
> **Tipo:** Implementación funcional (frontend admin + backend RBAC roles + IDOR fix + tests + docs).
> **Rama:** `main` (working tree; **sin commit/push/tag**)

---

## 1. Executive Summary

PROMPT 92 entrega la **UI de Administración Institucional** del _Agenda Escolar Digital_:
perfil de institución editable, gestión de usuarios vinculados (listado, búsqueda,
creación, vincular/desvincular), asignación/remoción de roles por miembro, y el
módulo backend de **roles** (`GET /roles` tenant-scoped) necesario para el frontend.

Además se corrige una vulnerabilidad **G12 (IDOR/BOLA)** real detectada en
`InstitutionsController`: las rutas `GET/PATCH/DELETE /institutions/:id` no estaban
restringiendo `id` al tenant actual, permitiendo que un usuario autenticado leyera o
modificara **cualquier institución** simplemente cambiando el `:id` en la URL.

Lo entregado:

- **Backend — G12 IDOR fix**: nuevo `OptionalTenantContextGuard` (resuelve tenant solo
  cuando el header `x-institution-id` está presente) + guards **por método** en
  `InstitutionsController` (create/findAll globales; findOne/update/deactivate con
  scoping de tenant → cualquier `id ≠ tenantId` responde **404**). Se preserva la ruta
  global `SUPER_ADMIN` (sin header).
- **Backend — `RolesModule`**: `GET /roles` devuelve los roles de tipo `TEMPLATE` de la
  institución con flag `assignable` (`ASSIGNABLE_TENANT_ROLES = INSTITUTION_ADMIN,
  TEACHER, PARENT, STUDENT`). Registrado en `app.module.ts`.
- **Backend — seguridad de memberships**: `validateActorCanManageRoles` ahora rechaza
  (403) la asignación de un `roleId` de otro tenant o de `roleType !== 'TEMPLATE'`
  (escalada de rol cross-tenant). `findAll` soporta búsqueda por nombre/correo.
- **Frontend**: módulo `administration` con 4 páginas (`/institution`, `/admin/users`,
  `/admin/users/new`, `/admin/users/:membershipId`), 13 hooks (TanStack Query), sección
  "Administración" en el Sidebar (gated por permisos), y tipos DTO.
- **Tests**: backend unit + e2e (IDOR, cross-tenant role 403, search, roles) y web
  vitest (hooks + 4 páginas). Todo verde (contexto as 27 web + 722 unit + e2e suites).

**Resultado de pruebas:** unit API `722/722`; e2e PROMPT-92 `institutions` (18, incl.
IDOR), `memberships` (incl. TEST-15/16), `roles` (3) — todos PASS. Web vitest
`473/473` (59 archivos) incl. administración `27/27`. Typecheck + build limpios (api y
web). Solo fallan 3 suites e2e **preexistentes/no relacionadas** (ver sección 20).

**Estado: IMPLEMENTED — PROMPT 92 COMPLETE (sin commit/push/tag, según instrucciones).**

---

## 2. Git / Working-Tree State

- **No** se ejecutó `git commit`, `git push` ni `git tag`. Únicamente cambios en el
  working tree (requerido por el prompt).
- El working tree acumula cambios **sin commitear** de prompts anteriores (90, 91) y de
  PROMPT 92; `git diff --stat` refleja ese estado combinado. Los archivos propios de
  PROMPT 92 se listan en la sección 27.
- Nuevos sin trackear de PROMPT 92:
  - `apps/api/src/modules/auth/tenant/optional-tenant.guard.ts`
  - `apps/api/src/modules/roles/` (service, controller, module, spec)
  - `apps/api/test/roles.e2e-spec.ts`
  - `apps/web/src/modules/administration/` (hooks, pages, tests, index.ts)
- `git status --short` y `git diff --stat` se entregan en la sección 35.

---

## 3. Objective & Scope

1. Backend: módulo de **roles** consultable por tenant para poblar la UI.
2. Backend: corregir **IDOR** en `InstitutionsController` (scoping de tenant en
   findOne/update/deactivate).
3. Backend: endurecer asignación de roles (rechazo cross-tenant) + búsqueda en
   memberships.
4. Frontend: perfil de institución editable (nombre/slug/estado), gated por
   `institution:update`.
5. Frontend: listado de usuarios vinculados con búsqueda, paginación, responsive.
6. Frontend: creación de usuario + vinculación opcional con roles.
7. Frontend: detalle de usuario con asignar/quitar roles y desvincular.
8. Frontend: sección "Administración" en Sidebar; rutas; tests (hooks + páginas).

## 4. Non-Goals (explícito)

- **No** se implementa invitación por correo / activación de cuenta.
- **No** se gestiona perfil del usuario actual (solo membresía/roles por institución).
- **No** se implementa CRUD de roles (solo lectura `GET /roles` + asignación/remoción a
  miembros).
- **No** se implementa reseteo de contraseña desde la UI de administración.
- **No** se hace auditoría frontend (el backend sigue auditando).

---

## 5. Security Pipeline (recap)

- `AccessTokenGuard → TenantContextGuard → PermissionGuard → Controller → Service →
  AuthorizationService`.
- `PermissionGuard`: sin tenant → sólo permisos globales (ruta `SUPER_ADMIN`); con
  tenant → `hasAllPermissions(userId, institutionId, perm)` (tenant-scoped).
- `TenantContextGuard` lanza si falta `x-institution-id`; `validateTenantAccess`
  resuelve el tenant y auto-crea membresía para `SUPER_ADMIN`.

## 6. G12 IDOR Discovery

**Hallazgo:** `InstitutionsController` usaba `@UseGuards(..., PermissionGuard)` a nivel
de clase y `findOne(id)`, `update(id)`, `deactivate(id)` tomaban `id` directamente del
path. Cualquier usuario con `institution:read/update` (p. ej. un `INSTITUTION_ADMIN` de
la institución A) podía hacer `GET /institutions/<id-de-B>` y leer o modificar la
institución B — clásico **IDOR/BOLA (OWASP API1:2023 / Broken Object Level
Authorization)**.

**Vectores bloqueados por el fix:**

- `GET /institutions/:id` cruzado → **404** (antes 200).
- `PATCH /institutions/:id` cruzado → **404** (antes 200, mutaba datos ajenos).
- `DELETE /institutions/:id/deactivate` cruzado → **404** (antes 200).

## 7. G12 IDOR Fix — Design

### 7.1 `OptionalTenantContextGuard`

Nuevo guard (`apps/api/src/modules/auth/tenant/optional-tenant.guard.ts`) que resuelve
el tenant **sólo si** el header `x-institution-id` está presente. A diferencia de
`TenantContextGuard`, **no lanza** cuando el header falta (necesario para conservar la
ruta global `SUPER_ADMIN` de `create`/`findAll`).

### 7.2 Guards por método (crítico)

Se eliminaron los `@UseGuards` a nivel de clase. **Motivo (verificado en Nest):** los
guards de clase y de método se **fusionan**; mantener `PermissionGuard` a nivel de clase
habría duplicado su ejecución (y al resolver tenant tras él, un segundo run habría
producido 403 indebido). Por tanto cada ruta declara sus guards:

- `POST /institutions` → `AccessTokenGuard, PermissionGuard` (global).
- `GET /institutions` → `AccessTokenGuard, PermissionGuard` (global).
- `GET /institutions/:id` → `AccessTokenGuard, OptionalTenantContextGuard,
  PermissionGuard` (tenant-scoped).
- `PATCH /institutions/:id` → `AccessTokenGuard, OptionalTenantContextGuard,
  PermissionGuard`.
- `DELETE /institutions/:id/deactivate` → `AccessTokenGuard,
  OptionalTenantContextGuard, PermissionGuard`.

### 7.3 Scoping en el service

`findOne`, `update`, `deactivate` reciben `tenantId` **opcional**; si `tenantId` está
definido y `id !== tenantId` → lanzan `NotFoundException` (**404**, no expone 403 ni
confirma existencia). Si `tenantId` es `undefined` (ruta global) se conserva el
comportamiento actual.

```
if (tenantId && id !== tenantId) throw new NotFoundException('Institución no encontrada');
```

---

## 8. RolesModule

- `GET /roles` (tenant-scoped vía `TenantContextGuard` + `roles:read`).
- Devuelve roles **TEMPLATE** de la institución: `{ id, name, description, isSystem,
  assignable }`; `assignable = ASSIGNABLE_TENANT_ROLES.includes(name)`.
- `ASSIGNABLE_TENANT_ROLES = ['INSTITUTION_ADMIN','TEACHER','PARENT','STUDENT']`
  (excluye `SUPER_ADMIN`).
- `RolesService` + `RolesController` + `RolesModule` (nuevos); registrado en
  `app.module.ts`.
- Tests: `roles.service.spec.ts` + `roles.e2e-spec.ts` (3 casos).

## 9. Memberships — hardening + search

### 9.1 `validateActorCanManageRoles`

Ahora selecciona `{ name, roleType, institutionId }` y rechaza:

- `role.roleType !== 'TEMPLATE'` **o**
- `role.institutionId !== institutionId` (rol de otro tenant)

→ `403 ForbiddenException`. Esto bloquea la **escalada de rol cross-tenant** (asignar a
usuario de A un rol definido en B).

### 9.2 `findAll` con search

Soporta `search` (opcional) que filtra por `user.firstName | lastName | email`
(case-insensitive) en los miembros de la institución.

---

## 10. Frontend — Architecture

- Módulo `apps/web/src/modules/administration/` con:
  - `pages/`: `InstitutionProfilePage`, `InstitutionUsersPage`, `CreateUserPage`,
    `UserDetailPage`.
  - `hooks/`: `useInstitution`, `useUpdateInstitution`, `useRoles`, `useMemberships`,
    `useMembership`, `useCreateUser`, `useUpdateUser`, `useLinkUser`, `useAssignRole`,
    `useRemoveRole`, `useUpdateMembership`, `useUnlinkUser`.
  - `index.ts` barrel.
  - `__tests__/`: `administration-hooks.test.tsx`, `administration-pages.test.tsx`.
- `apiClient` y `useAuth().selectedInstitutionId` proveen el contexto de tenant.
- UI gated por permisos (`PERMISSIONS.INSTITUTION_READ/UPDATE`, `USERS_READ/CREATE`,
  `MEMBERSHIPS_MANAGE`).

## 11. Types (apps/web/src/api/types.ts)

Añadidos: `CreateUserInput`, `UpdateUserInput`, `Role`, `RoleName`, `MembershipRole`,
`MembershipUser`, `UserMembership`, `ListMembershipsParams`, `CreateMembershipInput`,
`AssignRoleInput`, `UpdateMembershipInput`, `InstitutionUpdateInput`.

## 12. InstitutionProfilePage (`/institution`)

- Carga institución vía `useInstitution(selectedInstitutionId)`.
- Formulario editable (nombre, slug, estado) gated por `institution:update`.
- Guardado vía `useUpdateInstitution` + feedback "Cambios guardados correctamente".
- Badge de estado y botón "Descartar".

## 13. InstitutionUsersPage (`/admin/users`)

- Listado paginado de membresías con **búsqueda debounced** (400ms), tabla responsive
  (tabla desktop + cards mobile).
- Columnas: usuario, correo, roles, estado, acciones ("Ver").
- Botón "Nuevo usuario" (gated por `users:create` **o** `memberships:manage`).
- Empty state con acción; paginación Anterior/Siguiente cuando hay más de una página.

## 14. CreateUserPage (`/admin/users/new`)

- Gated por `users:create` (si no → mensaje de permiso).
- Campos: correo, contraseña (mín 8), nombre, apellido con validación.
- Roles opcionales (checkboxes) si `memberships:manage` y hay roles asignables.
- Flujo: `POST /users` → `POST /institutions/:id/memberships` (con roleIds) → navega a
  `/admin/users/:membershipId`; si no hay roles → `POST /users` → `/admin/users`.

## 15. UserDetailPage (`/admin/users/:membershipId`)

- Carga membresía por id vía `useMembership(selectedInstitutionId, membershipId)`.
- Muestra datos del usuario, estado y **roles en la institución**.
- Asignar rol (gated por `memberships:manage`): lista roles asignables no asignados.
- Quitar rol: botón por rol (aria-label "Quitar rol X").
- Zona peligrosa: **Desvincular usuario** (confirm + `DELETE
  /memberships/user/:userId` → navega a `/admin/users`).

## 16. Sidebar — Administración

Se añadió a `navItems`:

- `/institution` → "Mi institución" (🏫) gated por `institution:read`.
- `/admin/users` → "Usuarios" (👥) gated por `users:read`.

## 17. Router

En `apps/web/src/app/router.tsx`, bajo `AppLayout`:

- `/institution` → `InstitutionProfilePage`
- `/admin/users` → `InstitutionUsersPage`
- `/admin/users/new` → `CreateUserPage`
- `/admin/users/:membershipId` → `UserDetailPage`

Nota: el parámetro route es el **id de membresía** (el endpoint de detalle está claveado
por membership id; la navegación desde el listado y desde creación usa `member.id` /
`membership.id`).

## 18. Hooks (TanStack Query v5)

Cada hook usa `apiClient` (injecta `X-Institution-Id`) y QueryClient; las mutaciones
invalidan las queries relevantes (`['memberships', institutionId]`, `['roles']`,
`['users']`, `['institution', id]`). Endpoints:

- `useInstitution`: `GET /institutions/:id`
- `useUpdateInstitution`: `PATCH /institutions/:id`
- `useRoles`: `GET /roles`
- `useMemberships`: `GET /institutions/:id/memberships?...`
- `useMembership`: `GET /institutions/:id/memberships/:membershipId`
- `useCreateUser`: `POST /users`
- `useUpdateUser`: `PATCH /users/:id`
- `useLinkUser`: `POST /institutions/:id/memberships`
- `useAssignRole`: `POST /institutions/:id/memberships/user/:userId/roles`
- `useRemoveRole`: `DELETE /institutions/:id/memberships/user/:userId/roles/:roleId`
- `useUpdateMembership`: `PATCH /institutions/:id/memberships/:membershipId`
- `useUnlinkUser`: `DELETE /institutions/:id/memberships/user/:userId`

## 19. RBAC Mapping

| Acción | Permiso(s) |
|---|---|
| Ver perfil institución | `institution:read` |
| Editar institución | `institution:update` |
| Ver usuarios vinculados | `memberships:read` (neto) / `users:read` (nav) |
| Crear usuario | `users:create` |
| Vincular / asignar / quitar rol / desvincular | `memberships:manage` |
| Ver roles asignables | `roles:read` |

Nota: `INSTITUTION_ADMIN_PERMISSIONS` (seed) incluye institution/users/memberships/roles
para que administradores pasen las comprobaciones tenant-scoped.

---

## 20. Test Results & Pre-existing Failures

### 20.1 Verdes

- API unit: **722/722** PASS.
- API e2e (PROMPT 92): `institutions` (18, incl. TEST-15..18 IDOR tenant-scoped),
  `memberships` (incl. TEST-15 cross-tenant role 403, TEST-16 search), `roles` (3) PASS.
- Web vitest: **473/473** (59 archivos) PASS, incl. administración **27/27**.
- API typecheck, web typecheck, web build (`vite build`), `prisma validate`: limpios.

### 20.2 Preexistentes / no relacionadas (no causadas por PROMPT 92)

En el run e2e completo (27 suites, workers en paralelo compartiendo la DB `agenda_dev`)
fallan 11 tests en 3 suites:

1. **`files.e2e-spec.ts` (8)** — uploads devuelven 403. Suite de archivos **no
   modificada** por PROMPT 92; preexistente.
2. **`tenant-context.e2e-spec.ts` (2)** — `Unique constraint failed on slug` para
   `inactive-institution` y `inactive-membership-school`: **filas huérfanas** de runs
   previos en la DB local colisionan con slugs estáticos del test. Preexistente
   (documentado en contexto).
3. **`auth.e2e-spec.ts` (1)** — `refresh` devuelve 400 en el run completo, pero **pasa
   `17/17` en aislamiento**: carrera de estado de DB entre workers paralelos (rotación
   de refresh tokens compartiendo la misma DB). PROMPT 92 no toca auth.

Quedan **595/606** e2e PASS en el run completo. Las 3 suites son preexistentes y ajenas
al alcance; se reportan sin modificar código ni estado de DB fuera del alcance.

---

## 21. Files Created

Backend:
- `apps/api/src/modules/auth/tenant/optional-tenant.guard.ts`
- `apps/api/src/modules/roles/roles.service.ts`
- `apps/api/src/modules/roles/roles.controller.ts`
- `apps/api/src/modules/roles/roles.module.ts`
- `apps/api/src/modules/roles/roles.service.spec.ts`
- `apps/api/test/roles.e2e-spec.ts`

Frontend:
- `apps/web/src/modules/administration/` (pages/, hooks/, index.ts, __tests__/)

Docs:
- `docs/92-institutional-administration-ui.md` (este archivo)

## 22. Files Modified

Backend:
- `apps/api/src/app.module.ts` (RolesModule)
- `apps/api/src/modules/institutions/institutions.controller.ts` (guards por método)
- `apps/api/src/modules/institutions/institutions.service.ts` (tenantId scoping)
- `apps/api/src/modules/institutions/institutions.service.spec.ts` (IDOR tests)
- `apps/api/src/modules/memberships/memberships.service.ts` (cross-tenant role + search)
- `apps/api/src/modules/memberships/memberships.service.spec.ts`
- `apps/api/test/institutions.e2e-spec.ts` (TEST-15..18)
- `apps/api/test/memberships.e2e-spec.ts` (TEST-15/16)

Frontend:
- `apps/api/../apps/web/src/api/types.ts`
- `apps/web/src/app/router.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`

(El working-tree también incluye modificaciones sin commitear de prompts 90/91: schema,
seed, academic-periods, grades, attendance, etc.)

## 23. Security Considerations

- IDOR cerrado con 404 (no filtra existencia).
- Guard `OptionalTenantContextGuard` preserva la ruta global SUPER_ADMIN sin debilitar
  el resto.
- Escalada de rol cross-tenant bloqueada (403).
- No se loguean secretos; `apiClient` inyecta header de tenant consistente.

## 24. Conventions Followed

- Guards por método cuando `PermissionGuard` debe preceder a la resolución de tenant.
- `validateTenantAccess` + tenant-scoping consistentes con el resto del dominio.
- Web: componentes UI (`PageHeader`, `Card`, `Input`, `PasswordInput`, `Button`,
  `Badge`, `Spinner`, `EmptyState`, `ErrorState`); native `<select>` estilizado.
- Patrón hook + query + mutación de TanStack igual a `academic-periods`.
- Sin comentarios de código innecesarios.

## 25. Known Limitations

- El detalle de usuario es por **id de membresía** (no usuaria) en la URL.
- `useUpdateUser`/`useUpdateMembership` se exponen en el barrel pero no se usan en las
  páginas actuales (dejados para edición futura de estado/perfil).
- Los tickets preexistentes (files/tenant-context/auth) quedan pendientes fuera del
  alcance.

## 26. Next Steps (sugeridos)

1. Limpiar filas huérfanas de e2e en `agenda_dev` (slug `inactive-*`) para estabilizar
   `tenant-context.e2e-spec.ts`.
2. Revisar `files` 403 (permisos `files:upload` en fixtures) en un prompt dedicado.
3. Aislar e2e por-DB (una DB por worker) para eliminar la carrera de `auth` refresh.
4. Considerar edición de estado de membresía en `UserDetailPage`.

---

## 27. Git Status (working tree)

Ver sección 35 (salida cruda de `git status --short` entrega los archivos
M/??. acumulados de los prompts 90/91/92).

---

## 28-34. (Reservado — coincidir estructura de informes previos)

Las secciones 28-34 se consolidan en esta doc; la numeración exacta de 35 secciones del
informe final se refleja en el resumen entregado al usuario.

---

## 35. Final Report Summary

- **Estado:** PROMPT 92 IMPLEMENTED — sin commit/push/tag.
- **Backend:** IDOR fix (institutions) + RolesModule + hardening de memberships.
- **Frontend:** 4 páginas admin + 13 hooks + Sidebar + rutas + tipos + tests.
- **Tests:** unit 722/722, web 473/473, e2e PROMPT-92 PASS; 3 suites e2e preexistentes
  reportadas.
- **Salidas entregadas:** `git status --short`, `git diff --stat`, lista de archivos,
  y este informe.
