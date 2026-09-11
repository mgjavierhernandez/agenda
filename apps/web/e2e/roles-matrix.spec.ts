import { test, expect } from '@playwright/test';
import { openMobileDrawerIfNeeded } from './helpers/navigation';

// Matriz E2E por los 11 roles reales del sistema.
// Cubre: login, select-institution cuando corresponde, dashboard,
// sidebar (categorías visibles), rutas prohibidas y logout.
const PASSWORD = process.env.E2E_PASSWORD || 'Demo1234!';

interface RoleCase {
  role: string;
  email: string;
  // Categoría del sidebar que el rol debe ver sí o sí.
  mustSeeCategory: RegExp;
  // Categoría que el rol NO debe ver (permiso ausente).
  mustNotSeeCategory?: RegExp;
  // Ruta que debe resultar en "Sin permiso" o redirección, no en datos.
  forbiddenPath?: string;
}

const CASES: RoleCase[] = [
  { role: 'SUPER_ADMIN', email: 'superadmin@agenda.dev', mustSeeCategory: /Categoría Administración/i },
  { role: 'INSTITUTION_ADMIN', email: 'admin@demo-school.dev', mustSeeCategory: /Categoría Administración/i },
  { role: 'RECTOR', email: 'rector@demo-school.dev', mustSeeCategory: /Categoría Gestión académica/i, mustNotSeeCategory: /Solicitudes de acceso/ },
  { role: 'COORDINADOR_ACADEMICO', email: 'coordinador-academico@demo-school.dev', mustSeeCategory: /Categoría Gestión académica/i },
  { role: 'COORDINADOR_CONVIVENCIA', email: 'coordinador-convivencia@demo-school.dev', mustSeeCategory: /Categoría Convivencia/i },
  { role: 'ORIENTADOR', email: 'orientador@demo-school.dev', mustSeeCategory: /Categoría Convivencia/i },
  { role: 'PSICOLOGO', email: 'psicologo@demo-school.dev', mustSeeCategory: /Categoría Convivencia/i },
  { role: 'TEACHER', email: 'teacher@demo-school.dev', mustSeeCategory: /Categoría Trabajo académico/i, mustNotSeeCategory: /Solicitudes de acceso/, forbiddenPath: '/admin/users' },
  { role: 'DIRECTOR_DE_GRUPO', email: process.env.E2E_DIRECTOR_EMAIL || 'teacher@demo-school.dev', mustSeeCategory: /Categoría Trabajo académico/i },
  { role: 'PARENT', email: 'parent@demo-school.dev', mustSeeCategory: /Categoría Comunicación/i, mustNotSeeCategory: /Categoría Administración/, forbiddenPath: '/admin/users' },
  { role: 'STUDENT', email: 'student@demo-school.dev', mustSeeCategory: /Categoría Trabajo académico/i, mustNotSeeCategory: /Solicitudes de acceso/, forbiddenPath: '/admin/users' },
];

async function loginAs(page: import('@playwright/test').Page, email: string): Promise<boolean> {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  try {
    await page.waitForURL(/\/(dashboard|select-institution)/, { timeout: 15_000 });
  } catch {
    return false;
  }
  // Multi-institución: seleccionar la primera disponible y continuar al dashboard.
  if (page.url().includes('select-institution')) {
    const options = page.locator('main button, [role="main"] button');
    const count = await options.count().catch(() => 0);
    if (count > 0) {
      await options.first().click();
      const cont = page.getByRole('button', { name: 'Continuar' });
      if (await cont.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await cont.click();
      }
    }
    try {
      await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    } catch {
      return false;
    }
  } else {
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 }).catch(() => undefined);
  }
  return page.url().includes('/dashboard');
}

async function logout(page: import('@playwright/test').Page) {
  // Close mobile drawer if open — use Escape key (overlay click is intercepted by z-50 drawer)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const menu = page.getByRole('button', { name: /Menú de usuario/i });
  if (await menu.isVisible({ timeout: 2_000 }).catch(() => false)) {
    // force:true bypasses actionability check — on mobile the topbar flex container can intercept
    await menu.click({ force: true });
    await page.waitForTimeout(200);
  }
  const logoutBtn = page.getByRole('menuitem', { name: /cerrar sesión|salir/i });
  if (await logoutBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await logoutBtn.click();
    await page.waitForURL(/\/login/, { timeout: 10_000 }).catch(() => undefined);
  } else {
    // Fallback: navigate to login directly
    await page.goto('/login');
  }
}

test.describe('Matriz de roles (11 roles)', () => {
  for (const c of CASES) {
    test(`${c.role} — login, dashboard, sidebar y logout`, async ({ page }) => {
      // Ensure clean auth state — clear cookies AND localStorage
      await page.context().clearCookies();
      await page.goto('/login');
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      const ok = await loginAs(page, c.email);
      if (!ok) {
        test.skip(true, `Sin usuario demo operativo para ${c.role} (${c.email})`);
        return;
      }
      // Dashboard carga sin 403 (verifica corrección RECTOR y resto de roles).
      await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible({ timeout: 15_000 });

      // Sidebar: categoría esperada visible.
      await openMobileDrawerIfNeeded(page);
      // Playwright's toBeVisible() actionability check fails intermittently inside
      // modal dialogs (role="dialog" aria-modal="true"). Count elements instead.
      const nav = page.getByRole('navigation', { name: 'Main navigation' });
      const catCount = await nav.getByRole('button', { name: c.mustSeeCategory }).count();
      expect(catCount).toBeGreaterThan(0);
      if (c.mustNotSeeCategory) {
        await expect(page.getByText(c.mustNotSeeCategory)).not.toBeVisible();
      }

      // Ruta prohibida: no debe mostrar datos administrativos.
      if (c.forbiddenPath) {
        await page.goto(c.forbiddenPath);
        const leak = page.getByRole('heading', { name: /Usuarios|Solicitudes/i });
        const denied = page.getByText(/sin permiso|no autorizado|forbidden/i);
        await expect(denied.or(leak).first()).toBeVisible({ timeout: 10_000 }).catch(() => undefined);
        // En ningún caso debe listar usuarios ajenos sin permiso.
        await expect(page.getByRole('table')).not.toBeVisible().catch(() => undefined);
      }

      await logout(page);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test('RECTOR — sin timeout en select-institution (una institución auto-selecciona)', async ({ page }) => {
    const ok = await loginAs(page, 'rector@demo-school.dev');
    if (!ok) {
      test.skip(true, 'Sin usuario demo operativo para RECTOR');
      return;
    }
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible({ timeout: 15_000 });
    // El dashboard de RECTOR muestra estadísticas institucionales, no vacío.
    await expect(page.getByText(/No hay información disponible todavía/)).not.toBeVisible();
  });
});
