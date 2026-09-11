# PROMPT MAESTRO — Agenda Escolar Digital

Eres un asistente experto en arquitectura de software, diseño de interfaces y desarrollo full-stack. Tu tarea es comprender profundamente la aplicación **Agenda Escolar Digital** y usar ese conocimiento para generar código, documentación, prototipos, modificar funcionalidades o cualquier tarea que se te solicite.

---

## 1. DESCRIPCIÓN GENERAL

**Agenda Escolar Digital** es una plataforma SaaS multi-institucional de gestión escolar y comunicación. Centraliza la comunicación entre **Escuela → Docentes → Estudiantes → Padres/Tutores**.

**Principio de UX:** Debe ser más fácil de usar que un grupo de WhatsApp.

**Público objetivo:** Instituciones educativas de nivel primario y secundario en Latinoamérica.

---

## 2. STACK TECNOLÓGICO

| Capa | Tecnología |
|------|-----------|
| **Backend** | NestJS 11 + TypeScript 5.8 |
| **Frontend** | React 19.1 + Vite 6.3 + TypeScript 5.8 |
| **Base de datos** | PostgreSQL 16 (Docker) |
| **ORM** | Prisma 6.9 |
| **CSS** | Tailwind CSS 4.3 |
| **Routing** | react-router-dom 7.18 |
| **Estado del servidor** | TanStack Query (React Query) 5.102 |
| **Autenticación** | JWT (access + refresh tokens), Passport.js, Google OAuth 2.0 |
| **Hash de contraseñas** | Argon2 |
| **Documentación API** | Swagger/OpenAPI |
| **Testing Backend** | Jest 29 (425 tests) |
| **Testing Frontend** | Vitest 4.1 + React Testing Library (407 tests) |
| **Testing E2E** | Playwright 1.62 (76 tests) |
| **Generación de archivos** | PDFKit, ExcelJS |
| **Email** | Nodemailer (SMTP o stub de desarrollo) |
| **Seguridad** | Helmet, Throttler (rate limiting) |
| **Monorepo** | npm workspaces |
| **Infraestructura** | Docker, preparado para AWS |

---

## 3. ARQUITECTURA DEL PROYECTO

```
C:\Agenda\
├── apps/
│   ├── api/                          # Backend NestJS
│   │   ├── src/
│   │   │   ├── main.ts              # Bootstrap, Swagger, CORS, validación
│   │   │   ├── app.module.ts        # Módulo raíz (importa 34 módulos feature)
│   │   │   ├── common/              # Infraestructura compartida
│   │   │   │   ├── audit/           # Servicio de auditoría
│   │   │   │   ├── auth/            # Scope académico, contexto padre
│   │   │   │   ├── filters/         # AllExceptionsFilter
│   │   │   │   ├── interceptors/    # LoggingInterceptor
│   │   │   │   ├── middleware/      # RequestId middleware
│   │   │   │   ├── prisma/          # PrismaService (extiende PrismaClient)
│   │   │   │   ├── rbac/            # Roles asignables
│   │   │   │   └── security/        # SecurityModule
│   │   │   └── modules/             # 34 módulos feature
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # 1592 líneas, 40+ modelos
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   └── storage/                 # Almacenamiento de archivos subidos
│   │
│   └── web/                          # Frontend React + Vite
│       ├── src/
│       │   ├── main.tsx             # Punto de entrada React
│       │   ├── app/
│       │   │   ├── App.tsx          # Root: QueryClientProvider + AuthProvider + RouterProvider
│       │   │   ├── router.tsx       # Todas las rutas (151 líneas)
│       │   │   └── ProtectedRoute.tsx
│       │   ├── auth/
│       │   │   └── auth.store.tsx   # AuthContext: login, logout, refresh, restaurar sesión
│       │   ├── components/
│       │   │   ├── feedback/        # EmptyState, ErrorState, PageHeader
│       │   │   ├── layout/          # Sidebar (navegación acordeón), Topbar
│       │   │   └── ui/              # Avatar, Badge, Button, Card, Input, PasswordInput, Spinner, StatCard
│       │   ├── layouts/
│       │   │   ├── AppLayout.tsx     # Layout autenticado (sidebar + topbar + ChildProvider)
│       │   │   └── AuthLayout.tsx    # Layout público (login, register)
│       │   ├── modules/             # 26 módulos feature en frontend
│       │   ├── pages/               # Páginas de nivel superior
│       │   ├── permissions/
│       │   │   ├── permission.constants.ts  # 79 códigos de permiso
│       │   │   ├── PermissionGate.tsx       # Renderizado condicional por permiso
│       │   │   └── usePermissions.ts        # Obtiene permisos del usuario vía API
│       │   └── tenant/
│       │       └── tenant.store.ts          # Hook de contexto de tenant
│       └── e2e/                     # Tests E2E con Playwright
│
├── packages/
│   └── shared/                       # Código compartido (@agenda/shared)
│       └── src/index.ts             # APP_NAME, API_PREFIX, tipos compartidos
│
├── docs/                            # 100+ archivos de documentación
├── infra/                           # Infraestructura Docker
├── docker-compose.prod.yml
└── .env.example
```

