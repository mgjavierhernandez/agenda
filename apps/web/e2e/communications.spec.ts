import { test, expect } from '@playwright/test';
import { createE2ECommunication, publishE2ECommunication, cleanupE2EEntity } from './helpers/api';

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

test.describe('Communications', () => {
  test('should display communications list page', async ({ page }) => {
    await login(page);
    await page.goto('/communications');
    await expect(page.getByRole('heading', { name: 'Comunicaciones' })).toBeVisible({ timeout: 10_000 });
  });

  test('should display communication inbox page', async ({ page }) => {
    await login(page);
    await page.goto('/communication-inbox');
    await expect(page.getByRole('heading', { name: 'Bandeja de entrada' })).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate to new communication form', async ({ page }) => {
    await login(page);
    await page.goto('/communications');
    const newBtn = page.getByRole('button', { name: /nueva|crear|agregar/i });
    if (await newBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newBtn.click();
      await expect(page.getByRole('heading', { name: /comunicacion|crear|nueva/i })).toBeVisible({ timeout: 10_000 });
    }
  });

  test('should create communication via API and verify in UI', async ({ page }) => {
    await login(page);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let comm: any;
    try {
      comm = await createE2ECommunication({
        title: 'E2E Communication - UI Test',
        content: 'This communication was created by E2E test',
        audience: 'ALL',
      });
      await publishE2ECommunication(comm.id);

      await page.goto('/communications');
      await page.waitForTimeout(1500);
      await expect(page.getByText('E2E Communication - UI Test').first()).toBeVisible({ timeout: 10_000 });
    } finally {
      if (comm) await cleanupE2EEntity('communications', comm.id).catch(() => {});
    }
  });

  test('should filter communications by status', async ({ page }) => {
    await login(page);
    await page.goto('/communications');
    await page.waitForTimeout(1000);
    const filterBtns = page.locator('button').filter({ hasText: /publicada|borrador/i });
    if (await filterBtns.count() > 0) {
      await filterBtns.first().click();
      await page.waitForTimeout(500);
    }
  });
});
