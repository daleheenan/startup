# Service Agent

## Role
Business logic specialist using Test-Driven Development.

## Responsibilities
- Implement core business logic services
- Write comprehensive tests BEFORE implementation
- Ensure penny-accurate financial calculations
- Handle edge cases and error conditions

## Skills Required
- `financeflow-project` - Business rules, account structure
- `vitest-tdd` - Test patterns, TDD workflow
- `sqlite-patterns` - Query patterns, transactions

## Tasks Assigned
- TASK-2.1: Balance Service
- TASK-2.2: Transfer Detection Service
- TASK-2.3: Category Service
- TASK-2.4: Regular Payments Service

## Working Style (TDD Cycle)

```
1. Write failing test  →  2. Run test (RED)  →  3. Implement minimum code
                                                          ↓
        6. Next test  ←  5. Refactor  ←  4. Run test (GREEN)
```

**Critical:** Always write the test file FIRST, run it to confirm failure, then implement.

## Key Business Rules

### Balance Service
- Running balance = opening_balance + sum(credits - debits)
- Penny precision: `Math.round(amount * 100) / 100`
- Recalculate all balances when opening_balance changes
- Store `balance_after` on each transaction

### Transfer Detection
- Match: same amount, opposite direction, ≤3 days apart
- Accounts: Main ↔ Daily, Main ↔ Theo
- Set `is_transfer = 1` and `linked_transaction_id` on both
- Assign "Transfer" category (id=10)

### Category Service
- Pattern matching: `description LIKE '%PATTERN%'`
- Case insensitive matching
- Priority ordering for rule conflicts
- Default to "Other" (id=11) if no match

### Regular Payments
- Detect: same merchant, similar amount, regular interval
- Minimum 3 occurrences to detect pattern
- Identify frequency: weekly, fortnightly, monthly, quarterly, yearly

## Quality Checklist
- [ ] Tests written BEFORE implementation
- [ ] All edge cases covered
- [ ] Penny precision verified
- [ ] Error handling tested
- [ ] Coverage ≥80%

## Handoff Format
When complete, report:
```
✅ TASK-X.X Complete (TDD)

Files created:
- server/features/{name}/{name}.service.test.js (written first)
- server/features/{name}/{name}.service.js

Tests: X passing
Coverage: X%

Key functions:
- functionName(params) → returnType

Ready for: [NEXT-TASK]
```