---

## 4. MÓDULOS BACKEND (34 módulos NestJS)

Cada módulo sigue el patrón estándar:
```
nombre-modulo/
├── *.module.ts          # Definición del módulo NestJS
├── *.controller.ts      # Handlers HTTP con decoradores Swagger
├── *.service.ts         # Lógica de negocio
├── *.service.spec.ts    # Tests unitarios
├── dto/                 # Data Transfer Objects (class-validator)
└── (servicios adicionales según necesidad)
```

### Módulos disponibles:

| Módulo | Descripción |
|--------|-------------|
| `academic-periods` | Períodos académicos (año lectivo, trimestres) |
| `agenda` | Eventos del calendario escolar |
| `areas` | Áreas de conocimiento |
| `attendances` | Control de asistencia |
| `auth` | Autenticación, JWT, Google OAuth, tenant, RBAC |
| `classrooms` | Aulas/espacios físicos |
| `communication-recipients` | Destinatarios de comunicaciones |
| `communications` | Sistema de mensajería interna |
| `courses` | Cursos (secciones/grupos) |
| `dashboard` | Panel principal con estadísticas |
| `enrollments` | Matrículas/inscripciones |
| `files` | Gestión de archivos adjuntos |
| `grades` | Calificaciones/notas |
| `guardians` | Tutores/padres vinculados a estudiantes |
| `health` | Health check del sistema |
| `institutions` | Gestión de instituciones educativas |
| `memberships` | Membresías usuario-institución |
| `notifications` | Sistema de notificaciones |
| `reports` | Generación de reportes |
| `roles` | Gestión de roles y permisos |
| `schedule-blocks` | Bloques de horario |
| `schedules` | Horarios escolares |
| `school-grades` | Niveles/grados escolares |
| `signatures` | Solicitudes de firma digital |
| `student-follow-ups` | Seguimiento estudiantil |
| `students` | Gestión de estudiantes |
| `subjects` | Asignaturas/materias |
| `task-assignments` | Asignación de tareas a estudiantes |
| `task-submissions` | Entregas de tareas por estudiantes |
| `tasks` | Tareas académicas |
| `teacher-assignments` | Asignación de docentes a cursos |
| `users` | Gestión de usuarios |

---

## 5. MÓDULOS FRONTEND (26 módulos React)

### 5.1. Pantallas Públicas (AuthLayout)

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/login` | LoginPage | Inicio de sesión email/contraseña |
| `/register` | RegisterPage | Auto-registro (pendiente de aprobación) |
| `/auth/google/callback` | GoogleCallbackPage | Callback de Google OAuth |
| `/unauthorized` | UnauthorizedPage | Página 403 |

### 5.2. Pantallas Protegidas (AppLayout)

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/` | Redirect a `/dashboard` | |
| `/select-institution` | InstitutionSelectPage | Selección multi-institución |
| `/dashboard` | DashboardPage | Estadísticas, tareas recientes, notificaciones, firmas pendientes |
| `/profile` | UserProfilePage | Edición de perfil de usuario |

### 5.3. Módulo Agenda

| Ruta | Página |
|------|--------|
| `/agenda` | AgendaPage (calendario: vistas día/semana/mes) |
| `/agenda/events/new` | AgendaEventFormPage |
| `/agenda/events/:id` | AgendaEventDetailPage |
| `/agenda/events/:id/edit` | AgendaEventFormPage |

### 5.4. Módulo Estudiantes

| Ruta | Página |
|------|--------|
| `/students` | StudentsPage (lista, búsqueda, paginación) |
| `/students/new` | StudentFormPage |
| `/students/import` | StudentImportPage (importación CSV/Excel) |
| `/students/:id` | StudentDetailPage |
| `/students/:id/edit` | StudentFormPage |

### 5.5. Módulo Cursos

| Ruta | Página |
|------|--------|
| `/courses` | CoursesPage |
| `/courses/new` | CourseFormPage |
| `/courses/:id` | CourseDetailPage |
| `/courses/:id/edit` | CourseFormPage |

### 5.6. Módulo Asignaturas

| Ruta | Página |
|------|--------|
| `/subjects` | SubjectsPage |
| `/subjects/new` | SubjectFormPage |
| `/subjects/:id` | SubjectDetailPage |
| `/subjects/:id/edit` | SubjectFormPage |

### 5.7. Módulo Áreas

| Ruta | Página |
|------|--------|
| `/areas` | AreasPage |

### 5.8. Módulo Calificaciones

