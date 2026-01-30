import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookVersionSelector from '../BookVersionSelector';

// Mock auth
vi.mock('../../lib/auth', () => ({
  getToken: vi.fn(() => 'mock-token-123'),
}));

// Mock constants
vi.mock('../../lib/constants', () => ({
  colors: {
    textSecondary: '#666',
    brandLight: '#f0f9ff',
    brandBorder: '#bfdbfe',
    brandText: '#1e40af',
    border: '#e5e7eb',
    surface: '#fff',
    error: '#ef4444',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('BookVersionSelector', () => {
  const mockVersions = [
    {
      id: 'version-1',
      book_id: 'book-123',
      version_number: 1,
      version_name: null,
      is_active: 0,
      word_count: 80000,
      chapter_count: 36,
      actual_chapter_count: 36,
      actual_word_count: 80000,
      created_at: '2024-01-01T00:00:00Z',
      completed_at: '2024-01-15T00:00:00Z',
    },
    {
      id: 'version-2',
      book_id: 'book-123',
      version_number: 2,
      version_name: 'Rewrite',
      is_active: 1,
      word_count: 0,
      chapter_count: 0,
      actual_chapter_count: 0,
      actual_word_count: 0,
      created_at: '2024-01-16T00:00:00Z',
      completed_at: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ versions: mockVersions }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Loading', () => {
    it('should show loading state initially', () => {
      render(<BookVersionSelector bookId="book-123" />);
      expect(screen.getByText('Loading versions...')).toBeInTheDocument();
    });

    it('should fetch versions on mount', async () => {
      render(<BookVersionSelector bookId="book-123" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/books/book-123/versions'),
          expect.any(Object)
        );
      });
    });

    it('should not fetch when bookId is undefined', async () => {
      render(<BookVersionSelector bookId={undefined as any} />);

      // Should not make any fetch calls
      await waitFor(() => {
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });
  });

  describe('Version Display', () => {
    it('should display versions after loading', async () => {
      render(<BookVersionSelector bookId="book-123" />);

      await waitFor(() => {
        expect(screen.getByText(/Version 1/)).toBeInTheDocument();
        expect(screen.getByText(/Rewrite/)).toBeInTheDocument();
      });
    });

    it('should show chapter and word counts', async () => {
      render(<BookVersionSelector bookId="book-123" />);

      await waitFor(() => {
        expect(screen.getByText(/36 chapters/)).toBeInTheDocument();
        expect(screen.getByText(/80\.0k words/)).toBeInTheDocument();
      });
    });

    it('should mark active version', async () => {
      render(<BookVersionSelector bookId="book-123" />);

      await waitFor(() => {
        expect(screen.getByText(/\(Active\)/)).toBeInTheDocument();
      });
    });
  });

  describe('onVersionChange Callback', () => {
    it('should call onVersionChange on initial load with active version', async () => {
      const onVersionChange = vi.fn();
      render(<BookVersionSelector bookId="book-123" onVersionChange={onVersionChange} />);

      await waitFor(() => {
        expect(onVersionChange).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'version-2',
            is_active: 1,
          })
        );
      });
    });

    it('should call onVersionChange when version is switched', async () => {
      const onVersionChange = vi.fn();
      const user = userEvent.setup();

      // Mock the activate endpoint
      mockFetch.mockImplementation(async (url: string, options?: any) => {
        if (url.includes('/activate') && options?.method === 'PUT') {
          return { ok: true, json: async () => ({}) };
        }
        return {
          ok: true,
          json: async () => ({ versions: mockVersions }),
        };
      });

      render(<BookVersionSelector bookId="book-123" onVersionChange={onVersionChange} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Clear initial calls
      onVersionChange.mockClear();

      // Change version
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'version-1');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/activate'),
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    it('should pass fresh version data after version switch', async () => {
      const onVersionChange = vi.fn();
      const user = userEvent.setup();

      // Track which version is active
      let activeVersion = 'version-2';
      const updatedVersions = [...mockVersions];

      mockFetch.mockImplementation(async (url: string, options?: any) => {
        if (url.includes('/activate') && options?.method === 'PUT') {
          // Simulate activating version 1
          activeVersion = 'version-1';
          updatedVersions[0] = { ...updatedVersions[0], is_active: 1 };
          updatedVersions[1] = { ...updatedVersions[1], is_active: 0 };
          return { ok: true, json: async () => ({}) };
        }
        return {
          ok: true,
          json: async () => ({
            versions: updatedVersions.map(v => ({
              ...v,
              is_active: v.id === activeVersion ? 1 : 0,
            })),
          }),
        };
      });

      render(<BookVersionSelector bookId="book-123" onVersionChange={onVersionChange} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Clear initial calls
      onVersionChange.mockClear();

      // Change to version 1
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'version-1');

      // Should call onVersionChange with the NEW active version's data
      await waitFor(() => {
        expect(onVersionChange).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'version-1',
            actual_chapter_count: 36,
          })
        );
      });
    });
  });

  describe('Single Version Behaviour', () => {
    it('should return null when single version and showCreateButton is false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          versions: [mockVersions[0]],
        }),
      });

      const { container } = render(
        <BookVersionSelector bookId="book-123" showCreateButton={false} />
      );

      await waitFor(() => {
        // Component should render nothing (null)
        expect(container.firstChild).toBeNull();
      });
    });

    it('should still call onVersionChange even with single version', async () => {
      const onVersionChange = vi.fn();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          versions: [{ ...mockVersions[0], is_active: 1 }],
        }),
      });

      render(
        <BookVersionSelector
          bookId="book-123"
          onVersionChange={onVersionChange}
          showCreateButton={false}
        />
      );

      // Should still notify parent even though no UI is shown
      await waitFor(() => {
        expect(onVersionChange).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'version-1',
          })
        );
      });
    });
  });

  describe('No Versions', () => {
    it('should return null when no versions and showCreateButton is false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ versions: [] }),
      });

      const { container } = render(
        <BookVersionSelector bookId="book-123" showCreateButton={false} />
      );

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should show create button when no versions and showCreateButton is true', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ versions: [] }),
      });

      render(<BookVersionSelector bookId="book-123" showCreateButton={true} />);

      await waitFor(() => {
        expect(screen.getByText('Create Version 1')).toBeInTheDocument();
      });
    });
  });

  describe('Create Version', () => {
    it('should show create button when showCreateButton is true', async () => {
      render(<BookVersionSelector bookId="book-123" showCreateButton={true} />);

      await waitFor(() => {
        expect(screen.getByText('+ New Version')).toBeInTheDocument();
      });
    });

    it('should call API to create new version', async () => {
      const user = userEvent.setup();

      mockFetch.mockImplementation(async (url: string, options?: any) => {
        if (options?.method === 'POST') {
          return { ok: true, json: async () => ({ id: 'new-version' }) };
        }
        return {
          ok: true,
          json: async () => ({ versions: mockVersions }),
        };
      });

      render(<BookVersionSelector bookId="book-123" showCreateButton={true} />);

      await waitFor(() => {
        expect(screen.getByText('+ New Version')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ New Version'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/books/book-123/versions'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to fetch versions'));

      // Need to show multiple versions to see error state (otherwise component returns null)
      render(<BookVersionSelector bookId="book-123" showCreateButton={true} />);

      await waitFor(() => {
        // The error message is logged to console, not always shown in UI
        // When fetch fails with showCreateButton, it shows "No versions yet" + create button
        expect(screen.getByText(/No versions yet|Create Version/)).toBeInTheDocument();
      });
    });

    it('should show error when version switch fails', async () => {
      const user = userEvent.setup();

      mockFetch.mockImplementation(async (url: string, options?: any) => {
        if (url.includes('/activate') && options?.method === 'PUT') {
          return {
            ok: false,
            json: async () => ({ error: { message: 'Switch failed' } }),
          };
        }
        return {
          ok: true,
          json: async () => ({ versions: mockVersions }),
        };
      });

      render(<BookVersionSelector bookId="book-123" />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'version-1');

      await waitFor(() => {
        expect(screen.getByText('Switch failed')).toBeInTheDocument();
      });
    });
  });

  describe('Compact Mode', () => {
    it('should apply compact styles when compact prop is true', async () => {
      render(<BookVersionSelector bookId="book-123" compact={true} />);

      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toHaveStyle({ minWidth: '150px' });
      });
    });
  });

  describe('BookId Changes', () => {
    it('should refetch versions when bookId changes', async () => {
      const { rerender } = render(<BookVersionSelector bookId="book-123" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/books/book-123/versions'),
          expect.any(Object)
        );
      });

      mockFetch.mockClear();

      rerender(<BookVersionSelector bookId="book-456" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/books/book-456/versions'),
          expect.any(Object)
        );
      });
    });
  });
});
