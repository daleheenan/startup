import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PenNameCard from '../PenNameCard';
import type { PenName } from '@/app/hooks/usePenNames';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  },
}));

describe('PenNameCard', () => {
  const mockPenName: PenName = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: 'owner',
    pen_name: 'Jane Austen',
    display_name: 'J. Austen',
    bio: 'A classic author of romantic fiction',
    bio_short: 'Classic writer',
    website: 'https://janeausten.com',
    social_media: {
      twitter: '@janeausten',
      facebook: 'janeausten',
    },
    genres: ['Romance', 'Historical', 'Classic'],
    photo_url: null,
    is_public: true,
    is_default: true,
    book_count: 3,
    word_count: 150000,
    series_count: 1,
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-01-15T10:00:00.000Z',
  };

  describe('Rendering', () => {
    it('should render pen name correctly', () => {
      render(<PenNameCard penName={mockPenName} />);

      expect(screen.getByText('Jane Austen')).toBeInTheDocument();
    });

    it('should render display name when provided', () => {
      render(<PenNameCard penName={mockPenName} />);

      expect(screen.getByText('J. Austen')).toBeInTheDocument();
    });

    it('should not render display name when not provided', () => {
      const penNameWithoutDisplay = {
        ...mockPenName,
        display_name: null,
      };

      render(<PenNameCard penName={penNameWithoutDisplay} />);

      expect(screen.queryByText('J. Austen')).not.toBeInTheDocument();
    });

    it('should show default badge when pen name is default', () => {
      render(<PenNameCard penName={mockPenName} />);

      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('should not show default badge when pen name is not default', () => {
      const nonDefaultPenName = {
        ...mockPenName,
        is_default: false,
      };

      render(<PenNameCard penName={nonDefaultPenName} />);

      expect(screen.queryByText('Default')).not.toBeInTheDocument();
    });

    it('should show first letter of pen name when no photo', () => {
      render(<PenNameCard penName={mockPenName} />);

      // The initial letter should be visible in the avatar
      const avatar = screen.getByText('J');
      expect(avatar).toBeInTheDocument();
    });

    it('should not show initial when photo_url is provided', () => {
      const penNameWithPhoto = {
        ...mockPenName,
        photo_url: 'https://example.com/photo.jpg',
      };

      render(<PenNameCard penName={penNameWithPhoto} />);

      // Initial should not be rendered when photo exists
      const container = screen.getByText('Jane Austen').parentElement?.parentElement;
      expect(container?.textContent).not.toContain('J');
    });
  });

  describe('Genres Display', () => {
    it('should display up to 3 genres', () => {
      render(<PenNameCard penName={mockPenName} />);

      expect(screen.getByText('Romance')).toBeInTheDocument();
      expect(screen.getByText('Historical')).toBeInTheDocument();
      expect(screen.getByText('Classic')).toBeInTheDocument();
    });

    it('should show "+N more" badge when more than 3 genres', () => {
      const penNameWithManyGenres = {
        ...mockPenName,
        genres: ['Romance', 'Historical', 'Classic', 'Gothic', 'Mystery'],
      };

      render(<PenNameCard penName={penNameWithManyGenres} />);

      expect(screen.getByText('Romance')).toBeInTheDocument();
      expect(screen.getByText('Historical')).toBeInTheDocument();
      expect(screen.getByText('Classic')).toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument();
      // Gothic and Mystery should not be displayed
      expect(screen.queryByText('Gothic')).not.toBeInTheDocument();
      expect(screen.queryByText('Mystery')).not.toBeInTheDocument();
    });

    it('should not render genres section when genres array is empty', () => {
      const penNameWithoutGenres = {
        ...mockPenName,
        genres: [],
      };

      const { container } = render(<PenNameCard penName={penNameWithoutGenres} />);

      // Check that no genre badges are rendered
      expect(screen.queryByText('Romance')).not.toBeInTheDocument();
    });

    it('should not render genres section when genres is null', () => {
      const penNameWithNullGenres = {
        ...mockPenName,
        genres: null as any,
      };

      render(<PenNameCard penName={penNameWithNullGenres} />);

      expect(screen.queryByText('Romance')).not.toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('should display book count with singular form', () => {
      const penNameWithOneBook = {
        ...mockPenName,
        book_count: 1,
      };

      render(<PenNameCard penName={penNameWithOneBook} />);

      expect(screen.getByText('1 book')).toBeInTheDocument();
    });

    it('should display book count with plural form', () => {
      render(<PenNameCard penName={mockPenName} />);

      expect(screen.getByText('3 books')).toBeInTheDocument();
    });

    it('should display formatted word count', () => {
      render(<PenNameCard penName={mockPenName} />);

      expect(screen.getByText('150,000 words')).toBeInTheDocument();
    });

    it('should format large word counts correctly', () => {
      const penNameWithLargeWordCount = {
        ...mockPenName,
        word_count: 1500000,
      };

      render(<PenNameCard penName={penNameWithLargeWordCount} />);

      expect(screen.getByText('1,500,000 words')).toBeInTheDocument();
    });

    it('should display zero book count', () => {
      const penNameWithNoBooks = {
        ...mockPenName,
        book_count: 0,
      };

      render(<PenNameCard penName={penNameWithNoBooks} />);

      expect(screen.getByText('0 books')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render View button with correct href', () => {
      render(<PenNameCard penName={mockPenName} />);

      const viewButton = screen.getByText('View');
      expect(viewButton).toHaveAttribute('href', '/pen-names/123e4567-e89b-12d3-a456-426614174000');
    });

    it('should render Edit button with correct href', () => {
      render(<PenNameCard penName={mockPenName} />);

      const editButton = screen.getByText('Edit');
      expect(editButton).toHaveAttribute('href', '/pen-names/123e4567-e89b-12d3-a456-426614174000/edit');
    });

    it('should render both action buttons', () => {
      render(<PenNameCard penName={mockPenName} />);

      expect(screen.getByText('View')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle pen name with special characters', () => {
      const penNameWithSpecialChars = {
        ...mockPenName,
        pen_name: 'O\'Reilly & Sons',
      };

      render(<PenNameCard penName={penNameWithSpecialChars} />);

      expect(screen.getByText('O\'Reilly & Sons')).toBeInTheDocument();
    });

    it('should handle very long pen name', () => {
      const longPenName = {
        ...mockPenName,
        pen_name: 'A Very Long Pen Name That Exceeds Normal Length Expectations',
      };

      render(<PenNameCard penName={longPenName} />);

      expect(screen.getByText('A Very Long Pen Name That Exceeds Normal Length Expectations')).toBeInTheDocument();
    });

    it('should handle very long display name', () => {
      const longDisplayName = {
        ...mockPenName,
        display_name: 'An Extraordinarily Long Display Name For Testing Purposes',
      };

      render(<PenNameCard penName={longDisplayName} />);

      expect(screen.getByText('An Extraordinarily Long Display Name For Testing Purposes')).toBeInTheDocument();
    });

    it('should handle zero word count', () => {
      const penNameWithNoWords = {
        ...mockPenName,
        word_count: 0,
      };

      render(<PenNameCard penName={penNameWithNoWords} />);

      expect(screen.getByText('0 words')).toBeInTheDocument();
    });

    it('should render correctly with minimal data', () => {
      const minimalPenName: PenName = {
        id: 'test-id',
        user_id: 'owner',
        pen_name: 'Test Author',
        display_name: null,
        bio: null,
        bio_short: null,
        website: null,
        social_media: null,
        genres: [],
        photo_url: null,
        is_public: false,
        is_default: false,
        book_count: 0,
        word_count: 0,
        series_count: 0,
        created_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z',
      };

      render(<PenNameCard penName={minimalPenName} />);

      expect(screen.getByText('Test Author')).toBeInTheDocument();
      expect(screen.getByText('0 books')).toBeInTheDocument();
      expect(screen.getByText('0 words')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have valid links for navigation', () => {
      const { container } = render(<PenNameCard penName={mockPenName} />);

      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(2);
      links.forEach((link) => {
        expect(link.getAttribute('href')).toBeTruthy();
      });
    });

    it('should have appropriate text content in buttons', () => {
      render(<PenNameCard penName={mockPenName} />);

      const viewButton = screen.getByText('View');
      const editButton = screen.getByText('Edit');

      expect(viewButton).toHaveTextContent('View');
      expect(editButton).toHaveTextContent('Edit');
    });
  });
});
