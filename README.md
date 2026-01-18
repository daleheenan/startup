# Claude Code Startup Kit

A collection of specialized AI agents, workflows, and commands for Claude Code to accelerate software development.

## Quick Start

### Option 1: Setup Script (Recommended)

Clone this repo and run the setup script in your target project:

```bash
# Clone the startup kit
git clone https://github.com/daleheenan/startup.git ~/startup

# Navigate to your project
cd /path/to/your/project

# Run setup (bash)
~/startup/scripts/setup.sh .

# Or PowerShell (Windows)
~/startup/scripts/setup.ps1 -TargetDir .
```

### Option 2: Manual Copy

Copy the `.claude` directory to your project:

```bash
cp -r ~/startup/.claude /path/to/your/project/
```

### Option 3: Global Installation

Install agents globally for all projects:

```bash
cp -r ~/startup/.claude/agents/* ~/.claude/agents/
cp -r ~/startup/.claude/commands/* ~/.claude/commands/
```

## What's Included

### Agents (`.claude/agents/`)

| Agent | Description |
|-------|-------------|
| **pm-spec-writer** | Creates detailed product specifications |
| **architect** | Designs technical solutions and breaks into tasks |
| **developer** | Implements individual coding tasks |
| **code-reviewer** | Reviews code for quality and security |
| **qa-tester** | Tests features and reports defects |
| **agile-product-strategist** | Breaks down complex requirements into sprints |
| **software-architect-designer** | SOLID principles and architecture design |
| **implementation-engineer** | Implements features following best practices |
| **code-quality-inspector** | Comprehensive code reviews |
| **qa-test-engineer** | Automated testing with Playwright |
| **ux-design-specialist** | UI/UX guidance and best practices |
| **code-simplifier** | Refactors and simplifies complex code |
| **pen-test** | Security testing and vulnerability assessment |
| **seo-architect** | SEO optimization guidance |

### Commands (`.claude/commands/`)

| Command | Description |
|---------|-------------|
| `/feature-workflow` | Full PM → Architect → Dev → Review → QA cycle |

### Workflows (`.claude/agents/`)

| Workflow | Description |
|----------|-------------|
| `feature-workflow.md` | Orchestrates complete feature development |
| `design-workflow.md` | UX design and implementation workflow |
| `tech-request.md` | Technical request processing |

## Usage Examples

### Feature Development Workflow

```bash
/feature-workflow "User Authentication" "JWT-based auth with refresh tokens"
```

This triggers:
1. **PM Agent** → Creates product specification
2. **Architect Agent** → Creates technical design + task breakdown
3. **Developer Agent** → Implements each task
4. **Code Reviewer** → Reviews (loops back if issues)
5. **QA Agent** → Tests (loops back if issues)

### Direct Agent Usage

Invoke agents directly by describing your need:

```
Have the architect agent design a caching system for our API
```

```
Have the code-reviewer agent review the changes in src/auth/
```

```
Have the qa-tester agent test the login functionality
```

## Directory Structure

```
.claude/
├── agents/                    # Specialized AI agents
│   ├── pm-spec-writer.md
│   ├── architect.md
│   ├── developer.md
│   ├── code-reviewer.md
│   ├── qa-tester.md
│   └── ... (more agents)
│
├── commands/                  # Slash commands
│   └── feature-workflow.md
│
└── settings.json             # (optional) Project settings
```

## Customization

### Adding New Agents

Create a new `.md` file in `.claude/agents/`:

```markdown
---
name: my-agent
description: What this agent does. Use when [trigger condition].
tools: Read, Write, Edit, Bash
model: sonnet
---

You are [role description]. Your job is to [primary responsibility].

## Your Process
1. Step one
2. Step two

## Output
What to deliver
```

### Adding New Commands

Create a new `.md` file in `.claude/commands/`:

```markdown
---
description: What this command does
argument-hint: [arg1] [arg2]
allowed-tools: Bash(git:*), Read, Write
---

# Command Title

Execute the following for: $ARGUMENTS

## Steps
1. Have the [agent] do [task]
2. Then have [agent] do [next task]
```

## Agent Selection Guide

| Need | Use Agent |
|------|-----------|
| Feature requirements | `pm-spec-writer` or `agile-product-strategist` |
| System design | `architect` or `software-architect-designer` |
| Write code | `developer` or `implementation-engineer` |
| Review code | `code-reviewer` or `code-quality-inspector` |
| Test features | `qa-tester` or `qa-test-engineer` |
| UI/UX design | `ux-design-specialist` |
| Security audit | `pen-test` |
| Refactoring | `code-simplifier` |

## Tips

1. **Start with specs**: Always begin with clear requirements
2. **Review early**: Get code reviewed after each task, not at the end
3. **Test continuously**: Run tests after each implementation
4. **Document decisions**: Keep technical decisions in docs/

## Contributing

Feel free to add new agents or improve existing ones. Each agent should:
- Have a clear, focused purpose
- Include the frontmatter with name, description, tools, model
- Provide structured instructions
- Define expected output format

## License

MIT
