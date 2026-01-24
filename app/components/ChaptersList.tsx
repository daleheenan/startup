'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getToken, logout } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Chapter {
  id: string;
  chapter_number: number;
  title: string | null;
  status: string;
  word_count: number;
  flags: any[];
}

interface Book {
  id: string;
  book_number: number;
  title: string;
  chapters: Chapter[];
}

interface ChaptersListProps {
  projectId: string;
}

export default function ChaptersList({ projectId }: ChaptersListProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [regeneratingChapter, setRegeneratingChapter] = useState<string | null>(null);

  const fetchChapters = useCallback(async () => {
    try {
      const token = getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Get books for project
      const booksRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}/books`, { headers });
      if (!booksRes.ok) {
        if (booksRes.status === 401) {
          logout();
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch books');
      }

      const booksData = await booksRes.json();
      const fetchedBooks = booksData.books || [];

      // Get chapters for each book
      const booksWithChapters: Book[] = [];
      for (const book of fetchedBooks) {
        const chaptersRes = await fetch(`${API_BASE_URL}/api/chapters/book/${book.id}`, { headers });
        if (!chaptersRes.ok) continue;

        const chaptersData = await chaptersRes.json();
        booksWithChapters.push({
          ...book,
          chapters: chaptersData.chapters || [],
        });
      }

      setBooks(booksWithChapters);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  async function regenerateChapter(chapterId: string, chapterNumber: number) {
    const confirmed = window.confirm(
      `Are you sure you want to regenerate Chapter ${chapterNumber}? This will overwrite the existing content and re-run the full editing pipeline.`
    );

    if (!confirmed) return;

    setRegeneratingChapter(chapterId);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/chapters/${chapterId}/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error('Failed to regenerate chapter');

      alert(`Chapter ${chapterNumber} has been queued for regeneration`);
      fetchChapters();
    } catch (error: any) {
      console.error('Error regenerating chapter:', error);
      alert(`Failed to regenerate chapter: ${error.message}`);
    } finally {
      setRegeneratingChapter(null);
    }
  }

  if (loading) {
    return (
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1A1A2E' }}>
          Chapters
        </h2>
        <p style={{ color: '#64748B' }}>Loading chapters...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
      padding: '2rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1A1A2E' }}>
        Chapters
      </h2>

      {books.length === 0 ? (
        <p style={{ color: '#64748B' }}>No chapters generated yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {books.map((book) => (
            <div key={book.id}>
              {books.length > 1 && (
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#374151' }}>
                  Book {book.book_number}: {book.title}
                </h3>
              )}

              {book.chapters.length === 0 ? (
                <p style={{ color: '#64748B', fontSize: '0.875rem' }}>No chapters yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {book.chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1A1A2E' }}>
                            Chapter {chapter.chapter_number}
                          </span>
                          {chapter.title && (
                            <span style={{ fontSize: '0.875rem', color: '#64748B' }}>
                              {chapter.title}
                            </span>
                          )}
                          <span
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              background:
                                chapter.status === 'completed'
                                  ? '#DCFCE7'
                                  : chapter.status === 'writing' || chapter.status === 'editing'
                                  ? '#DBEAFE'
                                  : '#FEF3C7',
                              color:
                                chapter.status === 'completed'
                                  ? '#15803D'
                                  : chapter.status === 'writing' || chapter.status === 'editing'
                                  ? '#1D4ED8'
                                  : '#B45309',
                            }}
                          >
                            {chapter.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#64748B' }}>
                          <span>{chapter.word_count.toLocaleString()} words</span>
                          {chapter.flags && chapter.flags.length > 0 && (
                            <span style={{ color: '#B45309' }}>
                              {chapter.flags.filter((f: any) => !f.resolved).length} flags
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link
                          href={`/projects/${projectId}/chapters/${chapter.id}`}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '6px',
                            color: '#10B981',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'none',
                            display: 'inline-block',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.3)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                          }}
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => regenerateChapter(chapter.id, chapter.chapter_number)}
                          disabled={regeneratingChapter === chapter.id}
                          style={{
                            padding: '0.5rem 1rem',
                            background:
                              regeneratingChapter === chapter.id
                                ? 'rgba(102, 126, 234, 0.5)'
                                : 'rgba(102, 126, 234, 0.2)',
                            border: '1px solid rgba(102, 126, 234, 0.3)',
                            borderRadius: '6px',
                            color: regeneratingChapter === chapter.id ? '#888' : '#667eea',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: regeneratingChapter === chapter.id ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => {
                            if (regeneratingChapter !== chapter.id) {
                              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.3)';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (regeneratingChapter !== chapter.id) {
                              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                            }
                          }}
                        >
                          {regeneratingChapter === chapter.id ? 'Regenerating...' : 'Regenerate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
