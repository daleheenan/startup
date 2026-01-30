'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getToken } from '../../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CustomGenre {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  parent_genre: string | null;
  created_at: string;
}

// Parent genre options (common base genres)
const PARENT_GENRES = [
  { value: '', label: 'None (Standalone Genre)' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'science-fiction', label: 'Science Fiction' },
  { value: 'romance', label: 'Romance' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'horror', label: 'Horror' },
  { value: 'historical', label: 'Historical Fiction' },
  { value: 'literary', label: 'Literary Fiction' },
  { value: 'contemporary', label: 'Contemporary Fiction' },
  { value: 'romantasy', label: 'Romantasy' },
  { value: 'cozy-fantasy', label: 'Cozy Fantasy' },
];

export default function CustomGenresPage() {
  const [genres, setGenres] = useState<CustomGenre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [parentFilter, setParentFilter] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingGenre, setEditingGenre] = useState<CustomGenre | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentGenre: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/user-settings/genres`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch custom genres');
      }

      const data = await response.json();
      setGenres(data.genres || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load custom genres');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const token = getToken();
      const url = editingGenre
        ? `${API_BASE_URL}/api/user-settings/genres/${editingGenre.id}`
        : `${API_BASE_URL}/api/user-settings/genres`;

      const response = await fetch(url, {
        method: editingGenre ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          parentGenre: formData.parentGenre || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to save genre');
      }

      await fetchGenres();
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save genre');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (genre: CustomGenre) => {
    setEditingGenre(genre);
    setFormData({
      name: genre.name,
      description: genre.description || '',
      parentGenre: genre.parent_genre || '',
    });
    setShowForm(true);
    setFormError(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/user-settings/genres/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete genre');
      }

      await fetchGenres();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete genre');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingGenre(null);
    setFormData({ name: '', description: '', parentGenre: '' });
    setFormError(null);
  };

  // Filter genres
  const filteredGenres = genres.filter((genre) => {
    const matchesSearch =
      genre.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (genre.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesParent = !parentFilter || genre.parent_genre === parentFilter;
    return matchesSearch && matchesParent;
  });

  // Group genres by parent
  const groupedGenres: Record<string, CustomGenre[]> = {};
  filteredGenres.forEach((genre) => {
    const parent = genre.parent_genre || 'Standalone';
    if (!groupedGenres[parent]) {
      groupedGenres[parent] = [];
    }
    groupedGenres[parent].push(genre);
  });

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#F8FAFC',
    }}>
      {/* Left Sidebar */}
      <aside style={{
        width: '240px',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem',
      }}>
        <Link
          href="/settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '2rem',
            color: '#64748B',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          Back to Settings
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link
            href="/settings/genres"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            Custom Genres
          </Link>
          <Link
            href="/settings/exclusions"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Exclusions
          </Link>
          <Link
            href="/settings/recipes"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Genre Recipes
          </Link>
        </nav>
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
              Custom Genres
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Create personalized genre categories for your projects
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            + Add Custom Genre
          </button>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Search and Filters */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}>
              <input
                type="text"
                placeholder="Search genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
              />
              <select
                value={parentFilter}
                onChange={(e) => setParentFilter(e.target.value)}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  minWidth: '180px',
                }}
              >
                <option value="">All Parent Genres</option>
                {PARENT_GENRES.filter(p => p.value).map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
                <option value="Standalone">Standalone</option>
              </select>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                color: '#DC2626',
              }}>
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                Loading custom genres...
              </div>
            )}

            {/* Empty State */}
            {!loading && genres.length === 0 && (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '3rem',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>G</div>
                <h3 style={{ color: '#1A1A2E', marginBottom: '0.5rem' }}>No Custom Genres Yet</h3>
                <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
                  Create your first custom genre to personalize your story creation.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Create Custom Genre
                </button>
              </div>
            )}

            {/* Genres List */}
            {!loading && filteredGenres.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {Object.entries(groupedGenres).map(([parent, genreList]) => (
                  <div key={parent}>
                    <h2 style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.75rem',
                    }}>
                      {parent === 'Standalone' ? 'Standalone Genres' : `Based on ${PARENT_GENRES.find(p => p.value === parent)?.label || parent}`}
                    </h2>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '1rem',
                    }}>
                      {genreList.map((genre) => (
                        <div
                          key={genre.id}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                            padding: '1.25rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <h3 style={{
                              fontSize: '1rem',
                              fontWeight: '600',
                              color: '#1A1A2E',
                              margin: 0,
                            }}>
                              {genre.name}
                            </h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleEdit(genre)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: '#F1F5F9',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: '#64748B',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Edit
                              </button>
                              {deleteConfirm === genre.id ? (
                                <>
                                  <button
                                    onClick={() => handleDelete(genre.id)}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      background: '#DC2626',
                                      border: 'none',
                                      borderRadius: '4px',
                                      color: '#FFFFFF',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      background: '#F1F5F9',
                                      border: 'none',
                                      borderRadius: '4px',
                                      color: '#64748B',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(genre.id)}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    background: '#FEF2F2',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: '#DC2626',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                          {genre.description && (
                            <p style={{
                              fontSize: '0.875rem',
                              color: '#64748B',
                              margin: 0,
                              lineHeight: 1.5,
                            }}>
                              {genre.description}
                            </p>
                          )}
                          <div style={{
                            marginTop: '0.75rem',
                            fontSize: '0.75rem',
                            color: '#94A3B8',
                          }}>
                            Created {new Date(genre.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && genres.length > 0 && filteredGenres.length === 0 && (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'center',
                color: '#64748B',
              }}>
                No genres match your search criteria
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1A1A2E',
              margin: 0,
              marginBottom: '1.5rem',
            }}>
              {editingGenre ? 'Edit Custom Genre' : 'Add Custom Genre'}
            </h2>

            <form onSubmit={handleSubmit}>
              {formError && (
                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  color: '#DC2626',
                  fontSize: '0.875rem',
                }}>
                  {formError}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}>
                  Genre Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Cozy Cat Mystery"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what makes this genre unique..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}>
                  Parent Genre
                </label>
                <select
                  value={formData.parentGenre}
                  onChange={(e) => setFormData({ ...formData, parentGenre: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                >
                  {PARENT_GENRES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#64748B',
                  marginTop: '0.5rem',
                }}>
                  Optional: Link this genre to a parent category for organization
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#64748B',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !formData.name.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: formLoading || !formData.name.trim()
                      ? '#94A3B8'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: formLoading || !formData.name.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {formLoading ? 'Saving...' : editingGenre ? 'Update Genre' : 'Create Genre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
