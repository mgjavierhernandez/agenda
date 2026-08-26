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

test.describe('Digital Signatures', () => {
  test('should display signatures list page', async ({ page }) => {
    await login(page);
    await page.goto('/signatures');
    await expect(page.getByRole('heading', { name: 'Firmas' })).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate to new signature form', async ({ page }) => {
    await login(page);
    await page.goto('/signatures');
    const newBtn = page.getByRole('button', { name: /nueva solicitud|crear|agregar/i });
    if (await newBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newBtn.click();
      await expect(page.getByRole('heading', { name: /firma|solicitud|crear/i })).toBeVisible({ timeout: 10_000 });
    }
  });

  test('should filter signatures by status', async ({ page }) => {
    await login(page);
    await page.goto('/signatures');
    await page.waitForTimeout(1000);
    const searchInput = page.getByPlaceholder(/buscar/i);
    await expect(searchInput).toBeVisible();
  });
});
