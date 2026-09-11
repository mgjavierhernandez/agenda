import { test, expect, type Page } from '@playwright/test';

const PASSWORD = process.env.E2E_PASSWORD || 'Demo1234!';
const PARENT_EMAIL = process.env.E2E_PARENT_EMAIL || 'parent@demo-school.dev';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api/v1';

async function loginAsParent(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(PARENT_EMAIL);
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

test.describe('Parent scope (hijo seleccionado)', () => {
  test('dashboard muestra el hijo seleccionado y el selector persiste', async ({ page }) => {
    await loginAsParent(page);

    const selector = page.getByLabel('Hijo:');
    await expect(selector).toBeVisible({ timeout: 10_000 });
    const options = await selector.locator('option').allTextContents();
    // Optgroup: "Todos mis hijos" + hijos vinculados (seed: 2).
    expect(options.length).toBeGreaterThanOrEqual(2);

    // Dashboard indica de quién es la información.
    await expect(page.getByText(/Mostrando información de/)).toBeVisible({ timeout: 10_000 });
  });

  test('cambiar de hijo actualiza notas y horarios', async ({ page }) => {
    await loginAsParent(page);
    const selector = page.getByLabel('Hijo:');
    await expect(selector).toBeVisible({ timeout: 10_000 });

    const values = await selector.locator('option').evaluateAll((els) =>
      els.map((e) => ({ value: (e as HTMLOptionElement).value, text: e.textContent?.trim() ?? '' })),
    );
    const children = values.filter((v) => v.value !== '');
    test.skip(children.length < 2, 'Se requieren 2 hijos vinculados en seed');

    await selector.selectOption(children[0].value);
    await page.goto('/grades');
    await expect(page.getByText(`Notas de ${children[0].text}`)).toBeVisible({ timeout: 10_000 });

    await selector.selectOption(children[1].value);
    await expect(page.getByText(`Notas de ${children[1].text}`)).toBeVisible({ timeout: 10_000 });

    await page.goto('/schedules');
    await expect(page.getByText(`Horario de ${children[1].text}`)).toBeVisible({ timeout: 10_000 });
  });

  test('negativo: hijo no vinculado es rechazado (404)', async ({ page }) => {
    await loginAsParent(page);
    const headers = await apiHeaders(page);
    const stranger = '00000000-0000-4000-8000-000000000000';

    for (const path of [
      `/students/${stranger}`,
      `/grades?studentId=${stranger}`,
      `/enrollments?studentId=${stranger}`,
      `/schedules?studentId=${stranger}`,
      `/tasks?studentId=${stranger}`,
      `/guardians/students/${stranger}/guardians`,
    ]) {
      const res = await page.request.get(`${API_URL}${path}`, { headers });
      expect(res.status(), path).toBe(404);
    }
  });

  test('observador: padre solo ve seguimientos PUBLIC', async ({ page }) => {
    await loginAsParent(page);
    const headers = await apiHeaders(page);

    const res = await page.request.get(`${API_URL}/student-follow-ups?limit=100`, { headers });
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const fu of body.data ?? []) {
      expect(fu.confidentiality).toBe('PUBLIC');
    }

    // Intento de eludir con filtro explícito: no amplía niveles.
    const res2 = await page.request.get(
      `${API_URL}/student-follow-ups?limit=100&confidentiality=INTERNAL`,
      { headers },
    );
    expect(res2.status()).toBe(200);
    const body2 = await res2.json();
    for (const fu of body2.data ?? []) {
      expect(fu.confidentiality).toBe('PUBLIC');
    }
  });

  test('agenda responde al hijo seleccionado', async ({ page }) => {
    await loginAsParent(page);
    const headers = await apiHeaders(page);

    const links = await page.request.get(`${API_URL}/guardians/students?limit=50`, { headers });
    expect(links.status()).toBe(200);
    const children = ((await links.json()).data ?? []) as Array<{ studentId: string }>;
    test.skip(children.length === 0, 'Sin hijos vinculados en seed');

    const today = new Date().toISOString().slice(0, 10);
    const res = await page.request.get(
      `${API_URL}/agenda?start=${today}&end=${today}&view=day&studentId=${children[0].studentId}`,
      { headers },
    );
    expect(res.status()).toBe(200);
  });
});
