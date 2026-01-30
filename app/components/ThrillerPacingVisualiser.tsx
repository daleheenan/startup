'use client';

import { useState } from 'react';
import { colors, borderRadius, shadows } from '../lib/design-tokens';
import {
  THRILLER_PACING_STYLES,
  CHAPTER_HOOK_TYPES,
  THRILLER_TWIST_TYPES,
  TICKING_CLOCK_TYPES,
  type PacingStyle,
  type ChapterHookType,
  type TwistType
} from '../lib/genre-data/thriller-pacing';

// ==================== TYPE DEFINITIONS ====================

interface ChapterHook {
  id: string;
  chapter_number: number;
  hook_type: string;
  description: string;
  tension_level: number;
  is_resolved: boolean;
  resolution_chapter?: number;
}

interface ThrillerTwist {
  id: string;
  twist_type: string;
  description: string;
  setup_start_chapter: number;
  setup_end_chapter: number;
  reveal_chapter: number;
  foreshadowing_status: 'none' | 'minimal' | 'adequate' | 'excellent';
  is_planted: boolean;
}

interface TickingClock {
  id: string;
  name: string;
  description: string;
  clock_type: string;
  start_chapter: number;
  end_chapter: number;
  stakes: string;
  is_active: boolean;
}

interface ThrillerSettings {
  pacing_style: string;
  target_tension_curve?: number[];
}

interface ThrillerPacingVisualiserProps {
  projectId: string;
  totalChapters: number;
  settings?: ThrillerSettings;
  hooks?: ChapterHook[];
  twists?: ThrillerTwist[];
  tickingClocks?: TickingClock[];
  onAddHook?: (chapterNumber: number) => void;
  onAddTwist?: () => void;
  onAddClock?: () => void;
  readOnly?: boolean;
}

// ==================== HELPER FUNCTIONS ====================

function calculateTensionCurve(pacingStyleId: string, totalChapters: number): number[] {
  const curve: number[] = [];

  for (let i = 0; i < totalChapters; i++) {
    const progress = i / (totalChapters - 1);
    let tension: number;

    switch (pacingStyleId) {
      case 'relentless':
        // Constant high tension with small dips
        tension = 8 + Math.sin(progress * Math.PI * 4) * 1.5;
        break;

      case 'escalating':
        // Steady build from 4-5 to 9-10
        tension = 4 + (progress * 5) + Math.sin(progress * Math.PI * 2) * 0.5;
        break;

      case 'rollercoaster':
        // Oscillating peaks and valleys
        tension = 6 + Math.sin(progress * Math.PI * 6) * 3;
        break;

      case 'slow_burn':
        // Low start, gradual build, explosive finale
        tension = 2 + Math.pow(progress, 2) * 8;
        break;

      default:
        // Default to escalating
        tension = 4 + (progress * 5);
    }

    curve.push(Math.max(1, Math.min(10, tension)));
  }

  return curve;
}

function getHookTypeInfo(hookTypeId: string): ChapterHookType | undefined {
  return CHAPTER_HOOK_TYPES.find(h => h.id === hookTypeId);
}

function getTwistTypeInfo(twistTypeId: string): TwistType | undefined {
  return THRILLER_TWIST_TYPES.find(t => t.id === twistTypeId);
}

function getClockTypeInfo(clockTypeId: string) {
  return TICKING_CLOCK_TYPES.find(c => c.id === clockTypeId);
}

function getTensionColor(level: number): string {
  if (level >= 8) return colors.semantic.error;
  if (level >= 6) return colors.semantic.warning;
  if (level >= 4) return colors.semantic.info;
  return colors.semantic.success;
}

function getHookIcon(hookType: string): string {
  const icons: Record<string, string> = {
    cliffhanger: '⚡',
    revelation: '💡',
    question: '❓',
    threat: '⚠️',
    betrayal: '🗡️',
    countdown: '⏰',
    mystery_deepens: '🔍',
    reversal: '🔄',
    emotional_gut_punch: '💔',
    foreshadowing: '👁️',
  };
  return icons[hookType] || '📌';
}

function getForeshadowingColor(status: string): string {
  switch (status) {
    case 'excellent': return colors.semantic.success;
    case 'adequate': return colors.semantic.info;
    case 'minimal': return colors.semantic.warning;
    case 'none': return colors.semantic.error;
    default: return colors.text.tertiary;
  }
}

