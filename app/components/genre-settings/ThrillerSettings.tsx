'use client';

import { useState, useEffect } from 'react';
import { colors, borderRadius, gradients } from '@/app/lib/constants';
import { card } from '@/app/lib/styles';
import { THRILLER_PACING_STYLES, CLIFFHANGER_FREQUENCY } from '@/app/lib/genre-data/thriller-pacing';

interface ThrillerSettingsProps {
  projectId: string;
}

interface ThrillerConfig {
  pacingStyle: string;
  chapterHookRequired: boolean;
  cliffhangerFrequency: string;
  actionSceneRatio: number;
  averageChapterTension: number;
}

export default function ThrillerSettings({ projectId }: ThrillerSettingsProps) {
  const [config, setConfig] = useState<ThrillerConfig | null>(null);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${projectId}/thriller-pacing`, {
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
          pacingStyle: 'escalating',
          chapterHookRequired: true,
          cliffhangerFrequency: 'most',
          actionSceneRatio: 0.3,
          averageChapterTension: 7,
        });
      } else {
        throw new Error('Failed to fetch thriller settings');
      }
    } catch (err: any) {
      console.error('Error fetching thriller settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updates: Partial<ThrillerConfig>) => {
    if (!config) return;

    const newConfig = { ...config, ...updates };
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('novelforge_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${projectId}/thriller-pacing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error('Failed to save thriller settings');
      }

      const data = await response.json();
      setConfig(data);
    } catch (err: any) {
      console.error('Error saving thriller settings:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...card, padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: colors.textSecondary }}>Loading thriller settings...</p>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  const selectedPacing = THRILLER_PACING_STYLES.find(p => p.id === config.pacingStyle);

  return (
    <div style={{ ...card, padding: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: colors.text, marginBottom: '0.5rem' }}>
        Thriller Settings
      </h3>
      <p style={{ fontSize: '0.875rem', color: colors.textSecondary, marginBottom: '1.5rem' }}>
        Configure pacing style and tension settings for your thriller
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

      {/* Pacing Style */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: colors.text,
          display: 'block',
          marginBottom: '0.75rem',
        }}>
          Pacing Style
        </label>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {THRILLER_PACING_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => saveSettings({ pacingStyle: style.id })}
              disabled={saving}
              style={{
                padding: '1rem',
                background: config.pacingStyle === style.id ? gradients.brand : colors.surface,
                border: `2px solid ${config.pacingStyle === style.id ? colors.brandBorder : colors.border}`,
                borderRadius: borderRadius.md,
                cursor: saving ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                opacity: saving ? 0.7 : 1,
              }}
            >
              <div style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: config.pacingStyle === style.id ? colors.surface : colors.text,
                marginBottom: '0.5rem',
              }}>
                {style.name}
              </div>
              <p style={{
                fontSize: '0.875rem',
                color: config.pacingStyle === style.id ? colors.surface : colors.textSecondary,
                margin: 0,
              }}>
                {style.description}
              </p>
            </button>
          ))}
        </div>

        {selectedPacing && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: colors.surfaceAlt,
            borderRadius: borderRadius.md,
          }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <p style={{
                fontSize: '0.75rem',
                color: colors.textSecondary,
                margin: '0 0 0.25rem 0',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}>
                Tension Curve
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: colors.text,
                margin: 0,
              }}>
                {selectedPacing.tensionCurve}
              </p>
            </div>
            <div>
              <p style={{
                fontSize: '0.75rem',
                color: colors.textSecondary,
                margin: '0 0 0.25rem 0',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}>
                Best For
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: colors.text,
                margin: 0,
              }}>
                {selectedPacing.bestFor.join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cliffhanger Frequency */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: colors.text,
          display: 'block',
          marginBottom: '0.75rem',
        }}>
          Cliffhanger Frequency
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
          {CLIFFHANGER_FREQUENCY.map(freq => (
            <button
              key={freq.value}
              onClick={() => saveSettings({ cliffhangerFrequency: freq.value })}
              disabled={saving}
              style={{
                padding: '0.75rem',
                background: config.cliffhangerFrequency === freq.value ? gradients.brand : colors.surface,
                border: `1px solid ${config.cliffhangerFrequency === freq.value ? colors.brandBorder : colors.border}`,
                borderRadius: borderRadius.md,
                cursor: saving ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: config.cliffhangerFrequency === freq.value ? colors.surface : colors.text,
              }}>
                {freq.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chapter Hook Required */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={config.chapterHookRequired}
            onChange={(e) => saveSettings({ chapterHookRequired: e.target.checked })}
            disabled={saving}
            style={{
              width: '18px',
              height: '18px',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          />
          <div>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: colors.text,
            }}>
              Require Chapter Hooks
            </div>
            <div style={{
              fontSize: '0.8125rem',
              color: colors.textSecondary,
            }}>
              Every chapter should end with a hook or cliffhanger
            </div>
          </div>
        </label>
      </div>

      {/* Tension Level Slider */}
      <div>
        <label style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: colors.text,
          display: 'block',
          marginBottom: '0.5rem',
        }}>
          Average Chapter Tension: {config.averageChapterTension}/10
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={config.averageChapterTension}
          onChange={(e) => saveSettings({ averageChapterTension: parseInt(e.target.value) })}
          disabled={saving}
          style={{
            width: '100%',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: colors.textSecondary,
          marginTop: '0.25rem',
        }}>
          <span>Low Tension</span>
          <span>High Tension</span>
        </div>
      </div>
    </div>
  );
}
