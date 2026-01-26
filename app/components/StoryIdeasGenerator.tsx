'use client';

import { useState, useCallback, useEffect } from 'react';
import { colors, gradients, borderRadius, shadows } from '../lib/constants';
import { getToken } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Generated story idea with structured sections
 */
export interface GeneratedIdea {
  id: string;
  storyIdea: string;
  characterConcepts: string[];
  plotElements: string[];
  uniqueTwists: string[];
}

/**
 * Sections that can be regenerated
 */
type RegeneratableSection = 'characters' | 'plot' | 'twists';

interface StoryIdeasGeneratorProps {
  preferences: {
    genre: string;
    subgenre?: string;
    tone?: string;
    themes?: string[];
  };
  onSelectIdea: (idea: GeneratedIdea) => void;
  onClose: () => void;
  showSavedIdeas?: boolean;  // If true, show saved ideas tab
}

/**
 * Story Ideas Generator Component
 * Displays a modal/panel with AI-generated story ideas as expandable cards.
 * Users can regenerate individual sections and select an idea to populate their form.
 */
interface SavedIdea extends GeneratedIdea {
  genre: string;
  subgenre?: string;
  tone?: string;
  themes?: string[];
  notes?: string;
  status: 'saved' | 'used' | 'archived';
  createdAt: string;
}

