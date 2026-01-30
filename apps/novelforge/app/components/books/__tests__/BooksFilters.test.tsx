import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BooksFilters, { type BookFilters } from '../BooksFilters';

// Mock PUBLICATION_STATUSES constant
vi.mock('@/app/lib/book-data', () => ({
  PUBLICATION_STATUSES: [
    { value: 'draft', label: 'Draft' },
    { value: 'beta_readers', label: 'Beta Readers' },
    { value: 'editing', label: 'Editing' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'published', label: 'Published' },
  ],
}));

describe('BooksFilters', () => {
  const mockPenNames = ['Jane Austen', 'Agatha Christie', 'Virginia Woolf'];
  const mockGenres = ['Mystery', 'Romance', 'Thriller', 'Science Fiction'];
  const mockOnChange = vi.fn();

  const defaultFilters: BookFilters = {
    penName: undefined,
    statuses: [],
    genre: undefined,
    search: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render all filter controls', () => {
      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      expect(screen.getByLabelText('Filter by pen name')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by genre')).toBeInTheDocument();
      expect(screen.getByLabelText('Search books')).toBeInTheDocument();
    });

    it('should show "All Pen Names" as default option', () => {
      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const penNameSelect = screen.getByLabelText('Filter by pen name') as HTMLSelectElement;
      expect(penNameSelect.value).toBe('');
      expect(screen.getByText('All Pen Names')).toBeInTheDocument();
    });

    it('should show "All Statuses" when no statuses selected', () => {
      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      expect(screen.getByText('All Statuses')).toBeInTheDocument();
    });

    it('should show "All Genres" as default option', () => {
      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const genreSelect = screen.getByLabelText('Filter by genre') as HTMLSelectElement;
      expect(genreSelect.value).toBe('');
      expect(screen.getByText('All Genres')).toBeInTheDocument();
    });

    it('should render all pen name options', () => {
      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      mockPenNames.forEach((penName) => {
        expect(screen.getByText(penName)).toBeInTheDocument();
      });
    });

    it('should render all genre options', () => {
      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      mockGenres.forEach((genre) => {
        expect(screen.getByText(genre)).toBeInTheDocument();
      });
    });
  });

  describe('Pen Name Filter', () => {
    it('should call onChange when pen name is selected', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const penNameSelect = screen.getByLabelText('Filter by pen name');
      await user.selectOptions(penNameSelect, 'Jane Austen');

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        penName: 'Jane Austen',
      });
    });

    it('should clear pen name when "All Pen Names" is selected', async () => {
      const user = userEvent.setup({ delay: null });
      const filtersWithPenName: BookFilters = {
        ...defaultFilters,
        penName: 'Jane Austen',
      };

      render(
        <BooksFilters
          filters={filtersWithPenName}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const penNameSelect = screen.getByLabelText('Filter by pen name');
      await user.selectOptions(penNameSelect, '');

      expect(mockOnChange).toHaveBeenCalledWith({
        ...filtersWithPenName,
        penName: undefined,
      });
    });

    it('should reflect selected pen name in UI', () => {
      const filtersWithPenName: BookFilters = {
        ...defaultFilters,
        penName: 'Agatha Christie',
      };

      render(
        <BooksFilters
          filters={filtersWithPenName}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const penNameSelect = screen.getByLabelText('Filter by pen name') as HTMLSelectElement;
      expect(penNameSelect.value).toBe('Agatha Christie');
    });
  });

  describe('Status Filter', () => {
    it('should show status dropdown when clicked', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const statusButton = screen.getByLabelText('Filter by status');
      expect(statusButton).toHaveAttribute('aria-expanded', 'false');

      await user.click(statusButton);

      expect(statusButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Beta Readers')).toBeInTheDocument();
      expect(screen.getByText('Editing')).toBeInTheDocument();
    });

    it('should toggle status selection', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const statusButton = screen.getByLabelText('Filter by status');
      await user.click(statusButton);

      const draftCheckbox = screen.getByLabelText('Draft').querySelector('input') as HTMLInputElement;
      await user.click(draftCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        statuses: ['draft'],
      });
    });

    it('should add multiple statuses', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const statusButton = screen.getByLabelText('Filter by status');
      await user.click(statusButton);

      const draftCheckbox = screen.getByLabelText('Draft').querySelector('input') as HTMLInputElement;
      await user.click(draftCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        statuses: ['draft'],
      });

      // Simulate adding published status
      const filtersWithDraft: BookFilters = {
        ...defaultFilters,
        statuses: ['draft'],
      };

      const { rerender } = render(
        <BooksFilters
          filters={filtersWithDraft}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      await user.click(statusButton);
      const publishedCheckbox = screen.getByLabelText('Published').querySelector('input') as HTMLInputElement;
      await user.click(publishedCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        ...filtersWithDraft,
        statuses: ['draft', 'published'],
      });
    });

    it('should remove status when unchecked', async () => {
      const user = userEvent.setup({ delay: null });
      const filtersWithStatuses: BookFilters = {
        ...defaultFilters,
        statuses: ['draft', 'published'],
      };

      render(
        <BooksFilters
          filters={filtersWithStatuses}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const statusButton = screen.getByLabelText('Filter by status');
      await user.click(statusButton);

      const draftCheckbox = screen.getByLabelText('Draft').querySelector('input') as HTMLInputElement;
      expect(draftCheckbox.checked).toBe(true);

      await user.click(draftCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        ...filtersWithStatuses,
        statuses: ['published'],
      });
    });

    it('should show count of selected statuses', () => {
      const filtersWithStatuses: BookFilters = {
        ...defaultFilters,
        statuses: ['draft', 'editing', 'published'],
      };

      render(
        <BooksFilters
          filters={filtersWithStatuses}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      expect(screen.getByText('3 Selected')).toBeInTheDocument();
    });
  });

  describe('Genre Filter', () => {
    it('should call onChange when genre is selected', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const genreSelect = screen.getByLabelText('Filter by genre');
      await user.selectOptions(genreSelect, 'Mystery');

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        genre: 'Mystery',
      });
    });

    it('should clear genre when "All Genres" is selected', async () => {
      const user = userEvent.setup({ delay: null });
      const filtersWithGenre: BookFilters = {
        ...defaultFilters,
        genre: 'Mystery',
      };

      render(
        <BooksFilters
          filters={filtersWithGenre}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const genreSelect = screen.getByLabelText('Filter by genre');
      await user.selectOptions(genreSelect, '');

      expect(mockOnChange).toHaveBeenCalledWith({
        ...filtersWithGenre,
        genre: undefined,
      });
    });

    it('should reflect selected genre in UI', () => {
      const filtersWithGenre: BookFilters = {
        ...defaultFilters,
        genre: 'Thriller',
      };

      render(
        <BooksFilters
          filters={filtersWithGenre}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const genreSelect = screen.getByLabelText('Filter by genre') as HTMLSelectElement;
      expect(genreSelect.value).toBe('Thriller');
    });
  });

  describe('Search Filter', () => {
    it('should call onChange after debounce delay', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const searchInput = screen.getByLabelText('Search books');
      await user.type(searchInput, 'Shadow');

      // Should not call immediately
      expect(mockOnChange).not.toHaveBeenCalled();

      // Fast-forward time by 500ms (debounce delay)
      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith({
          ...defaultFilters,
          search: 'Shadow',
        });
      });
    });

    it('should debounce multiple rapid changes', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const searchInput = screen.getByLabelText('Search books');
      await user.type(searchInput, 'S');
      vi.advanceTimersByTime(100);

      await user.type(searchInput, 'h');
      vi.advanceTimersByTime(100);

      await user.type(searchInput, 'a');
      vi.advanceTimersByTime(100);

      // Should not have called onChange yet
      expect(mockOnChange).not.toHaveBeenCalled();

      // Now wait for full debounce delay
      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledTimes(1);
        expect(mockOnChange).toHaveBeenCalledWith({
          ...defaultFilters,
          search: 'Sha',
        });
      });
    });

    it('should reflect search value in input', () => {
      const filtersWithSearch: BookFilters = {
        ...defaultFilters,
        search: 'mystery',
      };

      render(
        <BooksFilters
          filters={filtersWithSearch}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const searchInput = screen.getByLabelText('Search books') as HTMLInputElement;
      expect(searchInput.value).toBe('mystery');
    });

    it('should handle clearing search', async () => {
      const user = userEvent.setup({ delay: null });
      const filtersWithSearch: BookFilters = {
        ...defaultFilters,
        search: 'mystery',
      };

      render(
        <BooksFilters
          filters={filtersWithSearch}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const searchInput = screen.getByLabelText('Search books');
      await user.clear(searchInput);

      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith({
          ...filtersWithSearch,
          search: '',
        });
      });
    });
  });

  describe('Clear Filters Button', () => {
    it('should not show clear button when no filters are active', () => {
      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();
    });

    it('should show clear button when pen name filter is active', () => {
      const filtersWithPenName: BookFilters = {
        ...defaultFilters,
        penName: 'Jane Austen',
      };

      render(
        <BooksFilters
          filters={filtersWithPenName}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('should show clear button when statuses are selected', () => {
      const filtersWithStatuses: BookFilters = {
        ...defaultFilters,
        statuses: ['draft'],
      };

      render(
        <BooksFilters
          filters={filtersWithStatuses}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('should clear all filters when clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const activeFilters: BookFilters = {
        penName: 'Jane Austen',
        statuses: ['draft', 'published'],
        genre: 'Mystery',
        search: 'shadow',
      };

      render(
        <BooksFilters
          filters={activeFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const clearButton = screen.getByText('Clear Filters');
      await user.click(clearButton);

      expect(mockOnChange).toHaveBeenCalledWith({
        penName: undefined,
        statuses: [],
        genre: undefined,
        search: undefined,
      });
    });

    it('should clear search input when clear filters is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const filtersWithSearch: BookFilters = {
        ...defaultFilters,
        search: 'mystery',
      };

      render(
        <BooksFilters
          filters={filtersWithSearch}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const clearButton = screen.getByText('Clear Filters');
      await user.click(clearButton);

      const searchInput = screen.getByLabelText('Search books') as HTMLInputElement;
      expect(searchInput.value).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty pen names array', () => {
      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={[]}
          genres={mockGenres}
        />
      );

      const penNameSelect = screen.getByLabelText('Filter by pen name');
      expect(penNameSelect).toBeInTheDocument();
    });

    it('should handle empty genres array', () => {
      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={[]}
        />
      );

      const genreSelect = screen.getByLabelText('Filter by genre');
      expect(genreSelect).toBeInTheDocument();
    });

    it('should handle very long search queries', async () => {
      const user = userEvent.setup({ delay: null });
      const longQuery = 'a'.repeat(500);

      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const searchInput = screen.getByLabelText('Search books');
      await user.type(searchInput, longQuery);

      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith({
          ...defaultFilters,
          search: longQuery,
        });
      });
    });

    it('should handle special characters in search', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const searchInput = screen.getByLabelText('Search books');
      await user.type(searchInput, 'O\'Reilly & Sons');

      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith({
          ...defaultFilters,
          search: 'O\'Reilly & Sons',
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels on all controls', () => {
      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      expect(screen.getByLabelText('Filter by pen name')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by genre')).toBeInTheDocument();
      expect(screen.getByLabelText('Search books')).toBeInTheDocument();
    });

    it('should update aria-expanded on status dropdown', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <BooksFilters
          filters={defaultFilters}
          onChange={mockOnChange}
          penNames={mockPenNames}
          genres={mockGenres}
        />
      );

      const statusButton = screen.getByLabelText('Filter by status');
      expect(statusButton).toHaveAttribute('aria-expanded', 'false');

      await user.click(statusButton);

      expect(statusButton).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
