'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getToken, logout } from '@/app/lib/auth';
import { colors, typography, spacing, borderRadius, shadows, transitions } from '@/app/lib/design-tokens';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Sanitise AI-generated text to remove common AI writing signals
function sanitiseAIText(text: string): string {
  if (!text) return text;
  return text
    .replace(/—/g, ', ')
    .replace(/(\w)\s*–\s*(\w)/g, '$1, $2')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .trim();
}

// Types
interface VEBReport {
  id: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  betaSwarm?: {
    status: string;
    results: any;
    completedAt: string | null;
  };
  ruthlessEditor?: {
    status: string;
    results: any;
    completedAt: string | null;
  };
  marketAnalyst?: {
    status: string;
    results: any;
    completedAt: string | null;
  };
  overallScore: number | null;
  summary: string | null;
  recommendations: string[] | null;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

interface VEBStatus {
  hasReport: boolean;
  reportId?: string;
  status?: string;
  modules?: {
    betaSwarm: string;
    ruthlessEditor: string;
    marketAnalyst: string;
  };
  progress?: number;
  createdAt?: string;
  completedAt?: string;
  error?: string;
}

type TabType = 'overview' | 'betaSwarm' | 'ruthlessEditor' | 'marketAnalyst';

interface EditorialReportContentProps {
  projectId: string;
}

export default function EditorialReportContent({ projectId }: EditorialReportContentProps) {
  const [status, setStatus] = useState<VEBStatus | null>(null);
  const [report, setReport] = useState<VEBReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchVEBStatus();
    }
  }, [projectId]);

  useEffect(() => {
    if (status?.status === 'processing') {
      const interval = setInterval(fetchVEBStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [status?.status]);

  const fetchProject = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchVEBStatus = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/veb/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          window.location.href = '/login';
          return;
        }
        if (response.status === 503) {
          const error = await response.json();
          if (error.code === 'VEB_TABLES_MISSING') {
            setStatus({
              hasReport: false,
              status: 'unavailable',
              error: 'The Virtual Editorial Board feature requires database setup.',
            } as VEBStatus);
            return;
          }
        }
        throw new Error('Failed to fetch VEB status');
      }

      const data = await response.json();
      setStatus(data);

      if (data.hasReport && data.status === 'completed') {
        await fetchReport();
      }
    } catch (error) {
      console.error('Error fetching VEB status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/veb/report`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch VEB report');
      }

      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Error fetching VEB report:', error);
    }
  };

  const submitForReview = async () => {
    setSubmitting(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/veb/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to submit for review');
      }

      await fetchVEBStatus();
    } catch (error) {
      console.error('Error submitting for review:', error);
    } finally {
      setSubmitting(false);
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

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'betaSwarm', label: 'Beta Swarm', icon: '👥' },
    { id: 'ruthlessEditor', label: 'Ruthless Editor', icon: '✏️' },
    { id: 'marketAnalyst', label: 'Market Analyst', icon: '📊' },
  ];

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
        <span>Loading editorial board status...</span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (status?.error) {
    return (
      <div style={{
        background: colors.semantic.errorLight,
        border: `1px solid ${colors.semantic.errorBorder}`,
        borderRadius: borderRadius.xl,
        padding: spacing[6],
        color: colors.semantic.errorDark,
      }}>
        <h3 style={{ margin: 0, marginBottom: spacing[2] }}>Error</h3>
        <p style={{ margin: 0 }}>{status.error}</p>
      </div>
    );
  }

  // No report yet - show submit button
  if (!status?.hasReport) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6], maxWidth: '800px' }}>
        <div style={{
          background: colors.background.surface,
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.xl,
          padding: spacing[8],
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: spacing[4] }}>📝</div>
          <h2 style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            margin: 0,
            marginBottom: spacing[4],
          }}>
            Virtual Editorial Board
          </h2>
          <p style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            margin: 0,
            marginBottom: spacing[6],
            lineHeight: typography.lineHeight.relaxed,
          }}>
            Submit your manuscript for comprehensive editorial analysis including beta reader simulation, structural editing, and market positioning.
          </p>
          <button
            onClick={submitForReview}
            disabled={submitting}
            style={{
              padding: `${spacing[4]} ${spacing[8]}`,
              background: submitting ? colors.text.disabled : colors.brand.gradient,
              border: 'none',
              borderRadius: borderRadius.lg,
              color: colors.white,
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing[3],
            }}
          >
            {submitting ? 'Submitting...' : 'Submit for Editorial Review'}
          </button>
        </div>
      </div>
    );
  }

  // Processing state
  if (status?.status === 'processing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
        <div style={{
          background: colors.semantic.infoLight,
          border: `1px solid ${colors.semantic.infoBorder}`,
          borderRadius: borderRadius.xl,
          padding: spacing[6],
        }}>
          <h3 style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.semantic.infoDark,
            margin: 0,
            marginBottom: spacing[2],
          }}>
            Editorial Review in Progress
          </h3>
          <p style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            margin: 0,
          }}>
            Your manuscript is being reviewed by our virtual editorial board. This typically takes 5-10 minutes per chapter.
          </p>
          {status.progress !== undefined && (
            <div style={{ marginTop: spacing[4] }}>
              <div style={{
                width: '100%',
                height: '8px',
                background: colors.border.default,
                borderRadius: borderRadius.full,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${status.progress}%`,
                  height: '100%',
                  background: colors.brand.primary,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <p style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.tertiary,
                margin: 0,
                marginTop: spacing[2],
              }}>
                {status.progress}% complete
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Completed report
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: spacing[2],
        borderBottom: `2px solid ${colors.border.default}`,
        overflowX: 'auto',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              padding: `${spacing[3]} ${spacing[4]}`,
              border: 'none',
              borderBottom: `3px solid ${activeTab === tab.id ? colors.brand.primary : 'transparent'}`,
              background: activeTab === tab.id ? colors.brand.primaryLight : 'transparent',
              color: activeTab === tab.id ? colors.brand.primary : colors.text.secondary,
              fontSize: typography.fontSize.sm,
              fontWeight: activeTab === tab.id ? typography.fontWeight.semibold : typography.fontWeight.medium,
              cursor: 'pointer',
              transition: transitions.colors,
              whiteSpace: 'nowrap',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
          {/* Overall Score */}
          {report.overallScore !== null && (
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
                Overall Editorial Score
              </h2>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[6],
              }}>
                <span style={{
                  fontSize: typography.fontSize['5xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: getScoreColor(report.overallScore),
                }}>
                  {report.overallScore}%
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
                      width: `${report.overallScore}%`,
                      height: '100%',
                      background: getScoreColor(report.overallScore),
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          {report.summary && (
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
                Executive Summary
              </h3>
              <p style={{
                fontSize: typography.fontSize.base,
                color: colors.text.secondary,
                margin: 0,
                lineHeight: typography.lineHeight.relaxed,
              }}>
                {sanitiseAIText(report.summary)}
              </p>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations && report.recommendations.length > 0 && (
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
                Key Recommendations
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: spacing[3],
              }}>
                {report.recommendations.map((rec, i) => (
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
                    <span style={{ color: colors.brand.primary, fontSize: '1.25rem' }}>→</span>
                    <span>{sanitiseAIText(rec)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Link to full report */}
          <Link
            href={`/projects/${projectId}/editorial-report`}
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
            View Full Editorial Report →
          </Link>
        </div>
      )}

      {/* Beta Swarm Tab */}
      {activeTab === 'betaSwarm' && report?.betaSwarm?.results && (
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
            Beta Reader Analysis
          </h3>
          <p style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            margin: 0,
            marginBottom: spacing[4],
          }}>
            Overall Engagement: {report.betaSwarm.results.overallEngagement}%
          </p>
          <p style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            margin: 0,
          }}>
            {sanitiseAIText(report.betaSwarm.results.summaryReaction)}
          </p>
          <Link
            href={`/projects/${projectId}/editorial-report`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing[2],
              marginTop: spacing[4],
              color: colors.brand.primary,
              fontSize: typography.fontSize.sm,
              textDecoration: 'none',
            }}
          >
            View detailed chapter analysis →
          </Link>
        </div>
      )}

      {/* Ruthless Editor Tab */}
      {activeTab === 'ruthlessEditor' && report?.ruthlessEditor?.results && (
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
            Structural Analysis
          </h3>
          <p style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            margin: 0,
            marginBottom: spacing[4],
          }}>
            Structure Score: {report.ruthlessEditor.results.overallStructureScore}%
            {' '} • {' '}
            Major Issues: {report.ruthlessEditor.results.majorIssuesCount}
          </p>
          <p style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            margin: 0,
          }}>
            {sanitiseAIText(report.ruthlessEditor.results.summaryVerdict)}
          </p>
          <Link
            href={`/projects/${projectId}/editorial-report`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing[2],
              marginTop: spacing[4],
              color: colors.brand.primary,
              fontSize: typography.fontSize.sm,
              textDecoration: 'none',
            }}
          >
            View detailed structural analysis →
          </Link>
        </div>
      )}

      {/* Market Analyst Tab */}
      {activeTab === 'marketAnalyst' && report?.marketAnalyst?.results && (
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
            Market Analysis
          </h3>
          <p style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            margin: 0,
            marginBottom: spacing[4],
          }}>
            Commercial Viability: {report.marketAnalyst.results.commercialViabilityScore}%
          </p>
          <div style={{
            padding: `${spacing[2]} ${spacing[4]}`,
            background: report.marketAnalyst.results.agentRecommendation === 'request_full'
              ? colors.semantic.successLight
              : report.marketAnalyst.results.agentRecommendation === 'revise_resubmit'
              ? colors.semantic.warningLight
              : colors.semantic.errorLight,
            color: report.marketAnalyst.results.agentRecommendation === 'request_full'
              ? colors.semantic.successDark
              : report.marketAnalyst.results.agentRecommendation === 'revise_resubmit'
              ? colors.semantic.warningDark
              : colors.semantic.errorDark,
            borderRadius: borderRadius.md,
            display: 'inline-block',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing[4],
          }}>
            {report.marketAnalyst.results.agentRecommendation === 'request_full' && 'Request Full Manuscript'}
            {report.marketAnalyst.results.agentRecommendation === 'revise_resubmit' && 'Revise and Resubmit'}
            {report.marketAnalyst.results.agentRecommendation === 'pass' && 'Pass'}
          </div>
          <p style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            margin: 0,
          }}>
            {sanitiseAIText(report.marketAnalyst.results.agentNotes)}
          </p>
          <Link
            href={`/projects/${projectId}/editorial-report`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing[2],
              marginTop: spacing[4],
              color: colors.brand.primary,
              fontSize: typography.fontSize.sm,
              textDecoration: 'none',
            }}
          >
            View detailed market analysis →
          </Link>
        </div>
      )}
    </div>
  );
}
