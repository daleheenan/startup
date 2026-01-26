# NovelForge

An AI-powered application that transforms story ideas into professionally crafted novels with minimal user intervention. NovelForge leverages Claude AI to generate complete novels with multi-pass editing, continuity tracking, trilogy support, and originality verification.

## Features

### Story Development
- **Concept Generation**: Generate 5 unique story concepts from genre preferences, save favorites for later
- **Story Ideas Generator**: Batch generate creative story ideas with regeneratable sections
- **Originality Checking**: AI-powered analysis to ensure your concepts are unique (see details below)
- **Saved Concepts Library**: Store and manage story concepts with notes and status tracking

### Character & World Building
- **Character Generation**: Create protagonists and supporting cast with voice samples and arcs
- **World Elements**: Generate locations, factions, magic systems, and social structures
- **Author Styles Library**: 100+ predefined author styles across genres, plus custom styles
- **Prose Style Control**: Configure voice, tone, and writing style per project

### Writing & Generation
- **Fire-and-Forget Generation**: Configure once, receive completed novel
- **5-Agent Editing Ensemble**: Author, Developmental Editor, Line Editor, Continuity Editor, Copy Editor
- **Scene Cards**: Detailed scene specifications with POV, goals, conflicts, and outcomes
- **Regeneration & Variations**: Generate 3 variations of any text selection
- **Real-Time Progress**: SSE-powered live progress tracking

### Trilogy & Series Support
- **Cross-Book Continuity**: Track characters, relationships, and world state across books
- **Mystery Tracking**: Track questions raised and resolved across series
- **Series Bible Generation**: Comprehensive character index, world evolution, and timeline
- **Book Transitions**: Generate summaries for time gaps between books
- **Universe/Shared Worlds**: Link multiple projects in shared universes

### Analysis & Export
- **Analytics Dashboard**: Pacing, dialogue percentage, tension arcs, genre benchmarking
- **Prose Analysis**: Readability scores, sentence metrics, character screen time
- **Export Formats**: DOCX (Word), PDF, Story Bible export
- **Editing Flags**: Track and resolve editorial concerns

