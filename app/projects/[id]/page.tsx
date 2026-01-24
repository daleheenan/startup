'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ExportButtons from '../../components/ExportButtons';
import PageLayout from '../../components/shared/PageLayout';
import LoadingState from '../../components/shared/LoadingState';
import ErrorMessage from '../../components/shared/ErrorMessage';
import { fetchJson } from '../../lib/fetch-utils';
import { colors, gradients, borderRadius, shadows } from '../../lib/constants';
import { card, statusBadge } from '../../lib/styles';

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
      const data = await fetchJson<Project>(`/api/projects/${projectId}`);
      setProject(data);
    } catch (err: any) {
      console.error('Error fetching project:', err);
      setError(err.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading project..." />;
  }

  if (error || !project) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.background,
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '600px',
          textAlign: 'center',
          background: colors.errorLight,
          border: `1px solid ${colors.errorBorder}`,
          borderRadius: borderRadius.lg,
          padding: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: colors.error }}>
            Error Loading Project
          </h2>
          <p style={{ color: colors.textSecondary, marginBottom: '2rem' }}>
            {error || 'Project not found'}
          </p>
          <Link
            href="/projects"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: gradients.brand,
              border: 'none',
              borderRadius: borderRadius.md,
              color: colors.surface,
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

  const subtitle = (
    <div style={{
      display: 'flex',
      gap: '0.75rem',
      fontSize: '0.875rem',
      color: colors.textSecondary,
      alignItems: 'center',
    }}>
      <span>{project.genre}</span>
      <span>•</span>
      <span style={{ textTransform: 'capitalize' }}>{project.type}</span>
      <span>•</span>
      <span style={statusBadge(project.status)}>
        {project.status}
      </span>
    </div>
  );

  return (
    <PageLayout
      title={project.title}
      subtitle={subtitle as any}
      backLink="/projects"
      backText="← Back to Projects"
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Project Details */}
            <div style={{ ...card, marginBottom: '1rem' }}>
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
            <div style={{ ...card, marginBottom: '1rem' }}>
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
            <div style={{ ...card, marginBottom: '1rem' }}>
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
            <div style={{ ...card, marginTop: '1rem' }}>
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
    </PageLayout>
  );
}
