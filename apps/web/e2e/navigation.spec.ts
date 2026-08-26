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

const ROUTES = [
  { path: '/dashboard', heading: 'Bienvenido' },
  { path: '/agenda', heading: 'Agenda' },
  { path: '/students', heading: 'Estudiantes' },
  { path: '/courses', heading: 'Cursos' },
  { path: '/subjects', heading: 'Asignaturas' },
  { path: '/grades', heading: 'Calificaciones' },
  { path: '/schedules', heading: 'Horarios' },
  { path: '/tasks', heading: 'Tareas' },
  { path: '/task-assignments', heading: 'Asignaciones' },
  { path: '/task-submissions', heading: 'Entregas' },
  { path: '/communications', heading: 'Comunicaciones' },
  { path: '/communication-inbox', heading: 'Bandeja de entrada' },
  { path: '/signatures', heading: 'Firmas' },
  { path: '/notifications', heading: 'Notificaciones', exact: true },
  { path: '/academic-periods', heading: 'Periodos académicos' },
  { path: '/school-grades', heading: 'Grados académicos' },
  { path: '/guardians', heading: 'Acudientes', exact: true },
  { path: '/enrollments', heading: 'Matrículas' },
  { path: '/teacher-assignments', heading: 'Asignaciones docentes' },
];

test.describe('Navigation - Critical Routes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const route of ROUTES) {
    test(`should load ${route.path} without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto(route.path, { waitUntil: 'networkidle' });
      await expect(page.getByRole('heading', { name: route.heading, exact: route.exact })).toBeVisible({ timeout: 10_000 });

      const jsErrors = errors.filter((e) => !e.includes('ResizeObserver'));
      expect(jsErrors).toHaveLength(0);
    });
  }

  test('should navigate between routes via sidebar', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });

    await nav.getByText('Cursos').click();
    await page.waitForURL(/\/courses/);
    await expect(page.getByRole('heading', { name: 'Cursos' })).toBeVisible();

    await nav.getByText('Tareas').click();
    await page.waitForURL(/\/tasks/);
    await expect(page.getByRole('heading', { name: 'Tareas' })).toBeVisible();

    await nav.getByText('Notificaciones').click();
    await page.waitForURL(/\/notifications/);
    await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible();
  });
});
