'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, logout } from '../lib/auth';

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

  useEffect(() => {
    loadConcepts();
  }, []);

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
      setConcepts(data.concepts);
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

  const handleUseConcept = async (concept: SavedConcept) => {
    try {
      const token = getToken();

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
          preferences: concept.preferences
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

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            width: '48px',
            height: '48px',
            border: '3px solid #E2E8F0',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '1rem', color: '#64748B' }}>Loading saved concepts...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#F8FAFC',
    }}>
      {/* Left Sidebar */}
      <aside style={{
        width: '72px',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem 0',
      }}>
        <Link
          href="/projects"
          style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: '1.25rem',
            textDecoration: 'none',
          }}
        >
          N
        </Link>
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
              Saved Concepts
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Story ideas you've saved for later
            </p>
          </div>
          <Link
            href="/projects"
            style={{
              padding: '0.5rem 1rem',
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            ← Back to Projects
          </Link>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '1rem 1.5rem',
                marginBottom: '1.5rem',
                color: '#DC2626',
              }}>
                {error}
              </div>
            )}

            {concepts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '2px dashed #E2E8F0',
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💡</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1A1A2E' }}>
                  No Saved Concepts Yet
                </h2>
                <p style={{ fontSize: '1rem', color: '#64748B', marginBottom: '2rem' }}>
                  When you generate story concepts, you can save your favorites to revisit later.
                </p>
                <Link
                  href="/new"
                  style={{
                    display: 'inline-block',
                    padding: '1rem 2rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  Generate New Concepts
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {concepts.map(concept => (
                  <div
                    key={concept.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1A1A2E', marginBottom: '0.5rem' }}>
                          {concept.title}
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: '#64748B', fontStyle: 'italic', marginBottom: '1rem' }}>
                          {concept.logline}
                        </p>

                        {expandedConcept === concept.id && (
                          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1rem', lineHeight: '1.6' }}>
                              {concept.synopsis}
                            </p>
                            {concept.notes && (
                              <div style={{
                                background: '#FFF7ED',
                                border: '1px solid #FED7AA',
                                borderRadius: '8px',
                                padding: '0.75rem',
                                marginTop: '0.75rem',
                              }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9A3412', marginBottom: '0.25rem' }}>
                                  Your Notes
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#7C2D12' }}>
                                  {concept.notes}
                                </div>
                              </div>
                            )}
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#64748B',
                              marginTop: '1rem',
                              display: 'flex',
                              gap: '1.5rem',
                            }}>
                              <span>Genre: {concept.preferences?.genre || 'Not specified'}</span>
                              <span>Saved: {new Date(concept.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ marginLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                          onClick={() => setExpandedConcept(expandedConcept === concept.id ? null : concept.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            color: '#374151',
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
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#FFFFFF',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Use Concept
                        </button>
                        <button
                          onClick={() => handleDelete(concept.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#FFFFFF',
                            border: '1px solid #FECACA',
                            borderRadius: '6px',
                            color: '#DC2626',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
