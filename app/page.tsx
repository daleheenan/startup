export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{ maxWidth: '800px' }}>
        <h1 style={{
          fontSize: '3.5rem',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          NovelForge
        </h1>

        <p style={{
          fontSize: '1.5rem',
          color: '#888',
          marginBottom: '2rem'
        }}>
          AI-Powered Novel Writing Application
        </p>

        <div style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#ededed' }}>
            🚧 Under Construction
          </h2>
          <p style={{ color: '#888', lineHeight: 1.6 }}>
            NovelForge is being built to transform your story ideas into professionally
            crafted novels with minimal intervention. Powered by Claude AI with specialized
            editing agents for developmental, line, continuity, and copy editing.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginTop: '2rem'
        }}>
          {[
            { icon: '✨', title: 'Fire & Forget', desc: 'Configure once, receive completed novel' },
            { icon: '🤖', title: 'Agent Editing', desc: '5 specialized AI editing agents' },
            { icon: '📚', title: 'Trilogy Support', desc: 'Multi-book continuity tracking' },
            { icon: '⚡', title: 'Resilient Queue', desc: 'Auto-pause and resume on limits' }
          ].map((feature, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '1.5rem',
              textAlign: 'left'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{feature.icon}</div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#ededed' }}>{feature.title}</h3>
              <p style={{ fontSize: '0.875rem', color: '#666', margin: 0 }}>{feature.desc}</p>
            </div>
          ))}
        </div>

        <p style={{
          marginTop: '3rem',
          fontSize: '0.875rem',
          color: '#444'
        }}>
          Sprint 1 of 8 • Foundation Phase
        </p>
      </div>
    </main>
  )
}
