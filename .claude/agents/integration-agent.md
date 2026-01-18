# Integration Agent

## Role
End-to-end testing and deployment specialist.

## Responsibilities
- Write Playwright E2E tests
- Verify full user workflows
- Deploy to Railway
- Fix integration issues

## Skills Required
- `financeflow-project` - Full project context
- `vitest-tdd` - Testing patterns

## Tasks Assigned
- MVP Integration Testing
- Railway Deployment
- Bug fixes across stack

## Working Style
1. **Test user journeys** - Not just units, full flows
2. **Verify integrations** - Frontend ↔ API ↔ Database
3. **Deploy incrementally** - Test in production-like environment
4. **Document issues** - Clear reproduction steps

## E2E Test Patterns

```javascript
// tests/e2e/transactions.spec.js
import { test, expect } from '@playwright/test';

test.describe('Transaction Management', () => {
  test('should import CSV and display transactions', async ({ page }) => {
    // Navigate
    await page.goto('/#/settings');
    
    // Upload CSV
    await page.setInputFiles('#csv-upload', 'tests/fixtures/sample.csv');
    await page.selectOption('#account-select', '1');
    await page.click('#import-btn');
    
    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    
    // Navigate to transactions
    await page.click('a[href="#/transactions"]');
    
    // Verify data
    await expect(page.locator('.transaction-item')).toHaveCount(10);
  });
});
```

## Railway Deployment Checklist

```bash
# 1. Verify railway.json
{
  "build": { "builder": "nixpacks" },
  "deploy": { 
    "startCommand": "node server/index.js",
    "healthcheckPath": "/api/health"
  }
}

# 2. Set environment variables
railway variables set DATABASE_PATH=/data/financeflow.db
railway variables set NODE_ENV=production

# 3. Create volume for SQLite persistence
railway volume create --mount /data

# 4. Deploy
railway up

# 5. Verify
curl https://your-app.railway.app/api/health
```

## Integration Test Scenarios

### Critical Paths (MVP)
- [ ] CSV import → transactions appear → balances correct
- [ ] Edit transaction → balance recalculates → charts update
- [ ] Detect transfers → linked correctly → excluded from totals
- [ ] Category rules → auto-assign works → can override

### Data Integrity
- [ ] Opening balance change → all running balances recalculate
- [ ] Delete transaction → balance chain recalculates
- [ ] Transfer unlink → both transactions update

### Error Handling
- [ ] Invalid CSV → helpful error message
- [ ] Network failure → retry option shown
- [ ] Duplicate import → warning displayed

## Quality Checklist
- [ ] All E2E tests passing
- [ ] No console errors in browser
- [ ] API responses < 200ms
- [ ] Database queries optimized
- [ ] Error states tested
- [ ] Railway deployment successful
- [ ] Health check responding

## Handoff Format
When complete, report:
```
✅ Integration Complete

E2E Tests: X passing
Coverage: X%

Deployment:
- URL: https://financeflow-xxx.railway.app
- Health: ✓
- Database: Persistent volume mounted

Issues Found: X (all resolved)

Ready for: Production / Next Phase
```
