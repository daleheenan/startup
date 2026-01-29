'use client';

import { useState, useRef, useEffect } from 'react';
import { colors, typography, spacing, borderRadius } from '@/app/lib/design-tokens';
import { getToken } from '@/app/lib/auth';
import ChatMessage from './ChatMessage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Local type definitions - use flexible types to accept various forms from parent
interface StoryConcept {
  title: string;
  logline: string | null;
  synopsis: string | null;
  hook: string | null;
  protagonistHint: string | null;
  conflictType: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface StoryDNA {
  genre: string;
  subgenre: string;
  tone: string;
  themes: string[];
  proseStyle: unknown;  // Accept any format - string or object
  timeframe?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PartialChanges = Record<string, any>;

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  responseType?: 'answer' | 'change_applied' | 'recommendation';
  appliedChanges?: {
    concept?: PartialChanges;
    dna?: PartialChanges;
  };
  recommendedChanges?: {
    concept?: PartialChanges;
    dna?: PartialChanges;
    rationale: string;
  };
}

interface EditorialAssistantProps {
  projectId: string;
  currentConcept: StoryConcept;
  currentDNA: StoryDNA;
  onApplyChanges: (changes: {
    concept?: PartialChanges;
    dna?: PartialChanges;
  }) => void;
}

/**
 * Main Editorial Assistant component.
 * Provides a conversational AI interface for editing story concept and DNA.
 */
export default function EditorialAssistant({
  projectId,
  currentConcept,
  currentDNA,
  onApplyChanges,
}: EditorialAssistantProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    const trimmedInput = userInput.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}/editorial-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userQuery: trimmedInput,
            currentConcept,
            currentDNA,
            conversationHistory: messages.slice(-10), // Last 10 messages for context
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.data.content,
        timestamp: new Date().toISOString(),
        responseType: data.data.responseType,
        appliedChanges: data.data.appliedChanges,
        recommendedChanges: data.data.recommendedChanges,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Auto-apply changes for "change_applied" responses
      if (data.data.responseType === 'change_applied' && data.data.appliedChanges) {
        onApplyChanges(data.data.appliedChanges);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Editorial assistant error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyRecommendation = (
    messageId: string,
    changes: { concept?: Partial<StoryConcept>; dna?: Partial<StoryDNA> }
  ) => {
    onApplyChanges(changes);
    // Remove recommendation card from UI
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, recommendedChanges: undefined } : msg
      )
    );
  };

  const handleDismissRecommendation = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, recommendedChanges: undefined } : msg
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      style={{
        background: colors.background.surface,
        border: `1px solid ${colors.border.default}`,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '600px',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: spacing[4],
          borderBottom: `1px solid ${colors.border.default}`,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.white,
          }}
        >
          Editorial Assistant
        </h3>
        <p
          style={{
            margin: 0,
            marginTop: spacing[1],
            fontSize: typography.fontSize.sm,
            color: 'rgba(255, 255, 255, 0.9)',
          }}
        >
          Ask questions or request changes to your story concept and DNA
        </p>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: spacing[4],
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[4],
          background: colors.background.primary,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: colors.text.tertiary,
              padding: spacing[8],
            }}
          >
            <div
              style={{
                fontSize: '3rem',
                marginBottom: spacing[3],
              }}
            >
              💬
            </div>
            <p style={{ margin: 0, fontSize: typography.fontSize.base }}>
              Start a conversation by asking a question or requesting changes
            </p>
            <p
              style={{
                margin: 0,
                marginTop: spacing[2],
                fontSize: typography.fontSize.sm,
                color: colors.text.disabled,
              }}
            >
              For example: "What genre would suit this story?" or "Change the tone to darker"
            </p>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            timestamp={message.timestamp}
            responseType={message.responseType}
            appliedChanges={message.appliedChanges}
            recommendedChanges={message.recommendedChanges}
            onApply={
              message.recommendedChanges
                ? () =>
                    handleApplyRecommendation(
                      message.id,
                      message.recommendedChanges!
                    )
                : undefined
            }
            onDismiss={
              message.recommendedChanges
                ? () => handleDismissRecommendation(message.id)
                : undefined
            }
          />
        ))}

        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              color: colors.text.tertiary,
              fontSize: typography.fontSize.sm,
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                border: `2px solid ${colors.border.default}`,
                borderTop: `2px solid ${colors.brand.primary}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <span>AI is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: spacing[3],
            background: colors.semantic.errorLight,
            border: `1px solid ${colors.semantic.errorBorder}`,
            color: colors.semantic.errorDark,
            fontSize: typography.fontSize.sm,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: colors.semantic.errorDark,
              cursor: 'pointer',
              fontSize: typography.fontSize.lg,
              padding: 0,
              lineHeight: 1,
            }}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Input Area */}
      <div
        style={{
          padding: spacing[4],
          borderTop: `1px solid ${colors.border.default}`,
          background: colors.background.surface,
        }}
      >
        <div style={{ display: 'flex', gap: spacing[2] }}>
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question or request changes..."
            rows={2}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: spacing[3],
              border: `1px solid ${colors.border.default}`,
              borderRadius: borderRadius.md,
              fontSize: typography.fontSize.base,
              resize: 'none',
              fontFamily: typography.fontFamily.base,
              color: colors.text.primary,
              background: colors.background.surface,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.border.focus;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.border.default;
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!userInput.trim() || isLoading}
            style={{
              padding: `${spacing[3]} ${spacing[5]}`,
              background:
                !userInput.trim() || isLoading
                  ? colors.text.disabled
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: borderRadius.md,
              color: colors.white,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              cursor: !userInput.trim() || isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              minWidth: '80px',
            }}
            onMouseOver={(e) => {
              if (!userInput.trim() || isLoading) return;
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow =
                '0 4px 14px rgba(102, 126, 234, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Send
          </button>
        </div>
        <p
          style={{
            margin: 0,
            marginTop: spacing[2],
            fontSize: typography.fontSize.xs,
            color: colors.text.disabled,
          }}
        >
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>

      {/* Loading spinner animation */}
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
