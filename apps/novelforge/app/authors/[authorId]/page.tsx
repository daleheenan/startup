'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '../../lib/auth';
import { AUTHOR_STYLES } from '../.././../shared/author-styles';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CustomAuthor {
  id: string;
  name: string;
  genres: string[];
  writingStyle: string;
  notableWorks: string[];
  styleKeywords: string[];
  source?: string;
}

export default function AuthorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const authorId = params?.authorId as string;

  const [author, setAuthor] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    genres: [] as string[],
    writingStyle: '',
    notableWorks: [] as string[],
    styleKeywords: [] as string[],
  });

  useEffect(() => {
    loadAuthor();
  }, [authorId]);

  const loadAuthor = async () => {
    try {
      setIsLoading(true);

      // Check if it's a predefined author
      const predefined = AUTHOR_STYLES.find((a) => a.id === authorId);
      if (predefined) {
        setAuthor({
          id: predefined.id,
          name: predefined.fullName,
          type: 'predefined',
          genres: predefined.genres,
          writingStyle: predefined.styleDescription,
          notableWorks: predefined.knownFor,
          styleKeywords: predefined.characteristics.toneSignature,
          icon: predefined.icon,
          era: predefined.era,
          nationality: predefined.nationality,
          bestFor: predefined.bestFor,
          characteristics: predefined.characteristics,
          sampleDescription: predefined.sampleDescription,
        });
      } else {
        // Load custom author from API
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/authors/custom`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch custom authors');
        }

        const data = await response.json();
        const customAuthor = data.authors.find((a: any) => a.id === authorId);

        if (!customAuthor) {
          throw new Error('Author not found');
        }

        setAuthor({
          ...customAuthor,
          type: 'custom',
        });

        setEditForm({
          name: customAuthor.name,
          genres: customAuthor.genres,
          writingStyle: customAuthor.writingStyle,
          notableWorks: customAuthor.notableWorks || [],
          styleKeywords: customAuthor.styleKeywords || [],
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/authors/custom/${authorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update author');
      }

      await loadAuthor();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this custom author?')) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/authors/custom/${authorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete author');
      }

      router.push('/authors');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
      }}>
        <p style={{ color: '#64748B' }}>Loading author...</p>
      </div>
    );
  }

  if (error || !author) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#DC2626', marginBottom: '1rem' }}>{error || 'Author not found'}</p>
          <Link href="/authors" style={{ color: '#667eea' }}>
            Back to Authors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/authors" style={{ color: '#64748B', textDecoration: 'none' }}>
              ← Back to Authors
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {author.type === 'custom' && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#667eea',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#DC2626',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#667eea',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.6 : 1,
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#E2E8F0',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#475569',
                    fontSize: '0.875rem',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '2rem',
            }}>
              {/* Icon and Name */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                  {author.icon || '📚'}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      fontSize: '2rem',
                      fontWeight: 700,
                      padding: '0.5rem',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                    }}
                  />
                ) : (
                  <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: '#1A1A2E',
                    margin: 0,
                  }}>
                    {author.name}
                  </h1>
                )}
                {author.era && (
                  <p style={{ color: '#64748B', marginTop: '0.5rem' }}>
                    {author.era} • {author.nationality}
                  </p>
                )}
                {author.type === 'custom' && author.source && (
                  <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    Source: {author.source}
                  </p>
                )}
              </div>

              {/* Genres */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem',
                }}>
                  Genres
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {author.genres.map((genre: string) => (
                    <span
                      key={genre}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#F1F5F9',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        color: '#475569',
                      }}
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              {/* Writing Style */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem',
                }}>
                  Writing Style
                </h3>
                {isEditing ? (
                  <textarea
                    value={editForm.writingStyle}
                    onChange={(e) => setEditForm({ ...editForm, writingStyle: e.target.value })}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      lineHeight: '1.6',
                      resize: 'vertical',
                    }}
                  />
                ) : (
                  <p style={{
                    color: '#475569',
                    lineHeight: '1.6',
                    fontSize: '0.875rem',
                  }}>
                    {author.writingStyle}
                  </p>
                )}
              </div>

              {/* Notable Works */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem',
                }}>
                  Notable Works
                </h3>
                <ul style={{
                  margin: 0,
                  paddingLeft: '1.5rem',
                  color: '#475569',
                  fontSize: '0.875rem',
                }}>
                  {author.notableWorks.map((work: string) => (
                    <li key={work} style={{ marginBottom: '0.25rem' }}>
                      {work}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Style Keywords */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem',
                }}>
                  Style Keywords
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {author.styleKeywords.map((keyword: string) => (
                    <span
                      key={keyword}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#EEF2FF',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        color: '#667eea',
                      }}
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* Predefined Author Extra Details */}
              {author.type === 'predefined' && (
                <>
                  {author.bestFor && (
                    <div style={{ marginBottom: '2rem' }}>
                      <h3 style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#64748B',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.75rem',
                      }}>
                        Best For
                      </h3>
                      <ul style={{
                        margin: 0,
                        paddingLeft: '1.5rem',
                        color: '#475569',
                        fontSize: '0.875rem',
                      }}>
                        {author.bestFor.map((item: string) => (
                          <li key={item} style={{ marginBottom: '0.25rem' }}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {author.sampleDescription && (
                    <div style={{
                      padding: '1.5rem',
                      background: '#F8FAFC',
                      borderRadius: '12px',
                      borderLeft: '4px solid #667eea',
                    }}>
                      <h3 style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#64748B',
                        marginBottom: '0.75rem',
                      }}>
                        Sample Description
                      </h3>
                      <p style={{
                        color: '#475569',
                        fontSize: '0.875rem',
                        fontStyle: 'italic',
                        lineHeight: '1.6',
                        margin: 0,
                      }}>
                        {author.sampleDescription}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
