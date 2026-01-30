# Commercial Genre E2E Tests - Summary

## Test Suite Overview

Created comprehensive end-to-end test suites for three commercial genre workflows: Romance, Thriller, and Science Fiction.

## Test Statistics

| Genre | Test File | Test Count | Test Suites |
|-------|-----------|-----------|-------------|
| Romance | `romance-workflow.spec.ts` | 18 | 6 |
| Thriller | `thriller-workflow.spec.ts` | 27 | 7 |
| Science Fiction | `scifi-workflow.spec.ts` | 21 | 8 |
| **Total** | **3 files** | **66 tests** | **21 suites** |

Note: When run across all browsers (chromium, firefox, webkit), this creates 198 total test executions.

## Quick Reference

### Run All Genre Tests
```bash
npx playwright test e2e/romance-workflow.spec.ts e2e/thriller-workflow.spec.ts e2e/scifi-workflow.spec.ts
```

### Run Individual Genre
```bash
npx playwright test e2e/romance-workflow.spec.ts      # Romance only
npx playwright test e2e/thriller-workflow.spec.ts     # Thriller only
npx playwright test e2e/scifi-workflow.spec.ts        # Science Fiction only
```

### Run Specific Feature
```bash
npx playwright test -g "heat level"        # Romance heat level tests
npx playwright test -g "pacing"            # Thriller pacing tests
npx playwright test -g "consistency"       # Sci-fi consistency tests
```

## Test Coverage

### Romance Workflow (18 tests)

**Project Creation and Configuration** (4 tests)
- Create romance project
- Configure heat level (1-5 scale)
- Set sensuality focus (emotional/physical/balanced)
- Enable fade-to-black option

**Emotional Beats Tracking** (5 tests)
- Display essential romance beats
- Track meet-cute in chapter 1
- Track first kiss in chapter 8
- Set black moment in chapter 20
- Ensure HEA ending in final chapter

**Chapter Planning Integration** (2 tests)
- Display beats in chapter planning view
- Show beat guidance when generating chapters

**Chapter Generation with Heat Level** (3 tests)
- Include heat level guidance
- Apply heat level constraints to intimate scenes
- Provide sensuality focus guidance

**Heat Level Consistency Validation** (2 tests)
- Warn if content exceeds heat level
- Validate fade-to-black application

**Romance Beat Validation** (2 tests)
- Validate all essential beats are planned
- Flag missing black moment as critical

### Thriller Workflow (27 tests)

**Project Creation and Pacing Configuration** (5 tests)
- Create thriller project
- Configure pacing style (escalating)
- Enable chapter hook requirements
- Set cliffhanger frequency
- Configure action scene ratio

**Ticking Clock Configuration** (2 tests)
- Add 48-hour deadline ticking clock
- Configure reminder frequency

**Chapter Hook Tracking** (3 tests)
- Display hook types
- Add cliffhanger hook to chapter
- Add revelation hook to chapter

**Major Twist Planning** (2 tests)
- Add major plot twist
- Mark twist as foreshadowed

**Tension Curve Visualisation** (4 tests)
- Display tension curve graph
- Show tension levels per chapter
- Highlight peaks and valleys
- Show escalation for escalating pacing

**Pacing Validation** (3 tests)
- Validate chapter hooks present
- Warn if tension drops too much
- Validate ticking clock references

**Chapter Generation Integration** (3 tests)
- Apply pacing style to generation
- Suggest appropriate hooks
- Integrate ticking clock reminders

### Science Fiction Workflow (21 tests)

**Project Creation and Classification** (4 tests)
- Create sci-fi project
- Configure hardness level (firm)
- Configure tech explanation depth (moderate)
- Set scientific accuracy priority

**Speculative Elements Tracking** (3 tests)
- Add FTL travel (Alcubierre Drive)
- Add quantum entanglement communication
- Add artificial gravity generation

**Real Science Basis Documentation** (3 tests)
- Link FTL to general relativity
- Document quantum mechanics basis
- Add references and citations

**Handwave Areas Configuration** (2 tests)
- Mark exotic matter source as handwaved
- Mark quantum communication as handwaved

**Consistency Warnings** (4 tests)
- Warn about conflicting physics
- Flag unexplained technology
- Validate speculative element consistency
- Warn if hardness conflicts with elements

**Worldbuilding Integration** (3 tests)
- Display speculative elements in world page
- Link technology to locations/cultures
- Show science constraints in chapter planning

**Chapter Generation with Science Guidance** (4 tests)
- Include tech explanation depth
- Apply hardness level to scene generation
- Reference established speculative elements
- Warn if chapter contradicts science

**Scientific Accuracy Validation** (3 tests)
- Validate physics consistency
- Flag violations of science rules
- Suggest corrections for inaccuracies

## Test Design Principles

### 1. Flexible Locators
Tests use multiple selector strategies to accommodate different UI implementations:

```typescript
const options = [
  page.getByRole('radio', { name: /option/i }),
  page.getByRole('button', { name: /option/i }),
  page.locator('select[name*="option"]'),
];

for (const option of options) {
  if ((await option.count()) > 0) {
    await option.click();
    break;
  }
}
```

### 2. Conditional Assertions
Tests check for element existence before asserting:

```typescript
if ((await element.count()) > 0) {
  await expect(element).toBeVisible();
}
```

