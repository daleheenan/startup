# Editorial Assistant - Implementation Tasks

**Feature**: Conversational AI chat interface for Edit Story page
**Design Document**: `editorial-assistant-design.md`
**Estimated Total Time**: 18-22 hours
**Sprint**: TBD

---

## Task Overview

These tasks implement a conversational AI assistant that helps users refine their Story Concept and Story DNA through natural language interaction. The assistant detects user intent (question/change/suggestion) and responds appropriately.

---

## Phase 1: Backend Foundation (6-8 hours)

### Task 1: Create Intent Detection Service

**Estimated Time**: 2 hours
**Dependencies**: None
**Files to Create**:
- `backend/src/services/editorial-intent-detector.ts`

**Files to Modify**:
- None

**Description**:
Create a service that uses Claude to classify user queries into three intent types: `question`, `change`, or `suggestion`.

**Implementation Details**:
```typescript
// backend/src/services/editorial-intent-detector.ts
import Anthropic from '@anthropic-ai/sdk';
import { StoryConcept, StoryDNA } from '../../shared/types';

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
): Promise<IntentDetectionResult> {
  const anthropic = new Anthropic();

  const prompt = `You are an intent detection system for a story editing assistant. Analyse the user's query and classify it into one of three intents:

1. **question**: User is asking for information, advice, or clarification. No changes requested.
2. **change**: User is giving a direct command to modify specific story elements with explicit values.
3. **suggestion**: User is requesting improvements or refinements but without specifying exact values, or using tentative language.

CURRENT STORY CONTEXT:
Genre: ${currentDNA.genre}
Subgenre: ${currentDNA.subgenre}
Tone: ${currentDNA.tone}
Themes: ${currentDNA.themes.join(', ')}

USER QUERY:
${userQuery}

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
- If query uses tentative language (maybe, perhaps, might, could) → suggestion`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from intent detector');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from intent detector response');
  }

  const result = JSON.parse(jsonMatch[0]) as IntentDetectionResult;
  return result;
}
```

**Acceptance Criteria**:
- [ ] Function returns correct intent type for interrogative queries (question)
- [ ] Function returns correct intent type for imperative commands with values (change)
- [ ] Function returns correct intent type for improvement requests (suggestion)
- [ ] Function handles Claude API errors gracefully
- [ ] Response includes confidence level and reasoning
- [ ] TypeScript compiles with no errors

---

### Task 2: Create Editorial Response Generator Service

**Estimated Time**: 3 hours
**Dependencies**: Task 1
**Files to Create**:
- `backend/src/services/editorial-response-generator.ts`

**Files to Modify**:
- None

**Description**:
Create a service that generates appropriate responses based on detected intent. For "question" intent, provide informative answers. For "change" intent, apply changes and confirm. For "suggestion" intent, provide recommendations with rationale.

