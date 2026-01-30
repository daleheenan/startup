'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConceptCard from '../components/ConceptCard';
import GenerationProgress from '../components/GenerationProgress';
import PenNameSelect from '../components/pen-names/PenNameSelect';
import { usePenNames } from '../hooks/usePenNames';
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
  const { data: penNames } = usePenNames();
  const [concepts, setConcepts] = useState<StoryConcept[]>([]);
  const [preferences, setPreferences] = useState<any>(null);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [selectedPenName, setSelectedPenName] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [savedConceptIds, setSavedConceptIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // BUG-012 FIX: Add proper error handling for sessionStorage access
    try {
      // Load concepts and preferences from sessionStorage
      const conceptsData = sessionStorage.getItem('generatedConcepts');
      const prefsData = sessionStorage.getItem('preferences');

      if (!conceptsData || !prefsData) {
        // Redirect back to new project page if no data
        router.push('/new');
        return;
      }

      try {
        const parsedConcepts = JSON.parse(conceptsData);
        const parsedPrefs = JSON.parse(prefsData);

        // Validate parsed data
        if (Array.isArray(parsedConcepts) && parsedPrefs && typeof parsedPrefs === 'object') {
          setConcepts(parsedConcepts);
          setPreferences(parsedPrefs);
        } else {
          console.error('Invalid session data format');
          router.push('/new');
        }
      } catch (err) {
        console.error('Error parsing session data:', err);
        router.push('/new');
      }
    } catch (err) {
      console.error('Error accessing sessionStorage:', err);
      router.push('/new');
    }
  }, [router]);

  // Set default pen name when pen names are loaded
  useEffect(() => {
    if (penNames && penNames.length > 0 && !selectedPenName) {
      const defaultPenName = penNames.find(pn => pn.is_default);
      if (defaultPenName) {
        setSelectedPenName(defaultPenName.id);
      }
    }
  }, [penNames, selectedPenName]);

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

      // Add pen name to preferences if selected
      const preferencesWithPenName = {
        ...preferences,
        penNameId: selectedPenName || null,
      };

      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ concept, preferences: preferencesWithPenName }),
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
    setCurrentStep('Connecting to AI service...');

    try {
      const token = getToken();
      setCurrentStep('Generating fresh story concepts...');

      // Add timestamp to ensure unique concepts each time
      const prefsWithTimestamp = {
        ...preferences,
        regenerationTimestamp: Date.now(),
      };

      const response = await fetch(`${API_BASE_URL}/api/concepts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ preferences: prefsWithTimestamp }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to regenerate concepts');
      }

      setCurrentStep('Finalizing new concepts...');
      const data = await response.json();
      setConcepts(data.concepts);
      setSelectedConcept(null);
      // Clear saved state for regenerated concepts
      setSavedConceptIds(new Set());

      // BUG-002 FIX: Update sessionStorage
      sessionStorage.setItem('generatedConcepts', JSON.stringify(data.concepts));
    } catch (err: any) {
      console.error('Error regenerating concepts:', err);
      setError(err.message || 'Failed to regenerate concepts');
    } finally {
      setIsRegenerating(false);
      setCurrentStep('');
    }
  };

  const handleCancelRegenerate = () => {
    setIsRegenerating(false);
    setError(null);
    setCurrentStep('');
  };

  const handleSaveConcept = async (conceptId: string) => {
    // Prevent saving if already saved
    if (savedConceptIds.has(conceptId)) return;

    try {
      const concept = concepts.find(c => c.id === conceptId);
      if (!concept) return;

      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/saved-concepts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ concept, preferences }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save concept');
      }

      // Mark concept as saved
      setSavedConceptIds(prev => new Set(prev).add(conceptId));
    } catch (err: any) {
      console.error('Error saving concept:', err);
      setError(err.message || 'Failed to save concept');
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
                  onSave={() => handleSaveConcept(concept.id)}
                  disabled={isCreating || isRegenerating}
                  isSaved={savedConceptIds.has(concept.id)}
                />
              ))}
            </div>

            {/* Pen Name Selection */}
            <div style={{
              maxWidth: '500px',
              margin: '0 auto 2rem auto',
              padding: '1.5rem',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
            }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#1A1A2E',
                marginBottom: '0.5rem',
              }}>
                Pen Name (Optional)
              </label>
              <p style={{
                fontSize: '0.75rem',
                color: '#64748B',
                margin: '0 0 1rem 0',
              }}>
                Choose a pen name for this project. You can change this later.
              </p>
              <PenNameSelect
                value={selectedPenName}
                onChange={setSelectedPenName}
              />
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

      {/* Progress Indicator Modal */}
      <GenerationProgress
        isActive={isRegenerating}
        title="Regenerating Concepts"
        subtitle="Creating fresh story ideas based on your preferences"
        currentStep={currentStep}
        estimatedTime={90}
        error={error}
        onCancel={handleCancelRegenerate}
      />

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
