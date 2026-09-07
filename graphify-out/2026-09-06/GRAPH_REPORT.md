# Graph Report - Agenda  (2026-09-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 4583 nodes · 14244 edges · 198 communities (172 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 406 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b1f1b868`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- types.ts
- PrismaService
- @tanstack/react-query
- @nestjs/swagger
- app.module.ts
- StudentFollowUpDetailPage.tsx
- TeacherAssignmentsService
- auth.service.ts
- AuthController
- react
- "institutions"
- @nestjs/common
- administration/hooks/index.ts
- react-router-dom
- SchedulesService
- AuthorizationService
- AgendaEventsService
- CreateNotificationDto
- AgendaService
- CreateAreaDto
- ScheduleBlocksService
- ListSubjectsQueryDto
- Badge.tsx
- AcademicPeriodsController
- RequirePermission
- CreateCourseDto
- CreateSchoolGradeDto
- vitest
- .create
- AuthenticatedRequest
- ListInstitutionsQueryDto
- LinkGuardianDto
- ListTaskAssignmentsQueryDto
- CreateClassroomDto
- MembershipsController
- TeacherAssignmentDetailPage.tsx
- ListEnrollmentsQueryDto
- CreateFollowUpCategoryDto
- compilerOptions
- PaginatedApiResponse
- file-hooks.test.tsx
- .log
- signatures.service.ts
- usePermissions.ts
- use-agenda-events.test.tsx
- Spinner.tsx
- ListRecipientsQueryDto
- query-client.ts
- DashboardService
- TasksController
- api/package.json
- CommunicationsController
- @playwright/test
- reports-pages.test.tsx
- guardians-hooks.test.tsx
- PageHeader
- notifications-hooks.test.tsx
- UsersController
- shared/package.json
- web/package.json
- FilesService
- academic-periods-hooks.test.tsx
- attendance-hooks.test.tsx
- PageHeader.tsx
- dependencies
- main.ts
- AttendancesController
- CommunicationsService
- .upload
- ReportsService
- Card.tsx
- ChildContext.tsx
- devDependencies
- api.ts
- devDependencies
- ReportsController
- SignaturesController
- SignatureDetailPage.tsx
- seed.ts
- AttendancesService
- .import
- communications-hooks.test.tsx
- enrollments-hooks.test.tsx
- @testing-library/user-event
- reports-response.dto.ts
- TasksService
- package.json
- SubjectsPage.tsx
- scripts
- scripts
- CreateUserDto
- UsersService
- auth.store.tsx
- CreateAttendanceBulkDto
- FollowUpCitationsService
- StudentsController
- TenantContextService
- SignaturesService
- communication-recipients-hooks.test.tsx
- roles.service.ts
- SelfRegisterDto
- ListGradesQueryDto
- health.controller.ts
- GradeFormPage.tsx
- ListStudentFollowUpsQueryDto
- MembershipsService
- CreateSignatureRequestDto
- RequestFollowUpSignatureDto
- CreateGradeDto
- ListTasksQueryDto
- Sidebar.tsx
- compilerOptions
- CreateCommunicationDto
- report-pdf.ts
- ListSignatureRequestsQueryDto
- UpdateSignatureRequestDto
- DashboardPage.tsx
- task-submission-detail-page.test.tsx
- AttendanceAuthorizationService
- CreateAttendanceDto
- ListAttendancesQueryDto
- UpdateGradeDto
- CreateCommitmentDto
- CreateStudentFollowUpDto
- students-import.service.ts
- StudentsImportService
- CreateTaskDto
- CreateTeacherAssignmentDto
- scripts
- task-submission-form-page.test.tsx
- jest
- .update
- test-utils.ts
- task-assignment-detail-page.test.tsx
- UpdateCommunicationDto
- files.service.ts
- CreateFollowUpAttachmentDto
- CreateFollowUpCitationDto
- ListFollowUpCitationsQueryDto
- UpdateCommitmentDto
- UpdateStudentFollowUpDto
- ListStudentsQueryDto
- colegio-flow.spec.ts
- task-detail-page.test.tsx
- UpdateStudentDto
- StudentsService
- UpsertUserProfileDto
- src/index.ts
- AttachmentList.tsx
- task-submissions-page.test.tsx
- nest-cli.json
- validate-model.ts
- UpdateAttendanceDto
- GradesController
- GradesService
- ReportsQueryDto
- CreateFollowUpEntryDto
- UpdateFollowUpEntryDto
- responsive.spec.ts
- dependencies
- Avatar.tsx
- schedule-detail-page.test.tsx
- student-detail-page.test.tsx
- student-form-page.test.tsx
- subject-detail-page.test.tsx
- task-assignment-form-page.test.tsx
- task-assignments-page.test.tsx
- agenda-event-response.dto.ts
- UploadFileDto
- .findAll
- ImportStudentsOptionsDto
- cleanup.ts
- course-form-page.test.tsx
- schedule-form-page.test.tsx
- task-form-page.test.tsx
- .create
- .create
- tsconfig.build.json
- smoke-test.sh
- test_db.js
- test_prisma.js
- test_prisma2.js
- test_prisma3.js
- test_prisma4.js
- graphify.js

## God Nodes (most connected - your core abstractions)
1. `@tanstack/react-query` - 247 edges
2. `AuthenticatedRequest` - 240 edges
3. `RequirePermission()` - 238 edges
4. `ApiResponse` - 221 edges
5. `apiClient` - 219 edges
6. `@nestjs/common` - 201 edges
7. `@prisma/client` - 176 edges
8. `@nestjs/swagger` - 130 edges
9. `react` - 125 edges
10. `react-router-dom` - 120 edges

## Surprising Connections (you probably didn't know these)
- `cleanupAll()` --calls--> `apiRequest()`  [EXTRACTED]
  apps/web/e2e/helpers/cleanup.ts → apps/web/e2e/helpers/api.ts
