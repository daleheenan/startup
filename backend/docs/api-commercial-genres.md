# Commercial Genre Enhancement APIs

This document describes the API endpoints for commercial genre-specific features including Romance heat levels and beats, Thriller pacing and hooks, and Sci-Fi classification settings.

---

## Romance Commercial Endpoints

### 1. Create/Update Romance Heat Level Settings

**POST** `/api/projects/:id/romance-settings`

Configure the heat level and intimacy settings for a romance project.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Request Body
```typescript
{
  heatLevel: number;              // Required: 1-5 (1=Sweet, 2=Warm, 3=Steamy, 4=Hot, 5=Scorching)
  contentWarnings?: string[];     // Optional: Array of content warnings
  fadeToBlack?: boolean;          // Optional: Use fade-to-black technique (default: false)
  onPageIntimacy?: boolean;       // Optional: Show intimacy on page (default: true)
  sensualityFocus?: 'emotional' | 'physical' | 'balanced'; // Optional (default: 'balanced')
}
```

#### Example Request
```json
{
  "heatLevel": 3,
  "contentWarnings": ["explicit intimacy", "mild language"],
  "fadeToBlack": false,
  "onPageIntimacy": true,
  "sensualityFocus": "balanced"
}
```

#### Response (200 OK)
```json
{
  "id": "rhl_abc123",
  "projectId": "proj_xyz789",
  "heatLevel": 3,
  "contentWarnings": ["explicit intimacy", "mild language"],
  "fadeToBlack": false,
  "onPageIntimacy": true,
  "sensualityFocus": "balanced",
  "createdAt": "2026-01-30T10:00:00Z",
  "updatedAt": "2026-01-30T10:00:00Z"
}
```

#### Error Responses
- **400 Bad Request**: `"Heat level must be between 1 and 5"`
- **500 Internal Server Error**: Server error during creation

#### Heat Level Guide
| Level | Name | Description |
|-------|------|-------------|
| 1 | Sweet | Closed door, no explicit content |
| 2 | Warm | Fade to black, implied intimacy |
| 3 | Steamy | Some explicit scenes, tasteful |
| 4 | Hot | Detailed intimate scenes |
| 5 | Scorching | Very explicit, erotica-adjacent |

---

### 2. Get Romance Heat Level Settings

**GET** `/api/projects/:id/romance-settings`

Retrieve the heat level configuration for a project.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Response (200 OK)
```json
{
  "id": "rhl_abc123",
  "projectId": "proj_xyz789",
  "heatLevel": 3,
  "contentWarnings": ["explicit intimacy"],
  "fadeToBlack": false,
  "onPageIntimacy": true,
  "sensualityFocus": "balanced",
  "createdAt": "2026-01-30T10:00:00Z",
  "updatedAt": "2026-01-30T10:00:00Z"
}
```

#### Error Responses
- **404 Not Found**: `"No romance settings found for this project"`
- **500 Internal Server Error**: Server error during retrieval

---

### 3. Delete Romance Heat Level Settings

**DELETE** `/api/projects/:id/romance-settings`

Remove heat level configuration from a project.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Response (200 OK)
```json
{
  "success": true
}
```

#### Error Responses
- **500 Internal Server Error**: Server error during deletion

---

### 4. Track Romance Beat

**POST** `/api/projects/:id/romance-beats`

Record an emotional beat in the romance narrative.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Request Body
```typescript
{
  beatType: 'meet_cute' | 'first_attraction' | 'first_conflict' | 'first_touch' |
            'first_kiss' | 'first_intimacy' | 'black_moment' | 'grand_gesture' |
            'declaration' | 'commitment' | 'hea_hfn';  // Required
  chapterNumber?: number;           // Optional: Chapter where beat occurs
  sceneDescription?: string;        // Optional: Brief scene description
  emotionalIntensity?: number;      // Optional: 1-10 intensity rating
  notes?: string;                   // Optional: Additional notes
  completed?: boolean;              // Optional: Whether beat is written (default: false)
}
```

#### Example Request
```json
{
  "beatType": "meet_cute",
  "chapterNumber": 1,
  "sceneDescription": "They collide in a coffee shop, spilling drinks everywhere",
  "emotionalIntensity": 6,
  "notes": "Include chemistry from first glance",
  "completed": false
}
```

#### Response (200 OK)
```json
{
  "id": "rb_def456",
  "projectId": "proj_xyz789",
  "beatType": "meet_cute",
  "chapterNumber": 1,
  "sceneDescription": "They collide in a coffee shop, spilling drinks everywhere",
  "emotionalIntensity": 6,
  "notes": "Include chemistry from first glance",
  "completed": false,
  "createdAt": "2026-01-30T10:00:00Z"
}
```

#### Error Responses
- **400 Bad Request**: `"Beat type is required"`
- **500 Internal Server Error**: Server error during tracking

