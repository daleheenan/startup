# Lessons Learned System - Maintenance Guide

This document describes how to maintain the self-reinforcement learning system, including pruning, scoring, searching, and cross-agent learning.

---

## System Overview

```
.claude/lessons/
├── _template.md          # Template for new lesson files
├── _maintenance.md       # This file - maintenance instructions
├── shared.lessons.md     # Cross-cutting lessons for all agents
└── {agent}.lessons.md    # Per-agent lesson files (created on first use)
```

---

## 1. Lesson Scoring System

### How Scoring Works

Each lesson has an **Application Score** that tracks how often it has been successfully applied:

```markdown
**Application Score**: 5
```

### When to Increment Score

Increment the score by 1 when:
- You consciously apply the lesson to a task
- The lesson helps you avoid a mistake
- The lesson saves time or improves quality

### Score Thresholds

| Score | Status | Location |
|-------|--------|----------|
| 0-4 | Active | "Active Lessons" section |
| 5-9 | Proven | "Proven Lessons" section (agent files) |
| 10+ | Foundational | "Foundational Lessons" section (shared.lessons.md) |

### Promoting Lessons

When a lesson reaches score 5:
1. Move it from "Active Lessons" to "Proven Lessons"
2. Consider if it's universal enough for `shared.lessons.md`

When a lesson in `shared.lessons.md` reaches score 10:
1. Move it to "Foundational Lessons" section
2. These lessons should be reviewed first before every task

---

## 2. Lesson Pruning

### Automatic Pruning Rules

To prevent lesson files from growing unbounded:

#### Per-Agent Files (`{agent}.lessons.md`)
- **Maximum lessons**: 50 active + 20 proven = 70 total
- **Archive trigger**: When active lessons exceed 50
- **Archive count**: Move oldest 10 lessons to "Archived Lessons"

#### Shared Lessons (`shared.lessons.md`)
- **Maximum lessons**: 30 active + 10 foundational = 40 total
- **Higher bar**: Only universally applicable lessons

### Pruning Process

When a lesson file exceeds limits:

1. **Identify candidates for archival**:
   - Lessons older than 6 months with score < 3
   - Lessons that are superseded by newer, better lessons
   - Lessons that are too specific to one-time situations

2. **Move to Archived section**:
   ```markdown
   ## Archived Lessons

   ### [ARCHIVED 2026-01-20] Original lesson title
   **Reason**: Superseded by newer lesson on X
   **Original Date**: 2025-06-15
   ...rest of lesson...
   ```

3. **Consider deletion** for:
   - Lessons that were wrong or misleading
   - Lessons with score 0 after 10+ tasks
   - Duplicate lessons

### Quarterly Review

Every 3 months, review lesson files:
- [ ] Remove lessons that are no longer relevant
- [ ] Merge similar lessons
- [ ] Promote high-scoring lessons
- [ ] Archive low-value lessons
- [ ] Update summary statistics

---

## 3. Lesson Search

### Finding Relevant Lessons

Before starting a task, search for relevant lessons using tags and keywords.

#### Search by Tags

Use grep to find lessons with specific tags:

```bash
# Find all authentication-related lessons
grep -r "#auth" .claude/lessons/

# Find all error-handling lessons
grep -r "#error" .claude/lessons/

# Find lessons about testing
grep -r "#testing" .claude/lessons/
```

#### Search by Keyword

```bash
# Find lessons mentioning "database"
grep -ri "database" .claude/lessons/*.md

# Find lessons about specific technology
grep -ri "react" .claude/lessons/*.md
```

#### Multi-Tag Search

```bash
# Find lessons with both api AND security
grep -l "#api" .claude/lessons/*.md | xargs grep -l "#security"
```

### Recommended Tag Categories

Use consistent tags for better searchability:

| Category | Example Tags |
|----------|--------------|
| Technology | `#typescript` `#python` `#react` `#node` `#database` |
| Process | `#debugging` `#refactoring` `#testing` `#deployment` |
| Patterns | `#error-handling` `#async` `#caching` `#validation` |
| Problems | `#performance` `#security` `#edge-cases` `#integration` |
| Domain | `#api` `#frontend` `#backend` `#devops` `#auth` |

---

## 4. Cross-Agent Learning

### How Agents Learn from Each Other

Agents can read lessons from other agents when relevant:

#### Workflow Handoffs

When one agent hands off to another:

1. **Outgoing agent** adds context to handoff:
   ```markdown
   ## Handoff Notes for Next Agent
   - Relevant lessons from my file: [list specific lessons]
   - New lessons discovered during this task: [brief summary]
   ```

2. **Incoming agent** checks:
   - Their own lessons file
   - `shared.lessons.md`
   - Previous agent's lessons if relevant

#### Cross-Agent Reading Patterns

