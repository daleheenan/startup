'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Character {
  id: string;
  name: string;
  role: string;
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
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');

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
      // First, get project details for context
      const projectResponse = await fetch(`http://localhost:3001/api/projects/${projectId}`);
      if (!projectResponse.ok) throw new Error('Failed to fetch project');
      const project = await projectResponse.json();

      // Prepare context from project
      const context = {
        title: project.title,
        synopsis: 'Based on selected concept', // This would come from stored concept
        genre: project.genre,
        tone: project.story_dna?.tone || 'dramatic',
        themes: project.story_dna?.themes || [],
      };

      // Generate characters
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(
        `http://localhost:3001/api/projects/${projectId}/characters/${updatedCharacter.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            width: '50px',
            height: '50px',
            border: '4px solid rgba(102, 126, 234, 0.3)',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '1rem', color: '#888' }}>Loading characters...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <main style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Characters
          </h1>
          <p style={{ color: '#888' }}>Create and edit your story's cast of characters</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            color: '#ef4444'
          }}>
            {error}
          </div>
        )}

        {characters.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            border: '1px dashed rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👥</div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ededed' }}>
              No Characters Yet
            </h2>
            <p style={{ fontSize: '1rem', color: '#888', marginBottom: '2rem' }}>
              Generate your story's cast of characters with AI
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                padding: '1rem 2rem',
                background: isGenerating
                  ? 'rgba(102, 126, 234, 0.5)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
              }}
            >
              {isGenerating ? 'Generating Characters...' : 'Generate Characters'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
            {/* Character List */}
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#ededed' }}>Cast</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {characters.map(char => (
                  <button
                    key={char.id}
                    onClick={() => setSelectedCharacter(char)}
                    style={{
                      padding: '1rem',
                      background: selectedCharacter?.id === char.id
                        ? 'rgba(102, 126, 234, 0.2)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: selectedCharacter?.id === char.id
                        ? '1px solid rgba(102, 126, 234, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#ededed',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{char.name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#888', textTransform: 'capitalize' }}>
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

        {/* Back Link */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a href={`/projects/${projectId}`} style={{ color: '#667eea', textDecoration: 'none', fontSize: '0.875rem' }}>
            ← Back to Project
          </a>
        </div>
      </div>
    </main>
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

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '2rem',
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.5rem', color: '#ededed' }}>Edit Character</h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: '0.75rem 1.5rem',
            background: isSaving ? 'rgba(102, 126, 234, 0.5)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ededed', fontWeight: 600 }}>
            Name
          </label>
          <input
            type="text"
            value={editedChar.name}
            onChange={(e) => handleChange('name', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: '#ededed',
              fontSize: '1rem',
            }}
          />
        </div>

        {/* Physical Description */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ededed', fontWeight: 600 }}>
            Physical Description
          </label>
          <textarea
            value={editedChar.physicalDescription}
            onChange={(e) => handleChange('physicalDescription', e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: '#ededed',
              fontSize: '1rem',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Voice Sample */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ededed', fontWeight: 600 }}>
            Voice Sample
          </label>
          <textarea
            value={editedChar.voiceSample}
            onChange={(e) => handleChange('voiceSample', e.target.value)}
            rows={6}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: '#ededed',
              fontSize: '1rem',
              fontStyle: 'italic',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Personality Traits */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ededed', fontWeight: 600 }}>
            Personality Traits
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {editedChar.personality.map((trait, i) => (
              <input
                key={i}
                type="text"
                value={trait}
                onChange={(e) => handleArrayChange('personality', i, e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(102, 126, 234, 0.2)',
                  border: '1px solid rgba(102, 126, 234, 0.5)',
                  borderRadius: '6px',
                  color: '#ededed',
                  fontSize: '0.875rem',
                  minWidth: '100px',
                }}
              />
            ))}
          </div>
        </div>

        {/* Backstory */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ededed', fontWeight: 600 }}>
            Backstory
          </label>
          <textarea
            value={editedChar.backstory}
            onChange={(e) => handleChange('backstory', e.target.value)}
            rows={6}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: '#ededed',
              fontSize: '1rem',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Character Arc */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ededed', fontWeight: 600 }}>
            Character Arc
          </label>
          <textarea
            value={editedChar.characterArc}
            onChange={(e) => handleChange('characterArc', e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: '#ededed',
              fontSize: '1rem',
              resize: 'vertical',
            }}
          />
        </div>
      </div>
    </div>
  );
}
