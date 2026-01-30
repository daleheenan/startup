'use client';

import Link from 'next/link';
import { usePenNames } from '@/app/hooks/usePenNames';
import { colors, borderRadius, spacing, typography } from '@/app/lib/design-tokens';
import PenNamesList from '@/app/components/pen-names/PenNamesList';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';

export default function PenNamesPage() {
  const { data: penNames, isLoading, error } = usePenNames();

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout
        header={{
          title: 'Pen Names',
          subtitle: 'Manage your author identities',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-block',
                width: '48px',
                height: '48px',
                border: `3px solid ${colors.border.default}`,
                borderTopColor: colors.brand.primary,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ marginTop: spacing[4], color: colors.text.tertiary }}>Loading...</p>
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout
        header={{
          title: 'Pen Names',
          subtitle: 'Manage your author identities',
        }}
      >
        <div
          style={{
            background: colors.semantic.errorLight,
            border: `1px solid ${colors.semantic.errorBorder}`,
            borderRadius: borderRadius.lg,
            padding: `${spacing[4]} ${spacing[6]}`,
            color: colors.semantic.error,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[3],
          }}
        >
          <span aria-hidden="true">⚠️</span>
          {error instanceof Error ? error.message : 'Failed to load pen names'}
        </div>
      </DashboardLayout>
    );
  }

  const sortedPenNames = [...(penNames || [])].sort((a, b) => {
    // Default pen name first
    if (a.is_default) return -1;
    if (b.is_default) return 1;
    // Then by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Empty state
  const isEmpty = !penNames || penNames.length === 0;

  return (
    <DashboardLayout
      header={{
        title: 'Pen Names',
        subtitle: 'Manage your author identities',
      }}
    >
      {/* Header with New Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[6],
        }}
      >
        <h2
          style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            margin: 0,
          }}
        >
          Your Pen Names ({penNames?.length || 0})
        </h2>
        <Link
          href="/pen-names/new"
          style={{
            padding: `${spacing[3]} ${spacing[6]}`,
            background: colors.brand.gradient,
            border: 'none',
            borderRadius: borderRadius.md,
            color: colors.text.inverse,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            textDecoration: 'none',
            display: 'inline-block',
            transition: 'all 0.2s',
          }}
        >
          + New Pen Name
        </Link>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div
          style={{
            textAlign: 'center',
            padding: `${spacing[12]} ${spacing[6]}`,
            background: colors.background.surface,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.lg,
          }}
        >
          <div
            style={{
              fontSize: '4rem',
              marginBottom: spacing[4],
            }}
          >
            ✍️
          </div>
          <h3
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing[2],
            }}
          >
            No pen names yet
          </h3>
          <p
            style={{
              fontSize: typography.fontSize.base,
              color: colors.text.secondary,
              marginBottom: spacing[6],
              maxWidth: '500px',
              margin: `0 auto ${spacing[6]}`,
            }}
          >
            Create your first pen name to get started. You can use different pen names for different genres or writing styles.
          </p>
          <Link
            href="/pen-names/new"
            style={{
              padding: `${spacing[3]} ${spacing[6]}`,
              background: colors.brand.gradient,
              border: 'none',
              borderRadius: borderRadius.md,
              color: colors.text.inverse,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Create Your First Pen Name
          </Link>
        </div>
      )}

      {/* Pen Names Grid */}
      {!isEmpty && <PenNamesList penNames={sortedPenNames} />}
    </DashboardLayout>
  );
}
