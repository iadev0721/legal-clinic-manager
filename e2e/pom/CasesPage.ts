import { type Page, type Locator } from '@playwright/test';

export class CasesPage {
  readonly page: Page;
  readonly createCaseButton: Locator;
  readonly createDialog: Locator;
  readonly solicitanteSearch: Locator;
  readonly sintesisTextarea: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createCaseButton = page.locator('[data-testid="case-create-btn"]');
    this.createDialog = page.locator('[data-testid="case-create-dialog"]');
    this.solicitanteSearch = page.locator('[data-testid="case-solicitante-search"]');
    this.sintesisTextarea = page.locator('[data-testid="case-sintesis"]');
    this.saveButton = page.locator('[data-testid="case-save"]');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/cases');
    await this.page.waitForSelector('h1');
  }

  async openCreateCase(): Promise<void> {
    await this.createCaseButton.click();
    await this.createDialog.waitFor({ state: 'visible' });
  }

  /**
   * Busca y selecciona un solicitante en el buscador del modal.
   * @param query Texto de búsqueda (cédula o nombre)
   */
  async searchSolicitante(query: string): Promise<void> {
    // Type in the search input within the SolicitanteSearchSelect
    const searchInput = this.createDialog.locator('input');
    await searchInput.fill(query);
    // Wait for results to load and click the first option
    await this.page.waitForTimeout(500);
    const firstOption = this.createDialog.locator('[role="option"]').first();
    if (await firstOption.isVisible()) {
      await firstOption.click();
    }
  }

  /**
   * Selecciona la jerarquía legal en cascada de 4 niveles.
   * Cada nivel es un FilterSelect que se carga dinámicamente al seleccionar el anterior.
   */
  async selectLegalHierarchy(
    materia: string,
    categoria: string,
    subcategoria: string,
    ambitoLegal: string
  ): Promise<void> {
    // Materia (primer combobox dentro de LegalHierarchySelect)
    await this.page.locator('[role="combobox"]').first().click();
    await this.page.locator('[role="option"]', { hasText: materia }).click();

    // Categoría (se habilita después de seleccionar materia)
    await this.page.waitForTimeout(500);
    await this.page.locator('[role="combobox"]').nth(1).click();
    await this.page.locator('[role="option"]', { hasText: categoria }).click();

    // Subcategoría
    await this.page.waitForTimeout(500);
    await this.page.locator('[role="combobox"]').nth(2).click();
    await this.page.locator('[role="option"]', { hasText: subcategoria }).click();

    // Ámbito Legal
    await this.page.waitForTimeout(500);
    await this.page.locator('[role="combobox"]').nth(3).click();
    await this.page.locator('[role="option"]', { hasText: ambitoLegal }).click();
  }

  /**
   * Llena la síntesis del caso.
   */
  async fillSintesis(text: string): Promise<void> {
    await this.sintesisTextarea.fill(text);
  }

  /**
   * Hace clic en guardar/crear caso.
   */
  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * Espera a que el modal se cierre y el caso se haya creado.
   */
  async waitForSaveComplete(): Promise<void> {
    await this.createDialog.waitFor({ state: 'hidden', timeout: 15_000 });
  }

  /**
   * Busca un texto en la tabla de casos.
   */
  async findInTable(searchText: string): Promise<boolean> {
    await this.page.waitForTimeout(1000);
    const cells = this.page.locator('table tbody tr td');
    const count = await cells.count();
    for (let i = 0; i < count; i++) {
      const text = await cells.nth(i).textContent();
      if (text && text.includes(searchText)) {
        return true;
      }
    }
    return false;
  }
}