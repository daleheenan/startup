---
description: Execute complete deployment workflow - commit changes, deploy to production, monitor health, and handle failures with automatic remediation
argument-hint: [commit-message-or-sprint-name]
allowed-tools: Bash(git:*), Bash(npm:*), Bash(railway:*), Bash(gh:*), Bash(curl:*), Read, Write, Edit, Grep, Glob
---

# Deployment Workflow

Execute the complete deployment pipeline from code changes to verified production deployment.

**Deployment Context**: $ARGUMENTS

---

## Overview

This workflow automates the entire deployment lifecycle with safety gates and automatic remediation for failures.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT WORKFLOW PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│  │  Pre-Deploy  │───►│   Deployer   │───►│   Monitor    │                 │
│  │   Checks     │    │  (Pat)       │    │   (Zara)     │                 │
│  └──────────────┘    └──────────────┘    └──────────────┘                 │
│         │                   │                   │                          │
│         │ Fail?             │ Fail?             │ Fail?                    │
│         ▼                   ▼                   ▼                          │
│  ┌──────────────────────────────────────────────────────────────┐         │
│  │              Deployment Doctor (automatic remediation)        │         │
│  │                 Diagnose → Fix → Retry                        │         │
│  └──────────────────────────────────────────────────────────────┘         │
│         │                   │                   │                          │
│         ▼                   ▼                   ▼                          │
│  ┌──────────────────────────────────────────────────────────────┐         │
│  │                    ✅ DEPLOYMENT VERIFIED                     │         │
│  │                  Production is healthy                        │         │
│  └──────────────────────────────────────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Pre-Deployment Verification

Before committing or deploying, verify the codebase is deployment-ready.

### 1a. Code Quality Checks

Run locally to catch issues before they reach CI/CD:

```bash
# TypeScript compilation
cd backend && npx tsc --noEmit && cd ..

# Run tests
cd backend && npm test && cd ..

# Build verification
cd backend && npm run build && cd ..
cd app && npm run build && cd ..
```

### 1b. Git Status Review

Ensure only intended changes are staged:

```bash
# Check what will be committed
git status
git diff --stat

# Review for sensitive data
git diff | grep -i "api_key\|password\|secret\|token" || echo "No secrets found"
```

### 1c. Configuration Validation

Verify deployment configuration:

```bash
# Check Railway config exists
cat backend/railway.toml

# Verify health endpoint path
grep "healthcheckPath" backend/railway.toml
```

**If any pre-deploy check fails:**
- Stop the workflow
- Report the specific failure
- Do NOT proceed to deployment

**Wait for all pre-deploy checks to pass before proceeding.**

---

## Phase 2: Commit and Push

Have the **deployer** agent (Pat Okonkwo):

1. Stage the appropriate files
2. Create a descriptive commit message
3. Push to the remote repository

**Commit Message Format:**
```
[type]: Brief description

- Change detail 1
- Change detail 2

Co-Authored-By: [Agent(s)] <noreply@anthropic.com>
```

**Wait for push to complete and verify no errors.**

---

## Phase 3: Deployment Monitoring

Have the **deployment-monitor** agent (Zara Hassan):

1. Watch the deployment pipeline status
2. Monitor for build/deploy failures
3. Once deployed, perform health verification

### 3a. Pipeline Monitoring

```bash
# Check GitHub Actions / Railway deployment status
gh run list --limit 3
railway status
```

### 3b. Health Verification (Post-Deploy)

```bash
# Initial health check
curl -s https://[backend-url]/api/health

# Response time check
curl -s -w "Response time: %{time_total}s\n" -o /dev/null https://[backend-url]/api/health

# Detailed health (if available)
curl -s https://[backend-url]/api/health/detailed | jq
```

### 3c. Error Scanning

```bash
# Check for errors in deployment logs
railway logs --service novelforge-backend -n 100 | grep -i "error\|exception\|fatal"
```

**If deployment or health check fails:**
- Invoke **deployment-doctor** for diagnosis
- Apply recommended fix
- Retry deployment
- If still failing after 2 retries, escalate to user

**Wait for health verification to pass before completing.**

---

## Phase 4: Deployment Verification

After successful deployment, verify everything is working:

### 4a. Functional Verification

