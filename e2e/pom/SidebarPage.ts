import { type Page, type Locator } from '@playwright/test';

export class SidebarPage {
  readonly page: Page;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logoutButton = page.locator('[data-testid="sidebar-logout"]');
  }

  /**
   * Verifica si un link del sidebar está visible por su texto exacto.
   */
  async isLinkVisible(label: string): Promise<boolean> {
    const link = this.page.locator('a', { hasText: label });
    return link.isVisible();
  }

  /**
   * Verifica si un link del sidebar NO está visible (para validación RBAC).
   */
  async isLinkHidden(label: string): Promise<boolean> {
    const link = this.page.locator('a', { hasText: label });
    return link.isHidden();
  }

  /**
   * Hace clic en un link del sidebar por su texto exacto.
   */
  async clickLink(label: string): Promise<void> {
    await this.page.locator('a', { hasText: label }).first().click();
  }

  /**
   * Cierra sesión haciendo clic en el botón de logout.
   */
  async logoutClick(): Promise<void> {
    await this.logoutButton.click();
  }

  /**
   * Obtiene el nombre del usuario desde el sidebar.
   */
  async getUserName(): Promise<string | null> {
    const nameEl = this.page.locator('.line-clamp-2').first();
    return nameEl.textContent();
  }

  /**
   * Obtiene el rol del usuario desde el badge en el sidebar.
   */
  async getRole(): Promise<string | null> {
    const roleEl = this.page.locator('.bg-white\\/10').first();
    return roleEl.textContent();
  }
}