- `ListScheduleBlocksParams` --references--> `DayOfWeek`  [EXTRACTED]
  apps/web/src/modules/schedules/hooks/useScheduleBlocks.ts → apps/web/src/api/types.ts
- `SelfRegisterDto` --references--> `UpsertUserProfileDto`  [EXTRACTED]
  apps/api/src/modules/auth/dto/self-register.dto.ts → apps/api/src/modules/users/dto/user-profile.dto.ts
- `AuthContextValue` --references--> `Institution`  [EXTRACTED]
  apps/web/src/auth/auth.store.tsx → apps/web/src/api/types.ts
- `AuthState` --references--> `Institution`  [EXTRACTED]
  apps/web/src/auth/auth.store.tsx → apps/web/src/api/types.ts

## Import Cycles
- None detected.

## Communities (198 total, 13 thin omitted)

### Community 0 - "types.ts"
Cohesion: 0.03
Nodes (88): AgendaEvent, AgendaEventCreatedBy, AgendaEventStatus, AgendaEventType, AgendaEventVisibility, AgendaView, Area, Classroom (+80 more)

### Community 1 - "PrismaService"
Cohesion: 0.04
Nodes (32): AuditEvent, AuditService, Injectable, PrismaModule, Module, PrismaService, Injectable, AgendaRole (+24 more)

### Community 2 - "@tanstack/react-query"
Cohesion: 0.05
Nodes (45): apiClient, ApiError, Course, CreateCourseInput, CreateScheduleInput, CreateSchoolGradeInput, CreateSignatureRequestInput, CreateStudentInput (+37 more)

### Community 3 - "@nestjs/swagger"
Cohesion: 0.05
Nodes (9): SELF_REGISTER_ROLES, SelfRegisterRole, ReportExportFormat, CSV, PDF, TIME_PATTERN, class-transformer, class-validator (+1 more)

### Community 4 - "app.module.ts"
Cohesion: 0.06
Nodes (64): AuditModule, Module, AcademicPeriodsModule, Module, AgendaModule, Module, AreasModule, Module (+56 more)

### Community 5 - "StudentFollowUpDetailPage.tsx"
Cohesion: 0.04
Nodes (65): COMMITMENT_ROLE_LABELS, COMMITMENT_STATUS_LABELS, CommitmentResponsibleRole, CommitmentStatus, CreateCommitmentInput, CreateFollowUpAttachmentInput, CreateFollowUpCategoryInput, CreateFollowUpCitationInput (+57 more)

### Community 6 - "TeacherAssignmentsService"
Cohesion: 0.05
Nodes (54): CreateCourseDirectorAssignmentDto, ApiProperty, ApiPropertyOptional, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsUUID (+46 more)

### Community 7 - "auth.service.ts"
Cohesion: 0.05
Nodes (31): AuthService, AuthUser, RefreshResult, Inject, Injectable, DevEmailProvider, Injectable, CommunicationEmailData (+23 more)

### Community 8 - "AuthController"
Cohesion: 0.06
Nodes (40): AuthController, ApiBearerAuth, ApiOperation, ApiTags, Body, Controller, Get, HttpCode (+32 more)

### Community 9 - "react"
Cohesion: 0.09
Nodes (48): getErrorMessage(), getRequestId(), isApiError(), DOCUMENT_TYPE_LABELS, DocumentType, FollowUpConfidentiality, FollowUpSeverity, FollowUpType (+40 more)

### Community 10 - ""institutions""
Cohesion: 0.07
Nodes (47): "audit_logs", "global_user_roles", "institutions", "permissions", "role_permissions", "roles", "user_institutions", "user_roles" (+39 more)

### Community 11 - "@nestjs/common"
Cohesion: 0.09
Nodes (8): AppModule, Module, prisma, prisma, @nestjs/common, @nestjs/testing, @prisma/client, supertest

### Community 12 - "administration/hooks/index.ts"
Cohesion: 0.06
Nodes (44): AssignRoleInput, CreateMembershipInput, CreateUserInput, Institution, InstitutionUpdateInput, ListMembershipsParams, ListUsersParams, Role (+36 more)

### Community 13 - "react-router-dom"
Cohesion: 0.09
Nodes (46): AuthLayout(), useAcademicPeriods(), AcademicPeriodsPage(), getErrorMessage(), InstitutionProfilePage(), InstitutionUsersPage(), AttendanceListPage(), AttendanceRegisterPage() (+38 more)

### Community 14 - "SchedulesService"
Cohesion: 0.05
Nodes (43): CreateScheduleDto, ApiProperty, ApiPropertyOptional, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID (+35 more)

### Community 15 - "AuthorizationService"
Cohesion: 0.05
Nodes (22): CONFIDENTIALITY_VISIBILITY, FollowUpAccessResult, StudentFollowUpAuthorizationService, Injectable, AuthorizationService, Injectable, CourseBrief, DashboardRole (+14 more)

### Community 16 - "AgendaEventsService"
Cohesion: 0.05
Nodes (46): AgendaEventsController, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags, Body, Controller (+38 more)

### Community 17 - "CreateNotificationDto"
Cohesion: 0.05
Nodes (42): CreateNotificationDto, ApiProperty, ApiPropertyOptional, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID (+34 more)

### Community 18 - "AgendaService"
Cohesion: 0.06
Nodes (37): AgendaController, ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, Controller, Get, Query (+29 more)

### Community 19 - "CreateAreaDto"
Cohesion: 0.05
Nodes (44): AreasController, ApiBearerAuth, ApiOperation, ApiParam, ApiTags, Body, Controller, Get (+36 more)

### Community 20 - "ScheduleBlocksService"
Cohesion: 0.06
Nodes (42): CreateScheduleBlockDto, ApiProperty, ApiPropertyOptional, IsEnum, IsNotEmpty, IsOptional, IsString, Matches (+34 more)

### Community 21 - "ListSubjectsQueryDto"
Cohesion: 0.05
Nodes (41): CreateSubjectDto, ApiProperty, ApiPropertyOptional, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID (+33 more)

