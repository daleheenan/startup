/**
 * RomanceBeatTracker Usage Example
 *
 * This component helps track romance emotional beats throughout your novel.
 * It validates that all required beats are present and provides guidance on
 * where to place them based on story progress.
 */

import RomanceBeatTracker from './RomanceBeatTracker';

// Example 1: Basic usage in a project page
export function ProjectRomancePage({ projectId }: { projectId: string }) {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>Romance Beat Planning</h1>

      <RomanceBeatTracker
        projectId={projectId}
        totalChapters={30}
        onBeatUpdate={() => {
          console.log('Beat tracking updated!');
          // Optionally refresh other data or show a toast notification
        }}
      />
    </div>
  );
}

// Example 2: Embedded in a chapter planning interface
export function ChapterPlanningWithBeats({
  projectId,
  currentChapter,
  totalChapters
}: {
  projectId: string;
  currentChapter: number;
  totalChapters: number;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
      {/* Main chapter planning area */}
      <div>
        <h2>Chapter {currentChapter} Planning</h2>
        {/* Your chapter planning UI here */}
      </div>

      {/* Beat tracking sidebar */}
      <div style={{ maxHeight: '800px', overflowY: 'auto' }}>
        <RomanceBeatTracker
          projectId={projectId}
          totalChapters={totalChapters}
        />
      </div>
    </div>
  );
}

// Example 3: With conditional rendering based on genre
export function ConditionalBeatTracker({
  projectId,
  projectGenre,
  totalChapters,
}: {
  projectId: string;
  projectGenre: string;
  totalChapters: number;
}) {
  // Only show romance beat tracker for romance novels
  if (!projectGenre.toLowerCase().includes('romance')) {
    return null;
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <RomanceBeatTracker
        projectId={projectId}
        totalChapters={totalChapters}
        onBeatUpdate={() => {
          // Analytics tracking
          console.log('Romance beat updated for', projectId);
        }}
      />
    </div>
  );
}

/**
 * Key Features:
 *
 * 1. Progress Tracking
 *    - Shows overall beat completion (X / 11 total beats)
 *    - Highlights required vs optional beats
 *    - Displays validation status
 *
 * 2. Beat Management
 *    - Track beat with chapter assignment
 *    - Mark beats as planned or completed
 *    - Add notes about how beat manifests in your story
 *    - Remove beat tracking if needed
 *
 * 3. Guidance
 *    - Suggested placement based on story percentage
 *    - Emotional function explanation
 *    - Beat variations to choose from
 *    - Writing tips for each beat
 *
 * 4. Validation
 *    - Warns about missing required beats
 *    - Alerts for beats without chapter assignments
 *    - Validates beat completion status
 *
 * 5. API Integration
 *    - Automatically syncs with backend
 *    - Real-time updates
 *    - Error handling with user feedback
 */
