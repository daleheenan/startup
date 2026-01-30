'use client';

import { type CSSProperties } from 'react';
import { colors, typography, spacing, borderRadius, transitions } from '@/app/lib/design-tokens';
import { PUBLISHING_PLATFORMS } from '@/app/lib/book-data';

// ==================== TYPES ====================

export interface PlatformEntry {
  platform: string;
  platformUrl?: string | null;
  status: 'active' | 'pending' | 'inactive';
}

export interface PlatformsChecklistProps {
  /** Current platforms configuration */
  platforms: PlatformEntry[];
  /** Callback when platforms change */
  onChange: (platforms: PlatformEntry[]) => void;
  /** Whether the checklist is disabled */
  disabled?: boolean;
}

// ==================== COMPONENT ====================

/**
 * PlatformsChecklist provides a checkbox list for managing publishing platforms.
 *
 * Features:
 * - Checkbox for each platform from PUBLISHING_PLATFORMS constant
 * - Optional URL input shown when platform is checked
 * - Active/inactive status tracking
 * - Validation for URLs
 */
export default function PlatformsChecklist({
  platforms,
  onChange,
  disabled = false,
}: PlatformsChecklistProps) {
  const handleTogglePlatform = (platformValue: string, checked: boolean) => {
    if (checked) {
      // Add platform
      onChange([
        ...platforms,
        {
          platform: platformValue,
          platformUrl: null,
          status: 'active',
        },
      ]);
    } else {
      // Remove platform
      onChange(platforms.filter(p => p.platform !== platformValue));
    }
  };

  const handleUpdateUrl = (platformValue: string, url: string) => {
    onChange(
      platforms.map(p =>
        p.platform === platformValue
          ? { ...p, platformUrl: url || null }
          : p
      )
    );
  };

  const isPlatformChecked = (platformValue: string) => {
    return platforms.some(p => p.platform === platformValue);
  };

  const getPlatformUrl = (platformValue: string): string => {
    const platform = platforms.find(p => p.platform === platformValue);
    return platform?.platformUrl || '';
  };

  // ---- Styles ----

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[3],
  };

  const platformItemStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[2],
    padding: spacing[3],
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.md,
    transition: transitions.colors,
  };

  const checkboxRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
  };

  const checkboxStyle: CSSProperties = {
    width: '18px',
    height: '18px',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  const labelStyle: CSSProperties = {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
  };

  const urlInputStyle: CSSProperties = {
    padding: `${spacing[2]} ${spacing[3]}`,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.base,
    color: colors.text.primary,
    transition: transitions.colors,
    outline: 'none',
    marginLeft: '34px', // Align with label text
  };

  const helpTextStyle: CSSProperties = {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginLeft: '34px', // Align with input
  };

  // ---- Render ----

  return (
    <div style={containerStyle}>
      {PUBLISHING_PLATFORMS.map((platform) => {
        const isChecked = isPlatformChecked(platform.value);
        const platformUrl = getPlatformUrl(platform.value);

        return (
          <div
            key={platform.value}
            style={{
              ...platformItemStyle,
              background: isChecked ? colors.background.surfaceHover : colors.background.surface,
            }}
          >
            <div style={checkboxRowStyle}>
              <input
                type="checkbox"
                id={`platform-${platform.value}`}
                checked={isChecked}
                onChange={(e) => handleTogglePlatform(platform.value, e.target.checked)}
                disabled={disabled}
                style={checkboxStyle}
              />
              <label htmlFor={`platform-${platform.value}`} style={labelStyle}>
                {platform.label}
              </label>
            </div>

            {isChecked && (
              <div>
                <input
                  type="url"
                  value={platformUrl}
                  onChange={(e) => handleUpdateUrl(platform.value, e.target.value)}
                  placeholder={`https://${platform.value}.com/your-book`}
                  disabled={disabled}
                  style={{
                    ...urlInputStyle,
                    opacity: disabled ? 0.6 : 1,
                    cursor: disabled ? 'not-allowed' : 'text',
                  }}
                  onFocus={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.borderColor = colors.border.focus;
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.border.default;
                  }}
                />
                <p style={helpTextStyle}>Optional: Add a direct link to your book on this platform</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
