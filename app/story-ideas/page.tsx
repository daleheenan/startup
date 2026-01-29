'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '@/app/lib/auth';
import { colors, borderRadius, shadows } from '@/app/lib/constants';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import GenerationProgress from '@/app/components/GenerationProgress';
import SplitView, {
  SplitViewListItem,
  SplitViewEmptyState,
  DetailPanelHeader,
  DetailPanelSection,
  DetailPanelActions,
  DetailPanelTabs,
  ActionButton,
  Pagination,
} from '@/app/components/SplitView';
import OriginalityChecker from '@/app/components/OriginalityChecker';

const ITEMS_PER_PAGE = 5;
import {
  useStoryIdeas,
  useDeleteStoryIdea,
  useUpdateStoryIdea,
  useExpandStoryIdea,
  useCreateStoryIdea,
} from '@/app/hooks/useStoryIdeas';
import type { SavedStoryIdea, IdeaExpansionMode } from '@/shared/types';

export default function StoryIdeasPage() {
  const router = useRouter();
  const { data: ideas, isLoading, error } = useStoryIdeas();
  const deleteIdeaMutation = useDeleteStoryIdea();
  const updateIdeaMutation = useUpdateStoryIdea();
  const expandIdeaMutation = useExpandStoryIdea();
  const createIdeaMutation = useCreateStoryIdea();

  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [isAddingIdea, setIsAddingIdea] = useState(false);
  const [addIdeaForm, setAddIdeaForm] = useState({
    premise: '',
    timePeriod: '',
    characterConcepts: [''],
    plotElements: [''],
    uniqueTwists: [''],
    notes: '',
  });
  const [addIdeaError, setAddIdeaError] = useState<string | null>(null);
  const [editingIdea, setEditingIdea] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SavedStoryIdea>>({});
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandingIdeaId, setExpandingIdeaId] = useState<string | null>(null);
  const [expandingMode, setExpandingMode] = useState<IdeaExpansionMode | null>(null);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<string>('details');
  const [originalityResults, setOriginalityResults] = useState<Record<string, any>>({});
  const [isCheckingOriginality, setIsCheckingOriginality] = useState(false);
  const [loadingOriginalityIds, setLoadingOriginalityIds] = useState<Set<string>>(new Set());

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Load existing originality results from API for the selected idea
  const loadExistingOriginalityResult = useCallback(async (ideaId: string) => {
    // Skip if already loaded or currently loading
    if (originalityResults[ideaId] || loadingOriginalityIds.has(ideaId)) {
      return;
    }

    setLoadingOriginalityIds(prev => new Set(prev).add(ideaId));

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/plagiarism/results/${ideaId}/latest`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.results) {
          setOriginalityResults(prev => ({ ...prev, [ideaId]: data.results }));
        }
      }
    } catch (error) {
      console.error('Error loading existing originality result:', error);
    } finally {
      setLoadingOriginalityIds(prev => {
        const next = new Set(prev);
        next.delete(ideaId);
        return next;
      });
    }
  }, [originalityResults, loadingOriginalityIds, API_BASE_URL]);

  // Load originality result when selected idea changes
  useEffect(() => {
    if (selectedIdeaId) {
      loadExistingOriginalityResult(selectedIdeaId);
    }
  }, [selectedIdeaId, loadExistingOriginalityResult]);

  // Get unique genres from ideas
  const genres = useMemo(() =>
    Array.from(new Set(ideas?.map(i => i.genre).filter(Boolean) || [])),
    [ideas]
  );

  // Filter and sort ideas
  const filteredIdeas = useMemo(() => {
    let result = ideas?.filter(idea => {
      if (filterGenre !== 'all' && idea.genre !== filterGenre) return false;
      if (filterStatus !== 'all' && idea.status !== filterStatus) return false;

      // Date range filter
      if (filterDateRange !== 'all') {
        const ideaDate = new Date(idea.created_at);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (filterDateRange) {
          case 'today':
            if (ideaDate < startOfToday) return false;
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (ideaDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (ideaDate < monthAgo) return false;
            break;
        }
      }

      return true;
    }) || [];

    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [ideas, filterGenre, filterStatus, filterDateRange, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredIdeas.length / ITEMS_PER_PAGE);
  const paginatedIdeas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredIdeas.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredIdeas, currentPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [filterGenre, filterStatus, filterDateRange, sortOrder]);

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

  const handleCheckOriginality = (ideaId: string) => {
    setIsCheckingOriginality(true);
    setActiveTab('originality');
  };

  const handleOriginalityComplete = (ideaId: string, result: any) => {
    setOriginalityResults(prev => ({ ...prev, [ideaId]: result }));
    setIsCheckingOriginality(false);
  };

  // Handle adding a new idea manually
  const handleStartAddIdea = () => {
    setIsAddingIdea(true);
    setAddIdeaForm({
      premise: '',
      timePeriod: '',
      characterConcepts: [''],
      plotElements: [''],
      uniqueTwists: [''],
      notes: '',
    });
    setAddIdeaError(null);
  };

  const handleCancelAddIdea = () => {
    setIsAddingIdea(false);
    setAddIdeaForm({
      premise: '',
      timePeriod: '',
      characterConcepts: [''],
      plotElements: [''],
      uniqueTwists: [''],
      notes: '',
    });
    setAddIdeaError(null);
  };

  const handleSaveAddIdea = async () => {
    setAddIdeaError(null);

    if (!addIdeaForm.premise.trim() || addIdeaForm.premise.trim().length < 10) {
      setAddIdeaError('Please enter a premise of at least 10 characters');
      return;
    }

    try {
      const result = await createIdeaMutation.mutateAsync({
        premise: addIdeaForm.premise.trim(),
        timePeriod: addIdeaForm.timePeriod.trim() || undefined,
        characterConcepts: addIdeaForm.characterConcepts.filter(c => c.trim()),
        plotElements: addIdeaForm.plotElements.filter(p => p.trim()),
        uniqueTwists: addIdeaForm.uniqueTwists.filter(t => t.trim()),
        notes: addIdeaForm.notes.trim() || undefined,
      });

      // Select the newly created idea
      setSelectedIdeaId(result.idea.id);
      setIsAddingIdea(false);
      setAddIdeaForm({
        premise: '',
        timePeriod: '',
        characterConcepts: [''],
        plotElements: [''],
        uniqueTwists: [''],
        notes: '',
      });
    } catch (err: any) {
      console.error('Error creating idea:', err);
      setAddIdeaError(err.message || 'Failed to create story idea');
    }
  };

  const updateAddFormArrayItem = (field: 'characterConcepts' | 'plotElements' | 'uniqueTwists', index: number, value: string) => {
    const arr = [...addIdeaForm[field]];
    arr[index] = value;
    setAddIdeaForm({ ...addIdeaForm, [field]: arr });
  };

  const addAddFormArrayItem = (field: 'characterConcepts' | 'plotElements' | 'uniqueTwists') => {
    setAddIdeaForm({ ...addIdeaForm, [field]: [...addIdeaForm[field], ''] });
  };

  const removeAddFormArrayItem = (field: 'characterConcepts' | 'plotElements' | 'uniqueTwists', index: number) => {
    const arr = [...addIdeaForm[field]];
    arr.splice(index, 1);
    if (arr.length === 0) arr.push(''); // Keep at least one empty field
    setAddIdeaForm({ ...addIdeaForm, [field]: arr });
  };

  // Reset tab when selected idea changes - keep on details unless user was on originality
  const handleSelectIdea = (ideaId: string) => {
    if (ideaId !== selectedIdeaId) {
      // Only stay on originality tab if the new idea also has results
      if (activeTab === 'originality' && !originalityResults[ideaId]) {
        setActiveTab('details');
      }
      // Reset checking state when switching ideas
      setIsCheckingOriginality(false);
    }
    setSelectedIdeaId(ideaId);
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
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
              <button
                onClick={handleStartAddIdea}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                  color: colors.text,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Add Your Own Idea
              </button>
            </div>
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {paginatedIdeas.map(idea => (
            <SplitViewListItem
              key={idea.id}
              id={idea.id}
              title={idea.story_idea.slice(0, 60) + (idea.story_idea.length > 60 ? '...' : '')}
              date={new Date(idea.created_at).toLocaleDateString()}
              genre={idea.genre}
              premise={idea.story_idea}
              isSelected={selectedIdeaId === idea.id}
              status={idea.status}
              onClick={handleSelectIdea}
            />
          ))}
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    );
  };

  // Render the right pane detail view
  const renderRightPane = () => {
    // Add new idea mode
    if (isAddingIdea) {
      const labelStyle = {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: colors.text,
        marginBottom: '0.5rem',
      };

      const textareaStyle = {
        width: '100%',
        padding: '0.75rem',
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.sm,
        fontSize: '0.9375rem',
        resize: 'vertical' as const,
      };

      const inputStyle = {
        width: '100%',
        padding: '0.75rem',
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.sm,
        fontSize: '0.9375rem',
      };

      return (
        <div style={{ padding: '1.5rem', overflowY: 'auto', height: '100%' }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: colors.text,
            marginBottom: '0.5rem',
          }}>
            Add Your Own Story Idea
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: colors.textSecondary,
            marginBottom: '1.5rem',
          }}>
            Enter your story premise and we'll automatically infer the genre. You can then expand it to full concepts.
          </p>

          {addIdeaError && (
            <div style={{
              background: colors.errorLight,
              border: `1px solid ${colors.errorBorder}`,
              borderRadius: borderRadius.sm,
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              color: colors.error,
              fontSize: '0.875rem',
            }}>
              {addIdeaError}
            </div>
          )}

          {/* Premise (Required) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>
              Premise <span style={{ color: colors.error }}>*</span>
            </label>
            <textarea
              value={addIdeaForm.premise}
              onChange={(e) => setAddIdeaForm({ ...addIdeaForm, premise: e.target.value })}
              placeholder="Describe your story idea in a few sentences. The genre will be automatically inferred from your description."
              style={{ ...textareaStyle, minHeight: '120px' }}
            />
            <p style={{ fontSize: '0.75rem', color: colors.textTertiary, marginTop: '0.25rem' }}>
              At least 10 characters. The more detail you provide, the better the genre inference.
            </p>
          </div>

          {/* Time Period (Optional) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Time Period (Optional)</label>
            <input
              type="text"
              value={addIdeaForm.timePeriod}
              onChange={(e) => setAddIdeaForm({ ...addIdeaForm, timePeriod: e.target.value })}
              placeholder="e.g., Medieval, Victorian Era, Year 2350, Contemporary"
              style={inputStyle}
            />
            <p style={{ fontSize: '0.75rem', color: colors.textTertiary, marginTop: '0.25rem' }}>
              Helps with genre inference and story context.
            </p>
          </div>

          {/* Character Concepts (Optional) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Character Concepts (Optional)</label>
            {addIdeaForm.characterConcepts.map((char, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  value={char}
                  onChange={(e) => updateAddFormArrayItem('characterConcepts', i, e.target.value)}
                  placeholder="e.g., Elena - A fearless archaeologist with a hidden past"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {addIdeaForm.characterConcepts.length > 1 && (
                  <button
                    onClick={() => removeAddFormArrayItem('characterConcepts', i)}
                    style={{
                      padding: '0.5rem',
                      background: colors.errorLight,
                      border: `1px solid ${colors.errorBorder}`,
                      borderRadius: borderRadius.sm,
                      color: colors.error,
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addAddFormArrayItem('characterConcepts')}
              style={{
                padding: '0.5rem 1rem',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.sm,
                color: colors.text,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              + Add Character
            </button>
          </div>

          {/* Plot Elements (Optional) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Plot Elements (Optional)</label>
            {addIdeaForm.plotElements.map((elem, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  value={elem}
                  onChange={(e) => updateAddFormArrayItem('plotElements', i, e.target.value)}
                  placeholder="e.g., A race against time to find a lost artefact"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {addIdeaForm.plotElements.length > 1 && (
                  <button
                    onClick={() => removeAddFormArrayItem('plotElements', i)}
                    style={{
                      padding: '0.5rem',
                      background: colors.errorLight,
                      border: `1px solid ${colors.errorBorder}`,
                      borderRadius: borderRadius.sm,
                      color: colors.error,
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addAddFormArrayItem('plotElements')}
              style={{
                padding: '0.5rem 1rem',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.sm,
                color: colors.text,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              + Add Plot Element
            </button>
          </div>

          {/* Unique Twists (Optional) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Unique Twists (Optional)</label>
            {addIdeaForm.uniqueTwists.map((twist, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  value={twist}
                  onChange={(e) => updateAddFormArrayItem('uniqueTwists', i, e.target.value)}
                  placeholder="e.g., The villain turns out to be the hero's future self"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {addIdeaForm.uniqueTwists.length > 1 && (
                  <button
                    onClick={() => removeAddFormArrayItem('uniqueTwists', i)}
                    style={{
                      padding: '0.5rem',
                      background: colors.errorLight,
                      border: `1px solid ${colors.errorBorder}`,
                      borderRadius: borderRadius.sm,
                      color: colors.error,
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addAddFormArrayItem('uniqueTwists')}
              style={{
                padding: '0.5rem 1rem',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.sm,
                color: colors.text,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              + Add Unique Twist
            </button>
          </div>

          {/* Notes (Optional) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Notes (Optional)</label>
            <textarea
              value={addIdeaForm.notes}
              onChange={(e) => setAddIdeaForm({ ...addIdeaForm, notes: e.target.value })}
              placeholder="Any additional notes or thoughts about this idea..."
              style={{ ...textareaStyle, minHeight: '80px' }}
            />
          </div>

          <div style={{
            display: 'flex',
            gap: '0.75rem',
            position: 'sticky',
            bottom: 0,
            background: colors.surface,
            paddingTop: '1rem',
          }}>
            <ActionButton
              variant="primary"
              onClick={handleSaveAddIdea}
              disabled={createIdeaMutation.isPending}
            >
              {createIdeaMutation.isPending ? 'Saving & Inferring Genre...' : 'Save Idea'}
            </ActionButton>
            <ActionButton variant="secondary" onClick={handleCancelAddIdea}>
              Cancel
            </ActionButton>
          </div>
        </div>
      );
    }

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
      const updateArrayItem = (field: 'character_concepts' | 'plot_elements' | 'unique_twists', index: number, value: string) => {
        const arr = [...(editForm[field] || [])];
        arr[index] = value;
        setEditForm({ ...editForm, [field]: arr });
      };

      const addArrayItem = (field: 'character_concepts' | 'plot_elements' | 'unique_twists') => {
        const arr = [...(editForm[field] || []), ''];
        setEditForm({ ...editForm, [field]: arr });
      };

      const removeArrayItem = (field: 'character_concepts' | 'plot_elements' | 'unique_twists', index: number) => {
        const arr = [...(editForm[field] || [])];
        arr.splice(index, 1);
        setEditForm({ ...editForm, [field]: arr });
      };

      const labelStyle = {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: colors.text,
        marginBottom: '0.5rem',
      };

      const textareaStyle = {
        width: '100%',
        padding: '0.75rem',
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.sm,
        fontSize: '0.9375rem',
        resize: 'vertical' as const,
      };

      const inputStyle = {
        width: '100%',
        padding: '0.75rem',
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.sm,
        fontSize: '0.9375rem',
      };

      return (
        <div style={{ padding: '1.5rem', overflowY: 'auto', height: '100%' }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: colors.text,
            marginBottom: '1.5rem',
          }}>
            Edit Story Idea
          </h3>

          {/* Premise */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Premise</label>
            <textarea
              value={editForm.story_idea || ''}
              onChange={(e) => setEditForm({ ...editForm, story_idea: e.target.value })}
              style={{ ...textareaStyle, minHeight: '120px' }}
            />
          </div>

          {/* Character Concepts */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Character Concepts</label>
            {(editForm.character_concepts || []).map((char, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <textarea
                  value={char}
                  onChange={(e) => updateArrayItem('character_concepts', i, e.target.value)}
                  style={{ ...textareaStyle, minHeight: '60px', flex: 1 }}
                />
                <button
                  onClick={() => removeArrayItem('character_concepts', i)}
                  style={{
                    padding: '0.5rem',
                    background: colors.errorLight,
                    border: `1px solid ${colors.errorBorder}`,
                    borderRadius: borderRadius.sm,
                    color: colors.error,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('character_concepts')}
              style={{
                padding: '0.5rem 1rem',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.sm,
                color: colors.text,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              + Add Character
            </button>
          </div>

          {/* Plot Elements */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Plot Elements</label>
            {(editForm.plot_elements || []).map((elem, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <textarea
                  value={elem}
                  onChange={(e) => updateArrayItem('plot_elements', i, e.target.value)}
                  style={{ ...textareaStyle, minHeight: '60px', flex: 1 }}
                />
                <button
                  onClick={() => removeArrayItem('plot_elements', i)}
                  style={{
                    padding: '0.5rem',
                    background: colors.errorLight,
                    border: `1px solid ${colors.errorBorder}`,
                    borderRadius: borderRadius.sm,
                    color: colors.error,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('plot_elements')}
              style={{
                padding: '0.5rem 1rem',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.sm,
                color: colors.text,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              + Add Plot Element
            </button>
          </div>

          {/* Unique Twists */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Unique Twists</label>
            {(editForm.unique_twists || []).map((twist, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <textarea
                  value={twist}
                  onChange={(e) => updateArrayItem('unique_twists', i, e.target.value)}
                  style={{ ...textareaStyle, minHeight: '60px', flex: 1 }}
                />
                <button
                  onClick={() => removeArrayItem('unique_twists', i)}
                  style={{
                    padding: '0.5rem',
                    background: colors.errorLight,
                    border: `1px solid ${colors.errorBorder}`,
                    borderRadius: borderRadius.sm,
                    color: colors.error,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('unique_twists')}
              style={{
                padding: '0.5rem 1rem',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.sm,
                color: colors.text,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              + Add Unique Twist
            </button>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={editForm.notes || ''}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              style={{ ...textareaStyle, minHeight: '80px' }}
              placeholder="Add your notes..."
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', position: 'sticky', bottom: 0, background: colors.surface, paddingTop: '1rem' }}>
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

    // Determine available tabs - only show originality tab if results exist or user explicitly requested a check
    // Don't show tab while loading existing results (to prevent flicker when no results exist)
    const hasOriginalityResult = !!originalityResults[selectedIdea.id];
    const showOriginalityTab = hasOriginalityResult || isCheckingOriginality;
    const tabs = [
      { id: 'details', label: 'Details', icon: '📋' },
      ...(showOriginalityTab
        ? [{ id: 'originality', label: hasOriginalityResult ? 'Originality ✓' : 'Originality', icon: '✨' }]
        : []),
    ];

    // View mode
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <DetailPanelHeader
          title={selectedIdea.story_idea.slice(0, 80) + (selectedIdea.story_idea.length > 80 ? '...' : '')}
          status={selectedIdea.status}
          genre={selectedIdea.genre}
          date={new Date(selectedIdea.created_at).toLocaleDateString()}
        />

        <DetailPanelActions position="top">
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
          <ActionButton
            variant="secondary"
            onClick={() => handleCheckOriginality(selectedIdea.id)}
            disabled={isCheckingOriginality}
          >
            {isCheckingOriginality && activeTab === 'originality' ? 'Checking...' : 'Check Originality'}
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

        {/* Tabs - only show if originality tab exists */}
        {tabs.length > 1 && (
          <DetailPanelTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}

        {/* Details Tab Content */}
        {activeTab === 'details' && (
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
        )}

        {/* Originality Tab Content */}
        {activeTab === 'originality' && (
          <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
            <OriginalityChecker
              key={selectedIdea.id}
              contentId={selectedIdea.id}
              contentType="story-idea"
              title={selectedIdea.story_idea.slice(0, 50) + (selectedIdea.story_idea.length > 50 ? '...' : '')}
              autoRun={!originalityResults[selectedIdea.id]}
              loadExisting={true}
              existingResult={originalityResults[selectedIdea.id] || null}
              onCheckComplete={(result) => handleOriginalityComplete(selectedIdea.id, result)}
            />
          </div>
        )}
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
          <select
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.sm,
              fontSize: '0.875rem',
              background: colors.surface,
              color: colors.text,
            }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.sm,
              fontSize: '0.875rem',
              background: colors.surface,
              color: colors.text,
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <div style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <span style={{
              fontSize: '0.875rem',
              color: colors.textSecondary,
            }}>
              {filteredIdeas.length} {filteredIdeas.length === 1 ? 'idea' : 'ideas'}
            </span>
            <button
              onClick={handleStartAddIdea}
              style={{
                padding: '0.5rem 1rem',
                background: `linear-gradient(135deg, ${colors.brandStart} 0%, ${colors.brandEnd} 100%)`,
                border: 'none',
                borderRadius: borderRadius.sm,
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              + Add Your Own
            </button>
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
