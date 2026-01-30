'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePenName, useDeletePenName } from '@/app/hooks/usePenNames';
import { colors, borderRadius, spacing, typography, shadows } from '@/app/lib/design-tokens';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import { useState } from 'react';

export default function PenNamePortfolioPage() {
  const params = useParams();
  const router = useRouter();
  const penNameId = params?.id as string;
  const { data: penName, isLoading, error } = usePenName(penNameId);
  const deleteMutation = useDeletePenName();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(penNameId);
      router.push('/pen-names');
    } catch (error) {
      console.error('Failed to delete pen name:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout
        header={{
          title: 'Pen Name',
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
        title: penName.pen_name,
        subtitle: penName.display_name || 'Author Portfolio',
      }}
    >
      {/* Back Button and Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[6],
        }}
      >
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

        <div style={{ display: 'flex', gap: spacing[3] }}>
          <Link
            href={`/pen-names/${penName.id}/edit`}
            style={{
              padding: `${spacing[2]} ${spacing[5]}`,
              background: colors.brand.gradient,
              border: 'none',
              borderRadius: borderRadius.md,
              color: colors.text.inverse,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Edit Pen Name
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: `${spacing[2]} ${spacing[5]}`,
              background: colors.background.surface,
              border: `1px solid ${colors.semantic.errorBorder}`,
              borderRadius: borderRadius.md,
              color: colors.semantic.error,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Header Section */}
      <div
        style={{
          background: colors.background.surface,
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.lg,
          padding: spacing[8],
          marginBottom: spacing[6],
          boxShadow: shadows.sm,
        }}
      >
        <div style={{ display: 'flex', gap: spacing[6], alignItems: 'flex-start' }}>
          {/* Photo */}
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: borderRadius.full,
              background: penName.photo_url
                ? `url(${penName.photo_url}) center/cover`
                : colors.brand.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.text.inverse,
              fontSize: '3rem',
              fontWeight: typography.fontWeight.bold,
              flexShrink: 0,
              boxShadow: shadows.md,
            }}
          >
            {!penName.photo_url && penName.pen_name.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] }}>
              <h1
                style={{
                  fontSize: typography.fontSize['3xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                  margin: 0,
                }}
              >
                {penName.pen_name}
              </h1>
              {penName.is_default && (
                <span
                  style={{
                    padding: `${spacing[1]} ${spacing[3]}`,
                    background: colors.brand.gradient,
                    borderRadius: borderRadius.full,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.inverse,
                  }}
                >
                  Default
                </span>
              )}
            </div>

            {penName.display_name && (
              <p
                style={{
                  fontSize: typography.fontSize.lg,
                  color: colors.text.secondary,
                  marginBottom: spacing[4],
                }}
              >
                {penName.display_name}
              </p>
            )}

            {penName.bio_short && (
              <p
                style={{
                  fontSize: typography.fontSize.base,
                  color: colors.text.secondary,
                  lineHeight: typography.lineHeight.relaxed,
                  marginBottom: spacing[4],
                }}
              >
                {penName.bio_short}
              </p>
            )}

            {/* Genres */}
            {penName.genres && penName.genres.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] }}>
                {penName.genres.map((genre) => (
                  <span
                    key={genre}
                    style={{
                      padding: `${spacing[2]} ${spacing[4]}`,
                      background: colors.background.surfaceHover,
                      borderRadius: borderRadius.full,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[4] }}>
              {penName.website && (
                <a
                  href={penName.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: colors.brand.primary,
                    fontSize: typography.fontSize.sm,
                    textDecoration: 'none',
                    fontWeight: typography.fontWeight.medium,
                  }}
                >
                  🌐 Website
                </a>
              )}
              {penName.social_media && Object.keys(penName.social_media).length > 0 && (
                <>
                  {penName.social_media.twitter && (
                    <a
                      href={`https://twitter.com/${penName.social_media.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: colors.brand.primary,
                        fontSize: typography.fontSize.sm,
                        textDecoration: 'none',
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      𝕏 Twitter
                    </a>
                  )}
                  {penName.social_media.instagram && (
                    <a
                      href={`https://instagram.com/${penName.social_media.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: colors.brand.primary,
                        fontSize: typography.fontSize.sm,
                        textDecoration: 'none',
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      📷 Instagram
                    </a>
                  )}
                  {penName.social_media.goodreads && (
                    <a
                      href={penName.social_media.goodreads}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: colors.brand.primary,
                        fontSize: typography.fontSize.sm,
                        textDecoration: 'none',
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      📚 Goodreads
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: spacing[4],
          marginBottom: spacing[6],
        }}
      >
        <div
          style={{
            background: colors.background.surface,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.lg,
            padding: spacing[6],
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.brand.primary,
              marginBottom: spacing[2],
            }}
          >
            {penName.book_count}
          </div>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
            {penName.book_count === 1 ? 'Book' : 'Books'}
          </div>
        </div>

        <div
          style={{
            background: colors.background.surface,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.lg,
            padding: spacing[6],
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.brand.primary,
              marginBottom: spacing[2],
            }}
          >
            {penName.word_count.toLocaleString()}
          </div>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Words Written</div>
        </div>

        <div
          style={{
            background: colors.background.surface,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.lg,
            padding: spacing[6],
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.brand.primary,
              marginBottom: spacing[2],
            }}
          >
            {penName.series_count}
          </div>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
            {penName.series_count === 1 ? 'Series' : 'Series'}
          </div>
        </div>
      </div>

      {/* Full Bio */}
      {penName.bio && (
        <div
          style={{
            background: colors.background.surface,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.lg,
            padding: spacing[8],
            marginBottom: spacing[6],
          }}
        >
          <h2
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing[4],
            }}
          >
            Biography
          </h2>
          <div
            style={{
              fontSize: typography.fontSize.base,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
              whiteSpace: 'pre-wrap',
            }}
          >
            {penName.bio}
          </div>
        </div>
      )}

      {/* Books Section - Placeholder */}
      <div
        style={{
          background: colors.background.surface,
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.lg,
          padding: spacing[8],
        }}
      >
        <h2
          style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[4],
          }}
        >
          Books
        </h2>
        {penName.book_count === 0 ? (
          <p style={{ color: colors.text.tertiary, textAlign: 'center', padding: spacing[8] }}>
            No books yet. Books assigned to this pen name will appear here.
          </p>
        ) : (
          <p style={{ color: colors.text.tertiary, textAlign: 'center', padding: spacing[8] }}>
            Book list integration coming soon.
          </p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: colors.background.overlay,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              background: colors.background.surface,
              borderRadius: borderRadius.xl,
              padding: spacing[8],
              maxWidth: '500px',
              width: '90%',
              boxShadow: shadows.xl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                marginBottom: spacing[4],
              }}
            >
              Delete Pen Name?
            </h3>
            <p
              style={{
                fontSize: typography.fontSize.base,
                color: colors.text.secondary,
                marginBottom: spacing[6],
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              Are you sure you want to delete "{penName.pen_name}"? This action cannot be undone. Books assigned to this pen name will not be deleted.
            </p>
            <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
                style={{
                  padding: `${spacing[3]} ${spacing[5]}`,
                  background: colors.background.surface,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: borderRadius.md,
                  color: colors.text.primary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                style={{
                  padding: `${spacing[3]} ${spacing[5]}`,
                  background: colors.semantic.error,
                  border: 'none',
                  borderRadius: borderRadius.md,
                  color: colors.text.inverse,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: deleteMutation.isPending ? 0.7 : 1,
                }}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Pen Name'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