### Community 22 - "Badge.tsx"
Cohesion: 0.10
Nodes (36): TASK_ASSIGNMENT_STATUS_LABELS, TASK_STATUS_LABELS, TASK_SUBMISSION_STATUS_LABELS, TaskAssignmentStatus, TaskStatus, TaskSubmissionStatus, BadgeProps, variants (+28 more)

### Community 23 - "AcademicPeriodsController"
Cohesion: 0.06
Nodes (38): AcademicPeriodsController, ApiBearerAuth, ApiOperation, ApiParam, ApiTags, Body, Controller, Get (+30 more)

### Community 24 - "RequirePermission"
Cohesion: 0.22
Nodes (19): RequirePermission(), StudentFollowUpsController, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags, Body (+11 more)

### Community 25 - "CreateCourseDto"
Cohesion: 0.05
Nodes (40): CoursesController, ApiBearerAuth, ApiOperation, ApiParam, ApiTags, Body, Controller, Get (+32 more)

### Community 26 - "CreateSchoolGradeDto"
Cohesion: 0.05
Nodes (40): CreateSchoolGradeDto, ApiProperty, ApiPropertyOptional, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength (+32 more)

### Community 27 - "vitest"
Cohesion: 0.05
Nodes (28): mockHasPermission, mockEvent, mockHasPermission, mockNavigate, mockParams, mockCourse, mockEnrollment, mockHasPermission (+20 more)

### Community 28 - ".create"
Cohesion: 0.07
Nodes (38): CreateSubmissionDto, GradeSubmissionDto, ListSubmissionsQueryDto, SubmissionStatusFilter, GRADED, LATE, PENDING, RETURNED (+30 more)

### Community 29 - "AuthenticatedRequest"
Cohesion: 0.23
Nodes (10): PermissionGuard, Injectable, REQUIRE_PERMISSION_KEY, AccessTokenGuard, Injectable, AuthenticatedRequest, TenantContextGuard, Injectable (+2 more)

### Community 30 - "ListInstitutionsQueryDto"
Cohesion: 0.09
Nodes (33): AuthenticatedRequest, CreateInstitutionDto, ListInstitutionsQueryDto, ApiProperty, ApiPropertyOptional, IsEnum, IsInt, IsNotEmpty (+25 more)

### Community 31 - "LinkGuardianDto"
Cohesion: 0.06
Nodes (35): LinkGuardianDto, ApiProperty, ApiPropertyOptional, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString (+27 more)

### Community 32 - "ListTaskAssignmentsQueryDto"
Cohesion: 0.08
Nodes (33): CreateTaskAssignmentDto, ListTaskAssignmentsQueryDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, IsArray, IsEnum, IsInt (+25 more)

### Community 33 - "CreateClassroomDto"
Cohesion: 0.09
Nodes (31): ClassroomsController, ApiBearerAuth, ApiOperation, ApiParam, ApiTags, Body, Controller, Get (+23 more)

### Community 34 - "MembershipsController"
Cohesion: 0.11
Nodes (32): AssignRoleDto, LinkUserDto, ListMembershipsQueryDto, ApiProperty, ApiPropertyOptional, IsArray, IsEnum, IsInt (+24 more)

### Community 35 - "TeacherAssignmentDetailPage.tsx"
Cohesion: 0.13
Nodes (33): COURSE_DIRECTOR_STATUS_LABELS, CourseDirectorStatus, TEACHER_ASSIGNMENT_STATUS_LABELS, TeacherAssignmentStatus, useAcademicPeriod(), useSubjects(), useCourseDirectorAssignment(), useCourseDirectorAssignments() (+25 more)

### Community 36 - "ListEnrollmentsQueryDto"
Cohesion: 0.07
Nodes (31): CreateEnrollmentDto, ApiProperty, IsNotEmpty, IsString, ListEnrollmentsQueryDto, ApiPropertyOptional, IsInt, IsOptional (+23 more)

### Community 37 - "CreateFollowUpCategoryDto"
Cohesion: 0.07
Nodes (30): CreateFollowUpCategoryDto, ApiProperty, ApiPropertyOptional, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength (+22 more)

### Community 38 - "compilerOptions"
Cohesion: 0.05
Nodes (38): compilerOptions, baseUrl, emitDecoratorMetadata, experimentalDecorators, module, moduleResolution, outDir, removeComments (+30 more)

### Community 39 - "PaginatedApiResponse"
Cohesion: 0.08
Nodes (20): Commitment, PaginatedApiResponse, DashboardStatsPermissions, useCount(), useDashboardStats(), usePendingSignatures(), useRecentNotifications(), useRecentTasks() (+12 more)

### Community 40 - "file-hooks.test.tsx"
Cohesion: 0.11
Nodes (21): CommunicationAttachment, FileAsset, TaskAttachment, ALLOWED_MIME_TYPES, FileUploader(), FileUploaderProps, useCommunicationAttachments(), useCreateCommunicationAttachment() (+13 more)

### Community 41 - ".log"
Cohesion: 0.15
Nodes (3): sendFollowUpNotification(), StudentFollowUpsService, Injectable

### Community 42 - "signatures.service.ts"
Cohesion: 0.10
Nodes (23): findGuardianUserIds(), ParentContext, resolveParentContext(), mockedFindGuardianUserIds, mockedResolveParentContext, buildNotificationMessage(), buildNotificationTitle(), canNotifyForConfidentiality() (+15 more)

### Community 43 - "usePermissions.ts"
Cohesion: 0.10
Nodes (27): ACADEMIC_PERIOD_STATUS_LABELS, AcademicPeriodStatus, COMMUNICATION_AUDIENCE_LABELS, COMMUNICATION_STATUS_LABELS, CommunicationAudience, CommunicationStatus, useCloseAcademicPeriod(), AcademicPeriodDetailPage() (+19 more)

