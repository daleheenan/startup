# Business Requirements Document: 200k Token Session Monitoring

**Document Version:** 1.0
**Date:** 2026-01-25
**Author:** Project Director
**Status:** Draft

---

## 1. Executive Summary

### 1.1 Purpose
Implement comprehensive token usage monitoring for Claude Code sessions to prevent context window exhaustion during long-running project director orchestrations. The system will track token consumption, alert when approaching the 200k limit, and trigger automatic compaction when thresholds are exceeded.

### 1.2 Business Problem
Claude Max sessions have a 200k token context window. During complex project orchestrations:
- Multiple agents consume tokens rapidly
- Context accumulates without visibility
- Hitting the limit causes session failures
- No warning before context exhaustion
- Manual compaction requires user intervention

### 1.3 Success Criteria
- Real-time visibility into token consumption
- Automatic alerts at configurable thresholds
- Automatic compaction when limits approached
- Zero unexpected session failures due to context exhaustion
- Integration with project-director agent workflow

---

## 2. Business Requirements

### 2.1 Token Tracking Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-001 | Track cumulative token usage per session | MUST | Accurate count within 5% of actual |
| BR-002 | Display current usage as percentage of 200k limit | MUST | Visual indicator in status bar |
| BR-003 | Track token usage per agent invocation | SHOULD | Breakdown by agent type |
| BR-004 | Estimate remaining tokens available | MUST | Real-time calculation |
| BR-005 | Track historical token usage patterns | COULD | Trend analysis for optimization |

### 2.2 Alert Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-006 | Alert at 150k tokens (75% threshold) | MUST | Warning notification to user |
| BR-007 | Alert at 180k tokens (90% threshold) | MUST | Critical notification + action prompt |
| BR-008 | Configurable alert thresholds | SHOULD | User can adjust percentages |
| BR-009 | Alert includes recommended action | MUST | Suggest compaction or summary |
| BR-010 | Alert prevents starting new agents if critical | SHOULD | Block agent spawn at 95% |

### 2.3 Compaction Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-011 | Automatic compaction at configurable threshold | MUST | Triggered at 180k by default |
| BR-012 | Manual compaction via command | MUST | `/compact` command available |
| BR-013 | Preserve critical context during compaction | MUST | Keep last 5 messages + system prompt |
| BR-014 | Generate summary of compacted content | SHOULD | Bullet-point summary of work done |
| BR-015 | Rollback if compaction fails | MUST | Restore previous state on error |

### 2.4 Integration Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-016 | Integrate with project-director agent | MUST | Checks tokens before spawning agents |
| BR-017 | Integrate with sprint-orchestrator | MUST | Monitors token budget per sprint |
| BR-018 | Expose token status via status line | SHOULD | Show in Claude Code UI |
| BR-019 | Log token usage to session file | SHOULD | Audit trail for analysis |
| BR-020 | API to query current token status | MUST | Programmatic access for agents |

---

## 3. Functional Specifications

### 3.1 Token Budget Manager

```typescript
interface TokenBudgetStatus {
  currentTokens: number;        // Current context window usage
  maxTokens: number;            // 200,000 for Claude Max
  percentUsed: number;          // 0-100
  remainingTokens: number;      // Available tokens
  warningLevel: 'normal' | 'warning' | 'critical' | 'blocked';
  estimatedMessagesRemaining: number;
  recommendation: string;
}

interface TokenBreakdown {
  systemPrompt: number;
  conversationHistory: number;
  lastUserMessage: number;
  lastAssistantMessage: number;
  toolResults: number;
}
```

### 3.2 Threshold Configuration

| Threshold | Percentage | Token Count | Action |
|-----------|------------|-------------|--------|
| Normal | 0-74% | 0-148k | No action required |
| Warning | 75-89% | 148k-178k | Show warning, suggest compaction |
| Critical | 90-94% | 178k-188k | Auto-compact or prompt user |
| Blocked | 95-100% | 188k-200k | Block new agent spawns |

### 3.3 Compaction Strategy

**What to Preserve (Always):**
1. System prompt and CLAUDE.md instructions
2. Current task context and objectives
3. Last 5 user/assistant message pairs
4. Active file edits in progress
5. Current todo list state

**What to Summarize:**
1. Earlier conversation history → Bullet-point summary
2. Completed agent outputs → Key results only
3. File reads → Just file paths, not content
4. Search results → Summary of findings

**What to Remove:**
1. Verbose tool outputs (full file contents)
2. Redundant information
3. Failed attempts and corrections
4. Exploratory searches that didn't yield results

### 3.4 User Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/tokens` | Show current token usage | Displays TokenBudgetStatus |
| `/compact` | Manually trigger compaction | Compresses context |
| `/compact --dry-run` | Preview compaction | Shows what would be removed |
| `/tokens --breakdown` | Detailed token breakdown | Shows per-category usage |
| `/tokens --history` | Token usage over session | Graph of consumption |

---

## 4. Technical Architecture

### 4.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code Session                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ Token Counter   │───►│ Budget Manager   │                    │
│  │ (per message)   │    │ (thresholds)     │                    │
│  └─────────────────┘    └────────┬─────────┘                    │
│                                  │                               │
│                                  ▼                               │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ Status Display  │◄───│ Alert System     │                    │
│  │ (status line)   │    │ (notifications)  │                    │
│  └─────────────────┘    └────────┬─────────┘                    │
│                                  │                               │
│                                  ▼                               │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ Compaction      │◄───│ Decision Engine  │                    │
│  │ Service         │    │ (auto/manual)    │                    │
│  └─────────────────┘    └─────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Token Counting Methods