#### Romance Beat Types
| Beat Type | Description |
|-----------|-------------|
| meet_cute | First meeting with chemistry/spark |
| first_attraction | Initial physical/emotional attraction acknowledged |
| first_conflict | First major disagreement or obstacle |
| first_touch | First significant physical contact |
| first_kiss | First romantic kiss |
| first_intimacy | First intimate scene (level depends on heat) |
| black_moment | All is lost, relationship seems doomed |
| grand_gesture | Big romantic gesture to win back love |
| declaration | Declaration of love |
| commitment | Commitment to relationship |
| hea_hfn | Happily Ever After / Happy For Now ending |

---

### 5. Get All Romance Beats

**GET** `/api/projects/:id/romance-beats`

Retrieve all tracked romance beats for a project.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Response (200 OK)
```json
[
  {
    "id": "rb_def456",
    "projectId": "proj_xyz789",
    "beatType": "meet_cute",
    "chapterNumber": 1,
    "sceneDescription": "They collide in a coffee shop",
    "emotionalIntensity": 6,
    "completed": false,
    "createdAt": "2026-01-30T10:00:00Z"
  },
  {
    "id": "rb_ghi789",
    "projectId": "proj_xyz789",
    "beatType": "first_kiss",
    "chapterNumber": 8,
    "emotionalIntensity": 9,
    "completed": true,
    "createdAt": "2026-01-30T11:00:00Z"
  }
]
```

#### Error Responses
- **500 Internal Server Error**: Server error during retrieval

---

### 6. Delete Romance Beat

**DELETE** `/api/projects/:id/romance-beats/:beatType`

Remove a tracked romance beat.

#### Path Parameters
- `id` (string, UUID): The project ID
- `beatType` (string): The beat type to delete (e.g., 'meet_cute')

#### Response (200 OK)
```json
{
  "success": true
}
```

#### Error Responses
- **500 Internal Server Error**: Server error during deletion

---

### 7. Validate Romance Beat Placement

**GET** `/api/projects/:id/romance-beats/validate`

Check if romance beats are placed correctly according to story structure.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Query Parameters
- `totalChapters` (number, required): Total number of chapters in the story

#### Example Request
```
GET /api/projects/proj_xyz789/romance-beats/validate?totalChapters=30
```

#### Response (200 OK)
```json
{
  "valid": true,
  "warnings": [
    {
      "beatType": "black_moment",
      "message": "Black moment typically occurs at 75-85% mark. Currently at chapter 20 (67%)",
      "severity": "warning"
    }
  ],
  "missing": ["hea_hfn"],
  "suggestions": [
    {
      "beatType": "hea_hfn",
      "suggestedChapter": 30,
      "reason": "HEA/HFN should occur in final chapter"
    }
  ]
}
```

#### Error Responses
- **400 Bad Request**: `"totalChapters query parameter is required"`
- **500 Internal Server Error**: Server error during validation

---

### 8. Get Suggested Beat Placement

**GET** `/api/projects/:id/romance-beats/suggestions`

Get recommended chapter placement for romance beats based on story length.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Query Parameters
- `totalChapters` (number, required): Total number of chapters in the story

#### Example Request
```
GET /api/projects/proj_xyz789/romance-beats/suggestions?totalChapters=30
```

#### Response (200 OK)
```json
{
  "totalChapters": 30,
  "suggestions": [
    {
      "beatType": "meet_cute",
      "chapter": 1,
      "percentage": 0,
      "description": "Opening: Introduce the romantic leads"
    },
    {
      "beatType": "first_attraction",
      "chapter": 3,
      "percentage": 10,
      "description": "Acknowledge the chemistry"
    },
    {
      "beatType": "first_kiss",
      "chapter": 9,
      "percentage": 30,
      "description": "First major romantic milestone"
    },
    {
      "beatType": "black_moment",
      "chapter": 24,
      "percentage": 80,
      "description": "All seems lost for the relationship"
    },
    {
      "beatType": "hea_hfn",
      "chapter": 30,
      "percentage": 100,
      "description": "Happy ending"
    }
  ]
}
```

#### Error Responses
- **400 Bad Request**: `"totalChapters query parameter is required"`
- **500 Internal Server Error**: Server error during calculation

---

### 9. Check Heartbreaker Status

**GET** `/api/projects/:id/romance-beats/heartbreaker-check`

Verify if the story meets romance genre requirements (must have HEA/HFN).

#### Path Parameters
- `id` (string, UUID): The project ID

#### Query Parameters
- `totalChapters` (number, required): Total number of chapters in the story

#### Example Request
```
GET /api/projects/proj_xyz789/romance-beats/heartbreaker-check?totalChapters=30
```

#### Response (200 OK)
```json
{
  "isHeartbreaker": false,
  "hasHappyEnding": true,
  "meetsGenreRequirements": true,
  "warnings": [],
  "message": "Story meets romance genre requirements with HEA/HFN"
}
```

**Or (Heartbreaker detected):**
```json
{
  "isHeartbreaker": true,
  "hasHappyEnding": false,
  "meetsGenreRequirements": false,
  "warnings": [
    {
      "severity": "critical",
      "message": "No HEA/HFN ending tracked - this is not a romance novel by genre definition"
    }
  ],
  "message": "Story does not meet romance genre requirements"
}
```

