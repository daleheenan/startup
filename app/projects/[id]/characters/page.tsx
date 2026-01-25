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
import { useProjectNavigation } from '../../../hooks/useProjectProgress';

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
  const [project, setProject] = useState<any>(null);
  const [nationalityFilter, setNationalityFilter] = useState<string>('all');
  const [ethnicityFilter, setEthnicityFilter] = useState<string>('all');

  useEffect(() => {
    fetchCharacters();
  }, [projectId]);

  const fetchCharacters = async () => {
    try {
      const projectData = await fetchJson<any>(`/api/projects/${projectId}`);
      setProject(projectData);
      // BUG-005 FIX: Add defensive null checks for story_bible and characters
      if (projectData?.story_bible?.characters && Array.isArray(projectData.story_bible.characters)) {
        setCharacters(projectData.story_bible.characters);
        if (projectData.story_bible.characters.length > 0) {
          setSelectedCharacter(projectData.story_bible.characters[0]);
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

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSaveCharacter = async (updatedCharacter: Character) => {
    setIsSaving(true);
    setSuccessMessage(null);
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

      const result = await response.json();
      const saved = result.character || result;
      setCharacters(chars => chars.map(c => c.id === saved.id ? saved : c));
      setSelectedCharacter(saved);

      // Show propagation results if name was changed
      if (result.propagation) {
        const { updatedSceneCards, updatedRelationships, updatedTimeline, updatedChapters } = result.propagation;
        const total = updatedSceneCards + updatedRelationships + updatedTimeline + updatedChapters;
        if (total > 0) {
          const parts = [];
          if (updatedSceneCards > 0) parts.push(`${updatedSceneCards} scene card${updatedSceneCards !== 1 ? 's' : ''}`);
          if (updatedRelationships > 0) parts.push(`${updatedRelationships} relationship${updatedRelationships !== 1 ? 's' : ''}`);
          if (updatedTimeline > 0) parts.push(`${updatedTimeline} timeline event${updatedTimeline !== 1 ? 's' : ''}`);
          if (updatedChapters > 0) parts.push(`${updatedChapters} chapter${updatedChapters !== 1 ? 's' : ''}`);
          setSuccessMessage(`Name updated across ${parts.join(', ')}`);
          // Auto-hide after 5 seconds
          setTimeout(() => setSuccessMessage(null), 5000);
        }
      }
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

      // Show success message
      setSuccessMessage(`Name regenerated and backstory/arc updated for ${updated.name}`);
      setTimeout(() => setSuccessMessage(null), 5000);
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

  // Get unique nationalities and ethnicities for filters
  const uniqueNationalities = Array.from(new Set(characters.map(c => c.nationality).filter(Boolean)));
  const uniqueEthnicities = Array.from(new Set(characters.map(c => c.ethnicity).filter(Boolean)));

  // Filter characters
  const filteredCharacters = characters.filter(char => {
    if (nationalityFilter !== 'all' && char.nationality !== nationalityFilter) {
      return false;
    }
    if (ethnicityFilter !== 'all' && char.ethnicity !== ethnicityFilter) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return <LoadingState message="Loading characters..." />;
  }

  const navigation = useProjectNavigation(projectId, project);

  return (
    <PageLayout
      title="Characters"
      subtitle="Create and edit your story's cast of characters"
      backLink={`/projects/${projectId}`}
      backText="← Back to Project"
      projectNavigation={navigation}
    >
      {error && <ErrorMessage message={error} />}

      {successMessage && (
        <div style={{
          padding: '1rem',
          background: '#ECFDF5',
          border: '1px solid #10B981',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          color: '#065F46',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1.25rem' }}>✓</span>
          {successMessage}
        </div>
      )}

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.125rem', color: '#1A1A2E', fontWeight: 600 }}>Cast</h3>
                    <div style={{ fontSize: '0.875rem', color: '#64748B' }}>
                      {filteredCharacters.length}/{characters.length}
                    </div>
                  </div>

                  {/* Filters */}
                  {(uniqueNationalities.length > 1 || uniqueEthnicities.length > 1) && (
                    <div style={{ marginBottom: '1rem' }}>
                      {uniqueNationalities.length > 1 && (
                        <select
                          value={nationalityFilter}
                          onChange={(e) => setNationalityFilter(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            marginBottom: '0.5rem',
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            color: '#1A1A2E',
                            fontSize: '0.875rem',
                          }}
                        >
                          <option value="all">All Nationalities</option>
                          {uniqueNationalities.map(nat => (
                            <option key={nat} value={nat}>{nat}</option>
                          ))}
                        </select>
                      )}
                      {uniqueEthnicities.length > 1 && (
                        <select
                          value={ethnicityFilter}
                          onChange={(e) => setEthnicityFilter(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            color: '#1A1A2E',
                            fontSize: '0.875rem',
                          }}
                        >
                          <option value="all">All Ethnicities</option>
                          {uniqueEthnicities.map(eth => (
                            <option key={eth} value={eth}>{eth}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredCharacters.map(char => (
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
                        {char.nationality && (
                          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                            {char.nationality}
                          </div>
                        )}
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
                    projectId={projectId}
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

interface NameReferences {
  sceneCards: number;
  relationships: number;
  timeline: number;
  chapters: number;
}

interface PropagationResult {
  updatedSceneCards: number;
  updatedRelationships: number;
  updatedTimeline: number;
  updatedChapters: number;
}

function CharacterEditor({
  character,
  projectId,
  onSave,
  onRegenerateName,
  isSaving,
  isRegenerating,
}: {
  character: Character;
  projectId: string;
  onSave: (char: Character, propagationResult?: PropagationResult) => void;
  onRegenerateName: (characterId: string, currentData?: Partial<Character>) => void;
  isSaving: boolean;
  isRegenerating: boolean;
}) {
  const [editedChar, setEditedChar] = useState(character);
  const [originalName, setOriginalName] = useState(character.name);
  const [showNameChangeDialog, setShowNameChangeDialog] = useState(false);
  const [nameReferences, setNameReferences] = useState<NameReferences | null>(null);
  const [includeChapterContent, setIncludeChapterContent] = useState(true);
  const [isLoadingReferences, setIsLoadingReferences] = useState(false);
  const [isUpdatingDependentFields, setIsUpdatingDependentFields] = useState(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('characterAutoUpdate');
      return saved !== 'false'; // Default to true
    }
    return true;
  });
  const [nameChangeDebounceTimer, setNameChangeDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setEditedChar(character);
    setOriginalName(character.name);
  }, [character]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('characterAutoUpdate', String(autoUpdateEnabled));
    }
  }, [autoUpdateEnabled]);

  const handleChange = (field: string, value: any) => {
    setEditedChar(prev => ({ ...prev, [field]: value }));

    // Auto-update dependent fields when name changes
    if (field === 'name' && autoUpdateEnabled && value !== originalName && value.trim()) {
      // Clear existing timer
      if (nameChangeDebounceTimer) {
        clearTimeout(nameChangeDebounceTimer);
      }

      // Set new debounced timer (500ms)
      const timer = setTimeout(() => {
        handleAutoUpdateDependentFields(value);
      }, 500);

      setNameChangeDebounceTimer(timer);
    }
  };

  const handleAutoUpdateDependentFields = async (newName: string) => {
    if (newName === originalName || !newName.trim()) return;

    setIsUpdatingDependentFields(true);

    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}/characters/${character.id}/auto-update-dependent-fields`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            newName,
            fieldsToUpdate: ['backstory', 'characterArc'],
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to auto-update dependent fields');
      }

      const updatedFields = await response.json();

      // Update the edited character with the new fields
      setEditedChar(prev => ({
        ...prev,
        backstory: updatedFields.backstory || prev.backstory,
        characterArc: updatedFields.characterArc || prev.characterArc,
      }));
    } catch (err: any) {
      console.error('Error auto-updating dependent fields:', err);
      // Silently fail - user can still manually edit
    } finally {
      setIsUpdatingDependentFields(false);
    }
  };

  const handleArrayChange = (field: string, index: number, value: string) => {
    setEditedChar(prev => {
      const arr = [...(prev as any)[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const fetchNameReferences = async () => {
    setIsLoadingReferences(true);
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}/characters/${character.id}/name-references`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setNameReferences(data);
      }
    } catch (err) {
      console.error('Error fetching name references:', err);
    } finally {
      setIsLoadingReferences(false);
    }
  };

  const handleSave = async () => {
    // Check if name changed
    if (editedChar.name !== originalName) {
      // Fetch references to show impact
      await fetchNameReferences();
      setShowNameChangeDialog(true);
    } else {
      // No name change, save directly
      onSave(editedChar);
    }
  };

  const handleConfirmNameChange = () => {
    onSave(editedChar);
    setShowNameChangeDialog(false);
    setOriginalName(editedChar.name);
  };

  const handleCancelNameChange = () => {
    setShowNameChangeDialog(false);
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
        {/* Auto-Update Toggle */}
        <div style={{
          padding: '0.75rem 1rem',
          background: '#F8FAFC',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A1A2E', cursor: 'pointer' }}>
              Auto-update dependent fields when name changes
            </label>
            <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
              Automatically regenerate backstory and character arc when you change the name
            </p>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoUpdateEnabled}
              onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: autoUpdateEnabled ? '#667eea' : '#CBD5E1',
              borderRadius: '24px',
              transition: 'all 0.3s ease',
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '18px',
                width: '18px',
                left: autoUpdateEnabled ? '23px' : '3px',
                bottom: '3px',
                background: '#fff',
                borderRadius: '50%',
                transition: 'all 0.3s ease',
              }} />
            </span>
          </label>
        </div>

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <label style={{ ...label, marginBottom: 0 }}>Backstory</label>
            {isUpdatingDependentFields && (
              <span style={{
                fontSize: '0.75rem',
                color: '#667eea',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  border: '2px solid #E2E8F0',
                  borderTopColor: '#667eea',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Updating...
              </span>
            )}
          </div>
          <textarea
            value={editedChar.backstory}
            onChange={(e) => handleChange('backstory', e.target.value)}
            rows={6}
            style={{
              ...input,
              resize: 'vertical',
              opacity: isUpdatingDependentFields ? 0.6 : 1,
              transition: 'opacity 0.3s ease',
            }}
            disabled={isUpdatingDependentFields}
          />
        </div>

        {/* Character Arc */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <label style={{ ...label, marginBottom: 0 }}>Character Arc</label>
            {isUpdatingDependentFields && (
              <span style={{
                fontSize: '0.75rem',
                color: '#667eea',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  border: '2px solid #E2E8F0',
                  borderTopColor: '#667eea',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Updating...
              </span>
            )}
          </div>
          <textarea
            value={editedChar.characterArc}
            onChange={(e) => handleChange('characterArc', e.target.value)}
            rows={4}
            style={{
              ...input,
              resize: 'vertical',
              opacity: isUpdatingDependentFields ? 0.6 : 1,
              transition: 'opacity 0.3s ease',
            }}
            disabled={isUpdatingDependentFields}
          />
        </div>
      </div>

      {/* Name Change Confirmation Dialog */}
      {showNameChangeDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#1A1A2E' }}>
              Confirm Name Change
            </h3>
            <p style={{ marginBottom: '1rem', color: '#64748B' }}>
              You are changing <strong>"{originalName}"</strong> to <strong>"{editedChar.name}"</strong>.
            </p>

            {isLoadingReferences ? (
              <p style={{ color: '#64748B', fontStyle: 'italic' }}>Loading impact preview...</p>
            ) : nameReferences ? (
              <div style={{
                background: '#F8FAFC',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
              }}>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#1A1A2E' }}>
                  This will update references in:
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#64748B' }}>
                  {nameReferences.sceneCards > 0 && (
                    <li>{nameReferences.sceneCards} scene card{nameReferences.sceneCards !== 1 ? 's' : ''}</li>
                  )}
                  {nameReferences.relationships > 0 && (
                    <li>{nameReferences.relationships} relationship{nameReferences.relationships !== 1 ? 's' : ''}</li>
                  )}
                  {nameReferences.timeline > 0 && (
                    <li>{nameReferences.timeline} timeline event{nameReferences.timeline !== 1 ? 's' : ''}</li>
                  )}
                  {nameReferences.chapters > 0 && (
                    <li>{nameReferences.chapters} chapter{nameReferences.chapters !== 1 ? 's' : ''} (content)</li>
                  )}
                  {nameReferences.sceneCards === 0 && nameReferences.relationships === 0 &&
                   nameReferences.timeline === 0 && nameReferences.chapters === 0 && (
                    <li style={{ fontStyle: 'italic' }}>No references found to update</li>
                  )}
                </ul>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelNameChange}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#fff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#64748B',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNameChange}
                disabled={isSaving}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? 'Saving...' : 'Confirm & Update All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