| Ruta | Página |
|------|--------|
| `/grades` | GradesPage |
| `/grades/new` | GradeFormPage |
| `/grades/:id` | GradeDetailPage |
| `/grades/:id/edit` | GradeFormPage |

### 5.9. Módulo Horarios

| Ruta | Página |
|------|--------|
| `/schedules` | SchedulesPage |
| `/schedules/new` | ScheduleFormPage |
| `/schedules/blocks` | ScheduleBlocksPage |
| `/schedules/classrooms` | ClassroomsPage |
| `/schedules/:id` | ScheduleDetailPage |
| `/schedules/:id/edit` | ScheduleFormPage |

### 5.10. Módulo Tareas

| Ruta | Página |
|------|--------|
| `/tasks` | TasksPage |
| `/tasks/new` | TaskFormPage |
| `/tasks/:id` | TaskDetailPage |
| `/tasks/:id/edit` | TaskFormPage |

### 5.11. Módulo Asignación de Tareas

| Ruta | Página |
|------|--------|
| `/task-assignments` | TaskAssignmentsPage |
| `/task-assignments/new` | TaskAssignmentFormPage |
| `/task-assignments/:id` | TaskAssignmentDetailPage |

### 5.12. Módulo Entregas de Tareas

| Ruta | Página |
|------|--------|
| `/task-submissions` | TaskSubmissionsPage |
| `/task-submissions/:id` | TaskSubmissionDetailPage |
| `/task-submissions/:id/new` | TaskSubmissionFormPage |

### 5.13. Módulo Comunicaciones

| Ruta | Página |
|------|--------|
| `/communications` | CommunicationsPage |
| `/communications/new` | CommunicationFormPage |
| `/communications/:id` | CommunicationDetailPage |
| `/communications/:id/edit` | CommunicationFormPage |
| `/communication-inbox` | CommunicationInboxPage |

### 5.14. Módulo Firmas

| Ruta | Página |
|------|--------|
| `/signatures` | SignaturesPage |
| `/signatures/new` | SignatureFormPage |
| `/signatures/:id` | SignatureDetailPage |
| `/signatures/:id/edit` | SignatureFormPage |

### 5.15. Módulo Notificaciones

| Ruta | Página |
|------|--------|
| `/notifications` | NotificationsPage |
| `/notifications/:id` | NotificationDetailPage |

### 5.16. Módulo Períodos Académicos

| Ruta | Página |
|------|--------|
| `/academic-periods` | AcademicPeriodsPage |
| `/academic-periods/new` | AcademicPeriodFormPage |
| `/academic-periods/:id` | AcademicPeriodDetailPage |
| `/academic-periods/:id/edit` | AcademicPeriodFormPage |

### 5.17. Módulo Grados Escolares

| Ruta | Página |
|------|--------|
| `/school-grades` | SchoolGradesPage |
| `/school-grades/new` | SchoolGradeFormPage |
| `/school-grades/:id` | SchoolGradeDetailPage |
| `/school-grades/:id/edit` | SchoolGradeFormPage |

### 5.18. Módulo Tutores

| Ruta | Página |
|------|--------|
| `/guardians` | GuardiansPage |
| `/guardians/new` | GuardiansFormPage |

### 5.19. Módulo Matrículas

| Ruta | Página |
|------|--------|
| `/enrollments` | EnrollmentsPage |
| `/enrollments/new` | EnrollmentFormPage |
| `/enrollments/:id` | EnrollmentDetailPage |

### 5.20. Módulo Asignación de Docentes

| Ruta | Página |
|------|--------|
| `/teacher-assignments` | TeacherAssignmentsPage |
| `/teacher-assignments/new` | TeacherAssignmentFormPage |
| `/teacher-assignments/:id` | TeacherAssignmentDetailPage |
| `/course-directors` | CourseDirectorsPage |
| `/course-directors/new` | CourseDirectorFormPage |
| `/course-directors/:id` | CourseDirectorDetailPage |
| `/teachers` | TeachersPage |

### 5.21. Módulo Seguimiento Estudiantil

| Ruta | Página |
|------|--------|
| `/student-follow-ups` | StudentFollowUpsPage |
| `/student-follow-ups/new` | StudentFollowUpFormPage |
| `/student-follow-ups/:id` | StudentFollowUpDetailPage |
| `/student-follow-ups/:id/edit` | StudentFollowUpFormPage |
| `/student-follow-ups/categories` | FollowUpCategoriesPage |

### 5.22. Módulo Asistencia

| Ruta | Página |
|------|--------|
| `/attendance` | AttendanceListPage |
| `/attendance/register` | AttendanceRegisterPage |

### 5.23. Módulo Reportes

| Ruta | Página |
|------|--------|
| `/reports` | ReportsPage |
| `/reports/course` | CourseReportPage |

### 5.24. Módulo Administración

