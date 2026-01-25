'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '../../../components/shared/PageLayout';
import LoadingState from '../../../components/shared/LoadingState';
import ErrorMessage from '../../../components/shared/ErrorMessage';
import { fetchJson, post } from '../../../lib/fetch-utils';
import { getToken } from '../../../lib/auth';
import { colors, gradients, borderRadius, shadows, API_BASE_URL } from '../../../lib/constants';
import { card, button, buttonPrimary, buttonSecondary, buttonDisabled, input, label } from '../../../lib/styles';

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
      const project = await fetchJson<any>(`/api/projects/${projectId}`);
      // BUG-005 FIX: Add defensive null checks for story_bible and characters
      if (project?.story_bible?.characters && Array.isArray(project.story_bible.characters)) {
        setCharacters(project.story_bible.characters);
        if (project.story_bible.characters.length > 0) {
          setSelectedCharacter(project.story_bible.characters[0]);
        }
      } else {
        // Set empty array if no characters exist
        setCharacters([]);
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

  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerateName = async (characterId: string, currentCharacterData?: Partial<Character>) => {
    setIsRegenerating(true);
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}/characters/${characterId}/regenerate-name`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            // Send current edited values to use for name generation
            ethnicity: currentCharacterData?.ethnicity,
            nationality: currentCharacterData?.nationality,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Failed to regenerate name' } }));
        throw new Error(errorData.error?.message || 'Failed to regenerate name');
      }

      const updated = await response.json();
      setCharacters(chars => chars.map(c => c.id === updated.id ? updated : c));
      if (selectedCharacter?.id === updated.id) {
        setSelectedCharacter(updated);
      }
    } catch (err: any) {
      console.error('Error regenerating name:', err);
      setError(err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerateAllNames = async () => {
    if (!confirm('Regenerate names for all characters? This will replace all existing names.')) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}/characters/regenerate-all-names`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Failed to regenerate names' } }));
        throw new Error(errorData.error?.message || 'Failed to regenerate names');
      }

      const data = await response.json();
      setCharacters(data.characters);
      if (selectedCharacter && data.characters.length > 0) {
        const updatedSelected = data.characters.find((c: Character) => c.id === selectedCharacter.id);
        setSelectedCharacter(updatedSelected || data.characters[0]);
      }
    } catch (err: any) {
      console.error('Error regenerating all names:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = () => {
    router.push(`/projects/${projectId}/world`);
  };

  if (isLoading) {
    return <LoadingState message="Loading characters..." />;
  }

  return (
    <PageLayout
      title="Characters"
      subtitle="Create and edit your story's cast of characters"
      backLink={`/projects/${projectId}`}
      backText="← Back to Project"
    >
      {error && <ErrorMessage message={error} />}

      {characters.length === 0 ? (
        <div style={{
          ...card,
          textAlign: 'center',
          padding: '4rem 2rem',
          border: `2px dashed ${colors.border}`,
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
              ...buttonPrimary,
              padding: '1rem 2rem',
              ...(isGenerating && buttonDisabled),
              background: isGenerating ? colors.textTertiary : gradients.brand,
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
            {isGenerating ? 'Generating Characters...' : 'Generate Characters'}
          </button>
          <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

                  <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                      onClick={handleRegenerateAllNames}
                      disabled={isGenerating}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        color: '#667eea',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                        opacity: isGenerating ? 0.5 : 1,
                      }}
                    >
                      🔄 Regenerate All Names
                    </button>
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
                      Continue to World →
                    </button>
                    <Link
                      href={`/projects/${projectId}`}
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
                      ← Back to Project Overview
                    </Link>
                  </div>
                </div>

                {/* Character Details */}
                {selectedCharacter && (
                  <CharacterEditor
                    character={selectedCharacter}
                    onSave={handleSaveCharacter}
                    onRegenerateName={handleRegenerateName}
                    isSaving={isSaving}
                    isRegenerating={isRegenerating}
              />
            )}
          </div>
        )}
    </PageLayout>
  );
}

function CharacterEditor({
  character,
  onSave,
  onRegenerateName,
  isSaving,
  isRegenerating,
}: {
  character: Character;
  onSave: (char: Character) => void;
  onRegenerateName: (characterId: string, currentData?: Partial<Character>) => void;
  isSaving: boolean;
  isRegenerating: boolean;
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

  return (
    <div style={{
      ...card,
      padding: '2rem',
      maxHeight: '80vh',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#1A1A2E', fontWeight: 600 }}>Edit Character</h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            ...buttonPrimary,
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            ...(isSaving && buttonDisabled),
            background: isSaving ? colors.textTertiary : gradients.brand,
          }}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Name */}
        <div>
          <label style={label}>Name</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={editedChar.name}
              onChange={(e) => handleChange('name', e.target.value)}
              style={{ ...input, flex: 1 }}
            />
            <button
              onClick={() => onRegenerateName(character.id, editedChar)}
              disabled={isRegenerating}
              style={{
                padding: '0.75rem 1rem',
                background: isRegenerating ? '#F1F5F9' : '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                color: isRegenerating ? '#94A3B8' : '#667eea',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: isRegenerating ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
              }}
              title="Regenerate character name"
            >
              {isRegenerating ? (
                <span style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  border: '2px solid #E2E8F0',
                  borderTopColor: '#667eea',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
              ) : '🔄'} Regenerate
            </button>
            <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>

        {/* Ethnicity & Nationality */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={label}>Ethnicity / Cultural Background</label>
            <input
              type="text"
              value={editedChar.ethnicity || ''}
              onChange={(e) => handleChange('ethnicity', e.target.value)}
              placeholder="e.g., East Asian, Mediterranean, Nordic..."
              style={input}
            />
          </div>
          <div>
            <label style={label}>Nationality / Region of Origin</label>
            <input
              type="text"
              value={editedChar.nationality || ''}
              onChange={(e) => handleChange('nationality', e.target.value)}
              placeholder="e.g., Japanese, Italian, fictional region..."
              style={input}
            />
          </div>
        </div>

        {/* Physical Description */}
        <div>
          <label style={label}>Physical Description</label>
          <textarea
            value={editedChar.physicalDescription}
            onChange={(e) => handleChange('physicalDescription', e.target.value)}
            rows={3}
            style={{ ...input, resize: 'vertical' }}
          />
        </div>

        {/* Voice Sample */}
        <div>
          <label style={label}>Voice Sample</label>
          <textarea
            value={editedChar.voiceSample}
            onChange={(e) => handleChange('voiceSample', e.target.value)}
            rows={6}
            style={{ ...input, resize: 'vertical', fontStyle: 'italic' }}
          />
        </div>

        {/* Personality Traits */}
        <div>
          <label style={label}>Personality Traits</label>
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
          <label style={label}>Backstory</label>
          <textarea
            value={editedChar.backstory}
            onChange={(e) => handleChange('backstory', e.target.value)}
            rows={6}
            style={{ ...input, resize: 'vertical' }}
          />
        </div>

        {/* Character Arc */}
        <div>
          <label style={label}>Character Arc</label>
          <textarea
            value={editedChar.characterArc}
            onChange={(e) => handleChange('characterArc', e.target.value)}
            rows={4}
            style={{ ...input, resize: 'vertical' }}
          />
        </div>
      </div>
    </div>
  );
}
