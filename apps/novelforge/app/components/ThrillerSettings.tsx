'use client';

import { useState, useEffect } from 'react';
import { colors, borderRadius } from '../lib/constants';
import { fetchJson, put } from '../lib/fetch-utils';
import {
  THRILLER_PACING_STYLES,
  CHAPTER_HOOK_TYPES,
  CLIFFHANGER_FREQUENCY,
  TICKING_CLOCK_TYPES,
  type PacingStyle,
  type ChapterHookType,
  type TickingClockType
} from '../lib/genre-data';

interface ThrillerSettingsData {
  id?: string;
  project_id: string;
  pacing_style: string;
  cliffhanger_frequency: 'every' | 'most' | 'some';
  action_scene_ratio: number;
  active_clocks: Array<{
    id: string;
    type: string;
    description: string;
    deadline?: string;
  }>;
  chapter_hooks: Array<{
    chapter_id?: string;
    chapter_number?: number;
    hook_type: string;
    description: string;
  }>;
}

interface ThrillerSettingsProps {
  projectId: string;
  onSettingsChange?: (settings: ThrillerSettingsData) => void;
  isLoading?: boolean;
}

export default function ThrillerSettings({
  projectId,
  onSettingsChange,
  isLoading = false,
}: ThrillerSettingsProps) {
  const [settings, setSettings] = useState<ThrillerSettingsData>({
    project_id: projectId,
    pacing_style: 'escalating',
    cliffhanger_frequency: 'most',
    action_scene_ratio: 0.3,
    active_clocks: [],
    chapter_hooks: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [expandedHook, setExpandedHook] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [projectId]);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchJson<{ settings: ThrillerSettingsData }>(
        `/api/projects/${projectId}/genre-settings/thriller`
      );
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        // Settings don't exist yet - use defaults
        console.log('No existing thriller settings found, using defaults');
      } else {
        console.error('Error loading thriller settings:', err);
        setError('Failed to load settings. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    setError(null);

    try {
      const data = await put<{ settings: ThrillerSettingsData }>(
        `/api/projects/${projectId}/genre-settings/thriller`,
        settings
      );

      if (data.settings) {
        setSettings(data.settings);
        onSettingsChange?.(data.settings);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err: any) {
      console.error('Error saving thriller settings:', err);
      setError(`Failed to save settings: ${err.message || 'Unknown error'}`);
      setSaveStatus('error');
    }
  };

  const handlePacingStyleChange = (styleId: string) => {
    setSettings(prev => ({ ...prev, pacing_style: styleId }));
  };

  const handleCliffhangerFrequencyChange = (frequency: 'every' | 'most' | 'some') => {
    setSettings(prev => ({ ...prev, cliffhanger_frequency: frequency }));
  };

  const handleActionSceneRatioChange = (ratio: number) => {
    setSettings(prev => ({ ...prev, action_scene_ratio: ratio }));
  };

  const selectedPacingStyle = THRILLER_PACING_STYLES.find(s => s.id === settings.pacing_style);
  const selectedCliffhangerFreq = CLIFFHANGER_FREQUENCY.find(f => f.value === settings.cliffhanger_frequency);

  if (loading) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: colors.textSecondary,
        }}
      >
        Loading thriller settings...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: colors.text,
            margin: '0 0 0.5rem 0',
          }}
        >
          Thriller Settings
        </h2>
        <p style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: 0 }}>
          Configure pacing, tension mechanics, and chapter hooks for your thriller project.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            background: colors.errorLight,
            border: `1px solid ${colors.errorBorder}`,
            borderRadius: borderRadius.md,
            color: colors.error,
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Pacing Style Selector */}
      <div
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.lg,
        }}
      >
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: colors.text,
            margin: '0 0 1rem 0',
          }}
        >
          Pacing Style
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {THRILLER_PACING_STYLES.map((style) => {
            const isSelected = settings.pacing_style === style.id;
            return (
              <label
                key={style.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1rem',
                  background: isSelected ? colors.brandLight : colors.background,
                  border: `2px solid ${isSelected ? colors.brandStart : colors.border}`,
                  borderRadius: borderRadius.md,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start' }}>
                  <input
                    type="radio"
                    name="pacing_style"
                    value={style.id}
                    checked={isSelected}
                    onChange={() => handlePacingStyleChange(style.id)}
                    disabled={isLoading}
                    style={{ marginRight: '0.75rem', marginTop: '0.25rem' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.938rem', fontWeight: 600, color: colors.text, marginBottom: '0.25rem' }}>
                      {style.name}
                    </div>
                    <div style={{ fontSize: '0.813rem', color: colors.textSecondary, marginBottom: '0.5rem' }}>
                      {style.description}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                      <div><strong>Tension Curve:</strong> {style.tensionCurve}</div>
                      <div><strong>Chapter Length:</strong> {style.chapterLength}</div>
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {selectedPacingStyle && (
          <div
            style={{
              padding: '1rem',
              background: colors.infoLight,
              border: `1px solid ${colors.infoBorder}`,
              borderRadius: borderRadius.md,
            }}
          >
            <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
              <strong>Best for:</strong> {selectedPacingStyle.bestFor.join(', ')}
            </div>
          </div>
        )}
      </div>

      {/* Cliffhanger Frequency */}
      <div
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.lg,
        }}
      >
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: colors.text,
            margin: '0 0 1rem 0',
          }}
        >
          Cliffhanger Frequency
        </h3>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {CLIFFHANGER_FREQUENCY.map((freq) => {
            const isSelected = settings.cliffhanger_frequency === freq.value;
            return (
              <button
                key={freq.value}
                type="button"
                onClick={() => handleCliffhangerFrequencyChange(freq.value)}
                disabled={isLoading}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '0.75rem 1rem',
                  background: isSelected ? colors.brandStart : colors.background,
                  border: `2px solid ${isSelected ? colors.brandStart : colors.border}`,
                  borderRadius: borderRadius.md,
                  color: isSelected ? colors.surface : colors.text,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{freq.label}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>{freq.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Scene Ratio Slider */}
      <div
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.lg,
        }}
      >
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: colors.text,
            margin: '0 0 0.5rem 0',
          }}
        >
          Action Scene Ratio: {Math.round(settings.action_scene_ratio * 100)}%
        </h3>
        <p style={{ fontSize: '0.813rem', color: colors.textSecondary, margin: '0 0 1rem 0' }}>
          Percentage of chapters that should contain significant action sequences.
        </p>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.action_scene_ratio}
          onChange={(e) => handleActionSceneRatioChange(parseFloat(e.target.value))}
          disabled={isLoading}
          style={{ width: '100%', accentColor: colors.brandStart }}
          aria-label="Action Scene Ratio"
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: colors.textSecondary }}>
          <span>Low (0%)</span>
          <span>Moderate (50%)</span>
          <span>High (100%)</span>
        </div>
      </div>

      {/* Active Ticking Clocks */}
      <div
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.lg,
        }}
      >
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: colors.text,
            margin: '0 0 0.5rem 0',
          }}
        >
          Active Ticking Clocks
        </h3>
        <p style={{ fontSize: '0.813rem', color: colors.textSecondary, margin: '0 0 1rem 0' }}>
          Time-pressure mechanisms currently active in your story.
        </p>

        {settings.active_clocks && settings.active_clocks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {settings.active_clocks.map((clock, idx) => {
              const clockType = TICKING_CLOCK_TYPES.find(t => t.id === clock.type);
              return (
                <div
                  key={idx}
                  style={{
                    padding: '1rem',
                    background: colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.938rem', fontWeight: 600, color: colors.text, marginBottom: '0.25rem' }}>
                        {clockType?.name || clock.type}
                      </div>
                      <div style={{ fontSize: '0.813rem', color: colors.textSecondary, marginBottom: '0.25rem' }}>
                        {clock.description}
                      </div>
                      {clock.deadline && (
                        <div style={{ fontSize: '0.75rem', color: colors.warning, fontWeight: 600 }}>
                          Deadline: {clock.deadline}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '0.688rem',
                        fontWeight: 600,
                        color: colors.surface,
                        background: colors.error,
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              color: colors.textSecondary,
              background: colors.background,
              borderRadius: borderRadius.md,
              border: `1px dashed ${colors.border}`,
            }}
          >
            No active ticking clocks. Add time pressure to increase tension.
          </div>
        )}
      </div>

      {/* Chapter Hooks Summary */}
      <div
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.lg,
        }}
      >
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: colors.text,
            margin: '0 0 0.5rem 0',
          }}
        >
          Chapter Hook Types
        </h3>
        <p style={{ fontSize: '0.813rem', color: colors.textSecondary, margin: '0 0 1rem 0' }}>
          Different types of chapter endings to maintain page-turner momentum.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {CHAPTER_HOOK_TYPES.map((hookType) => {
            const isExpanded = expandedHook === hookType.id;
            const tensionColor =
              hookType.tensionImpact === 'high' ? colors.error :
              hookType.tensionImpact === 'medium' ? colors.warning :
              colors.info;

            return (
              <div
                key={hookType.id}
                style={{
                  padding: '1rem',
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedHook(isExpanded ? null : hookType.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.938rem', fontWeight: 600, color: colors.text }}>
                        {hookType.name}
                      </div>
                      <span
                        style={{
                          fontSize: '0.688rem',
                          fontWeight: 600,
                          color: colors.surface,
                          background: tensionColor,
                          padding: '0.125rem 0.5rem',
                          borderRadius: '8px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {hookType.tensionImpact}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.813rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
                      {hookType.description}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: colors.brandStart,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0.5rem',
                    }}
                  >
                    {isExpanded ? 'Hide' : 'Show'} Details
                  </button>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: `1px solid ${colors.border}`,
                      fontSize: '0.75rem',
                      color: colors.textSecondary,
                    }}
                  >
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong style={{ color: colors.text }}>Examples:</strong>
                      <ul style={{ margin: '0.25rem 0', paddingLeft: '1.25rem' }}>
                        {hookType.examples.map((example, idx) => (
                          <li key={idx}>{example}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <strong style={{ color: colors.text }}>Best Followed By:</strong>
                      <ul style={{ margin: '0.25rem 0', paddingLeft: '1.25rem' }}>
                        {hookType.bestFollowedBy.map((follow, idx) => (
                          <li key={idx}>{follow}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || saveStatus === 'saving'}
          style={{
            padding: '0.875rem 2rem',
            background: saveStatus === 'saved' ? colors.success : colors.brandStart,
            border: 'none',
            borderRadius: borderRadius.md,
            color: colors.surface,
            fontSize: '0.938rem',
            fontWeight: 600,
            cursor: isLoading || saveStatus === 'saving' ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
          }}
        >
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
