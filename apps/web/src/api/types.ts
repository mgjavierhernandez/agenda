export interface ApiError {
  statusCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface Membership {
  id: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface TenantContextResponse {
  institution: Institution;
  membership: Membership;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedApiResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type StudentStatus = 'ACTIVE' | 'INACTIVE';
export type DocumentType = 'DNI' | 'PASSPORT' | 'NATIONAL_ID' | 'OTHER';

export interface Student {
  id: string;
  institutionId: string;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  dateOfBirth: string | null;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentInput {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  dateOfBirth?: string;
}

export interface UpdateStudentInput {
  firstName?: string;
  lastName?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  dateOfBirth?: string;
  status?: StudentStatus;
}

export interface ListStudentsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export type CourseStatus = 'ACTIVE' | 'INACTIVE';

export interface Course {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  description: string | null;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseInput {
  code: string;
  name: string;
  description?: string;
  status?: CourseStatus;
}

export interface UpdateCourseInput {
  code?: string;
  name?: string;
  description?: string;
  status?: CourseStatus;
}

export interface ListCoursesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CourseStatus;
}

export type SubjectStatus = 'ACTIVE' | 'INACTIVE';

export interface Subject {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  description: string | null;
  status: SubjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectInput {
  code: string;
  name: string;
  description?: string;
  status?: SubjectStatus;
}

export interface UpdateSubjectInput {
  code?: string;
  name?: string;
  description?: string;
  status?: SubjectStatus;
}

export interface ListSubjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SubjectStatus;
}

export type GradeStatus = 'ACTIVE' | 'INACTIVE';

export interface Grade {
  id: string;
  institutionId: string;
  studentId: string;
  courseId: string;
  subjectId: string;
  value: string;
  period: string;
  evaluationType: string | null;
  description: string | null;
  status: GradeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGradeInput {
  studentId: string;
  courseId: string;
  subjectId: string;
  value: number;
  period: string;
  evaluationType?: string;
  description?: string;
  status?: GradeStatus;
}

export interface UpdateGradeInput {
  studentId?: string;
  courseId?: string;
  subjectId?: string;
  value?: number;
  period?: string;
  evaluationType?: string;
  description?: string;
  status?: GradeStatus;
}

export interface ListGradesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: GradeStatus;
  studentId?: string;
  courseId?: string;
  subjectId?: string;
  period?: string;
}

export type ScheduleStatus = 'ACTIVE' | 'INACTIVE';
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

export const DAY_OF_WEEK_ORDER: DayOfWeek[] = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];

export interface Schedule {
  id: string;
  institutionId: string;
  courseId: string;
  subjectId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  classroom: string | null;
  status: ScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  courseId: string;
  subjectId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  classroom?: string;
  status?: ScheduleStatus;
}

export interface UpdateScheduleInput {
  courseId?: string;
  subjectId?: string;
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  classroom?: string;
  status?: ScheduleStatus;
}

export interface ListSchedulesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ScheduleStatus;
  courseId?: string;
  subjectId?: string;
  dayOfWeek?: DayOfWeek;
}

export type TaskStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'INACTIVE';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  CLOSED: 'Cerrada',
  INACTIVE: 'Inactiva',
};

export interface Task {
  id: string;
  institutionId: string;
  courseId: string;
  subjectId: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  courseId: string;
  subjectId: string;
  dueDate: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  courseId?: string;
  subjectId?: string;
  dueDate?: string;
}

export interface ListTasksParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TaskStatus;
  courseId?: string;
  subjectId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export type TaskAssignmentStatus = 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';

export const TASK_ASSIGNMENT_STATUS_LABELS: Record<TaskAssignmentStatus, string> = {
  ASSIGNED: 'Asignada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

export interface TaskAssignment {
  id: string;
  institutionId: string;
  taskId: string;
  studentId: string;
  enrollmentId: string | null;
  status: TaskAssignmentStatus;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskAssignmentInput {
  taskId: string;
  studentIds?: string[];
  enrollmentId?: string;
}

export interface UpdateTaskAssignmentInput {
  status?: TaskAssignmentStatus;
}

export interface ListTaskAssignmentsParams {
  page?: number;
  limit?: number;
  taskId?: string;
  studentId?: string;
  status?: TaskAssignmentStatus;
}

export type TaskSubmissionStatus = 'PENDING' | 'SUBMITTED' | 'LATE' | 'GRADED' | 'RETURNED';

export const TASK_SUBMISSION_STATUS_LABELS: Record<TaskSubmissionStatus, string> = {
  PENDING: 'Pendiente',
  SUBMITTED: 'Entregada',
  LATE: 'Entregada tarde',
  GRADED: 'Calificada',
  RETURNED: 'Devuelta',
};

export interface TaskSubmission {
  id: string;
  institutionId: string;
  taskAssignmentId: string;
  studentId: string;
  status: TaskSubmissionStatus;
  content: string | null;
  grade: string | null;
  feedback: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskSubmissionInput {
  content?: string;
}

export interface UpdateTaskSubmissionInput {
  content?: string;
}

export interface GradeTaskSubmissionInput {
  grade: string;
  feedback?: string;
}

export interface ListTaskSubmissionsParams {
  page?: number;
  limit?: number;
  status?: TaskSubmissionStatus;
  studentId?: string;
}

export type CommunicationStatus = 'DRAFT' | 'PUBLISHED' | 'INACTIVE';

export const COMMUNICATION_STATUS_LABELS: Record<CommunicationStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  INACTIVE: 'Inactivo',
};

export type CommunicationAudience = 'ALL' | 'TEACHERS' | 'PARENTS' | 'STUDENTS';

export const COMMUNICATION_AUDIENCE_LABELS: Record<CommunicationAudience, string> = {
  ALL: 'Todos',
  TEACHERS: 'Docentes',
  PARENTS: 'Padres',
  STUDENTS: 'Estudiantes',
};

export type CommunicationRecipientStatus = 'DELIVERED' | 'READ';

export const COMMUNICATION_RECIPIENT_STATUS_LABELS: Record<CommunicationRecipientStatus, string> = {
  DELIVERED: 'Entregado',
  READ: 'Leído',
};

export type FileAssetStatus = 'ACTIVE' | 'DELETED';

export interface FileAsset {
  id: string;
  institutionId: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  status: FileAssetStatus;
  uploadedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  id: string;
  institutionId: string;
  taskId: string;
  fileAssetId: string;
  createdAt: string;
  fileAsset: FileAsset;
}

export interface CommunicationAttachment {
  id: string;
  institutionId: string;
  communicationId: string;
  fileAssetId: string;
  createdAt: string;
  fileAsset: FileAsset;
}

export interface Communication {
  id: string;
  institutionId: string;
  title: string;
  content: string;
  audience: CommunicationAudience;
  status: CommunicationStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  authorId: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  attachments?: CommunicationAttachment[];
}

export interface CreateCommunicationInput {
  title: string;
  content: string;
  audience: CommunicationAudience;
  expiresAt?: string;
}

export interface UpdateCommunicationInput {
  title?: string;
  content?: string;
  audience?: CommunicationAudience;
  expiresAt?: string;
}

export interface ListCommunicationsParams {
  page?: number;
  limit?: number;
  status?: CommunicationStatus;
  audience?: CommunicationAudience;
  search?: string;
}

export interface CommunicationRecipient {
  id: string;
  institutionId: string;
  communicationId: string;
  userId: string;
  status: CommunicationRecipientStatus;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  communication?: Communication;
}

export interface ListCommunicationRecipientsParams {
  page?: number;
  limit?: number;
  status?: CommunicationRecipientStatus;
}

export interface UnreadCountResponse {
  count: number;
}

export type SignatureRequestStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'EXPIRED' | 'INACTIVE';

export const SIGNATURE_REQUEST_STATUS_LABELS: Record<SignatureRequestStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  COMPLETED: 'Completada',
  EXPIRED: 'Expirada',
  INACTIVE: 'Inactiva',
};

export type SignatureRecipientStatus = 'PENDING' | 'SIGNED' | 'DECLINED';

export const SIGNATURE_RECIPIENT_STATUS_LABELS: Record<SignatureRecipientStatus, string> = {
  PENDING: 'Pendiente',
  SIGNED: 'Firmada',
  DECLINED: 'Rechazada',
};

export interface SignatureRecipient {
  id: string;
  signatureRequestId: string;
  userId: string;
  status: SignatureRecipientStatus;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface SignatureRequest {
  id: string;
  institutionId: string;
  title: string;
  description: string | null;
  status: SignatureRequestStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  recipients: SignatureRecipient[];
}

export interface CreateSignatureRequestInput {
  title: string;
  description?: string;
  dueDate?: string;
  recipientUserIds: string[];
}

export interface UpdateSignatureRequestInput {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  recipientUserIds?: string[];
}

export interface ListSignatureRequestsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SignatureRequestStatus;
  dueDateFrom?: string;
  dueDateTo?: string;
  recipientUserId?: string;
}

// ── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'SIGNATURE_REQUEST'
  | 'SIGNATURE_COMPLETED'
  | 'SIGNATURE_DECLINED'
  | 'COMMUNICATION'
  | 'TASK_UPDATE'
  | 'GENERAL';

export type NotificationStatus = 'UNREAD' | 'READ';

export interface Notification {
  id: string;
  institutionId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: NotificationStatus;
  type?: NotificationType;
  createdFrom?: string;
  createdTo?: string;
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  entityType?: string;
  entityId?: string;
}

// ── Academic Periods ─────────────────────────────────────────────────────────

export type AcademicPeriodStatus = 'ACTIVE' | 'INACTIVE';

export const ACADEMIC_PERIOD_STATUS_LABELS: Record<AcademicPeriodStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

export interface AcademicPeriod {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  status: AcademicPeriodStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListAcademicPeriodsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateAcademicPeriodInput {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
}

export interface UpdateAcademicPeriodInput {
  name?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  status?: AcademicPeriodStatus;
}

// ── School Grades ────────────────────────────────────────────────────────────

export type SchoolGradeStatus = 'ACTIVE' | 'INACTIVE';

export const SCHOOL_GRADE_STATUS_LABELS: Record<SchoolGradeStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

export interface SchoolGrade {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  sortOrder: number;
  status: SchoolGradeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListSchoolGradesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateSchoolGradeInput {
  name: string;
  code: string;
  sortOrder?: number;
}

export interface UpdateSchoolGradeInput {
  name?: string;
  code?: string;
  sortOrder?: number;
  status?: SchoolGradeStatus;
}

// ── Guardians (GuardianStudent relationships) ────────────────────────────────

export type RelationshipType = 'FATHER' | 'MOTHER' | 'LEGAL_GUARDIAN' | 'OTHER';

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  FATHER: 'Padre',
  MOTHER: 'Madre',
  LEGAL_GUARDIAN: 'Representante legal',
  OTHER: 'Otro',
};

export type GuardianStudentStatus = 'ACTIVE' | 'INACTIVE';

export const GUARDIAN_STUDENT_STATUS_LABELS: Record<GuardianStudentStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

export interface GuardianStudent {
  id: string;
  institutionId: string;
  guardianUserId: string;
  studentId: string;
  relationshipType: RelationshipType;
  isPrimary: boolean;
  status: GuardianStudentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GuardianStudentWithStudent extends GuardianStudent {
  student: Student;
}

export interface ListGuardiansParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface LinkGuardianInput {
  studentId: string;
  relationshipType: RelationshipType;
  isPrimary?: boolean;
}

// ── Enrollments ──────────────────────────────────────────────────────────────

export type EnrollmentStatus = 'ACTIVE' | 'INACTIVE' | 'WITHDRAWN';

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
  WITHDRAWN: 'Retirada',
};

export interface Enrollment {
  id: string;
  institutionId: string;
  studentId: string;
  courseId: string;
  schoolGradeId: string;
  academicPeriodId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListEnrollmentsParams {
  page?: number;
  limit?: number;
  studentId?: string;
  courseId?: string;
  schoolGradeId?: string;
  academicPeriodId?: string;
}

export interface CreateEnrollmentInput {
  studentId: string;
  courseId: string;
  schoolGradeId: string;
  academicPeriodId: string;
}

export interface UpdateEnrollmentInput {
  status?: EnrollmentStatus;
}

// ── Users ────────────────────────────────────────────────────────────────────

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
}

// ── Teacher Assignments ──────────────────────────────────────────────────────

export type TeacherAssignmentStatus = 'ACTIVE' | 'INACTIVE';

export const TEACHER_ASSIGNMENT_STATUS_LABELS: Record<TeacherAssignmentStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
};

export interface TeacherAssignment {
  id: string;
  institutionId: string;
  teacherUserId: string;
  courseId: string;
  subjectId: string;
  academicPeriodId: string;
  status: TeacherAssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListTeacherAssignmentsParams {
  page?: number;
  limit?: number;
  teacherUserId?: string;
  courseId?: string;
  subjectId?: string;
  academicPeriodId?: string;
}

export interface CreateTeacherAssignmentInput {
  teacherUserId: string;
  courseId: string;
  subjectId: string;
  academicPeriodId: string;
}

export interface UpdateTeacherAssignmentInput {
  status?: TeacherAssignmentStatus;
}

export type AgendaView = 'day' | 'week' | 'month';

export type AgendaEventType = 'SCHEDULE' | 'TASK' | 'COMMUNICATION' | 'SIGNATURE';

export interface AgendaEvent {
  id: string;
  type: AgendaEventType;
  title: string;
  description?: string;
  start: string;
  end?: string;
  allDay: boolean;
  status: string;
  sourceId: string;
  sourceType: string;
  route?: string;
  metadata?: Record<string, unknown>;
}

export interface AgendaResponse {
  data: AgendaEvent[];
  start: string;
  end: string;
  total: number;
}

export interface ListAgendaParams {
  start: string;
  end: string;
  view?: AgendaView;
  eventTypes?: AgendaEventType[];
  page?: number;
  limit?: number;
}
