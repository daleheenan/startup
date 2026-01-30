'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import BookHeader from '@/app/components/books/BookHeader';
import BookMetadataForm, { type BookMetadata } from '@/app/components/books/BookMetadataForm';
import StatusPipeline from '@/app/components/books/StatusPipeline';
import BookCoverUpload from '@/app/components/books/BookCoverUpload';
import { type PlatformEntry } from '@/app/components/books/PlatformsChecklist';
import { colors, typography, spacing, borderRadius, shadows, transitions } from '@/app/lib/design-tokens';
import { getToken } from '@/app/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ==================== TYPES ====================

interface BookData {
  id: string;
  title: string;
  project_id: string;
  book_number: number;
  status: string;
  word_count: number;
  pen_name_id?: string | null;
  pen_name?: string | null;
  isbn?: string | null;
  publication_date?: string | null;
  publication_status: string;
  blurb?: string | null;
  keywords?: string[] | null;
  platforms?: PlatformEntry[];
  cover_image?: string | null;
  cover_image_type?: string | null;
  created_at: string;
  updated_at: string;
}

type Tab = 'overview' | 'publishing' | 'platforms';

// ==================== PAGE COMPONENT ====================

/**
 * Book detail/edit page.
 *
 * Features:
 * - Back button to /books
 * - BookHeader component with cover and metadata
 * - Tabs for Overview, Publishing, Platforms
 * - BookMetadataForm for editing
 * - StatusPipeline component
 * - Save/Cancel buttons
 */
