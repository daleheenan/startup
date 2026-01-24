'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

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

  useEffect(() => {
    fetchWorldElements();
  }, [projectId]);

  const fetchWorldElements = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');

      const project = await response.json();
      if (project.story_bible?.world) {
        setWorldElements(project.story_bible.world);
        if (project.story_bible.world.length > 0) {
          setSelectedElement(project.story_bible.world[0]);
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
      // Get project details for context
      const projectResponse = await fetch(`http://localhost:3001/api/projects/${projectId}`);
      if (!projectResponse.ok) throw new Error('Failed to fetch project');
      const project = await projectResponse.json();

      // Get protagonist name from characters
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

      // Generate world elements
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}/world`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(
        `http://localhost:3001/api/projects/${projectId}/world/${updatedElement.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
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
    router.push(`/projects/${projectId}/outline`);
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
          <p style={{ marginTop: '1rem', color: '#888' }}>Loading world...</p>
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
            World Building
          </h1>
          <p style={{ color: '#888' }}>Create and edit locations, factions, and systems</p>
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

        {worldElements.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            border: '1px dashed rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌍</div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ededed' }}>
              No World Elements Yet
            </h2>
            <p style={{ fontSize: '1rem', color: '#888', marginBottom: '2rem' }}>
              Generate your story's world with locations, factions, and systems
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
              {isGenerating ? 'Generating World...' : 'Generate World'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
            {/* Element List */}
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#ededed' }}>Elements</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {worldElements.map(elem => (
                  <button
                    key={elem.id}
                    onClick={() => setSelectedElement(elem)}
                    style={{
                      padding: '1rem',
                      background: selectedElement?.id === elem.id
                        ? 'rgba(102, 126, 234, 0.2)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: selectedElement?.id === elem.id
                        ? '1px solid rgba(102, 126, 234, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#ededed',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span>{getTypeIcon(elem.type)}</span>
                      <span style={{ fontWeight: 600 }}>{elem.name}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#888' }}>
                      {getTypeLabel(elem.type)}
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
                Continue to Outline →
              </button>
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

        {/* Back Link */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a href={`/projects/${projectId}/characters`} style={{ color: '#667eea', textDecoration: 'none', fontSize: '0.875rem' }}>
            ← Back to Characters
          </a>
        </div>
      </div>
    </main>
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
        <h3 style={{ fontSize: '1.5rem', color: '#ededed' }}>Edit World Element</h3>
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
            value={editedElem.name}
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

        {/* Type Badge */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ededed', fontWeight: 600 }}>
            Type
          </label>
          <div style={{
            padding: '0.75rem',
            background: 'rgba(102, 126, 234, 0.2)',
            border: '1px solid rgba(102, 126, 234, 0.5)',
            borderRadius: '6px',
            color: '#ededed',
            textTransform: 'capitalize',
            display: 'inline-block'
          }}>
            {editedElem.type.replace('_', ' ')}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ededed', fontWeight: 600 }}>
            Description
          </label>
          <textarea
            value={editedElem.description}
            onChange={(e) => handleChange('description', e.target.value)}
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

        {/* Significance */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ededed', fontWeight: 600 }}>
            Significance to Story
          </label>
          <textarea
            value={editedElem.significance}
            onChange={(e) => handleChange('significance', e.target.value)}
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

        {/* Rules (for systems) */}
        {editedElem.rules && editedElem.rules.length > 0 && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ededed', fontWeight: 600 }}>
              Rules & Limitations
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {editedElem.rules.map((rule, i) => (
                <input
                  key={i}
                  type="text"
                  value={rule}
                  onChange={(e) => handleRuleChange(i, e.target.value)}
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#ededed',
                    fontSize: '1rem',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {editedElem.history && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ededed', fontWeight: 600 }}>
              History
            </label>
            <textarea
              value={editedElem.history}
              onChange={(e) => handleChange('history', e.target.value)}
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
        )}
      </div>
    </div>
  );
}
