'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/app/lib/auth';
import { colors, typography, spacing, borderRadius, shadows } from '@/app/lib/design-tokens';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ProseIssue {
  text: string;
  location: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

interface ProseReport {
  score: number;
  grade: string;
  issues: ProseIssue[];
  summary: string;
}

interface ProseReports {
  readability: ProseReport;
  sentenceVariety: ProseReport;
  passiveVoice: ProseReport;
  adverbs: ProseReport;
}

interface Book {
  id: string;
  title: string;
}

interface ProseReportsContentProps {
  projectId: string;
}

export default function ProseReportsContent({ projectId }: ProseReportsContentProps) {
  const [reports, setReports] = useState<ProseReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [books, setBooks] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState<keyof ProseReports>('readability');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks();
  }, [projectId]);

  useEffect(() => {
    if (!selectedBook) return;
    fetchReports();
  }, [projectId, selectedBook]);

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
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/prose-reports/${projectId}/book/${selectedBook}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch prose reports');
      }

      const data = await response.json();
      setReports(data.reports);
    } catch (err: any) {
      setError(err.message || 'Failed to load prose reports');
    } finally {
      setLoading(false);
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

  const getSeverityColor = (severity: string): { bg: string; text: string } => {
    switch (severity) {
      case 'high':
        return { bg: colors.semantic.errorLight, text: colors.semantic.errorDark };
      case 'medium':
        return { bg: colors.semantic.warningLight, text: colors.semantic.warningDark };
      default:
        return { bg: colors.semantic.infoLight, text: colors.semantic.infoDark };
    }
  };

  const tabLabels: Record<keyof ProseReports, string> = {
    readability: 'Readability',
    sentenceVariety: 'Sentence Variety',
    passiveVoice: 'Passive Voice',
    adverbs: 'Adverbs',
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        flexDirection: 'column',
        gap: spacing[4],
        color: colors.text.tertiary,
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: `4px solid ${colors.border.default}`,
          borderTop: `4px solid ${colors.brand.primary}`,
          borderRadius: borderRadius.full,
          animation: 'spin 1s linear infinite',
        }} />
        <span>Analysing prose quality...</span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6], maxWidth: '1200px' }}>
      {/* Book Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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

      {reports && (
        <>
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            gap: spacing[2],
            borderBottom: `2px solid ${colors.border.default}`,
          }}>
            {(Object.keys(tabLabels) as Array<keyof ProseReports>).map(key => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: `${spacing[3]} ${spacing[4]}`,
                  border: 'none',
                  borderBottom: `3px solid ${activeTab === key ? colors.brand.primary : 'transparent'}`,
                  background: activeTab === key ? colors.brand.primaryLight : 'transparent',
                  color: activeTab === key ? colors.brand.primary : colors.text.secondary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: activeTab === key ? typography.fontWeight.semibold : typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tabLabels[key]}
              </button>
            ))}
          </div>

          {/* Active Tab Content */}
          {(Object.keys(tabLabels) as Array<keyof ProseReports>).map(key => {
            if (key !== activeTab) return null;
            const report = reports[key];

            return (
              <div key={key} style={{
                background: colors.background.surface,
                border: `1px solid ${colors.border.default}`,
                borderRadius: borderRadius.xl,
                padding: spacing[6],
                boxShadow: shadows.sm,
              }}>
                {/* Header with Score */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: spacing[6],
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[3],
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>📖</span>
                    <h2 style={{
                      fontSize: typography.fontSize.xl,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      margin: 0,
                    }}>
                      {tabLabels[key]}
                    </h2>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[3],
                  }}>
                    <span style={{
                      fontSize: typography.fontSize['3xl'],
                      fontWeight: typography.fontWeight.bold,
                      color: getScoreColor(report.score),
                    }}>
                      {report.score}%
                    </span>
                    <div style={{
                      padding: `${spacing[2]} ${spacing[4]}`,
                      background: getScoreBgColor(report.score),
                      borderRadius: borderRadius.full,
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: getScoreColor(report.score),
                    }}>
                      {report.grade}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  height: '12px',
                  background: colors.background.primary,
                  borderRadius: borderRadius.full,
                  overflow: 'hidden',
                  marginBottom: spacing[4],
                }}>
                  <div style={{
                    width: `${report.score}%`,
                    height: '100%',
                    background: getScoreColor(report.score),
                    transition: 'width 0.3s ease',
                  }} />
                </div>

                {/* Summary */}
                <p style={{
                  fontSize: typography.fontSize.base,
                  color: colors.text.secondary,
                  margin: 0,
                  marginBottom: spacing[6],
                  lineHeight: typography.lineHeight.relaxed,
                }}>
                  {report.summary}
                </p>

                {/* Issues */}
                {report.issues?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
                    <h4 style={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                    }}>
                      <span style={{ color: colors.semantic.warning }}>⚠️</span>
                      Issues Found ({report.issues.length})
                    </h4>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: spacing[3],
                      maxHeight: '60vh',
                      overflowY: 'auto',
                    }}>
                      {report.issues.slice(0, 20).map((issue, i) => {
                        const severityColors = getSeverityColor(issue.severity);
                        return (
                          <div
                            key={i}
                            style={{
                              padding: spacing[4],
                              background: colors.background.primary,
                              borderRadius: borderRadius.lg,
                              border: `1px solid ${colors.border.default}`,
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              alignItems: 'start',
                              justifyContent: 'space-between',
                              marginBottom: spacing[2],
                            }}>
                              <code style={{
                                fontSize: typography.fontSize.sm,
                                fontFamily: typography.fontFamily.mono,
                                color: colors.text.primary,
                                flex: 1,
                              }}>
                                {issue.text}
                              </code>
                              <div style={{
                                padding: `${spacing[1]} ${spacing[3]}`,
                                background: severityColors.bg,
                                color: severityColors.text,
                                fontSize: typography.fontSize.xs,
                                fontWeight: typography.fontWeight.semibold,
                                borderRadius: borderRadius.full,
                                textTransform: 'uppercase',
                                marginLeft: spacing[3],
                                whiteSpace: 'nowrap',
                              }}>
                                {issue.severity}
                              </div>
                            </div>
                            <p style={{
                              fontSize: typography.fontSize.sm,
                              color: colors.text.tertiary,
                              margin: 0,
                            }}>
                              {issue.suggestion}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
