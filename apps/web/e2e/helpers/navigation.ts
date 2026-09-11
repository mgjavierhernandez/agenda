import { type Page } from '@playwright/test';

/**
 * Opens the mobile navigation drawer if on a mobile viewport.
 * On desktop (lg+), the sidebar is always visible.
 */
export async function openMobileDrawerIfNeeded(page: Page): Promise<void> {
  const isMobile = await page.evaluate(() => window.innerWidth < 1024);
  if (!isMobile) return;

  const hamburger = page.getByRole('button', { name: 'Toggle menu' });
  if (await hamburger.isVisible()) {
    await hamburger.click();
    // Wait for the dialog to be visible
    await page.getByRole('dialog', { name: 'Menú de navegación' }).waitFor({ state: 'visible', timeout: 5_000 });
  }
}

/**
 * Closes the mobile drawer if it's open.
 */
export async function closeMobileDrawerIfNeeded(page: Page): Promise<void> {
  const isMobile = await page.evaluate(() => window.innerWidth < 1024);
  if (!isMobile) return;

  // Use Escape key — clicking the overlay is intercepted by the z-50 drawer dialog
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

/**
 * Navigates via sidebar, handling mobile drawer automatically.
 */
export async function navigateViaSidebar(
  page: Page,
  category: RegExp,
  item: string,
): Promise<void> {
  await openMobileDrawerIfNeeded(page);

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const cat = nav.getByRole('button', { name: category });
  if ((await cat.getAttribute('aria-expanded')) !== 'true') {
    await cat.scrollIntoViewIfNeeded();
    await cat.click();
  }
  await nav.getByRole('link', { name: item, exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  await nav.getByRole('link', { name: item, exact: true }).click();
  // Wait for navigation and close drawer
  await page.waitForTimeout(500);
  await closeMobileDrawerIfNeeded(page);
}