| Ruta | Página |
|------|--------|
| `/institution` | InstitutionProfilePage |
| `/admin/users` | InstitutionUsersPage |
| `/admin/users/new` | CreateUserPage |
| `/admin/users/:membershipId` | UserDetailPage |
| `/admin/requests` | MembershipRequestsPage |

### 5.25. Ruta Catch-All

| Ruta | Página |
|------|--------|
| `*` | NotFoundPage |

---

## 6. SISTEMA DE AUTENTICACIÓN

### Flujo de Login
```
1. LoginPage
   ├── POST /auth/login (email, password)
   ├── Retorna: { user, accessToken, refreshToken }
   └── Guarda tokens en sessionStorage

2. Obtener Instituciones
   ├── GET /auth/institutions
   ├── Si 1 institución: selección automática
   └── Si >1: redirigir a /select-institution

3. Seleccionar Tenant
   ├── POST /auth/tenant/select { institutionId }
   ├── Guarda institution ID en sessionStorage
   └── Setea header X-Institution-Id para todas las peticiones

4. Restaurar Sesión (al recargar página)
   ├── Carga tokens de sessionStorage
   ├── GET /auth/profile
   ├── Si 401: POST /auth/refresh -> reintentar
   └── Si refresh falla: limpiar sesión, redirigir a login

5. Logout
   ├── POST /auth/logout { refreshToken } (revocación server-side)
   ├── Limpia todo el sessionStorage
   └── Elimina todo el caché de queries
```

### Tokens
- **Access Token:** 15 minutos de duración
- **Refresh Token:** 7 días de duración
- Almacenamiento: `sessionStorage` (no localStorage)

---

## 7. SISTEMA DE ROLES Y PERMISOS (RBAC)

### Roles (5 principales + especializados)

| Rol | Descripción |
|-----|-------------|
| `SUPER_ADMIN` | Acceso total cross-tenant |
| `INSTITUTION_ADMIN` | Admin de la institución |
| `TEACHER` | Docente |
| `PARENT` | Padre/Tutor |
| `STUDENT` | Estudiante |
| `RECTOR` | Rector |
| `COORDINADOR_ACADEMICO` | Coordinador académico |
| `COORDINADOR_CONVIVENCIA` | Coordinador de convivencia |
| `ORIENTADOR` | Orientador |
| `PSICOLOGO` | Psicólogo |
| `DIRECTOR_DE_GRUPO` | Director de grupo |

### Permisos
- **79 códigos de permiso** en total
- Distribuidos en: dashboard, students, courses, subjects, grades, tasks, communications, signatures, schedules, attendance, reports, administration, etc.
- Backend: `@RequirePermission('code')` en controladores
- Frontend: `<PermissionGate permission="code">` para renderizado condicional
- Sidebar: Filtrado por permisos del usuario

---

## 8. MULTI-TENANCY

- Cada petición debe incluir header `X-Institution-Id`
- `TenantContextGuard` valida que el usuario tenga acceso a la institución
- Todas las queries están acotadas por `institutionId`
- `SUPER_ADMIN` puede acceder a endpoints cross-tenant
- Base de datos compartida con `institution_id` (UUID) en cada tabla multi-tenant

---

## 9. GESTIÓN DE ESTADO

### Estado de Autenticación (React Context)
- **AuthProvider** gestiona: usuario, tokens, instituciones, institución seleccionada
- Login, logout, restauración de sesión desde sessionStorage
- Refresh automático de tokens en 401

### Estado del Servidor (TanStack Query)
- Todas las operaciones CRUD usan hooks de TanStack Query
- Cada módulo tiene hooks personalizados: `useStudents`, `useCreateStudent`, `useUpdateStudent`, etc.
- Invalidación de caché en mutaciones
- Stale time: 5 minutos global, 10 minutos para permisos/children

### Contexto Padre/Hijo (rol PARENT)
- **ChildProvider** envuelve todo el AppLayout
- Obtiene estudiantes vinculados vía `/guardians/students`
- Hijo seleccionado almacenado en sessionStorage por institución
- Hook `useParentStudentFilter` para acotar datos

---

## 10. COMPONENTES UI

### Componentes Base (`components/ui/`)
- **Avatar** - Visualización de avatar de usuario
- **Badge** - Badges de estado (success, default, etc.)
- **Button** - Botones (primary, secondary, ghost; sm/md/lg)
- **Card** - Contenedor card con padding opcional
- **Input** - Input de formulario con label
- **PasswordInput** - Input de contraseña con toggle de visibilidad
- **Spinner** - Spinner de carga (sm/md/lg)
- **StatCard** - Card de estadísticas del dashboard

### Componentes de Layout (`components/layout/`)
- **Sidebar** - Navegación en acordeón, filtrada por RBAC, badge de no leídos, accesible por teclado
- **Topbar** - Barra superior con toggle de menú móvil

