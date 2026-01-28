# NovelForge Setup Guide

Complete installation and configuration guide for NovelForge.

## System Requirements

### Minimum Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **Node.js**: Version 18.0.0 or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 500MB for application + 100MB per project
- **Internet**: Stable connection for Claude API calls

### Required Accounts

- **Anthropic Account**: Sign up at anthropic.com
- **Claude API Key**: Create from console.anthropic.com

### Recommended

- **Claude Max Subscription**: For higher rate limits and faster generation
  - Max 5x: $100/month - ~225 messages per 5-hour session
  - Max 20x: $200/month - ~900+ messages per 5-hour session

## Installation Steps

### 1. Install Node.js

**Windows:**
1. Download from nodejs.org
2. Run installer
3. Verify installation:
   ```bash
   node --version  # Should show v18.0.0 or higher
   npm --version   # Should show 9.0.0 or higher
   ```

**macOS:**
```bash
# Using Homebrew
brew install node@18

# Verify
node --version
npm --version
```

**Linux (Ubuntu/Debian):**
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### 2. Clone or Download NovelForge

**Option A: Git Clone**
```bash
git clone <repository-url> novelforge
cd novelforge
```

**Option B: Download ZIP**
1. Download ZIP file
2. Extract to desired location
3. Navigate to folder:
   ```bash
   cd novelforge
   ```

### 3. Install Dependencies

**Backend Dependencies:**
```bash
cd backend
npm install
```

This installs:
- Express (API server)
- better-sqlite3 (Database)
- @anthropic-ai/sdk (Claude AI)
- docx (DOCX export)
- pdfkit (PDF export)
- cors (CORS handling)
- dotenv (Environment variables)
- TypeScript and type definitions

**Frontend Dependencies (Optional):**
```bash
cd ../frontend
npm install
```

### 4. Configure Environment

Create `backend/.env` file:

```env
# REQUIRED: Your Claude API key
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Model Selection (optional)
CLAUDE_MODEL=claude-opus-4-20250514

# Database Path (optional)
# Defaults to ../data/novelforge.db
DATABASE_PATH=../data/novelforge.db
```

**How to get your API key:**
1. Go to console.anthropic.com
2. Sign in or create account
3. Navigate to API Keys section
4. Create new API key
5. Copy the key (starts with `sk-ant-api03-`)
6. Paste into `.env` file

**IMPORTANT**: Keep your API key secret! Never commit `.env` to version control.

### 5. Initialize Database

Run database migrations:

```bash
cd backend
npm run migrate
```

You should see:
```
Database connected: C:\Users\...\novelforge\data\novelforge.db
[Migrations] Running database migrations...
[Migrations] Current schema version: 0
[Migrations] Applying migration 001: Base schema
[Migrations] Migration 001 applied successfully
[Migrations] Applying migration 002: Trilogy support
[Migrations] Migration 002 applied successfully
[Migrations] All migrations complete
```

This creates:
- `data/novelforge.db` - SQLite database file
- All required tables
- Initial session tracking record

### 6. Build TypeScript

Compile TypeScript to JavaScript:

```bash
npm run build
```

This creates the `dist/` folder with compiled JavaScript.

### 7. Start the Server

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

You should see:
```
🚀 NovelForge Backend Server
   Port: 3001
   Frontend: http://localhost:3000
   Environment: development

✅ Server started successfully

🔄 Starting queue worker...
[Queue] Queue worker started
[Queue] Processing jobs...
```

### 8. Verify Installation

**Test API Connection:**
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-24T12:00:00.000Z"
}
```

**Test Claude API Connection:**
```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"concept": {"title": "Test"}, "preferences": {"genre": "fantasy"}}'
```

If successful, you'll get a project ID back.

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | Your Claude API key |
| `PORT` | No | 3001 | Backend server port |
| `FRONTEND_URL` | No | http://localhost:3000 | Frontend URL for CORS |
| `NODE_ENV` | No | development | Environment mode |
| `CLAUDE_MODEL` | No | claude-opus-4-20250514 | Claude model to use |
| `DATABASE_PATH` | No | ../data/novelforge.db | Database file location |

### Claude Model Options

| Model | Use Case | Cost | Speed |
|-------|----------|------|-------|
| `claude-opus-4-20250514` | Best quality, recommended | $$$ | Slower |
| `claude-sonnet-4-20250514` | Good balance | $$ | Fast |
| `claude-haiku-3-20250110` | Quick drafts | $ | Fastest |

**Recommendation**: Use Opus 4 for final novels, Sonnet 4 for testing.

### Database Configuration

The default SQLite database location is `data/novelforge.db`.

**To change location:**
```env
DATABASE_PATH=/path/to/your/database.db
```

**To reset database:**
```bash
rm data/novelforge.db*
npm run migrate
```

This deletes all projects and starts fresh.

## Platform-Specific Setup

### Windows

**Install Build Tools (if you encounter compilation errors):**
```powershell
npm install --global windows-build-tools
```

**Set Execution Policy (if PowerShell scripts blocked):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Path Issues:**
- Use forward slashes in paths: `C:/Users/...` not `C:\Users\...`
- Or double backslashes: `C:\\Users\\...`

### macOS

**If `npm install` fails with permission errors:**
```bash
sudo chown -R $USER /usr/local/lib/node_modules
```

**If better-sqlite3 fails to compile:**
```bash
xcode-select --install
```

### Linux

**Install build essentials:**
```bash
sudo apt-get install -y build-essential python3
```

**If permission errors:**
```bash
sudo chown -R $USER:$USER ~/.npm
```

## Railway Deployment

NovelForge can be deployed to Railway with persistent storage for the SQLite database.

### 1. Create Railway Project

1. Sign up at railway.app
2. Create new project
3. Connect your GitHub repository

### 2. Configure Environment Variables

In Railway dashboard, add these variables:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | Your Claude API key |
| `DATABASE_PATH` | `/data/novelforge.db` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Your frontend URL (or `*` for any) |

### 3. Volume Configuration

The `railway.toml` file is pre-configured to mount a persistent volume:

```toml
[[mounts]]
source = "novelforge_data"
destination = "/data"
```

This ensures your database persists across:
- Server restarts
- New deployments
- Container recreation

### 4. Deploy

Push to your connected branch:

```bash
git push origin main
```

Railway will automatically:
1. Build the application
2. Create/attach the volume
3. Run database migrations
4. Start the server

### 5. Verify Deployment

Check Railway logs for:
```
🚀 NovelForge Backend Server
   Port: 3001
   Environment: production

