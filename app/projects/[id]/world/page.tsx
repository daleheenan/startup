'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, logout } from '../../../lib/auth';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface WorldElement {
  id: string;
  type: 'location' | 'faction' | 'magic_system' | 'technology' | 'custom';
  name: string;
  description: string;
  significance: string;
  rules?: string[];
  history?: string;
}

export default function WorldPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [worldElements, setWorldElements] = useState<WorldElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<WorldElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);

  // IMPORTANT: All hooks must be called before any early returns

  useEffect(() => {
    fetchWorldElements();
  }, [projectId]);

  const fetchWorldElements = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch project');
      }

      const projectData = await response.json();
      setProject(projectData);
      if (projectData.story_bible?.world) {
        setWorldElements(projectData.story_bible.world);
        if (projectData.story_bible.world.length > 0) {
          setSelectedElement(projectData.story_bible.world[0]);
        }
      }
    } catch (err: any) {
      console.error('Error fetching world elements:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const token = getToken();
      const projectResponse = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!projectResponse.ok) throw new Error('Failed to fetch project');
      const project = await projectResponse.json();

      const protagonist = project.story_bible?.characters?.find(
        (c: any) => c.role === 'protagonist'
      );

      const context = {
        title: project.title,
        synopsis: 'Based on selected concept',
        genre: project.genre,
        subgenre: project.story_dna?.subgenre || project.genre,
        tone: project.story_dna?.tone || 'dramatic',
        themes: project.story_dna?.themes || [],
        protagonistName: protagonist?.name || 'the protagonist',
      };

      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/world`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ context }),
      });

      if (!response.ok) throw new Error('Failed to generate world');

      const data = await response.json();
      setWorldElements(data.world);
      if (data.world.length > 0) {
        setSelectedElement(data.world[0]);
      }
    } catch (err: any) {
      console.error('Error generating world:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveElement = async (updatedElement: WorldElement) => {
    setIsSaving(true);
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}/world/${updatedElement.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updatedElement),
        }
      );

      if (!response.ok) throw new Error('Failed to save world element');

      const saved = await response.json();
      setWorldElements(elems => elems.map(e => e.id === saved.id ? saved : e));
      setSelectedElement(saved);
    } catch (err: any) {
      console.error('Error saving world element:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = () => {
    router.push(`/projects/${projectId}/plot`);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'location': return '🗺️';
      case 'faction': return '⚔️';
      case 'magic_system': return '✨';
      case 'technology': return '🔬';
      default: return '📝';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            width: '48px',
            height: '48px',
            border: '3px solid #E2E8F0',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '1rem', color: '#64748B' }}>Loading world...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <DashboardLayout
      header={{ title: 'World Building', subtitle: 'Create and edit locations, factions, and systems' }}
      projectId={projectId}
    >

      {/* Content Area */}
      <div style={{ padding: '1.5rem 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '1rem 1.5rem',
                marginBottom: '1.5rem',
                color: '#DC2626',
              }}>
                {error}
              </div>
            )}

            {worldElements.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '2px dashed #E2E8F0',
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌍</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1A1A2E' }}>
                  No World Elements Yet
                </h2>
                <p style={{ fontSize: '1rem', color: '#64748B', marginBottom: '2rem' }}>
                  Generate your story's world with locations, factions, and systems
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  style={{
                    padding: '1rem 2rem',
                    background: isGenerating
                      ? '#94A3B8'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    boxShadow: isGenerating ? 'none' : '0 4px 14px rgba(102, 126, 234, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isGenerating && (
                    <span style={{
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                  )}
                  {isGenerating ? 'Generating World...' : 'Generate World'}
                </button>
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
                {/* Element List */}
                <div>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#1A1A2E', fontWeight: 600 }}>Elements</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {worldElements.map(elem => (
                      <button
                        key={elem.id}
                        onClick={() => setSelectedElement(elem)}
                        style={{
                          padding: '1rem',
                          background: selectedElement?.id === elem.id
                            ? '#EEF2FF'
                            : '#FFFFFF',
                          border: selectedElement?.id === elem.id
                            ? '1px solid #667eea'
                            : '1px solid #E2E8F0',
                          borderRadius: '8px',
                          color: '#1A1A2E',
                          textAlign: 'left',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span>{getTypeIcon(elem.type)}</span>
                          <span style={{ fontWeight: 600 }}>{elem.name}</span>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#64748B' }}>
                          {getTypeLabel(elem.type)}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                      onClick={handleContinue}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(102, 126, 234, 0.3)',
                      }}
                    >
                      Continue to Plot →
                    </button>
                    <Link
                      href={`/projects/${projectId}/characters`}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        color: '#64748B',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'center',
                        textDecoration: 'none',
                        display: 'block',
                      }}
                    >
                      ← Back to Characters
                    </Link>
                  </div>
                </div>

                {/* Element Details */}
                {selectedElement && (
                  <WorldElementEditor
                    element={selectedElement}
                    onSave={handleSaveElement}
                    isSaving={isSaving}
                  />
                )}
              </div>
            )}
          </div>
        </div>
    </DashboardLayout>
  );
}

function WorldElementEditor({
  element,
  onSave,
  isSaving,
}: {
  element: WorldElement;
  onSave: (elem: WorldElement) => void;
  isSaving: boolean;
}) {
  const [editedElem, setEditedElem] = useState(element);

  useEffect(() => {
    setEditedElem(element);
  }, [element]);

  const handleChange = (field: string, value: any) => {
    setEditedElem(prev => ({ ...prev, [field]: value }));
  };

  const handleRuleChange = (index: number, value: string) => {
    setEditedElem(prev => {
      const rules = [...(prev.rules || [])];
      rules[index] = value;
      return { ...prev, rules };
    });
  };

  const handleSave = () => {
    onSave(editedElem);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    color: '#1A1A2E',
    fontSize: '1rem',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.875rem',
  };

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
      padding: '2rem',
      maxHeight: '80vh',
      overflowY: 'auto',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#1A1A2E', fontWeight: 600 }}>Edit World Element</h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: '0.75rem 1.5rem',
            background: isSaving ? '#94A3B8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>Name</label>
          <input
            type="text"
            value={editedElem.name}
            onChange={(e) => handleChange('name', e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Type Badge */}
        <div>
          <label style={labelStyle}>Type</label>
          <div style={{
            padding: '0.75rem',
            background: '#EEF2FF',
            border: '1px solid #C7D2FE',
            borderRadius: '6px',
            color: '#374151',
            textTransform: 'capitalize',
            display: 'inline-block'
          }}>
            {editedElem.type.replace('_', ' ')}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            value={editedElem.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={6}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Significance */}
        <div>
          <label style={labelStyle}>Significance to Story</label>
          <textarea
            value={editedElem.significance}
            onChange={(e) => handleChange('significance', e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Rules (for systems) */}
        {editedElem.rules && editedElem.rules.length > 0 && (
          <div>
            <label style={labelStyle}>Rules & Limitations</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {editedElem.rules.map((rule, i) => (
                <input
                  key={i}
                  type="text"
                  value={rule}
                  onChange={(e) => handleRuleChange(i, e.target.value)}
                  style={inputStyle}
                />
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {editedElem.history && (
          <div>
            <label style={labelStyle}>History</label>
            <textarea
              value={editedElem.history}
              onChange={(e) => handleChange('history', e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
