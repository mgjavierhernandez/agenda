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

test.describe('Digital Agenda', () => {
  test('should access agenda from sidebar', async ({ page }) => {
    await login(page);
    await page.getByRole('navigation', { name: 'Main navigation' }).getByText('Agenda').click();
    await page.waitForURL(/\/agenda/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
  });

  test('should display agenda page with views', async ({ page }) => {
    await login(page);
    await page.goto('/agenda');
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole('button', { name: 'Dia', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Semana', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mes', exact: true })).toBeVisible();
  });

  test('should switch between day view', async ({ page }) => {
    await login(page);
    await page.goto('/agenda');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Dia', exact: true }).click();
    await page.waitForTimeout(500);
  });

  test('should switch to week view', async ({ page }) => {
    await login(page);
    await page.goto('/agenda');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Semana', exact: true }).click();
    await page.waitForTimeout(500);
  });

  test('should switch to month view', async ({ page }) => {
    await login(page);
    await page.goto('/agenda');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Mes', exact: true }).click();
    await page.waitForTimeout(500);
  });

  test('should navigate dates forward and backward', async ({ page }) => {
    await login(page);
    await page.goto('/agenda');
    await page.waitForTimeout(1000);

    const nextBtn = page.getByRole('button', { name: '→' });
    const prevBtn = page.getByRole('button', { name: '←' });

    await expect(nextBtn).toBeVisible();
    await expect(prevBtn).toBeVisible();

    await nextBtn.click();
    await page.waitForTimeout(500);

    await prevBtn.click();
    await page.waitForTimeout(500);
  });

  test('should return to today', async ({ page }) => {
    await login(page);
    await page.goto('/agenda');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: '→' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /hoy/i }).click();
    await page.waitForTimeout(500);
  });

  test('should display event type filters', async ({ page }) => {
    await login(page);
    await page.goto('/agenda');
    await page.waitForTimeout(1000);

    const filters = page.locator('button').filter({ hasText: /Horario|Tarea|Comunicacion|Firma/ });
    const count = await filters.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});
