'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getToken } from '../lib/auth';
import { colors, typography, spacing, borderRadius, transitions, shadows } from '../lib/design-tokens';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ==================== TYPES ====================

interface SettingsStats {
  customGenres: number;
  exclusions: number;
  recipes: number;
}

interface SettingsSection {
  title: string;
  description: string;
  href: string;
  icon: string;
  iconBg: string;
  count: number | null;
  countLabel: string;
}

// ==================== DATA ====================

const settingsSections: SettingsSection[] = [
  {
    title: 'Author Profile',
    description: 'Set up your author biography, photo, and social links for the "About the Author" section in your books.',
    href: '/settings/author-profile',
    icon: 'A',
    iconBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    count: null,
    countLabel: '',
  },
  {
    title: 'Custom Genres',
    description: 'Create and manage your own genre categories to use when creating new projects.',
    href: '/settings/genres',
    icon: 'G',
    iconBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    count: null,
    countLabel: 'genres',
  },
  {
    title: 'Prose Style',
    description: 'Configure your default writing style preferences including sentence structure, vocabulary, and pacing.',
    href: '/settings/prose-style',
    icon: 'P',
    iconBg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    count: null,
    countLabel: '',
  },
  {
    title: 'Exclusions',
    description: 'Manage blacklisted names, words, themes, and tropes that should be avoided in your stories.',
    href: '/settings/exclusions',
    icon: 'X',
    iconBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    count: null,
    countLabel: 'items',
  },
  {
    title: 'Genre Recipes',
    description: 'Save your favourite genre combinations as presets for quick project creation.',
    href: '/settings/recipes',
    icon: 'R',
    iconBg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    count: null,
    countLabel: 'recipes',
  },
  {
    title: 'API Diagnostics',
    description: 'Test Claude API connectivity and verify outline and chapter generation are working correctly.',
    href: '/settings/api-diagnostics',
    icon: 'D',
    iconBg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    count: null,
    countLabel: '',
  },
];

// ==================== QUICK TIPS DATA ====================

const quickTips = [
  {
    title: 'Author Profile',
    description: 'Set up your bio and photo once, and it will be included in all your published books automatically.',
  },
  {
    title: 'Custom Genres',
    description: 'Create niche genres like "Cosy Cat Mystery" or "Space Western Romance" to match your writing style.',
  },
  {
    title: 'Prose Style',
    description: 'Set your default writing style preferences including sentence structure, vocabulary, and pacing for all new projects.',
  },
  {
    title: 'Exclusions',
    description: 'Add overused tropes or names you want to avoid. These will be filtered out during generation.',
  },
];

// ==================== COMPONENT ====================

export default function SettingsPage() {
  const [stats, setStats] = useState<SettingsStats>({
    customGenres: 0,
    exclusions: 0,
    recipes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [genresRes, exclusionsRes, recipesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/user-settings/genres`, { headers }),
        fetch(`${API_BASE_URL}/api/user-settings/exclusions`, { headers }),
        fetch(`${API_BASE_URL}/api/user-settings/recipes`, { headers }),
      ]);

      const [genresData, exclusionsData, recipesData] = await Promise.all([
        genresRes.ok ? genresRes.json() : { genres: [] },
        exclusionsRes.ok ? exclusionsRes.json() : { exclusions: [] },
        recipesRes.ok ? recipesRes.json() : { recipes: [] },
      ]);

      setStats({
        customGenres: genresData.genres?.length || 0,
        exclusions: exclusionsData.exclusions?.length || 0,
        recipes: recipesData.recipes?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching settings stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Hydrate static section data with live counts from the API
  const hydratedSections = settingsSections.map((section) => ({
    ...section,
    count: section.title === 'Custom Genres'
      ? stats.customGenres
      : section.title === 'Exclusions'
        ? stats.exclusions
        : section.title === 'Genre Recipes'
          ? stats.recipes
          : null,
  }));

  // ---- Styles ----

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: spacing[6],
  };

  const cardStyle = {
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    textDecoration: 'none',
    transition: transitions.all,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[4],
  };

  const iconStyle = (iconBg: string) => ({
    width: '48px',
    height: '48px',
    background: iconBg,
    borderRadius: borderRadius.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.xl,
    flexShrink: 0,
  });

  const sectionTitleStyle = {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    margin: 0,
    marginBottom: spacing[1],
    fontFamily: typography.fontFamily.base,
  };

  const sectionDescriptionStyle = {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    margin: 0,
    lineHeight: typography.lineHeight.normal,
    fontFamily: typography.fontFamily.base,
  };

  const cardFooterStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[4],
    borderTop: `1px solid ${colors.background.surfaceHover}`,
  };

  const footerLabelStyle = (isLoading: boolean) => ({
    fontSize: typography.fontSize.sm,
    color: isLoading ? colors.text.disabled : colors.brand.primary,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamily.base,
  });

  const footerActionStyle = {
    fontSize: typography.fontSize.sm,
    color: colors.brand.primary,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamily.base,
  };

  const tipsContainerStyle = {
    marginTop: spacing[8],
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
  };

  const tipsTitleStyle = {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    margin: 0,
    marginBottom: spacing[4],
    fontFamily: typography.fontFamily.base,
  };

  const tipsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: spacing[4],
  };

  const tipCardStyle = {
    padding: spacing[4],
    background: colors.background.primary,
    borderRadius: borderRadius.md,
  };

  const tipTitleStyle = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    margin: 0,
    marginBottom: spacing[2],
    fontFamily: typography.fontFamily.base,
  };

  const tipDescriptionStyle = {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    margin: 0,
    lineHeight: typography.lineHeight.normal,
    fontFamily: typography.fontFamily.base,
  };

  // ---- Render ----

  return (
    <DashboardLayout
      header={{
        title: 'Settings',
        subtitle: 'Configure your preferences',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Settings Cards Grid */}
        <div style={gridStyle}>
          {hydratedSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              style={cardStyle}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = shadows.lg;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = shadows.none;
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[4] }}>
                <div style={iconStyle(section.iconBg)}>
                  {section.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={sectionTitleStyle}>{section.title}</h2>
                  <p style={sectionDescriptionStyle}>{section.description}</p>
                </div>
              </div>

              <div style={cardFooterStyle}>
                <span style={footerLabelStyle(loading)}>
                  {section.count !== null
                    ? (loading ? 'Loading...' : `${section.count} ${section.countLabel}`)
                    : 'Run tests'
                  }
                </span>
                <span style={footerActionStyle}>
                  {section.count !== null ? 'Manage' : 'Open'}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Tips */}
        <div style={tipsContainerStyle}>
          <h2 style={tipsTitleStyle}>Quick Tips</h2>
          <div style={tipsGridStyle}>
            {quickTips.map((tip) => (
              <div key={tip.title} style={tipCardStyle}>
                <h3 style={tipTitleStyle}>{tip.title}</h3>
                <p style={tipDescriptionStyle}>{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