**Implementation Details**:
```typescript
// backend/src/services/editorial-response-generator.ts
import Anthropic from '@anthropic-ai/sdk';
import { StoryConcept, StoryDNA } from '../../shared/types';
import { IntentDetectionResult } from './editorial-intent-detector';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface EditorialResponse {
  responseType: 'answer' | 'change_applied' | 'recommendation';
  content: string;
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
): Promise<EditorialResponse> {
  const anthropic = new Anthropic();

  // Build conversation context
  const historyContext = conversationHistory.length > 0
    ? `\n\nCONVERSATION HISTORY:\n${conversationHistory.map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n')}`
    : '';

  const baseContext = `
CURRENT STORY CONCEPT:
Title: ${currentConcept.title}
Logline: ${currentConcept.logline || 'Not set'}
Synopsis: ${currentConcept.synopsis || 'Not set'}
Hook: ${currentConcept.hook || 'Not set'}
Protagonist Hint: ${currentConcept.protagonistHint || 'Not set'}
Conflict Type: ${currentConcept.conflictType || 'Not set'}

CURRENT STORY DNA:
Genre: ${currentDNA.genre}
Subgenre: ${currentDNA.subgenre}
Tone: ${currentDNA.tone}
Themes: ${currentDNA.themes.join(', ')}
Prose Style: ${currentDNA.proseStyle}
Timeframe: ${currentDNA.timeframe || 'Not set'}
${historyContext}`;

  let prompt: string;
  let responseSchema: string;

  if (intent.intent === 'question') {
    prompt = `You are an experienced story development consultant. The user has asked a question about their story.

${baseContext}

USER QUESTION:
${userQuery}

Provide a helpful, informative answer based on the current story details. Be specific and reference their story elements where relevant.

CRITICAL INSTRUCTION - UK BRITISH SPELLING:
You MUST use UK British spelling conventions in ALL responses (colour, realise, organise, behaviour, centre, etc.)

Respond with JSON:
{
  "responseType": "answer",
  "content": "Your answer here"
}`;

  } else if (intent.intent === 'change') {
    prompt = `You are a story editing assistant. The user has requested specific changes to their story.

${baseContext}

USER REQUEST:
${userQuery}

Analyse the request and determine exactly what changes should be made. Then respond with the updated values and a confirmation message.

CRITICAL INSTRUCTION - UK BRITISH SPELLING:
You MUST use UK British spelling conventions in ALL responses (colour, realise, organise, behaviour, centre, etc.)

Respond with JSON:
{
  "responseType": "change_applied",
  "content": "Confirmation message describing what you changed",
  "appliedChanges": {
    "concept": {
      // Only include fields that changed
      // Example: "title": "New Title"
    },
    "dna": {
      // Only include fields that changed
      // Example: "genre": "Thriller"
    }
  }
}`;

  } else {
    // suggestion
    prompt = `You are a story development consultant. The user has asked for suggestions to improve their story.

${baseContext}

USER REQUEST:
${userQuery}

Provide specific, actionable recommendations with clear rationale. Suggest concrete changes that would improve the story based on the user's request.

CRITICAL INSTRUCTION - UK BRITISH SPELLING:
You MUST use UK British spelling conventions in ALL responses (colour, realise, organise, behaviour, centre, etc.)

Respond with JSON:
{
  "responseType": "recommendation",
  "content": "Introduction to your recommendations",
  "recommendedChanges": {
    "concept": {
      // Suggested changes to concept
    },
    "dna": {
      // Suggested changes to DNA
    }
  },
  "rationale": "Detailed explanation of why these changes would improve the story"
}`;
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from editorial assistant');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from editorial assistant response');
  }

  const result = JSON.parse(jsonMatch[0]) as EditorialResponse;

  // Ensure themes is array if present
  if (result.appliedChanges?.dna?.themes && !Array.isArray(result.appliedChanges.dna.themes)) {
    result.appliedChanges.dna.themes = [result.appliedChanges.dna.themes as any];
  }
  if (result.recommendedChanges?.dna?.themes && !Array.isArray(result.recommendedChanges.dna.themes)) {
    result.recommendedChanges.dna.themes = [result.recommendedChanges.dna.themes as any];
  }

  return result;
}
```

**Acceptance Criteria**:
- [ ] Generates answer response for question intent
- [ ] Generates change_applied response with appliedChanges for change intent
- [ ] Generates recommendation response with recommendedChanges for suggestion intent
- [ ] Includes conversation history in context (last 10 messages)
- [ ] Validates British spelling in responses (basic check)
- [ ] Handles Claude API errors gracefully
- [ ] TypeScript compiles with no errors

---

### Task 3: Create API Route Handler

**Estimated Time**: 2-3 hours
**Dependencies**: Tasks 1 & 2
**Files to Create**:
- None

**Files to Modify**:
- `backend/src/routes/projects.ts`

**Description**:
Add `POST /api/projects/:id/editorial-assistant` endpoint that orchestrates intent detection and response generation.

**Implementation Details**:
Add this route handler in `projects.ts` (after the existing `refine-story` endpoint):

```typescript
/**
 * POST /api/projects/:id/editorial-assistant
 * Conversational AI assistant for story concept and DNA editing
 *
 * Request body:
 * - userQuery: string - User's natural language query
 * - currentConcept: StoryConcept - Current story concept values
 * - currentDNA: StoryDNA - Current story DNA values
 * - conversationHistory: ConversationMessage[] - Prior messages (max 20)
 *
 * Returns:
 * - responseType: 'answer' | 'change_applied' | 'recommendation'
 * - content: string - AI's response message
 * - appliedChanges?: Partial changes (for change_applied)
 * - recommendedChanges?: Suggested changes with rationale (for recommendation)
 * - intent: Detected intent type
 * - confidence: Intent detection confidence
 */
