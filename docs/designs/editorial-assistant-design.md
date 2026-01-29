# Editorial Assistant - Technical Design

**Feature**: Conversational AI chat interface for the Edit Story page
**Author**: Dr. James Okafor (Architect Agent)
**Date**: 2026-01-29
**Status**: Design Review

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Design](#component-design)
3. [Data Model](#data-model)
4. [API Design](#api-design)
5. [Intent Detection System](#intent-detection-system)
6. [Frontend Component Architecture](#frontend-component-architecture)
7. [State Management](#state-management)
8. [Integration with Edit Story Page](#integration-with-edit-story-page)
9. [Security Considerations](#security-considerations)
10. [Testing Strategy](#testing-strategy)
11. [Performance Considerations](#performance-considerations)
12. [UK British Spelling Enforcement](#uk-british-spelling-enforcement)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Edit Story Page                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │         EditorialAssistant Component              │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │  Chat Message List (Scrollable)             │ │  │
│  │  │  - User messages                             │ │  │
│  │  │  - AI responses (Answer/Recommendation)      │ │  │
│  │  │  - Recommendation cards with Apply/Dismiss   │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │  Message Input Box                          │ │  │
│  │  │  - Textarea for user query                  │ │  │
│  │  │  - Send button                              │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  Form State (Story Concept + DNA fields)                │
└─────────────────────────────────────────────────────────┘
                          ↓
                     API Request
                          ↓
┌─────────────────────────────────────────────────────────┐
│         POST /api/projects/:id/editorial-assistant       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  1. Intent Detection (Question/Change/Suggestion) │  │
│  │  2. Context Assembly (Story Concept + DNA only)   │  │
│  │  3. Claude API Call with Intent-Specific Prompt   │  │
│  │  4. Response Parsing & Validation                 │  │
│  │  5. Return Typed Response                         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **No Database Persistence for Conversations**: Chat history is ephemeral (kept in component state). When user leaves the page, conversation resets. This is intentional - each session is a focused editing dialogue.

2. **Project-Scoped Context Only**: The AI assistant ONLY has access to the current project's Story Concept and Story DNA. It does NOT see other projects, characters, world-building, or plot structure. This prevents scope creep and keeps responses focused.

3. **Intent Detection via Prompt Engineering**: Rather than building a separate NLP classifier, we use Claude's reasoning capabilities to determine intent from the user's natural language query.

4. **Stateless API Design**: Each API request is self-contained. The conversation history is passed from the frontend, so the backend doesn't track session state.

5. **Optimistic vs Confirmed Updates**:
   - Questions: No changes, just answer
   - Changes (imperative): Apply immediately to form state
   - Suggestions (conditional): Show recommendation card, require approval

---

## Component Design

### Backend Components

#### 1. API Route Handler
**File**: `backend/src/routes/projects.ts`
**Responsibility**: Request validation, auth check, orchestrate intent detection and response generation

```typescript
router.post('/:id/editorial-assistant', async (req, res) => {
  // 1. Validate projectId and auth
  // 2. Fetch project (validate exists)
  // 3. Extract currentConcept, currentDNA, userQuery, conversationHistory
  // 4. Detect intent (question/change/suggestion)
  // 5. Assemble context (project-scoped only)
  // 6. Generate response via Claude
  // 7. Return typed response with usage
});
```

#### 2. Intent Detection Service
**File**: `backend/src/services/editorial-intent-detector.ts` (NEW)
**Responsibility**: Classify user intent using Claude

```typescript
export type IntentType = 'question' | 'change' | 'suggestion';

export interface IntentDetectionResult {
  intent: IntentType;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export async function detectIntent(
  userQuery: string,
  currentConcept: StoryConcept,
  currentDNA: StoryDNA
): Promise<IntentDetectionResult>
```

#### 3. Editorial Response Generator
**File**: `backend/src/services/editorial-response-generator.ts` (NEW)
**Responsibility**: Generate appropriate response based on detected intent

```typescript
export interface EditorialResponse {
  responseType: 'answer' | 'change_applied' | 'recommendation';
  content: string; // AI's textual response
  appliedChanges?: {
    concept?: Partial<StoryConcept>;
    dna?: Partial<StoryDNA>;
  };
  recommendedChanges?: {
    concept?: Partial<StoryConcept>;
    dna?: Partial<StoryDNA>;
    rationale: string;
  };
}

export async function generateEditorialResponse(
  intent: IntentDetectionResult,
  userQuery: string,
  currentConcept: StoryConcept,
  currentDNA: StoryDNA,
  conversationHistory: ConversationMessage[]
): Promise<EditorialResponse>
```

### Frontend Components

#### 1. EditorialAssistant (Main Component)
**File**: `app/components/editorial/EditorialAssistant.tsx` (NEW)
**Responsibility**: Orchestrate chat UI, manage conversation state, coordinate with parent form

```typescript
interface EditorialAssistantProps {
  projectId: string;
  currentConcept: StoryConcept;
  currentDNA: StoryDNA;
  onApplyChanges: (changes: {
    concept?: Partial<StoryConcept>;
    dna?: Partial<StoryDNA>;
  }) => void;
}
```

#### 2. ChatMessage Component
**File**: `app/components/editorial/ChatMessage.tsx` (NEW)
**Responsibility**: Render individual message (user or AI)

```typescript
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  responseType?: 'answer' | 'change_applied' | 'recommendation';
  recommendedChanges?: RecommendedChanges;
  onApply?: () => void;
  onDismiss?: () => void;
}
```

#### 3. RecommendationCard Component
**File**: `app/components/editorial/RecommendationCard.tsx` (NEW)
**Responsibility**: Display AI recommendation with Apply/Dismiss buttons

```typescript
interface RecommendationCardProps {
  rationale: string;
  changes: {
    concept?: Partial<StoryConcept>;
    dna?: Partial<StoryDNA>;
  };
  onApply: () => void;
  onDismiss: () => void;
}
```

---

## Data Model

### API Request Schema

```typescript
interface EditorialAssistantRequest {
  userQuery: string; // User's natural language input
  currentConcept: StoryConcept; // Current form values
  currentDNA: StoryDNA; // Current form values
  conversationHistory: ConversationMessage[]; // Prior messages in this session
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  responseType?: 'answer' | 'change_applied' | 'recommendation';
}
```

### API Response Schema

```typescript
interface EditorialAssistantResponse {
  success: true;
  data: {
    responseType: 'answer' | 'change_applied' | 'recommendation';
    content: string; // AI's message to display
    appliedChanges?: {
      concept?: Partial<StoryConcept>;
      dna?: Partial<StoryDNA>;
    };
    recommendedChanges?: {
      concept?: Partial<StoryConcept>;
      dna?: Partial<StoryDNA>;
      rationale: string;
    };
    intent: IntentType;
    confidence: 'high' | 'medium' | 'low';
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

### Error Response Schema

```typescript
interface EditorialAssistantError {
  error: {
    code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR' | 'AI_ERROR';
    message: string;
  };
}
```

---

## API Design

### Endpoint Specification

**Route**: `POST /api/projects/:id/editorial-assistant`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "userQuery": "What genre would suit this story?",
  "currentConcept": {
    "title": "The Last Lighthouse",
    "logline": "A keeper discovers the lighthouse beam reveals alternate timelines.",
    "synopsis": "...",
    "hook": "...",
    "protagonistHint": "Reclusive lighthouse keeper",
    "conflictType": "man vs nature"
  },
  "currentDNA": {
    "genre": "Science Fiction",
    "subgenre": "Speculative",
    "tone": "Contemplative",
    "themes": ["isolation", "time", "choice"],
    "proseStyle": "Lyrical and introspective",
    "timeframe": "Contemporary"
  },
  "conversationHistory": [
    {
      "role": "user",
      "content": "Can you help me refine the tone?",
      "timestamp": "2026-01-29T10:30:00Z"
    },
    {
      "role": "assistant",
      "content": "The current tone is 'Contemplative'. Would you like to make it darker, lighter, or shift in a different direction?",
      "timestamp": "2026-01-29T10:30:05Z",
      "responseType": "answer"
    }
  ]
}
```

**Success Response (Question)**:
```json
{
  "success": true,
  "data": {
    "responseType": "answer",
    "content": "Based on your story concept featuring a lighthouse keeper discovering alternate timelines, this fits well within the Science Fiction genre with a Speculative subgenre. The contemplative tone you've chosen complements the philosophical questions about choice and consequence inherent in timeline narratives. You might also consider adding 'Philosophical Fiction' as a secondary genre tag.",
    "intent": "question",
    "confidence": "high"
  },
  "usage": {
    "input_tokens": 1250,
    "output_tokens": 180
  }
}
```

**Success Response (Change - Immediate Application)**:
```json
{
  "success": true,
  "data": {
    "responseType": "change_applied",
    "content": "I've updated the genre to 'Thriller' and adjusted the tone to 'Dark and suspenseful' to match your request.",
    "appliedChanges": {
      "dna": {
        "genre": "Thriller",
        "tone": "Dark and suspenseful"
      }
    },
    "intent": "change",
    "confidence": "high"
  },
  "usage": {
    "input_tokens": 1280,
    "output_tokens": 95
  }
}
```

**Success Response (Suggestion - Requires Approval)**:
```json
{
  "success": true,
  "data": {
    "responseType": "recommendation",
    "content": "Based on your story's themes of isolation and time, I suggest these refinements:",
    "recommendedChanges": {
      "dna": {
        "subgenre": "Literary Science Fiction",
        "themes": ["isolation", "time", "choice", "identity"]
      },
      "concept": {
        "tone": "Contemplative with underlying melancholy"
      }
    },
    "rationale": "Adding 'identity' as a theme strengthens the alternate timeline concept, as seeing different versions of oneself inherently raises questions about personal identity. The tonal shift to include 'underlying melancholy' better reflects the emotional weight of isolation.",
    "intent": "suggestion",
    "confidence": "high"
  },
  "usage": {
    "input_tokens": 1290,
    "output_tokens": 210
  }
}
```

**Error Response**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "User query is required and cannot be empty"
  }
}
```

### Request Validation Rules

1. `userQuery`: Required, string, min length 1, max length 2000 characters
2. `currentConcept`: Required, must match StoryConcept schema
3. `currentDNA`: Required, must match StoryDNA schema
4. `conversationHistory`: Optional array, max 20 messages (prevent token overflow)
5. Project must exist and user must have access (auth check)

---

## Intent Detection System

### Detection Strategy

Intent detection uses Claude with a two-stage approach:

**Stage 1: Fast Intent Classification**
- Use Claude with a structured prompt to categorise the query
- Returns intent type + confidence level
- Low-token consumption (≈100-200 output tokens)

**Stage 2: Response Generation**
- Use the detected intent to select the appropriate response template
- Generate the actual editorial response

### Intent Categories

#### 1. **Question Intent**
**Indicators**:
- Interrogative words: "what", "how", "why", "when", "which", "should I"
- Uncertainty phrases: "wondering if", "not sure", "curious about"
- No imperative verbs

**Example Queries**:
- "What genre would suit this story?"
- "How dark should the tone be?"
- "Is this logline compelling enough?"
- "Should I add romance as a theme?"

**Response Behaviour**: Provide informative answer, no changes to form state

#### 2. **Change Intent** (Imperative)
**Indicators**:
- Direct commands: "change", "update", "set", "make", "switch"
- Specific values mentioned: "change genre to thriller", "set tone to dark"
- Definitive language: "I want", "make it", "update the"

**Example Queries**:
- "Change the genre to thriller"
- "Update the tone to be darker and more mysterious"
- "Set the timeframe to Victorian era"
- "Make the conflict type 'man vs society'"

**Response Behaviour**: Apply changes immediately, update form state, show confirmation

#### 3. **Suggestion Intent** (Tentative/Advisory)
**Indicators**:
- Conditional language: "maybe", "perhaps", "might", "could"
- Comparative language: "should be darker", "needs more", "lacks"
- Request for improvement: "improve", "refine", "enhance", "better"
- Vague direction without specific values

**Example Queries**:
- "Maybe the tone should be darker?"
- "The genre might need to be more specific"
- "This could use more themes"
- "Refine the logline to be more compelling"

**Response Behaviour**: Present recommendation with rationale, require explicit approval

### Intent Detection Prompt Template

```
You are an intent detection system for a story editing assistant. Analyse the user's query and classify it into one of three intents:

1. **question**: User is asking for information, advice, or clarification. No changes requested.
2. **change**: User is giving a direct command to modify specific story elements with explicit values.
3. **suggestion**: User is requesting improvements or refinements but without specifying exact values, or using tentative language.

CURRENT STORY CONTEXT:
Genre: {genre}
Subgenre: {subgenre}
Tone: {tone}
Themes: {themes}
Timeframe: {timeframe}

USER QUERY:
{userQuery}

Respond with JSON:
{
  "intent": "question" | "change" | "suggestion",
  "confidence": "high" | "medium" | "low",
  "reasoning": "Brief explanation of why you chose this intent"
}

CLASSIFICATION RULES:
- If query contains interrogative words (what, how, why, should) → question
- If query uses imperative verbs with specific values (change X to Y, set Z to W) → change
- If query uses comparative/improvement language without specific values (darker, better, more compelling) → suggestion
- If query uses tentative language (maybe, perhaps, might, could) → suggestion
```

---

## Frontend Component Architecture

### EditorialAssistant Component Structure

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { colors, typography, spacing, borderRadius } from '@/app/lib/design-tokens';
import ChatMessage from './ChatMessage';
import { StoryConcept, StoryDNA } from '@/shared/types';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  responseType?: 'answer' | 'change_applied' | 'recommendation';
  appliedChanges?: { concept?: Partial<StoryConcept>; dna?: Partial<StoryDNA> };
  recommendedChanges?: {
    concept?: Partial<StoryConcept>;
    dna?: Partial<StoryDNA>;
    rationale: string;
  };
}

interface EditorialAssistantProps {
  projectId: string;
  currentConcept: StoryConcept;
  currentDNA: StoryDNA;
  onApplyChanges: (changes: {
    concept?: Partial<StoryConcept>;
    dna?: Partial<StoryDNA>;
  }) => void;
}

export default function EditorialAssistant({
  projectId,
  currentConcept,
  currentDNA,
  onApplyChanges,
}: EditorialAssistantProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}/editorial-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userQuery: userInput,
            currentConcept,
            currentDNA,
            conversationHistory: messages.slice(-10), // Last 10 messages for context
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.data.content,
        timestamp: new Date().toISOString(),
        responseType: data.data.responseType,
        appliedChanges: data.data.appliedChanges,
        recommendedChanges: data.data.recommendedChanges,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-apply changes for "change_applied" responses
      if (data.data.responseType === 'change_applied' && data.data.appliedChanges) {
        onApplyChanges(data.data.appliedChanges);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyRecommendation = (
    messageId: string,
    changes: { concept?: Partial<StoryConcept>; dna?: Partial<StoryDNA> }
  ) => {
    onApplyChanges(changes);
    // Mark recommendation as applied in UI
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, recommendedChanges: undefined } // Remove recommendation card
          : msg
      )
    );
  };

  const handleDismissRecommendation = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, recommendedChanges: undefined }
          : msg
      )
    );
  };

  return (
    <div style={{
      background: colors.background.surface,
      border: `1px solid ${colors.border.default}`,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '600px',
    }}>
      {/* Header */}
      <div style={{
        padding: spacing[4],
        borderBottom: `1px solid ${colors.border.default}`,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.white,
        }}>
          Editorial Assistant
        </h3>
        <p style={{
          margin: 0,
          marginTop: spacing[1],
          fontSize: typography.fontSize.sm,
          color: 'rgba(255, 255, 255, 0.9)',
        }}>
          Ask questions or request changes to your story concept and DNA
        </p>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: spacing[4],
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[4],
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: colors.text.tertiary,
            padding: spacing[8],
          }}>
            <p style={{ margin: 0, fontSize: typography.fontSize.sm }}>
              Start a conversation by asking a question or requesting changes
            </p>
          </div>
        )}

        {messages.map(message => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            timestamp={message.timestamp}
            responseType={message.responseType}
            appliedChanges={message.appliedChanges}
            recommendedChanges={message.recommendedChanges}
            onApply={
              message.recommendedChanges
                ? () => handleApplyRecommendation(message.id, message.recommendedChanges!)
                : undefined
            }
            onDismiss={
              message.recommendedChanges
                ? () => handleDismissRecommendation(message.id)
                : undefined
            }
          />
        ))}

        {isLoading && (
          <div style={{
            display: 'flex',
            gap: spacing[2],
            color: colors.text.tertiary,
            fontSize: typography.fontSize.sm,
          }}>
            <span>AI is thinking</span>
            <span className="loading-dots">...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: spacing[3],
          background: colors.semantic.errorLight,
          border: `1px solid ${colors.semantic.errorBorder}`,
          color: colors.semantic.error,
          fontSize: typography.fontSize.sm,
        }}>
          {error}
        </div>
      )}

      {/* Input Area */}
      <div style={{
        padding: spacing[4],
        borderTop: `1px solid ${colors.border.default}`,
        background: colors.background.primary,
      }}>
        <div style={{ display: 'flex', gap: spacing[2] }}>
          <textarea
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask a question or request changes..."
            rows={2}
            style={{
              flex: 1,
              padding: spacing[3],
              border: `1px solid ${colors.border.default}`,
              borderRadius: borderRadius.md,
              fontSize: typography.fontSize.sm,
              resize: 'none',
              fontFamily: typography.fontFamily.base,
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!userInput.trim() || isLoading}
            style={{
              padding: `${spacing[3]} ${spacing[5]}`,
              background: !userInput.trim() || isLoading
                ? colors.text.disabled
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: borderRadius.md,
              color: colors.white,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              cursor: !userInput.trim() || isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            Send
          </button>
        </div>
        <p style={{
          margin: 0,
          marginTop: spacing[2],
          fontSize: typography.fontSize.xs,
          color: colors.text.disabled,
        }}>
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
```

---

## State Management

### Component-Level State

The `EditorialAssistant` component manages its own state:

```typescript
// Conversation state (ephemeral - resets on page navigation)
const [messages, setMessages] = useState<ConversationMessage[]>([]);

// Input state
const [userInput, setUserInput] = useState('');

// UI state
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### Parent-Child Communication

The parent page (Edit Story) maintains the form state and passes it down:

```typescript
// In EditStoryPage component
<EditorialAssistant
  projectId={projectId}
  currentConcept={buildCurrentConcept()} // Built from form state
  currentDNA={buildCurrentDNA()} // Built from form state
  onApplyChanges={(changes) => {
    // Apply changes to form fields
    if (changes.concept) {
      if (changes.concept.title !== undefined) setTitle(changes.concept.title);
      if (changes.concept.logline !== undefined) setLogline(changes.concept.logline);
      // ... etc
    }
    if (changes.dna) {
      if (changes.dna.genre !== undefined) setGenre(changes.dna.genre);
      if (changes.dna.tone !== undefined) setTone(changes.dna.tone);
      // ... etc
    }
  }}
/>
```

### State Flow Diagram

```
User types message
       ↓
EditorialAssistant adds to messages[]
       ↓
API call with currentConcept + currentDNA (from parent)
       ↓
Response received
       ↓
Add AI response to messages[]
       ↓
IF responseType === 'change_applied'
   → Call onApplyChanges() → Parent updates form fields
ELSE IF responseType === 'recommendation'
   → Show Apply/Dismiss buttons
   → User clicks Apply → Call onApplyChanges() → Parent updates form fields
```

---

## Integration with Edit Story Page

### Current Page Structure

The Edit Story page currently has:
1. AI Refinement section (top) - **REPLACE WITH EditorialAssistant**
2. Story Concept form section
3. Story DNA form section
4. Save button

### Proposed Changes

**Remove**:
- AI Refinement section (lines 356-423 in current edit-story/page.tsx)
- `feedback` state
- `refining` state
- `aiChanges` state
- `handleAIRefine` function

**Add**:
```typescript
import EditorialAssistant from '@/app/components/editorial/EditorialAssistant';

// ... in the JSX, replace AI Refinement section with:

<EditorialAssistant
  projectId={projectId}
  currentConcept={buildCurrentConcept()}
  currentDNA={buildCurrentDNA()}
  onApplyChanges={handleApplyEditorialChanges}
/>

// New handler function:
const handleApplyEditorialChanges = (changes: {
  concept?: Partial<StoryConcept>;
  dna?: Partial<StoryDNA>;
}) => {
  // Apply concept changes
  if (changes.concept) {
    if (changes.concept.title !== undefined) setTitle(changes.concept.title);
    if (changes.concept.logline !== undefined) setLogline(changes.concept.logline || '');
    if (changes.concept.synopsis !== undefined) setSynopsis(changes.concept.synopsis || '');
    if (changes.concept.hook !== undefined) setHook(changes.concept.hook || '');
    if (changes.concept.protagonistHint !== undefined)
      setProtagonistHint(changes.concept.protagonistHint || '');
    if (changes.concept.conflictType !== undefined)
      setConflictType(changes.concept.conflictType || '');
  }

  // Apply DNA changes
  if (changes.dna) {
    if (changes.dna.genre !== undefined) setGenre(changes.dna.genre);
    if (changes.dna.subgenre !== undefined) setSubgenre(changes.dna.subgenre);
    if (changes.dna.tone !== undefined) setTone(changes.dna.tone);
    if (changes.dna.themes !== undefined)
      setThemes(changes.dna.themes.join(', '));
    if (changes.dna.proseStyle !== undefined)
      setProseStyle(changes.dna.proseStyle);
    if (changes.dna.timeframe !== undefined)
      setTimeframe(changes.dna.timeframe || '');
  }

  // Show success message
  setSuccessMessage('Changes applied from Editorial Assistant');
  setTimeout(() => setSuccessMessage(null), 3000);
};
```

---

## Security Considerations

### 1. Authentication & Authorisation
- All requests require valid JWT token via `Authorization: Bearer <token>` header
- Verify user has access to the specified project
- Return 401 for invalid/expired tokens
- Return 403 if project doesn't belong to user

### 2. Input Validation
- Sanitise `userQuery` to prevent injection attacks
- Max length 2000 characters for user queries
- Validate `currentConcept` and `currentDNA` match expected schema
- Limit conversation history to 20 messages max

### 3. Rate Limiting
- Implement per-user rate limiting: 20 requests per minute
- Track in existing session_tracking table or add new rate_limits table
- Return 429 Too Many Requests when limit exceeded

### 4. Data Privacy
- DO NOT log full conversation content (contains user's creative work)
- Log only metadata: projectId, userId, intent type, token usage
- Ensure AI responses only reference current project data

### 5. AI Safety
- System prompts must prevent AI from:
  - Referencing data outside the current project
  - Generating harmful/inappropriate content
  - Suggesting changes that would break data integrity
- Validate AI responses before returning to client

### 6. Error Handling
- Never expose internal error details to client
- Log full stack traces server-side only
- Return generic "An error occurred" messages
- Include error codes for client-side handling

---

## Testing Strategy

### Unit Tests

#### Backend Services

**File**: `backend/src/services/__tests__/editorial-intent-detector.test.ts`
```typescript
describe('detectIntent', () => {
  it('should detect question intent for interrogative queries', async () => {
    const result = await detectIntent(
      'What genre would suit this story?',
      mockConcept,
      mockDNA
    );
    expect(result.intent).toBe('question');
    expect(result.confidence).toBe('high');
  });

  it('should detect change intent for imperative commands', async () => {
    const result = await detectIntent(
      'Change the genre to thriller',
      mockConcept,
      mockDNA
    );
    expect(result.intent).toBe('change');
  });

  it('should detect suggestion intent for tentative language', async () => {
    const result = await detectIntent(
      'Maybe the tone should be darker?',
      mockConcept,
      mockDNA
    );
    expect(result.intent).toBe('suggestion');
  });
});
```

**File**: `backend/src/services/__tests__/editorial-response-generator.test.ts`
```typescript
describe('generateEditorialResponse', () => {
  it('should generate answer response for question intent', async () => {
    const response = await generateEditorialResponse(
      { intent: 'question', confidence: 'high', reasoning: 'test' },
      'What genre suits this?',
      mockConcept,
      mockDNA,
      []
    );
    expect(response.responseType).toBe('answer');
    expect(response.appliedChanges).toBeUndefined();
  });

  it('should generate change_applied response with appliedChanges', async () => {
    const response = await generateEditorialResponse(
      { intent: 'change', confidence: 'high', reasoning: 'test' },
      'Change genre to thriller',
      mockConcept,
      mockDNA,
      []
    );
    expect(response.responseType).toBe('change_applied');
    expect(response.appliedChanges).toBeDefined();
    expect(response.appliedChanges?.dna?.genre).toBe('Thriller');
  });
});
```

#### API Route Tests

**File**: `backend/src/routes/__tests__/projects-editorial-assistant.test.ts`
```typescript
describe('POST /api/projects/:id/editorial-assistant', () => {
  it('should return 400 if userQuery is missing', async () => {
    const response = await request(app)
      .post('/api/projects/test-id/editorial-assistant')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentConcept: {}, currentDNA: {} });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 if project not found', async () => {
    const response = await request(app)
      .post('/api/projects/nonexistent/editorial-assistant')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ userQuery: 'test', currentConcept: {}, currentDNA: {} });

    expect(response.status).toBe(404);
  });

  it('should return answer response for question', async () => {
    const response = await request(app)
      .post('/api/projects/test-id/editorial-assistant')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        userQuery: 'What genre would suit this?',
        currentConcept: mockConcept,
        currentDNA: mockDNA,
        conversationHistory: []
      });

    expect(response.status).toBe(200);
    expect(response.body.data.responseType).toBe('answer');
    expect(response.body.usage).toBeDefined();
  });
});
```

### Integration Tests

**File**: `backend/src/__tests__/editorial-assistant-integration.test.ts`
```typescript
describe('Editorial Assistant Integration', () => {
  it('should handle full conversation flow', async () => {
    // Question -> Answer
    const q1 = await sendQuery('What genre suits this?');
    expect(q1.responseType).toBe('answer');

    // Change -> Apply
    const q2 = await sendQuery('Change genre to thriller', [q1]);
    expect(q2.responseType).toBe('change_applied');
    expect(q2.appliedChanges.dna.genre).toBe('Thriller');

    // Suggestion -> Recommendation
    const q3 = await sendQuery('Maybe make it darker?', [q1, q2]);
    expect(q3.responseType).toBe('recommendation');
    expect(q3.recommendedChanges).toBeDefined();
  });
});
```

### Frontend Component Tests

**File**: `app/components/editorial/__tests__/EditorialAssistant.test.tsx`
```typescript
describe('EditorialAssistant', () => {
  it('should render empty state initially', () => {
    render(<EditorialAssistant {...mockProps} />);
    expect(screen.getByText(/start a conversation/i)).toBeInTheDocument();
  });

  it('should send message on Enter key', async () => {
    render(<EditorialAssistant {...mockProps} />);
    const textarea = screen.getByPlaceholderText(/ask a question/i);

    fireEvent.change(textarea, { target: { value: 'Test query' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/editorial-assistant'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('should call onApplyChanges when applying recommendation', async () => {
    const mockOnApply = jest.fn();
    render(<EditorialAssistant {...mockProps} onApplyChanges={mockOnApply} />);

    // Simulate receiving recommendation
    // ... test setup ...

    const applyButton = screen.getByText(/apply/i);
    fireEvent.click(applyButton);

    expect(mockOnApply).toHaveBeenCalledWith({
      dna: { genre: 'Thriller' }
    });
  });
});
```

### End-to-End Tests

**File**: `e2e/editorial-assistant.spec.ts`
```typescript
test('full editorial assistant workflow', async ({ page }) => {
  await page.goto('/projects/test-id/edit-story');

  // Ask question
  await page.fill('[placeholder*="Ask a question"]', 'What genre suits this?');
  await page.press('[placeholder*="Ask a question"]', 'Enter');
  await expect(page.locator('text=Based on your story')).toBeVisible();

  // Request change
  await page.fill('[placeholder*="Ask a question"]', 'Change genre to thriller');
  await page.press('[placeholder*="Ask a question"]', 'Enter');
  await expect(page.locator('text=updated the genre')).toBeVisible();

  // Verify form field updated
  const genreInput = page.locator('input[value*="Thriller"]');
  await expect(genreInput).toBeVisible();

  // Request suggestion
  await page.fill('[placeholder*="Ask a question"]', 'Make it darker');
  await page.press('[placeholder*="Ask a question"]', 'Enter');

  // Apply recommendation
  await page.click('button:has-text("Apply")');
  await expect(page.locator('text=Changes applied')).toBeVisible();
});
```

---

## Performance Considerations

### 1. Token Management
- Limit conversation history to last 10 messages (prevent context window overflow)
- Estimate: Average message = 150 tokens
- Max context from history: 10 messages × 150 tokens = 1,500 tokens
- Current concept + DNA: ~800 tokens
- Intent detection prompt: ~300 tokens
- **Total input: ~2,600 tokens (well within Claude's 200k limit)**

### 2. Response Caching
- No server-side caching needed (responses are user-specific and context-dependent)
- Client-side: Messages cached in component state only

### 3. API Optimisations
- Use streaming for long AI responses (future enhancement)
- Implement request debouncing on client (300ms delay)
- Show typing indicator while waiting for response

### 4. Database Impact
- **Zero database queries for conversations** (ephemeral state)
- Only one database query per request: Fetch project to validate access
- Use existing project cache if recently fetched

### 5. Rate Limiting Strategy
```typescript
// Per-user rate limit: 20 requests per minute
const RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  maxRequests: 20,
};

// Implementation in middleware
async function editorialAssistantRateLimit(req, res, next) {
  const userId = req.user.id;
  const key = `editorial:${userId}`;
  const count = await cache.get(key) || 0;

  if (count >= RATE_LIMIT.maxRequests) {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait a minute and try again.',
      },
    });
  }

  await cache.set(key, count + 1, RATE_LIMIT.windowMs);
  next();
}
```

---

## UK British Spelling Enforcement

### System Prompt Template

All Claude API calls for editorial assistant MUST include this directive:

```
CRITICAL INSTRUCTION - UK BRITISH SPELLING:
You MUST use UK British spelling conventions in ALL responses. This is non-negotiable.

Examples:
- "colour" NOT "color"
- "realise" NOT "realize"
- "organise" NOT "organize"
- "behaviour" NOT "behavior"
- "favour" NOT "favour"
- "centre" NOT "center"
- "defence" NOT "defense"
- "metre" NOT "meter"
- "theatre" NOT "theater"
- "analyse" NOT "analyze"

This applies to:
- All AI-generated text content
- Suggested changes to story concept and DNA
- Recommendations and rationale
- Any prose or narrative text

If you generate American spellings, it is a critical error.
```

### Validation Layer

Add a post-processing check to detect and flag American spellings:

```typescript
const AMERICAN_SPELLINGS = [
  /\bcolor\b/gi,
  /\brealize\b/gi,
  /\borganize\b/gi,
  /\bbehavior\b/gi,
  /\bcenter\b/gi,
  /\bdefense\b/gi,
  /\banalyze\b/gi,
];

function validateBritishSpelling(text: string): boolean {
  for (const pattern of AMERICAN_SPELLINGS) {
    if (pattern.test(text)) {
      logger.warn({ pattern: pattern.source }, 'American spelling detected in AI response');
      return false;
    }
  }
  return true;
}

// Use in response generator
const aiResponse = await anthropic.messages.create({...});
const content = extractTextContent(aiResponse);

if (!validateBritishSpelling(content)) {
  logger.error('AI response contains American spellings');
  // Option 1: Retry with stronger prompt
  // Option 2: Auto-correct common patterns
  // Option 3: Return error to user
}
```

---

## Implementation Notes

### Differences from Existing `refine-story` Endpoint

| Aspect | Old `refine-story` | New `editorial-assistant` |
|--------|-------------------|---------------------------|
| **Interaction Model** | Single request/response | Conversational (maintains history) |
| **Intent Detection** | Assumes user wants changes | Detects question/change/suggestion |
| **Approval Flow** | No approval needed | Suggestions require explicit approval |
| **Response Type** | Always applies changes | Three types: answer/change/recommendation |
| **Context** | Current concept + DNA | Current concept + DNA + conversation history |
| **UI Pattern** | Form submission | Chat interface |

### Migration Path

The existing `refine-story` endpoint should be **deprecated but not removed**. It may still be used by other parts of the application. The Editorial Assistant will replace the AI Refinement section on the Edit Story page specifically.

---

## Future Enhancements

These are explicitly **out of scope** for the initial implementation but documented for future consideration:

1. **Conversation Persistence**: Store conversation history in database for later reference
2. **Conversation Export**: Allow users to export chat logs as reference material
3. **Multi-Field Bulk Changes**: Handle complex multi-step changes (e.g., "Change this to a dark fantasy thriller with Victorian setting")
4. **Undo/Redo Stack**: Track change history and allow rollback
5. **Voice Input**: Speech-to-text for user queries
6. **Streaming Responses**: Show AI response token-by-token as it generates
7. **Suggested Questions**: Offer common questions based on current story state
8. **Context Expansion**: Allow users to optionally include character/world/plot data in context

---

## Deployment Checklist

- [ ] Create migration for any database changes (none needed for v1)
- [ ] Implement backend services (intent-detector, response-generator)
- [ ] Implement API route handler
- [ ] Add rate limiting middleware
- [ ] Write unit tests for services (>80% coverage)
- [ ] Write integration tests for API route
- [ ] Implement frontend EditorialAssistant component
- [ ] Implement ChatMessage and RecommendationCard components
- [ ] Integrate into Edit Story page
- [ ] Write frontend component tests
- [ ] Write E2E tests
- [ ] Update API documentation
- [ ] Add monitoring/logging for token usage
- [ ] Test British spelling validation
- [ ] Perform security review
- [ ] Performance testing (response times, token consumption)
- [ ] User acceptance testing
- [ ] Deploy to staging
- [ ] Deploy to production

---

## Glossary

- **Intent**: The user's purpose in sending a message (question/change/suggestion)
- **Story Concept**: The core narrative idea (title, logline, synopsis, hook, protagonist, conflict)
- **Story DNA**: The story's genetic makeup (genre, subgenre, tone, themes, prose style, timeframe)
- **Conversation History**: Array of prior messages in the current session
- **Recommendation Card**: UI component showing AI suggestion with Apply/Dismiss buttons
- **Applied Changes**: Modifications automatically made to form fields (for "change" intent)
- **Recommended Changes**: Suggestions requiring user approval (for "suggestion" intent)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-29
**Next Review**: After implementation sprint
