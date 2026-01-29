import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecommendationCard from '../RecommendationCard';

// Mock design tokens
vi.mock('@/app/lib/design-tokens', () => ({
  colors: {
    background: {
      surface: '#FFFFFF',
      surfaceHover: '#F8FAFC',
    },
    border: {
      default: '#E2E8F0',
    },
    text: {
      primary: '#1A1A2E',
      secondary: '#475569',
      tertiary: '#64748B',
    },
    white: '#FFFFFF',
    semantic: {
      warningLight: '#FEF3C7',
      warningBorder: '#FCD34D',
      warningDark: '#B45309',
    },
  },
  typography: {
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
    },
    fontWeight: {
      medium: 500,
      semibold: 600,
    },
    lineHeight: {
      normal: 1.5,
    },
  },
  spacing: {
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
}));

describe('RecommendationCard', () => {
  const defaultProps = {
    rationale: 'This change would improve the story pacing',
    changes: {
      concept: {
        title: 'The Last Hope',
      },
      dna: {
        tone: 'Darker',
      },
    },
    onApply: vi.fn(),
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render component with header', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByText('Suggested Changes')).toBeInTheDocument();
    });

    it('should display rationale text', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByText('Rationale:')).toBeInTheDocument();
      expect(screen.getByText('This change would improve the story pacing')).toBeInTheDocument();
    });

    it('should display proposed changes heading', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByText('Proposed changes:')).toBeInTheDocument();
    });

    it('should render Apply button', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByText('Apply Changes')).toBeInTheDocument();
    });

    it('should render Dismiss button', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });

    it('should display lightbulb emoji', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByText('💡')).toBeInTheDocument();
    });
  });

  describe('Proposed Changes Display', () => {
    it('should list concept changes', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByText('Concept: Title')).toBeInTheDocument();
      expect(screen.getByText('The Last Hope')).toBeInTheDocument();
    });

    it('should list DNA changes', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByText('DNA: Tone')).toBeInTheDocument();
      expect(screen.getByText('Darker')).toBeInTheDocument();
    });

    it('should format field names correctly (camelCase to Title Case)', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            concept: {
              protagonistHint: 'A reluctant hero',
            },
          }}
        />
      );

      expect(screen.getByText('Concept: Protagonist Hint')).toBeInTheDocument();
      expect(screen.getByText('A reluctant hero')).toBeInTheDocument();
    });

    it('should format multi-word camelCase fields', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            concept: {
              conflictType: 'internal',
            },
          }}
        />
      );

      expect(screen.getByText('Concept: Conflict Type')).toBeInTheDocument();
      expect(screen.getByText('internal')).toBeInTheDocument();
    });

    it('should display array values as comma-separated strings', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            dna: {
              themes: ['redemption', 'revenge', 'love'],
            },
          }}
        />
      );

      expect(screen.getByText('DNA: Themes')).toBeInTheDocument();
      expect(screen.getByText('redemption, revenge, love')).toBeInTheDocument();
    });

    it('should handle multiple concept changes', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            concept: {
              title: 'New Title',
              logline: 'New logline',
              synopsis: 'New synopsis',
            },
          }}
        />
      );

      expect(screen.getByText('Concept: Title')).toBeInTheDocument();
      expect(screen.getByText('New Title')).toBeInTheDocument();
      expect(screen.getByText('Concept: Logline')).toBeInTheDocument();
      expect(screen.getByText('New logline')).toBeInTheDocument();
      expect(screen.getByText('Concept: Synopsis')).toBeInTheDocument();
      expect(screen.getByText('New synopsis')).toBeInTheDocument();
    });

    it('should handle multiple DNA changes', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            dna: {
              genre: 'Science Fiction',
              subgenre: 'Cyberpunk',
              tone: 'Dark',
            },
          }}
        />
      );

      expect(screen.getByText('DNA: Genre')).toBeInTheDocument();
      expect(screen.getByText('Science Fiction')).toBeInTheDocument();
      expect(screen.getByText('DNA: Subgenre')).toBeInTheDocument();
      expect(screen.getByText('Cyberpunk')).toBeInTheDocument();
      expect(screen.getByText('DNA: Tone')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
    });

    it('should skip null values in changes', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            concept: {
              title: 'Valid Title',
              logline: null,
            },
          }}
        />
      );

      expect(screen.getByText('Concept: Title')).toBeInTheDocument();
      expect(screen.getByText('Valid Title')).toBeInTheDocument();
      expect(screen.queryByText('Concept: Logline')).not.toBeInTheDocument();
    });

    it('should skip undefined values in changes', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            concept: {
              title: 'Valid Title',
              synopsis: undefined,
            },
          }}
        />
      );

      expect(screen.getByText('Concept: Title')).toBeInTheDocument();
      expect(screen.queryByText('Concept: Synopsis')).not.toBeInTheDocument();
    });

    it('should handle empty concept object', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            concept: {},
            dna: {
              tone: 'Light',
            },
          }}
        />
      );

      expect(screen.queryByText(/^Concept:/)).not.toBeInTheDocument();
      expect(screen.getByText('DNA: Tone')).toBeInTheDocument();
    });

    it('should handle empty DNA object', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            concept: {
              title: 'Title',
            },
            dna: {},
          }}
        />
      );

      expect(screen.getByText('Concept: Title')).toBeInTheDocument();
      expect(screen.queryByText(/^DNA:/)).not.toBeInTheDocument();
    });

    it('should handle both empty objects', () => {
      render(
        <RecommendationCard {...defaultProps} rationale="Just a suggestion" changes={{}} />
      );

      expect(screen.getByText('Just a suggestion')).toBeInTheDocument();
      expect(screen.queryByText('Proposed changes:')).not.toBeInTheDocument();
    });

    it('should handle string values correctly', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            concept: {
              title: 'Test String Value',
            },
          }}
        />
      );

      expect(screen.getByText('Test String Value')).toBeInTheDocument();
    });

    it('should handle numeric values correctly', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            dna: {
              wordCount: 80000,
            },
          }}
        />
      );

      expect(screen.getByText('DNA: Word Count')).toBeInTheDocument();
      expect(screen.getByText('80000')).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    it('should call onApply when Apply button is clicked', async () => {
      const user = userEvent.setup();
      const onApply = vi.fn();

      render(<RecommendationCard {...defaultProps} onApply={onApply} />);

      await user.click(screen.getByText('Apply Changes'));

      expect(onApply).toHaveBeenCalledTimes(1);
    });

    it('should call onDismiss when Dismiss button is clicked', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();

      render(<RecommendationCard {...defaultProps} onDismiss={onDismiss} />);

      await user.click(screen.getByText('Dismiss'));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should not call onDismiss when Apply is clicked', async () => {
      const user = userEvent.setup();
      const onApply = vi.fn();
      const onDismiss = vi.fn();

      render(<RecommendationCard {...defaultProps} onApply={onApply} onDismiss={onDismiss} />);

      await user.click(screen.getByText('Apply Changes'));

      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('should not call onApply when Dismiss is clicked', async () => {
      const user = userEvent.setup();
      const onApply = vi.fn();
      const onDismiss = vi.fn();

      render(<RecommendationCard {...defaultProps} onApply={onApply} onDismiss={onDismiss} />);

      await user.click(screen.getByText('Dismiss'));

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onApply).not.toHaveBeenCalled();
    });

    it('should allow multiple clicks on Apply button', async () => {
      const user = userEvent.setup();
      const onApply = vi.fn();

      render(<RecommendationCard {...defaultProps} onApply={onApply} />);

      await user.click(screen.getByText('Apply Changes'));
      await user.click(screen.getByText('Apply Changes'));

      expect(onApply).toHaveBeenCalledTimes(2);
    });

    it('should allow multiple clicks on Dismiss button', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();

      render(<RecommendationCard {...defaultProps} onDismiss={onDismiss} />);

      await user.click(screen.getByText('Dismiss'));
      await user.click(screen.getByText('Dismiss'));

      expect(onDismiss).toHaveBeenCalledTimes(2);
    });
  });

  describe('Rationale Display', () => {
    it('should display short rationale', () => {
      render(<RecommendationCard {...defaultProps} rationale="Short reason" />);

      expect(screen.getByText('Short reason')).toBeInTheDocument();
    });

    it('should display long rationale', () => {
      const longRationale =
        'This is a very detailed rationale that explains in depth why these changes would benefit the story. '.repeat(
          5
        );

      render(<RecommendationCard {...defaultProps} rationale={longRationale} />);

      // Use partial match for long text
      expect(screen.getByText(/This is a very detailed rationale/)).toBeInTheDocument();
    });

    it('should display rationale with special characters', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          rationale='Rationale with "quotes" and <brackets>'
        />
      );

      expect(screen.getByText('Rationale with "quotes" and <brackets>')).toBeInTheDocument();
    });

    it('should display rationale with line breaks', () => {
      render(<RecommendationCard {...defaultProps} rationale="Line 1\nLine 2\nLine 3" />);

      // Line breaks might be normalized in rendering
      expect(screen.getByText(/Line 1[\s\S]*Line 2[\s\S]*Line 3/)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply warning border colour', () => {
      const { container } = render(<RecommendationCard {...defaultProps} />);

      const card = container.firstChild as HTMLElement;
      expect(card.style.border).toBe('2px solid rgb(252, 211, 77)'); // warningBorder
    });

    it('should apply surface background', () => {
      const { container } = render(<RecommendationCard {...defaultProps} />);

      const card = container.firstChild as HTMLElement;
      expect(card.style.background).toBe('rgb(255, 255, 255)'); // surface
    });

    it('should have rounded corners', () => {
      const { container } = render(<RecommendationCard {...defaultProps} />);

      const card = container.firstChild as HTMLElement;
      expect(card.style.borderRadius).toBe('12px'); // lg
    });

    it('should style Apply button with gradient', () => {
      render(<RecommendationCard {...defaultProps} />);

      const applyButton = screen.getByText('Apply Changes');
      expect(applyButton.style.background).toContain('linear-gradient');
    });

    it('should style Dismiss button with surface background', () => {
      render(<RecommendationCard {...defaultProps} />);

      const dismissButton = screen.getByText('Dismiss');
      expect(dismissButton.style.background).toBe('rgb(255, 255, 255)'); // surface
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed concept and DNA changes', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            concept: {
              title: 'The Final Stand',
              logline: 'A story of courage',
            },
            dna: {
              genre: 'Fantasy',
              tone: 'Epic',
              themes: ['heroism', 'sacrifice'],
            },
          }}
        />
      );

      // Concept changes
      expect(screen.getByText('Concept: Title')).toBeInTheDocument();
      expect(screen.getByText('The Final Stand')).toBeInTheDocument();
      expect(screen.getByText('Concept: Logline')).toBeInTheDocument();
      expect(screen.getByText('A story of courage')).toBeInTheDocument();

      // DNA changes
      expect(screen.getByText('DNA: Genre')).toBeInTheDocument();
      expect(screen.getByText('Fantasy')).toBeInTheDocument();
      expect(screen.getByText('DNA: Tone')).toBeInTheDocument();
      expect(screen.getByText('Epic')).toBeInTheDocument();
      expect(screen.getByText('DNA: Themes')).toBeInTheDocument();
      expect(screen.getByText('heroism, sacrifice')).toBeInTheDocument();
    });

    it('should handle only concept changes', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            concept: {
              title: 'New Title',
            },
          }}
        />
      );

      expect(screen.getByText('Concept: Title')).toBeInTheDocument();
      expect(screen.queryByText(/^DNA:/)).not.toBeInTheDocument();
    });

    it('should handle only DNA changes', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            dna: {
              tone: 'Lighter',
            },
          }}
        />
      );

      expect(screen.getByText('DNA: Tone')).toBeInTheDocument();
      expect(screen.queryByText(/^Concept:/)).not.toBeInTheDocument();
    });

    it('should handle empty array in DNA', () => {
      const { container } = render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            dna: {
              themes: [],
            },
          }}
        />
      );

      expect(screen.getByText('DNA: Themes')).toBeInTheDocument();
      // Empty array joins to empty string - just verify the field is rendered
      const themeField = screen.getByText('DNA: Themes').parentElement;
      expect(themeField).toBeInTheDocument();
    });

    it('should handle single-element array', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            dna: {
              themes: ['redemption'],
            },
          }}
        />
      );

      expect(screen.getByText('redemption')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have clickable buttons', async () => {
      const user = userEvent.setup();
      const onApply = vi.fn();
      const onDismiss = vi.fn();

      render(<RecommendationCard {...defaultProps} onApply={onApply} onDismiss={onDismiss} />);

      const applyButton = screen.getByText('Apply Changes');
      const dismissButton = screen.getByText('Dismiss');

      expect(applyButton.tagName).toBe('BUTTON');
      expect(dismissButton.tagName).toBe('BUTTON');

      await user.click(applyButton);
      await user.click(dismissButton);

      expect(onApply).toHaveBeenCalled();
      expect(onDismiss).toHaveBeenCalled();
    });

    it('should have pointer cursor on buttons', () => {
      render(<RecommendationCard {...defaultProps} />);

      const applyButton = screen.getByText('Apply Changes');
      const dismissButton = screen.getByText('Dismiss');

      expect(applyButton.style.cursor).toBe('pointer');
      expect(dismissButton.style.cursor).toBe('pointer');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long field values', () => {
      const longValue = 'A'.repeat(500);

      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            concept: {
              synopsis: longValue,
            },
          }}
        />
      );

      expect(screen.getByText(longValue)).toBeInTheDocument();
    });

    it('should handle Unicode characters in values', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            concept: {
              title: '日本語のタイトル 🌸',
            },
          }}
        />
      );

      expect(screen.getByText('日本語のタイトル 🌸')).toBeInTheDocument();
    });

    it('should handle empty string rationale', () => {
      render(<RecommendationCard {...defaultProps} rationale="" />);

      expect(screen.getByText('Rationale:')).toBeInTheDocument();
    });

    it('should convert boolean values to strings', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          changes={{
            dna: {
              completed: true,
            },
          }}
        />
      );

      expect(screen.getByText('DNA: Completed')).toBeInTheDocument();
      expect(screen.getByText('true')).toBeInTheDocument();
    });
  });
});
