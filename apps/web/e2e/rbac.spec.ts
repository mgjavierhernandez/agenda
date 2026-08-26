import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL || 'admin@demo-school.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'Demo1234!';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  try {
    await page.waitForURL(/\/(dashboard|select-institution)/, { timeout: 15_000 });
  } catch {
    const errorAlert = page.getByRole('alert');
    if (await errorAlert.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await page.getByLabel('Correo electrónico').fill(EMAIL);
      await page.locator('#password').fill(PASSWORD);
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

test.describe('RBAC', () => {
  test('admin should see create buttons for manageble resources', async ({ page }) => {
    await login(page);

    await page.goto('/tasks');
    await page.waitForTimeout(1000);
    const taskCreateBtn = page.getByRole('button', { name: /nueva tarea|crear/i });
    const hasTaskBtn = await taskCreateBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    await page.goto('/students');
    await page.waitForTimeout(1000);
    const studentCreateBtn = page.getByRole('button', { name: /nuevo estudiante|crear/i });
    const hasStudentBtn = await studentCreateBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasTaskBtn || hasStudentBtn).toBeTruthy();
  });

  test('admin should access all module pages', async ({ page }) => {
    await login(page);

    const pages = ['/tasks', '/students', '/courses', '/subjects', '/communications', '/signatures'];
    for (const p of pages) {
      await page.goto(p);
      await page.waitForTimeout(800);
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible({ timeout: 5_000 });
    }
  });

  test('unauthenticated user cannot access protected pages', async ({ page }) => {
    const protectedRoutes = ['/tasks', '/students', '/courses', '/communications', '/signatures', '/dashboard'];
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    }
  });

  test('sidebar should show permission-filtered navigation items', async ({ page }) => {
    await login(page);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible();

    await expect(nav.getByRole('link', { name: 'Estudiantes' })).toBeVisible({ timeout: 15_000 });
    const items = nav.locator('li a');
    const count = await items.count();
    expect(count).toBeGreaterThan(5);
  });
});
