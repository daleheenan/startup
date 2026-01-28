'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getToken, logout } from '@/app/lib/auth';
import { fetchWithAuth } from '@/app/lib/fetch-utils';

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
  vebIssues: VEBIssueContext | null;
  status: string;
  condensedContent: string | null;
  condensedWordCount: number | null;
  actualReduction: number | null;
  cutsExplanation: CutExplanation[] | null;
  preservedElements: string[] | null;
  userDecision: string;
  errorMessage: string | null;
}

interface VEBIssueContext {
  scenePurpose?: {
    earned: boolean;
    reasoning: string;
    recommendation?: string;
  };
  expositionIssues?: Array<{
    issue: string;
    quote: string;
    suggestion: string;
    severity: string;
  }>;
  pacingIssues?: Array<{
    issue: string;
    location: string;
    suggestion: string;
    severity: string;
  }>;
}

interface CutExplanation {
  whatWasCut: string;
  why: string;
  wordsRemoved: number;
}

interface RevisionProgress {
  revisionId: string;
  currentWordCount: number;
  targetWordCount: number;
  wordsReduced: number;
  wordsRemaining: number;
  percentComplete: number;
  chaptersReviewed: number;
  chaptersTotal: number;
  isWithinTolerance: boolean;
  minAcceptable: number;
  maxAcceptable: number;
}

interface ChapterData {
  id: string;
  chapter_number: number;
  title: string | null;
  word_count: number;
  content: string;
}

