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

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible({ timeout: 10_000 });
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill('wrong@test.com');
    await page.locator('#password').fill('WrongPassword123!');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('should logout and redirect to login', async ({ page }) => {
    await login(page);
    const userButton = page.locator('header button').last();
    await userButton.click();
    await page.getByRole('button', { name: /cerrar sesión/i }).click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('should not access protected route after logout', async ({ page }) => {
    await login(page);
    const userButton = page.locator('header button').last();
    await userButton.click();
    await page.getByRole('button', { name: /cerrar sesión/i }).click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });
});
