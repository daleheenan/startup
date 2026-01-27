import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GenreBlender from '../GenreBlender';

const mockAvailableGenres = [
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'science-fiction', label: 'Science Fiction' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'romance', label: 'Romance' },
  { value: 'horror', label: 'Horror' },
];

const mockAvailableSubgenres = {
  fantasy: ['High Fantasy', 'Urban Fantasy', 'Dark Fantasy'],
  'science-fiction': ['Space Opera', 'Cyberpunk', 'Hard SF'],
  mystery: ['Detective', 'Cozy Mystery', 'Police Procedural'],
  romance: ['Contemporary', 'Historical', 'Paranormal'],
};

describe('GenreBlender', () => {
  const mockOnBlendComplete = vi.fn();

  beforeEach(() => {
    mockOnBlendComplete.mockClear();
  });

  describe('Initial Rendering', () => {
    it('should render component with header and description', () => {
      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      expect(screen.getByText('Genre Blending Tool')).toBeInTheDocument();
      expect(
        screen.getByText(/Combine 2-3 genres to create unique hybrid stories/)
      ).toBeInTheDocument();
    });

    it('should render all available genres as buttons', () => {
      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      mockAvailableGenres.forEach((genre) => {
        expect(screen.getByText(genre.label)).toBeInTheDocument();
      });
    });

    it('should show info message when no genres selected', () => {
      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      expect(
        screen.getByText('Select 2-3 genres above to see how they blend together')
      ).toBeInTheDocument();
    });
  });

  describe('Genre Selection', () => {
    it('should allow selecting a genre', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      const fantasyButton = screen.getByText('Fantasy');
      await user.click(fantasyButton);

      // Should show prompt for one more genre
      expect(
        screen.getByText('Select at least one more genre to create a blend')
      ).toBeInTheDocument();
    });

    it('should allow deselecting a genre', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      const fantasyButton = screen.getByText('Fantasy');
      await user.click(fantasyButton);
      await user.click(fantasyButton); // Deselect

      expect(
        screen.getByText('Select 2-3 genres above to see how they blend together')
      ).toBeInTheDocument();
    });

    it('should generate blend when 2 genres are selected', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Fantasy'));
      await user.click(screen.getByText('Romance'));

      await waitFor(() => {
        expect(screen.getByText('Fantasy + Romance')).toBeInTheDocument();
      });
    });

    it('should limit selection to 3 genres maximum', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Fantasy'));
      await user.click(screen.getByText('Romance'));
      await user.click(screen.getByText('Mystery'));

      // Fourth genre button should be disabled
      const horrorButton = screen.getByText('Horror');
      expect(horrorButton).toHaveStyle({ opacity: '0.5' });
    });
  });

  describe('Blended Genre Display', () => {
    it('should display compatibility score', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Fantasy'));
      await user.click(screen.getByText('Romance'));

      await waitFor(() => {
        expect(screen.getByText(/Compatibility:/)).toBeInTheDocument();
        // Fantasy + Romance has 0.9 compatibility (90%)
        expect(screen.getByText(/90%/)).toBeInTheDocument();
      });
    });

    it('should display compatibility label as Excellent for high scores', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Fantasy'));
      await user.click(screen.getByText('Romance'));

      await waitFor(() => {
        expect(screen.getByText(/Excellent/)).toBeInTheDocument();
      });
    });

    it('should display merged subgenres', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Fantasy'));
      await user.click(screen.getByText('Science Fiction'));

      await waitFor(() => {
        expect(screen.getByText('Suggested Subgenres for This Blend:')).toBeInTheDocument();
        // Should show subgenres from both genres
        expect(screen.getByText('High Fantasy')).toBeInTheDocument();
        expect(screen.getByText('Space Opera')).toBeInTheDocument();
      });
    });

    it('should display writing recommendations', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Fantasy'));
      await user.click(screen.getByText('Romance'));

      await waitFor(() => {
        expect(screen.getByText('Writing Recommendations:')).toBeInTheDocument();
        expect(
          screen.getByText(/Focus on character relationships within magical settings/)
        ).toBeInTheDocument();
      });
    });

    it('should show description based on compatibility score', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Fantasy'));
      await user.click(screen.getByText('Romance'));

      await waitFor(() => {
        expect(
          screen.getByText(/A highly compatible blend of Fantasy and Romance/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Apply Blend', () => {
    it('should call onBlendComplete when Apply button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Fantasy'));
      await user.click(screen.getByText('Romance'));

      await waitFor(() => {
        expect(screen.getByText('Apply This Genre Blend')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Apply This Genre Blend'));

      expect(mockOnBlendComplete).toHaveBeenCalledTimes(1);
      expect(mockOnBlendComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fantasy + Romance',
          compatibilityScore: expect.any(Number),
          subgenres: expect.any(Array),
          recommendations: expect.any(Array),
        })
      );
    });

    it('should include correct data in blend callback', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Mystery'));
      await user.click(screen.getByText('Thriller'));

      await waitFor(() => {
        expect(screen.getByText('Mystery + Thriller')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Apply This Genre Blend'));

      const callArg = mockOnBlendComplete.mock.calls[0][0];
      expect(callArg.name).toBe('Mystery + Thriller');
      expect(callArg.compatibilityScore).toBeGreaterThan(0.9); // High compatibility
      expect(callArg.subgenres.length).toBeGreaterThan(0);
      expect(callArg.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('should disable buttons when isLoading is true', () => {
      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
          isLoading={true}
        />
      );

      const fantasyButton = screen.getByText('Fantasy');
      expect(fantasyButton).toBeDisabled();
    });

    it('should disable apply button when isLoading is true', async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Fantasy'));
      await user.click(screen.getByText('Romance'));

      await waitFor(() => {
        expect(screen.getByText('Apply This Genre Blend')).toBeInTheDocument();
      });

      rerender(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
          isLoading={true}
        />
      );

      const applyButton = screen.getByText('Apply This Genre Blend');
      expect(applyButton).toBeDisabled();
    });
  });

  describe('Three Genre Blends', () => {
    it('should generate blend with 3 genres', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Fantasy'));
      await user.click(screen.getByText('Romance'));
      await user.click(screen.getByText('Mystery'));

      await waitFor(() => {
        expect(screen.getByText('Fantasy + Romance + Mystery')).toBeInTheDocument();
      });
    });

    it('should show 3-genre specific recommendations', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Fantasy'));
      await user.click(screen.getByText('Romance'));
      await user.click(screen.getByText('Mystery'));

      await waitFor(() => {
        expect(
          screen.getByText(/With three genres, consider making one a subtle influence/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Compatibility Calculations', () => {
    it('should show Good compatibility for moderate scores', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Fantasy'));
      await user.click(screen.getByText('Mystery'));

      await waitFor(() => {
        // Fantasy + Mystery has 0.7 compatibility
        expect(screen.getByText(/Good/)).toBeInTheDocument();
      });
    });

    it('should generate appropriate description for lower compatibility', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Romance'));
      await user.click(screen.getByText('Thriller'));

      await waitFor(() => {
        // Romance + Thriller has 0.6 compatibility - should show recommendations for lower compatibility
        const description = screen.getByText(/Clearly define which genre conventions/);
        expect(description).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      mockAvailableGenres.forEach((genre) => {
        const button = screen.getByText(genre.label);
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('should have proper form labels', () => {
      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      expect(screen.getByText('Select Genres to Blend (2-3)')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty genre list gracefully', () => {
      render(
        <GenreBlender
          availableGenres={[]}
          availableSubgenres={{}}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      expect(screen.getByText('Genre Blending Tool')).toBeInTheDocument();
    });

    it('should handle genre with no subgenres', async () => {
      const user = userEvent.setup();
      const singleGenre = [{ value: 'test1', label: 'Test1' }, { value: 'test2', label: 'Test2' }];

      render(
        <GenreBlender
          availableGenres={singleGenre}
          availableSubgenres={{}}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Test1'));
      await user.click(screen.getByText('Test2'));

      await waitFor(() => {
        expect(screen.getByText('Test1 + Test2')).toBeInTheDocument();
      });
    });

    it('should update blend when selection changes', async () => {
      const user = userEvent.setup();

      render(
        <GenreBlender
          availableGenres={mockAvailableGenres}
          availableSubgenres={mockAvailableSubgenres}
          onBlendComplete={mockOnBlendComplete}
        />
      );

      await user.click(screen.getByText('Fantasy'));
      await user.click(screen.getByText('Romance'));

      await waitFor(() => {
        expect(screen.getByText('Fantasy + Romance')).toBeInTheDocument();
      });

      // Change selection
      await user.click(screen.getByText('Romance')); // Deselect
      await user.click(screen.getByText('Mystery')); // Select new

      await waitFor(() => {
        expect(screen.getByText('Fantasy + Mystery')).toBeInTheDocument();
      });
    });
  });
});
