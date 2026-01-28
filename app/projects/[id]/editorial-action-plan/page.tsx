'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, logout } from '@/app/lib/auth';
import ProjectNavigation from '@/app/components/shared/ProjectNavigation';
import { useProjectNavigation } from '@/app/hooks';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Finding {
  id: string;
  module: 'beta_swarm' | 'ruthless_editor' | 'market_analyst';
  type: string;
  severity: 'minor' | 'moderate' | 'major';
  chapter?: number;
  location?: string;
  issue: string;
  suggestion?: string;
  quote?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
  feedbackId?: string;
}

interface VEBReport {
  id: string;
  projectId: string;
  status: string;
  overallScore: number;
  summary: string;
  betaSwarm?: {
    status: string;
    results?: {
      chapterResults: Array<{
        chapterNumber: number;
        dnfRiskPoints: Array<{
          location: string;
          reason: string;
          severity: string;
        }>;
        reactions: Array<{
          paragraphIndex: number;
          tag: string;
          explanation: string;
        }>;
      }>;
      summaryReaction: string;
    };
  };
  ruthlessEditor?: {
    status: string;
    results?: {
      chapterResults: Array<{
        chapterNumber: number;
        expositionIssues: Array<{
          location: string;
          issue: string;
          quote: string;
          suggestion: string;
          severity: string;
        }>;
        pacingIssues: Array<{
          location: string;
          issue: string;
          suggestion: string;
          severity: string;
        }>;
        scenePurpose: {
          earned: boolean;
          reasoning: string;
          recommendation?: string;
        };
      }>;
      summaryVerdict: string;
    };
  };
  marketAnalyst?: {
    status: string;
    results?: {
      hookAnalysis: {
        openingLineScore: number;
        strengths: string[];
        weaknesses: string[];
        suggestedRewrite?: string;
      };
      tropeAnalysis: Array<{
        trope: string;
        freshness: string;
        execution: string;
        notes: string;
      }>;
      marketPositioning: {
        potentialChallenges: string[];
      };
    };
  };
  recommendations: string[];
}

interface Feedback {
  id: string;
  module: string;
  findingIndex: number;
  feedbackType: string;
  notes?: string;
  chapterId?: string;
}