#### Error Responses
- **400 Bad Request**: `"totalChapters query parameter is required"`
- **500 Internal Server Error**: Server error during check

#### Notes
- **Heartbreaker**: A story with romantic elements but no happy ending
- Romance genre REQUIRES a satisfying and optimistic ending (HEA/HFN)
- This check helps ensure the story meets reader expectations for the romance genre

---

## Thriller Commercial Endpoints

### 10. Create/Update Thriller Pacing Settings

**POST** `/api/projects/:id/thriller-pacing`

Configure pacing style and tension requirements for a thriller project.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Request Body
```typescript
{
  pacingStyle: 'relentless' | 'escalating' | 'rollercoaster' | 'slow_burn'; // Required
  chapterHookRequired?: boolean;      // Optional: Every chapter must end on hook (default: true)
  cliffhangerFrequency?: 'every' | 'most' | 'some'; // Optional (default: 'most')
  actionSceneRatio?: number;          // Optional: 10-90, percentage of scenes with action (default: 40)
  averageChapterTension?: number;     // Optional: 1-10 target tension level (default: 7)
}
```

#### Example Request
```json
{
  "pacingStyle": "escalating",
  "chapterHookRequired": true,
  "cliffhangerFrequency": "most",
  "actionSceneRatio": 50,
  "averageChapterTension": 8
}
```

#### Response (200 OK)
```json
{
  "id": "tp_abc123",
  "projectId": "proj_xyz789",
  "pacingStyle": "escalating",
  "chapterHookRequired": true,
  "cliffhangerFrequency": "most",
  "actionSceneRatio": 50,
  "averageChapterTension": 8,
  "createdAt": "2026-01-30T10:00:00Z",
  "updatedAt": "2026-01-30T10:00:00Z"
}
```

#### Error Responses
- **400 Bad Request**: `"Pacing style is required"`
- **500 Internal Server Error**: Server error during creation

#### Pacing Styles
| Style | Description |
|-------|-------------|
| relentless | Non-stop action, minimal breathers |
| escalating | Builds steadily to climax |
| rollercoaster | Alternates high/low tension |
| slow_burn | Gradual build with explosive payoff |

---

### 11. Get Thriller Pacing Settings

**GET** `/api/projects/:id/thriller-pacing`

Retrieve pacing configuration for a thriller project.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Response (200 OK)
```json
{
  "id": "tp_abc123",
  "projectId": "proj_xyz789",
  "pacingStyle": "escalating",
  "chapterHookRequired": true,
  "cliffhangerFrequency": "most",
  "actionSceneRatio": 50,
  "averageChapterTension": 8,
  "createdAt": "2026-01-30T10:00:00Z",
  "updatedAt": "2026-01-30T10:00:00Z"
}
```

#### Error Responses
- **404 Not Found**: `"No thriller pacing found for this project"`
- **500 Internal Server Error**: Server error during retrieval

---

### 12. Add Chapter Hook

**POST** `/api/projects/:id/thriller-hooks`

Track a chapter-ending hook or cliffhanger.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Request Body
```typescript
{
  chapterNumber: number;              // Required: Chapter number
  hookType: 'cliffhanger' | 'revelation' | 'question' | 'threat' | 'betrayal' |
            'countdown' | 'mystery_deepens' | 'reversal' | 'emotional_gut_punch' |
            'foreshadowing';          // Required
  hookDescription?: string;           // Optional: Description of the hook
  tensionLevel: number;               // Required: 1-10 tension rating
}
```

#### Example Request
```json
{
  "chapterNumber": 5,
  "hookType": "cliffhanger",
  "hookDescription": "Protagonist opens door to find antagonist waiting with weapon drawn",
  "tensionLevel": 9
}
```

#### Response (200 OK)
```json
{
  "id": "th_def456",
  "projectId": "proj_xyz789",
  "chapterNumber": 5,
  "hookType": "cliffhanger",
  "hookDescription": "Protagonist opens door to find antagonist waiting with weapon drawn",
  "tensionLevel": 9,
  "resolvedInChapter": null,
  "createdAt": "2026-01-30T10:00:00Z"
}
```

#### Error Responses
- **400 Bad Request**: `"chapterNumber, hookType, and tensionLevel are required"`
- **500 Internal Server Error**: Server error during creation

#### Hook Types
| Type | Description |
|------|-------------|
| cliffhanger | Direct danger, mid-action cut |
| revelation | Shocking information revealed |
| question | Compelling question raised |
| threat | New threat introduced |
| betrayal | Trust broken, loyalty questioned |
| countdown | Time pressure established |
| mystery_deepens | Mystery becomes more complex |
| reversal | Situation completely changes |
| emotional_gut_punch | Emotional shock |
| foreshadowing | Ominous hint of what's coming |

---

### 13. Get All Chapter Hooks

**GET** `/api/projects/:id/thriller-hooks`

