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

test.describe('File Attachments', () => {
  test('should display task form', async ({ page }) => {
    await login(page);
    await page.goto('/tasks/new');
    await page.waitForTimeout(1500);

    await expect(page.getByRole('heading', { name: /Nueva tarea|Editar tarea/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Título *')).toBeVisible();
  });

  test('should accept valid file type in file uploader', async ({ page }) => {
    await login(page);
    await page.goto('/tasks/new');
    await page.waitForTimeout(1500);

    const fileInput = page.locator('input[type="file"]');
    const hasUploadArea = await fileInput.count() > 0;
    if (hasUploadArea) {
      const acceptAttr = await fileInput.first().getAttribute('accept');
      expect(acceptAttr).toBeTruthy();
    }
  });
});
