'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getToken } from '../../lib/auth';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Lesson {
  id: string;
  agent_type: string;
  scope: string;
  category: string;
  title: string;
  content: string;
  score: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

interface EditorialLesson {
  id: string;
  projectId: string;
  bookId: string | null;
  category: string;
  title: string;
  description: string;
  sourceModule: string | null;
  originalIssue: string | null;
  resolution: string | null;
  wordCountImpact: number;
  severityLevel: string | null;
  appliesToGenre: string | null;
  appliesToTone: string | null;
  isActive: boolean;
  timesApplied: number;
  effectivenessScore: number;
  createdAt: string;
  updatedAt: string;
}

interface LessonStats {
  totalLessons: number;
  activeLessons: number;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  avgEffectiveness: number;
}

interface AvailableReport {
  id: string;
  projectId: string;
  projectTitle: string;
  reportType: 'veb' | 'outline_editorial';
  reportTypeLabel: string;
  overallScore: number;
  summary: string;
  createdAt: string;
  completedAt: string;
  modulesCompleted: number;
  existingLessonCount: number;
}

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
  best_practice: 'Best Practice',
  bug_fix: 'Bug Fix',
  optimization: 'Optimisation',
  user_feedback: 'User Feedback',
};

const categoryColors: Record<string, { bg: string; text: string }> = {
  pacing: { bg: '#DBEAFE', text: '#1D4ED8' },
  exposition: { bg: '#FEF3C7', text: '#D97706' },
  dialogue: { bg: '#D1FAE5', text: '#059669' },
  character: { bg: '#EDE9FE', text: '#7C3AED' },
  plot: { bg: '#FEE2E2', text: '#DC2626' },
  scene_structure: { bg: '#E0E7FF', text: '#4F46E5' },
  word_economy: { bg: '#FED7AA', text: '#EA580C' },
  style: { bg: '#FCE7F3', text: '#DB2777' },
  market: { bg: '#CCFBF1', text: '#0D9488' },
  other: { bg: '#F3F4F6', text: '#6B7280' },
  best_practice: { bg: '#D1FAE5', text: '#059669' },
  bug_fix: { bg: '#FEE2E2', text: '#DC2626' },
  optimization: { bg: '#DBEAFE', text: '#1D4ED8' },
  user_feedback: { bg: '#EDE9FE', text: '#7C3AED' },
};

const sourceLabels: Record<string, string> = {
  beta_swarm: 'Beta Swarm',
  ruthless_editor: 'Ruthless Editor',
  market_analyst: 'Market Analyst',
  word_count_revision: 'Word Count Revision',
};

