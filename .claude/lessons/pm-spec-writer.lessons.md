# Lessons Learned: PM Spec Writer

<!--
This file stores accumulated lessons learned by the pm-spec-writer agent (Emily Rodriguez).
It is automatically read before each task and updated after task completion.

MAINTENANCE RULES:
- Maximum 50 lessons per file (older lessons archived automatically)
- Lessons with score >= 5 are considered "proven" and prioritized
- Review and prune quarterly or when file exceeds 50 entries
-->

## Summary Statistics

- **Total tasks completed**: 1
- **Total lessons recorded**: 5
- **Last updated**: 2026-02-04
- **Proven lessons** (score >= 5): 0
- **Top themes**: #feature-spec #acceptance-criteria #database-schema

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

<!-- New lessons are added at the top of this section -->

### Lesson 5: Quantify Everything in Style/Voice Features
**Date**: 2026-02-04
**Score**: 1
**Tags**: #feature-spec #voice-matching #acceptance-criteria #quantifiable

**Context**: Specified "Write Like [Author]" presets and voice fingerprinting for NovelForge.

**What Worked**:
- Defined author presets with quantifiable metrics (sentence length: 12-18 words, Flesch-Kincaid: 6.5, dialogue: 40-50%)
- Made acceptance criteria testable: "If deviation exceeds 20% threshold, flag chapter"
- Avoided vague requirements like "write in King's style" in favour of measurable targets

**Why It Worked**:
Voice/style is inherently subjective. Making it quantifiable enables:
1. Engineering can implement precise algorithms
2. QA can write automated tests
3. Users get clear expectations (not "sounds like King" but "16-word sentences, close-third POV")

**Pattern to Reuse**:
For any "creative" or "subjective" feature:
1. Identify 5-10 quantifiable metrics
2. Provide target ranges, not single values (flexibility)
3. Include examples with actual numbers
4. Make acceptance criteria testable with hard thresholds

**When to Apply**: Features involving AI-generated content, style matching, quality assessment, creative analysis

---

### Lesson 4: Edge Cases Drive Database Schema Design
**Date**: 2026-02-04
**Score**: 1
**Tags**: #database-schema #edge-cases #data-integrity

**Context**: Designed voice fingerprinting schema with soft-delete for author presets.

**What Worked**:
- Identified edge case: "Admin deactivates preset; 50 projects reference it"
- Solution: `is_active` flag (soft delete) + cached preset data in projects
- Prevented data orphaning without breaking existing projects

**Pattern to Reuse**:
When designing schemas:
1. Write edge cases BEFORE finalising schema
2. For reference data (presets, templates), prefer soft-delete
3. Cache critical reference data in dependent tables (snapshot)
4. Add `is_active` or `status` columns for lifecycle management

**When to Apply**: Any schema with cross-table references, especially user-facing reference data

---

### Lesson 3: Personas Make Beta Reader AI More Tangible
**Date**: 2026-02-04
**Score**: 1
**Tags**: #user-stories #personas #alpha-reader #requirements

**Context**: Specified AI alpha reader simulation with demographic-specific personas.

**What Worked**:
- Created concrete personas: "Romance Devourer (25-45, reads 120/year, will DNF after 1 slow chapter)"
- Made abstract concept ("AI reader feedback") concrete and relatable
- Enabled specific acceptance criteria: "Persona 'Sarah' prefers fast pacing → flag 2+ slow chapters as critical"

**Why It Worked**:
Users don't understand "AI analysis algorithms" but DO understand "feedback from a 30-year-old thriller fan who reads 80 books/year". Personas:
1. Make AI behaviour predictable and explainable
2. Allow users to customise (create own personas)
3. Provide natural language framework for feedback generation

**Pattern to Reuse**:
For AI features simulating human behaviour:
1. Create 3-5 detailed personas as examples
2. Include demographics, preferences, thresholds
3. Make personas customisable (not just presets)
4. Frame AI output from persona's POV ("Sarah would find this slow")

**When to Apply**: Features involving AI simulation of human judgment, feedback generation, perspective-taking

---

### Lesson 2: Database Schema in Spec Prevents Ambiguity
**Date**: 2026-02-04
**Score**: 1
**Tags**: #database-schema #technical-design #clarity #specs

**Context**: Included full SQL schema definitions in feature spec for voice/style features.

**What Worked**:
- Specs included complete `CREATE TABLE` statements with column types, indexes, constraints
- Engineers had zero questions about data structure
- Schema served as "contract" between PM vision and technical implementation

**Why It Worked**:
Most spec ambiguity comes from unstated assumptions about data structure. Explicit schema:
1. Forces PM to think through relationships early
2. Surfaces edge cases (e.g., "Can project have multiple author presets?")
3. Enables accurate effort estimation
4. Prevents mid-sprint schema debates

**Pattern to Reuse**:
For features requiring new data entities:
1. Draft schema during spec writing (not after)
2. Include column types, nullability, indexes
3. Show table relationships explicitly
4. Add schema to "Functional Requirements" section

**When to Apply**: Any feature introducing new database tables or modifying existing schema

---

### Lesson 1: "Out of Scope" Section Prevents Scope Creep
**Date**: 2026-02-04
**Score**: 1
**Tags**: #scope-management #requirements #stakeholder-management

**Context**: Specified enhanced voice/style matching and alpha reader features for NovelForge.

**What Worked**:
- Explicit "Out of Scope" section listed 8 things NOT included (e.g., "Real Human Beta Readers", "Multi-Language Support")
- Pre-emptively answered stakeholder questions before they were asked
- Prevented mid-sprint feature additions

**Why It Worked**:
Stakeholders often assume related features are included unless explicitly excluded. Listing out-of-scope items:
1. Sets clear boundaries
2. Shows you've considered adjacent features
3. Provides backlog for future sprints
4. Reduces mid-sprint disruption

**Pattern to Reuse**:
Every spec should include:
1. "Out of Scope" section with 5-10 items
2. Brief explanation WHY each is excluded (legal, cost, complexity, future phase)
3. Reference to future roadmap if applicable

**When to Apply**: All feature specifications, especially complex multi-feature sets

---

## Archived Lessons

<!-- Lessons older than 50 entries or no longer relevant are moved here -->

*No archived lessons yet.*

---

## Tag Categories for Spec Writing

Use consistent tags for searchability:

- **Spec Types**: #feature-spec #bug-fix #enhancement #refactor
- **Sections**: #requirements #acceptance-criteria #edge-cases #dependencies #database-schema
- **Quality**: #clarity #completeness #testability #feasibility #quantifiable
- **Stakeholders**: #user-facing #internal #technical #business
- **Outcomes**: #approved #revision-needed #blocked #clarification
- **Features**: #voice-matching #alpha-reader #prose-analysis #ai-features
