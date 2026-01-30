'use client';

import { useState, useEffect } from 'react';
import { colors, borderRadius } from '../lib/constants';
import { fetchJson, put } from '../lib/fetch-utils';
import {
  ROMANCE_HEAT_LEVELS,
  ROMANCE_SENSUALITY_FOCUS,
  ROMANCE_CONTENT_WARNINGS,
  ROMANCE_BEATS,
  type HeatLevel,
  type SensualityFocus,
  type ContentWarning,
  type RomanceBeat
} from '../lib/genre-data';

interface RomanceSettingsData {
  id?: string;
  project_id: string;
  heat_level: number;
  sensuality_focus: SensualityFocus;
  content_warnings: ContentWarning[];
  fade_to_black: boolean;
  tracked_beats: string[];
  current_beat_status?: Record<string, 'planned' | 'drafted' | 'complete'>;
}

interface RomanceSettingsProps {
  projectId: string;
  onSettingsChange?: (settings: RomanceSettingsData) => void;
  isLoading?: boolean;
}

export default function RomanceSettings({
  projectId,
  onSettingsChange,
  isLoading = false,
}: RomanceSettingsProps) {
  const [settings, setSettings] = useState<RomanceSettingsData>({
    project_id: projectId,
    heat_level: 3,
    sensuality_focus: 'balanced',
    content_warnings: [],
    fade_to_black: false,
    tracked_beats: [],
    current_beat_status: {},
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
  }, [projectId]);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchJson<{ settings: RomanceSettingsData }>(
        `/api/projects/${projectId}/genre-settings/romance`
      );
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        // Settings don't exist yet - use defaults
        console.log('No existing romance settings found, using defaults');
      } else {
        console.error('Error loading romance settings:', err);
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
      const data = await put<{ settings: RomanceSettingsData }>(
        `/api/projects/${projectId}/genre-settings/romance`,
        settings
      );

      if (data.settings) {
        setSettings(data.settings);
        onSettingsChange?.(data.settings);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err: any) {
      console.error('Error saving romance settings:', err);
      setError(`Failed to save settings: ${err.message || 'Unknown error'}`);
      setSaveStatus('error');
    }
  };

  const handleHeatLevelChange = (level: number) => {
    setSettings(prev => ({ ...prev, heat_level: level }));
  };

  const handleSensualityFocusChange = (focus: SensualityFocus) => {
    setSettings(prev => ({ ...prev, sensuality_focus: focus }));
  };

  const handleContentWarningToggle = (warning: ContentWarning) => {
    setSettings(prev => {
      const warnings = prev.content_warnings || [];
      if (warnings.includes(warning)) {
        return { ...prev, content_warnings: warnings.filter(w => w !== warning) };
      } else {
        return { ...prev, content_warnings: [...warnings, warning] };
      }
    });
  };

  const handleFadeToBlackToggle = () => {
    setSettings(prev => ({ ...prev, fade_to_black: !prev.fade_to_black }));
  };

  const selectedHeatLevel = ROMANCE_HEAT_LEVELS.find(h => h.level === settings.heat_level);

  const requiredBeats = ROMANCE_BEATS.filter(beat => beat.required);
  const optionalBeats = ROMANCE_BEATS.filter(beat => !beat.required);

  if (loading) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: colors.textSecondary,
        }}
      >
        Loading romance settings...
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
          Romance Settings
        </h2>
        <p style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: 0 }}>
          Configure heat level, sensuality focus, and emotional beats for your romance project.
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

      {/* Heat Level Selector */}
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
          Heat Level
        </h3>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {ROMANCE_HEAT_LEVELS.map((level) => {
            const isSelected = settings.heat_level === level.level;
            return (
              <button
                key={level.level}
                type="button"
                onClick={() => handleHeatLevelChange(level.level)}
                disabled={isLoading}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: isSelected ? colors.brandStart : colors.background,
                  border: `2px solid ${isSelected ? colors.brandStart : colors.border}`,
                  borderRadius: borderRadius.md,
                  color: isSelected ? colors.surface : colors.text,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: '100px',
                }}
              >
                <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {level.level}
                </div>
                <div>{level.name}</div>
              </button>
            );
          })}
        </div>

        {selectedHeatLevel && (
          <div
            style={{
              padding: '1rem',
              background: colors.brandLight,
              border: `1px solid ${colors.brandBorder}`,
              borderRadius: borderRadius.md,
            }}
          >
            <div style={{ fontSize: '0.938rem', fontWeight: 600, color: colors.text, marginBottom: '0.5rem' }}>
              {selectedHeatLevel.name}: {selectedHeatLevel.description}
            </div>
            <div style={{ fontSize: '0.813rem', color: colors.textSecondary, marginBottom: '0.75rem' }}>
              {selectedHeatLevel.contentGuide}
            </div>
            <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
              <strong>Reader Expectations:</strong>
              <ul style={{ margin: '0.25rem 0 0 1.25rem', paddingLeft: 0 }}>
                {selectedHeatLevel.readerExpectations.map((exp, idx) => (
                  <li key={idx}>{exp}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Sensuality Focus */}
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
          Sensuality Focus
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {ROMANCE_SENSUALITY_FOCUS.map((focus) => {
            const isSelected = settings.sensuality_focus === focus.value;
            return (
              <label
                key={focus.value}
                style={{
                  display: 'flex',
                  alignItems: 'start',
                  padding: '1rem',
                  background: isSelected ? colors.brandLight : colors.background,
                  border: `2px solid ${isSelected ? colors.brandStart : colors.border}`,
                  borderRadius: borderRadius.md,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="sensuality_focus"
                  value={focus.value}
                  checked={isSelected}
                  onChange={() => handleSensualityFocusChange(focus.value)}
                  disabled={isLoading}
                  style={{ marginRight: '0.75rem', marginTop: '0.25rem' }}
                />
                <div>
                  <div style={{ fontSize: '0.938rem', fontWeight: 600, color: colors.text, marginBottom: '0.25rem' }}>
                    {focus.label}
                  </div>
                  <div style={{ fontSize: '0.813rem', color: colors.textSecondary }}>
                    {focus.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Content Warnings */}
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
          Content Warnings
        </h3>
        <p style={{ fontSize: '0.813rem', color: colors.textSecondary, margin: '0 0 1rem 0' }}>
          Select any content warnings that apply to your story. These help readers make informed choices.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
          {ROMANCE_CONTENT_WARNINGS.map((warning) => {
            const isSelected = settings.content_warnings?.includes(warning.value);
            return (
              <label
                key={warning.value}
                style={{
                  display: 'flex',
                  alignItems: 'start',
                  padding: '0.75rem',
                  background: isSelected ? colors.warningLight : colors.background,
                  border: `1px solid ${isSelected ? colors.warningBorder : colors.border}`,
                  borderRadius: borderRadius.md,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleContentWarningToggle(warning.value)}
                  disabled={isLoading}
                  style={{ marginRight: '0.75rem', marginTop: '0.25rem' }}
                />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.text, marginBottom: '0.125rem' }}>
                    {warning.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                    {warning.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Fade to Black Toggle */}
      <div
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.lg,
        }}
      >
        <label style={{ display: 'flex', alignItems: 'start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.fade_to_black}
            onChange={handleFadeToBlackToggle}
            disabled={isLoading}
            style={{ marginRight: '0.75rem', marginTop: '0.25rem' }}
          />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, marginBottom: '0.25rem' }}>
              Fade to Black
            </div>
            <div style={{ fontSize: '0.813rem', color: colors.textSecondary }}>
              Enable this to close the door before explicit content, regardless of heat level. Intimate scenes will be implied rather than shown.
            </div>
          </div>
        </label>
      </div>

      {/* Emotional Beat Tracking */}
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
          Emotional Beat Tracking
        </h3>
        <p style={{ fontSize: '0.813rem', color: colors.textSecondary, margin: '0 0 1rem 0' }}>
          Track the essential emotional beats your romance readers expect.
        </p>

        {/* Required Beats */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.938rem', fontWeight: 600, color: colors.text, marginBottom: '0.75rem' }}>
            Required Beats
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {requiredBeats.map((beat) => {
              const status = settings.current_beat_status?.[beat.id] || 'planned';
              return (
                <div
                  key={beat.id}
                  style={{
                    padding: '0.75rem',
                    background: colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.sm,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.text }}>
                        {beat.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                        {beat.typicalPlacement}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.688rem',
                        fontWeight: 600,
                        color: colors.surface,
                        background: status === 'complete' ? colors.success : status === 'drafted' ? colors.warning : colors.info,
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Optional Beats */}
        <div>
          <h4 style={{ fontSize: '0.938rem', fontWeight: 600, color: colors.text, marginBottom: '0.75rem' }}>
            Optional Beats
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {optionalBeats.map((beat) => {
              const status = settings.current_beat_status?.[beat.id] || 'planned';
              return (
                <div
                  key={beat.id}
                  style={{
                    padding: '0.75rem',
                    background: colors.background,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.sm,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: colors.text }}>
                        {beat.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                        {beat.typicalPlacement}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.688rem',
                        fontWeight: 600,
                        color: colors.surface,
                        background: status === 'complete' ? colors.success : status === 'drafted' ? colors.warning : colors.textTertiary,
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
