'use client';

import { useState, Suspense, lazy, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import BookVersionSelector from '@/app/components/BookVersionSelector';
import { getToken, logout } from '@/app/lib/auth';
import { colors, typography, spacing, borderRadius, shadows, transitions } from '@/app/lib/design-tokens';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Lazy load the tab content components
const EditorialReportContent = lazy(() => import('./EditorialReportContent'));
const ProseReportsContent = lazy(() => import('./ProseReportsContent'));
const BestsellerContent = lazy(() => import('./BestsellerContent'));
const WordCountRevisionContent = lazy(() => import('./WordCountRevisionContent'));

// Lazy load Analytics Dashboard (heavy component with charts)
const AnalyticsDashboard = dynamic(() => import('@/app/components/AnalyticsDashboard'), {
  loading: () => (
    <div style={{ padding: '2rem', textAlign: 'center', color: colors.text.tertiary }}>
      Loading analytics...
    </div>
  ),
  ssr: false,
});

type TabId = 'editorial' | 'prose' | 'bestseller' | 'word-count' | 'analytics';

interface Tab {
  id: TabId;
  label: string;
  description: string;
}

interface Book {
  id: string;
  title: string;
  book_number: number;
}

interface BookVersion {
  id: string;
  book_id: string;
  version_number: number;
  version_name: string | null;
  is_active: number;
}

const tabs: Tab[] = [
  { id: 'editorial', label: 'Editorial Report', description: 'Beta reader feedback and editorial analysis' },
  { id: 'prose', label: 'Prose Quality', description: 'Readability, sentence variety, and style metrics' },
  { id: 'bestseller', label: 'Bestseller Analysis', description: 'Market patterns and commercial potential' },
  { id: 'analytics', label: 'Analytics', description: 'Word counts, pacing, and chapter statistics' },
  { id: 'word-count', label: 'Word Count Revision', description: 'Manage manuscript length and cuts' },
];

function LoadingSpinner() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[12],
        gap: spacing[4],
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          border: `3px solid ${colors.border.default}`,
          borderTopColor: colors.brand.primary,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
        Loading content...
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function EditorPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabId>('editorial');
  const [loadedTabs, setLoadedTabs] = useState<Set<TabId>>(new Set(['editorial']));

  // Book and version selection state
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Run All Analyses state
  const [runningAllAnalyses, setRunningAllAnalyses] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{
    veb: 'idle' | 'running' | 'done' | 'error';
    prose: 'idle' | 'running' | 'done' | 'error';
    bestseller: 'idle' | 'running' | 'done' | 'error';
    analytics: 'idle' | 'running' | 'done' | 'error';
  }>({ veb: 'idle', prose: 'idle', bestseller: 'idle', analytics: 'idle' });

  // Fetch project and books on mount
  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchBooks();
    }
  }, [projectId]);

  // Mark tab as loaded when selected (for caching)
  useEffect(() => {
    if (!loadedTabs.has(activeTab)) {
      setLoadedTabs(prev => new Set([...prev, activeTab]));
    }
  }, [activeTab, loadedTabs]);

  const fetchProject = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchBooks = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/books/project/${projectId}`, {
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
        throw new Error('Failed to fetch books');
      }

      const data = await response.json();
      setBooks(data.books || []);

      // Select first book by default
      if (data.books && data.books.length > 0) {
        setSelectedBookId(data.books[0].id);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionChange = (version: BookVersion) => {
    setSelectedVersionId(version.id);
  };

  const runAllAnalyses = async () => {
    if (!selectedBookId) return;

    setRunningAllAnalyses(true);
    setAnalysisProgress({ veb: 'running', prose: 'idle', bestseller: 'idle', analytics: 'idle' });

    const token = getToken();

    try {
      // 1. Submit VEB (Editorial Report)
      try {
        const vebResponse = await fetch(`${API_BASE_URL}/api/projects/${projectId}/veb/submit`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        setAnalysisProgress(prev => ({ ...prev, veb: vebResponse.ok ? 'done' : 'error', prose: 'running' }));
      } catch {
        setAnalysisProgress(prev => ({ ...prev, veb: 'error', prose: 'running' }));
      }

      // 2. Generate Prose Reports (this endpoint may need to be created)
      try {
        const proseResponse = await fetch(`${API_BASE_URL}/api/prose-reports/${projectId}/book/${selectedBookId}/generate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        setAnalysisProgress(prev => ({ ...prev, prose: proseResponse.ok ? 'done' : 'error', bestseller: 'running' }));
      } catch {
        setAnalysisProgress(prev => ({ ...prev, prose: 'error', bestseller: 'running' }));
      }

      // 3. Run Bestseller Analysis
      try {
        const bestsellerResponse = await fetch(`${API_BASE_URL}/api/bestseller/${selectedBookId}/analysis`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        setAnalysisProgress(prev => ({ ...prev, bestseller: bestsellerResponse.ok ? 'done' : 'error', analytics: 'running' }));
      } catch {
        setAnalysisProgress(prev => ({ ...prev, bestseller: 'error', analytics: 'running' }));
      }

      // 4. Analyse Book (Analytics)
      try {
        const analyticsResponse = await fetch(`${API_BASE_URL}/api/analytics/book/${selectedBookId}/analyze`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        setAnalysisProgress(prev => ({ ...prev, analytics: analyticsResponse.ok ? 'done' : 'error' }));
      } catch {
        setAnalysisProgress(prev => ({ ...prev, analytics: 'error' }));
      }

    } finally {
      setRunningAllAnalyses(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'editorial':
        return <EditorialReportContent projectId={projectId} bookId={selectedBookId} versionId={selectedVersionId} />;
      case 'prose':
        return <ProseReportsContent projectId={projectId} bookId={selectedBookId} versionId={selectedVersionId} />;
      case 'bestseller':
        return <BestsellerContent projectId={projectId} bookId={selectedBookId} versionId={selectedVersionId} />;
      case 'analytics':
        return selectedBookId ? (
          <AnalyticsDashboard
            key={`${selectedBookId}-${selectedVersionId || 'active'}`}
            bookId={selectedBookId}
            versionId={selectedVersionId}
            genre={project?.genre}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: spacing[8], color: colors.text.tertiary }}>
            Select a book to view analytics
          </div>
        );
      case 'word-count':
        return <WordCountRevisionContent projectId={projectId} bookId={selectedBookId} versionId={selectedVersionId} />;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: 'idle' | 'running' | 'done' | 'error') => {
    switch (status) {
      case 'running': return '⏳';
      case 'done': return '✓';
      case 'error': return '✗';
      default: return '○';
    }
  };

  const getStatusColor = (status: 'idle' | 'running' | 'done' | 'error') => {
    switch (status) {
      case 'running': return colors.semantic.warning;
      case 'done': return colors.semantic.successDark;
      case 'error': return colors.semantic.error;
      default: return colors.text.tertiary;
    }
  };

  return (
    <DashboardLayout
      header={{
        title: 'Editor',
        subtitle: 'Editorial analysis, prose quality, and revision tools',
      }}
      projectId={projectId}
    >
      {/* Book and Version Selectors */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: spacing[4],
          marginBottom: spacing[6],
          padding: spacing[4],
          background: colors.background.surface,
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.lg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[4], flexWrap: 'wrap' }}>
          {/* Book Selector */}
          {books.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <label style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, fontWeight: typography.fontWeight.medium }}>
                Book
              </label>
              <select
                value={selectedBookId || ''}
                onChange={(e) => {
                  setSelectedBookId(e.target.value);
                  setSelectedVersionId(null); // Reset version when book changes
                }}
                style={{
                  padding: `${spacing[2]} ${spacing[3]}`,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: borderRadius.md,
                  background: colors.background.surface,
                  fontSize: typography.fontSize.sm,
                  minWidth: '180px',
                }}
              >
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title || `Book ${book.book_number}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Version Selector */}
          {selectedBookId && (
            <BookVersionSelector
              bookId={selectedBookId}
              compact={true}
              onVersionChange={handleVersionChange}
            />
          )}
        </div>

        {/* Run All Analyses Button */}
        <button
          onClick={runAllAnalyses}
          disabled={runningAllAnalyses || !selectedBookId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            padding: `${spacing[2]} ${spacing[4]}`,
            background: runningAllAnalyses || !selectedBookId ? colors.text.disabled : colors.brand.gradient,
            border: 'none',
            borderRadius: borderRadius.md,
            color: colors.white,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            cursor: runningAllAnalyses || !selectedBookId ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '1rem' }}>🚀</span>
          {runningAllAnalyses ? 'Running...' : 'Run All Analyses'}
        </button>
      </div>

      {/* Analysis Progress (when running) */}
      {runningAllAnalyses && (
        <div
          style={{
            display: 'flex',
            gap: spacing[4],
            marginBottom: spacing[4],
            padding: spacing[3],
            background: colors.semantic.infoLight,
            border: `1px solid ${colors.semantic.infoBorder}`,
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.sm,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: getStatusColor(analysisProgress.veb) }}>
            {getStatusIcon(analysisProgress.veb)} Editorial
          </span>
          <span style={{ color: getStatusColor(analysisProgress.prose) }}>
            {getStatusIcon(analysisProgress.prose)} Prose
          </span>
          <span style={{ color: getStatusColor(analysisProgress.bestseller) }}>
            {getStatusIcon(analysisProgress.bestseller)} Bestseller
          </span>
          <span style={{ color: getStatusColor(analysisProgress.analytics) }}>
            {getStatusIcon(analysisProgress.analytics)} Analytics
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: spacing[1],
          marginBottom: spacing[6],
          borderBottom: `1px solid ${colors.border.default}`,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: `${spacing[3]} ${spacing[4]}`,
                background: 'transparent',
                border: 'none',
                borderBottom: isActive
                  ? `3px solid ${colors.brand.primary}`
                  : '3px solid transparent',
                cursor: 'pointer',
                transition: transitions.colors,
                minWidth: 'fit-content',
                whiteSpace: 'nowrap',
              }}
              aria-selected={isActive}
              role="tab"
            >
              <span
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
                  color: isActive ? colors.brand.primary : colors.text.secondary,
                }}
              >
                {tab.label}
              </span>
              <span
                style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.text.tertiary,
                  marginTop: spacing[1],
                }}
              >
                {tab.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content with Suspense for lazy loading */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Suspense fallback={<LoadingSpinner />}>
          {renderTabContent()}
        </Suspense>
      )}
    </DashboardLayout>
  );
}
