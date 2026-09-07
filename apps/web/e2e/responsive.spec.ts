import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL || 'admin@demo-school.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'Demo1234!';

const DESKTOP = { width: 1920, height: 1080 };
const TABLET = { width: 768, height: 1024 };
const MOBILE = { width: 390, height: 844 };

async function login(page: Page, email = EMAIL, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  try {
    await page.waitForURL(/\/(dashboard|select-institution)/, { timeout: 15_000 });
  } catch {
    const errorAlert = page.getByRole('alert');
    if (await errorAlert.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await page.getByLabel('Correo electrónico').fill(email);
      await page.locator('#password').fill(password);
      await page.getByRole('button', { name: 'Entrar' }).click();
      await page.waitForURL(/\/(dashboard|select-institution)/, { timeout: 15_000 });
    } else {
      throw new Error('Login failed');
    }
  }
  if (page.url().includes('select-institution')) {
    const btn = page.locator('button').filter({ hasText: /Institution|Colegio|Escuela|E2E|Demo/ }).first();
    if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) await btn.click();
  }
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
}

async function assertNoOverflow(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
}

test.describe('Responsive - Auth', () => {
  test('login renders on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await assertNoOverflow(page);
  });

  test('login renders on tablet', async ({ page }) => {
    await page.setViewportSize(TABLET);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await assertNoOverflow(page);
  });

  test('login renders on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await assertNoOverflow(page);
  });
});

test.describe('Responsive - Layout', () => {
  test('sidebar visible on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page);
    const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(sidebar).toBeVisible();
    const hamburger = page.getByRole('button', { name: /toggle menu/i });
    await expect(hamburger).not.toBeVisible();
  });

  test('hamburger visible on mobile, sidebar hidden', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);
    const hamburger = page.getByRole('button', { name: /toggle menu/i });
    await expect(hamburger).toBeVisible();
  });

  test('hamburger opens sidebar on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);
    await page.getByRole('button', { name: /toggle menu/i }).click();
    await page.waitForTimeout(300);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible();
  });

  test('sidebar navigation works on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);
    await page.getByRole('button', { name: /toggle menu/i }).click();
    await page.waitForTimeout(300);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });

    async function openCategoryAndClick(category: RegExp, item: string) {
      const cat = nav.getByRole('button', { name: category });
      if ((await cat.getAttribute('aria-expanded')) !== 'true') {
        await cat.scrollIntoViewIfNeeded();
        await cat.click();
      }
      await nav.getByRole('link', { name: item, exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
      await nav.getByRole('link', { name: item, exact: true }).click();
    }

    await openCategoryAndClick(/Categoría Trabajo académico/i, 'Tareas');
    await page.waitForURL(/\/tasks/, { timeout: 10_000 });
  });
});

test.describe('Responsive - Dashboard', () => {
  test('dashboard on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page);
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    await assertNoOverflow(page);
  });

  test('dashboard on tablet', async ({ page }) => {
    await page.setViewportSize(TABLET);
    await login(page);
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    await assertNoOverflow(page);
  });

  test('dashboard on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    await assertNoOverflow(page);
  });
});

test.describe('Responsive - Students', () => {
  test('students list on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page);
    await page.goto('/students');
    await expect(page.getByRole('heading', { name: 'Estudiantes' })).toBeVisible();
    await assertNoOverflow(page);
  });

  test('students list on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);
    await page.goto('/students');
    await expect(page.getByRole('heading', { name: 'Estudiantes' })).toBeVisible();
    await assertNoOverflow(page);
  });

  test('desktop shows table, mobile shows cards', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page);
    await page.goto('/students');
    const table = page.locator('.hidden.md\\:block');
    await expect(table).toBeVisible();
    await page.setViewportSize(MOBILE);
    await page.waitForTimeout(500);
    const cards = page.locator('.md\\:hidden');
    await expect(cards.first()).toBeVisible();
  });

  test('student form on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page);
    await page.goto('/students/new');
    await expect(page.getByRole('heading', { name: /nuevo estudiante/i })).toBeVisible();
    await expect(page.getByLabel(/nombre/i)).toBeVisible();
    await assertNoOverflow(page);
  });

  test('student form on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);
    await page.goto('/students/new');
    await expect(page.getByRole('heading', { name: /nuevo estudiante/i })).toBeVisible();
    await expect(page.getByLabel(/nombre/i)).toBeVisible();
    await assertNoOverflow(page);
  });
});

test.describe('Responsive - Tasks', () => {
  test('tasks on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page);
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Tareas' })).toBeVisible();
    await assertNoOverflow(page);
  });

  test('tasks on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Tareas' })).toBeVisible();
    await assertNoOverflow(page);
  });
});

test.describe('Responsive - Communications', () => {
  test('communications on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page);
    await page.goto('/communications');
    await expect(page.getByRole('heading', { name: 'Comunicaciones' })).toBeVisible();
    await assertNoOverflow(page);
  });

  test('communications on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);
    await page.goto('/communications');
    await expect(page.getByRole('heading', { name: 'Comunicaciones' })).toBeVisible();
    await assertNoOverflow(page);
  });
});

test.describe('Responsive - Agenda', () => {
  test('agenda on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page);
    await page.goto('/agenda');
    await expect(page.getByRole('heading', { name: /agenda/i })).toBeVisible();
    await assertNoOverflow(page);
  });

  test('agenda on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);
    await page.goto('/agenda');
    await expect(page.getByRole('heading', { name: /agenda/i })).toBeVisible();
    await assertNoOverflow(page);
  });
});

test.describe('Responsive - Notifications', () => {
  test('notifications on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page);
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible();
    await assertNoOverflow(page);
  });

  test('notifications on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible();
    await assertNoOverflow(page);
  });
});

test.describe('Responsive - Signatures', () => {
  test('signatures on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page);
    await page.goto('/signatures');
    await expect(page.getByRole('heading', { name: 'Firmas' })).toBeVisible();
    await assertNoOverflow(page);
  });

  test('signatures on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);
    await page.goto('/signatures');
    await expect(page.getByRole('heading', { name: 'Firmas' })).toBeVisible();
    await assertNoOverflow(page);
  });
});

test.describe('Responsive - Grades', () => {
  test('grades on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page);
    await page.goto('/grades');
    await expect(page.getByRole('heading', { name: 'Notas' })).toBeVisible();
    await assertNoOverflow(page);
  });

  test('grades on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);
    await page.goto('/grades');
    await expect(page.getByRole('heading', { name: 'Notas' })).toBeVisible();
    await assertNoOverflow(page);
  });
});

test.describe('Responsive - Enrollments', () => {
  test('enrollments on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await login(page);
    await page.goto('/enrollments');
    await expect(page.getByRole('heading', { name: 'Matrículas' })).toBeVisible();
    await assertNoOverflow(page);
  });

  test('enrollments on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page);
    await page.goto('/enrollments');
    await expect(page.getByRole('heading', { name: 'Matrículas' })).toBeVisible();
    await assertNoOverflow(page);
  });
});

test.describe('Responsive - PermissionGate', () => {
  test('unauthorized user sees fallback on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await login(page, 'student@demo-school.dev', 'Demo1234!');
    await page.goto('/students/new');
    await expect(page.getByText(/Acceso no autorizado/i)).toBeVisible();
    await assertNoOverflow(page);
  });
});
