'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { colors, borderRadius, shadows } from '@/app/lib/constants';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import GenerationProgress from '@/app/components/GenerationProgress';
import SplitView, {
  SplitViewListItem,
  SplitViewEmptyState,
  DetailPanelHeader,
  DetailPanelSection,
  DetailPanelActions,
  ActionButton,
} from '@/app/components/SplitView';
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

  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [editingIdea, setEditingIdea] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SavedStoryIdea>>({});
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandingIdeaId, setExpandingIdeaId] = useState<string | null>(null);
  const [expandingMode, setExpandingMode] = useState<IdeaExpansionMode | null>(null);
  const [expandError, setExpandError] = useState<string | null>(null);

  // Get unique genres from ideas
  const genres = useMemo(() =>
    Array.from(new Set(ideas?.map(i => i.genre).filter(Boolean) || [])),
    [ideas]
  );

  // Filter ideas
  const filteredIdeas = useMemo(() =>
    ideas?.filter(idea => {
      if (filterGenre !== 'all' && idea.genre !== filterGenre) return false;
      if (filterStatus !== 'all' && idea.status !== filterStatus) return false;
      return true;
    }) || [],
    [ideas, filterGenre, filterStatus]
  );

  // Selected idea details
  const selectedIdea = useMemo(() =>
    filteredIdeas.find(idea => idea.id === selectedIdeaId) || null,
    [filteredIdeas, selectedIdeaId]
  );

  // Auto-select first item when filtered list changes
  useMemo(() => {
    if (filteredIdeas.length > 0 && (!selectedIdeaId || !filteredIdeas.find(i => i.id === selectedIdeaId))) {
      setSelectedIdeaId(filteredIdeas[0].id);
    } else if (filteredIdeas.length === 0) {
      setSelectedIdeaId(null);
    }
  }, [filteredIdeas, selectedIdeaId]);

  const handleDelete = async (ideaId: string) => {
    if (!confirm('Are you sure you want to delete this story idea?')) {
      return;
    }
    deleteIdeaMutation.mutate(ideaId);
    // Select next item if current is deleted
    if (selectedIdeaId === ideaId) {
      const currentIndex = filteredIdeas.findIndex(i => i.id === ideaId);
      const nextIdea = filteredIdeas[currentIndex + 1] || filteredIdeas[currentIndex - 1];
      setSelectedIdeaId(nextIdea?.id || null);
    }
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
      const result = await expandIdeaMutation.mutateAsync({ id: ideaId, mode });
      const conceptIds = result.concepts?.map((c: any) => c.id).join(',') || '';
      router.push(`/saved-concepts?new=${conceptIds}&from=idea`);
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
      <DashboardLayout
        header={{
          title: 'Story Ideas',
          subtitle: 'Your saved 3-line story premises ready to expand into full concepts',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 200px)',
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
      </DashboardLayout>
    );
  }

  // Render the left pane list items
  const renderLeftPane = () => {
    if (!ideas || ideas.length === 0) {
      return (
        <SplitViewEmptyState
          icon="💡"
          title="No Story Ideas Yet"
          message="Generate quick story ideas to save and develop later into full concepts."
          action={
            <Link
              href="/new?mode=quick"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: `linear-gradient(135deg, ${colors.brandStart} 0%, ${colors.brandEnd} 100%)`,
                borderRadius: borderRadius.md,
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Generate Ideas
            </Link>
          }
        />
      );
    }

    if (filteredIdeas.length === 0) {
      return (
        <SplitViewEmptyState
          icon="🔍"
          title="No Matching Ideas"
          message="Try adjusting your filters to see more ideas."
        />
      );
    }

    return (
      <div>
        {filteredIdeas.map(idea => (
          <SplitViewListItem
            key={idea.id}
            id={idea.id}
            title={idea.story_idea.slice(0, 60) + (idea.story_idea.length > 60 ? '...' : '')}
            date={new Date(idea.created_at).toLocaleDateString()}
            genre={idea.genre}
            premise={idea.story_idea}
            isSelected={selectedIdeaId === idea.id}
            status={idea.status}
            onClick={setSelectedIdeaId}
          />
        ))}
      </div>
    );
  };

  // Render the right pane detail view
  const renderRightPane = () => {
    if (!selectedIdea) {
      return (
        <SplitViewEmptyState
          icon="👈"
          title="Select a Story Idea"
          message="Click on a story idea from the list to view its details and take action."
        />
      );
    }

    // Edit mode
    if (editingIdea === selectedIdea.id) {
      return (
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: colors.text,
            marginBottom: '1.5rem',
          }}>
            Edit Story Idea
          </h3>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: colors.text,
              marginBottom: '0.5rem',
            }}>
              Story Idea
            </label>
            <textarea
              value={editForm.story_idea || ''}
              onChange={(e) => setEditForm({ ...editForm, story_idea: e.target.value })}
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '0.75rem',
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: '0.9375rem',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: colors.text,
              marginBottom: '0.5rem',
            }}>
              Notes
            </label>
            <textarea
              value={editForm.notes || ''}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '0.75rem',
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: '0.9375rem',
                resize: 'vertical',
              }}
              placeholder="Add your notes..."
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <ActionButton
              variant="primary"
              onClick={handleSaveEdit}
              disabled={updateIdeaMutation.isPending}
            >
              {updateIdeaMutation.isPending ? 'Saving...' : 'Save Changes'}
            </ActionButton>
            <ActionButton variant="secondary" onClick={handleCancelEdit}>
              Cancel
            </ActionButton>
          </div>
        </div>
      );
    }

    // View mode
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <DetailPanelHeader
          title="Story Idea"
          status={selectedIdea.status}
          genre={selectedIdea.genre}
          date={new Date(selectedIdea.created_at).toLocaleDateString()}
        />

        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          <DetailPanelSection label="Premise">
            <p style={{ margin: 0 }}>{selectedIdea.story_idea}</p>
          </DetailPanelSection>

          {selectedIdea.character_concepts?.length > 0 && (
            <DetailPanelSection label="Character Concepts">
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {selectedIdea.character_concepts.map((char, i) => (
                  <li key={i}>{char}</li>
                ))}
              </ul>
            </DetailPanelSection>
          )}

          {selectedIdea.plot_elements?.length > 0 && (
            <DetailPanelSection label="Plot Elements">
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {selectedIdea.plot_elements.map((elem, i) => (
                  <li key={i}>{elem}</li>
                ))}
              </ul>
            </DetailPanelSection>
          )}

          {selectedIdea.unique_twists?.length > 0 && (
            <DetailPanelSection label="Unique Twists">
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {selectedIdea.unique_twists.map((twist, i) => (
                  <li key={i}>{twist}</li>
                ))}
              </ul>
            </DetailPanelSection>
          )}

          {selectedIdea.themes?.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: colors.textTertiary,
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.025em',
              }}>
                Themes
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedIdea.themes.map((theme, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: colors.surfaceHover,
                      color: colors.textSecondary,
                      fontSize: '0.75rem',
                      borderRadius: borderRadius.full,
                    }}
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedIdea.notes && (
            <DetailPanelSection label="Your Notes" variant="warning">
              {selectedIdea.notes}
            </DetailPanelSection>
          )}
        </div>

        <DetailPanelActions>
          <ActionButton
            variant="primary"
            onClick={() => handleExpand(selectedIdea.id, 'concepts_5')}
            disabled={expandIdeaMutation.isPending}
          >
            {expandIdeaMutation.isPending ? 'Generating...' : 'Generate 5 Concepts'}
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={() => handleExpand(selectedIdea.id, 'concepts_10')}
            disabled={expandIdeaMutation.isPending}
          >
            Generate 10 Concepts
          </ActionButton>
          <ActionButton variant="secondary" onClick={() => handleStartEdit(selectedIdea)}>
            Edit
          </ActionButton>
          <select
            value={selectedIdea.status}
            onChange={(e) => updateIdeaMutation.mutate({
              id: selectedIdea.id,
              updates: { status: e.target.value as 'saved' | 'used' | 'archived' }
            })}
            style={{
              padding: '0.625rem 0.75rem',
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
          <ActionButton variant="danger" onClick={() => handleDelete(selectedIdea.id)}>
            Delete
          </ActionButton>
        </DetailPanelActions>
      </div>
    );
  };

  return (
    <DashboardLayout
      header={{
        title: 'Story Ideas',
        subtitle: 'Your saved 3-line story premises ready to expand into full concepts',
      }}
    >
      {/* Filters */}
      {ideas && ideas.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem',
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
          <div style={{
            marginLeft: 'auto',
            fontSize: '0.875rem',
            color: colors.textSecondary,
            alignSelf: 'center',
          }}>
            {filteredIdeas.length} {filteredIdeas.length === 1 ? 'idea' : 'ideas'}
          </div>
        </div>
      )}

      {error && (
        <div style={{
          background: colors.errorLight,
          border: `1px solid ${colors.errorBorder}`,
          borderRadius: borderRadius.lg,
          padding: '1rem 1.5rem',
          marginBottom: '1rem',
          color: colors.error,
        }}>
          Failed to load story ideas. Please try again.
        </div>
      )}

      <SplitView
        leftWidth={30}
        leftPane={renderLeftPane()}
        rightPane={renderRightPane()}
        minHeight="calc(100vh - 240px)"
      />

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
    </DashboardLayout>
  );
}
