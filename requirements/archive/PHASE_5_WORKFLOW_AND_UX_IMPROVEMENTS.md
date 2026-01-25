# Phase 5: Workflow, Navigation & UX Improvements

**Date:** January 25, 2026
**Version:** 1.0
**Status:** Planning
**Priority:** High

---

## Executive Summary

This document outlines comprehensive improvements to NovelForge based on user testing feedback. The changes focus on:

1. **Correcting navigation order** to reflect the logical story creation workflow
2. **Enforcing prerequisites** to ensure quality novel generation
3. **Fixing critical bugs** (plots page 404, outline word count display)
4. **Redesigning the new project wizard** for better UX
5. **Improving the plots page** with guided workflow and story concept integration
6. **Clarifying the generation submission process**

---

## Table of Contents

1. [Navigation Order Corrections](#1-navigation-order-corrections)
2. [Prerequisite Workflow Enforcement](#2-prerequisite-workflow-enforcement)
3. [Plots Page Improvements](#3-plots-page-improvements)
4. [Story Outline Improvements](#4-story-outline-improvements)
5. [New Project Page Redesign](#5-new-project-page-redesign)
6. [Chapter Generation Workflow](#6-chapter-generation-workflow)
7. [Bug Fixes](#7-bug-fixes)
8. [Implementation Priority](#8-implementation-priority)

---

## 1. Navigation Order Corrections

### Current Order (Incorrect)
```
Overview → Characters → World → Outline → Chapters → Plot → Style → Analytics
```

### Correct Order (Logical Workflow)
```
Overview → Characters → World → Plot → Outline → Style → Chapters → Analytics
```

### Rationale
- **Story Concept** must exist before plots can be meaningful
- **Plots** must be defined before story outline can incorporate them
- **Story Outline** (act/chapter level) requires plots as prerequisite
- **Prose Style** must be configured before chapter writing begins
- **Chapters** page becomes a real-time monitoring page for generation

### Implementation

#### File: `frontend/src/hooks/useProjectNavigation.ts`

```typescript
// BEFORE: Incorrect tab order
const tabs: NavigationTab[] = [
  { id: 'overview', label: 'Overview', ... },
  { id: 'characters', label: 'Characters', ... },
  { id: 'world', label: 'World', ... },
  { id: 'outline', label: 'Outline', ... },
  { id: 'chapters', label: 'Chapters', ... },
  { id: 'plot', label: 'Plot', ... },
  { id: 'style', label: 'Style', ... },
  { id: 'analytics', label: 'Analytics', ... },
];

// AFTER: Correct workflow order
const tabs: NavigationTab[] = [
  { id: 'overview', label: 'Overview', ... },
  { id: 'characters', label: 'Characters', required: true, ... },
  { id: 'world', label: 'World', required: true, ... },
  { id: 'plot', label: 'Plot', required: true, ... },
  { id: 'outline', label: 'Outline', required: true, ... },
  { id: 'style', label: 'Style', required: true, ... },
  { id: 'chapters', label: 'Chapters', ... },
  { id: 'analytics', label: 'Analytics', ... },
];
```

#### File: `frontend/src/components/ProjectNavigation.tsx`

Update tab rendering to reflect new order and add visual workflow indicators.

---

## 2. Prerequisite Workflow Enforcement

### Core Principle
Users must not be able to proceed to the next page without required details being populated.

### Workflow Dependencies

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PREREQUISITE CHAIN                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Concept ──► Characters ──► World ──► Plots ──► Outline ──► Style      │
│     │            │           │          │          │          │         │
│     ▼            ▼           ▼          ▼          ▼          ▼         │
│  Required    Required    Required   Required   Required   Required     │
│                                                                         │
│                              ═══════════════════════                    │
│                                       │                                 │
│                                       ▼                                 │
│                            Submit for Generation                        │
│                                       │                                 │
│                                       ▼                                 │
│                             Chapters (Monitoring)                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation Rules

| Step | Prerequisite | Validation Rule |
|------|--------------|-----------------|
| **Characters** | Concept exists | Project has title, genre, and description |
| **World** | Characters complete | At least protagonist + antagonist defined |
| **Plots** | World complete | At least 1 world element defined |
| **Outline** | Plots complete | Main plot + minimum plot layers defined |
| **Style** | Outline complete | Story outline with all acts populated |
| **Submit** | Style configured | Prose style preferences saved |
| **Chapters** | Submission | Novel submitted for generation |

### UI Implementation

#### Locked State Visual Design
```tsx
// Locked tab appearance
<Tab
  disabled={!prerequisitesMet}
  className={cn(
    "relative",
    !prerequisitesMet && "opacity-50 cursor-not-allowed"
  )}
>
  {!prerequisitesMet && <LockIcon className="absolute -top-1 -right-1 w-4 h-4" />}
  {label}
</Tab>
```

#### Tooltip on Locked Tabs
```tsx
<Tooltip content={`Complete ${missingPrerequisite} first`}>
  <Tab disabled={!prerequisitesMet}>...</Tab>
</Tooltip>
```

### New Hook: `useWorkflowPrerequisites.ts`

```typescript
export function useWorkflowPrerequisites(projectId: string) {
  const { project, characters, worldElements, plotStructure, outline, proseStyle } = useProjectData(projectId);

  const prerequisites = {
    concept: {
      complete: Boolean(project?.title && project?.genre && project?.description),
      missing: [],
    },
    characters: {
      complete: characters.length >= 2 && hasProtagonist && hasAntagonist,
      missing: getMissingCharacterTypes(characters),
      requires: 'concept',
    },
    world: {
      complete: worldElements.length >= 1,
      missing: worldElements.length === 0 ? ['at least one world element'] : [],
      requires: 'characters',
    },
    plots: {
      complete: hasMainPlot && plotLayers.length >= minimumLayers,
      missing: getMissingPlotElements(plotStructure),
      requires: 'world',
    },
    outline: {
      complete: outline?.acts?.every(act => act.chapters?.length > 0),
      missing: getMissingOutlineElements(outline),
      requires: 'plots',
    },
    style: {
      complete: Boolean(proseStyle?.pointOfView && proseStyle?.preferences),
      missing: getMissingStyleElements(proseStyle),
      requires: 'outline',
    },
    submission: {
      complete: false, // Set when user submits
      missing: [],
      requires: 'style',
    },
  };

  const canAccess = (step: string): boolean => {
    if (step === 'overview') return true;
    if (step === 'analytics') return true;

    const prereq = prerequisites[step];
    if (!prereq) return false;

    if (prereq.requires) {
      return prerequisites[prereq.requires].complete;
    }
    return true;
  };

  const getBlockingReason = (step: string): string | null => {
    if (canAccess(step)) return null;
    const prereq = prerequisites[step];
    return `Complete ${prereq.requires} first`;
  };

  return {
    prerequisites,
    canAccess,
    getBlockingReason,
    currentStep: getCurrentStep(prerequisites),
    nextStep: getNextIncompleteStep(prerequisites),
  };
}
```

---

## 3. Plots Page Improvements

### Current Issues
1. 404 error on `/api/projects/:id/progress` endpoint
2. Cannot delete key plots from story concept
3. Generate pacing notes does nothing
4. Plot description fields too small
5. Non-unique generated plot names ("The Frequency War" vs "The Frequency Wars")
6. No guided wizard workflow
7. No clear connection between story concept and required plots

### 3.1 Story Concept Plot Integration

#### Principle
The story concept contains the "golden thread" - the main plot that runs through the book/trilogy/series. This must be automatically extracted and form the foundation of all plot work.

#### Implementation

##### Auto-Populate Main Plots from Story Concept
```typescript
// When story concept is saved, extract key plot elements
async function extractPlotsFromConcept(concept: StoryConcept): Promise<PlotLayer[]> {
  const prompt = `
    Analyze this story concept and extract the key plot elements:

    ${concept.description}

    Identify:
    1. The MAIN PLOT (golden thread) - the primary narrative arc
    2. KEY SUBPLOTS implied by the concept
    3. CHARACTER ARC plots for main characters
    4. THEMATIC plots (if any)

    Return as structured JSON with plot type, name, and brief description.
  `;

  // Call Claude API
  const extractedPlots = await generateWithClaude(prompt);

  return extractedPlots.map(plot => ({
    ...plot,
    sourceType: 'story_concept',
    isKeyPlot: true,
    canDelete: false,
    canEdit: true,
  }));
}
```

##### Story Concept Plot Field (Read-Only Source)
```tsx
<Card className="bg-purple-50 border-purple-200">
  <CardHeader>
    <Badge variant="purple">From Story Concept</Badge>
    <CardTitle>Story Concept Plot</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-gray-600 italic">
      "{conceptPlotSummary}"
    </p>
    <div className="mt-4 flex gap-2">
      <Button variant="outline" size="sm" onClick={regenerateConceptPlot}>
        <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
      </Button>
      <Button variant="outline" size="sm" onClick={editConceptPlot}>
        <Edit className="w-4 h-4 mr-1" /> Edit
      </Button>
    </div>
  </CardContent>
</Card>
```

##### Cascade Updates
When story concept plot is amended:
1. Update the story concept description to accommodate the change
2. Flag related plots for review
3. Prompt user to review/regenerate affected plots

```typescript
async function handleConceptPlotEdit(newPlot: string, originalPlot: string) {
  // 1. Update story concept
  await updateStoryConcept(projectId, {
    description: await regenerateConceptWithPlotChange(concept, newPlot)
  });

  // 2. Find related plots
  const relatedPlots = plotLayers.filter(p =>
    p.relatedToConceptPlot ||
    semanticallySimilar(p.description, originalPlot)
  );

  // 3. Flag for review
  for (const plot of relatedPlots) {
    await flagPlotForReview(plot.id, {
      reason: 'Story concept plot changed',
      suggestedAction: 'Review and update for consistency'
    });
  }

  // 4. Notify user
  toast({
    title: 'Concept plot updated',
    description: `${relatedPlots.length} related plots flagged for review`,
    action: <Button onClick={() => navigate('/plots#review')}>Review Now</Button>
  });
}
```

### 3.2 Plot Layers Hierarchy & Recommendations

#### Recommended Plot Counts by Book Length
```typescript
const PLOT_RECOMMENDATIONS = {
  novella: { // 20,000-40,000 words
    mainPlot: { min: 1, max: 1, ideal: 1 },
    subplots: { min: 1, max: 2, ideal: 1 },
    characterArcs: { min: 1, max: 2, ideal: 1 },
    mysteryThreads: { min: 0, max: 1, ideal: 0 },
    romanceArcs: { min: 0, max: 1, ideal: 0 },
  },
  novel: { // 70,000-90,000 words
    mainPlot: { min: 1, max: 1, ideal: 1 },
    subplots: { min: 2, max: 4, ideal: 3 },
    characterArcs: { min: 2, max: 4, ideal: 3 },
    mysteryThreads: { min: 0, max: 2, ideal: 1 },
    romanceArcs: { min: 0, max: 2, ideal: 1 },
    emotionalArcs: { min: 1, max: 2, ideal: 1 },
  },
  epic: { // 100,000+ words
    mainPlot: { min: 1, max: 1, ideal: 1 },
    subplots: { min: 3, max: 6, ideal: 4 },
    characterArcs: { min: 3, max: 6, ideal: 4 },
    mysteryThreads: { min: 1, max: 3, ideal: 2 },
    romanceArcs: { min: 0, max: 3, ideal: 1 },
    emotionalArcs: { min: 2, max: 4, ideal: 2 },
    thematicArcs: { min: 1, max: 2, ideal: 1 },
  },
};
```

#### UI Recommendation Display
```tsx
<Card className="bg-blue-50">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Lightbulb className="w-5 h-5 text-blue-500" />
      Recommended Plot Structure
    </CardTitle>
    <CardDescription>
      For your {bookLength.toLocaleString()}-word {genre} novel
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(recommendations).map(([type, rec]) => (
        <div key={type} className="flex items-center justify-between">
          <span className="capitalize">{formatPlotType(type)}</span>
          <Badge variant={getStatusVariant(currentCount, rec)}>
            {currentCount}/{rec.ideal}
          </Badge>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

### 3.3 Guided Wizard Workflow

Replace the current flat plot page with a step-by-step wizard:

#### Wizard Steps
```
Step 1: Main Plot (Golden Thread)
  └── Auto-populated from story concept
  └── Review and enhance

Step 2: Character Arcs
  └── For each main character
  └── Define transformation journey

Step 3: Subplots
  └── Add thematic subplots
  └── Connect to main plot

Step 4: Specialized Threads (Optional)
  └── Mystery threads
  └── Romance arcs
  └── Emotional beats
  └── Political intrigue
  └── etc.

Step 5: Pacing & Integration
  └── Review plot distribution across acts
  └── Generate pacing notes
  └── Identify gaps/overloads
```

#### Wizard Component Structure
```tsx
<PlotWizard>
  <WizardStep id="main-plot" title="Main Plot">
    <MainPlotEditor
      conceptPlot={conceptPlot}
      onUpdate={handleMainPlotUpdate}
    />
  </WizardStep>

  <WizardStep id="character-arcs" title="Character Arcs">
    <CharacterArcEditor
      characters={characters}
      onUpdate={handleCharacterArcUpdate}
    />
  </WizardStep>

  <WizardStep id="subplots" title="Subplots">
    <SubplotEditor
      mainPlot={mainPlot}
      recommendations={subplotRecommendations}
    />
  </WizardStep>

  <WizardStep id="specialized" title="Specialized Threads" optional>
    <SpecializedThreadsEditor />
  </WizardStep>

  <WizardStep id="pacing" title="Pacing & Review">
    <PacingReview
      allPlots={allPlots}
      bookLength={bookLength}
    />
  </WizardStep>
</PlotWizard>
```

### 3.4 Unique Name Generation

#### Problem
Generated names are too similar (e.g., "The Frequency War" vs "The Frequency Wars").

#### Solution
```typescript
async function generateUniquePlotName(
  layerType: PlotLayerType,
  existingNames: string[],
  context: PlotContext
): Promise<string> {
  const prompt = `
    Generate a unique, creative name for a ${layerType} plot.

    Context:
    - Genre: ${context.genre}
    - Story concept: ${context.conceptSummary}
    - Existing plot names (MUST BE DIFFERENT): ${existingNames.join(', ')}

    Requirements:
    - Must be distinctly different from all existing names
    - Should be evocative and memorable
    - Should hint at the plot's theme without spoilers
    - Avoid adding 's' or changing articles to create "variations"

    Return ONLY the name, no explanation.
  `;

  let generatedName = await generateWithClaude(prompt);

  // Validate uniqueness
  const similarityThreshold = 0.7;
  for (const existing of existingNames) {
    if (stringSimilarity(generatedName, existing) > similarityThreshold) {
      // Regenerate with explicit rejection
      return generateUniquePlotName(layerType, [...existingNames, generatedName], context);
    }
  }

  return generatedName;
}
```

### 3.5 UI Improvements

#### Larger Description Fields
```tsx
<Textarea
  value={plotDescription}
  onChange={handleDescriptionChange}
  className="min-h-[150px] resize-y" // Increased from default ~60px
  placeholder="Describe this plot layer in detail..."
/>
```

#### Key Plots Highlighting
```tsx
{plot.isKeyPlot && (
  <div className="flex items-center gap-2 mb-2">
    <Badge variant="purple" className="animate-pulse">
      <Star className="w-3 h-3 mr-1" /> Key Plot from Story Concept
    </Badge>
  </div>
)}
```

### 3.6 Fix: Generate Pacing Notes

#### Current Issue
Button does nothing.

#### Backend Fix
```typescript
// backend/src/routes/projects.ts
router.post('/:id/generate-pacing-notes', async (req, res) => {
  try {
    const { id } = req.params;

    // Get all plot data
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        plotStructure: true,
        books: {
          with: { chapters: true }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const pacingNotes = await generatePacingAnalysis({
      plots: project.plotStructure,
      actStructure: project.actStructure,
      chapterCount: project.books[0]?.chapters?.length || 0,
      targetWordCount: project.targetWordCount,
    });

    // Save pacing notes
    await db.update(projects)
      .set({ pacingNotes })
      .where(eq(projects.id, id));

    res.json({ pacingNotes });
  } catch (error) {
    console.error('Pacing notes generation failed:', error);
    res.status(500).json({ error: 'Failed to generate pacing notes' });
  }
});
```

---

## 4. Story Outline Improvements

### Current Issues
1. Word count display shows "12000/80000" then errors
2. No ability to delete and regenerate acts
3. No ability to edit individual acts
4. Acts not generating sequentially (Act 2 before Act 1)
5. "Start Generation" button purpose unclear
6. 10 minute wait with no feedback

### 4.1 Remove Word Count Target from Outline

#### Rationale
The outline page should NOT show a word count target. Word count is for the final novel, not the outline itself. The outline length should be proportional to the book length automatically.

#### Implementation
```tsx
// REMOVE this from outline page
<div className="text-sm text-gray-500">
  {currentWords.toLocaleString()} / {targetWords.toLocaleString()} words
</div>

// REPLACE with
<div className="text-sm text-gray-500">
  {structureTemplate.name} • {actCount} acts • {chapterCount} chapters planned
</div>
```

### 4.2 Sequential Act Generation

#### Principle
- Act 1 must complete before Act 2 starts
- Act 2 must complete before Act 3 starts
- Acts must be internally consistent
- Transitions between acts must be seamless

#### Implementation
```typescript
async function generateOutlineSequentially(projectId: string, templateId: string) {
  const project = await getProject(projectId);
  const template = getStructureTemplate(templateId);

  const generatedActs: Act[] = [];

  for (let actNumber = 1; actNumber <= template.actCount; actNumber++) {
    // Update UI with current progress
    await updateGenerationProgress(projectId, {
      currentPhase: `Generating Act ${actNumber}`,
      progress: ((actNumber - 1) / template.actCount) * 100,
    });

    const previousActs = generatedActs.slice(0, actNumber - 1);

    const act = await generateAct({
      actNumber,
      project,
      template,
      previousActs, // Critical: provides context for continuity
      plotStructure: project.plotStructure,
      characters: project.characters,
    });

    // Validate act before proceeding
    const validation = await validateActContinuity(act, previousActs);
    if (!validation.valid) {
      // Regenerate with feedback
      act = await regenerateActWithFeedback(act, validation.issues);
    }

    generatedActs.push(act);

    // Save incrementally so user sees progress
    await saveActToDatabase(projectId, act);
  }

  return generatedActs;
}
```

### 4.3 Act Management UI

```tsx
<div className="space-y-6">
  {acts.map((act, index) => (
    <Card key={act.id} className="relative">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Act {index + 1}: {act.title}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerateAct(act.id)}
              disabled={index > 0 && !acts[index - 1]?.isComplete}
            >
              <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteAct(act.id)}
            >
              <Trash className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={act.content}
          onChange={(e) => updateActContent(act.id, e.target.value)}
          className="min-h-[200px]"
        />

        {/* Chapter breakdown */}
        <div className="mt-4">
          <h4 className="font-medium mb-2">Chapters</h4>
          {act.chapters.map(chapter => (
            <ChapterOutlineCard
              key={chapter.id}
              chapter={chapter}
              onEdit={handleChapterEdit}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

### 4.4 Regenerate All Option

```tsx
<div className="flex gap-4 mb-6">
  <Button
    variant="destructive"
    onClick={handleDeleteAllActs}
  >
    <Trash className="w-4 h-4 mr-2" />
    Delete All Acts
  </Button>

  <Button
    onClick={handleRegenerateAllActs}
    disabled={isGenerating}
  >
    <RefreshCw className="w-4 h-4 mr-2" />
    Regenerate All Acts
  </Button>
</div>

<AlertDialog open={showDeleteConfirm}>
  <AlertDialogContent>
    <AlertDialogTitle>Delete All Acts?</AlertDialogTitle>
    <AlertDialogDescription>
      This will remove the entire story outline. You'll need to regenerate all acts
      from scratch. This cannot be undone.
    </AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={confirmDeleteAll}>
        Delete All
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 4.5 Real-time Generation Progress

```tsx
<GenerationProgress
  status={generationStatus}
  currentPhase={currentPhase}
  progress={progress}
  estimatedTimeRemaining={estimatedTime}
  onCancel={handleCancelGeneration}
>
  <div className="space-y-2">
    <p className="text-sm">
      {currentPhase === 'act1' && 'Establishing story foundation and introducing characters...'}
      {currentPhase === 'act2' && 'Building tension and developing conflicts...'}
      {currentPhase === 'act3' && 'Crafting resolution and character transformations...'}
    </p>

    <div className="flex gap-2">
      {[1, 2, 3].map(actNum => (
        <Badge
          key={actNum}
          variant={
            completedActs.includes(actNum) ? 'success' :
            currentAct === actNum ? 'default' : 'outline'
          }
        >
          Act {actNum}
          {completedActs.includes(actNum) && <Check className="w-3 h-3 ml-1" />}
          {currentAct === actNum && <Loader2 className="w-3 h-3 ml-1 animate-spin" />}
        </Badge>
      ))}
    </div>
  </div>
</GenerationProgress>
```

### 4.6 Clarify "Start Generation" Button

#### Current Issue
Button label "Start Generation" is ambiguous - does it generate the outline or submit for novel writing?

#### Solution
Replace with clear, contextual buttons:

```tsx
{!outline.isComplete ? (
  <Button onClick={generateOutline} size="lg">
    <Wand2 className="w-5 h-5 mr-2" />
    Generate Story Outline
  </Button>
) : (
  <div className="space-y-4">
    <Alert>
      <CheckCircle className="w-4 h-4" />
      <AlertTitle>Outline Complete</AlertTitle>
      <AlertDescription>
        Your story outline is ready. Review it above, then submit to begin novel generation.
      </AlertDescription>
    </Alert>

    <Button
      onClick={submitForGeneration}
      size="lg"
      className="bg-gradient-to-r from-purple-600 to-blue-600"
    >
      <BookOpen className="w-5 h-5 mr-2" />
      Submit for Novel Generation
    </Button>

    <p className="text-sm text-gray-500">
      This will queue your novel for chapter-by-chapter generation.
      You can leave this page - generation continues in the background.
    </p>
  </div>
)}
```

---

## 5. New Project Page Redesign

### Current Issues
1. "Inspire Me" button in wrong location
2. No 20 quick summaries option
3. Genre + time period not respected in generation
4. Full customization tabs in wrong order

### 5.1 Quick Mode Layout

```tsx
<Card>
  <CardHeader>
    <CardTitle>Create New Novel</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Genre Selection */}
    <div className="mb-6">
      <Label>Choose a Genre *</Label>
      <GenreGrid
        selected={genre}
        onSelect={setGenre}
      />
    </div>

    {/* Description with Inspire Me */}
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <Label>Describe Your Idea (optional)</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={handleInspireMe}
          disabled={!genre}
        >
          <Sparkles className="w-4 h-4 mr-1" />
          Inspire Me
        </Button>
      </div>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="A retired spy receives a message from their past..."
      />
      <p className="text-xs text-gray-500 mt-1">
        "Inspire Me" generates a description based on your selected genre and time period
      </p>
    </div>

    {/* Time Period */}
    <div className="mb-6">
      <Label>Time Period (optional)</Label>
      <TimePeriodSelector
        selected={timePeriod}
        onSelect={setTimePeriod}
      />
    </div>

    {/* Generation Mode */}
    <div className="mb-6">
      <Label>Generation Mode</Label>
      <div className="grid grid-cols-3 gap-4">
        <Card
          className={cn("cursor-pointer", mode === '5-full' && "border-primary")}
          onClick={() => setMode('5-full')}
        >
          <CardContent className="p-4 text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium">5 Full Concepts</p>
            <p className="text-xs text-gray-500">Detailed concepts ready to use</p>
          </CardContent>
        </Card>

        <Card
          className={cn("cursor-pointer", mode === '10-quick' && "border-primary")}
          onClick={() => setMode('10-quick')}
        >
          <CardContent className="p-4 text-center">
            <Zap className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium">10 Quick Summaries</p>
            <p className="text-xs text-gray-500">Browse ideas, expand later</p>
          </CardContent>
        </Card>

        <Card
          className={cn("cursor-pointer", mode === '20-quick' && "border-primary")}
          onClick={() => setMode('20-quick')}
        >
          <CardContent className="p-4 text-center">
            <List className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium">20 Quick Summaries</p>
            <p className="text-xs text-gray-500">Maximum variety</p>
          </CardContent>
        </Card>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex gap-4">
      <Button variant="outline" onClick={handleInspireMe} disabled={!genre}>
        <Dice className="w-4 h-4 mr-2" />
        Inspire Me
      </Button>
      <Button onClick={handleGenerate} disabled={!genre}>
        <Sparkles className="w-4 h-4 mr-2" />
        Generate {mode === '5-full' ? 'Concepts' : 'Summaries'}
      </Button>
    </div>
  </CardContent>
</Card>
```

### 5.2 Time Period Validation in Generation

```typescript
async function generateStoryConcepts(params: GenerationParams) {
  const { genre, timePeriod, description, mode } = params;

  // Build time-period-aware prompt
  const timeConstraints = getTimePeriodConstraints(timePeriod);

  const prompt = `
    Generate ${mode === '5-full' ? '5 detailed' : mode === '10-quick' ? '10 brief' : '20 brief'}
    story concepts for a ${genre} novel.

    Time Period: ${timePeriod.label}
    ${timePeriod.description}

    CRITICAL CONSTRAINTS:
    ${timeConstraints.map(c => `- ${c}`).join('\n')}

    ${description ? `User's idea to incorporate: ${description}` : ''}

    Each concept MUST be plausible within the ${timePeriod.label} setting.
    Do NOT include:
    ${timeConstraints.prohibitions.map(p => `- ${p}`).join('\n')}

    ...
  `;

  return await generateWithClaude(prompt);
}

function getTimePeriodConstraints(timePeriod: TimePeriod) {
  const constraints = {
    'modern-day': {
      allowed: [
        'Contemporary technology (smartphones, internet, social media)',
        'Modern political structures',
        'Current scientific understanding',
        'Present-day social dynamics',
      ],
      prohibitions: [
        'Faster-than-light travel',
        'Generation ships',
        'Terraforming planets',
        'Interstellar civilizations',
        'Technology beyond near-future extrapolation',
      ],
    },
    '500-years-ahead': {
      allowed: [
        'Advanced space travel',
        'AI and robotics',
        'Genetic engineering',
        'Space colonization',
      ],
      prohibitions: [],
    },
    // ... other time periods
  };

  return constraints[timePeriod.id] || { allowed: [], prohibitions: [] };
}
```

### 5.3 Full Customization Tab Order

```tsx
<Tabs defaultValue="structure">
  {/* Step 1: Project Structure */}
  <TabsTrigger value="structure">1. Structure</TabsTrigger>

  {/* Step 2: Genres */}
  <TabsTrigger value="genres">2. Genres</TabsTrigger>

  {/* Step 3: Tone & Themes */}
  <TabsTrigger value="tone">3. Tone & Themes</TabsTrigger>

  {/* Step 4: Story Ideas */}
  <TabsTrigger value="ideas">4. Your Ideas</TabsTrigger>

  {/* Step 5: Style Presets (Optional) */}
  <TabsTrigger value="style">5. Style (Optional)</TabsTrigger>
</Tabs>
```

#### Tab 1: Structure
```tsx
<TabsContent value="structure">
  <div className="space-y-6">
    {/* Target Length */}
    <div>
      <Label>Target Length</Label>
      <Select value={targetLength} onValueChange={setTargetLength}>
        <SelectItem value="novella">Novella (20,000-40,000 words)</SelectItem>
        <SelectItem value="short-novel">Short Novel (50,000-70,000 words)</SelectItem>
        <SelectItem value="novel">Standard Novel (70,000-90,000 words)</SelectItem>
        <SelectItem value="epic">Epic Novel (100,000+ words)</SelectItem>
      </Select>
    </div>

    {/* Time Period */}
    <div>
      <Label>Time Period</Label>
      <TimePeriodSelector selected={timePeriod} onSelect={setTimePeriod} />
    </div>

    {/* Project Type */}
    <div>
      <Label>Project Type</Label>
      <RadioGroup value={projectType} onValueChange={setProjectType}>
        <RadioGroupItem value="standalone">Standalone Novel</RadioGroupItem>
        <RadioGroupItem value="trilogy">Trilogy</RadioGroupItem>
        <RadioGroupItem value="series">Series (4+ books)</RadioGroupItem>
      </RadioGroup>
    </div>
  </div>
</TabsContent>
```

#### Tab 2: Genres
```tsx
<TabsContent value="genres">
  <div className="space-y-6">
    {/* Genre Modifier (First) */}
    <div>
      <Label>Genre Modifier</Label>
      <p className="text-sm text-gray-500 mb-2">
        How should the primary genre be presented?
      </p>
      <GenreModifierSelector
        selected={genreModifier}
        onSelect={setGenreModifier}
      />
    </div>

    {/* Primary Genre */}
    <div>
      <Label>Primary Genre *</Label>
      <GenreGrid selected={primaryGenre} onSelect={setPrimaryGenre} />
    </div>

    {/* Specialist Genres (Collapsed by default) */}
    <Collapsible>
      <CollapsibleTrigger>
        <ChevronDown className="w-4 h-4" />
        Specialist Genres (Optional)
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SpecialistGenreSelector
          selected={specialistGenres}
          onSelect={setSpecialistGenres}
        />
      </CollapsibleContent>
    </Collapsible>
  </div>
</TabsContent>
```

#### Tab 4: Your Ideas
```tsx
<TabsContent value="ideas">
  <div className="space-y-6">
    {/* Story Ideas */}
    <div>
      <Label>Your Story Ideas</Label>
      <Textarea
        value={storyIdeas}
        onChange={(e) => setStoryIdeas(e.target.value)}
        placeholder="Describe your story concept, themes, or any specific ideas..."
        className="min-h-[150px]"
      />
    </div>

    {/* Additional Notes */}
    <div>
      <Label>Additional Notes</Label>
      <Textarea
        value={additionalNotes}
        onChange={(e) => setAdditionalNotes(e.target.value)}
        placeholder="Any specific requirements, constraints, or preferences..."
      />
    </div>

    {/* Character Nationality Settings */}
    <div>
      <Label>Character Nationality Settings</Label>
      <NationalityPreferencesSelector
        preferences={nationalityPrefs}
        onChange={setNationalityPrefs}
      />
    </div>

    {/* Generation Options */}
    <div className="pt-4 border-t">
      <Label>Generate Concepts</Label>
      <div className="grid grid-cols-3 gap-4 mt-2">
        <Button onClick={() => generate('5-detailed')}>
          5 Detailed Concepts
        </Button>
        <Button variant="outline" onClick={() => generate('10-summaries')}>
          10 Summaries
        </Button>
        <Button variant="outline" onClick={() => generate('20-summaries')}>
          20 Summaries
        </Button>
      </div>
    </div>
  </div>
</TabsContent>
```

---

## 6. Chapter Generation Workflow

### Current Issues
1. Users unsure when novel generation starts
2. Chapters page purpose unclear
3. No clear separation between "submit for generation" and "monitoring progress"

### 6.1 Submission Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GENERATION SUBMISSION FLOW                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Prerequisites Check                                                     │
│  ├── Concept ✓                                                          │
│  ├── Characters ✓                                                       │
│  ├── World ✓                                                            │
│  ├── Plots ✓                                                            │
│  ├── Outline ✓                                                          │
│  └── Style ✓                                                            │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    SUBMIT FOR GENERATION                         │    │
│  │  "Submit for Novel Generation" button on Outline page            │    │
│  │  OR dedicated "Submit" page after Style                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│           │                                                              │
│           ▼                                                              │
│  Background Processing Begins                                            │
│  - User can leave the page                                              │
│  - User can close the browser                                           │
│  - Email notification when complete (optional)                          │
│           │                                                              │
│           ▼                                                              │
│  Chapters Page = MONITORING DASHBOARD                                   │
│  - Real-time progress                                                   │
│  - Chapter-by-chapter status                                            │
│  - Read completed chapters                                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Chapters Page as Monitoring Dashboard

```tsx
export function ChaptersPage({ projectId }: { projectId: string }) {
  const { progress, chapters, isGenerating } = useGenerationProgress(projectId);

  if (!progress.hasStartedGeneration) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <BookX className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Generation Started</h2>
          <p className="text-gray-500 mb-4">
            Complete your story outline and submit for novel generation to begin.
          </p>
          <Button asChild>
            <Link href={`/projects/${projectId}/outline`}>
              Go to Outline
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generation Status Banner */}
      <GenerationStatusBanner
        status={progress.status}
        progress={progress.percentComplete}
        currentChapter={progress.currentChapter}
        totalChapters={progress.totalChapters}
      />

      {/* Chapter List */}
      <div className="grid gap-4">
        {chapters.map(chapter => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            status={getChapterStatus(chapter, progress)}
          />
        ))}
      </div>

      {/* Completion Actions */}
      {progress.status === 'completed' && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="font-semibold">Generation Complete!</p>
                <p className="text-sm text-gray-600">
                  Your novel is ready to read and export.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" /> Read Novel
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## 7. Bug Fixes

### 7.1 Fix: 404 on `/api/projects/:id/progress`

#### Issue
Railway HTTP logs show 404 errors for progress endpoint.

#### Investigation
The route may not be registered or the endpoint path is incorrect.

#### Fix
```typescript
// backend/src/routes/projects.ts

// Ensure progress route is registered
router.get('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        books: {
          with: {
            chapters: {
              orderBy: [asc(chapters.chapterNumber)],
            },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Calculate progress
    const progress = calculateProjectProgress(project);

    res.json(progress);
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Make sure this route is mounted BEFORE the generic /:id route
// Order matters in Express routing!
```

### 7.2 Fix: Story Outline Word Count Error

#### Issue
Outline shows "12000/80000 words" and then errors.

#### Fix
Remove word count from outline page entirely. The outline is not measured by word count.

```tsx
// REMOVE from outline page
{wordCount && targetWordCount && (
  <div className="progress-bar">
    <span>{wordCount} / {targetWordCount} words</span>
  </div>
)}

// The outline page should show structure metrics instead:
<div className="flex gap-4 text-sm text-gray-500">
  <span>{acts.length} Acts</span>
  <span>{totalChapters} Chapters</span>
  <span>{totalScenes} Scenes</span>
</div>
```

### 7.3 Fix: Plot Layer Description Duplication

#### Issue
Regenerating plot layer description produces near-identical results.

#### Fix
Pass existing description to avoid regeneration and include explicit uniqueness instructions.

```typescript
async function regeneratePlotDescription(
  layerId: string,
  currentDescription: string,
  context: PlotContext
) {
  const prompt = `
    Generate a NEW, DIFFERENT description for this plot layer.

    Current description (MUST BE COMPLETELY DIFFERENT):
    "${currentDescription}"

    Context:
    - Plot type: ${context.layerType}
    - Plot name: ${context.layerName}
    - Story genre: ${context.genre}
    - Story concept: ${context.conceptSummary}

    Requirements:
    - Take a DIFFERENT ANGLE on this plot
    - Explore different aspects, themes, or approaches
    - Do NOT paraphrase the existing description
    - Create something genuinely new while staying true to the plot name

    Return only the new description.
  `;

  return await generateWithClaude(prompt);
}
```

---

## 8. Implementation Priority

### Phase 5A: Critical Fixes (Week 1)
| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P0 | Fix 404 on progress endpoint | 2h | Blocker |
| P0 | Fix navigation tab order | 2h | High |
| P0 | Remove word count from outline | 1h | High |
| P0 | Fix "Start Generation" button clarity | 2h | High |

### Phase 5B: Prerequisite Enforcement (Week 1-2)
| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P1 | Implement useWorkflowPrerequisites hook | 4h | High |
| P1 | Add locked state to navigation tabs | 4h | High |
| P1 | Validation rules for each step | 6h | High |
| P1 | UI feedback for blocked steps | 4h | Medium |

### Phase 5C: Plots Page Overhaul (Week 2-3)
| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P1 | Auto-extract plots from story concept | 8h | High |
| P1 | Story concept plot field (non-deletable) | 4h | High |
| P1 | Cascade updates on concept plot change | 8h | High |
| P1 | Guided wizard workflow | 12h | High |
| P2 | Plot recommendations by book length | 4h | Medium |
| P2 | Unique name generation | 4h | Medium |
| P2 | Fix generate pacing notes | 4h | Medium |
| P2 | Larger description fields | 1h | Low |

### Phase 5D: Outline Improvements (Week 3)
| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P1 | Sequential act generation | 8h | High |
| P1 | Delete/regenerate individual acts | 6h | High |
| P1 | Real-time generation progress | 6h | High |
| P2 | Delete all acts option | 2h | Medium |
| P2 | Act editing capability | 4h | Medium |

### Phase 5E: New Project Page (Week 3-4)
| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P1 | Move "Inspire Me" next to description | 1h | Medium |
| P1 | Add 20 quick summaries option | 2h | Medium |
| P1 | Time period validation in generation | 6h | High |
| P2 | Full customization tab reorder | 4h | Medium |
| P2 | Collapse specialist genres by default | 1h | Low |

### Phase 5F: Chapter Monitoring (Week 4)
| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P1 | Chapters page as monitoring dashboard | 8h | High |
| P2 | Clear submission confirmation | 4h | Medium |
| P3 | Email notification on completion | 6h | Low |

---

## Appendix A: File Changes Summary

### Frontend Files to Modify
```
frontend/src/
├── hooks/
│   ├── useProjectNavigation.ts  (tab order)
│   └── useWorkflowPrerequisites.ts  (new file)
├── components/
│   ├── ProjectNavigation.tsx  (locked states)
│   ├── PlotWizard/  (new component)
│   └── GenerationStatusBanner.tsx  (new component)
├── app/
│   ├── projects/new/page.tsx  (redesign)
│   ├── projects/[id]/
│   │   ├── plot/page.tsx  (wizard overhaul)
│   │   ├── outline/page.tsx  (act management, button clarity)
│   │   └── chapters/page.tsx  (monitoring dashboard)
```

### Backend Files to Modify
```
backend/src/
├── routes/
│   ├── projects.ts  (fix progress endpoint, add routes)
│   └── plot-structure.ts  (unique names, pacing notes)
├── services/
│   ├── outline-generator.ts  (sequential generation)
│   ├── plot-extractor.ts  (new service)
│   └── concept-analyzer.ts  (new service)
```

---

## Appendix B: Database Schema Changes

### New Fields
```sql
-- projects table
ALTER TABLE projects ADD COLUMN generation_submitted_at TIMESTAMP;
ALTER TABLE projects ADD COLUMN generation_status VARCHAR(50);

-- plot_layers table
ALTER TABLE plot_layers ADD COLUMN source_type VARCHAR(50); -- 'story_concept' | 'user_created' | 'ai_generated'
ALTER TABLE plot_layers ADD COLUMN is_key_plot BOOLEAN DEFAULT FALSE;
ALTER TABLE plot_layers ADD COLUMN can_delete BOOLEAN DEFAULT TRUE;
ALTER TABLE plot_layers ADD COLUMN related_concept_text TEXT;

-- outlines table
ALTER TABLE outlines ADD COLUMN acts_generated_sequentially BOOLEAN DEFAULT TRUE;
```

---

## Appendix C: API Changes

### New Endpoints
```
POST /api/projects/:id/extract-plots-from-concept
POST /api/projects/:id/submit-for-generation
GET  /api/projects/:id/generation-status
POST /api/projects/:id/outline/regenerate-act/:actNumber
DELETE /api/projects/:id/outline/acts
```

### Modified Endpoints
```
GET  /api/projects/:id/progress  (fix 404)
POST /api/projects/:id/generate-pacing-notes  (fix non-functional)
POST /api/projects/:id/generate-plot-layer-field  (add uniqueness)
```

---

**Document prepared by:** Claude (Phase 5 Analysis)
**Review required by:** Development Team
**Approval required by:** Product Owner
