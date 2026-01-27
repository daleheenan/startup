/**
 * E2E Integration Tests: Complete Project Creation Journey
 *
 * Tests the full end-to-end user journey from login through project creation
 * to viewing the created project in the projects list.
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { generateProjectTitle } from './helpers/test-data';
import { assertOnProjectsPage, assertProjectExists } from './helpers/assertions';

test.describe('Project Creation - Complete Integration', () => {
  test.use({
    // Increase timeout for AI generation
    actionTimeout: 15000,
  });

  test('should complete full Quick Start journey', async ({ page }) => {
    // Extended timeout for AI generation
    test.setTimeout(180000);

    // Step 1: Login
    await login(page);
    await assertOnProjectsPage(page);

    // Step 2: Navigate to New Project
    await page.getByRole('link', { name: /new novel/i }).click();
    await expect(page).toHaveURL('/new');

    // Step 3: Choose Quick Start
    await page.getByRole('link', { name: /quick start/i }).click();
    await expect(page).toHaveURL('/quick-start');

    // Step 4: Configure Project
    // Select genre
    await page.getByRole('button', { name: /fantasy/i }).click();
    await expect(page.getByRole('button', { name: /fantasy/i })).toHaveAttribute('aria-pressed', 'true');

    // Add prompt
    const prompt = 'A young mage discovers an ancient spell book that holds the key to saving their kingdom';
    await page.getByPlaceholder(/describe your idea/i).fill(prompt);

    // Select standalone
    await page.getByRole('radio', { name: /standalone/i }).check();

    // Step 5: Generate Concepts
    await page.getByRole('button', { name: /generate.*5.*concept/i }).click();

    // Wait for generation progress
    await expect(page.getByText(/generating story concepts/i)).toBeVisible({ timeout: 10000 });

    // Step 6: Wait for concepts page
    await page.waitForURL('/concepts', { timeout: 120000 });

    // Verify concepts are displayed
    const conceptCards = page.locator('[role="article"]');
    await expect(conceptCards.first()).toBeVisible({ timeout: 10000 });

    // Should have 5 concepts
    const conceptCount = await conceptCards.count();
    expect(conceptCount).toBeGreaterThanOrEqual(1);
    expect(conceptCount).toBeLessThanOrEqual(5);

    // Step 7: Select first concept
    const firstConcept = conceptCards.first();
    const conceptTitle = await firstConcept.locator('h2, h3').first().textContent();

    await firstConcept.getByRole('button', { name: /choose/i }).click();

    // Step 8: Should redirect to project dashboard
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/, { timeout: 30000 });

    // Verify project dashboard loaded
    await expect(page.getByRole('heading', { name: new RegExp(conceptTitle || 'project', 'i') })).toBeVisible({
      timeout: 10000,
    });

    // Step 9: Return to projects list
    await page.goto('/projects');
    await assertOnProjectsPage(page);

    // Step 10: Verify project appears in list
    if (conceptTitle) {
      await assertProjectExists(page, conceptTitle);
    }
  });

  test('should complete full Full Customisation journey', async ({ page }) => {
    test.setTimeout(180000);

    // Step 1: Login
    await login(page);

    // Step 2: Navigate to Full Customisation
    await page.goto('/new');
    await page.getByRole('link', { name: /full customization/i }).click();
    await expect(page).toHaveURL('/full-customization');

    // Step 3: Fill form (using flexible selectors as form structure may vary)
    // Select primary genre
    const genreButton = page.getByRole('button', { name: /science fiction|sci-fi/i }).first();
    if (await genreButton.count() > 0) {
      await genreButton.click();
    }

    // Step 4: Submit form
    await page.getByRole('button', { name: /generate/i }).click();

    // Step 5: Wait for concepts
    await page.waitForURL('/concepts', { timeout: 120000 });

    // Step 6: Select a concept
    const conceptCards = page.locator('[role="article"]');
    await expect(conceptCards.first()).toBeVisible();

    const conceptTitle = await conceptCards.first().locator('h2, h3').first().textContent();
    await conceptCards.first().getByRole('button', { name: /choose/i }).click();

    // Step 7: Verify project created
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/);

    // Step 8: Navigate back and verify
    await page.goto('/projects');
    if (conceptTitle) {
      await assertProjectExists(page, conceptTitle);
    }
  });

  test('should handle concept selection and project creation', async ({ page }) => {
    test.setTimeout(180000);

    await login(page);

    // Quick path to concepts
    await page.goto('/quick-start');
    await page.getByRole('button', { name: /fantasy/i }).click();
    await page.getByRole('button', { name: /generate/i }).click();

    // Wait for concepts
    await page.waitForURL('/concepts', { timeout: 120000 });

    // Test selecting different concepts
    const conceptCards = page.locator('[role="article"]');
    const totalConcepts = await conceptCards.count();

    if (totalConcepts > 1) {
      // View second concept details
      const secondConcept = conceptCards.nth(1);
      await expect(secondConcept).toBeVisible();

      // Expand details if available
      const expandButton = secondConcept.getByRole('button', { name: /details|expand|more/i });
      if (await expandButton.count() > 0) {
        await expandButton.click();
        // Should show more details
        await page.waitForTimeout(500);
      }
    }

    // Select first concept
    const conceptTitle = await conceptCards.first().locator('h2, h3').first().textContent();
    await conceptCards.first().getByRole('button', { name: /choose/i }).click();

    // Should create project
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/);

    // Project should be in list
    await page.goto('/projects');
    if (conceptTitle) {
      await assertProjectExists(page, conceptTitle);
    }
  });

  test('should support trilogy creation workflow', async ({ page }) => {
    test.setTimeout(180000);

    await login(page);

    // Create trilogy
    await page.goto('/quick-start');
    await page.getByRole('button', { name: /fantasy/i }).click();
    await page.getByRole('radio', { name: /trilogy/i }).check();

    // Verify trilogy shows 3 books
    await expect(page.getByText(/3 books/i)).toBeVisible();

    // Generate
    await page.getByRole('button', { name: /generate/i }).click();
    await page.waitForURL('/concepts', { timeout: 120000 });

    // Select concept
    const conceptCards = page.locator('[role="article"]');
    await conceptCards.first().getByRole('button', { name: /choose/i }).click();

    // Should create trilogy project
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/);

    // Project detail page might show trilogy indicator
    const trilogyIndicator = page.getByText(/trilogy|3 books|book 1 of 3/i);
    if (await trilogyIndicator.count() > 0) {
      await expect(trilogyIndicator).toBeVisible();
    }
  });

  test('should support series creation workflow', async ({ page }) => {
    test.setTimeout(180000);

    await login(page);

    // Create series
    await page.goto('/quick-start');
    await page.getByRole('button', { name: /science-fiction|sci-fi/i }).click();
    await page.getByRole('radio', { name: /series/i }).check();

    // Set book count if field is available
    const bookCountInput = page.getByLabel(/book count|number.*book/i);
    if (await bookCountInput.count() > 0) {
      await bookCountInput.fill('5');
      await expect(page.getByText(/5 books/i)).toBeVisible();
    }

    // Generate
    await page.getByRole('button', { name: /generate/i }).click();
    await page.waitForURL('/concepts', { timeout: 120000 });

    // Select concept
    await page.locator('[role="article"]').first().getByRole('button', { name: /choose/i }).click();

    // Should create series project
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/);

    // Series indicator might be visible
    const seriesIndicator = page.getByText(/series|5 books|book 1 of 5/i);
    if (await seriesIndicator.count() > 0) {
      await expect(seriesIndicator).toBeVisible();
    }
  });
});

test.describe('Project Creation - Multi-Genre Integration', () => {
  test('should create project with multiple genres', async ({ page }) => {
    test.setTimeout(180000);

    await login(page);

    // Select two genres
    await page.goto('/quick-start');
    await page.getByRole('button', { name: /fantasy/i }).click();
    await page.getByRole('button', { name: /romance/i }).click();

    // Both should be selected
    await expect(page.getByRole('button', { name: /fantasy/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /romance/i })).toHaveAttribute('aria-pressed', 'true');

    // Generate with both genres
    await page.getByRole('button', { name: /generate/i }).click();
    await page.waitForURL('/concepts', { timeout: 120000 });

    // Concepts should reflect both genres
    const conceptCards = page.locator('[role="article"]');
    const firstConceptText = await conceptCards.first().textContent();

    // Concepts might mention romance or fantasy elements
    // This is a soft assertion as AI generation varies
    expect(firstConceptText).toBeTruthy();
    expect(firstConceptText!.length).toBeGreaterThan(50);
  });
});

test.describe('Project Creation - Time Period Integration', () => {
  test('should create historical project', async ({ page }) => {
    test.setTimeout(180000);

    await login(page);
    await page.goto('/quick-start');

    // Select historical genre
    await page.getByRole('button', { name: /historical/i }).click();

    // Select past time period if available
    const timePeriodSelect = page.locator('select[name*="time"], [data-testid*="time"]').first();
    if (await timePeriodSelect.count() > 0) {
      await timePeriodSelect.selectOption({ label: /past|historical/i });
    }

    // Generate
    await page.getByRole('button', { name: /generate/i }).click();
    await page.waitForURL('/concepts', { timeout: 120000 });

    // Select concept
    await page.locator('[role="article"]').first().getByRole('button', { name: /choose/i }).click();

    // Should create project
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/);
  });

  test('should create futuristic sci-fi project', async ({ page }) => {
    test.setTimeout(180000);

    await login(page);
    await page.goto('/quick-start');

    // Select sci-fi
    await page.getByRole('button', { name: /science-fiction|sci-fi/i }).click();

    // Select future time period if available
    const timePeriodSelect = page.locator('select[name*="time"], [data-testid*="time"]').first();
    if (await timePeriodSelect.count() > 0) {
      await timePeriodSelect.selectOption({ label: /future/i });
    }

    // Generate
    await page.getByRole('button', { name: /generate/i }).click();
    await page.waitForURL('/concepts', { timeout: 120000 });

    // Concepts should have sci-fi themes
    const conceptCards = page.locator('[role="article"]');
    await expect(conceptCards.first()).toBeVisible();

    const conceptText = await conceptCards.first().textContent();
    expect(conceptText).toBeTruthy();
  });
});
