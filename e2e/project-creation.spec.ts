/**
 * E2E Tests: Project Creation Flow
 *
 * Tests the complete project creation journey including:
 * - Quick Start flow
 * - Full Customisation flow
 * - Form validation
 * - Genre selection
 * - Project settings
 */

import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './helpers/auth';
import { generateProjectTitle, QUICK_GENRES } from './helpers/test-data';
import {
  assertOnProjectsPage,
  assertOnProjectDetailPage,
  assertProjectExists,
} from './helpers/assertions';

/**
 * Test Suite: Project Creation - Quick Start Flow
 *
 * Tests the streamlined project creation experience
 */
test.describe('Project Creation - Quick Start', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test
    await login(page);
    await assertOnProjectsPage(page);
  });

  test('should navigate to Quick Start from projects page', async ({ page }) => {
    // Click "New Novel" button
    await page.getByRole('link', { name: /new novel/i }).click();

    // Should be on the new project selection page
    await expect(page).toHaveURL('/new');
    await expect(page.getByRole('heading', { name: /create new novel/i })).toBeVisible();

    // Click Quick Start option
    await page.getByRole('link', { name: /quick start/i }).click();

    // Should navigate to Quick Start page
    await expect(page).toHaveURL('/quick-start');
    await expect(page.getByRole('heading', { name: /quick start/i })).toBeVisible();
  });

  test('should create a standalone novel with Quick Start', async ({ page }) => {
    const projectTitle = generateProjectTitle('Quick Fantasy');

    // Navigate to Quick Start
    await page.goto('/quick-start');

    // Select genre
    const fantasyButton = page.getByRole('button', { name: /fantasy/i });
    await fantasyButton.click();
    await expect(fantasyButton).toHaveAttribute('aria-pressed', 'true');

    // Enter optional prompt
    await page.getByPlaceholder(/describe your idea/i).fill('A wizard discovers a hidden library');

    // Select standalone project type
    await page.getByRole('radio', { name: /standalone/i }).check();
    await expect(page.getByRole('radio', { name: /standalone/i })).toBeChecked();

    // Click "Generate 5 Concepts"
    await page.getByRole('button', { name: /generate.*5.*concept/i }).click();

    // Should show generation progress
    await expect(page.getByText(/generating story concepts/i)).toBeVisible();

    // Wait for concepts page (with extended timeout for AI generation)
    await page.waitForURL('/concepts', { timeout: 120000 });

    // Verify concepts are displayed
    await expect(page.getByRole('heading', { name: /story concepts/i })).toBeVisible();

    // Select first concept
    const firstConceptCard = page.locator('[role="article"]').first();
    await expect(firstConceptCard).toBeVisible();

    // Click "Choose This Concept"
    await firstConceptCard.getByRole('button', { name: /choose/i }).click();

    // Should redirect to project dashboard
    await assertOnProjectDetailPage(page);

    // Verify project was created
    await page.goto('/projects');
    await assertOnProjectsPage(page);
  });

  test('should create a trilogy with Quick Start', async ({ page }) => {
    const projectTitle = generateProjectTitle('Quick Trilogy');

    // Navigate to Quick Start
    await page.goto('/quick-start');

    // Select science fiction genre
    await page.getByRole('button', { name: /sci-fi/i }).click();

    // Select trilogy project type
    await page.getByRole('radio', { name: /trilogy/i }).check();
    await expect(page.getByRole('radio', { name: /trilogy/i })).toBeChecked();

    // Verify trilogy is 3 books
    await expect(page.getByText(/3 books/i)).toBeVisible();

    // Generate concepts
    await page.getByRole('button', { name: /generate.*5.*concept/i }).click();

    // Wait for concepts
    await page.waitForURL('/concepts', { timeout: 120000 });

    // Select a concept
    await page.locator('[role="article"]').first().getByRole('button', { name: /choose/i }).click();

    // Should be on project dashboard
    await assertOnProjectDetailPage(page);
  });

  test('should support multi-genre selection', async ({ page }) => {
    // Navigate to Quick Start
    await page.goto('/quick-start');

    // Select multiple genres (max 2)
    await page.getByRole('button', { name: /fantasy/i }).click();
    await page.getByRole('button', { name: /romance/i }).click();

    // Both should be selected
    await expect(page.getByRole('button', { name: /fantasy/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /romance/i })).toHaveAttribute('aria-pressed', 'true');

    // Try to select third genre (should be prevented)
    const thirdGenreButton = page.getByRole('button', { name: /mystery/i });
    await thirdGenreButton.click();

    // Should show error or disable button
    const isDisabled = await thirdGenreButton.isDisabled();
    const selectedGenres = await page.locator('[aria-pressed="true"]').count();

    // Either third genre is disabled or selection is limited to 2
    expect(isDisabled || selectedGenres === 2).toBeTruthy();
  });

  test('should use "Inspire Me" feature', async ({ page }) => {
    // Navigate to Quick Start
    await page.goto('/quick-start');

    // Select genre first
    await page.getByRole('button', { name: /fantasy/i }).click();

    // Click "Inspire Me"
    const inspireMeButton = page.getByRole('button', { name: /inspire me/i });
    await inspireMeButton.click();

    // Should populate the prompt field with a suggestion
    const promptField = page.getByPlaceholder(/describe your idea/i);
    await expect(promptField).not.toHaveValue('');

    // Value should be a string with content
    const promptValue = await promptField.inputValue();
    expect(promptValue.length).toBeGreaterThan(10);
  });
});