### Customization
- **Custom Genres**: Create your own genre categories
- **Genre Exclusions**: Define words/phrases to avoid per genre
- **Genre Recipes**: Pre-configured genre + subgenre + tone combinations
- **Style Presets**: Save and reuse writing configurations

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
   JWT_SECRET=your_jwt_secret_here
   ```

4. **Start the application**
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
3. **Check originality** of your chosen concept
4. Select preferred concept (or mix elements)
5. Review and edit generated characters
6. Review and edit world elements
7. Review and edit chapter outline with scene cards
8. Click 'Generate Novel' and walk away

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

## Originality Checking

NovelForge includes an AI-powered originality checker to help ensure your stories are unique.

### How It Works

When you click "Check Originality" on a saved concept, the system:

1. **Analyzes your content** - Sends title, logline, synopsis, and other details to Claude AI
2. **Compares against known works** - Claude identifies similarities to published novels, films, TV shows
3. **Scores originality** - Returns scores across 5 dimensions (plot, character, setting, theme, premise)
4. **Flags concerns** - Highlights potentially derivative elements with suggestions for differentiation

### Originality Scores

| Score | Meaning |
|-------|---------|
| 90-100 | Highly original, unique concept |
| 75-89 | Original with familiar elements used creatively |
| 60-74 | Moderately original, common elements with some unique angles |
| 40-59 | Derivative, closely resembles existing works |
| 0-39 | Highly derivative, needs significant differentiation |

### What Gets Checked

- **Saved Concepts**: Full story concepts with synopsis
- **Concept Summaries**: Short-form story ideas
- **Story Ideas**: Generated creative ideas
- **Chapters**: Generated chapter content (excerpt analysis)

### Important Limitations

This is **not** traditional plagiarism detection (comparing text against a database). It uses Claude's training knowledge, which means:

- Can identify similarities to well-known works but may miss obscure ones
- Generous toward creative combinations of familiar elements
- Focuses on derivative concepts, not genre conventions
- A story can reference other works and still score highly with unique angles

## API Documentation

### Base URL

```
http://localhost:3001/api
```

### Core Endpoints

#### Projects
- `GET /projects` - List all projects
- `GET /projects/:id` - Get project details
- `POST /projects` - Create new project
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

#### Concepts & Ideas
- `POST /concepts/generate` - Generate story concepts
- `GET /saved-concepts` - List saved concepts
- `POST /saved-concepts` - Save a concept
- `GET /story-ideas` - List saved story ideas
- `POST /story-ideas/generate` - Generate story ideas

#### Originality Checking
- `POST /plagiarism/check/concept/:id` - Check concept originality
- `POST /plagiarism/check/summary/:id` - Check summary originality
- `POST /plagiarism/check/story-idea/:id` - Check story idea originality
- `POST /plagiarism/check/chapter/:id` - Check chapter originality
- `POST /plagiarism/check/raw` - Check raw content before saving
- `GET /plagiarism/results/:contentId` - Get check history

#### Generation
- `POST /generation/start/:bookId` - Start book generation
- `POST /generation/regenerate/:chapterId` - Regenerate specific chapter
- `GET /progress/:bookId` - SSE stream for real-time progress

#### Trilogy Support
- `POST /trilogy/books/:bookId/ending-state` - Generate ending state
- `POST /trilogy/books/:bookId/summary` - Generate book summary
- `POST /trilogy/projects/:projectId/series-bible` - Generate series bible
- `POST /trilogy/transitions` - Create book transition summary

#### Export
- `POST /export/:bookId/docx` - Export as DOCX
- `POST /export/:bookId/pdf` - Export as PDF
- `POST /export/:bookId/bible` - Export story bible

#### Analytics
- `GET /analytics/chapters/:chapterId` - Chapter analytics
- `GET /analytics/books/:bookId` - Book analytics
- `GET /analytics/books/:bookId/benchmark` - Genre benchmarking

### Additional Endpoints

- `/authors` - Author styles library
- `/prose-styles` - Prose style management
- `/genre-tropes` - Genre tropes browser
- `/genre-conventions` - Genre convention validation
- `/mysteries` - Mystery tracking
- `/universes` - Shared universe management
- `/user-settings` - User preferences and customization
- `/queue` - Queue status and management

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

## Project Structure

```
novelforge/
├── app/                        # Next.js frontend (App Router)
│   ├── components/             # Reusable React components
│   ├── projects/               # Project pages
│   ├── saved-concepts/         # Saved concepts library
│   ├── settings/               # User settings pages
│   └── admin/                  # Admin features
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── db/                 # Database schema and migrations
│   │   ├── queue/              # Job queue system
│   │   ├── routes/             # API endpoints
│   │   └── services/           # Business logic
│   └── package.json
├── shared/                     # Shared TypeScript types
├── data/                       # SQLite database
└── exports/                    # Generated manuscripts
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | - | Claude API key (required) |
| `ANTHROPIC_MODEL` | claude-opus-4-5-20251101 | Claude model to use |
| `PORT` | 3001 | Backend server port |
| `FRONTEND_URL` | http://localhost:3000 | Frontend URL for CORS |
| `JWT_SECRET` | - | Secret for JWT tokens |
| `DATABASE_PATH` | ./data/novelforge.db | SQLite database location |
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

**Originality check fails**
- Ensure ANTHROPIC_API_KEY is configured
- Check API health: `GET /api/health/claude`
- Verify content has sufficient detail to analyze

## Performance

| Metric | Target | Typical |
|--------|--------|---------|
| Chapter generation time | < 5 min | 2-4 min |
| Resume after rate limit | < 1 min | 15-30 sec |
| Originality check | < 30 sec | 10-20 sec |
| Database size | < 100 MB | 20-50 MB |
| Chapters per book | 30-50 | 40 |

## Testing

Run the test suite:

```bash
cd backend
npm test
```

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
- Check the USER_GUIDE.md for detailed usage instructions
- Review DEPLOYMENT.md for production deployment

---

**Version:** 3.0
**Last Updated:** January 2026
**Built with:** Claude Opus 4.5, Node.js, Next.js, SQLite