export default function LessonsSettingsPage() {
  const [agentLessons, setAgentLessons] = useState<Lesson[]>([]);
  const [editorialLessons, setEditorialLessons] = useState<EditorialLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'editorial' | 'agent'>('editorial');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [availableReports, setAvailableReports] = useState<AvailableReport[]>([]);
  const [importingReportId, setImportingReportId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const token = getToken();

      // Fetch agent lessons
      const agentRes = await fetch(`${API_BASE_URL}/api/lessons?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (agentRes.ok) {
        const data = await agentRes.json();
        setAgentLessons(data || []);
      }

      // Fetch editorial lessons (all projects)
      const editorialRes = await fetch(`${API_BASE_URL}/api/editorial-lessons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (editorialRes.ok) {
        const data = await editorialRes.json();
        setEditorialLessons(data.lessons || []);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableReports = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/editorial-lessons/reports-available`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching available reports:', error);
    }
  };

  const handleOpenImportModal = async () => {
    setImportResult(null);
    await fetchAvailableReports();
    setShowImportModal(true);
  };

  const handleImportFromReport = async (reportId: string) => {
    setImportingReportId(reportId);
    setImportResult(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/editorial-lessons/import-from-report/${reportId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (res.ok) {
        setImportResult({
          success: true,
          message: data.message || `Imported ${data.lessonsImported} lessons`,
        });
        // Refresh lessons and reports
        await fetchLessons();
        await fetchAvailableReports();
      } else {
        setImportResult({
          success: false,
          message: data.error || 'Failed to import lessons',
        });
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Network error while importing lessons',
      });
    } finally {
      setImportingReportId(null);
    }
  };

  const getStats = (): LessonStats => {
    const lessons = activeTab === 'editorial' ? editorialLessons : agentLessons;

    const byCategory: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let totalEffectiveness = 0;
    let effectivenessCount = 0;

    lessons.forEach((l: any) => {
      const cat = l.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;

      if (activeTab === 'editorial') {
        const src = l.sourceModule || 'unknown';
        bySource[src] = (bySource[src] || 0) + 1;
        if (l.effectivenessScore) {
          totalEffectiveness += l.effectivenessScore;
          effectivenessCount++;
        }
      } else {
        const agent = l.agent_type || 'unknown';
        bySource[agent] = (bySource[agent] || 0) + 1;
        if (l.score) {
          totalEffectiveness += l.score;
          effectivenessCount++;
        }
      }
    });

    return {
      totalLessons: lessons.length,
      activeLessons: activeTab === 'editorial'
        ? editorialLessons.filter(l => l.isActive).length
        : agentLessons.filter(l => l.score >= 0).length,
      byCategory,
      bySource,
      avgEffectiveness: effectivenessCount > 0 ? totalEffectiveness / effectivenessCount : 0,
    };
  };

  const getFilteredLessons = () => {
    let lessons: any[] = activeTab === 'editorial' ? editorialLessons : agentLessons;

    if (categoryFilter !== 'all') {
      lessons = lessons.filter(l => l.category === categoryFilter);
    }

    if (sourceFilter !== 'all') {
      if (activeTab === 'editorial') {
        lessons = lessons.filter(l => l.sourceModule === sourceFilter);
      } else {
        lessons = lessons.filter(l => l.agent_type === sourceFilter);
      }
    }

    // Sort by effectiveness/score
    return lessons.sort((a, b) => {
      const scoreA = activeTab === 'editorial' ? a.effectivenessScore : a.score;
      const scoreB = activeTab === 'editorial' ? b.effectivenessScore : b.score;
      return scoreB - scoreA;
    });
  };

  const stats = getStats();
  const filteredLessons = getFilteredLessons();

  const getCategoryStyle = (category: string) => {
    return categoryColors[category] || categoryColors.other;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div>Loading lessons...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Link
            href="/settings"
            style={{ color: '#64748B', textDecoration: 'none', fontSize: '0.875rem' }}
          >
            Settings
          </Link>
          <h1 style={{ margin: '0.5rem 0', color: '#1A1A2E', fontSize: '1.75rem' }}>
            Lessons Learned
          </h1>
          <p style={{ margin: 0, color: '#64748B' }}>
            Insights captured from editorial reviews and generation workflows that improve future books.
          </p>
        </div>

        {/* Stats Overview */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '1.5rem',
          color: 'white',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', opacity: 0.9 }}>
                Total Lessons
              </h3>
              <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>
                {stats.totalLessons}
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', opacity: 0.8 }}>
                {stats.activeLessons} active
              </p>
            </div>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                  {Object.keys(stats.byCategory).length}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Categories</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                  {Object.keys(stats.bySource).length}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Sources</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                  {stats.avgEffectiveness.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Avg Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs and Import Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '0.5rem',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => { setActiveTab('editorial'); setCategoryFilter('all'); setSourceFilter('all'); }}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'editorial' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                color: activeTab === 'editorial' ? 'white' : '#64748B',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: activeTab === 'editorial' ? '600' : '400',
              }}
            >
              Editorial Lessons ({editorialLessons.length})
            </button>
            <button
              onClick={() => { setActiveTab('agent'); setCategoryFilter('all'); setSourceFilter('all'); }}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'agent' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                color: activeTab === 'agent' ? 'white' : '#64748B',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: activeTab === 'agent' ? '600' : '400',
              }}
            >
              Agent Lessons ({agentLessons.length})
            </button>
          </div>
          <button
            onClick={handleOpenImportModal}
            style={{
              padding: '0.5rem 1rem',
              background: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>+</span> Import from Report
          </button>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                fontSize: '0.875rem',
                minWidth: '150px',
              }}
            >
              <option value="all">All Categories</option>
              {Object.entries(stats.byCategory).map(([cat, count]) => (
                <option key={cat} value={cat}>
                  {categoryLabels[cat] || cat} ({count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: '0.25rem' }}>
              Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                fontSize: '0.875rem',
                minWidth: '150px',
              }}
            >
              <option value="all">All Sources</option>
              {Object.entries(stats.bySource).map(([src, count]) => (
                <option key={src} value={src}>
                  {sourceLabels[src] || src} ({count})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '0.875rem', color: '#64748B' }}>
            Showing {filteredLessons.length} lessons
          </div>
        </div>

        {/* Lessons List */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}>
          {filteredLessons.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
              <p>No lessons found. Lessons are captured from editorial reviews and generation feedback.</p>
            </div>
          ) : (
            <div>
              {filteredLessons.map((lesson: any) => {
                const isExpanded = expandedLesson === lesson.id;
                const catStyle = getCategoryStyle(lesson.category);
                const score = activeTab === 'editorial' ? lesson.effectivenessScore : lesson.score;

                return (
                  <div
                    key={lesson.id}
                    style={{
                      borderBottom: '1px solid #E2E8F0',
                      background: isExpanded ? '#F8FAFC' : 'white',
                    }}
                  >
                    {/* Lesson Header */}
                    <div
                      onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)}
                      style={{
                        padding: '1rem 1.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                      }}
                    >
                      {/* Category Badge */}
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: catStyle.bg,
                        color: catStyle.text,
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        minWidth: '100px',
                        textAlign: 'center',
                      }}>
                        {categoryLabels[lesson.category] || lesson.category}
                      </span>

                      {/* Title & Description */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '600', color: '#1A1A2E', marginBottom: '0.25rem' }}>
                          {lesson.title}
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#64748B',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {activeTab === 'editorial' ? lesson.description : lesson.content}
                        </div>
                      </div>

                      {/* Score */}
                      <div style={{
                        padding: '0.5rem 0.75rem',
                        background: score >= 0 ? '#D1FAE5' : '#FEE2E2',
                        color: score >= 0 ? '#059669' : '#DC2626',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        minWidth: '50px',
                        textAlign: 'center',
                      }}>
                        {score > 0 ? '+' : ''}{score}
                      </div>

                      {/* Expand Icon */}
                      <span style={{
                        color: '#64748B',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}>
                        ▼
                      </span>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div style={{
                        padding: '0 1.5rem 1rem 1.5rem',
                        borderTop: '1px solid #E2E8F0',
                        background: '#FAFAFA',
                      }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '1rem',
                          marginTop: '1rem',
                        }}>
                          {activeTab === 'editorial' ? (
                            <>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
                                  Source
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#1A1A2E' }}>
                                  {sourceLabels[lesson.sourceModule] || lesson.sourceModule || 'Unknown'}
                                </div>
                              </div>
                              {lesson.originalIssue && (
                                <div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
                                    Original Issue
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: '#1A1A2E' }}>
                                    {lesson.originalIssue}
                                  </div>
                                </div>
                              )}
                              {lesson.resolution && (
                                <div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
                                    Resolution
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: '#1A1A2E' }}>
                                    {lesson.resolution}
                                  </div>
                                </div>
                              )}
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
                                  Times Applied
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#1A1A2E' }}>
                                  {lesson.timesApplied}
                                </div>
                              </div>
                              {lesson.appliesToGenre && (
                                <div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
                                    Genre
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: '#1A1A2E' }}>
                                    {lesson.appliesToGenre}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
                                  Agent Type
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#1A1A2E' }}>
                                  {lesson.agent_type}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
                                  Scope
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#1A1A2E' }}>
                                  {lesson.scope}
                                </div>
                              </div>
                              {lesson.tags && lesson.tags.length > 0 && (
                                <div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
                                    Tags
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                    {lesson.tags.map((tag: string, idx: number) => (
                                      <span key={idx} style={{
                                        padding: '0.125rem 0.5rem',
                                        background: '#E2E8F0',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        color: '#475569',
                                      }}>
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
                              Created
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#1A1A2E' }}>
                              {formatDate(activeTab === 'editorial' ? lesson.createdAt : lesson.created_at)}
                            </div>
                          </div>
                        </div>

                        {/* Full Content */}
                        <div style={{ marginTop: '1rem' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.5rem' }}>
                            Full Description
                          </div>
                          <div style={{
                            padding: '1rem',
                            background: 'white',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            fontSize: '0.875rem',
                            color: '#374151',
                            whiteSpace: 'pre-wrap',
                          }}>
                            {activeTab === 'editorial' ? lesson.description : lesson.content}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Help Text */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#F0F9FF',
          borderRadius: '8px',
          border: '1px solid #BAE6FD',
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#0369A1', fontSize: '0.875rem' }}>
            How Lessons Work
          </h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#0C4A6E' }}>
            Lessons are automatically captured from editorial reviews (VEB feedback, word count revisions)
            and applied to future book generation. Higher-scored lessons have more impact on new chapters.
            The system learns from each book to improve the next one&apos;s first draft quality.
          </p>
        </div>

        {/* Import from Report Modal */}
        {showImportModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1A1A2E' }}>
                  Import Lessons from Editorial Report
                </h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#64748B',
                  }}
                >
                  &times;
                </button>
              </div>

              <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Select an editorial report to extract lessons from. This is useful for reports created before
                automatic lesson extraction was implemented.
              </p>

              {importResult && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  background: importResult.success ? '#D1FAE5' : '#FEE2E2',
                  color: importResult.success ? '#059669' : '#DC2626',
                  fontSize: '0.875rem',
                }}>
                  {importResult.message}
                </div>
              )}

              {availableReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                  No completed editorial reports found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {availableReports.map((report) => (
                    <div
                      key={report.id}
                      style={{
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '1rem',
                        background: '#FAFAFA',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: '#1A1A2E', marginBottom: '0.25rem' }}>
                            {report.projectTitle}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9333EA', marginBottom: '0.25rem' }}>
                            {report.reportTypeLabel}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.5rem' }}>
                            Score: {report.overallScore}/100 | {report.modulesCompleted}/3 modules |{' '}
                            {formatDate(report.completedAt)}
                          </div>
                          {report.existingLessonCount > 0 && (
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}>
                              <span>&#10003;</span> {report.existingLessonCount} lessons already imported
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleImportFromReport(report.id)}
                          disabled={importingReportId === report.id}
                          style={{
                            padding: '0.5rem 1rem',
                            background: importingReportId === report.id ? '#9CA3AF' : '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: importingReportId === report.id ? 'not-allowed' : 'pointer',
                            fontWeight: '500',
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {importingReportId === report.id ? 'Importing...' : 'Import Lessons'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowImportModal(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#E2E8F0',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