✅ Server started successfully
```

### Railway Tips

- **Scaling**: Railway handles auto-scaling automatically
- **Logs**: View real-time logs in Railway dashboard
- **Custom Domain**: Add in Settings > Domains
- **Costs**: Pay-as-you-go, typically $5-20/month for light use

## Docker Setup (Advanced)

**Dockerfile** (create in project root):

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY package*.json ./

# Install dependencies
RUN cd backend && npm install

# Copy source code
COPY backend/ ./backend/
COPY shared/ ./shared/
COPY data/ ./data/

# Build TypeScript
RUN cd backend && npm run build

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "backend/dist/server.js"]
```

**Build and run:**
```bash
docker build -t novelforge .
docker run -p 3001:3001 -e ANTHROPIC_API_KEY=your-key novelforge
```

## Troubleshooting Setup

### npm install fails

**Error**: `gyp ERR! stack Error: not found: python`

**Solution**: Install Python 3
```bash
# Windows
choco install python

# macOS
brew install python3

# Linux
sudo apt-get install python3
```

### Database migration fails

**Error**: `SQLITE_CANTOPEN: unable to open database file`

**Solution**: Create data directory
```bash
mkdir -p data
chmod 755 data
npm run migrate
```

### Port already in use

**Error**: `Error: listen EADDRINUSE: address already in use :::3001`

**Solution**: Kill process on port 3001
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3001 | xargs kill -9
```

Or change port in `.env`:
```env
PORT=3002
```

### API key not recognized

**Error**: `Claude API not configured`

**Solution**:
1. Verify `.env` file exists in `backend/` directory
2. Check API key format (starts with `sk-ant-api03-`)
3. Restart the server after adding API key
4. Test key at console.anthropic.com

### TypeScript compilation errors

**Error**: `TS2307: Cannot find module`

**Solution**:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Updating NovelForge

**Pull latest changes:**
```bash
git pull origin main
```

**Update dependencies:**
```bash
cd backend
npm install
npm run build
```

**Run new migrations:**
```bash
npm run migrate
```

**Restart server:**
```bash
npm run dev
```

## Uninstalling

**Remove application:**
```bash
rm -rf novelforge
```

**Remove database (if you want to delete all projects):**
```bash
rm -rf novelforge/data
```

**Remove global npm packages (if installed globally):**
```bash
npm uninstall -g novelforge
```

## Security Best Practices

1. **Never commit `.env` file**
   - Add to `.gitignore`
   - Use separate keys for dev/prod

2. **Rotate API keys regularly**
   - Generate new key every 90 days
   - Revoke old keys

3. **Limit API key access**
   - Use dedicated key for NovelForge
   - Don't share keys between applications

4. **Back up your database**
   ```bash
   cp data/novelforge.db data/novelforge-backup-$(date +%Y%m%d).db
   ```

5. **Use HTTPS in production**
   - Set up reverse proxy (nginx, Apache)
   - Use SSL certificate

## Performance Tuning

### For Faster Generation

1. **Upgrade to Claude Max 20x**
   - 4x more capacity
   - Faster generation with fewer pauses

2. **Run on dedicated server**
   - Better I/O performance
   - No resource contention

3. **Use SSD for database**
   - Faster reads/writes
   - Better SQLite performance

### For Multiple Projects

1. **Separate databases**
   ```env
   DATABASE_PATH=/data/project1.db
   ```

2. **Use database backups**
   ```bash
   sqlite3 data/novelforge.db ".backup data/backup.db"
   ```

## Next Steps

After setup is complete:

1. **Read the User Guide**: See `USER_GUIDE.md`
2. **Test with small project**: Create a 5-chapter test novel
3. **Review API Documentation**: See `NOVEL_FORGE_README.md`
4. **Explore examples**: Check `requirements/` folder

## Getting Help

- **Check logs**: Look at server console output
- **Enable debug mode**: Set `NODE_ENV=development`
- **Test API directly**: Use curl or Postman
- **Review requirements**: See `requirements/` folder

---

**Version:** 2.0
**Last Updated:** January 2026
**Platform Support:** Windows, macOS, Linux, Docker
