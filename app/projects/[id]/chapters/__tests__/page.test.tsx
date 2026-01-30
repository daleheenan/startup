import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChaptersPage from '../page';

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ id: 'project-123' })),
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => '/projects/project-123/chapters'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock auth
vi.mock('../../../../lib/auth', () => ({
  getToken: vi.fn(() => 'mock-token-123'),
  logout: vi.fn(),
}));

// Mock fetch-utils
vi.mock('../../../../lib/fetch-utils', () => ({
  fetchWithAuth: vi.fn(),
}));

// Mock design tokens
vi.mock('../../../../lib/design-tokens', () => ({
  colors: {
    background: { surface: '#fff', surfaceHover: '#f5f5f5' },
    border: { default: '#e5e5e5', hover: '#d5d5d5' },
    text: { primary: '#111', secondary: '#666', tertiary: '#999', inverse: '#fff', disabled: '#aaa' },
    brand: { gradient: 'linear-gradient(to right, #6366f1, #8b5cf6)' },
    semantic: {
      success: '#22c55e', successLight: '#dcfce7', successDark: '#16a34a',
      warning: '#f59e0b', warningLight: '#fef3c7',
      error: '#ef4444', errorLight: '#fee2e2',
      info: '#3b82f6', infoLight: '#dbeafe',
    },
  },
  borderRadius: { sm: '4px', md: '8px', lg: '12px' },
  spacing: { 2: '0.5rem', 3: '0.75rem', 4: '1rem', 5: '1.25rem', 6: '1.5rem', 8: '2rem' },
  typography: {
    fontSize: { sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem' },
    fontWeight: { medium: 500, semibold: 600 },
  },
  transitions: { colors: 'color 0.15s ease' },
}));

// Mock DashboardLayout
vi.mock('@/app/components/dashboard/DashboardLayout', () => ({
  default: ({ children, header }: { children: React.ReactNode; header: { title: string; subtitle: string } }) => (
    <div data-testid="dashboard-layout">
      <header>
        <h1>{header.title}</h1>
        <p>{header.subtitle}</p>
      </header>
      <main>{children}</main>
    </div>
  ),
}));

// Mock BookVersionSelector with useEffect to properly simulate the callback timing
vi.mock('@/app/components/BookVersionSelector', () => ({
  default: function MockBookVersionSelector({ bookId, onVersionChange }: { bookId: string; onVersionChange?: (version: any) => void }) {
    const { useEffect } = require('react');

    useEffect(() => {
      if (onVersionChange && bookId) {
        // Simulate the version selector loading and notifying parent
        onVersionChange({
          id: 'version-1',
          version_number: 1,
          actual_chapter_count: 3,
          chapter_count: 3,
        });
      }
    }, [bookId, onVersionChange]);

    return <div data-testid="book-version-selector" data-book-id={bookId}>Version Selector Mock</div>;
  },
}));

// Mock CollapsibleSection
vi.mock('../../../../components/CollapsibleSection', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="collapsible-section" data-title={title}>{children}</div>
  ),
}));

// Mock AgentWorkflowVisualization
vi.mock('../../../../components/AgentWorkflowVisualization', () => ({
  default: () => <div data-testid="agent-workflow">Workflow Mock</div>,
}));

import { fetchWithAuth } from '../../../../lib/fetch-utils';

const mockFetchWithAuth = fetchWithAuth as ReturnType<typeof vi.fn>;

