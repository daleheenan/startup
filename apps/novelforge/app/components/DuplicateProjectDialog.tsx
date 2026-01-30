'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../lib/auth';
import { colors, borderRadius, shadows } from '../lib/constants';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DuplicateProjectDialogProps {
  projectId: string;
  projectTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onDuplicated?: (newProject: any) => void;
}

export default function DuplicateProjectDialog({
  projectId,
  projectTitle,
  isOpen,
  onClose,
  onDuplicated,
}: DuplicateProjectDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to duplicate project');
      }

      const result = await response.json();

      if (onDuplicated) {
        onDuplicated(result.project);
      }

      // Navigate to the new project
      router.push(`/projects/${result.project.id}`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate project');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleClose = () => {
    if (!isDuplicating) {
      setTitle('');
      setError(null);
      onClose();
    }
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
            Duplicate Project
          </h2>
          <p style={{
            fontSize: '0.875rem',
            color: colors.textSecondary,
            margin: '0.5rem 0 0 0',
          }}>
            Create a new project from "{projectTitle}"
          </p>
        </div>

        {/* What gets copied info */}
        <div style={{
          backgroundColor: colors.brandLight,
          border: `1px solid ${colors.brandBorder}`,
          borderRadius: borderRadius.md,
          padding: '1rem',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: colors.brandText,
            margin: '0 0 0.5rem 0',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            What gets copied
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '1.25rem',
            fontSize: '0.8125rem',
            color: colors.text,
            lineHeight: 1.6,
          }}>
            <li>Story concept (title, logline, synopsis, hook)</li>
            <li>Story DNA (genre, tone, themes, prose style)</li>
            <li>Characters and character details</li>
            <li>World elements and settings</li>
            <li>Time period settings</li>
          </ul>

          <h3 style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: colors.warning,
            margin: '1rem 0 0.5rem 0',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            What starts fresh
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '1.25rem',
            fontSize: '0.8125rem',
            color: colors.text,
            lineHeight: 1.6,
          }}>
            <li>Plot structure</li>
            <li>Outline</li>
            <li>Chapters and content</li>
            <li>Publishing settings</li>
          </ul>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: colors.text,
              marginBottom: '0.375rem',
            }}>
              New Project Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${projectTitle} (Copy)`}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.md,
                fontSize: '0.9375rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: colors.errorLight,
            border: `1px solid ${colors.errorBorder}`,
            borderRadius: borderRadius.md,
            color: colors.error,
            fontSize: '0.8125rem',
          }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          marginTop: '1.5rem',
        }}>
          <button
            onClick={handleClose}
            disabled={isDuplicating}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              color: colors.textSecondary,
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: isDuplicating ? 'not-allowed' : 'pointer',
              opacity: isDuplicating ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDuplicate}
            disabled={isDuplicating}
            style={{
              padding: '0.625rem 1.25rem',
              background: isDuplicating
                ? 'rgba(102, 126, 234, 0.5)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: borderRadius.md,
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isDuplicating ? 'not-allowed' : 'pointer',
            }}
          >
            {isDuplicating ? 'Duplicating...' : 'Duplicate Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