Retrieve all tracked chapter hooks for a project.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Response (200 OK)
```json
[
  {
    "id": "th_def456",
    "projectId": "proj_xyz789",
    "chapterNumber": 5,
    "hookType": "cliffhanger",
    "hookDescription": "Protagonist opens door to find antagonist waiting",
    "tensionLevel": 9,
    "resolvedInChapter": 6,
    "createdAt": "2026-01-30T10:00:00Z"
  },
  {
    "id": "th_ghi789",
    "projectId": "proj_xyz789",
    "chapterNumber": 12,
    "hookType": "revelation",
    "tensionLevel": 8,
    "createdAt": "2026-01-30T11:00:00Z"
  }
]
```

#### Error Responses
- **500 Internal Server Error**: Server error during retrieval

---

### 14. Add Twist/Reveal

**POST** `/api/projects/:id/thriller-twists`

Record a plot twist or major reveal.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Request Body
```typescript
{
  chapterNumber?: number;             // Optional: Chapter where twist occurs
  twistType: 'major_reveal' | 'minor_reveal' | 'red_herring' | 'false_victory' |
             'betrayal' | 'hidden_identity' | 'plot_reversal' | 'unreliable_info' |
             'connection_reveal' | 'stakes_escalation'; // Required
  setupChapters?: number[];           // Optional: Chapters that foreshadow this twist
  description: string;                // Required: Description of the twist
  impactLevel?: 'low' | 'medium' | 'high' | 'extreme'; // Optional (default: 'medium')
  foreshadowed?: boolean;             // Optional: Was it properly set up? (default: true)
}
```

#### Example Request
```json
{
  "chapterNumber": 15,
  "twistType": "betrayal",
  "setupChapters": [3, 7, 11],
  "description": "Trusted ally revealed as double agent working for antagonist",
  "impactLevel": "extreme",
  "foreshadowed": true
}
```

#### Response (200 OK)
```json
{
  "id": "tt_jkl012",
  "projectId": "proj_xyz789",
  "chapterNumber": 15,
  "twistType": "betrayal",
  "setupChapters": [3, 7, 11],
  "description": "Trusted ally revealed as double agent working for antagonist",
  "impactLevel": "extreme",
  "foreshadowed": true,
  "createdAt": "2026-01-30T10:00:00Z"
}
```

#### Error Responses
- **400 Bad Request**: `"twistType and description are required"`
- **500 Internal Server Error**: Server error during creation

#### Twist Types
| Type | Description |
|------|-------------|
| major_reveal | Game-changing revelation |
| minor_reveal | Important but not earth-shattering |
| red_herring | Deliberate misdirection |
| false_victory | Apparent success that fails |
| betrayal | Trusted character turns |
| hidden_identity | Character's true identity revealed |
| plot_reversal | Complete 180 of situation |
| unreliable_info | Information proven false |
| connection_reveal | Hidden connection between elements |
| stakes_escalation | Stakes suddenly much higher |

---

### 15. Get All Twists

**GET** `/api/projects/:id/thriller-twists`

Retrieve all tracked twists and reveals.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Response (200 OK)
```json
[
  {
    "id": "tt_jkl012",
    "projectId": "proj_xyz789",
    "chapterNumber": 15,
    "twistType": "betrayal",
    "setupChapters": [3, 7, 11],
    "description": "Trusted ally revealed as double agent",
    "impactLevel": "extreme",
    "foreshadowed": true,
    "createdAt": "2026-01-30T10:00:00Z"
  }
]
```

#### Error Responses
- **500 Internal Server Error**: Server error during retrieval

---

### 16. Validate Twist Setup

**GET** `/api/projects/:id/thriller-twists/:twistId/validate`

Check if a twist has adequate foreshadowing and setup.

#### Path Parameters
- `id` (string, UUID): The project ID
- `twistId` (string): The twist ID to validate

#### Response (200 OK)
```json
{
  "valid": true,
  "foreshadowed": true,
  "setupChapters": [3, 7, 11],
  "twistChapter": 15,
  "chaptersBeforeReveal": 12,
  "warnings": [],
  "suggestions": [
    {
      "message": "Consider adding one more hint in chapter 13 to strengthen setup",
      "severity": "info"
    }
  ]
}
```

**Or (Insufficient setup):**
```json
{
  "valid": false,
  "foreshadowed": false,
  "setupChapters": [],
  "twistChapter": 15,
  "warnings": [
    {
      "message": "Twist has no foreshadowing - may feel like deus ex machina",
      "severity": "warning"
    }
  ],
  "suggestions": [
    {
      "message": "Add hints in 2-3 chapters before the reveal",
      "severity": "critical"
    }
  ]
}
```

#### Error Responses
- **500 Internal Server Error**: Server error during validation

---

### 17. Add Ticking Clock

**POST** `/api/projects/:id/thriller-time-pressure`