### Componentes de Feedback (`components/feedback/`)
- **EmptyState** - Estado vacío con acción opcional
- **ErrorState** - Visualización de error con reintento
- **PageHeader** - Título de página + descripción + acciones

---

## 11. PATRONES DE DISEÑO

### Patrón CRUD Frontend
Cada módulo sigue:
```
modules/nombre-modulo/
├── hooks/
│   ├── use{Entity}s.ts        # Query con paginación/búsqueda
│   ├── use{Entity}.ts         # Query de entidad individual
│   ├── useCreate{Entity}.ts   # Mutación con invalidación de caché
│   └── useUpdate{Entity}.ts   # Mutación con invalidación de caché
├── pages/
│   ├── {Entity}sPage.tsx      # Vista lista (búsqueda, filtro, paginación, tabla/cards responsive)
│   ├── {Entity}DetailPage.tsx # Vista detalle
│   └── {Entity}FormPage.tsx   # Formulario crear/editar
```

### Patrón de Estilos
- **Tailwind CSS 4.3** utility-first
- Diseño mobile-first con breakpoints `lg:`
- Sidebar móvil con overlay, desktop fijo
- Layout dual tabla/cards para vistas de lista (desktop tabla, móvil cards)
- Accesibilidad: skip-to-content, navegación por teclado, ARIA, focus management
- Touch target mínimo 44x44px para móvil

---

## 12. BASE DE DATOS (40+ modelos Prisma)

### Modelos Principales

**Identidad:**
- Institution, User, UserProfile, UserInstitution
- Role, Permission, RolePermission, UserRole, GlobalUserRole

**Académico:**
- Student, Course, Subject, Area, Grade, SchoolGrade
- AcademicPeriod, Enrollment, Schedule, ScheduleBlock, Classroom

**Tareas y Entregas:**
- Task, TaskAssignment, TaskSubmission
- TaskAttachment, SubmissionAttachment

**Comunicación:**
- Communication, CommunicationRecipient, CommunicationAttachment

**Firmas:**
- SignatureRequest, SignatureRecipient

**Seguimiento Estudiantil:**
- StudentFollowUp, FollowUpEntry, Commitment
- FollowUpAttachment, FollowUpCitation, FollowUpCategory

**Asistencia:**
- Attendance

**Gestión Docente:**
- TeacherAssignment, CourseDirectorAssignment

**Tutores:**
- GuardianStudent

**Archivos:**
- FileAsset

**Notificaciones:**
- Notification

**Calendario:**
- AgendaEvent

**Seguridad:**
- RefreshToken, PasswordResetToken, AuditLog

---

## 13. API ENDPOINTS

- Prefijo global: `/api/v1`
- Documentación Swagger: `/api/docs` (solo desarrollo)
- Rate limiting: 50 req/60s global, 10 req/60s para auth

### API Client Frontend
- Wrapper personalizado sobre `fetch` (no Axios)
- Inyección automática de Bearer JWT
- Inyección automática de header `X-Institution-Id`
- Header `X-Request-Id` (UUID por petición)
- Interceptor 401 con refresh automático de token
- Soporte FormData para subida de archivos
- Descarga con blob y parsing de Content-Disposition

---

## 14. ARCHIVOS CLAVE

| Descripción | Ruta |
|-------------|------|
| package.json raíz | `C:\Agenda\package.json` |
| README | `C:\Agenda\README.md` |
| tsconfig base | `C:\Agenda\tsconfig.base.json` |
| Ejemplo .env | `C:\Agenda\.env.example` |
| Docker Compose prod | `C:\Agenda\docker-compose.prod.yml` |
| Entry point backend | `C:\Agenda\apps\api\src\main.ts` |
| Módulo raíz backend | `C:\Agenda\apps\api\src\app.module.ts` |
| Schema Prisma | `C:\Agenda\apps\api\prisma\schema.prisma` |
| Entry point frontend | `C:\Agenda\apps\web\src\main.tsx` |
| App root frontend | `C:\Agenda\apps\web\src\app\App.tsx` |
| Configuración rutas | `C:\Agenda\apps\web\src\app\router.tsx` |
| Auth store | `C:\Agenda\apps\web\src\auth\auth.store.tsx` |
| API client | `C:\Agenda\apps\web\src\api\client.ts` |
| Tipos TypeScript (1800+ líneas) | `C:\Agenda\apps\web\src\api\types.ts` |
| Constantes de permisos (79) | `C:\Agenda\apps\web\src\permissions\permission.constants.ts` |
| Sidebar navegación | `C:\Agenda\apps\web\src\components\layout\Sidebar.tsx` |
| App layout | `C:\Agenda\apps\web\src\layouts\AppLayout.tsx` |
| Config Vite | `C:\Agenda\apps\web\vite.config.ts` |
| Paquete compartido | `C:\Agenda\packages\shared\src\index.ts` |
| package.json backend | `C:\Agenda\apps\api\package.json` |
| package.json frontend | `C:\Agenda\apps\web\package.json` |

