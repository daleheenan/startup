# Sprint 16: Security Enhancements - Technical Specification

**Sprint Goal**: Harden authentication and authorisation system with short-lived tokens, refresh mechanism, and comprehensive security controls.

**Story Points**: 35 points
**Target Completion**: Single sprint
**UK British Spelling**: All code, comments, and documentation

---

## Overview

Transform NovelForge's authentication from simple 7-day JWT tokens to a production-grade security system with:
- 15-minute access tokens
- 7-day refresh tokens with database storage
- Token rotation on refresh
- CSRF protection
- SSE single-use tokens
- Password complexity requirements
- Rate limiting on auth endpoints

---

## Current State Analysis

### Backend (Express + SQLite)
```
backend/src/routes/auth.ts
- POST /api/auth/login - Returns 7-day JWT
- GET /api/auth/verify - Validates token

backend/src/middleware/auth.ts
- requireAuth() - Bearer token validation
```

### Frontend (Next.js)
```
app/lib/auth.ts
- login(password) - Stores token in localStorage
- logout() - Clears localStorage
- getToken() - Retrieves token with client-side expiry check
- verifyToken() - Backend verification
```

### Security Gaps
1. Long-lived tokens (7 days) - High risk if stolen
2. LocalStorage storage - Vulnerable to XSS
3. No token revocation mechanism
4. No CSRF protection
5. No rate limiting on auth endpoints
6. No password complexity requirements
7. No SSE authentication

---

## Architecture

### Token Flow Diagram

```
┌─────────────┐
│   Login     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  POST /api/auth/login                   │
│  - Validate password                    │
│  - Generate accessToken (15min)         │
│  - Generate refreshToken (7 days)       │
│  - Hash & store refreshToken in DB      │
│  - Set httpOnly cookie                  │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Response                               │
│  {                                      │
│    accessToken: "eyJhbG...",            │
│  }                                      │
│  Set-Cookie: refreshToken=xxx;          │
│              HttpOnly; Secure;          │
│              SameSite=Strict            │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Frontend stores accessToken in memory  │
│  (Not localStorage)                     │
└─────────────────────────────────────────┘

┌─────────────┐
│ API Request │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Authorization: Bearer {accessToken}    │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  If 401 (Token Expired)                 │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  POST /api/auth/refresh                 │
│  Cookie: refreshToken=xxx               │
│  - Validate refreshToken                │
│  - Check DB for hash                    │
│  - Generate NEW accessToken             │
│  - Generate NEW refreshToken            │
│  - Delete old refreshToken from DB      │
│  - Store new refreshToken hash          │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Response                               │
│  {                                      │
│    accessToken: "eyJhbG...",            │
│  }                                      │
│  Set-Cookie: refreshToken=yyy;          │
└─────────────────────────────────────────┘

┌─────────────┐
│   Logout    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  POST /api/auth/logout                  │
│  Cookie: refreshToken=xxx               │
│  - Delete refreshToken from DB          │
│  - Clear cookie                         │
└─────────────────────────────────────────┘
```

---

## Database Schema

### Migration: 054_refresh_tokens.sql

```sql
-- Refresh token storage for secure token rotation
-- Sprint 16: Security Enhancements

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,              -- 'owner' for now, extensible for multi-user
    token_hash TEXT NOT NULL UNIQUE,    -- bcrypt hash of refresh token
    expires_at TEXT NOT NULL,           -- ISO 8601 timestamp
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT DEFAULT (datetime('now')),
    revoked INTEGER DEFAULT 0,          -- 1 if manually revoked
    revoked_at TEXT,
    user_agent TEXT,                    -- Browser/client identifier
    ip_address TEXT                     -- Request IP for security audit
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Cleanup expired tokens (run periodically)
-- DELETE FROM refresh_tokens WHERE expires_at < datetime('now') OR revoked = 1;
```

### Migration: 055_csrf_tokens.sql

