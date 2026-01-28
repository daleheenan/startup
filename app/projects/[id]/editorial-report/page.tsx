'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getToken, logout } from '@/app/lib/auth';
import ProjectNavigation from '@/app/components/shared/ProjectNavigation';
import EditorialWorkflowVisualization from '@/app/components/EditorialWorkflowVisualization';
import { useProjectNavigation } from '@/app/hooks';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Types for VEB Report
interface BetaSwarmReaction {
  paragraphIndex: number;
  tag: 'BORED' | 'HOOKED' | 'CONFUSED' | 'ENGAGED' | 'EMOTIONAL';
  emotion?: string;
  explanation: string;
}

interface DNFRiskPoint {
  location: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

interface BetaSwarmChapterResult {
  chapterId: string;
  chapterNumber: number;
  retentionScore: number;
  reactions: BetaSwarmReaction[];
  dnfRiskPoints: DNFRiskPoint[];
  highlights: string[];
}

interface BetaSwarmResult {
  chapterResults: BetaSwarmChapterResult[];
  overallEngagement: number;
  wouldRecommend: boolean;
  summaryReaction: string;
}

interface ExpositionIssue {
  location: string;
  issue: string;
  quote: string;
  suggestion: string;
  severity: 'minor' | 'moderate' | 'major';
}

interface PacingIssue {
  location: string;
  issue: string;
  suggestion: string;
  severity: 'minor' | 'moderate' | 'major';
}

interface RuthlessEditorChapterResult {
  chapterId: string;
  chapterNumber: number;
  valueShift: {
    openingCharge: string;
    closingCharge: string;
    shiftMagnitude: number;
    assessment: string;
  };
  expositionIssues: ExpositionIssue[];
  pacingIssues: PacingIssue[];
  scenePurpose: {
    earned: boolean;
    reasoning: string;
    recommendation?: string;
  };
}

interface RuthlessEditorResult {
  chapterResults: RuthlessEditorChapterResult[];
  overallStructureScore: number;
  majorIssuesCount: number;
  summaryVerdict: string;
}

interface CompTitle {
  title: string;
  author: string;
  year: number;
  similarity: string;
  whatWorks: string;
}

interface TropeAnalysis {
  trope: string;
  freshness: 'fresh' | 'familiar' | 'overdone';
  execution: string;
}

interface MarketAnalystResult {
  compTitles: CompTitle[];
  hookAnalysis: {
    openingLineScore: number;
    openingParagraphScore: number;
    openingChapterScore: number;
    openingLine: string;
    strengths: string[];
    weaknesses: string[];
    suggestedRewrite?: string;
  };
  tropeAnalysis: TropeAnalysis[];
  marketPositioning: {
    targetAudience: string;
    marketingAngle: string;
    potentialChallenges: string[];
  };
  commercialViabilityScore: number;
  agentRecommendation: 'request_full' | 'revise_resubmit' | 'pass';
  agentNotes: string;
}

interface VEBReport {
  id: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  betaSwarm?: {
    status: string;
    results: BetaSwarmResult | null;
    completedAt: string | null;
  };
  ruthlessEditor?: {
    status: string;
    results: RuthlessEditorResult | null;
    completedAt: string | null;
  };
  marketAnalyst?: {
    status: string;
    results: MarketAnalystResult | null;
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

type TabType = 'overview' | 'beta-swarm' | 'ruthless-editor' | 'market-analyst';

// Recommendations Section Component with pagination and implement buttons
function VEBRecommendationsSection({ reportId, recommendations }: { reportId: string; recommendations: string[] }) {
  const [implementedSet, setImplementedSet] = useState<Set<number>>(new Set());
  const [implementingIdx, setImplementingIdx] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const ITEMS_PER_PAGE = 5;

  // Load existing feedback on mount
  useEffect(() => {
    const loadFeedback = async () => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/veb/reports/${reportId}/feedback`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          const implemented = new Set<number>();
          data.feedback.forEach((f: any) => {
            if (f.feedbackType === 'rewrite_completed') {
              implemented.add(f.findingIndex);
            }
          });
          setImplementedSet(implemented);
        }
      } catch (error) {
        console.error('Error loading feedback:', error);
      } finally {
        setLoadingFeedback(false);
      }
    };
    loadFeedback();
  }, [reportId]);

  const totalPages = Math.ceil(recommendations.length / ITEMS_PER_PAGE);
  const paginatedRecs = recommendations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;

  const handleImplement = async (idx: number, rec: string) => {
    setImplementingIdx(idx);
    try {
      // Parse the recommendation to get module
      const [category] = rec.split(':');
      let module = 'general';
      if (category.toLowerCase().includes('beta') || category.toLowerCase().includes('engagement')) module = 'beta_swarm';
      else if (category.toLowerCase().includes('editor') || category.toLowerCase().includes('structure')) module = 'ruthless_editor';
      else if (category.toLowerCase().includes('market')) module = 'market_analyst';

      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/veb/reports/${reportId}/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          module,
          findingIndex: idx,
          feedbackType: 'rewrite_completed',
          notes: `Implemented recommendation: ${rec}`,
        }),
      });

      if (response.ok) {
        setImplementedSet(prev => new Set(Array.from(prev).concat([idx])));
      }
    } catch (error) {
      console.error('Error implementing recommendation:', error);
    } finally {
      setImplementingIdx(null);
    }
  };

  const getSeverityFromRec = (rec: string): 'minor' | 'moderate' | 'major' => {
    const lower = rec.toLowerCase();
    if (lower.includes('major') || lower.includes('critical')) return 'major';
    if (lower.includes('moderate') || lower.includes('consider')) return 'moderate';
    return 'minor';
  };

  const severityColors = {
    minor: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
    moderate: { bg: '#FED7AA', text: '#9A3412', border: '#F97316' },
    major: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      padding: '1.5rem',
      border: '1px solid #E2E8F0',
    }}>
      <h4 style={{
        margin: '0 0 1rem 0',
        color: '#1A1A2E',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        Priority Recommendations ({recommendations.length - implementedSet.size} remaining)
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {paginatedRecs.map((rec, localIdx) => {
          const globalIdx = startIdx + localIdx;
          const isImplemented = implementedSet.has(globalIdx);
          const severity = getSeverityFromRec(rec);
          const colors = severityColors[severity];
          const [category, ...textParts] = rec.split(':');
          const text = textParts.join(':').trim() || rec;

          return (
            <div
              key={globalIdx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '1rem',
                background: isImplemented ? '#F0FDF4' : '#FAFAFA',
                border: `1px solid ${isImplemented ? '#10B981' : '#E2E8F0'}`,
                borderRadius: '8px',
                opacity: isImplemented ? 0.8 : 1,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    padding: '0.25rem 0.5rem',
                    background: colors.bg,
                    color: colors.text,
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}>
                    {severity}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {category.trim()}
                  </span>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: '#374151',
                  textDecoration: isImplemented ? 'line-through' : 'none',
                }}>
                  {text}
                </p>
              </div>

              {!isImplemented ? (
                <button
                  onClick={() => handleImplement(globalIdx, rec)}
                  disabled={implementingIdx === globalIdx}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: implementingIdx === globalIdx ? 'not-allowed' : 'pointer',
                    opacity: implementingIdx === globalIdx ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {implementingIdx === globalIdx ? (
                    <>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid white',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }} />
                      Implementing...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Implement
                    </>
                  )}
                </button>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: '#059669',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Done
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.75rem',
          marginTop: '1rem',
        }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.5rem 1rem',
              background: currentPage === 1 ? '#F1F5F9' : 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.5 : 1,
              fontSize: '0.875rem',
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '0.875rem', color: '#64748B' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.5rem 1rem',
              background: currentPage === totalPages ? '#F1F5F9' : 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.5 : 1,
              fontSize: '0.875rem',
            }}
          >
            Next
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function EditorialReportPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [status, setStatus] = useState<VEBStatus | null>(null);
  const [report, setReport] = useState<VEBReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [project, setProject] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);

  const navigation = useProjectNavigation(projectId, project);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchVEBStatus();
    }
  }, [projectId]);

  useEffect(() => {
    // Poll for status updates while processing
    if (status?.status === 'processing') {
      const interval = setInterval(fetchVEBStatus, 5000);
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
        // Handle 503 - VEB tables missing
        if (response.status === 503) {
          const error = await response.json();
          if (error.code === 'VEB_TABLES_MISSING') {
            setStatus({
              hasReport: false,
              status: 'unavailable',
              error: 'The Virtual Editorial Board feature requires database setup. Please contact the administrator to run database migrations (migration 027).',
            } as VEBStatus);
            return;
          }
        }
        throw new Error('Failed to fetch VEB status');
      }

      const data = await response.json();
      setStatus(data);

      // If completed, fetch full report
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

      if (response.ok) {
        const data = await response.json();
        setReport(data);
      }
    } catch (error) {
      console.error('Error fetching VEB report:', error);
    }
  };

  const handleSubmit = async () => {
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
        const errorData = await response.json();
        // Handle database migration not applied error
        if (errorData.code === 'VEB_TABLES_MISSING') {
          setStatus({
            hasReport: false,
            status: 'unavailable',
            error: 'The Virtual Editorial Board feature requires database setup. Please contact the administrator to run database migrations (migration 027).',
          } as VEBStatus);
          return;
        }
        // Extract error message - API returns { error: { code, message } }
        const errorMessage = errorData.error?.message || errorData.message || 'Failed to submit to VEB';
        alert(errorMessage);
        return;
      }

      // Show success animation briefly
      setShowSubmitSuccess(true);
      setTimeout(() => {
        setShowSubmitSuccess(false);
        fetchVEBStatus();
      }, 2000);
    } catch (error) {
      console.error('Error submitting to VEB:', error);
      alert('Failed to submit manuscript for review');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score: number, max: number = 10) => {
    const normalized = (score / max) * 100;
    if (normalized >= 80) return '#10B981';
    if (normalized >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'major':
        return '#EF4444';
      case 'medium':
      case 'moderate':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'HOOKED':
        return '#10B981';
      case 'ENGAGED':
        return '#3B82F6';
      case 'EMOTIONAL':
        return '#8B5CF6';
      case 'BORED':
        return '#F59E0B';
      case 'CONFUSED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getFreshnessColor = (freshness: string) => {
    switch (freshness) {
      case 'fresh':
        return '#10B981';
      case 'familiar':
        return '#F59E0B';
      case 'overdone':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // Helper to format underscore text for display
  const formatDisplayText = (text: string | undefined | null): string => {
    if (!text) return 'N/A';
    return text
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalise first letter of each word
  };

  // Score benchmark explanations
  const getScoreBenchmark = (score: number | undefined, type: 'engagement' | 'structure' | 'commercial' | 'overall') => {
    if (score === undefined || score === null) return { label: 'Pending', description: 'Analysis not yet complete' };

    const benchmarks = {
      engagement: [
        { min: 8, label: 'Excellent', description: 'Highly engaging - readers will struggle to put it down' },
        { min: 6, label: 'Good', description: 'Solid engagement with some slower sections' },
        { min: 4, label: 'Fair', description: 'Mixed engagement - significant improvement needed' },
        { min: 0, label: 'Needs Work', description: 'Struggles to maintain reader attention' },
      ],
      structure: [
        { min: 8, label: 'Excellent', description: 'Strong narrative structure with effective pacing' },
        { min: 6, label: 'Good', description: 'Solid structure with minor issues' },
        { min: 4, label: 'Fair', description: 'Structural problems that need addressing' },
        { min: 0, label: 'Needs Work', description: 'Significant structural overhaul required' },
      ],
      commercial: [
        { min: 8, label: 'Strong', description: 'High commercial potential - agent ready' },
        { min: 6, label: 'Promising', description: 'Good potential with some revisions' },
        { min: 4, label: 'Developing', description: 'Needs work before querying agents' },
        { min: 0, label: 'Early Stage', description: 'Significant development needed' },
      ],
      overall: [
        { min: 80, label: 'Publication Ready', description: 'Ready for agent queries with minor polish' },
        { min: 60, label: 'Near Ready', description: 'Good foundation - address key issues before submission' },
        { min: 40, label: 'Revision Needed', description: 'Requires substantial revision work' },
        { min: 0, label: 'Early Draft', description: 'Focus on fundamentals before seeking feedback' },
      ],
    };

    const scale = type === 'overall' ? score : score; // overall is /100, others are /10
    const thresholds = benchmarks[type];
    for (const threshold of thresholds) {
      if (scale >= threshold.min) {
        return threshold;
      }
    }
    return thresholds[thresholds.length - 1];
  };

  const renderOverview = () => {
    if (!report) return null;

    const overallBenchmark = getScoreBenchmark(report.overallScore ?? undefined, 'overall');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Re-submit Option */}
        <div style={{
          background: '#F0F9FF',
          borderRadius: '8px',
          padding: '1rem 1.5rem',
          border: '1px solid #BAE6FD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#0369A1' }}>
              <strong>Made changes?</strong> You can request a new analysis at any time to see how your revisions have improved the manuscript.
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '8px 16px',
              background: submitting ? '#94A3B8' : '#0284C7',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: submitting ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {submitting ? 'Submitting...' : '🔄 Request New Analysis'}
          </button>
        </div>

        {/* Overall Score Card */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '2rem',
          color: 'white',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Overall Editorial Score</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '4rem', fontWeight: '700' }}>{report.overallScore || 0}</span>
                <span style={{ fontSize: '1.5rem', opacity: 0.8 }}>/100</span>
              </div>
              <p style={{ margin: '1rem 0 0 0', opacity: 0.9 }}>{report.summary}</p>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '1rem',
              minWidth: '200px',
            }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>BENCHMARK</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{overallBenchmark.label}</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>{overallBenchmark.description}</div>
            </div>
          </div>
        </div>

        {/* Score Interpretation Guide */}
        <div style={{
          background: '#FFFBEB',
          borderRadius: '8px',
          padding: '1rem 1.5rem',
          border: '1px solid #FDE68A',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span>💡</span>
            <strong style={{ color: '#92400E', fontSize: '0.875rem' }}>Understanding Your Scores</strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#A16207' }}>
            Scores of <strong>8-10</strong> are excellent and agent-ready. <strong>6-7</strong> shows promise with minor revisions needed.
            <strong>4-5</strong> indicates areas requiring focused improvement. Below 4 suggests fundamental issues to address.
          </p>
        </div>

        {/* Module Scores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {/* Beta Swarm Score */}
          {(() => {
            const engagementScore = report.betaSwarm?.results?.overallEngagement;
            const benchmark = getScoreBenchmark(engagementScore, 'engagement');
            return (
              <div style={{
                background: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                border: '1px solid #E2E8F0',
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#64748B', fontSize: '0.875rem' }}>
                  Reader Engagement
                </h4>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                  How well your story hooks and holds readers
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: getScoreColor(engagementScore || 0),
                  }}>
                    {engagementScore ?? 'N/A'}
                  </span>
                  <span style={{ color: '#64748B' }}>/10</span>
                </div>
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem',
                  background: '#F8FAFC',
                  borderRadius: '4px',
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: getScoreColor(engagementScore || 0) }}>
                    {benchmark.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>
                    {benchmark.description}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Ruthless Editor Score */}
          {(() => {
            const structureScore = report.ruthlessEditor?.results?.overallStructureScore;
            const benchmark = getScoreBenchmark(structureScore, 'structure');
            return (
              <div style={{
                background: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                border: '1px solid #E2E8F0',
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#64748B', fontSize: '0.875rem' }}>
                  Structural Quality
                </h4>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                  Narrative structure, pacing, and scene craft
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: getScoreColor(structureScore || 0),
                  }}>
                    {structureScore ?? 'N/A'}
                  </span>
                  <span style={{ color: '#64748B' }}>/10</span>
                </div>
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem',
                  background: '#F8FAFC',
                  borderRadius: '4px',
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: getScoreColor(structureScore || 0) }}>
                    {benchmark.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>
                    {report.ruthlessEditor?.results?.majorIssuesCount || 0} major issues • {benchmark.description}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Market Analyst Score */}
          {(() => {
            const commercialScore = report.marketAnalyst?.results?.commercialViabilityScore;
            const benchmark = getScoreBenchmark(commercialScore, 'commercial');
            const recommendation = report.marketAnalyst?.results?.agentRecommendation;
            return (
              <div style={{
                background: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                border: '1px solid #E2E8F0',
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#64748B', fontSize: '0.875rem' }}>
                  Commercial Viability
                </h4>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                  Market positioning and agent appeal
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: getScoreColor(commercialScore || 0),
                  }}>
                    {commercialScore ?? 'N/A'}
                  </span>
                  <span style={{ color: '#64748B' }}>/10</span>
                </div>
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem',
                  background: '#F8FAFC',
                  borderRadius: '4px',
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: getScoreColor(commercialScore || 0) }}>
                    {benchmark.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>
                    Agent: {formatDisplayText(recommendation)} • {benchmark.description}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Recommendations */}
        {report.recommendations && report.recommendations.length > 0 && (
          <VEBRecommendationsSection
            reportId={report.id}
            recommendations={report.recommendations}
          />
        )}
      </div>
    );
  };

  const renderBetaSwarm = () => {
    const results = report?.betaSwarm?.results;
    if (!results) return <p style={{ color: '#64748B' }}>No Beta Swarm data available</p>;

    const chapters = results.chapterResults || [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Summary Card */}
        <div style={{
          background: '#F0FDF4',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #BBF7D0',
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534' }}>Reader Summary</h4>
          <p style={{ margin: 0, color: '#15803D' }}>{results.summaryReaction}</p>
        </div>

        {/* Chapter Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ color: '#64748B' }}>Select Chapter:</label>
          <select
            value={selectedChapter ?? ''}
            onChange={(e) => setSelectedChapter(e.target.value ? parseInt(e.target.value) : null)}
            style={{
              padding: '8px 12px',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              background: 'white',
            }}
          >
            <option value="">All Chapters</option>
            {chapters.map((ch) => (
              <option key={ch.chapterNumber} value={ch.chapterNumber}>
                Chapter {ch.chapterNumber} (Score: {ch.retentionScore}/10)
              </option>
            ))}
          </select>
        </div>

        {/* Chapter Details */}
        {(selectedChapter ? chapters.filter(c => c.chapterNumber === selectedChapter) : chapters).map((chapter) => (
          <div key={chapter.chapterNumber} style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>Chapter {chapter.chapterNumber}</h4>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                background: getScoreColor(chapter.retentionScore),
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '600',
              }}>
                Retention: {chapter.retentionScore}/10
              </span>
            </div>

            {/* Highlights */}
            {chapter.highlights && chapter.highlights.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#10B981', fontSize: '0.875rem' }}>
                  Highlights
                </h5>
                <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  {chapter.highlights.map((h, i) => (
                    <li key={i} style={{ color: '#475569', fontSize: '0.875rem' }}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* DNF Risk Points */}
            {chapter.dnfRiskPoints && chapter.dnfRiskPoints.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#EF4444', fontSize: '0.875rem' }}>
                  DNF Risk Points
                </h5>
                {chapter.dnfRiskPoints.map((risk, i) => (
                  <div key={i} style={{
                    padding: '0.75rem',
                    background: '#FEF2F2',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    borderLeft: `3px solid ${getSeverityColor(risk.severity)}`,
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
                      {risk.location} • <span style={{ color: getSeverityColor(risk.severity) }}>{risk.severity}</span>
                    </div>
                    <div style={{ color: '#1A1A2E', fontSize: '0.875rem' }}>{risk.reason}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Reactions */}
            {chapter.reactions && chapter.reactions.length > 0 && (
              <div>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#64748B', fontSize: '0.875rem' }}>
                  Reader Reactions
                </h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {chapter.reactions.slice(0, 10).map((reaction, i) => (
                    <span key={i} style={{
                      padding: '4px 8px',
                      background: `${getTagColor(reaction.tag)}20`,
                      color: getTagColor(reaction.tag),
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                    }} title={reaction.explanation}>
                      [{reaction.tag}] P{reaction.paragraphIndex}
                    </span>
                  ))}
                  {chapter.reactions.length > 10 && (
                    <span style={{ color: '#64748B', fontSize: '0.75rem' }}>
                      +{chapter.reactions.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderRuthlessEditor = () => {
    const results = report?.ruthlessEditor?.results;
    if (!results) return <p style={{ color: '#64748B' }}>No Ruthless Editor data available</p>;

    const chapters = results.chapterResults || [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Summary Card */}
        <div style={{
          background: '#FEF3C7',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #FCD34D',
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#92400E' }}>Editor Verdict</h4>
          <p style={{ margin: 0, color: '#A16207' }}>{results.summaryVerdict}</p>
        </div>

        {/* Chapter Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ color: '#64748B' }}>Select Chapter:</label>
          <select
            value={selectedChapter ?? ''}
            onChange={(e) => setSelectedChapter(e.target.value ? parseInt(e.target.value) : null)}
            style={{
              padding: '8px 12px',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              background: 'white',
            }}
          >
            <option value="">All Chapters</option>
            {chapters.map((ch) => (
              <option key={ch.chapterNumber} value={ch.chapterNumber}>
                Chapter {ch.chapterNumber} ({ch.scenePurpose.earned ? 'Earned' : 'Questionable'})
              </option>
            ))}
          </select>
        </div>

        {/* Chapter Details */}
        {(selectedChapter ? chapters.filter(c => c.chapterNumber === selectedChapter) : chapters).map((chapter) => (
          <div key={chapter.chapterNumber} style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>Chapter {chapter.chapterNumber}</h4>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                background: chapter.scenePurpose.earned ? '#D1FAE5' : '#FEE2E2',
                color: chapter.scenePurpose.earned ? '#065F46' : '#991B1B',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}>
                {chapter.scenePurpose.earned ? 'Scene Earned' : 'Questionable Purpose'}
              </span>
            </div>

            {/* Value Shift */}
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#F8FAFC', borderRadius: '4px' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#64748B' }}>Value Shift</h5>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ padding: '4px 8px', background: '#E2E8F0', borderRadius: '4px', fontSize: '0.875rem' }}>
                  {chapter.valueShift.openingCharge}
                </span>
                <span style={{ color: '#64748B' }}>→</span>
                <span style={{ padding: '4px 8px', background: '#E2E8F0', borderRadius: '4px', fontSize: '0.875rem' }}>
                  {chapter.valueShift.closingCharge}
                </span>
                <span style={{
                  marginLeft: 'auto',
                  color: getScoreColor(chapter.valueShift.shiftMagnitude),
                  fontWeight: '600',
                }}>
                  Magnitude: {chapter.valueShift.shiftMagnitude}/10
                </span>
              </div>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#475569' }}>
                {chapter.valueShift.assessment}
              </p>
            </div>

            {/* Exposition Issues */}
            {chapter.expositionIssues && chapter.expositionIssues.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#F59E0B', fontSize: '0.875rem' }}>
                  Exposition Issues ({chapter.expositionIssues.length})
                </h5>
                {chapter.expositionIssues.map((issue, i) => (
                  <div key={i} style={{
                    padding: '0.75rem',
                    background: '#FFFBEB',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    borderLeft: `3px solid ${getSeverityColor(issue.severity)}`,
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
                      {issue.location} • {issue.issue.replace(/_/g, ' ')} •{' '}
                      <span style={{ color: getSeverityColor(issue.severity) }}>{issue.severity}</span>
                    </div>
                    <div style={{
                      padding: '0.5rem',
                      background: 'white',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      fontStyle: 'italic',
                      color: '#475569',
                      marginBottom: '0.5rem',
                    }}>
                      "{issue.quote}"
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                      Suggestion: {issue.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pacing Issues */}
            {chapter.pacingIssues && chapter.pacingIssues.length > 0 && (
              <div>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#EF4444', fontSize: '0.875rem' }}>
                  Pacing Issues ({chapter.pacingIssues.length})
                </h5>
                {chapter.pacingIssues.map((issue, i) => (
                  <div key={i} style={{
                    padding: '0.75rem',
                    background: '#FEF2F2',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    borderLeft: `3px solid ${getSeverityColor(issue.severity)}`,
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
                      {issue.location} • {issue.issue.replace(/_/g, ' ')} •{' '}
                      <span style={{ color: getSeverityColor(issue.severity) }}>{issue.severity}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                      {issue.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderMarketAnalyst = () => {
    const results = report?.marketAnalyst?.results;
    if (!results) return <p style={{ color: '#64748B' }}>No Market Analyst data available</p>;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Agent Recommendation Card */}
        <div style={{
          background: results.agentRecommendation === 'request_full' ? '#D1FAE5' :
            results.agentRecommendation === 'revise_resubmit' ? '#FEF3C7' : '#FEE2E2',
          borderRadius: '8px',
          padding: '1.5rem',
          border: `1px solid ${
            results.agentRecommendation === 'request_full' ? '#6EE7B7' :
              results.agentRecommendation === 'revise_resubmit' ? '#FCD34D' : '#FECACA'
          }`,
        }}>
          <h4 style={{
            margin: '0 0 0.5rem 0',
            color: results.agentRecommendation === 'request_full' ? '#065F46' :
              results.agentRecommendation === 'revise_resubmit' ? '#92400E' : '#991B1B',
          }}>
            Agent Recommendation: {results.agentRecommendation.replace(/_/g, ' ').toUpperCase()}
          </h4>
          <p style={{
            margin: 0,
            color: results.agentRecommendation === 'request_full' ? '#047857' :
              results.agentRecommendation === 'revise_resubmit' ? '#A16207' : '#B91C1C',
          }}>
            {results.agentNotes}
          </p>
        </div>

        {/* Hook Analysis */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
        }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Hook Analysis</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>Opening Line</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: getScoreColor(results.hookAnalysis.openingLineScore),
              }}>
                {results.hookAnalysis.openingLineScore}/10
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>Opening Paragraph</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: getScoreColor(results.hookAnalysis.openingParagraphScore),
              }}>
                {results.hookAnalysis.openingParagraphScore}/10
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>Opening Chapter</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: getScoreColor(results.hookAnalysis.openingChapterScore),
              }}>
                {results.hookAnalysis.openingChapterScore}/10
              </div>
            </div>
          </div>

          <div style={{
            padding: '1rem',
            background: '#F8FAFC',
            borderRadius: '4px',
            fontStyle: 'italic',
            color: '#475569',
            marginBottom: '1rem',
          }}>
            "{results.hookAnalysis.openingLine}"
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#10B981', fontSize: '0.875rem' }}>Strengths</h5>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {results.hookAnalysis.strengths.map((s, i) => (
                  <li key={i} style={{ color: '#475569', fontSize: '0.875rem' }}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#EF4444', fontSize: '0.875rem' }}>Weaknesses</h5>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {results.hookAnalysis.weaknesses.map((w, i) => (
                  <li key={i} style={{ color: '#475569', fontSize: '0.875rem' }}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {results.hookAnalysis.suggestedRewrite && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#EFF6FF', borderRadius: '4px' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#1E40AF', fontSize: '0.875rem' }}>Suggested Rewrite</h5>
              <p style={{ margin: 0, color: '#1E3A8A', fontStyle: 'italic' }}>
                "{results.hookAnalysis.suggestedRewrite}"
              </p>
            </div>
          )}
        </div>

        {/* Comp Titles */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
        }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Comparable Titles</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {results.compTitles.map((comp, i) => (
              <div key={i} style={{
                padding: '1rem',
                background: '#F8FAFC',
                borderRadius: '4px',
              }}>
                <div style={{ fontWeight: '600', color: '#1A1A2E' }}>
                  {comp.title} by {comp.author} ({comp.year})
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '0.25rem' }}>
                  {comp.similarity}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#10B981', marginTop: '0.25rem' }}>
                  What works: {comp.whatWorks}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trope Analysis */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
        }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Trope Analysis</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {results.tropeAnalysis.map((trope, i) => (
              <div key={i} style={{
                padding: '0.5rem 1rem',
                background: `${getFreshnessColor(trope.freshness)}15`,
                border: `1px solid ${getFreshnessColor(trope.freshness)}40`,
                borderRadius: '20px',
              }} title={trope.execution}>
                <span style={{ fontWeight: '500', color: '#1A1A2E' }}>{trope.trope}</span>
                <span style={{
                  marginLeft: '0.5rem',
                  fontSize: '0.75rem',
                  color: getFreshnessColor(trope.freshness),
                  textTransform: 'uppercase',
                }}>
                  {trope.freshness}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Market Positioning */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
        }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Market Positioning</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#64748B', fontSize: '0.875rem' }}>Target Audience</h5>
              <p style={{ margin: 0, color: '#1A1A2E' }}>{results.marketPositioning.targetAudience}</p>
            </div>
            <div>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#64748B', fontSize: '0.875rem' }}>Marketing Angle</h5>
              <p style={{ margin: 0, color: '#1A1A2E' }}>{results.marketPositioning.marketingAngle}</p>
            </div>
          </div>
          {results.marketPositioning.potentialChallenges.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#EF4444', fontSize: '0.875rem' }}>Potential Challenges</h5>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {results.marketPositioning.potentialChallenges.map((c, i) => (
                  <li key={i} style={{ color: '#475569', fontSize: '0.875rem' }}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProcessingStatus = () => {
    if (!status) return null;

    return (
      <EditorialWorkflowVisualization
        type="veb"
        projectId={projectId}
        reportId={status.reportId}
        status="processing"
        modules={{
          module1: { status: (status.modules?.betaSwarm as any) || 'pending' },
          module2: { status: (status.modules?.ruthlessEditor as any) || 'pending' },
          module3: { status: (status.modules?.marketAnalyst as any) || 'pending' },
        }}
        createdAt={status.createdAt}
      />
    );
  };

  const renderSubmitSuccess = () => (
    <div style={{
      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      borderRadius: '16px',
      padding: '3rem',
      textAlign: 'center',
      color: 'white',
      animation: 'fadeIn 0.5s ease-out',
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes checkmark { 0% { stroke-dashoffset: 100; } 100% { stroke-dashoffset: 0; } }
        @keyframes bounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
      `}</style>
      <div style={{
        width: '100px',
        height: '100px',
        margin: '0 auto 1.5rem',
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'bounce 0.6s ease-out',
      }}>
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17L4 12"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 100,
              animation: 'checkmark 0.6s ease-out forwards',
            }}
          />
        </svg>
      </div>
      <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: '700' }}>
        Manuscript Submitted!
      </h2>
      <p style={{ margin: '0', opacity: 0.9, fontSize: '1.125rem' }}>
        Your virtual editorial board is now reviewing your manuscript...
      </p>
    </div>
  );

  const renderNoReport = () => (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      padding: '3rem',
      border: '1px solid #E2E8F0',
      textAlign: 'center',
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        margin: '0 auto 1.5rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
      }}>
        📋
      </div>
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#1A1A2E' }}>
        Virtual Editorial Board
      </h3>
      <p style={{ margin: '0 0 1.5rem 0', color: '#64748B', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
        Submit your completed manuscript for comprehensive AI review by our three virtual editors: Beta Reader, Ruthless Editor, and Market Analyst.
      </p>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          padding: '12px 24px',
          background: submitting ? '#94A3B8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? 'Submitting...' : 'Submit for Review'}
      </button>
      <p style={{ margin: '1rem 0 0 0', fontSize: '0.875rem', color: '#94A3B8' }}>
        Estimated cost: ~$0.50 • Takes 2-5 minutes
      </p>
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#F8FAFC',
    }}>
      {/* Left Sidebar */}
      <aside style={{
        width: '72px',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem 0',
      }}>
        <Link
          href="/projects"
          style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: '1.25rem',
            textDecoration: 'none',
          }}
        >
          N
        </Link>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <header style={{
          padding: '1rem 2rem',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1A1A2E',
              margin: 0,
            }}>
              Editorial Report
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              {project?.title || 'Loading...'}
            </p>
          </div>
          <Link
            href={`/projects/${projectId}`}
            style={{
              padding: '0.5rem 1rem',
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            ← Back to Project
          </Link>
        </header>

        {/* Project Navigation */}
        <ProjectNavigation
          projectId={projectId}
          project={navigation.project}
          outline={navigation.outline}
          chapters={navigation.chapters}
        />

        {/* Content Area */}
        <div style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
              Loading...
            </div>
          ) : showSubmitSuccess ? (
            renderSubmitSuccess()
          ) : status?.status === 'unavailable' ? (
            <div style={{
              background: '#FEF3C7',
              borderRadius: '8px',
              padding: '2rem',
              border: '1px solid #FCD34D',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#92400E' }}>Feature Setup Required</h3>
              <p style={{ margin: '0 0 1rem 0', color: '#A16207', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
                {status.error || 'The Virtual Editorial Board feature requires database setup. Please contact the administrator.'}
              </p>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#B45309' }}>
                Administrator: Run database migration 027_editorial_reports.sql
              </p>
            </div>
          ) : !status?.hasReport ? (
            renderNoReport()
          ) : status.status === 'processing' ? (
            renderProcessingStatus()
          ) : status.status === 'failed' ? (
            <div style={{
              background: '#FEF2F2',
              borderRadius: '8px',
              padding: '2rem',
              border: '1px solid #FECACA',
              textAlign: 'center',
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#991B1B' }}>Analysis Failed</h3>
              <p style={{ margin: '0 0 1rem 0', color: '#B91C1C' }}>{status.error}</p>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '8px 16px',
                  background: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Retry Analysis
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: '0.5rem',
              }}>
                {(['overview', 'beta-swarm', 'ruthless-editor', 'market-analyst'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setSelectedChapter(null);
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: activeTab === tab ? '#667eea' : 'transparent',
                      color: activeTab === tab ? 'white' : '#64748B',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: activeTab === tab ? '600' : '400',
                      textTransform: 'capitalize',
                    }}
                  >
                    {tab.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'beta-swarm' && renderBetaSwarm()}
              {activeTab === 'ruthless-editor' && renderRuthlessEditor()}
              {activeTab === 'market-analyst' && renderMarketAnalyst()}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
