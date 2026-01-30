'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GenerationProgress from '../components/GenerationProgress';
import { getToken } from '../lib/auth';
import PrimaryNavigationBar from '../components/shared/PrimaryNavigationBar';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ConceptSummary {
  id: string;
  title: string;
  logline: string;
}

interface SavedSummary extends ConceptSummary {
  dbId?: string;
  preferences?: any;
  notes?: string;
  status?: string;
}

export default function SummariesPage() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<ConceptSummary[]>([]);
  const [preferences, setPreferences] = useState<any>(null);
  const [selectedSummaries, setSelectedSummaries] = useState<Set<string>>(new Set());
  const [savedSummaryIds, setSavedSummaryIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  useEffect(() => {
    try {
      const summariesData = sessionStorage.getItem('generatedSummaries');
      const prefsData = sessionStorage.getItem('summaryPreferences');

      if (!summariesData || !prefsData) {
        // Check if we're coming from saved summaries page
        const savedData = sessionStorage.getItem('expandSummary');
        if (savedData) {
          const { summary, preferences: savedPrefs } = JSON.parse(savedData);
          setSummaries([summary]);
          setPreferences(savedPrefs);
          setSelectedSummaries(new Set([summary.id]));
          sessionStorage.removeItem('expandSummary');
          return;
        }
        router.push('/new');
        return;
      }

      const parsedSummaries = JSON.parse(summariesData);
      const parsedPrefs = JSON.parse(prefsData);

      if (Array.isArray(parsedSummaries) && parsedPrefs) {
        setSummaries(parsedSummaries);
        setPreferences(parsedPrefs);
      } else {
        router.push('/new');
      }
    } catch (err) {
      console.error('Error loading summaries:', err);
      router.push('/new');
    }
  }, [router]);

  const handleToggleSummary = (id: string) => {
    const newSelected = new Set(selectedSummaries);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSummaries(newSelected);
  };

  const handleSaveSummary = async (summary: ConceptSummary) => {
    if (savedSummaryIds.has(summary.id)) return;

    setIsSaving(summary.id);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/saved-concept-summaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ summary, preferences }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save summary');
      }

      setSavedSummaryIds(prev => new Set(prev).add(summary.id));
    } catch (err: any) {
      console.error('Error saving summary:', err);
      setError(err.message || 'Failed to save summary');
    } finally {
      setIsSaving(null);
    }
  };

  const handleExpandSelected = async () => {
    if (selectedSummaries.size === 0) {
      setError('Please select at least one summary to expand');
      return;
    }

    setIsExpanding(true);
    setError(null);
    setCurrentStep('Connecting to AI service...');

    try {
      const token = getToken();
      const selected = summaries.filter(s => selectedSummaries.has(s.id));

      setCurrentStep('Expanding summaries into full concepts...');

      const response = await fetch(`${API_BASE_URL}/api/concepts/expand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ preferences, selectedSummaries: selected }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to expand summaries');
      }

      setCurrentStep('Finalizing expanded concepts...');
      const data = await response.json();

      // Store expanded concepts and redirect to concepts page
      sessionStorage.setItem('generatedConcepts', JSON.stringify(data.concepts));
      sessionStorage.setItem('preferences', JSON.stringify(preferences));

      await new Promise(resolve => setTimeout(resolve, 0));

      router.push('/concepts');
    } catch (err: any) {
      console.error('Error expanding summaries:', err);
      setError(err.message || 'Failed to expand summaries');
      setIsExpanding(false);
    }
  };

  const handleRegenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setCurrentStep('Generating fresh summaries...');

    try {
      const token = getToken();

      const prefsWithTimestamp = {
        ...preferences,
        regenerationTimestamp: Date.now(),
      };

      const response = await fetch(`${API_BASE_URL}/api/concepts/summaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ preferences: prefsWithTimestamp }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to regenerate summaries');
      }

      setCurrentStep('Finalizing new summaries...');
      const data = await response.json();
      setSummaries(data.summaries);
      setSelectedSummaries(new Set());
      setSavedSummaryIds(new Set());

      sessionStorage.setItem('generatedSummaries', JSON.stringify(data.summaries));
    } catch (err: any) {
      console.error('Error regenerating summaries:', err);
      setError(err.message || 'Failed to regenerate summaries');
    } finally {
      setIsGenerating(false);
      setCurrentStep('');
    }
  };

  const handleCancel = () => {
    setIsGenerating(false);
    setIsExpanding(false);
    setError(null);
    setCurrentStep('');
  };

  if (summaries.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            width: '48px',
            height: '48px',
            border: '3px solid #E2E8F0',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '1rem', color: '#64748B' }}>Loading summaries...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
    }}>
      {/* Primary Navigation Bar */}
      <PrimaryNavigationBar activeSection="story-ideas" />

      {/* Main Content */}
      <main style={{ display: 'flex', flexDirection: 'column' }}>
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
              Story Ideas
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Select story ideas to expand into full concepts, or save for later
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link
              href="/story-ideas"
              style={{
                padding: '0.5rem 1rem',
                color: '#667eea',
                textDecoration: 'none',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              View Saved Story Ideas
            </Link>
            <Link
              href="/new"
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
              ← Start Over
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* User Selections Summary */}
            {preferences && (
              <div style={{
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: '12px',
                padding: '1rem 1.5rem',
                marginBottom: '1.5rem',
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369A1', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Your Selections
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                  {preferences.genres && preferences.genres.length > 0 && (
                    <span style={{
                      padding: '0.375rem 0.75rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#FFFFFF',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      borderRadius: '9999px',
                    }}>
                      {preferences.genres.join(' + ')}
                    </span>
                  )}
                  {preferences.projectType && (
                    <span style={{
                      padding: '0.375rem 0.75rem',
                      background: '#E2E8F0',
                      color: '#475569',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      borderRadius: '9999px',
                    }}>
                      {preferences.projectType === 'standalone' ? 'Standalone' : preferences.projectType === 'trilogy' ? 'Trilogy' : 'Series'}
                    </span>
                  )}
                  {preferences.timePeriod && preferences.timePeriod.type !== 'present' && (
                    <span style={{
                      padding: '0.375rem 0.75rem',
                      background: '#FEF3C7',
                      color: '#92400E',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      borderRadius: '9999px',
                    }}>
                      {preferences.timeframe || (preferences.timePeriod.type === 'past' ? 'Historical' : preferences.timePeriod.type === 'future' ? 'Future' : 'Custom Era')}
                    </span>
                  )}
                  {preferences.customIdeas && (
                    <span style={{
                      padding: '0.375rem 0.75rem',
                      background: '#ECFDF5',
                      color: '#065F46',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      borderRadius: '9999px',
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      Idea: {preferences.customIdeas.substring(0, 50)}{preferences.customIdeas.length > 50 ? '...' : ''}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '1rem 1.5rem',
                marginBottom: '1.5rem',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                {error}
              </div>
            )}

            {/* Selection Info */}
            <div style={{
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ color: '#0369A1', fontSize: '0.875rem' }}>
                {selectedSummaries.size === 0
                  ? 'Click on story ideas to select them for expansion'
                  : `${selectedSummaries.size} story idea${selectedSummaries.size > 1 ? 's' : ''} selected`
                }
              </span>
              {selectedSummaries.size > 0 && (
                <button
                  onClick={() => setSelectedSummaries(new Set())}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#0369A1',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    textDecoration: 'underline',
                  }}
                >
                  Clear selection
                </button>
              )}
            </div>

            {/* Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}>
              {summaries.map((summary) => (
                <div
                  key={summary.id}
                  onClick={() => handleToggleSummary(summary.id)}
                  style={{
                    background: '#FFFFFF',
                    border: selectedSummaries.has(summary.id)
                      ? '2px solid #667eea'
                      : '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: selectedSummaries.has(summary.id)
                      ? '0 4px 14px rgba(102, 126, 234, 0.2)'
                      : '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.75rem',
                  }}>
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#1A1A2E',
                      margin: 0,
                      flex: 1,
                    }}>
                      {summary.title}
                    </h3>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: selectedSummaries.has(summary.id)
                        ? '2px solid #667eea'
                        : '2px solid #E2E8F0',
                      background: selectedSummaries.has(summary.id) ? '#667eea' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginLeft: '0.75rem',
                    }}>
                      {selectedSummaries.has(summary.id) && (
                        <span style={{ color: '#FFFFFF', fontSize: '0.75rem' }}>Y</span>
                      )}
                    </div>
                  </div>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#64748B',
                    margin: 0,
                    lineHeight: 1.6,
                  }}>
                    {summary.logline}
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginTop: '1rem',
                    justifyContent: 'flex-end',
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveSummary(summary);
                      }}
                      disabled={savedSummaryIds.has(summary.id) || isSaving === summary.id}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: savedSummaryIds.has(summary.id) ? '#10B981' : '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        color: savedSummaryIds.has(summary.id) ? '#FFFFFF' : '#64748B',
                        fontSize: '0.75rem',
                        cursor: savedSummaryIds.has(summary.id) ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      {isSaving === summary.id
                        ? 'Saving...'
                        : savedSummaryIds.has(summary.id)
                        ? 'Saved'
                        : 'Save for Later'
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
            }}>
              <button
                onClick={handleRegenerate}
                disabled={isGenerating || isExpanding}
                style={{
                  padding: '1rem 2rem',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#374151',
                  fontSize: '1rem',
                  fontWeight: 500,
                  cursor: (isGenerating || isExpanding) ? 'not-allowed' : 'pointer',
                  opacity: (isGenerating || isExpanding) ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {isGenerating ? 'Regenerating...' : 'Regenerate Story Ideas'}
              </button>

              <button
                onClick={handleExpandSelected}
                disabled={selectedSummaries.size === 0 || isGenerating || isExpanding}
                style={{
                  padding: '1rem 2rem',
                  background: (selectedSummaries.size === 0 || isGenerating || isExpanding)
                    ? '#94A3B8'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: (selectedSummaries.size === 0 || isGenerating || isExpanding) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: (selectedSummaries.size === 0 || isGenerating || isExpanding)
                    ? 'none'
                    : '0 4px 14px rgba(102, 126, 234, 0.4)',
                }}
              >
                {isExpanding
                  ? 'Expanding...'
                  : selectedSummaries.size === 0
                  ? 'Select Story Idea to Expand'
                  : `Expand ${selectedSummaries.size} Story Idea${selectedSummaries.size > 1 ? 's' : ''} to Full Concepts`
                }
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Progress Modal */}
      <GenerationProgress
        isActive={isGenerating || isExpanding}
        title={isExpanding ? 'Expanding Story Ideas' : 'Generating Story Ideas'}
        subtitle={isExpanding ? 'Creating detailed concepts from your selections' : 'Creating fresh story ideas'}
        currentStep={currentStep}
        estimatedTime={isExpanding ? 60 : 45}
        error={error}
        onCancel={handleCancel}
      />
    </div>
  );
}