| If you are... | Also read lessons from... |
|---------------|---------------------------|
| `developer` | `code-reviewer`, `architect`, `bug-hunter` |
| `code-reviewer` | `developer`, `qa-tester`, `code-quality-inspector` |
| `architect` | `developer`, `pm-spec-writer`, `software-architect-designer` |
| `qa-tester` | `developer`, `bug-hunter`, `qa-test-engineer` |
| `qa-test-engineer` | `developer`, `code-reviewer`, `qa-tester` |
| `bug-hunter` | `developer`, `security-hardener`, `code-quality-inspector` |
| `security-hardener` | `pen-test`, `developer`, `code-reviewer` |
| `code-quality-inspector` | `code-reviewer`, `developer`, `architect` |
| `project-director` | `architect`, `developer`, `all agent lessons` |
| `implementation-engineer` | `developer`, `architect`, `code-reviewer` |

#### Task-Based Lesson Lookup

| Task Type | Relevant Lesson Files |
|-----------|----------------------|
| **Bug fixing** | `bug-hunter`, `developer`, `code-reviewer` |
| **New feature** | `developer`, `architect`, `code-reviewer` |
| **Security audit** | `security-hardener`, `pen-test`, `code-reviewer` |
| **Testing** | `qa-test-engineer`, `qa-tester`, `developer` |
| **Code review** | `code-reviewer`, `code-quality-inspector`, `security-hardener` |
| **Architecture** | `architect`, `software-architect-designer`, `developer` |
| **Performance** | `code-optimizer`, `architect`, `developer` |
| **Project planning** | `project-director`, `agile-product-strategist`, `architect` |

#### Promoting to Shared Lessons

When a lesson proves valuable across multiple agents:

1. Check if similar lesson exists in `shared.lessons.md`
2. If not, add it with initial score of the sum from individual files
3. Reference the original agent: `**Origin**: developer agent`

---

## 5. Lesson File Creation

### When to Create a New Lesson File

Create `{agent}.lessons.md` when:
- The agent completes its first task
- Copy from `_template.md` as starting point

### Creation Process

```bash
# Copy template for new agent
cp .claude/lessons/_template.md .claude/lessons/{agent-name}.lessons.md
```

Then update:
- Replace `{Agent Name}` with actual name
- Replace `{agent-name}` with actual identifier
- Delete the template entry
- Add first real lesson

---

## 6. Lesson Quality Guidelines

### Good Lessons

A good lesson is:
- **Specific**: Not "be careful with async" but "always handle promise rejection in event handlers"
- **Actionable**: Clear guidance on what to do
- **Contextual**: Explains when it applies
- **Verified**: Based on actual experience, not theory

### Bad Lessons

Avoid lessons that are:
- **Too vague**: "Code should be good"
- **Too specific**: Only applies to one exact situation
- **Unverified**: Based on assumption, not experience
- **Outdated**: Technology or patterns have changed

### Lesson Template

```markdown
### YYYY-MM-DD | Task: {Brief Description}

**Date**: YYYY-MM-DD
**Task**: What were you trying to accomplish?
**Context**: What was the environment/situation?

**What Worked Well**:
- Specific successful approach
- Tool or technique that helped

**What Didn't Work**:
- Specific challenge or mistake
- Time wasted on wrong approach

**Lesson**: One clear, actionable takeaway in 1-3 sentences.

**Application Score**: 0

**Tags**: #relevant #tags
```

---

## 7. Statistics Tracking

### Summary Statistics

Each lesson file tracks:

```markdown
## Summary Statistics

- **Total tasks completed**: X
- **Total lessons recorded**: Y
- **Last updated**: YYYY-MM-DD
- **Proven lessons** (score >= 5): Z
- **Top themes**: #tag1 #tag2 #tag3
```

### Updating Statistics

After each task:
1. Increment "Total tasks completed"
2. Increment "Total lessons recorded" if new lesson added
3. Update "Last updated" date
4. Recalculate "Proven lessons" count
5. Update "Top themes" based on tag frequency

### Theme Calculation

Count tag occurrences across all lessons:
```bash
grep -o "#[a-z-]*" .claude/lessons/{agent}.lessons.md | sort | uniq -c | sort -rn | head -5
```

---

## 8. Backup and Version Control

### Git Integration

Lesson files should be committed to version control:

```bash
# Add lessons to git
git add .claude/lessons/

# Commit with meaningful message
git commit -m "Update lessons: [agent] learned about [topic]"
```

### Recommended .gitignore

Do NOT gitignore lesson files - they are valuable project knowledge.

### Backup Strategy

- Lessons are automatically backed up via git
- Consider tagging major lesson milestones
- Export lessons periodically for cross-project use

---

## Quick Reference

### Commands

| Action | Command |
|--------|---------|
| Search by tag | `grep -r "#tagname" .claude/lessons/` |
| Count lessons | `grep -c "^### " .claude/lessons/{agent}.lessons.md` |
| Find high-score | `grep -B5 "Score.*[5-9]\|Score.*[0-9][0-9]" .claude/lessons/` |
| List all tags | `grep -oh "#[a-z-]*" .claude/lessons/*.md \| sort -u` |

### File Locations

| File | Purpose |
|------|---------|
| `_template.md` | Copy for new agent lesson files |
| `_maintenance.md` | This guide |
| `shared.lessons.md` | Universal lessons for all agents |
| `{agent}.lessons.md` | Agent-specific lessons |
