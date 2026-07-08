import { test, expect } from '@playwright/test';
import { ApplicantsPage } from '../../pom/ApplicantsPage';
import { CasesPage } from '../../pom/CasesPage';
import { LoginPage } from '../../pom/LoginPage';
import { TEST_USERS, TEST_APPLICANT_FIELDS, generateUniqueCedula, TEST_CASE } from '../../fixtures/test-data';
import { loginAsAdminOrSkip } from '../helpers/login-helper';

const PASSWORD = process.env.TEST_PASSWORD || '';

test.describe('CP-04: Creación de Caso Legal (BONUS)', () => {

  test('4.1 — Creación exitosa de caso', async ({ browser }) => {
    const ctx = await loginAsAdminOrSkip(browser, TEST_USERS.admin.cedula, PASSWORD);
    if (!ctx) return;

    const { page } = ctx;

    // --- Crear solicitante temporal ---
    const cedulaUnica = generateUniqueCedula();
    const applicantName = `Test ${Date.now()}`;

    const applicantsPage = new ApplicantsPage(page);
    await applicantsPage.navigate();
    await applicantsPage.openNewApplicant();

    await applicantsPage.fillForm({
      nombres: applicantName,
      apellidos: 'E2E Case',
      fecha_nacimiento: '1990-01-01',
      correo_electronico: `case.test.${Date.now()}@example.com`,
      telefono_celular: '0412-9999999',
      cedula_solicitante: cedulaUnica,
    });

    await page.locator('text=Femenino').click();
    await page.locator('button[role="combobox"]', { hasText: 'Seleccione' }).first().click();
    await page.locator('[role="option"]', { hasText: TEST_APPLICANT_FIELDS.estado_civil }).click();

    await applicantsPage.fillLocationCascade(
      TEST_APPLICANT_FIELDS.estado,
      TEST_APPLICANT_FIELDS.municipio,
      TEST_APPLICANT_FIELDS.parroquia,
    );

    await applicantsPage.save();
    await applicantsPage.waitForSaveComplete();

    const foundApplicant = await applicantsPage.findInTable(cedulaUnica);
    expect(foundApplicant).toBe(true);

    // --- Crear caso ---
    const casesPage = new CasesPage(page);
    await page.goto('/cases');
    await page.waitForSelector('h1');
    await casesPage.openCreateCase();
    await casesPage.searchSolicitante(cedulaUnica);

    // Jerarquía legal (depende de catálogos en BD)
    try {
      const materiaCombo = page.locator('[role="combobox"]').first();
      if (await materiaCombo.isVisible({ timeout: 3000 })) {
        await materiaCombo.click();
        const firstOpt = page.locator('[role="option"]').first();
        if (await firstOpt.isVisible()) {
          await firstOpt.click();
          await page.waitForTimeout(1000);

          // Intentar niveles 2-4 si existen
          for (let i = 1; i <= 3; i++) {
            const combo = page.locator('[role="combobox"]').nth(i);
            if (await combo.isVisible({ timeout: 3000 })) {
              await combo.click();
              const opt = page.locator('[role="option"]').first();
              if (await opt.isVisible()) {
                await opt.click();
                await page.waitForTimeout(1000);
              }
            }
          }
        }
      }
    } catch {
      // Catálogos no disponibles — continuar de todas formas
    }

    await casesPage.fillSintesis(TEST_CASE.sintesis);
    await casesPage.save();
    await casesPage.waitForSaveComplete();

    const foundCase = await casesPage.findInTable(TEST_CASE.sintesis);
    expect(foundCase).toBe(true);

    await page.context().close();
  });

  test('4.2 — Validación de campos requeridos en creación de caso', async ({ browser }) => {
    const ctx = await loginAsAdminOrSkip(browser, TEST_USERS.admin.cedula, PASSWORD);
    if (!ctx) return;

    const { page } = ctx;
    const casesPage = new CasesPage(page);

    await casesPage.navigate();
    await casesPage.openCreateCase();

    await casesPage.save();

    const isDialogVisible = await page.locator('[data-testid="case-create-dialog"]').isVisible();
    expect(isDialogVisible).toBe(true);

    const errorEls = page.locator('.text-red-500');
    const count = await errorEls.count();
    expect(count).toBeGreaterThanOrEqual(1);

    await page.context().close();
  });
});