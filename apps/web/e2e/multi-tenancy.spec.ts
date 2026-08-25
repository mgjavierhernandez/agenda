import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL || 'admin@demo-school.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'Demo1234!';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(EMAIL);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/(dashboard|select-institution)/, { timeout: 15_000 });
  if (page.url().includes('select-institution')) {
    const btn = page.locator('button').filter({ hasText: /Institution|Colegio|Escuela|E2E/ }).first();
    if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) await btn.click();
  }
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
}

test.describe('Multi-Tenancy', () => {
  test('should display institution name in topbar', async ({ page }) => {
    await login(page);
    const instButton = page.locator('header button').nth(1);
    await expect(instButton).toBeVisible();
  });

  test('should have institution switcher when multiple institutions exist', async ({ page }) => {
    await login(page);
    const instButton = page.locator('header button').nth(1);
    await instButton.click();
    await page.waitForTimeout(500);
  });

  test('API requests should include X-Institution-Id header', async ({ page }) => {
    await login(page);

    const requests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/')) {
        const header = req.headers()['x-institution-id'];
        if (header) requests.push(header);
      }
    });

    await page.goto('/students');
    await page.waitForTimeout(2000);
    expect(requests.length).toBeGreaterThan(0);
  });
});