### Community 44 - "use-agenda-events.test.tsx"
Cohesion: 0.11
Nodes (21): AgendaEventItem, AgendaResponse, CreateAgendaEventInput, ListAgendaEventsParams, ListAgendaParams, UpdateAgendaEventInput, useAgenda(), useAgendaEvent() (+13 more)

### Community 45 - "Spinner.tsx"
Cohesion: 0.15
Nodes (24): DAY_OF_WEEK_LABELS, ScheduleStatus, ProtectedRoute(), sizes, Spinner(), SpinnerProps, useClassrooms(), useCreateClassroom() (+16 more)

### Community 46 - "ListRecipientsQueryDto"
Cohesion: 0.08
Nodes (23): CommunicationRecipientsController, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags, Controller, Get (+15 more)

### Community 47 - "query-client.ts"
Cohesion: 0.08
Nodes (17): queryClient, mockCourse, mockNavigate, mockUseCourse, mockUseDeactivateCourse, mockGrade, mockNavigate, mockUseDeactivateGrade (+9 more)

### Community 48 - "DashboardService"
Cohesion: 0.10
Nodes (11): DashboardController, ApiBearerAuth, ApiOperation, ApiTags, Controller, Get, Request, UseGuards (+3 more)

### Community 49 - "TasksController"
Cohesion: 0.15
Nodes (21): CreateTaskAttachmentDto, ApiProperty, IsNotEmpty, IsUUID, TasksController, ApiBearerAuth, ApiOperation, ApiParam (+13 more)

### Community 50 - "api/package.json"
Cohesion: 0.07
Nodes (27): description, prettier, name, prisma, seed, private, version, RouteInfo (+19 more)

### Community 51 - "CommunicationsController"
Cohesion: 0.15
Nodes (21): CommunicationsController, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags, Body, Controller (+13 more)

### Community 52 - "@playwright/test"
Cohesion: 0.07
Nodes (5): createAdminContext(), loginAs(), loginAsAdmin(), ROUTES, @playwright/test

### Community 53 - "reports-pages.test.tsx"
Cohesion: 0.14
Nodes (22): CourseReport, StudentReport, downloadBulletinCsv(), downloadBulletinPdf(), downloadCourseReportCsv(), downloadStudentReportCsv(), downloadStudentReportPdf(), slugify() (+14 more)

### Community 54 - "guardians-hooks.test.tsx"
Cohesion: 0.15
Nodes (17): GuardianStudent, GuardianStudentWithStudent, LinkGuardianInput, ListGuardiansParams, useGuardiansByStudent(), useGuardianStudents(), useLinkGuardian(), useUnlinkGuardian() (+9 more)

### Community 55 - "PageHeader"
Cohesion: 0.16
Nodes (18): ATTENDANCE_STATUS_LABELS, AttendanceStatus, CourseStatus, ENROLLMENT_STATUS_LABELS, EnrollmentStatus, PageHeader(), Badge(), ATTENDANCE_STATUS_VARIANT (+10 more)

### Community 56 - "notifications-hooks.test.tsx"
Cohesion: 0.21
Nodes (14): ListNotificationsParams, Notification, useDeleteAllNotifications(), useDeleteNotification(), useMarkAllNotificationsRead(), useMarkNotificationRead(), useNotification(), NotificationsListResponse (+6 more)

### Community 57 - "UsersController"
Cohesion: 0.17
Nodes (17): ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags, Body, Controller (+9 more)

### Community 58 - "shared/package.json"
Cohesion: 0.08
Nodes (23): eslint, eslint-config-prettier, typescript, typescript-eslint, description, devDependencies, eslint, eslint-config-prettier (+15 more)

### Community 59 - "web/package.json"
Cohesion: 0.10
Nodes (21): @types/node, description, prettier, name, private, type, version, @agenda/shared (+13 more)

### Community 60 - "FilesService"
Cohesion: 0.12
Nodes (4): FilesService, Injectable, StorageProvider, StorageUploadResult

### Community 61 - "academic-periods-hooks.test.tsx"
Cohesion: 0.15
Nodes (13): AcademicPeriod, CreateAcademicPeriodInput, ListAcademicPeriodsParams, UpdateAcademicPeriodInput, useCreateAcademicPeriod(), useDeactivateAcademicPeriod(), useUpdateAcademicPeriod(), AcademicPeriodFormPage() (+5 more)

### Community 62 - "attendance-hooks.test.tsx"
Cohesion: 0.20
Nodes (14): Attendance, CreateAttendanceBulkInput, CreateAttendanceBulkResult, CreateAttendanceInput, ListAttendancesParams, UpdateAttendanceInput, useAttendance(), useAttendances() (+6 more)

### Community 63 - "PageHeader.tsx"
Cohesion: 0.18
Nodes (16): SCHOOL_GRADE_STATUS_LABELS, SchoolGradeStatus, PageHeaderProps, useCreateSchoolGrade(), useDeactivateSchoolGrade(), useSchoolGrade(), useUpdateSchoolGrade(), SchoolGradeDetailPage() (+8 more)

### Community 64 - "dependencies"
Cohesion: 0.09
Nodes (23): dependencies, argon2, class-transformer, class-validator, csv-parse, exceljs, helmet, @nestjs/common (+15 more)

### Community 65 - "main.ts"
Cohesion: 0.12
Nodes (14): AllExceptionsFilter, LoggingInterceptor, TenantPayload, Injectable, UserPayload, RequestIdMiddleware, RequestWithId, Injectable (+6 more)

### Community 66 - "AttendancesController"
Cohesion: 0.17
Nodes (16): AttendancesController, ApiBearerAuth, ApiOperation, ApiParam, ApiTags, Body, Controller, Delete (+8 more)

### Community 67 - "CommunicationsService"
Cohesion: 0.11
Nodes (12): CommunicationsService, Injectable, ListCommunicationsQueryDto, ApiPropertyOptional, IsDateString, IsEnum, IsInt, IsOptional (+4 more)

