'use client';

import { useState, useEffect, useRef } from 'react';

export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface GenerationProgressProps {
  isActive: boolean;
  title?: string;
  subtitle?: string;
  steps?: ProgressStep[];
  estimatedTime?: number; // in seconds
  currentStep?: string;
  error?: string | null;
  onCancel?: () => void;
  wordCount?: number; // Current word count being generated
  targetWordCount?: number; // Target word count
}

const MESSAGES = [
  'Analyzing story requirements...',
  'Crafting narrative structure...',
  'Developing character arcs...',
  'Building world elements...',
  'Weaving plot threads...',
  'Refining story details...',
  'Polishing the narrative...',
  'Finalizing generation...',
];

export default function GenerationProgress({
  isActive,
  title = 'Generating with AI',
  subtitle,
  steps,
  estimatedTime = 120,
  currentStep,
  error,
  onCancel,
  wordCount = 0,
  targetWordCount = 0,
}: GenerationProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      setMessageIndex(0);

      const timer = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);

      const messageTimer = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
      }, 4000);

      return () => {
        clearInterval(timer);
        clearInterval(messageTimer);
      };
    } else {
      startTimeRef.current = null;
    }
  }, [isActive]);

  if (!isActive && !error) return null;

  const progress = Math.min((elapsedTime / estimatedTime) * 100, 95);
  const displayMessage = currentStep || MESSAGES[messageIndex];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-title"
      aria-describedby="progress-description"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {/* Animated Logo */}
          <div
            style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1rem',
              background: error
                ? '#FEF2F2'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: error ? 'none' : 'pulse 2s ease-in-out infinite',
            }}
          >
            {error ? (
              <span style={{ fontSize: '2rem' }}>!</span>
            ) : (
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#FFFFFF',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            )}
          </div>

          <h2
            id="progress-title"
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: error ? '#DC2626' : '#1A1A2E',
              margin: 0,
            }}
          >
            {error ? 'Generation Failed' : title}
          </h2>
          {subtitle && !error && (
            <p
              id="progress-description"
              style={{ color: '#475569', margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
              {subtitle}
            </p>
          )}
        </div>

        {error ? (
          /* Error State */
          <div>
            <div
              role="alert"
              aria-live="assertive"
              id="progress-description"
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                color: '#DC2626',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                aria-label="Try generation again"
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  minHeight: '44px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid #667eea';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                Try Again
              </button>
            )}
          </div>
        ) : (
          /* Progress State */
          <>
            {/* Progress Bar */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Generation progress"
                style={{
                  height: '8px',
                  background: '#E2E8F0',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '4px',
                    transition: 'width 0.5s ease-out',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#475569',
                }}
              >
                <span>{formatTime(elapsedTime)} elapsed</span>
                <span>~{formatTime(Math.max(0, estimatedTime - elapsedTime))} remaining</span>
              </div>

              {/* Word Count Progress */}
              {(wordCount > 0 || targetWordCount > 0) && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#667eea',
                  }}
                >
                  <span>
                    {wordCount.toLocaleString()} words
                    {targetWordCount > 0 && ` / ${targetWordCount.toLocaleString()} target`}
                  </span>
                </div>
              )}
            </div>

            {/* Current Action */}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: '8px',
                    height: '8px',
                    background: '#059669',
                    borderRadius: '50%',
                    animation: 'blink 1s ease-in-out infinite',
                  }}
                />
                <span
                  style={{
                    color: '#1A1A2E',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  {displayMessage}
                </span>
              </div>
            </div>

            {/* Steps (if provided) */}
            {steps && steps.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem 0',
                      borderBottom:
                        index < steps.length - 1 ? '1px solid #E2E8F0' : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background:
                          step.status === 'completed'
                            ? '#10B981'
                            : step.status === 'active'
                            ? '#667eea'
                            : step.status === 'error'
                            ? '#DC2626'
                            : '#E2E8F0',
                        color:
                          step.status === 'pending' ? '#64748B' : '#FFFFFF',
                      }}
                    >
                      {step.status === 'completed' ? (
                        <span>Y</span>
                      ) : step.status === 'error' ? (
                        '!'
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      style={{
                        color:
                          step.status === 'active'
                            ? '#1A1A2E'
                            : step.status === 'completed'
                            ? '#10B981'
                            : '#64748B',
                        fontWeight: step.status === 'active' ? 600 : 400,
                        fontSize: '0.875rem',
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Cancel Button */}
            {onCancel && (
              <button
                onClick={onCancel}
                aria-label="Cancel the generation process"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  minHeight: '44px',
                  background: 'transparent',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#475569',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid #667eea';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                Cancel Generation
              </button>
            )}

            {/* Tips */}
            <p
              style={{
                textAlign: 'center',
                color: '#94A3B8',
                fontSize: '0.75rem',
                marginTop: '1rem',
                margin: '1rem 0 0',
              }}
            >
              AI generation typically takes 1-3 minutes. Please don't refresh the page.
            </p>
          </>
        )}

        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
          @keyframes pulse {
            0%,
            100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
          @keyframes blink {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.4;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
