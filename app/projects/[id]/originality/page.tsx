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

interface OriginalityScore {
  overall: number;
  plotOriginality: number;
  characterOriginality: number;
  settingOriginality: number;
  themeOriginality: number;
  premiseOriginality: number;
}

interface SimilarWork {
  title: string;
  author: string;
  similarity: number;
  matchedElements: string[];
  description: string;
  publicationYear?: number;
}

interface PlagiarismFlag {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  similarTo: string;
  suggestion: string;
}

interface OriginalityResult {
  id: string;
  contentType: string;
  contentId: string;
  checkedAt: string;
  status: string;
  originalityScore: OriginalityScore;
  similarWorks: SimilarWork[];
  flags: PlagiarismFlag[];
  recommendations: string[];
  analysisDetails: {
    tropesIdentified: string[];
    archetypesUsed: string[];
    uniqueElements: string[];
    concerningPatterns: string[];
  };
}

export default function OriginalityPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [originalityResult, setOriginalityResult] = useState<OriginalityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState<string | null>(null);
  const [implementing, setImplementing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const navigation = useProjectNavigation(projectId, project);

  // Fetch cached originality check result
  const fetchCachedResult = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/originality-check`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) return null;

      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Error fetching cached originality result:', err);
      return null;
    }
  }, [projectId]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();

      // Fetch project and cached originality result in parallel
      const [projectRes, cachedResult] = await Promise.all([
        fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetchCachedResult(),
      ]);

      if (!projectRes.ok) throw new Error('Failed to load project');

      const projectData = await projectRes.json();
      setProject(projectData);

      // Handle cached result
      if (cachedResult) {
        if (cachedResult.status === 'pending' || cachedResult.status === 'running') {
          // Check is in progress, start polling
          setCheckStatus(cachedResult.status);
          setChecking(true);
          startPolling();
        } else if (cachedResult.status === 'none') {
          // No check has been run - user can trigger manually
          setOriginalityResult(null);
        } else {
          // We have a completed result (passed, flagged, requires_review, etc.)
          setOriginalityResult(cachedResult);
          setCheckStatus(null);
        }
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
        if (result.status !== 'pending' && result.status !== 'running' && result.status !== 'none') {
          // Check is complete
          setOriginalityResult(result);
          setChecking(false);
          setCheckStatus(null);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else if (result.status === 'none') {
          // Something went wrong, check was not queued
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

  // Trigger a new originality check (manual re-run)
  const runOriginalityCheck = async () => {
    if (!project?.story_concept) return;

    try {
      setChecking(true);
      setError(null);
      setOriginalityResult(null);
      const token = getToken();

      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/originality-check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error('Failed to trigger originality check');

      const result = await res.json();
      setCheckStatus('pending');
      startPolling();
    } catch (err: any) {
      console.error('Error triggering originality check:', err);
      setError(err.message);
      setChecking(false);
    }
  };

  const implementRecommendation = async (recommendation: string) => {
    try {
      setImplementing(recommendation);
      const token = getToken();

      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/implement-originality-suggestion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recommendation }),
      });

      if (!res.ok) {
        if (res.status === 404) {
          alert('This feature will be available soon. For now, please implement the recommendation manually.');
        } else {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Failed to implement recommendation');
        }
        return;
      }

      // Refresh and re-check
      await fetchData();
      await runOriginalityCheck();
    } catch (err: any) {
      console.error('Error implementing recommendation:', err);
      setError(err.message);
    } finally {
      setImplementing(null);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 75) return '#10B981';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      passed: { bg: '#D1FAE5', text: '#065F46', label: 'Original' },
      flagged: { bg: '#FEE2E2', text: '#991B1B', label: 'Concerns Found' },
      requires_review: { bg: '#FEF3C7', text: '#92400E', label: 'Review Recommended' },
    };
    const style = styles[status] || { bg: '#E5E7EB', text: '#374151', label: status };

    return (
      <span style={{
        display: 'inline-block',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.875rem',
        fontWeight: 600,
        background: style.bg,
        color: style.text,
      }}>
        {style.label}
      </span>
    );
  };

  const ScoreBar = ({ label, score }: { label: string; score: number }) => (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.875rem', color: '#64748B' }}>{label}</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: getScoreColor(score) }}>
          {score}%
        </span>
      </div>
      <div style={{
        height: '8px',
        background: '#E5E7EB',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${score}%`,
          background: getScoreColor(score),
          borderRadius: '4px',
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );

  if (loading) {
    return <LoadingState message="Loading originality analysis..." />;
  }

  return (
    <PageLayout
      title="Originality Check"
      subtitle="Ensure your story concept is unique and original"
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

        {/* No Concept Warning */}
        {!project?.story_concept && (
          <div style={{
            ...card,
            padding: '2rem',
            textAlign: 'center',
            background: '#FEF3C7',
            border: '1px solid #FDE68A',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
            <h2 style={{ fontSize: '1.25rem', color: '#92400E', marginBottom: '0.5rem' }}>
              No Story Concept Found
            </h2>
            <p style={{ color: '#B45309', marginBottom: '1.5rem' }}>
              Add a story concept to your project before running originality checks.
            </p>
            <button
              onClick={() => router.push(`/projects/${projectId}`)}
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
              Go to Project Overview
            </button>
          </div>
        )}

        {/* Originality Status Card */}
        {project?.story_concept && (
          <>
            <div style={{
              ...card,
              marginBottom: '1.5rem',
              padding: '1.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.text, marginBottom: '0.5rem' }}>
                    Originality Analysis
                  </h2>
                  {checking && (
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      background: '#EEF2FF',
                      color: '#4338CA',
                    }}>
                      {checkStatus === 'pending' ? 'Queued...' : 'Checking...'}
                    </span>
                  )}
                  {!checking && originalityResult && getStatusBadge(originalityResult.status)}
                  {!checking && !originalityResult && (
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      background: '#F3F4F6',
                      color: '#6B7280',
                    }}>
                      Not checked yet
                    </span>
                  )}
                </div>
                <button
                  onClick={runOriginalityCheck}
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
                  {checking ? (
                    <>
                      <span style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }} />
                      Analyzing...
                    </>
                  ) : originalityResult ? 'Re-check' : 'Run Check'}
                </button>
              </div>

              {/* Overall Score Circle */}
              {originalityResult && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2rem',
                  padding: '1.5rem',
                  background: '#F8FAFC',
                  borderRadius: borderRadius.md,
                }}>
                  <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: `conic-gradient(${getScoreColor(originalityResult.originalityScore.overall)} ${originalityResult.originalityScore.overall * 3.6}deg, #E5E7EB ${originalityResult.originalityScore.overall * 3.6}deg)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: getScoreColor(originalityResult.originalityScore.overall),
                    }}>
                      {originalityResult.originalityScore.overall}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, marginBottom: '0.5rem' }}>
                      Overall Originality Score
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
                      {originalityResult.originalityScore.overall >= 75
                        ? 'This concept appears highly original with unique elements.'
                        : originalityResult.originalityScore.overall >= 50
                          ? 'Some familiar elements detected. Consider adding unique twists.'
                          : 'Significant similarities found. Strong differentiation recommended.'}
                    </p>
                  </div>
                </div>
              )}

              <style jsx>{`
                @keyframes spin { to { transform: rotate(360deg); } }
              `}</style>
            </div>

            {/* Detailed Scores */}
            {originalityResult && (
              <div style={{ ...card, marginBottom: '1.5rem', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: colors.text, marginBottom: '1.25rem' }}>
                  Detailed Scores
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                  <ScoreBar label="Plot Originality" score={originalityResult.originalityScore.plotOriginality} />
                  <ScoreBar label="Character Originality" score={originalityResult.originalityScore.characterOriginality} />
                  <ScoreBar label="Setting Originality" score={originalityResult.originalityScore.settingOriginality} />
                  <ScoreBar label="Theme Originality" score={originalityResult.originalityScore.themeOriginality} />
                  <ScoreBar label="Premise Originality" score={originalityResult.originalityScore.premiseOriginality} />
                </div>
              </div>
            )}

            {/* Similar Works */}
            {originalityResult?.similarWorks && originalityResult.similarWorks.length > 0 && (
              <div style={{ ...card, marginBottom: '1.5rem', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: colors.text, marginBottom: '1rem' }}>
                  Similar Published Works
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {originalityResult.similarWorks.map((work, index) => (
                    <div key={index} style={{
                      padding: '1rem',
                      background: work.similarity > 60 ? '#FEF2F2' : '#F8FAFC',
                      border: `1px solid ${work.similarity > 60 ? '#FECACA' : '#E2E8F0'}`,
                      borderRadius: borderRadius.md,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: colors.text }}>
                            {work.title}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>
                            by {work.author} {work.publicationYear && `(${work.publicationYear})`}
                          </div>
                        </div>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: work.similarity > 60 ? '#FEE2E2' : '#E5E7EB',
                          color: work.similarity > 60 ? '#991B1B' : '#374151',
                        }}>
                          {work.similarity}% similar
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0.5rem 0 0 0' }}>
                        {work.description}
                      </p>
                      {work.matchedElements.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                          Matched: {work.matchedElements.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flags */}
            {originalityResult?.flags && originalityResult.flags.length > 0 && (
              <div style={{ ...card, marginBottom: '1.5rem', padding: '1.5rem', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#DC2626', marginBottom: '1rem' }}>
                  Originality Concerns
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {originalityResult.flags.map((flag) => (
                    <div key={flag.id} style={{
                      padding: '1rem',
                      background: 'white',
                      borderRadius: borderRadius.md,
                      border: `1px solid ${flag.severity === 'high' ? '#FECACA' : flag.severity === 'medium' ? '#FDE68A' : '#E2E8F0'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          background: flag.severity === 'high' ? '#FEE2E2' : flag.severity === 'medium' ? '#FEF3C7' : '#E5E7EB',
                          color: flag.severity === 'high' ? '#991B1B' : flag.severity === 'medium' ? '#92400E' : '#374151',
                        }}>
                          {flag.severity}
                        </span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
                          {flag.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0 0 0.5rem 0' }}>
                        {flag.description}
                      </p>
                      <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>
                        <strong>Similar to:</strong> {flag.similarTo}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#10B981', marginTop: '0.25rem' }}>
                        <strong>Suggestion:</strong> {flag.suggestion}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations with Implement Buttons */}
            {originalityResult?.recommendations && originalityResult.recommendations.length > 0 && (
              <div style={{ ...card, marginBottom: '1.5rem', padding: '1.5rem', background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#4338CA', marginBottom: '1rem' }}>
                  Recommendations
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {originalityResult.recommendations.map((recommendation, index) => (
                    <div
                      key={index}
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
                        {recommendation}
                      </p>
                      <button
                        onClick={() => implementRecommendation(recommendation)}
                        disabled={implementing === recommendation}
                        style={{
                          padding: '0.5rem 1rem',
                          background: implementing === recommendation ? '#E5E7EB' : '#667eea',
                          border: 'none',
                          borderRadius: borderRadius.md,
                          color: 'white',
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          cursor: implementing === recommendation ? 'wait' : 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                        }}
                      >
                        {implementing === recommendation ? (
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
              </div>
            )}

            {/* Analysis Details Toggle */}
            {originalityResult && (
              <div style={{ ...card, marginBottom: '1.5rem', padding: '1.5rem' }}>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: borderRadius.md,
                    color: '#374151',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  {showDetails ? 'Hide Analysis Details' : 'Show Analysis Details'}
                </button>

                {showDetails && (
                  <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: borderRadius.md }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', marginBottom: '0.5rem' }}>
                        Tropes Identified
                      </div>
                      {originalityResult.analysisDetails.tropesIdentified.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {originalityResult.analysisDetails.tropesIdentified.map((trope, i) => (
                            <span key={i} style={{
                              padding: '0.25rem 0.5rem',
                              background: '#E5E7EB',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: '#374151',
                            }}>
                              {trope}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>None identified</span>
                      )}
                    </div>
                    <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: borderRadius.md }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', marginBottom: '0.5rem' }}>
                        Archetypes Used
                      </div>
                      {originalityResult.analysisDetails.archetypesUsed.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {originalityResult.analysisDetails.archetypesUsed.map((arch, i) => (
                            <span key={i} style={{
                              padding: '0.25rem 0.5rem',
                              background: '#E5E7EB',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: '#374151',
                            }}>
                              {arch}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>None identified</span>
                      )}
                    </div>
                    <div style={{ padding: '1rem', background: '#ECFDF5', borderRadius: borderRadius.md }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#10B981', marginBottom: '0.5rem' }}>
                        Unique Elements
                      </div>
                      {originalityResult.analysisDetails.uniqueElements.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                          {originalityResult.analysisDetails.uniqueElements.map((elem, i) => (
                            <li key={i} style={{ fontSize: '0.75rem', color: '#374151' }}>{elem}</li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>None identified</span>
                      )}
                    </div>
                    <div style={{ padding: '1rem', background: '#FEF2F2', borderRadius: borderRadius.md }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#EF4444', marginBottom: '0.5rem' }}>
                        Concerning Patterns
                      </div>
                      {originalityResult.analysisDetails.concerningPatterns.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                          {originalityResult.analysisDetails.concerningPatterns.map((pattern, i) => (
                            <li key={i} style={{ fontSize: '0.75rem', color: '#374151' }}>{pattern}</li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>None identified</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
          <button
            onClick={() => router.push(`/projects/${projectId}/coherence`)}
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
            ← Back to Coherence
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
            Continue to Outline →
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
