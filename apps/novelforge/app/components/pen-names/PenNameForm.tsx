'use client';

import { useState, useEffect } from 'react';
import { colors, borderRadius, spacing, typography, shadows } from '@/app/lib/design-tokens';
import SocialMediaEditor from './SocialMediaEditor';
import type { PenName, CreatePenNameData, UpdatePenNameData } from '@/app/hooks/usePenNames';

interface PenNameFormProps {
  mode: 'create' | 'edit';
  initialData?: PenName;
  onSubmit: (data: CreatePenNameData | UpdatePenNameData) => Promise<void>;
  isSubmitting?: boolean;
}

const MAX_GENRES = 5;
const BIO_SHORT_MAX_WORDS = 50;

const AVAILABLE_GENRES = [
  'Fantasy',
  'Science Fiction',
  'Romance',
  'Mystery',
  'Thriller',
  'Horror',
  'Literary Fiction',
  'Historical Fiction',
  'Contemporary Fiction',
  'Young Adult',
  'Urban Fantasy',
  'Paranormal Romance',
  'Cosy Mystery',
  'Grimdark',
  'Romantasy',
];

/**
 * Count words in a text string
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function PenNameForm({ mode, initialData, onSubmit, isSubmitting = false }: PenNameFormProps) {
  const [formData, setFormData] = useState<CreatePenNameData>({
    pen_name: initialData?.pen_name || '',
    display_name: initialData?.display_name || '',
    bio: initialData?.bio || '',
    bio_short: initialData?.bio_short || '',
    website: initialData?.website || '',
    social_media: initialData?.social_media || {},
    genres: initialData?.genres || [],
    photo_url: initialData?.photo_url || '',
    is_public: initialData?.is_public ?? true,
    is_default: initialData?.is_default ?? false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bioShortWordCount, setBioShortWordCount] = useState(0);

  useEffect(() => {
    if (formData.bio_short) {
      setBioShortWordCount(countWords(formData.bio_short));
    } else {
      setBioShortWordCount(0);
    }
  }, [formData.bio_short]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Pen name is required
    if (!formData.pen_name?.trim()) {
      newErrors.pen_name = 'Pen name is required';
    }

    // Website URL validation
    if (formData.website && formData.website.trim()) {
      try {
        new URL(formData.website);
      } catch {
        newErrors.website = 'Please enter a valid URL (including https://)';
      }
    }

    // Bio short word count
    if (formData.bio_short && countWords(formData.bio_short) > BIO_SHORT_MAX_WORDS) {
      newErrors.bio_short = `Bio short must be ${BIO_SHORT_MAX_WORDS} words or fewer`;
    }

    // Genre limit
    if (formData.genres && formData.genres.length > MAX_GENRES) {
      newErrors.genres = `Select up to ${MAX_GENRES} genres`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit(formData);
  };

  const toggleGenre = (genre: string) => {
    const currentGenres = formData.genres || [];
    const isSelected = currentGenres.includes(genre);

    if (isSelected) {
      setFormData({
        ...formData,
        genres: currentGenres.filter(g => g !== genre),
      });
    } else if (currentGenres.length < MAX_GENRES) {
      setFormData({
        ...formData,
        genres: [...currentGenres, genre],
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
      {/* Pen Name */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        <label htmlFor="pen_name" style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
        }}>
          Pen Name <span style={{ color: colors.semantic.error }}>*</span>
        </label>
        <input
          id="pen_name"
          type="text"
          value={formData.pen_name}
          onChange={(e) => setFormData({ ...formData, pen_name: e.target.value })}
          style={{
            padding: `${spacing[3]} ${spacing[4]}`,
            border: `1px solid ${errors.pen_name ? colors.semantic.errorBorder : colors.border.default}`,
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.base,
            color: colors.text.primary,
            background: colors.background.surface,
          }}
          disabled={isSubmitting}
        />
        {errors.pen_name && (
          <span style={{ fontSize: typography.fontSize.sm, color: colors.semantic.error }}>
            {errors.pen_name}
          </span>
        )}
      </div>

      {/* Display Name */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        <label htmlFor="display_name" style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
        }}>
          Display Name
        </label>
        <input
          id="display_name"
          type="text"
          value={formData.display_name}
          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
          placeholder="Optional alternative name for display"
          style={{
            padding: `${spacing[3]} ${spacing[4]}`,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.base,
            color: colors.text.primary,
            background: colors.background.surface,
          }}
          disabled={isSubmitting}
        />
      </div>

      {/* Bio */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        <label htmlFor="bio" style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
        }}>
          Biography
        </label>
        <textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder="Full biography (supports Markdown)"
          rows={6}
          style={{
            padding: `${spacing[3]} ${spacing[4]}`,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.base,
            color: colors.text.primary,
            background: colors.background.surface,
            fontFamily: typography.fontFamily.base,
            resize: 'vertical',
          }}
          disabled={isSubmitting}
        />
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
          Supports Markdown formatting
        </span>
      </div>

      {/* Bio Short */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        <label htmlFor="bio_short" style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
        }}>
          Short Biography
        </label>
        <textarea
          id="bio_short"
          value={formData.bio_short}
          onChange={(e) => setFormData({ ...formData, bio_short: e.target.value })}
          placeholder={`Brief bio for book descriptions (max ${BIO_SHORT_MAX_WORDS} words)`}
          rows={3}
          style={{
            padding: `${spacing[3]} ${spacing[4]}`,
            border: `1px solid ${errors.bio_short ? colors.semantic.errorBorder : colors.border.default}`,
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.base,
            color: colors.text.primary,
            background: colors.background.surface,
            fontFamily: typography.fontFamily.base,
            resize: 'vertical',
          }}
          disabled={isSubmitting}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: typography.fontSize.xs,
            color: errors.bio_short ? colors.semantic.error : colors.text.tertiary,
          }}>
            {errors.bio_short || `${bioShortWordCount} / ${BIO_SHORT_MAX_WORDS} words`}
          </span>
        </div>
      </div>

      {/* Website */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        <label htmlFor="website" style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
        }}>
          Website
        </label>
        <input
          id="website"
          type="url"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder="https://example.com"
          style={{
            padding: `${spacing[3]} ${spacing[4]}`,
            border: `1px solid ${errors.website ? colors.semantic.errorBorder : colors.border.default}`,
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.base,
            color: colors.text.primary,
            background: colors.background.surface,
          }}
          disabled={isSubmitting}
        />
        {errors.website && (
          <span style={{ fontSize: typography.fontSize.sm, color: colors.semantic.error }}>
            {errors.website}
          </span>
        )}
      </div>

      {/* Social Media */}
      <SocialMediaEditor
        value={formData.social_media || {}}
        onChange={(social_media) => setFormData({ ...formData, social_media })}
      />

      {/* Genres */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        <label style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
        }}>
          Genres (select up to {MAX_GENRES})
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2] }}>
          {AVAILABLE_GENRES.map((genre) => {
            const isSelected = (formData.genres || []).includes(genre);
            const isDisabled = !isSelected && (formData.genres?.length || 0) >= MAX_GENRES;

            return (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                disabled={isDisabled || isSubmitting}
                style={{
                  padding: `${spacing[2]} ${spacing[4]}`,
                  border: `1px solid ${isSelected ? colors.brand.primary : colors.border.default}`,
                  borderRadius: borderRadius.full,
                  background: isSelected ? colors.brand.primaryLight : colors.background.surface,
                  color: isSelected ? colors.brand.primary : colors.text.secondary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: isSelected ? typography.fontWeight.semibold : typography.fontWeight.normal,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {isSelected && '✓ '}
                {genre}
              </button>
            );
          })}
        </div>
        {errors.genres && (
          <span style={{ fontSize: typography.fontSize.sm, color: colors.semantic.error }}>
            {errors.genres}
          </span>
        )}
      </div>

      {/* Photo URL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        <label htmlFor="photo_url" style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
        }}>
          Photo URL
        </label>
        <input
          id="photo_url"
          type="url"
          value={formData.photo_url}
          onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
          placeholder="https://example.com/photo.jpg"
          style={{
            padding: `${spacing[3]} ${spacing[4]}`,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.base,
            color: colors.text.primary,
            background: colors.background.surface,
          }}
          disabled={isSubmitting}
        />
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
          Optional: URL to author photo
        </span>
      </div>

      {/* Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
        {/* Public Toggle */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[3],
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={formData.is_public}
            onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
            disabled={isSubmitting}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.primary,
            }}>
              Public Profile
            </span>
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>
              Display this pen name on public author pages
            </span>
          </div>
        </label>

        {/* Default Toggle */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[3],
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={formData.is_default}
            onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
            disabled={isSubmitting}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.primary,
            }}>
              Default Pen Name
            </span>
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>
              Use this as the default pen name for new books
            </span>
          </div>
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          padding: `${spacing[3]} ${spacing[6]}`,
          background: isSubmitting ? colors.text.disabled : colors.brand.gradient,
          border: 'none',
          borderRadius: borderRadius.md,
          color: colors.text.inverse,
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          boxShadow: isSubmitting ? 'none' : shadows.brand,
          transition: 'all 0.2s',
          opacity: isSubmitting ? 0.7 : 1,
        }}
      >
        {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Pen Name' : 'Update Pen Name'}
      </button>
    </form>
  );
}
