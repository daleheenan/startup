'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ExportButtons from '../../components/ExportButtons';
import { getToken, logout } from '../../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Project {
  id: string;
  title: string;
  type: string;
  genre: string;
  status: string;
  story_dna: any;
  story_bible: any;
  created_at: string;
  updated_at: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
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
        throw new Error('Failed to fetch project');
      }

      const data = await response.json();
      setProject(data);
    } catch (err: any) {
      console.error('Error fetching project:', err);
      setError(err.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
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
          <p style={{ marginTop: '1rem', color: '#64748B' }}>Loading project...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '600px',
          textAlign: 'center',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '12px',
          padding: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#DC2626' }}>
            Error Loading Project
          </h2>
          <p style={{ color: '#64748B', marginBottom: '2rem' }}>
            {error || 'Project not found'}
          </p>
          <Link
            href="/projects"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

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
              {project.title}
            </h1>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              fontSize: '0.875rem',
              color: '#64748B',
              alignItems: 'center',
              marginTop: '0.25rem',
            }}>
              <span>{project.genre}</span>
              <span>•</span>
              <span style={{ textTransform: 'capitalize' }}>{project.type}</span>
              <span>•</span>
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
          </div>
          <Link
            href="/projects"
            style={{
              padding: '0.5rem 1rem',
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            ← Back to Projects
          </Link>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Project Details */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#1A1A2E', fontWeight: 600 }}>
                Project Details
              </h2>
              <div style={{ display: 'grid', gap: '0.75rem', color: '#64748B', fontSize: '0.875rem' }}>
                <div>
                  <strong style={{ color: '#374151' }}>Created:</strong>{' '}
                  {new Date(project.created_at).toLocaleString()}
                </div>
                <div>
                  <strong style={{ color: '#374151' }}>Last Updated:</strong>{' '}
                  {new Date(project.updated_at).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Story DNA Section */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#1A1A2E', fontWeight: 600 }}>
                Story DNA
              </h2>
              {project.story_dna ? (
                <div style={{ display: 'grid', gap: '0.75rem', color: '#64748B', fontSize: '0.875rem' }}>
                  <div>
                    <strong style={{ color: '#374151' }}>Tone:</strong> {project.story_dna.tone}
                  </div>
                  <div>
                    <strong style={{ color: '#374151' }}>Themes:</strong> {project.story_dna.themes?.join(', ')}
                  </div>
                  <div>
                    <strong style={{ color: '#374151' }}>Point of View:</strong> {project.story_dna.proseStyle?.pointOfView}
                  </div>
                </div>
              ) : (
                <p style={{ color: '#64748B', fontSize: '0.875rem' }}>Story DNA will be generated when you set up characters.</p>
              )}
            </div>

            {/* Story Bible Section */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#1A1A2E', fontWeight: 600 }}>
                Story Bible
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{
                  padding: '1.25rem',
                  background: '#EEF2FF',
                  border: '1px solid #C7D2FE',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>👥</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1A1A2E' }}>
                    {project.story_bible?.characters?.length || 0}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748B' }}>Characters</div>
                </div>
                <div style={{
                  padding: '1.25rem',
                  background: '#EEF2FF',
                  border: '1px solid #C7D2FE',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🌍</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1A1A2E' }}>
                    {project.story_bible?.world?.length || 0}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748B' }}>World Elements</div>
                </div>
              </div>
            </div>

            {/* Export Section */}
            {project.status !== 'setup' && (
              <ExportButtons projectId={project.id} />
            )}

            {/* Next Steps */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1.5rem',
              marginTop: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#1A1A2E', fontWeight: 600 }}>
                Next Steps
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link
                  href={`/projects/${project.id}/characters`}
                  style={{
                    display: 'block',
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    textAlign: 'center',
                    textDecoration: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 14px rgba(102, 126, 234, 0.3)',
                  }}
                >
                  {project.story_bible?.characters?.length > 0 ? 'Edit Characters' : 'Generate Characters'} →
                </Link>
                {project.story_bible?.characters?.length > 0 && (
                  <Link
                    href={`/projects/${project.id}/world`}
                    style={{
                      display: 'block',
                      padding: '1rem',
                      background: project.story_bible?.world?.length > 0
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : '#94A3B8',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      textAlign: 'center',
                      textDecoration: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    {project.story_bible?.world?.length > 0 ? 'Edit World' : 'Generate World'} →
                  </Link>
                )}
                {project.story_bible?.characters?.length > 0 && project.story_bible?.world?.length > 0 && (
                  <Link
                    href={`/projects/${project.id}/outline`}
                    style={{
                      display: 'block',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      textAlign: 'center',
                      textDecoration: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    Create Story Outline →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
