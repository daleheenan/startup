# NovelForge Backend

The backend server for NovelForge - AI-powered novel writing application.

## Features

- **SQLite Database**: Lightweight, file-based storage
- **Job Queue System**: Resilient queue with checkpoint recovery
- **Session Tracking**: Precise Claude Max session management (5-hour windows)
- **Rate Limit Handling**: Automatic pause/resume on API rate limits
- **Claude SDK Integration**: Anthropic Claude API with automatic session tracking
- **RESTful API**: Express server with project and queue endpoints

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-opus-4-5-20251101
DATABASE_PATH=../data/novelforge.db
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Run Database Migrations

```bash
npm run migrate
```

### 4. Start the Server

```bash
npm run dev
```

The server will start on http://localhost:3001

## CLI Commands

The backend includes a CLI for testing and management:

```bash
# Show available commands
npm run cli help

# Run database migrations
npm run migrate

# Show queue statistics
npm run cli queue:stats

# Create a test job
npm run cli queue:create generate_chapter test-chapter-1

# Show session statistics
npm run cli session:stats

# Clear session tracking
npm run cli session:clear

# Test Claude API connection
npm run cli claude:test
```

## Project Structure

```
backend/
├── src/
│   ├── db/                  # Database layer
│   │   ├── connection.ts    # SQLite connection
│   │   ├── migrate.ts       # Migration runner
│   │   └── schema.sql       # Database schema
│   ├── queue/               # Job queue system
│   │   ├── worker.ts        # Queue worker
│   │   ├── checkpoint.ts    # Checkpoint manager
│   │   └── rate-limit-handler.ts  # Rate limit management
│   ├── services/            # Business logic
│   │   ├── claude.service.ts      # Claude API wrapper
│   │   └── session-tracker.ts    # Session tracking
│   ├── routes/              # API routes
│   │   ├── projects.ts      # Project endpoints
│   │   └── queue.ts         # Queue endpoints
│   ├── server.ts            # Express server
│   └── cli.ts               # CLI tool
├── package.json
└── tsconfig.json
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Queue
- `GET /api/queue/stats` - Get queue and session statistics
- `POST /api/queue/test` - Create a test job

## Database Schema

### Tables

- **projects**: Story projects
- **books**: Books within projects (for trilogy support)
- **chapters**: Individual chapters
- **jobs**: Queue jobs with checkpoint support
- **session_tracking**: Claude Max session tracking (singleton table)

See `src/db/schema.sql` for full schema.

## Queue System

### Job States

Jobs move through these states:
- `pending` - Waiting to be processed
- `running` - Currently processing
- `completed` - Successfully completed
- `paused` - Paused due to rate limit
- `failed` - Failed after 3 retry attempts

### Job Types

- `generate_chapter` - Generate chapter prose
- `dev_edit` - Developmental editing
- `line_edit` - Line editing
- `continuity_check` - Continuity checking
- `copy_edit` - Copy editing
- `generate_summary` - Generate chapter summary
- `update_states` - Update character states

### Checkpoint Recovery

Jobs save checkpoints at critical steps. If the application crashes, jobs can resume from the last checkpoint.

## Session Tracking

The session tracker manages Claude Max subscription limits:

- Tracks first API request timestamp
- Calculates session reset time (start + 5 hours)
- Automatically pauses queue when rate limited
- Automatically resumes queue after session reset
- Conservative 30-minute fallback if detection fails

## Rate Limit Handling

When a rate limit is detected:

1. Current job is paused
2. Wait time is calculated (time until session reset)
3. Queue waits for session reset
4. Session tracking is cleared
5. All paused jobs are resumed

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses `tsx watch` for hot reloading.

### Building for Production

```bash
npm run build
npm start
```

### Running Tests

```bash
# Create a test job
npm run cli queue:create generate_chapter test-1

# Start the server to process it
npm run dev

# Check queue stats
npm run cli queue:stats
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key | Required |
| `ANTHROPIC_MODEL` | Claude model to use | `claude-opus-4-5-20251101` |
| `DATABASE_PATH` | SQLite database path | `../data/novelforge.db` |
| `PORT` | Server port | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `NODE_ENV` | Environment | `development` |

## Troubleshooting

### Database Locked

If you see "database is locked" errors:
- Close any other connections to the database
- The database uses WAL mode for better concurrency

### Rate Limit Issues

If the queue doesn't resume after rate limit:
- Check session tracking: `npm run cli session:stats`
- Manually clear session: `npm run cli session:clear`
- The system has a 30-minute fallback wait

### API Key Not Working

Make sure your `.env` file has:
```
ANTHROPIC_API_KEY=sk-ant-your-actual-key
```

Test the connection:
```bash
npm run cli claude:test
```

## License

Private - Part of NovelForge project
