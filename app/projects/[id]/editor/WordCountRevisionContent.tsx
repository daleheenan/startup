'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, logout } from '@/app/lib/auth';
import { colors, typography, spacing, borderRadius, shadows } from '@/app/lib/design-tokens';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Book {
  id: string;
  title: string;
  book_number: number;
  word_count: number;
}

interface WordCountRevision {
  id: string;
  bookId: string;
  sourceVersionId: string | null;
  targetVersionId: string | null;
  currentWordCount: number;
  targetWordCount: number;
  tolerancePercent: number;
  minAcceptable: number;
  maxAcceptable: number;
  wordsToCut: number;
  status: string;
  chaptersReviewed: number;
  chaptersTotal: number;
  wordsCutSoFar: number;
}

interface ChapterProposal {
  id: string;
  revisionId: string;
  chapterId: string;
  originalWordCount: number;
  targetWordCount: number;
  reductionPercent: number;
  priorityScore: number;
  status: string;
  condensedWordCount: number | null;
  actualReduction: number | null;
  userDecision: string;
}

interface RevisionProgress {
  revisionId: string;
  currentWordCount: number;
  targetWordCount: number;
  wordsReduced: number;
  wordsRemaining: number;
  percentComplete: number;
}

interface WordCountRevisionContentProps {
  projectId: string;
}

