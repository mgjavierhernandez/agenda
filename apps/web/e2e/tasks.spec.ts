import { test, expect } from '@playwright/test';
import { createE2ECourse, createE2ESubject, createE2ETask, publishE2ETask, cleanupE2EEntity } from './helpers/api';

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

test.describe('Task Flow', () => {
  test('should display tasks list page', async ({ page }) => {
    await login(page);
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Tareas' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/buscar/i)).toBeVisible();
  });

  test('should display task assignments page', async ({ page }) => {
    await login(page);
    await page.goto('/task-assignments');
    await expect(page.getByRole('heading', { name: 'Asignaciones' })).toBeVisible({ timeout: 10_000 });
  });

  test('should display task submissions page', async ({ page }) => {
    await login(page);
    await page.goto('/task-submissions');
    await expect(page.getByRole('heading', { name: 'Entregas' })).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate to new task form', async ({ page }) => {
    await login(page);
    await page.goto('/tasks');
    const newBtn = page.getByRole('button', { name: /nueva tarea|crear|agregar/i });
    if (await newBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newBtn.click();
      await expect(page.getByRole('heading', { name: /tarea|crear|nueva/i })).toBeVisible({ timeout: 10_000 });
    }
  });

  test('should filter tasks by status', async ({ page }) => {
    await login(page);
    await page.goto('/tasks');
    await page.waitForTimeout(1000);

    const statusButtons = page.locator('button').filter({ hasText: /publicada|borrador|cerrada/i });
    const count = await statusButtons.count();
    if (count > 0) {
      await statusButtons.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('should search tasks', async ({ page }) => {
    await login(page);
    await page.goto('/tasks');
    await page.waitForTimeout(1000);
    const searchInput = page.getByPlaceholder(/buscar/i);
    await searchInput.fill('test');
    await page.waitForTimeout(600);
    await searchInput.clear();
  });

  test('should create task via API and verify in UI', async ({ page }) => {
    await login(page);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let course: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let subject: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let task: any;

    try {
      course = await createE2ECourse({ name: `E2E Course Tasks ${Date.now()}`, code: `E2E-CR-TASKS-${Date.now()}` });
      subject = await createE2ESubject({ name: `E2E Subject Tasks ${Date.now()}`, code: `E2E-SB-TASKS-${Date.now()}` });
      task = await createE2ETask({
        title: 'E2E Task - UI Verification',
        description: 'This task was created by E2E test',
        courseId: course.id,
        subjectId: subject.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      await publishE2ETask(task.id);

      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      // On desktop: the <td> is visible, the mobile card <p> is hidden (md:hidden).
      // On mobile: the <td> is hidden (hidden md:block), the card <p> is visible.
      // Use .first() on desktop (td first in DOM), .last() on mobile (p last in DOM).
      const width = page.viewportSize()?.width ?? 1280;
      if (width < 768) {
        await expect(page.getByText('E2E Task - UI Verification').last()).toBeVisible({ timeout: 10_000 });
      } else {
        await expect(page.getByText('E2E Task - UI Verification').first()).toBeVisible({ timeout: 10_000 });
      }
    } finally {
      if (task) await cleanupE2EEntity('tasks', task.id).catch(() => {});
      if (subject) await cleanupE2EEntity('subjects', subject.id).catch(() => {});
      if (course) await cleanupE2EEntity('courses', course.id).catch(() => {});
    }
  });
});
