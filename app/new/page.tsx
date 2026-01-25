'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import GenerationProgress from '../components/GenerationProgress';
import { TimePeriodSelector, getTimeframeDescription } from '../components/TimePeriodSelector';
import type { TimePeriod } from '../../shared/types';
import { getToken } from '../lib/auth';

// Lazy load GenrePreferenceForm - form with complex validation
const GenrePreferenceForm = dynamic(() => import('../components/GenrePreferenceForm'), {
  loading: () => (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
      Loading form...
    </div>
  ),
  ssr: false,
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Time period constraints for concept generation
const TIME_PERIOD_CONSTRAINTS: Record<string, { prohibitions: string[] }> = {
  'modern-day': {
    prohibitions: [
      'faster-than-light travel',
      'generation ships',
      'terraforming planets',
      'interstellar civilizations',
      'technology beyond near-future',
      'alien civilizations',
      'space colonies',
      'warp drives',
      'time travel',
      'cybernetic implants beyond current medical technology'
    ]
  },
  'historical': {
    prohibitions: [
      'modern technology',
      'computers',
      'internet',
      'smartphones',
      'electricity (depending on specific era)',
      'automobiles (depending on specific era)',
      'firearms (depending on specific era)'
    ]
  }
};

// Quick mode genre options
const QUICK_GENRES = [
  { value: 'fantasy', label: 'Fantasy', emoji: '🧙' },
  { value: 'science-fiction', label: 'Sci-Fi', emoji: '🚀' },
  { value: 'romance', label: 'Romance', emoji: '💕' },
  { value: 'mystery', label: 'Mystery', emoji: '🔍' },
  { value: 'thriller', label: 'Thriller', emoji: '⚡' },
  { value: 'horror', label: 'Horror', emoji: '👻' },
  { value: 'historical', label: 'Historical', emoji: '📜' },
  { value: 'contemporary', label: 'Contemporary', emoji: '🌆' },
];

// Random inspiration data
const INSPIRATION_PROMPTS = [
  'A librarian discovers books can predict the future',
  'A retired spy receives a message from their past',
  'A small town hides an ancient secret',
  'Two rivals forced to work together on a heist',
  'A magical inheritance comes with a dangerous price',
  'An AI develops consciousness and seeks its creator',
  'A detective solves crimes using time travel',
  'A forbidden romance across warring kingdoms',
  'A chef discovers their recipes have magical effects',
  'A group of strangers wake up with no memory in a locked building',
  'A musician discovers their songs affect reality',
  'An archaeologist finds proof of an advanced ancient civilization',
];

const INSPIRATION_TONES = [
  'Dark and Gritty',
  'Light and Humorous',
  'Epic and Grand',
  'Intimate and Personal',
  'Mysterious and Suspenseful',
  'Hopeful and Uplifting',
  'Tense and Fast-Paced',
  'Romantic and Passionate',
];

const INSPIRATION_THEMES = [
  'Power and Corruption',
  'Love and Sacrifice',
  'Revenge and Justice',
  'Identity and Self-Discovery',
  'Survival',
  'Family and Loyalty',
  'Freedom and Oppression',
  'Redemption',
  'Coming of Age',
];

export default function NewProjectPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'quick' | 'full'>('quick');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  // Quick mode state
  const [quickGenre, setQuickGenre] = useState<string>('');
  const [quickPrompt, setQuickPrompt] = useState<string>('');
  const [quickTimePeriod, setQuickTimePeriod] = useState<TimePeriod>({ type: 'present' });

  // Generation mode: 'full' = 5 detailed concepts, 'summaries' = 10 short summaries, 'quick20' = 20 quick summaries
  const [generateMode, setGenerateMode] = useState<'full' | 'summaries' | 'quick20'>('full');

  const handleSubmit = async (preferences: any) => {
    setIsGenerating(true);
    setError(null);
    setCurrentStep('Connecting to AI service...');

    try {
      const token = getToken();

      // Add time period constraints if applicable
      let enhancedPreferences = { ...preferences };
      if (preferences.timePeriod) {
        const timePeriodType = preferences.timePeriod.type;
        if (timePeriodType === 'present') {
          enhancedPreferences.timePeriodConstraints = TIME_PERIOD_CONSTRAINTS['modern-day'];
        } else if (timePeriodType === 'past') {
          enhancedPreferences.timePeriodConstraints = TIME_PERIOD_CONSTRAINTS['historical'];
        }
      }

      if (generateMode === 'summaries' || generateMode === 'quick20') {
        // Two-stage workflow: Generate summaries first
        setCurrentStep(generateMode === 'quick20' ? 'Generating 20 concept summaries...' : 'Generating concept summaries...');

        const response = await fetch(`${API_BASE_URL}/api/concepts/summaries`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            preferences: enhancedPreferences,
            count: generateMode === 'quick20' ? 20 : 10
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to generate summaries');
        }

        setCurrentStep('Finalizing summaries...');
        const data = await response.json();

        sessionStorage.setItem('generatedSummaries', JSON.stringify(data.summaries));
        sessionStorage.setItem('summaryPreferences', JSON.stringify(preferences));

        await new Promise(resolve => setTimeout(resolve, 0));

        router.push('/summaries');
      } else {
        // Direct full concept generation (existing behavior)
        setCurrentStep('Analyzing your genre preferences...');

        const response = await fetch(`${API_BASE_URL}/api/concepts/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ preferences: enhancedPreferences }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to generate concepts');
        }

        setCurrentStep('Finalizing story concepts...');
        const data = await response.json();

        // BUG-002 FIX: Ensure sessionStorage writes complete before redirect
        sessionStorage.setItem('generatedConcepts', JSON.stringify(data.concepts));
        sessionStorage.setItem('preferences', JSON.stringify(preferences));

        // Wait for next tick to ensure storage writes are flushed
        await new Promise(resolve => setTimeout(resolve, 0));

        router.push('/concepts');
      }
    } catch (err: any) {
      console.error('Error generating concepts:', err);
      setError(err.message || 'An error occurred while generating concepts');
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setIsGenerating(false);
    setError(null);
    setCurrentStep('');
  };

  // Handle quick mode submission
  const handleQuickSubmit = async () => {
    if (!quickGenre) {
      setError('Please select a genre');
      return;
    }

    // Build smart defaults for quick mode
    const genreConfig: Record<string, { subgenres: string[], themes: string[], tones: string[] }> = {
      'fantasy': {
        subgenres: ['Epic Fantasy'],
        themes: ['Power and Corruption', 'Identity and Self-Discovery'],
        tones: ['Epic and Grand'],
      },
      'science-fiction': {
        subgenres: ['Space Opera'],
        themes: ['Nature vs Technology', 'Survival'],
        tones: ['Tense and Fast-Paced'],
      },
      'romance': {
        subgenres: ['Contemporary Romance'],
        themes: ['Love and Sacrifice', 'Identity and Self-Discovery'],
        tones: ['Romantic and Passionate'],
      },
      'mystery': {
        subgenres: ['Detective'],
        themes: ['Secrets and Lies', 'Truth and Deception'],
        tones: ['Mysterious and Suspenseful'],
      },
      'thriller': {
        subgenres: ['Psychological Thriller'],
        themes: ['Survival', 'Betrayal and Trust'],
        tones: ['Tense and Fast-Paced'],
      },
      'horror': {
        subgenres: ['Supernatural Horror'],
        themes: ['Survival', 'Secrets and Lies'],
        tones: ['Dark and Gritty'],
      },
      'historical': {
        subgenres: ['Victorian Era'],
        themes: ['Class and Society', 'Legacy and Heritage'],
        tones: ['Epic and Grand'],
      },
      'contemporary': {
        subgenres: ['Family Drama'],
        themes: ['Family and Loyalty', 'Identity and Self-Discovery'],
        tones: ['Intimate and Personal'],
      },
    };

    const config = genreConfig[quickGenre] || genreConfig['fantasy'];

    const quickPreferences = {
      genre: quickGenre,
      genres: [quickGenre],
      subgenres: config.subgenres,
      modifiers: [],
      tone: config.tones[0],
      tones: config.tones,
      themes: config.themes,
      customIdeas: quickPrompt.trim() || undefined,
      targetLength: 80000,
      projectType: 'standalone' as const,
      // Time period settings
      timeframe: quickTimePeriod.type !== 'present' ? getTimeframeDescription(quickTimePeriod) : undefined,
      timePeriod: quickTimePeriod.type !== 'present' ? quickTimePeriod : undefined,
      timePeriodType: quickTimePeriod.type !== 'present' ? quickTimePeriod.type : undefined,
      specificYear: quickTimePeriod.type === 'custom' ? quickTimePeriod.year : undefined,
    };

    await handleSubmit(quickPreferences);
  };

  // Generate random inspiration
  const handleInspireMe = () => {
    // If no genre selected, pick a random one
    if (!quickGenre) {
      const randomGenre = QUICK_GENRES[Math.floor(Math.random() * QUICK_GENRES.length)];
      setQuickGenre(randomGenre.value);
    }

    // Pick random prompt appropriate to the genre
    const randomPrompt = INSPIRATION_PROMPTS[Math.floor(Math.random() * INSPIRATION_PROMPTS.length)];

    // Enhance prompt based on time period if selected
    let enhancedPrompt = randomPrompt;
    if (quickTimePeriod.type !== 'present') {
      const timePeriodDesc = getTimeframeDescription(quickTimePeriod);
      enhancedPrompt = `${randomPrompt} (Set in: ${timePeriodDesc})`;
    }

    setQuickPrompt(enhancedPrompt);
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#F8FAFC',
    }}>
      {/* Left Sidebar */}
      <aside style={{
        width: '72px',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem 0',
      }}>
        <Link
          href="/projects"
          style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: '1.25rem',
            textDecoration: 'none',
          }}
        >
          N
        </Link>
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
              Create New Novel
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Tell us about your story and we'll generate concepts
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link
              href="/saved-summaries"
              style={{
                padding: '0.5rem 1rem',
                color: '#667eea',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              Saved Summaries
            </Link>
            <Link
              href="/projects"
              style={{
                padding: '0.5rem 1rem',
                color: '#64748B',
                textDecoration: 'none',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              ← Back to Projects
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{ maxWidth: '700px', width: '100%' }}>
            {/* Mode Toggle */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              padding: '0.25rem',
              background: '#F1F5F9',
              borderRadius: '8px',
              width: 'fit-content',
            }}>
              <button
                onClick={() => setMode('quick')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: mode === 'quick' ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: mode === 'quick' ? '#1A1A2E' : '#64748B',
                  fontWeight: mode === 'quick' ? 600 : 400,
                  cursor: 'pointer',
                  boxShadow: mode === 'quick' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                ⚡ Quick Mode
              </button>
              <button
                onClick={() => setMode('full')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: mode === 'full' ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: mode === 'full' ? '#1A1A2E' : '#64748B',
                  fontWeight: mode === 'full' ? 600 : 400,
                  cursor: 'pointer',
                  boxShadow: mode === 'full' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                🎨 Full Customization
              </button>
            </div>

            {/* Quick Mode */}
            {mode === 'quick' && (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1A1A2E', marginBottom: '0.5rem' }}>
                    Quick Start
                  </h2>
                  <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
                    Pick a genre, optionally describe your idea, and we'll generate concepts in seconds
                  </p>
                </div>

                {/* Error message */}
                {error && (
                  <div style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.5rem',
                    color: '#DC2626',
                    fontSize: '0.875rem',
                  }}>
                    {error}
                  </div>
                )}

                {/* Genre Selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.75rem',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}>
                    Choose a Genre <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0.75rem',
                  }}>
                    {QUICK_GENRES.map(genre => (
                      <button
                        key={genre.value}
                        type="button"
                        onClick={() => setQuickGenre(genre.value)}
                        disabled={isGenerating}
                        style={{
                          padding: '1rem 0.75rem',
                          background: quickGenre === genre.value
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : '#F8FAFC',
                          border: quickGenre === genre.value
                            ? '2px solid #667eea'
                            : '1px solid #E2E8F0',
                          borderRadius: '12px',
                          color: quickGenre === genre.value ? '#FFFFFF' : '#374151',
                          cursor: isGenerating ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{genre.emoji}</div>
                        <div style={{ fontSize: '0.813rem', fontWeight: 500 }}>{genre.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Idea Input */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label style={{
                      color: '#374151',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      margin: 0,
                    }}>
                      Describe Your Idea <span style={{ color: '#64748B', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <button
                      onClick={handleInspireMe}
                      disabled={isGenerating}
                      type="button"
                      style={{
                        padding: '0.5rem 0.875rem',
                        background: '#FFFFFF',
                        border: '1px solid #667eea',
                        borderRadius: '6px',
                        color: '#667eea',
                        fontSize: '0.813rem',
                        fontWeight: 500,
                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                      }}
                    >
                      ✨ Inspire Me
                    </button>
                  </div>
                  <textarea
                    value={quickPrompt}
                    onChange={(e) => setQuickPrompt(e.target.value)}
                    placeholder="e.g., 'A young wizard discovers a forbidden spell that could save or destroy the kingdom'"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      color: '#1A1A2E',
                      fontSize: '1rem',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                    disabled={isGenerating}
                  />
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748B' }}>
                    Generates a description based on your selected genre and time period
                  </div>
                </div>

                {/* Time Period Selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.75rem',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}>
                    Time Period <span style={{ fontWeight: 400, color: '#64748B' }}>(optional)</span>
                  </label>
                  <TimePeriodSelector
                    value={quickTimePeriod}
                    onChange={setQuickTimePeriod}
                    disabled={isGenerating}
                    compact={true}
                  />
                </div>

                {/* Generation Mode Selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.75rem',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}>
                    Generation Mode
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem',
                  }}>
                    <button
                      type="button"
                      onClick={() => setGenerateMode('full')}
                      disabled={isGenerating}
                      style={{
                        padding: '1rem 0.75rem',
                        background: generateMode === 'full'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : '#F8FAFC',
                        border: generateMode === 'full'
                          ? '2px solid #667eea'
                          : '1px solid #E2E8F0',
                        borderRadius: '8px',
                        color: generateMode === 'full' ? '#FFFFFF' : '#374151',
                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📚</div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.875rem' }}>5 Full Concepts</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.8, lineHeight: '1.3' }}>Detailed concepts ready to use</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenerateMode('summaries')}
                      disabled={isGenerating}
                      style={{
                        padding: '1rem 0.75rem',
                        background: generateMode === 'summaries'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : '#F8FAFC',
                        border: generateMode === 'summaries'
                          ? '2px solid #667eea'
                          : '1px solid #E2E8F0',
                        borderRadius: '8px',
                        color: generateMode === 'summaries' ? '#FFFFFF' : '#374151',
                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📝</div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.875rem' }}>10 Quick Summaries</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.8, lineHeight: '1.3' }}>Browse ideas, save favorites</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenerateMode('quick20')}
                      disabled={isGenerating}
                      style={{
                        padding: '1rem 0.75rem',
                        background: generateMode === 'quick20'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : '#F8FAFC',
                        border: generateMode === 'quick20'
                          ? '2px solid #667eea'
                          : '1px solid #E2E8F0',
                        borderRadius: '8px',
                        color: generateMode === 'quick20' ? '#FFFFFF' : '#374151',
                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.875rem' }}>20 Quick Summaries</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.8, lineHeight: '1.3' }}>Maximum variety to explore</div>
                    </button>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={handleQuickSubmit}
                  disabled={!quickGenre || isGenerating}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: (!quickGenre || isGenerating)
                      ? '#94A3B8'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: (!quickGenre || isGenerating) ? 'not-allowed' : 'pointer',
                    boxShadow: (!quickGenre || isGenerating) ? 'none' : '0 4px 14px rgba(102, 126, 234, 0.4)',
                    transition: 'all 0.2s',
                  }}
                >
                  {isGenerating
                    ? 'Generating...'
                    : generateMode === 'quick20'
                    ? '⚡ Generate 20 Summaries'
                    : generateMode === 'summaries'
                    ? '📝 Generate 10 Summaries'
                    : '⚡ Generate 5 Concepts'
                  }
                </button>

                {/* Switch to Full Mode Link */}
                <div style={{
                  marginTop: '1.5rem',
                  textAlign: 'center',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid #E2E8F0',
                }}>
                  <p style={{ fontSize: '0.875rem', color: '#64748B' }}>
                    Want more control over your story's tone, themes, and style?
                  </p>
                  <button
                    onClick={() => setMode('full')}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: 'none',
                      border: 'none',
                      color: '#667eea',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Switch to Full Customization →
                  </button>
                </div>
              </div>
            )}

            {/* Full Mode */}
            {mode === 'full' && (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <GenrePreferenceForm
                  onSubmit={handleSubmit}
                  isLoading={isGenerating}
                />
              </div>
            )}

            {/* Progress Indicator Modal */}
            <GenerationProgress
              isActive={isGenerating}
              title="Generating Story Concepts"
              subtitle="Creating unique story ideas based on your preferences"
              currentStep={currentStep}
              estimatedTime={90}
              error={error}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </main>

          </div>
  );
}
