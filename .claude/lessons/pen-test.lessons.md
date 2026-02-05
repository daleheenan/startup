# Lessons Learned: Penetration Tester

<!--
This file stores accumulated lessons learned by the pen-test agent (Viktor Kowalski).
It is automatically read before each task and updated after task completion.

MAINTENANCE RULES:
- Maximum 50 lessons per file (older lessons archived automatically)
- Lessons with score >= 5 are considered "proven" and prioritized
- Review and prune quarterly or when file exceeds 50 entries
-->

## Summary Statistics

- **Total tasks completed**: 1
- **Total lessons recorded**: 1
- **Last updated**: 2026-02-04
- **Proven lessons** (score >= 5): 0
- **Top themes**: #auth-bypass #rate-limiting #jwt #owasp-top-10

---

## Proven Lessons (Score >= 5)

<!-- Lessons that have been applied successfully 5+ times appear here -->

*No proven lessons yet. Lessons graduate here after being applied successfully 5+ times.*

---

## Active Lessons (Most Recent First)

<!-- New lessons are added at the top of this section -->

### 2026-02-04 | Task: NovelForge Application Penetration Test

**Date**: 2026-02-04
**Task**: Full-stack penetration test of NovelForge novel writing application
**Context**: Express.js backend, Next.js frontend, SQLite database, JWT authentication

**What Worked Well**:
- Systematic OWASP Top 10 methodology caught critical authentication flaws
- Database query pattern analysis revealed SQL injection risks
- Path traversal testing found file serving vulnerability
- Rate limiting analysis exposed brute force attack surface

**What Didn't Work**:
- Initially focused too much on injection; authentication bypass was more severe
- Should have tested webhook signature verification earlier

**Lesson**: Single-user applications often have DISABLED security features (rate limiting, CSRF protection) under the assumption "it's just me". This creates massive attack surface if exposed to internet. Key vulnerabilities found: (1) JWT tokens with no session tracking = can't revoke stolen tokens, (2) Rate limiting disabled by default = unlimited brute force, (3) No CSP = XSS exploitation path, (4) Path traversal in image serving, (5) Default dev JWT secret could be deployed to production. ALWAYS test auth hardening first - it's the foundation. Single-user doesn't mean single-attacker.

**Application Score**: 1

**Tags**: #auth-bypass #rate-limiting #jwt #session-management #path-traversal #sql-injection #csrf #xss #csp #owasp-top-10 #critical #high #single-user

---

## Archived Lessons

<!-- Lessons older than 50 entries or no longer relevant are moved here -->

*No archived lessons yet.*

---

## Tag Categories for Penetration Testing

Use consistent tags for searchability:

- **OWASP**: #injection #xss #csrf #auth-bypass #idor #ssrf
- **Attack Surface**: #api #forms #auth #file-upload #headers
- **Severity**: #critical #high #medium #low #informational
- **Methodology**: #reconnaissance #enumeration #exploitation #reporting
- **Compliance**: #owasp-top-10 #cve #cwe #best-practices
