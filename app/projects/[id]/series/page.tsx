'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import { getToken } from '../../../lib/auth';
import { colors, gradients } from '../../../lib/constants';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Book {
  id: string;
  book_number: number;
  title: string;
  status: string;
  word_count: number;
  ending_state: any;
  book_summary: string | null;
}

interface SeriesCharacter {
  characterId: string;
  name: string;
  role: string;
  firstAppearance: { bookNumber: number; chapterNumber: number };
  lastAppearance: { bookNumber: number; chapterNumber: number };
  status: 'alive' | 'dead' | 'unknown';
  development: Array<{ bookNumber: number; changes: string[] }>;
}

interface SeriesMystery {
  id: string;
  question: string;
  introducedInBook: number;
  answeredInBook: number | null;
  answer: string | null;
}

interface BookTransition {
  id: string;
  from_book_id: string;
  to_book_id: string;
  time_gap: string;
  gap_summary: string;
  character_changes: Array<{
    characterId: string;
    characterName: string;
    changes: string[];
  }>;
}

interface SeriesBible {
  characters: SeriesCharacter[];
  world: any[];
  timeline: any[];
  themes: string[];
  mysteries: SeriesMystery[];
}

export default function SeriesManagementPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [books, setBooks] = useState<Book[]>([]);
  const [seriesBible, setSeriesBible] = useState<SeriesBible | null>(null);
  const [transitions, setTransitions] = useState<BookTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'characters' | 'timeline' | 'mysteries'>('overview');
  const [project, setProject] = useState<any>(null);
  const [showAddBookForm, setShowAddBookForm] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [addingBook, setAddingBook] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch project
      const projRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, { headers });
      if (projRes.ok) {
        const projData = await projRes.json();
        setProject(projData);
      }

      // Fetch books
      const booksRes = await fetch(`${API_BASE_URL}/api/books/project/${projectId}`, { headers });
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        setBooks(booksData.books || []);
      }

      // Fetch series bible
      const bibleRes = await fetch(`${API_BASE_URL}/api/trilogy/projects/${projectId}/series-bible`, { headers });
      if (bibleRes.ok) {
        const bibleData = await bibleRes.json();
        setSeriesBible(bibleData);
      }

      // Fetch transitions
      const transRes = await fetch(`${API_BASE_URL}/api/trilogy/projects/${projectId}/transitions`, { headers });
      if (transRes.ok) {
        const transData = await transRes.json();
        setTransitions(transData.transitions || []);
      }
    } catch (err: any) {
      console.error('Error fetching series data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddBook = async () => {
    if (!newBookTitle.trim()) {
      setError('Please enter a book title');
      return;
    }

    setAddingBook(true);
    setError(null);

    try {
      const token = getToken();
      const nextBookNumber = books.length + 1;

      const res = await fetch(`${API_BASE_URL}/api/books`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          title: newBookTitle.trim(),
          bookNumber: nextBookNumber,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to create book');
      }

      // Refresh data
      await fetchData();
      setNewBookTitle('');
      setShowAddBookForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingBook(false);
    }
  };

  const handleGenerateSeriesBible = async () => {
    setGenerating(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/trilogy/projects/${projectId}/series-bible`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to generate series bible');
      }

      const data = await res.json();
      setSeriesBible(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateBookEndingState = async (bookId: string) => {
    setGenerating(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/trilogy/books/${bookId}/ending-state`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to generate ending state');
      }

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateTransition = async (fromBookId: string, toBookId: string) => {
    const timeGap = prompt('Enter the time gap between books (e.g., "3 months", "2 years"):');
    if (!timeGap) return;

    setGenerating(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/trilogy/transitions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          fromBookId,
          toBookId,
          timeGap,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to generate transition');
      }

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.25rem',
    background: isActive ? gradients.brand : 'transparent',
    border: isActive ? 'none' : '1px solid ' + colors.border,
    borderRadius: '8px',
    color: isActive ? 'white' : colors.textSecondary,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const cardStyle = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1rem',
  };


  if (loading) {
    return (
      <DashboardLayout
        header={{ title: 'Series Management' }}
      >
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '1.125rem', color: colors.textSecondary }}>
            Loading series data...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (books.length < 2) {
    return (
      <DashboardLayout
        header={{ title: 'Series Management' }}
      >
        <div style={{ padding: '1.5rem 0' }}>
          <div style={cardStyle}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: colors.text }}>
            {books.length === 0 ? 'No Books Yet' : 'Add More Books to Create a Series'}
          </h3>
          <p style={{ color: colors.textSecondary, marginBottom: '1.5rem' }}>
            Series management is available for projects with 2 or more books.
            This project currently has {books.length} book{books.length !== 1 ? 's' : ''}.
          </p>

          {/* Current books list */}
          {books.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: colors.text }}>
                Current Books:
              </h4>
              {books.map((book) => (
                <div key={book.id} style={{
                  padding: '0.75rem 1rem',
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                }}>
                  <strong>Book {book.book_number}:</strong> {book.title}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: colors.errorLight,
              borderRadius: '8px',
              color: colors.error,
              marginBottom: '1rem',
            }}>
              {error}
            </div>
          )}

          {/* Add Book Form */}
          {showAddBookForm ? (
            <div style={{
              padding: '1rem',
              background: colors.surface,
              border: `1px solid ${colors.brandBorder}`,
              borderRadius: '8px',
            }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: colors.text,
                marginBottom: '0.5rem',
              }}>
                Book {books.length + 1} Title
              </label>
              <input
                type="text"
                value={newBookTitle}
                onChange={(e) => setNewBookTitle(e.target.value)}
                placeholder="Enter book title..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                }}
                autoFocus
                disabled={addingBook}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleAddBook}
                  disabled={addingBook || !newBookTitle.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: addingBook ? colors.textSecondary : gradients.brand,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: addingBook ? 'not-allowed' : 'pointer',
                    opacity: addingBook || !newBookTitle.trim() ? 0.7 : 1,
                  }}
                >
                  {addingBook ? 'Creating...' : 'Create Book'}
                </button>
                <button
                  onClick={() => { setShowAddBookForm(false); setNewBookTitle(''); setError(null); }}
                  disabled={addingBook}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: colors.surface,
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: addingBook ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddBookForm(true)}
              style={{
                padding: '0.75rem 1.5rem',
                background: gradients.brand,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Add Book {books.length + 1}
            </button>
          )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      header={{ title: 'Series Management', subtitle: `Managing ${books.length} books in series` }}
    >

      <div style={{ padding: '1.5rem 0' }}>
        {error && (
        <div style={{
          ...cardStyle,
          background: colors.errorLight,
          borderColor: colors.errorBorder,
          color: colors.error,
          marginBottom: '1.5rem',
        }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={tabStyle(activeTab === 'overview')}
          aria-pressed={activeTab === 'overview'}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('characters')}
          style={tabStyle(activeTab === 'characters')}
          aria-pressed={activeTab === 'characters'}
        >
          Character Arcs
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          style={tabStyle(activeTab === 'timeline')}
          aria-pressed={activeTab === 'timeline'}
        >
          Timeline
        </button>
        <button
          onClick={() => setActiveTab('mysteries')}
          style={tabStyle(activeTab === 'mysteries')}
          aria-pressed={activeTab === 'mysteries'}
        >
          Mysteries & Threads
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Books Overview */}
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: colors.text }}>
            Books in Series
          </h3>
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            {books.map((book, idx) => (
              <div key={book.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: colors.text }}>
                      Book {book.book_number}: {book.title || 'Untitled'}
                    </h4>
                    <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                      Status: <span style={{ textTransform: 'capitalize' }}>{book.status}</span>
                      {' | '}
                      Word Count: {book.word_count.toLocaleString()}
                    </div>
                    {book.ending_state && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        background: colors.successLight,
                        borderRadius: '6px',
                        fontSize: '0.813rem',
                        color: colors.success,
                      }}>
                        Ending state captured
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleGenerateBookEndingState(book.id)}
                      disabled={generating}
                      style={{
                        padding: '0.5rem 1rem',
                        background: book.ending_state ? colors.surface : gradients.brand,
                        border: book.ending_state ? `1px solid ${colors.border}` : 'none',
                        borderRadius: '6px',
                        color: book.ending_state ? colors.textSecondary : 'white',
                        fontSize: '0.813rem',
                        fontWeight: 500,
                        cursor: generating ? 'not-allowed' : 'pointer',
                        opacity: generating ? 0.5 : 1,
                      }}
                      aria-label={`Generate ending state for Book ${book.book_number}`}
                    >
                      {book.ending_state ? 'Regenerate' : 'Generate'} Ending State
                    </button>
                  </div>
                </div>

                {/* Transition to next book */}
                {idx < books.length - 1 && (
                  <div style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: `1px dashed ${colors.border}`,
                  }}>
                    {transitions.find(t => t.from_book_id === book.id) ? (
                      <div>
                        <div style={{ fontSize: '0.813rem', color: colors.textSecondary, marginBottom: '0.5rem' }}>
                          Transition to Book {book.book_number + 1}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: colors.text }}>
                          Time gap: {transitions.find(t => t.from_book_id === book.id)?.time_gap}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleGenerateTransition(book.id, books[idx + 1].id)}
                        disabled={generating || !book.ending_state}
                        style={{
                          padding: '0.5rem 1rem',
                          background: colors.surface,
                          border: `1px solid ${colors.border}`,
                          borderRadius: '6px',
                          color: colors.textSecondary,
                          fontSize: '0.813rem',
                          fontWeight: 500,
                          cursor: generating || !book.ending_state ? 'not-allowed' : 'pointer',
                          opacity: generating || !book.ending_state ? 0.5 : 1,
                        }}
                        aria-label={`Generate transition between Book ${book.book_number} and Book ${book.book_number + 1}`}
                      >
                        + Generate Transition to Book {book.book_number + 1}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add Book Button */}
            {showAddBookForm ? (
              <div style={{
                ...cardStyle,
                borderColor: colors.brandBorder,
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: colors.text,
                  marginBottom: '0.5rem',
                }}>
                  Book {books.length + 1} Title
                </label>
                <input
                  type="text"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  placeholder="Enter title for the new book..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '1rem',
                    marginBottom: '1rem',
                  }}
                  autoFocus
                  disabled={addingBook}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleAddBook}
                    disabled={addingBook || !newBookTitle.trim()}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: addingBook ? colors.textSecondary : gradients.brand,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: addingBook ? 'not-allowed' : 'pointer',
                      opacity: addingBook || !newBookTitle.trim() ? 0.7 : 1,
                    }}
                  >
                    {addingBook ? 'Creating...' : 'Create Book'}
                  </button>
                  <button
                    onClick={() => { setShowAddBookForm(false); setNewBookTitle(''); setError(null); }}
                    disabled={addingBook}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: colors.surface,
                      color: colors.textSecondary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: addingBook ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddBookForm(true)}
                style={{
                  ...cardStyle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1.5rem',
                  border: `2px dashed ${colors.brandBorder}`,
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: colors.brandText,
                  transition: 'all 0.2s',
                }}
              >
                + Add Book {books.length + 1}
              </button>
            )}
          </div>

          {/* Series Bible */}
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: colors.text }}>
            Series Bible
          </h3>
          <div style={cardStyle}>
            {seriesBible ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ color: colors.success, fontWeight: 500 }}>
                    Series Bible Generated
                  </div>
                  <button
                    onClick={handleGenerateSeriesBible}
                    disabled={generating}
                    style={{
                      padding: '0.5rem 1rem',
                      background: colors.surface,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      color: colors.textSecondary,
                      fontSize: '0.813rem',
                      fontWeight: 500,
                      cursor: generating ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Regenerate
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  <div style={{ textAlign: 'center', padding: '1rem', background: colors.background, borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: colors.brandStart }}>
                      {seriesBible.characters?.length || 0}
                    </div>
                    <div style={{ fontSize: '0.813rem', color: colors.textSecondary }}>Characters</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem', background: colors.background, borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: colors.brandStart }}>
                      {seriesBible.world?.length || 0}
                    </div>
                    <div style={{ fontSize: '0.813rem', color: colors.textSecondary }}>World Elements</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem', background: colors.background, borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: colors.brandStart }}>
                      {seriesBible.themes?.length || 0}
                    </div>
                    <div style={{ fontSize: '0.813rem', color: colors.textSecondary }}>Themes</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem', background: colors.background, borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: colors.brandStart }}>
                      {seriesBible.mysteries?.length || 0}
                    </div>
                    <div style={{ fontSize: '0.813rem', color: colors.textSecondary }}>Mysteries</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: colors.textSecondary, marginBottom: '1rem' }}>
                  Generate a series bible to track characters, world elements, and plot threads across all books.
                </p>
                <button
                  onClick={handleGenerateSeriesBible}
                  disabled={generating}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: generating ? colors.textTertiary : gradients.brand,
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.938rem',
                    fontWeight: 500,
                    cursor: generating ? 'not-allowed' : 'pointer',
                  }}
                  aria-label="Generate series bible"
                >
                  {generating ? 'Generating...' : 'Generate Series Bible'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'characters' && seriesBible && (
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: colors.text }}>
            Character Development Across Series
          </h3>
          {seriesBible.characters?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {seriesBible.characters.map((char) => (
                <div key={char.characterId} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: colors.text }}>
                        {char.name}
                      </h4>
                      <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                        {char.role}
                      </div>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: char.status === 'alive' ? colors.successLight :
                                  char.status === 'dead' ? colors.errorLight : colors.warningLight,
                      color: char.status === 'alive' ? colors.success :
                             char.status === 'dead' ? colors.error : colors.warning,
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}>
                      {char.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.813rem', color: colors.textSecondary, marginBottom: '1rem' }}>
                    First appears: Book {char.firstAppearance?.bookNumber}, Chapter {char.firstAppearance?.chapterNumber}
                    {char.lastAppearance && char.lastAppearance.bookNumber !== char.firstAppearance?.bookNumber && (
                      <> | Last appears: Book {char.lastAppearance.bookNumber}, Chapter {char.lastAppearance.chapterNumber}</>
                    )}
                  </div>
                  {char.development?.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.5rem', color: colors.text }}>
                        Character Arc:
                      </div>
                      {char.development.map((dev, idx) => (
                        <div key={idx} style={{
                          padding: '0.75rem',
                          background: colors.background,
                          borderRadius: '6px',
                          marginBottom: '0.5rem',
                          borderLeft: `3px solid ${colors.brandStart}`,
                        }}>
                          <div style={{ fontWeight: 500, fontSize: '0.813rem', color: colors.textSecondary, marginBottom: '0.25rem' }}>
                            Book {dev.bookNumber}
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: colors.text }}>
                            {dev.changes.map((change, i) => (
                              <li key={i}>{change}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={cardStyle}>
              <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
                No character data in series bible. Generate the series bible first.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && seriesBible && (
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: colors.text }}>
            Series Timeline
          </h3>
          {seriesBible.timeline?.length > 0 ? (
            <div style={{ position: 'relative', paddingLeft: '2rem' }}>
              {/* Timeline line */}
              <div style={{
                position: 'absolute',
                left: '0.5rem',
                top: '0.5rem',
                bottom: '0.5rem',
                width: '2px',
                background: colors.brandStart,
              }} />

              {seriesBible.timeline.map((entry: any, idx: number) => (
                <div key={idx} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute',
                    left: '-1.75rem',
                    top: '0.25rem',
                    width: '12px',
                    height: '12px',
                    background: colors.brandStart,
                    borderRadius: '50%',
                    border: '2px solid white',
                  }} />

                  <div style={cardStyle}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: colors.text }}>
                      Book {entry.bookNumber}
                    </h4>
                    <div style={{ fontSize: '0.875rem', color: colors.textSecondary, marginBottom: '0.75rem' }}>
                      {entry.startDate} - {entry.endDate} ({entry.timespan})
                    </div>
                    {entry.majorEvents?.length > 0 && (
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.813rem', color: colors.text, marginBottom: '0.5rem' }}>
                          Major Events:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: colors.textSecondary }}>
                          {entry.majorEvents.map((event: string, i: number) => (
                            <li key={i}>{event}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={cardStyle}>
              <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
                No timeline data in series bible. Generate the series bible first.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'mysteries' && seriesBible && (
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: colors.text }}>
            Plot Threads & Mysteries
          </h3>
          {seriesBible.mysteries?.length > 0 ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {seriesBible.mysteries.map((mystery) => (
                <div key={mystery.id} style={{
                  ...cardStyle,
                  borderLeftWidth: '4px',
                  borderLeftColor: mystery.answeredInBook ? colors.success : colors.warning,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: colors.text }}>
                        {mystery.question}
                      </h4>
                      <div style={{ fontSize: '0.813rem', color: colors.textSecondary }}>
                        Introduced in Book {mystery.introducedInBook}
                        {mystery.answeredInBook && (
                          <> | Resolved in Book {mystery.answeredInBook}</>
                        )}
                      </div>
                      {mystery.answer && (
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '0.75rem',
                          background: colors.successLight,
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          color: colors.text,
                        }}>
                          <strong>Answer:</strong> {mystery.answer}
                        </div>
                      )}
                    </div>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: mystery.answeredInBook ? colors.successLight : colors.warningLight,
                      color: mystery.answeredInBook ? colors.success : colors.warning,
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}>
                      {mystery.answeredInBook ? 'Resolved' : 'Open'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={cardStyle}>
              <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
                No mysteries tracked in series bible. Generate the series bible first.
              </p>
            </div>
          )}
        </div>
      )}

      {!seriesBible && activeTab !== 'overview' && (
        <div style={cardStyle}>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '1rem' }}>
            Generate a series bible first to view this tab.
          </p>
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleGenerateSeriesBible}
              disabled={generating}
              style={{
                padding: '0.75rem 1.5rem',
                background: generating ? colors.textTertiary : gradients.brand,
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.938rem',
                fontWeight: 500,
                cursor: generating ? 'not-allowed' : 'pointer',
              }}
            >
              {generating ? 'Generating...' : 'Generate Series Bible'}
            </button>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
