'use client';

import { useState, useEffect } from 'react';
import { getToken } from '../lib/auth';
import { colors, borderRadius } from '../lib/constants';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface BookVersion {
  id: string;
  book_id: string;
  version_number: number;
  version_name: string | null;
  is_active: number;
  word_count: number;
  chapter_count: number;
  actual_chapter_count?: number;
  actual_word_count?: number;
  created_at: string;
  completed_at: string | null;
}

interface BookVersionSelectorProps {
  bookId: string;
  onVersionChange?: (version: BookVersion) => void;
  showCreateButton?: boolean;
  compact?: boolean;
  showEmptyWarning?: boolean;
}

export default function BookVersionSelector({
  bookId,
  onVersionChange,
  showCreateButton = false,
  compact = false,
  showEmptyWarning = false,
}: BookVersionSelectorProps) {
  const [versions, setVersions] = useState<BookVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<BookVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guard against undefined bookId - don't fetch if bookId is not valid
    if (!bookId) {
      return;
    }
    // Pass true to notify parent on initial load with the active version
    fetchVersions(true);
  }, [bookId]);

  // explicitVersionId: when provided, use this version instead of auto-selecting
  // This is used when user explicitly changes version via dropdown
  const fetchVersions = async (notifyParent = false, explicitVersionId?: string) => {
    try {
      setIsLoading(true);
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch versions');
      }

      const data = await response.json();
      const allVersions = data.versions || [];
      setVersions(allVersions);

      // Find the active version (marked in DB)
      const dbActiveVersion = allVersions.find((v: BookVersion) => v.is_active === 1);

      let selectedVersion: BookVersion | null = null;

      if (explicitVersionId) {
        // User explicitly selected a version - respect their choice
        selectedVersion = allVersions.find((v: BookVersion) => v.id === explicitVersionId) || dbActiveVersion;
      } else {
        // No explicit selection - use the database's active version
        selectedVersion = dbActiveVersion;
      }

      setActiveVersion(selectedVersion || null);

      // Notify parent of the selected version
      if (notifyParent && selectedVersion && onVersionChange) {
        onVersionChange(selectedVersion);
      }
    } catch (err: any) {
      console.error('Error fetching versions:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVersionChange = async (versionId: string) => {
    if (isChanging) return;

    setIsChanging(true);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/books/${bookId}/versions/${versionId}/activate`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to switch version');
      }

      // Refresh versions and notify parent with the explicitly selected version
      // Pass the versionId to ensure user's selection is respected
      await fetchVersions(true, versionId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsChanging(false);
    }
  };

  const handleCreateVersion = async () => {
    setIsChanging(true);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/versions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to create version');
      }

      await fetchVersions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsChanging(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        padding: compact ? '0.5rem' : '1rem',
        color: colors.textSecondary,
        fontSize: '0.875rem',
      }}>
        Loading versions...
      </div>
    );
  }

  // No versions yet - show nothing or minimal UI
  if (versions.length === 0) {
    if (!showCreateButton) return null;

    return (
      <div style={{
        padding: compact ? '0.5rem' : '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span style={{ fontSize: '0.8125rem', color: colors.textSecondary }}>
          No versions yet
        </span>
        <button
          onClick={handleCreateVersion}
          disabled={isChanging}
          style={{
            padding: '0.375rem 0.75rem',
            background: colors.brandLight,
            border: `1px solid ${colors.brandBorder}`,
            borderRadius: borderRadius.sm,
            color: colors.brandText,
            fontSize: '0.75rem',
            fontWeight: 500,
            cursor: isChanging ? 'not-allowed' : 'pointer',
          }}
        >
          Create Version 1
        </button>
      </div>
    );
  }

  // Single version - still notify parent but show minimal UI
  // IMPORTANT: We must still call onVersionChange even if we don't show the selector UI
  // Otherwise parent pages won't know which version is active and won't load data
  if (versions.length === 1 && !showCreateButton) {
    // The parent was already notified on initial load via fetchVersions(true)
    // So we can safely return null here - the callback was fired in the useEffect
    return null;
  }

  // Multiple versions - show selector
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: compact ? '0' : '0.5rem 0',
    }}>
      <label style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
      }}>
        Version:
      </label>

      <select
        value={activeVersion?.id || ''}
        onChange={(e) => handleVersionChange(e.target.value)}
        disabled={isChanging}
        style={{
          flex: compact ? 'none' : 1,
          minWidth: compact ? '150px' : '200px',
          padding: '0.5rem 0.75rem',
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.md,
          fontSize: '0.875rem',
          backgroundColor: colors.surface,
          cursor: isChanging ? 'not-allowed' : 'pointer',
        }}
      >
        {versions.map(version => {
          const chapterCount = version.actual_chapter_count ?? version.chapter_count ?? 0;
          const wordCount = version.actual_word_count ?? version.word_count ?? 0;
          const isEmpty = chapterCount === 0;
          return (
            <option key={version.id} value={version.id}>
              {version.version_name || `Version ${version.version_number}`}
              {version.is_active ? ' (Active)' : ''}
              {isEmpty ? ' - No content' : ` - ${chapterCount} chapters, ${(wordCount / 1000).toFixed(1)}k words`}
            </option>
          );
        })}
      </select>

      {showCreateButton && (
        <button
          onClick={handleCreateVersion}
          disabled={isChanging}
          style={{
            padding: '0.5rem 0.75rem',
            background: colors.surface,
            border: `1px solid ${colors.brandBorder}`,
            borderRadius: borderRadius.md,
            color: colors.brandText,
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: isChanging ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + New Version
        </button>
      )}

      {error && (
        <span style={{
          fontSize: '0.75rem',
          color: colors.error,
        }}>
          {error}
        </span>
      )}

      {/* Warning when selected version has no content */}
      {showEmptyWarning && activeVersion && (
        (activeVersion.actual_chapter_count ?? activeVersion.chapter_count ?? 0) === 0
      ) && (
        <span style={{
          fontSize: '0.75rem',
          color: '#B45309',
          fontStyle: 'italic',
        }}>
          This version has no chapters
        </span>
      )}
    </div>
  );
}
