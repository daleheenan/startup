'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, logout } from '../../../lib/auth';
import GenerationProgress from '../../../components/GenerationProgress';
import ProjectNavigation from '../../../components/shared/ProjectNavigation';
import { useProjectNavigation } from '../../../hooks/useProjectProgress';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Project {
  id: string;
  title: string;
  story_dna: any;
  story_bible: any;
}

interface Book {
  id: string;
  project_id: string;
  book_number: number;
  title: string;
  status: string;
}

interface SceneCard {
  id: string;
  order: number;
  location: string;
  characters: string[];
  povCharacter: string;
  timeOfDay?: string;
  goal: string;
  conflict: string;
  outcome: string;
  emotionalBeat: string;
  notes?: string;
}

interface ChapterOutline {
  number: number;
  title: string;
  summary: string;
  actNumber: number;
  beatName?: string;
  povCharacter: string;
  wordCountTarget: number;
  scenes: SceneCard[];
}

interface Act {
  number: number;
  name: string;
  description: string;
  beats: any[];
  targetWordCount: number;
  chapters: ChapterOutline[];
}

interface StoryStructure {
  type: string;
  acts: Act[];
}

interface Outline {
  id: string;
  book_id: string;
  structure_type: string;
  structure: StoryStructure;
  total_chapters: number;
  target_word_count: number;
}

interface StructureTemplate {
  type: string;
  name: string;
  description: string;
}

