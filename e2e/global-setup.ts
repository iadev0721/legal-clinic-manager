import { chromium, type FullConfig } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const AUTH_FILE = path.resolve(__dirname, '.auth/admin.json');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function globalSetup(config: FullConfig) {
  const { TEST_PASSWORD } = process.env;
  if (!TEST_PASSWORD) {
    console.warn('[global-setup] ⚠️  TEST_PASSWORD not set — skipping global login');
    return;
  }

  // Solo ejecutar global-setup en CI, donde storageState es necesario
  if (!process.env.CI) {
    console.log('[global-setup] ℹ️  Local mode — skipping global login (each spec logins independently)');
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('[data-testid="login-form"]');

    // Click the prefix dropdown to open it
    const prefixTrigger = page.locator('div.cursor-pointer:has(div:has-text("V-"))');
    await prefixTrigger.click();
    // Select 'V' from the dropdown
    await page.locator('div.cursor-pointer:has-text("V-")').first().click();

    // Fill cedula number
    const cedulaInput = page.locator('input[placeholder="12.345.678"]');
    await cedulaInput.fill('88880001');

    // Fill password
    await page.locator('[data-testid="login-password"]').fill(TEST_PASSWORD);

    // Submit
    await page.locator('[data-testid="login-submit"]').click();

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15_000 });

    // Save storage state (includes JWT cookie)
    await page.context().storageState({ path: AUTH_FILE });

    console.log('[global-setup] ✅ Admin login successful — storageState saved');
  } catch (error) {
    console.error('[global-setup] ❌ Login failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;