'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, logout } from '@/app/lib/auth';
import ProjectNavigation from '@/app/components/shared/ProjectNavigation';
import { useProjectNavigation } from '@/app/hooks';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Types for Outline Editorial Report
interface StructureAnalystResult {
  plotStructureScore: number;
  plotStructureAnalysis: {
    structureType: string;
    strengths: string[];
    weaknesses: string[];
    missingBeats: string[];
  };
  pacingAssessment: {
    overallPacing: string;
    actBalance: Array<{
      act: number;
      assessment: string;
      percentageOfStory: number;
      idealPercentage: number;
    }>;
    suggestions: string[];
  };
  storyArcAnalysis: {
    tensionCurve: string;
    climaxPlacement: string;
    resolutionAssessment: string;
    emotionalJourney: string;
  };
  chapterByChapterNotes: Array<{
    chapterNumber: number;
    purpose: string;
    concerns: string[];
    suggestions: string[];
  }>;
  summaryVerdict: string;
}

interface CharacterArcResult {
  overallCharacterScore: number;
  protagonistArc: {
    characterName: string;
    arcType: string;
    startingState: string;
    endingState: string;
    transformationClarity: number;
    keyMoments: string[];
    missingElements: string[];
  };
  supportingCharacterArcs: Array<{
    characterName: string;
    role: string;
    arcPresent: boolean;
    arcSummary: string;
    screenTimeBalance: string;
    suggestions: string[];
  }>;
  relationshipDynamics: Array<{
    characters: string[];
    relationshipType: string;
    evolutionThroughStory: string;
    effectivenessScore: number;
  }>;
  characterConsistencyIssues: Array<{
    character: string;
    issue: string;
    chapterNumber: number;
    suggestion: string;
  }>;
  summaryVerdict: string;
}

interface MarketFitResult {
  marketViabilityScore: number;
  genreAlignment: {
    primaryGenre: string;
    genreExpectationsMet: boolean;
    tropesIdentified: string[];
    freshElements: string[];
    familiarElements: string[];
  };
  targetAudience: {
    primary: string;
    secondary: string;
    ageRange: string;
    readerExpectations: string[];
  };
  competitiveAnalysis: {
    comparableTitles: Array<{
      title: string;
      author: string;
      similarity: string;
    }>;
    marketDifferentiation: string;
    uniqueSellingPoints: string[];
  };
  hookAssessment: {
    conceptHookStrength: number;
    openingChapterHook: number;
    marketingPotential: string;
    elevatorPitch: string;
  };
  concerns: Array<{
    area: string;
    concern: string;
    severity: string;
    suggestion: string;
  }>;
  summaryVerdict: string;
  agentRecommendation: string;
}

interface OutlineEditorialReport {
  id: string;
  projectId: string;
  outlineId: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  structureAnalyst?: {
    status: string;
    results: StructureAnalystResult | null;
    completedAt: string | null;
  };
  characterArc?: {
    status: string;
    results: CharacterArcResult | null;
    completedAt: string | null;
  };
  marketFit?: {
    status: string;
    results: MarketFitResult | null;
    completedAt: string | null;
  };
  overallScore: number | null;
  summary: string | null;
  recommendations: string[] | null;
  readyForGeneration: boolean;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

interface OutlineEditorialStatus {
  hasReport: boolean;
  projectReviewStatus: string | null;
  reportId?: string;
  status?: string;
  modules?: {
    structureAnalyst: string;
    characterArc: string;
    marketFit: string;
  };
  progress?: number;
  overallScore?: number;
  readyForGeneration?: boolean;
  createdAt?: string;
  completedAt?: string;
  error?: string;
}

type TabType = 'overview' | 'structure' | 'characters' | 'market';

export default function OutlineReviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [status, setStatus] = useState<OutlineEditorialStatus | null>(null);
  const [report, setReport] = useState<OutlineEditorialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [project, setProject] = useState<any>(null);

