'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
      setError(err instanceof Error ? err.message : 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#FAFAFA',
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E0E0E0',
        borderRadius: '12px',
        padding: '2rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '600',
          color: '#212121',
          marginBottom: '0.5rem',
          textAlign: 'center',
        }}>
          Sign In to NovelForge
        </h1>

        <p style={{
          fontSize: '0.875rem',
          color: '#757575',
          marginBottom: '2rem',
          textAlign: 'center',
        }}>
          Enter your password to access the platform
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#212121',
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
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E0E0E0';
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1.5rem',
              background: '#FFEBEE',
              border: '1px solid #EF5350',
              borderRadius: '8px',
              color: '#C62828',
              fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              fontWeight: '500',
              color: '#FFFFFF',
              background: loading ? '#B0BEC5' : '#667eea',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.background = '#764ba2';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.background = '#667eea';
              }
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}
