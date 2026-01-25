'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '../lib/auth';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(password);
      router.push('/projects');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      // Provide more helpful error messages
      if (message.includes('fetch') || message.includes('network')) {
        setError('Unable to connect to server. Please try again.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FAFAFA 0%, #F0F4F8 100%)',
    }}>
      {/* Left Panel - Branding */}
      <div
        role="complementary"
        aria-label="NovelForge features"
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '3rem',
          color: '#FFFFFF',
        }}>
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            marginBottom: '1rem',
          }}>
            NovelForge
          </h1>
          <p style={{
            fontSize: '1.125rem',
            opacity: 0.95,
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}>
            AI-powered novel generation with a 5-agent editing ensemble.
            Autonomous generation brings your story ideas to life.
          </p>

          <ul
            role="list"
            style={{
              display: 'grid',
              gap: '1rem',
              textAlign: 'left',
              listStyle: 'none',
              padding: 0,
              margin: 0,
            }}>
            {[
              { icon: '🏗️', text: 'Story Architect' },
              { icon: '📖', text: 'Story Bible' },
              { icon: '⚙️', text: 'Writing Engine' },
              { icon: '📦', text: 'Export Portal' },
            ].map((item, i) => (
              <li key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '8px',
              }}>
                <span aria-hidden="true" style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                <span style={{ fontWeight: '500' }}>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
        }}>
          <Link
            href="/"
            aria-label="Back to home page"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#475569',
              textDecoration: 'none',
              fontSize: '0.875rem',
              marginBottom: '2rem',
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #667eea';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            ← Back to home
          </Link>

          <div
            role="main"
            aria-labelledby="login-heading"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '2.5rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            }}>
            <h2
              id="login-heading"
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1A1A2E',
                marginBottom: '0.5rem',
              }}>
              Welcome back
            </h2>

            <p style={{
              fontSize: '0.875rem',
              color: '#475569',
              marginBottom: '2rem',
            }}>
              Enter your password to access NovelForge
            </p>

            <form
              onSubmit={handleSubmit}
              aria-label="Login form"
            >
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem',
                  }}
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoFocus
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    fontSize: '1rem',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    background: '#FFFFFF',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  style={{
                    padding: '0.875rem 1rem',
                    marginBottom: '1.5rem',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    color: '#DC2626',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                  <span aria-hidden="true">⚠️</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                aria-label={loading ? 'Signing in, please wait' : 'Sign in to NovelForge'}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  background: loading ? '#94A3B8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(102, 126, 234, 0.4)',
                  minHeight: '44px',
                }}
                onFocus={(e) => {
                  if (!loading) {
                    e.currentTarget.style.outline = '2px solid #667eea';
                    e.currentTarget.style.outlineOffset = '2px';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#FFFFFF',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>

          <p style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.875rem',
            color: '#94A3B8',
          }}>
            Powered by Claude AI
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
