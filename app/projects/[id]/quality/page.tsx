'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import LoadingState from '../../../components/shared/LoadingState';
import AIChangeResultModal from '../../../components/shared/AIChangeResultModal';
import { getToken } from '../../../lib/auth';
import { colors, gradients, borderRadius } from '../../../lib/constants';
import { card } from '../../../lib/styles';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Suggestion {
  issue: string;
  remediation: string;
}

interface CoherenceResult {
  isCoherent: boolean;
  warnings: string[];
  suggestions: Array<string | Suggestion>; // Support both old (string) and new (object) formats
  plotAnalysis: Array<{
    plotName: string;
    isCoherent: boolean;
    reason: string;
  }>;
  checkedAt?: string;
  status?: string;
  error?: string;
  versionId?: string; // The version this check was performed against
  isStale?: boolean; // True if this check is from a different version than the active one
}

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
}

// Helper to normalise suggestions to the new format
function normaliseSuggestion(suggestion: string | Suggestion): Suggestion {
  if (typeof suggestion === 'string') {
    return { issue: suggestion, remediation: '' };
  }
  return suggestion;
}

interface PlotPoint {
  id: string;
  chapter_number: number;
  description: string;
  phase: string;
  impact_level: number;
}

interface PlotLayer {
  id: string;
  name: string;
  description: string;
  type: 'main' | 'subplot' | 'mystery' | 'romance' | 'character-arc';
  points?: PlotPoint[];
}

