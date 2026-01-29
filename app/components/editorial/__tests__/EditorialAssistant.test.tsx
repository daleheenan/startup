import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditorialAssistant from '../EditorialAssistant';

// Mock auth
vi.mock('@/app/lib/auth', () => ({
  getToken: vi.fn(() => 'test-token'),
}));

// Mock design tokens
vi.mock('@/app/lib/design-tokens', () => ({
  colors: {
    background: {
      surface: '#FFFFFF',
      primary: '#F8FAFC',
    },
    border: {
      default: '#E2E8F0',
      focus: '#667eea',
    },
    text: {
      primary: '#1A1A2E',
      secondary: '#475569',
      tertiary: '#64748B',
      disabled: '#64748B',
    },
    white: '#FFFFFF',
    brand: {
      primary: '#667eea',
    },
    semantic: {
      errorLight: '#FEF2F2',
      errorBorder: '#FECACA',
      errorDark: '#B91C1C',
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
    fontFamily: {
      base: 'sans-serif',
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
    5: '1.25rem',
    8: '2rem',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
}));

// Mock ChatMessage component
vi.mock('../ChatMessage', () => ({
  default: ({ role, content, timestamp }: any) => (
    <div data-testid={`chat-message-${role}`}>
      <div>{content}</div>
      <div>{timestamp}</div>
    </div>
  ),
}));

const mockProps = {
  projectId: 'test-project-123',
  currentConcept: {
    title: 'Test Story',
    logline: 'A test logline',
    synopsis: null,
    hook: null,
    protagonistHint: null,
    conflictType: null,
  },
  currentDNA: {
    genre: 'Fantasy',
    subgenre: 'Urban',
    tone: 'Dark',
    themes: ['redemption'],
    proseStyle: 'Descriptive',
    timeframe: 'Modern',
  },
  onApplyChanges: vi.fn(),
};

describe('EditorialAssistant', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    global.fetch = vi.fn();

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();

    // Reset auth mock to return valid token
    const { getToken } = await import('@/app/lib/auth');
    (getToken as any).mockReturnValue('test-token');
  });

  describe('Rendering', () => {
    it('should render component with header', () => {
      render(<EditorialAssistant {...mockProps} />);

      expect(screen.getByText('Editorial Assistant')).toBeInTheDocument();
      expect(
        screen.getByText('Ask questions or request changes to your story concept and DNA')
      ).toBeInTheDocument();
    });

    it('should render empty state with placeholder text', () => {
      render(<EditorialAssistant {...mockProps} />);

      expect(
        screen.getByText('Start a conversation by asking a question or requesting changes')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/For example: "What genre would suit this story\?" or "Change the tone to darker"/)
      ).toBeInTheDocument();
    });

    it('should render input textarea', () => {
      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('should render send button', () => {
      render(<EditorialAssistant {...mockProps} />);

      expect(screen.getByText('Send')).toBeInTheDocument();
    });

    it('should render keyboard hint text', () => {
      render(<EditorialAssistant {...mockProps} />);

      expect(screen.getByText('Press Enter to send, Shift+Enter for new line')).toBeInTheDocument();
    });
  });

  describe('Input Behaviour', () => {
    it('should disable send button when input is empty', () => {
      render(<EditorialAssistant {...mockProps} />);

      const sendButton = screen.getByText('Send') as HTMLButtonElement;
      expect(sendButton.disabled).toBe(true);
    });

    it('should enable send button when input has text', async () => {
      const user = userEvent.setup();
      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      const sendButton = screen.getByText('Send') as HTMLButtonElement;

      expect(sendButton.disabled).toBe(true);

      await user.type(textarea, 'What genre is this?');

      expect(sendButton.disabled).toBe(false);
    });

    it('should disable send button when input contains only whitespace', async () => {
      const user = userEvent.setup();
      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      const sendButton = screen.getByText('Send') as HTMLButtonElement;

      await user.type(textarea, '   ');

      expect(sendButton.disabled).toBe(true);
    });

    it('should update textarea value on input', async () => {
      const user = userEvent.setup();
      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText(
        'Ask a question or request changes...'
      ) as HTMLTextAreaElement;

      await user.type(textarea, 'Test message');

      expect(textarea.value).toBe('Test message');
    });

    it('should focus textarea on mount', () => {
      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      expect(textarea).toHaveFocus();
    });
  });

  describe('Keyboard Interactions', () => {
    it('should send message on Enter key', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            content: 'AI response',
            responseType: 'answer',
          },
        }),
      });

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');

      await user.type(textarea, 'Test message{Enter}');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should not send message on Shift+Enter', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn();

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');

      await user.type(textarea, 'Test message{Shift>}{Enter}{/Shift}');

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should add newline on Shift+Enter', async () => {
      const user = userEvent.setup();
      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText(
        'Ask a question or request changes...'
      ) as HTMLTextAreaElement;

      await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      expect(textarea.value).toContain('\n');
    });
  });

  describe('API Communication', () => {
    it('should call API with correct payload when sending message', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            content: 'AI response',
            responseType: 'answer',
          },
        }),
      });

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      await user.type(textarea, 'What is the genre?');

      const sendButton = screen.getByText('Send');
      await user.click(sendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/projects/test-project-123/editorial-assistant',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-token',
            },
            body: expect.stringContaining('What is the genre?'),
          })
        );
      });
    });

    it('should include conversation history in API call', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            content: 'AI response',
            responseType: 'answer',
          },
        }),
      });

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');

      // Send first message
      await user.type(textarea, 'First message');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Send second message
      await user.type(textarea, 'Second message');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      const secondCall = (global.fetch as any).mock.calls[1];
      const body = JSON.parse(secondCall[1].body);
      expect(body.conversationHistory).toHaveLength(2);
    });

    it('should send authentication token in headers', async () => {
      const user = userEvent.setup();
      const { getToken } = await import('@/app/lib/auth');
      (getToken as any).mockReturnValue('custom-token-123');

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            content: 'AI response',
            responseType: 'answer',
          },
        }),
      });

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      await user.type(textarea, 'Test');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer custom-token-123',
            }),
          })
        );
      });
    });
  });

  describe('Message Display', () => {
    it('should display user message after sending', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            content: 'AI response',
            responseType: 'answer',
          },
        }),
      });

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      await user.type(textarea, 'My question');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(screen.getByText('My question')).toBeInTheDocument();
      });
    });

    it('should display AI response after receiving', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            content: 'This is the AI response',
            responseType: 'answer',
          },
        }),
      });

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      await user.type(textarea, 'Question');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(screen.getByText('This is the AI response')).toBeInTheDocument();
      });
    });

    it('should clear input after sending message', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            content: 'AI response',
            responseType: 'answer',
          },
        }),
      });

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText(
        'Ask a question or request changes...'
      ) as HTMLTextAreaElement;
      await user.type(textarea, 'Question');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('should hide empty state when messages exist', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            content: 'AI response',
            responseType: 'answer',
          },
        }),
      });

      render(<EditorialAssistant {...mockProps} />);

      expect(
        screen.getByText('Start a conversation by asking a question or requesting changes')
      ).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      await user.type(textarea, 'Question');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(
          screen.queryByText('Start a conversation by asking a question or requesting changes')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state while waiting for response', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    data: {
                      content: 'Response',
                      responseType: 'answer',
                    },
                  }),
                }),
              100
            );
          })
      );

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      await user.type(textarea, 'Question');
      await user.click(screen.getByText('Send'));

      expect(screen.getByText('AI is thinking...')).toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.queryByText('AI is thinking...')).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should disable input and button while loading', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    data: {
                      content: 'Response',
                      responseType: 'answer',
                    },
                  }),
                }),
              100
            );
          })
      );

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText(
        'Ask a question or request changes...'
      ) as HTMLTextAreaElement;
      const sendButton = screen.getByText('Send') as HTMLButtonElement;

      await user.type(textarea, 'Question');
      await user.click(sendButton);

      expect(textarea.disabled).toBe(true);
      expect(sendButton.disabled).toBe(true);

      await waitFor(
        () => {
          expect(textarea.disabled).toBe(false);
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Error Handling', () => {
    it('should show error message on API failure', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      await user.type(textarea, 'Question');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should show error when API returns non-ok response', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            message: 'Invalid request',
          },
        }),
      });

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      await user.type(textarea, 'Question');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(screen.getByText('Invalid request')).toBeInTheDocument();
      });
    });

    it('should show error when token is missing', async () => {
      const user = userEvent.setup();
      const { getToken } = await import('@/app/lib/auth');
      (getToken as any).mockReturnValue(null);

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      await user.type(textarea, 'Question');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(screen.getByText('Authentication required. Please log in again.')).toBeInTheDocument();
      });
    });

    it('should allow dismissing error message', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Test error'));

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      await user.type(textarea, 'Question');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      const dismissButton = screen.getByLabelText('Dismiss error');
      await user.click(dismissButton);

      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  describe('Auto-Apply Changes', () => {
    it('should auto-apply changes for change_applied response', async () => {
      const user = userEvent.setup();
      const onApplyChanges = vi.fn();

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            content: 'Changes applied',
            responseType: 'change_applied',
            appliedChanges: {
              concept: {
                title: 'New Title',
              },
              dna: {
                tone: 'Lighter',
              },
            },
          },
        }),
      });

      render(<EditorialAssistant {...mockProps} onApplyChanges={onApplyChanges} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      await user.type(textarea, 'Change the title');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(onApplyChanges).toHaveBeenCalledWith({
          concept: {
            title: 'New Title',
          },
          dna: {
            tone: 'Lighter',
          },
        });
      });
    });

    it('should not auto-apply for answer response', async () => {
      const user = userEvent.setup();
      const onApplyChanges = vi.fn();

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            content: 'This is an answer',
            responseType: 'answer',
          },
        }),
      });

      render(<EditorialAssistant {...mockProps} onApplyChanges={onApplyChanges} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      await user.type(textarea, 'What is the genre?');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(screen.getByText('This is an answer')).toBeInTheDocument();
      });

      expect(onApplyChanges).not.toHaveBeenCalled();
    });

    it('should not auto-apply for recommendation response', async () => {
      const user = userEvent.setup();
      const onApplyChanges = vi.fn();

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            content: 'I recommend these changes',
            responseType: 'recommendation',
            recommendedChanges: {
              concept: { title: 'Suggested Title' },
              dna: {},
              rationale: 'This would be better',
            },
          },
        }),
      });

      render(<EditorialAssistant {...mockProps} onApplyChanges={onApplyChanges} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      await user.type(textarea, 'Suggest changes');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(screen.getByText('I recommend these changes')).toBeInTheDocument();
      });

      expect(onApplyChanges).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Messages', () => {
    it('should display multiple messages in order', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            content: 'Response',
            responseType: 'answer',
          },
        }),
      });

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');

      // Send first message
      await user.type(textarea, 'First question');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(screen.getByText('First question')).toBeInTheDocument();
      });

      // Send second message
      await user.type(textarea, 'Second question');
      await user.click(screen.getByText('Send'));

      await waitFor(() => {
        expect(screen.getByText('Second question')).toBeInTheDocument();
      });

      // Both messages should be visible
      expect(screen.getByText('First question')).toBeInTheDocument();
      expect(screen.getByText('Second question')).toBeInTheDocument();
    });
  });

  describe('Button Click', () => {
    it('should send message when send button is clicked', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            content: 'Response',
            responseType: 'answer',
          },
        }),
      });

      render(<EditorialAssistant {...mockProps} />);

      const textarea = screen.getByPlaceholderText('Ask a question or request changes...');
      await user.type(textarea, 'Test message');

      const sendButton = screen.getByText('Send');
      await user.click(sendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should not send message when button is disabled', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn();

      render(<EditorialAssistant {...mockProps} />);

      const sendButton = screen.getByText('Send');
      await user.click(sendButton);

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
