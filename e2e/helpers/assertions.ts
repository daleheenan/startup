/**
 * Custom Assertions for E2E Tests
 *
 * Reusable assertion patterns for NovelForge testing
 */

import { expect, Page } from '@playwright/test';

/**
 * Assert that user is on projects list page
 */
export async function assertOnProjectsPage(page: Page): Promise<void> {
  await expect(page).toHaveURL('/projects');
  await expect(page.getByRole('heading', { name: /story architect/i })).toBeVisible();
}

/**
 * Assert that user is on project detail page
 */
export async function assertOnProjectDetailPage(page: Page, projectId?: string): Promise<void> {
  const urlPattern = projectId ? `/projects/${projectId}` : /\/projects\/[a-f0-9-]+/;
  await expect(page).toHaveURL(urlPattern);
}

/**
 * Assert that a project card exists with given title
 */
export async function assertProjectExists(page: Page, title: string): Promise<void> {
  const projectLink = page.getByRole('link', { name: new RegExp(title, 'i') });
  await expect(projectLink).toBeVisible();
}

/**
 * Assert that validation error is displayed
 */
export async function assertValidationError(page: Page, errorPattern: RegExp): Promise<void> {
  const errorMessage = page.getByText(errorPattern);
  await expect(errorMessage).toBeVisible();
}

/**
 * Assert that form field has aria-invalid attribute
 */
export async function assertFieldInvalid(page: Page, fieldLabel: RegExp): Promise<void> {
  const field = page.getByLabel(fieldLabel);
  await expect(field).toHaveAttribute('aria-invalid', 'true');
}

/**
 * Assert that success message is displayed
 */
export async function assertSuccessMessage(page: Page, messagePattern: RegExp): Promise<void> {
  const successMessage = page.getByRole('status').getByText(messagePattern);
  await expect(successMessage).toBeVisible();
}

/**
 * Assert that loading indicator is visible
 */
export async function assertLoading(page: Page): Promise<void> {
  const loadingIndicator = page.getByText(/loading|generating/i);
  await expect(loadingIndicator).toBeVisible();
}

/**
 * Assert that loading indicator is not visible
 */
export async function assertNotLoading(page: Page): Promise<void> {
  const loadingIndicator = page.getByText(/loading|generating/i);
  await expect(loadingIndicator).not.toBeVisible();
}

/**
 * Assert that genre badge is visible in project card
 */
export async function assertGenreBadge(page: Page, genre: string): Promise<void> {
  const genreBadge = page.getByText(new RegExp(genre, 'i'));
  await expect(genreBadge).toBeVisible();
}
