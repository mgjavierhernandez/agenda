import { test, expect, type Page } from '@playwright/test';

const PASSWORD = process.env.E2E_PASSWORD || 'Demo1234!';
const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL || 'teacher@demo-school.dev';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api/v1';

async function loginAsTeacher(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(TEACHER_EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/(dashboard|select-institution)/, { timeout: 15_000 });
  if (page.url().includes('select-institution')) {
    const options = page.locator('main button, [role="main"] button');
    if ((await options.count().catch(() => 0)) > 0) {
      await options.first().click();
      const cont = page.getByRole('button', { name: 'Continuar' });
      if (await cont.isVisible({ timeout: 3_000 }).catch(() => false)) await cont.click();
    }
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
  }
  await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible({ timeout: 15_000 });
}

async function apiHeaders(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const token =
      sessionStorage.getItem('agenda_access_token') || localStorage.getItem('agenda_access_token') || '';
    const inst =
      sessionStorage.getItem('agenda_institution_id') ||
      sessionStorage.getItem('agenda_selected_institution_id') ||
      localStorage.getItem('agenda_institution_id') ||
      '';
    return { Authorization: `Bearer ${token}`, 'X-Institution-Id': inst };
  });
}

test.describe('Teacher scope (sus cursos)', () => {
  test('estudiantes listados pertenecen a sus cursos', async ({ page }) => {
    await loginAsTeacher(page);
    const headers = await apiHeaders(page);

    const coursesRes = await page.request.get(`${API_URL}/courses?limit=100`, { headers });
    expect(coursesRes.status()).toBe(200);
    const courseIds = new Set(((await coursesRes.json()).data ?? []).map((c: { id: string }) => c.id));
    test.skip(courseIds.size === 0, 'Docente sin cursos asignados en seed');

    const studentsRes = await page.request.get(`${API_URL}/students?limit=100`, { headers });
    expect(studentsRes.status()).toBe(200);
    const students = ((await studentsRes.json()).data ?? []) as Array<{ id: string }>;

    // Cada estudiante visible debe tener matrícula en un curso del docente.
    for (const s of students.slice(0, 10)) {
      const enr = await page.request.get(`${API_URL}/enrollments?studentId=${s.id}&limit=50`, {
        headers,
      });
      expect(enr.status()).toBe(200);
      const enrollments = ((await enr.json()).data ?? []) as Array<{ courseId: string }>;
      expect(
        enrollments.some((e) => courseIds.has(e.courseId)),
        `estudiante ${s.id} sin matrícula en cursos del docente`,
      ).toBe(true);
    }
  });

  test('negativo: estudiante fuera de alcance rechazado', async ({ page }) => {
    await loginAsTeacher(page);
    const headers = await apiHeaders(page);
    const stranger = '00000000-0000-4000-8000-000000000000';

    for (const path of [
      `/students/${stranger}`,
      `/grades?studentId=${stranger}`,
      `/enrollments?studentId=${stranger}`,
      `/schedules?studentId=${stranger}`,
      `/tasks?studentId=${stranger}`,
    ]) {
      const res = await page.request.get(`${API_URL}${path}`, { headers });
      expect(res.status(), path).toBe(404);
    }
  });

  test('negativo: calificar entrega de otro curso prohibido', async ({ page }) => {
    await loginAsTeacher(page);
    const headers = await apiHeaders(page);
    const stranger = '00000000-0000-4000-8000-000000000000';

    const res = await page.request.patch(`${API_URL}/submissions/${stranger}/grade`, {
      headers,
      data: { grade: '90' },
    });
    expect([403, 404]).toContain(res.status());
  });
});
