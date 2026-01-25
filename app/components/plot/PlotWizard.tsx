'use client';

import { useState } from 'react';
import { colors } from '../../lib/constants';

// Types
interface PlotPoint {
  id: string;
  chapter_number: number;
  description: string;
  phase: 'setup' | 'rising' | 'midpoint' | 'crisis' | 'climax' | 'falling' | 'resolution';
  impact_level: 1 | 2 | 3 | 4 | 5;
}

interface PlotLayer {
  id: string;
  name: string;
  description: string;
  type: 'main' | 'subplot' | 'mystery' | 'romance' | 'character-arc';
  color: string;
  points: PlotPoint[];
  status: 'active' | 'resolved' | 'abandoned';
  resolution_chapter?: number;
  isFromConcept?: boolean; // Flag for auto-extracted main plot
}

interface Character {
  id: string;
  name: string;
  role: string;
  characterArc?: string;
}

interface ProjectData {
  id: string;
  title: string;
  story_dna?: {
    genre?: string;
    themes?: string[];
  };
}

interface PlotWizardProps {
  projectId: string;
  project: ProjectData;
  characters: Character[];
  plotLayers: PlotLayer[];
  onUpdate: (plots: PlotLayer[]) => void;
  bookWordCount: number;
}

// Wizard step type
type WizardStep = 'main-plot' | 'character-arcs' | 'subplots' | 'specialized' | 'pacing';

// Helper: Get recommended subplot count based on book length
function getSubplotRecommendations(wordCount: number) {
  if (wordCount < 40000) {
    return { min: 1, max: 2, ideal: 1, label: 'Novella' };
  } else if (wordCount < 80000) {
    return { min: 2, max: 3, ideal: 2, label: 'Novel' };
  } else {
    return { min: 3, max: 5, ideal: 3, label: 'Epic Novel' };
  }
}

// Plot colors for new layers
const LAYER_COLORS = [
  '#667eea', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6',
  '#3B82F6', '#14B8A6', '#F97316', '#D946EF', '#6366F1',
];