### Community 68 - ".upload"
Cohesion: 0.13
Nodes (18): FilesController, ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags, Controller (+10 more)

### Community 69 - "ReportsService"
Cohesion: 0.19
Nodes (4): toCsv(), ReportsService, Injectable, RFC-4180

### Community 70 - "Card.tsx"
Cohesion: 0.13
Nodes (17): NotificationStatus, NotificationType, Card(), CardProps, paddings, AgendaPage(), EVENT_TYPE_CONFIG, formatDateHeader() (+9 more)

### Community 71 - "ChildContext.tsx"
Cohesion: 0.15
Nodes (15): Topbar(), TopbarProps, AppLayout(), Child, ChildContext, ChildContextValue, ChildProvider(), EMPTY_CHILD_CONTEXT (+7 more)

### Community 72 - "devDependencies"
Cohesion: 0.09
Nodes (22): devDependencies, eslint, eslint-config-prettier, jest, @nestjs/cli, @nestjs/testing, prettier, prisma (+14 more)

### Community 73 - "api.ts"
Cohesion: 0.20
Nodes (15): apiRequest(), cleanupE2EEntity(), createE2ECommunication(), createE2ECourse(), createE2ENotification(), createE2ESignature(), createE2EStudent(), createE2ESubject() (+7 more)

### Community 74 - "devDependencies"
Cohesion: 0.09
Nodes (22): devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom (+14 more)

### Community 75 - "ReportsController"
Cohesion: 0.26
Nodes (13): ReportsController, ApiBearerAuth, ApiOperation, ApiParam, ApiTags, Controller, Get, Param (+5 more)

### Community 76 - "SignaturesController"
Cohesion: 0.23
Nodes (13): SignaturesController, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags, Controller, Get (+5 more)

### Community 77 - "SignatureDetailPage.tsx"
Cohesion: 0.21
Nodes (16): SIGNATURE_REQUEST_STATUS_LABELS, SignatureRequestStatus, useCreateSignature(), useDeactivateSignature(), useDeclineSignature(), usePublishSignature(), useSignature(), useSignatures() (+8 more)

### Community 78 - "seed.ts"
Cohesion: 0.13
Nodes (19): ALL_PERMISSIONS, assignPermissions(), COORDINADOR_ACADEMICO_PERMISSIONS, COORDINADOR_CONVIVENCIA_PERMISSIONS, DIRECTOR_DE_GRUPO_PERMISSIONS, findOrCreateGlobalRole(), findOrCreateTemplateRole(), findOrCreateTenantRole() (+11 more)

### Community 80 - ".import"
Cohesion: 0.12
Nodes (16): CreateStudentDto, ApiProperty, ApiPropertyOptional, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString (+8 more)

### Community 81 - "communications-hooks.test.tsx"
Cohesion: 0.23
Nodes (10): Communication, CreateCommunicationInput, ListCommunicationsParams, UpdateCommunicationInput, useCommunications(), useCreateCommunication(), useDeactivateCommunication(), usePublishCommunication() (+2 more)

### Community 82 - "enrollments-hooks.test.tsx"
Cohesion: 0.27
Nodes (10): CreateEnrollmentInput, Enrollment, ListEnrollmentsParams, UpdateEnrollmentInput, useCreateEnrollment(), useDeactivateEnrollment(), useEnrollment(), useEnrollments() (+2 more)

### Community 83 - "@testing-library/user-event"
Cohesion: 0.11
Nodes (11): mockNavigate, mockUseCourses, mockNavigate, mockUseCreateGrade, mockUseGrade, mockNavigate, mockUseSchedules, mockNavigate (+3 more)

### Community 84 - "reports-response.dto.ts"
Cohesion: 0.24
Nodes (17): CourseReportDto, CourseReportSummaryDto, ReportAcademicPeriodDto, ReportAttendanceSummaryDto, ReportCourseDto, ReportCourseStudentDto, ReportEnrollmentDto, ReportGradeDto (+9 more)

### Community 85 - "TasksService"
Cohesion: 0.14
Nodes (10): ApiPropertyOptional, IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength, UpdateTaskDto (+2 more)

### Community 86 - "package.json"
Cohesion: 0.11
Nodes (15): description, devDependencies, axe-core, @axe-core/playwright, @playwright/test, @types/multer, engines, node (+7 more)

### Community 87 - "SubjectsPage.tsx"
Cohesion: 0.30
Nodes (13): EDUCATION_LEVEL_LABELS, EducationLevel, SUBJECT_TYPE_LABELS, SubjectStatus, SubjectType, useAreas(), useCreateSubject(), useDeactivateSubject() (+5 more)

### Community 88 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, db:down, db:up, dev:api, dev:web, format, format:check (+10 more)

### Community 89 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, format, format:check, lint, prisma:generate, prisma:migrate, prisma:seed (+9 more)

### Community 90 - "CreateUserDto"
Cohesion: 0.18
Nodes (17): CreateUserDto, ListUsersQueryDto, ApiProperty, ApiPropertyOptional, IsEmail, IsEnum, IsInt, IsNotEmpty (+9 more)

### Community 92 - "auth.store.tsx"
Cohesion: 0.18
Nodes (14): AuthUser, LoginResponse, RefreshResponse, App(), router, AuthContext, AuthContextValue, AuthProvider() (+6 more)

### Community 93 - "CreateAttendanceBulkDto"
Cohesion: 0.14
Nodes (16): BulkAttendanceRecordDto, CreateAttendanceBulkDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsDateString (+8 more)

### Community 94 - "FollowUpCitationsService"
Cohesion: 0.19
Nodes (9): ApiPropertyOptional, IsDateString, IsEnum, IsOptional, IsString, MaxLength, UpdateFollowUpCitationDto, FollowUpCitationsService (+1 more)