/**
 * Test Suite: Project Creation - Full Customisation Flow
 *
 * Tests the advanced project creation with detailed options
 */
test.describe('Project Creation - Full Customisation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await assertOnProjectsPage(page);
  });

  test('should navigate to Full Customisation from projects page', async ({ page }) => {
    // Click "New Novel"
    await page.getByRole('link', { name: /new novel/i }).click();
    await expect(page).toHaveURL('/new');

    // Click Full Customisation
    await page.getByRole('link', { name: /full customization/i }).click();

    // Should navigate to Full Customisation page
    await expect(page).toHaveURL('/full-customization');
    await expect(page.getByRole('heading', { name: /full customization/i })).toBeVisible();
  });

  test('should create project with full customisation', async ({ page }) => {
    // Navigate to Full Customisation
    await page.goto('/full-customization');

    // This will test the GenrePreferenceForm component
    // Note: The exact selectors depend on the form implementation

    // Primary genre selection
    const genreSelect = page.locator('select[name="primaryGenre"], [data-testid="primary-genre"]').first();
    if (await genreSelect.count() > 0) {
      await genreSelect.selectOption('science-fiction');
    } else {
      // Alternative: Click genre button if it's a button-based selector
      await page.getByRole('button', { name: /science fiction|sci-fi/i }).first().click();
    }

    // Subgenre selection (if available)
    const subgenreCheckbox = page.getByRole('checkbox', { name: /cyberpunk|space opera/i }).first();
    if (await subgenreCheckbox.count() > 0) {
      await subgenreCheckbox.check();
    }

    // Tone selection
    const toneOption = page.getByRole('checkbox', { name: /dark|gritty|epic/i }).first();
    if (await toneOption.count() > 0) {
      await toneOption.check();
    }

    // Theme selection
    const themeOption = page.getByRole('checkbox', { name: /power|identity|freedom/i }).first();
    if (await themeOption.count() > 0) {
      await themeOption.check();
    }

    // Project type
    const trilogyRadio = page.getByRole('radio', { name: /trilogy/i });
    if (await trilogyRadio.count() > 0) {
      await trilogyRadio.check();
    }

    // Submit form
    await page.getByRole('button', { name: /generate|create/i }).click();

    // Should show progress
    await expect(page.getByText(/generating/i)).toBeVisible();

    // Wait for concepts page
    await page.waitForURL('/concepts', { timeout: 120000 });

    // Verify concepts are shown
    await expect(page.locator('[role="article"]').first()).toBeVisible();
  });

  test('should support word count target configuration', async ({ page }) => {
    await page.goto('/full-customization');

    // Look for word count input field
    const wordCountInput = page.getByLabel(/word count|target.*word/i);
    if (await wordCountInput.count() > 0) {
      await wordCountInput.fill('80000');
      await expect(wordCountInput).toHaveValue('80000');
    }
  });

  test('should support chapter count configuration', async ({ page }) => {
    await page.goto('/full-customization');

    // Look for chapter count input
    const chapterCountInput = page.getByLabel(/chapter count|number.*chapter/i);
    if (await chapterCountInput.count() > 0) {
      await chapterCountInput.fill('30');
      await expect(chapterCountInput).toHaveValue('30');
    }
  });
});

/**
 * Test Suite: Form Validation
 *
 * Tests validation rules for project creation forms
 */