```sql
-- CSRF token storage for form protection
-- Sprint 16: Security Enhancements

CREATE TABLE IF NOT EXISTS csrf_tokens (
    token TEXT PRIMARY KEY,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires ON csrf_tokens(expires_at);

-- Cleanup expired CSRF tokens
-- DELETE FROM csrf_tokens WHERE expires_at < datetime('now');
```

### Migration: 056_sse_tokens.sql

```sql
-- Single-use tokens for SSE authentication
-- Sprint 16: Security Enhancements

CREATE TABLE IF NOT EXISTS sse_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sse_tokens_expires ON sse_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_sse_tokens_user ON sse_tokens(user_id);

-- Cleanup used/expired SSE tokens
-- DELETE FROM sse_tokens WHERE used = 1 OR expires_at < datetime('now');
```

---

## Backend Implementation

### File: backend/src/services/token.service.ts

**Purpose**: Centralised token management (refresh, SSE, CSRF)

**Exports**:
```typescript
// Refresh Token Management
export async function createRefreshToken(userId: string, userAgent?: string, ipAddress?: string): Promise<string>
export async function validateRefreshToken(token: string): Promise<{ valid: boolean; userId?: string }>
export async function rotateRefreshToken(oldToken: string, userAgent?: string, ipAddress?: string): Promise<string>
export async function revokeRefreshToken(token: string): Promise<void>
export async function revokeAllUserTokens(userId: string): Promise<void>
export async function cleanupExpiredTokens(): Promise<void>

// CSRF Token Management
export async function createCsrfToken(): Promise<string>
export async function validateCsrfToken(token: string): Promise<boolean>

// SSE Token Management
export async function createSseToken(userId: string): Promise<string>
export async function validateSseToken(token: string): Promise<{ valid: boolean; userId?: string }>
```

**Implementation Notes**:
- Hash refresh tokens with bcrypt before storage (cost factor 10)
- Refresh tokens expire after 7 days
- CSRF tokens expire after 1 hour
- SSE tokens expire after 30 seconds and are single-use
- Use crypto.randomBytes(32).toString('hex') for token generation
- Clean up expired tokens on each validation (async, non-blocking)

### File: backend/src/routes/auth.ts (Updated)

**New Structure** (following modular pattern):
```
backend/src/routes/auth/
├── index.ts          # Router composition
├── login.ts          # POST /login
├── refresh.ts        # POST /refresh
├── logout.ts         # POST /logout
├── verify.ts         # GET /verify
├── csrf.ts           # GET /csrf-token
├── sse-token.ts      # POST /sse-token
└── utils.ts          # Shared auth utilities
```

**Endpoints**:

#### POST /api/auth/login
```typescript
Request:
{
  password: string
}

Response (200):
{
  accessToken: string  // 15-minute JWT
}
Set-Cookie: refreshToken=xxx; HttpOnly; Secure; SameSite=Strict; Max-Age=604800

Response (400): { error: string }
Response (401): { error: "Invalid password" }
Response (429): { error: "Too many attempts" }  // Rate limit
```

#### POST /api/auth/refresh
```typescript
Request:
Cookie: refreshToken=xxx

Response (200):
{
  accessToken: string  // New 15-minute JWT
}
Set-Cookie: refreshToken=yyy; HttpOnly; Secure; SameSite=Strict; Max-Age=604800

Response (401): { error: "Invalid or expired refresh token" }
Response (429): { error: "Too many refresh attempts" }
```

#### POST /api/auth/logout
```typescript
Request:
Cookie: refreshToken=xxx

Response (200):
{
  message: "Logged out successfully"
}
Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0

Response (401): { error: "No active session" }
```

#### GET /api/auth/verify (Existing, unchanged)
```typescript
Request:
Authorization: Bearer {accessToken}

Response (200):
{
  valid: true,
  user: "owner"
}

Response (401): { valid: false, error: string }
```

