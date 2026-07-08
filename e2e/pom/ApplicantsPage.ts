import { type Page, type Locator } from '@playwright/test';

export class ApplicantsPage {
  readonly page: Page;
  readonly newApplicantButton: Locator;
  readonly applicantDialog: Locator;
  readonly saveButton: Locator;
  readonly form: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newApplicantButton = page.locator('[data-testid="new-applicant-btn"]');
    this.applicantDialog = page.locator('[data-testid="applicant-dialog"]');
    this.saveButton = page.locator('[data-testid="save-applicant"]');
    this.form = page.locator('#applicant-form');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/applicants');
    await this.page.waitForSelector('h1');
  }

  async openNewApplicant(): Promise<void> {
    await this.newApplicantButton.click();
    await this.applicantDialog.waitFor({ state: 'visible' });
  }

  /**
   * Llena el formulario de nuevo solicitante con datos proporcionados.
   * Solo llena los campos provistos en el objeto data.
   */
  async fillForm(data: Record<string, string>): Promise<void> {
    for (const [field, value] of Object.entries(data)) {
      const input = this.form.locator(`#${field}`);
      if (await input.isVisible()) {
        await input.fill(value);
      }
    }
  }

  /**
   * Selecciona un valor en la cascada de ubicación (Estado → Municipio → Parroquia).
   * Cada nivel es un FilterSelect con placeholder específico.
   */
  async fillLocationCascade(
    estado: string,
    municipio: string,
    parroquia: string
  ): Promise<void> {
    // Estado — usually the first cascading select
    const estadoSelect = this.page.locator(
      'button[role="combobox"]',
      { hasText: 'Seleccione un estado' }
    );
    await estadoSelect.click();
    await this.page.locator('[role="option"]', { hasText: estado }).click();

    // Municipio
    const municipioSelect = this.page.locator(
      'button[role="combobox"]',
      { hasText: 'Seleccione un municipio' }
    );
    await municipioSelect.click();
    await this.page.locator('[role="option"]', { hasText: municipio }).click();

    // Parroquia
    const parroquiaSelect = this.page.locator(
      'button[role="combobox"]',
      { hasText: 'Seleccione una parroquia' }
    );
    await parroquiaSelect.click();
    await this.page.locator('[role="option"]', { hasText: parroquia }).click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * Espera a que el modal se cierre después de guardar.
   */
  async waitForSaveComplete(): Promise<void> {
    await this.applicantDialog.waitFor({ state: 'hidden', timeout: 10_000 });
  }

  /**
   * Busca un solicitante en la tabla por su cédula y nombre.
   * Retorna true si existe una fila con ese texto.
   */
  async findInTable(searchText: string): Promise<boolean> {
    // Esperar a que se recargue la tabla
    await this.page.waitForTimeout(1000);
    const table = this.page.locator('table');
    const rowCount = await table.locator('tbody tr').count();
    for (let i = 0; i < rowCount; i++) {
      const text = await table.locator('tbody tr').nth(i).textContent();
      if (text && text.includes(searchText)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Obtiene los mensajes de error de validación visibles en el formulario.
   */
  async getValidationErrors(): Promise<string[]> {
    const errors: string[] = [];
    const errorEls = this.applicantDialog.locator('.text-red-500');
    const count = await errorEls.count();
    for (let i = 0; i < count; i++) {
      const text = await errorEls.nth(i).textContent();
      if (text) errors.push(text);
    }
    return errors;
  }
}