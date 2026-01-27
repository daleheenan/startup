'use client';

import { useState } from 'react';
import { getToken } from '../lib/auth';
import { colors, borderRadius } from '../lib/constants';
import { card } from '../lib/styles';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Replacement {
  location: string;
  field: string;
  originalText: string;
  count: number;
}

interface SearchReplaceProps {
  projectId: string;
}

export default function SearchReplace({ projectId }: SearchReplaceProps) {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [previewResults, setPreviewResults] = useState<{
    totalReplacements: number;
    locations: number;
    replacements: Replacement[];
  } | null>(null);
  const [replaceResults, setReplaceResults] = useState<{
    totalReplacements: number;
    locations: number;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    if (!searchText.trim()) {
      setError('Please enter text to search for');
      return;
    }

    setIsSearching(true);
    setError(null);
    setPreviewResults(null);
    setReplaceResults(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/search-replace`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchText,
          replaceText,
          caseSensitive,
          preview: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Search failed');
      }

      const data = await response.json();
      setPreviewResults({
        totalReplacements: data.totalReplacements,
        locations: data.locations,
        replacements: data.replacements,
      });
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleReplace = async () => {
    if (!searchText.trim()) {
      setError('Please enter text to search for');
      return;
    }

    if (!previewResults || previewResults.totalReplacements === 0) {
      setError('Please preview first to see what will be replaced');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to replace ${previewResults.totalReplacements} occurrences of "${searchText}" with "${replaceText}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setIsReplacing(true);
    setError(null);
    setReplaceResults(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/search-replace`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchText,
          replaceText,
          caseSensitive,
          preview: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Replace failed');
      }

      const data = await response.json();
      setReplaceResults({
        totalReplacements: data.totalReplacements,
        locations: data.locations,
        message: data.message,
      });
      setPreviewResults(null);
      setSearchText('');
      setReplaceText('');
    } catch (err: any) {
      setError(err.message || 'Replace failed');
    } finally {
      setIsReplacing(false);
    }
  };

  return (
    <div style={{ ...card, padding: '1.5rem' }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: 600,
        color: colors.text,
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span>🔄</span> Search & Replace
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Search input */}
        <div>
          <label style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: colors.textSecondary,
            display: 'block',
            marginBottom: '0.375rem',
          }}>
            Search for
          </label>
          <input
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPreviewResults(null);
              setReplaceResults(null);
            }}
            placeholder="Enter text to find..."
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              fontSize: '0.9375rem',
            }}
          />
        </div>

        {/* Replace input */}
        <div>
          <label style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: colors.textSecondary,
            display: 'block',
            marginBottom: '0.375rem',
          }}>
            Replace with
          </label>
          <input
            type="text"
            value={replaceText}
            onChange={(e) => {
              setReplaceText(e.target.value);
              setPreviewResults(null);
              setReplaceResults(null);
            }}
            placeholder="Enter replacement text..."
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              fontSize: '0.9375rem',
            }}
          />
        </div>

        {/* Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: colors.textSecondary,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => {
                setCaseSensitive(e.target.checked);
                setPreviewResults(null);
              }}
            />
            Case sensitive
          </label>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handlePreview}
            disabled={isSearching || !searchText.trim()}
            style={{
              padding: '0.625rem 1.25rem',
              background: colors.surface,
              border: `1px solid ${colors.brandBorder}`,
              borderRadius: borderRadius.md,
              color: colors.brandText,
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: isSearching || !searchText.trim() ? 'not-allowed' : 'pointer',
              opacity: isSearching || !searchText.trim() ? 0.6 : 1,
            }}
          >
            {isSearching ? 'Searching...' : 'Preview'}
          </button>
          <button
            onClick={handleReplace}
            disabled={isReplacing || !previewResults || previewResults.totalReplacements === 0}
            style={{
              padding: '0.625rem 1.25rem',
              background: previewResults && previewResults.totalReplacements > 0
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : colors.background,
              border: 'none',
              borderRadius: borderRadius.md,
              color: previewResults && previewResults.totalReplacements > 0 ? '#FFFFFF' : colors.textSecondary,
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isReplacing || !previewResults || previewResults.totalReplacements === 0 ? 'not-allowed' : 'pointer',
              opacity: isReplacing || !previewResults || previewResults.totalReplacements === 0 ? 0.6 : 1,
            }}
          >
            {isReplacing ? 'Replacing...' : 'Replace All'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '0.75rem',
            background: colors.errorLight,
            border: `1px solid ${colors.errorBorder}`,
            borderRadius: borderRadius.md,
            color: colors.error,
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        {/* Preview Results */}
        {previewResults && (
          <div style={{
            padding: '1rem',
            background: colors.warningLight,
            border: `1px solid ${colors.warningBorder}`,
            borderRadius: borderRadius.md,
          }}>
            <div style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: colors.warning,
              marginBottom: '0.75rem',
            }}>
              Found {previewResults.totalReplacements} occurrence{previewResults.totalReplacements !== 1 ? 's' : ''} in {previewResults.locations} location{previewResults.locations !== 1 ? 's' : ''}
            </div>
            {previewResults.replacements.length > 0 && (
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                fontSize: '0.8125rem',
              }}>
                {previewResults.replacements.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.5rem',
                      background: colors.surface,
                      borderRadius: borderRadius.sm,
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div style={{ fontWeight: 500, color: colors.text, marginBottom: '0.25rem' }}>
                      {r.location} ({r.count}x)
                    </div>
                    <div style={{ color: colors.textSecondary, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      ...{r.originalText}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Replace Results */}
        {replaceResults && (
          <div style={{
            padding: '1rem',
            background: colors.successLight,
            border: `1px solid ${colors.successBorder}`,
            borderRadius: borderRadius.md,
          }}>
            <div style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: colors.success,
            }}>
              ✓ {replaceResults.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
