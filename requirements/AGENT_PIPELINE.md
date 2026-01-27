# NovelForge Agent Pipeline Documentation

**Last Updated**: 2026-01-27
**Document Version**: 1.0

---

## Overview

NovelForge uses a **14-step sequential pipeline** for chapter generation. Each chapter processes through all steps before the next chapter begins. There are **no loops** - each job executes exactly once.

---

## Pipeline Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CHAPTER GENERATION PIPELINE                         │
│                              (14 Steps per Chapter)                          │
└─────────────────────────────────────────────────────────────────────────────┘

BOOK STARTS → For each chapter (Ch 1, Ch 2, ... Ch N):

┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: CORE EDITING (Sequential, one chapter at a time)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. generate_chapter ──► 2. dev_edit ──┬──► 3. line_edit                   │
│      (Author Agent)     (Dev Editor)   │    (Line Editor)                  │
│                                        │                                    │
│                              ┌─────────┴─────────┐                         │
│                              │ If NOT approved    │                         │
│                              │ (major issues)     │                         │
│                              ▼                    │                         │
│                         author_revision           │                         │
│                         (CONDITIONAL)             │                         │
│                              │                    │                         │
│                              └────────────────────┘                         │
│                                                                             │
│  ──► 4. continuity_check ──► 5. copy_edit ──► 6. proofread                │
│       (Continuity)          (Copy Editor)     (Proofreader)                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: SPECIALIST REVIEW (Sequential)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  7. sensitivity_review ──► 8. research_review ──► 9. beta_reader_review   │
│     (Sensitivity Reader)   (Researcher)           (Beta Reader)            │
│                                                                             │
│  ──► 10. opening_review ──► 11. dialogue_review ──► 12. hook_review       │
│      (Chapter 1 ONLY)       (Dialogue Coach)        (Hook Specialist)      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: FINALIZATION                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  13. generate_summary ──► 14. update_states ──► CHAPTER COMPLETE           │
│      (Summary for Ch N+1)    (Character states)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    Next chapter starts from Step 1
```

---

## Agent Details

### Phase 1: Core Editing Pipeline

| Step | Job Type | Agent | Purpose | Edits Content? |
|------|----------|-------|---------|----------------|
| 1 | `generate_chapter` | Author Agent | Write initial chapter from scene cards | Creates |
| 2 | `dev_edit` | Developmental Editor | Review structure, pacing, character arcs | No (flags only) |
| 2b | `author_revision` | Author Agent | Revise based on dev feedback (conditional) | Yes |
| 3 | `line_edit` | Line Editor | Polish prose, dialogue, sensory details | Yes |
| 4 | `continuity_check` | Continuity Editor | Check consistency with story bible | No (flags only) |
| 5 | `copy_edit` | Copy Editor | Grammar, punctuation, style | Yes |
| 6 | `proofread` | Proofreader | Final quality check, AI tell removal | Yes |

### Phase 2: Specialist Agents

| Step | Job Type | Agent | Purpose | Edits Content? |
|------|----------|-------|---------|----------------|
| 7 | `sensitivity_review` | Sensitivity Reader | Stereotypes, cultural accuracy | Yes (if issues) |
| 8 | `research_review` | Historical/Technical Researcher | Facts, period accuracy | Yes (if issues) |
| 9 | `beta_reader_review` | Beta Reader | Engagement, confusion points | No (report only) |
| 10 | `opening_review` | Opening Specialist | First line/page optimization | Yes (Ch1 only) |
| 11 | `dialogue_review` | Dialogue Coach | Natural dialogue, voice distinction | Yes (if issues) |
| 12 | `hook_review` | Chapter Hook Specialist | Chapter ending momentum | Yes (if weak) |

### Phase 3: Finalization

| Step | Job Type | Agent | Purpose | Edits Content? |
|------|----------|-------|---------|----------------|
| 13 | `generate_summary` | Summary Generator | Create summary for next chapter context | No |
| 14 | `update_states` | State Updater | Update character states for continuity | No |

---

## Cost Estimates (Per Chapter, ~3000 words)

### Core Editing (Required)

| Agent | Input Tokens | Output Tokens | Cost/Chapter |
|-------|-------------|---------------|--------------|
| Author Agent | ~2,500 | ~4,000 | ~$0.068 |
| Dev Editor | ~4,000 | ~1,500 | ~$0.035 |
| Line Editor | ~4,000 | ~4,000 | ~$0.072 |
| Continuity Editor | ~5,000 | ~1,500 | ~$0.038 |
| Copy Editor | ~4,000 | ~4,000 | ~$0.072 |
| Proofreader | ~4,000 | ~4,000 | ~$0.072 |
| Summary Generator | ~4,000 | ~500 | ~$0.020 |
| State Updater | ~3,000 | ~500 | ~$0.017 |
| **Core Subtotal** | | | **~$0.394** |

### Specialist Agents (Publication Quality)

| Agent | Input Tokens | Output Tokens | Cost/Chapter | Cost/Book (25ch) |
|-------|-------------|---------------|--------------|------------------|
| Sensitivity Reader | ~4,500 | ~1,500 | ~$0.045 | ~$1.13 |
| Researcher | ~5,000 | ~2,000 | ~$0.055 | ~$1.38 |
| Beta Reader | ~4,000 | ~1,500 | ~$0.040 | ~$1.00 |
| Opening Specialist | ~3,500 | ~2,000 | ~$0.042 | ~$0.04 (Ch1 only) |
| Dialogue Coach | ~4,000 | ~1,500 | ~$0.040 | ~$1.00 |
| Hook Specialist | ~3,500 | ~1,000 | ~$0.032 | ~$0.80 |
| **Specialist Subtotal** | | | **~$0.254** | **~$5.35** |

### Total Cost Per Book (25 chapters)

| Configuration | Cost/Chapter | Cost/Book |
|---------------|--------------|-----------|
| Core Only | ~$0.394 | ~$9.85 |
| Core + Specialists | ~$0.648 | ~$16.20 |

*Based on Claude Sonnet 3.5 pricing: $3/M input, $15/M output*

---

## Key Characteristics

### No Loops Confirmation

1. **Jobs queued once** - `queueChapterWorkflow()` creates exactly 14 jobs per chapter
2. **Sequential processing** - Worker processes jobs in order by `created_at` timestamp
3. **One conditional branch** - Only `author_revision` can be dynamically added
4. **No re-queueing** - No agent re-queues the workflow or creates duplicate jobs

### Conditional Logic

The only conditional in the pipeline:

```
dev_edit result:
  ├── approved: true  → Continue to line_edit
  └── approved: false → Queue author_revision → Then continue to line_edit
```

### Specialist Agent Behavior

- **Opening Specialist** skips automatically for chapters 2-N (returns immediately with no API call)
- **Beta Reader** never edits content - only produces engagement report
- Other specialists only edit content if they find issues requiring changes

---

## Source Files

| File | Purpose |
|------|---------|
| `backend/src/services/chapter-orchestrator.service.ts` | Queues all jobs for a chapter |
| `backend/src/queue/worker.ts` | Processes jobs, contains all agent handlers |
| `backend/src/services/editing.service.ts` | Core editing agents (dev, line, continuity, copy, proofread) |
| `backend/src/services/specialist-agents.service.ts` | Specialist agents (sensitivity, research, beta, opening, dialogue, hook) |
| `backend/src/services/context-assembly.service.ts` | Builds prompts for Author Agent |
| `backend/src/shared/types/index.ts` | JobType definitions |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-27 | Initial documentation |
