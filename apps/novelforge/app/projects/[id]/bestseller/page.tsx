'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import { getToken } from '../../../lib/auth';
import { colors, typography, spacing, borderRadius, shadows } from '../../../lib/design-tokens';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface BestsellerAnalysis {
  bookId: string;
  overallScore: number;
  openingHook: {
    score: number;
    hasHook: boolean;
    hookType?: string;
    feedback: string;
  };
  tensionArc: {
    score: number;
    peakMoments: number;
    pacing: string;
    feedback: string;
  };
  characterArc: {
    arcCompleteness: number;
    hasWant: boolean;
    hasNeed: boolean;
    hasTransformation: boolean;
    feedback: string;
  };
  recommendations: string[];
}

interface Book {
  id: string;
  title: string;
}

export default function BestsellerPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [analysis, setAnalysis] = useState<BestsellerAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [bestsellerModeEnabled, setBestsellerModeEnabled] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks();
  }, [projectId]);

  const fetchBooks = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/books`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }

      const data = await response.json();
      setBooks(data.books || []);
      if (data.books?.length > 0) {
        setSelectedBook(data.books[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load books');
    }
  };

  const runAnalysis = async () => {
    if (!selectedBook) return;
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/bestseller/${selectedBook}/analysis`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to run analysis');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleBestsellerMode = async (enabled: boolean) => {
    if (!selectedBook) return;
    try {
      const token = getToken();
      await fetch(`${API_BASE_URL}/api/bestseller/${selectedBook}/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: { enabled } }),
      });
      setBestsellerModeEnabled(enabled);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle bestseller mode');
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return colors.semantic.successDark;
    if (score >= 60) return colors.semantic.warning;
    return colors.semantic.error;
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return colors.semantic.successLight;
    if (score >= 60) return colors.semantic.warningLight;
    return colors.semantic.errorLight;
  };

  return (
    <DashboardLayout
      header={{
        title: 'Bestseller Analysis',
        subtitle: 'Analyse your manuscript against proven bestseller patterns',
      }}
      projectId={projectId}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6], maxWidth: '1200px' }}>
        {/* Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: spacing[4],
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[4],
          }}>
            <label style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.primary,
            }}>
              Book
            </label>
            <select
              value={selectedBook}
              onChange={(e) => setSelectedBook(e.target.value)}
              style={{
                padding: spacing[3],
                border: `1px solid ${colors.border.default}`,
                borderRadius: borderRadius.md,
                fontSize: typography.fontSize.sm,
                background: colors.background.surface,
                minWidth: '200px',
              }}
            >
              {books.map(book => (
                <option key={book.id} value={book.id}>{book.title}</option>
              ))}
            </select>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[3],
          }}>
            <span style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
            }}>
              Bestseller Mode
            </span>
            <button
              onClick={() => toggleBestsellerMode(!bestsellerModeEnabled)}
              style={{
                width: '48px',
                height: '24px',
                background: bestsellerModeEnabled ? colors.semantic.successDark : colors.border.default,
                borderRadius: borderRadius.full,
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s ease',
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                background: colors.white,
                borderRadius: borderRadius.full,
                position: 'absolute',
                top: '2px',
                left: bestsellerModeEnabled ? '26px' : '2px',
                transition: 'left 0.2s ease',
              }} />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: colors.semantic.errorLight,
            border: `1px solid ${colors.semantic.errorBorder}`,
            borderRadius: borderRadius.lg,
            padding: spacing[4],
            color: colors.semantic.errorDark,
          }}>
            {error}
          </div>
        )}

        {/* Run Analysis Button */}
        <button
          onClick={runAnalysis}
          disabled={loading || !selectedBook}
          style={{
            padding: `${spacing[3]} ${spacing[6]}`,
            background: loading || !selectedBook ? colors.text.disabled : colors.brand.gradient,
            border: 'none',
            borderRadius: borderRadius.lg,
            color: colors.white,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            cursor: loading || !selectedBook ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            alignSelf: 'flex-start',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>🎯</span>
          {loading ? 'Analysing...' : 'Run Bestseller Analysis'}
        </button>

        {/* Analysis Results */}
        {analysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
            {/* Overall Score */}
            <div style={{
              background: colors.background.surface,
              border: `1px solid ${colors.border.default}`,
              borderRadius: borderRadius.xl,
              padding: spacing[6],
              boxShadow: shadows.md,
            }}>
              <h2 style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                margin: 0,
                marginBottom: spacing[4],
              }}>
                Overall Bestseller Score
              </h2>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[6],
              }}>
                <span style={{
                  fontSize: typography.fontSize['5xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: getScoreColor(analysis.overallScore),
                }}>
                  {analysis.overallScore}%
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    width: '100%',
                    height: '24px',
                    background: colors.background.primary,
                    borderRadius: borderRadius.full,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${analysis.overallScore}%`,
                      height: '100%',
                      background: getScoreColor(analysis.overallScore),
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: spacing[6],
            }}>
              {/* Opening Hook */}
              <div style={{
                background: colors.background.surface,
                border: `1px solid ${colors.border.default}`,
                borderRadius: borderRadius.xl,
                padding: spacing[6],
                boxShadow: shadows.sm,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[3],
                  marginBottom: spacing[4],
                }}>
                  <span style={{ fontSize: '1.5rem' }}>📖</span>
                  <div>
                    <h3 style={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      margin: 0,
                    }}>
                      Opening Hook
                    </h3>
                    <p style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.text.tertiary,
                      margin: 0,
                    }}>
                      First impression impact
                    </p>
                  </div>
                </div>
                <div style={{
                  fontSize: typography.fontSize['3xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: getScoreColor(analysis.openingHook.score),
                  marginBottom: spacing[3],
                }}>
                  {analysis.openingHook.score}%
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: colors.background.primary,
                  borderRadius: borderRadius.full,
                  overflow: 'hidden',
                  marginBottom: spacing[4],
                }}>
                  <div style={{
                    width: `${analysis.openingHook.score}%`,
                    height: '100%',
                    background: getScoreColor(analysis.openingHook.score),
                  }} />
                </div>
                {analysis.openingHook.hookType && (
                  <div style={{
                    display: 'inline-block',
                    padding: `${spacing[1]} ${spacing[3]}`,
                    background: colors.brand.primaryLight,
                    color: colors.brand.primary,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    borderRadius: borderRadius.full,
                    marginBottom: spacing[3],
                  }}>
                    {analysis.openingHook.hookType}
                  </div>
                )}
                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                  margin: 0,
                  lineHeight: typography.lineHeight.relaxed,
                }}>
                  {analysis.openingHook.feedback}
                </p>
              </div>

              {/* Tension Arc */}
              <div style={{
                background: colors.background.surface,
                border: `1px solid ${colors.border.default}`,
                borderRadius: borderRadius.xl,
                padding: spacing[6],
                boxShadow: shadows.sm,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[3],
                  marginBottom: spacing[4],
                }}>
                  <span style={{ fontSize: '1.5rem' }}>📈</span>
                  <div>
                    <h3 style={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      margin: 0,
                    }}>
                      Tension Arc
                    </h3>
                    <p style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.text.tertiary,
                      margin: 0,
                    }}>
                      Pacing and suspense
                    </p>
                  </div>
                </div>
                <div style={{
                  fontSize: typography.fontSize['3xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: getScoreColor(analysis.tensionArc.score),
                  marginBottom: spacing[3],
                }}>
                  {analysis.tensionArc.score}%
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: colors.background.primary,
                  borderRadius: borderRadius.full,
                  overflow: 'hidden',
                  marginBottom: spacing[4],
                }}>
                  <div style={{
                    width: `${analysis.tensionArc.score}%`,
                    height: '100%',
                    background: getScoreColor(analysis.tensionArc.score),
                  }} />
                </div>
                <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[3] }}>
                  <div style={{
                    padding: `${spacing[1]} ${spacing[3]}`,
                    background: colors.background.primary,
                    border: `1px solid ${colors.border.default}`,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.medium,
                    borderRadius: borderRadius.full,
                  }}>
                    Peaks: {analysis.tensionArc.peakMoments}
                  </div>
                  <div style={{
                    padding: `${spacing[1]} ${spacing[3]}`,
                    background: colors.background.primary,
                    border: `1px solid ${colors.border.default}`,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.medium,
                    borderRadius: borderRadius.full,
                  }}>
                    {analysis.tensionArc.pacing}
                  </div>
                </div>
                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                  margin: 0,
                  lineHeight: typography.lineHeight.relaxed,
                }}>
                  {analysis.tensionArc.feedback}
                </p>
              </div>

              {/* Character Arc */}
              <div style={{
                background: colors.background.surface,
                border: `1px solid ${colors.border.default}`,
                borderRadius: borderRadius.xl,
                padding: spacing[6],
                boxShadow: shadows.sm,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[3],
                  marginBottom: spacing[4],
                }}>
                  <span style={{ fontSize: '1.5rem' }}>👥</span>
                  <div>
                    <h3 style={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      margin: 0,
                    }}>
                      Character Arc
                    </h3>
                    <p style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.text.tertiary,
                      margin: 0,
                    }}>
                      Protagonist journey
                    </p>
                  </div>
                </div>
                <div style={{
                  fontSize: typography.fontSize['3xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: getScoreColor(analysis.characterArc.arcCompleteness),
                  marginBottom: spacing[3],
                }}>
                  {analysis.characterArc.arcCompleteness}%
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: colors.background.primary,
                  borderRadius: borderRadius.full,
                  overflow: 'hidden',
                  marginBottom: spacing[4],
                }}>
                  <div style={{
                    width: `${analysis.characterArc.arcCompleteness}%`,
                    height: '100%',
                    background: getScoreColor(analysis.characterArc.arcCompleteness),
                  }} />
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: spacing[2],
                  marginBottom: spacing[3],
                }}>
                  <div style={{
                    padding: `${spacing[1]} ${spacing[3]}`,
                    background: analysis.characterArc.hasWant ? colors.semantic.successLight : colors.background.primary,
                    color: analysis.characterArc.hasWant ? colors.semantic.successDark : colors.text.tertiary,
                    border: `1px solid ${analysis.characterArc.hasWant ? colors.semantic.successDark : colors.border.default}`,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    borderRadius: borderRadius.full,
                  }}>
                    WANT {analysis.characterArc.hasWant ? '✓' : '✗'}
                  </div>
                  <div style={{
                    padding: `${spacing[1]} ${spacing[3]}`,
                    background: analysis.characterArc.hasNeed ? colors.semantic.successLight : colors.background.primary,
                    color: analysis.characterArc.hasNeed ? colors.semantic.successDark : colors.text.tertiary,
                    border: `1px solid ${analysis.characterArc.hasNeed ? colors.semantic.successDark : colors.border.default}`,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    borderRadius: borderRadius.full,
                  }}>
                    NEED {analysis.characterArc.hasNeed ? '✓' : '✗'}
                  </div>
                  <div style={{
                    padding: `${spacing[1]} ${spacing[3]}`,
                    background: analysis.characterArc.hasTransformation ? colors.semantic.successLight : colors.background.primary,
                    color: analysis.characterArc.hasTransformation ? colors.semantic.successDark : colors.text.tertiary,
                    border: `1px solid ${analysis.characterArc.hasTransformation ? colors.semantic.successDark : colors.border.default}`,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    borderRadius: borderRadius.full,
                  }}>
                    Transformation {analysis.characterArc.hasTransformation ? '✓' : '✗'}
                  </div>
                </div>
                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                  margin: 0,
                  lineHeight: typography.lineHeight.relaxed,
                }}>
                  {analysis.characterArc.feedback}
                </p>
              </div>
            </div>

            {/* Recommendations */}
            {analysis.recommendations?.length > 0 && (
              <div style={{
                background: colors.background.surface,
                border: `1px solid ${colors.border.default}`,
                borderRadius: borderRadius.xl,
                padding: spacing[6],
                boxShadow: shadows.sm,
              }}>
                <h3 style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  margin: 0,
                  marginBottom: spacing[4],
                }}>
                  Recommendations
                </h3>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing[3],
                }}>
                  {analysis.recommendations.map((rec, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'start',
                        gap: spacing[3],
                        fontSize: typography.fontSize.base,
                        color: colors.text.primary,
                        lineHeight: typography.lineHeight.relaxed,
                      }}
                    >
                      <span style={{ color: colors.semantic.warning, fontSize: '1.25rem' }}>★</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
