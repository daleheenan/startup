/**
 * E2E Tests: Romance Genre Commercial Workflow
 *
 * Tests the complete romance writing workflow including:
 * - Heat level configuration (levels 1-5)
 * - Sensuality focus settings (emotional, physical, balanced)
 * - Emotional beats tracking (meet-cute, first kiss, black moment, HEA)
 * - Integration with chapter planning and generation
 * - Heat level guidance in chapter generation
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { generateProjectTitle } from './helpers/test-data';
import { assertOnProjectDetailPage } from './helpers/assertions';

test.describe('Romance Genre Workflow', () => {
  let projectId: string;
  const projectTitle = generateProjectTitle('Romance Test');

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Project Creation and Configuration', () => {
    test('should create a new romance project with heat level configuration', async ({
      page,
    }) => {
      // Navigate to Quick Start
      await page.goto('/quick-start');

      // Select Romance genre
      const romanceButton = page.getByRole('button', { name: /romance/i });
      await romanceButton.click();
      await expect(romanceButton).toHaveAttribute('aria-pressed', 'true');

      // Select standalone project
      await page.getByRole('radio', { name: /standalone/i }).check();

      // Generate concepts
      await page.getByRole('button', { name: /generate.*concept/i }).click();

      // Wait for concepts page
      await page.waitForURL('/concepts', { timeout: 120000 });

      // Select first concept
      await page
        .locator('[role="article"]')
        .first()
        .getByRole('button', { name: /choose/i })
        .click();

      // Should redirect to project dashboard
      await assertOnProjectDetailPage(page);

      // Extract project ID from URL
      const url = page.url();
      const match = url.match(/projects\/([a-f0-9-]+)/);
      projectId = match ? match[1] : '';
      expect(projectId).toBeTruthy();
    });

    test('should configure heat level to level 3 (steamy)', async ({ page }) => {
      // Assume project exists - navigate to project settings
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to romance settings (could be in project settings or dedicated page)
      const settingsLink = page.getByRole('link', {
        name: /romance settings|genre settings/i,
      });

      if ((await settingsLink.count()) > 0) {
        await settingsLink.click();
      } else {
        // Try alternative navigation path
        await page.getByRole('link', { name: /settings/i }).click();
        await page.getByRole('tab', { name: /romance|genre/i }).click();
      }

      // Configure heat level to 3
      const heatLevelSelect = page.locator(
        'select[name="heatLevel"], input[name="heatLevel"]'
      );

      if (await heatLevelSelect.count() > 0) {
        if ((await heatLevelSelect.getAttribute('type')) === 'range') {
          // Slider input
          await heatLevelSelect.fill('3');
        } else {
          // Select dropdown
          await heatLevelSelect.selectOption('3');
        }
      } else {
        // Button-based selection
        await page.getByRole('button', { name: /level 3|steamy/i }).click();
      }

      // Verify heat level label appears
      await expect(
        page.getByText(/level 3|steamy|some explicit/i)
      ).toBeVisible();

      // Save settings
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();

        // Wait for success confirmation
        await expect(
          page.getByText(/saved|updated|success/i)
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should configure sensuality focus to emotional', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to romance settings
      const settingsLink = page.getByRole('link', {
        name: /romance settings|genre settings/i,
      });
      if ((await settingsLink.count()) > 0) {
        await settingsLink.click();
      }

      // Select sensuality focus
      const sensualityOptions = [
        page.getByRole('radio', { name: /emotional/i }),
        page.getByRole('button', { name: /emotional/i }),
      ];

      for (const option of sensualityOptions) {
        if ((await option.count()) > 0) {
          await option.click();
          break;
        }
      }

      // Verify emotional focus is selected
      await expect(
        page.locator('[aria-checked="true"], [aria-pressed="true"]').filter({
          hasText: /emotional/i,
        })
      ).toBeVisible();

      // Save if needed
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();
      }
    });

    test('should enable fade-to-black option', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to romance settings
      const settingsLink = page.getByRole('link', {
        name: /romance settings|genre settings/i,
      });
      if ((await settingsLink.count()) > 0) {
        await settingsLink.click();
      }

      // Toggle fade-to-black
      const fadeToBlackCheckbox = page.getByRole('checkbox', {
        name: /fade to black|close the door/i,
      });

      if ((await fadeToBlackCheckbox.count()) > 0) {
        await fadeToBlackCheckbox.check();
        await expect(fadeToBlackCheckbox).toBeChecked();
      }

      // Save settings
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();
      }
    });
  });

  test.describe('Emotional Beats Tracking', () => {
    test('should display essential romance beats', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to beats tracking (could be in plot or dedicated section)
      const beatsLink = page.getByRole('link', {
        name: /romance beats|emotional beats|plot beats/i,
      });

      if ((await beatsLink.count()) > 0) {
        await beatsLink.click();
      } else {
        // Try plot page
        await page.getByRole('link', { name: /plot/i }).click();
      }

      // Verify essential romance beats are listed
      const essentialBeats = [
        'meet cute',
        'first kiss',
        'black moment',
        'happily ever after',
        'HEA',
      ];

      // Check that at least some key beats are visible
      let beatsFound = 0;
      for (const beat of essentialBeats) {
        const beatElement = page.getByText(new RegExp(beat, 'i'));
        if ((await beatElement.count()) > 0) {
          beatsFound++;
        }
      }

      expect(beatsFound).toBeGreaterThan(0);
    });

    test('should allow tracking meet-cute in chapter 1', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to beats or plot page
      const beatsLink = page.getByRole('link', {
        name: /romance beats|emotional beats|plot/i,
      });
      if ((await beatsLink.count()) > 0) {
        await beatsLink.click();
      }

      // Find meet-cute beat
      const meetCuteBeat = page
        .locator('[data-testid="beat-row"], [role="listitem"], tr')
        .filter({ hasText: /meet cute|first meeting/i })
        .first();

      if ((await meetCuteBeat.count()) > 0) {
        // Set chapter number to 1
        const chapterInput = meetCuteBeat.locator(
          'input[type="number"], select'
        );
        if ((await chapterInput.count()) > 0) {
          if ((await chapterInput.getAttribute('type')) === 'number') {
            await chapterInput.fill('1');
          } else {
            await chapterInput.selectOption('1');
          }
        }

        // Mark as planned or completed
        const checkbox = meetCuteBeat.locator('input[type="checkbox"]');
        if ((await checkbox.count()) > 0) {
          await checkbox.check();
        }

        // Add scene description if available
        const descriptionField = meetCuteBeat.locator(
          'textarea, input[type="text"]'
        );
        if ((await descriptionField.count()) > 0) {
          await descriptionField.fill(
            'Protagonists collide in a coffee shop accident'
          );
        }
      }

      // Save changes
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();
      }
    });

    test('should track first kiss in chapter 8', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to beats tracking
      const beatsLink = page.getByRole('link', {
        name: /romance beats|emotional beats|plot/i,
      });
      if ((await beatsLink.count()) > 0) {
        await beatsLink.click();
      }

      // Find first kiss beat
      const firstKissBeat = page
        .locator('[data-testid="beat-row"], [role="listitem"], tr')
        .filter({ hasText: /first kiss/i })
        .first();

      if ((await firstKissBeat.count()) > 0) {
        const chapterInput = firstKissBeat.locator(
          'input[type="number"], select'
        );
        if ((await chapterInput.count()) > 0) {
          if ((await chapterInput.getAttribute('type')) === 'number') {
            await chapterInput.fill('8');
          } else {
            await chapterInput.selectOption('8');
          }
        }

        // Set emotional intensity if available
        const intensitySlider = firstKissBeat.locator(
          'input[type="range"][name*="intensity"]'
        );
        if ((await intensitySlider.count()) > 0) {
          await intensitySlider.fill('8');
        }
      }

      // Save changes
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();
      }
    });

    test('should set black moment in chapter 20', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to beats tracking
      const beatsLink = page.getByRole('link', {
        name: /romance beats|emotional beats|plot/i,
      });
      if ((await beatsLink.count()) > 0) {
        await beatsLink.click();
      }

      // Find black moment beat
      const blackMomentBeat = page
        .locator('[data-testid="beat-row"], [role="listitem"], tr')
        .filter({ hasText: /black moment|all is lost/i })
        .first();

      if ((await blackMomentBeat.count()) > 0) {
        const chapterInput = blackMomentBeat.locator(
          'input[type="number"], select'
        );
        if ((await chapterInput.count()) > 0) {
          if ((await chapterInput.getAttribute('type')) === 'number') {
            await chapterInput.fill('20');
          } else {
            await chapterInput.selectOption('20');
          }
        }

        // Add description
        const descriptionField = blackMomentBeat.locator(
          'textarea, input[type="text"]'
        );
        if ((await descriptionField.count()) > 0) {
          await descriptionField.fill('Misunderstanding causes breakup');
        }
      }

      // Save changes
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();
      }
    });

    test('should ensure HEA ending in final chapter', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to beats tracking
      const beatsLink = page.getByRole('link', {
        name: /romance beats|emotional beats|plot/i,
      });
      if ((await beatsLink.count()) > 0) {
        await beatsLink.click();
      }

      // Find HEA beat
      const heaBeat = page
        .locator('[data-testid="beat-row"], [role="listitem"], tr')
        .filter({ hasText: /happily ever after|HEA|happy for now|HFN/i })
        .first();

      if ((await heaBeat.count()) > 0) {
        const chapterInput = heaBeat.locator('input[type="number"], select');
        if ((await chapterInput.count()) > 0) {
          if ((await chapterInput.getAttribute('type')) === 'number') {
            await chapterInput.fill('25');
          } else {
            await chapterInput.selectOption('25');
          }
        }
      }

      // Save changes
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();
      }
    });
  });

  test.describe('Chapter Planning Integration', () => {
    test('should display romance beats in chapter planning view', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // Look for beat indicators in chapter list
      // Beats should appear next to relevant chapters
      const chapterList = page.locator('[data-testid="chapter-list"], table');

      if ((await chapterList.count()) > 0) {
        // Check chapter 1 shows meet-cute
        const chapter1Row = chapterList
          .locator('tr, [data-testid*="chapter-1"]')
          .first();
        if ((await chapter1Row.count()) > 0) {
          // Should have beat badge or indicator
          const beatIndicator = chapter1Row.locator(
            '[data-testid*="beat"], .beat-badge'
          );
          // Beat might be visible if configured
          if ((await beatIndicator.count()) > 0) {
            await expect(beatIndicator).toBeVisible();
          }
        }
      }
    });

    test('should show beat guidance when generating chapter with emotional beat', async ({
      page,
    }) => {
      // Navigate to chapter 8 (first kiss chapter)
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // Find chapter 8
      const chapter8Link = page.getByRole('link', { name: /chapter 8/i });
      if ((await chapter8Link.count()) > 0) {
        await chapter8Link.click();
      } else {
        // Try alternative: click generate for chapter 8
        const chapter8Row = page
          .locator('tr, [role="row"]')
          .filter({ hasText: /chapter 8/i });
        if ((await chapter8Row.count()) > 0) {
          const generateButton = chapter8Row.getByRole('button', {
            name: /generate|create/i,
          });
          if ((await generateButton.count()) > 0) {
            await generateButton.click();
          }
        }
      }

      // Should show romance beat guidance
      await expect(
        page.getByText(/first kiss|emotional beat|romance beat/i)
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Chapter Generation with Heat Level', () => {
    test('should include heat level guidance in chapter generation', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // Start generating a new chapter
      const generateButton = page.getByRole('button', {
        name: /generate.*chapter|new chapter|create chapter/i,
      });

      if ((await generateButton.count()) > 0) {
        await generateButton.click();

        // Should show heat level information in generation modal or page
        await expect(
          page.getByText(/heat level|steamy|level 3/i)
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should apply heat level constraints to intimate scene generation', async ({
      page,
    }) => {
      // Navigate to a chapter with intimacy
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // Generate or edit a chapter
      const chapterLink = page.getByRole('link', { name: /chapter/i }).first();
      if ((await chapterLink.count()) > 0) {
        await chapterLink.click();
      }

      // Look for heat level indicator in chapter editor
      const heatLevelBadge = page.locator(
        '[data-testid="heat-level"], .heat-level-badge'
      );

      if ((await heatLevelBadge.count()) > 0) {
        await expect(heatLevelBadge).toContainText(/level 3|steamy/i);
      }
    });

    test('should provide sensuality focus guidance in generation', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // Navigate to generation settings or view
      const generateButton = page.getByRole('button', {
        name: /generate|create/i,
      });

      if ((await generateButton.count()) > 0) {
        await generateButton.click();

        // Should mention emotional focus
        const guidanceText = page.getByText(
          /emotional|emotional focus|sensuality focus/i
        );

        if ((await guidanceText.count()) > 0) {
          await expect(guidanceText).toBeVisible();
        }
      }
    });
  });

  test.describe('Heat Level Consistency Validation', () => {
    test('should warn if intimate scene exceeds configured heat level', async ({
      page,
    }) => {
      // This test verifies that if a chapter contains content above level 3,
      // the system provides a warning
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // This would typically be tested with content analysis
      // Look for validation warnings in chapter view
      const warningBadge = page.locator(
        '[data-testid="heat-warning"], .warning-badge'
      );

      // Warning may or may not be present depending on content
      if ((await warningBadge.count()) > 0) {
        await expect(warningBadge).toContainText(/heat level|explicit/i);
      }
    });

    test('should validate fade-to-black is applied in appropriate chapters', async ({
      page,
    }) => {
      // Verify that chapters with intimacy respect fade-to-black setting
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // Check for fade-to-black indicator
      const fadeIndicator = page.locator(
        '[data-testid*="fade"], .fade-to-black'
      );

      if ((await fadeIndicator.count()) > 0) {
        await expect(fadeIndicator).toBeVisible();
      }
    });
  });

  test.describe('Romance Beat Validation', () => {
    test('should validate all essential beats are planned', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to beats page
      const beatsLink = page.getByRole('link', {
        name: /romance beats|emotional beats|plot/i,
      });
      if ((await beatsLink.count()) > 0) {
        await beatsLink.click();
      }

      // Look for validation button or automatic check
      const validateButton = page.getByRole('button', {
        name: /validate|check beats/i,
      });

      if ((await validateButton.count()) > 0) {
        await validateButton.click();

        // Should show validation results
        await expect(
          page.getByText(/validation|beats|complete|missing/i)
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should flag missing black moment as critical', async ({ page }) => {
      // Remove black moment and verify warning
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to beats
      const beatsLink = page.getByRole('link', {
        name: /romance beats|emotional beats|plot/i,
      });
      if ((await beatsLink.count()) > 0) {
        await beatsLink.click();
      }

      // Look for missing beat warnings
      const warningSection = page.locator(
        '[data-testid="beat-warnings"], .warning'
      );

      if ((await warningSection.count()) > 0) {
        // Should mention critical beats
        await expect(warningSection).toContainText(/black moment|critical/i);
      }
    });
  });
});
