'use client';

import { useState, Suspense, lazy, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import { colors, typography, spacing, borderRadius, shadows, transitions } from '@/app/lib/design-tokens';

// Lazy load the tab content components
const EditorialReportContent = lazy(() => import('./EditorialReportContent'));
const ProseReportsContent = lazy(() => import('./ProseReportsContent'));
const BestsellerContent = lazy(() => import('./BestsellerContent'));
const WordCountRevisionContent = lazy(() => import('./WordCountRevisionContent'));

type TabId = 'editorial' | 'prose' | 'bestseller' | 'word-count';

interface Tab {
  id: TabId;
  label: string;
  description: string;
}

const tabs: Tab[] = [
  { id: 'editorial', label: 'Editorial Report', description: 'Beta reader feedback and editorial analysis' },
  { id: 'prose', label: 'Prose Quality', description: 'Readability, sentence variety, and style metrics' },
  { id: 'bestseller', label: 'Bestseller Analysis', description: 'Market patterns and commercial potential' },
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

  // Mark tab as loaded when selected (for caching)
  useEffect(() => {
    if (!loadedTabs.has(activeTab)) {
      setLoadedTabs(prev => new Set([...prev, activeTab]));
    }
  }, [activeTab, loadedTabs]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'editorial':
        return <EditorialReportContent projectId={projectId} />;
      case 'prose':
        return <ProseReportsContent projectId={projectId} />;
      case 'bestseller':
        return <BestsellerContent projectId={projectId} />;
      case 'word-count':
        return <WordCountRevisionContent projectId={projectId} />;
      default:
        return null;
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
      <Suspense fallback={<LoadingSpinner />}>
        {renderTabContent()}
      </Suspense>
    </DashboardLayout>
  );
}
