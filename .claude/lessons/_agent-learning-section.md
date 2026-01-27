# Self-Reinforcement Learning Section

This is the standard section to append to all agents. Copy everything below the line.

---

## Self-Reinforcement Learning

This agent uses a lessons learned system for continuous improvement. **Context is precious** - load only relevant lessons, record only valuable insights.

### Pre-Task: Selective Lesson Loading

Before starting any task, load lessons **selectively** (not exhaustively):

1. **Read ONLY the Proven Lessons section** from your lessons file: `.claude/lessons/{agent-name}.lessons.md`
   - Skip lessons with score < 3 unless directly relevant to current task
   - Don't load the entire file - focus on proven, high-value lessons

2. **Read ONLY the Foundational Lessons section** from shared lessons: `.claude/lessons/shared.lessons.md`
   - These are universal truths with score >= 10
   - Skip Active Lessons unless specifically relevant

3. **For specific task types**, optionally check ONE relevant cross-agent file:

   | Your Task Type | Check ONE of these |
   |----------------|-------------------|
   | Bug fixing | `bug-hunter` |
   | Security work | `security-hardener` |
   | Testing | `qa-test-engineer` |
   | Architecture | `architect` |
   | Deployment | `deployer` |

**NEVER read _archived.lessons.md** - those lessons are archived for a reason.

### During Task: Apply and Track

As you work:
1. Apply relevant lessons proactively
2. Note when a lesson actually helps (for score increment)
3. Note genuinely new insights (not obvious things)

### Post-Task: Selective Recording

**Only record a lesson if it meets ALL these criteria:**

| Criterion | Test |
|-----------|------|
| **Specific** | Does it say exactly what to do? (Not "be careful") |
| **Actionable** | Can another agent follow this guidance? |
| **Reusable** | Will this apply to future tasks? (Not one-time) |
| **Non-obvious** | Would a competent agent not already know this? |
| **Verified** | Did you actually experience this? (Not theory) |

If ANY criterion fails, **do not record the lesson**.

#### Recording a Lesson

If all criteria pass, append to your lessons file:

```markdown
### YYYY-MM-DD | Task: {Brief Task Description}

**Date**: YYYY-MM-DD
**Task**: What were you trying to accomplish?
**Context**: What was the environment/situation?

**What Worked Well**:
- Specific successful approach (be precise)

**What Didn't Work**:
- Specific challenge (what to avoid)

**Lesson**: One clear, actionable takeaway. If you can't state it in 1-2 sentences, it's too vague.

**Application Score**: 0

**Tags**: #specific #tags
```

#### Update Scores for Applied Lessons

When a lesson helps you, increment its score. This is critical for curation:
- Score 0-2: Active, unproven
- Score 3-4: Validated, worth keeping
- Score 5-9: Proven, high value
- Score 10+: Foundational, universal

### Lesson Quality Bar

**GOOD lesson example:**
> "When modifying SQLite queries, always run `EXPLAIN QUERY PLAN` to verify indexes are used. Queries without index hits on large tables cause timeouts."

**BAD lesson examples (do NOT record):**
- "Be careful with database queries" (too vague)
- "Fixed the bug in users.ts line 42" (too specific, one-time)
- "Always test your code" (obvious)
- "TypeScript is useful for catching errors" (not actionable)

### Maintenance

When your lessons file exceeds **25 active lessons**:
1. Request curation from `lessons-curator` agent
2. Or manually archive lessons with score < 3 to `_archived.lessons.md`
3. Never keep lessons that haven't been applied after 10+ tasks

See `.claude/lessons/_maintenance.md` for detailed procedures.
