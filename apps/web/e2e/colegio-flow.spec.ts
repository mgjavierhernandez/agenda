import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';

/**
 * FASE 4 — Prueba integral del proceso del Colegio.
 * Fixtures con sufijo único por corrida (re-ejecutable, sin colisiones).
 * API-driven con verificaciones UI puntuales.
 * Requiere: API dev en E2E_API_URL (nuevo código) + agenda_dev seed.
 */
const API = process.env.E2E_API_URL || 'http://localhost:3001/api/v1';
const ADMIN_EMAIL = process.env.E2E_EMAIL || 'admin@demo-school.dev';
const ADMIN_PASSWORD = process.env.E2E_PASSWORD || 'Demo1234!';
const STAMP = String(Date.now()).slice(-8);
const P = `E2E${STAMP}`;

interface State {
  adminToken: string;
  instId: string;
  roles: Record<string, string>;
  periodId: string;
  gradeId: string;
  course2A: string;
  course3A: string;
  subjects: Record<string, string>;
  blockId: string;
  roomId: string;
  teachers: { id: string; email: string }[];
  integralTeacher: string;
  rector: string;
  parents: string[];
  studentIds: string[];
  studentUser: string;
  pendingSchedule: string;
  extraStudents: string[];
  extraUsers: string[];
}

const S: Partial<State> = {
  teachers: [], parents: [], studentIds: [], subjects: {}, roles: {},
  extraStudents: [], extraUsers: [],
};

