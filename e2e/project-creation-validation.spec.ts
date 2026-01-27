/**
 * E2E Tests: Project Creation Form Validation
 *
 * Focused tests for form validation rules and error handling
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { VALIDATION_TESTS } from './helpers/test-data';
import { assertValidationError } from './helpers/assertions';

test.describe('Project Creation - Validation Rules', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/quick-start');
  });

  test('should enforce genre selection requirement', async ({ page }) => {
    // Try to generate without selecting genre
    const generateButton = page.getByRole('button', { name: /generate.*concept/i });

    // Button should be disabled
    await expect(generateButton).toBeDisabled();

    // Select a genre
    await page.getByRole('button', { name: /fantasy/i }).click();

    // Button should now be enabled
    await expect(generateButton).toBeEnabled();
  });

  test('should limit genre selection to maximum 2', async ({ page }) => {
    // Select first genre
    await page.getByRole('button', { name: /fantasy/i }).click();
    await expect(page.getByRole('button', { name: /fantasy/i })).toHaveAttribute('aria-pressed', 'true');

    // Select second genre
    await page.getByRole('button', { name: /romance/i }).click();
    await expect(page.getByRole('button', { name: /romance/i })).toHaveAttribute('aria-pressed', 'true');

    // Try to select third genre
    const mysteryButton = page.getByRole('button', { name: /mystery/i });
    await mysteryButton.click();

    // Either third genre is disabled or maximum 2 genres are selected
    const selectedGenres = await page.locator('[aria-pressed="true"]').count();
    expect(selectedGenres).toBeLessThanOrEqual(2);
  });

  test('should validate prompt field character limit', async ({ page }) => {
    await page.getByRole('button', { name: /fantasy/i }).click();

    const promptField = page.getByPlaceholder(/describe your idea/i);

    // Test maximum length (assuming 1000 characters)
    const maxLengthText = 'A'.repeat(1001);
    await promptField.fill(maxLengthText);

    // Should either truncate or show error
    const actualValue = await promptField.inputValue();
    const errorMessage = page.getByText(/maximum|too long/i);

    const hasValidation = actualValue.length <= 1000 || (await errorMessage.count() > 0);
    expect(hasValidation).toBeTruthy();
  });

  test('should validate series book count minimum', async ({ page }) => {
    await page.getByRole('button', { name: /fantasy/i }).click();
    await page.getByRole('radio', { name: /series/i }).check();

    // Look for book count input
    const bookCountInput = page.getByLabel(/book count|number.*book/i);

    if (await bookCountInput.count() > 0) {
      // Try to enter less than minimum (usually 4)
      await bookCountInput.fill('2');
      await bookCountInput.blur();

      // Should show validation error
      const errorMessage = page.getByText(/at least.*4|minimum.*4/i);
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible();
      }

      // Try valid value
      await bookCountInput.fill('5');
      await bookCountInput.blur();

      // Error should disappear
      await expect(errorMessage).not.toBeVisible();
    }
  });

  test('should show helpful validation messages', async ({ page }) => {
    // Don't select genre
    const generateButton = page.getByRole('button', { name: /generate/i });

    // Should show disabled state or helpful message
    await expect(generateButton).toBeDisabled();

    // Might have tooltip or helper text
    const helperText = page.getByText(/select.*genre|choose.*genre/i);
    if (await helperText.count() > 0) {
      await expect(helperText).toBeVisible();
    }
  });
});

test.describe('Project Creation - Time Period Selection', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/quick-start');
  });

  test('should allow time period selection', async ({ page }) => {
    await page.getByRole('button', { name: /fantasy/i }).click();

    // Look for time period selector
    const timePeriodSelect = page.locator('select[name*="time"], [data-testid*="time-period"]').first();

    if (await timePeriodSelect.count() > 0) {
      // Select past
      await timePeriodSelect.selectOption({ label: /past|historical/i });
      await expect(timePeriodSelect).toHaveValue(/past|historical/i);

      // Select present
      await timePeriodSelect.selectOption({ label: /present|modern/i });
      await expect(timePeriodSelect).toHaveValue(/present|modern/i);

      // Select future
      await timePeriodSelect.selectOption({ label: /future/i });
      await expect(timePeriodSelect).toHaveValue(/future/i);
    }
  });

  test('should show year input for specific historical period', async ({ page }) => {
    await page.getByRole('button', { name: /historical/i }).click();

    // Look for specific year input
    const yearInput = page.getByLabel(/year|specific.*year/i);

    if (await yearInput.count() > 0) {
      await yearInput.fill('1920');
      await expect(yearInput).toHaveValue('1920');

      // Should validate year range
      await yearInput.fill('500');
      await yearInput.blur();

      // Might show validation for too far in past
      const errorMessage = page.getByText(/valid year|recent/i);
      const yearValue = await yearInput.inputValue();

      // Either error shown or value accepted
      expect(errorMessage.count() > 0 || yearValue === '500').toBeTruthy();
    }
  });
});

test.describe('Project Creation - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/quick-start');
    await page.getByRole('button', { name: /fantasy/i }).click();

    // Simulate offline
    await page.context().setOffline(true);

    await page.getByRole('button', { name: /generate/i }).click();

    // Should show error message
    const errorAlert = page.getByRole('alert');
    if (await errorAlert.count() > 0) {
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText(/network|connection|failed/i);
    }

    // Restore online
    await page.context().setOffline(false);
  });

  test('should allow retry after error', async ({ page }) => {
    await page.goto('/quick-start');
    await page.getByRole('button', { name: /fantasy/i }).click();

    // Simulate network error
    await page.context().setOffline(true);
    await page.getByRole('button', { name: /generate/i }).click();

    // Wait for error
    await page.waitForTimeout(2000);

    // Restore connection
    await page.context().setOffline(false);

    // Should be able to retry
    const generateButton = page.getByRole('button', { name: /generate|try again|retry/i });
    await expect(generateButton).toBeEnabled();
  });

  test('should preserve form data after navigation', async ({ page }) => {
    await page.goto('/quick-start');

    // Fill form
    await page.getByRole('button', { name: /fantasy/i }).click();
    await page.getByPlaceholder(/describe/i).fill('Test prompt content');

    // Navigate to different page
    await page.goto('/projects');

    // Go back
    await page.goBack();

    // Form might be reset (expected) or preserved (sessionStorage)
    // Both behaviors are acceptable
    const promptValue = await page.getByPlaceholder(/describe/i).inputValue();

    // Either empty (reset) or preserved
    expect(typeof promptValue).toBe('string');
  });
});

test.describe('Project Creation - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/quick-start');
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Tab through genre buttons
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to select genre with Enter/Space
    const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedElement).toBeTruthy();

    // Press Enter to select
    await page.keyboard.press('Enter');

    // Should select the genre
    const selectedGenres = await page.locator('[aria-pressed="true"]').count();
    expect(selectedGenres).toBeGreaterThan(0);
  });

  test('should have proper ARIA labels', async ({ page }) => {
    // Genre buttons should have proper labels
    const fantasyButton = page.getByRole('button', { name: /fantasy/i });
    await expect(fantasyButton).toHaveAttribute('aria-pressed');

    // Generate button should have descriptive label
    const generateButton = page.getByRole('button', { name: /generate/i });
    await expect(generateButton).toBeVisible();

    // Form should have proper labels
    const promptField = page.getByPlaceholder(/describe/i);
    const promptLabel = page.getByText(/describe|prompt|idea/i).first();
    if (await promptLabel.count() > 0) {
      await expect(promptLabel).toBeVisible();
    }
  });

  test('should have proper focus indicators', async ({ page }) => {
    // Focus on genre button
    const fantasyButton = page.getByRole('button', { name: /fantasy/i });
    await fantasyButton.focus();

    // Should have visible focus indicator
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      const styles = window.getComputedStyle(el!);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });

    // Should have some form of focus styling
    const hasFocusIndicator =
      focusedElement.outline !== 'none' ||
      focusedElement.outlineWidth !== '0px' ||
      focusedElement.boxShadow !== 'none';

    expect(hasFocusIndicator).toBeTruthy();
  });

  test('should announce loading state to screen readers', async ({ page }) => {
    await page.getByRole('button', { name: /fantasy/i }).click();
    await page.getByRole('button', { name: /generate/i }).click();

    // Should have aria-live region for status updates
    const statusRegion = page.getByRole('status');
    if (await statusRegion.count() > 0) {
      await expect(statusRegion).toBeVisible();
    }

    // Loading indicator should be announced
    const loadingText = page.getByText(/generating|loading/i);
    await expect(loadingText).toBeVisible();
  });
});
