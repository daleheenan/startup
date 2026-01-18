# Reusable Agent Prompts

This directory contains reusable agent prompts for common tasks. Reference these when you need specialized assistance.

## Development Agents

| Agent | Purpose | Usage |
|-------|---------|-------|
| [pen-test.md](pen-test.md) | Security vulnerability scanning and red-team testing | `Run the pen-test agent on [feature]` |
| [seo-architect.md](seo-architect.md) | Full-stack SEO optimization for programmatic SEO | `Run the SEO architect agent` |
| [code-simplifier.md](code-simplifier.md) | Refactor for clarity and maintainability | `Run the code simplifier agent` |
| [feature-builder.md](feature-builder.md) | 7-phase structured feature development | `Build feature: [description]` |

## Council/Political Agents

| Agent | Purpose | Usage |
|-------|---------|-------|
| [meeting-assistant.md](meeting-assistant.md) | Analyze agendas, suggest scrutiny questions | `Analyze this meeting agenda` |
| [council-motion.md](council-motion.md) | Draft formal council motions | `Draft a motion about [topic]` |
| [lines-to-take.md](lines-to-take.md) | Create Q&A briefing documents | `Create lines to take on [topic]` |

## How to Use

1. **Reference an agent**: "Run the pen-test agent on the authentication system"
2. **Combine agents**: "Run the feature-builder agent, then the code-simplifier agent"
3. **Customize**: Agents can be modified for specific needs

## Adding New Agents

Create a new `.md` file with:
- `# Agent Name` - Clear title
- `## Purpose` - One-line description
- `## Prompt` - The full prompt in a code block
- `## Usage` - Example invocation

## Agent Categories

- **Security**: pen-test
- **Performance**: seo-architect
- **Code Quality**: code-simplifier
- **Development Process**: feature-builder
- **Content Generation**: council-motion, lines-to-take, meeting-assistant
