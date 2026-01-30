'use client';

import { useState, useEffect } from 'react';
import { getToken } from '../../lib/auth';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface StyleProfile {
  averageSentenceLength: number;
  vocabularyComplexity: number;
  dialogueRatio: number;
  descriptionDensity: number;
  pacingScore: number;
  toneIndicators: string[];
  commonPatterns: string[];
}

interface AuthorStyle {
  id: string;
  name: string;
  description?: string;
  style_data: StyleProfile;
  word_count: number;
  created_at: string;
}

export default function AuthorStylesPage() {
  const [styles, setStyles] = useState<AuthorStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form state
  const [newStyleName, setNewStyleName] = useState('');
  const [newStyleDescription, setNewStyleDescription] = useState('');
  const [manuscriptText, setManuscriptText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<{
    styleProfile: StyleProfile;
    wordCount: number;
    summary: string;
  } | null>(null);

  useEffect(() => {
    loadStyles();
  }, []);

  const loadStyles = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/author-styles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStyles(data);
    } catch (error) {
      console.error('Failed to load styles:', error);
    }
    setLoading(false);
  };

  const analyseManuscript = async () => {
    if (!manuscriptText.trim()) return;
    setAnalysing(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/author-styles/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: manuscriptText }),
      });
      const data = await res.json();
      setAnalysisResult(data);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
    setAnalysing(false);
  };

  const createStyle = async () => {
    if (!newStyleName.trim() || !manuscriptText.trim()) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/author-styles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newStyleName,
          description: newStyleDescription,
          text: manuscriptText,
        }),
      });
      const data = await res.json();
      setStyles((prev) => [...prev, data]);
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create style:', error);
    }
  };

  const deleteStyle = async (id: string) => {
    try {
      const token = getToken();
      await fetch(`${API_BASE_URL}/api/author-styles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setStyles((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Failed to delete style:', error);
    }
  };

  const resetForm = () => {
    setNewStyleName('');
    setNewStyleDescription('');
    setManuscriptText('');
    setAnalysisResult(null);
  };

  const wordCount = manuscriptText.split(/\s+/).filter(Boolean).length;

  // Styles
  const containerStyle = {
    display: 'flex',
    minHeight: '100vh',
    background: '#F8FAFC',
  };

  const sidebarStyle = {
    width: '240px',
    background: '#FFFFFF',
    borderRight: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '1.5rem',
  };

  const backLinkStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '2rem',
    color: '#64748B',
    textDecoration: 'none',
    fontSize: '0.875rem',
  };

  const navLinkStyle = {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    color: '#64748B',
    textDecoration: 'none',
    fontSize: '0.875rem',
  };

  const activeLinkStyle = {
    ...navLinkStyle,
    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    color: '#FFFFFF',
    fontWeight: '500',
  };

  const mainStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
  };

  const headerStyle = {
    padding: '1rem 2rem',
    background: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const contentStyle = {
    flex: 1,
    padding: '2rem',
    overflow: 'auto' as const,
  };

  const cardStyle = {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  };

  const buttonPrimaryStyle = {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  };

  const buttonSecondaryStyle = {
    padding: '0.75rem 1.5rem',
    background: '#F1F5F9',
    border: 'none',
    borderRadius: '8px',
    color: '#64748B',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  };

  const buttonDangerStyle = {
    padding: '0.5rem 1rem',
    background: '#FEE2E2',
    border: 'none',
    borderRadius: '8px',
    color: '#DC2626',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '0.875rem',
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: '200px',
    fontFamily: 'monospace',
    resize: 'vertical' as const,
  };

  const badgeStyle = {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    background: '#EDE9FE',
    color: '#7C3AED',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
    marginRight: '0.5rem',
  };

  const emptyStateStyle = {
    textAlign: 'center' as const,
    padding: '3rem',
    color: '#64748B',
  };

  // Modal/Dialog styles
  const modalOverlayStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalContentStyle = {
    background: '#FFFFFF',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '700px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto' as const,
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <aside style={sidebarStyle}>
          <Link href="/settings" style={backLinkStyle}>
            Back to Settings
          </Link>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link href="/settings/genres" style={navLinkStyle}>
              Custom Genres
            </Link>
            <Link href="/settings/prose-style" style={navLinkStyle}>
              Prose Style
            </Link>
            <Link href="/settings/author-styles" style={activeLinkStyle}>
              Author Styles
            </Link>
            <Link href="/settings/exclusions" style={navLinkStyle}>
              Exclusions
            </Link>
            <Link href="/settings/recipes" style={navLinkStyle}>
              Genre Recipes
            </Link>
          </nav>
        </aside>
        <main style={mainStyle}>
          <div style={emptyStateStyle}>Loading author styles...</div>
        </main>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <Link href="/settings" style={backLinkStyle}>
          Back to Settings
        </Link>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/settings/genres" style={navLinkStyle}>
            Custom Genres
          </Link>
          <Link href="/settings/prose-style" style={navLinkStyle}>
            Prose Style
          </Link>
          <Link href="/settings/author-styles" style={activeLinkStyle}>
            Author Styles
          </Link>
          <Link href="/settings/exclusions" style={navLinkStyle}>
            Exclusions
          </Link>
          <Link href="/settings/recipes" style={navLinkStyle}>
            Genre Recipes
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={mainStyle}>
        <header style={headerStyle}>
          <div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1A1A2E',
                margin: 0,
              }}
            >
              Author Styles
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Train the AI to write in your unique voice by analysing your existing work
            </p>
          </div>
          <button onClick={() => setShowCreateDialog(true)} style={buttonPrimaryStyle}>
            + New Style
          </button>
        </header>

        <div style={contentStyle}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {styles.length === 0 ? (
              <div style={cardStyle}>
                <div style={emptyStateStyle}>
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ margin: '0 auto 1rem' }}
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <p style={{ marginBottom: '1rem' }}>No author styles created yet</p>
                  <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    Create a style profile by analysing your existing writing
                  </p>
                  <button onClick={() => setShowCreateDialog(true)} style={buttonPrimaryStyle}>
                    + Create Your First Style
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {styles.map((style) => (
                  <div key={style.id} style={cardStyle}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '1rem',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <h3
                          style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: '#1A1A2E',
                            margin: 0,
                            marginBottom: '0.25rem',
                          }}
                        >
                          {style.name}
                        </h3>
                        {style.description && (
                          <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
                            {style.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteStyle(style.id)}
                        style={buttonDangerStyle}
                        title="Delete style"
                      >
                        Delete
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        marginBottom: '1rem',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Words Analysed</span>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                          {style.word_count.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Sentence Length</span>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                          {style.style_data.averageSentenceLength} words
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Dialogue Ratio</span>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                          {style.style_data.dialogueRatio}%
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Complexity</span>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                          {style.style_data.vocabularyComplexity}%
                        </p>
                      </div>
                    </div>

                    {style.style_data.toneIndicators?.length > 0 && (
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Detected Tone:</span>
                        <div style={{ marginTop: '0.5rem' }}>
                          {style.style_data.toneIndicators.map((tone, i) => (
                            <span key={i} style={badgeStyle}>
                              {tone}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Dialog */}
      {showCreateDialog && (
        <div style={modalOverlayStyle} onClick={() => setShowCreateDialog(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>
              Create Author Style
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem',
                  }}
                >
                  Style Name
                </label>
                <input
                  type="text"
                  value={newStyleName}
                  onChange={(e) => setNewStyleName(e.target.value)}
                  placeholder="e.g., My Thriller Voice, Literary Fiction Style"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem',
                  }}
                >
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newStyleDescription}
                  onChange={(e) => setNewStyleDescription(e.target.value)}
                  placeholder="Brief description of this writing style"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem',
                  }}
                >
                  Sample Text
                </label>
                <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0 0 0.5rem' }}>
                  Paste at least 5,000 words of your writing for best results
                </p>
                <textarea
                  value={manuscriptText}
                  onChange={(e) => setManuscriptText(e.target.value)}
                  placeholder="Paste your manuscript text here..."
                  style={textareaStyle}
                />
                <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.5rem' }}>
                  {wordCount.toLocaleString()} words
                </p>
              </div>

              <button
                onClick={analyseManuscript}
                disabled={analysing || wordCount < 500}
                style={{
                  ...buttonSecondaryStyle,
                  width: '100%',
                  opacity: analysing || wordCount < 500 ? 0.5 : 1,
                  cursor: analysing || wordCount < 500 ? 'not-allowed' : 'pointer',
                }}
              >
                {analysing ? 'Analysing...' : 'Analyse Style'}
              </button>

              {analysisResult && (
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    padding: '1rem',
                  }}
                >
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Analysis Results
                  </h3>
                  <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                    {analysisResult.summary}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Avg Sentence Length:</span>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                        {analysisResult.styleProfile.averageSentenceLength} words
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Vocabulary Complexity:</span>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                        {analysisResult.styleProfile.vocabularyComplexity}%
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Dialogue Ratio:</span>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                        {analysisResult.styleProfile.dialogueRatio}%
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Description Density:</span>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0 }}>
                        {analysisResult.styleProfile.descriptionDensity}%
                      </p>
                    </div>
                  </div>
                  {analysisResult.styleProfile.toneIndicators?.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Tone:</span>
                      <div style={{ marginTop: '0.25rem' }}>
                        {analysisResult.styleProfile.toneIndicators.map((tone, i) => (
                          <span key={i} style={badgeStyle}>
                            {tone}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={() => {
                    setShowCreateDialog(false);
                    resetForm();
                  }}
                  style={{ ...buttonSecondaryStyle, flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={createStyle}
                  disabled={!newStyleName.trim() || !analysisResult}
                  style={{
                    ...buttonPrimaryStyle,
                    flex: 1,
                    opacity: !newStyleName.trim() || !analysisResult ? 0.5 : 1,
                    cursor: !newStyleName.trim() || !analysisResult ? 'not-allowed' : 'pointer',
                  }}
                >
                  Save Style
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