// ==================== SUB-COMPONENTS ====================

function TensionCurveGraph({
  tensionCurve,
  hooks,
  totalChapters
}: {
  tensionCurve: number[];
  hooks: ChapterHook[];
  totalChapters: number;
}) {
  const [hoveredHook, setHoveredHook] = useState<ChapterHook | null>(null);

  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Calculate path for tension curve
  const points = tensionCurve.map((tension, index) => {
    const x = padding.left + (index / (totalChapters - 1)) * graphWidth;
    const y = padding.top + graphHeight - ((tension - 1) / 9) * graphHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Y-axis grid lines */}
        {[1, 3, 5, 7, 9, 10].map(level => {
          const y = padding.top + graphHeight - ((level - 1) / 9) * graphHeight;
          return (
            <g key={level}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={colors.border.default}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill={colors.text.tertiary}
              >
                {level}
              </text>
            </g>
          );
        })}

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke={colors.border.default}
          strokeWidth="2"
        />

        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke={colors.border.default}
          strokeWidth="2"
        />

        {/* Tension curve line */}
        <polyline
          points={points}
          fill="none"
          stroke={colors.brand.primary}
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Area under curve */}
        <polygon
          points={`${padding.left},${height - padding.bottom} ${points} ${width - padding.right},${height - padding.bottom}`}
          fill={colors.brand.primary}
          opacity="0.1"
        />

        {/* Chapter hooks as points */}
        {hooks.map(hook => {
          const x = padding.left + ((hook.chapter_number - 1) / (totalChapters - 1)) * graphWidth;
          const tension = tensionCurve[hook.chapter_number - 1] || 5;
          const y = padding.top + graphHeight - ((tension - 1) / 9) * graphHeight;
          const hookTypeInfo = getHookTypeInfo(hook.hook_type);
          const impactColor = hookTypeInfo?.tensionImpact === 'high'
            ? colors.semantic.error
            : hookTypeInfo?.tensionImpact === 'medium'
            ? colors.semantic.warning
            : colors.semantic.info;

          return (
            <g key={hook.id}>
              <circle
                cx={x}
                cy={y}
                r="6"
                fill={impactColor}
                stroke={colors.background.surface}
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredHook(hook)}
                onMouseLeave={() => setHoveredHook(null)}
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        {Array.from({ length: Math.min(totalChapters, 10) }, (_, i) => {
          const chapterNum = Math.floor((i / 9) * (totalChapters - 1)) + 1;
          const x = padding.left + ((chapterNum - 1) / (totalChapters - 1)) * graphWidth;
          return (
            <text
              key={i}
              x={x}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              fontSize="12"
              fill={colors.text.tertiary}
            >
              Ch {chapterNum}
            </text>
          );
        })}

        {/* Axis labels */}
        <text
          x={width / 2}
          y={height - 5}
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill={colors.text.secondary}
        >
          Chapter Number
        </text>

        <text
          x={-height / 2}
          y={15}
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill={colors.text.secondary}
          transform={`rotate(-90, 15, ${height / 2})`}
        >
          Tension Level
        </text>
      </svg>

      {/* Hover tooltip */}
      {hoveredHook && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: colors.background.surface,
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.md,
          padding: '12px',
          boxShadow: shadows.md,
          maxWidth: '300px',
          zIndex: 10,
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text.primary, marginBottom: '4px' }}>
            Chapter {hoveredHook.chapter_number}: {getHookIcon(hoveredHook.hook_type)} {getHookTypeInfo(hoveredHook.hook_type)?.name}
          </div>
          <div style={{ fontSize: '13px', color: colors.text.secondary }}>
            {hoveredHook.description}
          </div>
          <div style={{ fontSize: '12px', color: colors.text.tertiary, marginTop: '4px' }}>
            Tension: {hoveredHook.tension_level}/10
          </div>
        </div>
      )}
    </div>
  );
}