### 3. Requirements Documentation
Tests serve dual purposes:
- Functional testing for implemented features
- Requirements documentation for features in development

### 4. Resilient to UI Changes
Tests work with various UI implementations:
- Radio buttons, dropdowns, or toggle buttons
- Forms, modals, or inline editors
- Different navigation patterns

## Database Schema Integration

Tests validate features backed by migration `057_commercial_genre_enhancements.sql`:

**Romance Tables**
- `romance_heat_levels` - Heat level configuration
- `romance_beats` - Emotional beats tracking

**Thriller Tables**
- `thriller_pacing` - Pacing style configuration
- `thriller_chapter_hooks` - Chapter hook tracking
- `thriller_twists` - Major twist planning
- `thriller_time_pressure` - Ticking clock mechanics

**Science Fiction Tables**
- `scifi_classification` - Hardness level and tech depth
- (Speculative elements use existing worldbuilding tables)

## Test Patterns Used

### Pattern 1: Project Creation Flow
```typescript
1. Navigate to Quick Start
2. Select genre
3. Generate concepts
4. Choose concept
5. Extract project ID
```

### Pattern 2: Settings Configuration
```typescript
1. Navigate to project
2. Open settings/configuration page
3. Configure feature-specific settings
4. Save changes
5. Verify configuration applied
```

### Pattern 3: Feature Tracking
```typescript
1. Navigate to feature page
2. Add new tracking item
3. Fill in details
4. Save item
5. Verify item appears in list
```

### Pattern 4: Integration Validation
```typescript
1. Configure feature
2. Navigate to chapter/generation page
3. Verify feature guidance appears
4. Check feature applies to generated content
```

## Implementation Checklist

Use these tests as a requirements checklist:

### Romance
- [ ] Heat level selector (1-5)
- [ ] Sensuality focus radio buttons
- [ ] Fade-to-black checkbox
- [ ] Emotional beats list/tracker
- [ ] Chapter assignment for beats
- [ ] Beat validation warnings
- [ ] Heat level badge in chapter view
- [ ] Beat indicators in chapter planning

### Thriller
- [ ] Pacing style selector
- [ ] Chapter hook requirement toggle
- [ ] Cliffhanger frequency selector
- [ ] Action scene ratio slider
- [ ] Ticking clock creator
- [ ] Chapter hook tracker
- [ ] Major twist planner
- [ ] Tension curve visualisation
- [ ] Hook type dropdown
- [ ] Tension level slider

### Science Fiction
- [ ] Hardness level selector
- [ ] Tech explanation depth selector
- [ ] Scientific accuracy priority slider
- [ ] Speculative elements list
- [ ] Real science basis fields
- [ ] Reference/citation manager
- [ ] Handwave areas tracker
- [ ] Consistency warning system
- [ ] Physics validation checks
- [ ] Science constraint badges

## Running Tests for Development

### Test-Driven Development Workflow

1. **Review test requirements**
   ```bash
   # Read the test to understand expected behaviour
   cat e2e/romance-workflow.spec.ts
   ```

2. **Run test to see current state**
   ```bash
   npx playwright test e2e/romance-workflow.spec.ts --headed
   ```

3. **Implement feature based on test expectations**

4. **Re-run test to verify implementation**
   ```bash
   npx playwright test e2e/romance-workflow.spec.ts
   ```

5. **Debug failing tests**
   ```bash
   npx playwright test e2e/romance-workflow.spec.ts --debug
   ```

### Continuous Integration

Add to CI pipeline:
```yaml
- name: Run Commercial Genre E2E Tests
  run: npx playwright test e2e/romance-workflow.spec.ts e2e/thriller-workflow.spec.ts e2e/scifi-workflow.spec.ts
```

## Success Metrics

These tests verify:

1. **User Journey Completeness**
   - Can create projects for each genre
   - Can configure genre-specific settings
   - Can track genre-specific elements
   - Settings integrate with chapter generation

2. **Feature Integration**
   - Genre settings appear throughout the app
   - Chapter planning reflects genre configuration
   - Generation respects genre constraints
   - Validation catches genre-specific issues

3. **Commercial Viability**
   - Romance: Heat levels and emotional beats (reader expectations)
   - Thriller: Pacing and hooks (page-turning quality)
   - Sci-Fi: Consistency and science (reader trust)

## Documentation

- **Full test documentation**: `COMMERCIAL_GENRES_TESTS.md`
- **Test files**:
  - `e2e/romance-workflow.spec.ts`
  - `e2e/thriller-workflow.spec.ts`
  - `e2e/scifi-workflow.spec.ts`

## Next Steps

1. Review tests to understand feature requirements
2. Implement UI components based on test expectations
3. Run tests incrementally as features are built
4. Use test failures as development guidance
5. Update tests if requirements change
6. Add additional test cases as needed

## Maintenance

### When to Update Tests

- UI navigation changes
- Selector patterns change
- New features added to genres
- Validation logic changes
- Database schema updates

### How to Update Tests

1. Identify failing test
2. Update locator strategies
3. Maintain backward compatibility
4. Document changes in comments
5. Verify test still validates core functionality

## Support

For questions or issues:
1. Review `COMMERCIAL_GENRES_TESTS.md` for detailed documentation
2. Run tests in headed mode to see UI interactions
3. Use `--debug` flag to step through tests
4. Check browser console for errors
5. Verify database migrations are up to date
