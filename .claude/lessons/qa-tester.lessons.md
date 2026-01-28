# Lessons Learned: QA Tester

<!--
This file stores accumulated lessons learned by the qa-tester agent (Lisa Chen).
It is automatically read before each task and updated after task completion.

MAINTENANCE RULES:
- Maximum 50 lessons per file (older lessons archived automatically)
- Lessons with score >= 5 are considered "proven" and prioritized
- Review and prune quarterly or when file exceeds 50 entries
-->

## Summary Statistics

- **Total tasks completed**: 1
- **Total lessons recorded**: 2
- **Last updated**: 2026-01-28
- **Proven lessons** (score >= 5): 0
- **Top themes**: #code-review #ui #navigation #design-tokens #accessibility #dead-code

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

### 2026-01-28 | Task: Dashboard Layout Code Review

**Date**: 2026-01-28
**Task**: Code review of Sidebar, DashboardLayout, MetricCard, and Projects page against design requirements.
**Context**: Verifying a new dashboard shell implementation with sidebar navigation, metric cards, and two-column content layout.

**What Worked Well**:
- Read design-tokens.ts first to verify exact colour values referenced in requirements (e.g. sidebar background `#1E1E2F`, background primary `#F8FAFC`)
- Traced import chains: DashboardLayout imports `./SearchModal` which resolves to the directory `SearchModal/index.tsx` not a sibling `SearchModal.tsx` — caught duplicate file issue
- Cross-referenced all five requirement categories against source line numbers for precise evidence in the report
- Ran `npx next build` to confirm zero compilation errors across all 40+ routes before issuing verdict
- Checked that accessibility attributes were present: `aria-label`, `aria-current`, `aria-expanded`, `aria-modal`, `aria-hidden` on decorative elements
- Verified responsive behaviour via the injected `@media` style block in DashboardLayout

**What Didn't Work**:
- Initially read the standalone `SearchModal.tsx` thinking it was the active implementation; the directory-based `SearchModal/index.tsx` is actually what gets imported. Always check directory vs file resolution when both exist.

**Lesson**: When reviewing UI layout implementations against design specs: (1) Start with the design token file to anchor all colour/spacing checks to concrete hex values, (2) When a component imports a module name that could be either a file or a directory, check both paths — Next.js/webpack resolves directory `index.tsx` over sibling `.tsx` files, (3) Run the full build before issuing a verdict — compilation errors invalidate any visual correctness claims, (4) For sidebar/navigation reviews, verify the active-state styling chain end-to-end: context state -> nav group -> nav item -> CSS token, (5) Flag dead code (duplicate files, unused implementations) even when the active code is correct — dead code causes confusion for future developers, (6) Note when a loading state bypasses a layout shell — users expect consistent chrome (sidebar, header) even during data fetches, (7) Verify data mapping in activity/feed components — semantic mismatches (genre displayed where title is expected) are subtle but user-facing bugs.

**Application Score**: 0

**Tags**: #code-review #ui #navigation #design-tokens #accessibility #dead-code #responsive #sidebar #dashboard

---

### 2026-01-28 | Task: Spotting Data Mapping Mismatch in Activity Feed

**Date**: 2026-01-28
**Task**: Identified that `buildActivityFeed` in `page.tsx` maps `project.genre` to the `projectName` field of `ActivityItem`, causing genre labels to display where story titles are expected.
**Context**: Projects page activity feed derivation logic.

**What Worked Well**:
- Traced the data flow from `buildActivityFeed` helper through `ActivityItem` type definition in `RecentActivityFeed.tsx` to the rendering in `ActivityRow` where `activity.projectName` is displayed
- Noticed the semantic mismatch without needing to run the application — pure static analysis

**What Didn't Work**:
- N/A — straightforward trace once the helper function was read

**Lesson**: When reviewing data transformation helpers that map source objects to display models, always verify that field names match their semantic intent. A field called `projectName` should contain a project name (title), not a genre or category. These mismatches are invisible in TypeScript because both are strings, but they produce confusing UI for end users.

**Application Score**: 0

**Tags**: #code-review #data-mapping #ui #medium-severity #semantic-mismatch

---

## Archived Lessons

<!-- Lessons older than 50 entries or no longer relevant are moved here -->

*No archived lessons yet.*

---

## Tag Categories for QA Testing

Use consistent tags for searchability:

- **Test Types**: #functional #regression #edge-case #integration #smoke
- **Findings**: #bug #usability #performance #security #accessibility
- **Severity**: #critical #high #medium #low #cosmetic
- **Areas**: #ui #api #database #auth #forms #navigation
- **Process**: #test-plan #test-case #reproduction-steps #verification
