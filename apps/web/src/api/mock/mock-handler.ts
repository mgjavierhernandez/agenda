import {
  DEMO_INSTITUTION,
  DEMO_USERS,
  INITIAL_STUDENTS,
  INITIAL_COURSES,
  INITIAL_AREAS,
  INITIAL_SUBJECTS,
  INITIAL_PERIODS,
  INITIAL_SCHOOL_GRADES,
  INITIAL_GRADES,
  INITIAL_SCHEDULES,
  INITIAL_TASKS,
  INITIAL_COMMUNICATIONS,
  INITIAL_SIGNATURE_REQUESTS,
  INITIAL_AGENDA_EVENTS,
  INITIAL_FOLLOW_UPS,
  INITIAL_ATTENDANCE,
  INITIAL_NOTIFICATIONS,
  ALL_PERMISSION_CODES,
} from './mock-db';
import type {
  Student,
  Course,
  Area,
  Subject,
  AcademicPeriod,
  SchoolGrade,
  Grade,
  Schedule,
  Task,
  Communication,
  SignatureRequest,
  AgendaEventItem,
  StudentFollowUp,
  Attendance,
  Notification,
} from '@/api/types';

// In-memory collections with session-level persistence in sessionStorage
function createStore<T extends { id: string }>(key: string, initialData: T[]) {
  const load = (): T[] => {
    try {
      const stored = sessionStorage.getItem(`mock_${key}`);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [...initialData];
  };

  const save = (data: T[]) => {
    try {
      sessionStorage.setItem(`mock_${key}`, JSON.stringify(data));
    } catch {
      // ignore
    }
  };

  return {
    getAll: () => load(),
    getById: (id: string) => load().find((i) => i.id === id),
    add: (item: T) => {
      const data = [item, ...load()];
      save(data);
      return item;
    },
    update: (id: string, updates: Partial<T>) => {
      const data = load().map((i) => (i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i));
      save(data);
      return data.find((i) => i.id === id);
    },
    remove: (id: string) => {
      const data = load().filter((i) => i.id !== id);
      save(data);
    },
  };
}

const studentsStore = createStore<Student>('students', INITIAL_STUDENTS);
const coursesStore = createStore<Course>('courses', INITIAL_COURSES);
const areasStore = createStore<Area>('areas', INITIAL_AREAS);
const subjectsStore = createStore<Subject>('subjects', INITIAL_SUBJECTS);
const periodsStore = createStore<AcademicPeriod>('periods', INITIAL_PERIODS);
const schoolGradesStore = createStore<SchoolGrade>('school_grades', INITIAL_SCHOOL_GRADES);
const gradesStore = createStore<Grade>('grades', INITIAL_GRADES);
const schedulesStore = createStore<Schedule>('schedules', INITIAL_SCHEDULES);
const tasksStore = createStore<Task>('tasks', INITIAL_TASKS);
const communicationsStore = createStore<Communication>('communications', INITIAL_COMMUNICATIONS);
const signaturesStore = createStore<SignatureRequest>('signatures', INITIAL_SIGNATURE_REQUESTS);
const agendaStore = createStore<AgendaEventItem>('agenda', INITIAL_AGENDA_EVENTS);
const followUpsStore = createStore<StudentFollowUp>('follow_ups', INITIAL_FOLLOW_UPS);
const attendanceStore = createStore<Attendance>('attendance', INITIAL_ATTENDANCE);
const notificationsStore = createStore<Notification>('notifications', INITIAL_NOTIFICATIONS);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseBody(options: RequestInit): Record<string, any> {
  if (!options.body) return {};
  if (typeof options.body === 'string') {
    try {
      return JSON.parse(options.body);
    } catch {
      return {};
    }
  }
  return {};
}

function paginate<T>(items: T[], page = 1, limit = 20) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return {
    data,
    meta: { page, limit, total, totalPages },
    page,
    limit,
    total,
    totalPages,
  };
}