  const navigation = useProjectNavigation(projectId, project);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchStatus();
    }
  }, [projectId]);

  useEffect(() => {
    // Poll for status updates while processing
    if (status?.status === 'processing') {
      const interval = setInterval(fetchStatus, 5000);
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

  const fetchStatus = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/outline-editorial/status`, {
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
        throw new Error('Failed to fetch status');
      }

      const data = await response.json();
      setStatus(data);

      // If completed, fetch full report
      if (data.hasReport && data.status === 'completed') {
        await fetchReport();
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/outline-editorial/report`, {
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
      console.error('Error fetching report:', error);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/outline-editorial/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to submit for review');
        return;
      }

      await fetchStatus();
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Failed to submit outline for review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!confirm('Are you sure you want to skip the editorial review? You can always come back later.')) {
      return;
    }

    setSkipping(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/outline-editorial/skip`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to skip review');
        return;
      }

      // Navigate to chapters
      router.push(`/projects/${projectId}/progress`);
    } catch (error) {
      console.error('Error skipping:', error);
      alert('Failed to skip review');
    } finally {
      setSkipping(false);
    }
  };

  const handleProceedToChapters = () => {
    router.push(`/projects/${projectId}/progress`);
  };

  const getScoreColor = (score: number, max: number = 10) => {
    const normalised = (score / max) * 100;
    if (normalised >= 80) return '#10B981';
    if (normalised >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'major':
        return '#EF4444';
      case 'moderate':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const renderOverview = () => {
    if (!report) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Overall Score Card */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '2rem',
          color: 'white',
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Outline Editorial Score</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '4rem', fontWeight: '700' }}>{report.overallScore || 0}</span>
            <span style={{ fontSize: '1.5rem', opacity: 0.8 }}>/100</span>
          </div>
          <p style={{ margin: '1rem 0 0 0', opacity: 0.9 }}>{report.summary}</p>
          {report.readyForGeneration && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{ fontSize: '1.25rem' }}>✓</span>
              <span>Ready for chapter generation</span>
            </div>
          )}
        </div>

        {/* Module Scores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {/* Structure Score */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#64748B', fontSize: '0.875rem' }}>
              Story Structure
            </h4>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              <span style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: getScoreColor(report.structureAnalyst?.results?.plotStructureScore || 0),
              }}>
                {report.structureAnalyst?.results?.plotStructureScore || 'N/A'}
              </span>
              <span style={{ color: '#64748B' }}>/10</span>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#64748B' }}>
              {report.structureAnalyst?.results?.pacingAssessment?.overallPacing?.replace(/_/g, ' ') || 'Pending'}
            </p>
          </div>

          {/* Character Score */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#64748B', fontSize: '0.875rem' }}>
              Character Arcs
            </h4>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              <span style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: getScoreColor(report.characterArc?.results?.overallCharacterScore || 0),
              }}>
                {report.characterArc?.results?.overallCharacterScore || 'N/A'}
              </span>
              <span style={{ color: '#64748B' }}>/10</span>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#64748B' }}>
              {report.characterArc?.results?.protagonistArc?.arcType || 'Pending'}
            </p>
          </div>

          {/* Market Score */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#64748B', fontSize: '0.875rem' }}>
              Market Fit
            </h4>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              <span style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: getScoreColor(report.marketFit?.results?.marketViabilityScore || 0),
              }}>
                {report.marketFit?.results?.marketViabilityScore || 'N/A'}
              </span>
              <span style={{ color: '#64748B' }}>/10</span>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#64748B' }}>
              {report.marketFit?.results?.agentRecommendation?.replace(/_/g, ' ') || 'Pending'}
            </p>
          </div>
        </div>

        {/* Recommendations */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#1A1A2E' }}>Priority Recommendations</h4>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {report.recommendations.map((rec, idx) => (
                <li key={idx} style={{ marginBottom: '0.5rem', color: '#475569' }}>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={handleProceedToChapters}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Proceed to Chapter Generation
          </button>
        </div>
      </div>
    );
  };

  const renderStructureAnalyst = () => {
    const results = report?.structureAnalyst?.results;
    if (!results) return <p style={{ color: '#64748B' }}>No structure analysis available</p>;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Summary */}
        <div style={{
          background: '#EFF6FF',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #BFDBFE',
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#1E40AF' }}>Structure Verdict</h4>
          <p style={{ margin: 0, color: '#1E3A8A' }}>{results.summaryVerdict}</p>
        </div>

        {/* Plot Structure Analysis */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
        }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Plot Structure: {results.plotStructureAnalysis.structureType}</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#10B981', fontSize: '0.875rem' }}>Strengths</h5>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {results.plotStructureAnalysis.strengths.map((s, i) => (
                  <li key={i} style={{ color: '#475569', fontSize: '0.875rem' }}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#EF4444', fontSize: '0.875rem' }}>Weaknesses</h5>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {results.plotStructureAnalysis.weaknesses.map((w, i) => (
                  <li key={i} style={{ color: '#475569', fontSize: '0.875rem' }}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {results.plotStructureAnalysis.missingBeats.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#F59E0B', fontSize: '0.875rem' }}>Missing Beats</h5>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {results.plotStructureAnalysis.missingBeats.map((b, i) => (
                  <li key={i} style={{ color: '#475569', fontSize: '0.875rem' }}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Pacing Assessment */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
        }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>
            Pacing: <span style={{ textTransform: 'capitalize' }}>{results.pacingAssessment.overallPacing.replace(/_/g, ' ')}</span>
          </h4>

          {results.pacingAssessment.actBalance.map((act, i) => (
            <div key={i} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Act {act.act}</span>
                <span>{act.percentageOfStory}% (ideal: {act.idealPercentage}%)</span>
              </div>
              <div style={{
                height: '8px',
                background: '#E2E8F0',
                borderRadius: '4px',
                marginTop: '0.25rem',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${act.percentageOfStory}%`,
                  background: Math.abs(act.percentageOfStory - act.idealPercentage) > 10 ? '#F59E0B' : '#10B981',
                  borderRadius: '4px',
                }} />
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>{act.assessment}</p>
            </div>
          ))}
        </div>

        {/* Story Arc */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
        }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Story Arc Analysis</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                <strong>Tension Curve:</strong> {results.storyArcAnalysis.tensionCurve.replace(/_/g, ' ')}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                <strong>Climax:</strong> {results.storyArcAnalysis.climaxPlacement}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                <strong>Resolution:</strong> {results.storyArcAnalysis.resolutionAssessment}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                <strong>Emotional Journey:</strong> {results.storyArcAnalysis.emotionalJourney}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCharacterArcs = () => {
    const results = report?.characterArc?.results;
    if (!results) return <p style={{ color: '#64748B' }}>No character analysis available</p>;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Summary */}
        <div style={{
          background: '#F0FDF4',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #BBF7D0',
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534' }}>Character Verdict</h4>
          <p style={{ margin: 0, color: '#15803D' }}>{results.summaryVerdict}</p>
        </div>

        {/* Protagonist Arc */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
        }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>
            Protagonist: {results.protagonistArc.characterName}
            <span style={{
              marginLeft: '0.5rem',
              padding: '2px 8px',
              background: '#E0E7FF',
              color: '#3730A3',
              borderRadius: '12px',
              fontSize: '0.75rem',
            }}>
              {results.protagonistArc.arcType}
            </span>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center' }}>
            <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>Starting State</p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{results.protagonistArc.startingState}</p>
            </div>
            <div style={{ fontSize: '1.5rem', color: '#64748B' }}>→</div>
            <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>Ending State</p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{results.protagonistArc.endingState}</p>
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              <strong>Transformation Clarity:</strong>{' '}
              <span style={{ color: getScoreColor(results.protagonistArc.transformationClarity) }}>
                {results.protagonistArc.transformationClarity}/10
              </span>
            </p>
          </div>

          {results.protagonistArc.missingElements.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#F59E0B', fontSize: '0.875rem' }}>Missing Elements</h5>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {results.protagonistArc.missingElements.map((e, i) => (
                  <li key={i} style={{ color: '#475569', fontSize: '0.875rem' }}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Supporting Characters */}
        {results.supportingCharacterArcs.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
          }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Supporting Characters</h4>
            {results.supportingCharacterArcs.map((char, i) => (
              <div key={i} style={{
                padding: '1rem',
                background: '#F8FAFC',
                borderRadius: '8px',
                marginBottom: i < results.supportingCharacterArcs.length - 1 ? '0.75rem' : 0,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{char.characterName}</strong>
                    <span style={{ marginLeft: '0.5rem', color: '#64748B', fontSize: '0.875rem' }}>({char.role})</span>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    background: char.arcPresent ? '#D1FAE5' : '#FEE2E2',
                    color: char.arcPresent ? '#065F46' : '#991B1B',
                  }}>
                    {char.arcPresent ? 'Arc Present' : 'No Arc'}
                  </span>
                </div>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#475569' }}>{char.arcSummary}</p>
              </div>
            ))}
          </div>
        )}

        {/* Consistency Issues */}
        {results.characterConsistencyIssues.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#EF4444' }}>Consistency Issues</h4>
            {results.characterConsistencyIssues.map((issue, i) => (
              <div key={i} style={{
                padding: '0.75rem',
                background: '#FEF2F2',
                borderRadius: '4px',
                marginBottom: '0.5rem',
                borderLeft: '3px solid #EF4444',
              }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  {issue.character} - Chapter {issue.chapterNumber}
                </div>
                <div style={{ color: '#1A1A2E', fontSize: '0.875rem' }}>{issue.issue}</div>
                <div style={{ fontSize: '0.875rem', color: '#166534', marginTop: '0.25rem' }}>
                  Suggestion: {issue.suggestion}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMarketFit = () => {
    const results = report?.marketFit?.results;
    if (!results) return <p style={{ color: '#64748B' }}>No market analysis available</p>;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Agent Recommendation */}
        <div style={{
          background: results.agentRecommendation === 'proceed' ? '#D1FAE5' :
            results.agentRecommendation === 'revise_then_proceed' ? '#FEF3C7' : '#FEE2E2',
          borderRadius: '8px',
          padding: '1.5rem',
          border: `1px solid ${
            results.agentRecommendation === 'proceed' ? '#6EE7B7' :
              results.agentRecommendation === 'revise_then_proceed' ? '#FCD34D' : '#FECACA'
          }`,
        }}>
          <h4 style={{
            margin: '0 0 0.5rem 0',
            color: results.agentRecommendation === 'proceed' ? '#065F46' :
              results.agentRecommendation === 'revise_then_proceed' ? '#92400E' : '#991B1B',
          }}>
            Recommendation: {results.agentRecommendation.replace(/_/g, ' ').toUpperCase()}
          </h4>
          <p style={{
            margin: 0,
            color: results.agentRecommendation === 'proceed' ? '#047857' :
              results.agentRecommendation === 'revise_then_proceed' ? '#A16207' : '#B91C1C',
          }}>
            {results.summaryVerdict}
          </p>
        </div>

        {/* Elevator Pitch */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Elevator Pitch</h4>
          <p style={{
            margin: 0,
            padding: '1rem',
            background: '#F8FAFC',
            borderRadius: '8px',
            fontStyle: 'italic',
            color: '#475569',
          }}>
            "{results.hookAssessment.elevatorPitch}"
          </p>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Concept Hook</span>
              <div style={{ color: getScoreColor(results.hookAssessment.conceptHookStrength), fontWeight: '700' }}>
                {results.hookAssessment.conceptHookStrength}/10
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Opening Chapter Hook</span>
              <div style={{ color: getScoreColor(results.hookAssessment.openingChapterHook), fontWeight: '700' }}>
                {results.hookAssessment.openingChapterHook}/10
              </div>
            </div>
          </div>
        </div>

        {/* Target Audience */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
        }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Target Audience</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem' }}><strong>Primary:</strong> {results.targetAudience.primary}</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}><strong>Secondary:</strong> {results.targetAudience.secondary}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem' }}><strong>Age Range:</strong> {results.targetAudience.ageRange}</p>
            </div>
          </div>
        </div>

        {/* Comparable Titles */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
        }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Comparable Titles</h4>
          {results.competitiveAnalysis.comparableTitles.map((comp, i) => (
            <div key={i} style={{
              padding: '0.75rem',
              background: '#F8FAFC',
              borderRadius: '4px',
              marginBottom: '0.5rem',
            }}>
              <strong>{comp.title}</strong> by {comp.author}
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748B' }}>{comp.similarity}</p>
            </div>
          ))}
          <div style={{ marginTop: '1rem' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>Unique Selling Points</h5>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {results.competitiveAnalysis.uniqueSellingPoints.map((usp, i) => (
                <li key={i} style={{ color: '#10B981', fontSize: '0.875rem' }}>{usp}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Concerns */}
        {results.concerns.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
          }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Market Concerns</h4>
            {results.concerns.map((concern, i) => (
              <div key={i} style={{
                padding: '0.75rem',
                background: '#FFFBEB',
                borderRadius: '4px',
                marginBottom: '0.5rem',
                borderLeft: `3px solid ${getSeverityColor(concern.severity)}`,
              }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  {concern.area} - <span style={{ color: getSeverityColor(concern.severity) }}>{concern.severity}</span>
                </div>
                <div style={{ color: '#1A1A2E', fontSize: '0.875rem' }}>{concern.concern}</div>
                <div style={{ fontSize: '0.875rem', color: '#166534', marginTop: '0.25rem' }}>
                  {concern.suggestion}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderProcessingStatus = () => {
    if (!status) return null;

    return (
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '2rem',
        border: '1px solid #E2E8F0',
        textAlign: 'center',
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          margin: '0 auto 1rem',
          borderRadius: '50%',
          border: '4px solid #E2E8F0',
          borderTopColor: '#667eea',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <h3 style={{ margin: '0 0 0.5rem 0', color: '#1A1A2E' }}>
          Editorial Board Reviewing...
        </h3>
        <p style={{ margin: '0 0 1.5rem 0', color: '#64748B' }}>
          Progress: {status.progress}%
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          {status.modules && Object.entries(status.modules).map(([module, moduleStatus]) => (
            <div key={module} style={{ textAlign: 'center' }}>
              <div style={{
                width: '24px',
                height: '24px',
                margin: '0 auto 0.5rem',
                borderRadius: '50%',
                background: moduleStatus === 'completed' ? '#10B981' :
                  moduleStatus === 'processing' ? '#F59E0B' : '#E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.75rem',
              }}>
                {moduleStatus === 'completed' ? '✓' : moduleStatus === 'processing' ? '...' : ''}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'capitalize' }}>
                {module.replace(/([A-Z])/g, ' $1').trim()}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNoReview = () => (
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
        📝
      </div>
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#1A1A2E' }}>
        Outline Editorial Review
      </h3>
      <p style={{ margin: '0 0 1.5rem 0', color: '#64748B', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
        Before generating chapters, you can optionally submit your outline for AI editorial review.
        Our virtual editors will analyse your story structure, character arcs, and market fit.
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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
          {submitting ? 'Submitting...' : 'Get Editorial Feedback'}
        </button>

        <button
          onClick={handleSkip}
          disabled={skipping}
          style={{
            padding: '12px 24px',
            background: 'white',
            color: '#64748B',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: skipping ? 'not-allowed' : 'pointer',
          }}
        >
          {skipping ? 'Skipping...' : 'Skip to Chapters'}
        </button>
      </div>

      <p style={{ margin: '1.5rem 0 0 0', fontSize: '0.875rem', color: '#94A3B8' }}>
        Estimated cost: ~$0.30 | Takes 1-3 minutes
      </p>
    </div>
  );

  const renderSkipped = () => (
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
        background: '#F3F4F6',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
      }}>
        ⏭️
      </div>
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#1A1A2E' }}>
        Editorial Review Skipped
      </h3>
      <p style={{ margin: '0 0 1.5rem 0', color: '#64748B' }}>
        You chose to skip the outline review. You can still request feedback later.
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            padding: '12px 24px',
            background: 'white',
            color: '#667eea',
            border: '1px solid #667eea',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Request Feedback Now
        </button>

        <button
          onClick={handleProceedToChapters}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Continue to Chapters
        </button>
      </div>
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
              Outline Review
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
          ) : status?.projectReviewStatus === 'skipped' && !status?.hasReport ? (
            renderSkipped()
          ) : !status?.hasReport ? (
            renderNoReview()
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
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#991B1B' }}>Review Failed</h3>
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
                Retry Review
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
                {(['overview', 'structure', 'characters', 'market'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
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
                    {tab === 'structure' ? 'Story Structure' :
                      tab === 'characters' ? 'Character Arcs' :
                        tab === 'market' ? 'Market Fit' : tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'structure' && renderStructureAnalyst()}
              {activeTab === 'characters' && renderCharacterArcs()}
              {activeTab === 'market' && renderMarketFit()}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
