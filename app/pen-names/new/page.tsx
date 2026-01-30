'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreatePenName } from '@/app/hooks/usePenNames';
import { colors, borderRadius, spacing, typography } from '@/app/lib/design-tokens';
import PenNameForm from '@/app/components/pen-names/PenNameForm';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import type { CreatePenNameData, UpdatePenNameData } from '@/app/hooks/usePenNames';

export default function NewPenNamePage() {
  const router = useRouter();
  const createMutation = useCreatePenName();

  const handleSubmit = async (data: CreatePenNameData | UpdatePenNameData) => {
    // Assert type as CreatePenNameData since we're in create mode
    const createData = data as CreatePenNameData;
    try {
      const penName = await createMutation.mutateAsync(createData);
      // Redirect to the pen name's portfolio page
      router.push(`/pen-names/${penName.id}`);
    } catch (error) {
      console.error('Failed to create pen name:', error);
      // Error is handled by the mutation
    }
  };

  return (
    <DashboardLayout
      header={{
        title: 'Create Pen Name',
        subtitle: 'Set up a new author identity',
      }}
    >
      {/* Back Button */}
      <div style={{ marginBottom: spacing[6] }}>
        <Link
          href="/pen-names"
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
          <span>Back to Pen Names</span>
        </Link>
      </div>

      {/* Error Display */}
      {createMutation.isError && (
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
          {createMutation.error instanceof Error
            ? createMutation.error.message
            : 'Failed to create pen name. Please try again.'}
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
          Create New Pen Name
        </h2>
        <p
          style={{
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            marginBottom: spacing[8],
          }}
        >
          Set up a new author identity for your books. You can create multiple pen names for different genres or writing styles.
        </p>

        <PenNameForm mode="create" onSubmit={handleSubmit} isSubmitting={createMutation.isPending} />
      </div>
    </DashboardLayout>
  );
}
