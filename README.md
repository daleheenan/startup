# NovelForge

An AI-powered application that transforms story ideas into professionally crafted novels with minimal user intervention. NovelForge leverages Claude AI to generate complete novels with multi-pass editing, continuity tracking, and trilogy support.

## Features

- **Fire-and-forget generation**: Configure once, receive completed novel
- **Agent-based editing**: Specialized AI agents for developmental, line, continuity, and copy editing
- **Resilient queue system**: Automatic pause and resume on rate limits
- **Precise session tracking**: Waits only until actual reset time, not arbitrary delays
- **Zero marginal cost**: Leverages existing Claude Max subscription
- **Trilogy support**: Multi-book continuity tracking and series bible generation

## System Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14+ | React-based web UI |
| **Backend** | Node.js + Express | API server |
| **Database** | SQLite | Single-file, no setup required |
| **AI** | Anthropic Claude SDK | Novel generation and editing |
| **Queue** | Custom (SQLite-backed) | Resilient job processing |
| **Export** | docx-js, PDFKit | Document generation |

### Agent Ensemble

Five specialized AI agents process each chapter in sequence:

1. **Author Agent** - Writes all prose with genre-specific persona
2. **Developmental Editor** - Reviews structure, pacing, character arcs
3. **Line Editor** - Polishes prose, dialogue, sentence craft
4. **Continuity Editor** - Checks cross-chapter and cross-book consistency
5. **Copy Editor** - Grammar, punctuation, style consistency

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Claude API key (from anthropic.com)
- Claude Max subscription (recommended for best experience)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd novelforge
   ```

2. **Install dependencies**
   ```bash
   # Backend dependencies
   cd backend
   npm install

   # Frontend dependencies
   cd ..
   npm install
   ```

3. **Configure environment**

   Create `backend/.env` file:
   ```env
   ANTHROPIC_API_KEY=your_api_key_here
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```

4. **Run database migrations**
   ```bash
   cd backend
   npm run migrate
   ```

5. **Start the application**
   ```bash
   # Start backend (from backend directory)
   npm run dev

   # Start frontend (from root directory, in another terminal)
   npm run dev
   ```

The backend server will start on port 3001 and the frontend on port 3000.

## User Workflow

### Phase 1: Setup (Web UI, ~30 minutes)

1. Select genre, subgenre, tone, and themes
2. Review 5 generated story concepts
3. Select preferred concept (or mix elements)
4. Review and edit generated characters
5. Review and edit world elements
6. Review and edit chapter outline with scene cards
7. Click 'Generate Novel' and walk away

### Phase 2: Generation (Automated, ~2-3 days)

- System generates each chapter through Author Agent
- Each chapter passes through all editing agents
- Continuity checked against running story bible
- Progress logged and checkpointed
- On rate limit: pause and auto-resume at reset time

### Phase 3: Delivery

- Notification when complete
- Download manuscript (DOCX/PDF)
- Download story bible
- Review any flagged issues
- Optionally regenerate specific chapters

## API Documentation

### Base URL

```
http://localhost:3001/api
```

### Projects

- `GET /projects` - List all projects
- `GET /projects/:id` - Get project details
- `POST /projects` - Create new project
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Books

- `GET /books/project/:projectId` - Get all books for a project
- `GET /books/:id` - Get specific book
- `POST /books` - Create new book
- `PUT /books/:id` - Update book
- `DELETE /books/:id` - Delete book

### Generation

- `POST /generation/start/:bookId` - Start book generation
- `POST /generation/regenerate/:chapterId` - Regenerate specific chapter
- `GET /generation/progress/:bookId` - Get generation progress

### Trilogy Support

- `POST /trilogy/books/:bookId/ending-state` - Generate ending state snapshot
- `POST /trilogy/books/:bookId/summary` - Generate book summary
- `GET /trilogy/books/:bookId/previous-state` - Get previous book's ending state
- `POST /trilogy/projects/:projectId/series-bible` - Generate series bible
- `POST /trilogy/transitions` - Create book transition summary
- `POST /trilogy/projects/:projectId/convert-to-trilogy` - Convert standalone to trilogy

### Export

- `POST /export/:bookId/docx` - Export book as DOCX
- `POST /export/:bookId/pdf` - Export book as PDF
- `POST /export/:bookId/bible` - Export story bible

## Trilogy Support

NovelForge supports multi-book projects with cross-book continuity tracking.

### Creating a Trilogy

1. Create a project and select "trilogy" as the type
2. Add 3 books with titles
3. Generate outlines for each book
4. Start generation

### Cross-Book Continuity

- **Character State Tracking**: Characters' locations, relationships, and goals carry over
- **World State Evolution**: Political changes, destroyed locations, new factions tracked
- **Timeline Consistency**: Events remain chronologically consistent
- **Book Transitions**: Generate summaries of what happened during time gaps

### Series Bible

The series bible aggregates data across all books:
- Character index with development across books
- World state evolution
- Timeline of events across the entire series
- Mystery tracking (questions raised and answered)

## Testing

Run the test suite:

```bash
cd backend
npm test
```

## Project Structure

```
novelforge/
├── app/                        # Next.js frontend (App Router)
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── agents/             # AI agent definitions
│   │   ├── db/                 # Database schema and connection
│   │   ├── queue/              # Job queue system
│   │   ├── routes/             # API endpoints
│   │   └── services/           # Business logic
│   └── package.json
├── shared/                     # Shared TypeScript types
├── data/                       # SQLite database
├── exports/                    # Generated manuscripts
└── requirements/               # Planning documents
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | - | Claude API key (required) |
| `PORT` | 3001 | Backend server port |
| `FRONTEND_URL` | http://localhost:3000 | Frontend URL for CORS |
| `NODE_ENV` | development | Environment mode |

