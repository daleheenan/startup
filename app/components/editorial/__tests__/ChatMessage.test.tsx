import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatMessage from '../ChatMessage';

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
      success: '#10B981',
      successLight: '#D1FAE5',
      successDark: '#059669',
      warningLight: '#FEF3C7',
      warningDark: '#B45309',
      infoLight: '#DBEAFE',
      infoDark: '#1E40AF',
    },
  },
  typography: {
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
    },
    fontWeight: {
      semibold: 600,
      medium: 500,
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

// Mock RecommendationCard
vi.mock('../RecommendationCard', () => ({
  default: ({ rationale, onApply, onDismiss }: any) => (
    <div data-testid="recommendation-card">
      <div>{rationale}</div>
      <button onClick={onApply}>Apply</button>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));

describe('ChatMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Messages', () => {
    it('should render user message with correct styling', () => {
      const { container } = render(
        <ChatMessage
          role="user"
          content="Hello, this is a user message"
          timestamp="2026-01-29T10:30:00Z"
        />
      );

      expect(screen.getByText('Hello, this is a user message')).toBeInTheDocument();

      // Check alignment (user messages should align right)
      const messageContainer = container.firstChild as HTMLElement;
      expect(messageContainer.style.alignItems).toBe('flex-end');
    });

    it('should display user message content', () => {
      render(
        <ChatMessage role="user" content="User question here" timestamp="2026-01-29T10:30:00Z" />
      );

      expect(screen.getByText('User question here')).toBeInTheDocument();
    });

    it('should apply gradient background to user messages', () => {
      render(
        <ChatMessage role="user" content="Test message" timestamp="2026-01-29T10:30:00Z" />
      );

      const messageContent = screen.getByText('Test message').parentElement;
      expect(messageContent?.style.background).toContain('linear-gradient');
    });

    it('should not show badge for user messages', () => {
      render(
        <ChatMessage role="user" content="Test message" timestamp="2026-01-29T10:30:00Z" />
      );

      expect(screen.queryByText('Answer')).not.toBeInTheDocument();
      expect(screen.queryByText('Change Applied')).not.toBeInTheDocument();
      expect(screen.queryByText('Recommendation')).not.toBeInTheDocument();
    });
  });

  describe('Assistant Messages', () => {
    it('should render assistant message with correct styling', () => {
      const { container } = render(
        <ChatMessage
          role="assistant"
          content="Hello, this is an assistant message"
          timestamp="2026-01-29T10:30:00Z"
        />
      );

      expect(screen.getByText('Hello, this is an assistant message')).toBeInTheDocument();

      // Check alignment (assistant messages should align left)
      const messageContainer = container.firstChild as HTMLElement;
      expect(messageContainer.style.alignItems).toBe('flex-start');
    });

    it('should apply surface background to assistant messages', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Test message"
          timestamp="2026-01-29T10:30:00Z"
        />
      );

      const messageContent = screen.getByText('Test message').parentElement;
      // CSS color values are normalized to RGB format
      expect(messageContent?.style.background).toBe('rgb(255, 255, 255)');
    });

    it('should display assistant message content', () => {
      render(
        <ChatMessage
          role="assistant"
          content="AI response here"
          timestamp="2026-01-29T10:30:00Z"
        />
      );

      expect(screen.getByText('AI response here')).toBeInTheDocument();
    });
  });

  describe('Timestamp Formatting', () => {
    it('should display timestamp in UK format (HH:mm)', () => {
      render(
        <ChatMessage
          role="user"
          content="Test message"
          timestamp="2026-01-29T14:35:00.000Z"
        />
      );

      // UK format should show 14:35 (or possibly different based on timezone)
      // Check that something resembling a time is displayed
      expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
    });

    it('should format timestamp correctly for morning time', () => {
      render(
        <ChatMessage role="user" content="Test message" timestamp="2026-01-29T08:15:00.000Z" />
      );

      expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
    });

    it('should format timestamp correctly for afternoon time', () => {
      render(
        <ChatMessage role="user" content="Test message" timestamp="2026-01-29T16:45:00.000Z" />
      );

      expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
    });

    it('should handle invalid timestamp gracefully', () => {
      render(<ChatMessage role="user" content="Test message" timestamp="invalid-date" />);

      // Should not crash, might show empty string
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  describe('Response Type Badges', () => {
    it('should show Answer badge for answer responses', () => {
      render(
        <ChatMessage
          role="assistant"
          content="This is an answer"
          timestamp="2026-01-29T10:30:00Z"
          responseType="answer"
        />
      );

      expect(screen.getByText('Answer')).toBeInTheDocument();
    });

    it('should show Change Applied badge for change_applied responses', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Changes have been applied"
          timestamp="2026-01-29T10:30:00Z"
          responseType="change_applied"
        />
      );

      expect(screen.getByText('Change Applied')).toBeInTheDocument();
    });

    it('should show Recommendation badge for recommendation responses', () => {
      render(
        <ChatMessage
          role="assistant"
          content="I recommend these changes"
          timestamp="2026-01-29T10:30:00Z"
          responseType="recommendation"
        />
      );

      expect(screen.getByText('Recommendation')).toBeInTheDocument();
    });

    it('should not show badge when responseType is undefined', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Regular message"
          timestamp="2026-01-29T10:30:00Z"
        />
      );

      expect(screen.queryByText('Answer')).not.toBeInTheDocument();
      expect(screen.queryByText('Change Applied')).not.toBeInTheDocument();
      expect(screen.queryByText('Recommendation')).not.toBeInTheDocument();
    });
  });

  describe('Applied Changes Display', () => {
    it('should display applied changes summary', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Changes applied"
          timestamp="2026-01-29T10:30:00Z"
          responseType="change_applied"
          appliedChanges={{
            concept: {
              title: 'New Title',
            },
            dna: {
              tone: 'Darker',
            },
          }}
        />
      );

      expect(screen.getByText('Changes made:')).toBeInTheDocument();
    });

    it('should format concept changes correctly', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Changes applied"
          timestamp="2026-01-29T10:30:00Z"
          responseType="change_applied"
          appliedChanges={{
            concept: {
              logline: 'A new logline for the story',
            },
          }}
        />
      );

      expect(screen.getByText(/Updated logline: "A new logline for the story"/)).toBeInTheDocument();
    });

    it('should format DNA changes correctly', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Changes applied"
          timestamp="2026-01-29T10:30:00Z"
          responseType="change_applied"
          appliedChanges={{
            dna: {
              genre: 'Science Fiction',
            },
          }}
        />
      );

      expect(screen.getByText(/Updated genre: "Science Fiction"/)).toBeInTheDocument();
    });

    it('should handle array values in DNA changes', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Changes applied"
          timestamp="2026-01-29T10:30:00Z"
          responseType="change_applied"
          appliedChanges={{
            dna: {
              themes: ['redemption', 'revenge'],
            },
          }}
        />
      );

      expect(screen.getByText(/Updated themes: "redemption, revenge"/)).toBeInTheDocument();
    });

    it('should format camelCase field names to readable format', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Changes applied"
          timestamp="2026-01-29T10:30:00Z"
          responseType="change_applied"
          appliedChanges={{
            concept: {
              protagonistHint: 'A reluctant hero',
            },
          }}
        />
      );

      expect(screen.getByText(/Updated protagonist hint: "A reluctant hero"/)).toBeInTheDocument();
    });

    it('should display multiple changes', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Changes applied"
          timestamp="2026-01-29T10:30:00Z"
          responseType="change_applied"
          appliedChanges={{
            concept: {
              title: 'New Title',
              logline: 'New logline',
            },
            dna: {
              tone: 'Dark',
            },
          }}
        />
      );

      expect(screen.getByText(/Updated title: "New Title"/)).toBeInTheDocument();
      expect(screen.getByText(/Updated logline: "New logline"/)).toBeInTheDocument();
      expect(screen.getByText(/Updated tone: "Dark"/)).toBeInTheDocument();
    });

    it('should not display changes section when appliedChanges is undefined', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Regular message"
          timestamp="2026-01-29T10:30:00Z"
        />
      );

      expect(screen.queryByText('Changes made:')).not.toBeInTheDocument();
    });

    it('should skip null and undefined values in applied changes', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Changes applied"
          timestamp="2026-01-29T10:30:00Z"
          responseType="change_applied"
          appliedChanges={{
            concept: {
              title: 'New Title',
              logline: null,
              synopsis: undefined,
            },
          }}
        />
      );

      expect(screen.getByText(/Updated title: "New Title"/)).toBeInTheDocument();
      expect(screen.queryByText(/logline/)).not.toBeInTheDocument();
      expect(screen.queryByText(/synopsis/)).not.toBeInTheDocument();
    });
  });

  describe('Recommendation Card', () => {
    it('should render RecommendationCard for recommendations', () => {
      render(
        <ChatMessage
          role="assistant"
          content="I recommend these changes"
          timestamp="2026-01-29T10:30:00Z"
          responseType="recommendation"
          recommendedChanges={{
            concept: { title: 'Suggested Title' },
            dna: {},
            rationale: 'This would improve the story',
          }}
          onApply={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByTestId('recommendation-card')).toBeInTheDocument();
      expect(screen.getByText('This would improve the story')).toBeInTheDocument();
    });

    it('should call onApply when Apply button is clicked', async () => {
      const user = userEvent.setup();
      const onApply = vi.fn();

      render(
        <ChatMessage
          role="assistant"
          content="I recommend these changes"
          timestamp="2026-01-29T10:30:00Z"
          responseType="recommendation"
          recommendedChanges={{
            concept: { title: 'Suggested Title' },
            dna: {},
            rationale: 'Rationale text',
          }}
          onApply={onApply}
          onDismiss={vi.fn()}
        />
      );

      await user.click(screen.getByText('Apply'));

      expect(onApply).toHaveBeenCalledTimes(1);
    });

    it('should call onDismiss when Dismiss button is clicked', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();

      render(
        <ChatMessage
          role="assistant"
          content="I recommend these changes"
          timestamp="2026-01-29T10:30:00Z"
          responseType="recommendation"
          recommendedChanges={{
            concept: { title: 'Suggested Title' },
            dna: {},
            rationale: 'Rationale text',
          }}
          onApply={vi.fn()}
          onDismiss={onDismiss}
        />
      );

      await user.click(screen.getByText('Dismiss'));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should not render RecommendationCard when recommendedChanges is undefined', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Regular message"
          timestamp="2026-01-29T10:30:00Z"
        />
      );

      expect(screen.queryByTestId('recommendation-card')).not.toBeInTheDocument();
    });

    it('should not render RecommendationCard when onApply is missing', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Message"
          timestamp="2026-01-29T10:30:00Z"
          recommendedChanges={{
            concept: { title: 'Title' },
            dna: {},
            rationale: 'Rationale',
          }}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.queryByTestId('recommendation-card')).not.toBeInTheDocument();
    });

    it('should not render RecommendationCard when onDismiss is missing', () => {
      render(
        <ChatMessage
          role="assistant"
          content="Message"
          timestamp="2026-01-29T10:30:00Z"
          recommendedChanges={{
            concept: { title: 'Title' },
            dna: {},
            rationale: 'Rationale',
          }}
          onApply={vi.fn()}
        />
      );

      expect(screen.queryByTestId('recommendation-card')).not.toBeInTheDocument();
    });
  });

  describe('Message Content', () => {
    it('should preserve whitespace in message content', () => {
      render(
        <ChatMessage
          role="user"
          content="Line 1\nLine 2\nLine 3"
          timestamp="2026-01-29T10:30:00Z"
        />
      );

      const messageElement = screen.getByText(/Line 1[\s\S]*Line 2[\s\S]*Line 3/);
      expect(messageElement).toBeInTheDocument();
      expect(messageElement.style.whiteSpace).toBe('pre-wrap');
    });

    it('should handle long text content', () => {
      const longText = 'This is a very long message that contains a lot of text. '.repeat(20);

      render(<ChatMessage role="user" content={longText} timestamp="2026-01-29T10:30:00Z" />);

      // Use partial match since the full text might be split
      expect(screen.getByText(/This is a very long message that contains a lot of text/)).toBeInTheDocument();
    });

    it('should handle special characters in content', () => {
      const specialContent = 'Special chars: <>&"\'';
      render(
        <ChatMessage role="user" content={specialContent} timestamp="2026-01-29T10:30:00Z" />
      );

      expect(screen.getByText(specialContent)).toBeInTheDocument();
    });

    it('should handle empty content', () => {
      render(<ChatMessage role="user" content="" timestamp="2026-01-29T10:30:00Z" />);

      // Should render without crashing
      expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
    });
  });

  describe('Badge Styling', () => {
    it('should apply correct colour for Answer badge', () => {
      const { container } = render(
        <ChatMessage
          role="assistant"
          content="This is the answer content"
          timestamp="2026-01-29T10:30:00Z"
          responseType="answer"
        />
      );

      // Find badge by looking for span with uppercase text
      const badge = Array.from(container.querySelectorAll('span')).find(
        (el) => el.textContent === 'ANSWER' || el.textContent === 'Answer'
      );
      expect(badge).toBeDefined();
      expect(badge!.style.background).toBe('rgb(219, 234, 254)'); // infoLight
      expect(badge!.style.color).toBe('rgb(30, 64, 175)'); // infoDark
    });

    it('should apply correct colour for Change Applied badge', () => {
      const { container } = render(
        <ChatMessage
          role="assistant"
          content="Changes have been made"
          timestamp="2026-01-29T10:30:00Z"
          responseType="change_applied"
        />
      );

      // Find badge by looking for span with the badge text
      const badge = Array.from(container.querySelectorAll('span')).find(
        (el) => el.textContent === 'CHANGE APPLIED' || el.textContent === 'Change Applied'
      );
      expect(badge).toBeDefined();
      expect(badge!.style.background).toBe('rgb(209, 250, 229)'); // successLight
      expect(badge!.style.color).toBe('rgb(5, 150, 105)'); // successDark
    });

    it('should apply correct colour for Recommendation badge', () => {
      const { container } = render(
        <ChatMessage
          role="assistant"
          content="I suggest making these changes"
          timestamp="2026-01-29T10:30:00Z"
          responseType="recommendation"
        />
      );

      // Find badge by looking for span with the badge text
      const badge = Array.from(container.querySelectorAll('span')).find(
        (el) => el.textContent === 'RECOMMENDATION' || el.textContent === 'Recommendation'
      );
      expect(badge).toBeDefined();
      expect(badge!.style.background).toBe('rgb(254, 243, 199)'); // warningLight
      expect(badge!.style.color).toBe('rgb(180, 83, 9)'); // warningDark
    });
  });

  describe('Layout and Spacing', () => {
    it('should limit message width to 80%', () => {
      const { container } = render(
        <ChatMessage role="user" content="Test message" timestamp="2026-01-29T10:30:00Z" />
      );

      const messageBubble = screen.getByText('Test message').parentElement;
      expect(messageBubble?.style.maxWidth).toBe('80%');
    });

    it('should align user messages to the right', () => {
      const { container } = render(
        <ChatMessage role="user" content="Test message" timestamp="2026-01-29T10:30:00Z" />
      );

      const messageContainer = container.firstChild as HTMLElement;
      expect(messageContainer.style.alignItems).toBe('flex-end');
    });

    it('should align assistant messages to the left', () => {
      const { container } = render(
        <ChatMessage
          role="assistant"
          content="Test message"
          timestamp="2026-01-29T10:30:00Z"
        />
      );

      const messageContainer = container.firstChild as HTMLElement;
      expect(messageContainer.style.alignItems).toBe('flex-start');
    });
  });
});
