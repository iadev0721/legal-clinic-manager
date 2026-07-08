import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pom/LoginPage';
import { ApplicantsPage } from '../../pom/ApplicantsPage';
import { TEST_USERS, TEST_APPLICANT_FIELDS, generateUniqueCedula } from '../../fixtures/test-data';
import { loginAsAdminOrSkip } from '../helpers/login-helper';

const PASSWORD = process.env.TEST_PASSWORD || '';

test.describe('CP-02: Registro de Solicitantes', () => {

  test('2.1 — Creación exitosa con datos válidos', async ({ browser }) => {
    const ctx = await loginAsAdminOrSkip(browser, TEST_USERS.admin.cedula, PASSWORD);
    if (!ctx) return; // skipped

    const { page } = ctx;
    const applicantsPage = new ApplicantsPage(page);
    const cedulaUnica = generateUniqueCedula();

    await applicantsPage.navigate();
    await applicantsPage.openNewApplicant();

    await applicantsPage.fillForm({
      nombres: TEST_APPLICANT_FIELDS.nombres,
      apellidos: TEST_APPLICANT_FIELDS.apellidos,
      fecha_nacimiento: TEST_APPLICANT_FIELDS.fecha_nacimiento,
      correo_electronico: `test.${Date.now()}@example.com`,
      telefono_celular: TEST_APPLICANT_FIELDS.telefono_celular,
      cedula_solicitante: cedulaUnica,
    });

    await page.locator('text=Femenino').click();

    await page.locator('button[role="combobox"]', { hasText: 'Seleccione' }).first().click();
    await page.locator('[role="option"]', { hasText: TEST_APPLICANT_FIELDS.estado_civil }).click();

    await applicantsPage.fillLocationCascade(
      TEST_APPLICANT_FIELDS.estado,
      TEST_APPLICANT_FIELDS.municipio,
      TEST_APPLICANT_FIELDS.parroquia
    );

    await applicantsPage.save();
    await applicantsPage.waitForSaveComplete();

    const found = await applicantsPage.findInTable(cedulaUnica);
    expect(found).toBe(true);

    await page.context().close();
  });

  test('2.2 — Validación de formato de cédula', async ({ browser }) => {
    const ctx = await loginAsAdminOrSkip(browser, TEST_USERS.admin.cedula, PASSWORD);
    if (!ctx) return;

    const { page } = ctx;
    const applicantsPage = new ApplicantsPage(page);

    await applicantsPage.navigate();
    await applicantsPage.openNewApplicant();

    const cedulaNumInput = page.locator('#cedula_solicitante');
    await cedulaNumInput.fill('12abc34');

    const value = await cedulaNumInput.inputValue();
    expect(value).toBe('1234');

    await page.context().close();
  });

  test('2.3 — Cédula duplicada', async ({ browser }) => {
    const ctx = await loginAsAdminOrSkip(browser, TEST_USERS.admin.cedula, PASSWORD);
    if (!ctx) return;

    const { page } = ctx;
    const applicantsPage = new ApplicantsPage(page);

    await applicantsPage.navigate();
    await applicantsPage.openNewApplicant();

    const cedulaAdmin = TEST_USERS.admin.cedula;

    await applicantsPage.fillForm({
      nombres: TEST_APPLICANT_FIELDS.nombres,
      apellidos: TEST_APPLICANT_FIELDS.apellidos,
      fecha_nacimiento: TEST_APPLICANT_FIELDS.fecha_nacimiento,
      correo_electronico: `dup.${Date.now()}@example.com`,
      cedula_solicitante: cedulaAdmin,
    });

    await page.locator('text=Femenino').click();

    await page.locator('button[role="combobox"]', { hasText: 'Seleccione' }).first().click();
    await page.locator('[role="option"]', { hasText: TEST_APPLICANT_FIELDS.estado_civil }).click();

    await applicantsPage.fillLocationCascade(
      TEST_APPLICANT_FIELDS.estado,
      TEST_APPLICANT_FIELDS.municipio,
      TEST_APPLICANT_FIELDS.parroquia
    );

    await applicantsPage.save();

    const isDialogVisible = await page.locator('[data-testid="applicant-dialog"]').isVisible();
    expect(isDialogVisible).toBe(true);

    const errors = await applicantsPage.getValidationErrors();
    const hasDuplicateError = errors.some(e =>
      e.toLowerCase().includes('ya existe') ||
      e.toLowerCase().includes('duplicada') ||
      e.toLowerCase().includes('existente')
    );
    expect(hasDuplicateError).toBe(true);

    await page.context().close();
  });

  test('2.4 — Campos requeridos vacíos', async ({ browser }) => {
    const ctx = await loginAsAdminOrSkip(browser, TEST_USERS.admin.cedula, PASSWORD);
    if (!ctx) return;

    const { page } = ctx;
    const applicantsPage = new ApplicantsPage(page);

    await applicantsPage.navigate();
    await applicantsPage.openNewApplicant();

    await applicantsPage.save();

    const isDialogVisible = await page.locator('[data-testid="applicant-dialog"]').isVisible();
    expect(isDialogVisible).toBe(true);

    const errors = await applicantsPage.getValidationErrors();
    expect(errors.length).toBeGreaterThanOrEqual(1);

    await page.context().close();
  });
});