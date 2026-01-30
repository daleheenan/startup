'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePenName, useUpdatePenName } from '@/app/hooks/usePenNames';
import { colors, borderRadius, spacing, typography } from '@/app/lib/design-tokens';
import PenNameForm from '@/app/components/pen-names/PenNameForm';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import type { UpdatePenNameData } from '@/app/hooks/usePenNames';

export default function EditPenNamePage() {
  const params = useParams();
  const router = useRouter();
  const penNameId = params?.id as string;
  const { data: penName, isLoading, error } = usePenName(penNameId);
  const updateMutation = useUpdatePenName();

  const handleSubmit = async (data: UpdatePenNameData) => {
    try {
      await updateMutation.mutateAsync({ id: penNameId, data });
      // Redirect to the pen name's portfolio page
      router.push(`/pen-names/${penNameId}`);
    } catch (error) {
      console.error('Failed to update pen name:', error);
      // Error is handled by the mutation
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout
        header={{
          title: 'Edit Pen Name',
          subtitle: 'Loading...',
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
  if (error || !penName) {
    return (
      <DashboardLayout
        header={{
          title: 'Pen Name Not Found',
          subtitle: 'This pen name could not be loaded',
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
            marginBottom: spacing[6],
          }}
        >
          <span aria-hidden="true">⚠️</span>
          {error instanceof Error ? error.message : 'Pen name not found'}
        </div>
        <Link
          href="/pen-names"
          style={{
            color: colors.brand.primary,
            fontSize: typography.fontSize.base,
            textDecoration: 'none',
          }}
        >
          ← Back to Pen Names
        </Link>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      header={{
        title: `Edit ${penName.pen_name}`,
        subtitle: 'Update author identity',
      }}
    >
      {/* Back Button */}
      <div style={{ marginBottom: spacing[6] }}>
        <Link
          href={`/pen-names/${penNameId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing[2],
            color: colors.text.secondary,
            fontSize: typography.fontSize.sm,
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = colors.brand.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.text.secondary;
          }}
        >
          <span>←</span>
          <span>Back to Portfolio</span>
        </Link>
      </div>

      {/* Error Display */}
      {updateMutation.isError && (
        <div
          style={{
            background: colors.semantic.errorLight,
            border: `1px solid ${colors.semantic.errorBorder}`,
            borderRadius: borderRadius.lg,
            padding: `${spacing[4]} ${spacing[6]}`,
            marginBottom: spacing[6],
            color: colors.semantic.error,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[3],
          }}
        >
          <span aria-hidden="true">⚠️</span>
          {updateMutation.error instanceof Error
            ? updateMutation.error.message
            : 'Failed to update pen name. Please try again.'}
        </div>
      )}

      {/* Form Container */}
      <div
        style={{
          maxWidth: '700px',
          margin: '0 auto',
          background: colors.background.surface,
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.lg,
          padding: spacing[8],
        }}
      >
        <h2
          style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[2],
          }}
        >
          Edit Pen Name
        </h2>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            marginBottom: spacing[8],
          }}
        >
          Update the details for your pen name. Changes will be reflected across all associated books.
        </p>

        <PenNameForm
          mode="edit"
          initialData={penName}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
