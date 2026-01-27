'use client';

import { useState } from 'react';
import { colors, borderRadius, shadows } from '../lib/constants';

interface VersionPromptDialogProps {
  isOpen: boolean;
  existingChapterCount: number;
  existingWordCount: number;
  onCreateNewVersion: (versionName: string) => void;
  onOverwrite: () => void;
  onCancel: () => void;
}

export default function VersionPromptDialog({
  isOpen,
  existingChapterCount,
  existingWordCount,
  onCreateNewVersion,
  onOverwrite,
  onCancel,
}: VersionPromptDialogProps) {
  const [versionName, setVersionName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  if (!isOpen) return null;

  const handleCreateVersion = () => {
    if (showNameInput && versionName.trim()) {
      onCreateNewVersion(versionName.trim());
    } else if (showNameInput) {
      // Show validation
      return;
    } else {
      setShowNameInput(true);
    }
  };

  const handleClose = () => {
    setVersionName('');
    setShowNameInput(false);
    onCancel();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          boxShadow: shadows.lg,
          maxWidth: '500px',
          width: '100%',
          padding: '1.5rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: colors.text,
            margin: 0,
          }}>
            Existing Content Detected
          </h2>
          <p style={{
            fontSize: '0.875rem',
            color: colors.textSecondary,
            margin: '0.5rem 0 0 0',
          }}>
            This book already has {existingChapterCount} chapters ({(existingWordCount / 1000).toFixed(1)}k words)
          </p>
        </div>

        {/* Warning */}
        <div style={{
          backgroundColor: colors.warningLight,
          border: `1px solid ${colors.warningBorder}`,
          borderRadius: borderRadius.md,
          padding: '1rem',
          marginBottom: '1.5rem',
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: colors.warning,
            margin: 0,
            fontWeight: 500,
          }}>
            Regenerating will replace your existing chapters. What would you like to do?
          </p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Create New Version Option */}
          <div
            style={{
              padding: '1rem',
              border: `2px solid ${colors.brandBorder}`,
              borderRadius: borderRadius.md,
              backgroundColor: colors.brandLight,
              cursor: 'pointer',
            }}
            onClick={() => !showNameInput && setShowNameInput(true)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}>
                +
              </div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: colors.brandText,
                margin: 0,
              }}>
                Create New Version (Recommended)
              </h3>
            </div>
            <p style={{
              fontSize: '0.8125rem',
              color: colors.text,
              margin: 0,
              paddingLeft: '2.25rem',
            }}>
              Preserve your current chapters and start fresh with a new version. You can switch between versions anytime.
            </p>

            {showNameInput && (
              <div style={{ marginTop: '1rem', paddingLeft: '2.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: colors.text,
                  marginBottom: '0.375rem',
                }}>
                  Version Name (optional)
                </label>
                <input
                  type="text"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="e.g., Darker Ending, POV Change..."
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateNewVersion(versionName.trim() || '');
                  }}
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 1rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: borderRadius.md,
                    color: '#FFFFFF',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Create Version & Generate
                </button>
              </div>
            )}
          </div>

          {/* Overwrite Option */}
          <div
            style={{
              padding: '1rem',
              border: `1px solid ${colors.errorBorder}`,
              borderRadius: borderRadius.md,
              backgroundColor: colors.errorLight,
              cursor: 'pointer',
            }}
            onClick={onOverwrite}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: colors.error,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '0.875rem',
              }}>
                !
              </div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: colors.error,
                margin: 0,
              }}>
                Overwrite Existing
              </h3>
            </div>
            <p style={{
              fontSize: '0.8125rem',
              color: colors.text,
              margin: 0,
              paddingLeft: '2.25rem',
            }}>
              Delete the current {existingChapterCount} chapters and regenerate. This cannot be undone.
            </p>
          </div>
        </div>

        {/* Cancel */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '1.5rem',
        }}>
          <button
            onClick={handleClose}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.textSecondary,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
