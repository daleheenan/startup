'use client';

import { useState } from 'react';
import { colors } from '../lib/constants';

interface PlotPoint {
  id: string;
  chapter_number: number;
  description: string;
  phase: 'setup' | 'rising' | 'midpoint' | 'crisis' | 'climax' | 'falling' | 'resolution';
  impact_level: 1 | 2 | 3 | 4 | 5;
}

interface PlotLayer {
  id: string;
  name: string;
  description: string;
  type: 'main' | 'subplot' | 'mystery' | 'romance' | 'character-arc';
  color: string;
  points: PlotPoint[];
  status: 'active' | 'resolved' | 'abandoned';
  resolution_chapter?: number;
}

interface StoryStructure {
  plot_layers: PlotLayer[];
  act_structure: {
    act_one_end: number;
    act_two_midpoint: number;
    act_two_end: number;
    act_three_climax: number;
  };
  pacing_notes: string;
}

interface PlotLayersVisualizationProps {
  structure: StoryStructure;
  totalChapters: number;
  onAddLayer?: () => void;
  onEditLayer?: (layerId: string) => void;
  onAddPoint?: (layerId: string, chapterNumber: number) => void;
  readOnly?: boolean;
}

const LAYER_COLORS: Record<string, string> = {
  main: '#667eea',
  subplot: '#10B981',
  mystery: '#F59E0B',
  romance: '#EC4899',
  'character-arc': '#8B5CF6',
};

const PHASE_LABELS: Record<string, string> = {
  setup: 'Setup',
  rising: 'Rising Action',
  midpoint: 'Midpoint',
  crisis: 'Crisis',
  climax: 'Climax',
  falling: 'Falling Action',
  resolution: 'Resolution',
};

const TYPE_LABELS: Record<string, string> = {
  main: 'Main Plot',
  subplot: 'Subplot',
  mystery: 'Mystery Thread',
  romance: 'Romance Arc',
  'character-arc': 'Character Arc',
};

