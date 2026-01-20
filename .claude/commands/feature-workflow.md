---
description: Execute complete feature development workflow from spec through QA
argument-hint: [feature-name] [feature-description]
allowed-tools: Bash(git:*), Bash(npm:*), Read, Write, Edit, Grep, Glob
---

# Feature Development Workflow

Execute a complete feature development cycle with specialized agents.

**Feature Request**: $ARGUMENTS

---

## Phase 1: Specification

Have the **pm-spec-writer** agent create a comprehensive specification for this feature.

The spec should be written to `docs/specs/FEATURE_SPEC.md`.

**Wait for spec completion before proceeding to Phase 2.**

---

## Phase 2: Technical Design

Have the **architect** agent:
1. Read the specification from `docs/specs/FEATURE_SPEC.md`
2. Create a technical design document
3. Break the work into numbered implementation tasks

Output:
- Technical design: `docs/specs/TECHNICAL_DESIGN.md`
- Implementation tasks: `docs/specs/IMPLEMENTATION_TASKS.md`

**Wait for design completion before proceeding to Phase 3.**

---

## Phase 3: Implementation Loop

For each task in `docs/specs/IMPLEMENTATION_TASKS.md`:

### 3a. Development
Have the **developer** agent implement the current task.

### 3b. Code Review
Have the **code-reviewer** agent review the implementation.

- If **CHANGES REQUESTED**: Return to developer agent to fix issues, then re-review
- If **APPROVED**: Proceed to next task (or Phase 4 if all tasks complete)

**Repeat until all tasks are implemented and approved.**

---

## Phase 4: QA Testing

Have the **qa-tester** agent:
1. Review the feature specification and acceptance criteria
2. Create and execute test cases
3. Document results in `docs/specs/QA_REPORT.md`

- If **QA FAILED**: Return to developer agent to fix defects, then re-test
- If **QA PASSED**: Feature is complete!

---

## Workflow Summary

```
[PM Spec Writer] --> [Architect] --> [Developer] <--> [Code Reviewer]
                                          |                  |
                                          v                  |
                                     [QA Tester] -----------+
                                          |
                                          v
                                    Feature Complete!
```

## Notes

- Each phase requires human approval before proceeding
- All documentation is saved in `docs/specs/`
- Review loops continue until approval is granted
- The workflow can be paused and resumed at any phase

---

## How to Spawn Agents (CRITICAL)

**You MUST use the Task tool to spawn agents. NEVER use Bash commands with CLI flags.**

### Correct Way - Use Task Tool
When this workflow says "Have the **agent** agent...", you MUST use the Task tool:
- `subagent_type`: The agent name (e.g., "pm-spec-writer", "architect", "developer")
- `prompt`: The detailed task instructions
- `description`: A short 3-5 word summary

**Example - Phase 1 (PM Spec Writer):**
```
Task tool call:
- subagent_type: "pm-spec-writer"
- prompt: "Create a comprehensive specification for: [feature description]. Write the spec to docs/specs/FEATURE_SPEC.md. Include user stories, acceptance criteria, requirements, edge cases, and scope boundaries."
- description: "Create feature specification"
```

**Example - Phase 2 (Architect):**
```
Task tool call:
- subagent_type: "architect"
- prompt: "Read the specification from docs/specs/FEATURE_SPEC.md. Create a technical design document at docs/specs/TECHNICAL_DESIGN.md. Break the work into numbered implementation tasks at docs/specs/IMPLEMENTATION_TASKS.md."
- description: "Create technical design"
```

**Example - Phase 3 (Developer & Reviewer):**
```
Task tool call:
- subagent_type: "developer"
- prompt: "Implement task [N] from docs/specs/IMPLEMENTATION_TASKS.md. Follow the technical design in docs/specs/TECHNICAL_DESIGN.md."
- description: "Implement feature task"
```

### WRONG Way - Never Do This
```
# WRONG - Will fail with "unknown option --prompt"
Bash: claude agent run --agent pm-spec-writer --prompt "create spec"

# WRONG - CLI doesn't support this
Bash: npx claude --agent developer --task "implement feature"
```

### Agent Names for subagent_type
- `pm-spec-writer` - Phase 1: Specification
- `architect` - Phase 2: Technical design
- `developer` - Phase 3a: Implementation
- `code-reviewer` - Phase 3b: Code review
- `qa-tester` - Phase 4: QA testing
