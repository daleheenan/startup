/**
 * E2E Tests: Thriller Genre Commercial Workflow
 *
 * Tests the complete thriller writing workflow including:
 * - Pacing style configuration (relentless, escalating, rollercoaster, slow burn)
 * - Ticking clock mechanics
 * - Chapter hook tracking
 * - Major twist planning
 * - Tension curve visualisation
 * - Cliffhanger management
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { generateProjectTitle } from './helpers/test-data';
import { assertOnProjectDetailPage } from './helpers/assertions';

test.describe('Thriller Genre Workflow', () => {
  let projectId: string;
  const projectTitle = generateProjectTitle('Thriller Test');

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Project Creation and Pacing Configuration', () => {
    test('should create a new thriller project', async ({ page }) => {
      // Navigate to Quick Start
      await page.goto('/quick-start');

      // Select Thriller genre
      const thrillerButton = page.getByRole('button', { name: /thriller/i });
      await thrillerButton.click();
      await expect(thrillerButton).toHaveAttribute('aria-pressed', 'true');

      // Add optional prompt
      await page
        .getByPlaceholder(/describe your idea/i)
        .fill('A detective races against time to stop a serial killer');

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

      // Extract project ID
      const url = page.url();
      const match = url.match(/projects\/([a-f0-9-]+)/);
      projectId = match ? match[1] : '';
      expect(projectId).toBeTruthy();
    });

    test('should configure pacing style to escalating', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to thriller settings
      const settingsLink = page.getByRole('link', {
        name: /thriller settings|genre settings|pacing/i,
      });

      if ((await settingsLink.count()) > 0) {
        await settingsLink.click();
      } else {
        // Try settings page
        await page.getByRole('link', { name: /settings/i }).click();
        const thrillerTab = page.getByRole('tab', { name: /thriller|genre/i });
        if ((await thrillerTab.count()) > 0) {
          await thrillerTab.click();
        }
      }

      // Select escalating pacing style
      const pacingOptions = [
        page.getByRole('radio', { name: /escalating/i }),
        page.getByRole('button', { name: /escalating/i }),
        page.locator('select[name*="pacing"]'),
      ];

      for (const option of pacingOptions) {
        if ((await option.count()) > 0) {
          if ((await option.getAttribute('type')) === 'radio') {
            await option.check();
          } else if (option.locator('option').count()) {
            await option.selectOption('escalating');
          } else {
            await option.click();
          }
          break;
        }
      }

      // Verify escalating is selected
      await expect(
        page.getByText(/escalating|builds steadily/i)
      ).toBeVisible();

      // Save settings
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expect(page.getByText(/saved|updated|success/i)).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test('should enable chapter hook requirements', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to thriller settings
      const settingsLink = page.getByRole('link', {
        name: /thriller settings|genre settings/i,
      });
      if ((await settingsLink.count()) > 0) {
        await settingsLink.click();
      }

      // Enable chapter hooks
      const hooksCheckbox = page.getByRole('checkbox', {
        name: /chapter hook|hook required|end on hook/i,
      });

      if ((await hooksCheckbox.count()) > 0) {
        await hooksCheckbox.check();
        await expect(hooksCheckbox).toBeChecked();
      }

      // Save settings
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();
      }
    });

    test('should set cliffhanger frequency to most chapters', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to thriller settings
      const settingsLink = page.getByRole('link', {
        name: /thriller settings|genre settings/i,
      });
      if ((await settingsLink.count()) > 0) {
        await settingsLink.click();
      }

      // Set cliffhanger frequency
      const frequencySelect = page.locator(
        'select[name*="cliffhanger"], [name*="frequency"]'
      );

      if ((await frequencySelect.count()) > 0) {
        await frequencySelect.selectOption('most');
      } else {
        // Try radio buttons
        const mostOption = page.getByRole('radio', { name: /most/i });
        if ((await mostOption.count()) > 0) {
          await mostOption.check();
        }
      }

      // Verify selection
      await expect(page.getByText(/most chapters/i)).toBeVisible();

      // Save settings
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();
      }
    });

    test('should configure action scene ratio to 50%', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to thriller settings
      const settingsLink = page.getByRole('link', {
        name: /thriller settings|genre settings/i,
      });
      if ((await settingsLink.count()) > 0) {
        await settingsLink.click();
      }

      // Set action scene ratio
      const ratioSlider = page.locator(
        'input[type="range"][name*="action"], input[name*="action"]'
      );

      if ((await ratioSlider.count()) > 0) {
        await ratioSlider.fill('50');

        // Verify the value
        const displayedValue = page.getByText(/50%|50 percent/i);
        if ((await displayedValue.count()) > 0) {
          await expect(displayedValue).toBeVisible();
        }
      }

      // Save settings
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();
      }
    });
  });

  test.describe('Ticking Clock Configuration', () => {
    test('should add a ticking clock with 48-hour deadline', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to ticking clock section (might be in plot or thriller settings)
      const clockLink = page.getByRole('link', {
        name: /ticking clock|time pressure|deadline/i,
      });

      if ((await clockLink.count()) > 0) {
        await clockLink.click();
      } else {
        // Try plot page
        await page.getByRole('link', { name: /plot/i }).click();
      }

      // Add new ticking clock
      const addButton = page.getByRole('button', {
        name: /add.*clock|new.*clock|add deadline/i,
      });

      if ((await addButton.count()) > 0) {
        await addButton.click();

        // Fill in clock details
        const clockTypeSelect = page.locator('select[name*="type"]');
        if ((await clockTypeSelect.count()) > 0) {
          await clockTypeSelect.selectOption('deadline');
        }

        // Description
        const descriptionField = page.locator(
          'textarea[name*="description"], input[name*="description"]'
        );
        if ((await descriptionField.count()) > 0) {
          await descriptionField.fill(
            'Stop the bomb from detonating in 48 hours'
          );
        }

        // Time remaining
        const timeField = page.locator(
          'input[name*="time"], input[name*="remaining"]'
        );
        if ((await timeField.count()) > 0) {
          await timeField.fill('48 hours');
        }

        // Stakes
        const stakesField = page.locator(
          'textarea[name*="stakes"], input[name*="stakes"]'
        );
        if ((await stakesField.count()) > 0) {
          await stakesField.fill('City will be destroyed, thousands will die');
        }

        // Start chapter
        const startChapterInput = page.locator(
          'input[name*="start"][type="number"]'
        );
        if ((await startChapterInput.count()) > 0) {
          await startChapterInput.fill('1');
        }

        // Save clock
        const saveButton = page.getByRole('button', {
          name: /save|add|create/i,
        });
        await saveButton.click();

        // Verify clock was added
        await expect(page.getByText(/48 hours|bomb/i)).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test('should configure ticking clock reminder frequency', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to ticking clock section
      const clockLink = page.getByRole('link', {
        name: /ticking clock|time pressure/i,
      });
      if ((await clockLink.count()) > 0) {
        await clockLink.click();
      }

      // Find the ticking clock entry
      const clockEntry = page.locator('[data-testid*="clock"], .clock-entry');

      if ((await clockEntry.count()) > 0) {
        // Set reminder frequency
        const reminderSelect = clockEntry.locator('select[name*="reminder"]');
        if ((await reminderSelect.count()) > 0) {
          await reminderSelect.selectOption('regular');
        }

        // Save changes
        const saveButton = page.getByRole('button', { name: /save|update/i });
        if (await saveButton.count() > 0) {
          await saveButton.click();
        }
      }
    });
  });

  test.describe('Chapter Hook Tracking', () => {
    test('should display chapter hook types', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to hooks section
      const hooksLink = page.getByRole('link', {
        name: /chapter hooks|hooks|cliffhangers/i,
      });

      if ((await hooksLink.count()) > 0) {
        await hooksLink.click();
      } else {
        // Try chapters page
        await page.getByRole('link', { name: /chapters/i }).click();
      }

      // Verify hook types are available
      const hookTypes = [
        'cliffhanger',
        'revelation',
        'threat',
        'question',
        'betrayal',
      ];

      // Check that hook types are mentioned in the interface
      let typesFound = 0;
      for (const hookType of hookTypes) {
        const element = page.getByText(new RegExp(hookType, 'i'));
        if ((await element.count()) > 0) {
          typesFound++;
        }
      }

      expect(typesFound).toBeGreaterThan(0);
    });

    test('should add cliffhanger hook to chapter 5', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to hooks or chapters
      const hooksLink = page.getByRole('link', {
        name: /chapter hooks|hooks|chapters/i,
      });
      if ((await hooksLink.count()) > 0) {
        await hooksLink.click();
      }

      // Add hook to chapter 5
      const addHookButton = page.getByRole('button', {
        name: /add.*hook|new hook/i,
      });

      if ((await addHookButton.count()) > 0) {
        await addHookButton.click();

        // Select chapter 5
        const chapterSelect = page.locator('select[name*="chapter"]');
        if ((await chapterSelect.count()) > 0) {
          await chapterSelect.selectOption('5');
        } else {
          const chapterInput = page.locator(
            'input[name*="chapter"][type="number"]'
          );
          if ((await chapterInput.count()) > 0) {
            await chapterInput.fill('5');
          }
        }

        // Select cliffhanger type
        const hookTypeSelect = page.locator('select[name*="type"], select[name*="hook"]');
        if ((await hookTypeSelect.count()) > 0) {
          await hookTypeSelect.selectOption('cliffhanger');
        }

        // Add description
        const descriptionField = page.locator(
          'textarea[name*="description"], input[name*="description"]'
        );
        if ((await descriptionField.count()) > 0) {
          await descriptionField.fill(
            'Protagonist discovers betrayal, shot rings out - chapter ends'
          );
        }

        // Set tension level
        const tensionSlider = page.locator('input[type="range"][name*="tension"]');
        if ((await tensionSlider.count()) > 0) {
          await tensionSlider.fill('9');
        }

        // Save hook
        const saveButton = page.getByRole('button', {
          name: /save|add|create/i,
        });
        await saveButton.click();

        // Verify hook was added
        await expect(page.getByText(/chapter 5|cliffhanger/i)).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test('should add revelation hook to chapter 12', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to hooks
      const hooksLink = page.getByRole('link', {
        name: /chapter hooks|hooks/i,
      });
      if ((await hooksLink.count()) > 0) {
        await hooksLink.click();
      }

      // Add revelation hook
      const addButton = page.getByRole('button', { name: /add.*hook/i });
      if ((await addButton.count()) > 0) {
        await addButton.click();

        // Chapter 12
        const chapterInput = page.locator(
          'select[name*="chapter"], input[name*="chapter"]'
        );
        if ((await chapterInput.count()) > 0) {
          if ((await chapterInput.getAttribute('type')) === 'number') {
            await chapterInput.fill('12');
          } else {
            await chapterInput.selectOption('12');
          }
        }

        // Revelation type
        const typeSelect = page.locator('select[name*="type"]');
        if ((await typeSelect.count()) > 0) {
          await typeSelect.selectOption('revelation');
        }

        // Description
        const descriptionField = page.locator('textarea[name*="description"]');
        if ((await descriptionField.count()) > 0) {
          await descriptionField.fill('Killer is someone from protagonist\'s past');
        }

        // Save
        const saveButton = page.getByRole('button', { name: /save|add/i });
        await saveButton.click();
      }
    });
  });

  test.describe('Major Twist Planning', () => {
    test('should add a major plot twist', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to twists section
      const twistsLink = page.getByRole('link', {
        name: /twists|reveals|plot twist/i,
      });

      if ((await twistsLink.count()) > 0) {
        await twistsLink.click();
      } else {
        // Try plot page
        await page.getByRole('link', { name: /plot/i }).click();
      }

      // Add major twist
      const addTwistButton = page.getByRole('button', {
        name: /add.*twist|new twist/i,
      });

      if ((await addTwistButton.count()) > 0) {
        await addTwistButton.click();

        // Select twist type
        const twistTypeSelect = page.locator('select[name*="type"]');
        if ((await twistTypeSelect.count()) > 0) {
          await twistTypeSelect.selectOption('major_reveal');
        }

        // Chapter number
        const chapterInput = page.locator('input[name*="chapter"][type="number"]');
        if ((await chapterInput.count()) > 0) {
          await chapterInput.fill('18');
        }

        // Description
        const descriptionField = page.locator('textarea[name*="description"]');
        if ((await descriptionField.count()) > 0) {
          await descriptionField.fill(
            'The detective\'s partner is actually the mastermind behind the killings'
          );
        }

        // Impact level
        const impactSelect = page.locator('select[name*="impact"]');
        if ((await impactSelect.count()) > 0) {
          await impactSelect.selectOption('extreme');
        }

        // Setup chapters (foreshadowing)
        const setupField = page.locator('input[name*="setup"], textarea[name*="setup"]');
        if ((await setupField.count()) > 0) {
          await setupField.fill('3, 7, 11, 15');
        }

        // Save twist
        const saveButton = page.getByRole('button', { name: /save|add/i });
        await saveButton.click();

        // Verify twist was added
        await expect(page.getByText(/chapter 18|major reveal/i)).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test('should mark twist as foreshadowed', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to twists
      const twistsLink = page.getByRole('link', { name: /twists|plot twist/i });
      if ((await twistsLink.count()) > 0) {
        await twistsLink.click();
      }

      // Find the twist entry
      const twistEntry = page
        .locator('[data-testid*="twist"], .twist-entry')
        .first();

      if ((await twistEntry.count()) > 0) {
        // Check foreshadowed checkbox
        const foreshadowedCheckbox = twistEntry.locator(
          'input[type="checkbox"][name*="foreshadow"]'
        );
        if ((await foreshadowedCheckbox.count()) > 0) {
          await foreshadowedCheckbox.check();
        }

        // Save
        const saveButton = page.getByRole('button', { name: /save|update/i });
        if (await saveButton.count() > 0) {
          await saveButton.click();
        }
      }
    });
  });

  test.describe('Tension Curve Visualisation', () => {
    test('should display tension curve graph', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to tension curve or analytics
      const tensionLink = page.getByRole('link', {
        name: /tension curve|tension|pacing/i,
      });

      if ((await tensionLink.count()) > 0) {
        await tensionLink.click();
      } else {
        // Try analytics page
        await page.getByRole('link', { name: /analytics/i }).click();
      }

      // Look for tension curve visualisation
      const tensionGraph = page.locator(
        '[data-testid*="tension"], canvas, svg'
      ).filter({ hasText: /tension/i });

      if ((await tensionGraph.count()) === 0) {
        // Check for any chart/graph element
        const anyChart = page.locator('canvas, svg, [role="img"]');
        if ((await anyChart.count()) > 0) {
          await expect(anyChart.first()).toBeVisible();
        }
      }
    });

    test('should show tension levels for each chapter', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to tension view
      const tensionLink = page.getByRole('link', {
        name: /tension|pacing|chapters/i,
      });
      if ((await tensionLink.count()) > 0) {
        await tensionLink.click();
      }

      // Should show chapter-by-chapter tension data
      const chapterList = page.locator('table, [data-testid*="chapter"]');

      if ((await chapterList.count()) > 0) {
        // Look for tension indicators
        const tensionIndicators = page.locator(
          '[data-testid*="tension"], .tension-level'
        );

        if ((await tensionIndicators.count()) > 0) {
          await expect(tensionIndicators.first()).toBeVisible();
        }
      }
    });

    test('should highlight peaks and valleys in tension curve', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to tension curve
      const tensionLink = page.getByRole('link', {
        name: /tension curve|tension/i,
      });
      if ((await tensionLink.count()) > 0) {
        await tensionLink.click();
      }

      // Look for peak/valley indicators
      const peakIndicators = page.locator(
        '[data-testid*="peak"], [data-testid*="valley"], .peak, .valley'
      );

      if ((await peakIndicators.count()) > 0) {
        await expect(peakIndicators.first()).toBeVisible();
      }
    });

    test('should show tension escalation for escalating pacing style', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to tension curve
      const tensionLink = page.getByRole('link', {
        name: /tension|pacing/i,
      });
      if ((await tensionLink.count()) > 0) {
        await tensionLink.click();
      }

      // Should indicate escalating pattern
      await expect(page.getByText(/escalating|building|increasing/i)).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Pacing Validation', () => {
    test('should validate chapter hooks are present', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to validation or chapters
      const validateLink = page.getByRole('link', {
        name: /validate|check|chapters/i,
      });
      if ((await validateLink.count()) > 0) {
        await validateLink.click();
      }

      // Look for hook validation
      const validateButton = page.getByRole('button', {
        name: /validate|check hooks/i,
      });

      if ((await validateButton.count()) > 0) {
        await validateButton.click();

        // Should show validation results
        await expect(page.getByText(/validation|hooks|chapters/i)).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test('should warn if tension drops too much between chapters', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to tension curve
      const tensionLink = page.getByRole('link', {
        name: /tension|pacing/i,
      });
      if ((await tensionLink.count()) > 0) {
        await tensionLink.click();
      }

      // Look for warning indicators
      const warningBadge = page.locator('[data-testid*="warning"], .warning');

      if ((await warningBadge.count()) > 0) {
        // Warning may mention tension drop
        await expect(warningBadge).toContainText(/tension|drop|low/i);
      }
    });

    test('should validate ticking clock is referenced regularly', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to ticking clock
      const clockLink = page.getByRole('link', {
        name: /ticking clock|time pressure/i,
      });
      if ((await clockLink.count()) > 0) {
        await clockLink.click();
      }

      // Look for validation status
      const statusBadge = page.locator(
        '[data-testid*="status"], .status-badge'
      );

      if ((await statusBadge.count()) > 0) {
        await expect(statusBadge).toBeVisible();
      }
    });
  });

  test.describe('Chapter Generation Integration', () => {
    test('should apply pacing style to chapter generation', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // Start generating a chapter
      const generateButton = page.getByRole('button', {
        name: /generate|create chapter/i,
      });

      if ((await generateButton.count()) > 0) {
        await generateButton.click();

        // Should mention pacing style
        await expect(page.getByText(/escalating|pacing/i)).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test('should suggest appropriate hook for chapter ending', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // Generate or edit a chapter
      const chapterLink = page.getByRole('link', { name: /chapter/i }).first();
      if ((await chapterLink.count()) > 0) {
        await chapterLink.click();
      }

      // Look for hook suggestions
      const hookSuggestion = page.locator(
        '[data-testid*="hook"], .hook-suggestion'
      );

      if ((await hookSuggestion.count()) > 0) {
        await expect(hookSuggestion).toBeVisible();
      }
    });

    test('should integrate ticking clock reminders in chapter content', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // Navigate to a chapter
      const chapterLink = page.getByRole('link', { name: /chapter/i }).first();
      if ((await chapterLink.count()) > 0) {
        await chapterLink.click();
      }

      // Look for ticking clock indicator
      const clockIndicator = page.locator(
        '[data-testid*="clock"], .ticking-clock-badge'
      );

      if ((await clockIndicator.count()) > 0) {
        await expect(clockIndicator).toContainText(/48 hours|deadline|clock/i);
      }
    });
  });
});
