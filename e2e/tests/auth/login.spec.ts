import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pom/LoginPage';
import { SidebarPage } from '../../pom/SidebarPage';
import { TEST_USERS } from '../../fixtures/test-data';
import { loginAsAdminOrSkip } from '../helpers/login-helper';

const PASSWORD = process.env.TEST_PASSWORD || '';

test.describe('CP-01: Autenticación y Control de Acceso', () => {

  test('1.1 — Login exitoso con credenciales Admin', async ({ browser }) => {
    const ctx = await loginAsAdminOrSkip(browser, TEST_USERS.admin.cedula, PASSWORD);
    if (!ctx) return; // skipped

    const { page } = ctx;

    // Assert: sidebar muestra rol Administrador
    const sidebar = new SidebarPage(page);
    const role = await sidebar.getRole();
    expect(role).toContain('Administrador');

    await page.context().close();
  });

  test('1.2 — Login fallido con credenciales inválidas', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    const loginPage = new LoginPage(page);

    await loginPage.navigate();
    await loginPage.login(TEST_USERS.admin.cedula, 'wrong-password-123');

    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/login');

    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).not.toBeNull();
    if (errorMsg) {
      expect(errorMsg.toLowerCase()).toContain('credencial');
    }

    await ctx.close();
  });

  test('1.3 — Campos vacíos — validación HTML5', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    const loginPage = new LoginPage(page);

    await loginPage.navigate();
    await loginPage.submitButton.click();
    await page.waitForTimeout(1000);

    expect(page.url()).toContain('/login');

    const cedulaInput = page.locator('input[placeholder="12.345.678"]');
    const isValid = await cedulaInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);

    await ctx.close();
  });

  test('1.4 — Redirección de ruta protegida', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();

    await page.context().clearCookies();
    await page.goto('/dashboard');

    await page.waitForURL('**/login', { timeout: 10_000 });

    await ctx.close();
  });

  test('1.5 — Cierre de sesión (Logout)', async ({ browser }) => {
    const ctx = await loginAsAdminOrSkip(browser, TEST_USERS.admin.cedula, PASSWORD);
    if (!ctx) return;

    const { page } = ctx;

    const sidebar = new SidebarPage(page);
    await sidebar.logoutClick();

    await page.waitForURL('**/login', { timeout: 10_000 });

    await page.context().close();
  });
});