'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getToken, logout } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Author {
  id: string;
  name: string;
  type: 'predefined' | 'custom';
  genres: string[];
  writingStyle: string;
  notableWorks: string[];
  styleKeywords: string[];
  icon?: string;
  era?: string;
  nationality?: string;
  bestFor?: string[];
  source?: string;
  isFavorite: boolean;
}

type TabType = 'all' | 'favorites' | 'custom';

const GENRES = [
  'All Genres',
  'fantasy',
  'science-fiction',
  'romance',
  'mystery',
  'thriller',
  'horror',
  'literary',
  'historical',
  'contemporary',
  'grimdark',
  'romantasy',
];

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [filteredAuthors, setFilteredAuthors] = useState<Author[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('All Genres');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch authors
  useEffect(() => {
    fetchAuthors();
  }, []);

  // Filter authors based on tab, genre, and search
  useEffect(() => {
    let filtered = [...authors];

    // Tab filter
    if (activeTab === 'favorites') {
      filtered = filtered.filter((a) => a.isFavorite);
    } else if (activeTab === 'custom') {
      filtered = filtered.filter((a) => a.type === 'custom');
    }

    // Genre filter
    if (selectedGenre !== 'All Genres') {
      filtered = filtered.filter((a) =>
        a.genres.some((g) => g.toLowerCase() === selectedGenre.toLowerCase())
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a) =>
        a.name.toLowerCase().includes(query)
      );
    }

    setFilteredAuthors(filtered);
  }, [authors, activeTab, selectedGenre, searchQuery]);

  const fetchAuthors = async () => {
    try {
      setIsLoading(true);
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/authors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        logout();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch authors');
      }

      const data = await response.json();
      setAuthors(data.authors || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (author: Author) => {
    try {
      const token = getToken();
      const method = author.isFavorite ? 'DELETE' : 'POST';
      const url = `${API_BASE_URL}/api/authors/favorites/${author.id}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: method === 'POST' ? JSON.stringify({ authorType: author.type }) : undefined,
      });

      if (response.status === 401) {
        logout();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to update favorite');
      }

      // Update local state
      setAuthors((prev) =>
        prev.map((a) =>
          a.id === author.id ? { ...a, isFavorite: !a.isFavorite } : a
        )
      );
    } catch (err: any) {
      console.error('Error toggling favorite:', err);
    }
  };

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
          <div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1A1A2E',
              margin: 0,
            }}>
              Author Style Library
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Browse and manage writing style references
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Add Custom Author
            </button>
            <Link
              href="/new"
              style={{
                padding: '0.5rem 1rem',
                color: '#64748B',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              Back to New Project
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Tabs */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #E2E8F0',
            }}>
              {[
                { key: 'all', label: 'All Authors' },
                { key: 'favorites', label: 'My Favorites' },
                { key: 'custom', label: 'Custom Authors' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab.key ? '2px solid #667eea' : '2px solid transparent',
                    color: activeTab === tab.key ? '#667eea' : '#64748B',
                    fontWeight: activeTab === tab.key ? 600 : 400,
                    cursor: 'pointer',
                    marginBottom: '-2px',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}>
              {/* Search */}
              <input
                type="text"
                placeholder="Search authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
              />

              {/* Genre Filter */}
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {GENRES.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                Loading authors...
              </div>
            )}

            {/* Error State */}
            {error && (
              <div style={{
                padding: '1rem',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                color: '#DC2626',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            {/* Authors Grid */}
            {!isLoading && !error && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '1.5rem',
              }}>
                {filteredAuthors.map((author) => (
                  <div
                    key={author.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      position: 'relative',
                    }}
                  >
                    {/* Favorite Button */}
                    <button
                      onClick={() => toggleFavorite(author)}
                      style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: author.isFavorite ? '#DC2626' : '#CBD5E1',
                      }}
                    >
                      {author.isFavorite ? '❤️' : '🤍'}
                    </button>

                    {/* Icon or Type Badge */}
                    <div style={{
                      fontSize: '2rem',
                      marginBottom: '0.75rem',
                    }}>
                      {author.icon || (author.type === 'custom' ? '✍️' : '📚')}
                    </div>

                    {/* Name */}
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: '#1A1A2E',
                      marginBottom: '0.5rem',
                    }}>
                      {author.name}
                    </h3>

                    {/* Metadata */}
                    {author.era && (
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#64748B',
                        marginBottom: '0.5rem',
                      }}>
                        {author.era} • {author.nationality}
                      </p>
                    )}

                    {/* Genres */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                    }}>
                      {author.genres.slice(0, 3).map((genre) => (
                        <span
                          key={genre}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: '#F1F5F9',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            color: '#475569',
                          }}
                        >
                          {genre}
                        </span>
                      ))}
                    </div>

                    {/* Writing Style */}
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#475569',
                      lineHeight: '1.5',
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {author.writingStyle}
                    </p>

                    {/* View Details Link */}
                    <Link
                      href={`/authors/${author.id}`}
                      style={{
                        color: '#667eea',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textDecoration: 'none',
                      }}
                    >
                      View Details →
                    </Link>
                  </div>
                ))}

                {/* Empty State */}
                {filteredAuthors.length === 0 && (
                  <div style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '3rem',
                    color: '#64748B',
                  }}>
                    No authors found. Try adjusting your filters.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Author Modal - Placeholder */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
          }}>
            <h2 style={{ marginBottom: '1rem' }}>Add Custom Author</h2>
            <p style={{ color: '#64748B' }}>
              This feature will be implemented with the AddAuthorModal component.
            </p>
            <button
              onClick={() => setShowAddModal(false)}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: '#667eea',
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
