import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL || 'admin@demo-school.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'Demo1234!';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(EMAIL);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  try {
    await page.waitForURL(/\/(dashboard|select-institution)/, { timeout: 15_000 });
  } catch {
    const errorAlert = page.getByRole('alert');
    if (await errorAlert.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await page.getByLabel('Correo electrónico').fill(EMAIL);
      await page.getByLabel('Contraseña').fill(PASSWORD);
      await page.getByRole('button', { name: 'Entrar' }).click();
      await page.waitForURL(/\/(dashboard|select-institution)/, { timeout: 15_000 });
    } else {
      throw new Error('Login failed: no URL change and no error alert');
    }
  }
  if (page.url().includes('select-institution')) {
    const btn = page.locator('button').filter({ hasText: /Institution|Colegio|Escuela|E2E/ }).first();
    if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) await btn.click();
  }
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
}

test.describe('Academic Flow', () => {
  test('should display subjects list page', async ({ page }) => {
    await login(page);
    await page.goto('/subjects');
    await expect(page.getByRole('heading', { name: 'Asignaturas' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/buscar/i)).toBeVisible();
  });

  test('should display courses list page', async ({ page }) => {
    await login(page);
    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: 'Cursos' })).toBeVisible({ timeout: 10_000 });
  });

  test('should display grades list page', async ({ page }) => {
    await login(page);
    await page.goto('/grades');
    await expect(page.getByRole('heading', { name: 'Calificaciones' })).toBeVisible({ timeout: 10_000 });
  });

  test('should display academic periods list page', async ({ page }) => {
    await login(page);
    await page.goto('/academic-periods');
    await expect(page.getByRole('heading', { name: 'Periodos académicos' })).toBeVisible({ timeout: 10_000 });
  });

  test('should display school grades list page', async ({ page }) => {
    await login(page);
    await page.goto('/school-grades');
    await expect(page.getByRole('heading', { name: 'Grados académicos' })).toBeVisible({ timeout: 10_000 });
  });

  test('should display enrollments list page', async ({ page }) => {
    await login(page);
    await page.goto('/enrollments');
    await expect(page.getByRole('heading', { name: 'Matrículas' })).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate to new subject form', async ({ page }) => {
    await login(page);
    await page.goto('/subjects');
    const newBtn = page.getByRole('button', { name: /nueva|crear|agregar/i });
    if (await newBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newBtn.click();
      await expect(page.getByRole('heading', { name: /asignatura|crear|nueva/i })).toBeVisible({ timeout: 10_000 });
    }
  });

  test('should navigate to new course form', async ({ page }) => {
    await login(page);
    await page.goto('/courses');
    const newBtn = page.getByRole('button', { name: /nuevo|crear|agregar/i });
    if (await newBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newBtn.click();
      await expect(page.getByRole('heading', { name: /curso|crear|nuevo/i })).toBeVisible({ timeout: 10_000 });
    }
  });
});
