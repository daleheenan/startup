# Sprint 3 User Guide: Characters & World Building

This guide explains how to use the new character and world building features in NovelForge.

---

## Quick Start

1. **Create a Project** (from Sprint 2)
   - Go to http://localhost:3000/new
   - Enter your story preferences
   - Generate concepts
   - Select a concept and create project

2. **Generate Characters**
   - Navigate to your project detail page
   - Click "Generate Characters"
   - Wait 30-60 seconds for AI generation
   - Review your protagonist and supporting cast

3. **Edit Characters**
   - Click on any character in the sidebar
   - Edit name, traits, voice sample, backstory, etc.
   - Click "Save Changes" when done

4. **Generate World**
   - Click "Continue to World →"
   - Click "Generate World"
   - Wait 30-60 seconds for AI generation
   - Review locations, factions, and systems

5. **Edit World Elements**
   - Click on any element in the sidebar
   - Edit name, description, significance, rules, etc.
   - Click "Save Changes" when done

---

## Character Generation

### What Gets Generated

When you generate characters, the AI creates:

1. **Protagonist** (1 character)
   - Full name
   - Physical description
   - 5-7 personality traits
   - 100-150 word voice sample (first-person)
   - 3-5 specific goals
   - Internal and external conflicts
   - Detailed backstory
   - Current emotional/physical state
   - Character arc (how they'll change)

2. **Supporting Cast** (4-6 characters)
   - Antagonist (primary opposition)
   - Mentor (guide or teacher)
   - Sidekick/Ally (companion)
   - Love Interest (romantic partner)
   - 1-2 Supporting Characters (rivals, family, etc.)

Each supporting character has the same structure as the protagonist, plus their relationship to the protagonist.

### Voice Samples

The voice sample is the most important feature. It's a 100-150 word passage in the character's own voice (first-person perspective) that showcases:

- How they think and speak
- Their unique perspective on their situation
- Their emotional state
- Genre-appropriate style

Example voice sample for a fantasy protagonist:
```
I've always been able to see the threads. That's what I call them—
the silvery strands that connect every living thing, pulsing with
potential. Most people walk through life blind to them, but I see
them everywhere, tangled around hearts and minds like spider webs.
The priests say it's a gift from the gods. My mother called it a
curse. I'm starting to think she was right. Because once you see
the threads, you can't help but pull them. And sometimes, when you
pull hard enough, the whole world unravels.
```

### Editing Characters

You can edit any aspect of a character:

- **Name:** Change first or last name
- **Physical Description:** Update appearance details
- **Voice Sample:** Rewrite or refine their unique voice
- **Personality Traits:** Modify the trait chips inline
- **Backstory:** Add or change their history
- **Character Arc:** Adjust how they'll grow

Changes save immediately to the database.

---

## World Building

### What Gets Generated

The AI generates 6-10 world elements based on your genre:

**For Fantasy:**
- 1-2 Magic/Supernatural Systems (with rules and limitations)
- 3-4 Key Locations (cities, regions, landmarks)
- 2-3 Factions/Organizations (kingdoms, guilds, cults)

**For Science Fiction:**
- 1-2 Technology Systems (FTL travel, AI, cybernetics)
- 3-4 Key Locations (planets, space stations, colonies)
- 2-3 Factions/Organizations (governments, corporations, rebels)

**For Contemporary:**
- 4-5 Key Locations (cities, neighborhoods, buildings)
- 2-3 Factions/Organizations (companies, gangs, governments)

### World Element Types

Each element has a type:

- 🗺️ **Location:** Places where the story happens
- ⚔️ **Faction:** Groups, organizations, governments
- ✨ **Magic System:** How magic works (fantasy genres)
- 🔬 **Technology:** How tech works (sci-fi genres)
- 📝 **Custom:** Other important elements

### Element Fields

Each world element includes:

- **Name:** A distinctive, memorable name
- **Type:** Location, faction, magic_system, technology, or custom
- **Description:** Rich, vivid description (3-4 sentences)
- **Significance:** Why this matters to the story (2-3 sentences)
- **Rules:** (For systems) 3-5 key rules or limitations
- **History:** (Optional) Relevant backstory (2-3 sentences)

Example magic system:
```
Name: The Weave
Type: Magic System
Description: The Weave is the invisible network of magical energy
that connects all living things. Skilled practitioners called
Weavers can perceive these connections as silvery threads and
manipulate them to influence emotions, share memories, or even
bind souls together.

Significance: The Weave is both the source of the protagonist's
power and the center of the conflict. The antagonist wants to
control the Weave to reshape society, while the protagonist must
decide if such power should exist at all.

Rules:
- Only those born with "the Sight" can perceive the Weave
- Manipulating threads requires intense concentration and drains energy
- Forcing connections without consent causes severe psychological damage
- The Weave cannot create or destroy, only connect and influence
- Overuse leads to "thread blindness" - permanent loss of the Sight
```

### Editing World Elements

You can edit:

- **Name:** Rename the element
- **Description:** Add more detail or change the description
- **Significance:** Update why it matters to the story
- **Rules:** Modify limitations for systems
- **History:** Add or change backstory

Changes save immediately to the database.

---

## Story DNA

Story DNA is generated automatically when you create characters. It defines the writing style for your entire novel:

### Prose Style Guidelines

- **Sentence Structure:** How sentences should be constructed
- **Vocabulary Level:** Appropriate word choice for genre/audience
- **Dialogue Style:** How characters should speak
- **Description Density:** How much description to include
- **Pacing:** Rhythm and speed of scenes
- **Point of View:** POV and tense (e.g., "Close third-person, past tense")

### Other Story DNA Elements

- **Genre & Subgenre:** Your story's category
- **Tone:** Overall emotional feel
- **Themes:** Core ideas to explore
- **Target Audience:** Who the book is for
- **Content Rating:** Appropriate content level (PG-13, R, etc.)

Story DNA is used by the Author Agent in future sprints to write chapters in the correct style.

---

## Navigation Flow

The recommended workflow is:

1. **New Project** → Enter preferences → Generate concepts → Select concept
2. **Project Detail** → Review project info
3. **Generate Characters** → Review and edit protagonist + cast
4. **Generate World** → Review and edit locations, factions, systems
5. **Create Outline** (Sprint 4) → Plan chapter structure
6. **Generate Chapters** (Sprint 5) → AI writes your novel

You can jump back to any step to make changes.

---

## Tips for Best Results

### Character Generation

1. **Review Voice Samples Carefully**
   - The voice sample is crucial for later chapter generation
   - If it doesn't sound right, regenerate or edit it
   - Each character should sound distinctly different

2. **Be Specific with Goals**
   - Concrete goals are better than vague ones
   - "Find my missing sister" > "Be happy"
   - Goals drive the plot forward

3. **Balance Internal and External Conflicts**
   - Internal: Fears, doubts, moral dilemmas
   - External: Obstacles, enemies, circumstances
   - Best stories have both

### World Building

1. **Don't Over-Explain**
   - Leave room for discovery
   - Not every location needs deep history
   - Focus on what matters to the story

2. **Make Magic/Tech Systems Have Costs**
   - Limitations create conflict
   - "Unlimited power" is boring
   - Rules force creative problem-solving

3. **Connect World to Themes**
   - If your theme is "power corrupts," show it in world structure
   - Factions should embody different values
   - Locations should reflect emotional states

---

## Troubleshooting

### Generation Takes Too Long

- Character generation can take 30-60 seconds (generates 5-7 characters)
- World generation can take 30-60 seconds (generates 6-10 elements)
- If it takes more than 2 minutes, check backend logs
- Ensure backend server is running on port 3001

### Characters Don't Sound Unique

- Regenerate characters (each generation is different)
- Edit voice samples to make them more distinct
- Adjust personality traits to increase contrast

### World Doesn't Fit Genre

- Check that Story DNA has correct genre
- Regenerate world elements
- Manually edit elements to add genre-appropriate details

### Can't Save Edits

- Check browser console for errors
- Ensure backend is running
- Check that character/element ID exists
- Verify network connection to localhost:3001

---

## Data Storage

All data is stored in the SQLite database:

- **Location:** `data/novelforge.db`
- **Story DNA:** `projects.story_dna` (JSON column)
- **Characters:** `projects.story_bible.characters` (JSON array)
- **World:** `projects.story_bible.world` (JSON array)

You can view the raw JSON in the project detail page by checking the browser's network tab after fetching a project.

---

## Next Steps

Once you've created and edited your characters and world:

1. **Sprint 4:** Create your chapter-by-chapter outline
2. **Sprint 5:** Generate chapters using the Author Agent
3. **Sprint 6:** Automated editing and revision
4. **Sprint 7:** Export to DOCX/PDF

---

## API Reference (For Developers)

### Generate Story DNA
```bash
POST http://localhost:3001/api/projects/:id/story-dna
Content-Type: application/json

{
  "concept": {
    "title": "The Shadow's Bargain",
    "logline": "When a street thief...",
    "synopsis": "Kira has survived...",
    "genre": "Fantasy",
    "subgenre": "Dark Fantasy",
    "tone": "Gritty and tense",
    "themes": ["Power", "Sacrifice", "Memory"]
  }
}
```

### Generate Characters
```bash
POST http://localhost:3001/api/projects/:id/characters
Content-Type: application/json

{
  "context": {
    "title": "The Shadow's Bargain",
    "synopsis": "Kira has survived...",
    "genre": "Fantasy",
    "tone": "Gritty and tense",
    "themes": ["Power", "Sacrifice", "Memory"]
  }
}
```

### Generate World
```bash
POST http://localhost:3001/api/projects/:id/world
Content-Type: application/json

{
  "context": {
    "title": "The Shadow's Bargain",
    "synopsis": "Kira has survived...",
    "genre": "Fantasy",
    "subgenre": "Dark Fantasy",
    "tone": "Gritty and tense",
    "themes": ["Power", "Sacrifice", "Memory"],
    "protagonistName": "Kira"
  }
}
```

### Update Character
```bash
PUT http://localhost:3001/api/projects/:id/characters/:characterId
Content-Type: application/json

{
  "name": "Kira Shadowborn",
  "personality": ["Resourceful", "Cynical", "Protective", "Haunted", "Defiant"],
  "voiceSample": "Updated voice sample...",
  ...
}
```

### Update World Element
```bash
PUT http://localhost:3001/api/projects/:id/world/:elementId
Content-Type: application/json

{
  "name": "The Weave",
  "description": "Updated description...",
  "significance": "Updated significance...",
  ...
}
```

---

**Happy world building!** 🎨📚

For questions or issues, check the Sprint 3 completion report or project README.