export default function StoryIdeasGenerator({
  preferences,
  onSelectIdea,
  onClose,
  showSavedIdeas = true,
}: StoryIdeasGeneratorProps) {
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [activeTab, setActiveTab] = useState<'generate' | 'saved'>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savedIdsSet, setSavedIdsSet] = useState<Set<string>>(new Set());

  /**
   * Fetch saved ideas from API
   */
  const fetchSavedIdeas = useCallback(async () => {
    setIsLoadingSaved(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/story-ideas/saved`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSavedIdeas(data.ideas || []);
        // Build set of saved idea texts for quick lookup
        const savedTexts = new Set<string>(data.ideas?.map((i: SavedIdea) => i.storyIdea) || []);
        setSavedIdsSet(savedTexts);
      }
    } catch (err) {
      console.error('Failed to fetch saved ideas:', err);
    } finally {
      setIsLoadingSaved(false);
    }
  }, []);

  /**
   * Save an idea to the database
   */
  const saveIdea = useCallback(async (idea: GeneratedIdea) => {
    setSavingId(idea.id);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/story-ideas/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          idea,
          preferences,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save idea');
      }

      // Mark as saved
      setSavedIdsSet(prev => new Set([...Array.from(prev), idea.storyIdea]));
      // Refresh saved ideas list
      await fetchSavedIdeas();
    } catch (err: any) {
      setError(err.message || 'Failed to save idea');
    } finally {
      setSavingId(null);
    }
  }, [preferences, fetchSavedIdeas]);

  /**
   * Delete a saved idea
   */
  const deleteSavedIdea = useCallback(async (ideaId: string, storyIdea: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/story-ideas/saved/${ideaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSavedIdeas(prev => prev.filter(i => i.id !== ideaId));
        setSavedIdsSet(prev => {
          const newSet = new Set(prev);
          newSet.delete(storyIdea);
          return newSet;
        });
      }
    } catch (err) {
      console.error('Failed to delete idea:', err);
    }
  }, []);

  /**
   * Generate a batch of story ideas from the API
   */
  const generateIdeas = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/story-ideas/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          genre: preferences.genre,
          subgenre: preferences.subgenre,
          tone: preferences.tone,
          themes: preferences.themes,
          count: 5,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate ideas');
      }

      const data = await response.json();
      setIdeas(data.ideas);

      // Auto-expand first idea
      if (data.ideas.length > 0) {
        setExpandedId(data.ideas[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating ideas');
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

  // Fetch saved ideas on mount
  useEffect(() => {
    if (showSavedIdeas) {
      fetchSavedIdeas();
    }
  }, [showSavedIdeas, fetchSavedIdeas]);

  /**
   * Regenerate a specific section of an idea
   */
  const regenerateSection = useCallback(async (
    ideaId: string,
    section: RegeneratableSection
  ) => {
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea) return;

    setIsRegenerating(`${ideaId}-${section}`);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/story-ideas/regenerate-section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ideaId,
          section,
          context: idea,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to regenerate section');
      }

      const data = await response.json();

      // Update the idea with new section content
      setIdeas(prevIdeas =>
        prevIdeas.map(i => {
          if (i.id !== ideaId) return i;

          switch (section) {
            case 'characters':
              return { ...i, characterConcepts: data.items };
            case 'plot':
              return { ...i, plotElements: data.items };
            case 'twists':
              return { ...i, uniqueTwists: data.items };
            default:
              return i;
          }
        })
      );
    } catch (err: any) {
      setError(err.message || 'An error occurred while regenerating');
    } finally {
      setIsRegenerating(null);
    }
  }, [ideas]);

  /**
   * Handle selecting an idea to use
   */
  const handleSelectIdea = (idea: GeneratedIdea) => {
    onSelectIdea(idea);
    onClose();
  };

  /**
   * Toggle card expansion
   */
  const toggleExpand = (ideaId: string) => {
    setExpandedId(prev => prev === ideaId ? null : ideaId);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '2rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: colors.surface,
          borderRadius: borderRadius.lg,
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem 2rem 0',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: colors.text,
                  margin: 0,
                }}
              >
                Story Ideas Generator
              </h2>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: colors.textSecondary,
                  margin: '0.25rem 0 0 0',
                }}
              >
                AI-powered creative story ideas for {preferences.genre}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                color: colors.textSecondary,
                cursor: 'pointer',
                padding: '0.5rem',
                lineHeight: 1,
              }}
            >
              x
            </button>
          </div>

          {/* Tabs */}
          {showSavedIdeas && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('generate')}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: activeTab === 'generate' ? colors.surface : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'generate' ? `2px solid ${colors.brandStart}` : '2px solid transparent',
                  color: activeTab === 'generate' ? colors.brandStart : colors.textSecondary,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: '-1px',
                }}
              >
                Generate New
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: activeTab === 'saved' ? colors.surface : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'saved' ? `2px solid ${colors.brandStart}` : '2px solid transparent',
                  color: activeTab === 'saved' ? colors.brandStart : colors.textSecondary,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: '-1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                Saved Ideas
                {savedIdeas.length > 0 && (
                  <span
                    style={{
                      background: colors.brandStart,
                      color: '#FFFFFF',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                    }}
                  >
                    {savedIdeas.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '1.5rem 2rem',
          }}
        >
          {/* Error Message */}
          {error && (
            <div
              style={{
                background: colors.errorLight,
                border: `1px solid ${colors.errorBorder}`,
                borderRadius: borderRadius.md,
                padding: '1rem',
                marginBottom: '1rem',
                color: colors.error,
              }}
            >
              {error}
            </div>
          )}

          {/* Generate Tab Content */}
          {activeTab === 'generate' && (
            <>
              {/* Initial State - Generate Button */}
              {ideas.length === 0 && !isLoading && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '3rem 2rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '3rem',
                      marginBottom: '1rem',
                    }}
                  >
                    *
                  </div>
                  <h3
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      color: colors.text,
                      marginBottom: '0.5rem',
                    }}
                  >
                    Generate Creative Story Ideas
                  </h3>
                  <p
                    style={{
                      color: colors.textSecondary,
                      marginBottom: '1.5rem',
                      maxWidth: '400px',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                    }}
                  >
                    Get 5 unique story ideas with character concepts, plot elements,
                    and unexpected twists tailored to your preferences.
                  </p>
                  <button
                    onClick={generateIdeas}
                    style={{
                      padding: '1rem 2rem',
                      background: gradients.brand,
                      border: 'none',
                      borderRadius: borderRadius.md,
                      color: '#FFFFFF',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: shadows.md,
                    }}
                  >
                    Generate Ideas
                  </button>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '3rem 2rem',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      border: `4px solid ${colors.border}`,
                      borderTopColor: colors.brandStart,
                      borderRadius: '50%',
                      margin: '0 auto 1rem',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <p style={{ color: colors.textSecondary }}>
                    Generating creative story ideas...
                  </p>
                  <style>{`
                    @keyframes spin {
                      to { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              )}

              {/* Ideas List */}
              {ideas.length > 0 && !isLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {ideas.map((idea, index) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      index={index}
                      isExpanded={expandedId === idea.id}
                      onToggleExpand={() => toggleExpand(idea.id)}
                      onRegenerateSection={(section) =>
                        regenerateSection(idea.id, section)
                      }
                      onSelect={() => handleSelectIdea(idea)}
                      onSave={() => saveIdea(idea)}
                      isRegenerating={isRegenerating}
                      isSaving={savingId === idea.id}
                      isSaved={savedIdsSet.has(idea.storyIdea)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Saved Ideas Tab Content */}
          {activeTab === 'saved' && (
            <>
              {isLoadingSaved && (
                <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                  <p style={{ color: colors.textSecondary }}>Loading saved ideas...</p>
                </div>
              )}

              {!isLoadingSaved && savedIdeas.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>
                    *
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: colors.text, marginBottom: '0.5rem' }}>
                    No Saved Ideas Yet
                  </h3>
                  <p style={{ color: colors.textSecondary, marginBottom: '1.5rem' }}>
                    Generate ideas and save the ones you like for later.
                  </p>
                  <button
                    onClick={() => setActiveTab('generate')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: gradients.brand,
                      border: 'none',
                      borderRadius: borderRadius.md,
                      color: '#FFFFFF',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Generate Ideas
                  </button>
                </div>
              )}

              {!isLoadingSaved && savedIdeas.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {savedIdeas.map((idea, index) => (
                    <SavedIdeaCard
                      key={idea.id}
                      idea={idea}
                      index={index}
                      isExpanded={expandedId === idea.id}
                      onToggleExpand={() => toggleExpand(idea.id)}
                      onSelect={() => handleSelectIdea(idea)}
                      onDelete={() => deleteSavedIdea(idea.id, idea.storyIdea)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'generate' && ideas.length > 0 && !isLoading && (
          <div
            style={{
              padding: '1rem 2rem',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              onClick={generateIdeas}
              style={{
                padding: '0.75rem 1.5rem',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.md,
                color: colors.brandStart,
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Generate More Ideas
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                border: 'none',
                color: colors.textSecondary,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual Idea Card Component
 */
interface IdeaCardProps {
  idea: GeneratedIdea;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRegenerateSection: (section: RegeneratableSection) => void;
  onSelect: () => void;
  onSave: () => void;
  isRegenerating: string | null;
  isSaving: boolean;
  isSaved: boolean;
}

function IdeaCard({
  idea,
  index,
  isExpanded,
  onToggleExpand,
  onRegenerateSection,
  onSelect,
  onSave,
  isRegenerating,
  isSaving,
  isSaved,
}: IdeaCardProps) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        transition: 'all 0.2s',
      }}
    >
      {/* Card Header - Always Visible */}
      <div
        onClick={onToggleExpand}
        style={{
          padding: '1.25rem',
          cursor: 'pointer',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            background: gradients.brand,
            borderRadius: borderRadius.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.875rem',
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: '1rem',
              color: colors.text,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {idea.storyIdea}
          </p>
        </div>
        <div
          style={{
            color: colors.textSecondary,
            fontSize: '1.25rem',
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          v
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          style={{
            borderTop: `1px solid ${colors.border}`,
            padding: '1.25rem',
            background: colors.background,
          }}
        >
          {/* Character Concepts */}
          <IdeaSection
            title="Character Concepts"
            items={idea.characterConcepts}
            onRegenerate={() => onRegenerateSection('characters')}
            isRegenerating={isRegenerating === `${idea.id}-characters`}
          />

          {/* Plot Elements */}
          <IdeaSection
            title="Plot Elements"
            items={idea.plotElements}
            onRegenerate={() => onRegenerateSection('plot')}
            isRegenerating={isRegenerating === `${idea.id}-plot`}
          />

          {/* Unique Twists */}
          <IdeaSection
            title="Unique Twists"
            items={idea.uniqueTwists}
            onRegenerate={() => onRegenerateSection('twists')}
            isRegenerating={isRegenerating === `${idea.id}-twists`}
          />

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              style={{
                flex: 1,
                padding: '1rem',
                background: gradients.brand,
                border: 'none',
                borderRadius: borderRadius.md,
                color: '#FFFFFF',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: shadows.md,
              }}
            >
              Use This Idea
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isSaved && !isSaving) {
                  onSave();
                }
              }}
              disabled={isSaved || isSaving}
              style={{
                padding: '1rem 1.5rem',
                background: isSaved ? '#10B981' : colors.surface,
                border: isSaved ? 'none' : `1px solid ${colors.border}`,
                borderRadius: borderRadius.md,
                color: isSaved ? '#FFFFFF' : colors.textSecondary,
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: isSaved || isSaving ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {isSaving ? (
                'Saving...'
              ) : isSaved ? (
                <>
                  <span>&#10003;</span> Saved
                </>
              ) : (
                'Save for Later'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Section Component for Character Concepts, Plot Elements, Twists
 */
interface IdeaSectionProps {
  title: string;
  items: string[];
  onRegenerate: () => void;
  isRegenerating: boolean;
}

function IdeaSection({
  title,
  items,
  onRegenerate,
  isRegenerating,
}: IdeaSectionProps) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <h4
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          {title}
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRegenerate();
          }}
          disabled={isRegenerating}
          style={{
            background: 'transparent',
            border: 'none',
            color: isRegenerating ? colors.textTertiary : colors.brandStart,
            fontSize: '0.75rem',
            cursor: isRegenerating ? 'wait' : 'pointer',
            padding: '0.25rem 0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          {isRegenerating ? (
            <>
              <span
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  border: '2px solid currentColor',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              Regenerating...
            </>
          ) : (
            'Regenerate'
          )}
        </button>
      </div>
      <ul
        style={{
          margin: 0,
          paddingLeft: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {items.map((item, i) => (
          <li
            key={i}
            style={{
              color: colors.text,
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Saved Idea Card Component - displays saved ideas with delete option
 */
interface SavedIdeaCardProps {
  idea: SavedIdea;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  onDelete: () => void;
}

function SavedIdeaCard({
  idea,
  index,
  isExpanded,
  onToggleExpand,
  onSelect,
  onDelete,
}: SavedIdeaCardProps) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        transition: 'all 0.2s',
      }}
    >
      {/* Card Header */}
      <div
        onClick={onToggleExpand}
        style={{
          padding: '1.25rem',
          cursor: 'pointer',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            background: '#10B981',
            borderRadius: borderRadius.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.75rem',
            flexShrink: 0,
          }}
        >
          &#10003;
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: '1rem',
              color: colors.text,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {idea.storyIdea}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '0.125rem 0.5rem',
                background: colors.brandStart + '20',
                color: colors.brandStart,
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              {idea.genre}
            </span>
            <span
              style={{
                padding: '0.125rem 0.5rem',
                background: colors.background,
                color: colors.textSecondary,
                borderRadius: '4px',
                fontSize: '0.75rem',
              }}
            >
              Saved {new Date(idea.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div
          style={{
            color: colors.textSecondary,
            fontSize: '1.25rem',
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          v
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          style={{
            borderTop: `1px solid ${colors.border}`,
            padding: '1.25rem',
            background: colors.background,
          }}
        >
          {/* Character Concepts */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 0.75rem 0',
              }}
            >
              Character Concepts
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {idea.characterConcepts.map((item, i) => (
                <li key={i} style={{ color: colors.text, fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Plot Elements */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 0.75rem 0',
              }}
            >
              Plot Elements
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {idea.plotElements.map((item, i) => (
                <li key={i} style={{ color: colors.text, fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Unique Twists */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 0.75rem 0',
              }}
            >
              Unique Twists
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {idea.uniqueTwists.map((item, i) => (
                <li key={i} style={{ color: colors.text, fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              style={{
                flex: 1,
                padding: '1rem',
                background: gradients.brand,
                border: 'none',
                borderRadius: borderRadius.md,
                color: '#FFFFFF',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: shadows.md,
              }}
            >
              Use This Idea
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this saved idea?')) {
                  onDelete();
                }
              }}
              style={{
                padding: '1rem 1.5rem',
                background: colors.errorLight,
                border: `1px solid ${colors.errorBorder}`,
                borderRadius: borderRadius.md,
                color: colors.error,
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
