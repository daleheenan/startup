'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GenrePreferenceForm from '../components/GenrePreferenceForm';

export default function NewProjectPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (preferences: any) => {
    setIsGenerating(true);
    setError(null);

    try {
      // Generate concepts via backend API
      const response = await fetch('http://localhost:3001/api/concepts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate concepts');
      }

      const data = await response.json();

      // Navigate to concept selection page with generated concepts
      sessionStorage.setItem('generatedConcepts', JSON.stringify(data.concepts));
      sessionStorage.setItem('preferences', JSON.stringify(preferences));
      router.push('/concepts');
    } catch (err: any) {
      console.error('Error generating concepts:', err);
      setError(err.message || 'An error occurred while generating concepts');
      setIsGenerating(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '800px', width: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Create New Novel
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#888' }}>
            Tell us about your story, and we'll generate 5 unique concepts for you to choose from
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem',
            color: '#ef4444'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <GenrePreferenceForm
          onSubmit={handleSubmit}
          isLoading={isGenerating}
        />

        {/* Progress Indicator */}
        {isGenerating && (
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid rgba(102, 126, 234, 0.3)',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '1rem'
            }} />
            <p style={{ color: '#667eea', fontWeight: 500 }}>
              Generating story concepts with Claude AI...
            </p>
            <p style={{ color: '#888', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              This may take up to 2 minutes
            </p>
          </div>
        )}

        {/* Back Link */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a
            href="/"
            style={{
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '0.875rem'
            }}
          >
            ← Back to Home
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