Create a time-pressure element to increase tension.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Request Body
```typescript
{
  clockType: 'deadline' | 'countdown' | 'racing' | 'decay' | 'opportunity' | 'survival'; // Required
  description: string;                // Required: What is the time pressure
  startChapter?: number;              // Optional: Chapter where clock starts
  resolutionChapter?: number;         // Optional: Chapter where resolved
  stakes?: string;                    // Optional: What happens if time runs out
  timeRemaining?: string;             // Optional: In-story time (e.g., "48 hours")
  reminderFrequency?: 'constant' | 'regular' | 'occasional'; // Optional (default: 'regular')
  active?: boolean;                   // Optional: Is clock currently active (default: true)
}
```

#### Example Request
```json
{
  "clockType": "countdown",
  "description": "Bomb will detonate in 48 hours",
  "startChapter": 5,
  "resolutionChapter": 20,
  "stakes": "City will be destroyed, millions dead",
  "timeRemaining": "48 hours",
  "reminderFrequency": "regular",
  "active": true
}
```

#### Response (200 OK)
```json
{
  "id": "tc_mno345",
  "projectId": "proj_xyz789",
  "clockType": "countdown",
  "description": "Bomb will detonate in 48 hours",
  "startChapter": 5,
  "resolutionChapter": 20,
  "stakes": "City will be destroyed, millions dead",
  "timeRemaining": "48 hours",
  "reminderFrequency": "regular",
  "active": true,
  "createdAt": "2026-01-30T10:00:00Z"
}
```

#### Error Responses
- **400 Bad Request**: `"clockType and description are required"`
- **500 Internal Server Error**: Server error during creation

#### Clock Types
| Type | Description |
|------|-------------|
| deadline | Specific time limit |
| countdown | Visible countdown to disaster |
| racing | Competing against antagonist |
| decay | Situation getting worse over time |
| opportunity | Window closing |
| survival | Time running out for victim |

---

### 18. Get Active Time Pressure Elements

**GET** `/api/projects/:id/thriller-time-pressure`

Retrieve active ticking clock elements.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Query Parameters
- `includeInactive` (boolean, optional): Include deactivated clocks (default: false)

#### Example Request
```
GET /api/projects/proj_xyz789/thriller-time-pressure?includeInactive=true
```

#### Response (200 OK)
```json
[
  {
    "id": "tc_mno345",
    "projectId": "proj_xyz789",
    "clockType": "countdown",
    "description": "Bomb will detonate in 48 hours",
    "startChapter": 5,
    "resolutionChapter": 20,
    "stakes": "City will be destroyed",
    "timeRemaining": "48 hours",
    "reminderFrequency": "regular",
    "active": true,
    "createdAt": "2026-01-30T10:00:00Z"
  }
]
```

#### Error Responses
- **500 Internal Server Error**: Server error during retrieval

---

### 19. Deactivate Ticking Clock

**PUT** `/api/projects/:id/thriller-time-pressure/:clockId/deactivate`

Mark a ticking clock as resolved/inactive.

#### Path Parameters
- `id` (string, UUID): The project ID
- `clockId` (string): The ticking clock ID

#### Response (200 OK)
```json
{
  "success": true
}
```

#### Error Responses
- **500 Internal Server Error**: Server error during deactivation

---

### 20. Calculate Tension Curve

**GET** `/api/projects/:id/thriller-tension-curve`

Generate a chapter-by-chapter tension curve based on hooks and twists.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Query Parameters
- `totalChapters` (number, required): Total number of chapters

#### Example Request
```
GET /api/projects/proj_xyz789/thriller-tension-curve?totalChapters=20
```

#### Response (200 OK)
```json
{
  "totalChapters": 20,
  "pacingStyle": "escalating",
  "curve": [
    {
      "chapter": 1,
      "tensionLevel": 5,
      "hooks": [],
      "twists": [],
      "hasHook": false
    },
    {
      "chapter": 5,
      "tensionLevel": 7,
      "hooks": [
        {
          "type": "cliffhanger",
          "description": "Protagonist opens door to find antagonist",
          "tensionLevel": 9
        }
      ],
      "twists": [],
      "hasHook": true
    },
    {
      "chapter": 15,
      "tensionLevel": 9,
      "hooks": [],
      "twists": [
        {
          "type": "betrayal",
          "description": "Trusted ally revealed as double agent",
          "impactLevel": "extreme"
        }
      ],
      "hasHook": false
    }
  ],
  "averageTension": 7.2,
  "peakTension": 9,
  "lowestTension": 5
}
```

#### Error Responses
- **400 Bad Request**: `"totalChapters query parameter is required"`
- **500 Internal Server Error**: Server error during calculation

---

### 21. Validate Thriller Pacing

**GET** `/api/projects/:id/thriller-pacing/validate`

Check if pacing meets thriller genre requirements.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Query Parameters
- `totalChapters` (number, required): Total number of chapters

#### Example Request
```
GET /api/projects/proj_xyz789/thriller-pacing/validate?totalChapters=20
```