### Community 95 - "StudentsController"
Cohesion: 0.23
Nodes (12): StudentsController, ApiBearerAuth, ApiOperation, ApiParam, ApiTags, Controller, Get, Param (+4 more)

### Community 96 - "TenantContextService"
Cohesion: 0.18
Nodes (6): OptionalTenantContextGuard, Injectable, InstitutionListItem, TenantContext, TenantContextService, Injectable

### Community 98 - "communication-recipients-hooks.test.tsx"
Cohesion: 0.25
Nodes (8): CommunicationRecipient, ListCommunicationRecipientsParams, UnreadCountResponse, useCommunicationRecipients(), useMarkAllCommunicationsAsRead(), useMarkCommunicationAsRead(), useUnreadCommunicationsCount(), mockRecipient

### Community 99 - "roles.service.ts"
Cohesion: 0.16
Nodes (9): ASSIGNABLE_TENANT_ROLES, RolesController, ApiBearerAuth, ApiTags, Controller, UseGuards, RoleListItem, RolesService (+1 more)

### Community 100 - "SelfRegisterDto"
Cohesion: 0.14
Nodes (14): SelfRegisterDto, ApiProperty, ApiPropertyOptional, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID (+6 more)

### Community 101 - "ListGradesQueryDto"
Cohesion: 0.15
Nodes (12): ListGradesQueryDto, ApiPropertyOptional, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max (+4 more)

### Community 102 - "health.controller.ts"
Cohesion: 0.18
Nodes (9): HealthController, HealthResponse, ReadinessResponse, ApiOperation, ApiTags, Controller, Get, HealthModule (+1 more)

### Community 103 - "GradeFormPage.tsx"
Cohesion: 0.34
Nodes (9): GradeStatus, useCreateGrade(), useDeactivateGrade(), useGrade(), useGrades(), useUpdateGrade(), GradeDetailPage(), GradeFormPage() (+1 more)

### Community 104 - "ListStudentFollowUpsQueryDto"
Cohesion: 0.15
Nodes (11): ListStudentFollowUpsQueryDto, ApiPropertyOptional, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID (+3 more)

### Community 106 - "CreateSignatureRequestDto"
Cohesion: 0.15
Nodes (13): CreateSignatureRequestDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsNotEmpty (+5 more)

### Community 107 - "RequestFollowUpSignatureDto"
Cohesion: 0.15
Nodes (13): RequestFollowUpSignatureDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsNotEmpty (+5 more)

### Community 108 - "CreateGradeDto"
Cohesion: 0.17
Nodes (12): CreateGradeDto, ApiProperty, ApiPropertyOptional, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString (+4 more)

### Community 109 - "ListTasksQueryDto"
Cohesion: 0.17
Nodes (11): ListTasksQueryDto, ApiPropertyOptional, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID (+3 more)

### Community 110 - "Sidebar.tsx"
Cohesion: 0.23
Nodes (9): isPathActive(), loadExpanded(), NAV_CATEGORIES, NavCategory, NavItem, Sidebar(), SidebarProps, mockHasPermission (+1 more)

### Community 111 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, noFallthroughCasesInSwitch, noImplicitOverride, resolveJsonModule, skipLibCheck (+3 more)

### Community 112 - "CreateCommunicationDto"
Cohesion: 0.18
Nodes (10): CreateCommunicationDto, ApiProperty, ApiPropertyOptional, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString (+2 more)

### Community 113 - "report-pdf.ts"
Cohesion: 0.25
Nodes (10): buildReportPdf(), PdfAcademicGradeRow, PdfAcademicSection, PdfKeyValueLine, PdfReportPayload, renderAcademicTable(), renderFootnotes(), renderHeader() (+2 more)

### Community 114 - "ListSignatureRequestsQueryDto"
Cohesion: 0.18
Nodes (11): ListSignatureRequestsQueryDto, ApiPropertyOptional, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID (+3 more)

### Community 115 - "UpdateSignatureRequestDto"
Cohesion: 0.18
Nodes (11): ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID (+3 more)

### Community 116 - "DashboardPage.tsx"
Cohesion: 0.22
Nodes (7): StatCard(), StatCardProps, COMMITMENT_BADGE, DashboardPage(), FOLLOW_UP_BADGE, formatDate(), SectionProps

### Community 117 - "task-submission-detail-page.test.tsx"
Cohesion: 0.18
Nodes (9): mockAssignment, mockNavigate, mockSubmission, mockUseGradeTaskSubmission, mockUseStudents, mockUseTask, mockUseTaskAssignment, mockUseTaskSubmission (+1 more)

### Community 118 - "AttendanceAuthorizationService"
Cohesion: 0.29
Nodes (3): AttendanceAuthorizationService, ListFilterShape, Injectable

### Community 119 - "CreateAttendanceDto"
Cohesion: 0.20
Nodes (10): CreateAttendanceDto, ApiProperty, ApiPropertyOptional, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString (+2 more)

### Community 120 - "ListAttendancesQueryDto"
Cohesion: 0.20
Nodes (10): ListAttendancesQueryDto, ApiPropertyOptional, IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max (+2 more)

### Community 121 - "UpdateGradeDto"
Cohesion: 0.20
Nodes (10): ApiPropertyOptional, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength (+2 more)

### Community 122 - "CreateCommitmentDto"
Cohesion: 0.20
Nodes (10): CreateCommitmentDto, ApiProperty, ApiPropertyOptional, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString (+2 more)

### Community 123 - "CreateStudentFollowUpDto"
Cohesion: 0.20
Nodes (10): CreateStudentFollowUpDto, ApiProperty, ApiPropertyOptional, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID (+2 more)

### Community 124 - "students-import.service.ts"
Cohesion: 0.22
Nodes (7): ImportRowError, CSV_MIMES, HEADER_TO_KEY, HEADERS, NormalizedRow, XLSX_MIMES, exceljs

### Community 125 - "StudentsImportService"
Cohesion: 0.31
Nodes (3): ImportStudentsResult, StudentsImportService, Injectable