export default function QualityPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [plotLayers, setPlotLayers] = useState<PlotLayer[]>([]);
  const [coherenceResult, setCoherenceResult] = useState<CoherenceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<string | null>(null);
  const [implementing, setImplementing] = useState<string | null>(null);
  const [fixingWarning, setFixingWarning] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [suggestionPage, setSuggestionPage] = useState(0);
  const SUGGESTIONS_PER_PAGE = 5;
  const [fixedWarnings, setFixedWarnings] = useState<Set<number>>(new Set());
  const [implementedSuggestions, setImplementedSuggestions] = useState<Set<number>>(new Set());
  const [changeResultModal, setChangeResultModal] = useState<{
    isOpen: boolean;
    title: string;
    explanation: string;
    changesMade: string[];
  }>({ isOpen: false, title: '', explanation: '', changesMade: [] });

  // Version-related state
  const [versions, setVersions] = useState<BookVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);

  // Fetch cached coherence check result
  const fetchCachedResult = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/coherence-check`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) return null;

      const data = await res.json();
      console.log('[Quality] Coherence check API response:', {
        status: data.status,
        isStale: data.isStale,
        versionId: data.versionId,
        activeVersionId: data.activeVersionId,
        checkedAt: data.checkedAt,
      });
      return data;
    } catch (err) {
      console.error('Error fetching cached coherence result:', err);
      return null;
    }
  }, [projectId]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();

      // Fetch project, plot structure, books, and cached coherence result in parallel
      const [projectRes, plotRes, booksRes, cachedResult] = await Promise.all([
        fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/projects/${projectId}/plot-structure`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/books/project/${projectId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetchCachedResult(),
      ]);

      if (!projectRes.ok) throw new Error('Failed to load project');

      const projectData = await projectRes.json();
      setProject(projectData);

      if (plotRes.ok) {
        const plotData = await plotRes.json();
        setPlotLayers(plotData.plot_layers || []);
      }

      // Fetch book versions if we have a book
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        if (booksData.books?.length > 0) {
          const firstBookId = booksData.books[0].id;
          setBookId(firstBookId);

          // Fetch versions for the book
          const versionsRes = await fetch(`${API_BASE_URL}/api/books/${firstBookId}/versions`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (versionsRes.ok) {
            const versionsData = await versionsRes.json();
            const bookVersions = versionsData.versions || [];
            setVersions(bookVersions);

            // Find active version
            const active = bookVersions.find((v: BookVersion) => v.is_active === 1);
            if (active) {
              setActiveVersionId(active.id);
            }
          }
        }
      }

      // Handle cached result and store activeVersionId from backend response
      if (cachedResult) {
        // Store the active version ID from the backend
        if (cachedResult.activeVersionId) {
          setActiveVersionId(cachedResult.activeVersionId);
        }

        if (cachedResult.status === 'pending' || cachedResult.status === 'running') {
          // Check is in progress, start polling
          setCheckStatus(cachedResult.status);
          setChecking(true);
          startPolling();
        } else if (cachedResult.status === 'completed') {
          // We have a completed result
          setCoherenceResult({
            isCoherent: cachedResult.isCoherent,
            warnings: cachedResult.warnings || [],
            suggestions: cachedResult.suggestions || [],
            plotAnalysis: cachedResult.plotAnalysis || [],
            checkedAt: cachedResult.checkedAt,
            status: 'completed',
            versionId: cachedResult.versionId, // Track which version this check was for
            isStale: cachedResult.isStale || false, // Backend marks stale results
          });
          setCheckStatus(null);
        } else if (cachedResult.status === 'failed') {
          setError(cachedResult.error || 'Coherence check failed');
          setCheckStatus(null);
        }
        // If status is 'none', no check has been run yet - user can trigger manually
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchCachedResult]);

  // Poll for check completion
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      const result = await fetchCachedResult();
      if (result) {
        if (result.status === 'completed') {
          setCoherenceResult({
            isCoherent: result.isCoherent,
            warnings: result.warnings || [],
            suggestions: result.suggestions || [],
            plotAnalysis: result.plotAnalysis || [],
            checkedAt: result.checkedAt,
            status: 'completed',
            versionId: result.versionId,
            isStale: result.isStale || false,
          });
          setChecking(false);
          setCheckStatus(null);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else if (result.status === 'failed') {
          setError(result.error || 'Coherence check failed');
          setChecking(false);
          setCheckStatus(null);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else {
          setCheckStatus(result.status);
        }
      }
    }, 5000); // Poll every 5 seconds
  }, [fetchCachedResult]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Trigger a new coherence check (manual re-run)
  const runCoherenceCheck = async () => {
    if (plotLayers.length === 0) return;

    try {
      setChecking(true);
      setError(null);
      setCoherenceResult(null);
      // Reset tracking state for new check
      setFixedWarnings(new Set());
      setImplementedSuggestions(new Set());
      setSuggestionPage(0);
      const token = getToken();

      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/coherence-check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error('Failed to trigger coherence check');

      const result = await res.json();
      setCheckStatus('pending');
      startPolling();
    } catch (err: any) {
      console.error('Error triggering coherence check:', err);
      setError(err.message);
      setChecking(false);
    }
  };

  const implementSuggestion = async (suggestion: string, index: number) => {
    try {
      setImplementing(suggestion);
      const token = getToken();

      // Call AI to implement the suggestion
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/implement-coherence-suggestion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ suggestion }),
      });

      if (!res.ok) {
        // If endpoint doesn't exist, show a message
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 404) {
          alert('This feature will be available soon. For now, please implement the suggestion manually on the Plot page.');
        } else {
          throw new Error(errorData.error?.message || 'Failed to implement suggestion');
        }
        return;
      }

      const data = await res.json();

      // Mark this suggestion as implemented (don't re-run coherence check)
      setImplementedSuggestions(prev => new Set(prev).add(index));

      // Show modal with the changes made
      setChangeResultModal({
        isOpen: true,
        title: 'Recommendation Implemented',
        explanation: data.explanation || 'The plot structure has been updated to address this recommendation.',
        changesMade: data.changesMade || [],
      });
    } catch (err: any) {
      console.error('Error implementing suggestion:', err);
      setError(err.message);
    } finally {
      setImplementing(null);
    }
  };

  // AI auto-fix for warnings
  const fixWarningWithAI = async (warning: string, index: number) => {
    try {
      setFixingWarning(index);
      const token = getToken();

      // Call AI to fix the warning
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/fix-coherence-warning`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ warning }),
      });

      if (!res.ok) {
        // If endpoint doesn't exist, show a message
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 404) {
          alert('This feature will be available soon. For now, please address the warning manually on the Plot page.');
        } else {
          throw new Error(errorData.error?.message || 'Failed to fix warning');
        }
        return;
      }

      const data = await res.json();

      // Mark as fixed (don't auto re-run coherence check - user can decide when to re-check)
      setFixedWarnings(prev => new Set(prev).add(index));

      // Show modal with the changes made
      setChangeResultModal({
        isOpen: true,
        title: 'Warning Fixed',
        explanation: data.explanation || 'The warning has been addressed by updating the plot structure.',
        changesMade: data.changesMade || [],
      });
    } catch (err: any) {
      console.error('Error fixing warning:', err);
      setError(err.message);
    } finally {
      setFixingWarning(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading quality analysis..." />;
  }

  return (
    <DashboardLayout
      header={{ title: 'Plot Quality', subtitle: 'Validate that your plots align with your story concept' }}
      projectId={projectId}
    >
      <div style={{ padding: '1.5rem 0' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {error && (
          <div style={{
            padding: '1rem',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: borderRadius.md,
            color: '#DC2626',
            marginBottom: '1.5rem',
          }}>
            {error}
          </div>
        )}

        {/* Version Selector */}
        {versions.length > 0 && activeVersionId && (
          <div style={{
            ...card,
            marginBottom: '1.5rem',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}>
            <label style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
            }}>
              Version:
            </label>
            {versions.length > 1 ? (
              <select
                value={activeVersionId}
                disabled
                style={{
                  flex: 1,
                  maxWidth: '300px',
                  padding: '0.5rem 0.75rem',
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                  fontSize: '0.875rem',
                  backgroundColor: '#F9FAFB',
                  color: colors.text,
                  cursor: 'not-allowed',
                }}
              >
                {versions.map(version => (
                  <option key={version.id} value={version.id}>
                    {version.version_name || `Version ${version.version_number}`}
                    {version.is_active ? ' (Active)' : ''}
                    {' - '}
                    {(version.actual_chapter_count ?? version.chapter_count)} chapters
                  </option>
                ))}
              </select>
            ) : (
              <span style={{
                flex: 1,
                maxWidth: '300px',
                padding: '0.5rem 0.75rem',
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.md,
                fontSize: '0.875rem',
                backgroundColor: '#F9FAFB',
                color: colors.text,
              }}>
                {versions[0]?.version_name || `Version ${versions[0]?.version_number}`}
                {versions[0]?.is_active ? ' (Active)' : ''}
                {' - '}
                {(versions[0]?.actual_chapter_count ?? versions[0]?.chapter_count)} chapters
              </span>
            )}
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              Quality checks use the active version. Change the active version on the Plot page.
            </span>
          </div>
        )}

        {/* Version Mismatch Warning - show if: backend marks as stale OR version IDs don't match */}
        {coherenceResult && (coherenceResult.isStale || (activeVersionId && (!coherenceResult.versionId || coherenceResult.versionId !== activeVersionId))) && (
          <div style={{
            padding: '0.75rem 1rem',
            background: '#FEF3C7',
            border: '1px solid #FDE68A',
            borderRadius: borderRadius.md,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, color: '#92400E' }}>Stale Results: </span>
              <span style={{ color: '#B45309' }}>
                This quality check was run on a previous version. Click &quot;Re-check&quot; to analyse the current active version.
              </span>
            </div>
          </div>
        )}

        {/* No Plots Warning */}
        {plotLayers.length === 0 && (
          <div style={{
            ...card,
            padding: '2rem',
            textAlign: 'center',
            background: '#FEF3C7',
            border: '1px solid #FDE68A',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
            <h2 style={{ fontSize: '1.25rem', color: '#92400E', marginBottom: '0.5rem' }}>
              No Plot Layers Found
            </h2>
            <p style={{ color: '#B45309', marginBottom: '1.5rem' }}>
              Create plot layers on the Plot page before running coherence checks.
            </p>
            <button
              onClick={() => router.push(`/projects/${projectId}/plot`)}
              style={{
                padding: '0.75rem 1.5rem',
                background: gradients.brand,
                border: 'none',
                borderRadius: borderRadius.md,
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Go to Plot Page
            </button>
          </div>
        )}

        {/* Coherence Status Card */}
        {plotLayers.length > 0 && (
          <div style={{
            ...card,
            marginBottom: '1.5rem',
            padding: '1.5rem',
            background: coherenceResult?.isCoherent
              ? '#ECFDF5'
              : coherenceResult?.isCoherent === false
                ? '#FEF2F2'
                : '#F9FAFB',
            border: `2px solid ${
              coherenceResult?.isCoherent
                ? '#A7F3D0'
                : coherenceResult?.isCoherent === false
                  ? '#FECACA'
                  : '#E5E7EB'
            }`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: coherenceResult?.isCoherent
                    ? '#047857'
                    : coherenceResult?.isCoherent === false
                      ? '#DC2626'
                      : colors.text,
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  {coherenceResult?.isCoherent === true && '✓ '}
                  {coherenceResult?.isCoherent === false && '⚠ '}
                  {checking && (
                    <span style={{
                      display: 'inline-block',
                      width: '20px',
                      height: '20px',
                      border: '2px solid #E5E7EB',
                      borderTopColor: '#667eea',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                  )}
                  Coherence Status
                </h2>

                {checking && (
                  <p style={{ color: '#667eea', margin: 0 }}>
                    {checkStatus === 'pending' ? 'Coherence check queued...' : 'Coherence check in progress...'}
                  </p>
                )}

                {!coherenceResult && !checking && (
                  <p style={{ color: '#64748B', margin: 0 }}>
                    No coherence check available. Click &quot;Run Check&quot; to validate your plot structure.
                  </p>
                )}

                {coherenceResult?.isCoherent === true && (
                  <p style={{ color: '#047857', margin: 0 }}>
                    Your plots are coherent with your story concept. Great work!
                  </p>
                )}

                {coherenceResult?.isCoherent === false && (
                  <p style={{ color: '#DC2626', margin: 0 }}>
                    Some coherence issues were detected. See recommendations below.
                  </p>
                )}

                {coherenceResult?.checkedAt && (
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.5rem' }}>
                    Last checked: {new Date(coherenceResult.checkedAt).toLocaleString()}
                    {coherenceResult.isStale && ' (from previous version)'}
                  </p>
                )}
              </div>

              <button
                onClick={runCoherenceCheck}
                disabled={checking}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: checking ? '#E5E7EB' : gradients.brand,
                  border: 'none',
                  borderRadius: borderRadius.md,
                  color: checking ? '#9CA3AF' : 'white',
                  fontWeight: 600,
                  cursor: checking ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {checking ? 'Checking...' : coherenceResult ? 'Re-check' : 'Run Check'}
              </button>
            </div>

            <style jsx>{`
              @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
          </div>
        )}

        {/* Plot Stats Summary */}
        {plotLayers.length > 0 && (
          <div style={{
            ...card,
            marginBottom: '1.5rem',
            padding: '1.25rem',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, marginBottom: '1rem' }}>
              Plot Structure Summary
            </h3>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {/* Main Plots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  background: '#667eea',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}>
                  {plotLayers.filter(l => l.type === 'main').length}
                </span>
                <span style={{ color: '#64748B', fontSize: '0.875rem' }}>Main Plot{plotLayers.filter(l => l.type === 'main').length !== 1 ? 's' : ''}</span>
              </div>

              {/* Subplots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  background: '#10B981',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}>
                  {plotLayers.filter(l => l.type === 'subplot').length}
                </span>
                <span style={{ color: '#64748B', fontSize: '0.875rem' }}>Subplot{plotLayers.filter(l => l.type === 'subplot').length !== 1 ? 's' : ''}</span>
              </div>

              {/* Character Arcs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  background: '#F59E0B',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}>
                  {plotLayers.filter(l => l.type === 'character-arc').length}
                </span>
                <span style={{ color: '#64748B', fontSize: '0.875rem' }}>Character Arc{plotLayers.filter(l => l.type === 'character-arc').length !== 1 ? 's' : ''}</span>
              </div>

              {/* Other (mystery, romance) */}
              {plotLayers.filter(l => l.type === 'mystery' || l.type === 'romance').length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    width: '32px',
                    height: '32px',
                    background: '#8B5CF6',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}>
                    {plotLayers.filter(l => l.type === 'mystery' || l.type === 'romance').length}
                  </span>
                  <span style={{ color: '#64748B', fontSize: '0.875rem' }}>Specialised Thread{plotLayers.filter(l => l.type === 'mystery' || l.type === 'romance').length !== 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Total Plot Points */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid #E2E8F0', paddingLeft: '2rem' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  background: '#374151',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}>
                  {plotLayers.reduce((sum, layer) => sum + (layer.points?.length || 0), 0)}
                </span>
                <span style={{ color: '#64748B', fontSize: '0.875rem' }}>Total Plot Point{plotLayers.reduce((sum, layer) => sum + (layer.points?.length || 0), 0) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        )}

        {/* Plot Analysis Results */}
        {coherenceResult?.plotAnalysis && coherenceResult.plotAnalysis.length > 0 && (
          <div style={{ ...card, marginBottom: '1.5rem', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: colors.text, marginBottom: '1rem' }}>
              Plot Analysis
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {coherenceResult.plotAnalysis.map((analysis, index) => (
                <div
                  key={index}
                  style={{
                    padding: '1rem',
                    background: analysis.isCoherent ? '#F0FDF4' : '#FEF2F2',
                    border: `1px solid ${analysis.isCoherent ? '#BBF7D0' : '#FECACA'}`,
                    borderRadius: borderRadius.md,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>
                      {analysis.isCoherent ? '✓' : '⚠'}
                    </span>
                    <strong style={{ color: analysis.isCoherent ? '#166534' : '#991B1B' }}>
                      {analysis.plotName}
                    </strong>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: analysis.isCoherent ? '#166534' : '#991B1B',
                  }}>
                    {analysis.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings with AI Auto-Fix */}
        {coherenceResult?.warnings && coherenceResult.warnings.length > 0 && (
          <div style={{ ...card, marginBottom: '1.5rem', padding: '1.5rem', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#92400E', margin: 0 }}>
                Warnings ({coherenceResult.warnings.length})
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#92400E' }}>
                {fixedWarnings.size} of {coherenceResult.warnings.length} fixed
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#B45309', marginBottom: '1rem', fontStyle: 'italic' }}>
              Click &quot;Fix with AI&quot; to automatically resolve each warning
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {coherenceResult.warnings.map((warning, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: fixedWarnings.has(index) ? '#ECFDF5' : 'white',
                    borderRadius: borderRadius.md,
                    border: `1px solid ${fixedWarnings.has(index) ? '#A7F3D0' : '#FDE68A'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                    <span style={{ fontSize: '1.25rem' }}>
                      {fixedWarnings.has(index) ? '✓' : '⚠'}
                    </span>
                    <span style={{
                      color: fixedWarnings.has(index) ? '#047857' : '#B45309',
                      fontSize: '0.9375rem',
                      textDecoration: fixedWarnings.has(index) ? 'line-through' : 'none',
                      opacity: fixedWarnings.has(index) ? 0.7 : 1,
                    }}>
                      {warning}
                    </span>
                  </div>
                  {!fixedWarnings.has(index) && (
                    <button
                      onClick={() => fixWarningWithAI(warning, index)}
                      disabled={fixingWarning === index}
                      style={{
                        padding: '0.5rem 1rem',
                        background: fixingWarning === index ? '#E5E7EB' : '#F59E0B',
                        border: 'none',
                        borderRadius: borderRadius.md,
                        color: 'white',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        cursor: fixingWarning === index ? 'wait' : 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                      }}
                    >
                      {fixingWarning === index ? (
                        <>
                          <span style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: 'white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                          }} />
                          Fixing...
                        </>
                      ) : (
                        'Fix with AI'
                      )}
                    </button>
                  )}
                  {fixedWarnings.has(index) && (
                    <span style={{
                      padding: '0.5rem 1rem',
                      background: '#D1FAE5',
                      borderRadius: borderRadius.md,
                      color: '#047857',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                    }}>
                      Fixed
                    </span>
                  )}
                </div>
              ))}
            </div>
            {fixedWarnings.size === coherenceResult.warnings.length && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: '#ECFDF5',
                borderRadius: borderRadius.md,
                border: '1px solid #A7F3D0',
                color: '#047857',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                All warnings have been fixed
              </div>
            )}
          </div>
        )}

        {/* Suggestions with Implement Buttons - Paginated */}
        {coherenceResult?.suggestions && coherenceResult.suggestions.length > 0 && (
          <div style={{ ...card, marginBottom: '1.5rem', padding: '1.5rem', background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#4338CA', margin: 0 }}>
                Recommendations ({coherenceResult.suggestions.length} total)
              </h3>
              <span style={{ fontSize: '0.875rem', color: '#6366F1' }}>
                {implementedSuggestions.size} of {coherenceResult.suggestions.length} implemented
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '1rem', fontStyle: 'italic' }}>
              Click &quot;Implement&quot; to apply each recommendation. Re-run the check when ready.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {coherenceResult.suggestions
                .slice(suggestionPage * SUGGESTIONS_PER_PAGE, (suggestionPage + 1) * SUGGESTIONS_PER_PAGE)
                .map((rawSuggestion, localIndex) => {
                  const globalIndex = suggestionPage * SUGGESTIONS_PER_PAGE + localIndex;
                  const isImplemented = implementedSuggestions.has(globalIndex);
                  const suggestion = normaliseSuggestion(rawSuggestion);
                  return (
                <div
                  key={globalIndex}
                  style={{
                    padding: '1rem',
                    background: isImplemented ? '#ECFDF5' : 'white',
                    borderRadius: borderRadius.md,
                    border: `1px solid ${isImplemented ? '#A7F3D0' : '#E0E7FF'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                      <span style={{ fontSize: '1.25rem' }}>
                        {isImplemented ? '✓' : '💡'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          margin: 0,
                          color: isImplemented ? '#047857' : '#374151',
                          fontSize: '0.9375rem',
                          fontWeight: 500,
                          textDecoration: isImplemented ? 'line-through' : 'none',
                          opacity: isImplemented ? 0.7 : 1,
                        }}>
                          <span style={{ fontWeight: 600, color: isImplemented ? '#047857' : '#4F46E5', marginRight: '0.5rem' }}>
                            #{globalIndex + 1}
                          </span>
                          {suggestion.issue}
                        </p>
                        {suggestion.remediation && !isImplemented && (
                          <p style={{
                            margin: '0.5rem 0 0 0',
                            padding: '0.5rem 0.75rem',
                            background: '#F0F4FF',
                            borderRadius: borderRadius.sm,
                            color: '#4338CA',
                            fontSize: '0.8125rem',
                            lineHeight: 1.5,
                            borderLeft: '3px solid #818CF8',
                          }}>
                            <strong style={{ color: '#4F46E5' }}>Proposed fix:</strong> {suggestion.remediation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
                    {!isImplemented && (
                      <button
                        onClick={() => implementSuggestion(suggestion.issue, globalIndex)}
                        disabled={implementing === suggestion.issue}
                        style={{
                          padding: '0.5rem 1rem',
                          background: implementing === suggestion.issue ? '#E5E7EB' : '#667eea',
                          border: 'none',
                          borderRadius: borderRadius.md,
                          color: 'white',
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          cursor: implementing === suggestion.issue ? 'wait' : 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                        }}
                      >
                        {implementing === suggestion.issue ? (
                          <>
                            <span style={{
                              display: 'inline-block',
                              width: '12px',
                              height: '12px',
                              border: '2px solid rgba(255,255,255,0.3)',
                              borderTopColor: 'white',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite',
                            }} />
                            Implementing...
                          </>
                        ) : (
                          'Implement'
                        )}
                      </button>
                    )}
                    {isImplemented && (
                      <span style={{
                        padding: '0.5rem 1rem',
                        background: '#D1FAE5',
                        borderRadius: borderRadius.md,
                        color: '#047857',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                      }}>
                        Implemented
                      </span>
                    )}
                  </div>
                </div>
                  );
                })}
            </div>

            {/* Pagination Controls */}
            {coherenceResult.suggestions.length > SUGGESTIONS_PER_PAGE && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1rem',
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid #E0E7FF',
              }}>
                <button
                  onClick={() => setSuggestionPage(p => Math.max(0, p - 1))}
                  disabled={suggestionPage === 0}
                  style={{
                    padding: '0.5rem 1rem',
                    background: suggestionPage === 0 ? '#E5E7EB' : 'white',
                    border: '1px solid #C7D2FE',
                    borderRadius: borderRadius.md,
                    color: suggestionPage === 0 ? '#9CA3AF' : '#4F46E5',
                    fontWeight: 500,
                    cursor: suggestionPage === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.875rem', color: '#4F46E5' }}>
                  Page {suggestionPage + 1} of {Math.ceil(coherenceResult.suggestions.length / SUGGESTIONS_PER_PAGE)}
                </span>
                <button
                  onClick={() => setSuggestionPage(p => Math.min(Math.ceil(coherenceResult.suggestions.length / SUGGESTIONS_PER_PAGE) - 1, p + 1))}
                  disabled={(suggestionPage + 1) * SUGGESTIONS_PER_PAGE >= coherenceResult.suggestions.length}
                  style={{
                    padding: '0.5rem 1rem',
                    background: (suggestionPage + 1) * SUGGESTIONS_PER_PAGE >= coherenceResult.suggestions.length ? '#E5E7EB' : 'white',
                    border: '1px solid #C7D2FE',
                    borderRadius: borderRadius.md,
                    color: (suggestionPage + 1) * SUGGESTIONS_PER_PAGE >= coherenceResult.suggestions.length ? '#9CA3AF' : '#4F46E5',
                    fontWeight: 500,
                    cursor: (suggestionPage + 1) * SUGGESTIONS_PER_PAGE >= coherenceResult.suggestions.length ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
          <button
            onClick={() => router.push(`/projects/${projectId}/plot`)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'white',
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              color: colors.text,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Back to Plot
          </button>
          <button
            onClick={() => router.push(`/projects/${projectId}/outline`)}
            style={{
              padding: '0.75rem 1.5rem',
              background: gradients.brand,
              border: 'none',
              borderRadius: borderRadius.md,
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Continue to Outline
          </button>
        </div>

        {/* AI Change Result Modal */}
        <AIChangeResultModal
          isOpen={changeResultModal.isOpen}
          title={changeResultModal.title}
          explanation={changeResultModal.explanation}
          changesMade={changeResultModal.changesMade}
          onClose={() => setChangeResultModal(prev => ({ ...prev, isOpen: false }))}
        />
        </div>
      </div>
    </DashboardLayout>
  );
}
