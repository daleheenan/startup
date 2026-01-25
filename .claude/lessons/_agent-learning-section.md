# Self-Reinforcement Learning Section

This is the standard section to append to all agents. Copy everything below the line.

---

## Self-Reinforcement Learning

This agent uses a lessons learned system for continuous improvement. Follow these steps for every task.

### Pre-Task: Load Lessons

Before starting any task:

1. **Read your lessons file**: `.claude/lessons/{agent-name}.lessons.md`
   - If it doesn't exist, that's OK - you'll create it after your first task
   - Focus on "Proven Lessons" section first (score >= 5)
   - Then scan "Active Lessons" for relevant entries

2. **Read shared lessons**: `.claude/lessons/shared.lessons.md`
   - Always read the "Foundational Lessons" section
   - Scan "Active Lessons" for anything relevant to your task

3. **Search for relevant lessons** by task type:
   ```bash
   grep -r "#relevant-tag" .claude/lessons/
   ```

4. **Note applicable lessons**: Mentally note which lessons apply to your current task

5. **Check cross-agent lessons** using this lookup table:

   | Your Task Type | Read These Lesson Files |
   |----------------|------------------------|
   | Bug fixing | `bug-hunter`, `developer`, `code-reviewer` |
   | New feature | `developer`, `architect`, `code-reviewer` |
   | Security audit | `security-hardener`, `pen-test` |
   | Testing | `qa-test-engineer`, `qa-tester`, `developer` |
   | Code review | `code-reviewer`, `code-quality-inspector` |
   | Architecture | `architect`, `software-architect-designer` |
   | Performance | `code-optimizer`, `architect` |
   | Project planning | `project-director`, `agile-product-strategist` |

### During Task: Apply and Track

As you work:

1. **Apply relevant lessons** proactively
2. **When a lesson helps**, make a note to increment its score
3. **When you discover something new**, note it for post-task reflection
4. **When you make a mistake**, note what went wrong

### Post-Task: Reflect and Record

After completing each task, perform a lessons learned reflection:

#### Step 1: Reflect (30 seconds)

Ask yourself:
- What was challenging about this task?
- What worked well that I should repeat?
- What didn't work that I should avoid?
- Did I apply any existing lessons? Did they help?
- What would I do differently next time?

#### Step 2: Update Scores

For each lesson you successfully applied:
1. Read the lesson file
2. Find the lesson entry
3. Increment the `**Application Score**` by 1
4. If score reaches 5, move to "Proven Lessons" section
5. If score reaches 10 and universally applicable, consider adding to `shared.lessons.md`

#### Step 3: Record New Lesson (if applicable)

If you learned something new, append a lesson to your lessons file:

```markdown
### YYYY-MM-DD | Task: {Brief Task Description}

**Date**: YYYY-MM-DD
**Task**: What were you trying to accomplish?
**Context**: What was the environment/situation?

**What Worked Well**:
- Specific successful approach or technique
- Tool or pattern that helped

**What Didn't Work**:
- Specific challenge or mistake made
- Time wasted on wrong approach

**Lesson**: Clear, actionable insight in 1-3 sentences.

**Application Score**: 0

**Tags**: #relevant #tags #here
```

#### Step 4: Update Statistics

Update the Summary Statistics at the top of your lessons file:
- Increment "Total tasks completed"
- Increment "Total lessons recorded" if you added a lesson
- Update "Last updated" date
- Recalculate "Proven lessons" count if any crossed threshold

#### Step 5: Cross-Agent Lessons

If your lesson applies to other agents or is universally valuable:
1. Consider adding to `shared.lessons.md`
2. Note in the lesson: `**Cross-Agent Relevance**: [which agents]`

### Lesson Quality Guidelines

**Good lessons are:**
- **Specific**: Not "be careful" but "always check X before Y"
- **Actionable**: Clear guidance on what to do
- **Contextual**: Explains when it applies
- **Verified**: Based on actual experience

**Bad lessons are:**
- Too vague ("code should be good")
- Too specific (only applies to one exact situation)
- Unverified (theory without experience)

### Maintenance

When your lessons file exceeds 50 active lessons:
1. Archive the oldest 10 lessons with score < 3
2. Merge similar lessons
3. Review and prune irrelevant lessons

See `.claude/lessons/_maintenance.md` for detailed maintenance procedures.
