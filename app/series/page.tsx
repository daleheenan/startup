'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import MetricCard from '@/app/components/dashboard/MetricCard';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  gradients,
} from '@/app/lib/design-tokens';
import { getToken } from '@/app/lib/auth';

// ==================== CONSTANTS ====================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type TabId = 'overview' | 'characters' | 'timeline' | 'consistency';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Series Overview', icon: '📚' },
  { id: 'characters', label: 'Characters', icon: '👥' },
  { id: 'timeline', label: 'Timeline', icon: '📅' },
  { id: 'consistency', label: 'Consistency', icon: '🔍' },
];

// ==================== TYPES ====================

interface Project {
  id: string;
  title: string;
  type: 'standalone' | 'trilogy' | 'series';
  genre: string;
  status: 'setup' | 'generating' | 'completed';
  book_count: number;
  created_at: string;
  updated_at: string;
  metrics?: {
    content?: { words: number; chapters: number };
  };
  progress?: {
    characters: number;
    chaptersWritten: number;
  };
}

interface Book {
  id: string;
  project_id: string;
  book_number: number;
  title: string;
  status: string;
  word_count: number;
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

interface TimelineEntry {
  bookNumber: number;
  startDate?: string;
  endDate?: string;
  timespan?: string;
  majorEvents?: string[];
}

interface SeriesBible {
  characters: SeriesCharacter[];
  world: any[];
  timeline: TimelineEntry[];
  themes: string[];
  mysteries: SeriesMystery[];
}

interface SeriesData {
  project: Project;
  books: Book[];
  seriesBible: SeriesBible | null;
}

// ==================== ICONS ====================

function BooksIcon({ color = colors.metrics.blue }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function CharactersIcon({ color = colors.metrics.green }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function WordsIcon({ color = colors.metrics.orange }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function MysteriesIcon({ color = colors.metrics.red }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12,5 19,12 12,19" />
    </svg>
  );
}

// ==================== COMPONENT ====================

export default function SeriesManagementPage() {
  const router = useRouter();

  // State
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [seriesDataMap, setSeriesDataMap] = useState<Map<string, SeriesData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [characterSearch, setCharacterSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSeriesTitle, setNewSeriesTitle] = useState('');
  const [newSeriesGenre, setNewSeriesGenre] = useState('fantasy');
  const [creating, setCreating] = useState(false);

  // Filter to only series/trilogy projects
  const seriesProjects = useMemo(() =>
    projects.filter(p => p.type === 'trilogy' || p.type === 'series'),
    [projects]
  );

  // Aggregate all characters across all series
  const allCharacters = useMemo(() => {
    const characters: Array<SeriesCharacter & { projectId: string; projectTitle: string }> = [];

    seriesDataMap.forEach((data, projectId) => {
      if (data.seriesBible?.characters) {
        data.seriesBible.characters.forEach(char => {
          characters.push({
            ...char,
            projectId,
            projectTitle: data.project.title,
          });
        });
      }
    });

    return characters;
  }, [seriesDataMap]);

  // Filter characters by search
  const filteredCharacters = useMemo(() => {
    if (!characterSearch.trim()) return allCharacters;
    const search = characterSearch.toLowerCase();
    return allCharacters.filter(
      char => char.name.toLowerCase().includes(search) ||
              char.role.toLowerCase().includes(search) ||
              char.projectTitle.toLowerCase().includes(search)
    );
  }, [allCharacters, characterSearch]);

  // Aggregate timeline data
  const aggregatedTimeline = useMemo(() => {
    const timeline: Array<TimelineEntry & { projectId: string; projectTitle: string }> = [];

    seriesDataMap.forEach((data, projectId) => {
      if (data.seriesBible?.timeline) {
        data.seriesBible.timeline.forEach(entry => {
          timeline.push({
            ...entry,
            projectId,
            projectTitle: data.project.title,
          });
        });
      }
    });

    return timeline.sort((a, b) => a.bookNumber - b.bookNumber);
  }, [seriesDataMap]);

  // Aggregate mysteries (for consistency tab)
  const allMysteries = useMemo(() => {
    const mysteries: Array<SeriesMystery & { projectId: string; projectTitle: string }> = [];

    seriesDataMap.forEach((data, projectId) => {
      if (data.seriesBible?.mysteries) {
        data.seriesBible.mysteries.forEach(mystery => {
          mysteries.push({
            ...mystery,
            projectId,
            projectTitle: data.project.title,
          });
        });
      }
    });

    return mysteries;
  }, [seriesDataMap]);

  // Calculate aggregate metrics
  const metrics = useMemo(() => {
    let totalBooks = 0;
    let totalWords = 0;
    let totalCharacters = 0;
    let openMysteries = 0;

    seriesDataMap.forEach((data) => {
      totalBooks += data.books.length;
      totalWords += data.books.reduce((sum, b) => sum + (b.word_count || 0), 0);
      totalCharacters += data.seriesBible?.characters?.length || 0;
      openMysteries += data.seriesBible?.mysteries?.filter(m => !m.answeredInBook).length || 0;
    });

    return {
      seriesCount: seriesProjects.length,
      totalBooks,
      totalWords,
      totalCharacters,
      openMysteries,
    };
  }, [seriesProjects, seriesDataMap]);

  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError(err.message);
    }
  }, []);

