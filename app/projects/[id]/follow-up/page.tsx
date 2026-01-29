'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getToken, logout } from '../../../lib/auth';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import ProjectNavigation from '../../../components/shared/ProjectNavigation';
import { useProjectNavigation } from '@/app/hooks';
import type {
  FollowUpRecommendations,
  SequelIdea,
  UnresolvedThread,
  CharacterContinuation,
  WorldExpansion,
  SeriesArcSuggestion,
  ToneVariation,
} from '../../../../shared/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Book {
  id: string;
  title: string;
  book_number: number;
  is_complete: number;
}

interface CompletionStatus {
  isComplete: boolean;
  completedChapters: number;
  totalChapters: number;
  totalWordCount: number;
}

export default function FollowUpPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<FollowUpRecommendations | null>(null);
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('sequel-ideas');
  const [project, setProject] = useState<any>(null);

  const navigation = useProjectNavigation(projectId, project);

  useEffect(() => {
    if (projectId) {
      fetchBooks();
      fetchProject();
    }
  }, [projectId]);

  // Track if we've triggered auto-generation to avoid multiple triggers
  const [autoGenerateTriggered, setAutoGenerateTriggered] = useState(false);

  useEffect(() => {
    if (selectedBookId) {
      fetchCompletionStatus();
      fetchRecommendationsAndAutoGenerate();
    }
  }, [selectedBookId]);

  // Fetch recommendations and auto-trigger generation if book is complete and no recommendations exist
  const fetchRecommendationsAndAutoGenerate = async () => {
    if (!selectedBookId) return;

    try {
      const token = getToken();

      // First check completion status
      const statusResponse = await fetch(`${API_BASE_URL}/api/completion/book/${selectedBookId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      let isBookComplete = false;
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        isBookComplete = statusData.isComplete;
        setCompletionStatus(statusData);
      }

      // Now fetch recommendations
      const response = await fetch(`${API_BASE_URL}/api/completion/book/${selectedBookId}/follow-up`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);

        // If currently generating, start polling
        if (data.status === 'generating') {
          setGenerating(true);
          pollForRecommendations();
        }
      } else if (response.status === 404) {
        // No recommendations exist - auto-trigger if book is complete and we haven't already triggered
        setRecommendations(null);
        if (isBookComplete && !autoGenerateTriggered) {
          setAutoGenerateTriggered(true);
          // Delay slightly to let UI render first
          setTimeout(() => {
            handleGenerateRecommendations();
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

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

  const fetchBooks = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/books/project/${projectId}`, {
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
        throw new Error('Failed to fetch books');
      }

      const data = await response.json();
      setBooks(data.books || []);

      // Select first completed book, or first book
      const completedBook = data.books?.find((b: Book) => b.is_complete);
      if (completedBook) {
        setSelectedBookId(completedBook.id);
      } else if (data.books?.length > 0) {
        setSelectedBookId(data.books[0].id);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletionStatus = async () => {
    if (!selectedBookId) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/completion/book/${selectedBookId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCompletionStatus(data);
      }
    } catch (error) {
      console.error('Error fetching completion status:', error);
    }
  };

  const fetchRecommendations = async () => {
    if (!selectedBookId) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/completion/book/${selectedBookId}/follow-up`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      } else if (response.status === 404) {
        setRecommendations(null);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!selectedBookId) return;

    setGenerating(true);
    setGenerateError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/completion/book/${selectedBookId}/follow-up/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Start polling for results
        pollForRecommendations();
      } else {
        const error = await response.json();
        console.error('Error response from follow-up generate:', error);
        const errorMsg = error.error || error.message || 'Failed to generate recommendations';
        setGenerateError(errorMsg);
        setGenerating(false);
      }
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      setGenerateError(error.message || 'Failed to generate recommendations. Please try again.');
      setGenerating(false);
    }
  };

  const pollForRecommendations = () => {
    const pollInterval = setInterval(async () => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/completion/book/${selectedBookId}/follow-up`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setRecommendations(data);

          // Stop polling when generation is complete or failed
          if (data.status === 'completed') {
            clearInterval(pollInterval);
            setGenerating(false);
            setGenerateError(null);
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            setGenerating(false);
            setGenerateError(data.error || 'Generation failed. Please try again.');
          }
        }
      } catch (error: any) {
        console.error('Error polling for recommendations:', error);
        // Don't set error on polling failure - it will retry
      }
    }, 10000); // Poll every 10 seconds

    // Stop polling after 5 minutes maximum
    setTimeout(() => {
      clearInterval(pollInterval);
      if (generating) {
        setGenerating(false);
        setGenerateError('Generation timed out. Please try again.');
      }
    }, 300000);
  };

  const sections = [
    { id: 'sequel-ideas', label: 'Sequel Ideas', icon: '📖' },
    { id: 'unresolved-threads', label: 'Unresolved Threads', icon: '🧵' },
    { id: 'character-arcs', label: 'Character Arcs', icon: '👥' },
    { id: 'world-expansion', label: 'World Expansion', icon: '🌍' },
    { id: 'series-structure', label: 'Series Structure', icon: '📚' },
    { id: 'tone-variations', label: 'Tone Variations', icon: '🎭' },
  ];

  return (
    <DashboardLayout
      header={{ title: 'Follow-Up Ideas', subtitle: `${project?.title || 'Loading...'} - Sequel and Series Recommendations` }}
    >
      <ProjectNavigation
        projectId={projectId}
        project={navigation.project}
        outline={navigation.outline}
        chapters={navigation.chapters}
      />

      {/* Book Selector */}
      {books.length > 1 && (
        <div style={{ padding: '1rem 0', borderBottom: '1px solid #E2E8F0' }}>
          <select
            value={selectedBookId || ''}
            onChange={(e) => setSelectedBookId(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              background: 'white',
            }}
          >
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title || `Book ${book.book_number}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content Area */}
      <div style={{ display: 'flex', minHeight: '500px' }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Loading...
            </div>
          ) : !completionStatus?.isComplete ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '2rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Book Not Complete</h2>
              <p style={{ color: '#64748B', textAlign: 'center', maxWidth: '400px' }}>
                To generate follow-up recommendations, all chapters must be written.
                Currently {completionStatus?.completedChapters || 0} of {completionStatus?.totalChapters || 0} chapters are complete.
              </p>
              <Link
                href={`/projects/${projectId}/progress`}
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                }}
              >
                Continue Writing
              </Link>
            </div>
          ) : (
            <>
              {/* Section Tabs */}
              <aside style={{
                width: '200px',
                background: '#FFFFFF',
                borderRight: '1px solid #E2E8F0',
                padding: '1rem',
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={handleGenerateRecommendations}
                    disabled={generating || recommendations?.status === 'generating'}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: generating || recommendations?.status === 'generating'
                        ? '#94A3B8'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: generating ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    {generating || recommendations?.status === 'generating'
                      ? 'Generating...'
                      : recommendations?.status === 'completed'
                        ? 'Regenerate Ideas'
                        : 'Generate Ideas'}
                  </button>
                </div>

                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      marginBottom: '4px',
                      background: activeSection === section.id ? '#F1F5F9' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontWeight: activeSection === section.id ? '600' : '400',
                      color: activeSection === section.id ? '#1E293B' : '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>{section.icon}</span>
                    <span>{section.label}</span>
                  </button>
                ))}
              </aside>

              {/* Main Content */}
              <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
                {/* Error Display */}
                {generateError && (
                  <div style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    padding: '1rem 1.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: '#991B1B', fontSize: '0.875rem', fontWeight: 600 }}>
                        Generation Failed
                      </h4>
                      <p style={{ margin: 0, color: '#B91C1C', fontSize: '0.875rem' }}>
                        {generateError}
                      </p>
                      <button
                        onClick={() => setGenerateError(null)}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.25rem 0.75rem',
                          background: 'transparent',
                          border: '1px solid #FECACA',
                          borderRadius: '4px',
                          color: '#B91C1C',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {!recommendations || recommendations.status !== 'completed' ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    {generating ? (
                      <>
                        <div style={{
                          display: 'inline-block',
                          width: '48px',
                          height: '48px',
                          border: '3px solid #E2E8F0',
                          borderTopColor: '#667eea',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          marginBottom: '1rem',
                        }} />
                        <h3>Generating Recommendations...</h3>
                        <p style={{ color: '#64748B' }}>
                          Analysing your completed book and generating follow-up ideas.
                          This may take a few moments.
                        </p>
                      </>
                    ) : recommendations?.status === 'failed' ? (
                      <>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
                        <h3>Generation Failed</h3>
                        <p style={{ color: '#64748B', marginBottom: '1rem' }}>
                          {recommendations.error || 'Something went wrong while generating recommendations.'}
                        </p>
                        <button
                          onClick={handleGenerateRecommendations}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Try Again
                        </button>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚀</div>
                        <h3>No Recommendations Yet</h3>
                        <p style={{ color: '#64748B' }}>
                          Click "Generate Ideas" to create sequel concepts, series arcs, and more.
                        </p>
                      </>
                    )}
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                ) : (
                  <>
                    {activeSection === 'sequel-ideas' && (
                      <SequelIdeasSection ideas={recommendations.sequelIdeas} />
                    )}
                    {activeSection === 'unresolved-threads' && (
                      <UnresolvedThreadsSection threads={recommendations.unresolvedThreads} />
                    )}
                    {activeSection === 'character-arcs' && (
                      <CharacterArcsSection continuations={recommendations.characterContinuations} />
                    )}
                    {activeSection === 'world-expansion' && (
                      <WorldExpansionSection expansions={recommendations.worldExpansions} />
                    )}
                    {activeSection === 'series-structure' && (
                      <SeriesStructureSection structure={recommendations.seriesStructure} />
                    )}
                    {activeSection === 'tone-variations' && (
                      <ToneVariationsSection variations={recommendations.toneVariations} />
                    )}
                  </>
                )}
              </div>
            </>
          )}
      </div>
    </DashboardLayout>
  );
}

// Section Components

function SequelIdeasSection({ ideas }: { ideas: SequelIdea[] }) {
  if (!ideas || ideas.length === 0) {
    return <EmptySection message="No sequel ideas generated yet." />;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Sequel Story Ideas</h2>
      <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
        Potential directions for continuing your story based on established characters, world, and themes.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {ideas.map((idea, index) => (
          <div key={index} style={{ background: '#FFFFFF', borderRadius: '8px', padding: '1.5rem', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1E293B' }}>{idea.title}</h3>
            <p style={{ fontStyle: 'italic', color: '#6366F1', marginBottom: '1rem' }}>{idea.logline}</p>
            <p style={{ color: '#475569', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>{idea.synopsis}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <strong style={{ fontSize: '0.875rem', color: '#64748B' }}>Main Conflict:</strong>
                <p style={{ margin: '0.25rem 0 0', color: '#1E293B' }}>{idea.mainConflict}</p>
              </div>
              <div>
                <strong style={{ fontSize: '0.875rem', color: '#64748B' }}>Themes:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {idea.potentialThemes?.map((theme, i) => (
                    <span key={i} style={{ padding: '4px 8px', background: '#F1F5F9', borderRadius: '4px', fontSize: '0.75rem' }}>
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {idea.continuityNotes && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#F8FAFC', borderRadius: '4px' }}>
                <strong style={{ fontSize: '0.75rem', color: '#64748B' }}>Continuity Notes:</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#475569' }}>{idea.continuityNotes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UnresolvedThreadsSection({ threads }: { threads: UnresolvedThread[] }) {
  if (!threads || threads.length === 0) {
    return <EmptySection message="No unresolved threads identified." />;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Unresolved Plot Threads</h2>
      <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
        Story elements that could be expanded or resolved in future instalments.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {threads.map((thread, index) => (
          <div key={index} style={{ background: '#FFFFFF', borderRadius: '8px', padding: '1.5rem', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🧵</span>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1E293B' }}>{thread.thread}</h4>
                <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 0.5rem' }}>
                  Introduced in Chapter {thread.introduction?.chapter}: {thread.introduction?.context}
                </p>
                <div style={{ marginTop: '1rem' }}>
                  <strong style={{ fontSize: '0.75rem', color: '#64748B' }}>Expansion Potential:</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#475569' }}>{thread.expansionPotential}</p>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <strong style={{ fontSize: '0.75rem', color: '#64748B' }}>Suggested Resolution:</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#475569' }}>{thread.suggestedResolution}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CharacterArcsSection({ continuations }: { continuations: CharacterContinuation[] }) {
  if (!continuations || continuations.length === 0) {
    return <EmptySection message="No character continuations generated." />;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Character Arc Continuations</h2>
      <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
        Potential development paths for your characters in future stories.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
        {continuations.map((char, index) => (
          <div key={index} style={{ background: '#FFFFFF', borderRadius: '8px', padding: '1.5rem', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>👤</span> {char.characterName}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 1rem' }}>
              <em>Current State:</em> {char.currentState}
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ fontSize: '0.75rem', color: '#64748B' }}>Potential Arcs:</strong>
              <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                {char.potentialArcs?.map((arc, i) => (
                  <li key={i} style={{ color: '#475569', marginBottom: '0.25rem' }}>{arc}</li>
                ))}
              </ul>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ fontSize: '0.75rem', color: '#64748B' }}>Relationship Developments:</strong>
              <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                {char.relationshipDevelopments?.map((rel, i) => (
                  <li key={i} style={{ color: '#475569', marginBottom: '0.25rem' }}>{rel}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong style={{ fontSize: '0.75rem', color: '#64748B' }}>Growth Opportunities:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                {char.growthOpportunities?.map((opp, i) => (
                  <span key={i} style={{ padding: '4px 8px', background: '#ECFDF5', borderRadius: '4px', fontSize: '0.75rem', color: '#059669' }}>
                    {opp}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorldExpansionSection({ expansions }: { expansions: WorldExpansion[] }) {
  if (!expansions || expansions.length === 0) {
    return <EmptySection message="No world expansions identified." />;
  }

  const typeIcons: Record<string, string> = {
    location: '📍',
    culture: '🎭',
    history: '📜',
    magic_system: '✨',
    technology: '⚙️',
    faction: '⚔️',
    other: '🔮',
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>World Expansion Ideas</h2>
      <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
        Unexplored aspects of your world that could be developed in future stories.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {expansions.map((exp, index) => (
          <div key={index} style={{ background: '#FFFFFF', borderRadius: '8px', padding: '1.5rem', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>{typeIcons[exp.type] || '🔮'}</span>
              <span style={{ fontSize: '0.75rem', color: '#6366F1', textTransform: 'uppercase', fontWeight: '600' }}>
                {exp.type.replace('_', ' ')}
              </span>
            </div>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#1E293B' }}>{exp.element}</h4>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ fontSize: '0.75rem', color: '#64748B' }}>Exploration Ideas:</strong>
              <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                {exp.explorationIdeas?.map((idea, i) => (
                  <li key={i} style={{ color: '#475569', marginBottom: '0.25rem' }}>{idea}</li>
                ))}
              </ul>
            </div>
            <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '4px' }}>
              <strong style={{ fontSize: '0.75rem', color: '#64748B' }}>Story Potential:</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#475569' }}>{exp.storyPotential}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeriesStructureSection({ structure }: { structure: SeriesArcSuggestion | null }) {
  if (!structure) {
    return <EmptySection message="No series structure generated." />;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Series Arc Structure</h2>
      <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
        A suggested multi-book structure building on your completed story.
      </p>

      <div style={{ background: '#FFFFFF', borderRadius: '8px', padding: '1.5rem', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>📚</span>
          <h3 style={{ margin: 0, color: '#1E293B' }}>
            {structure.structureType === 'trilogy' ? 'Trilogy' :
              structure.structureType === 'five_book' ? 'Five-Book Series' : 'Ongoing Series'}
          </h3>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <strong style={{ fontSize: '0.875rem', color: '#64748B' }}>Overall Arc:</strong>
          <p style={{ margin: '0.25rem 0 0', color: '#1E293B' }}>{structure.overallArc}</p>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <strong style={{ fontSize: '0.875rem', color: '#64748B' }}>Central Conflict:</strong>
          <p style={{ margin: '0.25rem 0 0', color: '#1E293B' }}>{structure.centralConflict}</p>
        </div>

        <div>
          <strong style={{ fontSize: '0.875rem', color: '#64748B' }}>Thematic Progression:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {structure.thematicProgression?.map((theme, i) => (
              <span key={i} style={{ padding: '6px 12px', background: '#EEF2FF', borderRadius: '4px', fontSize: '0.875rem', color: '#4F46E5' }}>
                {i + 1}. {theme}
              </span>
            ))}
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: '1rem' }}>Book Breakdowns</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {structure.bookBreakdowns?.map((book, index) => (
          <div key={index} style={{
            background: '#FFFFFF',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
            borderLeft: `4px solid ${['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'][index % 5]}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: '700', color: '#64748B' }}>Book {book.bookNumber}:</span>
              <span style={{ fontWeight: '600', color: '#1E293B' }}>{book.workingTitle}</span>
            </div>
            <p style={{ color: '#475569', marginBottom: '1rem' }}>{book.focus}</p>
            <div>
              <strong style={{ fontSize: '0.75rem', color: '#64748B' }}>Major Events:</strong>
              <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                {book.majorEvents?.map((event, i) => (
                  <li key={i} style={{ color: '#475569', marginBottom: '0.25rem' }}>{event}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToneVariationsSection({ variations }: { variations: ToneVariation[] }) {
  if (!variations || variations.length === 0) {
    return <EmptySection message="No tone variations generated." />;
  }

  const typeColors: Record<string, { bg: string; text: string }> = {
    darker: { bg: '#1E1E2E', text: '#FFFFFF' },
    lighter: { bg: '#FEF9C3', text: '#854D0E' },
    spin_off: { bg: '#DBEAFE', text: '#1E40AF' },
    prequel: { bg: '#FCE7F3', text: '#9D174D' },
    parallel: { bg: '#E0E7FF', text: '#3730A3' },
    genre_shift: { bg: '#ECFDF5', text: '#065F46' },
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Tone Variations</h2>
      <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
        Alternative directions your story could take with different tones or perspectives.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
        {variations.map((variation, index) => {
          const colors = typeColors[variation.variationType] || { bg: '#F1F5F9', text: '#475569' };
          return (
            <div key={index} style={{ background: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
              <div style={{ padding: '0.75rem 1rem', background: colors.bg, color: colors.text }}>
                <span style={{ fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  {variation.variationType.replace('_', ' ')}
                </span>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ color: '#475569', marginBottom: '1rem' }}>{variation.description}</p>
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '0.75rem', color: '#64748B' }}>What Changes:</strong>
                  <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                    {variation.whatChanges?.map((change, i) => (
                      <li key={i} style={{ color: '#475569', marginBottom: '0.25rem' }}>{change}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: '4px' }}>
                  <strong style={{ fontSize: '0.75rem', color: '#64748B' }}>Potential Story:</strong>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#475569' }}>{variation.potentialStory}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
      <p>{message}</p>
    </div>
  );
}
