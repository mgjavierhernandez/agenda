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

export type EducationLevel = 'PREESCOLAR' | 'PRIMARIA' | 'SECUNDARIA' | 'MEDIA';
export type SubjectType =
  'OBLIGATORIA' | 'OPTATIVA' | 'PROFUNDIZACION' | 'TRANSVERSAL' | 'DIMENSION';

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  PREESCOLAR: 'Preescolar',
  PRIMARIA: 'Primaria',
  SECUNDARIA: 'Secundaria',
  MEDIA: 'Media',
};

export const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  OBLIGATORIA: 'Obligatoria',
  OPTATIVA: 'Optativa',
  PROFUNDIZACION: 'Profundización',
  TRANSVERSAL: 'Transversal',
  DIMENSION: 'Dimensión',
};

export interface Area {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  isOfficial: boolean;
  sortOrder: number;
  status: SubjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAreaInput {
  code: string;
  name: string;
  isOfficial?: boolean;
  sortOrder?: number;
}

export interface UpdateAreaInput {
  code?: string;
  name?: string;
  isOfficial?: boolean;
  sortOrder?: number;
  status?: SubjectStatus;
}

export interface ListAreasParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface Subject {
  id: string;
  institutionId: string;
  areaId: string | null;
  code: string;
  name: string;
  description: string | null;
  subjectType: SubjectType;
  minimumLevel: EducationLevel | null;
  maximumLevel: EducationLevel | null;
  status: SubjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectInput {
  code: string;
  name: string;
  description?: string;
  areaId?: string;
  subjectType?: SubjectType;
  minimumLevel?: EducationLevel;
  maximumLevel?: EducationLevel;
  status?: SubjectStatus;
}

export interface UpdateSubjectInput {
  code?: string;
  name?: string;
  description?: string;
  areaId?: string | null;
  subjectType?: SubjectType;
  minimumLevel?: EducationLevel | null;
  maximumLevel?: EducationLevel | null;
  status?: SubjectStatus;
}

export interface ListSubjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SubjectStatus;
  areaId?: string;
}

export type GradeStatus = 'ACTIVE' | 'INACTIVE';

export interface Grade {
  id: string;
  institutionId: string;
  studentId: string;
  courseId: string;
  subjectId: string;
  academicPeriodId?: string | null;
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
export type DayOfWeek =
  'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

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
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export interface Schedule {
  id: string;
  institutionId: string;
  courseId: string;
  subjectId: string;
  academicPeriodId?: string | null;
  teacherUserId?: string | null;
  classroomId?: string | null;
  blockId?: string | null;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  status: ScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  courseId: string;
  subjectId: string;
  academicPeriodId: string;
  teacherUserId?: string | null;
  classroomId?: string | null;
  blockId?: string | null;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  status?: ScheduleStatus;
}

export interface UpdateScheduleInput {
  courseId?: string;
  subjectId?: string;
  academicPeriodId?: string;
  teacherUserId?: string | null;
  classroomId?: string | null;
  blockId?: string | null;
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
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
  studentId?: string;
}

export interface ScheduleBlock {
  id: string;
  institutionId: string;
  name: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  status: ScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleBlockInput {
  name: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  status?: ScheduleStatus;
}

export type ClassroomType =
  'AULA' | 'LAB_FISICA' | 'LAB_QUIMICA' | 'COMPUTO' | 'CANCHA' | 'AUDITORIO';

export const CLASSROOM_TYPE_LABELS: Record<ClassroomType, string> = {
  AULA: 'Aula',
  LAB_FISICA: 'Laboratorio de física',
  LAB_QUIMICA: 'Laboratorio de química',
  COMPUTO: 'Sala de cómputo',
  CANCHA: 'Cancha',
  AUDITORIO: 'Auditorio',
};

export interface Classroom {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  capacity: number | null;
  type: ClassroomType;
  status: ScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassroomInput {
  code: string;
  name: string;
  capacity?: number;
  type?: ClassroomType;
  status?: ScheduleStatus;
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
  studentId?: string;
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
  fileAssetIds?: string[];
}

export interface UpdateTaskSubmissionInput {
  content?: string;
  fileAssetIds?: string[];
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
  followUpId?: string | null;
  followUpEntryId?: string | null;
  createdAt: string;
  updatedAt: string;
  recipients: SignatureRecipient[];
  followUp?: {
    id: string;
    title: string;
  } | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface CreateSignatureRequestInput {
  title: string;
  description?: string;
  dueDate?: string;
  followUpId?: string;
  followUpEntryId?: string;
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
  followUpId?: string;
}

// ── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'SIGNATURE_REQUEST'
  | 'SIGNATURE_COMPLETED'
  | 'SIGNATURE_DECLINED'
  | 'COMMUNICATION'
  | 'TASK_UPDATE'
  | 'GENERAL'
  | 'STUDENT_FOLLOW_UP'
  | 'COMMITMENT_UPDATE';

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

export type AcademicPeriodStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';

export const ACADEMIC_PERIOD_STATUS_LABELS: Record<AcademicPeriodStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  CLOSED: 'Cerrado',
};

export interface AcademicPeriod {
  id: string;
  institutionId: string;
  createdById?: string | null;
  closedById?: string | null;
  closedAt?: string | null;
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
  guardianUserId?: string;
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

// ── Attendance ───────────────────────────────────────────────────────────────

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Presente',
  ABSENT: 'Ausente',
  LATE: 'Llegó tarde',
  EXCUSED: 'Justificado',
};

export interface Attendance {
  id: string;
  institutionId: string;
  studentId: string;
  courseId: string;
  academicPeriodId: string;
  date: string;
  status: AttendanceStatus;
  notes: string | null;
  recordedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListAttendancesParams {
  page?: number;
  limit?: number;
  studentId?: string;
  courseId?: string;
  academicPeriodId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: AttendanceStatus;
}

export interface CreateAttendanceInput {
  studentId: string;
  courseId: string;
  academicPeriodId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string | null;
}

export interface UpdateAttendanceInput {
  status?: AttendanceStatus;
  notes?: string | null;
}

export interface CreateAttendanceBulkInput {
  courseId: string;
  academicPeriodId: string;
  date: string;
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    notes?: string | null;
  }>;
}

export interface CreateAttendanceBulkResult {
  created: number;
  skipped: number;
  total: number;
}

// ── Users ────────────────────────────────────────────────────────────────────

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  NATIONAL_ID: 'Cédula de ciudadanía',
  DNI: 'Documento de identidad',
  PASSPORT: 'Pasaporte',
  OTHER: 'Otro',
};

export interface UserProfile {
  id: string;
  userId: string;
  institutionId: string;
  documentType: DocumentType | null;
  documentNumber: string | null;
  phone: string | null;
  address: string | null;
  birthDate: string | null;
  profession: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertUserProfileInput {
  documentType?: DocumentType;
  documentNumber?: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  profession?: string;
  bio?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  profiles?: UserProfile[];
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  profile?: UpsertUserProfileInput;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: UserStatus;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  assignable: boolean;
}

export type RoleName = 'INSTITUTION_ADMIN' | 'TEACHER' | 'PARENT' | 'STUDENT' | 'SUPER_ADMIN';

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super administrador',
  INSTITUTION_ADMIN: 'Administrador',
  TEACHER: 'Docente',
  PARENT: 'Acudiente',
  STUDENT: 'Estudiante',
  RECTOR: 'Rector',
  COORDINADOR_ACADEMICO: 'Coordinador académico',
  COORDINADOR_CONVIVENCIA: 'Coordinador de convivencia',
  ORIENTADOR: 'Orientador',
  PSICOLOGO: 'Psicólogo',
  DIRECTOR_DE_GRUPO: 'Director de grupo',
};

export interface MembershipRole {
  id: string;
  name: string;
}

export interface MembershipUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  profiles?: UserProfile[];
}

export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REJECTED';

export interface UserMembership {
  id: string;
  status: MembershipStatus;
  userId: string;
  institutionId: string;
  requestedRole: string | null;
  createdAt: string;
  user: MembershipUser;
  roles: { id: string; role: MembershipRole }[];
}

export interface ListMembershipsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: MembershipStatus;
}

export type SelfRegisterRole = 'TEACHER' | 'PARENT' | 'STUDENT';

export const SELF_REGISTER_ROLE_LABELS: Record<SelfRegisterRole, string> = {
  TEACHER: 'Docente',
  PARENT: 'Acudiente',
  STUDENT: 'Estudiante',
};

export interface SelfRegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  institutionId?: string;
  institutionSlug?: string;
  requestedRole: SelfRegisterRole;
  profile?: UpsertUserProfileInput;
}