**Option A: Anthropic API Token Counter (Preferred)**
```typescript
// Use Anthropic SDK's message counting API
const tokenCount = await anthropic.messages.countTokens({
  model: 'claude-opus-4-5-20251101',
  messages: conversationHistory,
  system: systemPrompt,
});
```

**Option B: Approximation (Fallback)**
```typescript
// Character-based estimation (~4 chars per token)
const estimatedTokens = Math.ceil(text.length / 4);
```

**Option C: Tiktoken-Compatible (Alternative)**
```typescript
// Use claude-tokenizer package if available
import { countTokens } from 'claude-tokenizer';
const tokens = countTokens(text);
```

### 4.3 Integration Points

**Project Director Integration:**
```typescript
// Before spawning agent
const status = await tokenBudgetManager.getStatus();
if (status.warningLevel === 'blocked') {
  await tokenBudgetManager.triggerCompaction();
  // Retry after compaction
}
```

**Agent Wrapper:**
```typescript
// After each agent completion
tokenBudgetManager.recordAgentUsage({
  agentType: 'developer',
  inputTokens: result.usage.input_tokens,
  outputTokens: result.usage.output_tokens,
  taskDescription: 'Implement feature X',
});
```

---

## 5. User Experience

### 5.1 Status Line Display

```
NovelForge | Tokens: 142,500/200,000 (71%) | ████████░░ | Normal
NovelForge | Tokens: 165,000/200,000 (82%) | █████████░ | ⚠️ Warning
NovelForge | Tokens: 185,000/200,000 (92%) | ██████████ | 🔴 Critical
```

### 5.2 Warning Notification

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ TOKEN WARNING: Context window at 82% (165,000/200,000)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Estimated remaining capacity: ~7 agent invocations

Options:
1. Continue working (may need compaction soon)
2. Run /compact now to free up space
3. Run /compact --dry-run to preview

Recommendation: Continue, will auto-compact at 90%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5.3 Critical Alert

```
╔══════════════════════════════════════════════════════════════════╗
║ 🔴 CRITICAL: Context window at 92% (185,000/200,000)            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║ The session is approaching context limits. Action required.     ║
║                                                                  ║
║ AUTO-COMPACTING in 10 seconds...                                ║
║                                                                  ║
║ Press Ctrl+C to cancel and review manually with /compact --dry  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### 5.4 Compaction Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ COMPACTION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before: 185,000 tokens (92%)
After:  45,000 tokens (22%)
Freed:  140,000 tokens

Summary of preserved context:
• Current task: Sprint 18 implementation
• Files modified: 12 files
• Agents completed: developer, code-reviewer, qa-tester
• Key decisions: Circuit breaker pattern, repository layer

Ready to continue working.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 6. Implementation Phases

### Phase 1: Core Monitoring (MVP)
- Token counting per message
- Basic threshold alerts
- `/tokens` command
- Status line integration

### Phase 2: Automatic Compaction
- Compaction service implementation
- Auto-trigger at thresholds
- Summary generation
- `/compact` command

### Phase 3: Advanced Features
- Per-agent token tracking
- Historical usage patterns
- Configurable thresholds
- Integration with agent learning

---

## 7. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Session failures due to context | 0 | Count of failures |
| Compaction success rate | >99% | Successful compactions / attempts |
| User intervention required | <10% | Auto-handled / total compactions |
| Token estimate accuracy | ±5% | Estimated vs actual |
| Alert lead time | >5 min | Time from warning to limit |

---

## 8. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Inaccurate token counting | Medium | Medium | Use Anthropic API, fallback to estimation |
| Compaction loses context | High | Low | Preserve last 5 messages, summary generation |
| Auto-compact interrupts work | Medium | Medium | 10-second warning, user can cancel |
| Token limit reached before alert | High | Low | Conservative thresholds, buffer zone |

---

## 9. Dependencies

### External Dependencies
- Claude Code CLI (token counting capability)
- Anthropic API (messages.countTokens if available)
- Claude Max subscription (200k context window)

### Internal Dependencies
- Project Director agent
- Sprint Orchestrator agent
- Lessons system (to preserve learnings)

---

## 10. Appendix

### A. Token Estimation Reference

| Content Type | Avg Tokens | Notes |
|--------------|------------|-------|
| System prompt | 500-1,000 | Includes CLAUDE.md |
| User message | 50-500 | Varies by complexity |
| Assistant message | 200-2,000 | Code responses larger |
| File read (small) | 500-2,000 | <100 lines |
| File read (large) | 2,000-10,000 | 100-500 lines |
| Agent output | 1,000-5,000 | Depends on task |
| Tool result | 100-5,000 | Varies widely |

### B. Compaction Ratio Expectations

| Before Compaction | After Compaction | Ratio |
|-------------------|------------------|-------|
| 180k tokens | 40-60k tokens | 3-4.5x |
| 150k tokens | 35-50k tokens | 3-4.3x |
| 120k tokens | 30-45k tokens | 2.7-4x |

### C. Related Documents
- SPRINT_RECOMMENDATIONS.md - Sprint planning
- PROGRESS_TRACKER.md - Project progress
- TECHNICAL_DESIGN.md - Architecture specifications

---

**Document Approval:**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | Dale Heenan | | |
| Technical Lead | | | |
| QA Lead | | | |

---

*End of Document*
