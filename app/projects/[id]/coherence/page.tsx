'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageLayout from '../../../components/shared/PageLayout';
import LoadingState from '../../../components/shared/LoadingState';
import { getToken } from '../../../lib/auth';
import { colors, gradients, borderRadius } from '../../../lib/constants';
import { card } from '../../../lib/styles';
import { useProjectNavigation } from '@/app/hooks';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CoherenceResult {
  isCoherent: boolean;
  warnings: string[];
  suggestions: string[];
  plotAnalysis: Array<{
    plotName: string;
    isCoherent: boolean;
    reason: string;
  }>;
  checkedAt?: string;
  status?: string;
  error?: string;
}

interface PlotLayer {
  id: string;
  name: string;
  description: string;
  type: 'main' | 'subplot' | 'mystery' | 'romance' | 'character-arc';
}

export default function CoherencePage() {
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

  const navigation = useProjectNavigation(projectId, project);

  // Fetch cached coherence check result
  const fetchCachedResult = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/coherence-check`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) return null;

      const data = await res.json();
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

      // Fetch project, plot structure, and cached coherence result in parallel
      const [projectRes, plotRes, cachedResult] = await Promise.all([
        fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/projects/${projectId}/plot-structure`, {
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

      // Handle cached result
      if (cachedResult) {
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
    }, 2000); // Poll every 2 seconds
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

  const implementSuggestion = async (suggestion: string) => {
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

      // Refresh data and re-run coherence check
      await fetchData();
      await runCoherenceCheck();
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

      // Mark as fixed and refresh data
      setFixedWarnings(prev => new Set(prev).add(index));
      await fetchData();
      // Optionally re-run coherence check after fix
      await runCoherenceCheck();
    } catch (err: any) {
      console.error('Error fixing warning:', err);
      setError(err.message);
    } finally {
      setFixingWarning(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading coherence analysis..." />;
  }

  return (
    <PageLayout
      title="Plot Coherence"
      subtitle="Validate that your plots align with your story concept"
      backLink={`/projects/${projectId}`}
      backText="← Back to Overview"
      projectNavigation={navigation}
    >
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
                ⚠ Warnings ({coherenceResult.warnings.length})
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
                ✓ All warnings have been fixed
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
                Showing {Math.min(suggestionPage * SUGGESTIONS_PER_PAGE + 1, coherenceResult.suggestions.length)}-{Math.min((suggestionPage + 1) * SUGGESTIONS_PER_PAGE, coherenceResult.suggestions.length)} of {coherenceResult.suggestions.length}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '1rem', fontStyle: 'italic' }}>
              Each &quot;Implement&quot; button applies only that specific recommendation
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {coherenceResult.suggestions
                .slice(suggestionPage * SUGGESTIONS_PER_PAGE, (suggestionPage + 1) * SUGGESTIONS_PER_PAGE)
                .map((suggestion, index) => (
                <div
                  key={suggestionPage * SUGGESTIONS_PER_PAGE + index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'white',
                    borderRadius: borderRadius.md,
                    border: '1px solid #E0E7FF',
                  }}
                >
                  <p style={{ margin: 0, color: '#374151', fontSize: '0.9375rem', flex: 1 }}>
                    <span style={{ fontWeight: 600, color: '#4F46E5', marginRight: '0.5rem' }}>
                      #{suggestionPage * SUGGESTIONS_PER_PAGE + index + 1}
                    </span>
                    {suggestion}
                  </p>
                  <button
                    onClick={() => implementSuggestion(suggestion)}
                    disabled={implementing === suggestion}
                    style={{
                      padding: '0.5rem 1rem',
                      background: implementing === suggestion ? '#E5E7EB' : '#667eea',
                      border: 'none',
                      borderRadius: borderRadius.md,
                      color: 'white',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      cursor: implementing === suggestion ? 'wait' : 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    {implementing === suggestion ? (
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
                </div>
              ))}
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
                  ← Previous
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
                  Next →
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
            ← Back to Plot
          </button>
          <button
            onClick={() => router.push(`/projects/${projectId}/originality`)}
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
            Continue to Originality →
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
