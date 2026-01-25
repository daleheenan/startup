'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getToken } from '../../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface GenreRecipe {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  genres: string[];
  tones: string[];
  themes: string[];
  modifiers: string[];
  target_length: number;
  created_at: string;
  updated_at: string;
}

// Genre options
const GENRE_OPTIONS = [
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
  { value: 'grimdark', label: 'Grimdark' },
];

// Tone options
const TONE_OPTIONS = [
  { value: 'Dark and Gritty', label: 'Dark and Gritty' },
  { value: 'Light and Humorous', label: 'Light and Humorous' },
  { value: 'Epic and Grand', label: 'Epic and Grand' },
  { value: 'Intimate and Personal', label: 'Intimate and Personal' },
  { value: 'Mysterious and Suspenseful', label: 'Mysterious and Suspenseful' },
  { value: 'Hopeful and Uplifting', label: 'Hopeful and Uplifting' },
  { value: 'Tense and Fast-Paced', label: 'Tense and Fast-Paced' },
  { value: 'Romantic and Passionate', label: 'Romantic and Passionate' },
  { value: 'Whimsical and Fantastical', label: 'Whimsical and Fantastical' },
  { value: 'Melancholic and Reflective', label: 'Melancholic and Reflective' },
];

// Theme options
const THEME_OPTIONS = [
  { value: 'Good vs Evil', label: 'Good vs Evil' },
  { value: 'Power and Corruption', label: 'Power and Corruption' },
  { value: 'Identity and Self-Discovery', label: 'Identity and Self-Discovery' },
  { value: 'Love and Sacrifice', label: 'Love and Sacrifice' },
  { value: 'Revenge and Justice', label: 'Revenge and Justice' },
  { value: 'Survival', label: 'Survival' },
  { value: 'Family and Loyalty', label: 'Family and Loyalty' },
  { value: 'Freedom and Oppression', label: 'Freedom and Oppression' },
  { value: 'Redemption', label: 'Redemption' },
  { value: 'Coming of Age', label: 'Coming of Age' },
  { value: 'Forbidden Love', label: 'Forbidden Love' },
  { value: 'Nature vs Technology', label: 'Nature vs Technology' },
];

// Modifier options
const MODIFIER_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'epic', label: 'Epic' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'political', label: 'Political' },
  { value: 'military', label: 'Military' },
  { value: 'psychological', label: 'Psychological' },
  { value: 'action', label: 'Action' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'cozy', label: 'Cozy' },
  { value: 'comedic', label: 'Comedic' },
];

