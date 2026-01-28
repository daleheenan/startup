'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
} from '@/app/lib/design-tokens';

// ==================== TYPES ====================

type ModuleStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

interface EditorialModule {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  status: ModuleStatus;
  completedAt?: string;
}

interface Recommendation {
  id: string;
  module: string;
  category: string;
  text: string;
  severity: 'minor' | 'moderate' | 'major';
  implemented: boolean;
  implementedAt?: string;
}

export interface EditorialWorkflowProps {
  type: 'outline' | 'veb';
  projectId: string;
  reportId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unavailable';
  modules: {
    module1: { status: ModuleStatus; completedAt?: string };
    module2: { status: ModuleStatus; completedAt?: string };
    module3: { status: ModuleStatus; completedAt?: string };
  };
  overallScore?: number;
  recommendations?: Recommendation[];
  onImplementRecommendation?: (recommendationId: string) => Promise<void>;
  createdAt?: string;
  completedAt?: string;
  error?: string;
}

// ==================== MODULE CONFIGURATIONS ====================

const OUTLINE_MODULES = [
  {
    id: 'structure_analyst',
    label: 'Story Structure Analyst',
    shortLabel: 'Structure',
    description: 'Analyses plot structure, pacing, and story arc',
  },
  {
    id: 'character_arc',
    label: 'Character Arc Reviewer',
    shortLabel: 'Characters',
    description: 'Reviews character development across the outline',
  },
  {
    id: 'market_fit',
    label: 'Market Fit Analyst',
    shortLabel: 'Market',
    description: 'Assesses commercial viability and genre alignment',
  },
];

const VEB_MODULES = [
  {
    id: 'beta_swarm',
    label: 'Beta Swarm (Marcus)',
    shortLabel: 'Beta',
    description: 'Reader engagement and sentiment analysis',
  },
  {
    id: 'ruthless_editor',
    label: 'Ruthless Editor',
    shortLabel: 'Editor',
    description: 'Structural analysis and exposition issues',
  },
  {
    id: 'market_analyst',
    label: 'Market Analyst',
    shortLabel: 'Market',
    description: 'Commercial viability and comp titles',
  },
];

// ==================== STYLES ====================

const MODULE_COLOURS = {
  pending: { bg: colors.background.surfaceHover, border: colors.border.default, text: colors.text.tertiary },
  processing: { bg: '#EEF2FF', border: colors.brand.primary, text: colors.brand.primary },
  completed: { bg: '#DCFCE7', border: '#10B981', text: '#059669' },
  failed: { bg: '#FEE2E2', border: '#EF4444', text: '#DC2626' },
  skipped: { bg: colors.background.surfaceHover, border: colors.border.default, text: colors.text.tertiary },
};

const SEVERITY_COLOURS = {
  minor: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
  moderate: { bg: '#FED7AA', text: '#9A3412', border: '#F97316' },
  major: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
};

// ==================== COMPONENT ====================