#### GET /api/auth/csrf-token
```typescript
Request:
Authorization: Bearer {accessToken}

Response (200):
{
  csrfToken: string  // 1-hour validity
}

Response (401): { error: "Unauthorised" }
```

#### POST /api/auth/sse-token
```typescript
Request:
Authorization: Bearer {accessToken}

Response (200):
{
  sseToken: string  // 30-second, single-use
}

Response (401): { error: "Unauthorised" }
```

### File: backend/src/middleware/csrf.ts

**Purpose**: CSRF protection middleware

```typescript
export async function requireCsrf(req: Request, res: Response, next: NextFunction): Promise<void>
```

**Behaviour**:
1. Check X-CSRF-Token header
2. Validate against csrf_tokens table
3. If valid, proceed; if invalid, 403 Forbidden
4. Apply to state-changing endpoints (POST, PUT, DELETE)
5. Exempt /api/auth/login and /api/auth/refresh (cookie-based)

### File: backend/src/middleware/rate-limit.ts

**Purpose**: Rate limiting configurations

```typescript
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                    // 20 refreshes per window
  message: 'Too many refresh attempts',
});

export const generalRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  max: 100,                   // 100 requests per minute
  message: 'Too many requests',
});
```

### File: backend/src/utils/schemas.ts (Updated)

**Add Password Validation Schema**:
```typescript
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export const loginSchema = z.object({
  password: passwordSchema,
});
```

**Note**: Apply to new password creation only, not login (backwards compatibility).

---

## Frontend Implementation

### File: app/lib/auth.ts (Complete Rewrite)

**Key Changes**:
1. Store `accessToken` in memory (module-level variable), NOT localStorage
2. refreshToken lives in httpOnly cookie (backend-managed)
3. Automatic token refresh on 401 responses
4. CSRF token management
5. SSE token generation

**New Interface**:
```typescript
// In-memory token storage
let accessToken: string | null = null;
let csrfToken: string | null = null;

// Login
export async function login(password: string): Promise<void>

// Logout
export async function logout(): Promise<void>

// Get current access token
export function getAccessToken(): string | null

// Refresh access token
export async function refreshAccessToken(): Promise<string | null>

// Get CSRF token (fetch if needed)
export async function getCsrfToken(): Promise<string | null>

// Generate SSE token
export async function generateSseToken(): Promise<string | null>

// Check authentication status
export function isAuthenticated(): boolean

// Initialise (check for existing session via refresh)
export async function initialise(): Promise<boolean>
```

**Fetch Wrapper with Auto-Refresh**:
```typescript
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  let response = await fetch(url, { ...options, headers, credentials: 'include' });

  // If 401, try refresh once
  if (response.status === 401) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(url, { ...options, headers, credentials: 'include' });
    }
  }

  return response;
}
```

### File: app/lib/api.ts (Updated)

Replace all `fetch()` calls with `authenticatedFetch()` for authenticated endpoints.

### File: app/providers/AuthProvider.tsx (New)