export async function handleMockRequest<T>(rawPath: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const [pathname, searchStr] = rawPath.split('?');
  const searchParams = new URLSearchParams(searchStr || '');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const query = (searchParams.get('search') || '').toLowerCase();
  const body = parseBody(options);

  // Normalize path
  const path = pathname.replace(/^\/api\/v1/, '').replace(/\/+$/, '') || '/';

  // 1. Auth routes
  if (path === '/auth/login' && method === 'POST') {
    const email = body.email || 'superadmin@agenda.dev';
    const found = DEMO_USERS[email] || {
      user: { id: 'usr-custom-1', email, status: 'ACTIVE' as const },
      name: email.split('@')[0],
      role: 'INSTITUTION_ADMIN',
    };
    return {
      user: found.user,
      accessToken: `mock-token-${Date.now()}`,
      refreshToken: `mock-refresh-${Date.now()}`,
    } as unknown as T;
  }

  if (path === '/auth/institutions') {
    return { institutions: [DEMO_INSTITUTION] } as unknown as T;
  }

  if (path === '/auth/tenant/select') {
    return {
      institution: DEMO_INSTITUTION,
      membership: { id: 'mem-demo-1', status: 'ACTIVE' },
    } as unknown as T;
  }

  if (path === '/auth/my-permissions') {
    return { permissions: ALL_PERMISSION_CODES } as unknown as T;
  }

  if (path === '/auth/profile') {
    return {
      id: 'usr-admin-1',
      email: 'superadmin@agenda.dev',
      firstName: 'Super',
      lastName: 'Administrador',
      status: 'ACTIVE',
    } as unknown as T;
  }

  if (path === '/auth/refresh') {
    return {
      accessToken: `mock-token-refreshed-${Date.now()}`,
      refreshToken: `mock-refresh-${Date.now()}`,
    } as unknown as T;
  }

  if (path === '/auth/logout') {
    return { success: true } as unknown as T;
  }

  // 2. Students
  if (path === '/students') {
    if (method === 'GET') {
      let list = studentsStore.getAll();
      if (query) {
        list = list.filter(
          (s) =>
            s.firstName.toLowerCase().includes(query) ||
            s.lastName.toLowerCase().includes(query) ||
            s.documentNumber.includes(query),
        );
      }
      return paginate(list, page, limit) as unknown as T;
    }
    if (method === 'POST') {
      const newStudent: Student = {
        id: `std-${Date.now()}`,
        institutionId: DEMO_INSTITUTION.id,
        firstName: body.firstName || 'Nuevo',
        lastName: body.lastName || 'Estudiante',
        documentType: body.documentType || 'DNI',
        documentNumber: body.documentNumber || String(Date.now()).slice(-8),
        dateOfBirth: body.dateOfBirth || null,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      studentsStore.add(newStudent);
      return newStudent as unknown as T;
    }
  }

  const studentMatch = path.match(/^\/students\/([^/]+)$/);
  if (studentMatch) {
    const id = studentMatch[1];
    if (method === 'GET') return (studentsStore.getById(id) || studentsStore.getAll()[0]) as unknown as T;
    if (method === 'PATCH' || method === 'PUT') return studentsStore.update(id, body) as unknown as T;
    if (method === 'DELETE') {
      studentsStore.remove(id);
      return { success: true } as unknown as T;
    }
  }

  // 3. Courses
  if (path === '/courses') {
    if (method === 'GET') {
      let list = coursesStore.getAll();
      if (query) {
        list = list.filter((c) => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query));
      }
      return paginate(list, page, limit) as unknown as T;
    }
    if (method === 'POST') {
      const item: Course = {
        id: `crs-${Date.now()}`,
        institutionId: DEMO_INSTITUTION.id,
        code: body.code || 'NC',
        name: body.name || 'Nuevo Curso',
        description: body.description || null,
        status: body.status || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      coursesStore.add(item);
      return item as unknown as T;
    }
  }
  const courseMatch = path.match(/^\/courses\/([^/]+)$/);
  if (courseMatch) {
    const id = courseMatch[1];
    if (method === 'GET') return (coursesStore.getById(id) || coursesStore.getAll()[0]) as unknown as T;
    if (method === 'PATCH' || method === 'PUT') return coursesStore.update(id, body) as unknown as T;
    if (method === 'DELETE') {
      coursesStore.remove(id);
      return { success: true } as unknown as T;
    }
  }

  // 4. Subjects
  if (path === '/subjects') {
    if (method === 'GET') {
      let list = subjectsStore.getAll();
      if (query) list = list.filter((s) => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query));
      return paginate(list, page, limit) as unknown as T;
    }
    if (method === 'POST') {
      const item: Subject = {
        id: `sbj-${Date.now()}`,
        institutionId: DEMO_INSTITUTION.id,
        areaId: body.areaId || null,
        code: body.code || 'SUBJ',
        name: body.name || 'Nueva Asignatura',
        description: body.description || null,
        subjectType: body.subjectType || 'OBLIGATORIA',
        minimumLevel: body.minimumLevel || null,
        maximumLevel: body.maximumLevel || null,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      subjectsStore.add(item);
      return item as unknown as T;
    }
  }
  const subjectMatch = path.match(/^\/subjects\/([^/]+)$/);
  if (subjectMatch) {
    const id = subjectMatch[1];
    if (method === 'GET') return (subjectsStore.getById(id) || subjectsStore.getAll()[0]) as unknown as T;
    if (method === 'PATCH' || method === 'PUT') return subjectsStore.update(id, body) as unknown as T;
    if (method === 'DELETE') {
      subjectsStore.remove(id);
      return { success: true } as unknown as T;
    }
  }

  // 5. Areas
  if (path === '/areas') {
    if (method === 'GET') return paginate(areasStore.getAll(), page, limit) as unknown as T;
    if (method === 'POST') {
      const item: Area = {
        id: `ara-${Date.now()}`,
        institutionId: DEMO_INSTITUTION.id,
        code: body.code || 'ARA',
        name: body.name || 'Nueva Área',
        isOfficial: true,
        sortOrder: body.sortOrder || 99,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      areasStore.add(item);
      return item as unknown as T;
    }
  }

  // 6. Academic Periods
  if (path === '/academic-periods') {
    if (method === 'GET') return paginate(periodsStore.getAll(), page, limit) as unknown as T;
    if (method === 'POST') {
      const item: AcademicPeriod = {
        id: `prd-${Date.now()}`,
        institutionId: DEMO_INSTITUTION.id,
        name: body.name || 'Nuevo Periodo',
        code: body.code || '2025-X',
        startDate: body.startDate || '2025-01-01',
        endDate: body.endDate || '2025-12-31',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      periodsStore.add(item);
      return item as unknown as T;
    }
  }

  // 7. School Grades
  if (path === '/school-grades') {
    if (method === 'GET') return paginate(schoolGradesStore.getAll(), page, limit) as unknown as T;
    if (method === 'POST') {
      const item: SchoolGrade = {
        id: `sgr-${Date.now()}`,
        institutionId: DEMO_INSTITUTION.id,
        name: body.name || 'Nuevo Grado',
        code: body.code || 'G',
        sortOrder: body.sortOrder || 1,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      schoolGradesStore.add(item);
      return item as unknown as T;
    }
  }

  // 8. Grades
  if (path === '/grades') {
    if (method === 'GET') return paginate(gradesStore.getAll(), page, limit) as unknown as T;
    if (method === 'POST') {
      const item: Grade = {
        id: `grd-${Date.now()}`,
        institutionId: DEMO_INSTITUTION.id,
        studentId: body.studentId || 'std-1',
        courseId: body.courseId || 'crs-1',
        subjectId: body.subjectId || 'sbj-1',
        academicPeriodId: body.academicPeriodId || 'prd-1',
        value: String(body.value || '5.0'),
        period: String(body.period || '1'),
        evaluationType: body.evaluationType || 'Evaluación',
        description: body.description || null,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      gradesStore.add(item);
      return item as unknown as T;
    }
  }

  // 9. Schedules
  if (path === '/schedules') {
    if (method === 'GET') return paginate(schedulesStore.getAll(), page, limit) as unknown as T;
    if (method === 'POST') {
      const item: Schedule = {
        id: `sch-${Date.now()}`,
        institutionId: DEMO_INSTITUTION.id,
        courseId: body.courseId || 'crs-1',
        subjectId: body.subjectId || 'sbj-1',
        academicPeriodId: body.academicPeriodId || 'prd-1',
        dayOfWeek: body.dayOfWeek || 'MONDAY',
        startTime: body.startTime || '08:00',
        endTime: body.endTime || '09:30',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      schedulesStore.add(item);
      return item as unknown as T;
    }
  }

  // 10. Tasks
  if (path === '/tasks') {
    if (method === 'GET') return paginate(tasksStore.getAll(), page, limit) as unknown as T;
    if (method === 'POST') {
      const item: Task = {
        id: `tsk-${Date.now()}`,
        institutionId: DEMO_INSTITUTION.id,
        courseId: body.courseId || 'crs-1',
        subjectId: body.subjectId || 'sbj-1',
        title: body.title || 'Nueva Tarea',
        description: body.description || null,
        dueDate: body.dueDate || new Date(Date.now() + 86400000).toISOString(),
        status: 'PUBLISHED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      tasksStore.add(item);
      return item as unknown as T;
    }
  }

  // 11. Communications
  if (path === '/communications') {
    if (method === 'GET') return paginate(communicationsStore.getAll(), page, limit) as unknown as T;
    if (method === 'POST') {
      const item: Communication = {
        id: `com-${Date.now()}`,
        institutionId: DEMO_INSTITUTION.id,
        title: body.title || 'Nuevo Comunicado',
        content: body.content || '',
        audience: body.audience || 'ALL',
        status: 'PUBLISHED',
        publishedAt: new Date().toISOString(),
        expiresAt: body.expiresAt || null,
        authorId: 'usr-admin-1',
        authorName: 'Rectoría y Coordinación',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      communicationsStore.add(item);
      return item as unknown as T;
    }
  }

  // 12. Signatures
  if (path === '/signatures' || path === '/signature-requests') {
    if (method === 'GET') return paginate(signaturesStore.getAll(), page, limit) as unknown as T;
    if (method === 'POST') {
      const item: SignatureRequest = {
        id: `sig-${Date.now()}`,
        institutionId: DEMO_INSTITUTION.id,
        title: body.title || 'Nueva Solicitud de Firma',
        description: body.description || null,
        status: 'PUBLISHED',
        dueDate: body.dueDate || new Date(Date.now() + 86400000 * 7).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        recipients: [],
      };
      signaturesStore.add(item);
      return item as unknown as T;
    }
  }

  // 13. Notifications
  if (path === '/notifications') {
    return paginate(notificationsStore.getAll(), page, limit) as unknown as T;
  }
  if (path === '/notifications/unread-count') {
    return { count: notificationsStore.getAll().filter((n) => n.status === 'UNREAD').length } as unknown as T;
  }

  // 14. Attendance
  if (path === '/attendance') {
    if (method === 'GET') return paginate(attendanceStore.getAll(), page, limit) as unknown as T;
    if (method === 'POST') {
      const item: Attendance = {
        id: `att-${Date.now()}`,
        institutionId: DEMO_INSTITUTION.id,
        studentId: body.studentId || 'std-1',
        courseId: body.courseId || 'crs-1',
        academicPeriodId: body.academicPeriodId || 'prd-1',
        date: body.date || new Date().toISOString().slice(0, 10),
        status: body.status || 'PRESENT',
        notes: body.notes || null,
        recordedById: 'usr-admin-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      attendanceStore.add(item);
      return item as unknown as T;
    }
  }

  // 15. Student Follow-ups
  if (path === '/student-follow-ups') {
    if (method === 'GET') return paginate(followUpsStore.getAll(), page, limit) as unknown as T;
    if (method === 'POST') {
      const item: StudentFollowUp = {
        id: `sfu-${Date.now()}`,
        institutionId: DEMO_INSTITUTION.id,
        studentId: body.studentId || 'std-1',
        categoryId: null,
        createdById: 'usr-admin-1',
        type: body.type || 'ACADEMICO',
        severity: body.severity || 'LOW',
        status: 'OPEN',
        confidentiality: body.confidentiality || 'INTERNAL',
        title: body.title || 'Nuevo Seguimiento',
        summary: body.summary || null,
        description: body.description || null,
        closedAt: null,
        closedById: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        student: { id: 'std-1', firstName: 'Sofía', lastName: 'Rodríguez' },
        createdBy: { id: 'usr-admin-1', firstName: 'Admin', lastName: 'Sistema' },
      };
      followUpsStore.add(item);
      return item as unknown as T;
    }
  }

  // 16. Agenda
  if (path.startsWith('/agenda')) {
    const list = agendaStore.getAll();
    const events = list.map((item) => ({
      id: item.id,
      type: 'EVENT' as const,
      title: item.title,
      description: item.description || undefined,
      start: item.startAt,
      end: item.endAt,
      allDay: false,
      status: item.status,
      sourceId: item.id,
      sourceType: 'AGENDA_EVENT',
    }));
    return {
      data: events,
      start: searchParams.get('start') || new Date().toISOString(),
      end: searchParams.get('end') || new Date(Date.now() + 86400000 * 30).toISOString(),
      total: events.length,
    } as unknown as T;
  }

  // Generic fallback for any other paginated query
  return paginate([], 1, 20) as unknown as T;
}
