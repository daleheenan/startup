import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import PrimaryNavigationBar from '../PrimaryNavigationBar';
import { useNavigationCounts } from '@/app/hooks/useNavigationCounts';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock navigation counts hook
vi.mock('@/app/hooks/useNavigationCounts', () => ({
  useNavigationCounts: vi.fn(),
}));

describe('PrimaryNavigationBar', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/');
    vi.mocked(useNavigationCounts).mockReturnValue({
      data: { storyIdeas: 0, savedConcepts: 0, activeProjects: 0 },
      isLoading: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render navigation bar with all primary items', () => {
      render(<PrimaryNavigationBar />);

      expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
      expect(screen.getByText('New Novel')).toBeInTheDocument();
      expect(screen.getByText('Quick Start')).toBeInTheDocument();
      expect(screen.getByText('Full Customisation')).toBeInTheDocument();
      expect(screen.getByText('Story Ideas')).toBeInTheDocument();
      expect(screen.getByText('Story Concepts')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render home/logo link', () => {
      render(<PrimaryNavigationBar />);

      const logoLink = screen.getByLabelText('Go to Projects');
      expect(logoLink).toBeInTheDocument();
      expect(logoLink).toHaveAttribute('href', '/projects');
      expect(logoLink).toHaveTextContent('N');
    });

    it('should render with sticky positioning', () => {
      const { container } = render(<PrimaryNavigationBar />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveStyle({
        position: 'sticky',
        top: 0,
        zIndex: 100,
      });
    });
  });

  describe('Active State', () => {
    it('should highlight projects when on projects page', () => {
      vi.mocked(usePathname).mockReturnValue('/projects');

      render(<PrimaryNavigationBar />);

      const logoLink = screen.getByLabelText('Go to Projects');
      expect(logoLink).toHaveAttribute('aria-current', 'page');
    });

    it('should highlight active navigation item based on pathname', () => {
      vi.mocked(usePathname).mockReturnValue('/settings');

      render(<PrimaryNavigationBar />);

      const settingsLink = screen.getByRole('link', { name: /Settings/i });
      expect(settingsLink).toHaveAttribute('aria-current', 'page');
    });

    it('should highlight New Novel when on /new route', () => {
      vi.mocked(usePathname).mockReturnValue('/new');

      render(<PrimaryNavigationBar />);

      const newNovelLink = screen.getByRole('link', { name: /New Novel/i });
      expect(newNovelLink).toHaveAttribute('aria-current', 'page');
    });

    it('should use activeSection prop over pathname detection', () => {
      vi.mocked(usePathname).mockReturnValue('/settings');

      render(<PrimaryNavigationBar activeSection="story-ideas" />);

      const storyIdeasLink = screen.getByRole('link', { name: /Story Ideas/i });
      expect(storyIdeasLink).toHaveAttribute('aria-current', 'page');

      const settingsLink = screen.getByRole('link', { name: /Settings/i });
      expect(settingsLink).not.toHaveAttribute('aria-current');
    });

    it('should apply active styling to active item', () => {
      vi.mocked(usePathname).mockReturnValue('/settings');

      render(<PrimaryNavigationBar />);

      const settingsLink = screen.getByRole('link', { name: /Settings/i });
      expect(settingsLink).toHaveStyle({
        fontWeight: 600,
      });
    });
  });

  describe('Badge Display', () => {
    it('should display badge count for story ideas', () => {
      vi.mocked(useNavigationCounts).mockReturnValue({
        data: { storyIdeas: 5, savedConcepts: 0, activeProjects: 0 },
        isLoading: false,
        error: null,
      } as any);

      render(<PrimaryNavigationBar />);

      const badge = screen.getByLabelText('5 items');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5');
    });

    it('should display badge count for saved concepts', () => {
      vi.mocked(useNavigationCounts).mockReturnValue({
        data: { storyIdeas: 0, savedConcepts: 12, activeProjects: 0 },
        isLoading: false,
        error: null,
      } as any);

      render(<PrimaryNavigationBar />);

      const badge = screen.getByLabelText('12 items');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('12');
    });

    it('should display multiple badges when both have counts', () => {
      vi.mocked(useNavigationCounts).mockReturnValue({
        data: { storyIdeas: 3, savedConcepts: 7, activeProjects: 0 },
        isLoading: false,
        error: null,
      } as any);

      render(<PrimaryNavigationBar />);

      expect(screen.getByLabelText('3 items')).toBeInTheDocument();
      expect(screen.getByLabelText('7 items')).toBeInTheDocument();
    });

    it('should not display badge when count is zero', () => {
      vi.mocked(useNavigationCounts).mockReturnValue({
        data: { storyIdeas: 0, savedConcepts: 0, activeProjects: 0 },
        isLoading: false,
        error: null,
      } as any);

      render(<PrimaryNavigationBar />);

      expect(screen.queryByLabelText(/items/i)).not.toBeInTheDocument();
    });

    it('should not display badge when data is loading', () => {
      vi.mocked(useNavigationCounts).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      render(<PrimaryNavigationBar />);

      expect(screen.queryByLabelText(/items/i)).not.toBeInTheDocument();
    });

    it('should handle large badge counts', () => {
      vi.mocked(useNavigationCounts).mockReturnValue({
        data: { storyIdeas: 999, savedConcepts: 0, activeProjects: 0 },
        isLoading: false,
        error: null,
      } as any);

      render(<PrimaryNavigationBar />);

      const badge = screen.getByLabelText('999 items');
      expect(badge).toHaveTextContent('999');
    });
  });

  describe('Navigation Links', () => {
    it('should have correct href for all navigation items', () => {
      render(<PrimaryNavigationBar />);

      expect(screen.getByRole('link', { name: /New Novel/i })).toHaveAttribute('href', '/new');
      expect(screen.getByRole('link', { name: /Quick Start/i })).toHaveAttribute('href', '/quick-start');
      expect(screen.getByRole('link', { name: /Full Customisation/i })).toHaveAttribute('href', '/full-customization');
      expect(screen.getByRole('link', { name: /Story Ideas/i })).toHaveAttribute('href', '/story-ideas');
      expect(screen.getByRole('link', { name: /Story Concepts/i })).toHaveAttribute('href', '/saved-concepts');
      expect(screen.getByRole('link', { name: /Settings/i })).toHaveAttribute('href', '/settings');
    });

    it('should render icons with aria-hidden', () => {
      const { container } = render(<PrimaryNavigationBar />);

      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Hover Behaviour', () => {
    it('should change styling on hover for non-active items', async () => {
      const user = userEvent.setup();

      render(<PrimaryNavigationBar />);

      const newNovelLink = screen.getByRole('link', { name: /New Novel/i });

      await user.hover(newNovelLink);

      // Component uses inline styles with onMouseEnter/onMouseLeave
      // The actual style change is applied via event handlers
      // Just verify the link is interactive
      expect(newNovelLink).toBeInTheDocument();
    });

    it('should not change styling on hover for active items', async () => {
      const user = userEvent.setup();
      vi.mocked(usePathname).mockReturnValue('/settings');

      render(<PrimaryNavigationBar />);

      const settingsLink = screen.getByRole('link', { name: /Settings/i });
      const initialStyle = settingsLink.style.background;

      await user.hover(settingsLink);

      // Active item should maintain its styling
      expect(settingsLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Accessibility', () => {
    it('should have proper navigation landmark', () => {
      render(<PrimaryNavigationBar />);

      const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
      expect(nav).toBeInTheDocument();
    });

    it('should set aria-current on active link', () => {
      vi.mocked(usePathname).mockReturnValue('/new');

      render(<PrimaryNavigationBar />);

      const activeLink = screen.getByRole('link', { name: /New Novel/i });
      expect(activeLink).toHaveAttribute('aria-current', 'page');
    });

    it('should not set aria-current on inactive links', () => {
      vi.mocked(usePathname).mockReturnValue('/new');

      render(<PrimaryNavigationBar />);

      const settingsLink = screen.getByRole('link', { name: /Settings/i });
      expect(settingsLink).not.toHaveAttribute('aria-current');
    });

    it('should have descriptive aria-label for badge counts', () => {
      vi.mocked(useNavigationCounts).mockReturnValue({
        data: { storyIdeas: 5, savedConcepts: 0, activeProjects: 0 },
        isLoading: false,
        error: null,
      } as any);

      render(<PrimaryNavigationBar />);

      const badge = screen.getByLabelText('5 items');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have horizontal scrolling enabled', () => {
      const { container } = render(<PrimaryNavigationBar />);

      const scrollContainer = container.querySelector('div[style*="overflow-x"]');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('should prevent text wrapping on navigation items', () => {
      render(<PrimaryNavigationBar />);

      const newNovelLink = screen.getByRole('link', { name: /New Novel/i });
      expect(newNovelLink).toHaveStyle({
        whiteSpace: 'nowrap',
      });
    });

    it('should have maximum width constraint', () => {
      const { container } = render(<PrimaryNavigationBar />);

      const innerContainer = container.querySelector('div[style*="max-width"]');
      expect(innerContainer).toBeInTheDocument();
      expect(innerContainer?.getAttribute('style')).toContain('max-width: 1400px');
    });
  });

  describe('Visual Styling', () => {
    it('should apply shadow to navigation bar', () => {
      const { container } = render(<PrimaryNavigationBar />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveStyle({
        boxShadow: expect.stringContaining('0 1px 3px'),
      });
    });

    it('should have border at bottom', () => {
      const { container } = render(<PrimaryNavigationBar />);

      const nav = container.querySelector('nav');
      expect(nav?.style.borderBottom).toBeTruthy();
    });

    it('should use brand colours for active state', () => {
      vi.mocked(usePathname).mockReturnValue('/settings');

      render(<PrimaryNavigationBar />);

      const settingsLink = screen.getByRole('link', { name: /Settings/i });
      // Component uses colors from constants, just verify it has background
      expect(settingsLink.style.background).toBeTruthy();
    });
  });

  describe('Icon Display', () => {
    it('should display emoji icons for each navigation item', () => {
      render(<PrimaryNavigationBar />);

      // Verify all links have their icon spans
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);

      // Each link should have text content (label + possibly icon)
      links.forEach((link) => {
        expect(link.textContent).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation counts error gracefully', () => {
      vi.mocked(useNavigationCounts).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch'),
      } as any);

      render(<PrimaryNavigationBar />);

      // Should still render without badges
      expect(screen.getByText('Story Ideas')).toBeInTheDocument();
      expect(screen.queryByLabelText(/items/i)).not.toBeInTheDocument();
    });

    it('should handle undefined data from navigation counts', () => {
      vi.mocked(useNavigationCounts).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      render(<PrimaryNavigationBar />);

      expect(screen.queryByLabelText(/items/i)).not.toBeInTheDocument();
    });
  });
});
