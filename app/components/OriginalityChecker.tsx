'use client';

import { useState } from 'react';
import { getToken } from '../lib/auth';

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

interface PlagiarismCheckResult {
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

interface OriginalityCheckerProps {
  contentId: string;
  contentType: 'concept' | 'summary' | 'chapter' | 'story-idea';
  title?: string;
  onCheckComplete?: (result: PlagiarismCheckResult) => void;
  compact?: boolean;
}

export default function OriginalityChecker({
  contentId,
  contentType,
  title,
  onCheckComplete,
  compact = false,
}: OriginalityCheckerProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<PlagiarismCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const runCheck = async () => {
    try {
      setIsChecking(true);
      setError(null);

      const token = getToken();
      const endpoint = `/api/plagiarism/check/${contentType}/${contentId}`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to check originality');
      }

      const checkResult = await response.json();
      setResult(checkResult);
      onCheckComplete?.(checkResult);
    } catch (err: any) {
      console.error('Originality check error:', err);
      setError(err.message);
    } finally {
      setIsChecking(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 75) return '#10B981'; // Green
    if (score >= 50) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
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
        fontSize: '0.75rem',
        fontWeight: 600,
        background: style.bg,
        color: style.text,
      }}>
        {style.label}
      </span>
    );
  };

  const ScoreBar = ({ label, score }: { label: string; score: number }) => (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{label}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: getScoreColor(score) }}>
          {score}%
        </span>
      </div>
      <div style={{
        height: '6px',
        background: '#E5E7EB',
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${score}%`,
          background: getScoreColor(score),
          borderRadius: '3px',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );

  if (compact && !result) {
    return (
      <button
        onClick={runCheck}
        disabled={isChecking}
        style={{
          padding: '0.5rem 1rem',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '6px',
          color: '#374151',
          fontSize: '0.875rem',
          cursor: isChecking ? 'wait' : 'pointer',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {isChecking ? (
          <>
            <span style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              border: '2px solid #E2E8F0',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            Checking...
          </>
        ) : (
          <>Check Originality</>
        )}
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </button>
    );
  }

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
      padding: '1.5rem',
      marginTop: '1rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#1A1A2E', margin: 0 }}>
          Originality Check {title && <span style={{ fontWeight: 400, color: '#64748B' }}>- {title}</span>}
        </h4>
        {result && getStatusBadge(result.status)}
      </div>

      {error && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          color: '#DC2626',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {!result ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1rem' }}>
            Check if this content is unique and doesn't closely resemble existing published works.
          </p>
          <button
            onClick={runCheck}
            disabled={isChecking}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isChecking ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {isChecking ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#FFFFFF',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Analyzing...
              </>
            ) : (
              'Run Originality Check'
            )}
          </button>
          <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div>
          {/* Overall Score */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            marginBottom: '1.5rem',
            padding: '1rem',
            background: '#F8FAFC',
            borderRadius: '8px',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: `conic-gradient(${getScoreColor(result.originalityScore.overall)} ${result.originalityScore.overall * 3.6}deg, #E5E7EB ${result.originalityScore.overall * 3.6}deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: getScoreColor(result.originalityScore.overall),
              }}>
                {result.originalityScore.overall}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1A2E', marginBottom: '0.5rem' }}>
                Overall Originality Score
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                {result.originalityScore.overall >= 75
                  ? 'This concept appears highly original with unique elements.'
                  : result.originalityScore.overall >= 50
                    ? 'Some familiar elements detected. Consider adding unique twists.'
                    : 'Significant similarities found. Strong differentiation recommended.'}
              </div>
            </div>
          </div>

          {/* Detailed Scores */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            <ScoreBar label="Plot" score={result.originalityScore.plotOriginality} />
            <ScoreBar label="Characters" score={result.originalityScore.characterOriginality} />
            <ScoreBar label="Setting" score={result.originalityScore.settingOriginality} />
            <ScoreBar label="Themes" score={result.originalityScore.themeOriginality} />
            <ScoreBar label="Premise" score={result.originalityScore.premiseOriginality} />
          </div>

          {/* Similar Works */}
          {result.similarWorks.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1A2E', marginBottom: '0.75rem' }}>
                Similar Published Works
              </h5>
              {result.similarWorks.map((work, index) => (
                <div key={index} style={{
                  padding: '0.75rem',
                  background: work.similarity > 60 ? '#FEF2F2' : '#F8FAFC',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  border: `1px solid ${work.similarity > 60 ? '#FECACA' : '#E2E8F0'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1A1A2E' }}>
                        {work.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
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
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.5rem' }}>
                    {work.description}
                  </div>
                  {work.matchedElements.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                      Matched: {work.matchedElements.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Flags */}
          {result.flags.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1A2E', marginBottom: '0.75rem' }}>
                Originality Concerns
              </h5>
              {result.flags.map((flag) => (
                <div key={flag.id} style={{
                  padding: '0.75rem',
                  background: flag.severity === 'high' ? '#FEF2F2' : flag.severity === 'medium' ? '#FEF3C7' : '#F8FAFC',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
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
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
                      {flag.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>
                    {flag.description}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    <strong>Similar to:</strong> {flag.similarTo}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '0.25rem' }}>
                    <strong>Suggestion:</strong> {flag.suggestion}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1A2E', marginBottom: '0.75rem' }}>
                Recommendations
              </h5>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {result.recommendations.map((rec, index) => (
                  <li key={index} style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Analysis Details Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              padding: '0.5rem 1rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              color: '#374151',
              fontSize: '0.75rem',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            {showDetails ? 'Hide Details' : 'Show Analysis Details'}
          </button>

          {showDetails && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#F8FAFC', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.5rem' }}>
                    Tropes Identified
                  </div>
                  {result.analysisDetails.tropesIdentified.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {result.analysisDetails.tropesIdentified.map((trope, i) => (
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
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.5rem' }}>
                    Archetypes Used
                  </div>
                  {result.analysisDetails.archetypesUsed.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {result.analysisDetails.archetypesUsed.map((arch, i) => (
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
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10B981', marginBottom: '0.5rem' }}>
                    Unique Elements
                  </div>
                  {result.analysisDetails.uniqueElements.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                      {result.analysisDetails.uniqueElements.map((elem, i) => (
                        <li key={i} style={{ fontSize: '0.75rem', color: '#374151' }}>{elem}</li>
                      ))}
                    </ul>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>None identified</span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#EF4444', marginBottom: '0.5rem' }}>
                    Concerning Patterns
                  </div>
                  {result.analysisDetails.concerningPatterns.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                      {result.analysisDetails.concerningPatterns.map((pattern, i) => (
                        <li key={i} style={{ fontSize: '0.75rem', color: '#374151' }}>{pattern}</li>
                      ))}
                    </ul>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>None identified</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Re-check Button */}
          <button
            onClick={runCheck}
            disabled={isChecking}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              color: '#374151',
              fontSize: '0.75rem',
              cursor: isChecking ? 'wait' : 'pointer',
              width: '100%',
            }}
          >
            {isChecking ? 'Re-checking...' : 'Run Check Again'}
          </button>
        </div>
      )}
    </div>
  );
}
