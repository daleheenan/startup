import { chromium, FullConfig } from '@playwright/test';

/**
 * Global Setup for Playwright Tests
 *
 * This file runs once before all tests. Use it for:
 * - Setting up test database
 * - Creating test users
 * - Authenticating and saving session state
 * - Setting environment variables
 */

async function globalSetup(config: FullConfig) {
  console.log('🔧 Running global setup...');

  // Example: Setup authentication state
  // This creates a logged-in session that tests can reuse
  // Uncomment the code below if needed:
  //
  // const { baseURL } = config.projects[0].use;
  // const browser = await chromium.launch();
  // const context = await browser.newContext();
  // const page = await context.newPage();
  // await page.goto(`${baseURL}/login`);
  // await page.fill('#password', process.env.TEST_PASSWORD || 'testpassword123');
  // await page.click('button[type="submit"]');
  // await page.waitForURL(/\/projects/);
  // await context.storageState({ path: 'e2e/fixtures/auth.json' });
  // await browser.close();
  // console.log('Authentication state saved');

  console.log('✅ Global setup complete');
}

export default globalSetup;
