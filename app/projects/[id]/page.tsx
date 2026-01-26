'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ExportButtons from '../../components/ExportButtons';
import PageLayout from '../../components/shared/PageLayout';
import LoadingState from '../../components/shared/LoadingState';
import ErrorMessage from '../../components/shared/ErrorMessage';
import { fetchJson } from '../../lib/fetch-utils';
import { colors, gradients, borderRadius, shadows } from '../../lib/constants';
import { card, statusBadge } from '../../lib/styles';
import { useProjectNavigation } from '../../hooks/useProjectProgress';

interface StoryConcept {
  title: string;
  logline: string | null;
  synopsis: string | null;
  hook: string | null;
  protagonistHint: string | null;
  conflictType: string | null;
}

interface Project {
  id: string;
  title: string;
  type: string;
  genre: string;
  status: string;
  story_concept: StoryConcept | null;
  story_dna: any;
  story_bible: any;
  series_bible: any;
  book_count: number;
  created_at: string;
  updated_at: string;
}

interface Outline {
  id: string;
  book_id: string;
  structure_type: string;
  structure: any;
  total_chapters: number;
}

interface Chapter {
  id: string;
  book_id: string;
  number: number;
  title: string;
  content?: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<{
    characters: 'pending' | 'generating' | 'done' | 'error';
    world: 'pending' | 'generating' | 'done' | 'error';
    plots: 'pending' | 'generating' | 'done' | 'error';
  }>({ characters: 'pending', world: 'pending', plots: 'pending' });

  // IMPORTANT: All hooks must be called before any early returns
  const navigation = useProjectNavigation(projectId, project, outline, chapters);

