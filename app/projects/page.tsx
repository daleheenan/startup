'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getToken, logout } from '../lib/auth';
import PrimaryNavigationBar from '../components/shared/PrimaryNavigationBar';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ProjectMetrics {
  tokens: {
    input: string;
    output: string;
    display: string;
  };
  cost: {
    usd: string;
    gbp: string;
    display: string;
  };
  content: {
    chapters: number;
    words: number;
    display: string;
  };
  reading: {
    minutes: number;
    display: string;
  };
}

interface ProjectProgress {
  characters: number;
  worldElements: number;
  plotLayers: number;
  hasOutline: boolean;
  outlineChapters: number;
  chaptersWritten: number;
  generationStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  generationQueuePosition?: number;
}

interface Project {
  id: string;
  title: string;
  type: string;
  genre: string;
  status: string;
  created_at: string;
  updated_at: string;
  metrics?: ProjectMetrics | null;
  progress?: ProjectProgress | null;
}

interface QueueStats {
  queue: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  session: {
    isActive: boolean;
    requestsThisSession: number;
    timeRemaining: string;
    resetTime: string | null;
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchQueueStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchQueueStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchProjects = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
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
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError(err.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQueueStats = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/queue/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setQueueStats(data);
      }
    } catch (err) {
      console.error('Error fetching queue stats:', err);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'setup': return '#667eea';
      case 'generating': return '#F59E0B';
      case 'completed': return '#10B981';
      default: return '#64748B';
    }
  };


  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            width: '48px',
            height: '48px',
            border: '3px solid #E2E8F0',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '1rem', color: '#64748B' }}>Loading...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Primary Navigation Bar */}
      <PrimaryNavigationBar activeSection="projects" />

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <header
          role="banner"
          style={{
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
              Story Architect
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0 }}>
              Create and manage your novel projects
            </p>
          </div>

          {/* Claude Max Status */}
          {queueStats && (
            <div
              role="complementary"
              aria-label="System status"
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
              }}>
              <div style={{
                padding: '0.75rem 1rem',
                background: '#F1F5F9',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <div
                  role="progressbar"
                  aria-label="Claude Max usage"
                  aria-valuenow={queueStats.session.requestsThisSession}
                  aria-valuemin={0}
                  aria-valuemax={45}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: `conic-gradient(#667eea ${(queueStats.session.requestsThisSession / 45) * 100}%, #E2E8F0 0%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.625rem',
                    fontWeight: '600',
                    color: '#667eea',
                  }}>
                    {queueStats.session.requestsThisSession}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>Claude Max</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1A1A2E' }}>
                    Reset in {queueStats.session.timeRemaining || '5h 0m'}
                  </div>
                </div>
              </div>

              <div style={{
                padding: '0.75rem 1rem',
                background: '#F1F5F9',
                borderRadius: '8px',
              }}>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>Job Queue</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1A1A2E' }}>
                  PENDING: {queueStats.queue.pending}
                </div>
              </div>

              <button
                onClick={handleLogout}
                aria-label="Logout from NovelForge"
                style={{
                  padding: '0.75rem 1rem',
                  background: '#F1F5F9',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#64748B',
                  transition: 'all 0.2s',
                }}
              >
                <span aria-hidden="true">🚪</span>
                Logout
              </button>
            </div>
          )}
        </header>

        {/* Content Area */}
        <div
          role="main"
          style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
          {/* Error Message */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '1rem 1.5rem',
                marginBottom: '1.5rem',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
              <span aria-hidden="true">⚠️</span>
              {error}
            </div>
          )}

          {/* New Project Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#374151',
              margin: 0,
            }}>
              Your Projects ({projects.length})
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link
                href="/saved-concepts"
                aria-label="View saved story concepts"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  minHeight: '44px',
                  background: '#FFFFFF',
                  color: '#1A1A2E',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid #667eea';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                <span aria-hidden="true">💡</span>
                Saved Concepts
              </Link>
              <Link
                href="/new"
                aria-label="Create a new novel project"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  minHeight: '44px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  boxShadow: '0 4px 14px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid #667eea';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                <span aria-hidden="true">+</span>
                New Novel
              </Link>
            </div>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <div
              role="status"
              aria-label="No projects found"
              style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '2px dashed #E2E8F0',
              }}>
              <div
                aria-hidden="true"
                style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 1.5rem',
                  background: '#F1F5F9',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                }}>
                📖
              </div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1A1A2E',
                marginBottom: '0.5rem',
              }}>
                No Projects Yet
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#475569',
                marginBottom: '1.5rem',
                maxWidth: '300px',
                margin: '0 auto 1.5rem',
              }}>
                Start by creating your first novel. Choose a genre, build characters, and let AI write your story.
              </p>
              <Link
                href="/new"
                aria-label="Create your first novel project"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.875rem 1.5rem',
                  minHeight: '44px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid #667eea';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                Create Your First Novel
              </Link>
            </div>
          ) : (
            <div
              role="list"
              aria-label="Your novel projects"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1rem',
              }}>
              {projects.map(project => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  role="listitem"
                  aria-label={`Open project: ${project.title}`}
                  style={{
                    display: 'block',
                    padding: '1.5rem',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = '2px solid #667eea';
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '1rem',
                  }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#1A1A2E',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      {project.title}
                      {/* Generation Status Indicator */}
                      {project.progress?.generationStatus === 'generating' && (
                        <span
                          aria-label="Currently generating"
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#F59E0B',
                            animation: 'pulse 1.5s ease-in-out infinite',
                          }}
                          title="Currently generating chapters..."
                        />
                      )}
                      {project.progress?.generationStatus === 'completed' && project.progress?.chaptersWritten > 0 && (
                        <span
                          aria-label="Generation complete"
                          style={{ fontSize: '0.875rem' }}
                          title={`${project.progress.chaptersWritten} chapters written`}
                        >
                          ✅
                        </span>
                      )}
                    </h3>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: `${getStatusColor(project.status)}15`,
                      color: getStatusColor(project.status),
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      textTransform: 'capitalize',
                    }}>
                      {project.status}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    fontSize: '0.813rem',
                    color: '#475569',
                    marginBottom: '0.75rem',
                  }}>
                    <span
                      aria-label={`Genre: ${project.genre}`}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#F1F5F9',
                        borderRadius: '4px',
                      }}>
                      {project.genre}
                    </span>
                    <span
                      aria-label={`Type: ${project.type}`}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#F1F5F9',
                        borderRadius: '4px',
                        textTransform: 'capitalize',
                      }}>
                      {project.type}
                    </span>
                  </div>

                  {/* Progress Stats */}
                  {project.progress && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      fontSize: '0.75rem',
                      marginBottom: '0.75rem',
                    }}>
                      <span
                        aria-label={`${project.progress.characters} characters`}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: project.progress.characters > 0 ? '#ECFDF5' : '#FEF2F2',
                          color: project.progress.characters > 0 ? '#047857' : '#991B1B',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}>
                        <span aria-hidden="true">👥</span>
                        {project.progress.characters}
                      </span>
                      <span
                        aria-label={`${project.progress.worldElements} world elements`}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: project.progress.worldElements > 0 ? '#ECFDF5' : '#FEF2F2',
                          color: project.progress.worldElements > 0 ? '#047857' : '#991B1B',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}>
                        <span aria-hidden="true">🌍</span>
                        {project.progress.worldElements}
                      </span>
                      <span
                        aria-label={`${project.progress.plotLayers} plot layers`}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: project.progress.plotLayers > 0 ? '#ECFDF5' : '#FEF2F2',
                          color: project.progress.plotLayers > 0 ? '#047857' : '#991B1B',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}>
                        <span aria-hidden="true">📖</span>
                        {project.progress.plotLayers}
                      </span>
                      <span
                        aria-label={project.progress.hasOutline ? `Outline: ${project.progress.outlineChapters} chapters` : 'No outline'}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: project.progress.hasOutline ? '#ECFDF5' : '#FEF2F2',
                          color: project.progress.hasOutline ? '#047857' : '#991B1B',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}>
                        <span aria-hidden="true">📝</span>
                        {project.progress.hasOutline ? project.progress.outlineChapters : '—'}
                      </span>
                      <span
                        aria-label={`${project.progress.chaptersWritten} chapters written`}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: project.progress.chaptersWritten > 0 ? '#ECFDF5' : '#FEF2F2',
                          color: project.progress.chaptersWritten > 0 ? '#047857' : '#991B1B',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}>
                        <span aria-hidden="true">📚</span>
                        {project.progress.chaptersWritten}
                      </span>
                    </div>
                  )}

                  {/* Metrics Display */}
                  {project.metrics && (project.metrics.content.chapters > 0 || project.metrics.cost.usd !== '$0.00') && (
                    <div style={{
                      padding: '0.75rem',
                      background: '#F8FAFC',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      marginBottom: '0.75rem',
                    }}>
                      {/* Content Metrics */}
                      {project.metrics.content.chapters > 0 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: '#475569',
                          marginBottom: '0.5rem',
                        }}>
                          <span style={{ fontSize: '0.875rem' }}>📚</span>
                          <span style={{ fontWeight: '500' }}>{project.metrics.content.display}</span>
                        </div>
                      )}

                      {/* Reading Time */}
                      {project.metrics.reading.minutes > 0 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: '#475569',
                          marginBottom: '0.5rem',
                        }}>
                          <span style={{ fontSize: '0.875rem' }}>⏱️</span>
                          <span>{project.metrics.reading.display}</span>
                        </div>
                      )}

                      {/* Token Usage */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#64748B',
                        marginBottom: '0.25rem',
                      }}>
                        <span style={{ fontSize: '0.875rem' }}>🔢</span>
                        <span>Tokens: {project.metrics.tokens.display}</span>
                      </div>

                      {/* Cost */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#667eea',
                        fontWeight: '600',
                      }}>
                        <span style={{ fontSize: '0.875rem' }}>💰</span>
                        <span>Cost: {project.metrics.cost.display}</span>
                      </div>
                    </div>
                  )}

                  <div style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #F1F5F9',
                    fontSize: '0.75rem',
                    color: '#64748B',
                  }}>
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