**Purpose**: React Context for authentication state

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { initialise, isAuthenticated, logout as performLogout } from '@/lib/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState(false);

  useEffect(() => {
    initialise().then((status) => {
      setAuthStatus(status);
      setIsLoading(false);
    });
  }, []);

  const logout = async () => {
    await performLogout();
    setAuthStatus(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: authStatus, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### File: app/layout.tsx (Updated)

Wrap with `AuthProvider`:
```typescript
import { AuthProvider } from '@/providers/AuthProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

---

## SSE Authentication

### Challenge
Server-Sent Events (SSE) cannot send custom headers. Current implementation passes token in query string, which is:
1. Logged in server access logs
2. Stored in browser history
3. Security risk

### Solution: Single-Use SSE Tokens

**Flow**:
1. Client requests SSE token: `POST /api/auth/sse-token` (with accessToken)
2. Backend generates 30-second, single-use token
3. Client connects to SSE: `GET /api/events/stream?sseToken=xxx`
4. Backend validates and marks token as used
5. Token cannot be reused

**Implementation**:
```typescript
// backend/src/routes/events.ts (or wherever SSE is)
router.get('/stream', async (req, res) => {
  const { sseToken } = req.query;

  if (!sseToken || typeof sseToken !== 'string') {
    return res.status(401).json({ error: 'SSE token required' });
  }

  const validation = await validateSseToken(sseToken);

  if (!validation.valid) {
    return res.status(401).json({ error: 'Invalid or expired SSE token' });
  }

  // Set up SSE connection
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send events...
});
```

---

## CSRF Protection

### Strategy
Use Double-Submit Cookie pattern with database validation.

### Implementation
1. Client fetches CSRF token: `GET /api/auth/csrf-token`
2. Token stored in database with 1-hour expiry
3. Client includes token in `X-CSRF-Token` header for state-changing requests
4. Backend validates token against database
5. Invalid/missing token = 403 Forbidden

### Apply To
- All POST, PUT, DELETE endpoints
- Except `/api/auth/login` (uses password authentication)
- Except `/api/auth/refresh` (uses httpOnly cookie)

### Middleware Application
```typescript
// backend/src/server.ts
import { requireCsrf } from './middleware/csrf.js';
import { requireAuth } from './middleware/auth.js';

// Apply to protected routes
app.use('/api/projects', requireAuth, requireCsrf, projectsRouter);
app.use('/api/books', requireAuth, requireCsrf, booksRouter);
// etc.

// Auth routes exempt from CSRF (have other protections)
app.use('/api/auth', authRouter);
```

---

## Password Complexity Requirements

### Validation Rules
- Minimum 8 characters
- At least one lowercase letter (a-z)
- At least one uppercase letter (A-Z)
- At least one number (0-9)
- At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

### Application
- New password creation only (future feature)
- NOT applied to login (backwards compatibility)
- Validate on backend with Zod schema
- Provide clear error messages

### Error Response Example
```json
{
  "error": "Password must contain at least one uppercase letter"
}
```

---

## Security Considerations

### XSS Protection
- **Access tokens in memory** - Not in localStorage (XSS can read localStorage)
- **Refresh tokens in httpOnly cookies** - JavaScript cannot access
- **CSP headers** - Already implemented (helmet middleware)

### CSRF Protection
- **CSRF tokens** - Validate on state-changing requests
- **SameSite=Strict cookies** - Prevent cross-site requests
- **Double-submit pattern** - Database validation

### Token Theft Mitigation
- **Short-lived access tokens** - 15 minutes limits damage window
- **Refresh token rotation** - Old tokens invalidated immediately
- **Single-use SSE tokens** - Cannot be replayed
- **Token revocation** - Logout invalidates all tokens

### Rate Limiting
- **Login attempts** - 5 per 15 minutes per IP
- **Refresh attempts** - 20 per 15 minutes per IP
- **General API** - 100 per minute per IP

### Audit Trail
- Log all login attempts (success/failure) with IP
- Log all token refreshes with user agent
- Log all token revocations
- Store IP and user agent with refresh tokens

### Transport Security
- **HTTPS only** - Enforce in production (Railway)
- **Secure cookie flag** - Only sent over HTTPS
- **HSTS headers** - Already in helmet config

---

## Testing Strategy

### Unit Tests

**File**: backend/src/services/token.service.test.ts
- Create refresh token
- Validate refresh token (valid/invalid/expired)
- Rotate refresh token
- Revoke refresh token
- Revoke all user tokens
- Create CSRF token
- Validate CSRF token
- Create SSE token
- Validate SSE token (single-use enforcement)

**File**: backend/src/routes/auth/login.test.ts
- Successful login returns access token and sets cookie
- Invalid password returns 401
- Rate limiting after 5 attempts
- Password validation (future)

**File**: backend/src/routes/auth/refresh.test.ts
- Valid refresh token returns new access token
- Invalid refresh token returns 401
- Token rotation invalidates old token
- Expired refresh token returns 401

**File**: backend/src/routes/auth/logout.test.ts
- Logout revokes refresh token
- Logout clears cookie
- Logout without token returns appropriate error

**File**: backend/src/middleware/csrf.test.ts
- Valid CSRF token allows request
- Invalid CSRF token returns 403
- Missing CSRF token returns 403
- Expired CSRF token returns 403

### Integration Tests

**File**: backend/src/routes/auth/integration.test.ts
- Full authentication flow: login → request → refresh → logout
- Token expiry and automatic refresh
- CSRF protection on protected endpoints
- Rate limiting enforcement
- SSE token generation and consumption

### Frontend Tests

**File**: app/lib/auth.test.ts
- Login stores token in memory
- Logout clears token
- authenticatedFetch auto-refreshes on 401
- CSRF token fetching
- SSE token generation

### Manual Testing Checklist
- [ ] Login with valid password
- [ ] Login with invalid password (rate limit after 5)
- [ ] Access protected endpoint with valid token
- [ ] Access token expires after 15 minutes, auto-refreshes
- [ ] Refresh token expires after 7 days
- [ ] Logout revokes tokens
- [ ] CSRF protection blocks requests without token
- [ ] SSE connection with single-use token
- [ ] SSE token cannot be reused
- [ ] Password complexity validation (future)

---

## Migration/Rollout Plan

### Phase 1: Database Setup
1. Run migration 054_refresh_tokens.sql
2. Run migration 055_csrf_tokens.sql
3. Run migration 056_sse_tokens.sql
4. Verify tables created

### Phase 2: Backend Implementation
1. Create token.service.ts
2. Create rate-limit.ts middleware
3. Create csrf.ts middleware
4. Modularise auth routes (auth/ directory)
5. Update auth.ts to use new token system
6. Update SSE endpoints for token validation
7. Apply rate limiting to auth endpoints
8. Apply CSRF middleware to protected routes

### Phase 3: Frontend Implementation
1. Rewrite auth.ts for in-memory tokens
2. Create AuthProvider.tsx
3. Update layout.tsx to include AuthProvider
4. Replace all fetch() with authenticatedFetch()
5. Update SSE connections to use SSE tokens

### Phase 4: Testing
1. Run unit tests
2. Run integration tests
3. Manual testing checklist
4. Security review (pen-test agent)

### Phase 5: Deployment
1. Backend build and deploy
2. Frontend build and deploy
3. Monitor error rates
4. Monitor authentication metrics
5. Rollback plan: Revert to single long-lived JWT if issues

### Backwards Compatibility
- Existing 7-day tokens continue to work during transition
- Login endpoint supports both old and new clients
- Gradual rollout: Backend first, then frontend

---

## Acceptance Criteria

### Task 1: Short-Lived Access Tokens (8 pts)
- [ ] Access tokens expire after 15 minutes
- [ ] JWT contains user ID and expiry
- [ ] Middleware validates access token expiry
- [ ] 401 returned on expired access token

### Task 2: Refresh Token System (8 pts)
- [ ] refresh_tokens table created
- [ ] Refresh tokens hashed before storage
- [ ] POST /api/auth/refresh endpoint implemented
- [ ] Token rotation on refresh (old token invalidated)
- [ ] Refresh tokens expire after 7 days
- [ ] Stored in httpOnly, Secure, SameSite=Strict cookie

### Task 3: Token Revocation (5 pts)
- [ ] POST /api/auth/logout endpoint implemented
- [ ] Logout deletes refresh token from database
- [ ] Logout clears refresh token cookie
- [ ] Manual revocation function for security incidents

### Task 4: SSE Authentication (5 pts)
- [ ] sse_tokens table created
- [ ] POST /api/auth/sse-token endpoint implemented
- [ ] SSE tokens expire after 30 seconds
- [ ] SSE tokens are single-use (marked as used)
- [ ] SSE endpoints validate SSE tokens

### Task 5: CSRF Protection (5 pts)
- [ ] csrf_tokens table created
- [ ] GET /api/auth/csrf-token endpoint implemented
- [ ] CSRF middleware validates X-CSRF-Token header
- [ ] Applied to all POST/PUT/DELETE protected endpoints
- [ ] 403 returned on invalid/missing CSRF token

### Task 6: Password Requirements (4 pts)
- [ ] Password schema validates complexity
- [ ] Min 8 chars, mixed case, number, special char
- [ ] Applied to password creation (future feature)
- [ ] NOT applied to login (backwards compatibility)

### Task 7: Rate Limiting (Included in above)
- [ ] Login endpoint limited to 5 attempts per 15 min
- [ ] Refresh endpoint limited to 20 attempts per 15 min
- [ ] 429 response on rate limit exceeded

### Task 8: Security Hardening (Included in above)
- [ ] Tokens stored securely (hashed in DB, memory only on client)
- [ ] Cookies use httpOnly, Secure, SameSite=Strict flags
- [ ] Audit logging for auth events
- [ ] No tokens in URLs (except single-use SSE)

---

## File Manifest

### New Files
```
backend/src/services/token.service.ts
backend/src/middleware/csrf.ts
backend/src/middleware/rate-limit.ts
backend/src/routes/auth/index.ts
backend/src/routes/auth/login.ts
backend/src/routes/auth/refresh.ts
backend/src/routes/auth/logout.ts
backend/src/routes/auth/verify.ts
backend/src/routes/auth/csrf.ts
backend/src/routes/auth/sse-token.ts
backend/src/routes/auth/utils.ts
backend/src/db/migrations/054_refresh_tokens.sql
backend/src/db/migrations/055_csrf_tokens.sql
backend/src/db/migrations/056_sse_tokens.sql
app/providers/AuthProvider.tsx
```

### Modified Files
```
backend/src/utils/schemas.ts (add passwordSchema)
backend/src/server.ts (apply rate limiting and CSRF middleware)
backend/src/routes/events.ts (SSE token validation)
app/lib/auth.ts (complete rewrite)
app/lib/api.ts (use authenticatedFetch)
app/layout.tsx (add AuthProvider)
```

### Deleted Files
```
backend/src/routes/auth.ts (replaced by auth/ module)
```

---

## Success Metrics

### Security
- Zero auth bypass vulnerabilities
- Token theft impact limited to 15 minutes (access token lifetime)
- CSRF attacks blocked by token validation
- Rate limiting prevents brute force attacks

### Performance
- Token refresh adds < 100ms latency
- CSRF validation adds < 10ms latency
- Database queries for tokens < 5ms (indexed)

### Reliability
- 99.9% uptime for auth endpoints
- Zero false negatives (valid users blocked)
- < 0.01% false positives (invalid users allowed)

---

## Future Enhancements (Post-Sprint 16)

1. **Multi-User Support** - Extend to multiple users with roles
2. **OAuth Integration** - Google, GitHub login
3. **2FA** - Time-based one-time passwords
4. **Session Management** - View and revoke active sessions
5. **Password Reset** - Email-based password reset flow
6. **Audit Dashboard** - Visualise login attempts, token usage
7. **Anomaly Detection** - Flag suspicious login patterns
8. **Token Fingerprinting** - Bind tokens to device/browser

---

## References

- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP CSRF Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- JWT Best Practices: https://datatracker.ietf.org/doc/html/rfc8725
- Express Rate Limit: https://www.npmjs.com/package/express-rate-limit
- Cookie Security Flags: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies

---

**Specification Version**: 1.0
**Created**: 2026-01-29
**Author**: Project Director (Dale Heenan)
**Status**: Ready for Implementation