  // Track if we've already attempted generation to prevent duplicate runs
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);

  // Check if we're coming from concept selection (forced auto-generation)
  const forceAutoGenerate = searchParams.get('autoGenerate') === 'true';

  const fetchProject = useCallback(async () => {
    try {
      const data = await fetchJson<Project>(`/api/projects/${projectId}`);
      setProject(data);

      // Also fetch outline and chapters for navigation state
      try {
        // Get the first book for this project
        const booksData = await fetchJson<any[]>(`/api/books/project/${projectId}`);
        if (booksData && booksData.length > 0) {
          const bookId = booksData[0].id;

          // Fetch outline
          try {
            const outlineData = await fetchJson<Outline>(`/api/outlines/book/${bookId}`);
            setOutline(outlineData);
          } catch {
            // No outline yet - that's OK
          }

          // Fetch chapters
          try {
            const chaptersData = await fetchJson<Chapter[]>(`/api/chapters/book/${bookId}`);
            setChapters(chaptersData || []);
          } catch {
            // No chapters yet - that's OK
          }
        }
      } catch {
        // No books yet - that's OK
      }

      return data;
    } catch (err: any) {
      console.error('Error fetching project:', err);
      setError(err.message || 'Failed to load project');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Trigger auto-generation when project has a story concept but missing content
  // This now works regardless of whether ?autoGenerate=true is in the URL
  useEffect(() => {
    if (!projectId || hasAttemptedGeneration) return;

    const initializeProject = async () => {
      const projectData = await fetchProject();
      if (!projectData) return;

      // Check if content already exists
      const hasCharacters = projectData.story_bible?.characters?.length > 0;
      const hasWorld = projectData.story_bible?.world?.length > 0;
      const hasStoryConcept = !!(projectData.story_concept?.synopsis || projectData.story_concept?.logline);

      // Only auto-generate if:
      // 1. Forced via URL param, OR
      // 2. Has a story concept but missing characters or world
      const shouldGenerate = forceAutoGenerate || (hasStoryConcept && (!hasCharacters || !hasWorld));

      if (!shouldGenerate) {
        return;
      }

      // Mark that we've attempted generation to prevent re-runs
      setHasAttemptedGeneration(true);

      // If both exist, no need to generate
      if (hasCharacters && hasWorld) {
        return;
      }

      setIsGeneratingContent(true);

      // Build generation context from project data
      const generationContext = {
        title: projectData.title,
        synopsis: projectData.story_concept?.synopsis || '',
        genre: projectData.genre,
        subgenre: projectData.story_dna?.subgenre,
        tone: projectData.story_dna?.tone,
        themes: projectData.story_dna?.themes || [],
      };

      const token = localStorage.getItem('novelforge_token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Generate content in sequence for better UX feedback
      try {
        // Generate characters first
        if (!hasCharacters) {
          setGenerationStatus(prev => ({ ...prev, characters: 'generating' }));
          const charRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}/characters`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ context: generationContext }),
          });
          if (charRes.ok) {
            setGenerationStatus(prev => ({ ...prev, characters: 'done' }));
          } else {
            console.error('Character generation failed:', await charRes.text());
            setGenerationStatus(prev => ({ ...prev, characters: 'error' }));
          }
        } else {
          setGenerationStatus(prev => ({ ...prev, characters: 'done' }));
        }

        // Then generate world
        if (!hasWorld) {
          setGenerationStatus(prev => ({ ...prev, world: 'generating' }));
          const worldRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}/world`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ context: generationContext }),
          });
          if (worldRes.ok) {
            setGenerationStatus(prev => ({ ...prev, world: 'done' }));
          } else {
            console.error('World generation failed:', await worldRes.text());
            setGenerationStatus(prev => ({ ...prev, world: 'error' }));
          }
        } else {
          setGenerationStatus(prev => ({ ...prev, world: 'done' }));
        }

        // Extract plots from concept
        setGenerationStatus(prev => ({ ...prev, plots: 'generating' }));
        const plotRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}/extract-plots-from-concept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            synopsis: projectData.story_concept?.synopsis,
            logline: projectData.story_concept?.logline,
            hook: projectData.story_concept?.hook,
            protagonistHint: projectData.story_concept?.protagonistHint,
            conflictType: projectData.story_concept?.conflictType,
          }),
        });
        if (plotRes.ok) {
          setGenerationStatus(prev => ({ ...prev, plots: 'done' }));
        } else {
          // Don't log error for plot extraction - it's optional
          setGenerationStatus(prev => ({ ...prev, plots: 'error' }));
        }

        // Refresh project data to show updated counts
        await fetchProject();
      } catch (err) {
        console.error('Error generating content:', err);
      } finally {
        setIsGeneratingContent(false);
      }
    };

    initializeProject();
  }, [projectId, forceAutoGenerate, fetchProject, hasAttemptedGeneration]);

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
      projectNavigation={navigation}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Generation Progress Indicator */}
            {isGeneratingContent && (
              <div style={{
                ...card,
                marginBottom: '1.5rem',
                padding: '2rem',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                border: `2px solid ${colors.brandBorder}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: '3px solid #E0E7FF',
                    borderTopColor: '#667eea',
                    animation: 'spin 1s linear infinite',
                  }} />
                  <div>
                    <h2 style={{ fontSize: '1.25rem', color: colors.text, fontWeight: 700, margin: 0 }}>
                      Setting Up Your Project...
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: '0.25rem 0 0 0' }}>
                      This may take a minute or two. Please don't navigate away.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      background: generationStatus.characters === 'done' ? colors.success
                        : generationStatus.characters === 'generating' ? colors.brandStart
                        : generationStatus.characters === 'error' ? colors.error
                        : colors.border,
                      color: generationStatus.characters === 'pending' ? colors.textSecondary : 'white',
                      transition: 'all 0.3s ease',
                    }}>
                      {generationStatus.characters === 'done' ? '✓' : generationStatus.characters === 'generating' ? (
                        <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>•••</span>
                      ) : generationStatus.characters === 'error' ? '!' : '1'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        color: generationStatus.characters === 'generating' ? colors.brandText : colors.text,
                        fontWeight: generationStatus.characters === 'generating' ? 600 : 400,
                        fontSize: '0.9375rem',
                      }}>
                        {generationStatus.characters === 'generating' ? 'Generating characters...' : generationStatus.characters === 'done' ? 'Characters generated' : generationStatus.characters === 'error' ? 'Character generation failed' : 'Generate characters'}
                      </span>
                      {generationStatus.characters === 'generating' && (
                        <div style={{
                          marginTop: '0.5rem',
                          background: '#E0E7FF',
                          borderRadius: '4px',
                          height: '4px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            background: 'linear-gradient(90deg, #667eea, #764ba2)',
                            height: '100%',
                            width: '100%',
                            animation: 'progressPulse 2s ease-in-out infinite',
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      background: generationStatus.world === 'done' ? colors.success
                        : generationStatus.world === 'generating' ? colors.brandStart
                        : generationStatus.world === 'error' ? colors.error
                        : colors.border,
                      color: generationStatus.world === 'pending' ? colors.textSecondary : 'white',
                      transition: 'all 0.3s ease',
                    }}>
                      {generationStatus.world === 'done' ? '✓' : generationStatus.world === 'generating' ? (
                        <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>•••</span>
                      ) : generationStatus.world === 'error' ? '!' : '2'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        color: generationStatus.world === 'generating' ? colors.brandText : colors.text,
                        fontWeight: generationStatus.world === 'generating' ? 600 : 400,
                        fontSize: '0.9375rem',
                      }}>
                        {generationStatus.world === 'generating' ? 'Building world elements...' : generationStatus.world === 'done' ? 'World elements created' : generationStatus.world === 'error' ? 'World generation failed' : 'Build world'}
                      </span>
                      {generationStatus.world === 'generating' && (
                        <div style={{
                          marginTop: '0.5rem',
                          background: '#E0E7FF',
                          borderRadius: '4px',
                          height: '4px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            background: 'linear-gradient(90deg, #667eea, #764ba2)',
                            height: '100%',
                            width: '100%',
                            animation: 'progressPulse 2s ease-in-out infinite',
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      background: generationStatus.plots === 'done' ? colors.success
                        : generationStatus.plots === 'generating' ? colors.brandStart
                        : generationStatus.plots === 'error' ? colors.error
                        : colors.border,
                      color: generationStatus.plots === 'pending' ? colors.textSecondary : 'white',
                      transition: 'all 0.3s ease',
                    }}>
                      {generationStatus.plots === 'done' ? '✓' : generationStatus.plots === 'generating' ? (
                        <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>•••</span>
                      ) : generationStatus.plots === 'error' ? '!' : '3'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        color: generationStatus.plots === 'generating' ? colors.brandText : colors.text,
                        fontWeight: generationStatus.plots === 'generating' ? 600 : 400,
                        fontSize: '0.9375rem',
                      }}>
                        {generationStatus.plots === 'generating' ? 'Extracting plot structure...' : generationStatus.plots === 'done' ? 'Plot structure extracted' : generationStatus.plots === 'error' ? 'Plot extraction failed' : 'Extract plots'}
                      </span>
                      {generationStatus.plots === 'generating' && (
                        <div style={{
                          marginTop: '0.5rem',
                          background: '#E0E7FF',
                          borderRadius: '4px',
                          height: '4px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            background: 'linear-gradient(90deg, #667eea, #764ba2)',
                            height: '100%',
                            width: '100%',
                            animation: 'progressPulse 2s ease-in-out infinite',
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <style jsx>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                  @keyframes pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 1; }
                  }
                  @keyframes progressPulse {
                    0%, 100% { transform: translateX(-100%); }
                    50% { transform: translateX(100%); }
                  }
                `}</style>
              </div>
            )}

            {/* Story Concept Section - Prominent display */}
            {project.story_concept && (project.story_concept.logline || project.story_concept.synopsis) && (
              <div style={{
                ...card,
                marginBottom: '1.5rem',
                padding: '1.5rem',
                background: colors.brandLight,
                border: `2px solid ${colors.brandBorder}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 style={{ fontSize: '1.5rem', color: colors.text, fontWeight: 700, margin: 0 }}>
                    Story Concept
                  </h2>
                  <Link
                    href="/saved-summaries"
                    style={{
                      padding: '0.5rem 1rem',
                      background: colors.surface,
                      border: `1px solid ${colors.brandBorder}`,
                      borderRadius: borderRadius.md,
                      color: colors.brandText,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    View Saved Summaries
                  </Link>
                </div>

                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  {project.story_concept.logline && (
                    <div>
                      <strong style={{
                        color: colors.brandText,
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: 600,
                      }}>
                        Logline
                      </strong>
                      <p style={{
                        margin: 0,
                        fontStyle: 'italic',
                        lineHeight: '1.7',
                        fontSize: '1.125rem',
                        color: colors.text,
                      }}>
                        {project.story_concept.logline}
                      </p>
                    </div>
                  )}

                  {project.story_concept.synopsis && (
                    <div>
                      <strong style={{
                        color: colors.brandText,
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: 600,
                      }}>
                        Synopsis
                      </strong>
                      <p style={{
                        margin: 0,
                        lineHeight: '1.7',
                        fontSize: '0.95rem',
                        color: colors.textSecondary,
                      }}>
                        {project.story_concept.synopsis}
                      </p>
                    </div>
                  )}

                  {project.story_concept.hook && (
                    <div style={{
                      padding: '1rem',
                      background: gradients.brand,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${colors.brandBorder}`,
                    }}>
                      <strong style={{
                        color: colors.surface,
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: 600,
                      }}>
                        Hook
                      </strong>
                      <p style={{
                        margin: 0,
                        lineHeight: '1.6',
                        fontSize: '0.95rem',
                        color: colors.surface,
                      }}>
                        {project.story_concept.hook}
                      </p>
                    </div>
                  )}

                  {(project.story_concept.protagonistHint || project.story_concept.conflictType) && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '1rem',
                      marginTop: '0.5rem',
                    }}>
                      {project.story_concept.protagonistHint && (
                        <div>
                          <strong style={{
                            color: colors.brandText,
                            display: 'block',
                            marginBottom: '0.25rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}>
                            Protagonist
                          </strong>
                          <p style={{
                            margin: 0,
                            lineHeight: '1.5',
                            fontSize: '0.875rem',
                            color: colors.textSecondary,
                          }}>
                            {project.story_concept.protagonistHint}
                          </p>
                        </div>
                      )}
                      {project.story_concept.conflictType && (
                        <div>
                          <strong style={{
                            color: colors.brandText,
                            display: 'block',
                            marginBottom: '0.25rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}>
                            Core Conflict
                          </strong>
                          <p style={{
                            margin: 0,
                            lineHeight: '1.5',
                            fontSize: '0.875rem',
                            color: colors.textSecondary,
                          }}>
                            {project.story_concept.conflictType}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Links - show when no story concept */}
            {(!project.story_concept || (!project.story_concept.logline && !project.story_concept.synopsis)) && (
              <div style={{ ...card, marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '1.125rem', color: '#1A1A2E', fontWeight: 600, margin: 0 }}>
                      Story Resources
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: '0.25rem 0 0 0' }}>
                      Access your saved concepts and ideas
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link
                      href="/saved-summaries"
                      style={{
                        padding: '0.5rem 1rem',
                        background: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: borderRadius.md,
                        color: colors.brandStart,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textDecoration: 'none',
                      }}
                    >
                      Saved Summaries
                    </Link>
                    <Link
                      href="/saved-concepts"
                      style={{
                        padding: '0.5rem 1rem',
                        background: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: borderRadius.md,
                        color: colors.brandStart,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textDecoration: 'none',
                      }}
                    >
                      Saved Concepts
                    </Link>
                  </div>
                </div>
              </div>
            )}

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
                {(project.type === 'trilogy' || (project.book_count && project.book_count > 1)) && (
                  <Link
                    href={`/projects/${project.id}/series`}
                    style={{
                      display: 'block',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      textAlign: 'center',
                      textDecoration: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    Series Management {project.series_bible ? '✓' : ''} →
                  </Link>
                )}
                {project.story_bible?.characters?.length > 0 && (
                  <Link
                    href={`/projects/${project.id}/plot`}
                    style={{
                      display: 'block',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      textAlign: 'center',
                      textDecoration: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    Plot Structure & Timeline →
                  </Link>
                )}
              </div>
            </div>
      </div>
    </PageLayout>
  );
}
