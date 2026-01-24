'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConceptCard from '../components/ConceptCard';
import { getToken } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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

      // Redirect to project page
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
      const token = getToken();
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
          <p style={{ marginTop: '1rem', color: '#64748B' }}>Loading concepts...</p>
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
              Choose Your Story
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Select a concept to begin, or regenerate for new ideas
            </p>
          </div>
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
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
                <span>Warning</span>
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
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleRegenerate}
                disabled={isCreating || isRegenerating}
                style={{
                  padding: '1rem 2rem',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#374151',
                  fontSize: '1rem',
                  fontWeight: 500,
                  cursor: (isCreating || isRegenerating) ? 'not-allowed' : 'pointer',
                  opacity: (isCreating || isRegenerating) ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate Concepts'}
              </button>

              <button
                onClick={handleSelectConcept}
                disabled={!selectedConcept || isCreating || isRegenerating}
                style={{
                  padding: '1rem 2rem',
                  background: (!selectedConcept || isCreating || isRegenerating)
                    ? '#94A3B8'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: (!selectedConcept || isCreating || isRegenerating) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: (!selectedConcept || isCreating || isRegenerating) ? 'none' : '0 4px 14px rgba(102, 126, 234, 0.4)',
                }}
              >
                {isCreating ? 'Creating Project...' : 'Create Project with Selected Concept'}
              </button>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
