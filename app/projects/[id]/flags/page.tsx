'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Flag {
  id: string;
  type: string;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  location?: string;
  resolved: boolean;
}

interface ChapterWithFlags {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string | null;
  flags: Flag[];
}

export default function FlagsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [chapters, setChapters] = useState<ChapterWithFlags[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    fetchFlags();
  }, [projectId]);

  async function fetchFlags() {
    try {
      // First get project to find books
      const projectRes = await fetch(`http://localhost:3001/api/projects/${projectId}`);
      if (!projectRes.ok) throw new Error('Failed to fetch project');

      const project = await projectRes.json();

      // Get books for this project
      const booksRes = await fetch(`http://localhost:3001/api/projects/${projectId}/books`);
      if (!booksRes.ok) throw new Error('Failed to fetch books');

      const booksData = await booksRes.json();
      const books = booksData.books || [];

      // Get chapters for each book
      const allChapters: ChapterWithFlags[] = [];

      for (const book of books) {
        const chaptersRes = await fetch(`http://localhost:3001/api/chapters/book/${book.id}`);
        if (!chaptersRes.ok) continue;

        const chaptersData = await chaptersRes.json();
        const bookChapters = chaptersData.chapters || [];

        bookChapters.forEach((chapter: any) => {
          const flags = Array.isArray(chapter.flags) ? chapter.flags : [];
          if (flags.length > 0) {
            allChapters.push({
              chapterId: chapter.id,
              chapterNumber: chapter.chapter_number,
              chapterTitle: chapter.title,
              flags,
            });
          }
        });
      }

      setChapters(allChapters);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching flags:', err);
      setError(err.message || 'Failed to load flags');
    } finally {
      setLoading(false);
    }
  }

  async function resolveFlag(chapterId: string, flagId: string) {
    try {
      const res = await fetch(
        `http://localhost:3001/api/editing/chapters/${chapterId}/flags/${flagId}/resolve`,
        { method: 'POST' }
      );

      if (!res.ok) throw new Error('Failed to resolve flag');

      // Update local state
      setChapters((prev) =>
        prev.map((chapter) =>
          chapter.chapterId === chapterId
            ? {
                ...chapter,
                flags: chapter.flags.map((flag) =>
                  flag.id === flagId ? { ...flag, resolved: true } : flag
                ),
              }
            : chapter
        )
      );
    } catch (err: any) {
      console.error('Error resolving flag:', err);
      alert(`Failed to resolve flag: ${err.message}`);
    }
  }

  const filteredChapters = chapters.map((chapter) => {
    const filteredFlags = chapter.flags.filter((flag) => {
      if (!showResolved && flag.resolved) return false;
      if (filterType !== 'all' && flag.type !== filterType) return false;
      if (filterSeverity !== 'all' && flag.severity !== filterSeverity) return false;
      return true;
    });

    return { ...chapter, flags: filteredFlags };
  }).filter((chapter) => chapter.flags.length > 0);

  const allFlags = chapters.flatMap((c) => c.flags);
  const flagTypes = Array.from(new Set(allFlags.map((f) => f.type)));
  const totalFlags = allFlags.length;
  const unresolvedFlags = allFlags.filter((f) => !f.resolved).length;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{ color: '#888' }}>Loading flagged issues...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem' }}>
        <p style={{ color: '#ef4444' }}>Error: {error}</p>
        <button
          onClick={() => router.push(`/projects/${projectId}`)}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Back to Project
        </button>
      </div>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Flagged Issues
          </h1>
          <p style={{ fontSize: '1rem', color: '#888' }}>
            {unresolvedFlags} unresolved / {totalFlags} total
          </p>
        </div>

        {/* Filters */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <div>
            <label style={{ fontSize: '0.875rem', color: '#888', marginRight: '0.5rem' }}>
              Type:
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#ededed',
                fontSize: '0.875rem',
              }}
            >
              <option value="all">All Types</option>
              {flagTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.875rem', color: '#888', marginRight: '0.5rem' }}>
              Severity:
            </label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              style={{
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#ededed',
                fontSize: '0.875rem',
              }}
            >
              <option value="all">All Severities</option>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="showResolved"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              style={{ marginRight: '0.5rem' }}
            />
            <label htmlFor="showResolved" style={{ fontSize: '0.875rem', color: '#888' }}>
              Show Resolved
            </label>
          </div>
        </div>

        {/* Flags List */}
        {filteredChapters.length === 0 ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
            <p style={{ color: '#4ade80', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              No Flags Found
            </p>
            <p style={{ color: '#888', fontSize: '0.875rem' }}>
              {totalFlags === 0
                ? 'All chapters are looking great!'
                : showResolved
                ? 'Try adjusting your filters'
                : 'All issues have been resolved!'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredChapters.map((chapter) => (
              <div
                key={chapter.chapterId}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                }}
              >
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#ededed' }}>
                  Chapter {chapter.chapterNumber}
                  {chapter.chapterTitle && `: ${chapter.chapterTitle}`}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {chapter.flags.map((flag) => (
                    <div
                      key={flag.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${
                          flag.severity === 'critical'
                            ? 'rgba(255, 107, 107, 0.3)'
                            : flag.severity === 'major'
                            ? 'rgba(251, 191, 36, 0.3)'
                            : 'rgba(96, 165, 250, 0.3)'
                        }`,
                        borderRadius: '8px',
                        padding: '1rem',
                        opacity: flag.resolved ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              background:
                                flag.severity === 'critical'
                                  ? 'rgba(255, 107, 107, 0.2)'
                                  : flag.severity === 'major'
                                  ? 'rgba(251, 191, 36, 0.2)'
                                  : 'rgba(96, 165, 250, 0.2)',
                              color:
                                flag.severity === 'critical'
                                  ? '#ff6b6b'
                                  : flag.severity === 'major'
                                  ? '#fbbf24'
                                  : '#60a5fa',
                            }}
                          >
                            {flag.severity.toUpperCase()}
                          </span>
                          <span
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.1)',
                              color: '#888',
                              textTransform: 'capitalize',
                            }}
                          >
                            {flag.type.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {!flag.resolved && (
                          <button
                            onClick={() => resolveFlag(chapter.chapterId, flag.id)}
                            style={{
                              padding: '0.25rem 0.75rem',
                              background: 'rgba(74, 222, 128, 0.2)',
                              border: '1px solid rgba(74, 222, 128, 0.3)',
                              borderRadius: '4px',
                              color: '#4ade80',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'rgba(74, 222, 128, 0.3)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'rgba(74, 222, 128, 0.2)';
                            }}
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>

                      <p style={{ color: '#ededed', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        {flag.description}
                      </p>

                      {flag.location && (
                        <p style={{ color: '#888', fontSize: '0.75rem', fontStyle: 'italic' }}>
                          Location: {flag.location}
                        </p>
                      )}

                      {flag.resolved && (
                        <p style={{ color: '#4ade80', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                          ✓ Resolved
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Link */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a
            href={`/projects/${projectId}`}
            style={{
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '0.875rem'
            }}
          >
            ← Back to Project
          </a>
        </div>
      </div>
    </main>
  );
}