### Community 126 - "CreateTaskDto"
Cohesion: 0.20
Nodes (10): CreateTaskDto, ApiProperty, ApiPropertyOptional, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID (+2 more)

### Community 127 - "CreateTeacherAssignmentDto"
Cohesion: 0.20
Nodes (10): CreateTeacherAssignmentDto, ApiProperty, ApiPropertyOptional, IsDateString, IsInt, IsNotEmpty, IsOptional, IsUUID (+2 more)

### Community 128 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, dev, format, format:check, lint, preview, test (+2 more)

### Community 129 - "task-submission-form-page.test.tsx"
Cohesion: 0.20
Nodes (7): mockAssignment, mockNavigate, mockUseCreateTaskSubmission, mockUseTask, mockUseTaskAssignment, mockUseTaskSubmission, mockUseUpdateTaskSubmission

### Community 130 - "jest"
Cohesion: 0.22
Nodes (9): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+1 more)

### Community 131 - ".update"
Cohesion: 0.42
Nodes (5): ApiOperation, ApiParam, Param, Patch, Request

### Community 132 - "test-utils.ts"
Cohesion: 0.22
Nodes (3): login(), TestContext, VALID_PASSWORD_HASH

### Community 133 - "task-assignment-detail-page.test.tsx"
Cohesion: 0.22
Nodes (7): mockAssignment, mockNavigate, mockUseDeactivateTaskAssignment, mockUseStudents, mockUseTask, mockUseTaskAssignment, mockUseUpdateTaskAssignment

### Community 134 - "UpdateCommunicationDto"
Cohesion: 0.25
Nodes (8): ApiPropertyOptional, IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength, UpdateCommunicationDto

### Community 135 - "files.service.ts"
Cohesion: 0.29
Nodes (6): ALLOWED_MIME_TYPES, MAX_COMMUNICATION_ATTACHMENTS, MAX_FILE_SIZE_MB, MAX_TASK_ATTACHMENTS, MockFn, MockModel

### Community 136 - "CreateFollowUpAttachmentDto"
Cohesion: 0.25
Nodes (8): CreateFollowUpAttachmentDto, ApiProperty, ApiPropertyOptional, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength

### Community 137 - "CreateFollowUpCitationDto"
Cohesion: 0.25
Nodes (8): CreateFollowUpCitationDto, ApiProperty, ApiPropertyOptional, IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength

### Community 138 - "ListFollowUpCitationsQueryDto"
Cohesion: 0.25
Nodes (8): ListFollowUpCitationsQueryDto, ApiPropertyOptional, IsEnum, IsInt, IsOptional, Max, Min, Type

### Community 139 - "UpdateCommitmentDto"
Cohesion: 0.25
Nodes (8): ApiPropertyOptional, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, UpdateCommitmentDto

### Community 140 - "UpdateStudentFollowUpDto"
Cohesion: 0.25
Nodes (8): ApiPropertyOptional, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength, UpdateStudentFollowUpDto

### Community 141 - "ListStudentsQueryDto"
Cohesion: 0.25
Nodes (8): ListStudentsQueryDto, ApiPropertyOptional, IsInt, IsOptional, IsString, Max, Min, Type

### Community 142 - "colegio-flow.spec.ts"
Cohesion: 0.25
Nodes (3): S, STAMP, State

### Community 143 - "task-detail-page.test.tsx"
Cohesion: 0.25
Nodes (6): mockNavigate, mockTask, mockUseCloseTask, mockUseDeactivateTask, mockUsePublishTask, mockUseTask

### Community 144 - "UpdateStudentDto"
Cohesion: 0.29
Nodes (7): ApiPropertyOptional, IsDateString, IsEnum, IsOptional, IsString, MaxLength, UpdateStudentDto

### Community 146 - "UpsertUserProfileDto"
Cohesion: 0.29
Nodes (7): ApiPropertyOptional, IsDateString, IsEnum, IsOptional, IsString, MaxLength, UpsertUserProfileDto

### Community 147 - "src/index.ts"
Cohesion: 0.38
Nodes (4): API_PREFIX, APP_NAME, HealthResponse, PaginatedResult

### Community 148 - "AttachmentList.tsx"
Cohesion: 0.43
Nodes (5): Attachment, AttachmentList(), AttachmentListProps, getFileIcon(), formatFileSize()

### Community 149 - "task-submissions-page.test.tsx"
Cohesion: 0.29
Nodes (5): mockNavigate, mockUseStudents, mockUseTaskAssignments, mockUseTasks, mockUseTaskSubmission

### Community 150 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 151 - "validate-model.ts"
Cohesion: 0.53
Nodes (5): cleanup(), fail(), main(), pass(), prisma

### Community 152 - "UpdateAttendanceDto"
Cohesion: 0.33
Nodes (6): ApiPropertyOptional, IsEnum, IsOptional, IsString, MaxLength, UpdateAttendanceDto

### Community 153 - "GradesController"
Cohesion: 0.33
Nodes (5): GradesController, ApiBearerAuth, ApiTags, Controller, UseGuards

### Community 155 - "ReportsQueryDto"
Cohesion: 0.47
Nodes (6): ReportsExportQueryDto, ReportsQueryDto, ApiPropertyOptional, IsEnum, IsOptional, IsUUID

### Community 156 - "CreateFollowUpEntryDto"
Cohesion: 0.33
Nodes (6): CreateFollowUpEntryDto, ApiProperty, IsEnum, IsNotEmpty, IsString, MaxLength

### Community 157 - "UpdateFollowUpEntryDto"
Cohesion: 0.33
Nodes (6): ApiPropertyOptional, IsEnum, IsOptional, IsString, MaxLength, UpdateFollowUpEntryDto

### Community 158 - "responsive.spec.ts"
Cohesion: 0.33
Nodes (3): DESKTOP, MOBILE, TABLET

