'use client';

import { useState, useEffect } from 'react';
import { colors, gradients, borderRadius, shadows } from '../lib/constants';
import type { TimePeriodType, TimePeriod } from '../../shared/types';

// Time period presets with their configurations
const TIME_PERIOD_PRESETS: Array<{
  type: TimePeriodType;
  label: string;
  description: string;
  yearOffset?: number;
  emoji: string;
}> = [
  {
    type: 'past',
    label: '500 Years Ago',
    description: 'A distant past with medieval or renaissance elements',
    yearOffset: -500,
    emoji: '\u{1F3F0}', // castle
  },
  {
    type: 'present',
    label: 'Modern Day',
    description: 'Contemporary setting with current technology and culture',
    yearOffset: 0,
    emoji: '\u{1F4F1}', // phone
  },
  {
    type: 'future',
    label: '500 Years Ahead',
    description: 'A future with advanced technology and transformed society',
    yearOffset: 500,
    emoji: '\u{1F680}', // rocket
  },
  {
    type: 'unknown',
    label: 'Unknown/Distant',
    description: 'An unspecified or impossibly distant time period',
    emoji: '\u{2728}', // sparkles
  },
  {
    type: 'custom',
    label: 'Custom Year',
    description: 'Specify an exact year for your story',
    emoji: '\u{1F4C5}', // calendar
  },
];

export interface TimePeriodSelectorProps {
  value: TimePeriod;
  onChange: (value: TimePeriod) => void;
  disabled?: boolean;
  compact?: boolean;  // For quick mode - shows simplified version
}

/**
 * TimePeriodSelector - A reusable component for selecting story time periods
 *
 * Provides preset options:
 * - 500 years in the past
 * - Modern day (present) - default
 * - 500 years in the future
 * - Unknown/distant future
 * - Custom year (shows year input)
 */
