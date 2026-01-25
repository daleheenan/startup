'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getToken } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SettingsStats {
  customGenres: number;
  exclusions: number;
  recipes: number;
}

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

  const settingsSections = [
    {
      title: 'Custom Genres',
      description: 'Create and manage your own genre categories to use when creating new projects.',
      href: '/settings/genres',
      icon: 'G',
      iconBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      count: stats.customGenres,
      countLabel: 'genres',
    },
    {
      title: 'Exclusions',
      description: 'Manage blacklisted names, words, themes, and tropes that should be avoided in your stories.',
      href: '/settings/exclusions',
      icon: 'X',
      iconBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      count: stats.exclusions,
      countLabel: 'items',
    },
    {
      title: 'Genre Recipes',
      description: 'Save your favorite genre combinations as presets for quick project creation.',
      href: '/settings/recipes',
      icon: 'R',
      iconBg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      count: stats.recipes,
      countLabel: 'recipes',
    },
  ];

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#F8FAFC',
    }}>
      {/* Left Sidebar */}
      <aside style={{
        width: '72px',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem 0',
      }}>
        <Link
          href="/projects"
          style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
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
              Settings
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Manage your preferences and customizations
            </p>
          </div>
          <Link
            href="/projects"
            style={{
              padding: '0.5rem 1rem',
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            Back to Projects
          </Link>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Settings Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}>
              {settingsSections.map((section) => (
                <Link
                  key={section.href}
                  href={section.href}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: section.iconBg,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontWeight: '700',
                      fontSize: '1.25rem',
                      flexShrink: 0,
                    }}>
                      {section.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h2 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: '#1A1A2E',
                        margin: 0,
                        marginBottom: '0.25rem',
                      }}>
                        {section.title}
                      </h2>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#64748B',
                        margin: 0,
                        lineHeight: 1.5,
                      }}>
                        {section.description}
                      </p>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '1rem',
                    borderTop: '1px solid #F1F5F9',
                  }}>
                    <span style={{
                      fontSize: '0.875rem',
                      color: loading ? '#94A3B8' : '#667eea',
                      fontWeight: '500',
                    }}>
                      {loading ? 'Loading...' : `${section.count} ${section.countLabel}`}
                    </span>
                    <span style={{
                      fontSize: '0.875rem',
                      color: '#667eea',
                      fontWeight: '500',
                    }}>
                      Manage
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Quick Actions */}
            <div style={{
              marginTop: '2rem',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '1.5rem',
            }}>
              <h2 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1A1A2E',
                margin: 0,
                marginBottom: '1rem',
              }}>
                Quick Tips
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem',
              }}>
                <div style={{
                  padding: '1rem',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                }}>
                  <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#1A1A2E',
                    margin: 0,
                    marginBottom: '0.5rem',
                  }}>
                    Custom Genres
                  </h3>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#64748B',
                    margin: 0,
                    lineHeight: 1.5,
                  }}>
                    Create niche genres like "Cozy Cat Mystery" or "Space Western Romance" to match your writing style.
                  </p>
                </div>
                <div style={{
                  padding: '1rem',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                }}>
                  <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#1A1A2E',
                    margin: 0,
                    marginBottom: '0.5rem',
                  }}>
                    Exclusions
                  </h3>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#64748B',
                    margin: 0,
                    lineHeight: 1.5,
                  }}>
                    Add overused tropes or names you want to avoid. These will be filtered out during generation.
                  </p>
                </div>
                <div style={{
                  padding: '1rem',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                }}>
                  <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#1A1A2E',
                    margin: 0,
                    marginBottom: '0.5rem',
                  }}>
                    Genre Recipes
                  </h3>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#64748B',
                    margin: 0,
                    lineHeight: 1.5,
                  }}>
                    Save your favorite genre combinations for quick access when starting new projects.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
