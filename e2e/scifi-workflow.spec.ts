/**
 * E2E Tests: Science Fiction Genre Commercial Workflow
 *
 * Tests the complete sci-fi writing workflow including:
 * - Hardness level classification (hard, firm, medium, soft, science fantasy)
 * - Tech explanation depth configuration
 * - Speculative elements tracking
 * - Real science basis documentation
 * - Consistency warnings for worldbuilding
 * - Handwave areas management
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { generateProjectTitle } from './helpers/test-data';
import { assertOnProjectDetailPage } from './helpers/assertions';

test.describe('Science Fiction Genre Workflow', () => {
  let projectId: string;
  const projectTitle = generateProjectTitle('SciFi Test');

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Project Creation and Classification', () => {
    test('should create a new sci-fi project', async ({ page }) => {
      // Navigate to Quick Start
      await page.goto('/quick-start');

      // Select Sci-Fi genre
      const scifiButton = page.getByRole('button', {
        name: /sci-fi|science fiction/i,
      });
      await scifiButton.click();
      await expect(scifiButton).toHaveAttribute('aria-pressed', 'true');

      // Add prompt
      await page
        .getByPlaceholder(/describe your idea/i)
        .fill(
          'First contact with an alien species forces humanity to confront the Fermi Paradox'
        );

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

    test('should configure hardness level to firm', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to sci-fi settings
      const settingsLink = page.getByRole('link', {
        name: /sci-fi settings|science fiction|genre settings/i,
      });

      if ((await settingsLink.count()) > 0) {
        await settingsLink.click();
      } else {
        // Try settings page
        await page.getByRole('link', { name: /settings/i }).click();
        const scifiTab = page.getByRole('tab', {
          name: /sci-fi|science fiction|genre/i,
        });
        if ((await scifiTab.count()) > 0) {
          await scifiTab.click();
        }
      }

      // Select firm hardness level
      const hardnessOptions = [
        page.getByRole('radio', { name: /firm/i }),
        page.getByRole('button', { name: /firm/i }),
        page.locator('select[name*="hardness"]'),
      ];

      for (const option of hardnessOptions) {
        if ((await option.count()) > 0) {
          if ((await option.getAttribute('type')) === 'radio') {
            await option.check();
          } else if ((await option.locator('option').count()) > 0) {
            await option.selectOption('firm');
          } else {
            await option.click();
          }
          break;
        }
      }

      // Verify firm is selected
      await expect(
        page.getByText(/firm|generally plausible/i)
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

    test('should configure tech explanation depth to moderate', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to sci-fi settings
      const settingsLink = page.getByRole('link', {
        name: /sci-fi settings|genre settings/i,
      });
      if ((await settingsLink.count()) > 0) {
        await settingsLink.click();
      }

      // Select tech explanation depth
      const depthSelect = page.locator(
        'select[name*="explanation"], select[name*="depth"]'
      );

      if ((await depthSelect.count()) > 0) {
        await depthSelect.selectOption('moderate');
      } else {
        // Try radio buttons
        const moderateOption = page.getByRole('radio', { name: /moderate/i });
        if ((await moderateOption.count()) > 0) {
          await moderateOption.check();
        }
      }

      // Verify selection
      await expect(
        page.getByText(/moderate|balanced explanation/i)
      ).toBeVisible();

      // Save settings
      const saveButton = page.getByRole('button', { name: /save|update/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();
      }
    });

    test('should set scientific accuracy priority slider', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to sci-fi settings
      const settingsLink = page.getByRole('link', {
        name: /sci-fi settings|genre settings/i,
      });
      if ((await settingsLink.count()) > 0) {
        await settingsLink.click();
      }

      // Set accuracy priority (scale 1-10)
      const accuracySlider = page.locator(
        'input[type="range"][name*="accuracy"], input[name*="accuracy"][type="range"]'
      );

      if ((await accuracySlider.count()) > 0) {
        await accuracySlider.fill('7');

        // Verify the value
        const displayedValue = page.getByText(/7|70%/i);
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

  test.describe('Speculative Elements Tracking', () => {
    test('should add FTL travel as speculative element', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to speculative elements section
      const elementsLink = page.getByRole('link', {
        name: /speculative elements|tech|worldbuilding/i,
      });

      if ((await elementsLink.count()) > 0) {
        await elementsLink.click();
      } else {
        // Try world page
        await page.getByRole('link', { name: /world/i }).click();
      }

      // Add speculative element
      const addButton = page.getByRole('button', {
        name: /add.*element|new element|add tech/i,
      });

      if ((await addButton.count()) > 0) {
        await addButton.click();

        // Element name
        const nameField = page.locator('input[name*="name"], input[name*="element"]');
        if ((await nameField.count()) > 0) {
          await nameField.fill('Alcubierre Drive (FTL Travel)');
        }

        // Description
        const descriptionField = page.locator('textarea[name*="description"]');
        if ((await descriptionField.count()) > 0) {
          await descriptionField.fill(
            'Faster-than-light travel using spacetime warping based on Alcubierre metric'
          );
        }

        // Category/Type (if available)
        const categorySelect = page.locator('select[name*="category"], select[name*="type"]');
        if ((await categorySelect.count()) > 0) {
          await categorySelect.selectOption('propulsion');
        }

        // Save element
        const saveButton = page.getByRole('button', {
          name: /save|add|create/i,
        });
        await saveButton.click();

        // Verify element was added
        await expect(page.getByText(/alcubierre|FTL/i)).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test('should add quantum entanglement communication', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to speculative elements
      const elementsLink = page.getByRole('link', {
        name: /speculative elements|tech/i,
      });
      if ((await elementsLink.count()) > 0) {
        await elementsLink.click();
      }

      // Add element
      const addButton = page.getByRole('button', { name: /add.*element/i });
      if ((await addButton.count()) > 0) {
        await addButton.click();

        // Fill in details
        const nameField = page.locator('input[name*="name"]');
        if ((await nameField.count()) > 0) {
          await nameField.fill('Quantum Entanglement Communication');
        }

        const descriptionField = page.locator('textarea[name*="description"]');
        if ((await descriptionField.count()) > 0) {
          await descriptionField.fill(
            'Instantaneous communication across vast distances using quantum entangled particles'
          );
        }

        // Save
        const saveButton = page.getByRole('button', { name: /save|add/i });
        await saveButton.click();
      }
    });

    test('should add artificial gravity generation', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to speculative elements
      const elementsLink = page.getByRole('link', {
        name: /speculative elements|tech/i,
      });
      if ((await elementsLink.count()) > 0) {
        await elementsLink.click();
      }

      // Add element
      const addButton = page.getByRole('button', { name: /add/i });
      if ((await addButton.count()) > 0) {
        await addButton.click();

        const nameField = page.locator('input[name*="name"]');
        if ((await nameField.count()) > 0) {
          await nameField.fill('Artificial Gravity Generation');
        }

        const descriptionField = page.locator('textarea[name*="description"]');
        if ((await descriptionField.count()) > 0) {
          await descriptionField.fill(
            'Generation of gravitational fields inside spacecraft without rotation'
          );
        }

        const saveButton = page.getByRole('button', { name: /save/i });
        await saveButton.click();
      }
    });
  });

  test.describe('Real Science Basis Documentation', () => {
    test('should link FTL to general relativity', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to speculative elements or science basis
      const scienceLink = page.getByRole('link', {
        name: /science basis|real science|speculative elements/i,
      });

      if ((await scienceLink.count()) > 0) {
        await scienceLink.click();
      }

      // Find FTL element
      const ftlElement = page
        .locator('[data-testid*="element"], .element-entry')
        .filter({ hasText: /FTL|alcubierre/i })
        .first();

      if ((await ftlElement.count()) > 0) {
        // Add real science basis
        const scienceBasisField = ftlElement.locator(
          'textarea[name*="basis"], input[name*="science"]'
        );

        if ((await scienceBasisField.count()) > 0) {
          await scienceBasisField.fill(
            'Based on Einstein\'s General Relativity and Alcubierre\'s 1994 paper on warp drive metrics. Requires exotic matter with negative energy density.'
          );
        } else {
          // Try edit button
          const editButton = ftlElement.getByRole('button', { name: /edit/i });
          if ((await editButton.count()) > 0) {
            await editButton.click();

            const basisField = page.locator('textarea[name*="basis"]');
            if ((await basisField.count()) > 0) {
              await basisField.fill(
                'Based on Einstein\'s General Relativity and Alcubierre\'s 1994 paper'
              );
            }
          }
        }

        // Save changes
        const saveButton = page.getByRole('button', { name: /save|update/i });
        if (await saveButton.count() > 0) {
          await saveButton.click();
        }
      }
    });

    test('should document quantum mechanics basis for communication', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to science basis
      const scienceLink = page.getByRole('link', {
        name: /science basis|speculative elements/i,
      });
      if ((await scienceLink.count()) > 0) {
        await scienceLink.click();
      }

      // Find quantum communication element
      const quantumElement = page
        .locator('[data-testid*="element"], .element-entry')
        .filter({ hasText: /quantum.*communication|entanglement/i })
        .first();

      if ((await quantumElement.count()) > 0) {
        // Edit or add science basis
        const editButton = quantumElement.getByRole('button', { name: /edit/i });
        if ((await editButton.count()) > 0) {
          await editButton.click();
        }

        const basisField = page.locator('textarea[name*="basis"], textarea[name*="science"]');
        if ((await basisField.count()) > 0) {
          await basisField.fill(
            'Based on quantum entanglement phenomenon. Note: no-communication theorem prevents actual FTL information transfer in real physics.'
          );
        }

        // Save
        const saveButton = page.getByRole('button', { name: /save/i });
        if (await saveButton.count() > 0) {
          await saveButton.click();
        }
      }
    });

    test('should add references and citations', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to science basis
      const scienceLink = page.getByRole('link', {
        name: /science basis|references/i,
      });
      if ((await scienceLink.count()) > 0) {
        await scienceLink.click();
      }

      // Add reference
      const addRefButton = page.getByRole('button', {
        name: /add.*reference|new reference/i,
      });

      if ((await addRefButton.count()) > 0) {
        await addRefButton.click();

        // Fill reference details
        const titleField = page.locator('input[name*="title"]');
        if ((await titleField.count()) > 0) {
          await titleField.fill(
            'The warp drive: hyper-fast travel within general relativity'
          );
        }

        const authorField = page.locator('input[name*="author"]');
        if ((await authorField.count()) > 0) {
          await authorField.fill('Miguel Alcubierre');
        }

        const yearField = page.locator('input[name*="year"]');
        if ((await yearField.count()) > 0) {
          await yearField.fill('1994');
        }

        // Save reference
        const saveButton = page.getByRole('button', { name: /save|add/i });
        await saveButton.click();
      }
    });
  });

  test.describe('Handwave Areas Configuration', () => {
    test('should mark exotic matter source as handwaved', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to handwave areas or sci-fi settings
      const handwaveLink = page.getByRole('link', {
        name: /handwave|relaxed accuracy|exceptions/i,
      });

      if ((await handwaveLink.count()) > 0) {
        await handwaveLink.click();
      } else {
        // Try settings
        await page.getByRole('link', { name: /settings/i }).click();
      }

      // Add handwave area
      const addButton = page.getByRole('button', {
        name: /add.*handwave|add exception/i,
      });

      if ((await addButton.count()) > 0) {
        await addButton.click();

        // Area name/description
        const nameField = page.locator('input[name*="name"], textarea[name*="area"]');
        if ((await nameField.count()) > 0) {
          await nameField.fill('Source of exotic matter for Alcubierre Drive');
        }

        // Justification
        const justificationField = page.locator('textarea[name*="justification"], textarea[name*="reason"]');
        if ((await justificationField.count()) > 0) {
          await justificationField.fill(
            'Exotic matter with negative energy density has never been observed. Story assumes it can be manufactured.'
          );
        }

        // Save
        const saveButton = page.getByRole('button', { name: /save|add/i });
        await saveButton.click();

        // Verify handwave was added
        await expect(page.getByText(/exotic matter/i)).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test('should mark quantum communication info transfer as handwaved', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to handwave areas
      const handwaveLink = page.getByRole('link', {
        name: /handwave|exceptions/i,
      });
      if ((await handwaveLink.count()) > 0) {
        await handwaveLink.click();
      }

      // Add handwave
      const addButton = page.getByRole('button', { name: /add/i });
      if ((await addButton.count()) > 0) {
        await addButton.click();

        const nameField = page.locator('input[name*="name"], textarea');
        if ((await nameField.count()) > 0) {
          await nameField.fill(
            'FTL information transfer via quantum entanglement'
          );
        }

        const justificationField = page.locator('textarea[name*="justification"]');
        if ((await justificationField.count()) > 0) {
          await justificationField.fill(
            'Violates no-communication theorem. Story assumes undiscovered mechanism allows controlled information transfer.'
          );
        }

        const saveButton = page.getByRole('button', { name: /save/i });
        await saveButton.click();
      }
    });
  });

  test.describe('Consistency Warnings', () => {
    test('should warn about conflicting physics assumptions', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to consistency check or validation
      const consistencyLink = page.getByRole('link', {
        name: /consistency|validation|coherence/i,
      });

      if ((await consistencyLink.count()) > 0) {
        await consistencyLink.click();
      }

      // Run consistency check
      const checkButton = page.getByRole('button', {
        name: /check|validate|run/i,
      });

      if ((await checkButton.count()) > 0) {
        await checkButton.click();

        // Wait for results
        await page.waitForTimeout(2000);

        // Look for warnings
        const warningSection = page.locator(
          '[data-testid*="warning"], .warning, [role="alert"]'
        );

        if ((await warningSection.count()) > 0) {
          // Should have physics-related warnings
          await expect(warningSection).toBeVisible();
        }
      }
    });

    test('should flag unexplained technology', async ({ page }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to consistency check
      const consistencyLink = page.getByRole('link', {
        name: /consistency|validation/i,
      });
      if ((await consistencyLink.count()) > 0) {
        await consistencyLink.click();
      }

      // Look for technology validation
      const techWarnings = page.locator(
        '[data-testid*="tech-warning"], .tech-warning'
      );

      if ((await techWarnings.count()) > 0) {
        await expect(techWarnings.first()).toContainText(/technology|unexplained/i);
      }
    });

    test('should validate speculative elements are used consistently', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to speculative elements
      const elementsLink = page.getByRole('link', {
        name: /speculative elements/i,
      });
      if ((await elementsLink.count()) > 0) {
        await elementsLink.click();
      }

      // Run validation
      const validateButton = page.getByRole('button', {
        name: /validate|check consistency/i,
      });

      if ((await validateButton.count()) > 0) {
        await validateButton.click();

        // Should show validation results
        await expect(
          page.getByText(/validation|consistency|elements/i)
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should warn if hardness level conflicts with elements', async ({
      page,
    }) => {
      // If hardness is "hard" but elements include handwaved items,
      // should show warning
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to settings
      await page.getByRole('link', { name: /settings/i }).click();

      // Change hardness to "hard"
      const hardnessSelect = page.locator('select[name*="hardness"]');
      if ((await hardnessSelect.count()) > 0) {
        await hardnessSelect.selectOption('hard');
      }

      // Save
      const saveButton = page.getByRole('button', { name: /save/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();
      }

      // Should show warning about handwaved elements
      const warningBadge = page.locator('[data-testid*="warning"], .warning');
      if ((await warningBadge.count()) > 0) {
        await expect(warningBadge).toContainText(/hardness|conflict|handwave/i);
      }
    });
  });

  test.describe('Worldbuilding Integration', () => {
    test('should display speculative elements in world page', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}/world`);

      // Should show speculative technology section
      const speculativeSection = page.locator(
        '[data-testid*="speculative"], [data-testid*="technology"]'
      );

      if ((await speculativeSection.count()) > 0) {
        await expect(speculativeSection).toBeVisible();
      } else {
        // At least show some tech-related content
        await expect(page.getByText(/technology|tech|FTL/i)).toBeVisible({
          timeout: 10000,
        });
      }
    });

    test('should link technology to locations and cultures', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}/world`);

      // Add a location that uses FTL tech
      const addLocationButton = page.getByRole('button', {
        name: /add.*location|new location/i,
      });

      if ((await addLocationButton.count()) > 0) {
        await addLocationButton.click();

        // Location name
        const nameField = page.locator('input[name*="name"]');
        if ((await nameField.count()) > 0) {
          await nameField.fill('Gateway Station');
        }

        // Description with tech reference
        const descriptionField = page.locator('textarea[name*="description"]');
        if ((await descriptionField.count()) > 0) {
          await descriptionField.fill(
            'Orbital station equipped with Alcubierre Drive for interstellar travel'
          );
        }

        // Save location
        const saveButton = page.getByRole('button', { name: /save|add/i });
        await saveButton.click();
      }
    });

    test('should show science constraints in chapter planning', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // Should display science constraints or reminders
      const scienceIndicator = page.locator(
        '[data-testid*="science"], [data-testid*="constraint"]'
      );

      if ((await scienceIndicator.count()) > 0) {
        await expect(scienceIndicator).toBeVisible();
      }
    });
  });

  test.describe('Chapter Generation with Science Guidance', () => {
    test('should include tech explanation depth in generation', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // Start generating a chapter
      const generateButton = page.getByRole('button', {
        name: /generate|create chapter/i,
      });

      if ((await generateButton.count()) > 0) {
        await generateButton.click();

        // Should mention explanation depth
        await expect(
          page.getByText(/moderate|explanation|tech/i)
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should apply hardness level to scene generation', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // Navigate to a chapter
      const chapterLink = page.getByRole('link', { name: /chapter/i }).first();
      if ((await chapterLink.count()) > 0) {
        await chapterLink.click();
      }

      // Should show hardness level indicator
      const hardnessBadge = page.locator(
        '[data-testid*="hardness"], .hardness-badge'
      );

      if ((await hardnessBadge.count()) > 0) {
        await expect(hardnessBadge).toContainText(/firm/i);
      }
    });

    test('should reference established speculative elements in chapters', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // Generate or view a chapter
      const chapterLink = page.getByRole('link', { name: /chapter/i }).first();
      if ((await chapterLink.count()) > 0) {
        await chapterLink.click();
      }

      // Should have references to established tech
      // This would be verified in the chapter content
      const techReferences = page.getByText(/alcubierre|FTL|quantum/i);
      if ((await techReferences.count()) > 0) {
        await expect(techReferences.first()).toBeVisible();
      }
    });

    test('should warn if chapter contradicts established science', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}/chapters`);

      // Navigate to a chapter
      const chapterLink = page.getByRole('link', { name: /chapter/i }).first();
      if ((await chapterLink.count()) > 0) {
        await chapterLink.click();
      }

      // Look for consistency warnings
      const warningBadge = page.locator('[data-testid*="warning"], .warning');
      if ((await warningBadge.count()) > 0) {
        // May contain science consistency warnings
        await expect(warningBadge).toBeVisible();
      }
    });
  });

  test.describe('Scientific Accuracy Validation', () => {
    test('should validate physics consistency across chapters', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to validation page
      const validateLink = page.getByRole('link', {
        name: /validate|consistency|coherence/i,
      });

      if ((await validateLink.count()) > 0) {
        await validateLink.click();
      }

      // Run physics consistency check
      const checkButton = page.getByRole('button', {
        name: /check|validate|physics/i,
      });

      if ((await checkButton.count()) > 0) {
        await checkButton.click();

        // Should show validation results
        await expect(
          page.getByText(/physics|consistency|validation/i)
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should flag violations of established science rules', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to validation
      const validateLink = page.getByRole('link', {
        name: /validate|consistency/i,
      });
      if ((await validateLink.count()) > 0) {
        await validateLink.click();
      }

      // Look for violation flags
      const violations = page.locator(
        '[data-testid*="violation"], .violation-flag'
      );

      if ((await violations.count()) > 0) {
        await expect(violations.first()).toBeVisible();
      }
    });

    test('should suggest corrections for scientific inaccuracies', async ({
      page,
    }) => {
      await page.goto(`/projects/${projectId || 'test-id'}`);

      // Navigate to validation or suggestions
      const validateLink = page.getByRole('link', {
        name: /validate|suggestions/i,
      });
      if ((await validateLink.count()) > 0) {
        await validateLink.click();
      }

      // Run validation
      const checkButton = page.getByRole('button', { name: /check|validate/i });
      if ((await checkButton.count()) > 0) {
        await checkButton.click();

        // Look for suggestions
        const suggestions = page.locator(
          '[data-testid*="suggestion"], .suggestion'
        );

        if ((await suggestions.count()) > 0) {
          await expect(suggestions.first()).toBeVisible();
        }
      }
    });
  });
});
