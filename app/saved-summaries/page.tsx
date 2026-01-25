'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GenerationProgress from '../components/GenerationProgress';
import { getToken } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SavedSummary {
  id: string;
  title: string;
  logline: string;
  preferences: any;
  notes: string | null;
  status: 'saved' | 'expanded' | 'archived';
  expanded_concept_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function SavedSummariesPage() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<SavedSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanding, setIsExpanding] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'saved' | 'expanded' | 'all'>('saved');

  useEffect(() => {
    loadSummaries();
  }, [statusFilter]);

  const loadSummaries = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getToken();
      const url = statusFilter === 'all'
        ? `${API_BASE_URL}/api/saved-concept-summaries?status=saved`
        : `${API_BASE_URL}/api/saved-concept-summaries?status=${statusFilter}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load saved summaries');
      }

      const data = await response.json();
      setSummaries(data.summaries || []);
    } catch (err: any) {
      console.error('Error loading summaries:', err);
      setError(err.message || 'Failed to load summaries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpandSummary = async (summary: SavedSummary) => {
    setIsExpanding(summary.id);
    setError(null);
    setCurrentStep('Connecting to AI service...');

    try {
      const token = getToken();

      setCurrentStep('Generating 5 detailed concept variations...');

      const response = await fetch(`${API_BASE_URL}/api/saved-concept-summaries/${summary.id}/expand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to expand summary');
      }

      setCurrentStep('Finalizing concepts...');
      const data = await response.json();

      // Store expanded concepts and redirect to concepts page
      sessionStorage.setItem('generatedConcepts', JSON.stringify(data.concepts));
      sessionStorage.setItem('preferences', JSON.stringify(summary.preferences));

      // Mark summary as expanded
      await fetch(`${API_BASE_URL}/api/saved-concept-summaries/${summary.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'expanded' }),
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      router.push('/concepts');
    } catch (err: any) {
      console.error('Error expanding summary:', err);
      setError(err.message || 'Failed to expand summary');
      setIsExpanding(null);
    }
  };

  const handleDeleteSummary = async (id: string) => {
    if (!confirm('Are you sure you want to delete this summary?')) return;

    setIsDeleting(id);
    setError(null);

    try {
      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/saved-concept-summaries/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete summary');
      }

      setSummaries(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      console.error('Error deleting summary:', err);
      setError(err.message || 'Failed to delete summary');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCancel = () => {
    setIsExpanding(null);
    setError(null);
    setCurrentStep('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
              Saved Concept Summaries
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Expand any summary into 5 detailed story concepts
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link
              href="/new"
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '8px',
                color: '#FFFFFF',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              + New Story
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
        }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* Error Message */}
            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '1rem 1.5rem',
                marginBottom: '1.5rem',
                color: '#DC2626',
              }}>
                {error}
              </div>
            )}

            {/* Status Filter */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1.5rem',
            }}>
              {(['saved', 'expanded'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: statusFilter === status ? '#667eea' : '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    color: statusFilter === status ? '#FFFFFF' : '#64748B',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Loading State */}
            {isLoading && (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{
                  display: 'inline-block',
                  width: '48px',
                  height: '48px',
                  border: '3px solid #E2E8F0',
                  borderTopColor: '#667eea',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                <p style={{ marginTop: '1rem', color: '#64748B' }}>Loading summaries...</p>
                <style jsx>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && summaries.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                <h3 style={{ color: '#1A1A2E', marginBottom: '0.5rem' }}>
                  No {statusFilter} summaries yet
                </h3>
                <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
                  {statusFilter === 'saved'
                    ? 'Generate concept summaries and save the ones you like for later'
                    : 'Summaries you expand will appear here'
                  }
                </p>
                <Link
                  href="/new"
                  style={{
                    display: 'inline-block',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Generate Summaries
                </Link>
              </div>
            )}

            {/* Summary Cards */}
            {!isLoading && summaries.length > 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}>
                {summaries.map((summary) => (
                  <div
                    key={summary.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '1.5rem',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '1rem',
                    }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          fontSize: '1.125rem',
                          fontWeight: 600,
                          color: '#1A1A2E',
                          margin: 0,
                          marginBottom: '0.5rem',
                        }}>
                          {summary.title}
                        </h3>
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#64748B',
                        }}>
                          Saved on {formatDate(summary.created_at)}
                        </span>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: summary.status === 'expanded' ? '#DCFCE7' : '#F0F9FF',
                        color: summary.status === 'expanded' ? '#166534' : '#0369A1',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textTransform: 'capitalize',
                      }}>
                        {summary.status}
                      </span>
                    </div>

                    <p style={{
                      fontSize: '0.9375rem',
                      color: '#475569',
                      margin: 0,
                      lineHeight: 1.6,
                      marginBottom: '1rem',
                    }}>
                      {summary.logline}
                    </p>

                    {/* Genre info */}
                    {summary.preferences && (
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                        marginBottom: '1rem',
                      }}>
                        {summary.preferences.genres?.map((genre: string) => (
                          <span
                            key={genre}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#F1F5F9',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: '#475569',
                            }}
                          >
                            {genre}
                          </span>
                        ))}
                        {summary.preferences.tones?.map((tone: string) => (
                          <span
                            key={tone}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#F1F5F9',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: '#475569',
                            }}
                          >
                            {tone}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      justifyContent: 'flex-end',
                    }}>
                      <button
                        onClick={() => handleDeleteSummary(summary.id)}
                        disabled={isDeleting === summary.id}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          color: '#DC2626',
                          fontSize: '0.875rem',
                          cursor: isDeleting === summary.id ? 'not-allowed' : 'pointer',
                          opacity: isDeleting === summary.id ? 0.5 : 1,
                        }}
                      >
                        {isDeleting === summary.id ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        onClick={() => handleExpandSummary(summary)}
                        disabled={isExpanding !== null}
                        style={{
                          padding: '0.5rem 1rem',
                          background: isExpanding !== null
                            ? '#94A3B8'
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: isExpanding !== null ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isExpanding === summary.id ? 'Expanding...' : 'Expand to 5 Concepts'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Progress Modal */}
      <GenerationProgress
        isActive={isExpanding !== null}
        title="Expanding Summary"
        subtitle="Creating 5 unique concept variations from your summary"
        currentStep={currentStep}
        estimatedTime={90}
        error={error}
        onCancel={handleCancel}
      />
    </div>
  );
}
