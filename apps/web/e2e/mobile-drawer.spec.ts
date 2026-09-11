import { test, expect, type Page } from '@playwright/test';

const PASSWORD = process.env.E2E_PASSWORD || 'Demo1234!';
const EMAIL = process.env.E2E_EMAIL || 'admin@demo-school.dev';
const PARENT_EMAIL = process.env.E2E_PARENT_EMAIL || 'parent@demo-school.dev';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/(dashboard|select-institution)/, { timeout: 15_000 });
  if (page.url().includes('select-institution')) {
    const options = page.locator('main button, [role="main"] button');
    if ((await options.count().catch(() => 0)) > 0) {
      await options.first().click();
      const cont = page.getByRole('button', { name: 'Continuar' });
      if (await cont.isVisible({ timeout: 3_000 }).catch(() => false)) await cont.click();
    }
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
  }
  await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible({ timeout: 15_000 });
}

test.describe('Mobile drawer (viewport móvil)', () => {
  test('drawer abre dentro del viewport, navega y cierra', async ({ page }) => {
    test.skip(
      test.info().project.name !== 'mobile-chrome',
      'Solo viewport móvil (Pixel 5)',
    );
    await login(page, EMAIL);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    // Botón hamburguesa visible en móvil (nombre exacto para no colisionar
    // con "Menú de usuario"). Se espera a que la página se estabilice para
    // evitar condiciones de carrera con el render inicial.
    await page.waitForLoadState('networkidle').catch(() => undefined);
    const toggle = page.getByRole('button', { name: 'Toggle menu', exact: true });
    await expect(toggle).toBeVisible({ timeout: 10_000 });
    await toggle.click();

    // Drawer visible y completamente dentro del viewport (tras la transición).
    const dialog = page.getByRole('dialog', { name: /navegación/i });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(async () => (await dialog.boundingBox())?.x ?? -999, { timeout: 10_000 })
      .toBeGreaterThanOrEqual(-1);
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);

    // Expandir categoría y navegar: el drawer se cierra tras navegar
    // (se desliza fuera del viewport: -translate-x-full).
    await page.getByRole('button', { name: /Categoría Trabajo académico/i }).click();
    await dialog.getByRole('link', { name: 'Tareas' }).click();
    await page.waitForURL(/\/tasks/, { timeout: 10_000 });
    await expect
      .poll(async () => {
        const b = await dialog.boundingBox();
        return b ? b.x + b.width : -999;
      }, { timeout: 10_000 })
      .toBeLessThanOrEqual(1);

    // Sin overflow horizontal.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    // Touch targets: botones de categoría con altura táctil.
    await toggle.click();
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    const catBtn = page.getByRole('button', { name: /Categoría Inicio/i });
    const height = await catBtn.evaluate((el) => (el as HTMLElement).getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(40);

    // Cierre con Escape (vuelve fuera del viewport).
    await page.keyboard.press('Escape');
    await expect
      .poll(async () => {
        const b = await dialog.boundingBox();
        return b ? b.x + b.width : -999;
      }, { timeout: 10_000 })
      .toBeLessThanOrEqual(1);
  });

  test('selector de hijo usable en móvil', async ({ page }) => {
    test.skip(
      test.info().project.name !== 'mobile-chrome',
      'Solo viewport móvil (Pixel 5)',
    );
    await login(page, PARENT_EMAIL);

    const selector = page.getByLabel('Hijo:');
    await expect(selector).toBeVisible({ timeout: 15_000 });
    const height = await selector.evaluate((el) => (el as HTMLElement).getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(24);
  });
});
