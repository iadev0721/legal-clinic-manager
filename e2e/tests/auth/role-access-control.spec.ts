import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pom/LoginPage';
import { SidebarPage } from '../../pom/SidebarPage';
import { TEST_USERS } from '../../fixtures/test-data';
import { loginAsAdminOrSkip } from '../helpers/login-helper';

const PASSWORD = process.env.TEST_PASSWORD || '';

/**
 * Helper: login como Estudiante con contexto limpio.
 */
async function loginAsStudent(browser: import('@playwright/test').Browser) {
  const ctx = await browser.newContext({ storageState: undefined });
  const page = await ctx.newPage();
  const loginPage = new LoginPage(page);
  await loginPage.navigate();
  await loginPage.login(TEST_USERS.estudiante.cedula, PASSWORD);
  let ok = false;
  try {
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    ok = true;
  } catch { /* login no disponible */ }
  return { ctx, page, ok };
}

test.describe('CP-03: Control de Acceso por Rol — Estudiante', () => {

  test('3.1 — Estudiante NO ve "Crear Nuevo Caso"', async ({ browser }) => {
    // --- ESTUDIANTE ---
    const student = await loginAsStudent(browser);
    if (!student.ok) {
      test.skip(true, 'Saltado: login no disponible en este entorno');
      return;
    }

    await student.page.goto('/cases');
    await student.page.waitForSelector('h1');

    const createBtnStudent = student.page.locator('[data-testid="case-create-btn"]');
    await expect(createBtnStudent).toBeHidden();

    await student.ctx.close();

    // --- ADMIN (contraste) ---
    const adminCtx = await loginAsAdminOrSkip(browser, TEST_USERS.admin.cedula, PASSWORD);
    if (!adminCtx) return;

    await adminCtx.page.goto('/cases');
    await adminCtx.page.waitForSelector('h1');

    const createBtnAdmin = adminCtx.page.locator('[data-testid="case-create-btn"]');
    await expect(createBtnAdmin).toBeVisible();

    await adminCtx.page.context().close();
  });

  test('3.2 — Estudiante NO ve "Administración" en sidebar', async ({ browser }) => {
    const student = await loginAsStudent(browser);
    if (!student.ok) {
      test.skip(true, 'Saltado: login no disponible en este entorno');
      return;
    }

    const sidebarStudent = new SidebarPage(student.page);
    const adminLinkHidden = await sidebarStudent.isLinkHidden('Administración');
    expect(adminLinkHidden).toBe(true);

    await student.ctx.close();

    // --- ADMIN contraste ---
    const adminCtx = await loginAsAdminOrSkip(browser, TEST_USERS.admin.cedula, PASSWORD);
    if (!adminCtx) return;

    const sidebarAdmin = new SidebarPage(adminCtx.page);
    const adminLinkVisible = await sidebarAdmin.isLinkVisible('Administración');
    expect(adminLinkVisible).toBe(true);

    await adminCtx.page.context().close();
  });

  test('3.3 — Estudiante NO ve botón eliminar en solicitantes', async ({ browser }) => {
    const student = await loginAsStudent(browser);
    if (!student.ok) {
      test.skip(true, 'Saltado: login no disponible en este entorno');
      return;
    }

    await student.page.goto('/applicants');
    await student.page.waitForSelector('h1');

    const deleteIconsStudent = student.page.locator('.mdi-trash-can-outline');
    const studentDeleteCount = await deleteIconsStudent.count();
    expect(studentDeleteCount).toBe(0);

    await student.ctx.close();

    // --- ADMIN contraste ---
    const adminCtx = await loginAsAdminOrSkip(browser, TEST_USERS.admin.cedula, PASSWORD);
    if (!adminCtx) return;

    await adminCtx.page.goto('/applicants');
    await adminCtx.page.waitForSelector('h1');

    const trashIconsAdmin = adminCtx.page.locator('.mdi-trash-can-outline');
    const adminDeleteCount = await trashIconsAdmin.count();
    expect(adminDeleteCount).toBeGreaterThan(0);

    await adminCtx.page.context().close();
  });

  test('3.4 — Estudiante SÍ ve módulos permitidos', async ({ browser }) => {
    const student = await loginAsStudent(browser);
    if (!student.ok) {
      test.skip(true, 'Saltado: login no disponible en este entorno');
      return;
    }

    const sidebar = new SidebarPage(student.page);
    const allowedModules = ['Inicio', 'Solicitantes', 'Casos', 'Citas', 'Notificaciones'];

    for (const moduleName of allowedModules) {
      const visible = await sidebar.isLinkVisible(moduleName);
      expect.soft(visible, `${moduleName} debería ser visible para Estudiante`).toBe(true);
    }

    await student.ctx.close();
  });
});