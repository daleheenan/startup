import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SeriesManagementPage from '../page';

// Mock modules
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ id: 'project-123' })),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
}));

vi.mock('../../../../lib/auth', () => ({
  getToken: vi.fn(() => 'mock-token-123'),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SeriesManagementPage', () => {
  const mockBooks = [
    {
      id: 'book-1',
      book_number: 1,
      title: 'The Beginning',
      status: 'completed',
      word_count: 80000,
      ending_state: { characters: [], world: [] },
      book_summary: 'First book in the series',
    },
    {
      id: 'book-2',
      book_number: 2,
      title: 'The Middle',
      status: 'in_progress',
      word_count: 45000,
      ending_state: null,
      book_summary: 'Second book in the series',
    },
    {
      id: 'book-3',
      book_number: 3,
      title: 'The End',
      status: 'draft',
      word_count: 12000,
      ending_state: null,
      book_summary: null,
    },
  ];

  const mockSeriesBible = {
    characters: [
      {
        characterId: 'char-1',
        name: 'Alice',
        role: 'Protagonist',
        firstAppearance: { bookNumber: 1, chapterNumber: 1 },
        lastAppearance: { bookNumber: 3, chapterNumber: 15 },
        status: 'alive' as const,
        development: [
          { bookNumber: 1, changes: ['Discovers magical powers'] },
          { bookNumber: 2, changes: ['Learns to control powers', 'Faces betrayal'] },
        ],
      },
      {
        characterId: 'char-2',
        name: 'Bob',
        role: 'Antagonist',
        firstAppearance: { bookNumber: 1, chapterNumber: 5 },
        lastAppearance: { bookNumber: 2, chapterNumber: 20 },
        status: 'dead' as const,
        development: [
          { bookNumber: 1, changes: ['Introduced as mentor'] },
          { bookNumber: 2, changes: ['Revealed as villain', 'Defeated by protagonist'] },
        ],
      },
    ],
    world: [],
    timeline: [
      {
        bookNumber: 1,
        startDate: 'Year 1, Day 1',
        endDate: 'Year 1, Day 100',
        timespan: '100 days',
        majorEvents: ['Discovery of powers', 'First battle'],
      },
      {
        bookNumber: 2,
        startDate: 'Year 2, Day 1',
        endDate: 'Year 2, Day 150',
        timespan: '150 days',
        majorEvents: ['Training montage', 'Betrayal revealed', 'Final confrontation'],
      },
    ],
    themes: ['Power and responsibility', 'Betrayal', 'Redemption'],
    mysteries: [
      {
        id: 'mystery-1',
        question: 'Who killed Alice\'s parents?',
        introducedInBook: 1,
        answeredInBook: 2,
        answer: 'Bob was the murderer',
      },
      {
        id: 'mystery-2',
        question: 'What is the source of the magical powers?',
        introducedInBook: 1,
        answeredInBook: null,
        answer: null,
      },
    ],
  };

  const mockTransitions = [
    {
      id: 'trans-1',
      from_book_id: 'book-1',
      to_book_id: 'book-2',
      time_gap: '1 year',
      gap_summary: 'Alice trained in isolation',
      character_changes: [
        {
          characterId: 'char-1',
          characterName: 'Alice',
          changes: ['Became more confident', 'Mastered basic spells'],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading state initially', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<SeriesManagementPage />);

    expect(screen.getByText(/Loading series data/i)).toBeInTheDocument();
  });

  it('should fetch and render book list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ books: mockBooks }),
    });
    mockFetch.mockResolvedValueOnce({ ok: false }); // series bible
    mockFetch.mockResolvedValueOnce({ ok: false }); // transitions

    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Book 1: The Beginning')).toBeInTheDocument();
      expect(screen.getByText('Book 2: The Middle')).toBeInTheDocument();
      expect(screen.getByText('Book 3: The End')).toBeInTheDocument();
    });
  });

  it('should display word counts for books', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ books: mockBooks }),
    });
    mockFetch.mockResolvedValueOnce({ ok: false });
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/80,000/)).toBeInTheDocument();
      expect(screen.getByText(/45,000/)).toBeInTheDocument();
      expect(screen.getByText(/12,000/)).toBeInTheDocument();
    });
  });

  it('should show ending state indicator for books that have it', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ books: mockBooks }),
    });
    mockFetch.mockResolvedValueOnce({ ok: false });
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/Ending state captured/i)).toBeInTheDocument();
    });
  });

  it('should render series bible when available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ books: mockBooks }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSeriesBible,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transitions: mockTransitions }),
    });

    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/Series Bible Generated/i)).toBeInTheDocument();
    });
  });

  it('should display character count from series bible', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ books: mockBooks }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSeriesBible,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transitions: [] }),
    });

    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 characters
      expect(screen.getByText('Characters')).toBeInTheDocument();
    });
  });

  it('should handle tab switching', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ books: mockBooks }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSeriesBible,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transitions: [] }),
    });

    const user = userEvent.setup();
    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Book 1: The Beginning')).toBeInTheDocument();
    });

    // Click on Character Arcs tab
    const characterTab = screen.getByRole('button', { name: /Character Arcs/i });
    await user.click(characterTab);

    await waitFor(() => {
      expect(screen.getByText('Character Development Across Series')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('should display character status badges', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ books: mockBooks }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSeriesBible,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transitions: [] }),
    });

    const user = userEvent.setup();
    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Book 1: The Beginning')).toBeInTheDocument();
    });

    const characterTab = screen.getByRole('button', { name: /Character Arcs/i });
    await user.click(characterTab);

    await waitFor(() => {
      const statusBadges = screen.getAllByText(/alive|dead/i);
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  it('should show timeline tab content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ books: mockBooks }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSeriesBible,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transitions: [] }),
    });

    const user = userEvent.setup();
    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Book 1: The Beginning')).toBeInTheDocument();
    });

    const timelineTab = screen.getByRole('button', { name: /Timeline/i });
    await user.click(timelineTab);

    await waitFor(() => {
      expect(screen.getByText('Series Timeline')).toBeInTheDocument();
      expect(screen.getByText(/100 days/)).toBeInTheDocument();
      expect(screen.getByText(/150 days/)).toBeInTheDocument();
    });
  });

  it('should show mysteries tab content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ books: mockBooks }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSeriesBible,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transitions: [] }),
    });

    const user = userEvent.setup();
    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Book 1: The Beginning')).toBeInTheDocument();
    });

    const mysteriesTab = screen.getByRole('button', { name: /Mysteries/i });
    await user.click(mysteriesTab);

    await waitFor(() => {
      expect(screen.getByText('Plot Threads & Mysteries')).toBeInTheDocument();
      expect(screen.getByText(/Who killed Alice's parents/)).toBeInTheDocument();
      expect(screen.getByText(/What is the source of the magical powers/)).toBeInTheDocument();
    });
  });

  it('should display mystery status (Resolved/Open)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ books: mockBooks }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSeriesBible,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transitions: [] }),
    });

    const user = userEvent.setup();
    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Book 1: The Beginning')).toBeInTheDocument();
    });

    const mysteriesTab = screen.getByRole('button', { name: /Mysteries/i });
    await user.click(mysteriesTab);

    await waitFor(() => {
      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.getByText('Open')).toBeInTheDocument();
    });
  });

  it('should handle generate series bible action', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ books: mockBooks }) })
      .mockResolvedValueOnce({ ok: false }) // No series bible initially
      .mockResolvedValueOnce({ ok: true, json: async () => ({ transitions: [] }) });

    const user = userEvent.setup();
    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/Generate Series Bible/i)).toBeInTheDocument();
    });

    // Mock POST request for generating series bible
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSeriesBible,
    });

    const generateButton = screen.getByRole('button', { name: /Generate series bible/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trilogy/projects/project-123/series-bible'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('should show "Not a Series Project" when less than 2 books', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ books: [mockBooks[0]] }), // Only 1 book
    });
    mockFetch.mockResolvedValueOnce({ ok: false });
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/Not a Series Project/i)).toBeInTheDocument();
      expect(screen.getByText(/This project currently has 1 book/i)).toBeInTheDocument();
    });
  });

  it('should display transition time gap between books', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ books: mockBooks }),
    });
    mockFetch.mockResolvedValueOnce({ ok: false });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transitions: mockTransitions }),
    });

    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/Time gap: 1 year/i)).toBeInTheDocument();
    });
  });

  it('should show generate transition button when no transition exists', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ books: mockBooks }),
    });
    mockFetch.mockResolvedValueOnce({ ok: false });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transitions: [] }), // No transitions
    });

    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/Generate Transition to Book 2/i)).toBeInTheDocument();
    });
  });

  it('should handle errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('should disable ending state button when generating', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ books: mockBooks }) })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ transitions: [] }) });

    const user = userEvent.setup();
    render(<SeriesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Book 2: The Middle')).toBeInTheDocument();
    });

    // Mock POST for ending state generation
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const buttons = screen.getAllByRole('button', { name: /Generate Ending State/i });
    const generateButton = buttons.find(btn =>
      btn.closest('div')?.textContent?.includes('Book 2')
    );

    if (generateButton) {
      await user.click(generateButton);

      await waitFor(() => {
        expect(generateButton).toBeDisabled();
      });
    }
  });
});