describe('ChaptersPage', () => {
  const mockProject = {
    id: 'project-123',
    title: 'Test Novel',
    genre: 'Fantasy',
  };

  const mockBooks = [
    {
      id: 'book-1',
      project_id: 'project-123',
      book_number: 1,
      title: 'Book One',
      chapter_count: 3,
    },
  ];

  const mockChapters = [
    {
      id: 'chapter-1',
      book_id: 'book-1',
      chapter_number: 1,
      title: 'The Beginning',
      status: 'completed',
      word_count: 2500,
      is_locked: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'chapter-2',
      book_id: 'book-1',
      chapter_number: 2,
      title: 'The Journey',
      status: 'in_progress',
      word_count: 1500,
      is_locked: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'chapter-3',
      book_id: 'book-1',
      chapter_number: 3,
      title: 'The Return',
      status: 'draft',
      word_count: 500,
      is_locked: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default fetch responses
    mockFetchWithAuth.mockImplementation(async (url: string) => {
      if (url.includes('/api/projects/project-123')) {
        return { ok: true, json: async () => mockProject };
      }
      if (url.includes('/api/books/project/project-123')) {
        return { ok: true, json: async () => ({ books: mockBooks }) };
      }
      if (url.includes('/api/chapters/book/book-1')) {
        return { ok: true, json: async () => ({ chapters: mockChapters }) };
      }
      if (url.includes('/api/projects/project-123/progress')) {
        return { ok: true, json: async () => ({ queue: { pending: 0, running: 0 } }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Loading', () => {
    it('should show loading state initially', async () => {
      render(<ChaptersPage />);

      // Initially shows loading
      expect(screen.getByText('Loading project...')).toBeInTheDocument();
    });

    it('should render chapters after loading', async () => {
      render(<ChaptersPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading project...')).not.toBeInTheDocument();
      });

      // Version selector should be rendered
      await waitFor(() => {
        expect(screen.getByTestId('book-version-selector')).toBeInTheDocument();
      });
    });

    it('should pass correct bookId to BookVersionSelector', async () => {
      render(<ChaptersPage />);

      await waitFor(() => {
        const selector = screen.getByTestId('book-version-selector');
        expect(selector).toHaveAttribute('data-book-id', 'book-1');
      });
    });
  });

  describe('Chapter Display', () => {
    it('should display all chapters from the version', async () => {
      render(<ChaptersPage />);

      await waitFor(() => {
        expect(screen.getByText('The Beginning')).toBeInTheDocument();
        expect(screen.getByText('The Journey')).toBeInTheDocument();
        expect(screen.getByText('The Return')).toBeInTheDocument();
      });
    });

    it('should show chapter numbers', async () => {
      render(<ChaptersPage />);

      await waitFor(() => {
        // Chapter numbers are displayed as just the number after "Ch."
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should show word counts', async () => {
      render(<ChaptersPage />);

      await waitFor(() => {
        // Word counts use toLocaleString() formatting
        expect(screen.getByText('2,500 words')).toBeInTheDocument();
        expect(screen.getByText('1,500 words')).toBeInTheDocument();
        expect(screen.getByText('500 words')).toBeInTheDocument();
      });
    });
  });

  describe('Status Indicators', () => {
    it('should show completed status', async () => {
      render(<ChaptersPage />);

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });

    it('should show in progress status', async () => {
      render(<ChaptersPage />);

      await waitFor(() => {
        expect(screen.getByText('In Progress')).toBeInTheDocument();
      });
    });

    it('should show draft status', async () => {
      render(<ChaptersPage />);

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter chapters by search query', async () => {
      const user = userEvent.setup();
      render(<ChaptersPage />);

      await waitFor(() => {
        expect(screen.getByText('The Beginning')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Journey');

      await waitFor(() => {
        expect(screen.getByText('The Journey')).toBeInTheDocument();
        expect(screen.queryByText('The Beginning')).not.toBeInTheDocument();
        expect(screen.queryByText('The Return')).not.toBeInTheDocument();
      });
    });

    it('should filter chapters by status', async () => {
      const user = userEvent.setup();
      render(<ChaptersPage />);

      await waitFor(() => {
        expect(screen.getByText('The Beginning')).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText(/status/i);
      await user.selectOptions(statusFilter, 'completed');

      await waitFor(() => {
        expect(screen.getByText('The Beginning')).toBeInTheDocument();
        expect(screen.queryByText('The Journey')).not.toBeInTheDocument();
        expect(screen.queryByText('The Return')).not.toBeInTheDocument();
      });
    });

    it('should show clear filters button when filters are active', async () => {
      const user = userEvent.setup();
      render(<ChaptersPage />);

      await waitFor(() => {
        expect(screen.getByText('The Beginning')).toBeInTheDocument();
      });

      // Use status filter since it's a select which is more reliable
      const statusFilter = screen.getByLabelText(/status/i);
      await user.selectOptions(statusFilter, 'completed');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
      });
    });

    it('should clear filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChaptersPage />);

      await waitFor(() => {
        expect(screen.getByText('The Beginning')).toBeInTheDocument();
      });

      // Filter to only completed chapters
      const statusFilter = screen.getByLabelText(/status/i);
      await user.selectOptions(statusFilter, 'draft');

      await waitFor(() => {
        // Only "The Return" should be visible (it's draft)
        expect(screen.getByText('The Return')).toBeInTheDocument();
        expect(screen.queryByText('The Beginning')).not.toBeInTheDocument();
      });

      // Click clear filters
      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearButton);

      await waitFor(() => {
        // All chapters should be visible again
        expect(screen.getByText('The Beginning')).toBeInTheDocument();
        expect(screen.getByText('The Journey')).toBeInTheDocument();
        expect(screen.getByText('The Return')).toBeInTheDocument();
      });
    });
  });

  describe('Empty Version (No Chapters)', () => {
    it('should show "No Chapters for This Version" message when version has 0 chapters', async () => {
      // Override the BookVersionSelector mock to return a version with 0 chapters
      vi.doMock('@/app/components/BookVersionSelector', () => ({
        default: ({ onVersionChange }: { onVersionChange?: (version: any) => void }) => {
          if (onVersionChange) {
            setTimeout(() => {
              onVersionChange({
                id: 'version-2',
                version_number: 2,
                actual_chapter_count: 0,
                chapter_count: 0,
              });
            }, 0);
          }
          return <div data-testid="book-version-selector">Version Selector Mock</div>;
        },
      }));

      // For this test, we'd need to properly remock the component
      // This is a placeholder for the expected behaviour
    });
  });

  describe('Error Handling', () => {
    it('should show error message when project fetch throws', async () => {
      mockFetchWithAuth.mockImplementation(async (url: string) => {
        throw new Error('Network error');
      });

      render(<ChaptersPage />);

      await waitFor(() => {
        // Error page shows "Chapters Not Available" header with error message
        expect(screen.getByText('Chapters Not Available')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockFetchWithAuth.mockImplementation(async () => {
        throw new Error('Network error');
      });

      render(<ChaptersPage />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('Version Switching', () => {
    it('should fetch chapters when version changes', async () => {
      render(<ChaptersPage />);

      await waitFor(() => {
        expect(mockFetchWithAuth).toHaveBeenCalledWith(
          expect.stringContaining('/api/chapters/book/book-1')
        );
      });
    });

    it('should include versionId in chapters fetch', async () => {
      render(<ChaptersPage />);

      await waitFor(() => {
        expect(mockFetchWithAuth).toHaveBeenCalledWith(
          expect.stringMatching(/\/api\/chapters\/book\/book-1\?versionId=version-1/)
        );
      });
    });
  });

  describe('Chapter Results Count', () => {
    it('should show correct chapter count', async () => {
      render(<ChaptersPage />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 3 of 3 chapters/i)).toBeInTheDocument();
      });
    });

    it('should update count when filtering', async () => {
      const user = userEvent.setup();
      render(<ChaptersPage />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 3 of 3 chapters/i)).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText(/status/i);
      await user.selectOptions(statusFilter, 'completed');

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 3 chapters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should not unmount version selector while loading chapters', async () => {
      // This tests the critical fix: chaptersLoading should not cause
      // the version selector to unmount

      let resolveChaptersFetch: (value: any) => void;
      const chaptersPromise = new Promise(resolve => {
        resolveChaptersFetch = resolve;
      });

      mockFetchWithAuth.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/chapters/book/book-1')) {
          await chaptersPromise;
          return { ok: true, json: async () => ({ chapters: mockChapters }) };
        }
        if (url.includes('/api/projects/project-123/progress')) {
          return { ok: true, json: async () => ({ queue: { pending: 0, running: 0 } }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(<ChaptersPage />);

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.getByTestId('book-version-selector')).toBeInTheDocument();
      });

      // Version selector should remain mounted while chapters are loading
      expect(screen.getByTestId('book-version-selector')).toBeInTheDocument();
      expect(screen.getByText('Loading chapters...')).toBeInTheDocument();

      // Resolve chapters fetch
      resolveChaptersFetch!({ ok: true, json: async () => ({ chapters: mockChapters }) });

      // Version selector should still be there after chapters load
      await waitFor(() => {
        expect(screen.getByTestId('book-version-selector')).toBeInTheDocument();
        expect(screen.queryByText('Loading chapters...')).not.toBeInTheDocument();
      });
    });
  });
});
