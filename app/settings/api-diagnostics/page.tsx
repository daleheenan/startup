'use client';

import Link from 'next/link';
import { useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface TestResult {
  status: 'ok' | 'error';
  latency?: number;
  model?: string;
  response?: string;
  rawResponse?: string;
  sampleText?: string;
  wordCount?: number;
  hasContent?: boolean;
  parsedSuccessfully?: boolean;
  parseError?: string | null;
  parsedData?: string;
  parsedFields?: string[];
  error?: string;
}

interface DiagnosticsResponse {
  timestamp: string;
  overallStatus: 'healthy' | 'unhealthy' | 'degraded';
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  tests: {
    basicApi?: TestResult;
    outlineGeneration?: TestResult;
    chapterGeneration?: TestResult;
    characterGeneration?: TestResult;
  };
}

export default function ApiDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    setDiagnostics(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/health/diagnostics`);
      const data = await response.json();
      setDiagnostics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to API');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
      case 'healthy':
        return '#10B981';
      case 'error':
      case 'unhealthy':
        return '#DC2626';
      case 'degraded':
        return '#F59E0B';
      default:
        return '#64748B';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'ok':
      case 'healthy':
        return '#ECFDF5';
      case 'error':
      case 'unhealthy':
        return '#FEF2F2';
      case 'degraded':
        return '#FFFBEB';
      default:
        return '#F8FAFC';
    }
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
              API Diagnostics
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Test Claude API connectivity and generation capabilities
            </p>
          </div>
          <Link
            href="/settings"
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
            Back to Settings
          </Link>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Run Diagnostics Button */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '1.5rem',
              textAlign: 'center',
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1A1A2E',
                margin: 0,
                marginBottom: '0.5rem',
              }}>
                Claude API Health Check
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748B',
                margin: 0,
                marginBottom: '1.5rem',
              }}>
                Run comprehensive tests to verify API connectivity, outline generation, and chapter writing capabilities.
              </p>
              <button
                onClick={runDiagnostics}
                disabled={loading}
                style={{
                  padding: '0.875rem 2rem',
                  background: loading ? '#E2E8F0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: loading ? '#64748B' : '#FFFFFF',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {loading ? 'Running Tests...' : 'Run Diagnostics'}
              </button>
              {loading && (
                <p style={{
                  fontSize: '0.75rem',
                  color: '#64748B',
                  margin: '1rem 0 0',
                }}>
                  This may take 30-60 seconds as we test generation capabilities...
                </p>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#DC2626',
                  margin: 0,
                  marginBottom: '0.5rem',
                }}>
                  Connection Error
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#DC2626',
                  margin: 0,
                  fontFamily: 'monospace',
                }}>
                  {error}
                </p>
              </div>
            )}

            {/* Results Display */}
            {diagnostics && (
              <>
                {/* Overall Status */}
                <div style={{
                  background: getStatusBg(diagnostics.overallStatus),
                  border: `1px solid ${getStatusColor(diagnostics.overallStatus)}40`,
                  borderRadius: '16px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: getStatusColor(diagnostics.overallStatus),
                      margin: 0,
                      marginBottom: '0.25rem',
                    }}>
                      Overall Status: {diagnostics.overallStatus.toUpperCase()}
                    </h3>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#64748B',
                      margin: 0,
                    }}>
                      {diagnostics.summary.passed} of {diagnostics.summary.total} tests passed
                    </p>
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#64748B',
                  }}>
                    {new Date(diagnostics.timestamp).toLocaleString()}
                  </div>
                </div>

                {/* Individual Tests */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}>
                  {/* Basic API Test */}
                  {diagnostics.tests.basicApi && (
                    <TestResultCard
                      title="Basic API Connectivity"
                      description="Tests basic connection to Claude API"
                      result={diagnostics.tests.basicApi}
                    />
                  )}

                  {/* Outline Generation Test */}
                  {diagnostics.tests.outlineGeneration && (
                    <TestResultCard
                      title="Outline Generation (JSON Array)"
                      description="Tests ability to generate structured story outlines"
                      result={diagnostics.tests.outlineGeneration}
                      showRawResponse
                    />
                  )}

                  {/* Chapter Generation Test */}
                  {diagnostics.tests.chapterGeneration && (
                    <TestResultCard
                      title="Chapter Generation (Prose)"
                      description="Tests ability to generate narrative prose"
                      result={diagnostics.tests.chapterGeneration}
                      showSampleText
                    />
                  )}

                  {/* Character Generation Test */}
                  {diagnostics.tests.characterGeneration && (
                    <TestResultCard
                      title="Character Generation (JSON Object)"
                      description="Tests ability to generate character profiles"
                      result={diagnostics.tests.characterGeneration}
                      showRawResponse
                    />
                  )}
                </div>
              </>
            )}

            {/* Help Section */}
            {!diagnostics && !loading && (
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '1.5rem',
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1A1A2E',
                  margin: 0,
                  marginBottom: '1rem',
                }}>
                  What This Tests
                </h3>
                <div style={{
                  display: 'grid',
                  gap: '1rem',
                }}>
                  <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1A1A2E', margin: 0 }}>
                      Basic API Connectivity
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.5rem 0 0' }}>
                      Verifies that the Claude API key is configured and the API is reachable.
                    </p>
                  </div>
                  <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1A1A2E', margin: 0 }}>
                      Outline Generation
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.5rem 0 0' }}>
                      Tests the ability to generate structured JSON arrays, used for story outlines and chapter structures.
                    </p>
                  </div>
                  <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1A1A2E', margin: 0 }}>
                      Chapter Generation
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.5rem 0 0' }}>
                      Tests the ability to generate prose text, used for writing chapters and narrative content.
                    </p>
                  </div>
                  <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1A1A2E', margin: 0 }}>
                      Character Generation
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.5rem 0 0' }}>
                      Tests the ability to generate structured JSON objects, used for characters and world-building elements.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

interface TestResultCardProps {
  title: string;
  description: string;
  result: TestResult;
  showRawResponse?: boolean;
  showSampleText?: boolean;
}

function TestResultCard({ title, description, result, showRawResponse, showSampleText }: TestResultCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    return status === 'ok' ? '#10B981' : '#DC2626';
  };

  const getStatusBg = (status: string) => {
    return status === 'ok' ? '#ECFDF5' : '#FEF2F2';
  };

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: expanded ? '1px solid #E2E8F0' : 'none',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.25rem 0.75rem',
              background: getStatusBg(result.status),
              color: getStatusColor(result.status),
              fontSize: '0.75rem',
              fontWeight: '600',
              borderRadius: '9999px',
            }}>
              {result.status === 'ok' ? 'PASSED' : 'FAILED'}
            </span>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1A1A2E',
              margin: 0,
            }}>
              {title}
            </h3>
          </div>
          <p style={{
            fontSize: '0.75rem',
            color: '#64748B',
            margin: 0,
          }}>
            {description}
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          {result.latency && (
            <span style={{
              fontSize: '0.75rem',
              color: '#64748B',
            }}>
              {result.latency}ms
            </span>
          )}
          {result.model && (
            <span style={{
              fontSize: '0.75rem',
              color: '#94A3B8',
              fontFamily: 'monospace',
            }}>
              {result.model}
            </span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '0.5rem',
              background: 'none',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: '#64748B',
            }}
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{ padding: '1.25rem 1.5rem', background: '#F8FAFC' }}>
          {/* Error */}
          {result.error && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#DC2626', margin: '0 0 0.5rem' }}>
                Error Message
              </h4>
              <pre style={{
                fontSize: '0.75rem',
                color: '#DC2626',
                background: '#FEF2F2',
                padding: '1rem',
                borderRadius: '8px',
                overflow: 'auto',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {result.error}
              </pre>
            </div>
          )}

          {/* Parse Status */}
          {result.parsedSuccessfully !== undefined && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1A1A2E', margin: '0 0 0.5rem' }}>
                JSON Parsing
              </h4>
              <div style={{
                fontSize: '0.75rem',
                color: result.parsedSuccessfully ? '#10B981' : '#DC2626',
                background: result.parsedSuccessfully ? '#ECFDF5' : '#FEF2F2',
                padding: '0.75rem',
                borderRadius: '8px',
              }}>
                {result.parsedSuccessfully
                  ? `Successfully parsed: ${result.parsedData || (result.parsedFields ? `Object with fields: ${result.parsedFields.join(', ')}` : 'Valid JSON')}`
                  : `Parse failed: ${result.parseError || 'Unknown error'}`
                }
              </div>
            </div>
          )}

          {/* Word Count */}
          {result.wordCount !== undefined && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1A1A2E', margin: '0 0 0.5rem' }}>
                Word Count
              </h4>
              <span style={{
                fontSize: '0.875rem',
                color: result.wordCount > 10 ? '#10B981' : '#F59E0B',
                fontWeight: '600',
              }}>
                {result.wordCount} words
              </span>
            </div>
          )}

          {/* Sample Text */}
          {showSampleText && result.sampleText && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1A1A2E', margin: '0 0 0.5rem' }}>
                Sample Generated Text
              </h4>
              <div style={{
                fontSize: '0.875rem',
                color: '#1A1A2E',
                background: '#FFFFFF',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontStyle: 'italic',
                lineHeight: 1.6,
              }}>
                {result.sampleText}
              </div>
            </div>
          )}

          {/* Raw Response */}
          {showRawResponse && result.rawResponse && (
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1A1A2E', margin: '0 0 0.5rem' }}>
                Raw API Response (truncated)
              </h4>
              <pre style={{
                fontSize: '0.7rem',
                color: '#64748B',
                background: '#FFFFFF',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                overflow: 'auto',
                margin: 0,
                maxHeight: '200px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {result.rawResponse}
              </pre>
            </div>
          )}

          {/* Basic Response */}
          {result.response && !showSampleText && !showRawResponse && (
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1A1A2E', margin: '0 0 0.5rem' }}>
                Response
              </h4>
              <pre style={{
                fontSize: '0.75rem',
                color: '#1A1A2E',
                background: '#FFFFFF',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                overflow: 'auto',
                margin: 0,
              }}>
                {result.response}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
