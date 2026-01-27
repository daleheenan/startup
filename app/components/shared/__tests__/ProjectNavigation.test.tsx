import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import ProjectNavigation from '../ProjectNavigation';
import { useWorkflowPrerequisites } from '@/app/hooks/useWorkflowPrerequisites';
import type { WorkflowProjectData } from '@/app/hooks/useWorkflowPrerequisites';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock workflow prerequisites hook
vi.mock('@/app/hooks/useWorkflowPrerequisites', () => ({
  useWorkflowPrerequisites: vi.fn(),
}));

describe('ProjectNavigation', () => {
  const mockProjectId = 'test-project-123';
  const mockProject: WorkflowProjectData = {
    id: mockProjectId,
    title: 'Test Project',
    story_dna: {
      genre: 'Fantasy',
      subgenre: 'Epic',
      tone: 'Dark',
      themes: ['Power', 'Betrayal'],
      proseStyle: 'Literary',
    },
    story_bible: {
      characters: [],
      world: { locations: [], factions: [], systems: [] },
      timeline: [],
    },
  } as any;

  const mockOutline = {
    id: 'outline-1',
    total_chapters: 10,
    structure: {},
  };

  const mockChapters = [
    { id: 'chapter-1', content: 'Chapter 1 content' },
    { id: 'chapter-2', content: 'Chapter 2 content' },
  ];

  const defaultPrerequisites = {
    canAccess: vi.fn().mockReturnValue(true),
    getBlockingReason: vi.fn().mockReturnValue(null),
    prerequisites: {
      concept: { isComplete: true, isRequired: true },
      characters: { isComplete: true, isRequired: true },
      world: { isComplete: true, isRequired: true },
      plots: { isComplete: true, isRequired: true },
      coherence: { isComplete: false, isRequired: false },
      originality: { isComplete: false, isRequired: false },
      outline: { isComplete: true, isRequired: true },
      'outline-review': { isComplete: false, isRequired: false },
      chapters: { isComplete: true, isRequired: true },
      analytics: { isComplete: false, isRequired: false },
      'editorial-report': { isComplete: false, isRequired: false },
      'follow-up': { isComplete: false, isRequired: false },
    },
  };

  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue(`/projects/${mockProjectId}`);
    vi.mocked(useWorkflowPrerequisites).mockReturnValue(defaultPrerequisites as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render navigation with all groups', () => {
      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      expect(screen.getByRole('navigation', { name: 'Project sections' })).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Elements')).toBeInTheDocument();
      expect(screen.getByText('Story')).toBeInTheDocument();
      expect(screen.getByText('Novel')).toBeInTheDocument();
      expect(screen.getByText('Editorial')).toBeInTheDocument();
    });

    it('should render standalone tabs as direct links', () => {
      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const overviewLink = screen.getByRole('link', { name: /Overview/i });
      expect(overviewLink).toHaveAttribute('href', `/projects/${mockProjectId}`);
    });

    it('should render group headers as expandable buttons', () => {
      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const elementsButton = screen.getByRole('button', { name: /Elements/i });
      expect(elementsButton).toBeInTheDocument();
      expect(elementsButton).toHaveAttribute('aria-expanded');
    });
  });

  describe('Group Expansion', () => {
    it('should expand group when clicked', async () => {
      const user = userEvent.setup();

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const elementsButton = screen.getByRole('button', { name: /Elements/i });
      expect(elementsButton).toHaveAttribute('aria-expanded', 'false');

      await user.click(elementsButton);

      expect(elementsButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('tab', { name: /Characters/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /World/i })).toBeInTheDocument();
    });

    it('should collapse group when clicked twice', async () => {
      const user = userEvent.setup();

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const elementsButton = screen.getByRole('button', { name: /Elements/i });

      await user.click(elementsButton);
      expect(elementsButton).toHaveAttribute('aria-expanded', 'true');

      await user.click(elementsButton);
      expect(elementsButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should expand active group by default', () => {
      vi.mocked(usePathname).mockReturnValue(`/projects/${mockProjectId}/characters`);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const elementsButton = screen.getByRole('button', { name: /Elements/i });
      expect(elementsButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('tab', { name: /Characters/i })).toBeInTheDocument();
    });

    it('should show dropdown indicator icon', () => {
      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const elementsButton = screen.getByRole('button', { name: /Elements/i });
      expect(elementsButton.textContent).toContain('▼');
    });

    it('should rotate dropdown indicator when expanded', async () => {
      const user = userEvent.setup();

      const { container } = render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const elementsButton = screen.getByRole('button', { name: /Elements/i });
      await user.click(elementsButton);

      // Check if the indicator span has rotation
      const indicator = elementsButton.querySelector('[style*="transform"]');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Active State Highlighting', () => {
    it('should highlight active tab', () => {
      vi.mocked(usePathname).mockReturnValue(`/projects/${mockProjectId}/characters`);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const elementsButton = screen.getByRole('button', { name: /Elements/i });
      expect(elementsButton).toHaveAttribute('aria-expanded', 'true');

      const charactersTab = screen.getByRole('tab', { name: /Characters/i });
      expect(charactersTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should highlight Overview when on project root', () => {
      vi.mocked(usePathname).mockReturnValue(`/projects/${mockProjectId}`);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const overviewLink = screen.getByRole('link', { name: /Overview/i });
      expect(overviewLink).toHaveAttribute('aria-current', 'page');
    });

    it('should apply active styling to current tab', () => {
      vi.mocked(usePathname).mockReturnValue(`/projects/${mockProjectId}/plot`);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      // Expand Story group to see Plot tab
      const storyButton = screen.getByRole('button', { name: /^Story/i });
      expect(storyButton).toHaveAttribute('aria-expanded', 'true');

      const plotTab = screen.getByRole('tab', { name: /^Plot/i });
      expect(plotTab).toHaveStyle({ fontWeight: 600 });
    });
  });

  describe('Status Indicators', () => {
    it('should show completed indicator for finished steps', () => {
      render(
        <ProjectNavigation
          projectId={mockProjectId}
          project={mockProject}
          outline={mockOutline}
          chapters={mockChapters}
        />
      );

      // Overview (concept) is complete
      const overviewLink = screen.getByRole('link', { name: /Overview/i });
      expect(overviewLink.style.borderBottom).toBeTruthy();
    });

    it('should show required indicator for incomplete required steps', () => {
      vi.mocked(useWorkflowPrerequisites).mockReturnValue({
        ...defaultPrerequisites,
        prerequisites: {
          ...defaultPrerequisites.prerequisites,
          characters: { isComplete: false, isRequired: true },
        },
      } as any);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      // Should have red border for required but incomplete
      const elementsButton = screen.getByRole('button', { name: /Elements/i });
      expect(elementsButton.style.borderBottomColor).toBeTruthy();
    });

    it('should show locked indicator for inaccessible steps', async () => {
      const user = userEvent.setup();
      vi.mocked(useWorkflowPrerequisites).mockReturnValue({
        ...defaultPrerequisites,
        canAccess: vi.fn((step) => step !== 'plots'),
        getBlockingReason: vi.fn((step) => (step === 'plots' ? 'Complete characters first' : null)),
        prerequisites: {
          ...defaultPrerequisites.prerequisites,
          plots: { isComplete: false, isRequired: true },
        },
      } as any);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      // Expand Story group
      const storyButton = screen.getByRole('button', { name: /^Story/i });
      await user.click(storyButton);

      // Plot should be locked
      const plotTab = screen.getByRole('tab', { name: /Plot/i });
      expect(plotTab).toHaveAttribute('aria-disabled', 'true');
      expect(plotTab.textContent).toContain('🔒');
    });

    it('should display tooltip for locked tabs', async () => {
      const user = userEvent.setup();
      vi.mocked(useWorkflowPrerequisites).mockReturnValue({
        ...defaultPrerequisites,
        canAccess: vi.fn((step) => step !== 'outline'),
        getBlockingReason: vi.fn((step) => (step === 'outline' ? 'Complete plot layers first' : null)),
      } as any);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const storyButton = screen.getByRole('button', { name: /^Story/i });
      await user.click(storyButton);

      const outlineTab = screen.getByRole('tab', { name: /Outline/i });
      expect(outlineTab).toHaveAttribute('title', 'Complete plot layers first');
    });
  });

  describe('Locked Tab Behaviour', () => {
    it('should render locked tab as div instead of link', async () => {
      const user = userEvent.setup();
      vi.mocked(useWorkflowPrerequisites).mockReturnValue({
        ...defaultPrerequisites,
        canAccess: vi.fn((step) => step !== 'plots'),
      } as any);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const storyButton = screen.getByRole('button', { name: /^Story/i });
      await user.click(storyButton);

      const plotTab = screen.getByRole('tab', { name: /Plot/i });
      expect(plotTab).toHaveAttribute('aria-disabled', 'true');
      expect(plotTab.tagName).toBe('DIV');
    });

    it('should show lock icon on locked tabs', async () => {
      const user = userEvent.setup();
      vi.mocked(useWorkflowPrerequisites).mockReturnValue({
        ...defaultPrerequisites,
        canAccess: vi.fn((step) => step !== 'world'),
      } as any);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const elementsButton = screen.getByRole('button', { name: /Elements/i });
      await user.click(elementsButton);

      const worldTab = screen.getByRole('tab', { name: /World/i });
      expect(worldTab.textContent).toContain('🔒');
    });

    it('should apply reduced opacity to locked tabs', async () => {
      const user = userEvent.setup();
      vi.mocked(useWorkflowPrerequisites).mockReturnValue({
        ...defaultPrerequisites,
        canAccess: vi.fn((step) => step !== 'characters'),
      } as any);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const elementsButton = screen.getByRole('button', { name: /Elements/i });
      await user.click(elementsButton);

      const charactersTab = screen.getByRole('tab', { name: /Characters/i });
      expect(charactersTab).toHaveStyle({ opacity: 0.5 });
    });
  });

  describe('Navigation Tabs', () => {
    it('should render all Elements tabs when expanded', async () => {
      const user = userEvent.setup();

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const elementsButton = screen.getByRole('button', { name: /Elements/i });
      await user.click(elementsButton);

      expect(screen.getByRole('tab', { name: /Characters/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /World/i })).toBeInTheDocument();
    });

    it('should render all Story tabs when expanded', async () => {
      const user = userEvent.setup();

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const storyButton = screen.getByRole('button', { name: /^Story/i });
      await user.click(storyButton);

      expect(screen.getByRole('tab', { name: /^Plot/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Outline/i })).toBeInTheDocument();
    });

    it('should render all Novel tabs when expanded', async () => {
      const user = userEvent.setup();

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const novelButton = screen.getByRole('button', { name: /Novel/i });
      await user.click(novelButton);

      expect(screen.getByRole('tab', { name: /Chapters/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Analytics/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Follow-up/i })).toBeInTheDocument();
    });

    it('should render all Editorial tabs when expanded', async () => {
      const user = userEvent.setup();

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const editorialButton = screen.getByRole('button', { name: /Editorial/i });
      await user.click(editorialButton);

      expect(screen.getByRole('tab', { name: /Editorial Board/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Outline Review/i })).toBeInTheDocument();
    });
  });

  describe('Tab Links', () => {
    it('should have correct hrefs for all tabs', async () => {
      const user = userEvent.setup();

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      // Expand Elements group
      await user.click(screen.getByRole('button', { name: /Elements/i }));

      expect(screen.getByRole('tab', { name: /Characters/i })).toHaveAttribute(
        'href',
        `/projects/${mockProjectId}/characters`
      );
      expect(screen.getByRole('tab', { name: /World/i })).toHaveAttribute(
        'href',
        `/projects/${mockProjectId}/world`
      );
    });

    it('should navigate to correct routes', async () => {
      const user = userEvent.setup();

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      await user.click(screen.getByRole('button', { name: /^Story/i }));

      const plotTab = screen.getByRole('tab', { name: /^Plot/i });
      expect(plotTab).toHaveAttribute('href', `/projects/${mockProjectId}/plot`);
    });
  });

  describe('Accessibility', () => {
    it('should have proper navigation landmark', () => {
      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const nav = screen.getByRole('navigation', { name: 'Project sections' });
      expect(nav).toBeInTheDocument();
    });

    it('should use aria-expanded for collapsible groups', () => {
      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const elementsButton = screen.getByRole('button', { name: /Elements/i });
      expect(elementsButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should use aria-controls to link button to panel', async () => {
      const user = userEvent.setup();

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const elementsButton = screen.getByRole('button', { name: /Elements/i });
      const controlsId = elementsButton.getAttribute('aria-controls');
      expect(controlsId).toBe('nav-group-elements');

      await user.click(elementsButton);

      const panel = document.getElementById('nav-group-elements');
      expect(panel).toBeInTheDocument();
    });

    it('should use aria-current for active page', () => {
      vi.mocked(usePathname).mockReturnValue(`/projects/${mockProjectId}`);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const overviewLink = screen.getByRole('link', { name: /Overview/i });
      expect(overviewLink).toHaveAttribute('aria-current', 'page');
    });

    it('should use aria-selected for active tabs in groups', () => {
      vi.mocked(usePathname).mockReturnValue(`/projects/${mockProjectId}/characters`);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const charactersTab = screen.getByRole('tab', { name: /Characters/i });
      expect(charactersTab).toHaveAttribute('aria-selected', 'true');
      expect(charactersTab).toHaveAttribute('role', 'tab');
    });

    it('should use aria-disabled for locked tabs', async () => {
      const user = userEvent.setup();
      vi.mocked(useWorkflowPrerequisites).mockReturnValue({
        ...defaultPrerequisites,
        canAccess: vi.fn((step) => step !== 'plots'),
      } as any);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const storyButton = screen.getByRole('button', { name: /^Story/i });
      await user.click(storyButton);

      const plotTab = screen.getByRole('tab', { name: /Plot/i });
      expect(plotTab).toHaveAttribute('aria-disabled', 'true');
    });

    it('should use aria-label for tab groups', async () => {
      const user = userEvent.setup();

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      await user.click(screen.getByRole('button', { name: /Elements/i }));

      const tablist = screen.getByRole('tablist', { name: 'Elements navigation' });
      expect(tablist).toBeInTheDocument();
    });

    it('should hide decorative icons from screen readers', () => {
      const { container } = render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Behaviour', () => {
    it('should enable horizontal scrolling', () => {
      const { container } = render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveStyle({
        overflowX: 'auto',
      });
    });

    it('should use minimum width for tab container', () => {
      const { container } = render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const tabContainer = container.querySelector('[style*="min-width"]');
      expect(tabContainer).toHaveStyle({
        minWidth: 'min-content',
      });
    });
  });

  describe('Visual Indicators', () => {
    it('should use different border colours for different statuses', () => {
      render(
        <ProjectNavigation
          projectId={mockProjectId}
          project={mockProject}
          outline={mockOutline}
          chapters={mockChapters}
        />
      );

      // Test that completed steps have visual indicators
      const overviewLink = screen.getByRole('link', { name: /Overview/i });
      expect(overviewLink.style.borderBottom).toBeTruthy();
    });

    it('should apply nested styling to child tabs', async () => {
      const user = userEvent.setup();
      vi.mocked(usePathname).mockReturnValue(`/projects/${mockProjectId}/characters`);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      const charactersTab = screen.getByRole('tab', { name: /Characters/i });
      expect(charactersTab).toHaveStyle({
        paddingLeft: '2.5rem',
      });
    });
  });

  describe('Without Prerequisites', () => {
    it('should render without project data', () => {
      render(<ProjectNavigation projectId={mockProjectId} />);

      expect(screen.getByRole('navigation', { name: 'Project sections' })).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    it('should not enforce prerequisites when project is null', () => {
      vi.mocked(useWorkflowPrerequisites).mockReturnValue({
        ...defaultPrerequisites,
        canAccess: vi.fn().mockReturnValue(true),
      } as any);

      render(<ProjectNavigation projectId={mockProjectId} project={null} />);

      // All tabs should be accessible
      expect(screen.getByRole('button', { name: /Elements/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle deep nested routes', () => {
      vi.mocked(usePathname).mockReturnValue(`/projects/${mockProjectId}/progress/chapter-1`);

      render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      // Novel group should be expanded as chapters is within it
      const novelButton = screen.getByRole('button', { name: /Novel/i });
      expect(novelButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should handle invalid project ID gracefully', () => {
      render(<ProjectNavigation projectId="invalid-id" project={null} />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should auto-expand active group on pathname change', async () => {
      const { rerender } = render(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      // Initially on overview
      expect(screen.getByRole('button', { name: /Elements/i })).toHaveAttribute('aria-expanded', 'false');

      // Navigate to characters page
      vi.mocked(usePathname).mockReturnValue(`/projects/${mockProjectId}/characters`);
      rerender(<ProjectNavigation projectId={mockProjectId} project={mockProject} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Elements/i })).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });
});
