'use client';

import Link from 'next/link';
import PrimaryNavigationBar from '../components/shared/PrimaryNavigationBar';

export default function NewProjectPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Primary Navigation Bar */}
      <PrimaryNavigationBar activeSection="new-novel" />

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
              Choose how you want to start your novel
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
          alignItems: 'center',
        }}>
          <div style={{ maxWidth: '900px', width: '100%' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '2rem',
            }}>
              {/* Quick Start Option */}
              <Link
                href="/quick-start"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '2rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(102, 126, 234, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  marginBottom: '1.5rem',
                }}>
                  <span role="img" aria-label="lightning">⚡</span>
                </div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#1A1A2E',
                  margin: '0 0 0.75rem 0',
                }}>
                  Quick Start
                </h2>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#64748B',
                  margin: '0 0 1.5rem 0',
                  lineHeight: 1.6,
                }}>
                  Pick a genre and describe your idea. We'll generate story concepts in seconds with smart defaults.
                </p>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  textAlign: 'left',
                  width: '100%',
                }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                    <span style={{ color: '#10B981' }}>✓</span> Select 1-2 primary genres
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                    <span style={{ color: '#10B981' }}>✓</span> Optional: Describe your book idea
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                    <span style={{ color: '#10B981' }}>✓</span> "Inspire Me" generates 3-line ideas
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                    <span style={{ color: '#10B981' }}>✓</span> Choose 5 concepts or 10 story ideas
                  </li>
                </ul>
                <div style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}>
                  Get Started Fast
                </div>
              </Link>

              {/* Full Customization Option */}
              <Link
                href="/full-customization"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '2rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(102, 126, 234, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  marginBottom: '1.5rem',
                }}>
                  <span role="img" aria-label="palette">🎨</span>
                </div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#1A1A2E',
                  margin: '0 0 0.75rem 0',
                }}>
                  Full Customization
                </h2>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#64748B',
                  margin: '0 0 1.5rem 0',
                  lineHeight: 1.6,
                }}>
                  Fine-tune every aspect of your story's genre, subgenres, tone, themes, and style preferences.
                </p>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  textAlign: 'left',
                  width: '100%',
                }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                    <span style={{ color: '#10B981' }}>✓</span> Choose from 20+ genres and subgenres
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                    <span style={{ color: '#10B981' }}>✓</span> Select specific tones and themes
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                    <span style={{ color: '#10B981' }}>✓</span> Set target word count and structure
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                    <span style={{ color: '#10B981' }}>✓</span> Define content exclusions
                  </li>
                </ul>
                <div style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}>
                  Customize Everything
                </div>
              </Link>
            </div>

            {/* Info Section */}
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: '#F1F5F9',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', margin: '0 0 0.5rem 0' }}>
                Not sure which to choose?
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0, lineHeight: 1.6 }}>
                <strong>Quick Start</strong> is great for getting inspired quickly or when you have a general idea.
                <br />
                <strong>Full Customization</strong> gives you complete control when you know exactly what you want.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
