'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, logout } from '../../../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Character {
  id: string;
  name: string;
  role: string;
  ethnicity?: string;
  nationality?: string;
  physicalDescription: string;
  personality: string[];
  voiceSample: string;
  goals: string[];
  conflicts: {
    internal: string[];
    external: string[];
  };
  backstory: string;
  currentState: string;
  characterArc: string;
  relationships: Array<{
    characterId: string;
    characterName: string;
    relationship: string;
  }>;
}

export default function CharactersPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCharacters();
  }, [projectId]);

  const fetchCharacters = async () => {
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

      const project = await response.json();
      if (project.story_bible?.characters) {
        setCharacters(project.story_bible.characters);
        if (project.story_bible.characters.length > 0) {
          setSelectedCharacter(project.story_bible.characters[0]);
        }
      }
    } catch (err: any) {
      console.error('Error fetching characters:', err);
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

      const context = {
        title: project.title,
        synopsis: 'Based on selected concept',
        genre: project.genre,
        tone: project.story_dna?.tone || 'dramatic',
        themes: project.story_dna?.themes || [],
      };

      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ context }),
      });

      if (!response.ok) throw new Error('Failed to generate characters');

      const data = await response.json();
      setCharacters(data.characters);
      if (data.characters.length > 0) {
        setSelectedCharacter(data.characters[0]);
      }
    } catch (err: any) {
      console.error('Error generating characters:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCharacter = async (updatedCharacter: Character) => {
    setIsSaving(true);
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}/characters/${updatedCharacter.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updatedCharacter),
        }
      );

      if (!response.ok) throw new Error('Failed to save character');

      const saved = await response.json();
      setCharacters(chars => chars.map(c => c.id === saved.id ? saved : c));
      setSelectedCharacter(saved);
    } catch (err: any) {
      console.error('Error saving character:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = () => {
    router.push(`/projects/${projectId}/world`);
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
          <p style={{ marginTop: '1rem', color: '#64748B' }}>Loading characters...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

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
              Characters
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
              Create and edit your story's cast of characters
            </p>
          </div>
          <Link
            href={`/projects/${projectId}`}
            style={{
              padding: '0.5rem 1rem',
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            ← Back to Project
          </Link>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
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

            {characters.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '2px dashed #E2E8F0',
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👥</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1A1A2E' }}>
                  No Characters Yet
                </h2>
                <p style={{ fontSize: '1rem', color: '#64748B', marginBottom: '2rem' }}>
                  Generate your story's cast of characters with AI
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
                  }}
                >
                  {isGenerating ? 'Generating Characters...' : 'Generate Characters'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
                {/* Character List */}
                <div>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#1A1A2E', fontWeight: 600 }}>Cast</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {characters.map(char => (
                      <button
                        key={char.id}
                        onClick={() => setSelectedCharacter(char)}
                        style={{
                          padding: '1rem',
                          background: selectedCharacter?.id === char.id
                            ? '#EEF2FF'
                            : '#FFFFFF',
                          border: selectedCharacter?.id === char.id
                            ? '1px solid #667eea'
                            : '1px solid #E2E8F0',
                          borderRadius: '8px',
                          color: '#1A1A2E',
                          textAlign: 'left',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{char.name}</div>
                        <div style={{ fontSize: '0.875rem', color: '#64748B', textTransform: 'capitalize' }}>
                          {char.role.replace('_', ' ')}
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleContinue}
                    style={{
                      marginTop: '2rem',
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
                    Continue to World →
                  </button>
                </div>

                {/* Character Details */}
                {selectedCharacter && (
                  <CharacterEditor
                    character={selectedCharacter}
                    onSave={handleSaveCharacter}
                    isSaving={isSaving}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function CharacterEditor({
  character,
  onSave,
  isSaving,
}: {
  character: Character;
  onSave: (char: Character) => void;
  isSaving: boolean;
}) {
  const [editedChar, setEditedChar] = useState(character);

  useEffect(() => {
    setEditedChar(character);
  }, [character]);

  const handleChange = (field: string, value: any) => {
    setEditedChar(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: string, index: number, value: string) => {
    setEditedChar(prev => {
      const arr = [...(prev as any)[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const handleSave = () => {
    onSave(editedChar);
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
        <h3 style={{ fontSize: '1.25rem', color: '#1A1A2E', fontWeight: 600 }}>Edit Character</h3>
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
            value={editedChar.name}
            onChange={(e) => handleChange('name', e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Ethnicity & Nationality */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Ethnicity / Cultural Background</label>
            <input
              type="text"
              value={editedChar.ethnicity || ''}
              onChange={(e) => handleChange('ethnicity', e.target.value)}
              placeholder="e.g., East Asian, Mediterranean, Nordic..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Nationality / Region of Origin</label>
            <input
              type="text"
              value={editedChar.nationality || ''}
              onChange={(e) => handleChange('nationality', e.target.value)}
              placeholder="e.g., Japanese, Italian, fictional region..."
              style={inputStyle}
            />
          </div>
        </div>

        {/* Physical Description */}
        <div>
          <label style={labelStyle}>Physical Description</label>
          <textarea
            value={editedChar.physicalDescription}
            onChange={(e) => handleChange('physicalDescription', e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Voice Sample */}
        <div>
          <label style={labelStyle}>Voice Sample</label>
          <textarea
            value={editedChar.voiceSample}
            onChange={(e) => handleChange('voiceSample', e.target.value)}
            rows={6}
            style={{ ...inputStyle, resize: 'vertical', fontStyle: 'italic' }}
          />
        </div>

        {/* Personality Traits */}
        <div>
          <label style={labelStyle}>Personality Traits</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {editedChar.personality.map((trait, i) => (
              <input
                key={i}
                type="text"
                value={trait}
                onChange={(e) => handleArrayChange('personality', i, e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: '#EEF2FF',
                  border: '1px solid #C7D2FE',
                  borderRadius: '6px',
                  color: '#1A1A2E',
                  fontSize: '0.875rem',
                  minWidth: '100px',
                }}
              />
            ))}
          </div>
        </div>

        {/* Backstory */}
        <div>
          <label style={labelStyle}>Backstory</label>
          <textarea
            value={editedChar.backstory}
            onChange={(e) => handleChange('backstory', e.target.value)}
            rows={6}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Character Arc */}
        <div>
          <label style={labelStyle}>Character Arc</label>
          <textarea
            value={editedChar.characterArc}
            onChange={(e) => handleChange('characterArc', e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </div>
    </div>
  );
}