export default function EditorialActionPlanPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { projectTitle, bookTitle, handleLogout } = useProjectNavigation(projectId);

  const [report, setReport] = useState<VEBReport | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Map<string, Feedback>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'implemented' | 'rejected'>('all');
  const [moduleFilter, setModuleFilter] = useState<'all' | 'beta_swarm' | 'ruthless_editor' | 'market_analyst'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'major' | 'moderate' | 'minor'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Helper to format underscore text
  const formatText = (text: string | undefined | null): string => {
    if (!text) return 'N/A';
    return text
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Extract findings from VEB report
  const extractFindings = useCallback((vebReport: VEBReport, feedback: Feedback[]): Finding[] => {
    const extracted: Finding[] = [];
    const feedbackByKey = new Map<string, Feedback>();

    // Build feedback lookup map
    feedback.forEach(f => {
      const key = `${f.module}-${f.findingIndex}`;
      feedbackByKey.set(key, f);
    });

    let findingIndex = 0;

    // Extract Beta Swarm findings (DNF risk points)
    if (vebReport.betaSwarm?.results?.chapterResults) {
      vebReport.betaSwarm.results.chapterResults.forEach(chapter => {
        chapter.dnfRiskPoints?.forEach((dnf, idx) => {
          const key = `beta_swarm-${findingIndex}`;
          const fb = feedbackByKey.get(key);
          extracted.push({
            id: `beta-${chapter.chapterNumber}-dnf-${idx}`,
            module: 'beta_swarm',
            type: 'DNF Risk',
            severity: dnf.severity as 'minor' | 'moderate' | 'major',
            chapter: chapter.chapterNumber,
            location: dnf.location,
            issue: dnf.reason,
            status: fb?.feedbackType === 'accept' ? 'accepted'
              : fb?.feedbackType === 'reject' ? 'rejected'
              : fb?.feedbackType === 'rewrite_completed' ? 'implemented'
              : 'pending',
            feedbackId: fb?.id,
          });
          findingIndex++;
        });

        // Extract negative reactions (BORED, CONFUSED)
        chapter.reactions?.filter(r => r.tag === 'BORED' || r.tag === 'CONFUSED').forEach((reaction, idx) => {
          const key = `beta_swarm-${findingIndex}`;
          const fb = feedbackByKey.get(key);
          extracted.push({
            id: `beta-${chapter.chapterNumber}-reaction-${idx}`,
            module: 'beta_swarm',
            type: reaction.tag === 'BORED' ? 'Engagement Drop' : 'Confusion Point',
            severity: 'moderate',
            chapter: chapter.chapterNumber,
            location: `Paragraph ${reaction.paragraphIndex}`,
            issue: reaction.explanation,
            status: fb?.feedbackType === 'accept' ? 'accepted'
              : fb?.feedbackType === 'reject' ? 'rejected'
              : fb?.feedbackType === 'rewrite_completed' ? 'implemented'
              : 'pending',
            feedbackId: fb?.id,
          });
          findingIndex++;
        });
      });
    }

    findingIndex = 0; // Reset for each module

    // Extract Ruthless Editor findings
    if (vebReport.ruthlessEditor?.results?.chapterResults) {
      vebReport.ruthlessEditor.results.chapterResults.forEach(chapter => {
        // Exposition issues
        chapter.expositionIssues?.forEach((issue, idx) => {
          const key = `ruthless_editor-${findingIndex}`;
          const fb = feedbackByKey.get(key);
          extracted.push({
            id: `editor-${chapter.chapterNumber}-exp-${idx}`,
            module: 'ruthless_editor',
            type: formatText(issue.issue),
            severity: issue.severity as 'minor' | 'moderate' | 'major',
            chapter: chapter.chapterNumber,
            location: issue.location,
            issue: issue.suggestion,
            quote: issue.quote,
            suggestion: issue.suggestion,
            status: fb?.feedbackType === 'accept' ? 'accepted'
              : fb?.feedbackType === 'reject' ? 'rejected'
              : fb?.feedbackType === 'rewrite_completed' ? 'implemented'
              : 'pending',
            feedbackId: fb?.id,
          });
          findingIndex++;
        });

        // Pacing issues
        chapter.pacingIssues?.forEach((issue, idx) => {
          const key = `ruthless_editor-${findingIndex}`;
          const fb = feedbackByKey.get(key);
          extracted.push({
            id: `editor-${chapter.chapterNumber}-pace-${idx}`,
            module: 'ruthless_editor',
            type: formatText(issue.issue),
            severity: issue.severity as 'minor' | 'moderate' | 'major',
            chapter: chapter.chapterNumber,
            location: issue.location,
            issue: issue.suggestion,
            suggestion: issue.suggestion,
            status: fb?.feedbackType === 'accept' ? 'accepted'
              : fb?.feedbackType === 'reject' ? 'rejected'
              : fb?.feedbackType === 'rewrite_completed' ? 'implemented'
              : 'pending',
            feedbackId: fb?.id,
          });
          findingIndex++;
        });

        // Scene purpose issues
        if (chapter.scenePurpose && !chapter.scenePurpose.earned) {
          const key = `ruthless_editor-${findingIndex}`;
          const fb = feedbackByKey.get(key);
          extracted.push({
            id: `editor-${chapter.chapterNumber}-scene`,
            module: 'ruthless_editor',
            type: 'Scene Purpose',
            severity: 'major',
            chapter: chapter.chapterNumber,
            issue: chapter.scenePurpose.reasoning,
            suggestion: chapter.scenePurpose.recommendation,
            status: fb?.feedbackType === 'accept' ? 'accepted'
              : fb?.feedbackType === 'reject' ? 'rejected'
              : fb?.feedbackType === 'rewrite_completed' ? 'implemented'
              : 'pending',
            feedbackId: fb?.id,
          });
          findingIndex++;
        }
      });
    }

    findingIndex = 0;

    // Extract Market Analyst findings
    if (vebReport.marketAnalyst?.results) {
      const results = vebReport.marketAnalyst.results;

      // Hook weaknesses
      results.hookAnalysis?.weaknesses?.forEach((weakness, idx) => {
        const key = `market_analyst-${findingIndex}`;
        const fb = feedbackByKey.get(key);
        extracted.push({
          id: `market-hook-${idx}`,
          module: 'market_analyst',
          type: 'Opening Hook',
          severity: 'major',
          issue: weakness,
          suggestion: results.hookAnalysis.suggestedRewrite,
          status: fb?.feedbackType === 'accept' ? 'accepted'
            : fb?.feedbackType === 'reject' ? 'rejected'
            : fb?.feedbackType === 'rewrite_completed' ? 'implemented'
            : 'pending',
          feedbackId: fb?.id,
        });
        findingIndex++;
      });

      // Trope execution issues
      results.tropeAnalysis?.filter(t => t.execution === 'poor' || t.freshness === 'overdone').forEach((trope, idx) => {
        const key = `market_analyst-${findingIndex}`;
        const fb = feedbackByKey.get(key);
        extracted.push({
          id: `market-trope-${idx}`,
          module: 'market_analyst',
          type: 'Trope Issue',
          severity: trope.execution === 'poor' ? 'major' : 'moderate',
          issue: `${trope.trope}: ${trope.notes}`,
          status: fb?.feedbackType === 'accept' ? 'accepted'
            : fb?.feedbackType === 'reject' ? 'rejected'
            : fb?.feedbackType === 'rewrite_completed' ? 'implemented'
            : 'pending',
          feedbackId: fb?.id,
        });
        findingIndex++;
      });

      // Market challenges
      results.marketPositioning?.potentialChallenges?.forEach((challenge, idx) => {
        const key = `market_analyst-${findingIndex}`;
        const fb = feedbackByKey.get(key);
        extracted.push({
          id: `market-challenge-${idx}`,
          module: 'market_analyst',
          type: 'Market Challenge',
          severity: 'moderate',
          issue: challenge,
          status: fb?.feedbackType === 'accept' ? 'accepted'
            : fb?.feedbackType === 'reject' ? 'rejected'
            : fb?.feedbackType === 'rewrite_completed' ? 'implemented'
            : 'pending',
          feedbackId: fb?.id,
        });
        findingIndex++;
      });
    }

    return extracted;
  }, []);

  // Fetch report and feedback
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getToken();

        // Fetch VEB report
        const reportRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}/veb/report`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!reportRes.ok) {
          if (reportRes.status === 401) {
            logout();
            router.push('/login');
            return;
          }
          if (reportRes.status === 404) {
            setError('No editorial report found. Submit your manuscript to the Virtual Editorial Board first.');
            setLoading(false);
            return;
          }
          throw new Error('Failed to fetch report');
        }

        const reportData = await reportRes.json();
        setReport(reportData);

        // Fetch feedback
        const feedbackRes = await fetch(`${API_BASE_URL}/api/veb/reports/${reportData.id}/feedback`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        let feedbackData: Feedback[] = [];
        if (feedbackRes.ok) {
          const data = await feedbackRes.json();
          feedbackData = data.feedback || [];
          const map = new Map<string, Feedback>();
          feedbackData.forEach(f => map.set(`${f.module}-${f.findingIndex}`, f));
          setFeedbackMap(map);
        }

        // Extract and set findings
        const extractedFindings = extractFindings(reportData, feedbackData);
        setFindings(extractedFindings);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load editorial report');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, router, extractFindings]);

  // Update finding status
  const updateFindingStatus = async (finding: Finding, newStatus: 'accepted' | 'rejected' | 'implemented') => {
    setUpdatingId(finding.id);
    try {
      const token = getToken();
      const feedbackType = newStatus === 'accepted' ? 'accept'
        : newStatus === 'rejected' ? 'reject'
        : 'rewrite_completed';

      const findingIndex = findings.findIndex(f => f.id === finding.id);

      const response = await fetch(`${API_BASE_URL}/api/veb/reports/${report?.id}/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          module: finding.module,
          findingIndex,
          feedbackType,
          notes: `${formatText(finding.type)}: ${finding.issue}`,
        }),
      });

      if (response.ok) {
        setFindings(prev => prev.map(f =>
          f.id === finding.id ? { ...f, status: newStatus } : f
        ));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter findings
  const filteredFindings = findings.filter(f => {
    if (filter !== 'all' && f.status !== filter) return false;
    if (moduleFilter !== 'all' && f.module !== moduleFilter) return false;
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    return true;
  });

  // Calculate stats
  const stats = {
    total: findings.length,
    pending: findings.filter(f => f.status === 'pending').length,
    accepted: findings.filter(f => f.status === 'accepted').length,
    implemented: findings.filter(f => f.status === 'implemented').length,
    rejected: findings.filter(f => f.status === 'rejected').length,
    major: findings.filter(f => f.severity === 'major' && f.status === 'pending').length,
  };

  const completionPercent = stats.total > 0
    ? Math.round(((stats.implemented + stats.rejected) / stats.total) * 100)
    : 0;

  const moduleLabels = {
    beta_swarm: 'Beta Swarm',
    ruthless_editor: 'Ruthless Editor',
    market_analyst: 'Market Analyst',
  };

  const moduleColors = {
    beta_swarm: { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' },
    ruthless_editor: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
    market_analyst: { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
  };

  const severityColors = {
    minor: { bg: '#F3F4F6', text: '#4B5563', border: '#9CA3AF' },
    moderate: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
    major: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
        <ProjectNavigation projectId={projectId} projectTitle={projectTitle} bookTitle={bookTitle} onLogout={handleLogout} />
        <main style={{ flex: 1, padding: '2rem', marginLeft: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
            <div>Loading editorial action plan...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
        <ProjectNavigation projectId={projectId} projectTitle={projectTitle} bookTitle={bookTitle} onLogout={handleLogout} />
        <main style={{ flex: 1, padding: '2rem', marginLeft: '280px' }}>
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#991B1B', margin: '0 0 1rem 0' }}>No Report Available</h2>
            <p style={{ color: '#B91C1C', margin: '0 0 1.5rem 0' }}>{error}</p>
            <Link
              href={`/projects/${projectId}/editorial-report`}
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '500',
              }}
            >
              Go to Editorial Report
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
      <ProjectNavigation projectId={projectId} projectTitle={projectTitle} bookTitle={bookTitle} onLogout={handleLogout} />

      <main style={{ flex: 1, padding: '2rem', marginLeft: '280px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <Link
                href={`/projects/${projectId}/editorial-report`}
                style={{ color: '#64748B', textDecoration: 'none', fontSize: '0.875rem' }}
              >
                ← Back to Editorial Report
              </Link>
            </div>
            <h1 style={{ margin: '0 0 0.5rem 0', color: '#1A1A2E', fontSize: '1.75rem' }}>
              Editorial Action Plan
            </h1>
            <p style={{ margin: 0, color: '#64748B' }}>
              Review and track all editorial findings. Mark items as accepted, implemented, or rejected.
            </p>
          </div>

          {/* Progress Overview */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '1.5rem',
            color: 'white',
            marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', opacity: 0.9 }}>Review Progress</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>{completionPercent}%</div>
                <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8, fontSize: '0.875rem' }}>
                  {stats.implemented + stats.rejected} of {stats.total} items addressed
                </p>
              </div>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{stats.pending}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Pending</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{stats.accepted}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Accepted</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{stats.implemented}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Implemented</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{stats.rejected}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Rejected</div>
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
                width: `${completionPercent}%`,
                background: 'white',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>

            {stats.major > 0 && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: 'rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}>
                ⚠️ {stats.major} major issue{stats.major > 1 ? 's' : ''} require{stats.major === 1 ? 's' : ''} attention
              </div>
            )}
          </div>

          {/* Filters */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1rem',
            border: '1px solid #E2E8F0',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <span style={{ fontWeight: '500', color: '#64748B', fontSize: '0.875rem' }}>Filter:</span>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                background: 'white',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="implemented">Implemented</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value as typeof moduleFilter)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                background: 'white',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Modules</option>
              <option value="beta_swarm">Beta Swarm</option>
              <option value="ruthless_editor">Ruthless Editor</option>
              <option value="market_analyst">Market Analyst</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as typeof severityFilter)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                background: 'white',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Severity</option>
              <option value="major">Major</option>
              <option value="moderate">Moderate</option>
              <option value="minor">Minor</option>
            </select>

            <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: '0.875rem' }}>
              Showing {filteredFindings.length} of {findings.length} items
            </span>
          </div>

          {/* Findings List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredFindings.length === 0 ? (
              <div style={{
                background: 'white',
                borderRadius: '8px',
                padding: '3rem',
                border: '1px solid #E2E8F0',
                textAlign: 'center',
                color: '#64748B',
              }}>
                No findings match your current filters.
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const modColor = moduleColors[finding.module];
                const sevColor = severityColors[finding.severity];
                const isUpdating = updatingId === finding.id;

                return (
                  <div
                    key={finding.id}
                    style={{
                      background: finding.status === 'implemented' ? '#F0FDF4'
                        : finding.status === 'rejected' ? '#F9FAFB'
                        : 'white',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      border: `1px solid ${finding.status === 'implemented' ? '#10B981'
                        : finding.status === 'rejected' ? '#D1D5DB'
                        : '#E2E8F0'}`,
                      opacity: finding.status === 'rejected' ? 0.7 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        {/* Tags Row */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: modColor.bg,
                            color: modColor.text,
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '500',
                          }}>
                            {moduleLabels[finding.module]}
                          </span>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: sevColor.bg,
                            color: sevColor.text,
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '500',
                            textTransform: 'uppercase',
                          }}>
                            {finding.severity}
                          </span>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: '#F3F4F6',
                            color: '#4B5563',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                          }}>
                            {finding.type}
                          </span>
                          {finding.chapter && (
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: '#EDE9FE',
                              color: '#5B21B6',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                            }}>
                              Ch. {finding.chapter}
                            </span>
                          )}
                          {finding.status !== 'pending' && (
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: finding.status === 'implemented' ? '#D1FAE5'
                                : finding.status === 'accepted' ? '#DBEAFE'
                                : '#F3F4F6',
                              color: finding.status === 'implemented' ? '#065F46'
                                : finding.status === 'accepted' ? '#1E40AF'
                                : '#4B5563',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '500',
                            }}>
                              {finding.status === 'implemented' ? '✓ Implemented'
                                : finding.status === 'accepted' ? '○ Accepted'
                                : '✗ Rejected'}
                            </span>
                          )}
                        </div>

                        {/* Issue */}
                        <p style={{ margin: '0 0 0.5rem 0', color: '#1A1A2E', lineHeight: 1.5 }}>
                          {finding.issue}
                        </p>

                        {/* Quote if present */}
                        {finding.quote && (
                          <blockquote style={{
                            margin: '0.75rem 0',
                            padding: '0.75rem 1rem',
                            background: '#F8FAFC',
                            borderLeft: '3px solid #94A3B8',
                            fontStyle: 'italic',
                            color: '#64748B',
                            fontSize: '0.875rem',
                          }}>
                            &quot;{finding.quote}&quot;
                          </blockquote>
                        )}

                        {/* Suggestion if present */}
                        {finding.suggestion && finding.suggestion !== finding.issue && (
                          <p style={{
                            margin: '0.5rem 0 0 0',
                            fontSize: '0.875rem',
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.5rem',
                          }}>
                            <span>💡</span>
                            <span>{finding.suggestion}</span>
                          </p>
                        )}

                        {/* Location if present */}
                        {finding.location && (
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                            📍 {finding.location}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {finding.status === 'pending' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <button
                            onClick={() => updateFindingStatus(finding, 'accepted')}
                            disabled={isUpdating}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#DBEAFE',
                              color: '#1E40AF',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              cursor: isUpdating ? 'wait' : 'pointer',
                              opacity: isUpdating ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => updateFindingStatus(finding, 'implemented')}
                            disabled={isUpdating}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#D1FAE5',
                              color: '#065F46',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              cursor: isUpdating ? 'wait' : 'pointer',
                              opacity: isUpdating ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ✓ Done
                          </button>
                          <button
                            onClick={() => updateFindingStatus(finding, 'rejected')}
                            disabled={isUpdating}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#F3F4F6',
                              color: '#6B7280',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              cursor: isUpdating ? 'wait' : 'pointer',
                              opacity: isUpdating ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {finding.status === 'accepted' && (
                        <button
                          onClick={() => updateFindingStatus(finding, 'implemented')}
                          disabled={isUpdating}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#D1FAE5',
                            color: '#065F46',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            cursor: isUpdating ? 'wait' : 'pointer',
                            opacity: isUpdating ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Mark Done
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