#### Response (200 OK)
```json
{
  "valid": true,
  "meetsRequirements": true,
  "config": {
    "pacingStyle": "escalating",
    "chapterHookRequired": true,
    "averageChapterTension": 8
  },
  "statistics": {
    "totalChapters": 20,
    "chaptersWithHooks": 18,
    "hookCoverage": 90,
    "averageTension": 7.8,
    "twistCount": 3
  },
  "warnings": [
    {
      "chapter": 7,
      "message": "Chapter 7 has no hook (requirement: every chapter)",
      "severity": "warning"
    }
  ],
  "suggestions": [
    {
      "message": "Consider adding more hooks in chapters 7 and 12",
      "severity": "info"
    }
  ]
}
```

#### Error Responses
- **400 Bad Request**: `"totalChapters query parameter is required"`
- **500 Internal Server Error**: Server error during validation

---

## Sci-Fi Commercial Endpoints

### 22. Create/Update Sci-Fi Classification

**POST** `/api/projects/:id/scifi-classification`

Set the scientific hardness level and tech explanation approach.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Request Body
```typescript
{
  hardnessLevel: 'hard' | 'firm' | 'medium' | 'soft' | 'science_fantasy'; // Required
  techExplanationDepth: 'detailed' | 'moderate' | 'minimal' | 'none';     // Required
  scientificAccuracyPriority: number;  // Required: 1-10 scale
}
```

#### Example Request
```json
{
  "hardnessLevel": "firm",
  "techExplanationDepth": "moderate",
  "scientificAccuracyPriority": 7
}
```

#### Response (200 OK)
```json
{
  "id": "sc_abc123",
  "projectId": "proj_xyz789",
  "hardnessLevel": "firm",
  "techExplanationDepth": "moderate",
  "scientificAccuracyPriority": 7,
  "speculativeElements": [],
  "realScienceBasis": [],
  "handwaveAllowed": [],
  "createdAt": "2026-01-30T10:00:00Z",
  "updatedAt": "2026-01-30T10:00:00Z"
}
```

#### Error Responses
- **400 Bad Request**: `"hardnessLevel, techExplanationDepth, and scientificAccuracyPriority are required"`
- **500 Internal Server Error**: Server error during creation

#### Hardness Levels
| Level | Description |
|-------|-------------|
| hard | Rigorous scientific accuracy |
| firm | Generally plausible, some handwaving |
| medium | Balance of science and speculation |
| soft | Science as backdrop, focus elsewhere |
| science_fantasy | Science-flavoured fantasy |

#### Tech Explanation Depth
| Level | Description |
|-------|-------------|
| detailed | Full technical explanations |
| moderate | Brief explanations, focus on effects |
| minimal | Mention technology without detail |
| none | Technology exists without explanation |

---

### 23. Get Sci-Fi Classification

**GET** `/api/projects/:id/scifi-classification`

Retrieve the scientific classification settings.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Response (200 OK)
```json
{
  "id": "sc_abc123",
  "projectId": "proj_xyz789",
  "hardnessLevel": "firm",
  "techExplanationDepth": "moderate",
  "scientificAccuracyPriority": 7,
  "speculativeElements": ["FTL drive", "artificial gravity"],
  "realScienceBasis": ["quantum entanglement", "relativity"],
  "handwaveAllowed": ["FTL communication"],
  "createdAt": "2026-01-30T10:00:00Z",
  "updatedAt": "2026-01-30T10:00:00Z"
}
```

#### Error Responses
- **404 Not Found**: `"No sci-fi classification found for this project"`
- **500 Internal Server Error**: Server error during retrieval

---

### 24. Delete Sci-Fi Classification

**DELETE** `/api/projects/:id/scifi-classification`

Remove sci-fi classification from a project.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Response (200 OK)
```json
{
  "success": true
}
```

#### Error Responses
- **500 Internal Server Error**: Server error during deletion

---

### 25. Add Speculative Element

**POST** `/api/projects/:id/scifi-speculative-elements`

Track a key speculative technology or concept in the story.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Request Body
```typescript
{
  element: string;  // Required: Name of speculative element
}
```

#### Example Request
```json
{
  "element": "FTL drive based on Alcubierre metric"
}
```

#### Response (200 OK)
```json
{
  "success": true
}
```

#### Error Responses
- **400 Bad Request**: `"element is required"`
- **500 Internal Server Error**: Server error during addition

---

### 26. Get Speculative Elements

**GET** `/api/projects/:id/scifi-speculative-elements`

Retrieve all speculative elements for the project.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Response (200 OK)
```json
{
  "elements": [
    "FTL drive based on Alcubierre metric",
    "Neural interface technology",
    "Quantum entanglement communication"
  ]
}
```

#### Error Responses
- **500 Internal Server Error**: Server error during retrieval

---

### 27. Set Real Science Basis

**PUT** `/api/projects/:id/scifi-real-science-basis`

Define which real scientific principles the story extrapolates from.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Request Body
```typescript
{
  scienceAreas: string[];  // Required: Array of real science areas
}
```

#### Example Request
```json
{
  "scienceAreas": [
    "quantum mechanics",
    "general relativity",
    "neuroscience",
    "materials science"
  ]
}
```

#### Response (200 OK)
```json
{
  "success": true
}
```

