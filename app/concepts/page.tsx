'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConceptCard from '../components/ConceptCard';

interface StoryConcept {
  id: string;
  title: string;
  logline: string;
  synopsis: string;
  hook: string;
  protagonistHint: string;
  conflictType: string;
}

export default function ConceptsPage() {
  const router = useRouter();
  const [concepts, setConcepts] = useState<StoryConcept[]>([]);
  const [preferences, setPreferences] = useState<any>(null);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load concepts and preferences from sessionStorage
    const conceptsData = sessionStorage.getItem('generatedConcepts');
    const prefsData = sessionStorage.getItem('preferences');

    if (!conceptsData || !prefsData) {
      // Redirect back to new project page if no data
      router.push('/new');
      return;
    }

    try {
      setConcepts(JSON.parse(conceptsData));
      setPreferences(JSON.parse(prefsData));
    } catch (err) {
      console.error('Error parsing session data:', err);
      router.push('/new');
    }
  }, [router]);

  const handleSelectConcept = async () => {
    if (!selectedConcept) {
      setError('Please select a concept');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const concept = concepts.find(c => c.id === selectedConcept);
      if (!concept) {
        throw new Error('Selected concept not found');
      }

      // Create project via backend API
      const response = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, preferences }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create project');
      }

      const project = await response.json();

      // Clear session storage
      sessionStorage.removeItem('generatedConcepts');
      sessionStorage.removeItem('preferences');

      // Redirect to project page (will create this later)
      router.push(`/projects/${project.id}`);
    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(err.message || 'Failed to create project');
      setIsCreating(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/concepts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to regenerate concepts');
      }

      const data = await response.json();
      setConcepts(data.concepts);
      setSelectedConcept(null);

      // Update sessionStorage
      sessionStorage.setItem('generatedConcepts', JSON.stringify(data.concepts));
    } catch (err: any) {
      console.error('Error regenerating concepts:', err);
      setError(err.message || 'Failed to regenerate concepts');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (concepts.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            width: '50px',
            height: '50px',
            border: '4px solid rgba(102, 126, 234, 0.3)',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '1rem', color: '#888' }}>Loading concepts...</p>
        </div>
      </div>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
            Choose Your Story
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#888' }}>
            Select a concept to begin, or regenerate for new ideas
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            maxWidth: '800px',
            margin: '0 auto 2rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            color: '#ef4444'
          }}>
            {error}
          </div>
        )}

        {/* Concept Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {concepts.map(concept => (
            <ConceptCard
              key={concept.id}
              concept={concept}
              isSelected={selectedConcept === concept.id}
              onSelect={() => setSelectedConcept(concept.id)}
              disabled={isCreating || isRegenerating}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={handleRegenerate}
            disabled={isCreating || isRegenerating}
            style={{
              padding: '1rem 2rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#ededed',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: (isCreating || isRegenerating) ? 'not-allowed' : 'pointer',
              opacity: (isCreating || isRegenerating) ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            {isRegenerating ? 'Regenerating...' : '🔄 Regenerate Concepts'}
          </button>

          <button
            onClick={handleSelectConcept}
            disabled={!selectedConcept || isCreating || isRegenerating}
            style={{
              padding: '1rem 2rem',
              background: (!selectedConcept || isCreating || isRegenerating)
                ? 'rgba(102, 126, 234, 0.3)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: (!selectedConcept || isCreating || isRegenerating) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isCreating ? 'Creating Project...' : '✨ Create Project with Selected Concept'}
          </button>
        </div>

        {/* Back Link */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a
            href="/new"
            style={{
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '0.875rem'
            }}
          >
            ← Start Over with New Preferences
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
