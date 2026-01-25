'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import GenerationProgress from '../components/GenerationProgress';
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

export default function NewProjectPage() {
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
      setCurrentStep('Analyzing your genre preferences...');

      const response = await fetch(`${API_BASE_URL}/api/concepts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ preferences }),
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
            {/* Error is now handled in GenerationProgress modal */}

            {/* Form Card */}
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