```bash
# Test key endpoints
curl -s https://[backend-url]/api/health
curl -s https://[frontend-url]
```

### 4b. Performance Baseline

```bash
# Establish response time baseline (5 samples)
for i in {1..5}; do
  curl -s -w "%{time_total}\n" -o /dev/null https://[backend-url]/api/health
  sleep 1
done
```

### 4c. Final Status

Provide deployment summary:

```markdown
## Deployment Complete

**Status**: SUCCESS / FAILED
**Commit**: [hash] - [message]
**Timestamp**: [datetime]

### Verification Results
| Check | Status |
|-------|--------|
| Build | PASS |
| Deploy | PASS |
| Health Check | PASS |
| Response Time | [X]ms |

### Production URLs
- Backend: [url]
- Frontend: [url]

### Next Steps
- [If applicable] Run smoke tests
- [If applicable] Monitor for 30 minutes
- [If applicable] Notify team
```

---

## Phase 5: Failure Remediation (If Needed)

If any phase fails, automatically attempt remediation:

### 5a. Invoke Deployment Doctor

Have the **deployment-doctor** agent:
1. Analyze the failure
2. Identify root cause
3. Recommend or implement fix

### 5b. Retry Logic

```
Retry attempts: 2
Between retries: Fix identified issue
After 2 failures: Escalate to user with full context
```

### 5c. Rollback (If Critical)

If production is broken and no quick fix is available:
1. Identify last known good commit
2. Revert to that commit
3. Deploy the rollback
4. Document for post-mortem

---

## Workflow Output

### Success Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║ ✅ DEPLOYMENT WORKFLOW COMPLETE                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Commit: [hash]                                                               ║
║ Branch: [branch]                                                             ║
║ Time: [duration]                                                             ║
╚══════════════════════════════════════════════════════════════════════════════╝

Production is healthy. Deployment verified.

Summary:
- Files changed: [N]
- Tests: All passing
- Build: Successful
- Health check: Passing
- Response time: [X]ms

No further action required.
```

### Failure Output
```
╔══════════════════════════════════════════════════════════════════════════════╗
║ ❌ DEPLOYMENT WORKFLOW FAILED                                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Failed at: Phase [N] - [Phase Name]                                          ║
║ Error: [Error summary]                                                       ║
║ Attempts: [N] retries attempted                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

Root Cause: [Analysis]

Recommended Actions:
1. [Action 1]
2. [Action 2]

Manual intervention required.
```

---

## How to Spawn Agents (CRITICAL)

**You MUST use the Task tool to spawn agents. NEVER use Bash commands with CLI flags.**

### Correct Way - Use Task Tool

**Example - Deployer:**
```
Task tool call:
- subagent_type: "deployer"
- prompt: "Commit and deploy the following changes: [description]. Create a commit message following the standard format, push to remote, and monitor the deployment pipeline."
- description: "Deploy code changes"
```

**Example - Deployment Monitor:**
```
Task tool call:
- subagent_type: "deployment-monitor"
- prompt: "Monitor the deployment of [commit/description]. Verify health endpoint responds, check for errors in logs, establish performance baseline."
- description: "Monitor deployment health"
```

**Example - Deployment Doctor (on failure):**
```
Task tool call:
- subagent_type: "deployment-doctor"
- prompt: "Diagnose deployment failure: [error details]. Check common issues, recommend fix, and provide commands to resolve."
- description: "Diagnose deployment failure"
```

### Agent Names for subagent_type
- `deployer` - Commit and push code
- `deployment-monitor` - Health and performance monitoring
- `deployment-doctor` - Failure diagnosis and remediation

---

## Usage Examples

### After Sprint Completion
```
/deploy-workflow Sprint 5: User Authentication
```

### Single Feature Deployment
```
/deploy-workflow feat: Add dark mode toggle
```

### Bug Fix Deployment
```
/deploy-workflow fix: Resolve login timeout issue
```

### Rollback
```
/deploy-workflow rollback: Revert to commit abc123
```

---

## Notes

- This workflow is designed to be autonomous but will escalate if manual intervention is needed
- All deployments are verified before being marked complete
- Failures trigger automatic remediation attempts
- Full audit trail is maintained for each deployment

---

**Version**: 1.0
**Last Updated**: January 2026
**Maintainer**: NovelForge Team
