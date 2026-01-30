import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TropeSelector, { type GenreTrope, type TropeSelection } from '../TropeSelector';

const mockTropes: GenreTrope[] = [
  {
    id: 'trope-1',
    trope_name: 'Chosen One',
    description: 'Protagonist is destined to save the world',
    genre: 'fantasy',
    trope_type: 'character',
    usage_frequency: 'common',
    examples: ['Harry Potter', 'Neo from The Matrix'],
    subversions: ['The prophecy was wrong', 'Multiple "chosen ones"'],
  },
  {
    id: 'trope-2',
    trope_name: 'Love Triangle',
    description: 'Three people in a romantic entanglement',
    genre: 'romance',
    trope_type: 'relationship',
    usage_frequency: 'common',
    examples: ['Twilight', 'Hunger Games'],
  },
  {
    id: 'trope-3',
    trope_name: 'Locked Room Mystery',
    description: 'Murder in an impossible location',
    genre: 'mystery',
    trope_type: 'plot',
    usage_frequency: 'moderate',
  },
  {
    id: 'trope-4',
    trope_name: 'Dystopian Future',
    description: 'Society has collapsed into oppressive rule',
    genre: 'science-fiction',
    trope_type: 'setting',
    usage_frequency: 'common',
  },
  {
    id: 'trope-5',
    trope_name: 'Moral Dilemma',
    description: 'Character must choose between two bad options',
    genre: 'literary',
    trope_type: 'theme',
    usage_frequency: 'rare',
  },
];

