import Link from 'next/link';

export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FAFAFA 0%, #F0F4F8 100%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #E0E0E0',
        background: '#FFFFFF',
      }}>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          NovelForge
        </div>
        <Link
          href="/login"
          style={{
            padding: '0.625rem 1.5rem',
            background: '#667eea',
            color: '#FFFFFF',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '0.875rem',
            transition: 'all 0.2s',
          }}
        >
          Sign In
        </Link>
      </header>

      {/* Hero Section */}
      <section style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
      }}>
        <div style={{ maxWidth: '900px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '800',
            color: '#1A1A2E',
            marginBottom: '1.5rem',
            lineHeight: 1.1,
          }}>
            Transform Ideas into
            <span style={{
              display: 'block',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Complete Novels
            </span>
          </h1>

          <p style={{
            fontSize: '1.25rem',
            color: '#64748B',
            marginBottom: '3rem',
            maxWidth: '600px',
            margin: '0 auto 3rem',
            lineHeight: 1.6,
          }}>
            Fire-and-forget AI novel generation. Configure your story once,
            let our 5-agent editing ensemble craft your 80,000+ word manuscript.
          </p>

          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            marginBottom: '4rem',
          }}>
            <Link
              href="/login"
              style={{
                padding: '1rem 2.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#FFFFFF',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '1rem',
                boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
              }}
            >
              Get Started
            </Link>
          </div>

          {/* Feature Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.5rem',
            marginTop: '2rem',
          }}>
            {[
              {
                icon: '🏗️',
                title: 'Story Architect',
                desc: 'Step-by-step wizard for concept, characters, and outline'
              },
              {
                icon: '📖',
                title: 'Story Bible',
                desc: 'Searchable library of characters and world elements'
              },
              {
                icon: '⚙️',
                title: 'Writing Engine',
                desc: 'Live-streaming prose generation with checkpoints'
              },
              {
                icon: '📦',
                title: 'Export Portal',
                desc: 'Download your manuscript in DOCX or PDF format'
              },
            ].map((feature, i) => (
              <div key={i} style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'left',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{
                  fontSize: '2rem',
                  marginBottom: '0.75rem',
                  width: '48px',
                  height: '48px',
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1A1A2E',
                  marginBottom: '0.5rem'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#64748B',
                  margin: 0,
                  lineHeight: 1.5,
                }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '1.5rem 2rem',
        borderTop: '1px solid #E0E0E0',
        background: '#FFFFFF',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '0.875rem',
          color: '#94A3B8',
          margin: 0,
        }}>
          Powered by Claude AI • 5-Agent Editing Ensemble • Trilogy Support
        </p>
      </footer>
    </main>
  );
}