export interface CreateMembershipInput {
  userId: string;
  roleIds?: string[];
}

export interface AssignRoleInput {
  roleId: string;
}

export interface UpdateMembershipInput {
  status?: MembershipStatus;
}

export interface InstitutionUpdateInput {
  name?: string;
  slug?: string;
  status?: Institution['status'];
}

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportStudentsResult {
  created: number;
  updated: number;
  enrollments: number;
  errors: ImportRowError[];
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
  startDate: string;
  endDate: string | null;
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

export interface TeacherCourseSummary {
  courseId: string;
  courseName: string;
  subjectId: string;
  subjectName: string;
  academicPeriodId: string;
  students: Array<{ studentId: string; firstName: string; lastName: string }>;
}

export interface TeacherSummary {
  teacherUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  isDirector: boolean;
  courses: TeacherCourseSummary[];
}

export interface GroupDirector {
  teacherUserId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CreateTeacherAssignmentInput {
  teacherUserId: string;
  courseId: string;
  subjectId: string;
  academicPeriodId: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateTeacherAssignmentInput {
  status?: TeacherAssignmentStatus;
  startDate?: string;
  endDate?: string | null;
}

export type CourseDirectorStatus = 'ACTIVE' | 'INACTIVE';

export const COURSE_DIRECTOR_STATUS_LABELS: Record<CourseDirectorStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
};

export interface CourseDirectorAssignment {
  id: string;
  institutionId: string;
  directorUserId: string;
  courseId: string;
  academicPeriodId: string;
  startDate: string;
  endDate: string | null;
  status: CourseDirectorStatus;
  createdAt: string;
  updatedAt: string;
  directorUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  course?: {
    id: string;
    name: string;
    code: string;
  };
  academicPeriod?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface ListCourseDirectorAssignmentsParams {
  page?: number;
  limit?: number;
  directorUserId?: string;
  courseId?: string;
  academicPeriodId?: string;
}

export interface CreateCourseDirectorAssignmentInput {
  directorUserId: string;
  courseId: string;
  academicPeriodId: string;
  startDate: string;
  endDate?: string;
  status?: CourseDirectorStatus;
}

export interface UpdateCourseDirectorAssignmentInput {
  status?: CourseDirectorStatus;
  endDate?: string | null;
}

export type AgendaView = 'day' | 'week' | 'month' | 'year';

export type AgendaEventType = 'SCHEDULE' | 'TASK' | 'COMMUNICATION' | 'SIGNATURE' | 'EVENT';

export type AgendaEventStatus = 'ACTIVE' | 'CANCELLED';

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
  studentId?: string;
  page?: number;
  limit?: number;
}

export type AgendaEventVisibility = 'ALL' | 'TEACHERS' | 'PARENTS' | 'STUDENTS';

export interface AgendaEventCreatedBy {
  id: string;
  firstName: string;
  lastName: string;
}

export interface AgendaEventItem {
  id: string;
  institutionId: string;
  createdById: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  location: string | null;
  audience: AgendaEventVisibility;
  status: AgendaEventStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: AgendaEventCreatedBy;
}

export interface CreateAgendaEventInput {
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  location?: string | null;
  audience?: AgendaEventVisibility;
}

export interface UpdateAgendaEventInput {
  title?: string;
  description?: string | null;
  startAt?: string;
  endAt?: string;
  location?: string | null;
  audience?: AgendaEventVisibility;
}

export interface ListAgendaEventsParams {
  start?: string;
  end?: string;
  status?: AgendaEventStatus;
  audience?: AgendaEventVisibility;
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================
// Student Follow-Ups
// ============================================================

export type FollowUpType = 'ACADEMICO' | 'CONVIVENCIA' | 'FORMATIVO';
export type FollowUpSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FollowUpStatus =
  'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'PENDING_FOLLOW_UP' | 'RESOLVED' | 'CLOSED';
export type FollowUpConfidentiality = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'SENSITIVE';
export type FollowUpEntryType = 'NOTE' | 'MEETING' | 'OBSERVATION' | 'ACTION' | 'FOLLOW_UP';
export type CommitmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
export type CommitmentResponsibleRole = 'ADMIN' | 'TEACHER' | 'PARENT' | 'STUDENT';

export const FOLLOW_UP_TYPE_LABELS: Record<FollowUpType, string> = {
  ACADEMICO: 'Académico',
  CONVIVENCIA: 'Convivencia',
  FORMATIVO: 'Formativo',
};

export const FOLLOW_UP_SEVERITY_LABELS: Record<FollowUpSeverity, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En progreso',
  ESCALATED: 'Escalado',
  PENDING_FOLLOW_UP: 'Pendiente seguimiento',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

export const FOLLOW_UP_CONFIDENTIALITY_LABELS: Record<FollowUpConfidentiality, string> = {
  PUBLIC: 'Público',
  INTERNAL: 'Interno',
  CONFIDENTIAL: 'Confidencial',
  SENSITIVE: 'Sensible',
};

export const FOLLOW_UP_ENTRY_TYPE_LABELS: Record<FollowUpEntryType, string> = {
  NOTE: 'Nota',
  MEETING: 'Reunión',
  OBSERVATION: 'Observación',
  ACTION: 'Acción',
  FOLLOW_UP: 'Seguimiento',
};

export const COMMITMENT_STATUS_LABELS: Record<CommitmentStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  OVERDUE: 'Vencido',
};

export const COMMITMENT_ROLE_LABELS: Record<CommitmentResponsibleRole, string> = {
  ADMIN: 'Administrador',
  TEACHER: 'Docente',
  PARENT: 'Acudiente',
  STUDENT: 'Estudiante',
};

export interface StudentFollowUpStudent {
  id: string;
  firstName: string;
  lastName: string;
}

export interface StudentFollowUpUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface StudentFollowUpCategory {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFollowUpCategoryInput {
  name: string;
  description?: string;
}

export interface UpdateFollowUpCategoryInput {
  name?: string;
  description?: string | null;
  active?: boolean;
}

export interface StudentFollowUp {
  id: string;
  institutionId: string;
  studentId: string;
  categoryId: string | null;
  createdById: string;
  type: FollowUpType;
  severity: FollowUpSeverity;
  status: FollowUpStatus;
  confidentiality: FollowUpConfidentiality;
  title: string;
  summary: string | null;
  description: string | null;
  closedAt: string | null;
  closedById: string | null;
  createdAt: string;
  updatedAt: string;
  student: StudentFollowUpStudent;
  createdBy: StudentFollowUpUser;
  closedBy?: StudentFollowUpUser | null;
  category?: StudentFollowUpCategory | null;
}

export interface CreateStudentFollowUpInput {
  studentId: string;
  type: FollowUpType;
  severity?: FollowUpSeverity;
  confidentiality?: FollowUpConfidentiality;
  categoryId?: string;
  title: string;
  summary?: string;
  description?: string;
}

export interface UpdateStudentFollowUpInput {
  type?: FollowUpType;
  severity?: FollowUpSeverity;
  confidentiality?: FollowUpConfidentiality;
  categoryId?: string | null;
  title?: string;
  summary?: string;
  description?: string;
}

export interface ListStudentFollowUpsParams {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: string;
  type?: FollowUpType;
  severity?: FollowUpSeverity;
  status?: FollowUpStatus;
  confidentiality?: FollowUpConfidentiality;
  categoryId?: string;
  createdById?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface FollowUpEntry {
  id: string;
  followUpId: string;
  createdById: string;
  entryType: FollowUpEntryType;
  content: string;
  createdAt: string;
  createdBy?: StudentFollowUpUser;
}

export interface CreateFollowUpEntryInput {
  entryType: FollowUpEntryType;
  content: string;
}

export interface UpdateFollowUpEntryInput {
  entryType?: FollowUpEntryType;
  content?: string;
}

export interface Commitment {
  id: string;
  followUpId: string;
  responsibleUserId: string;
  responsibleRole: CommitmentResponsibleRole;
  description: string;
  status: CommitmentStatus;
  effectiveStatus?: CommitmentStatus;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  responsibleUser?: StudentFollowUpUser;
}

export interface CreateCommitmentInput {
  responsibleUserId: string;
  responsibleRole: CommitmentResponsibleRole;
  description: string;
  dueDate?: string;
}

export interface UpdateCommitmentInput {
  responsibleUserId?: string;
  responsibleRole?: CommitmentResponsibleRole;
  description?: string;
  dueDate?: string | null;
  status?: CommitmentStatus;
}

export interface FollowUpAttachment {
  id: string;
  institutionId: string;
  followUpId: string;
  fileAssetId: string;
  createdAt: string;
  fileAsset: FileAsset;
}

export interface CreateFollowUpAttachmentInput {
  fileAssetId: string;
}

// ── Follow-Up Citations ────────────────────────────────────────────────────

export type FollowUpCitationStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export const FOLLOW_UP_CITATION_STATUS_LABELS: Record<FollowUpCitationStatus, string> = {
  SCHEDULED: 'Programada',
  COMPLETED: 'Realizada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

export interface FollowUpCitation {
  id: string;
  institutionId: string;
  followUpId: string;
  createdById: string;
  scheduledAt: string;
  reason: string;
  objective: string | null;
  status: FollowUpCitationStatus;
  result: string | null;
  attendedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFollowUpCitationInput {
  scheduledAt: string;
  reason: string;
  objective?: string;
}

export interface UpdateFollowUpCitationInput {
  scheduledAt?: string;
  reason?: string;
  objective?: string | null;
  status?: FollowUpCitationStatus;
  result?: string | null;
  attendedAt?: string | null;
}

export interface ListFollowUpCitationsParams {
  page?: number;
  limit?: number;
  status?: FollowUpCitationStatus;
}

export interface ReportStudent {
  id: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  status: string;
}

export interface ReportInstitution {
  id: string;
  name: string;
  slug: string;
}

export interface ReportAcademicPeriod {
  id: string;
  name: string;
  code: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface ReportEnrollment {
  courseId: string;
  courseCode: string;
  courseName: string;
  schoolGradeId: string;
  schoolGradeName: string;
  enrolledAt: string;
}

export interface ReportGrade {
  id: string;
  value: number;
  period: string;
  evaluationType?: string | null;
  description?: string | null;
  status: string;
  updatedAt: string;
}

export interface ReportSubject {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  grades: ReportGrade[];
  simpleAverage?: number | null;
  teacher?: { id: string; firstName: string; lastName: string } | null;
}

export interface ReportAttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export interface ReportObservador {
  total: number;
  open: number;
  resolved: number;
  byConfidentiality: Record<string, number>;
}

export interface StudentReport {
  student: ReportStudent;
  institution: ReportInstitution;
  academicPeriod: ReportAcademicPeriod | null;
  enrollment: ReportEnrollment | null;
  academic: ReportSubject[];
  attendance: ReportAttendanceSummary;
  observador: ReportObservador;
}

export interface ReportCourseStudent {
  student: ReportStudent;
  schoolGradeName?: string | null;
  enrolledAt?: string | null;
  subjectCount: number;
  gradeCount: number;
  simpleAverage?: number | null;
  attendance: ReportAttendanceSummary;
}

export interface CourseReportSummary {
  totalStudents: number;
  studentsWithGrades: number;
  studentsWithAttendance: number;
}

export interface ReportCourse {
  id: string;
  code: string;
  name: string;
  status: string;
  description?: string | null;
}

export interface CourseReport {
  course: ReportCourse;
  academicPeriod: ReportAcademicPeriod | null;
  students: ReportCourseStudent[];
  summary: CourseReportSummary;
}