async function api(method: string, p: string, token?: string, body?: unknown, expected = 200) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (S.instId) headers['X-Institution-Id'] = S.instId;
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${p}`, {
    method,
    headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  if (res.status !== expected) {
    const text = await res.text();
    throw new Error(`API ${method} ${p} -> ${res.status} (expected ${expected}): ${text}`);
  }
  if (res.status === 204) return undefined;
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

async function login(email: string, password: string, expected = 200) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== expected) throw new Error(`login ${email} -> ${res.status}, expected ${expected}`);
  return res.json();
}

const doc = (i: number) => `81${STAMP}${i}`;
const email = (name: string) => `${name}.${STAMP}@colegio.edu.co`;

test.describe.serial('Proceso integral del colegio', () => {
  test.afterAll(async () => {
    // Limpieza best-effort: desactivar fixtures de la corrida
    const t = S.adminToken;
    if (!t) return;
    for (const id of S.extraStudents ?? []) {
      await api('PATCH', `/students/${id}/deactivate`, t, {}, 200).catch(() => undefined);
    }
    for (const id of S.extraUsers ?? []) {
      await api('PATCH', `/users/${id}/deactivate`, t, {}, 200).catch(() => undefined);
    }
    if (S.pendingSchedule) {
      await api('PATCH', `/schedules/${S.pendingSchedule}/deactivate`, t, {}, 200).catch(() => undefined);
    }
  });

  test('01 administrador inicia sesión y resuelve contexto', async () => {
    const data = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    S.adminToken = data.accessToken;
    expect(S.adminToken).toBeTruthy();

    const insts = await api('GET', '/auth/institutions', S.adminToken);
    const demo = insts.institutions.find((i: { slug: string }) => i.slug === 'demo-school');
    expect(demo).toBeTruthy();
    S.instId = demo.id;

    const roles = await api('GET', '/roles', S.adminToken);
    const list = Array.isArray(roles) ? roles : roles.data;
    for (const name of ['TEACHER', 'DIRECTOR_DE_GRUPO', 'RECTOR', 'PARENT', 'STUDENT']) {
      const role = list.find((r: { name: string }) => r.name === name);
      expect(role, `role ${name}`).toBeTruthy();
      S.roles![name] = role.id;
    }

    const periods = await api('GET', '/academic-periods?limit=50', S.adminToken);
    S.periodId = periods.data.find((x: { code: string }) => x.code === '2026-P1').id;
    const grades = await api('GET', '/school-grades?limit=50', S.adminToken);
    S.gradeId = grades.data.find((x: { code: string }) => x.code === '2DO').id;
  });

  test('02 estructura académica: cursos, asignaturas, franja y aula', async () => {
    const c2a = await api('POST', '/courses', S.adminToken, {
      code: `${P}-2A`, name: 'Segundo A E2E', level: 'PRIMARIA', schoolGradeId: S.gradeId, section: 'A',
    }, 201);
    S.course2A = c2a.id;
    const c3a = await api('POST', '/courses', S.adminToken, {
      code: `${P}-3A`, name: 'Tercero A E2E', level: 'PRIMARIA', schoolGradeId: S.gradeId, section: 'A',
    }, 201);
    S.course3A = c3a.id;
    expect(c2a.schoolGradeId).toBe(S.gradeId);

    for (const [code, name] of [['MAT', 'Matemáticas'], ['LEN', 'Lengua'], ['CIE', 'Ciencias'], ['SOC', 'Sociales'], ['ART', 'Artes'], ['PEF', 'Educación Física']]) {
      const s = await api('POST', '/subjects', S.adminToken, { code: `${P}-${code}`, name: `${name} E2E` }, 201);
      S.subjects![code] = s.id;
    }

    const block = await api('POST', '/schedule-blocks', S.adminToken, {
      name: `${P}-B1`, dayOfWeek: 'MONDAY', startTime: '07:00', endTime: '08:00',
    }, 201);
    S.blockId = block.id;

    const room = await api('POST', '/classrooms', S.adminToken, {
      code: `${P}-R1`, name: 'Aula E2E 1', capacity: 30, type: 'AULA',
    }, 201);
    S.roomId = room.id;
  });

  test('03 alta administrativa de docentes con perfil, roles y materias', async () => {
    for (let i = 1; i <= 8; i += 1) {
      const em = email(`doc${i}`);
      const user = await api('POST', '/users', S.adminToken, {
        email: em, password: 'Password123', firstName: `Docente${i}`, lastName: 'E2E',
        profile: {
          documentType: 'NATIONAL_ID', documentNumber: doc(i),
          phone: `300000000${i}`, profession: 'Docente de primaria', bio: 'Perfil E2E',
        },
      }, 201);
      expect(user.profiles?.[0]?.documentNumber).toBe(doc(i));
      await api('POST', `/institutions/${S.instId}/memberships`, S.adminToken, {
        userId: user.id, roleIds: [S.roles!['TEACHER']],
      }, 201);
      S.teachers!.push({ id: user.id, email: em });
      S.extraUsers!.push(user.id);
    }
    expect(S.teachers).toHaveLength(8);

    // Docente integral: 4 asignaturas del mismo curso + dirección de grupo
    S.integralTeacher = S.teachers![0].id;
    for (const code of ['MAT', 'LEN', 'CIE', 'SOC']) {
      await api('POST', '/teacher-assignments', S.adminToken, {
        teacherUserId: S.integralTeacher, courseId: S.course2A,
        subjectId: S.subjects![code], academicPeriodId: S.periodId,
        weeklyHours: 2, startDate: '2026-01-01',
      }, 201);
    }
    const list = await api(
      'GET', `/teacher-assignments?teacherUserId=${S.integralTeacher}&courseId=${S.course2A}`, S.adminToken,
    );
    expect(list.data.length).toBeGreaterThanOrEqual(4);

    await api('POST', `/institutions/${S.instId}/memberships`, S.adminToken, {
      userId: S.integralTeacher, roleIds: [S.roles!['DIRECTOR_DE_GRUPO']],
    }, 201).catch(() => undefined);
    const dir = await api('POST', '/teacher-assignments/course-directors', S.adminToken, {
      directorUserId: S.integralTeacher, courseId: S.course2A,
      academicPeriodId: S.periodId, startDate: '2026-01-01',
    }, 201);
    expect(dir.status).toBe('ACTIVE');

    // Rector
    const rector = await api('POST', '/users', S.adminToken, {
      email: email('rector'), password: 'Password123',
      firstName: 'Rector', lastName: 'E2E',
      profile: { documentType: 'NATIONAL_ID', documentNumber: doc(99), profession: 'Rector' },
    }, 201);
    await api('POST', `/institutions/${S.instId}/memberships`, S.adminToken, {
      userId: rector.id, roleIds: [S.roles!['RECTOR']],
    }, 201);
    S.rector = rector.id;
    S.extraUsers!.push(rector.id);
  });

  test('04 importación CSV y XLSX con errores por fila', async () => {
    const csv = [
      'firstName,lastName,documentType,documentNumber,dateOfBirth,courseCode,status',
      `E2Eflow,Uno,NATIONAL_ID,${doc(11)},2015-03-01,${P}-2A,ACTIVE`,
      `E2Eflow,Dos,DNI,${doc(12)},,${P}-2A,`,
      `E2Eflow,Malo,BADTYPE,${doc(13)},2015-01-01,NOPE,ACTIVE`,
    ].join('\n');
    const form = new FormData();
    form.set('file', new Blob([csv], { type: 'text/csv' }), 'students.csv');
    form.set('academicPeriodId', S.periodId!);
    const res = await fetch(`${API}/students/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${S.adminToken}`, 'X-Institution-Id': S.instId! },
      body: form,
    });
    expect(res.status).toBe(201);
    const summary = await res.json();
    expect(summary.created).toBe(2);
    expect(summary.enrollments).toBe(2);
    expect(summary.errors.length).toBe(1);
    expect(summary.errors[0].row).toBe(4);

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Estudiantes');
    ws.addRow(['firstName', 'lastName', 'documentType', 'documentNumber', 'dateOfBirth', 'courseCode', 'status']);
    ws.addRow(['E2Eflow', 'XUno', 'NATIONAL_ID', doc(14), '2015-06-01', `${P}-2A`, 'ACTIVE']);
    ws.addRow(['E2Eflow', 'XDos', 'DNI', doc(15), '', `${P}-2A`, '']);
    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    const form2 = new FormData();
    form2.set('file', new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }), 'students.xlsx');
    form2.set('academicPeriodId', S.periodId!);
    const res2 = await fetch(`${API}/students/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${S.adminToken}`, 'X-Institution-Id': S.instId! },
      body: form2,
    });
    expect(res2.status).toBe(201);
    const summary2 = await res2.json();
    expect(summary2.created).toBe(2);
    expect(summary2.errors).toEqual([]);

    const all = await api('GET', '/students?limit=100&search=E2Eflow', S.adminToken);
    S.studentIds = all.data
      .filter((s: { documentNumber: string }) => (s.documentNumber ?? '').includes(STAMP))
      .map((s: { id: string }) => s.id);
    expect(S.studentIds!.length).toBeGreaterThanOrEqual(4);
    S.extraStudents!.push(...S.studentIds!);
  });

  test('05 acudientes M:N (un estudiante, varios acudientes y viceversa)', async () => {
    const mkParent = async (name: string, first: string, document: string) => {
      const em = email(name);
      const user = await api('POST', '/users', S.adminToken, {
        email: em, password: 'Password123', firstName: first, lastName: 'E2E',
        profile: { documentType: 'NATIONAL_ID', documentNumber: document, phone: '3110000000', profession: 'Acudiente' },
      }, 201);
      await api('POST', `/institutions/${S.instId}/memberships`, S.adminToken, {
        userId: user.id, roleIds: [S.roles!['PARENT']],
      }, 201);
      S.parents!.push(user.id);
      S.extraUsers!.push(user.id);
      return em;
    };
    const fatherEmail = await mkParent('padre', 'Padre', doc(21));
    await mkParent('madre', 'Madre', doc(22));
    void fatherEmail;

    const [s1, s2] = S.studentIds!;
    await api('POST', `/guardians/students/${s1}`, S.adminToken, {
      studentId: s1, relationshipType: 'FATHER', guardianUserId: S.parents![0], isPrimary: true,
    }, 201);
    await api('POST', `/guardians/students/${s2}`, S.adminToken, {
      studentId: s2, relationshipType: 'FATHER', guardianUserId: S.parents![0],
    }, 201);
    await api('POST', `/guardians/students/${s2}`, S.adminToken, {
      studentId: s2, relationshipType: 'MOTHER', guardianUserId: S.parents![1], isPrimary: true,
    }, 201);

    const byStudent = await api('GET', `/guardians/students/${s2}/guardians`, S.adminToken);
    expect(byStudent.length).toBe(2);
  });

  test('06 estudiante se autorregistra, se vincula por documento y es aprobado', async () => {
    const target = S.studentIds![0];
    const detail = await api('GET', `/students/${target}`, S.adminToken);
    const docNumber = detail.documentNumber as string;
    const docType = detail.documentType as string;
    const studentEmail = email('estudiante');

    const reg = await fetch(`${API}/auth/self-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: studentEmail, password: 'Password123',
        firstName: 'Estudiante', lastName: 'E2E', institutionSlug: 'demo-school',
        requestedRole: 'STUDENT',
        profile: { documentType: docType, documentNumber: docNumber },
      }),
    });
    expect(reg.status).toBe(201);

    await login(studentEmail, 'Password123', 401);

    const pend = await api('GET', `/institutions/${S.instId}/memberships?status=PENDING`, S.adminToken);
    const req = pend.data.find((m: { user: { email: string } }) => m.user.email === studentEmail);
    expect(req).toBeTruthy();
    await api('POST', `/institutions/${S.instId}/memberships/${req.id}/approve`, S.adminToken, {}, 200);

    const st = await login(studentEmail, 'Password123');
    S.studentUser = st.user.id;
    S.extraUsers!.push(st.user.id);

    const me = await api('GET', `/students/${target}`, st.accessToken);
    expect(me.id).toBe(target);
    const mine = await api('GET', '/students?limit=100', st.accessToken);
    expect(mine.data.map((s: { id: string }) => s.id)).toEqual([target]);
  });

  test('07 docente ve solo sus cursos; fuera de ellos 404', async () => {
    const t = await login(S.teachers![0].email, 'Password123');
    const mine = await api('GET', '/students?limit=100', t.accessToken);
    const ids = mine.data.map((s: { id: string }) => s.id);
    for (const id of S.studentIds!) expect(ids).toContain(id);

    const otherCourseStudent = await api('POST', '/students', S.adminToken, {
      firstName: 'Otro', lastName: 'Curso', documentType: 'NATIONAL_ID', documentNumber: doc(31),
    }, 201);
    S.extraStudents!.push(otherCourseStudent.id);
    await api('GET', `/students/${otherCourseStudent.id}`, t.accessToken, undefined, 404);
  });

  test('08 horarios: con docente, pendiente, backfill y conflictos', async () => {
    const t2 = S.teachers![1].id;
    await api('POST', '/teacher-assignments', S.adminToken, {
      teacherUserId: t2, courseId: S.course2A, subjectId: S.subjects!['MAT'],
      academicPeriodId: S.periodId, weeklyHours: 2, startDate: '2026-01-01',
    }, 201);
    const withTeacher = await api('POST', '/schedules', S.adminToken, {
      courseId: S.course2A, subjectId: S.subjects!['MAT'], academicPeriodId: S.periodId,
      teacherUserId: t2, blockId: S.blockId, dayOfWeek: 'MONDAY', startTime: '07:00', endTime: '08:00',
    }, 201);
    expect(withTeacher.teacherUserId).toBe(t2);

    const pending = await api('POST', '/schedules', S.adminToken, {
      courseId: S.course2A, subjectId: S.subjects!['LEN'], academicPeriodId: S.periodId,
      dayOfWeek: 'TUESDAY', startTime: '07:00', endTime: '08:00',
    }, 201);
    expect(pending.teacherUserId).toBeNull();
    S.pendingSchedule = pending.id;

    await api('POST', '/teacher-assignments', S.adminToken, {
      teacherUserId: t2, courseId: S.course2A, subjectId: S.subjects!['LEN'],
      academicPeriodId: S.periodId, weeklyHours: 2, startDate: '2026-01-01',
    }, 201);
    const filled = await api('GET', `/schedules/${S.pendingSchedule}`, S.adminToken);
    expect(filled.teacherUserId).toBe(t2);

    await api('POST', '/schedules', S.adminToken, {
      courseId: S.course3A, subjectId: S.subjects!['MAT'], academicPeriodId: S.periodId,
      teacherUserId: t2, dayOfWeek: 'MONDAY', startTime: '07:00', endTime: '08:00',
    }, 400);

    await api('POST', '/schedules', S.adminToken, {
      courseId: S.course2A, subjectId: S.subjects!['CIE'], academicPeriodId: S.periodId,
      dayOfWeek: 'MONDAY', startTime: '07:00', endTime: '08:00',
    }, 400);
  });

  test('09 reemplazo doble de director sin P2002 y con histórico', async () => {
    const t3 = S.teachers![2].id;
    const t4 = S.teachers![3].id;
    const current = await api(
      'GET', `/teacher-assignments/course-directors/current?courseId=${S.course2A}&academicPeriodId=${S.periodId}`,
      S.adminToken,
    );
    await api('PATCH', `/teacher-assignments/course-directors/${current.id}/deactivate`, S.adminToken, {}, 200);
    const b = await api('POST', '/teacher-assignments/course-directors', S.adminToken, {
      directorUserId: t3, courseId: S.course2A, academicPeriodId: S.periodId, startDate: '2026-02-01',
    }, 201);
    await api('PATCH', `/teacher-assignments/course-directors/${b.id}/deactivate`, S.adminToken, {}, 200);
    const c = await api('POST', '/teacher-assignments/course-directors', S.adminToken, {
      directorUserId: t4, courseId: S.course2A, academicPeriodId: S.periodId, startDate: '2026-03-01',
    }, 201);
    expect(c.status).toBe('ACTIVE');

    const history = await api(
      'GET', `/teacher-assignments/course-directors/history?courseId=${S.course2A}&academicPeriodId=${S.periodId}`,
      S.adminToken,
    );
    expect(history.length).toBeGreaterThanOrEqual(3);
    expect(history.filter((h: { status: string }) => h.status === 'ACTIVE')).toHaveLength(1);
  });

  test('10 autorregistro docente: pendiente, bloqueo, aprobación y acceso', async () => {
    const teacherEmail = email('autorreg');
    const reg = await fetch(`${API}/auth/self-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: teacherEmail, password: 'Password123',
        firstName: 'Auto', lastName: 'Registro', institutionSlug: 'demo-school',
        requestedRole: 'TEACHER',
        profile: { documentType: 'NATIONAL_ID', documentNumber: doc(41), profession: 'Docente' },
      }),
    });
    expect(reg.status).toBe(201);

    await login(teacherEmail, 'Password123', 401);

    const pend = await api('GET', `/institutions/${S.instId}/memberships?status=PENDING`, S.adminToken);
    const req = pend.data.find((m: { user: { email: string } }) => m.user.email === teacherEmail);
    expect(req.requestedRole).toBe('TEACHER');
    await api('POST', `/institutions/${S.instId}/memberships/${req.id}/approve`, S.adminToken, {}, 200);

    const t = await login(teacherEmail, 'Password123');
    expect(t.user.status).toBe('ACTIVE');
    S.extraUsers!.push(t.user.id);
  });

  test('11 padre ve solo vinculados; estudiante ve solo lo propio', async () => {
    const fatherEmail = S.teachers ? email('padre') : '';
    const p1 = await login(fatherEmail, 'Password123');
    const pl = await api('GET', '/students?limit=100', p1.accessToken);
    expect(pl.data).toHaveLength(2);

    const outside = S.extraStudents!.find((id) => !S.studentIds!.includes(id))!;
    await api('GET', `/students/${outside}`, p1.accessToken, undefined, 404);

    const st = await login(email('estudiante'), 'Password123');
    await api('GET', `/students/${outside}`, st.accessToken, undefined, 404);
  });

  test('12 UI: registro público y bandeja de aprobación', async ({ page }) => {
    const uiEmail = email('ui');
    await page.goto('/register?i=demo-school');
    await expect(page.getByRole('heading', { name: 'Solicitar acceso' })).toBeVisible();
    await page.getByLabel(/Nombre/).fill('Ui');
    await page.getByLabel(/Apellido/).fill('Registro');
    await page.getByLabel(/Correo/).fill(uiEmail);
    await page.getByLabel(/Contraseña/).fill('Password123');
    await page.getByLabel(/Soy/).selectOption('PARENT');
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect(page.getByText('Solicitud recibida')).toBeVisible();

    await page.goto('/login');
    await page.getByLabel(/Correo/).fill(ADMIN_EMAIL);
    await page.getByLabel(/Contraseña/).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    if (page.url().includes('select-institution')) {
      await page.getByRole('button', { name: /Demo School/ }).click();
      await page.getByRole('button', { name: 'Continuar' }).click();
    }
    await page.goto('/admin/requests');
    await expect(page.getByText('Solicitudes de acceso')).toBeVisible();
    await expect(page.getByText(uiEmail)).toBeVisible();
    await page.getByRole('button', { name: 'Aprobar' }).first().click();
    await expect(page.getByText(uiEmail)).toBeHidden({ timeout: 15000 });
  });
});
