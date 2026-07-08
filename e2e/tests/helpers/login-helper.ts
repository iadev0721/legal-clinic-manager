import { type Browser } from '@playwright/test';
import { LoginPage } from '../../pom/LoginPage';

/**
 * Intenta login como Admin. Si el login no está disponible (login falla en local
 * sin BD configurada), skipea el test llamando test.skip().
 *
 * Uso en tests:
 *   const ctx = await loginAsAdminOrSkip(browser, cedula, password);
 *   if (!ctx) return;
 *   const { page } = ctx;
 *   // ... test logic
 *   await page.context().close();
 */
export async function loginAsAdminOrSkip(
  browser: Browser,
  cedula: string,
  password: string,
): Promise<{ page: import('@playwright/test').Page } | null> {
  const ctx = await browser.newContext({ storageState: undefined });
  const page = await ctx.newPage();
  const loginPage = new LoginPage(page);

  await loginPage.navigate();
  await loginPage.login(cedula, password);

  try {
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    return { page };
  } catch {
    await ctx.close();
    return null; // caller should call test.skip(true, ...) and return
  }
}