  // Fetch series data for a project
  const fetchSeriesData = useCallback(async (project: Project) => {
    try {
      const token = getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch books
      const booksRes = await fetch(`${API_BASE_URL}/api/books/project/${project.id}`, { headers });
      const booksData = booksRes.ok ? await booksRes.json() : { books: [] };

      // Fetch series bible
      let seriesBible: SeriesBible | null = null;
      const bibleRes = await fetch(`${API_BASE_URL}/api/trilogy/projects/${project.id}/series-bible`, { headers });
      if (bibleRes.ok) {
        seriesBible = await bibleRes.json();
      }

      return {
        project,
        books: booksData.books || [],
        seriesBible,
      };
    } catch (err) {
      console.error(`Error fetching series data for ${project.id}:`, err);
      return {
        project,
        books: [],
        seriesBible: null,
      };
    }
  }, []);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      await fetchProjects();
    };

    loadData();
  }, [fetchProjects]);

  // Fetch series data for all series projects
  useEffect(() => {
    const loadSeriesData = async () => {
      if (seriesProjects.length === 0) {
        setLoading(false);
        return;
      }

      const dataMap = new Map<string, SeriesData>();

      await Promise.all(
        seriesProjects.map(async (project) => {
          const data = await fetchSeriesData(project);
          dataMap.set(project.id, data);
        })
      );

      setSeriesDataMap(dataMap);
      setLoading(false);
    };

    if (projects.length > 0) {
      loadSeriesData();
    }
  }, [projects, seriesProjects, fetchSeriesData]);

  // Create new series
  const handleCreateSeries = async () => {
    if (!newSeriesTitle.trim()) {
      setError('Please enter a series title');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newSeriesTitle.trim(),
          type: 'series',
          genre: newSeriesGenre,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to create series');
      }

      const newProject = await res.json();

      // Refresh projects
      await fetchProjects();

      setNewSeriesTitle('');
      setShowCreateModal(false);

      // Navigate to the new series
      router.push(`/projects/${newProject.id}/series`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // ==================== STYLES ====================

  const tabStyle = (isActive: boolean): CSSProperties => ({
    padding: `${spacing[3]} ${spacing[5]}`,
    background: isActive ? gradients.brand : 'transparent',
    border: isActive ? 'none' : `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.md,
    color: isActive ? colors.text.inverse : colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    transition: transitions.all,
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  });

  const cardStyle: CSSProperties = {
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    marginBottom: spacing[4],
  };

  const seriesCardStyle: CSSProperties = {
    ...cardStyle,
    cursor: 'pointer',
    transition: transitions.all,
  };

  const badgeStyle = (variant: 'success' | 'warning' | 'error' | 'info'): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing[1]} ${spacing[3]}`,
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    background: colors.semantic[`${variant}Light`],
    color: colors.semantic[variant],
  });

  const modalOverlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: colors.background.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle: CSSProperties = {
    background: colors.background.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[8],
    maxWidth: '480px',
    width: '90%',
    boxShadow: shadows.xl,
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: spacing[3],
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.base,
    marginBottom: spacing[4],
  };

  const selectStyle: CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  const primaryButtonStyle: CSSProperties = {
    padding: `${spacing[3]} ${spacing[6]}`,
    background: gradients.brand,
    color: colors.text.inverse,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
  };

  const secondaryButtonStyle: CSSProperties = {
    ...primaryButtonStyle,
    background: colors.background.surface,
    color: colors.text.secondary,
    border: `1px solid ${colors.border.default}`,
  };

  // ==================== RENDER HELPERS ====================

  const renderMetrics = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: spacing[4],
      marginBottom: spacing[6],
    }}>
      <MetricCard
        title="Active Series"
        value={metrics.seriesCount}
        variant="blue"
        icon={<BooksIcon />}
        items={[
          { label: 'Trilogies', count: seriesProjects.filter(p => p.type === 'trilogy').length },
          { label: 'Series', count: seriesProjects.filter(p => p.type === 'series').length },
        ]}
      />
      <MetricCard
        title="Total Books"
        value={metrics.totalBooks}
        variant="green"
        icon={<CharactersIcon />}
        items={[
          { label: 'Completed', count: Array.from(seriesDataMap.values()).reduce((sum, d) => sum + d.books.filter(b => b.status === 'completed').length, 0) },
          { label: 'In Progress', count: Array.from(seriesDataMap.values()).reduce((sum, d) => sum + d.books.filter(b => b.status !== 'completed').length, 0) },
        ]}
      />
      <MetricCard
        title="Total Words"
        value={metrics.totalWords.toLocaleString()}
        variant="orange"
        icon={<WordsIcon />}
      />
      <MetricCard
        title="Characters Tracked"
        value={metrics.totalCharacters}
        variant="blue"
        icon={<CharactersIcon color={colors.metrics.blue} />}
        items={[
          { label: 'Open Mysteries', count: metrics.openMysteries },
        ]}
      />
    </div>
  );

  const renderOverviewTab = () => (
    <>
      {renderMetrics()}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[4],
      }}>
        <h2 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          margin: 0,
        }}>
          Your Series
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={primaryButtonStyle}
        >
          <PlusIcon />
          Create New Series
        </button>
      </div>

      {seriesProjects.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: spacing[12] }}>
          <div style={{
            fontSize: typography.fontSize['4xl'],
            marginBottom: spacing[4],
          }}>
            📚
          </div>
          <h3 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[2],
          }}>
            No Series Yet
          </h3>
          <p style={{
            color: colors.text.secondary,
            marginBottom: spacing[6],
            maxWidth: '400px',
            margin: '0 auto',
          }}>
            Create your first book series to track characters, maintain timelines, and ensure consistency across your novels.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ ...primaryButtonStyle, marginTop: spacing[4] }}
          >
            <PlusIcon />
            Create Your First Series
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {seriesProjects.map((project) => {
            const seriesData = seriesDataMap.get(project.id);
            const books = seriesData?.books || [];
            const totalWords = books.reduce((sum, b) => sum + (b.word_count || 0), 0);
            const completedBooks = books.filter(b => b.status === 'completed').length;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}/series`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={seriesCardStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = shadows.md;
                    e.currentTarget.style.borderColor = colors.brand.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = colors.border.default;
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] }}>
                        <h3 style={{
                          fontSize: typography.fontSize.lg,
                          fontWeight: typography.fontWeight.semibold,
                          color: colors.text.primary,
                          margin: 0,
                        }}>
                          {project.title}
                        </h3>
                        <span style={badgeStyle(project.type === 'trilogy' ? 'info' : 'success')}>
                          {project.type === 'trilogy' ? 'Trilogy' : 'Series'}
                        </span>
                        <span style={badgeStyle(
                          project.status === 'completed' ? 'success' :
                          project.status === 'generating' ? 'warning' : 'info'
                        )}>
                          {project.status}
                        </span>
                      </div>
                      <p style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        margin: 0,
                        marginBottom: spacing[3],
                      }}>
                        {project.genre} • {books.length} book{books.length !== 1 ? 's' : ''} • {totalWords.toLocaleString()} words
                      </p>

                      {books.length > 0 && (
                        <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
                          {books.slice(0, 5).map((book) => (
                            <span
                              key={book.id}
                              style={{
                                padding: `${spacing[1]} ${spacing[3]}`,
                                background: book.status === 'completed'
                                  ? colors.semantic.successLight
                                  : colors.background.surfaceHover,
                                borderRadius: borderRadius.sm,
                                fontSize: typography.fontSize.xs,
                                color: book.status === 'completed'
                                  ? colors.semantic.successDark
                                  : colors.text.tertiary,
                              }}
                            >
                              Book {book.book_number}: {book.title || 'Untitled'}
                            </span>
                          ))}
                          {books.length > 5 && (
                            <span style={{
                              padding: `${spacing[1]} ${spacing[3]}`,
                              background: colors.background.surfaceHover,
                              borderRadius: borderRadius.sm,
                              fontSize: typography.fontSize.xs,
                              color: colors.text.tertiary,
                            }}>
                              +{books.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                      color: colors.text.tertiary,
                    }}>
                      <span style={{ fontSize: typography.fontSize.sm }}>
                        {completedBooks}/{books.length} completed
                      </span>
                      <ArrowRightIcon />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );

  const renderCharactersTab = () => (
    <>
      <div style={{ marginBottom: spacing[4] }}>
        <input
          type="text"
          placeholder="Search characters by name, role, or series..."
          value={characterSearch}
          onChange={(e) => setCharacterSearch(e.target.value)}
          style={{
            ...inputStyle,
            marginBottom: 0,
            maxWidth: '400px',
          }}
        />
      </div>

      {filteredCharacters.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: spacing[12] }}>
          <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing[4] }}>👥</div>
          <h3 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[2],
          }}>
            {characterSearch ? 'No Characters Found' : 'No Characters Yet'}
          </h3>
          <p style={{ color: colors.text.secondary }}>
            {characterSearch
              ? 'Try adjusting your search terms.'
              : 'Generate series bibles for your series to track characters across books.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          {filteredCharacters.map((char, idx) => (
            <div key={`${char.projectId}-${char.characterId}-${idx}`} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] }}>
                    <h4 style={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      margin: 0,
                    }}>
                      {char.name}
                    </h4>
                    <span style={badgeStyle(
                      char.status === 'alive' ? 'success' :
                      char.status === 'dead' ? 'error' : 'warning'
                    )}>
                      {char.status}
                    </span>
                  </div>

                  <p style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                    margin: 0,
                    marginBottom: spacing[2],
                  }}>
                    {char.role}
                  </p>

                  <p style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.text.tertiary,
                    margin: 0,
                  }}>
                    <strong>Series:</strong> {char.projectTitle}
                    {char.firstAppearance && (
                      <> • First appears: Book {char.firstAppearance.bookNumber}, Ch. {char.firstAppearance.chapterNumber}</>
                    )}
                  </p>

                  {char.development && char.development.length > 0 && (
                    <div style={{ marginTop: spacing[3] }}>
                      <p style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                        marginBottom: spacing[2],
                      }}>
                        Character Arc:
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                        {char.development.map((dev, devIdx) => (
                          <div
                            key={devIdx}
                            style={{
                              padding: spacing[3],
                              background: colors.background.surfaceHover,
                              borderRadius: borderRadius.sm,
                              borderLeft: `3px solid ${colors.brand.primary}`,
                            }}
                          >
                            <p style={{
                              fontSize: typography.fontSize.xs,
                              fontWeight: typography.fontWeight.medium,
                              color: colors.text.tertiary,
                              margin: 0,
                              marginBottom: spacing[1],
                            }}>
                              Book {dev.bookNumber}
                            </p>
                            <ul style={{
                              margin: 0,
                              paddingLeft: spacing[4],
                              fontSize: typography.fontSize.sm,
                              color: colors.text.secondary,
                            }}>
                              {dev.changes.map((change, changeIdx) => (
                                <li key={changeIdx}>{change}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderTimelineTab = () => (
    <>
      {aggregatedTimeline.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: spacing[12] }}>
          <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing[4] }}>📅</div>
          <h3 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[2],
          }}>
            No Timeline Data
          </h3>
          <p style={{ color: colors.text.secondary }}>
            Generate series bibles for your series to see timeline information.
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: spacing[8] }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute',
            left: spacing[3],
            top: spacing[2],
            bottom: spacing[2],
            width: '2px',
            background: colors.brand.primary,
          }} />

          {aggregatedTimeline.map((entry, idx) => (
            <div key={`${entry.projectId}-${entry.bookNumber}-${idx}`} style={{ position: 'relative', marginBottom: spacing[4] }}>
              {/* Timeline dot */}
              <div style={{
                position: 'absolute',
                left: `-${spacing[6]}`,
                top: spacing[3],
                width: '12px',
                height: '12px',
                background: colors.brand.primary,
                borderRadius: borderRadius.full,
                border: `2px solid ${colors.background.surface}`,
              }} />

              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.tertiary,
                      margin: 0,
                      marginBottom: spacing[1],
                    }}>
                      {entry.projectTitle}
                    </p>
                    <h4 style={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      margin: 0,
                      marginBottom: spacing[2],
                    }}>
                      Book {entry.bookNumber}
                    </h4>
                    {(entry.startDate || entry.endDate || entry.timespan) && (
                      <p style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        margin: 0,
                        marginBottom: spacing[2],
                      }}>
                        {entry.startDate && entry.endDate
                          ? `${entry.startDate} - ${entry.endDate}`
                          : entry.timespan || 'Timeline not specified'}
                      </p>
                    )}
                  </div>
                </div>

                {entry.majorEvents && entry.majorEvents.length > 0 && (
                  <div style={{ marginTop: spacing[3] }}>
                    <p style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      Major Events:
                    </p>
                    <ul style={{
                      margin: 0,
                      paddingLeft: spacing[5],
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}>
                      {entry.majorEvents.map((event, eventIdx) => (
                        <li key={eventIdx} style={{ marginBottom: spacing[1] }}>{event}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderConsistencyTab = () => {
    const openMysteries = allMysteries.filter(m => !m.answeredInBook);
    const resolvedMysteries = allMysteries.filter(m => m.answeredInBook);

    return (
      <>
        {/* Open Mysteries Section */}
        <div style={{ marginBottom: spacing[6] }}>
          <h3 style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[4],
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
          }}>
            <MysteriesIcon color={colors.semantic.warning} />
            Open Plot Threads ({openMysteries.length})
          </h3>

          {openMysteries.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <p style={{ color: colors.text.secondary, margin: 0 }}>
                No open mysteries to track. All plot threads have been resolved.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
              {openMysteries.map((mystery, idx) => (
                <div
                  key={`${mystery.projectId}-${mystery.id}-${idx}`}
                  style={{
                    ...cardStyle,
                    borderLeft: `4px solid ${colors.semantic.warning}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.tertiary,
                        margin: 0,
                        marginBottom: spacing[1],
                      }}>
                        {mystery.projectTitle}
                      </p>
                      <h4 style={{
                        fontSize: typography.fontSize.base,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                        margin: 0,
                        marginBottom: spacing[2],
                      }}>
                        {mystery.question}
                      </h4>
                      <p style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        margin: 0,
                      }}>
                        Introduced in Book {mystery.introducedInBook}
                      </p>
                    </div>
                    <span style={badgeStyle('warning')}>Open</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resolved Mysteries Section */}
        <div>
          <h3 style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[4],
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
          }}>
            <MysteriesIcon color={colors.semantic.success} />
            Resolved Plot Threads ({resolvedMysteries.length})
          </h3>

          {resolvedMysteries.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <p style={{ color: colors.text.secondary, margin: 0 }}>
                No resolved mysteries yet.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
              {resolvedMysteries.map((mystery, idx) => (
                <div
                  key={`${mystery.projectId}-${mystery.id}-${idx}`}
                  style={{
                    ...cardStyle,
                    borderLeft: `4px solid ${colors.semantic.success}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.tertiary,
                        margin: 0,
                        marginBottom: spacing[1],
                      }}>
                        {mystery.projectTitle}
                      </p>
                      <h4 style={{
                        fontSize: typography.fontSize.base,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                        margin: 0,
                        marginBottom: spacing[2],
                      }}>
                        {mystery.question}
                      </h4>
                      <p style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        margin: 0,
                        marginBottom: spacing[2],
                      }}>
                        Introduced in Book {mystery.introducedInBook} • Resolved in Book {mystery.answeredInBook}
                      </p>
                      {mystery.answer && (
                        <div style={{
                          padding: spacing[3],
                          background: colors.semantic.successLight,
                          borderRadius: borderRadius.sm,
                          fontSize: typography.fontSize.sm,
                          color: colors.text.primary,
                        }}>
                          <strong>Answer:</strong> {mystery.answer}
                        </div>
                      )}
                    </div>
                    <span style={badgeStyle('success')}>Resolved</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

  // ==================== MAIN RENDER ====================

  if (loading) {
    return (
      <DashboardLayout
        header={{
          title: 'Series Management',
          subtitle: 'Organise and manage your book series',
        }}
      >
        <div style={{ textAlign: 'center', padding: spacing[12] }}>
          <div style={{
            fontSize: typography.fontSize.lg,
            color: colors.text.secondary,
          }}>
            Loading series data...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      header={{
        title: 'Series Management',
        subtitle: 'Organise and manage your book series across all projects',
      }}
    >
      {error && (
        <div style={{
          ...cardStyle,
          background: colors.semantic.errorLight,
          borderColor: colors.semantic.errorBorder,
          color: colors.semantic.error,
          marginBottom: spacing[4],
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: spacing[4],
              background: 'transparent',
              border: 'none',
              color: colors.semantic.error,
              cursor: 'pointer',
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: spacing[2],
        marginBottom: spacing[6],
        flexWrap: 'wrap',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={tabStyle(activeTab === tab.id)}
            aria-pressed={activeTab === tab.id}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'characters' && renderCharactersTab()}
      {activeTab === 'timeline' && renderTimelineTab()}
      {activeTab === 'consistency' && renderConsistencyTab()}

      {/* Create Series Modal */}
      {showCreateModal && (
        <div
          style={modalOverlayStyle}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={modalStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing[6],
            }}>
              Create New Series
            </h2>

            <label style={{
              display: 'block',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.primary,
              marginBottom: spacing[2],
            }}>
              Series Title
            </label>
            <input
              type="text"
              value={newSeriesTitle}
              onChange={(e) => setNewSeriesTitle(e.target.value)}
              placeholder="Enter series title..."
              style={inputStyle}
              autoFocus
              disabled={creating}
            />

            <label style={{
              display: 'block',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.primary,
              marginBottom: spacing[2],
            }}>
              Genre
            </label>
            <select
              value={newSeriesGenre}
              onChange={(e) => setNewSeriesGenre(e.target.value)}
              style={selectStyle}
              disabled={creating}
            >
              <option value="fantasy">Fantasy</option>
              <option value="science-fiction">Science Fiction</option>
              <option value="mystery">Mystery</option>
              <option value="thriller">Thriller</option>
              <option value="romance">Romance</option>
              <option value="horror">Horror</option>
              <option value="historical-fiction">Historical Fiction</option>
              <option value="literary-fiction">Literary Fiction</option>
            </select>

            <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewSeriesTitle('');
                  setError(null);
                }}
                style={secondaryButtonStyle}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSeries}
                style={{
                  ...primaryButtonStyle,
                  opacity: creating || !newSeriesTitle.trim() ? 0.7 : 1,
                  cursor: creating || !newSeriesTitle.trim() ? 'not-allowed' : 'pointer',
                }}
                disabled={creating || !newSeriesTitle.trim()}
              >
                {creating ? 'Creating...' : 'Create Series'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
