import Link from 'next/link';
import { LANDING_STYLES } from './styles/landing.styles';

export default function Home() {
  return (
    <main style={LANDING_STYLES.main}>
      {/* Header */}
      <header role="banner" style={LANDING_STYLES.header}>
        <div
          role="heading"
          aria-level={1}
          style={LANDING_STYLES.logo}>
          NovelForge
        </div>
        <Link
          href="/login"
          aria-label="Sign in to NovelForge"
          style={LANDING_STYLES.signInButton}
        >
          Sign In
        </Link>
      </header>

      {/* Hero Section */}
      <section style={LANDING_STYLES.heroSection}>
        <div style={LANDING_STYLES.heroContainer}>
          <h1 style={LANDING_STYLES.h1}>
            Transform Ideas into
            <span style={LANDING_STYLES.h1Gradient}>
              Complete Novels
            </span>
          </h1>

          <p style={LANDING_STYLES.heroText}>
            Autonomous AI novel generation. Configure your story once,
            let our 5-agent editing ensemble craft your 80,000+ word manuscript.
          </p>

          <div style={LANDING_STYLES.ctaContainer}>
            <Link
              href="/login"
              aria-label="Get started with NovelForge"
              style={LANDING_STYLES.ctaButton}
            >
              Get Started
            </Link>
          </div>

          {/* Feature Grid */}
          <div
            role="list"
            aria-label="NovelForge features"
            style={LANDING_STYLES.featureGrid}>
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
              <article
                key={i}
                role="listitem"
                style={LANDING_STYLES.featureCard}>
                <div
                  aria-hidden="true"
                  style={LANDING_STYLES.featureIcon}>
                  {feature.icon}
                </div>
                <h3 style={LANDING_STYLES.featureTitle}>
                  {feature.title}
                </h3>
                <p style={LANDING_STYLES.featureDescription}>
                  {feature.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        role="contentinfo"
        style={LANDING_STYLES.footer}>
        <p style={LANDING_STYLES.footerText}>
          Powered by Claude AI • 5-Agent Editing Ensemble • Trilogy Support
        </p>
      </footer>
    </main>
  );
}