export default function WordCountRevisionContent({ projectId }: WordCountRevisionContentProps) {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [revision, setRevision] = useState<WordCountRevision | null>(null);
  const [proposals, setProposals] = useState<ChapterProposal[]>([]);
  const [progress, setProgress] = useState<RevisionProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [targetWordCount, setTargetWordCount] = useState<number | ''>(80000);
  const [tolerancePercent, setTolerancePercent] = useState<number>(5);
  const [isStarting, setIsStarting] = useState(false);

  // Fetch books
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/api/books/project/${projectId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 401) {
            logout();
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch books');
        }

        const data = await res.json();
        setBooks(data.books || []);

        if (data.books?.length > 0 && !selectedBookId) {
          setSelectedBookId(data.books[0].id);
        }
      } catch (err) {
        console.error('Error fetching books:', err);
        setError('Failed to load books');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [projectId, router, selectedBookId]);

  // Fetch revision
  const fetchRevision = useCallback(async () => {
    if (!selectedBookId) return;

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/word-count-revision/books/${selectedBookId}/current`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setRevision(data);

        const proposalsRes = await fetch(`${API_BASE_URL}/api/word-count-revision/${data.id}/proposals`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (proposalsRes.ok) {
          const proposalsData = await proposalsRes.json();
          setProposals(proposalsData.proposals || []);
        }

        const progressRes = await fetch(`${API_BASE_URL}/api/word-count-revision/${data.id}/progress`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          setProgress(progressData);
        }
      } else if (res.status === 404) {
        setRevision(null);
        setProposals([]);
        setProgress(null);
      }
    } catch (err) {
      console.error('Error fetching revision:', err);
    }
  }, [selectedBookId]);

  useEffect(() => {
    if (selectedBookId) {
      fetchRevision();
    }
  }, [selectedBookId, fetchRevision]);

  const handleStartRevision = async () => {
    if (!selectedBookId) return;

    setIsStarting(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/word-count-revision/books/${selectedBookId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetWordCount: targetWordCount || 80000, tolerancePercent }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to start revision');
      }

      await fetchRevision();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start revision');
    } finally {
      setIsStarting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
      case 'completed':
        return { bg: colors.semantic.successLight, text: colors.semantic.successDark };
      case 'pending':
      case 'in_progress':
        return { bg: colors.semantic.warningLight, text: colors.semantic.warningDark };
      case 'failed':
        return { bg: colors.semantic.errorLight, text: colors.semantic.errorDark };
      default:
        return { bg: colors.background.primary, text: colors.text.secondary };
    }
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
        <span>Loading word count revision...</span>
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
          value={selectedBookId || ''}
          onChange={(e) => setSelectedBookId(e.target.value)}
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

      {/* Error */}
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

      {/* No active revision */}
      {!revision && (
        <div style={{
          background: colors.background.surface,
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.xl,
          padding: spacing[6],
        }}>
          <h3 style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            margin: 0,
            marginBottom: spacing[4],
          }}>
            Start Word Count Revision
          </h3>
          <p style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            margin: 0,
            marginBottom: spacing[6],
          }}>
            Set a target word count and automatically identify chapters that can be condensed while preserving the story.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: spacing[4],
            marginBottom: spacing[6],
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.secondary,
                marginBottom: spacing[2],
              }}>
                Target Word Count
              </label>
              <input
                type="number"
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(e.target.value ? parseInt(e.target.value) : '')}
                style={{
                  width: '100%',
                  padding: spacing[3],
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.base,
                }}
                min={10000}
                max={500000}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.secondary,
                marginBottom: spacing[2],
              }}>
                Tolerance (%)
              </label>
              <input
                type="number"
                value={tolerancePercent}
                onChange={(e) => setTolerancePercent(parseInt(e.target.value) || 5)}
                style={{
                  width: '100%',
                  padding: spacing[3],
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.base,
                }}
                min={1}
                max={20}
              />
            </div>
          </div>

          <button
            onClick={handleStartRevision}
            disabled={isStarting || !selectedBookId}
            style={{
              padding: `${spacing[3]} ${spacing[6]}`,
              background: isStarting ? colors.text.disabled : colors.brand.gradient,
              border: 'none',
              borderRadius: borderRadius.lg,
              color: colors.white,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              cursor: isStarting ? 'not-allowed' : 'pointer',
            }}
          >
            {isStarting ? 'Starting...' : 'Start Revision'}
          </button>
        </div>
      )}

      {/* Active revision */}
      {revision && (
        <>
          {/* Progress Overview */}
          <div style={{
            background: colors.background.surface,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.xl,
            padding: spacing[6],
          }}>
            <h3 style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              margin: 0,
              marginBottom: spacing[4],
            }}>
              Revision Progress
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: spacing[4],
              marginBottom: spacing[4],
            }}>
              <div>
                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, margin: 0 }}>
                  Current
                </p>
                <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, margin: 0 }}>
                  {revision.currentWordCount.toLocaleString()}
                </p>
              </div>
              <div>
                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, margin: 0 }}>
                  Target
                </p>
                <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.brand.primary, margin: 0 }}>
                  {revision.targetWordCount.toLocaleString()}
                </p>
              </div>
              <div>
                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, margin: 0 }}>
                  To Cut
                </p>
                <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.semantic.error, margin: 0 }}>
                  {revision.wordsToCut.toLocaleString()}
                </p>
              </div>
              <div>
                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, margin: 0 }}>
                  Cut So Far
                </p>
                <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.semantic.successDark, margin: 0 }}>
                  {revision.wordsCutSoFar.toLocaleString()}
                </p>
              </div>
            </div>

            {progress && (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: spacing[2],
                }}>
                  <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                    Progress
                  </span>
                  <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                    {progress.percentComplete.toFixed(1)}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '12px',
                  background: colors.background.primary,
                  borderRadius: borderRadius.full,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${progress.percentComplete}%`,
                    height: '100%',
                    background: colors.brand.primary,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Chapter Proposals */}
          {proposals.length > 0 && (
            <div style={{
              background: colors.background.surface,
              border: `1px solid ${colors.border.default}`,
              borderRadius: borderRadius.xl,
              padding: spacing[6],
            }}>
              <h3 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                margin: 0,
                marginBottom: spacing[4],
              }}>
                Chapter Proposals ({proposals.length})
              </h3>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing[3],
                maxHeight: '400px',
                overflowY: 'auto',
              }}>
                {proposals.slice(0, 10).map((proposal) => {
                  const statusColors = getStatusColor(proposal.status);
                  return (
                    <div
                      key={proposal.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: spacing[4],
                        background: colors.background.primary,
                        borderRadius: borderRadius.lg,
                        border: `1px solid ${colors.border.default}`,
                      }}
                    >
                      <div>
                        <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary, margin: 0 }}>
                          Chapter {proposal.chapterId.slice(-4)}
                        </p>
                        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, margin: 0, marginTop: spacing[1] }}>
                          {proposal.originalWordCount.toLocaleString()} → {proposal.targetWordCount.toLocaleString()} words
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
                        <span style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.semibold,
                          color: colors.semantic.error,
                        }}>
                          -{proposal.reductionPercent.toFixed(1)}%
                        </span>
                        <span style={{
                          padding: `${spacing[1]} ${spacing[3]}`,
                          background: statusColors.bg,
                          color: statusColors.text,
                          fontSize: typography.fontSize.xs,
                          fontWeight: typography.fontWeight.semibold,
                          borderRadius: borderRadius.full,
                          textTransform: 'capitalize',
                        }}>
                          {proposal.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {proposals.length > 10 && (
                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.tertiary,
                  margin: 0,
                  marginTop: spacing[3],
                  textAlign: 'center',
                }}>
                  And {proposals.length - 10} more chapters...
                </p>
              )}
            </div>
          )}

          {/* Link to full page */}
          <Link
            href={`/projects/${projectId}/word-count-revision`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing[2],
              padding: `${spacing[3]} ${spacing[4]}`,
              background: colors.background.surface,
              border: `1px solid ${colors.border.default}`,
              borderRadius: borderRadius.md,
              color: colors.brand.primary,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              textDecoration: 'none',
              alignSelf: 'flex-start',
            }}
          >
            Open Full Word Count Revision Tool →
          </Link>
        </>
      )}
    </div>
  );
}
