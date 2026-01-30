'use client';

import { useState, useEffect } from 'react';
import CollapsibleSection from './CollapsibleSection';
import {
  SCIFI_HARDNESS_LEVELS,
  TECH_EXPLANATION_DEPTHS,
  COMMON_SPECULATIVE_ELEMENTS,
  SCIFI_SUBGENRE_HARDNESS_DEFAULTS,
  type HardnessLevel,
  type TechExplanationDepth,
  type SpeculativeElement,
} from '../lib/genre-data';

interface SciFiSettings {
  hardnessLevel: string;
  techExplanationDepth: string;
  scientificAccuracyPriority: number;
  speculativeElements: string[];
  realScienceBasis: Array<{ area: string; sources: string; notes: string }>;
  handwaveAllowed: Array<{ area: string; reason: string }>;
}

interface ConsistencyValidation {
  consistent: boolean;
  issues: string[];
}

interface SpeculativeElementWithNotes {
  element: string;
  consistencyNotes: string;
  used: boolean;
}

interface Props {
  projectId: string;
  currentSubgenre?: string;
  onSettingsChange?: (settings: SciFiSettings) => void;
}

export default function SciFiConsistencyChecker({
  projectId,
  currentSubgenre,
  onSettingsChange,
}: Props) {
  // State
  const [settings, setSettings] = useState<SciFiSettings>({
    hardnessLevel: 'medium',
    techExplanationDepth: 'moderate',
    scientificAccuracyPriority: 5,
    speculativeElements: [],
    realScienceBasis: [],
    handwaveAllowed: [],
  });

  const [validation, setValidation] = useState<ConsistencyValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Speculative elements with checkboxes
  const [elementStates, setElementStates] = useState<
    Record<string, SpeculativeElementWithNotes>
  >({});

  // Custom element input
  const [customElement, setCustomElement] = useState('');
  const [customCategory, setCustomCategory] = useState('Custom');

  // Real science tracking
  const [newScienceArea, setNewScienceArea] = useState('');
  const [newScienceSources, setNewScienceSources] = useState('');
  const [newScienceNotes, setNewScienceNotes] = useState('');

  // Handwave tracking
  const [newHandwaveArea, setNewHandwaveArea] = useState('');
  const [newHandwaveReason, setNewHandwaveReason] = useState('');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [projectId]);

  // Validate when settings change
  useEffect(() => {
    if (!loading) {
      validateSettings();
    }
  }, [
    settings.hardnessLevel,
    settings.techExplanationDepth,
    settings.scientificAccuracyPriority,
  ]);

  // Initialize element states from common elements
  useEffect(() => {
    const initialStates: Record<string, SpeculativeElementWithNotes> = {};
    COMMON_SPECULATIVE_ELEMENTS.forEach((category) => {
      category.elements.forEach((element) => {
        initialStates[element] = {
          element,
          consistencyNotes: '',
          used: settings.speculativeElements.includes(element),
        };
      });
    });
    setElementStates(initialStates);
  }, [settings.speculativeElements]);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/scifi-settings`);

      if (response.status === 404) {
        // No settings yet - use defaults based on subgenre if available
        if (currentSubgenre && SCIFI_SUBGENRE_HARDNESS_DEFAULTS[currentSubgenre]) {
          const defaultHardness = SCIFI_SUBGENRE_HARDNESS_DEFAULTS[currentSubgenre];
          const hardnessData = SCIFI_HARDNESS_LEVELS.find((h) => h.id === defaultHardness);

          setSettings({
            ...settings,
            hardnessLevel: defaultHardness,
            scientificAccuracyPriority: hardnessData ? getTypicalAccuracy(defaultHardness) : 5,
          });
        }
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load sci-fi settings');
      }

      const data = await response.json();
      setSettings({
        hardnessLevel: data.hardnessLevel,
        techExplanationDepth: data.techExplanationDepth,
        scientificAccuracyPriority: data.scientificAccuracyPriority,
        speculativeElements: data.speculativeElements || [],
        realScienceBasis: data.realScienceBasis || [],
        handwaveAllowed: data.handwaveAllowed || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const validateSettings = async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/scifi-classification/validate`
      );

      if (response.ok) {
        const data = await response.json();
        setValidation(data);
      }
    } catch (err) {
      console.error('Validation error:', err);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);

    try {
      // Collect used speculative elements
      const usedElements = Object.values(elementStates)
        .filter((e) => e.used)
        .map((e) => e.element);

      // Save all settings in one call
      const response = await fetch(`/api/projects/${projectId}/scifi-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hardnessLevel: settings.hardnessLevel,
          techExplanationDepth: settings.techExplanationDepth,
          scientificAccuracyPriority: settings.scientificAccuracyPriority,
          speculativeElements: usedElements,
          realScienceBasis: settings.realScienceBasis,
          handwaveAllowed: settings.handwaveAllowed,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      // Reload to get updated data
      await loadSettings();
      await validateSettings();

      if (onSettingsChange) {
        onSettingsChange(settings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getTypicalAccuracy = (hardness: string): number => {
    const map: Record<string, number> = {
      hard: 9,
      firm: 7,
      medium: 5,
      soft: 3,
      science_fantasy: 1,
    };
    return map[hardness] || 5;
  };

  const handleHardnessChange = (newHardness: string) => {
    const typical = getTypicalAccuracy(newHardness);
    setSettings({
      ...settings,
      hardnessLevel: newHardness,
      scientificAccuracyPriority: typical,
    });
  };

  const toggleElement = (element: string) => {
    setElementStates({
      ...elementStates,
      [element]: {
        ...elementStates[element],
        used: !elementStates[element].used,
      },
    });
  };

  const updateElementNotes = (element: string, notes: string) => {
    setElementStates({
      ...elementStates,
      [element]: {
        ...elementStates[element],
        consistencyNotes: notes,
      },
    });
  };

  const addCustomElement = () => {
    if (!customElement.trim()) return;

    setElementStates({
      ...elementStates,
      [customElement]: {
        element: customElement,
        consistencyNotes: '',
        used: true,
      },
    });

    setCustomElement('');
  };

  const addScienceBasis = () => {
    if (!newScienceArea.trim()) return;

    setSettings({
      ...settings,
      realScienceBasis: [
        ...settings.realScienceBasis,
        {
          area: newScienceArea,
          sources: newScienceSources,
          notes: newScienceNotes,
        },
      ],
    });

    setNewScienceArea('');
    setNewScienceSources('');
    setNewScienceNotes('');
  };

  const removeScienceBasis = (index: number) => {
    setSettings({
      ...settings,
      realScienceBasis: settings.realScienceBasis.filter((_, i) => i !== index),
    });
  };

  const addHandwaveArea = () => {
    if (!newHandwaveArea.trim()) return;

    setSettings({
      ...settings,
      handwaveAllowed: [
        ...settings.handwaveAllowed,
        {
          area: newHandwaveArea,
          reason: newHandwaveReason,
        },
      ],
    });

    setNewHandwaveArea('');
    setNewHandwaveReason('');
  };

  const removeHandwaveArea = (index: number) => {
    setSettings({
      ...settings,
      handwaveAllowed: settings.handwaveAllowed.filter((_, i) => i !== index),
    });
  };

  const currentHardnessLevel = SCIFI_HARDNESS_LEVELS.find(
    (h) => h.id === settings.hardnessLevel
  );

  const currentTechDepth = TECH_EXPLANATION_DEPTHS.find(
    (d) => d.id === settings.techExplanationDepth
  );

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #E2E8F0',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }}
        />
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
        }}
      >
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 600 }}>
          Sci-Fi Worldbuilding Consistency Checker
        </h2>
        <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>
          Ensure your science fiction elements remain consistent with your chosen hardness
          level
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            marginBottom: '1rem',
            color: '#991B1B',
          }}
        >
          {error}
        </div>
      )}

      {/* Hardness Level Configuration */}
      <CollapsibleSection
        title="Hardness Level Configuration"
        description="Set reader expectations for scientific rigour"
        sectionId="scifi-hardness-config"
        defaultOpen={true}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Hardness Level Selector */}
          <div>
            <label
              style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              Hardness Level
            </label>
            <select
              value={settings.hardnessLevel}
              onChange={(e) => handleHardnessChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                fontSize: '0.875rem',
              }}
            >
              {SCIFI_HARDNESS_LEVELS.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </div>

          {/* Current Level Details */}
          {currentHardnessLevel && (
            <div
              style={{
                padding: '1rem',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
              }}
            >
              <h4
                style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#374151',
                }}
              >
                {currentHardnessLevel.name}
              </h4>
              <p
                style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.875rem',
                  color: '#64748B',
                }}
              >
                {currentHardnessLevel.description}
              </p>
              <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>
                <strong>Reader Expectation:</strong> {currentHardnessLevel.readerExpectation}
              </div>
              <div
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.8125rem',
                  color: '#64748B',
                }}
              >
                <strong>Example Authors:</strong>{' '}
                {currentHardnessLevel.exampleAuthors.join(', ')}
              </div>
              <div
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.8125rem',
                  color: '#64748B',
                }}
              >
                <strong>Tech Explanation:</strong> {currentHardnessLevel.techExplanation}
              </div>
            </div>
          )}

          {/* Tech Explanation Depth */}
          <div>
            <label
              style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              Technology Explanation Depth
            </label>
            <select
              value={settings.techExplanationDepth}
              onChange={(e) =>
                setSettings({ ...settings, techExplanationDepth: e.target.value })
              }
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
                fontSize: '0.875rem',
              }}
            >
              {TECH_EXPLANATION_DEPTHS.map((depth) => (
                <option key={depth.id} value={depth.id}>
                  {depth.name} - {depth.description}
                </option>
              ))}
            </select>
            {currentTechDepth && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  background: '#F1F5F9',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                  color: '#475569',
                }}
              >
                <strong>Word Budget:</strong> {currentTechDepth.wordBudget}
              </div>
            )}
          </div>

          {/* Scientific Accuracy Priority */}
          <div>
            <label
              style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              Scientific Accuracy Priority: {settings.scientificAccuracyPriority}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={settings.scientificAccuracyPriority}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  scientificAccuracyPriority: parseInt(e.target.value),
                })
              }
              style={{ width: '100%' }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#94A3B8',
                marginTop: '0.25rem',
              }}
            >
              <span>1 - Story First</span>
              <span>10 - Science First</span>
            </div>
          </div>

          {/* Subgenre Warning */}
          {currentSubgenre &&
            SCIFI_SUBGENRE_HARDNESS_DEFAULTS[currentSubgenre] &&
            SCIFI_SUBGENRE_HARDNESS_DEFAULTS[currentSubgenre] !==
              settings.hardnessLevel && (
              <div
                style={{
                  padding: '0.75rem',
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                  color: '#92400E',
                }}
              >
                <strong>Note:</strong> Your subgenre "{currentSubgenre}" typically uses{' '}
                {
                  SCIFI_HARDNESS_LEVELS.find(
                    (h) => h.id === SCIFI_SUBGENRE_HARDNESS_DEFAULTS[currentSubgenre]
                  )?.name
                }{' '}
                hardness. Current setting may not match reader expectations.
              </div>
            )}
        </div>
      </CollapsibleSection>

      {/* Consistency Validation */}
      {validation && (
        <CollapsibleSection
          title="Consistency Validation"
          description="Detected inconsistencies and warnings"
          sectionId="scifi-validation"
          defaultOpen={!validation.consistent}
          background={validation.consistent ? '#F0FDF4' : '#FEF2F2'}
          borderColor={validation.consistent ? '#86EFAC' : '#FCA5A5'}
        >
          {validation.consistent ? (
            <div style={{ padding: '0.5rem', color: '#166534', fontSize: '0.875rem' }}>
              ✓ Your settings are consistent with the chosen hardness level
            </div>
          ) : (
            <div>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#991B1B' }}>
                {validation.issues.map((issue, index) => (
                  <li key={index} style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Speculative Elements Tracker */}
      <CollapsibleSection
        title="Speculative Elements Tracker"
        description="Track which speculative technologies and concepts you're using"
        sectionId="scifi-elements"
        defaultOpen={false}
        count={Object.values(elementStates).filter((e) => e.used).length}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {COMMON_SPECULATIVE_ELEMENTS.map((category) => (
            <div key={category.category}>
              <h4
                style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: '#374151',
                }}
              >
                {category.category}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {category.elements.map((element) => (
                  <div
                    key={element}
                    style={{
                      padding: '0.75rem',
                      background: elementStates[element]?.used ? '#EEF2FF' : '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={elementStates[element]?.used || false}
                        onChange={() => toggleElement(element)}
                        style={{ marginTop: '0.125rem', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#374151',
                          }}
                        >
                          {element}
                        </div>
                        {elementStates[element]?.used && (
                          <input
                            type="text"
                            placeholder="Consistency notes (e.g., rules, limitations)..."
                            value={elementStates[element]?.consistencyNotes || ''}
                            onChange={(e) =>
                              updateElementNotes(element, e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '100%',
                              marginTop: '0.5rem',
                              padding: '0.5rem',
                              border: '1px solid #CBD5E1',
                              borderRadius: '4px',
                              fontSize: '0.8125rem',
                            }}
                          />
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Add Custom Element */}
          <div
            style={{
              padding: '1rem',
              background: '#F1F5F9',
              border: '1px dashed #94A3B8',
              borderRadius: '4px',
            }}
          >
            <h4
              style={{
                margin: '0 0 0.75rem 0',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
              }}
            >
              Add Custom Element
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Element name"
                value={customElement}
                onChange={(e) => setCustomElement(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomElement()}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}
              />
              <button
                onClick={addCustomElement}
                disabled={!customElement.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  background: customElement.trim() ? '#667eea' : '#CBD5E1',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: customElement.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Real Science Basis Tracking */}
      <CollapsibleSection
        title="Real Science Basis"
        description="Document the real science you're extrapolating from"
        sectionId="scifi-real-science"
        defaultOpen={false}
        count={settings.realScienceBasis.length}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {settings.realScienceBasis.map((science, index) => (
            <div
              key={index}
              style={{
                padding: '1rem',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '4px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem',
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: '#374151',
                  }}
                >
                  {science.area}
                </h4>
                <button
                  onClick={() => removeScienceBasis(index)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#FEE2E2',
                    color: '#991B1B',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
              {science.sources && (
                <div
                  style={{
                    fontSize: '0.8125rem',
                    color: '#64748B',
                    marginBottom: '0.5rem',
                  }}
                >
                  <strong>Sources:</strong> {science.sources}
                </div>
              )}
              {science.notes && (
                <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>
                  <strong>Notes:</strong> {science.notes}
                </div>
              )}
            </div>
          ))}

          {/* Add New Science Area */}
          <div
            style={{
              padding: '1rem',
              background: '#F1F5F9',
              border: '1px dashed #94A3B8',
              borderRadius: '4px',
            }}
          >
            <h4
              style={{
                margin: '0 0 0.75rem 0',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
              }}
            >
              Add Real Science Basis
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Science area (e.g., Quantum Mechanics, Relativity)"
                value={newScienceArea}
                onChange={(e) => setNewScienceArea(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}
              />
              <input
                type="text"
                placeholder="Sources/References (optional)"
                value={newScienceSources}
                onChange={(e) => setNewScienceSources(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}
              />
              <textarea
                placeholder="Notes (optional)"
                value={newScienceNotes}
                onChange={(e) => setNewScienceNotes(e.target.value)}
                rows={2}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <button
                onClick={addScienceBasis}
                disabled={!newScienceArea.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  background: newScienceArea.trim() ? '#667eea' : '#CBD5E1',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: newScienceArea.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Add Science Basis
              </button>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Handwave Areas */}
      <CollapsibleSection
        title="Handwave Areas"
        description="Mark areas where scientific accuracy is intentionally relaxed"
        sectionId="scifi-handwave"
        defaultOpen={false}
        count={settings.handwaveAllowed.length}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {settings.handwaveAllowed.length > 0 && (
            <div
              style={{
                padding: '0.75rem',
                background: '#FEF3C7',
                border: '1px solid #FCD34D',
                borderRadius: '4px',
                fontSize: '0.8125rem',
                color: '#92400E',
              }}
            >
              <strong>Note:</strong> Handwaving can be appropriate for your hardness level,
              but consistency matters. Apply the same rules throughout.
            </div>
          )}

          {settings.handwaveAllowed.map((handwave, index) => (
            <div
              key={index}
              style={{
                padding: '1rem',
                background: '#FEF9E7',
                border: '1px solid #FCD34D',
                borderRadius: '4px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem',
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: '#92400E',
                  }}
                >
                  {handwave.area}
                </h4>
                <button
                  onClick={() => removeHandwaveArea(index)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#FEE2E2',
                    color: '#991B1B',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
              {handwave.reason && (
                <div style={{ fontSize: '0.8125rem', color: '#92400E' }}>
                  <strong>Reason:</strong> {handwave.reason}
                </div>
              )}
            </div>
          ))}

          {/* Add New Handwave Area */}
          <div
            style={{
              padding: '1rem',
              background: '#F1F5F9',
              border: '1px dashed #94A3B8',
              borderRadius: '4px',
            }}
          >
            <h4
              style={{
                margin: '0 0 0.75rem 0',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
              }}
            >
              Add Handwave Area
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Area (e.g., FTL propulsion, Artificial gravity)"
                value={newHandwaveArea}
                onChange={(e) => setNewHandwaveArea(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}
              />
              <textarea
                placeholder="Reason for handwaving (optional)"
                value={newHandwaveReason}
                onChange={(e) => setNewHandwaveReason(e.target.value)}
                rows={2}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <button
                onClick={addHandwaveArea}
                disabled={!newHandwaveArea.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  background: newHandwaveArea.trim() ? '#667eea' : '#CBD5E1',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: newHandwaveArea.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Add Handwave Area
              </button>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Save Button */}
      <div
        style={{
          position: 'sticky',
          bottom: '1rem',
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <button
          onClick={saveSettings}
          disabled={saving}
          style={{
            width: '100%',
            padding: '0.75rem 1.5rem',
            background: saving ? '#CBD5E1' : '#667eea',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.9375rem',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
