'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getToken, logout } from '../lib/auth';
import { colors, borderRadius, shadows } from '../lib/constants';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import OriginalityChecker from '../components/OriginalityChecker';
import SplitView, {
  SplitViewListItem,
  SplitViewEmptyState,
  DetailPanelHeader,
  DetailPanelSection,
  DetailPanelActions,
  ActionButton,
  Pagination,
} from '../components/SplitView';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const ITEMS_PER_PAGE = 5;

interface SavedConcept {
  id: string;
  title: string;
  logline: string;
  synopsis: string;
  hook: string | null;
  protagonist_hint: string | null;
  conflict_type: string | null;
  preferences: any;
  notes: string | null;
  status: 'saved' | 'used' | 'archived';
  created_at: string;
  updated_at: string;
}

// Wrapper component to handle Suspense for useSearchParams
export default function SavedConceptsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout
        header={{
          title: 'Story Concepts',
          subtitle: 'Detailed story concepts ready to become your next book',
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
            <p style={{ marginTop: '1rem', color: colors.textSecondary }}>Loading...</p>
          </div>
          <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    }>
      <SavedConceptsContent />
    </Suspense>
  );
}

function SavedConceptsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [concepts, setConcepts] = useState<SavedConcept[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [showOriginalityCheck, setShowOriginalityCheck] = useState(false);
  const [editingConcept, setEditingConcept] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SavedConcept>>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Check if we're coming from Story Ideas expansion with newly generated concepts
  const newConceptIds = searchParams.get('new')?.split(',').filter(Boolean) || [];
  const isFromIdea = searchParams.get('from') === 'idea';
  const [showingNewOnly, setShowingNewOnly] = useState(isFromIdea && newConceptIds.length > 0);

  useEffect(() => {
    loadConcepts();
  }, []);

  // Get unique genres from concepts
  const genres = useMemo(() =>
    Array.from(new Set(concepts.map(c => c.preferences?.genre).filter(Boolean) || [])),
    [concepts]
  );

  // Filter concepts
  const filteredConcepts = useMemo(() => {
    return concepts.filter(concept => {
      if (showingNewOnly && newConceptIds.length > 0) {
        return newConceptIds.includes(concept.id);
      }
      if (filterStatus !== 'all' && concept.status !== filterStatus) return false;
      if (filterGenre !== 'all' && concept.preferences?.genre !== filterGenre) return false;
      return true;
    });
  }, [concepts, showingNewOnly, newConceptIds, filterStatus, filterGenre]);

  // Pagination
  const totalPages = Math.ceil(filteredConcepts.length / ITEMS_PER_PAGE);
  const paginatedConcepts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredConcepts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredConcepts, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterGenre, filterStatus, showingNewOnly]);

  // Selected concept details
  const selectedConcept = useMemo(() =>
    filteredConcepts.find(c => c.id === selectedConceptId) || null,
    [filteredConcepts, selectedConceptId]
  );

  // Auto-select first item when filtered list changes
  useEffect(() => {
    if (filteredConcepts.length > 0 && (!selectedConceptId || !filteredConcepts.find(c => c.id === selectedConceptId))) {
      setSelectedConceptId(filteredConcepts[0].id);
    } else if (filteredConcepts.length === 0) {
      setSelectedConceptId(null);
    }
  }, [filteredConcepts, selectedConceptId]);

  const loadConcepts = async () => {
    try {
      setIsLoading(true);
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/saved-concepts`, {
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
        throw new Error('Failed to load saved concepts');
      }

      const data = await response.json();
      setConcepts(data.concepts || data);
    } catch (err: any) {
      console.error('Error loading concepts:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (conceptId: string) => {
    if (!confirm('Are you sure you want to delete this saved concept?')) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/saved-concepts/${conceptId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete concept');
      }

      setConcepts(concepts.filter(c => c.id !== conceptId));
      // Select next item if current is deleted
      if (selectedConceptId === conceptId) {
        const currentIndex = filteredConcepts.findIndex(c => c.id === conceptId);
        const nextConcept = filteredConcepts[currentIndex + 1] || filteredConcepts[currentIndex - 1];
        setSelectedConceptId(nextConcept?.id || null);
      }
    } catch (err: any) {
      console.error('Error deleting concept:', err);
      setError(err.message);
    }
  };

  const handleStartEdit = (concept: SavedConcept) => {
    setEditingConcept(concept.id);
    setEditForm({
      title: concept.title,
      logline: concept.logline,
      synopsis: concept.synopsis,
      hook: concept.hook,
      notes: concept.notes,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingConcept) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/saved-concepts/${editingConcept}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update concept');
      }

      const updated = await response.json();
      setConcepts(concepts.map(c => c.id === editingConcept ? { ...c, ...updated } : c));
      setEditingConcept(null);
      setEditForm({});
    } catch (err: any) {
      console.error('Error updating concept:', err);
      setError(err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingConcept(null);
    setEditForm({});
  };

  const handleChangeStatus = async (conceptId: string, newStatus: 'saved' | 'used' | 'archived') => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/saved-concepts/${conceptId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setConcepts(concepts.map(c => c.id === conceptId ? { ...c, status: newStatus } : c));
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.message);
    }
  };

  const handleUseConcept = async (concept: SavedConcept) => {
    setIsCreatingProject(true);
    setError(null);
    try {
      const token = getToken();

      const preferences = {
        ...concept.preferences,
        genre: concept.preferences?.genre || 'General Fiction',
        subgenre: concept.preferences?.subgenre || concept.preferences?.subgenres?.[0] || undefined,
        tone: concept.preferences?.tone || concept.preferences?.tones?.[0] || undefined,
        themes: concept.preferences?.themes || [],
      };

      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          concept: {
            id: concept.id,
            title: concept.title,
            logline: concept.logline,
            synopsis: concept.synopsis,
            hook: concept.hook,
            protagonistHint: concept.protagonist_hint,
            conflictType: concept.conflict_type,
          },
          preferences: preferences
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create project');
      }

      const project = await response.json();

      await fetch(`${API_BASE_URL}/api/saved-concepts/${concept.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'used' }),
      });

      router.push(`/projects/${project.id}?autoGenerate=true`);
    } catch (err: any) {
      console.error('Error using concept:', err);
      setError(err.message);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleShowAllConcepts = () => {
    setShowingNewOnly(false);
    router.replace('/saved-concepts');
  };

  if (isLoading) {
    return (
      <DashboardLayout
        header={{
          title: 'Story Concepts',
          subtitle: 'Detailed story concepts ready to become your next book',
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
            <p style={{ marginTop: '1rem', color: colors.textSecondary }}>Loading saved concepts...</p>
          </div>
          <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  // Render the left pane list items
  const renderLeftPane = () => {
    if (concepts.length === 0) {
      return (
        <SplitViewEmptyState
          icon="📝"
          title="No Saved Concepts Yet"
          message="Generate concepts from Quick Start or Full Customisation, then save your favourites here."
        />
      );
    }

    if (filteredConcepts.length === 0) {
      return (
        <SplitViewEmptyState
          icon="🔍"
          title="No Matching Concepts"
          message="Try adjusting your filters to see more concepts."
        />
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {paginatedConcepts.map(concept => (
            <SplitViewListItem
              key={concept.id}
              id={concept.id}
              title={concept.title}
              date={new Date(concept.created_at).toLocaleDateString()}
              genre={concept.preferences?.genre || undefined}
              premise={concept.logline}
              isSelected={selectedConceptId === concept.id}
              status={concept.status}
              onClick={setSelectedConceptId}
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
    if (!selectedConcept) {
      return (
        <SplitViewEmptyState
          icon="👈"
          title="Select a Story Concept"
          message="Click on a concept from the list to view its details and take action."
        />
      );
    }

    // Edit mode
    if (editingConcept === selectedConcept.id) {
      return (
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: colors.text,
            marginBottom: '1.5rem',
          }}>
            Edit Story Concept
          </h3>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: colors.text,
              marginBottom: '0.5rem',
            }}>
              Title
            </label>
            <input
              type="text"
              value={editForm.title || ''}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: '0.9375rem',
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
              Logline
            </label>
            <input
              type="text"
              value={editForm.logline || ''}
              onChange={(e) => setEditForm({ ...editForm, logline: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: '0.9375rem',
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
              Synopsis
            </label>
            <textarea
              value={editForm.synopsis || ''}
              onChange={(e) => setEditForm({ ...editForm, synopsis: e.target.value })}
              style={{
                width: '100%',
                minHeight: '150px',
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
              Hook
            </label>
            <input
              type="text"
              value={editForm.hook || ''}
              onChange={(e) => setEditForm({ ...editForm, hook: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.sm,
                fontSize: '0.9375rem',
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
            <ActionButton variant="primary" onClick={handleSaveEdit}>
              Save Changes
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
          title={selectedConcept.title}
          status={selectedConcept.status}
          genre={selectedConcept.preferences?.genre || undefined}
          date={new Date(selectedConcept.created_at).toLocaleDateString()}
        />

        <DetailPanelActions position="top">
          <ActionButton
            variant="primary"
            onClick={() => handleUseConcept(selectedConcept)}
            disabled={isCreatingProject}
          >
            {isCreatingProject ? 'Creating Project...' : 'Use Concept'}
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={() => setShowOriginalityCheck(!showOriginalityCheck)}
          >
            {showOriginalityCheck ? 'Hide Originality Check' : 'Check Originality'}
          </ActionButton>
          <ActionButton variant="secondary" onClick={() => handleStartEdit(selectedConcept)}>
            Edit
          </ActionButton>
          <select
            value={selectedConcept.status}
            onChange={(e) => handleChangeStatus(selectedConcept.id, e.target.value as 'saved' | 'used' | 'archived')}
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
          <ActionButton variant="danger" onClick={() => handleDelete(selectedConcept.id)}>
            Delete
          </ActionButton>
        </DetailPanelActions>

        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          <DetailPanelSection label="Logline">
            <p style={{ margin: 0, fontStyle: 'italic' }}>{selectedConcept.logline}</p>
          </DetailPanelSection>

          <DetailPanelSection label="Synopsis">
            <p style={{ margin: 0 }}>{selectedConcept.synopsis}</p>
          </DetailPanelSection>

          {selectedConcept.hook && (
            <DetailPanelSection label="Hook" variant="highlight">
              {selectedConcept.hook}
            </DetailPanelSection>
          )}

          {selectedConcept.protagonist_hint && (
            <DetailPanelSection label="Protagonist">
              {selectedConcept.protagonist_hint}
            </DetailPanelSection>
          )}

          {selectedConcept.conflict_type && (
            <DetailPanelSection label="Conflict Type">
              {selectedConcept.conflict_type}
            </DetailPanelSection>
          )}

          {selectedConcept.preferences?.themes?.length > 0 && (
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
                {selectedConcept.preferences.themes.map((theme: string, i: number) => (
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

          {selectedConcept.notes && (
            <DetailPanelSection label="Your Notes" variant="warning">
              {selectedConcept.notes}
            </DetailPanelSection>
          )}

          {showOriginalityCheck && (
            <div style={{ marginTop: '1rem' }}>
              <OriginalityChecker
                contentId={selectedConcept.id}
                contentType="concept"
                title={selectedConcept.title}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      header={{
        title: showingNewOnly ? `${newConceptIds.length} New Concepts Generated` : 'Story Concepts',
        subtitle: showingNewOnly
          ? 'Choose a concept to save for later or select one to start your project'
          : 'Detailed story concepts ready to become your next book',
      }}
    >
      {/* Show "View All" button when filtering to new concepts */}
      {showingNewOnly && (
        <button
          onClick={handleShowAllConcepts}
          style={{
            marginBottom: '1rem',
            padding: '0.5rem 1rem',
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: borderRadius.sm,
            color: colors.text,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          ← View All Saved Concepts
        </button>
      )}

      {/* Filters */}
      {concepts.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
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
            {filteredConcepts.length} {filteredConcepts.length === 1 ? 'concept' : 'concepts'}
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
          {error}
        </div>
      )}

      <SplitView
        leftWidth={30}
        leftPane={renderLeftPane()}
        rightPane={renderRightPane()}
        minHeight="calc(100vh - 240px)"
      />

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
