import { type Page, type BrowserContext } from '@playwright/test';

const E2E_EMAIL = process.env.E2E_EMAIL || 'admin@demo-school.dev';
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'Demo1234!';

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/(dashboard|select-institution)/, { timeout: 15_000 });

  if (page.url().includes('select-institution')) {
    const firstInst = page.locator('button').filter({ hasText: /Institution|Colegio|Escuela/ }).first();
    if (await firstInst.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstInst.click();
      await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    }
  }
}

export async function loginAsAdmin(page: Page) {
  await loginAs(page, E2E_EMAIL, E2E_PASSWORD);
}

export async function createAdminContext(browser: import('@playwright/test').Browser): Promise<BrowserContext> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAsAdmin(page);
  await page.close();
  return context;
}

export { expect, E2E_EMAIL, E2E_PASSWORD };
