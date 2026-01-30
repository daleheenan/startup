'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken } from '@/app/lib/auth';
import { colors, typography, spacing, borderRadius, shadows, transitions } from '@/app/lib/design-tokens';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SavedConcept {
  id: string;
  title: string;
  logline: string;
  synopsis: string;
  hook: string;
  protagonist_hint: string | null;
  conflict_type: string | null;
  preferences?: {
    genre?: string;
    subgenre?: string;
    tone?: string;
    themes?: string[];
    timePeriod?: string;
    projectStructure?: string;
  };
  notes: string | null;
  status: 'saved' | 'used' | 'archived';
  created_at: string;
  updated_at: string;
}

const MAX_CONCEPTS_DISPLAY = 4;

export default function ConceptsSummaryPanel() {
  const [concepts, setConcepts] = useState<SavedConcept[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchConcepts();
  }, []);

  const fetchConcepts = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/saved-concepts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch concepts');
      }

      const data = await response.json();
      // Filter to only 'saved' status and take first N
      const savedConcepts = (data.concepts || [])
        .filter((c: SavedConcept) => c.status === 'saved')
        .slice(0, MAX_CONCEPTS_DISPLAY);
      setConcepts(savedConcepts);
    } catch (err: any) {
      console.error('Error fetching concepts:', err);
      setError(err.message || 'Failed to load concepts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseConcept = (concept: SavedConcept) => {
    // Store concept in sessionStorage and navigate to quick-start
    sessionStorage.setItem('selectedConcept', JSON.stringify(concept));
    router.push('/quick-start');
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  return (
    <section
      aria-labelledby="concepts-summary-heading"
      style={{
        background: colors.background.surface,
        border: `1px solid ${colors.border.default}`,
        borderRadius: borderRadius.lg,
        padding: spacing[6],
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[4],
        }}
      >
        <h2
          id="concepts-summary-heading"
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            margin: 0,
          }}
        >
          Saved Concepts
        </h2>
        <Link
          href="/saved-concepts"
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.brand.primary,
            textDecoration: 'none',
            fontWeight: typography.fontWeight.medium,
            transition: transitions.colors,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          View All
        </Link>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: spacing[8],
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                border: `3px solid ${colors.border.default}`,
                borderTopColor: colors.brand.primary,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <style jsx>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : error ? (
          <div
            role="alert"
            style={{
              padding: spacing[4],
              background: colors.semantic.errorLight,
              border: `1px solid ${colors.semantic.errorBorder}`,
              borderRadius: borderRadius.md,
              color: colors.semantic.error,
              fontSize: typography.fontSize.sm,
            }}
          >
            {error}
          </div>
        ) : concepts.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: spacing[6],
              color: colors.text.secondary,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                fontSize: '2rem',
                marginBottom: spacing[2],
              }}
            >
              💭
            </div>
            <p style={{ margin: 0, fontSize: typography.fontSize.sm }}>
              No saved concepts yet
            </p>
            <Link
              href="/story-ideas"
              style={{
                display: 'inline-block',
                marginTop: spacing[3],
                fontSize: typography.fontSize.sm,
                color: colors.brand.primary,
                textDecoration: 'none',
              }}
            >
              Generate some ideas
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing[3],
            }}
          >
            {concepts.map((concept) => (
              <div
                key={concept.id}
                style={{
                  padding: spacing[3],
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: borderRadius.md,
                  transition: transitions.all,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: spacing[2],
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text.primary,
                        margin: 0,
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {concept.title}
                    </h3>
                    <p
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.secondary,
                        margin: 0,
                        lineHeight: typography.lineHeight.normal,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {truncateText(concept.logline, 100)}
                    </p>
                    {concept.preferences?.genre && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          padding: `2px ${spacing[2]}`,
                          background: colors.brand.primaryLight,
                          color: colors.brand.primary,
                          borderRadius: borderRadius.sm,
                          fontSize: typography.fontSize.xs,
                        }}
                      >
                        {concept.preferences.genre}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleUseConcept(concept)}
                    aria-label={`Use concept: ${concept.title}`}
                    style={{
                      padding: `${spacing[1]} ${spacing[3]}`,
                      background: colors.brand.gradient,
                      color: colors.text.inverse,
                      border: 'none',
                      borderRadius: borderRadius.sm,
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.medium,
                      cursor: 'pointer',
                      transition: transitions.all,
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = shadows.brand;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
