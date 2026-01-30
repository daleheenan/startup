'use client';

import { colors, borderRadius, spacing, typography } from '@/app/lib/design-tokens';

interface SocialMediaEditorProps {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}

const PLATFORMS = [
  { key: 'twitter', label: 'Twitter/X', icon: '𝕏', placeholder: '@username or URL' },
  { key: 'instagram', label: 'Instagram', icon: '📷', placeholder: '@username or URL' },
  { key: 'facebook', label: 'Facebook', icon: 'f', placeholder: 'username or URL' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵', placeholder: '@username or URL' },
  { key: 'goodreads', label: 'Goodreads', icon: '📚', placeholder: 'Profile URL' },
];

/**
 * Normalises a social media input to just the handle/username
 * Handles full URLs, @mentions, or plain usernames
 */
function normaliseHandle(input: string, platform: string): string {
  if (!input.trim()) return '';

  let value = input.trim();

  // Handle URLs
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const url = new URL(value);
      // Extract the username from the path
      const pathParts = url.pathname.split('/').filter(p => p);
      if (pathParts.length > 0) {
        value = pathParts[pathParts.length - 1];
      }
    } catch (e) {
      // Invalid URL, just use the value as-is
    }
  }

  // Remove @ prefix if present
  if (value.startsWith('@')) {
    value = value.substring(1);
  }

  return value;
}

export default function SocialMediaEditor({ value, onChange }: SocialMediaEditorProps) {
  const handleChange = (platform: string, input: string) => {
    const normalised = normaliseHandle(input, platform);
    const newValue = { ...value };

    if (normalised) {
      newValue[platform] = normalised;
    } else {
      delete newValue[platform];
    }

    onChange(newValue);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
      <label style={{
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.secondary,
      }}>
        Social Media Links
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {PLATFORMS.map((platform) => (
          <div
            key={platform.key}
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr',
              alignItems: 'center',
              gap: spacing[3],
            }}
          >
            {/* Platform Label */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
            }}>
              <span style={{ fontSize: typography.fontSize.lg }}>{platform.icon}</span>
              <span>{platform.label}</span>
            </div>

            {/* Input */}
            <input
              type="text"
              value={value[platform.key] || ''}
              onChange={(e) => handleChange(platform.key, e.target.value)}
              placeholder={platform.placeholder}
              style={{
                padding: `${spacing[2]} ${spacing[3]}`,
                border: `1px solid ${colors.border.default}`,
                borderRadius: borderRadius.md,
                fontSize: typography.fontSize.sm,
                color: colors.text.primary,
                background: colors.background.surface,
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = colors.border.focus;
                e.target.style.outline = 'none';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.border.default;
              }}
            />
          </div>
        ))}
      </div>

      <p style={{
        fontSize: typography.fontSize.xs,
        color: colors.text.tertiary,
        margin: 0,
      }}>
        Enter username, handle, or full URL. We'll normalise it automatically.
      </p>
    </div>
  );
}