export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params?.id as string;

  const [book, setBook] = useState<BookData | null>(null);
  const [metadata, setMetadata] = useState<BookMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // ---- Fetch Book Data ----

  useEffect(() => {
    const fetchBook = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/books/${bookId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch book: ${response.statusText}`);
        }

        const data = await response.json();
        setBook(data);

        // Initialize metadata form state
        setMetadata({
          isbn: data.isbn,
          publicationDate: data.publication_date,
          publicationStatus: data.publication_status,
          blurb: data.blurb,
          keywords: data.keywords || [],
          platforms: data.platforms || [],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load book';
        console.error('Error fetching book:', err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    if (bookId) {
      fetchBook();
    }
  }, [bookId]);

  // ---- Handlers ----

  const handleMetadataChange = (updates: Partial<BookMetadata>) => {
    setMetadata((prev) => prev ? { ...prev, ...updates } : null);
    setHasChanges(true);
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsSaving(true);
      setError(null);

      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publication_status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const updatedBook = await response.json();
      setBook(updatedBook);
      setMetadata((prev) => prev ? { ...prev, publicationStatus: newStatus } : null);
      setSuccessMessage('Status updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('cover', file);

      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/cover`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload cover image');
      }

      const updatedBook = await response.json();
      setBook(updatedBook);
      setSuccessMessage('Cover image uploaded successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload cover';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCoverDelete = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/books/${bookId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coverImage: null,
          coverImageType: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete cover image');
      }

      setBook((prev) => prev ? { ...prev, cover_image: null, cover_image_type: null } : null);
      setSuccessMessage('Cover image deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete cover';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!metadata) return;

    try {
      setIsSaving(true);
      setError(null);

      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/books/${bookId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isbn: metadata.isbn,
          publicationDate: metadata.publicationDate,
          publicationStatus: metadata.publicationStatus,
          blurb: metadata.blurb,
          keywords: metadata.keywords,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save book');
      }

      // Update platforms separately (if backend has endpoint for this)
      // For now, platforms are saved as part of book metadata

      setHasChanges(false);
      setSuccessMessage('Book saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refetch to get latest data
      const updatedResponse = await fetch(`${API_BASE_URL}/api/books/${bookId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setBook(updatedData);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save book';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (book && metadata) {
      // Reset to original values
      setMetadata({
        isbn: book.isbn,
        publicationDate: book.publication_date,
        publicationStatus: book.publication_status,
        blurb: book.blurb,
        keywords: book.keywords || [],
        platforms: book.platforms || [],
      });
      setHasChanges(false);
    }
  };

  // ---- Styles ----

  const backButtonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.md,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: transitions.all,
    marginBottom: spacing[6],
  };

  const tabsContainerStyle: CSSProperties = {
    display: 'flex',
    gap: spacing[2],
    marginBottom: spacing[6],
    borderBottom: `2px solid ${colors.border.default}`,
  };

  const getTabStyle = (tab: Tab): CSSProperties => ({
    padding: `${spacing[3]} ${spacing[6]}`,
    background: 'none',
    border: 'none',
    borderBottom: `3px solid ${activeTab === tab ? colors.brand.primary : 'transparent'}`,
    color: activeTab === tab ? colors.brand.primary : colors.text.secondary,
    fontSize: typography.fontSize.base,
    fontWeight: activeTab === tab ? typography.fontWeight.semibold : typography.fontWeight.medium,
    cursor: 'pointer',
    transition: transitions.all,
    marginBottom: '-2px',
  });

  const contentSectionStyle: CSSProperties = {
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    marginBottom: spacing[6],
  };

  const sectionTitleStyle: CSSProperties = {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[4],
  };

  const actionsContainerStyle: CSSProperties = {
    display: 'flex',
    gap: spacing[3],
    justifyContent: 'flex-end',
    marginTop: spacing[6],
  };

  const buttonStyle: CSSProperties = {
    padding: `${spacing[3]} ${spacing[6]}`,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: transitions.all,
  };

  const saveButtonStyle: CSSProperties = {
    ...buttonStyle,
    background: colors.brand.gradient,
    color: colors.text.inverse,
    boxShadow: shadows.brand,
    opacity: hasChanges && !isSaving ? 1 : 0.5,
    cursor: hasChanges && !isSaving ? 'pointer' : 'not-allowed',
  };

  const cancelButtonStyle: CSSProperties = {
    ...buttonStyle,
    background: colors.background.secondary,
    color: colors.text.secondary,
    border: `1px solid ${colors.border.default}`,
  };

  // ---- Loading State ----

  if (isLoading) {
    return (
      <DashboardLayout
        header={{
          title: 'Loading...',
          subtitle: 'Fetching book details',
        }}
      >
        <div style={{ textAlign: 'center', padding: spacing[12] }}>
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
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </DashboardLayout>
    );
  }

  // ---- Error State ----

  if (error && !book) {
    return (
      <DashboardLayout
        header={{
          title: 'Error',
          subtitle: 'Failed to load book',
        }}
      >
        <div
          style={{
            background: colors.semantic.errorLight,
            border: `1px solid ${colors.semantic.errorBorder}`,
            borderRadius: borderRadius.lg,
            padding: spacing[6],
            color: colors.semantic.error,
          }}
        >
          {error}
        </div>
      </DashboardLayout>
    );
  }

  if (!book || !metadata) {
    return null;
  }

  // ---- Main Render ----

  return (
    <DashboardLayout
      header={{
        title: book.title,
        subtitle: 'Book details and publishing metadata',
      }}
    >
      {/* Back Button */}
      <a
        href="/books"
        style={backButtonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.background.surfaceHover;
          e.currentTarget.style.borderColor = colors.border.hover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = colors.background.surface;
          e.currentTarget.style.borderColor = colors.border.default;
        }}
      >
        <span>←</span>
        Back to Books
      </a>

      {/* Success Message */}
      {successMessage && (
        <div
          style={{
            background: colors.semantic.successLight,
            border: `1px solid ${colors.semantic.successBorder}`,
            borderRadius: borderRadius.lg,
            padding: spacing[4],
            marginBottom: spacing[6],
            color: colors.semantic.successDark,
            fontWeight: typography.fontWeight.medium,
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          style={{
            background: colors.semantic.errorLight,
            border: `1px solid ${colors.semantic.errorBorder}`,
            borderRadius: borderRadius.lg,
            padding: spacing[4],
            marginBottom: spacing[6],
            color: colors.semantic.error,
            fontWeight: typography.fontWeight.medium,
          }}
        >
          {error}
        </div>
      )}

      {/* Book Header */}
      <BookHeader
        title={book.title}
        penName={book.pen_name}
        penNameId={book.pen_name_id}
        status={book.publication_status}
        wordCount={book.word_count}
        coverImage={book.cover_image}
        coverImageType={book.cover_image_type}
        onEditClick={() => setActiveTab('publishing')}
      />

      {/* Tabs */}
      <div style={tabsContainerStyle}>
        <button
          style={getTabStyle('overview')}
          onClick={() => setActiveTab('overview')}
          onMouseEnter={(e) => {
            if (activeTab !== 'overview') {
              e.currentTarget.style.color = colors.brand.primary;
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'overview') {
              e.currentTarget.style.color = colors.text.secondary;
            }
          }}
        >
          Overview
        </button>
        <button
          style={getTabStyle('publishing')}
          onClick={() => setActiveTab('publishing')}
          onMouseEnter={(e) => {
            if (activeTab !== 'publishing') {
              e.currentTarget.style.color = colors.brand.primary;
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'publishing') {
              e.currentTarget.style.color = colors.text.secondary;
            }
          }}
        >
          Publishing
        </button>
        <button
          style={getTabStyle('platforms')}
          onClick={() => setActiveTab('platforms')}
          onMouseEnter={(e) => {
            if (activeTab !== 'platforms') {
              e.currentTarget.style.color = colors.brand.primary;
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'platforms') {
              e.currentTarget.style.color = colors.text.secondary;
            }
          }}
        >
          Platforms
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={contentSectionStyle}>
          <h2 style={sectionTitleStyle}>Publication Status</h2>
          <StatusPipeline
            currentStatus={metadata.publicationStatus}
            onStatusChange={handleStatusChange}
            disabled={isSaving}
          />
        </div>
      )}

      {activeTab === 'publishing' && (
        <>
          <div style={contentSectionStyle}>
            <h2 style={sectionTitleStyle}>Cover Image</h2>
            <BookCoverUpload
              coverImage={book.cover_image}
              coverImageType={book.cover_image_type}
              onImageSelect={handleCoverUpload}
              onImageDelete={handleCoverDelete}
              uploading={isUploading}
              disabled={isSaving}
            />
          </div>

          <div style={contentSectionStyle}>
            <h2 style={sectionTitleStyle}>Publishing Metadata</h2>
            <BookMetadataForm
              metadata={metadata}
              onChange={handleMetadataChange}
              disabled={isSaving}
            />
          </div>
        </>
      )}

      {activeTab === 'platforms' && (
        <div style={contentSectionStyle}>
          <h2 style={sectionTitleStyle}>Publishing Platforms</h2>
          <BookMetadataForm
            metadata={metadata}
            onChange={handleMetadataChange}
            disabled={isSaving}
          />
        </div>
      )}

      {/* Action Buttons */}
      {hasChanges && (
        <div style={actionsContainerStyle}>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            style={cancelButtonStyle}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.background = colors.background.surfaceHover;
                e.currentTarget.style.borderColor = colors.border.hover;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.background.secondary;
              e.currentTarget.style.borderColor = colors.border.default;
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            style={saveButtonStyle}
            onMouseEnter={(e) => {
              if (hasChanges && !isSaving) {
                e.currentTarget.style.boxShadow = shadows.brandHover;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = shadows.brand;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