export function TimePeriodSelector({
  value,
  onChange,
  disabled = false,
  compact = false,
}: TimePeriodSelectorProps) {
  const [showCustomInput, setShowCustomInput] = useState(value.type === 'custom');
  const currentYear = new Date().getFullYear();

  // Handle type change
  const handleTypeSelect = (type: TimePeriodType) => {
    if (disabled) return;

    const preset = TIME_PERIOD_PRESETS.find(p => p.type === type);
    let year: number | undefined;
    let description: string | undefined;

    if (type === 'custom') {
      setShowCustomInput(true);
      year = value.year || currentYear;
      description = `Year ${year}`;
    } else {
      setShowCustomInput(false);
      if (preset?.yearOffset !== undefined) {
        year = currentYear + preset.yearOffset;
      }
      description = preset?.description;
    }

    onChange({
      type,
      year,
      description,
    });
  };

  // Handle custom year change
  const handleYearChange = (yearStr: string) => {
    const year = parseInt(yearStr, 10);
    if (!isNaN(year)) {
      onChange({
        type: 'custom',
        year,
        description: `Year ${year}`,
      });
    }
  };

  // Get era description based on year
  const getEraContext = (year: number): string => {
    const diff = year - currentYear;
    if (diff < -1000) return 'Ancient era';
    if (diff < -500) return 'Medieval era';
    if (diff < -100) return 'Historical era';
    if (diff < -50) return 'Early modern era';
    if (diff < 0) return 'Recent past';
    if (diff === 0) return 'Present day';
    if (diff < 50) return 'Near future';
    if (diff < 100) return 'Mid-future';
    if (diff < 500) return 'Far future';
    return 'Distant future';
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: compact ? '0.75rem' : '1rem',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.text,
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const optionalText: React.CSSProperties = {
    fontWeight: 400,
    color: colors.textSecondary,
    fontSize: '0.813rem',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: compact
      ? 'repeat(5, 1fr)'
      : 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: compact ? '0.5rem' : '0.75rem',
  };

  const getButtonStyle = (isSelected: boolean): React.CSSProperties => ({
    padding: compact ? '0.75rem 0.5rem' : '1rem 0.75rem',
    background: isSelected
      ? gradients.brand
      : colors.surface,
    border: isSelected
      ? `2px solid ${colors.brandStart}`
      : `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    color: isSelected ? '#FFFFFF' : colors.text,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s ease',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  });

  const emojiStyle: React.CSSProperties = {
    fontSize: compact ? '1.25rem' : '1.5rem',
    lineHeight: 1,
  };

  const buttonLabelStyle: React.CSSProperties = {
    fontSize: compact ? '0.75rem' : '0.813rem',
    fontWeight: 500,
    lineHeight: 1.2,
  };

  const customInputContainerStyle: React.CSSProperties = {
    marginTop: '0.75rem',
    padding: '1rem',
    background: colors.surfaceHover,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
  };

  const inputStyle: React.CSSProperties = {
    width: '120px',
    padding: '0.625rem 0.75rem',
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    color: colors.text,
    fontSize: '1rem',
    fontWeight: 500,
    textAlign: 'center',
  };

  const helpTextStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: colors.textSecondary,
    marginTop: '0.5rem',
    textAlign: 'center',
  };

  return (
    <div style={containerStyle}>
      {!compact && (
        <label style={labelStyle}>
          Story Time Period
          <span style={optionalText}>(Optional)</span>
        </label>
      )}

      <div style={gridStyle}>
        {TIME_PERIOD_PRESETS.map((preset) => (
          <button
            key={preset.type}
            type="button"
            onClick={() => handleTypeSelect(preset.type)}
            disabled={disabled}
            style={getButtonStyle(value.type === preset.type)}
            title={preset.description}
          >
            <span style={emojiStyle}>{preset.emoji}</span>
            <span style={buttonLabelStyle}>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Custom year input */}
      {(showCustomInput || value.type === 'custom') && (
        <div style={customInputContainerStyle}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <label
              htmlFor="custom-year-input"
              style={{
                fontSize: '0.875rem',
                color: colors.textSecondary,
                fontWeight: 500,
              }}
            >
              Year:
            </label>
            <input
              id="custom-year-input"
              type="number"
              value={value.year || currentYear}
              onChange={(e) => handleYearChange(e.target.value)}
              disabled={disabled}
              style={inputStyle}
              min={-10000}
              max={100000}
              step={1}
            />
            {value.year && (
              <span style={{
                fontSize: '0.813rem',
                color: colors.brandText,
                fontWeight: 500,
                background: colors.brandLight,
                padding: '0.25rem 0.75rem',
                borderRadius: borderRadius.sm,
              }}>
                {getEraContext(value.year)}
              </span>
            )}
          </div>
          <div style={helpTextStyle}>
            Use negative years for BCE (e.g., -500 for 500 BCE)
          </div>
        </div>
      )}

      {/* Description display for non-compact mode */}
      {!compact && value.type !== 'custom' && (
        <div style={{
          fontSize: '0.813rem',
          color: colors.textSecondary,
          marginTop: '0.25rem',
        }}>
          {TIME_PERIOD_PRESETS.find(p => p.type === value.type)?.description}
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to convert TimePeriod to a human-readable timeframe string
 * for use in prompts and story generation
 */
export function getTimeframeDescription(timePeriod: TimePeriod): string {
  const currentYear = new Date().getFullYear();

  switch (timePeriod.type) {
    case 'past':
      return `Historical setting, approximately ${currentYear - 500} CE (500 years in the past)`;
    case 'present':
      return `Contemporary/Modern day setting (${currentYear})`;
    case 'future':
      return `Futuristic setting, approximately year ${currentYear + 500} (500 years in the future)`;
    case 'unknown':
      return 'An undefined or impossibly distant time period - could be far future, alternate timeline, or timeless setting';
    case 'custom':
      if (timePeriod.year !== undefined) {
        if (timePeriod.year < 0) {
          return `Ancient setting, ${Math.abs(timePeriod.year)} BCE`;
        }
        const diff = timePeriod.year - currentYear;
        if (diff < -100) {
          return `Historical setting, year ${timePeriod.year}`;
        } else if (diff < 0) {
          return `Recent past setting, year ${timePeriod.year}`;
        } else if (diff === 0) {
          return `Present day setting, year ${timePeriod.year}`;
        } else if (diff < 100) {
          return `Near future setting, year ${timePeriod.year}`;
        } else {
          return `Far future setting, year ${timePeriod.year}`;
        }
      }
      return 'Custom time period';
    default:
      return 'Unspecified time period';
  }
}

/**
 * Get technology level description based on time period
 */
export function getTechnologyContext(timePeriod: TimePeriod): string {
  const currentYear = new Date().getFullYear();
  const year = timePeriod.year ?? (timePeriod.type === 'present' ? currentYear :
    timePeriod.type === 'past' ? currentYear - 500 :
    timePeriod.type === 'future' ? currentYear + 500 : undefined);

  if (year === undefined) {
    return 'Technology level is undefined - could range from primitive to impossibly advanced';
  }

  if (year < 0) return 'Ancient technology: hand tools, basic metallurgy, animal power';
  if (year < 500) return 'Classical era technology: roads, aqueducts, early engineering';
  if (year < 1500) return 'Medieval technology: castles, windmills, early firearms';
  if (year < 1800) return 'Pre-industrial technology: sailing ships, printing press, early science';
  if (year < 1900) return 'Industrial revolution: steam power, telegraphs, early factories';
  if (year < 1950) return 'Early modern: automobiles, radio, early aviation';
  if (year < 2000) return 'Modern: computers, television, space exploration';
  if (year < 2030) return 'Contemporary: smartphones, internet, AI emergence';
  if (year < 2100) return 'Near future: advanced AI, renewable energy, early space colonization';
  if (year < 2500) return 'Advanced future: potential FTL travel, terraforming, transhumanism';
  return 'Far future: technology beyond current imagination';
}

export default TimePeriodSelector;
