'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getToken } from '../../../lib/auth';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type CurationStatus = 'pending_review' | 'approved' | 'archived' | 'duplicate' | 'needs_generalisation' | 'all';

interface CurationStats {
  total: number;
  pendingReview: number;
  approved: number;
  archived: number;
  duplicate: number;
  needsGeneralisation: number;
  bookSpecific: number;
}

interface CurationSuggestion {
  lessonId: string;
  suggestedStatus: CurationStatus;
  reason: string;
  duplicateOfId?: string;
  similarityScore?: number;
  generalisedTitle?: string;
  generalisedDescription?: string;
  isBookSpecific: boolean;
  bookSpecificElements?: string[];
}

interface AnalysisResult {
  totalLessons: number;
  analysed: number;
  suggestions: CurationSuggestion[];
  duplicateGroups: Array<{
    canonical: string;
    duplicates: Array<{ id: string; similarity: number }>;
  }>;
  bookSpecificCount: number;
  readyForApproval: number;
}

interface CuratedLesson {
  id: string;
  projectId: string;
  projectTitle: string;
  bookId: string | null;
  category: string;
  title: string;
  description: string;
  sourceModule: string | null;
  severityLevel: string | null;
  isActive: boolean;
  effectivenessScore: number;
  curationStatus: CurationStatus;
  isBookSpecific: boolean;
  generalisedTitle: string | null;
  generalisedDescription: string | null;
  duplicateOfLessonId: string | null;
  duplicateSimilarityScore: number | null;
  curationNotes: string | null;
  lastCuratedAt: string | null;
  createdAt: string;
}

const statusLabels: Record<CurationStatus, string> = {
  pending_review: 'Pending Review',
  approved: 'Approved',
  archived: 'Archived',
  duplicate: 'Duplicate',
  needs_generalisation: 'Needs Generalisation',
  all: 'All',
};

const statusColors: Record<CurationStatus, { bg: string; text: string }> = {
  pending_review: { bg: '#FEF3C7', text: '#D97706' },
  approved: { bg: '#D1FAE5', text: '#059669' },
  archived: { bg: '#F3F4F6', text: '#6B7280' },
  duplicate: { bg: '#FEE2E2', text: '#DC2626' },
  needs_generalisation: { bg: '#EDE9FE', text: '#7C3AED' },
  all: { bg: '#DBEAFE', text: '#1D4ED8' },
};

const categoryLabels: Record<string, string> = {
  pacing: 'Pacing',
  exposition: 'Exposition',
  dialogue: 'Dialogue',
  character: 'Character',
  plot: 'Plot',
  scene_structure: 'Scene Structure',
  word_economy: 'Word Economy',
  style: 'Style',
  market: 'Market',
  other: 'Other',
};