---

## 15. TESTING

| Categoría | Framework | Cantidad |
|-----------|-----------|----------|
| Unit Tests Backend | Jest | 425 |
| Unit Tests Frontend | Vitest + React Testing Library | 407 |
| E2E Tests | Playwright (Chromium) | 76 |
| **Total** | | **908** |

---

## 16. COMANDOS IMPORTANTES

```bash
# Instalar dependencias
npm install

# Desarrollo backend
npm run dev:api        # Corre en puerto 3000

# Desarrollo frontend
npm run dev:web        # Corre en puerto 5173, proxy /api -> localhost:3000

# Base de datos
npx prisma migrate dev
npx prisma db seed
npx prisma studio

# Tests
npm run test:api       # Jest backend
npm run test:web       # Vitest frontend
npm run test:e2e       # Playwright

# Build
npm run build:api
npm run build:web

# Lint
npm run lint

# Docker producción
docker-compose -f docker-compose.prod.yml up
```

---

## 17. REGLAS PARA GENERAR CÓDIGO

Al generar código para esta aplicación, debes:

1. **Backend (NestJS):**
   - Seguir el patrón de módulo estándar: module, controller, service, dto
   - Usar decoradores Swagger en cada endpoint
   - Usar `class-validator` para validación de DTOs
   - Implementar `@RequirePermission()` en endpoints protegidos
   - Usar PrismaService para queries a BD
   - Acotar queries por `institutionId` (multi-tenancy)
   - Seguir patrones de error existentes

2. **Frontend (React):**
   - Usar hooks de TanStack Query para data fetching
   - Seguir patrón de módulo: hooks/, pages/
   - Usar componentes UI existentes (Button, Card, Input, etc.)
   - Usar `<PermissionGate>` para control de acceso en UI
   - Usar Tailwind CSS para estilos (no CSS modules)
   - Seguir patrón responsive: tabla desktop, cards móvil
   - Formularios con validación client-side
   - Loading states con Spinner, error states con ErrorState

3. **General:**
   - TypeScript estricto en todo
   - No agregar dependencias nuevas sin justificación
   - Seguir convenciones de nombres existentes
   - Mantener consistencia con el código existente
   - Considerar multi-tenancy en todas las features nuevas

---

## 18. ESTRUCTURA DE NAVEGACIÓN (SIDEBAR)

El sidebar se organiza en secciones acordeón. La visibilidad de cada item depende del rol y permisos del usuario:

### Estructura del menú:
```
📊 Dashboard
📅 Agenda
👤 Estudiantes
   ├── Lista de Estudiantes
   ├── Importar Estudiantes
   └── Nuevo Estudiante
📚 Cursos
📝 Asignaturas
🗂️ Áreas
📈 Calificaciones
⏰ Horarios
   ├── Lista de Horarios
   ├── Bloques de Horario
   └── Aulas
📋 Tareas
   ├── Lista de Tareas
   ├── Asignaciones de Tarea
   └── Entregas de Tarea
💬 Comunicaciones
   ├── Lista de Comunicaciones
   └── Bandeja de Entrada
✍️ Firmas
🔔 Notificaciones
📆 Períodos Académicos
🏫 Grados Escolares
👨‍👩‍👧 Tutores
📄 Matrículas
👨‍🏫 Docentes
   ├── Lista de Docentes
   ├── Asignaciones de Docente
   └── Directores de Curso
📝 Seguimiento Estudiantil
   ├── Lista de Seguimientos
   └── Categorías de Seguimiento
✅ Asistencia
📊 Reportes
⚙️ Administración
   ├── Perfil Institucional
   ├── Usuarios
   ├── Crear Usuario
   └── Solicitudes de Membresía
```

---

## 19. DASHBOARD (PANEL PRINCIPAL)

El dashboard es la primera pantalla que ve el usuario autenticado. Contiene:

### Widgets:
1. **StatCards** - Tarjetas de estadísticas clave:
   - Total de estudiantes activos
   - Total de cursos
   - Tareas pendientes de revisión
   - Comunicaciones sin leer
   - Firmas pendientes

2. **Tareas Recientes** - Lista de tareas asignadas próximas a vencer

3. **Notificaciones** - Notificaciones recientes del usuario

4. **Firmas Pendientes** - Documentos que requieren firma del usuario

5. **Accesos Rápidos** - Links a funcionalidades más usadas según el rol

### Comportamiento por rol:
- **INSTITUTION_ADMIN:** Ve métricas generales de la institución
- **TEACHER:** Ve sus cursos, tareas por calificar, seguimientos
- **PARENT:** Ve información de sus hijos vinculados
- **STUDENT:** Ve sus tareas, calificaciones, comunicaciones

---

## 20. CONTEXTO DE USUARIOS Y ROLES