#### Error Responses
- **400 Bad Request**: `"scienceAreas must be an array"`
- **500 Internal Server Error**: Server error during update

---

### 28. Set Handwave Areas

**PUT** `/api/projects/:id/scifi-handwave-areas`

Define where scientific accuracy is relaxed for story purposes.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Request Body
```typescript
{
  areas: string[];  // Required: Array of areas where handwaving is acceptable
}
```

#### Example Request
```json
{
  "areas": [
    "FTL communication (instant across any distance)",
    "Artificial gravity without rotation",
    "Sound in space for dramatic effect"
  ]
}
```

#### Response (200 OK)
```json
{
  "success": true
}
```

#### Error Responses
- **400 Bad Request**: `"areas must be an array"`
- **500 Internal Server Error**: Server error during update

---

### 29. Validate Classification Consistency

**GET** `/api/projects/:id/scifi-classification/validate`

Check if classification settings are internally consistent.

#### Path Parameters
- `id` (string, UUID): The project ID

#### Response (200 OK)
```json
{
  "valid": true,
  "consistent": true,
  "classification": {
    "hardnessLevel": "firm",
    "techExplanationDepth": "moderate",
    "scientificAccuracyPriority": 7
  },
  "warnings": [],
  "suggestions": [
    {
      "message": "Consider adding more speculative elements to your tracking",
      "severity": "info"
    }
  ]
}
```

**Or (Inconsistent):**
```json
{
  "valid": false,
  "consistent": false,
  "classification": {
    "hardnessLevel": "hard",
    "techExplanationDepth": "none",
    "scientificAccuracyPriority": 9
  },
  "warnings": [
    {
      "message": "Hard sci-fi with no tech explanation is inconsistent - readers expect detailed explanations",
      "severity": "warning"
    },
    {
      "message": "High accuracy priority (9) conflicts with 'none' explanation depth",
      "severity": "warning"
    }
  ],
  "suggestions": [
    {
      "message": "For hard sci-fi, use 'detailed' or 'moderate' tech explanation depth",
      "severity": "critical"
    }
  ]
}
```

#### Error Responses
- **500 Internal Server Error**: Server error during validation

---

### 30. Get Reader Expectations

**GET** `/api/scifi-reader-expectations/:hardnessLevel`

Get what readers typically expect from each hardness level.

#### Path Parameters
- `hardnessLevel` (string): One of: 'hard', 'firm', 'medium', 'soft', 'science_fantasy'

#### Example Request
```
GET /api/scifi-reader-expectations/hard
```

#### Response (200 OK)
```json
{
  "hardnessLevel": "hard",
  "expectations": {
    "scientificAccuracy": "High - must follow known physics",
    "explanationDepth": "Detailed technical explanations expected",
    "speculativeElements": "Minimal and well-justified",
    "plausibility": "Everything must be theoretically possible",
    "tone": "Often educational, technical"
  },
  "examples": [
    "The Martian by Andy Weir",
    "Rendezvous with Rama by Arthur C. Clarke"
  ],
  "recommendedSettings": {
    "techExplanationDepth": "detailed",
    "scientificAccuracyPriority": 9
  }
}
```

#### Error Responses
- **400 Bad Request**: `"Invalid hardness level"`
- **500 Internal Server Error**: Server error during retrieval

---

### 31. Get Explanation Depth Suggestion

**GET** `/api/scifi-explanation-depth-suggestion/:hardnessLevel`

Get recommended explanation depth for a hardness level.

#### Path Parameters
- `hardnessLevel` (string): One of: 'hard', 'firm', 'medium', 'soft', 'science_fantasy'

#### Example Request
```
GET /api/scifi-explanation-depth-suggestion/medium
```

#### Response (200 OK)
```json
{
  "hardnessLevel": "medium",
  "recommendedDepth": "moderate",
  "reasoning": "Medium sci-fi balances science and story. Moderate explanations provide enough detail for plausibility without slowing the narrative.",
  "alternatives": [
    {
      "depth": "minimal",
      "useWhen": "Focusing more on character/plot than technology"
    },
    {
      "depth": "detailed",
      "useWhen": "Technology is central to the plot"
    }
  ]
}
```

#### Error Responses
- **400 Bad Request**: `"Invalid hardness level"`
- **500 Internal Server Error**: Server error during calculation

---

### 32. Get Subgenre Defaults

**GET** `/api/scifi-subgenre-defaults/:subgenre`

Get default classification settings for common sci-fi subgenres.

#### Path Parameters
- `subgenre` (string): Sci-fi subgenre name (e.g., 'space_opera', 'cyberpunk')

#### Example Request
```
GET /api/scifi-subgenre-defaults/space_opera
```

#### Response (200 OK)
```json
{
  "subgenre": "space_opera",
  "defaultSettings": {
    "hardnessLevel": "soft",
    "techExplanationDepth": "minimal",
    "scientificAccuracyPriority": 3
  },
  "reasoning": "Space opera prioritises adventure and scale over scientific accuracy. Technology exists to enable the story.",
  "commonElements": [
    "FTL travel",
    "energy weapons",
    "alien civilisations",
    "galactic empires"
  ],
  "examples": [
    "Star Wars",
    "The Expanse",
    "Foundation"
  ]
}
```

