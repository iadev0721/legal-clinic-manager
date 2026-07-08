import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly form: Locator;
  readonly cedulaHidden: Locator;
  readonly cedulaInput: Locator;
  readonly prefixTrigger: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorDiv: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.locator('[data-testid="login-form"]');
    this.cedulaHidden = page.locator('[data-testid="login-cedula"]');
    this.cedulaInput = page.locator('input[placeholder="12.345.678"]');
    // El dropdown de prefijo es un div personalizado con cursor-pointer
    this.prefixTrigger = page.locator('div.cursor-pointer').filter({ hasText: /^[VE]-$/ }).first();
    this.passwordInput = page.locator('[data-testid="login-password"]');
    this.submitButton = page.locator('[data-testid="login-submit"]');
    this.errorDiv = page.locator('[data-testid="login-error"]');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/login');
    await this.page.waitForSelector('[data-testid="login-form"]');
  }

  /**
   * Realiza login completo: selecciona prefijo, llena cédula y contraseña, hace submit.
   */
  async login(cedula: string, password: string): Promise<void> {
    // Parse cedula: "V-88880001" → prefix="V", number="88880001"
    const match = cedula.match(/^([VE])(\d+)$/);
    const prefix = match ? match[1] : 'V';
    const number = match ? match[2] : cedula;

    // Open prefix dropdown
    await this.prefixTrigger.click();
    await this.page.waitForTimeout(300);
    // The options appear inside a div.absolute within the dropdown.
    // Click the option that matches the prefix (e.g. "V-"), but NOT the trigger itself.
    // The trigger has a span icon, the option doesn't — we target based on position.
    // Option divs have class containing "px-2 py-2" and no icon span child.
    const option = this.page.locator('div.absolute > div.cursor-pointer').filter({ hasText: `${prefix}-` }).first();
    await option.click();

    // Fill cedula number
    await this.cedulaInput.fill(number);

    // Fill password
    await this.passwordInput.fill(password);

    // Submit
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string | null> {
    try {
      await this.errorDiv.waitFor({ state: 'visible', timeout: 5000 });
      return await this.errorDiv.textContent();
    } catch {
      return null;
    }
  }

  async isLoggedIn(): Promise<boolean> {
    // Check for the JWT session cookie
    const cookies = await this.page.context().cookies();
    return cookies.some((c) => c.name === 'session');
  }

  async logout(): Promise<void> {
    // Click the logout button in the sidebar
    await this.page.locator('[data-testid="sidebar-logout"]').click();
  }

  async waitForDashboard(): Promise<void> {
    await this.page.waitForURL('**/dashboard', { timeout: 15_000 });
  }

  async waitForLoginPage(): Promise<void> {
    await this.page.waitForURL('**/login', { timeout: 10_000 });
  }
}