export default function EditorialWorkflowVisualization({
  type,
  projectId,
  reportId,
  status,
  modules,
  overallScore,
  recommendations = [],
  onImplementRecommendation,
  createdAt,
  completedAt,
  error,
}: EditorialWorkflowProps) {
  const [implementingId, setImplementingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const moduleConfig = type === 'outline' ? OUTLINE_MODULES : VEB_MODULES;

  // Map module statuses to the config
  const moduleStatuses: EditorialModule[] = [
    { ...moduleConfig[0], status: modules.module1.status, completedAt: modules.module1.completedAt },
    { ...moduleConfig[1], status: modules.module2.status, completedAt: modules.module2.completedAt },
    { ...moduleConfig[2], status: modules.module3.status, completedAt: modules.module3.completedAt },
  ];

  // Calculate progress
  const completedModules = moduleStatuses.filter(m => m.status === 'completed').length;
  const progress = Math.round((completedModules / 3) * 100);

  // Pagination for recommendations
  const totalPages = Math.ceil(recommendations.length / ITEMS_PER_PAGE);
  const paginatedRecommendations = recommendations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleImplement = async (recommendationId: string) => {
    if (!onImplementRecommendation) return;
    setImplementingId(recommendationId);
    try {
      await onImplementRecommendation(recommendationId);
    } finally {
      setImplementingId(null);
    }
  };

  // Module node component
  const ModuleNode = ({ module, index }: { module: EditorialModule; index: number }) => {
    const colours = MODULE_COLOURS[module.status];
    const isProcessing = module.status === 'processing';

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: spacing[2],
          flex: 1,
        }}
      >
        {/* Connection line (except for first) */}
        {index > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${((index - 1) / 2) * 100 + 16.67}%`,
              width: '33.33%',
              height: '2px',
              background: moduleStatuses[index - 1].status === 'completed'
                ? '#10B981'
                : colors.border.default,
              transform: 'translateY(-50%)',
              zIndex: 0,
            }}
          />
        )}

        {/* Node circle */}
        <div
          style={{
            position: 'relative',
            width: '64px',
            height: '64px',
            borderRadius: borderRadius.full,
            background: colours.bg,
            border: `3px solid ${colours.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: transitions.colors,
            zIndex: 1,
            boxShadow: isProcessing ? `0 0 0 4px ${colours.border}33` : 'none',
            animation: isProcessing ? 'pulse 2s ease-in-out infinite' : 'none',
          }}
        >
          {module.status === 'completed' && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colours.text} strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {module.status === 'failed' && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colours.text} strokeWidth="3">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
          {module.status === 'processing' && (
            <div
              style={{
                width: '24px',
                height: '24px',
                border: `3px solid ${colours.border}`,
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          )}
          {(module.status === 'pending' || module.status === 'skipped') && (
            <span style={{ fontSize: typography.fontSize.xl, fontWeight: 700, color: colours.text }}>
              {index + 1}
            </span>
          )}
        </div>

        {/* Label */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colours.text,
            }}
          >
            {module.shortLabel}
          </div>
          <div
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.text.tertiary,
              marginTop: spacing[1],
            }}
          >
            {module.status === 'completed' && 'Complete'}
            {module.status === 'processing' && 'Analysing...'}
            {module.status === 'pending' && 'Waiting'}
            {module.status === 'failed' && 'Failed'}
            {module.status === 'skipped' && 'Skipped'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        background: colors.background.surface,
        border: `1px solid ${colors.border.default}`,
        borderRadius: borderRadius.xl,
        padding: spacing[6],
        boxShadow: shadows.sm,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[6],
        }}
      >
        <div>
          <h3
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              margin: 0,
            }}
          >
            {type === 'outline' ? 'Outline Editorial Board' : 'Virtual Editorial Board'}
          </h3>
          {createdAt && (
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.tertiary,
                margin: `${spacing[1]} 0 0 0`,
              }}
            >
              Submitted {new Date(createdAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Overall Score */}
        {status === 'completed' && overallScore !== undefined && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              padding: `${spacing[2]} ${spacing[4]}`,
              background: overallScore >= 70 ? '#DCFCE7' : overallScore >= 50 ? '#FEF3C7' : '#FEE2E2',
              borderRadius: borderRadius.full,
            }}
          >
            <span
              style={{
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: overallScore >= 70 ? '#059669' : overallScore >= 50 ? '#92400E' : '#DC2626',
              }}
            >
              {overallScore}
            </span>
            <span
              style={{
                fontSize: typography.fontSize.sm,
                color: overallScore >= 70 ? '#059669' : overallScore >= 50 ? '#92400E' : '#DC2626',
              }}
            >
              / 100
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {status === 'processing' && (
        <div style={{ marginBottom: spacing[6] }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: spacing[2],
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
            }}
          >
            <span>Analysing your {type === 'outline' ? 'outline' : 'manuscript'}...</span>
            <span>{progress}% complete</span>
          </div>
          <div
            style={{
              height: '8px',
              background: colors.background.surfaceHover,
              borderRadius: borderRadius.full,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${colors.brand.primary}, ${colors.brand.primaryLight})`,
                borderRadius: borderRadius.full,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Module Workflow Nodes */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: `${spacing[4]} 0`,
          marginBottom: spacing[6],
        }}
      >
        {moduleStatuses.map((module, index) => (
          <ModuleNode key={module.id} module={module} index={index} />
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: spacing[4],
            background: '#FEE2E2',
            border: '1px solid #EF4444',
            borderRadius: borderRadius.lg,
            marginBottom: spacing[6],
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ color: '#DC2626', fontWeight: typography.fontWeight.medium }}>
              {error}
            </span>
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      {status === 'completed' && recommendations.length > 0 && (
        <div>
          <h4
            style={{
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              margin: `0 0 ${spacing[4]} 0`,
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Recommendations ({recommendations.filter(r => !r.implemented).length} remaining)
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
            {paginatedRecommendations.map((rec) => {
              const sevColours = SEVERITY_COLOURS[rec.severity];
              return (
                <div
                  key={rec.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: spacing[4],
                    padding: spacing[4],
                    background: rec.implemented ? '#F0FDF4' : colors.background.primary,
                    border: `1px solid ${rec.implemented ? '#10B981' : colors.border.default}`,
                    borderRadius: borderRadius.lg,
                    opacity: rec.implemented ? 0.8 : 1,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                      <span
                        style={{
                          fontSize: typography.fontSize.xs,
                          fontWeight: typography.fontWeight.medium,
                          padding: `${spacing[1]} ${spacing[2]}`,
                          background: sevColours.bg,
                          color: sevColours.text,
                          borderRadius: borderRadius.sm,
                          textTransform: 'uppercase',
                        }}
                      >
                        {rec.severity}
                      </span>
                      <span
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.tertiary,
                        }}
                      >
                        {rec.module} / {rec.category}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.primary,
                        margin: 0,
                        textDecoration: rec.implemented ? 'line-through' : 'none',
                      }}
                    >
                      {rec.text}
                    </p>
                    {rec.implemented && rec.implementedAt && (
                      <p
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: '#059669',
                          margin: `${spacing[2]} 0 0 0`,
                        }}
                      >
                        Implemented {new Date(rec.implementedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {!rec.implemented && onImplementRecommendation && (
                    <button
                      onClick={() => handleImplement(rec.id)}
                      disabled={implementingId === rec.id}
                      style={{
                        padding: `${spacing[2]} ${spacing[4]}`,
                        background: colors.brand.primary,
                        color: colors.white,
                        border: 'none',
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        cursor: implementingId === rec.id ? 'not-allowed' : 'pointer',
                        opacity: implementingId === rec.id ? 0.7 : 1,
                        transition: transitions.colors,
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[2],
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {implementingId === rec.id ? (
                        <>
                          <div
                            style={{
                              width: '14px',
                              height: '14px',
                              border: '2px solid white',
                              borderTopColor: 'transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite',
                            }}
                          />
                          Implementing...
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          Implement
                        </>
                      )}
                    </button>
                  )}

                  {rec.implemented && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[1],
                        color: '#059669',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Done
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: spacing[2],
                marginTop: spacing[4],
              }}
            >
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: `${spacing[2]} ${spacing[3]}`,
                  background: currentPage === 1 ? colors.background.surfaceHover : colors.background.surface,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: borderRadius.md,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: `${spacing[2]} ${spacing[3]}`,
                  background: currentPage === totalPages ? colors.background.surfaceHover : colors.background.surface,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: borderRadius.md,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Completed Message */}
      {status === 'completed' && completedAt && (
        <div
          style={{
            marginTop: spacing[4],
            padding: spacing[4],
            background: '#F0FDF4',
            border: '1px solid #10B981',
            borderRadius: borderRadius.lg,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[3],
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div>
            <div style={{ fontWeight: typography.fontWeight.medium, color: '#059669' }}>
              Analysis Complete
            </div>
            <div style={{ fontSize: typography.fontSize.sm, color: '#047857' }}>
              Completed {new Date(completedAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(102, 126, 234, 0);
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