**Other Supported Subgenres:**
- `cyberpunk` (firm, moderate, 6)
- `hard_sci_fi` (hard, detailed, 9)
- `science_fantasy` (science_fantasy, none, 1)
- `first_contact` (medium, moderate, 5)
- `post_apocalyptic` (firm, minimal, 4)

#### Error Responses
- **500 Internal Server Error**: Server error during retrieval

#### Notes
- Returns default settings even for unrecognised subgenres (medium hardness)
- These are suggestions, not requirements - customise as needed

---

## Common Error Codes

All endpoints may return the following errors:

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid parameters or missing required fields |
| 404 | Not Found - Resource does not exist |
| 500 | Internal Server Error - Server-side error occurred |

## Data Types Reference

### TypeScript Interfaces

```typescript
// Romance Types
interface RomanceHeatLevel {
  id: string;
  projectId: string;
  heatLevel: 1 | 2 | 3 | 4 | 5;
  contentWarnings?: string[];
  fadeToBlack: boolean;
  onPageIntimacy: boolean;
  sensualityFocus: 'emotional' | 'physical' | 'balanced';
  createdAt: string;
  updatedAt: string;
}

interface RomanceBeat {
  id: string;
  projectId: string;
  beatType: 'meet_cute' | 'first_attraction' | 'first_conflict' | 'first_touch' |
            'first_kiss' | 'first_intimacy' | 'black_moment' | 'grand_gesture' |
            'declaration' | 'commitment' | 'hea_hfn';
  chapterNumber?: number;
  sceneDescription?: string;
  emotionalIntensity?: number; // 1-10
  notes?: string;
  completed: boolean;
  createdAt: string;
}

// Thriller Types
interface ThrillerPacing {
  id: string;
  projectId: string;
  pacingStyle: 'relentless' | 'escalating' | 'rollercoaster' | 'slow_burn';
  chapterHookRequired: boolean;
  cliffhangerFrequency: 'every' | 'most' | 'some';
  actionSceneRatio: number; // 10-90
  averageChapterTension: number; // 1-10
  createdAt: string;
  updatedAt: string;
}

interface ThrillerChapterHook {
  id: string;
  projectId: string;
  chapterNumber: number;
  hookType: 'cliffhanger' | 'revelation' | 'question' | 'threat' | 'betrayal' |
            'countdown' | 'mystery_deepens' | 'reversal' | 'emotional_gut_punch' |
            'foreshadowing';
  hookDescription?: string;
  tensionLevel: number; // 1-10
  resolvedInChapter?: number;
  createdAt: string;
}

interface ThrillerTwist {
  id: string;
  projectId: string;
  twistType: 'major_reveal' | 'minor_reveal' | 'red_herring' | 'false_victory' |
             'betrayal' | 'hidden_identity' | 'plot_reversal' | 'unreliable_info' |
             'connection_reveal' | 'stakes_escalation';
  chapterNumber?: number;
  setupChapters: number[];
  description: string;
  impactLevel: 'low' | 'medium' | 'high' | 'extreme';
  foreshadowed: boolean;
  createdAt: string;
}

interface ThrillerTimePressure {
  id: string;
  projectId: string;
  clockType: 'deadline' | 'countdown' | 'racing' | 'decay' | 'opportunity' | 'survival';
  description: string;
  startChapter?: number;
  resolutionChapter?: number;
  stakes?: string;
  timeRemaining?: string;
  reminderFrequency: 'constant' | 'regular' | 'occasional';
  active: boolean;
  createdAt: string;
}

// Sci-Fi Types
interface SciFiClassification {
  id: string;
  projectId: string;
  hardnessLevel: 'hard' | 'firm' | 'medium' | 'soft' | 'science_fantasy';
  techExplanationDepth: 'detailed' | 'moderate' | 'minimal' | 'none';
  scientificAccuracyPriority: number; // 1-10
  speculativeElements: string[];
  realScienceBasis: string[];
  handwaveAllowed: string[];
  createdAt: string;
  updatedAt: string;
}
```

---

## Best Practices

### Romance Endpoints
1. Always set heat level before adding beats
2. Track all major romance beats for complete story arc
3. Use heartbreaker check before finalising outline
4. HEA/HFN is mandatory for romance genre

### Thriller Endpoints
1. Set pacing style early to guide chapter structure
2. Add hooks as you plan each chapter
3. Track twists with setup chapters for foreshadowing
4. Validate pacing before drafting to ensure tension is maintained
5. Use ticking clocks sparingly - too many dilute tension

### Sci-Fi Endpoints
1. Set classification early to guide technology descriptions
2. Be consistent between hardness level and explanation depth
3. Document speculative elements for continuity
4. Clearly define handwave areas to avoid confusion
5. Use subgenre defaults as starting point, then customise

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-30 | Initial documentation for commercial genre endpoints |