export default function PlotWizard({
  projectId,
  project,
  characters,
  plotLayers,
  onUpdate,
  bookWordCount = 80000,
}: PlotWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('main-plot');
  const [localPlots, setLocalPlots] = useState<PlotLayer[]>(plotLayers);
  const [pacingNotes, setPacingNotes] = useState<string>('');
  const [isGeneratingPacing, setIsGeneratingPacing] = useState(false);

  // Get main plot (from concept or first main type)
  const mainPlot = localPlots.find(p => p.type === 'main' || p.isFromConcept);

  // Get character arc plots
  const characterArcs = localPlots.filter(p => p.type === 'character-arc');

  // Get subplots
  const subplots = localPlots.filter(p => p.type === 'subplot');

  // Get specialized threads
  const mysteryThreads = localPlots.filter(p => p.type === 'mystery');
  const romanceArcs = localPlots.filter(p => p.type === 'romance');

  const steps: Array<{ id: WizardStep; label: string; optional?: boolean }> = [
    { id: 'main-plot', label: 'Main Plot' },
    { id: 'character-arcs', label: 'Character Arcs' },
    { id: 'subplots', label: 'Subplots' },
    { id: 'specialized', label: 'Specialized Threads', optional: true },
    { id: 'pacing', label: 'Pacing & Review' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = () => {
    onUpdate(localPlots);
  };

  const handleAddPlot = (type: PlotLayer['type'], name: string, description: string) => {
    const newPlot: PlotLayer = {
      id: `plot-${Date.now()}`,
      name,
      description,
      type,
      color: LAYER_COLORS[localPlots.length % LAYER_COLORS.length],
      points: [],
      status: 'active',
    };
    setLocalPlots([...localPlots, newPlot]);
  };

  const handleUpdatePlot = (plotId: string, updates: Partial<PlotLayer>) => {
    setLocalPlots(localPlots.map(p => p.id === plotId ? { ...p, ...updates } : p));
  };

  const handleDeletePlot = (plotId: string) => {
    setLocalPlots(localPlots.filter(p => p.id !== plotId));
  };

  const handleGeneratePacing = async () => {
    setIsGeneratingPacing(true);
    try {
      // Mock pacing generation - in real implementation, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1500));

      const subplotRec = getSubplotRecommendations(bookWordCount);
      const warnings = [];

      if (subplots.length < subplotRec.min) {
        warnings.push(`Consider adding ${subplotRec.min - subplots.length} more subplot(s) for a ${subplotRec.label}.`);
      }
      if (subplots.length > subplotRec.max) {
        warnings.push(`You have ${subplots.length - subplotRec.max} more subplot(s) than recommended. This may complicate pacing.`);
      }

      const notes = warnings.length > 0
        ? warnings.join(' ')
        : `Plot structure looks balanced for a ${subplotRec.label}. Good pacing potential across acts.`;

      setPacingNotes(notes);
    } finally {
      setIsGeneratingPacing(false);
    }
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '2rem',
  };

  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '2rem',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '0.938rem',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#FFFFFF',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    color: '#64748B',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#1A1A2E',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.875rem',
  };

  return (
    <div style={containerStyle}>
      {/* Step Indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '3rem',
      }}>
        {steps.map((step, idx) => (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              onClick={() => setCurrentStep(step.id)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: idx <= currentStepIndex
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#E2E8F0',
                color: idx <= currentStepIndex ? '#FFFFFF' : '#94A3B8',
                fontWeight: 600,
                fontSize: '0.938rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {idx + 1}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: '0.813rem',
                fontWeight: 500,
                color: idx === currentStepIndex ? colors.text : '#94A3B8',
              }}>
                {step.label}
              </div>
              {step.optional && (
                <div style={{ fontSize: '0.688rem', color: '#94A3B8' }}>Optional</div>
              )}
            </div>
            {idx < steps.length - 1 && (
              <div style={{
                width: '40px',
                height: '2px',
                background: idx < currentStepIndex ? '#667eea' : '#E2E8F0',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div style={cardStyle}>
        {/* Step 1: Main Plot */}
        {currentStep === 'main-plot' && (
          <MainPlotStep
            mainPlot={mainPlot}
            project={project}
            onUpdate={(updates) => mainPlot && handleUpdatePlot(mainPlot.id, updates)}
            onCreate={(name, description) => handleAddPlot('main', name, description)}
          />
        )}

        {/* Step 2: Character Arcs */}
        {currentStep === 'character-arcs' && (
          <CharacterArcsStep
            characters={characters}
            characterArcs={characterArcs}
            onAdd={(charId, name, description) => handleAddPlot('character-arc', name, description)}
            onUpdate={handleUpdatePlot}
            onDelete={handleDeletePlot}
          />
        )}

        {/* Step 3: Subplots */}
        {currentStep === 'subplots' && (
          <SubplotsStep
            subplots={subplots}
            recommendations={getSubplotRecommendations(bookWordCount)}
            onAdd={(name, description) => handleAddPlot('subplot', name, description)}
            onUpdate={handleUpdatePlot}
            onDelete={handleDeletePlot}
          />
        )}

        {/* Step 4: Specialized Threads */}
        {currentStep === 'specialized' && (
          <SpecializedThreadsStep
            mysteryThreads={mysteryThreads}
            romanceArcs={romanceArcs}
            onAddMystery={(name, description) => handleAddPlot('mystery', name, description)}
            onAddRomance={(name, description) => handleAddPlot('romance', name, description)}
            onUpdate={handleUpdatePlot}
            onDelete={handleDeletePlot}
          />
        )}

        {/* Step 5: Pacing & Review */}
        {currentStep === 'pacing' && (
          <PacingReviewStep
            allPlots={localPlots}
            bookWordCount={bookWordCount}
            pacingNotes={pacingNotes}
            isGenerating={isGeneratingPacing}
            onGenerate={handleGeneratePacing}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <button
          onClick={handlePrevious}
          disabled={currentStepIndex === 0}
          style={{
            ...secondaryButtonStyle,
            opacity: currentStepIndex === 0 ? 0.5 : 1,
            cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Previous
        </button>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {steps[currentStepIndex]?.optional && (
            <button onClick={handleSkip} style={secondaryButtonStyle}>
              Skip
            </button>
          )}

          {currentStepIndex < steps.length - 1 ? (
            <button onClick={handleNext} style={primaryButtonStyle}>
              Next
            </button>
          ) : (
            <button onClick={handleComplete} style={primaryButtonStyle}>
              Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-components for each step

function MainPlotStep({
  mainPlot,
  project,
  onUpdate,
  onCreate,
}: {
  mainPlot: PlotLayer | undefined;
  project: ProjectData;
  onUpdate: (updates: Partial<PlotLayer>) => void;
  onCreate: (name: string, description: string) => void;
}) {
  const [name, setName] = useState(mainPlot?.name || '');
  const [description, setDescription] = useState(mainPlot?.description || '');
  const [isEditing, setIsEditing] = useState(!mainPlot);

  const handleSave = () => {
    if (mainPlot) {
      onUpdate({ name, description });
    } else {
      onCreate(name, description);
    }
    setIsEditing(false);
  };

  const handleRegenerate = () => {
    // Mock regeneration - in real implementation, call API
    setName(`${project.title} - Main Journey`);
    setDescription('A transformed approach to the central conflict...');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#1A1A2E',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.875rem',
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: colors.text, marginBottom: '1rem' }}>
        Main Plot (Golden Thread)
      </h2>

      {mainPlot?.isFromConcept && (
        <div style={{
          padding: '1rem',
          background: '#F3F4F6',
          borderLeft: '4px solid #667eea',
          borderRadius: '8px',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{
              padding: '0.25rem 0.75rem',
              background: '#667eea',
              color: '#FFFFFF',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}>
              From Story Concept
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
            This main plot was automatically extracted from your story concept. You can enhance it or regenerate for a different approach.
          </p>
        </div>
      )}

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={labelStyle}>Plot Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., The Hero's Journey, The Quest for Truth"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the main plot arc that drives your entire story..."
              rows={6}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '150px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleSave}
              disabled={!name || !description}
              style={{
                padding: '0.75rem 1.5rem',
                background: name && description ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#94A3B8',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.938rem',
                fontWeight: 500,
                cursor: name && description ? 'pointer' : 'not-allowed',
              }}
            >
              Save Main Plot
            </button>
            {!mainPlot && (
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#64748B',
                  fontSize: '0.938rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          padding: '1.5rem',
          background: '#F8FAFC',
          border: '3px solid #667eea',
          borderRadius: '12px',
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: colors.text, marginBottom: '0.75rem' }}>
            {mainPlot?.name}
          </h3>
          <p style={{ fontSize: '0.938rem', color: '#64748B', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            {mainPlot?.description}
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleRegenerate}
              style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.813rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Regenerate
            </button>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '0.5rem 1rem',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                color: '#64748B',
                fontSize: '0.813rem',
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CharacterArcsStep({
  characters,
  characterArcs,
  onAdd,
  onUpdate,
  onDelete,
}: {
  characters: Character[];
  characterArcs: PlotLayer[];
  onAdd: (charId: string, name: string, description: string) => void;
  onUpdate: (plotId: string, updates: Partial<PlotLayer>) => void;
  onDelete: (plotId: string) => void;
}) {
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [arcDescription, setArcDescription] = useState('');

  const mainCharacters = characters.filter(c =>
    c.role.toLowerCase().includes('protagonist') ||
    c.role.toLowerCase().includes('main') ||
    c.role.toLowerCase().includes('antagonist')
  );

  const handleCreateArc = () => {
    const character = characters.find(c => c.id === selectedCharId);
    if (!character) return;

    const arcName = `${character.name}'s Arc`;
    onAdd(selectedCharId!, arcName, arcDescription);
    setSelectedCharId(null);
    setArcDescription('');
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: colors.text, marginBottom: '0.5rem' }}>
        Character Arcs
      </h2>
      <p style={{ fontSize: '0.938rem', color: '#64748B', marginBottom: '2rem' }}>
        Define transformation journeys for your main characters. Each arc shows how a character changes throughout the story.
      </p>

      {/* Existing character arcs */}
      {characterArcs.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, marginBottom: '1rem' }}>
            Current Character Arcs ({characterArcs.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {characterArcs.map(arc => (
              <div
                key={arc.id}
                style={{
                  padding: '1rem',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.938rem', fontWeight: 600, color: colors.text, marginBottom: '0.5rem' }}>
                      {arc.name}
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
                      {arc.description}
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(arc.id)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '6px',
                      color: '#DC2626',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new character arc */}
      <div style={{
        padding: '1.5rem',
        background: '#F8FAFC',
        borderRadius: '8px',
        border: '1px dashed #94A3B8',
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, marginBottom: '1rem' }}>
          Add Character Arc
        </h3>

        {mainCharacters.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#F59E0B' }}>
            No main characters found. Add characters first to create character arcs.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#374151',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}>
                Select Character
              </label>
              <select
                value={selectedCharId || ''}
                onChange={(e) => setSelectedCharId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#1A1A2E',
                }}
              >
                <option value="">Choose a character...</option>
                {mainCharacters.map(char => {
                  const hasArc = characterArcs.some(arc => arc.name.includes(char.name));
                  return (
                    <option key={char.id} value={char.id} disabled={hasArc}>
                      {char.name} ({char.role}) {hasArc ? '- Arc exists' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedCharId && (
              <>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#374151',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}>
                    Arc Description
                  </label>
                  <textarea
                    value={arcDescription}
                    onChange={(e) => setArcDescription(e.target.value)}
                    placeholder="Describe how this character transforms throughout the story..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      color: '#1A1A2E',
                      resize: 'vertical',
                      minHeight: '100px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  onClick={handleCreateArc}
                  disabled={!arcDescription}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: arcDescription ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#94A3B8',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.938rem',
                    fontWeight: 500,
                    cursor: arcDescription ? 'pointer' : 'not-allowed',
                    alignSelf: 'flex-start',
                  }}
                >
                  Create Character Arc
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SubplotsStep({
  subplots,
  recommendations,
  onAdd,
  onUpdate,
  onDelete,
}: {
  subplots: PlotLayer[];
  recommendations: { min: number; max: number; ideal: number; label: string };
  onAdd: (name: string, description: string) => void;
  onUpdate: (plotId: string, updates: Partial<PlotLayer>) => void;
  onDelete: (plotId: string) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = () => {
    onAdd(name, description);
    setName('');
    setDescription('');
    setShowAddForm(false);
  };

  const getStatusColor = () => {
    if (subplots.length < recommendations.min) return '#F59E0B';
    if (subplots.length > recommendations.max) return '#DC2626';
    return '#10B981';
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: colors.text, marginBottom: '0.5rem' }}>
        Subplots
      </h2>
      <p style={{ fontSize: '0.938rem', color: '#64748B', marginBottom: '1.5rem' }}>
        Add thematic subplots that enrich your story and connect to the main plot.
      </p>

      {/* Recommendations */}
      <div style={{
        padding: '1rem',
        background: '#F8FAFC',
        borderRadius: '8px',
        marginBottom: '2rem',
        border: `2px solid ${getStatusColor()}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.text }}>
              {recommendations.label} Recommendations
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
              Ideal: {recommendations.ideal} subplots (Min: {recommendations.min}, Max: {recommendations.max})
            </div>
          </div>
          <div style={{
            padding: '0.5rem 1rem',
            background: getStatusColor(),
            color: '#FFFFFF',
            borderRadius: '20px',
            fontSize: '1rem',
            fontWeight: 600,
          }}>
            {subplots.length}/{recommendations.ideal}
          </div>
        </div>
      </div>

      {/* Current subplots */}
      {subplots.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, marginBottom: '1rem' }}>
            Current Subplots ({subplots.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {subplots.map(subplot => (
              <div
                key={subplot.id}
                style={{
                  padding: '1rem',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.938rem', fontWeight: 600, color: colors.text, marginBottom: '0.5rem' }}>
                      {subplot.name}
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
                      {subplot.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => onDelete(subplot.id)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '6px',
                        color: '#DC2626',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add subplot */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            width: '100%',
            padding: '1rem',
            background: '#FFFFFF',
            border: '1px dashed #94A3B8',
            borderRadius: '8px',
            color: '#667eea',
            fontSize: '0.938rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          + Add Subplot
        </button>
      ) : (
        <div style={{
          padding: '1.5rem',
          background: '#F8FAFC',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, marginBottom: '1rem' }}>
            New Subplot
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#374151',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}>
                Subplot Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Secondary Romance, Family Conflict"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#1A1A2E',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#374151',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this subplot and how it connects to the main story..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#1A1A2E',
                  resize: 'vertical',
                  minHeight: '100px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleAdd}
                disabled={!name || !description}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: name && description ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#94A3B8',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.938rem',
                  fontWeight: 500,
                  cursor: name && description ? 'pointer' : 'not-allowed',
                }}
              >
                Add Subplot
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setName('');
                  setDescription('');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#64748B',
                  fontSize: '0.938rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SpecializedThreadsStep({
  mysteryThreads,
  romanceArcs,
  onAddMystery,
  onAddRomance,
  onUpdate,
  onDelete,
}: {
  mysteryThreads: PlotLayer[];
  romanceArcs: PlotLayer[];
  onAddMystery: (name: string, description: string) => void;
  onAddRomance: (name: string, description: string) => void;
  onUpdate: (plotId: string, updates: Partial<PlotLayer>) => void;
  onDelete: (plotId: string) => void;
}) {
  const [expandedSection, setExpandedSection] = useState<'mystery' | 'romance' | null>(null);

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: colors.text, marginBottom: '0.5rem' }}>
        Specialized Threads (Optional)
      </h2>
      <p style={{ fontSize: '0.938rem', color: '#64748B', marginBottom: '2rem' }}>
        Add specialized plot threads like mysteries, romance arcs, or thematic elements.
      </p>

      {/* Mystery Threads Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => setExpandedSection(expandedSection === 'mystery' ? null : 'mystery')}
          style={{
            width: '100%',
            padding: '1rem',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: colors.text }}>
              Mystery Threads
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
              {mysteryThreads.length} {mysteryThreads.length === 1 ? 'thread' : 'threads'}
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', color: '#94A3B8' }}>
            {expandedSection === 'mystery' ? '−' : '+'}
          </div>
        </button>

        {expandedSection === 'mystery' && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
          }}>
            <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1rem' }}>
              Mystery threads involve questions, clues, and revelations that keep readers engaged.
            </p>
            {mysteryThreads.map(thread => (
              <div key={thread.id} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{thread.name}</div>
                <div style={{ fontSize: '0.813rem', color: '#64748B' }}>{thread.description}</div>
              </div>
            ))}
            <button
              onClick={() => onAddMystery('New Mystery', 'A compelling mystery thread...')}
              style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.813rem',
                fontWeight: 500,
                cursor: 'pointer',
                marginTop: '1rem',
              }}
            >
              + Add Mystery Thread
            </button>
          </div>
        )}
      </div>

      {/* Romance Arcs Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => setExpandedSection(expandedSection === 'romance' ? null : 'romance')}
          style={{
            width: '100%',
            padding: '1rem',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: colors.text }}>
              Romance Arcs
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
              {romanceArcs.length} {romanceArcs.length === 1 ? 'arc' : 'arcs'}
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', color: '#94A3B8' }}>
            {expandedSection === 'romance' ? '−' : '+'}
          </div>
        </button>

        {expandedSection === 'romance' && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
          }}>
            <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1rem' }}>
              Romance arcs track relationship development between characters.
            </p>
            {romanceArcs.map(arc => (
              <div key={arc.id} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{arc.name}</div>
                <div style={{ fontSize: '0.813rem', color: '#64748B' }}>{arc.description}</div>
              </div>
            ))}
            <button
              onClick={() => onAddRomance('New Romance', 'A developing romance arc...')}
              style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.813rem',
                fontWeight: 500,
                cursor: 'pointer',
                marginTop: '1rem',
              }}
            >
              + Add Romance Arc
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PacingReviewStep({
  allPlots,
  bookWordCount,
  pacingNotes,
  isGenerating,
  onGenerate,
}: {
  allPlots: PlotLayer[];
  bookWordCount: number;
  pacingNotes: string;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const mainPlots = allPlots.filter(p => p.type === 'main');
  const subplots = allPlots.filter(p => p.type === 'subplot');
  const characterArcs = allPlots.filter(p => p.type === 'character-arc');
  const specializedThreads = allPlots.filter(p => p.type === 'mystery' || p.type === 'romance');

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: colors.text, marginBottom: '0.5rem' }}>
        Pacing & Review
      </h2>
      <p style={{ fontSize: '0.938rem', color: '#64748B', marginBottom: '2rem' }}>
        Review your plot structure and get AI-powered pacing recommendations.
      </p>

      {/* Plot Summary */}
      <div style={{
        padding: '1.5rem',
        background: '#F8FAFC',
        borderRadius: '8px',
        marginBottom: '2rem',
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, marginBottom: '1rem' }}>
          Plot Summary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: '#FFFFFF', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>Main Plots</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#667eea' }}>{mainPlots.length}</div>
          </div>
          <div style={{ padding: '0.75rem', background: '#FFFFFF', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>Subplots</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#10B981' }}>{subplots.length}</div>
          </div>
          <div style={{ padding: '0.75rem', background: '#FFFFFF', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>Character Arcs</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#8B5CF6' }}>{characterArcs.length}</div>
          </div>
          <div style={{ padding: '0.75rem', background: '#FFFFFF', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>Specialized Threads</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#EC4899' }}>{specializedThreads.length}</div>
          </div>
        </div>
      </div>

      {/* All Plots by Type */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, marginBottom: '1rem' }}>
          All Plots
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {allPlots.map(plot => (
            <div
              key={plot.id}
              style={{
                padding: '0.75rem 1rem',
                background: '#F8FAFC',
                borderLeft: `4px solid ${plot.color}`,
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: colors.text }}>
                  {plot.name}
                </span>
                <span style={{
                  marginLeft: '0.5rem',
                  padding: '0.125rem 0.5rem',
                  background: plot.color + '20',
                  color: plot.color,
                  borderRadius: '4px',
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}>
                  {plot.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pacing Recommendations */}
      <div style={{
        padding: '1.5rem',
        background: '#FEF3C7',
        border: '1px solid #FCD34D',
        borderRadius: '8px',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#92400E', margin: 0 }}>
            Pacing Recommendations
          </h3>
          <button
            onClick={onGenerate}
            disabled={isGenerating || allPlots.length === 0}
            style={{
              padding: '0.5rem 1rem',
              background: isGenerating || allPlots.length === 0
                ? '#94A3B8'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.813rem',
              fontWeight: 500,
              cursor: isGenerating || allPlots.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate Pacing Notes'}
          </button>
        </div>

        {pacingNotes ? (
          <p style={{ fontSize: '0.875rem', color: '#78350F', margin: 0, lineHeight: 1.6 }}>
            {pacingNotes}
          </p>
        ) : (
          <p style={{ fontSize: '0.875rem', color: '#78350F', margin: 0, fontStyle: 'italic' }}>
            Click "Generate Pacing Notes" to get AI-powered recommendations for your plot structure.
          </p>
        )}
      </div>

      {/* Warnings */}
      {allPlots.length === 0 && (
        <div style={{
          padding: '1rem',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          color: '#DC2626',
          fontSize: '0.875rem',
        }}>
          No plots defined. Add at least a main plot to complete your story structure.
        </div>
      )}
    </div>
  );
}