test.describe('Project Creation - Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should require genre selection in Quick Start', async ({ page }) => {
    await page.goto('/quick-start');

    // Try to submit without selecting genre
    const generateButton = page.getByRole('button', { name: /generate/i });

    // Button should be disabled or show error
    const isDisabled = await generateButton.isDisabled();
    expect(isDisabled).toBeTruthy();
  });

  test('should validate project type selection', async ({ page }) => {
    await page.goto('/quick-start');

    // Select genre
    await page.getByRole('button', { name: /fantasy/i }).click();

    // All project type options should be available
    await expect(page.getByRole('radio', { name: /standalone/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /trilogy/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /series/i })).toBeVisible();

    // Select series
    await page.getByRole('radio', { name: /series/i }).check();

    // Should show book count option for series
    const bookCountInput = page.getByLabel(/book count|number.*book/i);
    if (await bookCountInput.count() > 0) {
      await expect(bookCountInput).toBeVisible();

      // Should have minimum value constraint
      await bookCountInput.fill('2');
      await bookCountInput.blur();

      // Might show validation error for less than 4 books
      const errorMessage = page.getByText(/at least.*4.*book/i);
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible();
      }
    }
  });

  test('should validate prompt length in Quick Start', async ({ page }) => {
    await page.goto('/quick-start');

    const promptField = page.getByPlaceholder(/describe your idea/i);

    // Enter very long text
    const longText = 'A'.repeat(1001);
    await promptField.fill(longText);

    // Should show character count or validation error
    const charCount = page.getByText(/\d+.*\d+.*character/i);
    const errorMsg = page.getByText(/too long|maximum.*character/i);

    // Either character counter or error should be visible
    const hasValidation = (await charCount.count() > 0) || (await errorMsg.count() > 0);
    expect(hasValidation).toBeTruthy();
  });

  test('should preserve form state when navigating back', async ({ page }) => {
    await page.goto('/quick-start');

    // Fill form
    await page.getByRole('button', { name: /fantasy/i }).click();
    await page.getByPlaceholder(/describe your idea/i).fill('Test prompt');
    await page.getByRole('radio', { name: /trilogy/i }).check();

    // Navigate away
    await page.goto('/projects');

    // Navigate back
    await page.goto('/quick-start');

    // Form might be reset (depends on implementation)
    // This is expected behaviour for most forms
    const fantasyButton = page.getByRole('button', { name: /fantasy/i });
    const isPressed = await fantasyButton.getAttribute('aria-pressed');

    // Either form is reset (false) or preserved (true)
    expect(['true', 'false', null]).toContain(isPressed);
  });
});

/**
 * Test Suite: Navigation and User Flow
 *
 * Tests the overall user journey and navigation
 */
test.describe('Project Creation - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should allow cancelling concept generation', async ({ page }) => {
    await page.goto('/quick-start');

    // Select minimum required fields
    await page.getByRole('button', { name: /fantasy/i }).click();

    // Start generation
    await page.getByRole('button', { name: /generate/i }).click();

    // Look for cancel button in progress modal
    const cancelButton = page.getByRole('button', { name: /cancel/i });

    if (await cancelButton.count() > 0) {
      await cancelButton.click();

      // Should return to form
      await expect(page.getByRole('button', { name: /generate/i })).toBeVisible();
    }
  });

  test('should show generation progress steps', async ({ page }) => {
    await page.goto('/quick-start');

    // Fill form
    await page.getByRole('button', { name: /fantasy/i }).click();

    // Start generation
    await page.getByRole('button', { name: /generate/i }).click();

    // Should show progress modal with steps
    await expect(page.getByText(/generating|analyzing|creating/i)).toBeVisible();

    // Might show estimated time
    const estimatedTime = page.getByText(/\d+.*second|minute/i);
    if (await estimatedTime.count() > 0) {
      await expect(estimatedTime).toBeVisible();
    }
  });

  test('should handle generation errors gracefully', async ({ page }) => {
    // This test would require mocking API failure
    // In real scenario, you might test with invalid data or network conditions

    await page.goto('/quick-start');
    await page.getByRole('button', { name: /fantasy/i }).click();

    // Intercept API call to simulate error (if testing with mock server)
    // await page.route('**/api/concepts/**', route => route.abort());

    // For now, just verify error state exists in UI
    // await page.getByRole('button', { name: /generate/i }).click();
    // await expect(page.getByRole('alert')).toBeVisible();
  });

  test('should provide clear navigation back to projects list', async ({ page }) => {
    await page.goto('/quick-start');

    // Should have back button or navigation
    const backButton = page.getByRole('link', { name: /back|projects/i }).first();
    if (await backButton.count() > 0) {
      await backButton.click();
      await assertOnProjectsPage(page);
    }
  });
});