export default function WordCountRevisionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const isComprehensiveMode = searchParams.get('mode') === 'comprehensive';

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [revision, setRevision] = useState<WordCountRevision | null>(null);
  const [proposals, setProposals] = useState<ChapterProposal[]>([]);
  const [progress, setProgress] = useState<RevisionProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for starting a new revision
  const [targetWordCount, setTargetWordCount] = useState<number>(80000);
  const [tolerancePercent, setTolerancePercent] = useState<number>(5);
  const [isStarting, setIsStarting] = useState(false);

  // Comprehensive mode state
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

  // Chapter detail view
  const [selectedProposal, setSelectedProposal] = useState<ChapterProposal | null>(null);
  const [chapterContent, setChapterContent] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  // Fetch books for the project
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

        // Auto-select first book
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

  // Fetch current revision for selected book
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

        // Fetch proposals
        const proposalsRes = await fetch(`${API_BASE_URL}/api/word-count-revision/${data.id}/proposals`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (proposalsRes.ok) {
          const proposalsData = await proposalsRes.json();
          setProposals(proposalsData.proposals || []);
        }

        // Fetch progress
        const progressRes = await fetch(`${API_BASE_URL}/api/word-count-revision/${data.id}/progress`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          setProgress(progressData);
        }
      } else if (res.status === 404) {
        // No active revision - that's fine
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

  // Start a new revision
  const handleStartRevision = async () => {
    if (!selectedBookId) return;

    setIsStarting(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/word-count-revision/books/${selectedBookId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetWordCount, tolerancePercent }),
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

  // Generate proposal for a chapter
  const handleGenerateProposal = async (chapterId: string) => {
    if (!revision) return;

    setIsGenerating(chapterId);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/api/word-count-revision/${revision.id}/chapters/${chapterId}/generate`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to generate proposal');
      }

      await fetchRevision();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate proposal');
    } finally {
      setIsGenerating(null);
    }
  };

  // Approve a proposal
  const handleApprove = async (chapterId: string) => {
    if (!revision) return;

    setIsApproving(chapterId);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/api/word-count-revision/${revision.id}/chapters/${chapterId}/approve`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to approve proposal');
      }

      await fetchRevision();
      setSelectedProposal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve proposal');
    } finally {
      setIsApproving(null);
    }
  };

  // Reject a proposal
  const handleReject = async (chapterId: string) => {
    if (!revision) return;

    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/api/word-count-revision/${revision.id}/chapters/${chapterId}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notes: 'User rejected proposal' }),
        }
      );

      if (!res.ok) {
        throw new Error('Failed to reject proposal');
      }

      await fetchRevision();
      setSelectedProposal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject proposal');
    }
  };

  // Fetch chapter content for comparison
  const handleViewProposal = async (proposal: ChapterProposal) => {
    setSelectedProposal(proposal);

    if (proposal.condensedContent) {
      // Fetch original chapter content
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/api/chapters/${proposal.chapterId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setChapterContent(data.content);
        }
      } catch (err) {
        console.error('Error fetching chapter:', err);
      }
    }
  };

  const selectedBook = books.find(b => b.id === selectedBookId);

  // Get status colour
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return { bg: '#D1FAE5', text: '#065F46', border: '#10B981' };
      case 'ready':
        return { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' };
      case 'rejected':
        return { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF' };
      case 'generating':
        return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' };
      case 'error':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' };
      default:
        return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
    }
  };

  // Get priority colour
  const getPriorityColor = (score: number) => {
    if (score >= 70) return { bg: '#FEE2E2', text: '#991B1B' };
    if (score >= 50) return { bg: '#FEF3C7', text: '#92400E' };
    return { bg: '#D1FAE5', text: '#065F46' };
  };

  // Generate all proposals in comprehensive mode
  const handleGenerateAll = async () => {
    if (!revision) return;

    const pendingProposals = proposals.filter(p => p.status === 'pending');
    if (pendingProposals.length === 0) return;

    setIsGeneratingAll(true);
    setGenerationProgress({ current: 0, total: pendingProposals.length });

    try {
      const token = getToken();

      for (let i = 0; i < pendingProposals.length; i++) {
        const proposal = pendingProposals[i];
        setGenerationProgress({ current: i + 1, total: pendingProposals.length });

        try {
          await fetch(
            `${API_BASE_URL}/api/word-count-revision/${revision.id}/chapters/${proposal.chapterId}/generate`,
            {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
            }
          );
        } catch (err) {
          console.error(`Error generating proposal for chapter ${proposal.chapterId}:`, err);
          // Continue with next chapter even if one fails
        }
      }

      await fetchRevision();
    } finally {
      setIsGeneratingAll(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  // Approve all ready proposals
  const handleApproveAll = async () => {
    if (!revision) return;

    const readyProposals = proposals.filter(p => p.status === 'ready');
    if (readyProposals.length === 0) return;

    setIsGeneratingAll(true);
    setGenerationProgress({ current: 0, total: readyProposals.length });

    try {
      const token = getToken();

      for (let i = 0; i < readyProposals.length; i++) {
        const proposal = readyProposals[i];
        setGenerationProgress({ current: i + 1, total: readyProposals.length });

        try {
          await fetch(
            `${API_BASE_URL}/api/word-count-revision/${revision.id}/chapters/${proposal.chapterId}/approve`,
            {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
            }
          );
        } catch (err) {
          console.error(`Error approving proposal for chapter ${proposal.chapterId}:`, err);
        }
      }

      await fetchRevision();
    } finally {
      setIsGeneratingAll(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
        <main style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
            <div>Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <main style={{ padding: '2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <Link
                href={`/projects/${projectId}/editorial-action-plan`}
                style={{ color: '#64748B', textDecoration: 'none', fontSize: '0.875rem' }}
              >
                ← Back to Editorial Action Plan
              </Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h1 style={{ margin: '0 0 0.5rem 0', color: '#1A1A2E', fontSize: '1.75rem' }}>
                {isComprehensiveMode ? 'Comprehensive Rewrite' : 'Word Count Revision'}
              </h1>
              {isComprehensiveMode && (
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                }}>
                  COMPREHENSIVE MODE
                </span>
              )}
            </div>
            <p style={{ margin: 0, color: '#64748B' }}>
              {isComprehensiveMode
                ? 'Bulk processing all chapters to address 100+ editorial issues and reduce word count'
                : 'AI-assisted word count reduction with VEB-informed prioritisation'}
            </p>
          </div>

          {/* Comprehensive Mode Banner */}
          {isComprehensiveMode && !revision && (
            <div style={{
              background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              color: 'white',
            }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>
                🔄 Comprehensive Rewrite Mode
              </h3>
              <p style={{ margin: '0 0 1rem 0', opacity: 0.9 }}>
                This mode will generate condensation proposals for <strong>all chapters</strong> in sequence,
                applying VEB feedback to systematically reduce word count while addressing editorial issues.
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', opacity: 0.9, fontSize: '0.875rem' }}>
                <li>All pending proposals will be generated automatically</li>
                <li>You can review and approve/reject proposals in bulk or individually</li>
                <li>Progress is tracked and can be resumed if interrupted</li>
                <li>Lessons learned will be captured for future book generations</li>
              </ul>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              color: '#991B1B',
            }}>
              {error}
              <button
                onClick={() => setError(null)}
                style={{ marginLeft: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Book selector */}
          {books.length > 1 && (
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '1rem',
              border: '1px solid #E2E8F0',
              marginBottom: '1.5rem',
            }}>
              <label style={{ fontWeight: '500', color: '#1A1A2E', marginRight: '1rem' }}>
                Select Book:
              </label>
              <select
                value={selectedBookId || ''}
                onChange={(e) => setSelectedBookId(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.875rem',
                }}
              >
                {books.map(book => (
                  <option key={book.id} value={book.id}>
                    Book {book.book_number}: {book.title} ({book.word_count?.toLocaleString() || 0} words)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* No revision - Start form */}
          {!revision && selectedBook && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid #E2E8F0',
            }}>
              <h2 style={{ margin: '0 0 1.5rem 0', color: '#1A1A2E' }}>Start Word Count Revision</h2>

              <div style={{
                background: '#F8FAFC',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1A1A2E', marginBottom: '0.5rem' }}>
                  Current Word Count: {selectedBook.word_count?.toLocaleString() || 0}
                </div>
                <p style={{ margin: 0, color: '#64748B' }}>
                  Set your target word count and tolerance to begin the revision process.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1A1A2E' }}>
                    Target Word Count
                  </label>
                  <input
                    type="number"
                    value={targetWordCount}
                    onChange={(e) => setTargetWordCount(parseInt(e.target.value) || 80000)}
                    min={1000}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      fontSize: '1rem',
                      width: '200px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1A1A2E' }}>
                    Tolerance (%)
                  </label>
                  <input
                    type="number"
                    value={tolerancePercent}
                    onChange={(e) => setTolerancePercent(parseInt(e.target.value) || 5)}
                    min={1}
                    max={20}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      fontSize: '1rem',
                      width: '100px',
                    }}
                  />
                </div>
              </div>

              <div style={{
                background: '#EDE9FE',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
              }}>
                <div style={{ color: '#5B21B6', fontSize: '0.875rem' }}>
                  <strong>Acceptable Range:</strong>{' '}
                  {Math.round(targetWordCount * (1 - tolerancePercent / 100)).toLocaleString()} -{' '}
                  {Math.round(targetWordCount * (1 + tolerancePercent / 100)).toLocaleString()} words
                </div>
                <div style={{ color: '#5B21B6', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  <strong>Words to Cut:</strong>{' '}
                  ~{Math.max(0, (selectedBook.word_count || 0) - targetWordCount).toLocaleString()} words
                  ({((Math.max(0, (selectedBook.word_count || 0) - targetWordCount) / (selectedBook.word_count || 1)) * 100).toFixed(1)}%)
                </div>
              </div>

              <button
                onClick={handleStartRevision}
                disabled={isStarting}
                style={{
                  padding: '0.75rem 2rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: isStarting ? 'wait' : 'pointer',
                  opacity: isStarting ? 0.7 : 1,
                }}
              >
                {isStarting ? 'Starting...' : 'Start Revision'}
              </button>
            </div>
          )}

          {/* Active revision */}
          {revision && progress && (
            <>
              {/* Progress Dashboard */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                padding: '1.5rem',
                color: 'white',
                marginBottom: '1.5rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', opacity: 0.9 }}>Progress</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>
                      {progress.percentComplete.toFixed(0)}%
                    </div>
                    <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8, fontSize: '0.875rem' }}>
                      {progress.wordsReduced.toLocaleString()} of {revision.wordsToCut.toLocaleString()} words cut
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                        {progress.currentWordCount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Current</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                        {progress.targetWordCount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Target</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                        {progress.chaptersReviewed}/{progress.chaptersTotal}
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Chapters</div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{
                  marginTop: '1rem',
                  height: '8px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progress.percentComplete}%`,
                    background: progress.isWithinTolerance ? '#10B981' : 'white',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>

                {/* Tolerance indicator */}
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  background: progress.isWithinTolerance ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                }}>
                  {progress.isWithinTolerance
                    ? '✓ Within tolerance range'
                    : `${progress.wordsRemaining > 0 ? `${progress.wordsRemaining.toLocaleString()} words over target` : `${Math.abs(progress.wordsRemaining).toLocaleString()} words under minimum`}`
                  }
                  <span style={{ opacity: 0.8, marginLeft: '1rem' }}>
                    (Acceptable: {progress.minAcceptable.toLocaleString()} - {progress.maxAcceptable.toLocaleString()})
                  </span>
                </div>
              </div>

              {/* Comprehensive mode bulk actions */}
              {isComprehensiveMode && (
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#1A1A2E' }}>Bulk Actions</h3>

                  {isGeneratingAll && (
                    <div style={{
                      background: '#EDE9FE',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#5B21B6', fontWeight: '500' }}>
                          Processing chapter {generationProgress.current} of {generationProgress.total}...
                        </span>
                        <span style={{ color: '#5B21B6' }}>
                          {Math.round((generationProgress.current / generationProgress.total) * 100)}%
                        </span>
                      </div>
                      <div style={{
                        marginTop: '0.5rem',
                        height: '6px',
                        background: 'rgba(91, 33, 182, 0.2)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${(generationProgress.current / generationProgress.total) * 100}%`,
                          background: '#5B21B6',
                          borderRadius: '3px',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleGenerateAll}
                      disabled={isGeneratingAll || proposals.filter(p => p.status === 'pending').length === 0}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: proposals.filter(p => p.status === 'pending').length > 0
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : '#E2E8F0',
                        color: proposals.filter(p => p.status === 'pending').length > 0 ? 'white' : '#9CA3AF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: isGeneratingAll || proposals.filter(p => p.status === 'pending').length === 0
                          ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isGeneratingAll ? 'Generating...' : `Generate All Pending (${proposals.filter(p => p.status === 'pending').length})`}
                    </button>

                    <button
                      onClick={handleApproveAll}
                      disabled={isGeneratingAll || proposals.filter(p => p.status === 'ready').length === 0}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: proposals.filter(p => p.status === 'ready').length > 0
                          ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                          : '#E2E8F0',
                        color: proposals.filter(p => p.status === 'ready').length > 0 ? 'white' : '#9CA3AF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: isGeneratingAll || proposals.filter(p => p.status === 'ready').length === 0
                          ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Approve All Ready ({proposals.filter(p => p.status === 'ready').length})
                    </button>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: '#64748B' }}>
                        {proposals.filter(p => p.status === 'applied').length} applied
                      </span>
                      <span style={{ fontSize: '0.875rem', color: '#64748B' }}>
                        {proposals.filter(p => p.status === 'ready').length} ready
                      </span>
                      <span style={{ fontSize: '0.875rem', color: '#64748B' }}>
                        {proposals.filter(p => p.status === 'pending').length} pending
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Chapter proposals list */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                }}>
                  <h3 style={{ margin: 0, color: '#1A1A2E' }}>Chapter Proposals</h3>
                  <p style={{ margin: '0.5rem 0 0 0', color: '#64748B', fontSize: '0.875rem' }}>
                    Sorted by priority score (chapters with more VEB issues ranked higher)
                  </p>
                </div>

                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {proposals.map((proposal) => {
                    const statusColor = getStatusColor(proposal.status);
                    const priorityColor = getPriorityColor(proposal.priorityScore);
                    const isCurrentlyGenerating = isGenerating === proposal.chapterId;
                    const isCurrentlyApproving = isApproving === proposal.chapterId;

                    return (
                      <div
                        key={proposal.id}
                        style={{
                          padding: '1rem 1.5rem',
                          borderBottom: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          background: proposal.status === 'applied' ? '#F0FDF4' : 'white',
                        }}
                      >
                        {/* Chapter info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: '600', color: '#1A1A2E' }}>
                              Chapter {proposals.indexOf(proposal) + 1}
                            </span>
                            <span style={{
                              padding: '0.125rem 0.5rem',
                              background: priorityColor.bg,
                              color: priorityColor.text,
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '500',
                            }}>
                              Priority: {proposal.priorityScore}
                            </span>
                            <span style={{
                              padding: '0.125rem 0.5rem',
                              background: statusColor.bg,
                              color: statusColor.text,
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '500',
                              textTransform: 'uppercase',
                            }}>
                              {proposal.status}
                            </span>
                          </div>

                          {/* VEB issues badges */}
                          {proposal.vebIssues && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                              {proposal.vebIssues.scenePurpose && !proposal.vebIssues.scenePurpose.earned && (
                                <span style={{
                                  padding: '0.125rem 0.375rem',
                                  background: '#FEE2E2',
                                  color: '#991B1B',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                }}>
                                  Scene not earned
                                </span>
                              )}
                              {(proposal.vebIssues.expositionIssues?.length || 0) > 0 && (
                                <span style={{
                                  padding: '0.125rem 0.375rem',
                                  background: '#FEF3C7',
                                  color: '#92400E',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                }}>
                                  {proposal.vebIssues.expositionIssues?.length} exposition issues
                                </span>
                              )}
                              {(proposal.vebIssues.pacingIssues?.length || 0) > 0 && (
                                <span style={{
                                  padding: '0.125rem 0.375rem',
                                  background: '#DBEAFE',
                                  color: '#1E40AF',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                }}>
                                  {proposal.vebIssues.pacingIssues?.length} pacing issues
                                </span>
                              )}
                            </div>
                          )}

                          {/* Word counts */}
                          <div style={{ color: '#64748B', fontSize: '0.875rem' }}>
                            {proposal.originalWordCount.toLocaleString()} words →{' '}
                            {proposal.condensedWordCount
                              ? <span style={{ color: '#059669', fontWeight: '500' }}>
                                  {proposal.condensedWordCount.toLocaleString()} (-{proposal.actualReduction?.toLocaleString()})
                                </span>
                              : <span>{proposal.targetWordCount.toLocaleString()} target</span>
                            }
                            <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                              ({proposal.reductionPercent.toFixed(1)}% reduction)
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {proposal.status === 'pending' && (
                            <button
                              onClick={() => handleGenerateProposal(proposal.chapterId)}
                              disabled={isCurrentlyGenerating}
                              style={{
                                padding: '0.5rem 1rem',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                cursor: isCurrentlyGenerating ? 'wait' : 'pointer',
                                opacity: isCurrentlyGenerating ? 0.7 : 1,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isCurrentlyGenerating ? 'Generating...' : 'Generate'}
                            </button>
                          )}

                          {proposal.status === 'ready' && (
                            <>
                              <button
                                onClick={() => handleViewProposal(proposal)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: '#F3F4F6',
                                  color: '#4B5563',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Review
                              </button>
                              <button
                                onClick={() => handleApprove(proposal.chapterId)}
                                disabled={isCurrentlyApproving}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: '#D1FAE5',
                                  color: '#065F46',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  cursor: isCurrentlyApproving ? 'wait' : 'pointer',
                                  opacity: isCurrentlyApproving ? 0.7 : 1,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {isCurrentlyApproving ? 'Applying...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleReject(proposal.chapterId)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: '#F3F4F6',
                                  color: '#6B7280',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {proposal.status === 'applied' && (
                            <span style={{ color: '#059669', fontSize: '0.875rem', fontWeight: '500' }}>
                              ✓ Applied
                            </span>
                          )}

                          {proposal.status === 'rejected' && (
                            <span style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                              Rejected
                            </span>
                          )}

                          {proposal.status === 'error' && (
                            <>
                              <span style={{ color: '#991B1B', fontSize: '0.75rem' }}>
                                Error
                              </span>
                              <button
                                onClick={() => handleGenerateProposal(proposal.chapterId)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: '#FEE2E2',
                                  color: '#991B1B',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Retry
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Proposal Review Modal */}
          {selectedProposal && selectedProposal.condensedContent && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '2rem',
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                maxWidth: '1200px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* Modal header */}
                <div style={{
                  padding: '1.5rem',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <h2 style={{ margin: 0, color: '#1A1A2E' }}>Review Proposal</h2>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#64748B', fontSize: '0.875rem' }}>
                      {selectedProposal.originalWordCount.toLocaleString()} → {selectedProposal.condensedWordCount?.toLocaleString()} words
                      ({selectedProposal.actualReduction?.toLocaleString()} words cut)
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedProposal(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      color: '#64748B',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Modal content */}
                <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
                  {/* Cuts explanation */}
                  {selectedProposal.cutsExplanation && selectedProposal.cutsExplanation.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: '0 0 1rem 0', color: '#1A1A2E', fontSize: '1rem' }}>What Was Cut</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedProposal.cutsExplanation.map((cut, idx) => (
                          <div key={idx} style={{
                            background: '#FEF3C7',
                            borderRadius: '6px',
                            padding: '0.75rem 1rem',
                          }}>
                            <div style={{ fontWeight: '500', color: '#92400E', marginBottom: '0.25rem' }}>
                              {cut.whatWasCut} (-{cut.wordsRemoved} words)
                            </div>
                            <div style={{ color: '#B45309', fontSize: '0.875rem' }}>
                              {cut.why}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preserved elements */}
                  {selectedProposal.preservedElements && selectedProposal.preservedElements.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', color: '#1A1A2E', fontSize: '1rem' }}>Preserved Elements</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {selectedProposal.preservedElements.map((element, idx) => (
                          <span key={idx} style={{
                            padding: '0.25rem 0.75rem',
                            background: '#D1FAE5',
                            color: '#065F46',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                          }}>
                            ✓ {element}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Side-by-side comparison */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0', color: '#991B1B', fontSize: '0.875rem' }}>
                        Original ({selectedProposal.originalWordCount.toLocaleString()} words)
                      </h3>
                      <div style={{
                        background: '#FEF2F2',
                        borderRadius: '8px',
                        padding: '1rem',
                        maxHeight: '400px',
                        overflow: 'auto',
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {chapterContent || 'Loading...'}
                      </div>
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0', color: '#059669', fontSize: '0.875rem' }}>
                        Condensed ({selectedProposal.condensedWordCount?.toLocaleString()} words)
                      </h3>
                      <div style={{
                        background: '#F0FDF4',
                        borderRadius: '8px',
                        padding: '1rem',
                        maxHeight: '400px',
                        overflow: 'auto',
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {selectedProposal.condensedContent}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal footer */}
                <div style={{
                  padding: '1.5rem',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '1rem',
                }}>
                  <button
                    onClick={() => handleReject(selectedProposal.chapterId)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#F3F4F6',
                      color: '#4B5563',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedProposal.chapterId)}
                    disabled={isApproving === selectedProposal.chapterId}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: isApproving ? 'wait' : 'pointer',
                      opacity: isApproving ? 0.7 : 1,
                    }}
                  >
                    {isApproving === selectedProposal.chapterId ? 'Applying...' : 'Approve & Apply'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
