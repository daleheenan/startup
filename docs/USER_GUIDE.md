# NovelForge User Guide

Complete guide to using NovelForge to create AI-generated novels.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Novel](#creating-your-first-novel)
3. [Trilogy Projects](#trilogy-projects)
4. [Advanced Features](#advanced-features)
5. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

Before using NovelForge, ensure you have:

1. **Claude API Access**
   - Sign up at anthropic.com
   - Create an API key
   - (Recommended) Subscribe to Claude Max for higher rate limits

2. **System Requirements**
   - Node.js 18 or higher
   - 500MB free disk space per project
   - Internet connection

### First-Time Setup

1. **Configure Your API Key**

   Create a `.env` file in the `backend` directory:

   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```

2. **Start the Backend Server**

   ```bash
   cd backend
   npm run migrate  # Run once to create database
   npm run dev      # Start the server
   ```

   You should see:
   ```
   🚀 NovelForge Backend Server
      Port: 3001
      Frontend: http://localhost:3000

   ✅ Server started successfully

   🔄 Starting queue worker...
   ```

## Creating Your First Novel

### Step 1: Choose Your Story Concept

1. **Select Genre and Preferences**
   - Genre: Fantasy, Sci-Fi, Mystery, Romance, etc.
   - Subgenre: More specific categorization
   - Tone: Dark, Humorous, Romantic, etc.
   - Themes: 3-5 major themes

2. **Generate Story Concepts**

   The system will generate 5 unique story concepts. Each includes:
   - Title
   - Logline (1-2 sentence hook)
   - Synopsis (2-3 paragraphs)

3. **Select Your Favorite**

   Choose one concept or mix elements from multiple concepts.

### Step 2: Build Your World

1. **Generate Story DNA**

   The system creates:
   - Prose style guidelines
   - Tone specifications
   - Theme integration plan

2. **Create Characters**

   - **Protagonist**: Main character with voice sample
   - **Supporting Cast**: 4-6 key characters

   Each character includes:
   - Physical description
   - Personality traits
   - Voice sample (2-3 sentences in their unique voice)
   - Goals and conflicts
   - Relationships to other characters
   - Character arc

3. **Edit Characters**

   - Click any character to edit
   - Modify traits, goals, or voice sample
   - Add custom characters
   - Adjust relationships

4. **Generate World Elements**

   - **Locations**: Key places in your story
   - **Factions**: Groups, organizations, governments
   - **Systems**: Magic, technology, social structures

5. **Edit World Elements**

   - Customize locations
   - Add your own world elements
   - Adjust significance and details

### Step 3: Create Your Outline

1. **Select Story Structure**

   Choose from 5 templates:
   - **Three-Act Structure**: Classic beginning, middle, end
   - **Save the Cat**: 15-beat structure
   - **Hero's Journey**: Mythic structure
   - **Seven-Point Story**: Dan Wells' method
   - **Freytag's Pyramid**: Classic dramatic structure

2. **Generate Chapter Outline**

   The system creates:
   - 30-50 chapters
   - Chapter summaries
   - Act breakdown
   - Scene cards for each chapter

3. **Review Scene Cards**

   Each scene card specifies:
   - **POV Character**: Whose perspective
   - **Location**: Where scene takes place
   - **Characters Present**: Who's in the scene
   - **Scene Goal**: What POV character wants
   - **Conflict**: What opposes the goal
   - **Outcome**: Success, failure, or complication
   - **Emotional Beat**: How POV character feels

4. **Edit the Outline**

   - Drag and drop to reorder chapters
   - Edit chapter summaries
   - Modify scene cards
   - Add or remove chapters

### Step 4: Generate Your Novel

1. **Click "Start Generation"**

   This queues all chapters for generation.

2. **Wait for Completion**

   **What Happens Next:**

   For each chapter, the system:
   1. **Author Agent** writes the initial draft (2-4 minutes)
   2. **Developmental Editor** reviews structure and pacing (1-2 minutes)
   3. **Author Agent** revises based on feedback (if needed, 2-3 minutes)
   4. **Line Editor** polishes prose and dialogue (1-2 minutes)
   5. **Continuity Editor** checks consistency (1 minute)
   6. **Copy Editor** fixes grammar and style (1 minute)
   7. **System** generates summary for next chapter (30 seconds)
   8. **System** updates character states (30 seconds)

   **Total time per chapter**: 5-10 minutes
   **Total time for 40-chapter novel**: 3-7 hours of actual work
   **Total time with rate limits**: 2-3 days

3. **Monitor Progress**

   Track progress via:
   - Progress dashboard shows completion percentage
   - Time remaining estimate
   - Current chapter being worked on
   - Session usage
   - Any flagged issues

### Step 5: Download Your Novel

1. **Export Options**

   - **DOCX**: Microsoft Word format with proper formatting
   - **PDF**: Print-ready PDF
   - **Story Bible**: Complete character and world reference

2. **Review Flagged Issues**

   If any editing agents flagged issues:
   - Review the flagged chapters
   - Decide if you want to regenerate
   - Or accept as-is and edit manually

3. **Regenerate Chapters (Optional)**

   If you're not satisfied with a chapter:
   - Click "Regenerate" next to the chapter
   - The entire editing pipeline runs again
   - New version replaces the old one

## Trilogy Projects

### Creating a Trilogy

1. **Start a New Project**

   Select "Trilogy" as project type.

2. **Add Book Titles**

   Enter titles for all 3 books:
   - Book 1: "The Shadow Rising"
   - Book 2: "The Shadow Falling"
   - Book 3: "The Shadow Triumphant"

3. **Generate Each Book Separately**

   **Book 1:**
   - Follow normal novel creation process
   - Generate ending state when complete

   **Book 2:**
   - Uses Book 1's ending state as starting point
   - Characters start where Book 1 left them
   - World reflects changes from Book 1

   **Book 3:**
   - Uses Book 2's ending state
   - Completes character arcs
   - Resolves trilogy-wide plots

### Cross-Book Continuity

**After Completing Book 1:**

1. **Generate Ending State**

   ```
   POST /api/trilogy/books/:book1Id/ending-state
   ```

   This captures:
   - Character locations and emotional states
   - Relationship statuses
   - Character goals for next book
   - World state changes
   - Unresolved plot threads

2. **Generate Book Summary**

   ```
   POST /api/trilogy/books/:book1Id/summary
   ```

   Creates a 500-800 word summary covering:
   - Major plot events
   - Character development
   - World state changes
   - Setup for next book

**Before Starting Book 2:**

3. **Create Book Transition**

   ```
   POST /api/trilogy/transitions
   {
     "projectId": "...",
     "fromBookId": "book1-id",
     "toBookId": "book2-id",
     "timeGap": "3 months"
   }
   ```

   This generates:
   - What happened during the 3-month gap
   - How characters pursued their goals
   - How the world situation evolved
   - New complications that arose

4. **Load Previous State**

   The system automatically:
   - Loads Book 1 ending state
   - Updates character starting positions
   - Informs the continuity editor
   - Uses transition summary in context

### Series Bible

After completing all books, generate the series bible:

```
POST /api/trilogy/projects/:projectId/series-bible
```

The series bible includes:

1. **Character Index**
   - All characters across all books
   - First and last appearances
   - Development across books
   - Current status (alive/dead/unknown)

2. **World Evolution**
   - How locations changed book to book
   - Political shifts across the series
   - Social and cultural changes
   - Technology or magic evolution

3. **Timeline**
   - Events from all books in chronological order
   - Time gaps between books
   - Major events that span multiple books

4. **Mystery Tracking**
   - Questions raised in each book
   - When they were answered
   - Cross-book foreshadowing
   - Series-wide arcs

## Advanced Features

### Custom Character States

You can manually update character states between chapters:

```json
{
  "characterId": "char-123",
  "currentState": {
    "location": "The Dark Tower",
    "emotionalState": "Determined but afraid",
    "goals": ["Confront the Dark Lord", "Rescue her brother"],
    "conflicts": ["Doubts her abilities", "Betrayed by her mentor"]
  }
}
```

### Regenerating Specific Chapters

If a chapter doesn't meet your expectations:

1. Navigate to the chapter
2. Click "Regenerate"
3. Optionally adjust the scene cards first
4. System re-runs the entire editing pipeline

### Pausing and Resuming

**Manual Pause:**
```
POST /api/queue/pause
```

**Resume:**
```
POST /api/queue/resume
```

The system auto-pauses on rate limits and resumes when the session resets.

### Viewing Generation Logs

Check what the system is doing:

```
GET /api/queue/status
```

Returns:
- Queue status (running/paused)
- Current job
- Jobs pending
- Jobs completed
- Session usage
- Estimated time remaining

## Troubleshooting

### Generation is Slow

**Symptoms:**
- Chapters taking longer than 10 minutes

**Causes:**
- Claude API slowdown
- Rate limiting starting
- Complex chapters with many characters

**Solutions:**
- Check `GET /api/queue/status` for session usage
- Reduce number of characters in scene
- Simplify scene card requirements

### Chapter Quality Issues

**Symptoms:**
- Characters acting out of character
- Plot inconsistencies
- Prose quality not meeting expectations

**Solutions:**
- **Edit Voice Samples**: Make character voices more distinct
- **Refine Scene Cards**: Be more specific about goals and conflicts
- **Adjust Story DNA**: Modify prose style guidelines
- **Regenerate**: Try regenerating the chapter
- **Edit Manually**: Export and edit in Word/Docs

### Continuity Errors

**Symptoms:**
- Characters forgetting events
- Timeline inconsistencies
- World state contradictions

**Solutions:**
- Check if continuity editor flagged the issue
- Review story bible for consistency
- Manually update character states
- Regenerate affected chapters

### Rate Limit Issues

**Symptoms:**
- Generation paused
- Error: "Rate limit exceeded"

**Solutions:**
- **Wait**: System will auto-resume
- **Check Reset Time**: `GET /api/queue/status`
- **Upgrade**: Consider Claude Max 20x for 4x more capacity
- **Spread Out**: Generate novels over multiple days

### Database Locked

**Symptoms:**
- Error: "database is locked"
- Operations failing

**Solutions:**
- Stop the backend server
- Delete `.db-wal` and `.db-shm` files
- Restart the server

### Missing Chapters

**Symptoms:**
- Chapters not appearing
- Jobs stuck in pending

**Solutions:**
- Check `GET /api/queue/jobs` for failed jobs
- Look for error messages in job details
- Restart queue worker
- Check Claude API key is valid

## Tips for Best Results

### Character Creation

- **Distinct Voices**: Make each character's voice sample unique
- **Clear Goals**: Specific goals lead to better scenes
- **Relationships**: Define relationships to create natural conflict

### Outline Quality

- **Specific Scene Goals**: Vague goals = vague scenes
- **Escalating Conflict**: Each chapter should raise stakes
- **Emotional Beats**: Specify how POV character should feel

### World Building

- **Consistent Rules**: Magic/tech should have clear limitations
- **Significant Locations**: Each location should matter to the plot
- **Active Factions**: Factions should have goals that create conflict

### Generation Strategy

- **Start Small**: Test with 5-10 chapters before committing to full novel
- **Review Early**: Check first few chapters before generating all
- **Iterate**: Don't expect perfection on first generation
- **Edit**: AI generates 80-90% quality; manual editing gets to 100%

## Keyboard Shortcuts

(To be implemented in frontend)

- `Ctrl+N`: New project
- `Ctrl+G`: Start generation
- `Ctrl+E`: Export current book
- `Ctrl+R`: Regenerate current chapter

## Best Practices

1. **Save Often**: Project auto-saves, but manual save never hurts
2. **Review Before Generating**: Carefully review outline and characters
3. **Monitor Progress**: Check in every few hours during generation
4. **Address Flags**: Don't ignore editor-flagged issues
5. **Export Frequently**: Export work-in-progress for backup
6. **Use Transitions**: Always create transition summaries for trilogies
7. **Generate Series Bible**: Create it after each book, not just at the end

## Getting Help

- **Documentation**: Check `requirements/` folder
- **API Docs**: See NOVEL_FORGE_README.md
- **Progress Tracker**: See `requirements/PROGRESS_TRACKER.md`
- **Architecture**: See `requirements/ARCHITECTURE.md`

---

**Version:** 2.0
**Last Updated:** January 2026