export default function PlotLayersVisualization({
  structure,
  totalChapters,
  onAddLayer,
  onEditLayer,
  onAddPoint,
  readOnly = false,
}: PlotLayersVisualizationProps) {
  const [hoveredPoint, setHoveredPoint] = useState<PlotPoint | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);

  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);
  const { act_structure } = structure;

  // Guard against undefined plot_layers
  const plotLayers = structure.plot_layers || [];

  // Calculate intensity at each chapter for a layer (for the line graph)
  const getLayerIntensity = (layer: PlotLayer, chapter: number): number => {
    const points = layer.points || [];
    const point = points.find(p => p.chapter_number === chapter);
    if (point) return point.impact_level;

    // Interpolate between points
    const sortedPoints = [...points].sort((a, b) => a.chapter_number - b.chapter_number);
    const before = sortedPoints.filter(p => p.chapter_number < chapter).pop();
    const after = sortedPoints.find(p => p.chapter_number > chapter);

    // If no points at all, show a default curve based on layer type
    if (!before && !after) {
      // Generate a typical story arc curve based on the chapter position
      const progress = chapter / totalChapters;
      if (layer.type === 'main') {
        // Main plot: builds tension, peaks at climax, resolves
        if (progress < 0.25) return 1 + progress * 4; // Setup: 1 -> 2
        if (progress < 0.5) return 2 + (progress - 0.25) * 6; // Rising: 2 -> 3.5
        if (progress < 0.75) return 3.5 + (progress - 0.5) * 4; // Crisis: 3.5 -> 4.5
        if (progress < 0.9) return 4.5 + (progress - 0.75) * 3.3; // Climax: 4.5 -> 5
        return 5 - (progress - 0.9) * 25; // Resolution: 5 -> 2.5
      } else {
        // Subplots and arcs: gentler curve
        if (progress < 0.3) return 1 + progress * 3.3; // 1 -> 2
        if (progress < 0.7) return 2 + (progress - 0.3) * 2.5; // 2 -> 3
        return 3 - (progress - 0.7) * 6.7; // 3 -> 1
      }
    }

    if (!before) return after!.impact_level * 0.5;
    if (!after) {
      // Layer resolved
      if (layer.status === 'resolved' && layer.resolution_chapter && chapter > layer.resolution_chapter) {
        return 0;
      }
      return before.impact_level * 0.8;
    }

    // Linear interpolation
    const ratio = (chapter - before.chapter_number) / (after.chapter_number - before.chapter_number);
    return before.impact_level + (after.impact_level - before.impact_level) * ratio;
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1rem',
        background: '#F8FAFC',
        borderRadius: '8px',
      }}>
        <div style={{ fontSize: '0.813rem', fontWeight: 600, color: colors.text, marginRight: '1rem' }}>
          Plot Layers:
        </div>
        {plotLayers.map(layer => (
          <button
            key={layer.id}
            onClick={() => setSelectedLayer(selectedLayer === layer.id ? null : layer.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.375rem 0.75rem',
              background: selectedLayer === layer.id ? layer.color : '#FFFFFF',
              border: `2px solid ${layer.color}`,
              borderRadius: '16px',
              color: selectedLayer === layer.id ? '#FFFFFF' : layer.color,
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: selectedLayer === layer.id ? '#FFFFFF' : layer.color,
            }} />
            {layer.name}
            {layer.status === 'resolved' && ' (Resolved)'}
          </button>
        ))}
        {!readOnly && onAddLayer && (
          <button
            onClick={onAddLayer}
            style={{
              padding: '0.375rem 0.75rem',
              background: '#FFFFFF',
              border: '1px dashed #94A3B8',
              borderRadius: '16px',
              color: '#64748B',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            + Add Layer
          </button>
        )}
      </div>

      {/* Visualization */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '250px',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '1rem',
        overflow: 'hidden',
      }}>
        {/* Act markers */}
        {act_structure && (
          <>
            <div style={{
              position: 'absolute',
              left: `${(act_structure.act_one_end / totalChapters) * 100}%`,
              top: 0,
              bottom: 0,
              width: '1px',
              background: '#E2E8F0',
              zIndex: 1,
            }}>
              <span style={{
                position: 'absolute',
                top: '0.25rem',
                left: '0.5rem',
                fontSize: '0.625rem',
                color: '#94A3B8',
                whiteSpace: 'nowrap',
              }}>Act I End</span>
            </div>
            <div style={{
              position: 'absolute',
              left: `${(act_structure.act_two_midpoint / totalChapters) * 100}%`,
              top: 0,
              bottom: 0,
              width: '1px',
              background: '#FCD34D',
              zIndex: 1,
            }}>
              <span style={{
                position: 'absolute',
                top: '0.25rem',
                left: '0.5rem',
                fontSize: '0.625rem',
                color: '#D97706',
                whiteSpace: 'nowrap',
              }}>Midpoint</span>
            </div>
            <div style={{
              position: 'absolute',
              left: `${(act_structure.act_two_end / totalChapters) * 100}%`,
              top: 0,
              bottom: 0,
              width: '1px',
              background: '#E2E8F0',
              zIndex: 1,
            }}>
              <span style={{
                position: 'absolute',
                top: '0.25rem',
                left: '0.5rem',
                fontSize: '0.625rem',
                color: '#94A3B8',
                whiteSpace: 'nowrap',
              }}>Act II End</span>
            </div>
            <div style={{
              position: 'absolute',
              left: `${(act_structure.act_three_climax / totalChapters) * 100}%`,
              top: 0,
              bottom: 0,
              width: '1px',
              background: '#EF4444',
              zIndex: 1,
            }}>
              <span style={{
                position: 'absolute',
                top: '0.25rem',
                left: '0.5rem',
                fontSize: '0.625rem',
                color: '#DC2626',
                whiteSpace: 'nowrap',
              }}>Climax</span>
            </div>
          </>
        )}

        {/* Grid lines */}
        {[1, 2, 3, 4, 5].map(level => (
          <div
            key={level}
            style={{
              position: 'absolute',
              left: '2rem',
              right: '0.5rem',
              bottom: `${((level - 1) / 4) * 180 + 20}px`,
              height: '1px',
              background: '#F1F5F9',
            }}
          />
        ))}

        {/* Y-axis label */}
        <div style={{
          position: 'absolute',
          left: '0.25rem',
          top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)',
          fontSize: '0.625rem',
          color: '#94A3B8',
          whiteSpace: 'nowrap',
        }}>
          Intensity
        </div>

        {/* Plot lines */}
        <svg
          style={{
            position: 'absolute',
            left: '2rem',
            right: '0.5rem',
            top: '1rem',
            bottom: '1rem',
            width: 'calc(100% - 2.5rem)',
            height: 'calc(100% - 2rem)',
          }}
          preserveAspectRatio="none"
        >
          {plotLayers.map(layer => {
            if (selectedLayer && selectedLayer !== layer.id) return null;

            const points = chapters.map(ch => ({
              x: ((ch - 1) / (totalChapters - 1)) * 100,
              y: 100 - (getLayerIntensity(layer, ch) / 5) * 100,
            }));

            const pathD = points.map((p, i) =>
              `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`
            ).join(' ');

            return (
              <path
                key={layer.id}
                d={pathD}
                fill="none"
                stroke={layer.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: layer.status === 'resolved' ? 0.5 : 1 }}
              />
            );
          })}
        </svg>

        {/* Plot points */}
        {plotLayers.map(layer => {
          if (selectedLayer && selectedLayer !== layer.id) return null;

          return (layer.points || []).map(point => {
            const x = ((point.chapter_number - 1) / (totalChapters - 1)) * 100;
            const y = 100 - (point.impact_level / 5) * 100;

            return (
              <div
                key={point.id}
                style={{
                  position: 'absolute',
                  left: `calc(2rem + ${x}% * (100% - 2.5rem) / 100%)`,
                  top: `calc(1rem + ${y}% * (100% - 2rem) / 100%)`,
                  width: `${8 + point.impact_level * 2}px`,
                  height: `${8 + point.impact_level * 2}px`,
                  background: layer.color,
                  borderRadius: '50%',
                  border: '2px solid white',
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  zIndex: 10,
                  boxShadow: hoveredPoint?.id === point.id ? `0 0 8px ${layer.color}` : 'none',
                }}
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          });
        })}

        {/* Tooltip */}
        {hoveredPoint && (
          <div style={{
            position: 'absolute',
            left: `calc(2rem + ${((hoveredPoint.chapter_number - 1) / (totalChapters - 1)) * 100}% * (100% - 2.5rem) / 100%)`,
            bottom: '10px',
            transform: 'translateX(-50%)',
            background: '#1A1A2E',
            color: '#FFFFFF',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            zIndex: 20,
          }}>
            <div style={{ fontWeight: 600 }}>Ch. {hoveredPoint.chapter_number}: {PHASE_LABELS[hoveredPoint.phase]}</div>
            <div style={{ marginTop: '0.25rem', opacity: 0.9 }}>{hoveredPoint.description}</div>
            <div style={{ marginTop: '0.25rem', opacity: 0.7 }}>Impact: {hoveredPoint.impact_level}/5</div>
          </div>
        )}

        {/* Chapter numbers along bottom */}
        <div style={{
          position: 'absolute',
          left: '2rem',
          right: '0.5rem',
          bottom: '0',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          {[1, Math.floor(totalChapters / 4), Math.floor(totalChapters / 2), Math.floor(3 * totalChapters / 4), totalChapters].map((ch, i) => (
            <span key={i} style={{ fontSize: '0.625rem', color: '#94A3B8' }}>
              Ch {ch}
            </span>
          ))}
        </div>
      </div>

      {/* Layer details */}
      {selectedLayer && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#F8FAFC',
          borderRadius: '8px',
        }}>
          {(() => {
            const layer = plotLayers.find(l => l.id === selectedLayer);
            if (!layer) return null;

            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, marginBottom: '0.25rem' }}>
                      {layer.name}
                    </h4>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.125rem 0.5rem',
                      background: layer.color + '20',
                      color: layer.color,
                      borderRadius: '4px',
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}>
                      {TYPE_LABELS[layer.type]}
                    </span>
                  </div>
                  {!readOnly && onEditLayer && (
                    <button
                      onClick={() => onEditLayer(layer.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        color: '#64748B',
                        fontSize: '0.813rem',
                        cursor: 'pointer',
                      }}
                    >
                      Edit Layer
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1rem' }}>
                  {layer.description}
                </p>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: colors.text, marginBottom: '0.5rem' }}>
                    Key Points ({(layer.points || []).length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {(layer.points || []).sort((a, b) => a.chapter_number - b.chapter_number).map(point => (
                      <div
                        key={point.id}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Ch {point.chapter_number}</span>
                        <span style={{ color: '#64748B', margin: '0 0.25rem' }}>-</span>
                        <span style={{ color: layer.color }}>{PHASE_LABELS[point.phase]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Pacing notes */}
      {structure.pacing_notes && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400E', marginBottom: '0.5rem' }}>
            Pacing Notes
          </div>
          <p style={{ fontSize: '0.875rem', color: '#78350F', margin: 0 }}>
            {structure.pacing_notes}
          </p>
        </div>
      )}
    </div>
  );
}
