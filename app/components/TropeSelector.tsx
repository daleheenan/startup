'use client';

import { useState, useEffect } from 'react';
import { colors, borderRadius, API_BASE_URL } from '../lib/constants';
import { getToken } from '../lib/auth';

export interface GenreTrope {
  id: string;
  trope_name: string;
  description: string;
  genre: string;
  subgenre?: string;
  trope_type: 'character' | 'plot' | 'setting' | 'relationship' | 'theme' | 'device';
  usage_frequency: 'common' | 'moderate' | 'rare';
  compatibility_tags?: string[];
  warning_tags?: string[];
  examples?: string[];
  subversions?: string[];
}

export interface TropeSelection {
  tropeId: string;
  preference: 'include' | 'exclude' | 'subvert';
}

interface TropeSelectorProps {
  genres: string[];
  subgenres: string[];
  selectedTropes: TropeSelection[];
  onTropesChange: (tropes: TropeSelection[]) => void;
  isLoading?: boolean;
}

export default function TropeSelector({
  genres,
  subgenres,
  selectedTropes,
  onTropesChange,
  isLoading = false,
}: TropeSelectorProps) {
  const [availableTropes, setAvailableTropes] = useState<GenreTrope[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTrope, setExpandedTrope] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch tropes when genres change
  useEffect(() => {
    if (genres.length === 0) {
      setAvailableTropes([]);
      return;
    }

    const fetchTropes = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/genre-tropes/recommended`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ genres, subgenres }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch tropes');
        }

        const data = await response.json();
        setAvailableTropes(data.tropes || []);
      } catch (err) {
        console.error('Error fetching tropes:', err);
        setError('Failed to load tropes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTropes();
  }, [genres, subgenres]);

  const handleTropeToggle = (tropeId: string, preference: 'include' | 'exclude' | 'subvert') => {
    const existing = selectedTropes.find((t) => t.tropeId === tropeId);

    if (existing) {
      if (existing.preference === preference) {
        // Remove if clicking the same preference
        onTropesChange(selectedTropes.filter((t) => t.tropeId !== tropeId));
      } else {
        // Update preference
        onTropesChange(
          selectedTropes.map((t) => (t.tropeId === tropeId ? { ...t, preference } : t))
        );
      }
    } else {
      // Add new selection
      onTropesChange([...selectedTropes, { tropeId, preference }]);
    }
  };

  const getTropeSelection = (tropeId: string): TropeSelection | undefined => {
    return selectedTropes.find((t) => t.tropeId === tropeId);
  };

  const getFrequencyColor = (frequency: string): string => {
    switch (frequency) {
      case 'common':
        return colors.success;
      case 'moderate':
        return colors.warning;
      case 'rare':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'character':
        return '👤';
      case 'plot':
        return '📖';
      case 'setting':
        return '🌍';
      case 'relationship':
        return '💞';
      case 'theme':
        return '💭';
      case 'device':
        return '🔧';
      default:
        return '📝';
    }
  };

  const filteredTropes =
    filterType === 'all'
      ? availableTropes
      : availableTropes.filter((t) => t.trope_type === filterType);

  const groupedByType = filteredTropes.reduce((acc, trope) => {
    if (!acc[trope.trope_type]) {
      acc[trope.trope_type] = [];
    }
    acc[trope.trope_type].push(trope);
    return acc;
  }, {} as Record<string, GenreTrope[]>);

  if (genres.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: colors.textSecondary,
          background: colors.background,
          borderRadius: borderRadius.md,
          border: `1px dashed ${colors.borderHover}`,
        }}
      >
        Select genres above to see available tropes
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: colors.textSecondary,
        }}
      >
        Loading tropes...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '1rem',
          background: colors.errorLight,
          border: `1px solid ${colors.errorBorder}`,
          borderRadius: borderRadius.md,
          color: colors.error,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '0.5rem' }}>
          Select tropes to include, exclude, or subvert in your story. These will guide the AI
          during concept generation.
        </div>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: '#64748B',
            marginTop: '0.5rem',
          }}
        >
          <div>
            <strong>Include:</strong> Use this trope
          </div>
          <div>
            <strong>Exclude:</strong> Avoid this trope
          </div>
          <div>
            <strong>Subvert:</strong> Twist this trope
          </div>
        </div>
      </div>

      {/* Type Filter */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {['all', 'character', 'plot', 'setting', 'relationship', 'theme', 'device'].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilterType(type)}
            style={{
              padding: '0.5rem 1rem',
              background: filterType === type ? colors.brandStart : colors.background,
              border: `1px solid ${filterType === type ? colors.brandStart : colors.border}`,
              borderRadius: '20px',
              color: filterType === type ? colors.surface : '#374151',
              fontSize: '0.813rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {type === 'all' ? 'All Types' : `${getTypeIcon(type)} ${type.charAt(0).toUpperCase() + type.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Tropes Grid */}
      <div
        style={{
          display: 'grid',
          gap: '1rem',
        }}
      >
        {Object.entries(groupedByType).map(([type, tropes]) => (
          <div key={type}>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '0.75rem',
                textTransform: 'capitalize',
              }}
            >
              {getTypeIcon(type)} {type} Tropes ({tropes.length})
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {tropes.map((trope) => {
                const selection = getTropeSelection(trope.id);
                const isExpanded = expandedTrope === trope.id;

                return (
                  <div
                    key={trope.id}
                    style={{
                      background: colors.surface,
                      border: `2px solid ${selection ? colors.brandStart : colors.border}`,
                      borderRadius: borderRadius.md,
                      padding: '1rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Trope Header */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <h5
                          style={{
                            fontSize: '0.938rem',
                            fontWeight: 600,
                            color: '#1A1A2E',
                            margin: 0,
                          }}
                        >
                          {trope.trope_name}
                        </h5>
                        <span
                          style={{
                            fontSize: '0.688rem',
                            fontWeight: 600,
                            color: '#FFFFFF',
                            background: getFrequencyColor(trope.usage_frequency),
                            padding: '0.125rem 0.5rem',
                            borderRadius: '12px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {trope.usage_frequency}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: '0.813rem',
                          color: '#64748B',
                          margin: '0.25rem 0 0 0',
                          lineHeight: '1.4',
                        }}
                      >
                        {trope.description}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleTropeToggle(trope.id, 'include')}
                        disabled={isLoading}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          background:
                            selection?.preference === 'include' ? '#10B981' : '#F8FAFC',
                          border: `1px solid ${selection?.preference === 'include' ? '#10B981' : '#E2E8F0'}`,
                          borderRadius: '6px',
                          color: selection?.preference === 'include' ? '#FFFFFF' : '#374151',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        Include
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTropeToggle(trope.id, 'exclude')}
                        disabled={isLoading}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          background:
                            selection?.preference === 'exclude' ? '#DC2626' : '#F8FAFC',
                          border: `1px solid ${selection?.preference === 'exclude' ? '#DC2626' : '#E2E8F0'}`,
                          borderRadius: '6px',
                          color: selection?.preference === 'exclude' ? '#FFFFFF' : '#374151',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        Exclude
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTropeToggle(trope.id, 'subvert')}
                        disabled={isLoading}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          background:
                            selection?.preference === 'subvert' ? '#F59E0B' : '#F8FAFC',
                          border: `1px solid ${selection?.preference === 'subvert' ? '#F59E0B' : '#E2E8F0'}`,
                          borderRadius: '6px',
                          color: selection?.preference === 'subvert' ? '#FFFFFF' : '#374151',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        Subvert
                      </button>
                    </div>

                    {/* Expand/Collapse */}
                    <button
                      type="button"
                      onClick={() => setExpandedTrope(isExpanded ? null : trope.id)}
                      style={{
                        width: '100%',
                        padding: '0.25rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#667eea',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {isExpanded ? 'Show Less' : 'Show More'}
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid #E2E8F0',
                          fontSize: '0.75rem',
                          color: '#64748B',
                        }}
                      >
                        {trope.examples && trope.examples.length > 0 && (
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong style={{ color: '#374151' }}>Examples:</strong>
                            <ul style={{ margin: '0.25rem 0', paddingLeft: '1.25rem' }}>
                              {trope.examples.map((ex, idx) => (
                                <li key={idx}>{ex}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {trope.subversions && trope.subversions.length > 0 && (
                          <div>
                            <strong style={{ color: '#374151' }}>Ways to Subvert:</strong>
                            <ul style={{ margin: '0.25rem 0', paddingLeft: '1.25rem' }}>
                              {trope.subversions.map((sub, idx) => (
                                <li key={idx}>{sub}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {selectedTropes.length > 0 && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: colors.brandLight,
            border: `1px solid ${colors.brandBorder}`,
            borderRadius: borderRadius.md,
          }}
        >
          <div style={{ fontSize: '0.813rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
            Selected: {selectedTropes.length} tropes
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
            Include: {selectedTropes.filter((t) => t.preference === 'include').length} | Exclude:{' '}
            {selectedTropes.filter((t) => t.preference === 'exclude').length} | Subvert:{' '}
            {selectedTropes.filter((t) => t.preference === 'subvert').length}
          </div>
        </div>
      )}
    </div>
  );
}
