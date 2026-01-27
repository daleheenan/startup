'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '../../../components/shared/PageLayout';
import LoadingState from '../../../components/shared/LoadingState';
import { fetchJson } from '../../../lib/fetch-utils';
import { getToken } from '../../../lib/auth';
import { useProjectNavigation } from '@/app/hooks';
import { colors, borderRadius, shadows } from '../../../lib/constants';
import { card } from '../../../lib/styles';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface BookVersion {
  id: string;
  book_id: string;
  version_number: number;
  version_name: string | null;
  is_active: number;
  word_count: number;
  chapter_count: number;
  actual_chapter_count?: number;
  actual_word_count?: number;
  created_at: string;
  completed_at: string | null;
}

interface Book {
  id: string;
  project_id: string;
  book_number: number;
  title: string;
}

interface Project {
  id: string;
  title: string;
  type: string;
  genre: string;
  status: string;
}

export default function VersionHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [versions, setVersions] = useState<BookVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigation = useProjectNavigation(projectId, project, null, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch project
      const projectData = await fetchJson<Project>(`/api/projects/${projectId}`);
      setProject(projectData);

      // Fetch books
      const booksResponse = await fetchJson<{ books: Book[] }>(`/api/books/project/${projectId}`);
      const booksData = booksResponse.books || [];
      setBooks(booksData);

      if (booksData.length > 0) {
        const firstBook = booksData[0];
        setSelectedBookId(firstBook.id);
        await fetchVersionsForBook(firstBook.id);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchVersionsForBook = async (bookId: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/versions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch versions');

      const data = await response.json();
      setVersions(data.versions || []);
    } catch (err: any) {
      console.error('Error fetching versions:', err);
      setVersions([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBookChange = async (bookId: string) => {
    setSelectedBookId(bookId);
    await fetchVersionsForBook(bookId);
  };

  const handleActivateVersion = async (versionId: string) => {
    if (!selectedBookId || isActivating) return;

    setIsActivating(versionId);
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/books/${selectedBookId}/versions/${versionId}/activate`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to activate version');
      }

      await fetchVersionsForBook(selectedBookId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsActivating(null);
    }
  };

  const handleDeleteVersion = async (versionId: string, versionName: string) => {
    if (!selectedBookId || isDeleting) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${versionName}"?\n\nThis will permanently delete all chapters in this version. This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(versionId);
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/books/${selectedBookId}/versions/${versionId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to delete version');
      }

      await fetchVersionsForBook(selectedBookId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCreateVersion = async () => {
    if (!selectedBookId) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/books/${selectedBookId}/versions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to create version');
      }

      await fetchVersionsForBook(selectedBookId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <LoadingState message="Loading version history..." />;
  }

  if (error || !project) {
    return (
      <PageLayout
        title="Error"
        backLink={`/projects/${projectId}`}
        backText="Back to Project"
      >
        <div style={{ ...card, padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: colors.error }}>{error || 'Failed to load data'}</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Version History"
      subtitle={`${project.title}`}
      backLink={`/projects/${projectId}`}
      backText="Back to Project"
      projectNavigation={navigation}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Book Selector (for multi-book projects) */}
        {books.length > 1 && (
          <div style={{ ...card, padding: '1rem', marginBottom: '1.5rem' }}>
            <label style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'block',
              marginBottom: '0.5rem',
            }}>
              Select Book
            </label>
            <select
              value={selectedBookId || ''}
              onChange={(e) => handleBookChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.md,
                fontSize: '0.9375rem',
              }}
            >
              {books.map(book => (
                <option key={book.id} value={book.id}>
                  Book {book.book_number}: {book.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Header with Create Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: colors.text,
            margin: 0,
          }}>
            {versions.length} Version{versions.length !== 1 ? 's' : ''}
          </h2>
          <button
            onClick={handleCreateVersion}
            style={{
              padding: '0.625rem 1rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: borderRadius.md,
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + New Version
          </button>
        </div>

        {/* No Versions */}
        {versions.length === 0 && (
          <div style={{ ...card, padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.125rem', color: colors.text, marginBottom: '0.5rem' }}>
              No Versions Yet
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
              Versions are created automatically when you regenerate chapters after making plot changes.
            </p>
            <button
              onClick={handleCreateVersion}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: borderRadius.md,
                color: '#FFFFFF',
                fontSize: '0.9375rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Create Version 1
            </button>
          </div>
        )}

        {/* Version List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {versions.map(version => {
            const isActive = version.is_active === 1;
            const chapterCount = version.actual_chapter_count || version.chapter_count;
            const wordCount = version.actual_word_count || version.word_count;

            return (
              <div
                key={version.id}
                style={{
                  ...card,
                  padding: '1.5rem',
                  borderLeft: isActive ? `4px solid ${colors.brandStart}` : 'none',
                  background: isActive ? colors.brandLight : colors.surface,
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: colors.text,
                        margin: 0,
                      }}>
                        {version.version_name || `Version ${version.version_number}`}
                      </h3>
                      {isActive && (
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          background: colors.success,
                          borderRadius: borderRadius.sm,
                          color: '#FFFFFF',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}>
                          Active
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: '0.8125rem',
                      color: colors.textSecondary,
                      margin: '0.25rem 0 0 0',
                    }}>
                      Created {formatDate(version.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!isActive && (
                      <button
                        onClick={() => handleActivateVersion(version.id)}
                        disabled={isActivating === version.id}
                        style={{
                          padding: '0.5rem 0.875rem',
                          background: colors.surface,
                          border: `1px solid ${colors.brandBorder}`,
                          borderRadius: borderRadius.md,
                          color: colors.brandText,
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          cursor: isActivating === version.id ? 'not-allowed' : 'pointer',
                          opacity: isActivating === version.id ? 0.7 : 1,
                        }}
                      >
                        {isActivating === version.id ? 'Activating...' : 'Make Active'}
                      </button>
                    )}
                    {!isActive && versions.length > 1 && (
                      <button
                        onClick={() => handleDeleteVersion(
                          version.id,
                          version.version_name || `Version ${version.version_number}`
                        )}
                        disabled={isDeleting === version.id}
                        style={{
                          padding: '0.5rem 0.875rem',
                          background: colors.surface,
                          border: `1px solid ${colors.errorBorder}`,
                          borderRadius: borderRadius.md,
                          color: colors.error,
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          cursor: isDeleting === version.id ? 'not-allowed' : 'pointer',
                          opacity: isDeleting === version.id ? 0.7 : 1,
                        }}
                      >
                        {isDeleting === version.id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '1rem',
                }}>
                  <div style={{
                    padding: '0.75rem',
                    background: isActive ? colors.surface : colors.background,
                    borderRadius: borderRadius.md,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.text }}>
                      {chapterCount}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                      Chapters
                    </div>
                  </div>
                  <div style={{
                    padding: '0.75rem',
                    background: isActive ? colors.surface : colors.background,
                    borderRadius: borderRadius.md,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.text }}>
                      {(wordCount / 1000).toFixed(1)}k
                    </div>
                    <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                      Words
                    </div>
                  </div>
                  {version.completed_at && (
                    <div style={{
                      padding: '0.75rem',
                      background: isActive ? colors.surface : colors.background,
                      borderRadius: borderRadius.md,
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.success }}>
                        Complete
                      </div>
                      <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                        {formatDate(version.completed_at).split(',')[0]}
                      </div>
                    </div>
                  )}
                </div>

                {/* View Chapters Link */}
                {isActive && chapterCount > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <Link
                      href={`/projects/${projectId}/read`}
                      style={{
                        display: 'inline-block',
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        borderRadius: borderRadius.md,
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                      }}
                    >
                      Read This Version
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}