export default function OutlinePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [templates, setTemplates] = useState<StructureTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('save_the_cat');
  const [targetWordCount, setTargetWordCount] = useState(80000);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [generationStep, setGenerationStep] = useState<string>('');

  // IMPORTANT: All hooks must be called before any early returns
  const navigation = useProjectNavigation(projectId, project, outline);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const token = getToken();

      const projectRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!projectRes.ok) {
        if (projectRes.status === 401) {
          logout();
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch project');
      }
      const projectData = await projectRes.json();
      setProject(projectData);

      const booksRes = await fetch(`${API_BASE_URL}/api/books/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const booksData = await booksRes.json();

      if (booksData.books.length === 0) {
        const createBookRes = await fetch(`${API_BASE_URL}/api/books`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId,
            title: projectData.title,
            bookNumber: 1,
          }),
        });
        const newBook = await createBookRes.json();
        setBook(newBook);
      } else {
        setBook(booksData.books[0]);
      }

      const templatesRes = await fetch(`${API_BASE_URL}/api/outlines/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const templatesData = await templatesRes.json();
      setTemplates(templatesData.templates);

      if (booksData.books.length > 0) {
        try {
          const outlineRes = await fetch(`${API_BASE_URL}/api/outlines/book/${booksData.books[0].id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (outlineRes.ok) {
            const outlineData = await outlineRes.json();
            setOutline(outlineData);
          }
        } catch (err) {
          // No outline yet
        }
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateOutline = async () => {
    if (!book || !project) return;

    try {
      setIsGenerating(true);
      setError(null);
      setGenerationStep('Preparing story context...');
      const token = getToken();

      setGenerationStep('Analyzing story structure requirements...');

      const response = await fetch(`${API_BASE_URL}/api/outlines/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          bookId: book.id,
          structureType: selectedTemplate,
          targetWordCount,
          logline: project.title,
          synopsis: '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Failed to generate outline' } }));
        throw new Error(errorData.error?.message || `Failed to generate outline (${response.status})`);
      }

      setGenerationStep('Processing outline structure...');
      const outlineData = await response.json();
      setOutline(outlineData);
    } catch (err: any) {
      console.error('Error generating outline:', err);
      setError(err.message || 'An unexpected error occurred while generating the outline');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const startGeneration = async () => {
    if (!outline) return;

    if (!confirm(`This will create ${outline.total_chapters} chapters and queue them for generation. Continue?`)) {
      return;
    }

    try {
      setIsGenerating(true);
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/outlines/${outline.id}/start-generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to start generation');
      }

      alert('Chapter generation started! Check the queue for progress.');
      router.push(`/projects/${projectId}`);
    } catch (err: any) {
      console.error('Error starting generation:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
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
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ marginTop: '1rem', color: '#64748B' }}>Loading project...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!project || !book) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: '#F8FAFC',
        minHeight: '100vh',
      }}>
        <p style={{ color: '#DC2626' }}>Project or book not found</p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    color: '#1A1A2E',
    fontSize: '1rem',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748B' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
    paddingRight: '2.5rem',
    cursor: 'pointer',
  };

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
              Story Outline
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              {project.title}
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
        <ProjectNavigation projectId={projectId} tabs={navigation.tabs} />

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '1rem 1.5rem',
                marginBottom: '1.5rem',
                color: '#DC2626',
              }}>
                {error}
              </div>
            )}

            {!outline ? (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#1A1A2E', fontWeight: 600 }}>
                  Generate Outline
                </h2>

                {/* Prerequisites Check */}
                {project && !project.story_bible?.characters?.length && (
                  <div style={{
                    background: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                  }}>
                    <p style={{ color: '#92400E', fontSize: '0.875rem', margin: 0, marginBottom: '0.5rem', fontWeight: 600 }}>
                      Missing Required Content
                    </p>
                    <p style={{ color: '#92400E', fontSize: '0.875rem', margin: 0, marginBottom: '0.75rem' }}>
                      Before generating an outline, you need to create characters for your story. This helps the AI create a more personalized and coherent story structure.
                    </p>
                    <Link
                      href={`/projects/${projectId}/characters`}
                      style={{
                        display: 'inline-block',
                        padding: '0.5rem 1rem',
                        background: '#F59E0B',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      }}
                    >
                      Go to Characters →
                    </Link>
                  </div>
                )}

                {/* Structure Template Selector */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}>
                    Story Structure
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    style={selectStyle}
                  >
                    {templates.map((template) => (
                      <option key={template.type} value={template.type}>
                        {template.name} - {template.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Word Count */}
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}>
                    Target Word Count
                  </label>
                  <input
                    type="number"
                    value={targetWordCount}
                    onChange={(e) => setTargetWordCount(parseInt(e.target.value))}
                    min="40000"
                    max="150000"
                    step="1000"
                    style={inputStyle}
                  />
                  <p style={{ marginTop: '0.5rem', color: '#64748B', fontSize: '0.875rem' }}>
                    Approximately {Math.round(targetWordCount / 2200)} chapters
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    onClick={generateOutline}
                    disabled={isGenerating || !project?.story_bible?.characters?.length}
                    title={!project?.story_bible?.characters?.length ? 'Create characters first to generate an outline' : ''}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: (isGenerating || !project?.story_bible?.characters?.length)
                        ? '#94A3B8'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: (isGenerating || !project?.story_bible?.characters?.length) ? 'not-allowed' : 'pointer',
                      boxShadow: (isGenerating || !project?.story_bible?.characters?.length) ? 'none' : '0 4px 14px rgba(102, 126, 234, 0.4)',
                    }}
                  >
                    {isGenerating ? 'Generating Outline...' : 'Generate Outline'}
                  </button>
                  <Link
                    href={`/projects/${projectId}/world`}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      color: '#64748B',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'block',
                    }}
                  >
                    ← Back to World
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Outline Summary */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}>
                    <h2 style={{ fontSize: '1.25rem', color: '#1A1A2E', fontWeight: 600, margin: 0 }}>
                      {templates.find((t) => t.type === outline.structure_type)?.name}
                    </h2>
                    <button
                      onClick={startGeneration}
                      disabled={isGenerating}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      Start Generation
                    </button>
                  </div>
                  <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>
                    {outline.total_chapters} chapters • {outline.target_word_count.toLocaleString()} words target
                  </p>
                </div>

                {/* Acts and Chapters */}
                {(!outline.structure?.acts || outline.structure.acts.length === 0) ? (
                  <div style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center',
                  }}>
                    <p style={{ color: '#DC2626', fontSize: '0.875rem', margin: 0 }}>
                      The outline structure is incomplete. Please try regenerating the outline.
                    </p>
                    <button
                      onClick={() => setOutline(null)}
                      style={{
                        marginTop: '1rem',
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      Regenerate Outline
                    </button>
                  </div>
                ) : outline.structure.acts.map((act) => (
                  <div
                    key={act.number}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      marginBottom: '1.5rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', color: '#1A1A2E', fontWeight: 600 }}>
                      {act.name || `Act ${act.number}`}
                    </h3>
                    <p style={{ color: '#64748B', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{act.description || 'No description'}</p>

                    {/* Chapters in this act */}
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {(!act.chapters || act.chapters.length === 0) ? (
                        <div style={{
                          padding: '1rem',
                          background: '#F8FAFC',
                          borderRadius: '8px',
                          color: '#64748B',
                          fontSize: '0.875rem',
                          textAlign: 'center',
                        }}>
                          No chapters in this act yet
                        </div>
                      ) : act.chapters.map((chapter) => (
                        <div
                          key={chapter.number}
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            padding: '1rem',
                            cursor: 'pointer',
                          }}
                          onClick={() =>
                            setExpandedChapter(
                              expandedChapter === chapter.number ? null : chapter.number
                            )
                          }
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                            <div>
                              <strong style={{ color: '#1A1A2E' }}>
                                Chapter {chapter.number}: {chapter.title}
                              </strong>
                              <p style={{ color: '#64748B', fontSize: '0.813rem', marginTop: '0.25rem', margin: 0 }}>
                                POV: {chapter.povCharacter} • {chapter.wordCountTarget} words
                              </p>
                            </div>
                            <span style={{ color: '#667eea' }}>
                              {expandedChapter === chapter.number ? '▼' : '▶'}
                            </span>
                          </div>

                          {expandedChapter === chapter.number && (
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                              <p style={{ color: '#64748B', marginBottom: '1rem', fontSize: '0.875rem' }}>{chapter.summary || 'No summary'}</p>

                              {/* Scene Cards */}
                              {(!chapter.scenes || chapter.scenes.length === 0) ? (
                                <div style={{
                                  padding: '0.75rem',
                                  background: '#F8FAFC',
                                  borderRadius: '6px',
                                  color: '#64748B',
                                  fontSize: '0.813rem',
                                  textAlign: 'center',
                                }}>
                                  No scenes defined for this chapter
                                </div>
                              ) : chapter.scenes.map((scene) => (
                                <div
                                  key={scene.id}
                                  style={{
                                    background: '#EEF2FF',
                                    border: '1px solid #C7D2FE',
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    marginBottom: '0.5rem',
                                  }}
                                >
                                  <div style={{ fontSize: '0.875rem' }}>
                                    <div style={{ color: '#1A1A2E', fontWeight: 600, marginBottom: '0.5rem' }}>
                                      Scene {scene.order} • {scene.location}
                                    </div>
                                    <div style={{ color: '#64748B', marginBottom: '0.25rem' }}>
                                      <strong>Goal:</strong> {scene.goal}
                                    </div>
                                    <div style={{ color: '#64748B', marginBottom: '0.25rem' }}>
                                      <strong>Conflict:</strong> {scene.conflict}
                                    </div>
                                    <div style={{ color: '#64748B', marginBottom: '0.25rem' }}>
                                      <strong>Outcome:</strong> {scene.outcome}
                                    </div>
                                    <div style={{ color: '#64748B' }}>
                                      <strong>Emotion:</strong> {scene.emotionalBeat}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Generation Progress Modal */}
            <GenerationProgress
              isActive={isGenerating}
              title="Generating Story Outline"
              subtitle={`Creating a ${templates.find(t => t.type === selectedTemplate)?.name || 'structured'} outline`}
              currentStep={generationStep}
              estimatedTime={90}
              error={error}
              targetWordCount={targetWordCount}
              onCancel={() => {
                setIsGenerating(false);
                setError(null);
                setGenerationStep('');
              }}
            />
          </div>
        </div>
      </main>

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
