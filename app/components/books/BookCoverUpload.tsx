'use client';

import { useState, useRef, type CSSProperties, type ChangeEvent, type DragEvent } from 'react';
import { colors, typography, spacing, borderRadius, transitions } from '@/app/lib/design-tokens';

// ==================== TYPES ====================

export interface BookCoverUploadProps {
  /** Current cover image URL or base64 string */
  coverImage?: string | null;
  /** MIME type of the cover image */
  coverImageType?: string | null;
  /** Callback when a new image is selected */
  onImageSelect: (file: File) => void;
  /** Callback when image is deleted */
  onImageDelete?: () => void;
  /** Whether the upload is disabled */
  disabled?: boolean;
  /** Show upload progress */
  uploading?: boolean;
}

// ==================== COMPONENT ====================

/**
 * BookCoverUpload provides a drag-and-drop or click-to-upload interface for book covers.
 *
 * Features:
 * - 6:9 aspect ratio preview area (standard book cover)
 * - Click to upload or drag-drop
 * - Delete button if image exists
 * - Placeholder when empty
 * - File type validation (JPEG, PNG, WebP)
 * - Size validation (max 5MB)
 */
export default function BookCoverUpload({
  coverImage,
  coverImageType,
  onImageSelect,
  onImageDelete,
  disabled = false,
  uploading = false,
}: BookCoverUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Invalid file type. Please upload a JPEG, PNG, or WebP image.';
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File too large. Maximum size is 5MB.';
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onImageSelect(file);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onImageDelete) {
      onImageDelete();
      setError(null);
    }
  };

  // Build image source
  const imageSource = coverImage
    ? coverImage.startsWith('data:')
      ? coverImage
      : `data:${coverImageType || 'image/jpeg'};base64,${coverImage}`
    : null;

  // ---- Styles ----

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '300px',
    aspectRatio: '2/3', // 6:9 ratio (standard book cover)
    border: `2px dashed ${isDragging ? colors.brand.primary : colors.border.default}`,
    borderRadius: borderRadius.lg,
    background: isDragging
      ? colors.brand.primaryLight
      : imageSource
      ? colors.background.surface
      : colors.background.secondary,
    cursor: disabled || uploading ? 'not-allowed' : 'pointer',
    transition: transitions.all,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const placeholderStyle: CSSProperties = {
    textAlign: 'center',
    padding: spacing[6],
    color: colors.text.tertiary,
  };

  const imageStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const deleteButtonStyle: CSSProperties = {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    padding: `${spacing[1]} ${spacing[2]}`,
    background: colors.semantic.error,
    border: 'none',
    borderRadius: borderRadius.sm,
    color: colors.text.inverse,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: transitions.all,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  };

  const errorStyle: CSSProperties = {
    marginTop: spacing[2],
    fontSize: typography.fontSize.sm,
    color: colors.semantic.error,
  };

  const helpTextStyle: CSSProperties = {
    marginTop: spacing[2],
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  };

  // ---- Render ----

  return (
    <div>
      <div
        style={containerStyle}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onMouseEnter={(e) => {
          if (!disabled && !uploading) {
            e.currentTarget.style.borderColor = colors.brand.primary;
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.borderColor = colors.border.default;
          }
        }}
      >
        {uploading ? (
          <div style={placeholderStyle}>
            <div
              style={{
                display: 'inline-block',
                width: '32px',
                height: '32px',
                border: `3px solid ${colors.border.default}`,
                borderTopColor: colors.brand.primary,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ marginTop: spacing[3], fontSize: typography.fontSize.sm }}>
              Uploading...
            </p>
          </div>
        ) : imageSource ? (
          <>
            <img src={imageSource} alt="Book cover" style={imageStyle} />
            {onImageDelete && !disabled && (
              <button
                onClick={handleDelete}
                style={deleteButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.semantic.errorDark;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.semantic.error;
                }}
                aria-label="Delete cover image"
              >
                Delete
              </button>
            )}
          </>
        ) : (
          <div style={placeholderStyle}>
            <div
              style={{
                fontSize: '3rem',
                marginBottom: spacing[3],
              }}
              aria-hidden="true"
            >
              📚
            </div>
            <p
              style={{
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.secondary,
                marginBottom: spacing[2],
              }}
            >
              {isDragging ? 'Drop image here' : 'Click or drag to upload'}
            </p>
            <p style={{ fontSize: typography.fontSize.sm }}>
              6:9 aspect ratio recommended
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInputChange}
          disabled={disabled || uploading}
          style={{ display: 'none' }}
          aria-label="Upload book cover"
        />
      </div>

      {error && <p style={errorStyle}>{error}</p>}

      {!error && !uploading && (
        <p style={helpTextStyle}>
          Supported formats: JPEG, PNG, WebP (max 5MB)
        </p>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
