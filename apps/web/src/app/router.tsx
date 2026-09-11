import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { InstitutionSelectPage } from '@/pages/InstitutionSelectPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { UserProfilePage } from '@/pages/UserProfilePage';
import { GoogleCallbackPage } from '@/pages/GoogleCallbackPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import {
  StudentsPage,
  StudentDetailPage,
  StudentFormPage,
  StudentImportPage,
} from '@/modules/students';
import { CoursesPage, CourseDetailPage, CourseFormPage } from '@/modules/courses';
import { SubjectsPage, SubjectDetailPage, SubjectFormPage } from '@/modules/subjects';
import { AreasPage } from '@/modules/areas';
import { GradesPage, GradeDetailPage, GradeFormPage } from '@/modules/grades';
import {
  SchedulesPage,
  ScheduleDetailPage,
  ScheduleFormPage,
  ScheduleBlocksPage,
  ClassroomsPage,
} from '@/modules/schedules';
import { TasksPage, TaskDetailPage, TaskFormPage } from '@/modules/tasks';
import {
  TaskAssignmentsPage,
  TaskAssignmentDetailPage,
  TaskAssignmentFormPage,
} from '@/modules/task-assignments';
import {
  TaskSubmissionsPage,
  TaskSubmissionDetailPage,
  TaskSubmissionFormPage,
} from '@/modules/task-submissions';
import {
  CommunicationsPage,
  CommunicationDetailPage,
  CommunicationFormPage,
} from '@/modules/communications';
import { CommunicationInboxPage } from '@/modules/communication-recipients';
import { SignaturesPage, SignatureDetailPage, SignatureFormPage } from '@/modules/signatures';
import { NotificationsPage, NotificationDetailPage } from '@/modules/notifications';
import {
  AcademicPeriodsPage,
  AcademicPeriodDetailPage,
  AcademicPeriodFormPage,
} from '@/modules/academic-periods';
import {
  SchoolGradesPage,
  SchoolGradeDetailPage,
  SchoolGradeFormPage,
} from '@/modules/school-grades';
import { GuardiansPage, GuardiansFormPage } from '@/modules/guardians';
import { EnrollmentsPage, EnrollmentDetailPage, EnrollmentFormPage } from '@/modules/enrollments';
import {
  TeacherAssignmentsPage,
  TeacherAssignmentDetailPage,
  TeacherAssignmentFormPage,
  TeachersPage,
  CourseDirectorsPage,
  CourseDirectorDetailPage,
  CourseDirectorFormPage,
} from '@/modules/teacher-assignments';
import {
  StudentFollowUpsPage,
  StudentFollowUpDetailPage,
  StudentFollowUpFormPage,
  FollowUpCategoriesPage,
} from '@/modules/student-follow-ups';
import { AgendaPage, AgendaEventDetailPage, AgendaEventFormPage } from '@/modules/agenda';
import { AttendanceListPage, AttendanceRegisterPage } from '@/modules/attendance';
import { ReportsPage, CourseReportPage } from '@/modules/reports';
import {
  InstitutionProfilePage,
  InstitutionUsersPage,
  CreateUserPage,
  UserDetailPage,
  MembershipRequestsPage,
} from '@/modules/administration';

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/auth/google/callback', element: <GoogleCallbackPage /> },
      { path: '/unauthorized', element: <UnauthorizedPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/select-institution', element: <InstitutionSelectPage /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/profile', element: <UserProfilePage /> },
          { path: '/agenda', element: <AgendaPage /> },
          { path: '/agenda/events/new', element: <AgendaEventFormPage /> },
          { path: '/agenda/events/:id', element: <AgendaEventDetailPage /> },
          { path: '/agenda/events/:id/edit', element: <AgendaEventFormPage /> },
          { path: '/students', element: <StudentsPage /> },
          { path: '/students/new', element: <StudentFormPage /> },
          { path: '/students/import', element: <StudentImportPage /> },
          { path: '/students/:id', element: <StudentDetailPage /> },
          { path: '/students/:id/edit', element: <StudentFormPage /> },
          { path: '/courses', element: <CoursesPage /> },
          { path: '/courses/new', element: <CourseFormPage /> },
          { path: '/courses/:id', element: <CourseDetailPage /> },
          { path: '/courses/:id/edit', element: <CourseFormPage /> },
          { path: '/subjects', element: <SubjectsPage /> },
          { path: '/subjects/new', element: <SubjectFormPage /> },
          { path: '/subjects/:id', element: <SubjectDetailPage /> },
          { path: '/subjects/:id/edit', element: <SubjectFormPage /> },
          { path: '/areas', element: <AreasPage /> },
          { path: '/grades', element: <GradesPage /> },
          { path: '/grades/new', element: <GradeFormPage /> },
          { path: '/grades/:id', element: <GradeDetailPage /> },
          { path: '/grades/:id/edit', element: <GradeFormPage /> },
          { path: '/schedules', element: <SchedulesPage /> },
          { path: '/schedules/new', element: <ScheduleFormPage /> },
          { path: '/schedules/blocks', element: <ScheduleBlocksPage /> },
          { path: '/schedules/classrooms', element: <ClassroomsPage /> },
          { path: '/schedules/:id', element: <ScheduleDetailPage /> },
          { path: '/schedules/:id/edit', element: <ScheduleFormPage /> },
          { path: '/tasks', element: <TasksPage /> },
          { path: '/tasks/new', element: <TaskFormPage /> },
          { path: '/tasks/:id', element: <TaskDetailPage /> },
          { path: '/tasks/:id/edit', element: <TaskFormPage /> },
          { path: '/task-assignments', element: <TaskAssignmentsPage /> },
          { path: '/task-assignments/new', element: <TaskAssignmentFormPage /> },
          { path: '/task-assignments/:id', element: <TaskAssignmentDetailPage /> },
          { path: '/task-submissions', element: <TaskSubmissionsPage /> },
          { path: '/task-submissions/:id', element: <TaskSubmissionDetailPage /> },
          { path: '/task-submissions/:id/new', element: <TaskSubmissionFormPage /> },
          { path: '/communications', element: <CommunicationsPage /> },
          { path: '/communications/new', element: <CommunicationFormPage /> },
          { path: '/communications/:id', element: <CommunicationDetailPage /> },
          { path: '/communications/:id/edit', element: <CommunicationFormPage /> },
          { path: '/communication-inbox', element: <CommunicationInboxPage /> },
          { path: '/signatures', element: <SignaturesPage /> },
          { path: '/signatures/new', element: <SignatureFormPage /> },
          { path: '/signatures/:id', element: <SignatureDetailPage /> },
          { path: '/signatures/:id/edit', element: <SignatureFormPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/notifications/:id', element: <NotificationDetailPage /> },
          { path: '/academic-periods', element: <AcademicPeriodsPage /> },
          { path: '/academic-periods/new', element: <AcademicPeriodFormPage /> },
          { path: '/academic-periods/:id', element: <AcademicPeriodDetailPage /> },
          { path: '/academic-periods/:id/edit', element: <AcademicPeriodFormPage /> },
          { path: '/school-grades', element: <SchoolGradesPage /> },
          { path: '/school-grades/new', element: <SchoolGradeFormPage /> },
          { path: '/school-grades/:id', element: <SchoolGradeDetailPage /> },
          { path: '/school-grades/:id/edit', element: <SchoolGradeFormPage /> },
          { path: '/guardians', element: <GuardiansPage /> },
          { path: '/guardians/new', element: <GuardiansFormPage /> },
          { path: '/enrollments', element: <EnrollmentsPage /> },
          { path: '/enrollments/new', element: <EnrollmentFormPage /> },
          { path: '/enrollments/:id', element: <EnrollmentDetailPage /> },
          { path: '/teacher-assignments', element: <TeacherAssignmentsPage /> },
          { path: '/teacher-assignments/new', element: <TeacherAssignmentFormPage /> },
          { path: '/teacher-assignments/:id', element: <TeacherAssignmentDetailPage /> },
          { path: '/course-directors', element: <CourseDirectorsPage /> },
          { path: '/course-directors/new', element: <CourseDirectorFormPage /> },
          { path: '/course-directors/:id', element: <CourseDirectorDetailPage /> },
          { path: '/teachers', element: <TeachersPage /> },
          { path: '/student-follow-ups', element: <StudentFollowUpsPage /> },
          { path: '/student-follow-ups/new', element: <StudentFollowUpFormPage /> },
          { path: '/student-follow-ups/:id', element: <StudentFollowUpDetailPage /> },
          { path: '/student-follow-ups/:id/edit', element: <StudentFollowUpFormPage /> },
          { path: '/student-follow-ups/categories', element: <FollowUpCategoriesPage /> },
          { path: '/attendance', element: <AttendanceListPage /> },
          { path: '/attendance/register', element: <AttendanceRegisterPage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/reports/course', element: <CourseReportPage /> },
          { path: '/institution', element: <InstitutionProfilePage /> },
          { path: '/admin/users', element: <InstitutionUsersPage /> },
          { path: '/admin/users/new', element: <CreateUserPage /> },
          { path: '/admin/users/:membershipId', element: <UserDetailPage /> },
          { path: '/admin/requests', element: <MembershipRequestsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
