'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ExportButtons from '../../components/ExportButtons';
import CloneBookDialog from '../../components/CloneBookDialog';
import DuplicateProjectDialog from '../../components/DuplicateProjectDialog';
import CoverImageUpload from '../../components/CoverImageUpload';
import SearchReplace from '../../components/SearchReplace';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import ProjectNavigation from '../../components/shared/ProjectNavigation';
import LoadingState from '../../components/shared/LoadingState';
import { fetchJson } from '../../lib/fetch-utils';
import { getToken } from '../../lib/auth';
import { colors, gradients, borderRadius } from '../../lib/constants';
import { card } from '../../lib/styles';
import { useProjectNavigation } from '@/app/hooks';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface StoryConcept {
  title: string;
  logline: string | null;
  synopsis: string | null;
  hook: string | null;
  protagonistHint: string | null;
  conflictType: string | null;
}

interface Project {
  id: string;
  title: string;
  type: string;
  genre: string;
  status: string;
  author_name?: string | null;
  story_concept: StoryConcept | null;
  story_dna: any;
  story_bible: any;
  series_bible: any;
  book_count: number;
  created_at: string;
  updated_at: string;
}

interface Outline {
  id: string;
  book_id: string;
  structure_type: string;
  structure: any;
  total_chapters: number;
}

interface Chapter {
  id: string;
  book_id: string;
  number: number;
  title: string;
  content?: string;
}

interface Job {
  id: string;
  type: string;
  target_id: string;
  status: 'pending' | 'running' | 'completed' | 'paused' | 'failed';
  chapter_number?: number;
  chapter_title?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface JobStats {
  pending: number;
  running: number;
  completed: number;
  paused: number;
  failed: number;
  jobs: Job[];
}

export default function ProjectDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<{
    characters: 'pending' | 'generating' | 'done' | 'error';
    world: 'pending' | 'generating' | 'done' | 'error';
    plots: 'pending' | 'generating' | 'done' | 'error';
  }>({ characters: 'pending', world: 'pending', plots: 'pending' });

  // Job status state
  const [jobStats, setJobStats] = useState<JobStats | null>(null);

  // Editing state for book details
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(false);
  const [editingType, setEditingType] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [authorValue, setAuthorValue] = useState('');
  const [typeValue, setTypeValue] = useState<'standalone' | 'trilogy' | 'series'>('standalone');
  const [saving, setSaving] = useState(false);

  // Editing state for Story Concept
  const [editingConcept, setEditingConcept] = useState(false);
  const [conceptValues, setConceptValues] = useState<StoryConcept>({
    title: '',
    logline: null,
    synopsis: null,
    hook: null,
    protagonistHint: null,
    conflictType: null,
  });

  // Editing state for Story DNA
  const [editingDNA, setEditingDNA] = useState(false);
  const [dnaValues, setDnaValues] = useState<any>({
    tone: '',
    themes: [],
    proseStyle: { pointOfView: '' },
  });

  // Clone dialog state
  const [showCloneDialog, setShowCloneDialog] = useState(false);

  // Duplicate project dialog state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  // IMPORTANT: All hooks must be called before any early returns
  const navigation = useProjectNavigation(projectId, project, outline, chapters);

