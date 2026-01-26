'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import GenerationProgress from '../components/GenerationProgress';
import { getToken } from '../lib/auth';
import PrimaryNavigationBar from '../components/shared/PrimaryNavigationBar';

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

export default function FullCustomizationPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

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

      // Use generateMode from preferences if provided
      const effectiveGenerateMode = preferences.generateMode || 'full';

      if (effectiveGenerateMode === 'summaries') {
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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Primary Navigation Bar */}
      <PrimaryNavigationBar activeSection="fully-customized" />

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
              Full Customization
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Fine-tune every aspect of your story's genre, tone, and themes
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
              <GenrePreferenceForm
                onSubmit={handleSubmit}
                isLoading={isGenerating}
              />
            </div>

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
