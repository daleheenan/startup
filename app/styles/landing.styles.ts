/**
 * Static styles for landing page
 * Extracted from inline styles to prevent re-renders
 */

import { CSSProperties } from 'react';
import { colors } from '@/app/lib/design-tokens';

export const LANDING_STYLES = {
  main: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #FAFAFA 0%, #F0F4F8 100%)',
    display: 'flex',
    flexDirection: 'column',
  } as CSSProperties,

  header: {
    padding: '1.5rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #E0E0E0',
    background: '#FFFFFF',
  } as CSSProperties,

  logo: {
    fontSize: '1.5rem',
    fontWeight: '700',
    background: colors.brand.gradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  } as CSSProperties,

  signInButton: {
    padding: '0.625rem 1.5rem',
    background: colors.brand.primary,
    color: '#FFFFFF',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
  } as CSSProperties,

  heroSection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
  } as CSSProperties,

  heroContainer: {
    maxWidth: '900px',
    textAlign: 'center',
  } as CSSProperties,

  h1: {
    fontSize: '3.5rem',
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: '1.5rem',
    lineHeight: 1.1,
  } as CSSProperties,

  h1Gradient: {
    display: 'block',
    background: colors.brand.gradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  } as CSSProperties,

  heroText: {
    fontSize: '1.25rem',
    color: '#475569', // Improved contrast (8.6:1) - was #64748B (5.8:1)
    marginBottom: '3rem',
    maxWidth: '600px',
    margin: '0 auto 3rem',
    lineHeight: 1.6,
  } as CSSProperties,

  ctaContainer: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    marginBottom: '4rem',
  } as CSSProperties,

  ctaButton: {
    padding: '1rem 2.5rem',
    background: colors.brand.gradient,
    color: '#FFFFFF',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '1rem',
    boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
  } as CSSProperties,

  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1.5rem',
    marginTop: '2rem',
  } as CSSProperties,

  featureCard: {
    background: '#FFFFFF',
    borderRadius: '12px',
    padding: '1.5rem',
    textAlign: 'left',
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  } as CSSProperties,

  featureIcon: {
    fontSize: '2rem',
    marginBottom: '0.75rem',
    width: '48px',
    height: '48px',
    background: '#F8FAFC',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as CSSProperties,

  featureTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: '0.5rem',
  } as CSSProperties,

  featureDescription: {
    fontSize: '0.875rem',
    color: '#475569', // Improved contrast (8.6:1) - was #64748B (5.8:1)
    margin: 0,
    lineHeight: 1.5,
  } as CSSProperties,

  footer: {
    padding: '1.5rem 2rem',
    borderTop: '1px solid #E0E0E0',
    background: '#FFFFFF',
    textAlign: 'center',
  } as CSSProperties,

  footerText: {
    fontSize: '0.875rem',
    color: '#64748B', // Improved contrast (5.8:1) - was #94A3B8 (3.5:1)
    margin: 0,
  } as CSSProperties,
} as const;
