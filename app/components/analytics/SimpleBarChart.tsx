'use client';

import { colors, typography, spacing, borderRadius, shadows } from '@/app/lib/design-tokens';

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: BarData[];
  title: string;
  horizontal?: boolean;
  valueLabel?: string;
}

export function SimpleBarChart({ data, title, horizontal = false, valueLabel = '' }: SimpleBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          padding: spacing[6],
          backgroundColor: colors.background.surface,
          borderRadius: borderRadius.lg,
          border: `1px solid ${colors.border.default}`,
          boxShadow: shadows.sm,
        }}
      >
        <h3
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[4],
          }}
        >
          {title}
        </h3>
        <p style={{ color: colors.text.secondary, textAlign: 'center', padding: spacing[8] }}>
          No data available
        </p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));

  if (horizontal) {
    return (
      <div
        style={{
          padding: spacing[6],
          backgroundColor: colors.background.surface,
          borderRadius: borderRadius.lg,
          border: `1px solid ${colors.border.default}`,
          boxShadow: shadows.sm,
        }}
      >
        <h3
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[6],
          }}
        >
          {title}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {data.map((item, index) => {
            const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            const barColor = item.color || colors.brand.primary;

            return (
              <div key={index}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing[2],
                  }}
                >
                  <span
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.secondary,
                    }}
                  >
                    {item.value.toLocaleString()} {valueLabel}
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '28px',
                    backgroundColor: colors.background.surfaceHover,
                    borderRadius: borderRadius.sm,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${percentage}%`,
                      height: '100%',
                      backgroundColor: barColor,
                      transition: 'width 0.3s ease',
                      borderRadius: borderRadius.sm,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical bar chart
  return (
    <div
      style={{
        padding: spacing[6],
        backgroundColor: colors.background.surface,
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.border.default}`,
        boxShadow: shadows.sm,
      }}
    >
      <h3
        style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          marginBottom: spacing[6],
        }}
      >
        {title}
      </h3>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          gap: spacing[2],
          height: '300px',
        }}
      >
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const barColor = item.color || colors.brand.primary;

          return (
            <div
              key={index}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: spacing[2],
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.secondary,
                  textAlign: 'center',
                }}
              >
                {item.value.toLocaleString()}
              </div>
              <div
                style={{
                  width: '100%',
                  maxWidth: '80px',
                  height: `${percentage}%`,
                  minHeight: percentage > 0 ? '20px' : '0',
                  backgroundColor: barColor,
                  borderRadius: `${borderRadius.sm} ${borderRadius.sm} 0 0`,
                  transition: 'height 0.3s ease',
                }}
              />
              <div
                style={{
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.primary,
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
