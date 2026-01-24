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
      {/* Left Sidebar */}
      <aside style={sidebar}>
        <Link
          href="/projects"
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
          N
        </Link>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <header style={header}>
          <div>
            <h1 style={pageTitle}>{title}</h1>
            {subtitle && <p style={pageSubtitle}>{subtitle}</p>}
          </div>
          {backLink && (
            <Link
              href={backLink}
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
