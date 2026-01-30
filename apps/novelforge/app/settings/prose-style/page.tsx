'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getToken } from '../../lib/auth';
import type { ProseStyle } from '../../../shared/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ProseStyleSettingsPage() {
  const [proseStyle, setProseStyle] = useState<Partial<ProseStyle>>({
    name: 'Default Prose Style',
    sentence_length_preference: 'varied',
    sentence_complexity: 'moderate',
    sentence_variety_score: 0.7,
    target_reading_level: 'general',
    flesch_kincaid_target: 70.0,
    formality_level: 'moderate',
    voice_tone: 'neutral',
    narrative_distance: 'close',
    vocabulary_complexity: 'moderate',
    use_metaphors: true,
    use_similes: true,
    default_pacing: 'moderate',
    scene_transition_style: 'smooth',
    paragraph_length_preference: 'varied',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchProseStyle();
  }, []);

  const fetchProseStyle = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/user-settings/prose-style`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.proseStyle) {
          setProseStyle(data.proseStyle);
        }
      }
    } catch (err: any) {
      console.error('Error fetching prose style:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/user-settings/prose-style`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(proseStyle),
      });

      if (!response.ok) {
        throw new Error('Failed to save prose style settings');
      }

      setSuccessMessage('Prose style settings saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save prose style settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setProseStyle({
      name: 'Default Prose Style',
      sentence_length_preference: 'varied',
      sentence_complexity: 'moderate',
      sentence_variety_score: 0.7,
      target_reading_level: 'general',
      flesch_kincaid_target: 70.0,
      formality_level: 'moderate',
      voice_tone: 'neutral',
      narrative_distance: 'close',
      vocabulary_complexity: 'moderate',
      use_metaphors: true,
      use_similes: true,
      default_pacing: 'moderate',
      scene_transition_style: 'smooth',
      paragraph_length_preference: 'varied',
    });
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#F8FAFC',
    }}>
      {/* Left Sidebar */}
      <aside style={{
        width: '240px',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem',
      }}>
        <Link
          href="/settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '2rem',
            color: '#64748B',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          Back to Settings
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link
            href="/settings/genres"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Custom Genres
          </Link>
          <Link
            href="/settings/prose-style"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            Prose Style
          </Link>
          <Link
            href="/settings/exclusions"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Exclusions
          </Link>
          <Link
            href="/settings/recipes"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Genre Recipes
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <header style={{
          padding: '1rem 2rem',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1A1A2E',
              margin: 0,
            }}>
              Prose Style Settings
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Configure default writing style for new projects
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleReset}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '8px',
                color: '#64748B',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '0.75rem 1.5rem',
                background: saving ? '#94A3B8' : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Success Message */}
            {successMessage && (
              <div style={{
                background: '#D1FAE5',
                border: '1px solid #6EE7B7',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                color: '#10B981',
              }}>
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                color: '#DC2626',
              }}>
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                Loading prose style settings...
              </div>
            )}

            {!loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Sentence Structure */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                }}>
                  <h2 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1A1A2E',
                    margin: 0,
                    marginBottom: '1rem',
                  }}>
                    Sentence Structure
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem',
                      }}>
                        Sentence Length
                      </label>
                      <select
                        value={proseStyle.sentence_length_preference}
                        onChange={(e) => setProseStyle({ ...proseStyle, sentence_length_preference: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="short">Short (punchy, action-oriented)</option>
                        <option value="medium">Medium (balanced)</option>
                        <option value="long">Long (flowing, descriptive)</option>
                        <option value="varied">Varied (dynamic rhythm)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem',
                      }}>
                        Sentence Complexity
                      </label>
                      <select
                        value={proseStyle.sentence_complexity}
                        onChange={(e) => setProseStyle({ ...proseStyle, sentence_complexity: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="simple">Simple (straightforward)</option>
                        <option value="moderate">Moderate (some complexity)</option>
                        <option value="complex">Complex (sophisticated)</option>
                        <option value="varied">Varied (mixed)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem',
                      }}>
                        Variety Score: {proseStyle.sentence_variety_score?.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={proseStyle.sentence_variety_score}
                        onChange={(e) => setProseStyle({ ...proseStyle, sentence_variety_score: parseFloat(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                        Higher = more varied sentence structures
                      </p>
                    </div>
                  </div>
                </div>

                {/* Readability */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                }}>
                  <h2 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1A1A2E',
                    margin: 0,
                    marginBottom: '1rem',
                  }}>
                    Readability
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem',
                      }}>
                        Target Reading Level
                      </label>
                      <select
                        value={proseStyle.target_reading_level}
                        onChange={(e) => setProseStyle({ ...proseStyle, target_reading_level: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="8th_grade">8th Grade (very accessible)</option>
                        <option value="high_school">High School (accessible)</option>
                        <option value="general">General Adult (standard)</option>
                        <option value="literary">Literary (sophisticated)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem',
                      }}>
                        Flesch Reading Ease: {proseStyle.flesch_kincaid_target?.toFixed(0)} (0-100, higher = easier)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={proseStyle.flesch_kincaid_target}
                        onChange={(e) => setProseStyle({ ...proseStyle, flesch_kincaid_target: parseFloat(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Voice & Tone */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                }}>
                  <h2 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1A1A2E',
                    margin: 0,
                    marginBottom: '1rem',
                  }}>
                    Voice & Tone
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem',
                      }}>
                        Formality Level
                      </label>
                      <select
                        value={proseStyle.formality_level}
                        onChange={(e) => setProseStyle({ ...proseStyle, formality_level: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="casual">Casual</option>
                        <option value="moderate">Moderate</option>
                        <option value="formal">Formal</option>
                        <option value="literary">Literary</option>
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem',
                      }}>
                        Voice Tone
                      </label>
                      <select
                        value={proseStyle.voice_tone}
                        onChange={(e) => setProseStyle({ ...proseStyle, voice_tone: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="neutral">Neutral</option>
                        <option value="intimate">Intimate</option>
                        <option value="distant">Distant</option>
                        <option value="conversational">Conversational</option>
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem',
                      }}>
                        Narrative Distance
                      </label>
                      <select
                        value={proseStyle.narrative_distance}
                        onChange={(e) => setProseStyle({ ...proseStyle, narrative_distance: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="close">Close (deep POV)</option>
                        <option value="moderate">Moderate</option>
                        <option value="distant">Distant (omniscient)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Vocabulary & Style */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                }}>
                  <h2 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1A1A2E',
                    margin: 0,
                    marginBottom: '1rem',
                  }}>
                    Vocabulary & Style
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem',
                      }}>
                        Vocabulary Complexity
                      </label>
                      <select
                        value={proseStyle.vocabulary_complexity}
                        onChange={(e) => setProseStyle({ ...proseStyle, vocabulary_complexity: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="simple">Simple</option>
                        <option value="moderate">Moderate</option>
                        <option value="sophisticated">Sophisticated</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#374151',
                        cursor: 'pointer',
                      }}>
                        <input
                          type="checkbox"
                          checked={proseStyle.use_metaphors}
                          onChange={(e) => setProseStyle({ ...proseStyle, use_metaphors: e.target.checked })}
                          style={{ cursor: 'pointer' }}
                        />
                        Use Metaphors
                      </label>

                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#374151',
                        cursor: 'pointer',
                      }}>
                        <input
                          type="checkbox"
                          checked={proseStyle.use_similes}
                          onChange={(e) => setProseStyle({ ...proseStyle, use_similes: e.target.checked })}
                          style={{ cursor: 'pointer' }}
                        />
                        Use Similes
                      </label>
                    </div>
                  </div>
                </div>

                {/* Pacing & Structure */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                }}>
                  <h2 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1A1A2E',
                    margin: 0,
                    marginBottom: '1rem',
                  }}>
                    Pacing & Structure
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem',
                      }}>
                        Default Pacing
                      </label>
                      <select
                        value={proseStyle.default_pacing}
                        onChange={(e) => setProseStyle({ ...proseStyle, default_pacing: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="slow">Slow</option>
                        <option value="moderate">Moderate</option>
                        <option value="fast">Fast</option>
                        <option value="varied">Varied</option>
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem',
                      }}>
                        Scene Transition Style
                      </label>
                      <select
                        value={proseStyle.scene_transition_style}
                        onChange={(e) => setProseStyle({ ...proseStyle, scene_transition_style: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="abrupt">Abrupt</option>
                        <option value="smooth">Smooth</option>
                        <option value="cinematic">Cinematic</option>
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem',
                      }}>
                        Paragraph Length
                      </label>
                      <select
                        value={proseStyle.paragraph_length_preference}
                        onChange={(e) => setProseStyle({ ...proseStyle, paragraph_length_preference: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="short">Short</option>
                        <option value="medium">Medium</option>
                        <option value="long">Long</option>
                        <option value="varied">Varied</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div style={{
                  background: '#DBEAFE',
                  border: '1px solid #93C5FD',
                  borderRadius: '12px',
                  padding: '1rem',
                }}>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#1E40AF',
                    margin: 0,
                    lineHeight: 1.5,
                  }}>
                    These settings will be used as defaults for new projects. You can override them on a per-project basis in the project settings.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