### Session Tracking

The system tracks Claude Max session usage to handle rate limits:

- Session duration: 5 hours
- Auto-pause on rate limit detection
- Auto-resume at precise reset time
- Conservative 30-minute fallback if detection fails

## Troubleshooting

### Common Issues

**Database locked error**
- Stop the backend server
- Delete `data/novelforge.db-wal` and `data/novelforge.db-shm` files
- Restart the server

**Rate limit errors**
- System should auto-pause and resume
- Check session tracking: `GET /api/queue/status`
- Manual pause: `POST /api/queue/pause`

**Chapter generation stuck**
- Check queue status: `GET /api/queue/status`
- View job details: `GET /api/queue/jobs`
- Resume queue: `POST /api/queue/resume`

**TypeScript compilation errors**
- Run `npm run build` in backend directory
- Check for type mismatches in shared types
- Ensure all dependencies installed

## Performance

| Metric | Target | Typical |
|--------|--------|---------|
| Chapter generation time | < 5 min | 2-4 min |
| Resume after rate limit | < 1 min | 15-30 sec |
| Database size | < 100 MB | 20-50 MB |
| Chapters per book | 30-50 | 40 |

## Development Status

NovelForge is developed across 8 sprints (88% complete):

| Sprint | Focus | Points | Status |
|--------|-------|--------|--------|
| Sprint 1 | Foundation & Infrastructure | 31 | Complete |
| Sprint 2 | Idea Generation | 24 | Complete |
| Sprint 3 | World & Characters | 31 | Complete |
| Sprint 4 | Outline Generation | 31 | Complete |
| Sprint 5 | Chapter Generation | 31 | Complete |
| Sprint 6 | Editing Agents | 32 | Complete |
| Sprint 7 | Export & Dashboard | 29 | In Progress |
| Sprint 8 | Trilogy Support | 32 | Complete |

## License

MIT

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Support

For issues or questions:
- Open an issue on GitHub
- Check the requirements folder for detailed documentation
- Review the PROGRESS_TRACKER.md for development status

---

**Version:** 2.0
**Last Updated:** January 2026
**Built with:** Claude Opus 4.5, Node.js, Next.js, SQLite
