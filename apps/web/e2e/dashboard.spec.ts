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

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display dashboard heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
  });

  test('should display stat cards', async ({ page }) => {
    const cards = page.locator('[class*="rounded-xl"][class*="border"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should have sidebar navigation', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible();

    await expect(nav.getByRole('button', { name: /Categoría Inicio/i })).toBeVisible();
    await expect(nav.getByText('Dashboard')).toBeVisible();
    await expect(nav.getByText('Agenda')).toBeVisible();

    const trabajoBtn = nav.getByRole('button', { name: /Categoría Trabajo académico/i });
    if ((await trabajoBtn.getAttribute('aria-expanded')) !== 'true') {
      await trabajoBtn.click();
    }
    await expect(nav.getByText('Tareas')).toBeVisible();
  });

  test('should navigate to tasks from sidebar', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });

    async function openCategoryAndClick(category: RegExp, item: string) {
      const cat = nav.getByRole('button', { name: category });
      if ((await cat.getAttribute('aria-expanded')) !== 'true') {
        await cat.click();
      }
      await nav.getByRole('link', { name: item, exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
      await nav.getByRole('link', { name: item, exact: true }).click();
    }

    await openCategoryAndClick(/Categoría Trabajo académico/i, 'Tareas');
    await page.waitForURL(/\/tasks/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Tareas' })).toBeVisible();
  });

  test('should navigate to agenda from sidebar', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.getByText('Agenda').click();
    await page.waitForURL(/\/agenda/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
  });
});
