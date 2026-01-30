'use client';

import { useState, useEffect } from 'react';
import { colors, borderRadius, gradients } from '@/app/lib/constants';
import { card } from '@/app/lib/styles';
import { ROMANCE_HEAT_LEVELS, ROMANCE_SENSUALITY_FOCUS, ROMANCE_CONTENT_WARNINGS } from '@/app/lib/genre-data/romance-heat-levels';

interface RomanceSettingsProps {
  projectId: string;
}

interface RomanceConfig {
  heatLevel: number;
  fadeToBlack: boolean;
  onPageIntimacy: boolean;
  sensualityFocus: string;
  contentWarnings: string[];
}

export default function RomanceSettings({ projectId }: RomanceSettingsProps) {
  const [config, setConfig] = useState<RomanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [projectId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('novelforge_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${projectId}/romance-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      } else if (response.status === 404) {
        // No settings yet - use defaults
        setConfig({
          heatLevel: 3,
          fadeToBlack: false,
          onPageIntimacy: true,
          sensualityFocus: 'balanced',
          contentWarnings: [],
        });
      } else {
        throw new Error('Failed to fetch romance settings');
      }
    } catch (err: any) {
      console.error('Error fetching romance settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updates: Partial<RomanceConfig>) => {
    if (!config) return;

    const newConfig = { ...config, ...updates };
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('novelforge_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${projectId}/romance-settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error('Failed to save romance settings');
      }

      const data = await response.json();
      setConfig(data);
    } catch (err: any) {
      console.error('Error saving romance settings:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleContentWarning = (warning: string) => {
    if (!config) return;
    const warnings = config.contentWarnings.includes(warning)
      ? config.contentWarnings.filter(w => w !== warning)
      : [...config.contentWarnings, warning];
    saveSettings({ contentWarnings: warnings });
  };

  if (loading) {
    return (
      <div style={{ ...card, padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: colors.textSecondary }}>Loading romance settings...</p>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  const selectedHeatLevel = ROMANCE_HEAT_LEVELS.find(h => h.level === config.heatLevel);

  return (
    <div style={{ ...card, padding: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: colors.text, marginBottom: '0.5rem' }}>
        Romance Settings
      </h3>
      <p style={{ fontSize: '0.875rem', color: colors.textSecondary, marginBottom: '1.5rem' }}>
        Configure heat level and content warnings for your romance novel
      </p>

      {error && (
        <div style={{
          padding: '0.75rem',
          background: colors.errorLight,
          border: `1px solid ${colors.errorBorder}`,
          borderRadius: borderRadius.md,
          marginBottom: '1rem',
        }}>
          <p style={{ fontSize: '0.875rem', color: colors.error, margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {/* Heat Level Selection */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: colors.text,
          display: 'block',
          marginBottom: '0.75rem',
        }}>
          Heat Level
        </label>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {ROMANCE_HEAT_LEVELS.map(level => (
            <button
              key={level.level}
              onClick={() => saveSettings({ heatLevel: level.level })}
              disabled={saving}
              style={{
                padding: '1rem',
                background: config.heatLevel === level.level ? gradients.brand : colors.surface,
                border: `2px solid ${config.heatLevel === level.level ? colors.brandBorder : colors.border}`,
                borderRadius: borderRadius.md,
                cursor: saving ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                opacity: saving ? 0.7 : 1,
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}>
                <span style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: config.heatLevel === level.level ? colors.surface : colors.text,
                }}>
                  {level.name}
                </span>
                <span style={{
                  fontSize: '0.875rem',
                  color: config.heatLevel === level.level ? colors.surface : colors.textSecondary,
                }}>
                  Level {level.level}
                </span>
              </div>
              <p style={{
                fontSize: '0.875rem',
                color: config.heatLevel === level.level ? colors.surface : colors.textSecondary,
                margin: 0,
              }}>
                {level.description}
              </p>
            </button>
          ))}
        </div>

        {selectedHeatLevel && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: colors.surfaceAlt,
            borderRadius: borderRadius.md,
          }}>
            <p style={{
              fontSize: '0.75rem',
              color: colors.textSecondary,
              margin: '0 0 0.5rem 0',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}>
              Reader Expectations
            </p>
            <ul style={{
              fontSize: '0.875rem',
              color: colors.text,
              margin: 0,
              paddingLeft: '1.25rem',
            }}>
              {selectedHeatLevel.readerExpectations.map((expectation, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>{expectation}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Sensuality Focus */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: colors.text,
          display: 'block',
          marginBottom: '0.75rem',
        }}>
          Sensuality Focus
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
          {ROMANCE_SENSUALITY_FOCUS.map(focus => (
            <button
              key={focus.value}
              onClick={() => saveSettings({ sensualityFocus: focus.value })}
              disabled={saving}
              style={{
                padding: '0.75rem',
                background: config.sensualityFocus === focus.value ? gradients.brand : colors.surface,
                border: `1px solid ${config.sensualityFocus === focus.value ? colors.brandBorder : colors.border}`,
                borderRadius: borderRadius.md,
                cursor: saving ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: config.sensualityFocus === focus.value ? colors.surface : colors.text,
              }}>
                {focus.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Content Warnings */}
      <div>
        <label style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: colors.text,
          display: 'block',
          marginBottom: '0.75rem',
        }}>
          Content Warnings (Optional)
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
          {ROMANCE_CONTENT_WARNINGS.map(warning => (
            <button
              key={warning.value}
              onClick={() => toggleContentWarning(warning.value)}
              disabled={saving}
              style={{
                padding: '0.5rem 0.75rem',
                background: config.contentWarnings.includes(warning.value) ? colors.brandLight : colors.surface,
                border: `1px solid ${config.contentWarnings.includes(warning.value) ? colors.brandBorder : colors.border}`,
                borderRadius: borderRadius.sm,
                cursor: saving ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                fontSize: '0.8125rem',
                color: config.contentWarnings.includes(warning.value) ? colors.brandText : colors.text,
              }}
            >
              {warning.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
