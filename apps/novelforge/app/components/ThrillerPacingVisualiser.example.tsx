/**
 * Example usage of ThrillerPacingVisualiser component
 *
 * This file demonstrates how to integrate the ThrillerPacingVisualiser
 * component in a project page or thriller-specific settings page.
 */

'use client';

import { useState, useEffect } from 'react';
import ThrillerPacingVisualiser from './ThrillerPacingVisualiser';

interface ThrillerPacingPageProps {
  projectId: string;
}

export default function ThrillerPacingPage({ projectId }: ThrillerPacingPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    totalChapters: number;
    settings: any;
    hooks: any[];
    twists: any[];
    tickingClocks: any[];
  } | null>(null);

  useEffect(() => {
    async function fetchThrillerData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all thriller-related data in parallel
        const [settingsRes, hooksRes, twistsRes, clocksRes, projectRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/thriller-settings`),
          fetch(`/api/projects/${projectId}/thriller-hooks`),
          fetch(`/api/projects/${projectId}/thriller-twists`),
          fetch(`/api/projects/${projectId}/thriller-time-pressure`),
          fetch(`/api/projects/${projectId}`),
        ]);

        if (!settingsRes.ok || !hooksRes.ok || !twistsRes.ok || !clocksRes.ok || !projectRes.ok) {
          throw new Error('Failed to fetch thriller data');
        }

        const [settings, hooks, twists, clocks, project] = await Promise.all([
          settingsRes.json(),
          hooksRes.json(),
          twistsRes.json(),
          clocksRes.json(),
          projectRes.json(),
        ]);

        setData({
          totalChapters: project.chapter_count || 30,
          settings,
          hooks,
          twists,
          tickingClocks: clocks,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load thriller data');
      } finally {
        setLoading(false);
      }
    }

    fetchThrillerData();
  }, [projectId]);

  const handleAddHook = async (chapterNumber: number) => {
    // Implementation would open a dialog or modal to add a new hook
    console.log('Add hook to chapter', chapterNumber);
  };

  const handleAddTwist = async () => {
    // Implementation would open a dialog or modal to add a new twist
    console.log('Add twist');
  };

  const handleAddClock = async () => {
    // Implementation would open a dialog or modal to add a new ticking clock
    console.log('Add ticking clock');
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        Loading thriller pacing data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>
        Error: {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <ThrillerPacingVisualiser
        projectId={projectId}
        totalChapters={data.totalChapters}
        settings={data.settings}
        hooks={data.hooks}
        twists={data.twists}
        tickingClocks={data.tickingClocks}
        onAddHook={handleAddHook}
        onAddTwist={handleAddTwist}
        onAddClock={handleAddClock}
        readOnly={false}
      />
    </div>
  );
}

/**
 * Example with static data (for testing/demos)
 */
export function ThrillerPacingExample() {
  const exampleData = {
    projectId: 'example-thriller',
    totalChapters: 30,
    settings: {
      pacing_style: 'escalating',
    },
    hooks: [
      {
        id: '1',
        chapter_number: 1,
        hook_type: 'question',
        description: 'Who is the mysterious figure watching Sarah?',
        tension_level: 4,
        is_resolved: false,
      },
      {
        id: '2',
        chapter_number: 5,
        hook_type: 'threat',
        description: 'Anonymous message: "Stop digging or you\'re next"',
        tension_level: 7,
        is_resolved: false,
      },
      {
        id: '3',
        chapter_number: 10,
        hook_type: 'revelation',
        description: 'Discovery of the second body - this is a serial killer',
        tension_level: 9,
        is_resolved: true,
        resolution_chapter: 11,
      },
      {
        id: '4',
        chapter_number: 15,
        hook_type: 'betrayal',
        description: 'Detective Marcus has been leaking information',
        tension_level: 8,
        is_resolved: false,
      },
      {
        id: '5',
        chapter_number: 20,
        hook_type: 'countdown',
        description: 'The killer will strike again at midnight - 6 hours left',
        tension_level: 9,
        is_resolved: false,
      },
      {
        id: '6',
        chapter_number: 25,
        hook_type: 'cliffhanger',
        description: 'Sarah enters the abandoned warehouse alone...',
        tension_level: 10,
        is_resolved: false,
      },
    ],
    twists: [
      {
        id: 't1',
        twist_type: 'hidden_identity',
        description: 'The helpful neighbour is actually the killer\'s accomplice',
        setup_start_chapter: 2,
        setup_end_chapter: 12,
        reveal_chapter: 18,
        foreshadowing_status: 'adequate' as const,
        is_planted: true,
      },
      {
        id: 't2',
        twist_type: 'betrayal',
        description: 'Detective Marcus has been protecting the killer all along',
        setup_start_chapter: 1,
        setup_end_chapter: 20,
        reveal_chapter: 24,
        foreshadowing_status: 'excellent' as const,
        is_planted: true,
      },
      {
        id: 't3',
        twist_type: 'plot_reversal',
        description: 'Sarah isn\'t investigating the killer - she\'s being framed',
        setup_start_chapter: 5,
        setup_end_chapter: 15,
        reveal_chapter: 22,
        foreshadowing_status: 'minimal' as const,
        is_planted: false,
      },
    ],
    tickingClocks: [
      {
        id: 'c1',
        name: '48-Hour Deadline',
        description: 'Police have 48 hours before the next predicted murder',
        clock_type: 'countdown',
        start_chapter: 8,
        end_chapter: 20,
        stakes: 'Innocent life will be lost',
        is_active: true,
      },
      {
        id: 'c2',
        name: 'Evidence Disappearing',
        description: 'Someone is systematically destroying evidence',
        clock_type: 'decay',
        start_chapter: 12,
        end_chapter: 25,
        stakes: 'Case will go cold without proof',
        is_active: true,
      },
      {
        id: 'c3',
        name: 'Witness Leaving Country',
        description: 'Key witness has a flight booked in 24 hours',
        clock_type: 'opportunity',
        start_chapter: 15,
        end_chapter: 18,
        stakes: 'Only person who saw the killer escapes',
        is_active: false,
      },
    ],
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        padding: '16px',
        background: '#FEF3C7',
        border: '1px solid #FCD34D',
        borderRadius: '8px',
        marginBottom: '24px',
      }}>
        <strong>Example Demo:</strong> This is a demonstration with static data.
        In production, data would be loaded from API endpoints.
      </div>

      <ThrillerPacingVisualiser
        {...exampleData}
        readOnly={true}
      />
    </div>
  );
}
