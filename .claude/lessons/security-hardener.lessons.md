# Lessons Learned: Security Hardener Agent

<!--
This file stores accumulated lessons learned by the security-hardener agent.
It is automatically read before each task and updated after task completion.

MAINTENANCE RULES:
- Maximum 50 lessons per file (older lessons archived automatically)
- Lessons with score >= 5 are considered "proven" and prioritized
- Review and prune quarterly or when file exceeds 50 entries
-->

## Summary Statistics

- **Total tasks completed**: 0
- **Total lessons recorded**: 5
- **Last updated**: 2026-01-25
- **Proven lessons** (score >= 5): 0
- **Top themes**: #security #auth #injection #validation #headers

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

### 2026-01-25 | Task: Authentication Security

**Date**: 2026-01-25
**Task**: Auditing authentication implementation
**Context**: JWT-based auth with bcrypt

**What Worked Well**:
- Checking password hashing algorithm and rounds
- Verifying token expiration handling
- Looking for secure cookie settings

**What Didn't Work**:
- Initially missed token refresh vulnerability

**Lesson**: Auth security checklist: (1) Bcrypt with rounds >= 10, (2) JWT secret from environment, never hardcoded, (3) Token expiration enforced (7 days max), (4) Secure cookie flags (HttpOnly, Secure, SameSite), (5) Rate limiting on login endpoint. Missing any of these is a critical vulnerability.

**Application Score**: 0

**Tags**: #auth #jwt #bcrypt #cookies

---

### 2026-01-25 | Task: Input Validation Audit

**Date**: 2026-01-25
**Task**: Checking input validation across API
**Context**: Express routes with user input

**What Worked Well**:
- Checking that server validates ALL client input
- Looking for type coercion issues
- Verifying length limits on text fields

**What Didn't Work**:
- Missed some nested object validation gaps

**Lesson**: Input validation rules: (1) NEVER trust client-side validation alone, (2) Validate on server for every endpoint, (3) Use schema validation (Zod, Joi) not manual checks, (4) Validate nested objects and arrays, (5) Set maximum lengths to prevent DoS. Client validation is UX only.

**Application Score**: 0

**Tags**: #validation #input #zod #security

---

### 2026-01-25 | Task: Injection Prevention

**Date**: 2026-01-25
**Task**: Auditing for injection vulnerabilities
**Context**: SQL and template usage

**What Worked Well**:
- Finding string concatenation in queries
- Checking for unescaped HTML output
- Looking for eval() or dynamic code execution

**What Didn't Work**:
- N/A

**Lesson**: Injection prevention: (1) SQL - use parameterized queries ALWAYS, never concatenate, (2) XSS - escape HTML output, use React's JSX (auto-escapes), (3) Command injection - never pass user input to shell commands, (4) Template injection - use safe templating engines, (5) JSON - use JSON.parse/stringify, never eval().

**Application Score**: 0

**Tags**: #injection #sql #xss #command-injection

---

### 2026-01-25 | Task: Security Headers Audit

**Date**: 2026-01-25
**Task**: Checking HTTP security headers
**Context**: Express application with frontend

**What Worked Well**:
- Checking for helmet or equivalent middleware
- Verifying CORS configuration
- Looking for CSP headers

**What Didn't Work**:
- Initially missed some CSP bypasses

**Lesson**: Required security headers: (1) Content-Security-Policy - prevent XSS, (2) X-Content-Type-Options: nosniff, (3) X-Frame-Options: DENY, (4) Strict-Transport-Security for HTTPS, (5) CORS - whitelist specific origins, not *. Use helmet middleware to set these automatically.

**Application Score**: 0

**Tags**: #headers #helmet #cors #csp

---

### 2026-01-25 | Task: Secrets Management

**Date**: 2026-01-25
**Task**: Auditing secret handling
**Context**: Application with API keys and credentials

**What Worked Well**:
- Searching for hardcoded secrets
- Checking .env in .gitignore
- Verifying secrets not logged

**What Didn't Work**:
- Initially missed secrets in error stack traces

**Lesson**: Secret management rules: (1) All secrets in environment variables, (2) .env in .gitignore ALWAYS, (3) Never log secrets (check error handlers), (4) Rotate secrets if exposed, (5) Use secret manager in production (AWS Secrets Manager, etc.). One leaked secret can compromise everything.

**Application Score**: 0

**Tags**: #secrets #environment #gitignore #credentials

---

## Archived Lessons

*No archived lessons yet.*
