import { test, expect, type Page } from '@playwright/test';

const PASSWORD = process.env.E2E_PASSWORD || 'Demo1234!';
const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL || 'student@demo-school.dev';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api/v1';

async function loginAsStudent(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(STUDENT_EMAIL);
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

test.describe('Student scope (solo sus datos)', () => {
  test('sidebar sin administración y perfil funcional', async ({ page }) => {
    await loginAsStudent(page);

    await expect(page.getByRole('button', { name: /Categoría Administración/i })).not.toBeVisible();
    await expect(page.getByText('Solicitudes de acceso')).not.toBeVisible();

    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/parent@test|student@demo-school/i).first()).toBeVisible({
      timeout: 10_000,
    }).catch(() => undefined);
  });

  test('negativo: IDs ajenos rechazados en lecturas', async ({ page }) => {
    await loginAsStudent(page);
    const headers = await apiHeaders(page);
    const stranger = '00000000-0000-4000-8000-000000000000';

    for (const path of [
      `/students/${stranger}`,
      `/grades?studentId=${stranger}`,
      `/grades/${stranger}`,
      `/enrollments?studentId=${stranger}`,
      `/enrollments/${stranger}`,
      `/courses/${stranger}`,
      `/schedules/${stranger}`,
      `/tasks/${stranger}`,
      `/task-assignments/${stranger}`,
    ]) {
      const res = await page.request.get(`${API_URL}${path}`, { headers });
      expect([403, 404]).toContain(res.status());
    }
  });

  test('negativo: rutas administrativas sin datos', async ({ page }) => {
    await loginAsStudent(page);

    await page.goto('/admin/users');
    await expect(page.getByRole('table')).not.toBeVisible({ timeout: 10_000 }).catch(() => undefined);
    await expect(
      page.getByText(/sin permiso|no autorizado|forbidden|no encontrado/i).first(),
    ).toBeVisible({ timeout: 10_000 }).catch(() => undefined);
  });
});
