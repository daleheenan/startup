'use client';

import Link from 'next/link';
import { colors, gradients, borderRadius } from '@/app/lib/constants';
import { sidebar, header, pageTitle, pageSubtitle } from '@/app/lib/styles';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  backLink?: string;
  backText?: string;
  children: React.ReactNode;
}

export default function PageLayout({
  title,
  subtitle,
  backLink,
  backText = '← Back',
  children,
}: PageLayoutProps) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: colors.background,
    }}>
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        onFocus={(e) => {
          e.currentTarget.style.left = '1rem';
          e.currentTarget.style.top = '1rem';
          e.currentTarget.style.width = 'auto';
          e.currentTarget.style.height = 'auto';
          e.currentTarget.style.padding = '1rem';
          e.currentTarget.style.background = colors.brandStart;
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.borderRadius = '4px';
          e.currentTarget.style.zIndex = '9999';
        }}
        onBlur={(e) => {
          e.currentTarget.style.left = '-9999px';
          e.currentTarget.style.width = '1px';
          e.currentTarget.style.height = '1px';
        }}
      >
        Skip to main content
      </a>

      {/* Left Sidebar */}
      <aside
        style={sidebar}
        aria-label="Main navigation"
        role="navigation"
      >
        <Link
          href="/projects"
          aria-label="NovelForge Home - Go to Projects"
          style={{
            width: '40px',
            height: '40px',
            background: gradients.brand,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.surface,
            fontWeight: '700',
            fontSize: '1.25rem',
            textDecoration: 'none',
          }}
        >
          <span aria-hidden="true">N</span>
        </Link>
      </aside>

      {/* Main Content */}
      <main
        id="main-content"
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        role="main"
      >
        {/* Top Bar */}
        <header style={header} role="banner">
          <div>
            <h1 style={pageTitle}>{title}</h1>
            {subtitle && <p style={pageSubtitle}>{subtitle}</p>}
          </div>
          {backLink && (
            <Link
              href={backLink}
              aria-label={`Navigate back: ${backText.replace('←', '').trim()}`}
              style={{
                padding: '0.5rem 1rem',
                color: colors.textSecondary,
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              {backText}
            </Link>
          )}
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
