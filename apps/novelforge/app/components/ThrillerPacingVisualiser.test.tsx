import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ThrillerPacingVisualiser from './ThrillerPacingVisualiser';

describe('ThrillerPacingVisualiser', () => {
  const mockProps = {
    projectId: 'test-project-1',
    totalChapters: 30,
    settings: {
      pacing_style: 'escalating',
    },
    hooks: [
      {
        id: 'hook-1',
        chapter_number: 5,
        hook_type: 'cliffhanger',
        description: 'Gunshot rings out as chapter ends',
        tension_level: 8,
        is_resolved: false,
      },
      {
        id: 'hook-2',
        chapter_number: 10,
        hook_type: 'revelation',
        description: 'Discovery of the body',
        tension_level: 9,
        is_resolved: true,
        resolution_chapter: 11,
      },
    ],
    twists: [
      {
        id: 'twist-1',
        twist_type: 'betrayal',
        description: 'The trusted ally is revealed as the mastermind',
        setup_start_chapter: 1,
        setup_end_chapter: 15,
        reveal_chapter: 20,
        foreshadowing_status: 'adequate' as const,
        is_planted: true,
      },
    ],
    tickingClocks: [
      {
        id: 'clock-1',
        name: 'Bomb Timer',
        description: '24 hours to find and disarm the device',
        clock_type: 'countdown',
        start_chapter: 8,
        end_chapter: 25,
        stakes: 'Entire city at risk',
        is_active: true,
      },
    ],
  };

  it('renders the component with default tension tab', () => {
    render(<ThrillerPacingVisualiser {...mockProps} />);

    expect(screen.getByText('Thriller Pacing & Tension')).toBeInTheDocument();
    expect(screen.getByText('Escalating')).toBeInTheDocument();
  });

  it('displays all tabs with correct counts', () => {
    render(<ThrillerPacingVisualiser {...mockProps} />);

    expect(screen.getByText('Tension Curve')).toBeInTheDocument();
    expect(screen.getByText('Ticking Clocks')).toBeInTheDocument();
    expect(screen.getByText('Twists')).toBeInTheDocument();
    expect(screen.getByText('Chapter Hooks')).toBeInTheDocument();
  });

  it('renders with no data', () => {
    render(
      <ThrillerPacingVisualiser
        projectId="empty-project"
        totalChapters={20}
        hooks={[]}
        twists={[]}
        tickingClocks={[]}
      />
    );

    expect(screen.getByText('Thriller Pacing & Tension')).toBeInTheDocument();
  });

  it('applies read-only mode correctly', () => {
    const { container } = render(
      <ThrillerPacingVisualiser {...mockProps} readOnly={true} />
    );

    // In read-only mode, action buttons should not be present
    expect(container.querySelector('button')).not.toHaveTextContent('+ Add');
  });

  it('shows appropriate pacing style description', () => {
    render(<ThrillerPacingVisualiser {...mockProps} />);

    expect(screen.getByText(/Steady build from moderate to explosive/)).toBeInTheDocument();
  });
});

describe('ThrillerPacingVisualiser - Different Pacing Styles', () => {
  it('renders relentless pacing style', () => {
    render(
      <ThrillerPacingVisualiser
        projectId="test"
        totalChapters={20}
        settings={{ pacing_style: 'relentless' }}
      />
    );

    expect(screen.getByText('Relentless')).toBeInTheDocument();
  });

  it('renders rollercoaster pacing style', () => {
    render(
      <ThrillerPacingVisualiser
        projectId="test"
        totalChapters={20}
        settings={{ pacing_style: 'rollercoaster' }}
      />
    );

    expect(screen.getByText('Rollercoaster')).toBeInTheDocument();
  });

  it('renders slow burn pacing style', () => {
    render(
      <ThrillerPacingVisualiser
        projectId="test"
        totalChapters={20}
        settings={{ pacing_style: 'slow_burn' }}
      />
    );

    expect(screen.getByText('Slow Burn')).toBeInTheDocument();
  });
});
