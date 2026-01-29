'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import ProjectNavigation from '../../../components/shared/ProjectNavigation';
import { getToken } from '../../../lib/auth';
import { colors, typography, spacing, borderRadius } from '../../../lib/design-tokens';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface StoryConcept {
  title: string;
  logline: string | null;
  synopsis: string | null;
  hook: string | null;
  protagonistHint: string | null;
  conflictType: string | null;
}

interface StoryDNA {
  genre: string;
  subgenre: string;
  tone: string;
  themes: string[];
  proseStyle: string;
  timeframe?: string;
}

interface Project {
  id: string;
  title: string;
  genre: string;
  story_concept?: StoryConcept | null;
  story_dna?: StoryDNA | null;
}

export default function EditStoryPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Story Concept form state
  const [title, setTitle] = useState('');
  const [logline, setLogline] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [hook, setHook] = useState('');
  const [protagonistHint, setProtagonistHint] = useState('');
  const [conflictType, setConflictType] = useState('');

  // Story DNA form state
  const [genre, setGenre] = useState('');
  const [subgenre, setSubgenre] = useState('');
  const [tone, setTone] = useState('');
  const [themes, setThemes] = useState('');
  const [proseStyle, setProseStyle] = useState('');
  const [timeframe, setTimeframe] = useState('');

  // AI Feedback state
  const [feedback, setFeedback] = useState('');
  const [aiChanges, setAiChanges] = useState<string[]>([]);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }

      const data = await response.json();
      setProject(data);

      // Populate Story Concept form
      const concept = data.story_concept || {};
      setTitle(concept.title || data.title || '');
      setLogline(concept.logline || '');
      setSynopsis(concept.synopsis || '');
      setHook(concept.hook || '');
      setProtagonistHint(concept.protagonistHint || '');
      setConflictType(concept.conflictType || '');

      // Populate Story DNA form
      const dna = data.story_dna || {};
      setGenre(dna.genre || data.genre || '');
      setSubgenre(dna.subgenre || '');
      setTone(dna.tone || '');
      setThemes(Array.isArray(dna.themes) ? dna.themes.join(', ') : '');
      setProseStyle(dna.proseStyle || '');
      setTimeframe(dna.timeframe || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const buildCurrentConcept = (): StoryConcept => ({
    title,
    logline: logline || null,
    synopsis: synopsis || null,
    hook: hook || null,
    protagonistHint: protagonistHint || null,
    conflictType: conflictType || null,
  });

  const buildCurrentDNA = (): StoryDNA => ({
    genre,
    subgenre,
    tone,
    themes: themes.split(',').map(t => t.trim()).filter(t => t.length > 0),
    proseStyle,
    timeframe: timeframe || undefined,
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          storyConcept: buildCurrentConcept(),
          storyDNA: buildCurrentDNA(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save story details');
      }

      setSuccessMessage('Story details saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save story details');
    } finally {
      setSaving(false);
    }
  };

  const handleAIRefine = async () => {
    if (!feedback.trim()) {
      setError('Please enter your feedback or instructions for AI refinement');
      return;
    }

    setRefining(true);
    setError(null);
    setSuccessMessage(null);
    setAiChanges([]);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/refine-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          feedback,
          currentConcept: buildCurrentConcept(),
          currentDNA: buildCurrentDNA(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to refine story');
      }

      const data = await response.json();

      // Update form with refined values
      if (data.refinedConcept) {
        setTitle(data.refinedConcept.title || title);
        setLogline(data.refinedConcept.logline || '');
        setSynopsis(data.refinedConcept.synopsis || '');
        setHook(data.refinedConcept.hook || '');
        setProtagonistHint(data.refinedConcept.protagonistHint || '');
        setConflictType(data.refinedConcept.conflictType || '');
      }

      if (data.refinedDNA) {
        setGenre(data.refinedDNA.genre || genre);
        setSubgenre(data.refinedDNA.subgenre || '');
        setTone(data.refinedDNA.tone || '');
        setThemes(Array.isArray(data.refinedDNA.themes) ? data.refinedDNA.themes.join(', ') : '');
        setProseStyle(data.refinedDNA.proseStyle || '');
        setTimeframe(data.refinedDNA.timeframe || '');
      }

      if (data.changes && data.changes.length > 0) {
        setAiChanges(data.changes);
      }

      setSuccessMessage('AI has refined your story! Review the changes below and save when ready.');
      setFeedback('');
    } catch (err: any) {
      setError(err.message || 'Failed to refine story with AI');
    } finally {
      setRefining(false);
    }
  };

  return (
    <DashboardLayout
      header={{
        title: 'Edit Story',
        subtitle: project?.title ? `Edit concept and DNA for "${project.title}"` : 'Edit story concept and DNA',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
        {/* Navigation - full width across top */}
        <div style={{ width: '100%' }}>
          <ProjectNavigation projectId={projectId} />
        </div>

        {/* Main Content */}
        <div style={{ maxWidth: '900px' }}>
          {/* Success Message */}
          {successMessage && (
            <div style={{
              background: '#D1FAE5',
              border: '1px solid #6EE7B7',
              borderRadius: borderRadius.lg,
              padding: spacing[4],
              marginBottom: spacing[6],
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
              borderRadius: borderRadius.lg,
              padding: spacing[4],
              marginBottom: spacing[6],
              color: '#DC2626',
            }}>
              {error}
            </div>
          )}

          {/* AI Changes Summary */}
          {aiChanges.length > 0 && (
            <div style={{
              background: '#EEF2FF',
              border: '1px solid #A5B4FC',
              borderRadius: borderRadius.lg,
              padding: spacing[4],
              marginBottom: spacing[6],
            }}>
              <h3 style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: '#4338CA',
                margin: 0,
                marginBottom: spacing[2],
              }}>
                AI Changes Made:
              </h3>
              <ul style={{
                margin: 0,
                paddingLeft: spacing[4],
                fontSize: typography.fontSize.sm,
                color: '#4338CA',
                lineHeight: typography.lineHeight.relaxed,
              }}>
                {aiChanges.map((change, index) => (
                  <li key={index}>{change}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: 'center', padding: spacing[12], color: colors.text.tertiary }}>
              Loading story details...
            </div>
          )}

          {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
              {/* AI Feedback Section - Prominent at top */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: borderRadius.xl,
                padding: spacing[6],
              }}>
                <h2 style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.white,
                  margin: 0,
                  marginBottom: spacing[2],
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                }}>
                  AI Story Refinement
                </h2>

                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: 'rgba(255, 255, 255, 0.9)',
                  margin: 0,
                  marginBottom: spacing[4],
                  lineHeight: typography.lineHeight.relaxed,
                }}>
                  Describe what you want to change about your story. AI will update the concept and DNA fields based on your feedback.
                </p>

                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g., 'Make the tone darker and more mysterious', 'Add a romantic subplot', 'Change the setting to Victorian England', 'Make the protagonist more conflicted about their goals'..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: spacing[4],
                    border: 'none',
                    borderRadius: borderRadius.lg,
                    fontSize: typography.fontSize.sm,
                    lineHeight: typography.lineHeight.relaxed,
                    resize: 'vertical',
                    fontFamily: typography.fontFamily.base,
                  }}
                />

                <div style={{ marginTop: spacing[4], display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleAIRefine}
                    disabled={refining || !feedback.trim()}
                    style={{
                      padding: `${spacing[3]} ${spacing[6]}`,
                      background: refining || !feedback.trim() ? 'rgba(255, 255, 255, 0.5)' : colors.white,
                      border: 'none',
                      borderRadius: borderRadius.lg,
                      color: refining || !feedback.trim() ? 'rgba(0, 0, 0, 0.4)' : '#667eea',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      cursor: refining || !feedback.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                    }}
                  >
                    {refining ? 'Refining...' : 'Refine with AI'}
                  </button>
                </div>
              </div>

              {/* Story Concept Section */}
              <div style={{
                background: colors.background.surface,
                border: `1px solid ${colors.border.default}`,
                borderRadius: borderRadius.xl,
                padding: spacing[6],
              }}>
                <h2 style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  margin: 0,
                  marginBottom: spacing[4],
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                }}>
                  Story Concept
                </h2>

                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.tertiary,
                  margin: 0,
                  marginBottom: spacing[4],
                }}>
                  The core idea and premise of your story.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
                  {/* Title */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Your story's title"
                      style={{
                        width: '100%',
                        padding: spacing[3],
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                      }}
                    />
                  </div>

                  {/* Logline */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      Logline
                    </label>
                    <textarea
                      value={logline}
                      onChange={(e) => setLogline(e.target.value)}
                      placeholder="A one or two sentence summary of your story..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: spacing[3],
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {/* Synopsis */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      Synopsis
                    </label>
                    <textarea
                      value={synopsis}
                      onChange={(e) => setSynopsis(e.target.value)}
                      placeholder="A detailed summary of your story's plot, characters, and major events..."
                      rows={6}
                      style={{
                        width: '100%',
                        padding: spacing[3],
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                        resize: 'vertical',
                        lineHeight: typography.lineHeight.relaxed,
                      }}
                    />
                  </div>

                  {/* Hook */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      Hook
                    </label>
                    <textarea
                      value={hook}
                      onChange={(e) => setHook(e.target.value)}
                      placeholder="What draws readers in? The compelling opening hook..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: spacing[3],
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {/* Two-column layout for smaller fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
                    {/* Protagonist Hint */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                        marginBottom: spacing[2],
                      }}>
                        Protagonist Hint
                      </label>
                      <input
                        type="text"
                        value={protagonistHint}
                        onChange={(e) => setProtagonistHint(e.target.value)}
                        placeholder="Brief protagonist description"
                        style={{
                          width: '100%',
                          padding: spacing[3],
                          border: `1px solid ${colors.border.default}`,
                          borderRadius: borderRadius.md,
                          fontSize: typography.fontSize.sm,
                        }}
                      />
                    </div>

                    {/* Conflict Type */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                        marginBottom: spacing[2],
                      }}>
                        Conflict Type
                      </label>
                      <input
                        type="text"
                        value={conflictType}
                        onChange={(e) => setConflictType(e.target.value)}
                        placeholder="e.g., man vs nature, man vs self"
                        style={{
                          width: '100%',
                          padding: spacing[3],
                          border: `1px solid ${colors.border.default}`,
                          borderRadius: borderRadius.md,
                          fontSize: typography.fontSize.sm,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Story DNA Section */}
              <div style={{
                background: colors.background.surface,
                border: `1px solid ${colors.border.default}`,
                borderRadius: borderRadius.xl,
                padding: spacing[6],
              }}>
                <h2 style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  margin: 0,
                  marginBottom: spacing[4],
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                }}>
                  Story DNA
                </h2>

                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.tertiary,
                  margin: 0,
                  marginBottom: spacing[4],
                }}>
                  The genetic makeup of your story - genre, tone, themes, and style.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
                  {/* Two-column layout */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
                    {/* Genre */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                        marginBottom: spacing[2],
                      }}>
                        Genre
                      </label>
                      <input
                        type="text"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        placeholder="e.g., Fantasy, Mystery, Romance"
                        style={{
                          width: '100%',
                          padding: spacing[3],
                          border: `1px solid ${colors.border.default}`,
                          borderRadius: borderRadius.md,
                          fontSize: typography.fontSize.sm,
                        }}
                      />
                    </div>

                    {/* Subgenre */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                        marginBottom: spacing[2],
                      }}>
                        Subgenre
                      </label>
                      <input
                        type="text"
                        value={subgenre}
                        onChange={(e) => setSubgenre(e.target.value)}
                        placeholder="e.g., Urban Fantasy, Cozy Mystery"
                        style={{
                          width: '100%',
                          padding: spacing[3],
                          border: `1px solid ${colors.border.default}`,
                          borderRadius: borderRadius.md,
                          fontSize: typography.fontSize.sm,
                        }}
                      />
                    </div>

                    {/* Tone */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                        marginBottom: spacing[2],
                      }}>
                        Tone
                      </label>
                      <input
                        type="text"
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        placeholder="e.g., Dark, Humorous, Suspenseful"
                        style={{
                          width: '100%',
                          padding: spacing[3],
                          border: `1px solid ${colors.border.default}`,
                          borderRadius: borderRadius.md,
                          fontSize: typography.fontSize.sm,
                        }}
                      />
                    </div>

                    {/* Timeframe */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                        marginBottom: spacing[2],
                      }}>
                        Timeframe
                      </label>
                      <input
                        type="text"
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        placeholder="e.g., 1920s, Medieval Era, Near Future"
                        style={{
                          width: '100%',
                          padding: spacing[3],
                          border: `1px solid ${colors.border.default}`,
                          borderRadius: borderRadius.md,
                          fontSize: typography.fontSize.sm,
                        }}
                      />
                    </div>
                  </div>

                  {/* Themes */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      Themes
                    </label>
                    <input
                      type="text"
                      value={themes}
                      onChange={(e) => setThemes(e.target.value)}
                      placeholder="Comma-separated: redemption, identity, sacrifice"
                      style={{
                        width: '100%',
                        padding: spacing[3],
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                      }}
                    />
                    <p style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.disabled,
                      margin: 0,
                      marginTop: spacing[1],
                    }}>
                      Separate multiple themes with commas
                    </p>
                  </div>

                  {/* Prose Style */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      Prose Style
                    </label>
                    <textarea
                      value={proseStyle}
                      onChange={(e) => setProseStyle(e.target.value)}
                      placeholder="Describe the writing style: e.g., 'Lyrical and descriptive with rich imagery' or 'Punchy, action-driven with short sentences'"
                      rows={2}
                      style={{
                        width: '100%',
                        padding: spacing[3],
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div style={{
                background: '#DBEAFE',
                border: '1px solid #93C5FD',
                borderRadius: borderRadius.xl,
                padding: spacing[4],
              }}>
                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: '#1E40AF',
                  margin: 0,
                  lineHeight: typography.lineHeight.relaxed,
                }}>
                  <strong>Tip:</strong> Changes to your story concept and DNA will influence future content generation,
                  including character development, plot points, and chapter writing. Make sure to save your changes after
                  reviewing AI refinements.
                </p>
              </div>

              {/* Save Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[4] }}>
                <Link
                  href={`/projects/${projectId}`}
                  style={{
                    padding: `${spacing[3]} ${spacing[6]}`,
                    background: colors.background.primary,
                    border: `1px solid ${colors.border.default}`,
                    borderRadius: borderRadius.lg,
                    color: colors.text.secondary,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  Cancel
                </Link>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: `${spacing[3]} ${spacing[6]}`,
                    background: saving ? colors.text.disabled : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: borderRadius.lg,
                    color: colors.white,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
