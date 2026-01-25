'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import PageLayout from '../../../components/shared/PageLayout';
import PlotLayersVisualization from '../../../components/PlotLayersVisualization';
import { getToken } from '../../../lib/auth';
import { colors } from '../../../lib/constants';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
}

interface StoryStructure {
  plot_layers: PlotLayer[];
  act_structure: {
    act_one_end: number;
    act_two_midpoint: number;
    act_two_end: number;
    act_three_climax: number;
  };
  pacing_notes: string;
}

interface Book {
  id: string;
  book_number: number;
  title: string;
  chapter_count: number;
}

interface Chapter {
  id: string;
  chapter_number: number;
  title: string | null;
}

const LAYER_COLORS = [
  '#667eea', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6',
  '#3B82F6', '#14B8A6', '#F97316', '#D946EF', '#6366F1',
];

const PHASES: Array<{ value: PlotPoint['phase']; label: string }> = [
  { value: 'setup', label: 'Setup' },
  { value: 'rising', label: 'Rising Action' },
  { value: 'midpoint', label: 'Midpoint' },
  { value: 'crisis', label: 'Crisis' },
  { value: 'climax', label: 'Climax' },
  { value: 'falling', label: 'Falling Action' },
  { value: 'resolution', label: 'Resolution' },
];

const LAYER_TYPES: Array<{ value: PlotLayer['type']; label: string }> = [
  { value: 'main', label: 'Main Plot' },
  { value: 'subplot', label: 'Subplot' },
  { value: 'mystery', label: 'Mystery Thread' },
  { value: 'romance', label: 'Romance Arc' },
  { value: 'character-arc', label: 'Character Arc' },
];

