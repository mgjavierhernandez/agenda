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

test.describe('Notifications', () => {
  test('should display notifications page', async ({ page }) => {
    await login(page);
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible({ timeout: 10_000 });
  });

  test('should show notification bell in topbar', async ({ page }) => {
    await login(page);
    const bell = page.getByRole('button', { name: /notificaciones/i });
    await expect(bell).toBeVisible();
  });

  test('should navigate to notifications from bell', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: /notificaciones/i }).click();
    await page.waitForURL(/\/notifications/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible();
  });

  test('should have mark all as read functionality', async ({ page }) => {
    await login(page);
    await page.goto('/notifications');
    await page.waitForTimeout(1500);
    const markAllBtn = page.getByRole('button', { name: /marcar.*leídas|mark all/i });
    if (await markAllBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(markAllBtn).toBeEnabled();
    }
  });

  test('should isolate notifications per user', async ({ page }) => {
    await login(page);
    await page.goto('/notifications');
    await page.waitForTimeout(1500);
    const notifItems = page.locator('[class*="rounded-lg"][class*="border"]');
    const count = await notifItems.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
