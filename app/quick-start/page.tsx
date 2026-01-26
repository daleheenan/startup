'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GenerationProgress from '../components/GenerationProgress';
import { TimePeriodSelector, getTimeframeDescription } from '../components/TimePeriodSelector';
import type { TimePeriod } from '../../shared/types';
import { getToken } from '../lib/auth';
import PrimaryNavigationBar from '../components/shared/PrimaryNavigationBar';

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

export default function QuickStartPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  // Quick mode state
  const [quickGenres, setQuickGenres] = useState<string[]>([]);
  const [quickPrompt, setQuickPrompt] = useState<string>('');
  const [quickTimePeriod, setQuickTimePeriod] = useState<TimePeriod>({ type: 'present' });
  const [quickProjectType, setQuickProjectType] = useState<'standalone' | 'trilogy' | 'series'>('standalone');

  // Generation mode: 'full' = 5 detailed concepts, 'summaries' = 10 short story ideas
  const [generateMode, setGenerateMode] = useState<'full' | 'summaries'>('full');

  const handleSubmit = async (preferences: any, mode?: 'full' | 'summaries') => {
    const effectiveMode = mode || generateMode;
    setGenerateMode(effectiveMode);  // Sync state for UI
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

      if (effectiveMode === 'summaries') {
        // Two-stage workflow: Generate story ideas first
        setCurrentStep('Generating story ideas...');

        const response = await fetch(`${API_BASE_URL}/api/concepts/summaries`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            preferences: enhancedPreferences,
            count: 10
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to generate summaries');
        }

        setCurrentStep('Finalizing story ideas...');
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

        sessionStorage.setItem('generatedConcepts', JSON.stringify(data.concepts));
        sessionStorage.setItem('preferences', JSON.stringify(preferences));

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
  // Takes optional mode parameter to handle immediate mode changes (React state is async)
  const handleQuickSubmit = async (modeOverride?: 'full' | 'summaries') => {
    const effectiveMode = modeOverride || generateMode;

    if (quickGenres.length === 0) {
      setError('Please select at least one genre');
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

    // Merge configs from all selected genres
    const primaryGenre = quickGenres[0];
    const config = genreConfig[primaryGenre] || genreConfig['fantasy'];

    // If multiple genres selected, blend their themes and tones
    let allThemes = [...config.themes];
    let allTones = [...config.tones];
    if (quickGenres.length > 1) {
      const secondaryConfig = genreConfig[quickGenres[1]] || genreConfig['fantasy'];
      allThemes = Array.from(new Set<string>([...config.themes, ...secondaryConfig.themes])).slice(0, 3);
      allTones = Array.from(new Set<string>([...config.tones, ...secondaryConfig.tones])).slice(0, 2);
    }

    const quickPreferences = {
      genre: quickGenres.join(' + '),
      genres: quickGenres,
      subgenres: config.subgenres,
      modifiers: [],
      tone: allTones[0],
      tones: allTones,
      themes: allThemes,
      customIdeas: quickPrompt.trim() || undefined,
      targetLength: 80000,
      projectType: quickProjectType,
      // Time period settings
      timeframe: quickTimePeriod.type !== 'present' ? getTimeframeDescription(quickTimePeriod) : undefined,
      timePeriod: quickTimePeriod.type !== 'present' ? quickTimePeriod : undefined,
      timePeriodType: quickTimePeriod.type !== 'present' ? quickTimePeriod.type : undefined,
      specificYear: quickTimePeriod.type === 'custom' ? quickTimePeriod.year : undefined,
    };

    await handleSubmit(quickPreferences, effectiveMode);
  };

  // Generate a 3-line book idea based on selected settings
  const handleInspireMe = () => {
    // If no genre selected, pick a random one
    if (quickGenres.length === 0) {
      const randomGenre = QUICK_GENRES[Math.floor(Math.random() * QUICK_GENRES.length)];
      setQuickGenres([randomGenre.value]);
    }

    // Build a 3-line book idea
    const genre = QUICK_GENRES.find(g => g.value === quickGenres[0])?.label || 'Fiction';
    const tone = INSPIRATION_TONES[Math.floor(Math.random() * INSPIRATION_TONES.length)];
    const theme = INSPIRATION_THEMES[Math.floor(Math.random() * INSPIRATION_THEMES.length)];
    const basePrompt = INSPIRATION_PROMPTS[Math.floor(Math.random() * INSPIRATION_PROMPTS.length)];

    // Line 1: Core concept
    let line1 = basePrompt;

    // Line 2: Tone and stakes
    const stakesOptions = [
      'Everything they know is about to change forever',
      'But the truth could destroy everything',
      'Time is running out to save what matters most',
      'The price of success might be too high to pay',
      'Nothing will ever be the same again',
      'The stakes have never been higher'
    ];
    const line2 = `${tone}, with ${theme.toLowerCase()} at its core. ${stakesOptions[Math.floor(Math.random() * stakesOptions.length)]}.`;

    // Line 3: Hook/setting
    let line3 = `A ${genre.toLowerCase()} story`;
    if (quickTimePeriod.type !== 'present') {
      const timePeriodDesc = getTimeframeDescription(quickTimePeriod);
      line3 += ` set in ${timePeriodDesc.toLowerCase()}`;
    }
    if (quickProjectType === 'trilogy') {
      line3 += ' - perfect for a trilogy.';
    } else if (quickProjectType === 'series') {
      line3 += ' - with series potential.';
    } else {
      line3 += ' that will captivate readers.';
    }

    const enhancedPrompt = `${line1}\n\n${line2}\n\n${line3}`;
    setQuickPrompt(enhancedPrompt);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Primary Navigation Bar */}
      <PrimaryNavigationBar activeSection="quick-start" />

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
              Quick Start
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Pick a genre and generate concepts in seconds
            </p>
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
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
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
                  Choose Primary Genres <span style={{ color: '#DC2626' }}>*</span>
                  <span style={{ color: '#64748B', fontWeight: 400, marginLeft: '0.5rem', fontSize: '0.813rem' }}>
                    (Select 1-2)
                  </span>
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.75rem',
                }}>
                  {QUICK_GENRES.map(genre => {
                    const isSelected = quickGenres.includes(genre.value);
                    const canSelect = quickGenres.length < 2 || isSelected;
                    return (
                      <button
                        key={genre.value}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setQuickGenres(quickGenres.filter(g => g !== genre.value));
                          } else if (canSelect) {
                            setQuickGenres([...quickGenres, genre.value]);
                          }
                        }}
                        disabled={isGenerating || (!canSelect && !isSelected)}
                        style={{
                          padding: '1rem 0.75rem',
                          background: isSelected
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : '#F8FAFC',
                          border: isSelected
                            ? '2px solid #667eea'
                            : '1px solid #E2E8F0',
                          borderRadius: '12px',
                          color: isSelected ? '#FFFFFF' : '#374151',
                          cursor: (isGenerating || (!canSelect && !isSelected)) ? 'not-allowed' : 'pointer',
                          opacity: (!canSelect && !isSelected) ? 0.5 : 1,
                          transition: 'all 0.2s',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{genre.emoji}</div>
                        <div style={{ fontSize: '0.813rem', fontWeight: 500 }}>{genre.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Project Structure Selection */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  color: '#374151',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}>
                  Project Structure
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                }}>
                  <button
                    type="button"
                    onClick={() => setQuickProjectType('standalone')}
                    disabled={isGenerating}
                    style={{
                      padding: '1rem 0.75rem',
                      background: quickProjectType === 'standalone'
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : '#F8FAFC',
                      border: quickProjectType === 'standalone'
                        ? '2px solid #667eea'
                        : '1px solid #E2E8F0',
                      borderRadius: '8px',
                      color: quickProjectType === 'standalone' ? '#FFFFFF' : '#374151',
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📖</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Standalone</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '0.25rem' }}>Single book</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickProjectType('trilogy')}
                    disabled={isGenerating}
                    style={{
                      padding: '1rem 0.75rem',
                      background: quickProjectType === 'trilogy'
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : '#F8FAFC',
                      border: quickProjectType === 'trilogy'
                        ? '2px solid #667eea'
                        : '1px solid #E2E8F0',
                      borderRadius: '8px',
                      color: quickProjectType === 'trilogy' ? '#FFFFFF' : '#374151',
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📚</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Trilogy</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '0.25rem' }}>3 books</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickProjectType('series')}
                    disabled={isGenerating}
                    style={{
                      padding: '1rem 0.75rem',
                      background: quickProjectType === 'series'
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : '#F8FAFC',
                      border: quickProjectType === 'series'
                        ? '2px solid #667eea'
                        : '1px solid #E2E8F0',
                      borderRadius: '8px',
                      color: quickProjectType === 'series' ? '#FFFFFF' : '#374151',
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📚📚</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Series</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '0.25rem' }}>4+ books</div>
                  </button>
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
                    Inspire Me
                  </button>
                </div>
                <textarea
                  value={quickPrompt}
                  onChange={(e) => setQuickPrompt(e.target.value)}
                  placeholder="e.g., 'A young wizard discovers a forbidden spell that could save or destroy the kingdom'"
                  rows={5}
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
                  Click "Inspire Me" to generate a 3-line book idea based on your selections
                </div>
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
                  gridTemplateColumns: 'repeat(2, 1fr)',
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
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💡</div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.875rem' }}>10 Story Ideas</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, lineHeight: '1.3' }}>Quick ideas to explore and save</div>
                  </button>
                </div>
              </div>

              {/* Action Buttons - Two Separate Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => handleQuickSubmit('full')}
                  disabled={quickGenres.length === 0 || isGenerating}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    background: (quickGenres.length === 0 || isGenerating)
                      ? '#94A3B8'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    cursor: (quickGenres.length === 0 || isGenerating) ? 'not-allowed' : 'pointer',
                    boxShadow: (quickGenres.length === 0 || isGenerating) ? 'none' : '0 4px 14px rgba(102, 126, 234, 0.4)',
                    transition: 'all 0.2s',
                  }}
                >
                  {isGenerating && generateMode === 'full'
                    ? 'Generating...'
                    : 'Generate 5 Full Concepts'
                  }
                </button>
                <button
                  onClick={() => handleQuickSubmit('summaries')}
                  disabled={quickGenres.length === 0 || isGenerating}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    background: (quickGenres.length === 0 || isGenerating)
                      ? '#94A3B8'
                      : '#F8FAFC',
                    border: (quickGenres.length === 0 || isGenerating) ? 'none' : '2px solid #667eea',
                    borderRadius: '8px',
                    color: (quickGenres.length === 0 || isGenerating) ? '#FFFFFF' : '#667eea',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    cursor: (quickGenres.length === 0 || isGenerating) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {isGenerating && generateMode === 'summaries'
                    ? 'Generating...'
                    : 'Generate 10 Story Ideas'
                  }
                </button>
              </div>
            </div>

            {/* Progress Indicator Modal */}
            <GenerationProgress
              isActive={isGenerating}
              title={generateMode === 'summaries' ? "Generating Story Ideas" : "Generating Story Concepts"}
              subtitle={generateMode === 'summaries'
                ? "Creating quick story ideas based on your preferences"
                : "Creating detailed story concepts based on your preferences"}
              currentStep={currentStep}
              estimatedTime={generateMode === 'summaries' ? 45 : 90}
              error={error}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
