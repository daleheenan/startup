'use client';

import { useState, useEffect } from 'react';
import { colors, borderRadius } from '../lib/constants';
import { fetchJson, put } from '../lib/fetch-utils';
import {
  SCIFI_HARDNESS_LEVELS,
  TECH_EXPLANATION_DEPTHS,
  COMMON_SPECULATIVE_ELEMENTS,
  type HardnessLevel,
  type TechExplanationDepth,
  type SpeculativeElement
} from '../lib/genre-data';

interface SciFiSettingsData {
  id?: string;
  project_id: string;
  hardness_level: string;
  tech_explanation_depth: string;
  speculative_elements: string[];
  real_science_basis: Array<{
    element: string;
    scientific_basis: string;
    references?: string[];
  }>;
}

interface SciFiSettingsProps {
  projectId: string;
  onSettingsChange?: (settings: SciFiSettingsData) => void;
  isLoading?: boolean;
}

export default function SciFiSettings({
  projectId,
  onSettingsChange,
  isLoading = false,
}: SciFiSettingsProps) {
  const [settings, setSettings] = useState<SciFiSettingsData>({
    project_id: projectId,
    hardness_level: 'medium',
    tech_explanation_depth: 'moderate',
    speculative_elements: [],
    real_science_basis: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [projectId]);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchJson<{ settings: SciFiSettingsData }>(
        `/api/projects/${projectId}/genre-settings/scifi`
      );
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        // Settings don't exist yet - use defaults
        console.log('No existing sci-fi settings found, using defaults');
      } else {
        console.error('Error loading sci-fi settings:', err);
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
      const data = await put<{ settings: SciFiSettingsData }>(
        `/api/projects/${projectId}/genre-settings/scifi`,
        settings
      );

      if (data.settings) {
        setSettings(data.settings);
        onSettingsChange?.(data.settings);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err: any) {
      console.error('Error saving sci-fi settings:', err);
      setError(`Failed to save settings: ${err.message || 'Unknown error'}`);
      setSaveStatus('error');
    }
  };

  const handleHardnessLevelChange = (levelId: string) => {
    setSettings(prev => ({ ...prev, hardness_level: levelId }));
  };

  const handleTechExplanationDepthChange = (depthId: string) => {
    setSettings(prev => ({ ...prev, tech_explanation_depth: depthId }));
  };

  const handleSpeculativeElementToggle = (element: string) => {
    setSettings(prev => {
      const elements = prev.speculative_elements || [];
      if (elements.includes(element)) {
        return { ...prev, speculative_elements: elements.filter(e => e !== element) };
      } else {
        return { ...prev, speculative_elements: [...elements, element] };
      }
    });
  };

  const selectedHardness = SCIFI_HARDNESS_LEVELS.find(h => h.id === settings.hardness_level);
  const selectedDepth = TECH_EXPLANATION_DEPTHS.find(d => d.id === settings.tech_explanation_depth);

  if (loading) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: colors.textSecondary,
        }}
      >
        Loading sci-fi settings...
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
          Science Fiction Settings
        </h2>
        <p style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: 0 }}>
          Configure scientific rigour, technology explanation depth, and speculative elements for your sci-fi project.
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

      {/* Hardness Level Selector */}
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
          Hardness Level
        </h3>
        <p style={{ fontSize: '0.813rem', color: colors.textSecondary, margin: '0 0 1rem 0' }}>
          How rigorous should the science be? This sets reader expectations.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {SCIFI_HARDNESS_LEVELS.map((level) => {
            const isSelected = settings.hardness_level === level.id;
            return (
              <label
                key={level.id}
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
                    name="hardness_level"
                    value={level.id}
                    checked={isSelected}
                    onChange={() => handleHardnessLevelChange(level.id)}
                    disabled={isLoading}
                    style={{ marginRight: '0.75rem', marginTop: '0.25rem' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.938rem', fontWeight: 600, color: colors.text, marginBottom: '0.25rem' }}>
                      {level.name}
                    </div>
                    <div style={{ fontSize: '0.813rem', color: colors.textSecondary, marginBottom: '0.5rem' }}>
                      {level.description}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                      <div><strong>Reader Expectation:</strong> {level.readerExpectation}</div>
                      <div><strong>Tech Explanation:</strong> {level.techExplanation}</div>
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {selectedHardness && (
          <div
            style={{
              padding: '1rem',
              background: colors.infoLight,
              border: `1px solid ${colors.infoBorder}`,
              borderRadius: borderRadius.md,
            }}
          >
            <div style={{ fontSize: '0.75rem', color: colors.textSecondary, marginBottom: '0.25rem' }}>
              <strong>Example Authors:</strong>
            </div>
            <div style={{ fontSize: '0.813rem', color: colors.text }}>
              {selectedHardness.exampleAuthors.join(', ')}
            </div>
          </div>
        )}
      </div>

      {/* Tech Explanation Depth */}
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
          Technology Explanation Depth
        </h3>
        <p style={{ fontSize: '0.813rem', color: colors.textSecondary, margin: '0 0 1rem 0' }}>
          How much detail should the AI provide when explaining technology?
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {TECH_EXPLANATION_DEPTHS.map((depth) => {
            const isSelected = settings.tech_explanation_depth === depth.id;
            return (
              <button
                key={depth.id}
                type="button"
                onClick={() => handleTechExplanationDepthChange(depth.id)}
                disabled={isLoading}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '1rem',
                  background: isSelected ? colors.brandStart : colors.background,
                  border: `2px solid ${isSelected ? colors.brandStart : colors.border}`,
                  borderRadius: borderRadius.md,
                  color: isSelected ? colors.surface : colors.text,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{depth.name}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                  {depth.description}
                </div>
                <div style={{ fontSize: '0.688rem', opacity: 0.8 }}>
                  {depth.wordBudget}
                </div>
              </button>
            );
          })}
        </div>

        {selectedDepth && (
          <div
            style={{
              padding: '1rem',
              background: colors.successLight,
              border: `1px solid ${colors.successBorder}`,
              borderRadius: borderRadius.md,
            }}
          >
            <div style={{ fontSize: '0.813rem', color: colors.textSecondary }}>
              <strong>Selected:</strong> {selectedDepth.name} - {selectedDepth.description}
            </div>
          </div>
        )}
      </div>

      {/* Speculative Elements Checklist */}
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
          Speculative Elements
        </h3>
        <p style={{ fontSize: '0.813rem', color: colors.textSecondary, margin: '0 0 1rem 0' }}>
          Select the speculative technologies and concepts featured in your story.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {COMMON_SPECULATIVE_ELEMENTS.map((category) => {
            const isExpanded = expandedCategory === category.category;
            const selectedCount = category.elements.filter(el =>
              settings.speculative_elements?.includes(el)
            ).length;

            return (
              <div
                key={category.category}
                style={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                  overflow: 'hidden',
                }}
              >
                {/* Category Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: colors.background,
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedCategory(isExpanded ? null : category.category)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.938rem', fontWeight: 600, color: colors.text }}>
                      {category.category}
                    </div>
                    {selectedCount > 0 && (
                      <span
                        style={{
                          fontSize: '0.688rem',
                          fontWeight: 600,
                          color: colors.surface,
                          background: colors.brandStart,
                          padding: '0.125rem 0.5rem',
                          borderRadius: '12px',
                        }}
                      >
                        {selectedCount} selected
                      </span>
                    )}
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
                    {isExpanded ? 'Hide' : 'Show'}
                  </button>
                </div>

                {/* Category Elements */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '1rem',
                      background: colors.surface,
                      borderTop: `1px solid ${colors.border}`,
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.5rem' }}>
                      {category.elements.map((element) => {
                        const isSelected = settings.speculative_elements?.includes(element);
                        return (
                          <label
                            key={element}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0.5rem',
                              background: isSelected ? colors.brandLight : 'transparent',
                              border: `1px solid ${isSelected ? colors.brandBorder : 'transparent'}`,
                              borderRadius: borderRadius.sm,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSpeculativeElementToggle(element)}
                              disabled={isLoading}
                              style={{ marginRight: '0.5rem' }}
                            />
                            <div style={{ fontSize: '0.813rem', color: colors.text }}>
                              {element}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {settings.speculative_elements && settings.speculative_elements.length > 0 && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              background: colors.brandLight,
              border: `1px solid ${colors.brandBorder}`,
              borderRadius: borderRadius.md,
            }}
          >
            <div style={{ fontSize: '0.813rem', fontWeight: 600, color: colors.text, marginBottom: '0.5rem' }}>
              Selected Elements: {settings.speculative_elements.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: colors.textSecondary, lineHeight: '1.6' }}>
              {settings.speculative_elements.join(', ')}
            </div>
          </div>
        )}
      </div>

      {/* Real Science Basis */}
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
          Real Science Basis
        </h3>
        <p style={{ fontSize: '0.813rem', color: colors.textSecondary, margin: '0 0 1rem 0' }}>
          Document the scientific foundations for your speculative elements.
        </p>

        {settings.real_science_basis && settings.real_science_basis.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {settings.real_science_basis.map((basis, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1rem',
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                }}
              >
                <div style={{ fontSize: '0.938rem', fontWeight: 600, color: colors.text, marginBottom: '0.25rem' }}>
                  {basis.element}
                </div>
                <div style={{ fontSize: '0.813rem', color: colors.textSecondary, marginBottom: '0.5rem' }}>
                  {basis.scientific_basis}
                </div>
                {basis.references && basis.references.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: colors.textTertiary }}>
                    <strong>References:</strong> {basis.references.join(', ')}
                  </div>
                )}
              </div>
            ))}
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
            No scientific foundations documented yet. This helps maintain consistency and credibility.
          </div>
        )}
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
