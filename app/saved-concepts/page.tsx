'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, logout } from '../lib/auth';
import { colors, borderRadius, shadows } from '../lib/constants';
import PrimaryNavigationBar from '../components/shared/PrimaryNavigationBar';
import OriginalityChecker from '../components/OriginalityChecker';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

export default function SavedConceptsPage() {
  const router = useRouter();
  const [concepts, setConcepts] = useState<SavedConcept[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null);
  const [showOriginalityCheck, setShowOriginalityCheck] = useState<string | null>(null);
  const [editingConcept, setEditingConcept] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SavedConcept>>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGenre, setFilterGenre] = useState<string>('all');

  useEffect(() => {
    loadConcepts();
  }, []);

  // Get unique genres from concepts
  const genres = Array.from(new Set(concepts.map(c => c.preferences?.genre).filter(Boolean) || []));

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
    try {
      const token = getToken();

      // Build preferences object, ensuring required fields are present
      const preferences = {
        ...concept.preferences,
        genre: concept.preferences?.genre || 'General Fiction',  // Fallback if missing
      };

      // Create project from concept
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

      // Mark concept as used
      await fetch(`${API_BASE_URL}/api/saved-concepts/${concept.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'used' }),
      });

      // Redirect to project page
      router.push(`/projects/${project.id}`);
    } catch (err: any) {
      console.error('Error using concept:', err);
      setError(err.message);
    }
  };

  // Filter concepts
  const filteredConcepts = concepts.filter(concept => {
    if (filterStatus !== 'all' && concept.status !== filterStatus) return false;
    if (filterGenre !== 'all' && concept.preferences?.genre !== filterGenre) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: colors.background }}>
        <PrimaryNavigationBar activeSection="story-concepts" />
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
            <p style={{ marginTop: '1rem', color: colors.textSecondary }}>Loading saved concepts...</p>
          </div>
          <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.background }}>
      <PrimaryNavigationBar activeSection="story-concepts" />

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
              Story Concepts
            </h1>
            <p style={{ fontSize: '0.9375rem', color: colors.textSecondary, margin: '0.25rem 0 0' }}>
              Detailed story concepts ready to become your next book
            </p>
          </div>

          {/* Filters */}
          {concepts.length > 0 && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
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
              {error}
            </div>
          )}

          {filteredConcepts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: colors.surface,
              borderRadius: borderRadius.lg,
              border: `2px dashed ${colors.border}`,
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📝</div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: colors.text }}>
                {concepts.length === 0 ? 'No Saved Concepts Yet' : 'No Matching Concepts'}
              </h2>
              <p style={{ fontSize: '1rem', color: colors.textSecondary }}>
                {concepts.length === 0
                  ? 'Generate concepts from Quick Start or Full Customization, then save your favorites here.'
                  : 'Try adjusting your filters to see more concepts.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {filteredConcepts.map(concept => (
                <div
                  key={concept.id}
                  style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.lg,
                    padding: '1.5rem',
                    boxShadow: shadows.sm,
                  }}
                >
                  {editingConcept === concept.id ? (
                    // Edit Mode
                    <div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: colors.text, marginBottom: '0.5rem' }}>
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
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: colors.text, marginBottom: '0.5rem' }}>
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
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: colors.text, marginBottom: '0.5rem' }}>
                          Synopsis
                        </label>
                        <textarea
                          value={editForm.synopsis || ''}
                          onChange={(e) => setEditForm({ ...editForm, synopsis: e.target.value })}
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
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: colors.text, marginBottom: '0.5rem' }}>
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
                          Save
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
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: colors.text, margin: 0 }}>
                            {concept.title}
                          </h3>
                          {concept.status !== 'saved' && (
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              background: concept.status === 'used' ? colors.successLight : colors.surfaceHover,
                              color: concept.status === 'used' ? colors.success : colors.textTertiary,
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              borderRadius: borderRadius.full,
                            }}>
                              {concept.status}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.9375rem', color: colors.textSecondary, fontStyle: 'italic', marginBottom: '0.5rem' }}>
                          {concept.logline}
                        </p>

                        {/* Save date and genre - always visible */}
                        <div style={{
                          fontSize: '0.75rem',
                          color: colors.textTertiary,
                          display: 'flex',
                          gap: '1.5rem',
                          marginBottom: expandedConcept === concept.id ? '1rem' : 0,
                        }}>
                          <span>Genre: {concept.preferences?.genre || 'Not specified'}</span>
                          <span>Saved: {new Date(concept.created_at).toLocaleDateString()}</span>
                        </div>

                        {expandedConcept === concept.id && (
                          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${colors.border}` }}>
                            <p style={{ fontSize: '0.9375rem', color: colors.text, marginBottom: '1rem', lineHeight: 1.6 }}>
                              {concept.synopsis}
                            </p>
                            {concept.hook && (
                              <div style={{
                                background: colors.brandLight,
                                border: `1px solid ${colors.brandBorder}`,
                                borderRadius: borderRadius.sm,
                                padding: '0.75rem',
                                marginBottom: '0.75rem',
                              }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: colors.brandText, marginBottom: '0.25rem' }}>
                                  HOOK
                                </div>
                                <div style={{ fontSize: '0.875rem', color: colors.text }}>
                                  {concept.hook}
                                </div>
                              </div>
                            )}
                            {concept.notes && (
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
                                  {concept.notes}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ marginLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                          onClick={() => setExpandedConcept(expandedConcept === concept.id ? null : concept.id)}
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
                          {expandedConcept === concept.id ? 'Show Less' : 'Show More'}
                        </button>
                        <button
                          onClick={() => handleUseConcept(concept)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: `linear-gradient(135deg, ${colors.brandStart} 0%, ${colors.brandEnd} 100%)`,
                            border: 'none',
                            borderRadius: borderRadius.sm,
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Use Concept
                        </button>
                        <button
                          onClick={() => setShowOriginalityCheck(
                            showOriginalityCheck === concept.id ? null : concept.id
                          )}
                          style={{
                            padding: '0.5rem 1rem',
                            background: showOriginalityCheck === concept.id ? colors.brandLight : colors.surface,
                            border: `1px solid ${showOriginalityCheck === concept.id ? colors.brandStart : colors.border}`,
                            borderRadius: borderRadius.sm,
                            color: showOriginalityCheck === concept.id ? colors.brandText : colors.text,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Check Originality
                        </button>
                        <button
                          onClick={() => handleStartEdit(concept)}
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
                          value={concept.status}
                          onChange={(e) => handleChangeStatus(concept.id, e.target.value as 'saved' | 'used' | 'archived')}
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
                          onClick={() => handleDelete(concept.id)}
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

                  {showOriginalityCheck === concept.id && (
                    <div style={{ marginTop: '1rem' }}>
                      <OriginalityChecker
                        contentId={concept.id}
                        contentType="concept"
                        title={concept.title}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