export default function PlotStructurePage() {
  const params = useParams();
  const projectId = params.id as string;

  const [structure, setStructure] = useState<StoryStructure>({
    plot_layers: [],
    act_structure: {
      act_one_end: 5,
      act_two_midpoint: 12,
      act_two_end: 20,
      act_three_climax: 23,
    },
    pacing_notes: '',
  });
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [totalChapters, setTotalChapters] = useState(25);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingLayerId, setGeneratingLayerId] = useState<string | null>(null);
  const [generatingPacing, setGeneratingPacing] = useState(false);
  const [generatingNewLayer, setGeneratingNewLayer] = useState(false);

  // Modal state
  const [showLayerModal, setShowLayerModal] = useState(false);
  const [showPointModal, setShowPointModal] = useState(false);
  const [editingLayer, setEditingLayer] = useState<PlotLayer | null>(null);
  const [editingPoint, setEditingPoint] = useState<{ layerId: string; point: PlotPoint | null }>({ layerId: '', point: null });

  // Form state
  const [layerForm, setLayerForm] = useState({
    name: '',
    description: '',
    type: 'subplot' as PlotLayer['type'],
    color: LAYER_COLORS[0],
  });
  const [pointForm, setPointForm] = useState({
    chapter_number: 1,
    description: '',
    phase: 'setup' as PlotPoint['phase'],
    impact_level: 3 as 1 | 2 | 3 | 4 | 5,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch project data for plot structure
      const projectRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, { headers });
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        if (projectData.plot_structure) {
          setStructure(projectData.plot_structure);
        }
      }

      // Fetch books
      const booksRes = await fetch(`${API_BASE_URL}/api/books/project/${projectId}`, { headers });
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        setBooks(booksData.books || []);

        // Fetch chapters for first book
        if (booksData.books?.length > 0) {
          const chaptersRes = await fetch(`${API_BASE_URL}/api/chapters/book/${booksData.books[0].id}`, { headers });
          if (chaptersRes.ok) {
            const chaptersData = await chaptersRes.json();
            setChapters(chaptersData.chapters || []);
            setTotalChapters(chaptersData.chapters?.length || 25);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveStructure = async (newStructure: StoryStructure) => {
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/plot-structure`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plot_structure: newStructure }),
      });

      if (!res.ok) {
        throw new Error('Failed to save plot structure');
      }

      setStructure(newStructure);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddLayer = () => {
    setEditingLayer(null);
    setLayerForm({
      name: '',
      description: '',
      type: 'subplot',
      color: LAYER_COLORS[structure.plot_layers.length % LAYER_COLORS.length],
    });
    setShowLayerModal(true);
  };

  const handleEditLayer = (layerId: string) => {
    const layer = structure.plot_layers.find(l => l.id === layerId);
    if (layer) {
      setEditingLayer(layer);
      setLayerForm({
        name: layer.name,
        description: layer.description,
        type: layer.type,
        color: layer.color,
      });
      setShowLayerModal(true);
    }
  };

  const handleSaveLayer = (generatePoints: boolean = false) => {
    const layerId = editingLayer?.id || `layer-${Date.now()}`;
    const newLayer: PlotLayer = {
      id: layerId,
      name: layerForm.name,
      description: layerForm.description,
      type: layerForm.type,
      color: layerForm.color,
      points: editingLayer?.points || [],
      status: 'active',
    };

    const newLayers = editingLayer
      ? structure.plot_layers.map(l => l.id === editingLayer.id ? newLayer : l)
      : [...structure.plot_layers, newLayer];

    const newStructure = { ...structure, plot_layers: newLayers };
    saveStructure(newStructure);
    setShowLayerModal(false);

    // If generatePoints is true and this is a new layer, generate points for it
    if (generatePoints && !editingLayer) {
      // Use a timeout to ensure the layer is saved before generating
      setTimeout(() => {
        handleGenerateLayerPointsForNew(layerId, newLayer);
      }, 100);
    }
  };

  const handleGenerateLayerPointsForNew = async (layerId: string, layer: PlotLayer) => {
    setGeneratingNewLayer(true);
    setError(null);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/generate-plot-points`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layerId,
          layerName: layer.name,
          layerType: layer.type,
          layerDescription: layer.description,
          totalChapters,
          actStructure: structure.act_structure,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to generate plot points');
      }

      const data = await res.json();

      // Update the layer with generated points
      setStructure(prevStructure => {
        const newLayers = prevStructure.plot_layers.map(l => {
          if (l.id !== layerId) return l;
          return {
            ...l,
            points: [...l.points, ...data.points],
          };
        });
        return { ...prevStructure, plot_layers: newLayers };
      });
    } catch (err: any) {
      console.error('Error generating plot points:', err);
      setError(err.message);
    } finally {
      setGeneratingNewLayer(false);
    }
  };

  const handleDeleteLayer = (layerId: string) => {
    if (!confirm('Are you sure you want to delete this plot layer?')) return;

    const newLayers = structure.plot_layers.filter(l => l.id !== layerId);
    const newStructure = { ...structure, plot_layers: newLayers };
    saveStructure(newStructure);
  };

  const handleAddPoint = (layerId: string) => {
    setEditingPoint({ layerId, point: null });
    setPointForm({
      chapter_number: 1,
      description: '',
      phase: 'setup',
      impact_level: 3,
    });
    setShowPointModal(true);
  };

  const handleSavePoint = () => {
    const newPoint: PlotPoint = {
      id: editingPoint.point?.id || `point-${Date.now()}`,
      chapter_number: pointForm.chapter_number,
      description: pointForm.description,
      phase: pointForm.phase,
      impact_level: pointForm.impact_level,
    };

    const newLayers = structure.plot_layers.map(layer => {
      if (layer.id !== editingPoint.layerId) return layer;

      const newPoints = editingPoint.point
        ? layer.points.map(p => p.id === editingPoint.point?.id ? newPoint : p)
        : [...layer.points, newPoint];

      return { ...layer, points: newPoints };
    });

    const newStructure = { ...structure, plot_layers: newLayers };
    saveStructure(newStructure);
    setShowPointModal(false);
  };

  const handleActStructureChange = (field: keyof StoryStructure['act_structure'], value: number) => {
    const newStructure = {
      ...structure,
      act_structure: {
        ...structure.act_structure,
        [field]: value,
      },
    };
    saveStructure(newStructure);
  };

  const handlePacingNotesChange = (notes: string) => {
    const newStructure = { ...structure, pacing_notes: notes };
    saveStructure(newStructure);
  };

  const handleGenerateLayerPoints = async (layerId: string) => {
    const layer = structure.plot_layers.find(l => l.id === layerId);
    if (!layer) return;

    setGeneratingLayerId(layerId);
    setError(null);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/generate-plot-points`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layerId,
          layerName: layer.name,
          layerType: layer.type,
          layerDescription: layer.description,
          totalChapters,
          actStructure: structure.act_structure,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to generate plot points');
      }

      const data = await res.json();

      // Merge generated points with existing layer
      const newLayers = structure.plot_layers.map(l => {
        if (l.id !== layerId) return l;
        return {
          ...l,
          points: [...l.points, ...data.points],
        };
      });

      const newStructure = { ...structure, plot_layers: newLayers };
      saveStructure(newStructure);
    } catch (err: any) {
      console.error('Error generating plot points:', err);
      setError(err.message);
    } finally {
      setGeneratingLayerId(null);
    }
  };

  const handleGeneratePacingNotes = async () => {
    setGeneratingPacing(true);
    setError(null);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/generate-pacing-notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plotLayers: structure.plot_layers,
          actStructure: structure.act_structure,
          totalChapters,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to generate pacing notes');
      }

      const data = await res.json();
      const newStructure = { ...structure, pacing_notes: data.pacingNotes };
      saveStructure(newStructure);
    } catch (err: any) {
      console.error('Error generating pacing notes:', err);
      setError(err.message);
    } finally {
      setGeneratingPacing(false);
    }
  };

  const handleEditPoint = (layerId: string, point: PlotPoint) => {
    setEditingPoint({ layerId, point });
    setPointForm({
      chapter_number: point.chapter_number,
      description: point.description,
      phase: point.phase,
      impact_level: point.impact_level,
    });
    setShowPointModal(true);
  };

  const handleDeletePoint = (layerId: string, pointId: string) => {
    if (!confirm('Are you sure you want to delete this plot point?')) return;

    const newLayers = structure.plot_layers.map(layer => {
      if (layer.id !== layerId) return layer;
      return {
        ...layer,
        points: layer.points.filter(p => p.id !== pointId),
      };
    });

    const newStructure = { ...structure, plot_layers: newLayers };
    saveStructure(newStructure);
  };

  const cardStyle = {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#1A1A2E',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.875rem',
  };

  if (loading) {
    return (
      <PageLayout
        title="Plot Structure & Timeline"
        subtitle="Loading..."
        backLink={`/projects/${projectId}`}
        backText="← Back to Project"
      >
        <div style={{ padding: '2rem', textAlign: 'center', color: colors.textSecondary }}>
          Loading plot structure...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Plot Structure & Timeline"
      subtitle="Visualize and plan your story's plot layers"
      backLink={`/projects/${projectId}`}
      backText="← Back to Project"
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#DC2626',
          }}>
            {error}
          </div>
        )}

        {/* Plot Visualization */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: colors.text, marginBottom: '1rem' }}>
            Plot Layers Visualization
          </h2>
          <PlotLayersVisualization
            structure={structure}
            totalChapters={totalChapters}
            onAddLayer={handleAddLayer}
            onEditLayer={handleEditLayer}
          />
        </div>

        {/* Act Structure */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: colors.text, marginBottom: '1rem' }}>
            Act Structure (Three-Act)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Act I Ends (Chapter)</label>
              <input
                type="number"
                min={1}
                max={totalChapters}
                value={structure.act_structure.act_one_end}
                onChange={(e) => handleActStructureChange('act_one_end', parseInt(e.target.value) || 1)}
                style={inputStyle}
              />
              <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                Inciting incident, hero commits
              </span>
            </div>
            <div>
              <label style={labelStyle}>Midpoint (Chapter)</label>
              <input
                type="number"
                min={1}
                max={totalChapters}
                value={structure.act_structure.act_two_midpoint}
                onChange={(e) => handleActStructureChange('act_two_midpoint', parseInt(e.target.value) || 1)}
                style={inputStyle}
              />
              <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                Major revelation or reversal
              </span>
            </div>
            <div>
              <label style={labelStyle}>Act II Ends (Chapter)</label>
              <input
                type="number"
                min={1}
                max={totalChapters}
                value={structure.act_structure.act_two_end}
                onChange={(e) => handleActStructureChange('act_two_end', parseInt(e.target.value) || 1)}
                style={inputStyle}
              />
              <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                All is lost moment, darkest hour
              </span>
            </div>
            <div>
              <label style={labelStyle}>Climax (Chapter)</label>
              <input
                type="number"
                min={1}
                max={totalChapters}
                value={structure.act_structure.act_three_climax}
                onChange={(e) => handleActStructureChange('act_three_climax', parseInt(e.target.value) || 1)}
                style={inputStyle}
              />
              <span style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                Final confrontation
              </span>
            </div>
          </div>
        </div>

        {/* Layer Management */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: colors.text }}>
              Plot Layers
            </h2>
            <button
              onClick={handleAddLayer}
              style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + Add Layer
            </button>
          </div>

          {structure.plot_layers.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              background: '#F8FAFC',
              borderRadius: '8px',
              color: colors.textSecondary,
            }}>
              <p style={{ marginBottom: '1rem' }}>No plot layers yet. Start by adding your main plot!</p>
              <button
                onClick={() => {
                  setLayerForm({ name: 'Main Plot', description: '', type: 'main', color: LAYER_COLORS[0] });
                  setEditingLayer(null);
                  setShowLayerModal(true);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.938rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Create Main Plot Layer
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {structure.plot_layers.map(layer => (
                <div
                  key={layer.id}
                  style={{
                    padding: '1rem',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${layer.color}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, marginBottom: '0.25rem' }}>
                        {layer.name}
                      </h3>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.125rem 0.5rem',
                        background: layer.color + '20',
                        color: layer.color,
                        borderRadius: '4px',
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}>
                        {LAYER_TYPES.find(t => t.value === layer.type)?.label}
                      </span>
                      <p style={{ fontSize: '0.875rem', color: colors.textSecondary, marginTop: '0.5rem' }}>
                        {layer.description || 'No description'}
                      </p>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.813rem', color: colors.textSecondary }}>
                        {layer.points.length} plot point{layer.points.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleGenerateLayerPoints(layer.id)}
                        disabled={generatingLayerId === layer.id}
                        style={{
                          padding: '0.375rem 0.75rem',
                          background: generatingLayerId === layer.id ? '#94A3B8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: generatingLayerId === layer.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {generatingLayerId === layer.id ? 'Generating...' : '✨ Generate Points'}
                      </button>
                      <button
                        onClick={() => handleAddPoint(layer.id)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          color: '#64748B',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        + Add Point
                      </button>
                      <button
                        onClick={() => handleEditLayer(layer.id)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          color: '#64748B',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteLayer(layer.id)}
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

                  {/* Plot Points List */}
                  {layer.points.length > 0 && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {layer.points
                          .sort((a, b) => a.chapter_number - b.chapter_number)
                          .map(point => (
                          <div
                            key={point.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              padding: '0.5rem 0.75rem',
                              background: '#FFFFFF',
                              borderRadius: '6px',
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <span style={{
                                  padding: '0.125rem 0.375rem',
                                  background: layer.color + '20',
                                  color: layer.color,
                                  borderRadius: '4px',
                                  fontSize: '0.625rem',
                                  fontWeight: 600,
                                }}>
                                  Ch. {point.chapter_number}
                                </span>
                                <span style={{
                                  padding: '0.125rem 0.375rem',
                                  background: '#F1F5F9',
                                  color: '#64748B',
                                  borderRadius: '4px',
                                  fontSize: '0.625rem',
                                  textTransform: 'capitalize',
                                }}>
                                  {point.phase.replace('-', ' ')}
                                </span>
                                <span style={{
                                  padding: '0.125rem 0.375rem',
                                  background: point.impact_level >= 4 ? '#FEF2F2' : '#F1F5F9',
                                  color: point.impact_level >= 4 ? '#DC2626' : '#64748B',
                                  borderRadius: '4px',
                                  fontSize: '0.625rem',
                                }}>
                                  Impact: {point.impact_level}/5
                                </span>
                              </div>
                              <p style={{ fontSize: '0.813rem', color: colors.text, margin: 0 }}>
                                {point.description}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
                              <button
                                onClick={() => handleEditPoint(layer.id, point)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: '#FFFFFF',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '4px',
                                  color: '#64748B',
                                  fontSize: '0.625rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeletePoint(layer.id, point.id)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  borderRadius: '4px',
                                  color: '#DC2626',
                                  fontSize: '0.625rem',
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pacing Notes */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: colors.text }}>
              Pacing Notes
            </h2>
            <button
              onClick={handleGeneratePacingNotes}
              disabled={generatingPacing || structure.plot_layers.length === 0}
              style={{
                padding: '0.5rem 1rem',
                background: generatingPacing || structure.plot_layers.length === 0
                  ? '#94A3B8'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: generatingPacing || structure.plot_layers.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {generatingPacing ? 'Generating...' : '✨ Generate Pacing Notes'}
            </button>
          </div>
          {structure.plot_layers.length === 0 && (
            <p style={{ fontSize: '0.813rem', color: '#F59E0B', marginBottom: '0.5rem' }}>
              Add plot layers first to generate pacing notes.
            </p>
          )}
          <textarea
            value={structure.pacing_notes}
            onChange={(e) => handlePacingNotesChange(e.target.value)}
            placeholder="Add notes about your story's pacing, tension arcs, or structure decisions..."
            rows={6}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Saving indicator */}
        {saving && (
          <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            padding: '0.75rem 1.5rem',
            background: '#1A1A2E',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontSize: '0.875rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}>
            Saving...
          </div>
        )}

        {/* Generating New Layer Points indicator */}
        {generatingNewLayer && (
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
            zIndex: 1001,
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center',
              maxWidth: '400px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid #E2E8F0',
                borderTopColor: '#667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem',
              }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1A1A2E', marginBottom: '0.5rem' }}>
                Generating Plot Points
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
                AI is creating plot points for your new layer. This may take a moment...
              </p>
            </div>
            <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Layer Modal */}
        {showLayerModal && (
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
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: colors.text }}>
                {editingLayer ? 'Edit Plot Layer' : 'Add Plot Layer'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <input
                    type="text"
                    value={layerForm.name}
                    onChange={(e) => setLayerForm({ ...layerForm, name: e.target.value })}
                    placeholder="e.g., Romance Arc, Political Intrigue"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    value={layerForm.description}
                    onChange={(e) => setLayerForm({ ...layerForm, description: e.target.value })}
                    placeholder="Brief description of this plot thread"
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select
                    value={layerForm.type}
                    onChange={(e) => setLayerForm({ ...layerForm, type: e.target.value as PlotLayer['type'] })}
                    style={inputStyle}
                  >
                    {LAYER_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Color</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {LAYER_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setLayerForm({ ...layerForm, color })}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: color,
                          border: layerForm.color === color ? '3px solid #1A1A2E' : '2px solid transparent',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowLayerModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveLayer(false)}
                  disabled={!layerForm.name}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: layerForm.name ? '#FFFFFF' : '#F1F5F9',
                    border: layerForm.name ? '1px solid #667eea' : '1px solid #E2E8F0',
                    borderRadius: '8px',
                    color: layerForm.name ? '#667eea' : '#94A3B8',
                    fontWeight: 500,
                    cursor: layerForm.name ? 'pointer' : 'not-allowed',
                  }}
                >
                  {editingLayer ? 'Save Changes' : 'Save Only'}
                </button>
                {!editingLayer && (
                  <button
                    onClick={() => handleSaveLayer(true)}
                    disabled={!layerForm.name || !layerForm.description}
                    title={!layerForm.description ? 'Add a description for better AI-generated plot points' : ''}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: (layerForm.name && layerForm.description) ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#94A3B8',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: 500,
                      cursor: (layerForm.name && layerForm.description) ? 'pointer' : 'not-allowed',
                    }}
                  >
                    ✨ Save & Generate Points
                  </button>
                )}
              </div>
              {!editingLayer && (
                <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.75rem', textAlign: 'right' }}>
                  Tip: Add a description to help AI generate better plot points
                </p>
              )}
            </div>
          </div>
        )}

        {/* Point Modal */}
        {showPointModal && (
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
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: colors.text }}>
                Add Plot Point
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Chapter</label>
                    <input
                      type="number"
                      min={1}
                      max={totalChapters}
                      value={pointForm.chapter_number}
                      onChange={(e) => setPointForm({ ...pointForm, chapter_number: parseInt(e.target.value) || 1 })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Impact Level</label>
                    <select
                      value={pointForm.impact_level}
                      onChange={(e) => setPointForm({ ...pointForm, impact_level: parseInt(e.target.value) as 1|2|3|4|5 })}
                      style={inputStyle}
                    >
                      <option value={1}>1 - Minor</option>
                      <option value={2}>2 - Moderate</option>
                      <option value={3}>3 - Significant</option>
                      <option value={4}>4 - Major</option>
                      <option value={5}>5 - Critical Turning Point</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Phase</label>
                  <select
                    value={pointForm.phase}
                    onChange={(e) => setPointForm({ ...pointForm, phase: e.target.value as PlotPoint['phase'] })}
                    style={inputStyle}
                  >
                    {PHASES.map(phase => (
                      <option key={phase.value} value={phase.value}>{phase.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    value={pointForm.description}
                    onChange={(e) => setPointForm({ ...pointForm, description: e.target.value })}
                    placeholder="What happens at this point in the plot?"
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowPointModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePoint}
                  disabled={!pointForm.description}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: pointForm.description ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#94A3B8',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 500,
                    cursor: pointForm.description ? 'pointer' : 'not-allowed',
                  }}
                >
                  Add Point
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
