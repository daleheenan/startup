'use client';

import { useState, useRef, useEffect } from 'react';
import { getToken } from '../lib/auth';
import { colors, borderRadius } from '../lib/constants';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CoverImageUploadProps {
  projectId: string;
  onImageChange?: (hasImage: boolean) => void;
}

export default function CoverImageUpload({ projectId, onImageChange }: CoverImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing cover image on mount
  useEffect(() => {
    const fetchCoverImage = async () => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/cover-image`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setImageUrl(data.dataUrl);
          onImageChange?.(true);
        } else if (response.status !== 404) {
          // 404 just means no image, which is fine
          throw new Error('Failed to fetch cover image');
        }
      } catch (err) {
        // Don't show error for missing image
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoverImage();
  }, [projectId, onImageChange]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image is too large. Maximum size is 5MB.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1];
        if (!base64) {
          setError('Failed to read image file');
          setIsUploading(false);
          return;
        }

        // Upload to server
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/cover-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64,
            imageType: file.type,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || 'Failed to upload image');
        }

        // Update local state with preview
        setImageUrl(`data:${file.type};base64,${base64}`);
        onImageChange?.(true);
        setIsUploading(false);
      };

      reader.onerror = () => {
        setError('Failed to read image file');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!window.confirm('Are you sure you want to remove the cover image?')) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/cover-image`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to remove image');
      }

      setImageUrl(null);
      onImageChange?.(false);
    } catch (err: any) {
      setError(err.message || 'Failed to remove image');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        width: '160px',
        height: '240px',
        background: colors.background,
        borderRadius: borderRadius.md,
        border: `2px dashed ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ color: colors.textSecondary, fontSize: '0.875rem' }}>Loading...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <label style={{
        fontSize: '0.75rem',
        color: colors.textSecondary,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Cover Image
      </label>

      {imageUrl ? (
        // Image preview
        <div style={{ position: 'relative', width: 'fit-content' }}>
          <img
            src={imageUrl}
            alt="Book cover"
            style={{
              width: '160px',
              height: '240px',
              objectFit: 'cover',
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '0.5rem',
            left: '0.5rem',
            right: '0.5rem',
            display: 'flex',
            gap: '0.5rem',
          }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                flex: 1,
                padding: '0.375rem',
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: borderRadius.sm,
                color: colors.brandText,
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: isUploading ? 'not-allowed' : 'pointer',
              }}
            >
              Change
            </button>
            <button
              onClick={handleRemoveImage}
              disabled={isUploading}
              style={{
                flex: 1,
                padding: '0.375rem',
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: borderRadius.sm,
                color: colors.error,
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: isUploading ? 'not-allowed' : 'pointer',
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        // Upload placeholder
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{
            width: '160px',
            height: '240px',
            background: colors.background,
            borderRadius: borderRadius.md,
            border: `2px dashed ${colors.brandBorder}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: '2rem' }}>📷</span>
          <span style={{
            color: colors.brandText,
            fontSize: '0.8125rem',
            fontWeight: 500,
            textAlign: 'center',
            padding: '0 0.5rem',
          }}>
            {isUploading ? 'Uploading...' : 'Click to upload cover image'}
          </span>
          <span style={{
            color: colors.textSecondary,
            fontSize: '0.6875rem',
          }}>
            JPEG, PNG, GIF, WebP (max 5MB)
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {error && (
        <p style={{
          color: colors.error,
          fontSize: '0.75rem',
          margin: 0,
          maxWidth: '160px',
        }}>
          {error}
        </p>
      )}

      <p style={{
        fontSize: '0.6875rem',
        color: colors.textSecondary,
        margin: 0,
        maxWidth: '160px',
      }}>
        This image will be used as the front cover in exported books (EPUB, PDF)
      </p>
    </div>
  );
}