// Target length options
const LENGTH_OPTIONS = [
  { value: 50000, label: 'Novella (~50k words)' },
  { value: 70000, label: 'Short Novel (~70k words)' },
  { value: 80000, label: 'Standard Novel (~80k words)' },
  { value: 100000, label: 'Long Novel (~100k words)' },
  { value: 120000, label: 'Epic (~120k words)' },
];

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<GenreRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<GenreRecipe | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    genres: [] as string[],
    tones: [] as string[],
    themes: [] as string[],
    modifiers: [] as string[],
    targetLength: 80000,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Expanded recipe for details
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/user-settings/recipes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }

      const data = await response.json();
      setRecipes(data.recipes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      if (formData.genres.length === 0) {
        throw new Error('Please select at least one genre');
      }
      if (formData.tones.length === 0) {
        throw new Error('Please select at least one tone');
      }

      const token = getToken();
      const url = editingRecipe
        ? `${API_BASE_URL}/api/user-settings/recipes/${editingRecipe.id}`
        : `${API_BASE_URL}/api/user-settings/recipes`;

      const response = await fetch(url, {
        method: editingRecipe ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          genres: formData.genres,
          tones: formData.tones,
          themes: formData.themes,
          modifiers: formData.modifiers,
          targetLength: formData.targetLength,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to save recipe');
      }

      await fetchRecipes();
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save recipe');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (recipe: GenreRecipe) => {
    setEditingRecipe(recipe);
    setFormData({
      name: recipe.name,
      description: recipe.description || '',
      genres: recipe.genres,
      tones: recipe.tones,
      themes: recipe.themes,
      modifiers: recipe.modifiers,
      targetLength: recipe.target_length,
    });
    setShowForm(true);
    setFormError(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/user-settings/recipes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete recipe');
      }

      await fetchRecipes();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete recipe');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingRecipe(null);
    setFormData({
      name: '',
      description: '',
      genres: [],
      tones: [],
      themes: [],
      modifiers: [],
      targetLength: 80000,
    });
    setFormError(null);
  };

  const toggleArrayItem = (array: string[], item: string): string[] => {
    if (array.includes(item)) {
      return array.filter((i) => i !== item);
    }
    return [...array, item];
  };

  // Filter recipes
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch =
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      recipe.genres.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
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
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '0.875rem',
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
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
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
              Genre Recipes
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Save your favorite genre combinations as reusable presets
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            + Create Recipe
          </button>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Search */}
            <div style={{
              marginBottom: '1.5rem',
            }}>
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
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
                Loading recipes...
              </div>
            )}

            {/* Empty State */}
            {!loading && recipes.length === 0 && (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '3rem',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>R</div>
                <h3 style={{ color: '#1A1A2E', marginBottom: '0.5rem' }}>No Recipes Yet</h3>
                <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
                  Create your first genre recipe to quickly start new projects with your favorite settings.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Create First Recipe
                </button>
              </div>
            )}

            {/* Recipes List */}
            {!loading && filteredRecipes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Recipe Header */}
                    <div
                      style={{
                        padding: '1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        cursor: 'pointer',
                      }}
                      onClick={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: '#1A1A2E',
                            margin: 0,
                          }}>
                            {recipe.name}
                          </h3>
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#64748B',
                            background: '#F1F5F9',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                          }}>
                            {(recipe.target_length / 1000).toFixed(0)}k words
                          </span>
                        </div>
                        {recipe.description && (
                          <p style={{
                            fontSize: '0.875rem',
                            color: '#64748B',
                            margin: 0,
                            marginBottom: '0.75rem',
                          }}>
                            {recipe.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {recipe.genres.map((g) => (
                            <span
                              key={g}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: '#E0E7FF',
                                color: '#4338CA',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                              }}
                            >
                              {GENRE_OPTIONS.find((o) => o.value === g)?.label || g}
                            </span>
                          ))}
                          {recipe.tones.map((t) => (
                            <span
                              key={t}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: '#D1FAE5',
                                color: '#059669',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                              }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(recipe);
                          }}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: '#F1F5F9',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#64748B',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        {deleteConfirm === recipe.id ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(recipe.id);
                              }}
                              style={{
                                padding: '0.5rem 0.75rem',
                                background: '#DC2626',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#FFFFFF',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                              }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(null);
                              }}
                              style={{
                                padding: '0.5rem 0.75rem',
                                background: '#F1F5F9',
                                border: 'none',
                                borderRadius: '6px',
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(recipe.id);
                            }}
                            style={{
                              padding: '0.5rem 0.75rem',
                              background: '#FEF2F2',
                              border: 'none',
                              borderRadius: '6px',
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

                    {/* Expanded Details */}
                    {expandedRecipe === recipe.id && (
                      <div style={{
                        padding: '1.25rem',
                        borderTop: '1px solid #E2E8F0',
                        background: '#F8FAFC',
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                          {recipe.themes.length > 0 && (
                            <div>
                              <h4 style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#64748B',
                                textTransform: 'uppercase',
                                marginBottom: '0.5rem',
                              }}>
                                Themes
                              </h4>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {recipe.themes.map((t) => (
                                  <span
                                    key={t}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      background: '#FEF3C7',
                                      color: '#D97706',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {recipe.modifiers.length > 0 && (
                            <div>
                              <h4 style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#64748B',
                                textTransform: 'uppercase',
                                marginBottom: '0.5rem',
                              }}>
                                Modifiers
                              </h4>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {recipe.modifiers.map((m) => (
                                  <span
                                    key={m}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      background: '#FCE7F3',
                                      color: '#DB2777',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{
                          marginTop: '1rem',
                          paddingTop: '1rem',
                          borderTop: '1px solid #E2E8F0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                            Created {new Date(recipe.created_at).toLocaleDateString()}
                          </span>
                          <Link
                            href={`/new?recipe=${recipe.id}`}
                            style={{
                              padding: '0.5rem 1rem',
                              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#FFFFFF',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              textDecoration: 'none',
                            }}
                          >
                            Use This Recipe
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && recipes.length > 0 && filteredRecipes.length === 0 && (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'center',
                color: '#64748B',
              }}>
                No recipes match your search criteria
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
            maxWidth: '700px',
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
              {editingRecipe ? 'Edit Recipe' : 'Create Recipe'}
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

              {/* Name */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}>
                  Recipe Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Dark Urban Fantasy"
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

              {/* Description */}
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
                  placeholder="Describe what kind of stories this recipe creates..."
                  rows={2}
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

              {/* Genres */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}>
                  Genres <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {GENRE_OPTIONS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, genres: toggleArrayItem(formData.genres, g.value) })}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: formData.genres.includes(g.value) ? '#E0E7FF' : '#F8FAFC',
                        border: `1px solid ${formData.genres.includes(g.value) ? '#4338CA' : '#E2E8F0'}`,
                        borderRadius: '6px',
                        color: formData.genres.includes(g.value) ? '#4338CA' : '#64748B',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tones */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}>
                  Tones <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, tones: toggleArrayItem(formData.tones, t.value) })}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: formData.tones.includes(t.value) ? '#D1FAE5' : '#F8FAFC',
                        border: `1px solid ${formData.tones.includes(t.value) ? '#059669' : '#E2E8F0'}`,
                        borderRadius: '6px',
                        color: formData.tones.includes(t.value) ? '#059669' : '#64748B',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Themes */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}>
                  Themes (optional)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {THEME_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, themes: toggleArrayItem(formData.themes, t.value) })}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: formData.themes.includes(t.value) ? '#FEF3C7' : '#F8FAFC',
                        border: `1px solid ${formData.themes.includes(t.value) ? '#D97706' : '#E2E8F0'}`,
                        borderRadius: '6px',
                        color: formData.themes.includes(t.value) ? '#D97706' : '#64748B',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modifiers */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}>
                  Modifiers (optional)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {MODIFIER_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, modifiers: toggleArrayItem(formData.modifiers, m.value) })}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: formData.modifiers.includes(m.value) ? '#FCE7F3' : '#F8FAFC',
                        border: `1px solid ${formData.modifiers.includes(m.value) ? '#DB2777' : '#E2E8F0'}`,
                        borderRadius: '6px',
                        color: formData.modifiers.includes(m.value) ? '#DB2777' : '#64748B',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Length */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}>
                  Target Length
                </label>
                <select
                  value={formData.targetLength}
                  onChange={(e) => setFormData({ ...formData, targetLength: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                >
                  {LENGTH_OPTIONS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
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
                  disabled={formLoading || !formData.name.trim() || formData.genres.length === 0 || formData.tones.length === 0}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: formLoading || !formData.name.trim() || formData.genres.length === 0 || formData.tones.length === 0
                      ? '#94A3B8'
                      : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: formLoading || !formData.name.trim() || formData.genres.length === 0 || formData.tones.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {formLoading ? 'Saving...' : editingRecipe ? 'Update Recipe' : 'Create Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