### Community 159 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, @agenda/shared, react, react-dom, react-router-dom, @tanstack/react-query

### Community 160 - "Avatar.tsx"
Cohesion: 0.47
Nodes (5): Avatar(), AvatarProps, getColor(), getInitials(), sizes

### Community 161 - "schedule-detail-page.test.tsx"
Cohesion: 0.33
Nodes (4): mockNavigate, mockSchedule, mockUseDeactivateSchedule, mockUseSchedule

### Community 162 - "student-detail-page.test.tsx"
Cohesion: 0.33
Nodes (4): mockNavigate, mockStudent, mockUseDeactivateStudent, mockUseStudent

### Community 163 - "student-form-page.test.tsx"
Cohesion: 0.33
Nodes (4): mockHasPermission, mockNavigate, mockUseCreateStudent, mockUseStudent

### Community 164 - "subject-detail-page.test.tsx"
Cohesion: 0.33
Nodes (4): mockNavigate, mockSubject, mockUseDeactivateSubject, mockUseSubject

### Community 165 - "task-assignment-form-page.test.tsx"
Cohesion: 0.33
Nodes (4): mockNavigate, mockUseCreateTaskAssignment, mockUseStudents, mockUseTasks

### Community 166 - "task-assignments-page.test.tsx"
Cohesion: 0.33
Nodes (4): mockNavigate, mockUseStudents, mockUseTaskAssignments, mockUseTasks

### Community 167 - "agenda-event-response.dto.ts"
Cohesion: 0.50
Nodes (4): AgendaEventCreatedByDto, AgendaEventResponseDto, ApiProperty, ApiPropertyOptional

### Community 168 - "UploadFileDto"
Cohesion: 0.40
Nodes (5): ApiPropertyOptional, IsOptional, IsString, MaxLength, UploadFileDto

### Community 169 - ".findAll"
Cohesion: 0.40
Nodes (3): ApiOperation, Get, Request

### Community 170 - "ImportStudentsOptionsDto"
Cohesion: 0.40
Nodes (5): ImportStudentsOptionsDto, ApiPropertyOptional, IsOptional, IsUUID, Transform

### Community 172 - "course-form-page.test.tsx"
Cohesion: 0.40
Nodes (3): mockNavigate, mockUseCourse, mockUseCreateCourse

### Community 173 - "schedule-form-page.test.tsx"
Cohesion: 0.40
Nodes (3): mockNavigate, mockUseCreateSchedule, mockUseSchedule

### Community 174 - "task-form-page.test.tsx"
Cohesion: 0.40
Nodes (3): mockNavigate, mockUseCreateTask, mockUseTask

### Community 175 - ".create"
Cohesion: 0.50
Nodes (3): Body, HttpCode, Post

### Community 176 - ".create"
Cohesion: 0.50
Nodes (3): Body, HttpCode, Post

### Community 177 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 178 - "smoke-test.sh"
Cohesion: 0.83
Nodes (3): fail(), pass(), smoke-test.sh script

## Knowledge Gaps
- **666 isolated node(s):** `AgendaEventCreatedBy`, `CourseReportSummary`, `CreateNotificationInput`, `FileAssetStatus`, `ImportRowError` (+661 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1835 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `TenantContextService`, `main.ts`, `PrismaService`, `roles.service.ts`, `app.module.ts`, `@nestjs/swagger`, `health.controller.ts`, `auth.service.ts`, `files.service.ts`, `test-utils.ts`, `signatures.service.ts`, `AuthorizationService`, `api/package.json`, `AgendaService`, `students-import.service.ts`, `AuthenticatedRequest`?**
  _High betweenness centrality (0.224) - this node is a cross-community bridge._
- **Why does `@tanstack/react-query` connect `@tanstack/react-query` to `types.ts`, `task-submission-form-page.test.tsx`, `StudentFollowUpDetailPage.tsx`, `task-assignment-detail-page.test.tsx`, `administration/hooks/index.ts`, `react-router-dom`, `task-detail-page.test.tsx`, `task-submissions-page.test.tsx`, `vitest`, `schedule-detail-page.test.tsx`, `student-detail-page.test.tsx`, `student-form-page.test.tsx`, `subject-detail-page.test.tsx`, `task-assignment-form-page.test.tsx`, `task-assignments-page.test.tsx`, `PaginatedApiResponse`, `file-hooks.test.tsx`, `usePermissions.ts`, `use-agenda-events.test.tsx`, `course-form-page.test.tsx`, `schedule-form-page.test.tsx`, `query-client.ts`, `task-form-page.test.tsx`, `reports-pages.test.tsx`, `guardians-hooks.test.tsx`, `notifications-hooks.test.tsx`, `web/package.json`, `academic-periods-hooks.test.tsx`, `attendance-hooks.test.tsx`, `PageHeader.tsx`, `ChildContext.tsx`, `communications-hooks.test.tsx`, `enrollments-hooks.test.tsx`, `@testing-library/user-event`, `auth.store.tsx`, `communication-recipients-hooks.test.tsx`, `Sidebar.tsx`, `task-submission-detail-page.test.tsx`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Why does `@nestjs/swagger` connect `@nestjs/swagger` to `main.ts`, `CreateClassroomDto`, `MembershipsController`, `health.controller.ts`, `agenda-event-response.dto.ts`, `@nestjs/common`, `api/package.json`, `AgendaService`, `reports-response.dto.ts`, `.create`, `AuthenticatedRequest`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **What connects `AgendaEventCreatedBy`, `CourseReportSummary`, `CreateNotificationInput` to the rest of the system?**
  _666 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.025630252100840335 - nodes in this community are weakly interconnected._
- **Should `PrismaService` be split into smaller, more focused modules?**
  _Cohesion score 0.044158415841584156 - nodes in this community are weakly interconnected._
- **Should `@tanstack/react-query` be split into smaller, more focused modules?**
  _Cohesion score 0.05148514851485148 - nodes in this community are weakly interconnected._