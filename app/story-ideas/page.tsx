'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { colors, borderRadius, shadows } from '@/app/lib/constants';
import PrimaryNavigationBar from '@/app/components/shared/PrimaryNavigationBar';
import GenerationProgress from '@/app/components/GenerationProgress';
import {
  useStoryIdeas,
  useDeleteStoryIdea,
  useUpdateStoryIdea,
  useExpandStoryIdea,
} from '@/app/hooks/useStoryIdeas';
import type { SavedStoryIdea, IdeaExpansionMode } from '@/shared/types';

export default function StoryIdeasPage() {
  const router = useRouter();
  const { data: ideas, isLoading, error } = useStoryIdeas();
  const deleteIdeaMutation = useDeleteStoryIdea();
  const updateIdeaMutation = useUpdateStoryIdea();
  const expandIdeaMutation = useExpandStoryIdea();

  const [expandedIdea, setExpandedIdea] = useState<string | null>(null);
  const [editingIdea, setEditingIdea] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SavedStoryIdea>>({});
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandingIdeaId, setExpandingIdeaId] = useState<string | null>(null);
  const [expandingMode, setExpandingMode] = useState<IdeaExpansionMode | null>(null);
  const [expandError, setExpandError] = useState<string | null>(null);

  // Get unique genres from ideas
  const genres = Array.from(new Set(ideas?.map(i => i.genre).filter(Boolean) || []));

  // Filter ideas
  const filteredIdeas = ideas?.filter(idea => {
    if (filterGenre !== 'all' && idea.genre !== filterGenre) return false;
    if (filterStatus !== 'all' && idea.status !== filterStatus) return false;
    return true;
  });

  const handleDelete = async (ideaId: string) => {
    if (!confirm('Are you sure you want to delete this story idea?')) {
      return;
    }
    deleteIdeaMutation.mutate(ideaId);
  };

  const handleStartEdit = (idea: SavedStoryIdea) => {
    setEditingIdea(idea.id);
    setEditForm({
      story_idea: idea.story_idea,
      character_concepts: [...idea.character_concepts],
      plot_elements: [...idea.plot_elements],
      unique_twists: [...idea.unique_twists],
      notes: idea.notes,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingIdea) return;
    await updateIdeaMutation.mutateAsync({ id: editingIdea, updates: editForm });
    setEditingIdea(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingIdea(null);
    setEditForm({});
  };

  const handleExpand = async (ideaId: string, mode: IdeaExpansionMode) => {
    setExpandingIdeaId(ideaId);
    setExpandingMode(mode);
    setExpandError(null);
    try {
      await expandIdeaMutation.mutateAsync({ id: ideaId, mode });
      // Redirect to saved concepts page to see the new concepts
      router.push('/saved-concepts');
    } catch (err: any) {
      console.error('Error expanding idea:', err);
      setExpandError(err.message || 'Failed to generate concepts');
    }
  };

  const handleCancelExpand = () => {
    setExpandingIdeaId(null);
    setExpandingMode(null);
    setExpandError(null);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: colors.background }}>
        <PrimaryNavigationBar activeSection="story-ideas" />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 60px)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              width: '48px',
              height: '48px',
              border: `3px solid ${colors.border}`,
              borderTopColor: colors.brandStart,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ marginTop: '1rem', color: colors.textSecondary }}>Loading story ideas...</p>
          </div>
          <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.background }}>
      <PrimaryNavigationBar activeSection="story-ideas" />

      {/* Header */}
      <header style={{
        padding: '1.5rem 2rem',
        background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: colors.text,
              margin: 0,
            }}>
              Story Ideas
            </h1>
            <p style={{ fontSize: '0.9375rem', color: colors.textSecondary, margin: '0.25rem 0 0' }}>
              Your saved 3-line story premises ready to expand into full concepts
            </p>
          </div>

          {/* Filters */}
          {ideas && ideas.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '1rem',
            }}>
              <select
                value={filterGenre}
                onChange={(e) => setFilterGenre(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.sm,
                  fontSize: '0.875rem',
                  background: colors.surface,
                  color: colors.text,
                }}
              >
                <option value="all">All Genres</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.sm,
                  fontSize: '0.875rem',
                  background: colors.surface,
                  color: colors.text,
                }}
              >
                <option value="all">All Status</option>
                <option value="saved">Saved</option>
                <option value="used">Used</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {error && (
            <div style={{
              background: colors.errorLight,
              border: `1px solid ${colors.errorBorder}`,
              borderRadius: borderRadius.lg,
              padding: '1rem 1.5rem',
              marginBottom: '1.5rem',
              color: colors.error,
            }}>
              Failed to load story ideas. Please try again.
            </div>
          )}

          {(!filteredIdeas || filteredIdeas.length === 0) ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: colors.surface,
              borderRadius: borderRadius.lg,
              border: `2px dashed ${colors.border}`,
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💡</div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: colors.text }}>
                {ideas?.length === 0 ? 'No Story Ideas Yet' : 'No Matching Ideas'}
              </h2>
              <p style={{ fontSize: '1rem', color: colors.textSecondary, marginBottom: '2rem' }}>
                {ideas?.length === 0
                  ? 'Generate quick story ideas to save and develop later into full concepts.'
                  : 'Try adjusting your filters to see more ideas.'}
              </p>
              {ideas?.length === 0 && (
                <Link
                  href="/new?mode=quick"
                  style={{
                    display: 'inline-block',
                    padding: '1rem 2rem',
                    background: `linear-gradient(135deg, ${colors.brandStart} 0%, ${colors.brandEnd} 100%)`,
                    borderRadius: borderRadius.md,
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxShadow: shadows.md,
                  }}
                >
                  Generate Quick Story Ideas
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {filteredIdeas.map(idea => (
                <div
                  key={idea.id}
                  style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.lg,
                    padding: '1.5rem',
                    boxShadow: shadows.sm,
                  }}
                >
                  {editingIdea === idea.id ? (
                    // Edit Mode
                    <div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: colors.text, marginBottom: '0.5rem' }}>
                          Story Idea
                        </label>
                        <textarea
                          value={editForm.story_idea || ''}
                          onChange={(e) => setEditForm({ ...editForm, story_idea: e.target.value })}
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '0.75rem',
                            border: `1px solid ${colors.border}`,
                            borderRadius: borderRadius.sm,
                            fontSize: '0.9375rem',
                            resize: 'vertical',
                          }}
                        />
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: colors.text, marginBottom: '0.5rem' }}>
                          Notes
                        </label>
                        <textarea
                          value={editForm.notes || ''}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          style={{
                            width: '100%',
                            minHeight: '60px',
                            padding: '0.75rem',
                            border: `1px solid ${colors.border}`,
                            borderRadius: borderRadius.sm,
                            fontSize: '0.9375rem',
                            resize: 'vertical',
                          }}
                          placeholder="Add your notes..."
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={handleSaveEdit}
                          disabled={updateIdeaMutation.isPending}
                          style={{
                            padding: '0.5rem 1rem',
                            background: colors.success,
                            border: 'none',
                            borderRadius: borderRadius.sm,
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          {updateIdeaMutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            padding: '0.5rem 1rem',
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: borderRadius.sm,
                            color: colors.textSecondary,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            background: colors.brandLight,
                            color: colors.brandText,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            borderRadius: borderRadius.full,
                          }}>
                            {idea.genre}
                          </span>
                          {idea.status !== 'saved' && (
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              background: idea.status === 'used' ? colors.successLight : colors.surfaceHover,
                              color: idea.status === 'used' ? colors.success : colors.textTertiary,
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              borderRadius: borderRadius.full,
                            }}>
                              {idea.status}
                            </span>
                          )}
                        </div>

                        <p style={{
                          fontSize: '1rem',
                          color: colors.text,
                          lineHeight: 1.6,
                          marginBottom: '0.5rem',
                        }}>
                          {idea.story_idea}
                        </p>

                        {/* Save date - always visible */}
                        <div style={{
                          fontSize: '0.75rem',
                          color: colors.textTertiary,
                          marginBottom: expandedIdea === idea.id ? '1rem' : 0,
                        }}>
                          Saved: {new Date(idea.created_at).toLocaleDateString()}
                        </div>

                        {expandedIdea === idea.id && (
                          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${colors.border}` }}>
                            {idea.character_concepts?.length > 0 && (
                              <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: colors.textTertiary, marginBottom: '0.25rem' }}>
                                  CHARACTER CONCEPTS
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: colors.textSecondary, fontSize: '0.875rem' }}>
                                  {idea.character_concepts.map((char, i) => (
                                    <li key={i}>{char}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {idea.plot_elements?.length > 0 && (
                              <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: colors.textTertiary, marginBottom: '0.25rem' }}>
                                  PLOT ELEMENTS
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: colors.textSecondary, fontSize: '0.875rem' }}>
                                  {idea.plot_elements.map((elem, i) => (
                                    <li key={i}>{elem}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {idea.unique_twists?.length > 0 && (
                              <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: colors.textTertiary, marginBottom: '0.25rem' }}>
                                  UNIQUE TWISTS
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: colors.textSecondary, fontSize: '0.875rem' }}>
                                  {idea.unique_twists.map((twist, i) => (
                                    <li key={i}>{twist}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {idea.notes && (
                              <div style={{
                                background: colors.warningLight,
                                border: `1px solid ${colors.warningBorder}`,
                                borderRadius: borderRadius.sm,
                                padding: '0.75rem',
                                marginTop: '0.75rem',
                              }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: colors.warning, marginBottom: '0.25rem' }}>
                                  YOUR NOTES
                                </div>
                                <div style={{ fontSize: '0.875rem', color: colors.text }}>
                                  {idea.notes}
                                </div>
                              </div>
                            )}
                            <div style={{
                              fontSize: '0.75rem',
                              color: colors.textTertiary,
                              marginTop: '1rem',
                            }}>
                              Saved: {new Date(idea.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ marginLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                          onClick={() => setExpandedIdea(expandedIdea === idea.id ? null : idea.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: borderRadius.sm,
                            color: colors.text,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {expandedIdea === idea.id ? 'Show Less' : 'Show More'}
                        </button>
                        <button
                          onClick={() => handleExpand(idea.id, 'concepts_5')}
                          disabled={expandIdeaMutation.isPending}
                          style={{
                            padding: '0.5rem 1rem',
                            background: `linear-gradient(135deg, ${colors.brandStart} 0%, ${colors.brandEnd} 100%)`,
                            border: 'none',
                            borderRadius: borderRadius.sm,
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: expandIdeaMutation.isPending ? 'wait' : 'pointer',
                            whiteSpace: 'nowrap',
                            opacity: expandIdeaMutation.isPending ? 0.7 : 1,
                          }}
                        >
                          {expandIdeaMutation.isPending ? 'Generating...' : 'Generate 5 Concepts'}
                        </button>
                        <button
                          onClick={() => handleExpand(idea.id, 'concepts_10')}
                          disabled={expandIdeaMutation.isPending}
                          style={{
                            padding: '0.5rem 1rem',
                            background: colors.surface,
                            border: `2px solid ${colors.brandBorder}`,
                            borderRadius: borderRadius.sm,
                            color: colors.brandText,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: expandIdeaMutation.isPending ? 'wait' : 'pointer',
                            whiteSpace: 'nowrap',
                            opacity: expandIdeaMutation.isPending ? 0.7 : 1,
                          }}
                        >
                          {expandIdeaMutation.isPending ? 'Generating...' : 'Generate 10 Concepts'}
                        </button>
                        <button
                          onClick={() => handleStartEdit(idea)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: borderRadius.sm,
                            color: colors.text,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Edit
                        </button>
                        <select
                          value={idea.status}
                          onChange={(e) => updateIdeaMutation.mutate({
                            id: idea.id,
                            updates: { status: e.target.value as 'saved' | 'used' | 'archived' }
                          })}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: borderRadius.sm,
                            color: colors.text,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="saved">Saved</option>
                          <option value="used">Used</option>
                          <option value="archived">Archived</option>
                        </select>
                        <button
                          onClick={() => handleDelete(idea.id)}
                          disabled={deleteIdeaMutation.isPending}
                          style={{
                            padding: '0.5rem 1rem',
                            background: colors.surface,
                            border: `1px solid ${colors.errorBorder}`,
                            borderRadius: borderRadius.sm,
                            color: colors.error,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Progress Modal for Concept Generation */}
      <GenerationProgress
        isActive={expandingIdeaId !== null}
        title="Generating Story Concepts"
        subtitle={`Creating ${expandingMode === 'concepts_10' ? '10' : '5'} detailed concepts from your story idea`}
        currentStep={expandIdeaMutation.isPending ? 'Generating concepts with AI...' : 'Preparing...'}
        estimatedTime={expandingMode === 'concepts_10' ? 120 : 60}
        error={expandError}
        onCancel={handleCancelExpand}
      />

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
