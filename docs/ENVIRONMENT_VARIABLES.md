# Environment Variables Reference

Comprehensive guide to environment variables for backend applications.

## Quick Reference

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port (Railway sets automatically) |
| `NODE_ENV` | Yes | `production` | Environment mode |
| `JWT_SECRET` | Yes | `abc123...` | JWT signing secret (32+ chars) |
| `DATABASE_PATH` | Conditional | `/data/app.db` | SQLite database location |
| `DATABASE_URL` | Conditional | `postgresql://...` | PostgreSQL connection string |
| `FRONTEND_URL` | Yes | `https://app.example.com` | CORS allowed origin |
| `LOG_LEVEL` | No | `info` | Logging verbosity |
| `SENTRY_DSN` | No | `https://...@sentry.io/...` | Error tracking |

## Detailed Configuration

### Server

```bash
# Port for the HTTP server
# Railway sets this automatically - don't hardcode
PORT=3001

# Environment: development | production | test
# Controls logging format, error detail, and security checks
NODE_ENV=production

# Service name for logs and error tracking
SERVICE_NAME=my-api
```

### Security

```bash
# JWT secret for token signing
# MUST be at least 32 characters in production
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-very-long-secret-key-at-least-32-characters

# Bcrypt password hash for admin/owner access
# Generate: node -e "console.log(require('bcrypt').hashSync('password', 10))"
OWNER_PASSWORD_HASH=$2b$10$...
```

### Database

#### SQLite

```bash
# Path to SQLite database file
# For Railway, use mounted volume: /data/app.db
DATABASE_PATH=/data/app.db
```

#### PostgreSQL

```bash
# Full connection string
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

### CORS

```bash
# Frontend URL for CORS (no trailing slash)
# Must match exactly - includes protocol
FRONTEND_URL=https://app.example.com

# For multiple origins, implement custom CORS logic
```

### Logging

```bash
# Log level: debug | info | warn | error
# Use 'debug' in development, 'info' in production
LOG_LEVEL=info
```

### External APIs

```bash
# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-opus-4-5-20251101

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@example.com
```

### Error Tracking

```bash
# Sentry DSN for error tracking
# Leave empty to disable
SENTRY_DSN=https://abc123@o123.ingest.sentry.io/456
```

## Railway Configuration

### Setting Variables

1. Go to Railway dashboard
2. Select your service
3. Click "Variables" tab
4. Add each variable

### Railway-Specific Notes

- `PORT` is set automatically by Railway - don't set it
- Use persistent volumes for `DATABASE_PATH` (e.g., `/data`)
- Set `NODE_ENV=production` for production deployments

### Required for Railway

```bash
NODE_ENV=production
JWT_SECRET=<your-secret>
FRONTEND_URL=<your-frontend-url>
DATABASE_PATH=/data/app.db  # If using SQLite with volume
```

## Development vs Production

### Development (.env)

```bash
NODE_ENV=development
PORT=3001
JWT_SECRET=dev-only-insecure-secret-change-in-production
DATABASE_PATH=./data/dev.db
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug
```

### Production (Railway)

```bash
NODE_ENV=production
# PORT is set by Railway
JWT_SECRET=<secure-random-string-32-chars>
DATABASE_PATH=/data/app.db
FRONTEND_URL=https://app.example.com
LOG_LEVEL=info
SENTRY_DSN=https://...@sentry.io/...
```

## Validation

The server validates environment variables at startup:

```typescript
function validateEnvironment() {
  const errors = [];

  // Required in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET is required');
    }
    if (process.env.JWT_SECRET?.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters');
    }
  }

  return errors;
}
```

If validation fails in production, the server exits with an error message.

## Security Best Practices

1. **Never commit secrets** - Use `.env.example` as a template
2. **Use strong secrets** - Generate random strings with crypto
3. **Rotate secrets** - Change JWT_SECRET periodically
4. **Limit access** - Only give production access to necessary team members
5. **Use different secrets per environment** - Don't share between dev/staging/prod

## Generating Secrets

### JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Password Hash

```bash
node -e "console.log(require('bcrypt').hashSync('your-password', 10))"
```

### API Key (for your own API)

```bash
node -e "console.log('sk_' + require('crypto').randomBytes(24).toString('hex'))"
```
