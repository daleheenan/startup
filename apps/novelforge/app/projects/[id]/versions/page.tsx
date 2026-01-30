'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import { fetchJson } from '../../../lib/fetch-utils';
import { getToken } from '../../../lib/auth';
import { colors, borderRadius, shadows } from '../../../lib/constants';
import { card } from '../../../lib/styles';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface BookVersion {
  id: string;
  book_id: string;
  version_number: number;
  version_name: string | null;
  notes: string | null;
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
  const [isMigrating, setIsMigrating] = useState(false);
  const [legacyChapterCount, setLegacyChapterCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<{ message: string; retryAfter: number } | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Edit state for version name and notes
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);


  // Handle rate limit countdown timer
  useEffect(() => {
    if (rateLimitCountdown <= 0) {
      if (rateLimitError) {
        setRateLimitError(null);
      }
      return;
    }

    const timer = setInterval(() => {
      setRateLimitCountdown(prev => {
        if (prev <= 1) {
          setRateLimitError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitCountdown, rateLimitError]);

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

      // If no versions, check for legacy chapters
      if (!data.versions || data.versions.length === 0) {
        try {
          const chaptersRes = await fetch(`${API_BASE_URL}/api/chapters/book/${bookId}?allVersions=true`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (chaptersRes.ok) {
            const chaptersData = await chaptersRes.json();
            const chapters = chaptersData.chapters || [];
            // Count chapters without version_id (legacy)
            setLegacyChapterCount(chapters.length);
          }
        } catch {
          // Ignore errors checking legacy chapters
        }
      } else {
        setLegacyChapterCount(0);
      }
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
    setEditingVersionId(null); // Close any open edit form
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

  const handleMigrateChapters = async () => {
    if (!selectedBookId || isMigrating) return;

    // Clear any previous rate limit error
    setRateLimitError(null);
    setIsMigrating(true);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/books/${selectedBookId}/migrate-chapters`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('RateLimit-Reset');
        const retrySeconds = retryAfter ? Math.ceil((parseInt(retryAfter) * 1000 - Date.now()) / 1000) : 60;
        const waitTime = Math.max(retrySeconds, 5); // At least 5 seconds

        setRateLimitError({
          message: 'Too many requests. Please wait before trying again.',
          retryAfter: waitTime,
        });
        setRateLimitCountdown(waitTime);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to migrate chapters');
      }

      const result = await response.json();
      if (result.migrated) {
        alert(`Successfully migrated ${legacyChapterCount} chapters to Version 1`);
      } else {
        alert(result.message || 'No chapters to migrate');
      }

      await fetchVersionsForBook(selectedBookId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsMigrating(false);
    }
  };

  // Start editing a version
  const handleStartEdit = (version: BookVersion) => {
    setEditingVersionId(version.id);
    setEditName(version.version_name || `Version ${version.version_number}`);
    setEditNotes(version.notes || '');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingVersionId(null);
    setEditName('');
    setEditNotes('');
  };

  // Save version updates
  const handleSaveVersion = async (versionId: string) => {
    if (!selectedBookId || isSaving) return;

    setIsSaving(true);
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/books/${selectedBookId}/versions/${versionId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: editName.trim() || null,
            notes: editNotes.trim() || null,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to update version');
      }

      await fetchVersionsForBook(selectedBookId);
      setEditingVersionId(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
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
    return (
      <DashboardLayout
        header={{ title: project?.title || 'Loading...', subtitle: 'Version History' }}
        projectId={projectId}
      >
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748B' }}>
          Loading version history...
        </div>
      </DashboardLayout>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout
        header={{ title: 'Error', subtitle: 'Version History' }}
        projectId={projectId}
      >
        <div style={{ ...card, padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: colors.error }}>{error || 'Failed to load data'}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      header={{ title: project.title, subtitle: 'Version History' }}
      projectId={projectId}
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
            {legacyChapterCount > 0 ? (
              <>
                <p style={{ color: colors.textSecondary, fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
                  You have <strong>{legacyChapterCount} chapters</strong> that were created before versioning was added.
                  Migrate them to Version 1 to enable version management.
                </p>

                {/* Rate limit warning */}
                {rateLimitError && (
                  <div style={{
                    padding: '1rem',
                    background: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    borderRadius: borderRadius.md,
                    marginBottom: '1rem',
                  }}>
                    <p style={{ color: '#B45309', fontSize: '0.875rem', margin: 0 }}>
                      {rateLimitError.message}
                      {rateLimitCountdown > 0 && (
                        <span style={{ fontWeight: 600 }}> Retry in {rateLimitCountdown}s</span>
                      )}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleMigrateChapters}
                  disabled={isMigrating || rateLimitCountdown > 0}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: rateLimitCountdown > 0
                      ? '#9CA3AF'
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: borderRadius.md,
                    color: '#FFFFFF',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    cursor: (isMigrating || rateLimitCountdown > 0) ? 'not-allowed' : 'pointer',
                    opacity: (isMigrating || rateLimitCountdown > 0) ? 0.7 : 1,
                  }}
                >
                  {isMigrating
                    ? 'Migrating...'
                    : rateLimitCountdown > 0
                      ? `Wait ${rateLimitCountdown}s`
                      : `Migrate ${legacyChapterCount} Chapters to Version 1`
                  }
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {/* Version List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {versions.map(version => {
            const isActive = version.is_active === 1;
            const chapterCount = version.actual_chapter_count || version.chapter_count;
            const wordCount = version.actual_word_count || version.word_count;
            const isEditing = editingVersionId === version.id;

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
                {isEditing ? (
                  // Edit Mode
                  <div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: colors.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'block',
                        marginBottom: '0.375rem',
                      }}>
                        Version Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g., Original Draft, Darker Ending, Editor Feedback v2"
                        style={{
                          width: '100%',
                          padding: '0.625rem 0.75rem',
                          border: `1px solid ${colors.border}`,
                          borderRadius: borderRadius.md,
                          fontSize: '0.9375rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: colors.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'block',
                        marginBottom: '0.375rem',
                      }}>
                        Notes
                      </label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Add notes about this version... (e.g., what changes were made, why it was created)"
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '0.625rem 0.75rem',
                          border: `1px solid ${colors.border}`,
                          borderRadius: borderRadius.md,
                          fontSize: '0.875rem',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleSaveVersion(version.id)}
                        disabled={isSaving}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          borderRadius: borderRadius.md,
                          color: '#FFFFFF',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                          opacity: isSaving ? 0.7 : 1,
                        }}
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        style={{
                          padding: '0.5rem 1rem',
                          background: colors.surface,
                          border: `1px solid ${colors.border}`,
                          borderRadius: borderRadius.md,
                          color: colors.textSecondary,
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '1rem',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                        {/* Display notes if present */}
                        {version.notes && (
                          <p style={{
                            fontSize: '0.875rem',
                            color: colors.text,
                            margin: '0.75rem 0 0 0',
                            padding: '0.75rem',
                            background: isActive ? colors.surface : colors.background,
                            borderRadius: borderRadius.sm,
                            borderLeft: `3px solid ${colors.brandBorder}`,
                            whiteSpace: 'pre-wrap',
                          }}>
                            {version.notes}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button
                          onClick={() => handleStartEdit(version)}
                          style={{
                            padding: '0.5rem 0.875rem',
                            background: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: borderRadius.md,
                            color: colors.textSecondary,
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
