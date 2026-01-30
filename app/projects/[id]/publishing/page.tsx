'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import PenNameSelect from '@/app/components/pen-names/PenNameSelect';
import { getToken } from '../../../lib/auth';
import { colors, typography, spacing, borderRadius } from '../../../lib/design-tokens';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PublishingSettings {
  dedication: string | null;
  epigraph: string | null;
  epigraph_attribution: string | null;
  isbn: string | null;
  publisher: string | null;
  edition: string | null;
  copyright_year: number | null;
  include_dramatis_personae: boolean;
  include_about_author: boolean;
}

interface Project {
  id: string;
  title: string;
  author_name?: string | null;
  status?: string;
}

export default function PublishingSettingsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [penNameId, setPenNameId] = useState<string>('');
  const [dedication, setDedication] = useState('');
  const [epigraph, setEpigraph] = useState('');
  const [epigraphAttribution, setEpigraphAttribution] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publisher, setPublisher] = useState('');
  const [edition, setEdition] = useState('First Edition');
  const [copyrightYear, setCopyrightYear] = useState<number>(new Date().getFullYear());
  const [includeDramatisPersonae, setIncludeDramatisPersonae] = useState(true);
  const [includeAboutAuthor, setIncludeAboutAuthor] = useState(true);

  // Query Letter & Synopsis state
  const [activeTab, setActiveTab] = useState<'settings' | 'query-letter' | 'synopsis'>('settings');
  const [queryLetter, setQueryLetter] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [generatingQueryLetter, setGeneratingQueryLetter] = useState(false);
  const [generatingSynopsis, setGeneratingSynopsis] = useState(false);

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

      // Populate form with existing values
      setPenNameId(data.pen_name_id || '');
      setDedication(data.dedication || '');
      setEpigraph(data.epigraph || '');
      setEpigraphAttribution(data.epigraph_attribution || '');
      setIsbn(data.isbn || '');
      setPublisher(data.publisher || '');
      setEdition(data.edition || 'First Edition');
      setCopyrightYear(data.copyright_year || new Date().getFullYear());
      setIncludeDramatisPersonae(data.include_dramatis_personae !== 0);
      setIncludeAboutAuthor(data.include_about_author !== 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load project');
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
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          penNameId: penNameId || null,
          dedication: dedication || null,
          epigraph: epigraph || null,
          epigraphAttribution: epigraphAttribution || null,
          isbn: isbn || null,
          publisher: publisher || null,
          edition: edition || null,
          copyrightYear: copyrightYear || null,
          includeDramatisPersonae,
          includeAboutAuthor,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save publishing settings');
      }

      setSuccessMessage('Publishing settings saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save publishing settings');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkComplete = async () => {
    setMarkingComplete(true);
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
          status: 'completed',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark book as completed');
      }

      const updatedProject = await response.json();
      setProject(updatedProject);
      setSuccessMessage('Book marked as completed! It will now appear in your Completed Novels.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to mark book as completed');
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleRevertToDraft = async () => {
    setMarkingComplete(true);
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
          status: 'draft',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to revert book to draft');
      }

      const updatedProject = await response.json();
      setProject(updatedProject);
      setSuccessMessage('Book reverted to draft status.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to revert book to draft');
    } finally {
      setMarkingComplete(false);
    }
  };

  const generateQueryLetter = async () => {
    setGeneratingQueryLetter(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/publishing/${projectId}/query-letter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate query letter');
      }

      const data = await response.json();
      setQueryLetter(data.queryLetter);
      setSuccessMessage('Query letter generated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to generate query letter');
    } finally {
      setGeneratingQueryLetter(false);
    }
  };

  const generateSynopsis = async () => {
    setGeneratingSynopsis(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/publishing/${projectId}/synopsis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate synopsis');
      }

      const data = await response.json();
      setSynopsis(data.synopsis);
      setSuccessMessage('Synopsis generated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to generate synopsis');
    } finally {
      setGeneratingSynopsis(false);
    }
  };

  const isCompleted = project?.status === 'completed' || project?.status === 'published';

  return (
    <DashboardLayout
      header={{
        title: 'Publishing Settings',
        subtitle: project?.title ? `Configure front and back matter for "${project.title}"` : 'Configure publishing options',
      }}
      projectId={projectId}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: spacing[2],
          borderBottom: `2px solid ${colors.border.default}`,
        }}>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: `${spacing[3]} ${spacing[4]}`,
              border: 'none',
              borderBottom: `3px solid ${activeTab === 'settings' ? colors.brand.primary : 'transparent'}`,
              background: activeTab === 'settings' ? 'rgba(102, 126, 234, 0.08)' : 'transparent',
              color: activeTab === 'settings' ? colors.brand.primary : colors.text.secondary,
              fontSize: typography.fontSize.sm,
              fontWeight: activeTab === 'settings' ? typography.fontWeight.semibold : typography.fontWeight.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            📄 Settings
          </button>
          <button
            onClick={() => setActiveTab('query-letter')}
            style={{
              padding: `${spacing[3]} ${spacing[4]}`,
              border: 'none',
              borderBottom: `3px solid ${activeTab === 'query-letter' ? colors.brand.primary : 'transparent'}`,
              background: activeTab === 'query-letter' ? 'rgba(102, 126, 234, 0.08)' : 'transparent',
              color: activeTab === 'query-letter' ? colors.brand.primary : colors.text.secondary,
              fontSize: typography.fontSize.sm,
              fontWeight: activeTab === 'query-letter' ? typography.fontWeight.semibold : typography.fontWeight.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            ✉️ Query Letter
          </button>
          <button
            onClick={() => setActiveTab('synopsis')}
            style={{
              padding: `${spacing[3]} ${spacing[4]}`,
              border: 'none',
              borderBottom: `3px solid ${activeTab === 'synopsis' ? colors.brand.primary : 'transparent'}`,
              background: activeTab === 'synopsis' ? 'rgba(102, 126, 234, 0.08)' : 'transparent',
              color: activeTab === 'synopsis' ? colors.brand.primary : colors.text.secondary,
              fontSize: typography.fontSize.sm,
              fontWeight: activeTab === 'synopsis' ? typography.fontWeight.semibold : typography.fontWeight.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            📋 Synopsis
          </button>
        </div>

        {/* Main Content */}
        <div style={{ maxWidth: '800px' }}>
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

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: 'center', padding: spacing[12], color: colors.text.tertiary }}>
              Loading publishing settings...
            </div>
          )}

          {!loading && activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>

              {/* Ready for Publishing Card - First Card */}
              <div style={{
                background: isCompleted ? '#D1FAE5' : colors.background.surface,
                border: `1px solid ${isCompleted ? '#6EE7B7' : colors.border.default}`,
                borderRadius: borderRadius.xl,
                padding: spacing[6],
              }}>
                <h2 style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: isCompleted ? '#059669' : colors.text.primary,
                  margin: 0,
                  marginBottom: spacing[4],
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                }}>
                  <span>{isCompleted ? '✅' : '📤'}</span> {isCompleted ? 'Book Completed' : 'Ready for Publishing?'}
                </h2>

                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: isCompleted ? '#065F46' : colors.text.tertiary,
                  margin: 0,
                  marginBottom: spacing[4],
                  lineHeight: typography.lineHeight.relaxed,
                }}>
                  {isCompleted
                    ? 'This book has been marked as completed and appears in your Completed Novels section. You can still edit it or revert to draft status if needed.'
                    : 'Once your novel is finished and you\'re happy with all the content, mark it as completed. Completed novels will be removed from the Books in Progress list and moved to Completed Novels.'
                  }
                </p>

                <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
                  {isCompleted ? (
                    <button
                      onClick={handleRevertToDraft}
                      disabled={markingComplete}
                      style={{
                        padding: `${spacing[3]} ${spacing[6]}`,
                        background: colors.background.primary,
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.lg,
                        color: colors.text.secondary,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        cursor: markingComplete ? 'not-allowed' : 'pointer',
                        opacity: markingComplete ? 0.6 : 1,
                      }}
                    >
                      {markingComplete ? 'Updating...' : 'Revert to Draft'}
                    </button>
                  ) : (
                    <button
                      onClick={handleMarkComplete}
                      disabled={markingComplete}
                      style={{
                        padding: `${spacing[3]} ${spacing[6]}`,
                        background: markingComplete ? colors.text.disabled : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        border: 'none',
                        borderRadius: borderRadius.lg,
                        color: colors.white,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.semibold,
                        cursor: markingComplete ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[2],
                      }}
                    >
                      {markingComplete ? 'Updating...' : '✓ Mark Book as Completed'}
                    </button>
                  )}
                </div>
              </div>

              {/* Front Matter Section */}
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
                  <span>📖</span> Front Matter
                </h2>

                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.tertiary,
                  margin: 0,
                  marginBottom: spacing[4],
                }}>
                  These pages appear before your story begins.
                </p>

                {/* Dedication */}
                <div style={{ marginBottom: spacing[4] }}>
                  <label style={{
                    display: 'block',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                    marginBottom: spacing[2],
                  }}>
                    Dedication (Optional)
                  </label>
                  <textarea
                    value={dedication}
                    onChange={(e) => setDedication(e.target.value)}
                    placeholder="For my family, who believed in me from the start..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: spacing[3],
                      border: `1px solid ${colors.border.default}`,
                      borderRadius: borderRadius.md,
                      fontSize: typography.fontSize.sm,
                      fontStyle: 'italic',
                      resize: 'vertical',
                    }}
                  />
                </div>

                {/* Epigraph */}
                <div style={{ marginBottom: spacing[4] }}>
                  <label style={{
                    display: 'block',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                    marginBottom: spacing[2],
                  }}>
                    Epigraph Quote (Optional)
                  </label>
                  <textarea
                    value={epigraph}
                    onChange={(e) => setEpigraph(e.target.value)}
                    placeholder="&quot;It is a truth universally acknowledged...&quot;"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: spacing[3],
                      border: `1px solid ${colors.border.default}`,
                      borderRadius: borderRadius.md,
                      fontSize: typography.fontSize.sm,
                      fontStyle: 'italic',
                      resize: 'vertical',
                    }}
                  />
                </div>

                {/* Epigraph Attribution */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                    marginBottom: spacing[2],
                  }}>
                    Epigraph Attribution
                  </label>
                  <input
                    type="text"
                    value={epigraphAttribution}
                    onChange={(e) => setEpigraphAttribution(e.target.value)}
                    placeholder="— Jane Austen, Pride and Prejudice"
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

              {/* Copyright & ISBN Section */}
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
                  <span>©</span> Copyright Page
                </h2>

                {/* Pen Name Selection */}
                <div style={{ marginBottom: spacing[6] }}>
                  <label style={{
                    display: 'block',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                    marginBottom: spacing[2],
                  }}>
                    Pen Name (Optional)
                  </label>
                  <p style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.text.tertiary,
                    margin: `0 0 ${spacing[3]} 0`,
                  }}>
                    Choose which pen name to publish this book under
                  </p>
                  <PenNameSelect
                    value={penNameId}
                    onChange={setPenNameId}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      Copyright Year
                    </label>
                    <input
                      type="number"
                      value={copyrightYear}
                      onChange={(e) => setCopyrightYear(parseInt(e.target.value) || new Date().getFullYear())}
                      min="1900"
                      max="2100"
                      style={{
                        width: '100%',
                        padding: spacing[3],
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      Edition
                    </label>
                    <input
                      type="text"
                      value={edition}
                      onChange={(e) => setEdition(e.target.value)}
                      placeholder="First Edition"
                      style={{
                        width: '100%',
                        padding: spacing[3],
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      ISBN (Optional)
                    </label>
                    <input
                      type="text"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                      placeholder="978-0-123456-78-9"
                      style={{
                        width: '100%',
                        padding: spacing[3],
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      Publisher (Optional)
                    </label>
                    <input
                      type="text"
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                      placeholder="Self-Published"
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

              {/* Back Matter Section */}
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
                  <span>📚</span> Back Matter
                </h2>

                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.tertiary,
                  margin: 0,
                  marginBottom: spacing[4],
                }}>
                  These pages appear after your story ends.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[3],
                    padding: spacing[4],
                    background: colors.background.primary,
                    borderRadius: borderRadius.lg,
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={includeDramatisPersonae}
                      onChange={(e) => setIncludeDramatisPersonae(e.target.checked)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                      }}>
                        Include Dramatis Personae (Character List)
                      </div>
                      <div style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.tertiary,
                      }}>
                        A list of characters with descriptions, grouped by role
                      </div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[3],
                    padding: spacing[4],
                    background: colors.background.primary,
                    borderRadius: borderRadius.lg,
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={includeAboutAuthor}
                      onChange={(e) => setIncludeAboutAuthor(e.target.checked)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                      }}>
                        Include About the Author
                      </div>
                      <div style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.tertiary,
                      }}>
                        Your author bio and photo from{' '}
                        <Link href="/settings/author-profile" style={{ color: colors.brand.primary }}>
                          Author Profile settings
                        </Link>
                      </div>
                    </div>
                  </label>
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
                  <strong>Publishing Tip:</strong> The exported PDF will automatically include a
                  Table of Contents with page numbers. Page numbers use Roman numerals (i, ii, iii)
                  for front matter and Arabic numerals (1, 2, 3) for the main content.
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
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Query Letter Tab */}
          {!loading && activeTab === 'query-letter' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
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
                  <span>✉️</span> Query Letter
                </h2>

                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.tertiary,
                  margin: 0,
                  marginBottom: spacing[4],
                  lineHeight: typography.lineHeight.relaxed,
                }}>
                  Generate a professional query letter for literary agents. The letter will include a compelling hook, brief synopsis, author bio, and genre/word count details.
                </p>

                <button
                  onClick={generateQueryLetter}
                  disabled={generatingQueryLetter}
                  style={{
                    padding: `${spacing[3]} ${spacing[6]}`,
                    background: generatingQueryLetter ? colors.text.disabled : colors.brand.gradient,
                    border: 'none',
                    borderRadius: borderRadius.lg,
                    color: colors.white,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    cursor: generatingQueryLetter ? 'not-allowed' : 'pointer',
                    marginBottom: spacing[4],
                  }}
                >
                  {generatingQueryLetter ? 'Generating...' : 'Generate Query Letter'}
                </button>

                {queryLetter && (
                  <textarea
                    value={queryLetter}
                    onChange={(e) => setQueryLetter(e.target.value)}
                    rows={20}
                    style={{
                      width: '100%',
                      padding: spacing[4],
                      border: `1px solid ${colors.border.default}`,
                      borderRadius: borderRadius.md,
                      fontSize: typography.fontSize.sm,
                      fontFamily: typography.fontFamily.base,
                      lineHeight: typography.lineHeight.relaxed,
                      resize: 'vertical',
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Synopsis Tab */}
          {!loading && activeTab === 'synopsis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
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
                  <span>📋</span> Synopsis
                </h2>

                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.tertiary,
                  margin: 0,
                  marginBottom: spacing[4],
                  lineHeight: typography.lineHeight.relaxed,
                }}>
                  Generate a comprehensive 1-2 page synopsis of your novel. This includes the full story arc, character development, major plot points, and ending.
                </p>

                <button
                  onClick={generateSynopsis}
                  disabled={generatingSynopsis}
                  style={{
                    padding: `${spacing[3]} ${spacing[6]}`,
                    background: generatingSynopsis ? colors.text.disabled : colors.brand.gradient,
                    border: 'none',
                    borderRadius: borderRadius.lg,
                    color: colors.white,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    cursor: generatingSynopsis ? 'not-allowed' : 'pointer',
                    marginBottom: spacing[4],
                  }}
                >
                  {generatingSynopsis ? 'Generating...' : 'Generate Synopsis'}
                </button>

                {synopsis && (
                  <textarea
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    rows={25}
                    style={{
                      width: '100%',
                      padding: spacing[4],
                      border: `1px solid ${colors.border.default}`,
                      borderRadius: borderRadius.md,
                      fontSize: typography.fontSize.sm,
                      fontFamily: typography.fontFamily.base,
                      lineHeight: typography.lineHeight.relaxed,
                      resize: 'vertical',
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