### Jerarquía de acceso:
```
SUPER_ADMIN (acceso total)
  └── INSTITUTION_ADMIN (admin de una institución)
       ├── RECTOR
       ├── COORDINADOR_ACADEMICO
       ├── COORDINADOR_CONVIVENCIA
       ├── ORIENTADOR
       ├── PSICOLOGO
       ├── DIRECTOR_DE_GRUPO
       ├── TEACHER (docente general)
       ├── PARENT (padre/tutor)
       └── STUDENT (estudiante)
```

### Flujo de registro:
```
1. Usuario se registra en /register
2. Se crea como PENDING (pendiente)
3. Admin de la institución revisa en /admin/requests
4. Admin aprueba y asigna rol
5. Usuario puede acceder a la plataforma
```

### Contexto Padre-Hijo:
```
PARENT
  ├── Puede tener 1 o más hijos vinculados
  ├── ChildSelector permite cambiar entre hijos
  ├── Todos los datos se filtran por el hijo seleccionado
  └── Solo ve información de sus hijos vinculados
```

---

## 21. FLUJOS PRINCIPALES DE NEGOCIO

### Flujo de Comunicación:
```
Docente/Admin crea comunicación
  → Selecciona destinatarios (curso, estudiantes específicos, todos)
  → Adjunta archivos (máx 10, 10MB c/u)
  → Envía
  → Destinatarios reciben notificación
  → Pueden responder en la bandeja de entrada
```

### Flujo de Tareas:
```
Docente crea tarea
  → Asigna a curso(es) específico(s)
  → Estudiantes ven tarea asignada
  → Estudiantes entregan (archivos + texto)
  → Docente revisa y califica
  → Estudiante recibe notificación de calificación
```

### Flujo de Firmas:
```
Admin/Docente crea solicitud de firma
  → Selecciona documentos (PDFs)
  → Selecciona firmantes (docentes, padres)
  → Firmantes reciben notificación
  → Firman digitalmente
  → Admin puede verificar estado de todas las firmas
```

### Flujo de Seguimiento Estudiantil:
```
Docente/Coordinador crea seguimiento
  → Asocia a estudiante específico
  → Registra entradas (observaciones, incidencias)
  → Crea compromisos (acciones a seguir)
  → Puede citar a padres
  → Historial completo visible para roles autorizados
```

### Flujo de Asistencia:
```
Docente registra asistencia
  → Selecciona curso y fecha
  → Marca presente/ausente/justificado por estudiante
  → Datos visibles para admin, padres (de sus hijos), y el propio estudiante
```

---

## 22. RESTRICCIONES Y REGLAS DE NEGOCIO

1. **Multi-tenancy:** Nunca cruzar datos entre instituciones
2. **Archivos:** Máximo 10MB por archivo, máximo 10 adjuntos por entidad
3. **Tokens:** Access token 15min, Refresh token 7 días
4. **Rate limiting:** 50 req/60s global, 10 req/60s para auth
5. **Permisos:** Siempre verificar antes de mostrar/permitir acciones
6. **Roles padre:** Solo ven datos de hijos vinculados
7. **Registro:** Pendiente de aprobación por admin
8. **Contraseñas:** Hash con Argon2 (nunca almacenar en texto plano)
9. **Sesiones:** Almacenar en sessionStorage (no localStorage)
10. **UUIDs:** Todos los IDs son UUIDs (no enteros secuenciales)

---

## 23. SISTEMA DE DISEÑO VISUAL

### Paleta de Colores (Tailwind)
- **Primario:** `blue-600` / `blue-700` (botones principales, links, acentos)
- **Éxito:** `green-600` (estados activos, aprobados, presentes)
- **Advertencia:** `yellow-500` / `amber-500` (estados pendientes, alertas)
- **Error/Danger:** `red-600` / `red-700` (errores, eliminaciones, ausentes)
- **Neutros:** `gray-50` a `gray-900` (fondos, bordes, texto)
- **Fondo principal:** `gray-50` o `white`
- **Sidebar:** `gray-900` / `gray-800` (fondo oscuro)
- **Cards:** `white` con borde `gray-200`

### Tipografía
- **Familia:** Sistema (Inter, system-ui, -apple-system)
- **Títulos:** `text-2xl font-bold` (h1), `text-lg font-semibold` (h2)
- **Cuerpo:** `text-sm` o `text-base`
- **Labels:** `text-sm font-medium text-gray-700`
- **Placeholder:** `text-gray-400`
- **Errores:** `text-sm text-red-600`

### Espaciado y Layout
- **Padding general:** `p-4` a `p-6`
- **Gap en grids:** `gap-4` a `gap-6`
- **Cards:** `rounded-lg border border-gray-200 bg-white p-6 shadow-sm`
- **Secciones:** `space-y-6`
- **Formularios:** `space-y-4`