router.post('/:id/editorial-assistant', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { userQuery, currentConcept, currentDNA, conversationHistory = [] } = req.body;

    // Validation
    if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'User query is required' },
      });
    }

    if (userQuery.length > 2000) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Query too long (max 2000 characters)' },
      });
    }

    if (conversationHistory.length > 20) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Conversation history too long (max 20 messages)' },
      });
    }

    // Verify project exists and user has access
    const projectStmt = db.prepare('SELECT id, title FROM projects WHERE id = ?');
    const project = projectStmt.get(projectId) as any;

    if (!project) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    logger.info({
      projectId,
      queryLength: userQuery.length,
      historyLength: conversationHistory.length,
    }, 'Editorial assistant request');

    // Step 1: Detect intent
    const intentResult = await detectIntent(userQuery, currentConcept, currentDNA);

    logger.info({
      projectId,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
    }, 'Intent detected');

    // Step 2: Generate response
    const editorialResponse = await generateEditorialResponse(
      intentResult,
      userQuery,
      currentConcept,
      currentDNA,
      conversationHistory.slice(-10) // Last 10 messages for context
    );

    logger.info({
      projectId,
      responseType: editorialResponse.responseType,
    }, 'Editorial response generated');

    res.json({
      success: true,
      data: {
        ...editorialResponse,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
      },
      usage: {
        input_tokens: 0, // TODO: Track token usage
        output_tokens: 0,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error in editorial assistant');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred while processing your request' },
    });
  }
});
```

Add imports at top of file:
```typescript
import { detectIntent } from '../services/editorial-intent-detector';
import { generateEditorialResponse } from '../services/editorial-response-generator';
```

**Acceptance Criteria**:
- [ ] Validates userQuery is present and not empty
- [ ] Validates query length (max 2000 chars)
- [ ] Validates conversation history length (max 20 messages)
- [ ] Returns 404 if project not found
- [ ] Calls detectIntent service
- [ ] Calls generateEditorialResponse service
- [ ] Returns correct response schema
- [ ] Logs request metadata (query length, history length)
- [ ] Logs detected intent and confidence
- [ ] Returns 500 with generic error message on failure
- [ ] TypeScript compiles with no errors
- [ ] Backend build succeeds (`npm run build`)

---

## Phase 2: Frontend Components (8-10 hours)

### Task 4: Create ChatMessage Component

**Estimated Time**: 2 hours
**Dependencies**: None
**Files to Create**:
- `app/components/editorial/ChatMessage.tsx`

**Files to Modify**:
- None

**Description**:
Create a component to render individual chat messages (user and AI). Supports three response types: answer, change_applied, and recommendation.

**Implementation Details**:
```typescript
// app/components/editorial/ChatMessage.tsx
'use client';

import { colors, typography, spacing, borderRadius } from '@/app/lib/design-tokens';
import RecommendationCard from './RecommendationCard';
import { StoryConcept, StoryDNA } from '@/shared/types';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  responseType?: 'answer' | 'change_applied' | 'recommendation';
  appliedChanges?: {
    concept?: Partial<StoryConcept>;
    dna?: Partial<StoryDNA>;
  };
  recommendedChanges?: {
    concept?: Partial<StoryConcept>;
    dna?: Partial<StoryDNA>;
    rationale: string;
  };
  onApply?: () => void;
  onDismiss?: () => void;
}

