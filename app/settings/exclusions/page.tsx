'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getToken } from '../../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Exclusion {
  id: string;
  user_id: string;
  type: 'name' | 'word' | 'theme' | 'trope';
  value: string;
  reason: string | null;
  created_at: string;
}

const EXCLUSION_TYPES = [
  { value: 'name', label: 'Names', description: 'Character names to avoid', icon: 'N' },
  { value: 'word', label: 'Words', description: 'Words or phrases to exclude', icon: 'W' },
  { value: 'theme', label: 'Themes', description: 'Story themes to skip', icon: 'T' },
  { value: 'trope', label: 'Tropes', description: 'Overused tropes to avoid', icon: 'R' },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  name: { bg: '#E0E7FF', text: '#4338CA' },
  word: { bg: '#FEE2E2', text: '#DC2626' },
  theme: { bg: '#D1FAE5', text: '#059669' },
  trope: { bg: '#FEF3C7', text: '#D97706' },
};

export default function ExclusionsPage() {
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingExclusion, setEditingExclusion] = useState<Exclusion | null>(null);
  const [formData, setFormData] = useState({
    type: 'name' as Exclusion['type'],
    value: '',
    reason: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Bulk add state
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkType, setBulkType] = useState<Exclusion['type']>('name');
  const [bulkValues, setBulkValues] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchExclusions();
  }, []);

  const fetchExclusions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/user-settings/exclusions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch exclusions');
      }

      const data = await response.json();
      setExclusions(data.exclusions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load exclusions');
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
      const url = editingExclusion
        ? `${API_BASE_URL}/api/user-settings/exclusions/${editingExclusion.id}`
        : `${API_BASE_URL}/api/user-settings/exclusions`;

      const response = await fetch(url, {
        method: editingExclusion ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: formData.type,
          value: formData.value.trim(),
          reason: formData.reason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to save exclusion');
      }

      await fetchExclusions();
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save exclusion');
    } finally {
      setFormLoading(false);
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkValues.trim()) return;

    setBulkLoading(true);
    try {
      const token = getToken();
      const values = bulkValues
        .split('\n')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      const exclusionsToAdd = values.map((value) => ({
        type: bulkType,
        value,
      }));

      const response = await fetch(`${API_BASE_URL}/api/user-settings/exclusions/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ exclusions: exclusionsToAdd }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to bulk add exclusions');
      }

      const result = await response.json();
      alert(`Added ${result.created.length} exclusions. ${result.skipped.length} were skipped (duplicates or invalid).`);

      await fetchExclusions();
      setShowBulkAdd(false);
      setBulkValues('');
    } catch (err: any) {
      alert(err.message || 'Failed to bulk add exclusions');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleEdit = (exclusion: Exclusion) => {
    setEditingExclusion(exclusion);
    setFormData({
      type: exclusion.type,
      value: exclusion.value,
      reason: exclusion.reason || '',
    });
    setShowForm(true);
    setFormError(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/user-settings/exclusions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete exclusion');
      }

      await fetchExclusions();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete exclusion');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingExclusion(null);
    setFormData({ type: 'name', value: '', reason: '' });
    setFormError(null);
  };

  // Filter exclusions
  const filteredExclusions = exclusions.filter((exc) => {
    const matchesSearch =
      exc.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exc.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesType = !typeFilter || exc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Count by type
  const countByType = EXCLUSION_TYPES.map((t) => ({
    ...t,
    count: exclusions.filter((e) => e.type === t.value).length,
  }));

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
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
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
              Exclusions
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Manage blacklisted names, words, themes, and tropes
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setShowBulkAdd(true)}
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
              Bulk Add
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              + Add Exclusion
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* Type Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}>
              {countByType.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setTypeFilter(typeFilter === type.value ? '' : type.value)}
                  style={{
                    padding: '1rem',
                    background: typeFilter === type.value ? TYPE_COLORS[type.value].bg : '#FFFFFF',
                    border: `1px solid ${typeFilter === type.value ? TYPE_COLORS[type.value].text : '#E2E8F0'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.5rem',
                  }}>
                    <span style={{
                      width: '32px',
                      height: '32px',
                      background: TYPE_COLORS[type.value].bg,
                      color: TYPE_COLORS[type.value].text,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                    }}>
                      {type.icon}
                    </span>
                    <span style={{
                      fontWeight: '600',
                      color: '#1A1A2E',
                      fontSize: '0.875rem',
                    }}>
                      {type.label}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: TYPE_COLORS[type.value].text,
                  }}>
                    {type.count}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#64748B',
                  }}>
                    {type.description}
                  </div>
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{
              marginBottom: '1.5rem',
            }}>
              <input
                type="text"
                placeholder="Search exclusions..."
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
                Loading exclusions...
              </div>
            )}

            {/* Empty State */}
            {!loading && exclusions.length === 0 && (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '3rem',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>X</div>
                <h3 style={{ color: '#1A1A2E', marginBottom: '0.5rem' }}>No Exclusions Yet</h3>
                <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
                  Add names, words, themes, or tropes you want to avoid in your stories.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Add First Exclusion
                </button>
              </div>
            )}

            {/* Exclusions List */}
            {!loading && filteredExclusions.length > 0 && (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Type</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Value</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Reason</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExclusions.map((exc) => (
                      <tr key={exc.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.5rem',
                            background: TYPE_COLORS[exc.type].bg,
                            color: TYPE_COLORS[exc.type].text,
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            textTransform: 'capitalize',
                          }}>
                            {exc.type}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1A1A2E', fontWeight: '500' }}>
                          {exc.value}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748B' }}>
                          {exc.reason || '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleEdit(exc)}
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
                            {deleteConfirm === exc.id ? (
                              <>
                                <button
                                  onClick={() => handleDelete(exc.id)}
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
                                onClick={() => setDeleteConfirm(exc.id)}
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* No Results */}
            {!loading && exclusions.length > 0 && filteredExclusions.length === 0 && (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'center',
                color: '#64748B',
              }}>
                No exclusions match your search criteria
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
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1A1A2E',
              margin: 0,
              marginBottom: '1.5rem',
            }}>
              {editingExclusion ? 'Edit Exclusion' : 'Add Exclusion'}
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
                  Type <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {EXCLUSION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t.value as Exclusion['type'] })}
                      style={{
                        padding: '0.75rem',
                        background: formData.type === t.value ? TYPE_COLORS[t.value].bg : '#F8FAFC',
                        border: `1px solid ${formData.type === t.value ? TYPE_COLORS[t.value].text : '#E2E8F0'}`,
                        borderRadius: '8px',
                        color: formData.type === t.value ? TYPE_COLORS[t.value].text : '#64748B',
                        fontWeight: '500',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}>
                  Value <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === 'name' ? 'e.g., Bob, Alice' : formData.type === 'word' ? 'e.g., suddenly' : formData.type === 'theme' ? 'e.g., Chosen One' : 'e.g., Love Triangle'}
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

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#374151',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}>
                  Reason (optional)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Why are you excluding this?"
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
                  disabled={formLoading || !formData.value.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: formLoading || !formData.value.trim()
                      ? '#94A3B8'
                      : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: formLoading || !formData.value.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {formLoading ? 'Saving...' : editingExclusion ? 'Update' : 'Add Exclusion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkAdd && (
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
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1A1A2E',
              margin: 0,
              marginBottom: '1.5rem',
            }}>
              Bulk Add Exclusions
            </h2>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#374151',
                fontWeight: '500',
                fontSize: '0.875rem',
              }}>
                Type
              </label>
              <select
                value={bulkType}
                onChange={(e) => setBulkType(e.target.value as Exclusion['type'])}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              >
                {EXCLUSION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#374151',
                fontWeight: '500',
                fontSize: '0.875rem',
              }}>
                Values (one per line)
              </label>
              <textarea
                value={bulkValues}
                onChange={(e) => setBulkValues(e.target.value)}
                placeholder={'Enter one value per line:\nBob\nAlice\nChad'}
                rows={8}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                }}
              />
              <p style={{
                fontSize: '0.75rem',
                color: '#64748B',
                marginTop: '0.5rem',
              }}>
                {bulkValues.split('\n').filter(v => v.trim()).length} items to add
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowBulkAdd(false);
                  setBulkValues('');
                }}
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
                onClick={handleBulkAdd}
                disabled={bulkLoading || !bulkValues.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: bulkLoading || !bulkValues.trim()
                    ? '#94A3B8'
                    : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: bulkLoading || !bulkValues.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {bulkLoading ? 'Adding...' : 'Add All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