describe('TropeSelector', () => {
  const mockOnTropesChange = vi.fn();

  beforeEach(() => {
    mockOnTropesChange.mockClear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should show message when no genres selected', () => {
      render(
        <TropeSelector
          genres={[]}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      expect(screen.getByText('Select genres above to see available tropes')).toBeInTheDocument();
    });

    it('should show loading state when fetching tropes', async () => {
      (global.fetch as any).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true, json: () => ({ tropes: mockTropes }) }), 100)
          )
      );

      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      expect(screen.getByText('Loading tropes...')).toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.queryByText('Loading tropes...')).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should fetch tropes when genres are provided', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ tropes: mockTropes }),
      });

      render(
        <TropeSelector
          genres={['fantasy', 'romance']}
          subgenres={['high-fantasy']}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/genre-tropes/recommended'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ genres: ['fantasy', 'romance'], subgenres: ['high-fantasy'] }),
          })
        );
      });
    });

    it('should display error when fetch fails', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load tropes. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Trope Display', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ tropes: mockTropes }),
      });
    });

    it('should display all fetched tropes', async () => {
      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chosen One')).toBeInTheDocument();
        expect(screen.getByText('Love Triangle')).toBeInTheDocument();
        expect(screen.getByText('Locked Room Mystery')).toBeInTheDocument();
      });
    });

    it('should display trope descriptions', async () => {
      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText('Protagonist is destined to save the world')
        ).toBeInTheDocument();
      });
    });

    it('should display usage frequency badges', async () => {
      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        const badges = screen.getAllByText('common');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('should group tropes by type', async () => {
      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/character Tropes/)).toBeInTheDocument();
        expect(screen.getByText(/plot Tropes/)).toBeInTheDocument();
        expect(screen.getByText(/relationship Tropes/)).toBeInTheDocument();
      });
    });

    it('should display trope count per type', async () => {
      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/character Tropes \(1\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Trope Selection', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ tropes: mockTropes }),
      });
    });

    it('should call onTropesChange when Include is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chosen One')).toBeInTheDocument();
      });

      const includeButtons = screen.getAllByText('Include');
      await user.click(includeButtons[0]);

      expect(mockOnTropesChange).toHaveBeenCalledWith([
        { tropeId: 'trope-1', preference: 'include' },
      ]);
    });

    it('should call onTropesChange when Exclude is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chosen One')).toBeInTheDocument();
      });

      const excludeButtons = screen.getAllByText('Exclude');
      await user.click(excludeButtons[0]);

      expect(mockOnTropesChange).toHaveBeenCalledWith([
        { tropeId: 'trope-1', preference: 'exclude' },
      ]);
    });

    it('should call onTropesChange when Subvert is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chosen One')).toBeInTheDocument();
      });

      const subvertButtons = screen.getAllByText('Subvert');
      await user.click(subvertButtons[0]);

      expect(mockOnTropesChange).toHaveBeenCalledWith([
        { tropeId: 'trope-1', preference: 'subvert' },
      ]);
    });

    it('should deselect trope when clicking same preference again', async () => {
      const user = userEvent.setup();
      const existingSelection: TropeSelection[] = [{ tropeId: 'trope-1', preference: 'include' }];

      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={existingSelection}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chosen One')).toBeInTheDocument();
      });

      const includeButtons = screen.getAllByText('Include');
      await user.click(includeButtons[0]);

      expect(mockOnTropesChange).toHaveBeenCalledWith([]);
    });

    it('should update preference when clicking different preference', async () => {
      const user = userEvent.setup();
      const existingSelection: TropeSelection[] = [{ tropeId: 'trope-1', preference: 'include' }];

      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={existingSelection}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chosen One')).toBeInTheDocument();
      });

      const excludeButtons = screen.getAllByText('Exclude');
      await user.click(excludeButtons[0]);

      expect(mockOnTropesChange).toHaveBeenCalledWith([
        { tropeId: 'trope-1', preference: 'exclude' },
      ]);
    });

    it('should visually highlight selected tropes', async () => {
      const existingSelection: TropeSelection[] = [{ tropeId: 'trope-1', preference: 'include' }];

      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={existingSelection}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        const includeButtons = screen.getAllByText('Include');
        // First Include button should have green background
        expect(includeButtons[0]).toHaveStyle({ background: '#10B981' });
      });
    });
  });

  describe('Type Filtering', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ tropes: mockTropes }),
      });
    });

    it('should show all types filter by default', async () => {
      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('All Types')).toBeInTheDocument();
      });
    });

    it('should filter tropes by character type', async () => {
      const user = userEvent.setup();

      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chosen One')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Character/i }));

      // Should only show character tropes
      expect(screen.getByText('Chosen One')).toBeInTheDocument();
      expect(screen.queryByText('Love Triangle')).not.toBeInTheDocument();
    });

    it('should filter tropes by plot type', async () => {
      const user = userEvent.setup();

      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Locked Room Mystery')).toBeInTheDocument();
      });

      await user.click(screen.getByText(/Plot/));

      expect(screen.getByText('Locked Room Mystery')).toBeInTheDocument();
      expect(screen.queryByText('Chosen One')).not.toBeInTheDocument();
    });
  });

  describe('Expand/Collapse Details', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ tropes: mockTropes }),
      });
    });

    it('should show Show More button by default', async () => {
      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        const showMoreButtons = screen.getAllByText('Show More');
        expect(showMoreButtons.length).toBeGreaterThan(0);
      });
    });

    it('should expand to show examples when Show More clicked', async () => {
      const user = userEvent.setup();

      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chosen One')).toBeInTheDocument();
      });

      const showMoreButtons = screen.getAllByText('Show More');
      await user.click(showMoreButtons[0]);

      expect(screen.getByText('Examples:')).toBeInTheDocument();
      expect(screen.getByText('Harry Potter')).toBeInTheDocument();
    });

    it('should show subversions when expanded', async () => {
      const user = userEvent.setup();

      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chosen One')).toBeInTheDocument();
      });

      const showMoreButtons = screen.getAllByText('Show More');
      await user.click(showMoreButtons[0]);

      expect(screen.getByText('Ways to Subvert:')).toBeInTheDocument();
      expect(screen.getByText('The prophecy was wrong')).toBeInTheDocument();
    });

    it('should collapse when Show Less clicked', async () => {
      const user = userEvent.setup();

      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chosen One')).toBeInTheDocument();
      });

      const showMoreButtons = screen.getAllByText('Show More');
      await user.click(showMoreButtons[0]);

      expect(screen.getByText('Examples:')).toBeInTheDocument();

      await user.click(screen.getByText('Show Less'));

      expect(screen.queryByText('Examples:')).not.toBeInTheDocument();
    });
  });

  describe('Summary Display', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ tropes: mockTropes }),
      });
    });

    it('should show summary when tropes are selected', async () => {
      const selections: TropeSelection[] = [
        { tropeId: 'trope-1', preference: 'include' },
        { tropeId: 'trope-2', preference: 'exclude' },
        { tropeId: 'trope-3', preference: 'subvert' },
      ];

      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={selections}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Selected: 3 tropes')).toBeInTheDocument();
        expect(screen.getByText(/Include: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Exclude: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Subvert: 1/)).toBeInTheDocument();
      });
    });

    it('should not show summary when no tropes selected', async () => {
      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chosen One')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ tropes: mockTropes }),
      });
    });

    it('should disable all buttons when isLoading is true', async () => {
      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
          isLoading={true}
        />
      );

      await waitFor(() => {
        const includeButtons = screen.getAllByText('Include');
        includeButtons.forEach((button) => {
          expect(button).toBeDisabled();
        });
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ tropes: mockTropes }),
      });
    });

    it('should have descriptive help text', async () => {
      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Select tropes to include, exclude, or subvert in your story/)
        ).toBeInTheDocument();
      });
    });

    it('should have legend explaining preferences', async () => {
      render(
        <TropeSelector
          genres={['fantasy']}
          subgenres={[]}
          selectedTropes={[]}
          onTropesChange={mockOnTropesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Include:/)).toBeInTheDocument();
        expect(screen.getByText(/Exclude:/)).toBeInTheDocument();
        expect(screen.getByText(/Subvert:/)).toBeInTheDocument();
      });
    });
  });
});