  // Track if we've already attempted generation to prevent duplicate runs
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);

  // Check if we're coming from concept selection (forced auto-generation)
  const forceAutoGenerate = searchParams.get('autoGenerate') === 'true';

  // Initialize edit values when project loads
  useEffect(() => {
    if (project) {
      setTitleValue(project.title || '');
      setAuthorValue(project.author_name || '');
      setTypeValue((project.type as 'standalone' | 'trilogy' | 'series') || 'standalone');
      // Initialize Story Concept values
      if (project.story_concept) {
        setConceptValues({
          title: project.story_concept.title || '',
          logline: project.story_concept.logline || null,
          synopsis: project.story_concept.synopsis || null,
          hook: project.story_concept.hook || null,
          protagonistHint: project.story_concept.protagonistHint || null,
          conflictType: project.story_concept.conflictType || null,
        });
      }
      // Initialize Story DNA values
      if (project.story_dna) {
        setDnaValues({
          tone: project.story_dna.tone || '',
          themes: project.story_dna.themes || [],
          proseStyle: project.story_dna.proseStyle || { pointOfView: '' },
          subgenre: project.story_dna.subgenre || '',
        });
      }
    }
  }, [project]);

  const fetchProject = useCallback(async () => {
    try {
      const data = await fetchJson<Project>(`/api/projects/${projectId}`);
      setProject(data);

      // Also fetch outline and chapters for navigation state
      try {
        // Get the first book for this project - API returns { books: [...] }
        const booksResponse = await fetchJson<{ books: any[] }>(`/api/books/project/${projectId}`);
        const booksData = booksResponse?.books || [];
        if (booksData.length > 0) {
          const bookId = booksData[0].id;
          setCurrentBookId(bookId);

          // Fetch outline
          try {
            const outlineData = await fetchJson<Outline>(`/api/outlines/book/${bookId}`);
            setOutline(outlineData);
          } catch {
            // No outline yet - that's OK
          }

          // Fetch chapters
          try {
            const chaptersResponse = await fetchJson<{ chapters: Chapter[] } | Chapter[]>(`/api/chapters/book/${bookId}`);
            // Handle both wrapped and unwrapped response formats
            const chaptersData = Array.isArray(chaptersResponse) ? chaptersResponse : chaptersResponse?.chapters || [];
            setChapters(chaptersData);
          } catch {
            // No chapters yet - that's OK
          }
        }
      } catch {
        // No books yet - that's OK
      }

      return data;
    } catch (err: any) {
      console.error('Error fetching project:', err);
      setError(err.message || 'Failed to load project');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Fetch job status for this project
  const fetchJobStats = useCallback(async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/queue/jobs?projectId=${projectId}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const jobs = data.jobs || [];

        // Calculate stats
        const stats: JobStats = {
          pending: jobs.filter((j: Job) => j.status === 'pending').length,
          running: jobs.filter((j: Job) => j.status === 'running').length,
          completed: jobs.filter((j: Job) => j.status === 'completed').length,
          paused: jobs.filter((j: Job) => j.status === 'paused').length,
          failed: jobs.filter((j: Job) => j.status === 'failed').length,
          jobs: jobs.slice(0, 10), // Keep top 10 for display
        };

        setJobStats(stats);
      }
    } catch (err) {
      console.error('Error fetching job stats:', err);
    }
  }, [projectId]);

  // Save project details
  const saveProjectDetails = async (field: 'title' | 'authorName' | 'type', value: string) => {
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      // Update local state
      const fieldMapping: Record<string, string> = {
        'authorName': 'author_name',
        'title': 'title',
        'type': 'type',
      };
      setProject((prev: any) => ({
        ...prev,
        [fieldMapping[field]]: value,
      }));

      // Close edit mode
      if (field === 'title') setEditingTitle(false);
      if (field === 'authorName') setEditingAuthor(false);
      if (field === 'type') setEditingType(false);
    } catch (err) {
      console.error('Error saving:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Save Story Concept
  const saveStoryConcept = async () => {
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storyConcept: conceptValues }),
      });

      if (!response.ok) {
        throw new Error('Failed to save Story Concept');
      }

      // Update local state
      setProject((prev: any) => ({
        ...prev,
        story_concept: conceptValues,
      }));

      setEditingConcept(false);
    } catch (err) {
      console.error('Error saving Story Concept:', err);
      alert('Failed to save Story Concept');
    } finally {
      setSaving(false);
    }
  };

  // Save Story DNA
  const saveStoryDNA = async () => {
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storyDNA: dnaValues }),
      });

      if (!response.ok) {
        throw new Error('Failed to save Story DNA');
      }

      // Update local state
      setProject((prev: any) => ({
        ...prev,
        story_dna: dnaValues,
      }));

      setEditingDNA(false);
    } catch (err) {
      console.error('Error saving Story DNA:', err);
      alert('Failed to save Story DNA');
    } finally {
      setSaving(false);
    }
  };

  // Trigger auto-generation when project has a story concept but missing content
  useEffect(() => {
    if (!projectId || hasAttemptedGeneration) return;

    const initializeProject = async () => {
      const projectData = await fetchProject();
      if (!projectData) return;

      // Check if content already exists
      const hasCharacters = projectData.story_bible?.characters?.length > 0;
      const hasWorld = projectData.story_bible?.world?.length > 0;
      const hasStoryConcept = !!(projectData.story_concept?.synopsis || projectData.story_concept?.logline);

      // Only auto-generate if:
      // 1. Forced via URL param, OR
      // 2. Has a story concept but missing characters or world
      const shouldGenerate = forceAutoGenerate || (hasStoryConcept && (!hasCharacters || !hasWorld));

      if (!shouldGenerate) {
        return;
      }

      // Mark that we've attempted generation to prevent re-runs
      setHasAttemptedGeneration(true);

      // If both exist, no need to generate
      if (hasCharacters && hasWorld) {
        return;
      }

      setIsGeneratingContent(true);

      // Build generation context from project data
      const generationContext = {
        title: projectData.title,
        synopsis: projectData.story_concept?.synopsis || '',
        genre: projectData.genre,
        subgenre: projectData.story_dna?.subgenre,
        tone: projectData.story_dna?.tone,
        themes: projectData.story_dna?.themes || [],
      };

      const token = localStorage.getItem('novelforge_token');

      // Generate content in sequence for better UX feedback
      try {
        // Generate characters first
        if (!hasCharacters) {
          setGenerationStatus(prev => ({ ...prev, characters: 'generating' }));
          const charRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}/characters`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ context: generationContext }),
          });
          if (charRes.ok) {
            setGenerationStatus(prev => ({ ...prev, characters: 'done' }));
          } else {
            console.error('Character generation failed:', await charRes.text());
            setGenerationStatus(prev => ({ ...prev, characters: 'error' }));
          }
        } else {
          setGenerationStatus(prev => ({ ...prev, characters: 'done' }));
        }

        // Then generate world
        if (!hasWorld) {
          setGenerationStatus(prev => ({ ...prev, world: 'generating' }));
          const worldRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}/world`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ context: generationContext }),
          });
          if (worldRes.ok) {
            setGenerationStatus(prev => ({ ...prev, world: 'done' }));
          } else {
            console.error('World generation failed:', await worldRes.text());
            setGenerationStatus(prev => ({ ...prev, world: 'error' }));
          }
        } else {
          setGenerationStatus(prev => ({ ...prev, world: 'done' }));
        }

        // Extract plots from concept
        setGenerationStatus(prev => ({ ...prev, plots: 'generating' }));
        const plotRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}/extract-plots-from-concept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            synopsis: projectData.story_concept?.synopsis,
            logline: projectData.story_concept?.logline,
            hook: projectData.story_concept?.hook,
            protagonistHint: projectData.story_concept?.protagonistHint,
            conflictType: projectData.story_concept?.conflictType,
          }),
        });
        if (plotRes.ok) {
          setGenerationStatus(prev => ({ ...prev, plots: 'done' }));
        } else {
          // Don't log error for plot extraction - it's optional
          setGenerationStatus(prev => ({ ...prev, plots: 'error' }));
        }

        // Refresh project data to show updated counts
        await fetchProject();
      } catch (err) {
        console.error('Error generating content:', err);
      } finally {
        setIsGeneratingContent(false);
      }
    };

    initializeProject();
  }, [projectId, forceAutoGenerate, fetchProject, hasAttemptedGeneration]);

  // Fetch job stats on mount and periodically
  useEffect(() => {
    fetchJobStats();
    const interval = setInterval(fetchJobStats, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [fetchJobStats]);

  if (isLoading) {
    return <LoadingState message="Loading project..." />;
  }

  if (error || !project) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.background,
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '600px',
          textAlign: 'center',
          background: colors.errorLight,
          border: `1px solid ${colors.errorBorder}`,
          borderRadius: borderRadius.lg,
          padding: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: colors.error }}>
            Error Loading Project
          </h2>
          <p style={{ color: colors.textSecondary, marginBottom: '2rem' }}>
            {error || 'Project not found'}
          </p>
          <Link
            href="/projects"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: gradients.brand,
              border: 'none',
              borderRadius: borderRadius.md,
              color: colors.surface,
              fontSize: '1rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const dashboardSubtitle = [project.genre, project.type, project.status].filter(Boolean).join(' \u2022 ');

  // Helper to get job type display name
  const getJobTypeName = (type: string) => {
    const names: Record<string, string> = {
      'generate_chapter': 'Chapter Generation',
      'dev_edit': 'Development Edit',
      'author_revision': 'Author Revision',
      'line_edit': 'Line Edit',
      'copy_edit': 'Copy Edit',
      'coherence_check': 'Coherence Check',
      'originality_check': 'Originality Check',
      'veb_beta_swarm': 'VEB Beta Swarm',
      'veb_ruthless_editor': 'VEB Ruthless Editor',
      'veb_market_analyst': 'VEB Market Analyst',
      'veb_finalize': 'VEB Finalise',
      'analyze_book': 'Book Analysis',
      'generate_follow_up': 'Follow-up Generation',
      'outline_structure_analyst': 'Outline Structure',
      'outline_character_arc': 'Character Arc Analysis',
      'outline_market_fit': 'Market Fit Analysis',
      'outline_editorial_finalize': 'Editorial Finalise',
    };
    return names[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <DashboardLayout
      header={{ title: project.title, subtitle: dashboardSubtitle }}
    >
      <ProjectNavigation
        projectId={projectId}
        project={navigation.project}
        outline={navigation.outline}
        chapters={navigation.chapters}
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Status Update Section */}
        <div style={{
          ...card,
          marginBottom: '1.5rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          border: `1px solid ${colors.brandBorder}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: colors.text, fontWeight: 700, margin: 0 }}>
              Status Update
            </h2>
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: borderRadius.md,
              fontSize: '0.75rem',
              fontWeight: 600,
              background: project.status === 'completed' ? colors.successLight :
                         project.status === 'generating' ? colors.brandLight : colors.warningLight,
              color: project.status === 'completed' ? colors.success :
                     project.status === 'generating' ? colors.brandText : colors.warning,
            }}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
          </div>

          {/* Job Statistics */}
          {jobStats && (jobStats.running > 0 || jobStats.pending > 0 || jobStats.completed > 0) ? (
            <div role="status" aria-live="polite" aria-atomic="true">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem',
              }}>
                {jobStats.running > 0 && (
                  <div style={{
                    padding: '0.75rem',
                    background: colors.brandLight,
                    borderRadius: borderRadius.md,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.brandText }}>
                      {jobStats.running}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: colors.brandText }}>Running</div>
                  </div>
                )}
                {jobStats.pending > 0 && (
                  <div style={{
                    padding: '0.75rem',
                    background: colors.warningLight,
                    borderRadius: borderRadius.md,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.warning }}>
                      {jobStats.pending}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: colors.warning }}>Queued</div>
                  </div>
                )}
                {jobStats.completed > 0 && (
                  <div style={{
                    padding: '0.75rem',
                    background: colors.successLight,
                    borderRadius: borderRadius.md,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.success }}>
                      {jobStats.completed}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: colors.success }}>Completed</div>
                  </div>
                )}
                {jobStats.failed > 0 && (
                  <div style={{
                    padding: '0.75rem',
                    background: colors.errorLight,
                    borderRadius: borderRadius.md,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.error }}>
                      {jobStats.failed}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: colors.error }}>Failed</div>
                  </div>
                )}
              </div>

              {/* Active Jobs List */}
              {(jobStats.running > 0 || jobStats.pending > 0) && (
                <div style={{
                  background: colors.surface,
                  borderRadius: borderRadius.md,
                  padding: '1rem',
                  border: `1px solid ${colors.border}`,
                }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.text, margin: '0 0 0.75rem 0' }}>
                    Active Jobs
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {jobStats.jobs
                      .filter(j => j.status === 'running' || j.status === 'pending')
                      .slice(0, 5)
                      .map((job, index) => (
                        <div
                          key={job.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            background: job.status === 'running' ? 'rgba(102, 126, 234, 0.08)' : 'transparent',
                            borderRadius: borderRadius.sm,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: job.status === 'running' ? colors.brandStart : colors.warning,
                              animation: job.status === 'running' ? 'pulse 1.5s infinite' : 'none',
                            }} />
                            <span style={{ fontSize: '0.8125rem', color: colors.text }}>
                              {getJobTypeName(job.type)}
                              {job.chapter_number && ` - Chapter ${job.chapter_number}`}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '0.125rem 0.5rem',
                            borderRadius: borderRadius.sm,
                            background: job.status === 'running' ? colors.brandLight : colors.warningLight,
                            color: job.status === 'running' ? colors.brandText : colors.warning,
                          }}>
                            {job.status === 'running' ? 'Running' : 'Queued'}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: colors.textSecondary, fontSize: '0.875rem', margin: 0 }}>
              No active jobs. Start by creating your story elements below.
            </p>
          )}

          <style jsx>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </div>

        {/* Book Details Editor */}
        <div style={{
          ...card,
          marginBottom: '1.5rem',
          padding: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.125rem', color: colors.text, fontWeight: 700, margin: '0 0 1rem 0' }}>
            Book Details
          </h2>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {/* Cover Image Upload */}
            <CoverImageUpload projectId={projectId} />

            {/* Text Fields */}
            <div style={{ flex: 1, display: 'grid', gap: '1rem' }}>
            {/* Title Field */}
            <div>
              <label style={{
                fontSize: '0.75rem',
                color: colors.textSecondary,
                fontWeight: 600,
                display: 'block',
                marginBottom: '0.375rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Book Title
              </label>
              {editingTitle ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.625rem 0.75rem',
                      border: `1px solid ${colors.brandBorder}`,
                      borderRadius: borderRadius.md,
                      fontSize: '0.9375rem',
                      outline: 'none',
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => saveProjectDetails('title', titleValue)}
                    disabled={saving}
                    style={{
                      padding: '0.625rem 1rem',
                      background: gradients.brand,
                      color: colors.surface,
                      border: 'none',
                      borderRadius: borderRadius.md,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditingTitle(false); setTitleValue(project?.title || ''); }}
                    style={{
                      padding: '0.625rem 1rem',
                      background: colors.surface,
                      color: colors.textSecondary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: borderRadius.md,
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1rem', color: colors.text, fontWeight: 500 }}>
                    {project?.title || 'Untitled'}
                  </span>
                  <button
                    onClick={() => setEditingTitle(true)}
                    style={{
                      padding: '0.25rem 0.625rem',
                      background: 'transparent',
                      color: colors.brandText,
                      border: `1px solid ${colors.brandBorder}`,
                      borderRadius: borderRadius.sm,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Author Field */}
            <div>
              <label style={{
                fontSize: '0.75rem',
                color: colors.textSecondary,
                fontWeight: 600,
                display: 'block',
                marginBottom: '0.375rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Author Name
              </label>
              {editingAuthor ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={authorValue}
                    onChange={(e) => setAuthorValue(e.target.value)}
                    placeholder="Enter author name for exports"
                    style={{
                      flex: 1,
                      padding: '0.625rem 0.75rem',
                      border: `1px solid ${colors.brandBorder}`,
                      borderRadius: borderRadius.md,
                      fontSize: '0.9375rem',
                      outline: 'none',
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => saveProjectDetails('authorName', authorValue)}
                    disabled={saving}
                    style={{
                      padding: '0.625rem 1rem',
                      background: gradients.brand,
                      color: colors.surface,
                      border: 'none',
                      borderRadius: borderRadius.md,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditingAuthor(false); setAuthorValue(project?.author_name || ''); }}
                    style={{
                      padding: '0.625rem 1rem',
                      background: colors.surface,
                      color: colors.textSecondary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: borderRadius.md,
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    fontSize: '1rem',
                    color: project?.author_name ? colors.text : colors.textSecondary,
                    fontWeight: project?.author_name ? 500 : 400,
                    fontStyle: project?.author_name ? 'normal' : 'italic',
                  }}>
                    {project?.author_name || 'Not set'}
                  </span>
                  <button
                    onClick={() => setEditingAuthor(true)}
                    style={{
                      padding: '0.25rem 0.625rem',
                      background: 'transparent',
                      color: colors.brandText,
                      border: `1px solid ${colors.brandBorder}`,
                      borderRadius: borderRadius.sm,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
              <p style={{ fontSize: '0.75rem', color: colors.textSecondary, margin: '0.375rem 0 0 0' }}>
                This name will be used in all exports (EPUB, PDF, DOCX)
              </p>
            </div>

            {/* Project Type Field */}
            <div>
              <label style={{
                fontSize: '0.75rem',
                color: colors.textSecondary,
                fontWeight: 600,
                display: 'block',
                marginBottom: '0.375rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Project Type
              </label>
              {editingType ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={typeValue}
                    onChange={(e) => setTypeValue(e.target.value as 'standalone' | 'trilogy' | 'series')}
                    style={{
                      flex: 1,
                      padding: '0.625rem 0.75rem',
                      border: `1px solid ${colors.brandBorder}`,
                      borderRadius: borderRadius.md,
                      fontSize: '0.9375rem',
                      outline: 'none',
                      background: colors.surface,
                    }}
                  >
                    <option value="standalone">Standalone</option>
                    <option value="trilogy">Trilogy</option>
                    <option value="series">Series</option>
                  </select>
                  <button
                    onClick={() => saveProjectDetails('type', typeValue)}
                    disabled={saving}
                    style={{
                      padding: '0.625rem 1rem',
                      background: gradients.brand,
                      color: colors.surface,
                      border: 'none',
                      borderRadius: borderRadius.md,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditingType(false); setTypeValue((project?.type as 'standalone' | 'trilogy' | 'series') || 'standalone'); }}
                    style={{
                      padding: '0.625rem 1rem',
                      background: colors.surface,
                      color: colors.textSecondary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: borderRadius.md,
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1rem', color: colors.text, fontWeight: 500, textTransform: 'capitalize' }}>
                    {project?.type || 'Standalone'}
                  </span>
                  <button
                    onClick={() => setEditingType(true)}
                    style={{
                      padding: '0.25rem 0.625rem',
                      background: 'transparent',
                      color: colors.brandText,
                      border: `1px solid ${colors.brandBorder}`,
                      borderRadius: borderRadius.sm,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
              <p style={{ fontSize: '0.75rem', color: colors.textSecondary, margin: '0.375rem 0 0 0' }}>
                Standalone = 1 book, Trilogy = 3 books, Series = multiple books
              </p>
            </div>

            {/* Clone Book Button */}
            {currentBookId && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${colors.border}` }}>
                <button
                  onClick={() => setShowCloneDialog(true)}
                  style={{
                    padding: '0.625rem 1rem',
                    background: colors.surface,
                    color: colors.brandText,
                    border: `1px solid ${colors.brandBorder}`,
                    borderRadius: borderRadius.md,
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>+</span>
                  Clone Book (Fresh Start)
                </button>
                <p style={{ fontSize: '0.75rem', color: colors.textSecondary, margin: '0.375rem 0 0 0' }}>
                  Create a copy with same characters and world, but fresh plot and chapters
                </p>
              </div>
            )}

            {/* Duplicate Project Button */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${colors.border}` }}>
              <button
                onClick={() => setShowDuplicateDialog(true)}
                style={{
                  padding: '0.625rem 1rem',
                  background: colors.surface,
                  color: colors.brandText,
                  border: `1px solid ${colors.brandBorder}`,
                  borderRadius: borderRadius.md,
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '1rem' }}>+</span>
                Duplicate Project
              </button>
              <p style={{ fontSize: '0.75rem', color: colors.textSecondary, margin: '0.375rem 0 0 0' }}>
                Create a new project with same story concept, DNA, characters, and world
              </p>
            </div>
            </div>
          </div>
        </div>

        {/* Clone Book Dialog */}
        {currentBookId && (
          <CloneBookDialog
            bookId={currentBookId}
            bookTitle={project?.title || 'Book'}
            isOpen={showCloneDialog}
            onClose={() => setShowCloneDialog(false)}
            onCloned={(clonedBook) => {
              // Navigate to the new cloned book's project page or refresh
              router.refresh();
            }}
          />
        )}

        {/* Duplicate Project Dialog */}
        <DuplicateProjectDialog
          projectId={projectId}
          projectTitle={project?.title || 'Project'}
          isOpen={showDuplicateDialog}
          onClose={() => setShowDuplicateDialog(false)}
        />

        {/* Generation Progress Indicator */}
        {isGeneratingContent && (
          <div style={{
            ...card,
            marginBottom: '1.5rem',
            padding: '2rem',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            border: `2px solid ${colors.brandBorder}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '3px solid #E0E7FF',
                borderTopColor: '#667eea',
                animation: 'spin 1s linear infinite',
              }} />
              <div>
                <h2 style={{ fontSize: '1.25rem', color: colors.text, fontWeight: 700, margin: 0 }}>
                  Setting Up Your Project...
                </h2>
                <p style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: '0.25rem 0 0 0' }}>
                  This may take a minute or two. Please don't navigate away.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: generationStatus.characters === 'done' ? colors.success
                    : generationStatus.characters === 'generating' ? colors.brandStart
                    : generationStatus.characters === 'error' ? colors.error
                    : colors.border,
                  color: generationStatus.characters === 'pending' ? colors.textSecondary : 'white',
                  transition: 'all 0.3s ease',
                }}>
                  {generationStatus.characters === 'done' ? '✓' : generationStatus.characters === 'generating' ? (
                    <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>•••</span>
                  ) : generationStatus.characters === 'error' ? '!' : '1'}
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{
                    color: generationStatus.characters === 'generating' ? colors.brandText : colors.text,
                    fontWeight: generationStatus.characters === 'generating' ? 600 : 400,
                    fontSize: '0.9375rem',
                  }}>
                    {generationStatus.characters === 'generating' ? 'Generating characters...' : generationStatus.characters === 'done' ? 'Characters generated' : generationStatus.characters === 'error' ? 'Character generation failed' : 'Generate characters'}
                  </span>
                  {generationStatus.characters === 'generating' && (
                    <div style={{
                      marginTop: '0.5rem',
                      background: '#E0E7FF',
                      borderRadius: '4px',
                      height: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        background: 'linear-gradient(90deg, #667eea, #764ba2)',
                        height: '100%',
                        width: '100%',
                        animation: 'progressPulse 2s ease-in-out infinite',
                      }} />
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: generationStatus.world === 'done' ? colors.success
                    : generationStatus.world === 'generating' ? colors.brandStart
                    : generationStatus.world === 'error' ? colors.error
                    : colors.border,
                  color: generationStatus.world === 'pending' ? colors.textSecondary : 'white',
                  transition: 'all 0.3s ease',
                }}>
                  {generationStatus.world === 'done' ? '✓' : generationStatus.world === 'generating' ? (
                    <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>•••</span>
                  ) : generationStatus.world === 'error' ? '!' : '2'}
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{
                    color: generationStatus.world === 'generating' ? colors.brandText : colors.text,
                    fontWeight: generationStatus.world === 'generating' ? 600 : 400,
                    fontSize: '0.9375rem',
                  }}>
                    {generationStatus.world === 'generating' ? 'Building world elements...' : generationStatus.world === 'done' ? 'World elements created' : generationStatus.world === 'error' ? 'World generation failed' : 'Build world'}
                  </span>
                  {generationStatus.world === 'generating' && (
                    <div style={{
                      marginTop: '0.5rem',
                      background: '#E0E7FF',
                      borderRadius: '4px',
                      height: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        background: 'linear-gradient(90deg, #667eea, #764ba2)',
                        height: '100%',
                        width: '100%',
                        animation: 'progressPulse 2s ease-in-out infinite',
                      }} />
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: generationStatus.plots === 'done' ? colors.success
                    : generationStatus.plots === 'generating' ? colors.brandStart
                    : generationStatus.plots === 'error' ? colors.error
                    : colors.border,
                  color: generationStatus.plots === 'pending' ? colors.textSecondary : 'white',
                  transition: 'all 0.3s ease',
                }}>
                  {generationStatus.plots === 'done' ? '✓' : generationStatus.plots === 'generating' ? (
                    <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>•••</span>
                  ) : generationStatus.plots === 'error' ? '!' : '3'}
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{
                    color: generationStatus.plots === 'generating' ? colors.brandText : colors.text,
                    fontWeight: generationStatus.plots === 'generating' ? 600 : 400,
                    fontSize: '0.9375rem',
                  }}>
                    {generationStatus.plots === 'generating' ? 'Extracting plot structure...' : generationStatus.plots === 'done' ? 'Plot structure extracted' : generationStatus.plots === 'error' ? 'Plot extraction failed' : 'Extract plots'}
                  </span>
                  {generationStatus.plots === 'generating' && (
                    <div style={{
                      marginTop: '0.5rem',
                      background: '#E0E7FF',
                      borderRadius: '4px',
                      height: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        background: 'linear-gradient(90deg, #667eea, #764ba2)',
                        height: '100%',
                        width: '100%',
                        animation: 'progressPulse 2s ease-in-out infinite',
                      }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <style jsx>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
              @keyframes pulse {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 1; }
              }
              @keyframes progressPulse {
                0%, 100% { transform: translateX(-100%); }
                50% { transform: translateX(100%); }
              }
            `}</style>
          </div>
        )}

        {/* Story Concept Section - Editable */}
        <div style={{
          ...card,
          marginBottom: '1.5rem',
          padding: '1.5rem',
          background: colors.brandLight,
          border: `2px solid ${colors.brandBorder}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: colors.text, fontWeight: 700, margin: 0 }}>
              Story Concept
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!editingConcept && (
                <button
                  onClick={() => setEditingConcept(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: colors.surface,
                    border: `1px solid ${colors.brandBorder}`,
                    borderRadius: borderRadius.md,
                    color: colors.brandText,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}
                >
                  Edit
                </button>
              )}
              <Link
                href="/saved-summaries"
                style={{
                  padding: '0.5rem 1rem',
                  background: colors.surface,
                  border: `1px solid ${colors.brandBorder}`,
                  borderRadius: borderRadius.md,
                  color: colors.brandText,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                View Saved Summaries
              </Link>
            </div>
          </div>

          {editingConcept ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Logline */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: colors.brandText,
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Logline
                </label>
                <textarea
                  value={conceptValues.logline || ''}
                  onChange={(e) => setConceptValues(prev => ({ ...prev, logline: e.target.value || null }))}
                  placeholder="A one-sentence summary of your story..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${colors.brandBorder}`,
                    borderRadius: borderRadius.md,
                    fontSize: '0.9375rem',
                    fontStyle: 'italic',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Synopsis */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: colors.brandText,
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Synopsis
                </label>
                <textarea
                  value={conceptValues.synopsis || ''}
                  onChange={(e) => setConceptValues(prev => ({ ...prev, synopsis: e.target.value || null }))}
                  placeholder="A brief synopsis of your story..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${colors.brandBorder}`,
                    borderRadius: borderRadius.md,
                    fontSize: '0.9375rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Hook */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: colors.brandText,
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Hook
                </label>
                <textarea
                  value={conceptValues.hook || ''}
                  onChange={(e) => setConceptValues(prev => ({ ...prev, hook: e.target.value || null }))}
                  placeholder="What makes your story unique and compelling..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${colors.brandBorder}`,
                    borderRadius: borderRadius.md,
                    fontSize: '0.9375rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Protagonist and Conflict */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: colors.brandText,
                    fontWeight: 600,
                    marginBottom: '0.375rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Protagonist
                  </label>
                  <input
                    type="text"
                    value={conceptValues.protagonistHint || ''}
                    onChange={(e) => setConceptValues(prev => ({ ...prev, protagonistHint: e.target.value || null }))}
                    placeholder="Main character description..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${colors.brandBorder}`,
                      borderRadius: borderRadius.md,
                      fontSize: '0.9375rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    color: colors.brandText,
                    fontWeight: 600,
                    marginBottom: '0.375rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Core Conflict
                  </label>
                  <input
                    type="text"
                    value={conceptValues.conflictType || ''}
                    onChange={(e) => setConceptValues(prev => ({ ...prev, conflictType: e.target.value || null }))}
                    placeholder="Main conflict type..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${colors.brandBorder}`,
                      borderRadius: borderRadius.md,
                      fontSize: '0.9375rem',
                    }}
                  />
                </div>
              </div>

              {/* Save/Cancel buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    setEditingConcept(false);
                    if (project?.story_concept) {
                      setConceptValues({
                        title: project.story_concept.title || '',
                        logline: project.story_concept.logline || null,
                        synopsis: project.story_concept.synopsis || null,
                        hook: project.story_concept.hook || null,
                        protagonistHint: project.story_concept.protagonistHint || null,
                        conflictType: project.story_concept.conflictType || null,
                      });
                    }
                  }}
                  style={{
                    padding: '0.625rem 1rem',
                    background: colors.surface,
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveStoryConcept}
                  disabled={saving}
                  style={{
                    padding: '0.625rem 1rem',
                    background: gradients.brand,
                    color: colors.surface,
                    border: 'none',
                    borderRadius: borderRadius.md,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {project.story_concept?.logline ? (
                <div>
                  <strong style={{
                    color: colors.brandText,
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                  }}>
                    Logline
                  </strong>
                  <p style={{
                    margin: 0,
                    fontStyle: 'italic',
                    lineHeight: '1.7',
                    fontSize: '1.125rem',
                    color: colors.text,
                  }}>
                    {project.story_concept.logline}
                  </p>
                </div>
              ) : (
                <p style={{ color: colors.textSecondary, fontSize: '0.875rem', fontStyle: 'italic' }}>
                  No logline set. Click Edit to add one.
                </p>
              )}

              {project.story_concept?.synopsis && (
                <div>
                  <strong style={{
                    color: colors.brandText,
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                  }}>
                    Synopsis
                  </strong>
                  <p style={{
                    margin: 0,
                    lineHeight: '1.7',
                    fontSize: '0.95rem',
                    color: colors.textSecondary,
                  }}>
                    {project.story_concept.synopsis}
                  </p>
                </div>
              )}

              {project.story_concept?.hook && (
                <div style={{
                  padding: '1rem',
                  background: gradients.brand,
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.brandBorder}`,
                }}>
                  <strong style={{
                    color: colors.surface,
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                  }}>
                    Hook
                  </strong>
                  <p style={{
                    margin: 0,
                    lineHeight: '1.6',
                    fontSize: '0.95rem',
                    color: colors.surface,
                  }}>
                    {project.story_concept.hook}
                  </p>
                </div>
              )}

              {(project.story_concept?.protagonistHint || project.story_concept?.conflictType) && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1rem',
                  marginTop: '0.5rem',
                }}>
                  {project.story_concept.protagonistHint && (
                    <div>
                      <strong style={{
                        color: colors.brandText,
                        display: 'block',
                        marginBottom: '0.25rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}>
                        Protagonist
                      </strong>
                      <p style={{
                        margin: 0,
                        lineHeight: '1.5',
                        fontSize: '0.875rem',
                        color: colors.textSecondary,
                      }}>
                        {project.story_concept.protagonistHint}
                      </p>
                    </div>
                  )}
                  {project.story_concept.conflictType && (
                    <div>
                      <strong style={{
                        color: colors.brandText,
                        display: 'block',
                        marginBottom: '0.25rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}>
                        Core Conflict
                      </strong>
                      <p style={{
                        margin: 0,
                        lineHeight: '1.5',
                        fontSize: '0.875rem',
                        color: colors.textSecondary,
                      }}>
                        {project.story_concept.conflictType}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>


        {/* Story DNA Section - Editable */}
        <div style={{ ...card, marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', color: '#1A1A2E', fontWeight: 600, margin: 0 }}>
              Story DNA
            </h2>
            {!editingDNA && project.story_dna && (
              <button
                onClick={() => setEditingDNA(true)}
                style={{
                  padding: '0.375rem 0.75rem',
                  background: 'transparent',
                  color: colors.brandText,
                  border: `1px solid ${colors.brandBorder}`,
                  borderRadius: borderRadius.sm,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                Edit
              </button>
            )}
          </div>

          {editingDNA ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Tone */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: colors.textSecondary,
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Tone
                </label>
                <input
                  type="text"
                  value={dnaValues.tone || ''}
                  onChange={(e) => setDnaValues((prev: any) => ({ ...prev, tone: e.target.value }))}
                  placeholder="e.g., Dark and suspenseful, Light-hearted, Epic..."
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    fontSize: '0.9375rem',
                  }}
                />
              </div>

              {/* Themes */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: colors.textSecondary,
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Themes (comma-separated)
                </label>
                <input
                  type="text"
                  value={(dnaValues.themes || []).join(', ')}
                  onChange={(e) => setDnaValues((prev: any) => ({
                    ...prev,
                    themes: e.target.value.split(',').map((t: string) => t.trim()).filter((t: string) => t),
                  }))}
                  placeholder="e.g., Redemption, Love, Betrayal, Power..."
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    fontSize: '0.9375rem',
                  }}
                />
              </div>

              {/* Point of View */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: colors.textSecondary,
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Point of View
                </label>
                <select
                  value={dnaValues.proseStyle?.pointOfView || ''}
                  onChange={(e) => setDnaValues((prev: any) => ({
                    ...prev,
                    proseStyle: { ...prev.proseStyle, pointOfView: e.target.value },
                  }))}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    fontSize: '0.9375rem',
                    background: colors.surface,
                  }}
                >
                  <option value="">Select POV...</option>
                  <option value="first-person">First Person</option>
                  <option value="third-person-limited">Third Person Limited</option>
                  <option value="third-person-omniscient">Third Person Omniscient</option>
                  <option value="second-person">Second Person</option>
                  <option value="multiple-pov">Multiple POV</option>
                </select>
              </div>

              {/* Subgenre */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: colors.textSecondary,
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Subgenre
                </label>
                <input
                  type="text"
                  value={dnaValues.subgenre || ''}
                  onChange={(e) => setDnaValues((prev: any) => ({ ...prev, subgenre: e.target.value }))}
                  placeholder="e.g., Psychological thriller, Cosy mystery..."
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    fontSize: '0.9375rem',
                  }}
                />
              </div>

              {/* Save/Cancel buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    setEditingDNA(false);
                    if (project?.story_dna) {
                      setDnaValues({
                        tone: project.story_dna.tone || '',
                        themes: project.story_dna.themes || [],
                        proseStyle: project.story_dna.proseStyle || { pointOfView: '' },
                        subgenre: project.story_dna.subgenre || '',
                      });
                    }
                  }}
                  style={{
                    padding: '0.625rem 1rem',
                    background: colors.surface,
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveStoryDNA}
                  disabled={saving}
                  style={{
                    padding: '0.625rem 1rem',
                    background: gradients.brand,
                    color: colors.surface,
                    border: 'none',
                    borderRadius: borderRadius.md,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : project.story_dna ? (
            <div style={{ display: 'grid', gap: '0.75rem', color: '#64748B', fontSize: '0.875rem' }}>
              <div>
                <strong style={{ color: '#374151' }}>Tone:</strong> {project.story_dna.tone || <em style={{ color: colors.textSecondary }}>Not set</em>}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Themes:</strong> {project.story_dna.themes?.length > 0 ? project.story_dna.themes.join(', ') : <em style={{ color: colors.textSecondary }}>Not set</em>}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Point of View:</strong> {project.story_dna.proseStyle?.pointOfView || <em style={{ color: colors.textSecondary }}>Not set</em>}
              </div>
              {project.story_dna.subgenre && (
                <div>
                  <strong style={{ color: '#374151' }}>Subgenre:</strong> {project.story_dna.subgenre}
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: '#64748B', fontSize: '0.875rem' }}>Story DNA will be generated when you set up characters.</p>
          )}
        </div>

        {/* Story Bible Section */}
        <div style={{ ...card, marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#1A1A2E', fontWeight: 600 }}>
            Story Bible
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{
              padding: '1.25rem',
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>👥</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1A1A2E' }}>
                {project.story_bible?.characters?.length || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748B' }}>Characters</div>
            </div>
            <div style={{
              padding: '1.25rem',
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🌍</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1A1A2E' }}>
                {project.story_bible?.world?.length || 0}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748B' }}>World Elements</div>
            </div>
          </div>
        </div>

        {/* Export Section - show when book has generated content */}
        {chapters.length > 0 && chapters.some(ch => ch.content) && (
          <ExportButtons projectId={project.id} hasContent={true} />
        )}

        {/* Post-Generation Tools - show when book has chapters */}
        {chapters.length > 0 && (
          <div style={{ ...card, marginTop: '1rem', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: colors.text, fontWeight: 600 }}>
              Analysis & Management Tools
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}>
              <Link
                href={`/projects/${project.id}/versions`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1rem',
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📚</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: colors.text }}>
                  Version History
                </span>
                <span style={{ fontSize: '0.8125rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
                  Manage chapter versions
                </span>
              </Link>
              <Link
                href={`/projects/${project.id}/originality`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1rem',
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: colors.text }}>
                  Originality Check
                </span>
                <span style={{ fontSize: '0.8125rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
                  Check for plagiarism issues
                </span>
              </Link>
              <Link
                href={`/projects/${project.id}/coherence`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1rem',
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎯</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: colors.text }}>
                  Coherence Check
                </span>
                <span style={{ fontSize: '0.8125rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
                  Verify story consistency
                </span>
              </Link>
              <Link
                href={`/projects/${project.id}/analytics`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1rem',
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📊</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: colors.text }}>
                  Analytics
                </span>
                <span style={{ fontSize: '0.8125rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
                  View usage metrics & costs
                </span>
              </Link>
              <Link
                href={`/projects/${project.id}/editorial-report`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1rem',
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📝</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: colors.text }}>
                  Editorial Report
                </span>
                <span style={{ fontSize: '0.8125rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
                  Review editorial feedback
                </span>
              </Link>
            </div>

            {/* Search & Replace Tool */}
            <div style={{ marginTop: '1.5rem' }}>
              <SearchReplace projectId={project.id} />
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div style={{ ...card, marginTop: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#1A1A2E', fontWeight: 600 }}>
            Next Steps
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link
              href={`/projects/${project.id}/characters`}
              style={{
                display: 'block',
                padding: '1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                textAlign: 'center',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(102, 126, 234, 0.3)',
              }}
            >
              {project.story_bible?.characters?.length > 0 ? 'Edit Characters' : 'Generate Characters'} →
            </Link>
            {project.story_bible?.characters?.length > 0 && (
              <Link
                href={`/projects/${project.id}/world`}
                style={{
                  display: 'block',
                  padding: '1rem',
                  background: project.story_bible?.world?.length > 0
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#94A3B8',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  textAlign: 'center',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                {project.story_bible?.world?.length > 0 ? 'Edit World' : 'Generate World'} →
              </Link>
            )}
            {project.story_bible?.characters?.length > 0 && project.story_bible?.world?.length > 0 && (
              <Link
                href={`/projects/${project.id}/outline`}
                style={{
                  display: 'block',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  textAlign: 'center',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                Create Story Outline →
              </Link>
            )}
            {(project.type === 'trilogy' || (project.book_count && project.book_count > 1)) && (
              <Link
                href={`/projects/${project.id}/series`}
                style={{
                  display: 'block',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  textAlign: 'center',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                Series Management {project.series_bible ? '✓' : ''} →
              </Link>
            )}
            {project.story_bible?.characters?.length > 0 && (
              <Link
                href={`/projects/${project.id}/plot`}
                style={{
                  display: 'block',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  textAlign: 'center',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                Plot Structure & Timeline →
              </Link>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