function TickingClocksTimeline({
  clocks,
  totalChapters
}: {
  clocks: TickingClock[];
  totalChapters: number;
}) {
  const [hoveredClock, setHoveredClock] = useState<string | null>(null);

  const width = 800;
  const clockHeight = 60;
  const height = Math.max(200, clocks.length * clockHeight + 40);
  const padding = { top: 20, right: 20, bottom: 20, left: 200 };
  const timelineWidth = width - padding.left - padding.right;

  const activeClocks = clocks.filter(c => c.is_active);

  if (activeClocks.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: colors.text.tertiary,
        background: colors.background.secondary,
        borderRadius: borderRadius.md,
      }}>
        No active ticking clocks. Add time pressure to increase tension.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', overflowX: 'auto' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {activeClocks.map((clock, index) => {
          const y = padding.top + index * clockHeight + clockHeight / 2;
          const startX = padding.left + ((clock.start_chapter - 1) / totalChapters) * timelineWidth;
          const endX = padding.left + ((clock.end_chapter - 1) / totalChapters) * timelineWidth;
          const clockWidth = endX - startX;
          const isHovered = hoveredClock === clock.id;

          return (
            <g
              key={clock.id}
              onMouseEnter={() => setHoveredClock(clock.id)}
              onMouseLeave={() => setHoveredClock(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Clock name */}
              <text
                x={padding.left - 10}
                y={y + 5}
                textAnchor="end"
                fontSize="14"
                fontWeight={isHovered ? '600' : '400'}
                fill={colors.text.primary}
              >
                {clock.name}
              </text>

              {/* Timeline bar */}
              <rect
                x={startX}
                y={y - 10}
                width={clockWidth}
                height="20"
                fill={colors.semantic.warning}
                opacity={isHovered ? 0.9 : 0.7}
                rx="4"
              />

              {/* Start marker */}
              <circle
                cx={startX}
                cy={y}
                r="6"
                fill={colors.semantic.success}
                stroke={colors.background.surface}
                strokeWidth="2"
              />

              {/* End marker */}
              <circle
                cx={endX}
                cy={y}
                r="6"
                fill={colors.semantic.error}
                stroke={colors.background.surface}
                strokeWidth="2"
              />

              {/* Chapter labels */}
              <text
                x={startX}
                y={y - 15}
                textAnchor="middle"
                fontSize="11"
                fill={colors.text.tertiary}
              >
                Ch {clock.start_chapter}
              </text>
              <text
                x={endX}
                y={y - 15}
                textAnchor="middle"
                fontSize="11"
                fill={colors.text.tertiary}
              >
                Ch {clock.end_chapter}
              </text>

              {/* Hover details */}
              {isHovered && (
                <g>
                  <rect
                    x={startX + clockWidth / 2 - 150}
                    y={y + 25}
                    width="300"
                    height="60"
                    fill={colors.background.surface}
                    stroke={colors.border.default}
                    rx="6"
                    filter="url(#shadow)"
                  />
                  <text
                    x={startX + clockWidth / 2}
                    y={y + 42}
                    textAnchor="middle"
                    fontSize="12"
                    fill={colors.text.secondary}
                  >
                    {clock.description}
                  </text>
                  <text
                    x={startX + clockWidth / 2}
                    y={y + 60}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="600"
                    fill={colors.semantic.error}
                  >
                    Stakes: {clock.stakes}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Shadow filter definition */}
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.1" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}

function TwistTrackingList({
  twists
}: {
  twists: ThrillerTwist[];
}) {
  if (twists.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: colors.text.tertiary,
        background: colors.background.secondary,
        borderRadius: borderRadius.md,
      }}>
        No twists planned. Add plot twists to surprise your readers.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {twists.map(twist => {
        const twistType = getTwistTypeInfo(twist.twist_type);
        const impactColors = {
          extreme: colors.semantic.error,
          high: colors.semantic.warning,
          medium: colors.semantic.info,
          low: colors.semantic.success,
        };
        const impactColor = impactColors[twistType?.impactLevel || 'medium'];

        return (
          <div
            key={twist.id}
            style={{
              background: colors.background.surface,
              border: `1px solid ${colors.border.default}`,
              borderRadius: borderRadius.md,
              padding: '16px',
              display: 'flex',
              gap: '16px',
            }}
          >
            {/* Impact indicator */}
            <div style={{
              width: '4px',
              background: impactColor,
              borderRadius: '2px',
              flexShrink: 0,
            }} />

            <div style={{ flex: 1 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: '600', color: colors.text.primary }}>
                  {twistType?.name || twist.twist_type}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: impactColor,
                  padding: '2px 8px',
                  background: `${impactColor}15`,
                  borderRadius: borderRadius.sm,
                }}>
                  {twistType?.impactLevel} impact
                </span>
              </div>

              {/* Description */}
              <div style={{ fontSize: '14px', color: colors.text.secondary, marginBottom: '12px' }}>
                {twist.description}
              </div>

              {/* Chapter markers */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '12px', color: colors.text.tertiary }}>Setup: </span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text.primary }}>
                    Ch {twist.setup_start_chapter}–{twist.setup_end_chapter}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: colors.text.tertiary }}>Reveal: </span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: colors.semantic.error }}>
                    Ch {twist.reveal_chapter}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: colors.text.tertiary }}>Foreshadowing: </span>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: getForeshadowingColor(twist.foreshadowing_status),
                  }}>
                    {twist.foreshadowing_status}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: colors.text.tertiary }}>Planted: </span>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: twist.is_planted ? colors.semantic.success : colors.semantic.warning,
                  }}>
                    {twist.is_planted ? '✓ Yes' : '⚠ No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChapterHookTable({
  hooks
}: {
  hooks: ChapterHook[];
}) {
  if (hooks.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: colors.text.tertiary,
        background: colors.background.secondary,
        borderRadius: borderRadius.md,
      }}>
        No chapter hooks defined. Add hooks to keep readers turning pages.
      </div>
    );
  }

  const sortedHooks = [...hooks].sort((a, b) => a.chapter_number - b.chapter_number);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px',
      }}>
        <thead>
          <tr style={{ background: colors.background.secondary }}>
            <th style={{ padding: '12px', textAlign: 'left', color: colors.text.secondary, fontWeight: '600' }}>
              Chapter
            </th>
            <th style={{ padding: '12px', textAlign: 'left', color: colors.text.secondary, fontWeight: '600' }}>
              Hook Type
            </th>
            <th style={{ padding: '12px', textAlign: 'left', color: colors.text.secondary, fontWeight: '600' }}>
              Description
            </th>
            <th style={{ padding: '12px', textAlign: 'center', color: colors.text.secondary, fontWeight: '600' }}>
              Tension
            </th>
            <th style={{ padding: '12px', textAlign: 'center', color: colors.text.secondary, fontWeight: '600' }}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedHooks.map(hook => {
            const hookType = getHookTypeInfo(hook.hook_type);
            const tensionColor = getTensionColor(hook.tension_level);

            return (
              <tr
                key={hook.id}
                style={{
                  borderBottom: `1px solid ${colors.border.default}`,
                }}
              >
                <td style={{ padding: '12px', fontWeight: '600', color: colors.text.primary }}>
                  {hook.chapter_number}
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{getHookIcon(hook.hook_type)}</span>
                    <span style={{ color: colors.text.primary }}>{hookType?.name || hook.hook_type}</span>
                  </div>
                </td>
                <td style={{ padding: '12px', color: colors.text.secondary }}>
                  {hook.description}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: tensionColor,
                    color: colors.text.inverse,
                    fontWeight: '600',
                    fontSize: '13px',
                  }}>
                    {hook.tension_level}
                  </div>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {hook.is_resolved ? (
                    <span style={{ color: colors.semantic.success, fontWeight: '600' }}>
                      ✓ Resolved
                      {hook.resolution_chapter && ` (Ch ${hook.resolution_chapter})`}
                    </span>
                  ) : (
                    <span style={{ color: colors.semantic.warning, fontWeight: '600' }}>
                      ⏳ Pending
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function ThrillerPacingVisualiser({
  projectId,
  totalChapters,
  settings,
  hooks = [],
  twists = [],
  tickingClocks = [],
  onAddHook,
  onAddTwist,
  onAddClock,
  readOnly = false,
}: ThrillerPacingVisualiserProps) {
  const [activeTab, setActiveTab] = useState<'tension' | 'clocks' | 'twists' | 'hooks'>('tension');

  // Calculate tension curve based on pacing style
  const pacingStyle = THRILLER_PACING_STYLES.find(s => s.id === settings?.pacing_style) || THRILLER_PACING_STYLES[1];
  const tensionCurve = settings?.target_tension_curve || calculateTensionCurve(pacingStyle.id, totalChapters);

  const tabs = [
    { id: 'tension' as const, label: 'Tension Curve', count: hooks.length },
    { id: 'clocks' as const, label: 'Ticking Clocks', count: tickingClocks.filter(c => c.is_active).length },
    { id: 'twists' as const, label: 'Twists', count: twists.length },
    { id: 'hooks' as const, label: 'Chapter Hooks', count: hooks.length },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', color: colors.text.primary, marginBottom: '8px' }}>
          Thriller Pacing & Tension
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: colors.text.secondary }}>
            Pacing Style:
          </span>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.brand.primary,
            padding: '4px 12px',
            background: colors.brand.primaryLight,
            borderRadius: borderRadius.sm,
          }}>
            {pacingStyle.name}
          </span>
          <span style={{ fontSize: '14px', color: colors.text.tertiary }}>
            - {pacingStyle.description}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: `2px solid ${colors.border.default}`,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? `3px solid ${colors.brand.primary}` : '3px solid transparent',
              color: activeTab === tab.id ? colors.brand.primary : colors.text.secondary,
              fontWeight: activeTab === tab.id ? '600' : '400',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                marginLeft: '8px',
                padding: '2px 8px',
                background: activeTab === tab.id ? colors.brand.primaryLight : colors.background.secondary,
                borderRadius: borderRadius.sm,
                fontSize: '12px',
                fontWeight: '600',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        background: colors.background.surface,
        border: `1px solid ${colors.border.default}`,
        borderRadius: borderRadius.md,
        padding: '24px',
      }}>
        {activeTab === 'tension' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.text.primary, marginBottom: '8px' }}>
                Tension Across Chapters
              </h3>
              <p style={{ fontSize: '14px', color: colors.text.secondary }}>
                Track how tension builds throughout your story. Points indicate chapter hooks.
              </p>
            </div>
            <TensionCurveGraph
              tensionCurve={tensionCurve}
              hooks={hooks}
              totalChapters={totalChapters}
            />
          </div>
        )}

        {activeTab === 'clocks' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.text.primary, marginBottom: '8px' }}>
                  Active Ticking Clocks
                </h3>
                <p style={{ fontSize: '14px', color: colors.text.secondary }}>
                  Time pressures that create urgency and drive the plot forward.
                </p>
              </div>
              {!readOnly && onAddClock && (
                <button
                  onClick={onAddClock}
                  style={{
                    padding: '8px 16px',
                    background: colors.brand.primary,
                    color: colors.text.inverse,
                    border: 'none',
                    borderRadius: borderRadius.md,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  + Add Clock
                </button>
              )}
            </div>
            <TickingClocksTimeline clocks={tickingClocks} totalChapters={totalChapters} />
          </div>
        )}

        {activeTab === 'twists' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.text.primary, marginBottom: '8px' }}>
                  Plot Twists
                </h3>
                <p style={{ fontSize: '14px', color: colors.text.secondary }}>
                  Major revelations and reversals that surprise readers.
                </p>
              </div>
              {!readOnly && onAddTwist && (
                <button
                  onClick={onAddTwist}
                  style={{
                    padding: '8px 16px',
                    background: colors.brand.primary,
                    color: colors.text.inverse,
                    border: 'none',
                    borderRadius: borderRadius.md,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  + Add Twist
                </button>
              )}
            </div>
            <TwistTrackingList twists={twists} />
          </div>
        )}

        {activeTab === 'hooks' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.text.primary, marginBottom: '8px' }}>
                  Chapter Hooks
                </h3>
                <p style={{ fontSize: '14px', color: colors.text.secondary }}>
                  End-of-chapter hooks that keep readers turning pages.
                </p>
              </div>
            </div>
            <ChapterHookTable hooks={hooks} />
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: colors.background.secondary,
        borderRadius: borderRadius.md,
        fontSize: '13px',
      }}>
        <div style={{ fontWeight: '600', color: colors.text.primary, marginBottom: '8px' }}>
          Tension Levels:
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: colors.semantic.success, borderRadius: '50%' }} />
            <span style={{ color: colors.text.secondary }}>1-3: Low tension</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: colors.semantic.info, borderRadius: '50%' }} />
            <span style={{ color: colors.text.secondary }}>4-5: Moderate tension</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: colors.semantic.warning, borderRadius: '50%' }} />
            <span style={{ color: colors.text.secondary }}>6-7: High tension</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: colors.semantic.error, borderRadius: '50%' }} />
            <span style={{ color: colors.text.secondary }}>8-10: Extreme tension</span>
          </div>
        </div>
      </div>
    </div>
  );
}
