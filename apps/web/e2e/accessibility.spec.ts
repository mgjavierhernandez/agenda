import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  await page.waitForLoadState('networkidle');
}

test.describe('Accessibility - axe-core audit', () => {
  test('dashboard should have no critical axe violations', async ({ page }) => {
    await login(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(critical).toEqual([]);
  });

  test('login page should have no critical axe violations', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(critical).toEqual([]);
  });

  test('students page should have no critical axe violations', async ({ page }) => {
    await login(page);
    await page.goto('/students');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(critical).toEqual([]);
  });

  test('tasks page should have no critical axe violations', async ({ page }) => {
    await login(page);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(critical).toEqual([]);
  });

  test('communications page should have no critical axe violations', async ({ page }) => {
    await login(page);
    await page.goto('/communications');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(critical).toEqual([]);
  });

  test('agenda page should have no critical axe violations', async ({ page }) => {
    await login(page);
    await page.goto('/agenda');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(critical).toEqual([]);
  });

  test('notifications page should have no critical axe violations', async ({ page }) => {
    await login(page);
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(critical).toEqual([]);
  });

  test('grades page should have no critical axe violations', async ({ page }) => {
    await login(page);
    await page.goto('/grades');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(critical).toEqual([]);
  });

  test('schedules page should have no critical axe violations', async ({ page }) => {
    await login(page);
    await page.goto('/schedules');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(critical).toEqual([]);
  });

  test('courses page should have no critical axe violations', async ({ page }) => {
    await login(page);
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(critical).toEqual([]);
  });
});

test.describe('Accessibility - keyboard navigation', () => {
  test('login form should be keyboard accessible', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Correo electrónico')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#password')).toBeFocused();

    await page.keyboard.press('Tab');
    const toggle = page.getByLabel('Mostrar contraseña');
    await expect(toggle).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeFocused();
  });

  test('password visibility toggle should be keyboard accessible', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const toggle = page.getByLabel('Mostrar contraseña');
    await expect(toggle).toBeVisible();
    await toggle.focus();
    await toggle.press('Space');
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
    const hideToggle = page.getByLabel('Ocultar contraseña');
    await expect(hideToggle).toBeVisible();
    await hideToggle.press('Space');
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
  });

  test('skip link should be present and functional', async ({ page }) => {
    await login(page);
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toHaveClass(/sr-only/);
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await skipLink.press('Enter');
    await page.waitForTimeout(100);
    await expect(page.locator('#main-content')).toBeFocused();
  });
});

test.describe('Accessibility - ARIA attributes', () => {
  test('sidebar should have nav landmark with aria-label', async ({ page }) => {
    await login(page);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible();
  });

  test('institution dropdown should have aria-expanded', async ({ page }) => {
    await login(page);
    const instButton = page.getByLabel('Cambiar institución');
    await expect(instButton).toBeVisible();
    await expect(instButton).toHaveAttribute('aria-expanded', 'false');
    await instButton.click();
    await expect(instButton).toHaveAttribute('aria-expanded', 'true');
  });

  test('user menu should have aria-expanded', async ({ page }) => {
    await login(page);
    const userMenuButton = page.getByLabel('Menú de usuario');
    await expect(userMenuButton).toBeVisible();
    await expect(userMenuButton).toHaveAttribute('aria-expanded', 'false');
    await userMenuButton.click();
    await expect(userMenuButton).toHaveAttribute('aria-expanded', 'true');
  });

  test('mobile menu should be a dialog', async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width: 375, height: 667 });
    const menuToggle = page.getByLabel('Toggle menu');
    await expect(menuToggle).toBeVisible();
    await menuToggle.click();
    const dialog = page.getByRole('dialog', { name: 'Menú de navegación' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('error states should have role="alert"', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Correo electrónico').fill(EMAIL);
    await page.locator('#password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Entrar' }).click();
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 10_000 });
  });

  test('headings should follow hierarchy', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const h1 = page.getByRole('heading', { level: 1, name: 'Iniciar sesión' });
    await expect(h1).toBeVisible();
  });
});

test.describe('Accessibility - forms', () => {
  test('login form inputs should have visible labels', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const emailInput = page.getByLabel('Correo electrónico');
    const passwordInput = page.locator('#password');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('form inputs should have aria-required when required', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const emailInput = page.getByLabel('Correo electrónico');
    await expect(emailInput).toHaveAttribute('aria-required', 'true');
  });
});

test.describe('Accessibility - color contrast', () => {
  test('dashboard text should have sufficient contrast', async ({ page }) => {
    await login(page);
    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();
    const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(serious).toEqual([]);
  });

  test('sidebar text should have sufficient contrast', async ({ page }) => {
    await login(page);
    const results = await new AxeBuilder({ page })
      .include('[aria-label="Main navigation"]')
      .withRules(['color-contrast'])
      .analyze();
    const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(serious).toEqual([]);
  });
});
