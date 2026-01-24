'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ExportButtons from '../../components/ExportButtons';

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
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}`);
      if (!response.ok) {
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

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            width: '50px',
            height: '50px',
            border: '4px solid rgba(102, 126, 234, 0.3)',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '1rem', color: '#888' }}>Loading project...</p>
        </div>
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
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '600px',
          textAlign: 'center',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ef4444' }}>
            Error Loading Project
          </h2>
          <p style={{ color: '#888', marginBottom: '2rem' }}>
            {error || 'Project not found'}
          </p>
          <a
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
          </a>
        </div>
      </div>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {project.title}
          </h1>
          <div style={{
            display: 'flex',
            gap: '1rem',
            fontSize: '1rem',
            color: '#888',
            alignItems: 'center'
          }}>
            <span>{project.genre}</span>
            <span>•</span>
            <span style={{ textTransform: 'capitalize' }}>{project.type}</span>
            <span>•</span>
            <span style={{
              padding: '0.25rem 0.75rem',
              background: 'rgba(102, 126, 234, 0.2)',
              border: '1px solid rgba(102, 126, 234, 0.5)',
              borderRadius: '4px',
              color: '#667eea',
              fontSize: '0.875rem',
              textTransform: 'capitalize'
            }}>
              {project.status}
            </span>
          </div>
        </div>

        {/* Project Details */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ededed' }}>
            Project Details
          </h2>
          <div style={{ display: 'grid', gap: '1rem', color: '#888' }}>
            <div>
              <strong style={{ color: '#ededed' }}>Created:</strong>{' '}
              {new Date(project.created_at).toLocaleString()}
            </div>
            <div>
              <strong style={{ color: '#ededed' }}>Last Updated:</strong>{' '}
              {new Date(project.updated_at).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Story DNA Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '1rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ededed' }}>
            Story DNA
          </h2>
          {project.story_dna ? (
            <div style={{ display: 'grid', gap: '1rem', color: '#888' }}>
              <div>
                <strong style={{ color: '#ededed' }}>Tone:</strong> {project.story_dna.tone}
              </div>
              <div>
                <strong style={{ color: '#ededed' }}>Themes:</strong> {project.story_dna.themes?.join(', ')}
              </div>
              <div>
                <strong style={{ color: '#ededed' }}>Point of View:</strong> {project.story_dna.proseStyle?.pointOfView}
              </div>
            </div>
          ) : (
            <p style={{ color: '#888' }}>Story DNA will be generated when you set up characters.</p>
          )}
        </div>

        {/* Story Bible Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '1rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ededed' }}>
            Story Bible
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{
              padding: '1.5rem',
              background: 'rgba(102, 126, 234, 0.1)',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem', color: '#ededed' }}>
                {project.story_bible?.characters?.length || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#888' }}>Characters</div>
            </div>
            <div style={{
              padding: '1.5rem',
              background: 'rgba(102, 126, 234, 0.1)',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌍</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem', color: '#ededed' }}>
                {project.story_bible?.world?.length || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#888' }}>World Elements</div>
            </div>
          </div>
        </div>

        {/* Export Section (show if project has chapters) */}
        {project.status !== 'setup' && (
          <ExportButtons projectId={project.id} />
        )}

        {/* Next Steps */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '2rem',
          marginTop: '1rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ededed' }}>
            Next Steps
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <a
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
              }}
            >
              {project.story_bible?.characters?.length > 0 ? 'Edit Characters' : 'Generate Characters'} →
            </a>
            {project.story_bible?.characters?.length > 0 && (
              <a
                href={`/projects/${project.id}/world`}
                style={{
                  display: 'block',
                  padding: '1rem',
                  background: project.story_bible?.world?.length > 0
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'rgba(102, 126, 234, 0.5)',
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
              </a>
            )}
            {project.story_bible?.characters?.length > 0 && project.story_bible?.world?.length > 0 && (
              <a
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
              </a>
            )}
          </div>
        </div>

        {/* Back Link */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a
            href="/projects"
            style={{
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '0.875rem'
            }}
          >
            ← Back to Projects
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