export default function LessonCurationPage() {
  const [stats, setStats] = useState<CurationStats | null>(null);
  const [lessons, setLessons] = useState<CuratedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CurationStatus>('pending_review');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<CuratedLesson | null>(null);
  const [generalisingId, setGeneralisingId] = useState<string | null>(null);
  const [generalisedPreview, setGeneralisedPreview] = useState<{
    lessonId: string;
    title: string;
    description: string;
  } | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [applyingBulk, setApplyingBulk] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchLessons();
  }, [statusFilter]);

  const fetchStats = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/lesson-curation/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/api/lesson-curation/lessons?status=${statusFilter}&limit=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setLessons(data.lessons || []);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalysing(true);
    setAnalysisResult(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/lesson-curation/analyse`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
        setActionMessage({ type: 'success', text: `Analysis complete: ${data.suggestions.length} issues found` });
      }
    } catch (error) {
      console.error('Error running analysis:', error);
      setActionMessage({ type: 'error', text: 'Failed to run analysis' });
    } finally {
      setAnalysing(false);
    }
  };

  const applyDecision = async (lessonId: string, status: CurationStatus, notes?: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/lesson-curation/lessons/${lessonId}/decide`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, notes }),
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Lesson marked as ${statusLabels[status]}` });
        fetchStats();
        fetchLessons();
        setSelectedLesson(null);
      }
    } catch (error) {
      console.error('Error applying decision:', error);
      setActionMessage({ type: 'error', text: 'Failed to apply decision' });
    }
  };

  const generateGeneralisation = async (lessonId: string) => {
    setGeneralisingId(lessonId);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/lesson-curation/lessons/${lessonId}/generalise`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applyImmediately: false }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneralisedPreview({
          lessonId,
          title: data.generalisedTitle,
          description: data.generalisedDescription,
        });
      }
    } catch (error) {
      console.error('Error generating generalisation:', error);
      setActionMessage({ type: 'error', text: 'Failed to generate generalisation' });
    } finally {
      setGeneralisingId(null);
    }
  };

  const applyGeneralisation = async (lessonId: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/lesson-curation/lessons/${lessonId}/apply-generalisation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Generalisation applied successfully' });
        setGeneralisedPreview(null);
        fetchStats();
        fetchLessons();
      }
    } catch (error) {
      console.error('Error applying generalisation:', error);
      setActionMessage({ type: 'error', text: 'Failed to apply generalisation' });
    }
  };

  const batchApprove = async () => {
    const pendingIds = lessons
      .filter(l => l.curationStatus === 'pending_review' && !l.isBookSpecific)
      .map(l => l.id);

    if (pendingIds.length === 0) {
      setActionMessage({ type: 'error', text: 'No lessons to approve' });
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/lesson-curation/batch-approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lessonIds: pendingIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage({ type: 'success', text: data.message });
        fetchStats();
        fetchLessons();
      }
    } catch (error) {
      console.error('Error batch approving:', error);
      setActionMessage({ type: 'error', text: 'Failed to batch approve' });
    }
  };

  const applyAllSuggestions = async (action: 'all' | 'duplicates' | 'book-specific' | 'approve') => {
    if (!analysisResult) return;

    setApplyingBulk(action);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/lesson-curation/apply-suggestions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestions: analysisResult.suggestions,
          archiveDuplicates: action === 'all' || action === 'duplicates',
          generaliseBookSpecific: action === 'all' || action === 'book-specific',
          approveClean: action === 'all' || action === 'approve',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Check if there were partial errors
        if (data.errors && data.errors.length > 0) {
          const errorSummary = data.errors.slice(0, 3).map((e: { action: string; error: string }) => `${e.action}: ${e.error}`).join('; ');
          setActionMessage({
            type: 'error',
            text: `${data.message}. Errors: ${errorSummary}${data.errors.length > 3 ? ` (+${data.errors.length - 3} more)` : ''}`,
          });
        } else {
          setActionMessage({ type: 'success', text: data.message });
        }
        setAnalysisResult(null);
        fetchStats();
        fetchLessons();
      } else {
        const errorMsg = data.error?.message || data.message || 'Failed to apply suggestions';
        setActionMessage({ type: 'error', text: errorMsg });
      }
    } catch (error) {
      console.error('Error applying suggestions:', error);
      setActionMessage({ type: 'error', text: 'Network error: Failed to apply suggestions' });
    } finally {
      setApplyingBulk(null);
    }
  };

  const bulkArchiveDuplicates = async () => {
    if (!analysisResult) return;

    const duplicateIds = analysisResult.suggestions
      .filter(s => s.suggestedStatus === 'duplicate')
      .map(s => s.lessonId);

    if (duplicateIds.length === 0) {
      setActionMessage({ type: 'error', text: 'No duplicates to archive' });
      return;
    }

    setApplyingBulk('duplicates');
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/lesson-curation/bulk-archive`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonIds: duplicateIds,
          notes: 'Bulk archived as duplicate',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActionMessage({ type: 'success', text: data.message });
        setAnalysisResult(null);
        fetchStats();
        fetchLessons();
      }
    } catch (error) {
      console.error('Error bulk archiving duplicates:', error);
      setActionMessage({ type: 'error', text: 'Failed to archive duplicates' });
    } finally {
      setApplyingBulk(null);
    }
  };

  const bulkGeneraliseBookSpecific = async () => {
    if (!analysisResult) return;

    const bookSpecificIds = analysisResult.suggestions
      .filter(s => s.isBookSpecific)
      .map(s => s.lessonId);

    if (bookSpecificIds.length === 0) {
      setActionMessage({ type: 'error', text: 'No book-specific lessons to generalise' });
      return;
    }

    setApplyingBulk('book-specific');
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/lesson-curation/bulk-generalise`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lessonIds: bookSpecificIds }),
      });

      if (res.ok) {
        const data = await res.json();
        setActionMessage({ type: 'success', text: data.message });
        setAnalysisResult(null);
        fetchStats();
        fetchLessons();
      }
    } catch (error) {
      console.error('Error bulk generalising:', error);
      setActionMessage({ type: 'error', text: 'Failed to generalise lessons' });
    } finally {
      setApplyingBulk(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <DashboardLayout>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Link
            href="/settings/lessons"
            style={{ color: '#64748B', textDecoration: 'none', fontSize: '0.875rem' }}
          >
            &larr; Back to Lessons
          </Link>
          <h1 style={{ margin: '0.5rem 0', color: '#1A1A2E', fontSize: '1.75rem' }}>
            Lesson Curation
          </h1>
          <p style={{ margin: 0, color: '#64748B' }}>
            AI-assisted review and cleanup of editorial lessons. Remove duplicates, generalise book-specific lessons, and approve quality content.
          </p>
        </div>

        {/* Action Message */}
        {actionMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              background: actionMessage.type === 'success' ? '#D1FAE5' : '#FEE2E2',
              color: actionMessage.type === 'success' ? '#059669' : '#DC2626',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Stats Overview */}
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {[
              { label: 'Total', value: stats.total, color: '#1D4ED8' },
              { label: 'Pending', value: stats.pendingReview, color: '#D97706' },
              { label: 'Approved', value: stats.approved, color: '#059669' },
              { label: 'Book-Specific', value: stats.bookSpecific, color: '#7C3AED' },
              { label: 'Duplicates', value: stats.duplicate, color: '#DC2626' },
              { label: 'Archived', value: stats.archived, color: '#6B7280' },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  background: 'white',
                  borderRadius: '8px',
                  padding: '1rem',
                  border: '1px solid #E2E8F0',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.75rem', fontWeight: '700', color: stat.color }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Actions Bar */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <button
            onClick={runAnalysis}
            disabled={analysing}
            style={{
              padding: '0.75rem 1.5rem',
              background: analysing ? '#9CA3AF' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: analysing ? 'not-allowed' : 'pointer',
              fontWeight: '600',
            }}
          >
            {analysing ? 'Analysing...' : 'Run AI Analysis'}
          </button>

          <button
            onClick={batchApprove}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Approve All Clean Lessons
          </button>

          <div style={{ marginLeft: 'auto' }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as CurationStatus)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                fontSize: '0.875rem',
                minWidth: '180px',
              }}
            >
              <option value="all">All Lessons</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="needs_generalisation">Needs Generalisation</option>
              <option value="duplicate">Duplicates</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Analysis Results */}
        {analysisResult && (
          <div
            style={{
              background: '#F0F9FF',
              borderRadius: '12px',
              border: '1px solid #BAE6FD',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#0369A1', fontSize: '1rem' }}>
                Analysis Results
              </h3>
              <button
                onClick={() => setAnalysisResult(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  color: '#64748B',
                  padding: '0',
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div>
                <strong>{analysisResult.totalLessons}</strong> lessons analysed
              </div>
              <div>
                <strong>{analysisResult.bookSpecificCount}</strong> book-specific
              </div>
              <div>
                <strong>{analysisResult.duplicateGroups.length}</strong> duplicate groups
              </div>
              <div>
                <strong>{analysisResult.readyForApproval}</strong> ready to approve
              </div>
            </div>

            {/* Bulk Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginBottom: '1rem',
                padding: '1rem',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #BAE6FD',
              }}
            >
              <button
                onClick={() => applyAllSuggestions('all')}
                disabled={applyingBulk !== null || analysisResult.suggestions.length === 0}
                style={{
                  padding: '0.5rem 1rem',
                  background: applyingBulk === 'all' ? '#9CA3AF' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: applyingBulk !== null ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                }}
              >
                {applyingBulk === 'all' ? 'Applying...' : 'Apply All Recommendations'}
              </button>

              <button
                onClick={bulkArchiveDuplicates}
                disabled={applyingBulk !== null || analysisResult.duplicateGroups.length === 0}
                style={{
                  padding: '0.5rem 1rem',
                  background: applyingBulk === 'duplicates' ? '#9CA3AF' : '#FEE2E2',
                  color: applyingBulk === 'duplicates' ? 'white' : '#DC2626',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: applyingBulk !== null || analysisResult.duplicateGroups.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}
              >
                {applyingBulk === 'duplicates' ? 'Archiving...' : `Archive ${analysisResult.suggestions.filter(s => s.suggestedStatus === 'duplicate').length} Duplicates`}
              </button>

              <button
                onClick={bulkGeneraliseBookSpecific}
                disabled={applyingBulk !== null || analysisResult.bookSpecificCount === 0}
                style={{
                  padding: '0.5rem 1rem',
                  background: applyingBulk === 'book-specific' ? '#9CA3AF' : '#EDE9FE',
                  color: applyingBulk === 'book-specific' ? 'white' : '#7C3AED',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: applyingBulk !== null || analysisResult.bookSpecificCount === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}
              >
                {applyingBulk === 'book-specific' ? 'Generalising...' : `Generalise ${analysisResult.bookSpecificCount} Book-Specific`}
              </button>

              <button
                onClick={() => applyAllSuggestions('approve')}
                disabled={applyingBulk !== null || analysisResult.readyForApproval === 0}
                style={{
                  padding: '0.5rem 1rem',
                  background: applyingBulk === 'approve' ? '#9CA3AF' : '#D1FAE5',
                  color: applyingBulk === 'approve' ? 'white' : '#059669',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: applyingBulk !== null || analysisResult.readyForApproval === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}
              >
                {applyingBulk === 'approve' ? 'Approving...' : `Approve ${analysisResult.readyForApproval} Clean Lessons`}
              </button>
            </div>

            {analysisResult.suggestions.length > 0 && (
              <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#E0F2FE' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Issue</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.suggestions.slice(0, 10).map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #BAE6FD' }}>
                        <td style={{ padding: '0.5rem' }}>
                          <span
                            style={{
                              ...statusColors[s.suggestedStatus],
                              padding: '0.125rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                            }}
                          >
                            {statusLabels[s.suggestedStatus]}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem', color: '#0C4A6E' }}>{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {analysisResult.suggestions.length > 10 && (
                  <p style={{ color: '#64748B', fontSize: '0.75rem', margin: '0.5rem 0 0 0' }}>
                    ... and {analysisResult.suggestions.length - 10} more
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Content: Lessons List + Detail Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedLesson ? '1fr 400px' : '1fr', gap: '1.5rem' }}>
          {/* Lessons List */}
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
          >
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                Loading lessons...
              </div>
            ) : lessons.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                No lessons found with this filter.
              </div>
            ) : (
              <div style={{ maxHeight: '600px', overflow: 'auto' }}>
                {lessons.map(lesson => {
                  const statusStyle = statusColors[lesson.curationStatus] || statusColors.pending_review;
                  const isSelected = selectedLesson?.id === lesson.id;

                  return (
                    <div
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      style={{
                        padding: '1rem 1.5rem',
                        borderBottom: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        background: isSelected ? '#F0F9FF' : 'white',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span
                          style={{
                            padding: '0.125rem 0.5rem',
                            background: statusStyle.bg,
                            color: statusStyle.text,
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '500',
                          }}
                        >
                          {statusLabels[lesson.curationStatus]}
                        </span>
                        {lesson.isBookSpecific && (
                          <span
                            style={{
                              padding: '0.125rem 0.5rem',
                              background: '#EDE9FE',
                              color: '#7C3AED',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                            }}
                          >
                            Book-Specific
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                          {categoryLabels[lesson.category] || lesson.category}
                        </span>
                      </div>
                      <div style={{ fontWeight: '600', color: '#1A1A2E', marginBottom: '0.25rem' }}>
                        {lesson.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: '#64748B',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {lesson.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedLesson && (
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '1.5rem',
                height: 'fit-content',
                position: 'sticky',
                top: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#1A1A2E', fontSize: '1rem' }}>Lesson Details</h3>
                <button
                  onClick={() => setSelectedLesson(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#64748B' }}
                >
                  &times;
                </button>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: '600', color: '#1A1A2E', marginBottom: '0.5rem' }}>
                  {selectedLesson.title}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1rem' }}>
                  {selectedLesson.description}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                  <div>
                    <span style={{ color: '#9CA3AF' }}>Category:</span>{' '}
                    <span style={{ color: '#374151' }}>{categoryLabels[selectedLesson.category]}</span>
                  </div>
                  <div>
                    <span style={{ color: '#9CA3AF' }}>Project:</span>{' '}
                    <span style={{ color: '#374151' }}>{selectedLesson.projectTitle || 'Unknown'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#9CA3AF' }}>Created:</span>{' '}
                    <span style={{ color: '#374151' }}>{formatDate(selectedLesson.createdAt)}</span>
                  </div>
                  <div>
                    <span style={{ color: '#9CA3AF' }}>Last Curated:</span>{' '}
                    <span style={{ color: '#374151' }}>{formatDate(selectedLesson.lastCuratedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Generalisation Preview */}
              {generalisedPreview && generalisedPreview.lessonId === selectedLesson.id && (
                <div
                  style={{
                    background: '#F0FDF4',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: '1px solid #BBF7D0',
                  }}
                >
                  <div style={{ fontWeight: '600', color: '#166534', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    Suggested Generalisation
                  </div>
                  <div style={{ fontWeight: '500', color: '#1A1A2E', marginBottom: '0.25rem' }}>
                    {generalisedPreview.title}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.75rem' }}>
                    {generalisedPreview.description}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => applyGeneralisation(selectedLesson.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      Apply Generalisation
                    </button>
                    <button
                      onClick={() => setGeneralisedPreview(null)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#E2E8F0',
                        color: '#475569',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>Actions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={() => applyDecision(selectedLesson.id, 'approved')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#D1FAE5',
                      color: '#059669',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                    }}
                  >
                    Approve - Keep this lesson active
                  </button>

                  {selectedLesson.isBookSpecific && (
                    <button
                      onClick={() => generateGeneralisation(selectedLesson.id)}
                      disabled={generalisingId === selectedLesson.id}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#EDE9FE',
                        color: '#7C3AED',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: generalisingId === selectedLesson.id ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        fontSize: '0.875rem',
                      }}
                    >
                      {generalisingId === selectedLesson.id ? 'Generating...' : 'Generalise - Remove book-specific references'}
                    </button>
                  )}

                  <button
                    onClick={() => applyDecision(selectedLesson.id, 'archived', 'Not applicable to other books')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#F3F4F6',
                      color: '#6B7280',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                    }}
                  >
                    Archive - This lesson is not useful
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Delete this lesson permanently?')) {
                        applyDecision(selectedLesson.id, 'archived', 'Deleted by user');
                      }
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#FEE2E2',
                      color: '#DC2626',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                    }}
                  >
                    Delete - Remove permanently
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#FFFBEB',
            borderRadius: '8px',
            border: '1px solid #FDE68A',
          }}
        >
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#92400E', fontSize: '0.875rem' }}>
            About Lesson Curation
          </h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#78350F' }}>
            <strong>Book-Specific</strong> lessons contain references to specific chapters, characters, or scenes from a particular book.
            Use the &quot;Generalise&quot; action to rewrite them as universal writing principles that apply to any novel.
            <br /><br />
            <strong>Duplicates</strong> are lessons with similar content. Archive duplicates to keep your lesson library clean and focused.
            <br /><br />
            <strong>Run AI Analysis</strong> to automatically scan all lessons and identify potential issues.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