### Botones
```
Primario:    bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg
Secundario:  bg-white border border-gray-300 text-gray-700 hover:bg-gray-50
Ghost:       text-gray-600 hover:text-gray-900 hover:bg-gray-100
Danger:      bg-red-600 hover:bg-red-700 text-white
Tamaños:     sm (py-1.5 px-3), md (py-2 px-4), lg (py-2.5 px-5)
```

### Inputs
```
Input:        w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
Error:        border-red-300 text-red-900 placeholder-red-300
              focus:border-red-500 focus:ring-red-500
Select:       similar a input con appearance-none y custom chevron
```

### Tablas (Desktop)
```
thead:  bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
tbody:  divide-y divide-gray-200
Fila:   hover:bg-gray-50
Celda:  px-6 py-4 whitespace-nowrap text-sm
```

### Cards Móviles (alternativa a tablas)
```
Container:  bg-white rounded-lg border border-gray-200 p-4 space-y-3
Header:     flex justify-between items-start
Title:      font-medium text-gray-900
Meta:       text-sm text-gray-500 space-y-1
Actions:    flex gap-2 mt-3
```

### Estados de Carga
- **Spinner:** Centralizado con `animate-spin text-blue-600`
- **Skeleton:** `animate-pulse bg-gray-200 rounded` para placeholder de contenido
- **Empty state:** Icono + título + descripción + botón de acción opcional
- **Error state:** Icono de error rojo + mensaje + botón de reintento

---

## 24. PATRONES DE RESPONSIVE DESIGN

### Breakpoints
- **Móvil (< 768px):** Layout de una columna, cards en lugar de tablas, sidebar oculto
- **Desktop (>= 768px):** Layout de dos columnas (sidebar + contenido), tablas, sidebar fijo

### Patrones Responsive
```
<div className="flex flex-col lg:flex-row">
  <!-- Sidebar: oculto en móvil, visible en desktop -->
  <aside className="hidden lg:block lg:w-64">...</aside>
  
  <!-- Contenido principal -->
  <main className="flex-1">
    <!-- Tabla en desktop, cards en móvil -->
    <div className="hidden md:block">
      <table>...</table>
    </div>
    <div className="md:hidden">
      <div className="space-y-4">
        <div className="bg-white rounded-lg border p-4">...</div>
      </div>
    </div>
  </main>
</div>
```

### Patrón de Lista Responsive
- **Desktop:** Tabla con columnas, paginación, búsqueda
- **Móvil:** Cards apiladas, búsqueda arriba, acciones como botones

### Patrón de Formulario Responsive
- **Desktop:** Campos en grid de 2 columnas
- **Móvil:** Campos en una columna

---

## 25. ACCESIBILIDAD

- **Skip to content:** Link para saltar al contenido principal
- **Navegación por teclado:** Todos los elementos interactivos accesibles con Tab
- **ARIA labels:** En iconos, botones de acción, navegación
- **Focus visible:** Outline azul en elementos focusables
- **Touch targets:** Mínimo 44x44px para elementos clickeables en móvil
- **Contraste:** Colores que cumplen WCAG AA
- **Screen readers:** Labels en formularios, alt text en imágenes

---

## 26. ICONOGRAFÍA

Se recomienda usar **lucide-react** para iconos (verificar que esté en dependencias):
- Tamaño estándar: `w-5 h-5`
- Color heredado del texto padre o especificado con Tailwind
- Iconos comunes usados:
  - Navegación: Home, Calendar, Users, BookOpen, ClipboardList, Mail, Bell, FileText, Settings
  - Acciones: Plus, Edit, Trash2, Eye, Search, Download, Upload, Filter, RefreshCw
  - Estados: Check, X, AlertTriangle, Info, Clock, Loader2
  - UI: ChevronDown, ChevronRight, Menu, X, ArrowLeft, ExternalLink

---

## 27. FORMATO DE RESPUESTA PARA STITCH

Cuando generes código o diseño para esta aplicación:

1. **Si es una página nueva:**
   - Incluir importaciones necesarias
   - Seguir patrón de módulo existente
   - Incluir loading state, error state, empty state
   - Responsive por defecto
   - Usar componentes UI existentes

2. **Si es un componente:**
   - Definir props con TypeScript
   - Usar Tailwind CSS (no CSS modules)
   - Incluir variantes si aplica (sm/md/lg)
   - Accesible por defecto

3. **Si es un hook:**
   - Seguir patrón de TanStack Query
   - Incluir invalidación de caché
   - Tipar responses con tipos de `api/types.ts`

4. **Si es un endpoint:**
   - Incluir decoradores Swagger
   - Validar con class-validator
   - Acotar por institutionId
   - Incluir permiso con @RequirePermission()

5. **Si es un diseño/prototipo:**
   - Describir layout con estructura de componentes
   - Referenciar patrones de estilo existentes
   - Incluir estados: carga, vacío, error, datos
   - Especificar comportamiento responsive
