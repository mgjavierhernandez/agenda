import { test, expect } from '@playwright/test';
import { openMobileDrawerIfNeeded } from './helpers/navigation';

const EMAIL = process.env.E2E_EMAIL || 'admin@demo-school.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'Demo1234!';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/(dashboard|select-institution)/, { timeout: 15_000 });
  if (page.url().includes('select-institution')) {
    const btn = page.locator('button').filter({ hasText: /Institution|Colegio|Escuela|E2E/ }).first();
    if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) await btn.click();
  }
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
}

test.describe('Menu por categorias + Directores de grupo (admin)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('muestra menu organizado, expande categoria y carga Directores sin uuid error', async ({ page }) => {
    const isMobile = (page.viewportSize()?.width ?? 1280) < 1024;
    if (isMobile) {
      await openMobileDrawerIfNeeded(page);
    }
    // On desktop, the visible nav is the only one in the accessibility tree.
    // On mobile, scope to the dialog.
    const nav = isMobile
      ? page.getByRole('dialog', { name: 'Menú de navegación' }).getByRole('navigation', { name: 'Main navigation' })
      : page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible();

    // Categorias visibles — wait for first category to be visible, then count all
    await expect(nav.getByRole('button', { name: /Categoría Inicio/i })).toBeVisible({ timeout: 10_000 });
    for (const cat of ['Inicio', 'Gestión académica', 'Gestión docente', 'Comunicación', 'Administración']) {
      const count = await nav.getByRole('button', { name: new RegExp(`Categoría ${cat}`, 'i') }).count();
      expect(count).toBeGreaterThan(0);
    }

    // Expandir Gestion docente y acceder a Directores de grupo
    const catBtn = nav.getByRole('button', { name: /Categoría Gestión docente/i });
    if ((await catBtn.getAttribute('aria-expanded')) !== 'true') {
      await catBtn.click({ force: true });
    }
    await nav.getByText('Directores de grupo').click({ force: true });
    await page.waitForURL(/\/course-directors/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Directores de grupo' })).toBeVisible({ timeout: 10_000 });

    // No debe aparecer el error UUID
    await expect(page.getByText('Validation failed (uuid is expected)')).toHaveCount(0);
    await expect(page.getByText('Something went wrong')).toHaveCount(0);

    // La pagina lista o muestra estado vacio valido (no error)
    const body = await page.textContent('body');
    expect(body).toMatch(/Directores de grupo/);
  });
});
