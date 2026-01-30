'use client';

import { colors, typography, spacing, borderRadius, shadows } from '@/app/lib/design-tokens';

interface DonutData {
  label: string;
  value: number;
  color: string;
}

interface SimpleDonutChartProps {
  data: DonutData[];
  title: string;
}

export function SimpleDonutChart({ data, title }: SimpleDonutChartProps) {
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

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Calculate percentages and SVG segments
  let currentAngle = -90; // Start at top
  const segments = data.map(item => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
    };
  });

  // SVG arc path helper
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    ].join(' ');
  };

  const centerX = 100;
  const centerY = 100;
  const outerRadius = 80;
  const innerRadius = 50;

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
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[8] }}>
        {/* SVG Donut Chart */}
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          style={{ flexShrink: 0 }}
        >
          {segments.map((segment, index) => {
            if (segment.value === 0) return null;

            const outerPath = describeArc(centerX, centerY, outerRadius, segment.startAngle, segment.endAngle);
            const innerStart = polarToCartesian(centerX, centerY, innerRadius, segment.endAngle);
            const innerPath = describeArc(centerX, centerY, innerRadius, segment.endAngle, segment.startAngle);
            const outerEnd = polarToCartesian(centerX, centerY, outerRadius, segment.startAngle);

            const d = `${outerPath} L ${innerStart.x} ${innerStart.y} ${innerPath} L ${outerEnd.x} ${outerEnd.y} Z`;

            return (
              <path
                key={index}
                d={d}
                fill={segment.color}
                stroke={colors.background.surface}
                strokeWidth="2"
              />
            );
          })}

          {/* Center circle for donut effect */}
          <circle
            cx={centerX}
            cy={centerY}
            r={innerRadius - 2}
            fill={colors.background.surface}
          />

          {/* Total in center */}
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              fill: colors.text.primary,
            }}
          >
            {total}
          </text>
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3], flex: 1 }}>
          {segments.map((segment, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: segment.color,
                  borderRadius: borderRadius.sm,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                  }}
                >
                  {segment.label}
                </div>
                <div
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.text.secondary,
                  }}
                >
                  {segment.value} ({segment.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
