import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoherencePage from '../page';

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
  usePathname: vi.fn(() => '/projects/project-123/coherence'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock auth
vi.mock('../../../../lib/auth', () => ({
  getToken: vi.fn(() => 'mock-token-123'),
  logout: vi.fn(),
}));

// Mock constants
vi.mock('../../../../lib/constants', () => ({
  colors: {
    text: '#111',
    textSecondary: '#666',
    border: '#e5e5e5',
    surface: '#fff',
    brandLight: '#e0e7ff',
    brandBorder: '#c7d2fe',
    brandText: '#4f46e5',
    error: '#ef4444',
  },
  gradients: {
    brand: 'linear-gradient(to right, #6366f1, #8b5cf6)',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
}));

// Mock styles
vi.mock('../../../../lib/styles', () => ({
  card: {
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e5e5',
    padding: '1rem',
  },
}));

// Mock DashboardLayout
vi.mock('@/app/components/dashboard/DashboardLayout', () => ({
  default: ({ children, header, projectId }: { children: React.ReactNode; header: { title: string; subtitle: string }; projectId: string }) => (
    <div data-testid="dashboard-layout" data-project-id={projectId}>
      <header>
        <h1>{header.title}</h1>
        <p>{header.subtitle}</p>
      </header>
      <main>{children}</main>
    </div>
  ),
}));

// Mock LoadingState
vi.mock('../../../../components/shared/LoadingState', () => ({
  default: ({ message }: { message: string }) => (
    <div data-testid="loading-state">{message}</div>
  ),
}));

// Mock AIChangeResultModal
vi.mock('../../../../components/shared/AIChangeResultModal', () => ({
  default: ({ isOpen, title, explanation, changesMade, onClose }: any) => (
    isOpen ? (
      <div data-testid="ai-change-modal">
        <h2>{title}</h2>
        <p>{explanation}</p>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CoherencePage', () => {
  const mockProject = {
    id: 'project-123',
    title: 'Test Novel',
    genre: 'Fantasy',
    plot_structure: {
      plot_layers: [
        {
          id: 'layer-1',
          name: 'Main Plot',
          description: 'The hero journey',
          type: 'main',
          points: [{ id: 'point-1', chapter_number: 1, description: 'Intro', phase: 'setup', impact_level: 3 }],
        },
      ],
    },
  };

  const mockBooks = [
    {
      id: 'book-1',
      project_id: 'project-123',
      book_number: 1,
      title: 'Book One',
      chapter_count: 10,
    },
  ];

  const mockVersions = [
    {
      id: 'version-1',
      book_id: 'book-1',
      version_number: 1,
      version_name: 'First Draft',
      is_active: 0,
      word_count: 25000,
      chapter_count: 10,
      actual_chapter_count: 10,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'version-2',
      book_id: 'book-1',
      version_number: 2,
      version_name: 'Second Draft',
      is_active: 1,
      word_count: 30000,
      chapter_count: 12,
      actual_chapter_count: 12,
      created_at: '2024-02-01T00:00:00Z',
    },
  ];

  const mockPlotStructure = {
    plot_layers: [
      {
        id: 'layer-1',
        name: 'Main Plot',
        description: 'The hero journey',
        type: 'main',
        points: [
          { id: 'point-1', chapter_number: 1, description: 'Introduction', phase: 'setup', impact_level: 3 },
          { id: 'point-2', chapter_number: 5, description: 'Rising action', phase: 'rising', impact_level: 4 },
        ],
      },
      {
        id: 'layer-2',
        name: 'Romance Subplot',
        description: 'Love interest development',
        type: 'subplot',
        points: [
          { id: 'point-3', chapter_number: 2, description: 'Meet cute', phase: 'setup', impact_level: 2 },
        ],
      },
    ],
    act_structure: {
      act_one_end: 5,
      act_two_midpoint: 12,
      act_two_end: 20,
      act_three_climax: 23,
    },
  };

  const mockCoherenceResult = {
    status: 'completed',
    checkedAt: '2024-01-15T10:30:00Z',
    isCoherent: true,
    warnings: [],
    suggestions: [],
    plotAnalysis: [
      { plotName: 'Main Plot', isCoherent: true, reason: 'Well-structured arc' },
    ],
    versionId: 'version-2',
    activeVersionId: 'version-2',
  };

  const mockCoherenceResultWithIssues = {
    status: 'completed',
    checkedAt: '2024-01-15T10:30:00Z',
    isCoherent: false,
    warnings: ['Pacing issue in chapter 5', 'Character inconsistency detected'],
    suggestions: [
      { issue: 'Missing midpoint', remediation: 'Add a plot twist around chapter 12' },
      'Consider expanding the romance subplot',
    ],
    plotAnalysis: [
      { plotName: 'Main Plot', isCoherent: false, reason: 'Missing key beats' },
      { plotName: 'Romance Subplot', isCoherent: true, reason: 'Well developed' },
    ],
    versionId: 'version-2',
    activeVersionId: 'version-2',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
        return { ok: true, json: async () => mockProject };
      }
      if (url.includes('/api/projects/project-123/plot-structure')) {
        return { ok: true, json: async () => mockPlotStructure };
      }
      if (url.includes('/api/books/project/project-123')) {
        return { ok: true, json: async () => ({ books: mockBooks }) };
      }
      if (url.includes('/api/books/book-1/versions')) {
        return { ok: true, json: async () => ({ versions: mockVersions }) };
      }
      if (url.includes('/api/projects/project-123/coherence-check') && !url.includes('POST')) {
        return { ok: true, json: async () => mockCoherenceResult };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // Initial Loading Tests
  // =============================================================================
  describe('Initial Loading', () => {
    it('should show loading state initially', () => {
      render(<CoherencePage />);
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      expect(screen.getByText(/loading coherence analysis/i)).toBeInTheDocument();
    });

    it('should fetch project, plot structure, books, and versions on mount', async () => {
      render(<CoherencePage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/projects/project-123'),
          expect.any(Object)
        );
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/projects/project-123/plot-structure'),
          expect.any(Object)
        );
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/books/project/project-123'),
          expect.any(Object)
        );
      });
    });

    it('should fetch versions when books are loaded', async () => {
      render(<CoherencePage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/books/book-1/versions'),
          expect.any(Object)
        );
      });
    });

    it('should fetch coherence check status on mount', async () => {
      render(<CoherencePage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/projects/project-123/coherence-check'),
          expect.any(Object)
        );
      });
    });
  });

  // =============================================================================
  // Version Display Tests
  // =============================================================================
  describe('Version Display', () => {
    it('should display version selector when multiple versions exist', async () => {
      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Should show version selector with label
      expect(screen.getByText('Version:')).toBeInTheDocument();
    });

    it('should show active version as selected in dropdown', async () => {
      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Find the select element
      const versionSelect = screen.getByRole('combobox');
      expect(versionSelect).toHaveValue('version-2');
    });

    it('should display version name and chapter count in options', async () => {
      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Check that version options show relevant info
      expect(screen.getByText(/Second Draft.*Active.*12 chapters/)).toBeInTheDocument();
      expect(screen.getByText(/First Draft.*10 chapters/)).toBeInTheDocument();
    });

    it('should show helper text explaining version selector is disabled', async () => {
      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Coherence checks use the active version/i)).toBeInTheDocument();
    });

    it('should have version selector disabled since coherence uses active version', async () => {
      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const versionSelect = screen.getByRole('combobox');
      expect(versionSelect).toBeDisabled();
    });

    it('should show single version info bar when only one version exists', async () => {
      const singleVersion = [mockVersions[1]]; // Only the active version
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/projects/project-123/plot-structure')) {
          return { ok: true, json: async () => mockPlotStructure };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/books/book-1/versions')) {
          return { ok: true, json: async () => ({ versions: singleVersion }) };
        }
        if (url.includes('/api/projects/project-123/coherence-check')) {
          return { ok: true, json: async () => ({ ...mockCoherenceResult, activeVersionId: 'version-2' }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Should show version info without dropdown
      expect(screen.getByText(/Version:/)).toBeInTheDocument();
      expect(screen.getByText(/Second Draft.*12 chapters/)).toBeInTheDocument();

      // Should NOT have a select element (combobox)
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should not show version info when no versions exist', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/projects/project-123/plot-structure')) {
          return { ok: true, json: async () => mockPlotStructure };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/books/book-1/versions')) {
          return { ok: true, json: async () => ({ versions: [] }) };
        }
        if (url.includes('/api/projects/project-123/coherence-check')) {
          return { ok: true, json: async () => mockCoherenceResult };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Should not show version selector at all
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // Coherence Status Display Tests
  // =============================================================================
  describe('Coherence Status Display', () => {
    it('should display coherent status with success styling', async () => {
      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Coherence Status/)).toBeInTheDocument();
      expect(screen.getByText(/Your plots are coherent with your story concept/i)).toBeInTheDocument();
    });

    it('should show last checked timestamp', async () => {
      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Last checked:/)).toBeInTheDocument();
    });

    it('should display warnings when coherence check has issues', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/projects/project-123/plot-structure')) {
          return { ok: true, json: async () => mockPlotStructure };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/books/book-1/versions')) {
          return { ok: true, json: async () => ({ versions: mockVersions }) };
        }
        if (url.includes('/api/projects/project-123/coherence-check')) {
          return { ok: true, json: async () => mockCoherenceResultWithIssues };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Warnings \(2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Pacing issue in chapter 5/)).toBeInTheDocument();
      expect(screen.getByText(/Character inconsistency detected/)).toBeInTheDocument();
    });

    it('should display suggestions/recommendations when available', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/projects/project-123/plot-structure')) {
          return { ok: true, json: async () => mockPlotStructure };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/books/book-1/versions')) {
          return { ok: true, json: async () => ({ versions: mockVersions }) };
        }
        if (url.includes('/api/projects/project-123/coherence-check')) {
          return { ok: true, json: async () => mockCoherenceResultWithIssues };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Recommendations \(2 total\)/)).toBeInTheDocument();
      expect(screen.getByText(/Missing midpoint/)).toBeInTheDocument();
    });

    it('should display plot analysis results', async () => {
      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Plot Analysis')).toBeInTheDocument();
      // Use getAllByText since "Main Plot" appears in both summary and analysis sections
      const mainPlotElements = screen.getAllByText('Main Plot');
      expect(mainPlotElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Well-structured arc')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // No Coherence Check State Tests
  // =============================================================================
  describe('No Coherence Check State', () => {
    it('should show prompt to run check when no check exists', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/projects/project-123/plot-structure')) {
          return { ok: true, json: async () => mockPlotStructure };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/books/book-1/versions')) {
          return { ok: true, json: async () => ({ versions: mockVersions }) };
        }
        if (url.includes('/api/projects/project-123/coherence-check')) {
          return { ok: true, json: async () => ({ status: 'none', activeVersionId: 'version-2' }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/No coherence check available/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Run Check/i })).toBeInTheDocument();
    });
  });

  // =============================================================================
  // No Plot Layers State Tests
  // =============================================================================
  describe('No Plot Layers State', () => {
    it('should show warning when no plot layers exist', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/projects/project-123/plot-structure')) {
          return { ok: true, json: async () => ({ plot_layers: [] }) };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/books/book-1/versions')) {
          return { ok: true, json: async () => ({ versions: mockVersions }) };
        }
        if (url.includes('/api/projects/project-123/coherence-check')) {
          return { ok: true, json: async () => ({ status: 'none' }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/No Plot Layers Found/i)).toBeInTheDocument();
      expect(screen.getByText(/Create plot layers on the Plot page/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Go to Plot Page/i })).toBeInTheDocument();
    });

    it('should navigate to plot page when button clicked', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/projects/project-123/plot-structure')) {
          return { ok: true, json: async () => ({ plot_layers: [] }) };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/books/book-1/versions')) {
          return { ok: true, json: async () => ({ versions: mockVersions }) };
        }
        if (url.includes('/api/projects/project-123/coherence-check')) {
          return { ok: true, json: async () => ({ status: 'none' }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      const user = userEvent.setup();
      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const goToPlotButton = screen.getByRole('button', { name: /Go to Plot Page/i });
      await user.click(goToPlotButton);

      expect(mockPush).toHaveBeenCalledWith('/projects/project-123/plot');
    });
  });

  // =============================================================================
  // Plot Structure Summary Tests
  // =============================================================================
  describe('Plot Structure Summary', () => {
    it('should display plot structure summary with counts', async () => {
      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Plot Structure Summary/i)).toBeInTheDocument();
      // Use getAllByText since "Main Plot" appears in both summary and analysis sections
      const mainPlotElements = screen.getAllByText(/Main Plot/);
      expect(mainPlotElements.length).toBeGreaterThanOrEqual(1);
      // Check for subplot count indicator (the number badge)
      expect(screen.getByText(/Subplot/)).toBeInTheDocument();
    });

    it('should show total plot points count', async () => {
      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Total Plot Point/)).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Run Coherence Check Tests
  // =============================================================================
  describe('Run Coherence Check', () => {
    it('should trigger coherence check when Run Check button clicked', async () => {
      mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/projects/project-123/plot-structure')) {
          return { ok: true, json: async () => mockPlotStructure };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/books/book-1/versions')) {
          return { ok: true, json: async () => ({ versions: mockVersions }) };
        }
        if (url.includes('/api/projects/project-123/coherence-check')) {
          if (options?.method === 'POST') {
            return { ok: true, json: async () => ({ success: true, jobId: 'job-123' }) };
          }
          return { ok: true, json: async () => ({ status: 'none', activeVersionId: 'version-2' }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      const user = userEvent.setup();
      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const runCheckButton = screen.getByRole('button', { name: /Run Check/i });
      await user.click(runCheckButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/projects/project-123/coherence-check'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('should show checking state while coherence check is running', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/projects/project-123/plot-structure')) {
          return { ok: true, json: async () => mockPlotStructure };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/books/book-1/versions')) {
          return { ok: true, json: async () => ({ versions: mockVersions }) };
        }
        if (url.includes('/api/projects/project-123/coherence-check')) {
          return { ok: true, json: async () => ({ status: 'running', activeVersionId: 'version-2' }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Coherence check in progress/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Checking.../i })).toBeDisabled();
    });
  });

  // =============================================================================
  // Version Consistency Tests
  // =============================================================================
  describe('Version Consistency', () => {
    it('should use activeVersionId from coherence check response', async () => {
      const customCoherenceResult = {
        ...mockCoherenceResult,
        activeVersionId: 'version-2',
        versionId: 'version-2',
      };

      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/projects/project-123/plot-structure')) {
          return { ok: true, json: async () => mockPlotStructure };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/books/book-1/versions')) {
          return { ok: true, json: async () => ({ versions: mockVersions }) };
        }
        if (url.includes('/api/projects/project-123/coherence-check')) {
          return { ok: true, json: async () => customCoherenceResult };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Version selector should show version-2 as active
      const versionSelect = screen.getByRole('combobox');
      expect(versionSelect).toHaveValue('version-2');
    });

    it('should show correct version when coherence result is from a different version than active', async () => {
      // This tests the case where the cached coherence result might be from an older version
      const customCoherenceResult = {
        ...mockCoherenceResult,
        activeVersionId: 'version-2',
        versionId: 'version-1', // Result is from version 1, but active is version 2
      };

      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/projects/project-123/plot-structure')) {
          return { ok: true, json: async () => mockPlotStructure };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/books/book-1/versions')) {
          return { ok: true, json: async () => ({ versions: mockVersions }) };
        }
        if (url.includes('/api/projects/project-123/coherence-check')) {
          return { ok: true, json: async () => customCoherenceResult };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // The version selector should still show the active version from backend response
      const versionSelect = screen.getByRole('combobox');
      expect(versionSelect).toHaveValue('version-2');
    });

    it('should show stale results warning when coherence result is from a different version', async () => {
      // This tests the case where the cached coherence result might be from an older version
      const customCoherenceResult = {
        ...mockCoherenceResult,
        activeVersionId: 'version-2',
        versionId: 'version-1', // Result is from version 1, but active is version 2
      };

      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/projects/project-123/plot-structure')) {
          return { ok: true, json: async () => mockPlotStructure };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/books/book-1/versions')) {
          return { ok: true, json: async () => ({ versions: mockVersions }) };
        }
        if (url.includes('/api/projects/project-123/coherence-check')) {
          return { ok: true, json: async () => customCoherenceResult };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Should show stale results warning
      expect(screen.getByText(/Stale Results:/i)).toBeInTheDocument();
      expect(screen.getByText(/This coherence check was run on a previous version/i)).toBeInTheDocument();
    });

    it('should not show stale results warning when coherence result matches active version', async () => {
      // Result is from the same version as active
      const matchingCoherenceResult = {
        ...mockCoherenceResult,
        activeVersionId: 'version-2',
        versionId: 'version-2',
      };

      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/projects/project-123/plot-structure')) {
          return { ok: true, json: async () => mockPlotStructure };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/books/book-1/versions')) {
          return { ok: true, json: async () => ({ versions: mockVersions }) };
        }
        if (url.includes('/api/projects/project-123/coherence-check')) {
          return { ok: true, json: async () => matchingCoherenceResult };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      // Should NOT show stale results warning
      expect(screen.queryByText(/Stale Results:/i)).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================
  describe('Error Handling', () => {
    it('should display error when project fetch fails', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: false, status: 500, json: async () => ({ error: 'Server error' }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Failed to load project/i)).toBeInTheDocument();
    });

    it('should display error when coherence check fails', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/projects/project-123') && !url.includes('coherence') && !url.includes('plot-structure')) {
          return { ok: true, json: async () => mockProject };
        }
        if (url.includes('/api/projects/project-123/plot-structure')) {
          return { ok: true, json: async () => mockPlotStructure };
        }
        if (url.includes('/api/books/project/project-123')) {
          return { ok: true, json: async () => ({ books: mockBooks }) };
        }
        if (url.includes('/api/books/book-1/versions')) {
          return { ok: true, json: async () => ({ versions: mockVersions }) };
        }
        if (url.includes('/api/projects/project-123/coherence-check')) {
          return { ok: true, json: async () => ({ status: 'failed', error: 'AI service unavailable' }) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/AI service unavailable/i)).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Navigation Tests
  // =============================================================================
  describe('Navigation', () => {
    it('should navigate to plot page when back button clicked', async () => {
      const user = userEvent.setup();
      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /Back to Plot/i });
      await user.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/projects/project-123/plot');
    });

    it('should navigate to originality page when continue button clicked', async () => {
      const user = userEvent.setup();
      render(<CoherencePage />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /Continue to Originality/i });
      await user.click(continueButton);

      expect(mockPush).toHaveBeenCalledWith('/projects/project-123/originality');
    });
  });
});
