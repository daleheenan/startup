'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

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

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Fetch project
      const projectRes = await fetch(`http://localhost:3001/api/projects/${projectId}`);
      const projectData = await projectRes.json();
      setProject(projectData);

      // Fetch or create book for this project
      const booksRes = await fetch(
        `http://localhost:3001/api/books/project/${projectId}`
      );
      const booksData = await booksRes.json();

      if (booksData.books.length === 0) {
        // Create first book
        const createBookRes = await fetch('http://localhost:3001/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

      // Fetch structure templates
      const templatesRes = await fetch('http://localhost:3001/api/outlines/templates');
      const templatesData = await templatesRes.json();
      setTemplates(templatesData.templates);

      // Try to fetch existing outline
      if (booksData.books.length > 0) {
        try {
          const outlineRes = await fetch(
            `http://localhost:3001/api/outlines/book/${booksData.books[0].id}`
          );
          if (outlineRes.ok) {
            const outlineData = await outlineRes.json();
            setOutline(outlineData);
          }
        } catch (err) {
          // No outline yet, that's okay
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

      const response = await fetch('http://localhost:3001/api/outlines/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error('Failed to generate outline');
      }

      const outlineData = await response.json();
      setOutline(outlineData);
    } catch (err: any) {
      console.error('Error generating outline:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const startGeneration = async () => {
    if (!outline) return;

    if (
      !confirm(
        `This will create ${outline.total_chapters} chapters and queue them for generation. Continue?`
      )
    ) {
      return;
    }

    try {
      setIsGenerating(true);
      const response = await fetch(
        `http://localhost:3001/api/outlines/${outline.id}/start-generation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

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
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              width: '50px',
              height: '50px',
              border: '4px solid rgba(102, 126, 234, 0.3)',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ marginTop: '1rem', color: '#888' }}>Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project || !book) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>Project or book not found</p>
      </div>
    );
  }

  return (
    <main style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: '2.5rem',
              marginBottom: '0.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Story Outline
          </h1>
          <p style={{ color: '#888' }}>{project.title}</p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '2rem',
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        )}

        {!outline ? (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem',
            }}
          >
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#ededed' }}>
              Generate Outline
            </h2>

            {/* Structure Template Selector */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#ededed',
                  fontWeight: 600,
                }}
              >
                Story Structure
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#ededed',
                  fontSize: '1rem',
                }}
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
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#ededed',
                  fontWeight: 600,
                }}
              >
                Target Word Count
              </label>
              <input
                type="number"
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(parseInt(e.target.value))}
                min="40000"
                max="150000"
                step="1000"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#ededed',
                  fontSize: '1rem',
                }}
              />
              <p style={{ marginTop: '0.5rem', color: '#888', fontSize: '0.875rem' }}>
                Approximately {Math.round(targetWordCount / 2200)} chapters
              </p>
            </div>

            <button
              onClick={generateOutline}
              disabled={isGenerating}
              style={{
                width: '100%',
                padding: '1rem',
                background: isGenerating
                  ? 'rgba(102, 126, 234, 0.5)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
              }}
            >
              {isGenerating ? 'Generating Outline...' : 'Generate Outline'}
            </button>
          </div>
        ) : (
          <>
            {/* Outline Summary */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '2rem',
                marginBottom: '2rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <h2 style={{ fontSize: '1.5rem', color: '#ededed' }}>
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
                  }}
                >
                  Start Generation
                </button>
              </div>
              <p style={{ color: '#888' }}>
                {outline.total_chapters} chapters • {outline.target_word_count.toLocaleString()}{' '}
                words target
              </p>
            </div>

            {/* Acts and Chapters */}
            {outline.structure.acts.map((act) => (
              <div
                key={act.number}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '2rem',
                  marginBottom: '2rem',
                }}
              >
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#ededed' }}>
                  {act.name}
                </h3>
                <p style={{ color: '#888', marginBottom: '1.5rem' }}>{act.description}</p>

                {/* Chapters in this act */}
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {act.chapters.map((chapter) => (
                    <div
                      key={chapter.number}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
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
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#ededed' }}>
                            Chapter {chapter.number}: {chapter.title}
                          </strong>
                          <p style={{ color: '#888', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            POV: {chapter.povCharacter} • {chapter.wordCountTarget} words
                          </p>
                        </div>
                        <span style={{ color: '#667eea' }}>
                          {expandedChapter === chapter.number ? '▼' : '▶'}
                        </span>
                      </div>

                      {expandedChapter === chapter.number && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <p style={{ color: '#888', marginBottom: '1rem' }}>{chapter.summary}</p>

                          {/* Scene Cards */}
                          {chapter.scenes.map((scene) => (
                            <div
                              key={scene.id}
                              style={{
                                background: 'rgba(102, 126, 234, 0.1)',
                                border: '1px solid rgba(102, 126, 234, 0.3)',
                                borderRadius: '6px',
                                padding: '0.75rem',
                                marginBottom: '0.5rem',
                              }}
                            >
                              <div style={{ fontSize: '0.875rem' }}>
                                <div style={{ color: '#ededed', fontWeight: 600, marginBottom: '0.5rem' }}>
                                  Scene {scene.order} • {scene.location}
                                </div>
                                <div style={{ color: '#888', marginBottom: '0.25rem' }}>
                                  <strong>Goal:</strong> {scene.goal}
                                </div>
                                <div style={{ color: '#888', marginBottom: '0.25rem' }}>
                                  <strong>Conflict:</strong> {scene.conflict}
                                </div>
                                <div style={{ color: '#888', marginBottom: '0.25rem' }}>
                                  <strong>Outcome:</strong> {scene.outcome}
                                </div>
                                <div style={{ color: '#888' }}>
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

        {/* Back Link */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a
            href={`/projects/${projectId}`}
            style={{
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            ← Back to Project
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
