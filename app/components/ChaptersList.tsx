'use client';

import { useState, useEffect } from 'react';

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

  useEffect(() => {
    fetchChapters();
  }, [projectId]);

  async function fetchChapters() {
    try {
      // Get books for project
      const booksRes = await fetch(`http://localhost:3001/api/projects/${projectId}/books`);
      if (!booksRes.ok) throw new Error('Failed to fetch books');

      const booksData = await booksRes.json();
      const fetchedBooks = booksData.books || [];

      // Get chapters for each book
      const booksWithChapters: Book[] = [];
      for (const book of fetchedBooks) {
        const chaptersRes = await fetch(`http://localhost:3001/api/chapters/book/${book.id}`);
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
  }

  async function regenerateChapter(chapterId: string, chapterNumber: number) {
    const confirmed = window.confirm(
      `Are you sure you want to regenerate Chapter ${chapterNumber}? This will overwrite the existing content and re-run the full editing pipeline.`
    );

    if (!confirmed) return;

    setRegeneratingChapter(chapterId);

    try {
      const res = await fetch(`http://localhost:3001/api/chapters/${chapterId}/regenerate`, {
        method: 'POST',
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
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '2rem',
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ededed' }}>
          Chapters
        </h2>
        <p style={{ color: '#888' }}>Loading chapters...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '2rem',
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ededed' }}>
        Chapters
      </h2>

      {books.length === 0 ? (
        <p style={{ color: '#888' }}>No chapters generated yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {books.map((book) => (
            <div key={book.id}>
              {books.length > 1 && (
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#888' }}>
                  Book {book.book_number}: {book.title}
                </h3>
              )}

              {book.chapters.length === 0 ? (
                <p style={{ color: '#666', fontSize: '0.875rem' }}>No chapters yet.</p>
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
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ededed' }}>
                            Chapter {chapter.chapter_number}
                          </span>
                          {chapter.title && (
                            <span style={{ fontSize: '0.875rem', color: '#888' }}>
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
                                  ? 'rgba(74, 222, 128, 0.2)'
                                  : chapter.status === 'writing' || chapter.status === 'editing'
                                  ? 'rgba(96, 165, 250, 0.2)'
                                  : 'rgba(251, 191, 36, 0.2)',
                              color:
                                chapter.status === 'completed'
                                  ? '#4ade80'
                                  : chapter.status === 'writing' || chapter.status === 'editing'
                                  ? '#60a5fa'
                                  : '#fbbf24',
                            }}
                          >
                            {chapter.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#666' }}>
                          <span>{chapter.word_count.toLocaleString()} words</span>
                          {chapter.flags && chapter.flags.length > 0 && (
                            <span style={{ color: '#fbbf24' }}>
                              {chapter.flags.filter((f: any) => !f.resolved).length} flags
                            </span>
                          )}
                        </div>
                      </div>

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