export default function ChatMessage({
  role,
  content,
  timestamp,
  responseType,
  appliedChanges,
  recommendedChanges,
  onApply,
  onDismiss,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const formattedTime = new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      gap: spacing[1],
    }}>
      {/* Message bubble */}
      <div style={{
        maxWidth: '80%',
        background: isUser
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : colors.background.primary,
        color: isUser ? colors.white : colors.text.primary,
        padding: spacing[4],
        borderRadius: borderRadius.lg,
        border: isUser ? 'none' : `1px solid ${colors.border.default}`,
        fontSize: typography.fontSize.sm,
        lineHeight: typography.lineHeight.relaxed,
      }}>
        {content}
      </div>

      {/* Timestamp */}
      <div style={{
        fontSize: typography.fontSize.xs,
        color: colors.text.disabled,
      }}>
        {formattedTime}
      </div>

      {/* Response type badge (for AI messages) */}
      {!isUser && responseType && (
        <div style={{
          display: 'inline-block',
          padding: `${spacing[1]} ${spacing[2]}`,
          background: responseType === 'answer'
            ? colors.semantic.infoLight
            : responseType === 'change_applied'
            ? colors.semantic.successLight
            : colors.semantic.warningLight,
          color: responseType === 'answer'
            ? colors.semantic.infoDark
            : responseType === 'change_applied'
            ? colors.semantic.successDark
            : colors.semantic.warningDark,
          borderRadius: borderRadius.sm,
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.medium,
        }}>
          {responseType === 'answer' && 'Information'}
          {responseType === 'change_applied' && 'Changes Applied'}
          {responseType === 'recommendation' && 'Suggestion'}
        </div>
      )}

      {/* Applied changes summary (for change_applied) */}
      {!isUser && responseType === 'change_applied' && appliedChanges && (
        <div style={{
          maxWidth: '80%',
          background: colors.semantic.successLight,
          border: `1px solid ${colors.semantic.successBorder}`,
          borderRadius: borderRadius.md,
          padding: spacing[3],
          fontSize: typography.fontSize.xs,
          color: colors.semantic.successDark,
        }}>
          <strong>Updated:</strong>{' '}
          {Object.keys(appliedChanges.concept || {}).concat(
            Object.keys(appliedChanges.dna || {})
          ).join(', ')}
        </div>
      )}

      {/* Recommendation card (for recommendation) */}
      {!isUser && responseType === 'recommendation' && recommendedChanges && onApply && onDismiss && (
        <div style={{ maxWidth: '80%', width: '100%' }}>
          <RecommendationCard
            rationale={recommendedChanges.rationale}
            changes={recommendedChanges}
            onApply={onApply}
            onDismiss={onDismiss}
          />
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Renders user messages aligned right with gradient background
- [ ] Renders AI messages aligned left with white background
- [ ] Shows timestamp in HH:MM format
- [ ] Shows response type badge for AI messages
- [ ] Shows applied changes summary for change_applied type
- [ ] Renders RecommendationCard for recommendation type
- [ ] Component compiles with no TypeScript errors
- [ ] Uses design tokens consistently

---

### Task 5: Create RecommendationCard Component

**Estimated Time**: 1.5 hours
**Dependencies**: None
**Files to Create**:
- `app/components/editorial/RecommendationCard.tsx`

**Files to Modify**:
- None

**Description**:
Create a card component that displays AI recommendations with Apply and Dismiss buttons.

**Implementation Details**:
```typescript
// app/components/editorial/RecommendationCard.tsx
'use client';

import { colors, typography, spacing, borderRadius } from '@/app/lib/design-tokens';
import { StoryConcept, StoryDNA } from '@/shared/types';

interface RecommendationCardProps {
  rationale: string;
  changes: {
    concept?: Partial<StoryConcept>;
    dna?: Partial<StoryDNA>;
  };
  onApply: () => void;
  onDismiss: () => void;
}

export default function RecommendationCard({
  rationale,
  changes,
  onApply,
  onDismiss,
}: RecommendationCardProps) {
  const changedFields = [
    ...Object.keys(changes.concept || {}),
    ...Object.keys(changes.dna || {}),
  ];

  return (
    <div style={{
      background: colors.background.surface,
      border: `2px solid ${colors.brand.primary}`,
      borderRadius: borderRadius.lg,
      padding: spacing[4],
      marginTop: spacing[2],
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[2],
        marginBottom: spacing[3],
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: borderRadius.full,
          background: colors.brand.primaryLight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: typography.fontSize.sm,
        }}>
          💡
        </div>
        <h4 style={{
          margin: 0,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
        }}>
          Recommended Changes
        </h4>
      </div>

      {/* Rationale */}
      <p style={{
        margin: 0,
        marginBottom: spacing[3],
        fontSize: typography.fontSize.sm,
        lineHeight: typography.lineHeight.relaxed,
        color: colors.text.secondary,
      }}>
        {rationale}
      </p>

      {/* Fields to be changed */}
      <div style={{
        background: colors.background.primary,
        borderRadius: borderRadius.md,
        padding: spacing[3],
        marginBottom: spacing[3],
      }}>
        <p style={{
          margin: 0,
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.medium,
          color: colors.text.tertiary,
          marginBottom: spacing[2],
        }}>
          Will update:
        </p>
        <ul style={{
          margin: 0,
          padding: 0,
          paddingLeft: spacing[4],
          fontSize: typography.fontSize.xs,
          color: colors.text.secondary,
        }}>
          {changedFields.map((field, index) => (
            <li key={index}>{field}</li>
          ))}
        </ul>
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        gap: spacing[2],
        justifyContent: 'flex-end',
      }}>
        <button
          onClick={onDismiss}
          style={{
            padding: `${spacing[2]} ${spacing[4]}`,
            background: colors.background.primary,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.md,
            color: colors.text.secondary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
        <button
          onClick={onApply}
          style={{
            padding: `${spacing[2]} ${spacing[4]}`,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: borderRadius.md,
            color: colors.white,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            cursor: 'pointer',
          }}
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Displays rationale text prominently
- [ ] Lists all fields that will be changed
- [ ] Shows Apply and Dismiss buttons
- [ ] Apply button calls onApply callback
- [ ] Dismiss button calls onDismiss callback
- [ ] Component compiles with no TypeScript errors
- [ ] Uses design tokens consistently

---

### Task 6: Create EditorialAssistant Main Component

**Estimated Time**: 3-4 hours
**Dependencies**: Tasks 4 & 5
**Files to Create**:
- `app/components/editorial/EditorialAssistant.tsx`

**Files to Modify**:
- None

**Description**:
Create the main chat interface component that manages conversation state, sends messages to API, and coordinates with parent form.

**Implementation Details**:
See full implementation in the technical design document under "Frontend Component Architecture > EditorialAssistant Component Structure".

Key points:
- Manage messages array in component state
- Auto-scroll to bottom when new messages arrive
- Handle Enter key to send (Shift+Enter for new line)
- Call API with conversation history (last 10 messages)
- Auto-apply changes for change_applied responses
- Show Apply/Dismiss for recommendation responses

**Acceptance Criteria**:
- [ ] Renders chat interface with header, messages area, and input box
- [ ] Empty state shows helpful prompt
- [ ] User can type message and send with Enter key
- [ ] Shift+Enter creates new line without sending
- [ ] Messages display in chronological order
- [ ] Auto-scrolls to bottom when new message arrives
- [ ] Shows loading indicator while waiting for API response
- [ ] Displays error messages
- [ ] Auto-applies changes for change_applied responses
- [ ] Shows Apply/Dismiss buttons for recommendation responses
- [ ] Calls onApplyChanges callback when user approves changes
- [ ] Component compiles with no TypeScript errors
- [ ] Frontend build succeeds (`npm run build`)

---

### Task 7: Integrate EditorialAssistant into Edit Story Page

**Estimated Time**: 1.5-2 hours
**Dependencies**: Task 6
**Files to Create**:
- None

**Files to Modify**:
- `app/projects/[id]/edit-story/page.tsx`

**Description**:
Replace the existing AI Refinement section with the new EditorialAssistant component.

**Implementation Details**:

1. **Import the component**:
```typescript
import EditorialAssistant from '@/app/components/editorial/EditorialAssistant';
```

2. **Remove old state** (lines 76-77):
```typescript
// DELETE:
const [feedback, setFeedback] = useState('');
const [aiChanges, setAiChanges] = useState<string[]>([]);
```

3. **Remove old refining state** (line 55):
```typescript
// DELETE:
const [refining, setRefining] = useState(false);
```

4. **Remove old handler** (lines 192-270):
```typescript
// DELETE handleAIRefine function entirely
```

5. **Remove old AI Changes summary** (lines 315-345):
```typescript
// DELETE AI Changes summary JSX
```

6. **Remove old AI Refinement section** (lines 356-423):
```typescript
// DELETE entire AI Refinement section JSX
```

7. **Add new handler function**:
```typescript
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

8. **Add EditorialAssistant component** (replace old AI Refinement section):
```typescript
{/* Editorial Assistant */}
<EditorialAssistant
  projectId={projectId}
  currentConcept={buildCurrentConcept()}
  currentDNA={buildCurrentDNA()}
  onApplyChanges={handleApplyEditorialChanges}
/>
```

**Acceptance Criteria**:
- [ ] Old AI Refinement section removed
- [ ] Old state variables removed (feedback, refining, aiChanges)
- [ ] Old handleAIRefine function removed
- [ ] New EditorialAssistant component added
- [ ] handleApplyEditorialChanges function added
- [ ] Changes from assistant update form fields correctly
- [ ] Success message shows when changes applied
- [ ] Page compiles with no TypeScript errors
- [ ] Frontend build succeeds (`npm run build`)
- [ ] Page renders correctly in browser

---

## Phase 3: Testing & Polish (4-5 hours)

### Task 8: Write Backend Unit Tests

**Estimated Time**: 2 hours
**Dependencies**: Tasks 1, 2, 3
**Files to Create**:
- `backend/src/services/__tests__/editorial-intent-detector.test.ts`
- `backend/src/services/__tests__/editorial-response-generator.test.ts`

**Files to Modify**:
- None

**Description**:
Write unit tests for intent detection and response generation services. Mock Claude API calls.

**Implementation Sketch**:
```typescript
// editorial-intent-detector.test.ts
import { jest } from '@jest/globals';
import { detectIntent } from '../editorial-intent-detector';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk');

describe('detectIntent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect question intent for interrogative query', async () => {
    // Mock Claude response
    const mockCreate = (Anthropic as any).mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: '{"intent": "question", "confidence": "high", "reasoning": "Contains interrogative"}' }]
        })
      }
    }));

    const result = await detectIntent(
      'What genre would suit this story?',
      mockConcept,
      mockDNA
    );

    expect(result.intent).toBe('question');
    expect(result.confidence).toBe('high');
  });

  it('should detect change intent for imperative command', async () => {
    // ... similar test for change intent
  });

  it('should detect suggestion intent for tentative language', async () => {
    // ... similar test for suggestion intent
  });
});
```

**Acceptance Criteria**:
- [ ] Tests cover question intent detection
- [ ] Tests cover change intent detection
- [ ] Tests cover suggestion intent detection
- [ ] Tests cover error handling
- [ ] Tests mock Claude API properly
- [ ] All tests pass (`npm test` in backend)
- [ ] Code coverage >70% for new services

---

### Task 9: Write Frontend Component Tests

**Estimated Time**: 1.5 hours
**Dependencies**: Tasks 4, 5, 6
**Files to Create**:
- `app/components/editorial/__tests__/ChatMessage.test.tsx`
- `app/components/editorial/__tests__/RecommendationCard.test.tsx`
- `app/components/editorial/__tests__/EditorialAssistant.test.tsx`

**Files to Modify**:
- None

**Description**:
Write component tests using Vitest and React Testing Library.

**Implementation Sketch**:
```typescript
// EditorialAssistant.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditorialAssistant from '../EditorialAssistant';

describe('EditorialAssistant', () => {
  it('should render empty state initially', () => {
    render(<EditorialAssistant {...mockProps} />);
    expect(screen.getByText(/start a conversation/i)).toBeInTheDocument();
  });

  it('should send message on Enter key', async () => {
    const mockFetch = vi.spyOn(global, 'fetch');
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

  it('should not send message on Shift+Enter', () => {
    const mockFetch = vi.spyOn(global, 'fetch');
    render(<EditorialAssistant {...mockProps} />);

    const textarea = screen.getByPlaceholderText(/ask a question/i);
    fireEvent.change(textarea, { target: { value: 'Test' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
```

**Acceptance Criteria**:
- [ ] Tests cover ChatMessage rendering for user and AI
- [ ] Tests cover RecommendationCard Apply/Dismiss actions
- [ ] Tests cover EditorialAssistant empty state
- [ ] Tests cover sending messages
- [ ] Tests cover keyboard shortcuts (Enter vs Shift+Enter)
- [ ] All tests pass (`npm test` in app directory)

---

### Task 10: Manual End-to-End Testing

**Estimated Time**: 1-1.5 hours
**Dependencies**: All previous tasks
**Files to Create**:
- None

**Files to Modify**:
- None

**Description**:
Perform manual testing of the full feature flow.

**Test Cases**:

1. **Question Flow**:
   - Navigate to Edit Story page
   - Ask: "What genre would suit this story?"
   - Verify AI responds with informative answer
   - Verify no form fields change
   - Verify response type badge shows "Information"

2. **Change Flow**:
   - Ask: "Change the genre to thriller"
   - Verify AI responds with confirmation message
   - Verify genre field updates to "Thriller"
   - Verify response type badge shows "Changes Applied"
   - Verify success message appears

3. **Suggestion Flow**:
   - Ask: "Maybe the tone should be darker?"
   - Verify AI shows recommendation card
   - Verify rationale is displayed
   - Click "Apply Changes"
   - Verify tone field updates
   - Verify recommendation card disappears

4. **Conversation Context**:
   - Send multiple messages
   - Verify later responses reference earlier conversation
   - Verify context is maintained

5. **Error Handling**:
   - Send empty message (should be disabled)
   - Disconnect network and send message
   - Verify error message displays

6. **British Spelling**:
   - Ask several questions
   - Verify all responses use British spellings (colour, realise, etc.)

**Acceptance Criteria**:
- [ ] All test cases pass
- [ ] No console errors
- [ ] UI is responsive and accessible
- [ ] Messages scroll correctly
- [ ] Keyboard navigation works
- [ ] British spelling consistently used

---

## Deployment Checklist

- [ ] All tasks completed
- [ ] All unit tests passing (backend)
- [ ] All component tests passing (frontend)
- [ ] Manual E2E tests passing
- [ ] TypeScript compilation passes (backend and frontend)
- [ ] Backend build succeeds (`npm run build`)
- [ ] Frontend build succeeds (`npm run build`)
- [ ] Code reviewed
- [ ] Design document reviewed
- [ ] British spelling validated in AI responses
- [ ] Security review completed (input validation, auth, rate limiting)
- [ ] Performance acceptable (response times <5s)
- [ ] Merge to staging branch
- [ ] Deploy to staging environment
- [ ] User acceptance testing
- [ ] Merge to main branch
- [ ] Deploy to production

---

## Risk Mitigation

### Risk: Claude API returns non-JSON or malformed responses
**Mitigation**: Wrap all JSON parsing in try-catch, validate response structure before returning

### Risk: Intent detection is inaccurate
**Mitigation**: Log all intent detections with user query for analysis, add confidence threshold checks

### Risk: Token usage exceeds budget
**Mitigation**: Limit conversation history to 10 messages, track usage, implement rate limiting

### Risk: American spellings in responses
**Mitigation**: Add validation layer, log warnings, consider auto-correction for common patterns

### Risk: Component state gets out of sync with form
**Mitigation**: Always read current form state via buildCurrentConcept/buildCurrentDNA, test thoroughly

---

## Notes for Developer

- Follow existing codebase patterns (inline styles, design tokens)
- Use UK British spelling in all new code comments and strings
- Log intent detection results for monitoring and improvement
- Keep conversation history limited to prevent token overflow
- Test with slow network to verify loading states
- Ensure accessibility (keyboard navigation, ARIA labels, focus management)

---

**Document Version**: 1.0
**Created**: 2026-01-29
**Estimated Total Time**: 18-22 hours (across all phases)
