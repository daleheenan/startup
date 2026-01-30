'use client';

import { useState, useEffect } from 'react';
import { colors, borderRadius, gradients } from '@/app/lib/constants';
import { card } from '@/app/lib/styles';
import { SCIFI_HARDNESS_LEVELS, TECH_EXPLANATION_DEPTHS } from '@/app/lib/genre-data/scifi-classification';

interface SciFiSettingsProps {
  projectId: string;
}

interface SciFiConfig {
  hardnessLevel: string;
  techExplanationDepth: string;
  scientificAccuracyPriority: number;
}

export default function SciFiSettings({ projectId }: SciFiSettingsProps) {
  const [config, setConfig] = useState<SciFiConfig | null>(null);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${projectId}/scifi-classification`, {
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
          hardnessLevel: 'medium',
          techExplanationDepth: 'moderate',
          scientificAccuracyPriority: 5,
        });
      } else {
        throw new Error('Failed to fetch sci-fi settings');
      }
    } catch (err: any) {
      console.error('Error fetching sci-fi settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updates: Partial<SciFiConfig>) => {
    if (!config) return;

    const newConfig = { ...config, ...updates };
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('novelforge_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects/${projectId}/scifi-classification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error('Failed to save sci-fi settings');
      }

      const data = await response.json();
      setConfig(data);
    } catch (err: any) {
      console.error('Error saving sci-fi settings:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...card, padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: colors.textSecondary }}>Loading sci-fi settings...</p>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  const selectedHardness = SCIFI_HARDNESS_LEVELS.find(h => h.id === config.hardnessLevel);
  const selectedDepth = TECH_EXPLANATION_DEPTHS.find(d => d.id === config.techExplanationDepth);

  return (
    <div style={{ ...card, padding: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: colors.text, marginBottom: '0.5rem' }}>
        Sci-Fi Settings
      </h3>
      <p style={{ fontSize: '0.875rem', color: colors.textSecondary, marginBottom: '1.5rem' }}>
        Configure scientific hardness and technology explanation levels
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

      {/* Hardness Level */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: colors.text,
          display: 'block',
          marginBottom: '0.75rem',
        }}>
          Science Fiction Hardness
        </label>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {SCIFI_HARDNESS_LEVELS.map(level => (
            <button
              key={level.id}
              onClick={() => saveSettings({ hardnessLevel: level.id })}
              disabled={saving}
              style={{
                padding: '1rem',
                background: config.hardnessLevel === level.id ? gradients.brand : colors.surface,
                border: `2px solid ${config.hardnessLevel === level.id ? colors.brandBorder : colors.border}`,
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
                color: config.hardnessLevel === level.id ? colors.surface : colors.text,
                marginBottom: '0.5rem',
              }}>
                {level.name}
              </div>
              <p style={{
                fontSize: '0.875rem',
                color: config.hardnessLevel === level.id ? colors.surface : colors.textSecondary,
                margin: 0,
              }}>
                {level.description}
              </p>
            </button>
          ))}
        </div>

        {selectedHardness && (
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
                Reader Expectations
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: colors.text,
                margin: 0,
              }}>
                {selectedHardness.readerExpectation}
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
                Example Authors
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: colors.text,
                margin: 0,
              }}>
                {selectedHardness.exampleAuthors.join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tech Explanation Depth */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: colors.text,
          display: 'block',
          marginBottom: '0.75rem',
        }}>
          Technology Explanation Depth
        </label>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {TECH_EXPLANATION_DEPTHS.map(depth => (
            <button
              key={depth.id}
              onClick={() => saveSettings({ techExplanationDepth: depth.id })}
              disabled={saving}
              style={{
                padding: '0.75rem 1rem',
                background: config.techExplanationDepth === depth.id ? colors.brandLight : colors.surface,
                border: `1px solid ${config.techExplanationDepth === depth.id ? colors.brandBorder : colors.border}`,
                borderRadius: borderRadius.md,
                cursor: saving ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: config.techExplanationDepth === depth.id ? colors.brandText : colors.text,
                marginBottom: '0.25rem',
              }}>
                {depth.name}
              </div>
              <p style={{
                fontSize: '0.8125rem',
                color: colors.textSecondary,
                margin: 0,
              }}>
                {depth.description}
              </p>
            </button>
          ))}
        </div>

        {selectedDepth && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: colors.surfaceAlt,
            borderRadius: borderRadius.md,
          }}>
            <p style={{
              fontSize: '0.75rem',
              color: colors.textSecondary,
              margin: '0 0 0.25rem 0',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}>
              Word Budget
            </p>
            <p style={{
              fontSize: '0.875rem',
              color: colors.text,
              margin: 0,
            }}>
              {selectedDepth.wordBudget}
            </p>
          </div>
        )}
      </div>

      {/* Scientific Accuracy Priority */}
      <div>
        <label style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: colors.text,
          display: 'block',
          marginBottom: '0.5rem',
        }}>
          Scientific Accuracy Priority: {config.scientificAccuracyPriority}/10
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={config.scientificAccuracyPriority}
          onChange={(e) => saveSettings({ scientificAccuracyPriority: parseInt(e.target.value) })}
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
          <span>Story First</span>
          <span>Science First</span>
        </div>
      </div>
    </div>
  );
}
