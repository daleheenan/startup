'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import PlotLayersVisualization from '../../../components/PlotLayersVisualization';
import { getToken } from '../../../lib/auth';
import { colors } from '../../../lib/constants';
import { createInitialPlotLayers, isKeyPlotLayer, toExtendedPlotLayer } from '../../../lib/plot-constants';
import type { ExtendedPlotLayer } from '../../../../shared/types';

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
  deletable?: boolean;
  editable?: boolean;
}

interface StoryStructure {
  plot_layers: PlotLayer[];
  act_structure: {
    act_one_end: number;
    act_two_midpoint: number;
    act_two_end: number;
    act_three_climax: number;
  };
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

interface Character {
  id: string;
  name: string;
  role: string;
  characterArc?: string;
}

interface BookVersion {
  id: string;
  book_id: string;
  version_number: number;
  version_name: string | null;
  plot_snapshot: string | null;
  is_active: number;
  word_count: number;
  chapter_count: number;
  created_at: string;
}

const LAYER_COLORS = [
  '#667eea', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6',
  '#3B82F6', '#14B8A6', '#F97316', '#D946EF', '#6366F1',
];

// Colour names for accessibility (Issue #20)
const COLOR_NAMES: Record<string, string> = {
  '#667eea': 'Purple',
  '#10B981': 'Green',
  '#F59E0B': 'Amber',
  '#EC4899': 'Pink',
  '#8B5CF6': 'Violet',
  '#3B82F6': 'Blue',
  '#14B8A6': 'Teal',
  '#F97316': 'Orange',
  '#D946EF': 'Fuchsia',
  '#6366F1': 'Indigo',
};

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
  const router = useRouter();
  const projectId = params.id as string;

  const [structure, setStructure] = useState<StoryStructure>({
    plot_layers: [],
    act_structure: {
      act_one_end: 5,
      act_two_midpoint: 12,
      act_two_end: 20,
      act_three_climax: 23,
    },
  });
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [totalChapters, setTotalChapters] = useState(25);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingLayerId, setGeneratingLayerId] = useState<string | null>(null);
  const [generatingNewLayer, setGeneratingNewLayer] = useState(false);
  const [generatingField, setGeneratingField] = useState<'name' | 'description' | null>(null);
  const [extractingFromConcept, setExtractingFromConcept] = useState(false);
  const [hasAttemptedExtraction, setHasAttemptedExtraction] = useState(false);
  const [hasPopulatedInitialLayers, setHasPopulatedInitialLayers] = useState(false);
  // Regeneration state
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [characters, setCharacters] = useState<Character[]>([]);

  // Version-related state
  const [versions, setVersions] = useState<BookVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isViewingSnapshot, setIsViewingSnapshot] = useState(false);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

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
      let projectPlotStructure: any = null; // Store for comparison with version snapshot
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData);
        projectPlotStructure = projectData.plot_structure; // Capture for later comparison
        if (projectData.plot_structure) {
          // Ensure plot_layers is always an array to prevent undefined errors
          // Mark layers with deletable/editable flags based on whether they're key layers
          const plotLayers = (projectData.plot_structure.plot_layers || []).map((layer: PlotLayer) => {
            const isKey = isKeyPlotLayer(layer.id);
            return {
              ...layer,
              deletable: layer.deletable !== undefined ? layer.deletable : !isKey,
              editable: layer.editable !== undefined ? layer.editable : true,
            };
          });

          const safeStructure = {
            ...projectData.plot_structure,
            plot_layers: plotLayers,
            act_structure: projectData.plot_structure.act_structure || {
              act_one_end: 5,
              act_two_midpoint: 12,
              act_two_end: 20,
              act_three_climax: 23,
            },
          };
          setStructure(safeStructure);
        }
      }

      // Fetch books
      const booksRes = await fetch(`${API_BASE_URL}/api/books/project/${projectId}`, { headers });
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        setBooks(booksData.books || []);

        // Fetch chapters and versions for first book
        if (booksData.books?.length > 0) {
          const firstBookId = booksData.books[0].id;

          const chaptersRes = await fetch(`${API_BASE_URL}/api/chapters/book/${firstBookId}`, { headers });
          if (chaptersRes.ok) {
            const chaptersData = await chaptersRes.json();
            setChapters(chaptersData.chapters || []);
            setTotalChapters(chaptersData.chapters?.length || 25);
          }

          // Fetch versions for the book
          const versionsRes = await fetch(`${API_BASE_URL}/api/books/${firstBookId}/versions`, { headers });
          if (versionsRes.ok) {
            const versionsData = await versionsRes.json();
            const bookVersions = versionsData.versions || [];
            setVersions(bookVersions);

            // Find active version
            const active = bookVersions.find((v: BookVersion) => v.is_active === 1);
            if (active) {
              setActiveVersionId(active.id);
              setSelectedVersionId(active.id);

              // Helper function to count total plot points in a structure
              const countTotalPoints = (layers: PlotLayer[]): number => {
                return (layers || []).reduce((sum, layer) => sum + (layer.points?.length || 0), 0);
              };

              // Helper function to count plot layers
              const countLayers = (layers: PlotLayer[]): number => {
                return (layers || []).length;
              };

              // If active version has a plot_snapshot, compare it with project-level data
              // Project-level data is the source of truth; snapshots are for historical reference
              // Use project data unless snapshot is clearly more complete
              if (active.plot_snapshot) {
                try {
                  const snapshotData = typeof active.plot_snapshot === 'string'
                    ? JSON.parse(active.plot_snapshot)
                    : active.plot_snapshot;

                  if (snapshotData && snapshotData.plot_layers) {
                    const snapshotPointCount = countTotalPoints(snapshotData.plot_layers);
                    const snapshotLayerCount = countLayers(snapshotData.plot_layers);
                    const projectPointCount = countTotalPoints(projectPlotStructure?.plot_layers || []);
                    const projectLayerCount = countLayers(projectPlotStructure?.plot_layers || []);

                    console.log(`Plot data comparison - Project: ${projectLayerCount} layers, ${projectPointCount} points | Snapshot: ${snapshotLayerCount} layers, ${snapshotPointCount} points`);

                    // Use project-level data if:
                    // 1. It has more points (snapshot may be stale)
                    // 2. It has more layers (snapshot may be stale)
                    // 3. Counts are equal (prefer project as source of truth)
                    const useProjectData =
                      projectPointCount > snapshotPointCount ||
                      projectLayerCount > snapshotLayerCount ||
                      (projectPointCount === snapshotPointCount && projectLayerCount >= snapshotLayerCount);

                    if (useProjectData) {
                      console.log(`Using project-level plot data (more complete or equal, project is source of truth)`);
                      // Keep the project-level structure that was already set above
                    } else {
                      // Only use snapshot if it's clearly more complete
                      console.log(`Using version snapshot plot data (snapshot has more data)`);
                      const plotLayers = (snapshotData.plot_layers || []).map((layer: PlotLayer) => {
                        const isKey = isKeyPlotLayer(layer.id);
                        return {
                          ...layer,
                          points: layer.points || [], // Ensure points array exists
                          deletable: layer.deletable !== undefined ? layer.deletable : !isKey,
                          editable: layer.editable !== undefined ? layer.editable : true,
                        };
                      });

                      const safeStructure = {
                        ...snapshotData,
                        plot_layers: plotLayers,
                        act_structure: snapshotData.act_structure || {
                          act_one_end: 5,
                          act_two_midpoint: 12,
                          act_two_end: 20,
                          act_three_climax: 23,
                        },
                      };
                      setStructure(safeStructure);
                    }
                    setIsViewingSnapshot(false); // Active version is current, not a snapshot
                  }
                } catch (parseError) {
                  console.warn('Failed to parse plot_snapshot, using project-level plot_structure:', parseError);
                  // Project-level data is already set, no action needed
                }
              } else {
                console.log('No version snapshot, using project-level plot data');
              }
            }
          }
        }
      }

      // Fetch characters
      const charactersRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}/characters`, { headers });
      if (charactersRes.ok) {
        const charactersData = await charactersRes.json();
        setCharacters(charactersData.characters || []);
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

  // Auto-extract plots from story concept on first visit when no plots exist
  const extractPlotsFromConcept = useCallback(async () => {
    if (hasAttemptedExtraction || extractingFromConcept) return;

    setHasAttemptedExtraction(true);
    setExtractingFromConcept(true);
    setError(null);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/extract-plots-from-concept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        // Don't show error if it's just "no concept" - user hasn't created one yet
        if (data.error?.code !== 'NO_CONCEPT') {
          console.warn('Plot extraction failed:', data.error?.message);
        }
        return;
      }

      const data = await res.json();
      if (data.plots && data.plots.length > 0) {
        // Mark as populated since extraction added plots - prevents auto-populate from overwriting
        setHasPopulatedInitialLayers(true);
        // Refresh the data to get the newly extracted plots
        await fetchData();
      }
    } catch (err: any) {
      console.error('Error extracting plots from concept:', err);
      // Don't set error for extraction - it's automatic and optional
    } finally {
      setExtractingFromConcept(false);
    }
  }, [projectId, hasAttemptedExtraction, extractingFromConcept, fetchData]);

  // Trigger auto-extraction when page loads with no plots and we have a project
  useEffect(() => {
    if (
      !loading &&
      project &&
      !hasAttemptedExtraction &&
      (structure.plot_layers?.length || 0) === 0
    ) {
      extractPlotsFromConcept();
    }
  }, [loading, project, hasAttemptedExtraction, structure.plot_layers?.length, extractPlotsFromConcept]);

  // Auto-populate initial plot layers when page loads with no plot layers
  // Only runs if extraction didn't already populate layers
  // Uses hasPopulatedInitialLayers flag to prevent infinite loop
  useEffect(() => {
    // Wait for extraction to complete before deciding to auto-populate
    const shouldPopulate = !loading &&
      project &&
      characters &&
      characters.length > 0 &&
      (structure.plot_layers?.length || 0) === 0 &&
      !extractingFromConcept &&
      hasAttemptedExtraction && // Only after extraction has been attempted
      !hasPopulatedInitialLayers;

    if (shouldPopulate) {
      // Set flag BEFORE async operation to prevent re-triggering
      setHasPopulatedInitialLayers(true);

      // Create initial plot layers based on project data and characters
      const initialLayers = createInitialPlotLayers(project, characters);

      // Only save if we actually have layers to add
      if (initialLayers.length > 0) {
        const newStructure = { ...structure, plot_layers: initialLayers };
        saveStructure(newStructure);
      }
    }
  }, [loading, project, characters, structure.plot_layers?.length, extractingFromConcept, hasAttemptedExtraction, hasPopulatedInitialLayers]);

  const saveStructure = async (newStructure: StoryStructure) => {
    // Don't save when viewing a historical snapshot
    if (isViewingSnapshot) {
      setError('Cannot save changes while viewing a historical snapshot. Switch to the active version to make changes.');
      return;
    }

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
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `Failed to save plot structure (HTTP ${res.status})`;
        throw new Error(errorMessage);
      }

      setStructure(newStructure);
      setError(null); // Clear any previous errors on success
    } catch (err: any) {
      console.error('Plot structure save error:', err);
      setError(`Save failed: ${err.message}. Please try again or refresh the page.`);
    } finally {
      setSaving(false);
    }
  };


  // Regenerate plot structure from story elements and concept
  const handleRegeneratePlotStructure = async () => {
    setRegenerating(true);
    setError(null);
    setShowRegenerateModal(false);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/regenerate-plot-structure`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to regenerate plot structure');
      }

      const data = await res.json();

      if (data.success && data.plotStructure) {
        // Update local state with the new structure
        const plotLayers = (data.plotStructure.plot_layers || []).map((layer: PlotLayer) => {
          const isKey = isKeyPlotLayer(layer.id);
          return {
            ...layer,
            deletable: layer.deletable !== undefined ? layer.deletable : !isKey,
            editable: layer.editable !== undefined ? layer.editable : true,
          };
        });

        setStructure({
          plot_layers: plotLayers,
          act_structure: data.plotStructure.act_structure || {
            act_one_end: 8,
            act_two_midpoint: 15,
            act_two_end: 22,
            act_three_climax: 28,
          },
        });

        // Show success message
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
          position: fixed;
          top: 2rem;
          right: 2rem;
          padding: 1rem 1.5rem;
          background: #10B981;
          color: #FFFFFF;
          border-radius: 8px;
          font-size: 0.875rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 9999;
        `;
        successMsg.textContent = `Plot structure regenerated! ${data.stats.layersGenerated} layers with ${data.stats.totalPoints} plot points created.`;
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 4000);
      }
    } catch (err: any) {
      console.error('Error regenerating plot structure:', err);
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleAddLayer = () => {
    setEditingLayer(null);
    setLayerForm({
      name: '',
      description: '',
      type: 'subplot',
      color: LAYER_COLORS[(structure.plot_layers?.length || 0) % LAYER_COLORS.length],
    });
    setShowLayerModal(true);
  };

  const handleGenerateLayerField = async (field: 'name' | 'description') => {
    setGeneratingField(field);
    setError(null);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/generate-plot-layer-field`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field,
          layerType: layerForm.type,
          existingValues: {
            name: layerForm.name,
            description: layerForm.description,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || `Failed to generate ${field}`);
      }

      const data = await res.json();
      setLayerForm(prev => ({
        ...prev,
        [field]: data.value,
      }));
    } catch (err: any) {
      console.error(`Error generating ${field}:`, err);
      setError(err.message);
    } finally {
      setGeneratingField(null);
    }
  };

  const handleEditLayer = (layerId: string) => {
    const layer = structure.plot_layers?.find(l => l.id === layerId);
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
    const isKey = isKeyPlotLayer(layerId);
    const newLayer: PlotLayer = {
      id: layerId,
      name: layerForm.name,
      description: layerForm.description,
      type: layerForm.type,
      color: layerForm.color,
      points: editingLayer?.points || [],
      status: 'active',
      deletable: editingLayer?.deletable !== undefined ? editingLayer.deletable : !isKey,
      editable: editingLayer?.editable !== undefined ? editingLayer.editable : true,
    };

    const newLayers = editingLayer
      ? (structure.plot_layers || []).map(l => l.id === editingLayer.id ? newLayer : l)
      : [...(structure.plot_layers || []), newLayer];

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
            points: [...(l.points || []), ...(data.points || [])],
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
    // Check if this is a key plot layer that cannot be deleted
    const layer = structure.plot_layers?.find(l => l.id === layerId);
    if (layer && layer.deletable === false) {
      setError('This is a key plot layer and cannot be deleted. You can edit it instead.');
      return;
    }

    if (!confirm('Are you sure you want to delete this plot layer?')) return;

    const newLayers = (structure.plot_layers || []).filter(l => l.id !== layerId);
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

    const newLayers = (structure.plot_layers || []).map(layer => {
      if (layer.id !== editingPoint.layerId) return layer;

      const newPoints = editingPoint.point
        ? (layer.points || []).map(p => p.id === editingPoint.point?.id ? newPoint : p)
        : [...(layer.points || []), newPoint];

      return { ...layer, points: newPoints };
    });

    const newStructure = { ...structure, plot_layers: newLayers };
    saveStructure(newStructure);
    setShowPointModal(false);
  };

  const handleActStructureChange = (field: keyof StoryStructure['act_structure'], value: number) => {
    // Issue #19: Validate act structure sequence
    const currentActs = structure.act_structure;
    const newActs = { ...currentActs, [field]: value };

    // Validate logical sequence
    const validationErrors: string[] = [];

    if (newActs.act_two_midpoint <= newActs.act_one_end) {
      validationErrors.push('Midpoint must be after Act I ends');
    }
    if (newActs.act_two_end <= newActs.act_two_midpoint) {
      validationErrors.push('Act II end must be after Midpoint');
    }
    if (newActs.act_three_climax <= newActs.act_two_end) {
      validationErrors.push('Climax must be after Act II ends');
    }
    if (newActs.act_three_climax > totalChapters) {
      validationErrors.push('Climax cannot exceed total chapter count');
    }

    // Show validation errors as visible feedback (Issue #19)
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. ') + '. Please adjust chapter numbers.');
    } else {
      setError(null); // Clear error if validation passes
    }

    const newStructure = {
      ...structure,
      act_structure: newActs,
    };
    saveStructure(newStructure);
  };

  const handleGenerateLayerPoints = async (layerId: string) => {
    const layer = structure.plot_layers?.find(l => l.id === layerId);
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
      const newLayers = (structure.plot_layers || []).map(l => {
        if (l.id !== layerId) return l;
        return {
          ...l,
          points: [...(l.points || []), ...(data.points || [])],
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

    const newLayers = (structure.plot_layers || []).map(layer => {
      if (layer.id !== layerId) return layer;
      return {
        ...layer,
        points: (layer.points || []).filter(p => p.id !== pointId),
      };
    });

    const newStructure = { ...structure, plot_layers: newLayers };
    saveStructure(newStructure);
  };

  // Handle version selection change
  const handleVersionChange = async (versionId: string) => {
    setSelectedVersionId(versionId);
    const selectedVersion = versions.find(v => v.id === versionId);

    if (!selectedVersion) return;

    // Check if viewing a historical (non-active) version
    const isHistorical = selectedVersion.is_active !== 1;
    setIsViewingSnapshot(isHistorical);

    if (selectedVersion.plot_snapshot) {
      try {
        const snapshotData = typeof selectedVersion.plot_snapshot === 'string'
          ? JSON.parse(selectedVersion.plot_snapshot)
          : selectedVersion.plot_snapshot;

        if (snapshotData && snapshotData.plot_layers) {
          const plotLayers = (snapshotData.plot_layers || []).map((layer: PlotLayer) => {
            const isKey = isKeyPlotLayer(layer.id);
            return {
              ...layer,
              points: layer.points || [], // Ensure points array exists
              deletable: layer.deletable !== undefined ? layer.deletable : !isKey,
              editable: layer.editable !== undefined ? layer.editable : true,
            };
          });

          const safeStructure = {
            ...snapshotData,
            plot_layers: plotLayers,
            act_structure: snapshotData.act_structure || {
              act_one_end: 5,
              act_two_midpoint: 12,
              act_two_end: 20,
              act_three_climax: 23,
            },
          };
          setStructure(safeStructure);
        }
      } catch (parseError) {
        console.error('Failed to parse plot_snapshot:', parseError);
        setError('Failed to load plot snapshot for this version');
      }
    } else if (!isHistorical && project?.plot_structure) {
      // Active version without snapshot - use project-level plot_structure
      const plotLayers = (project.plot_structure.plot_layers || []).map((layer: PlotLayer) => {
        const isKey = isKeyPlotLayer(layer.id);
        return {
          ...layer,
          points: layer.points || [],
          deletable: layer.deletable !== undefined ? layer.deletable : !isKey,
          editable: layer.editable !== undefined ? layer.editable : true,
        };
      });

      setStructure({
        ...project.plot_structure,
        plot_layers: plotLayers,
        act_structure: project.plot_structure.act_structure || {
          act_one_end: 5,
          act_two_midpoint: 12,
          act_two_end: 20,
          act_three_climax: 23,
        },
      });
    }
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
      <DashboardLayout
        header={{ title: project?.title || 'Loading...', subtitle: 'Plot Structure & Timeline' }}
        projectId={projectId}
      >
        <div style={{ padding: '2rem', textAlign: 'center', color: colors.textSecondary }}>
          {extractingFromConcept ? 'Extracting plots from story concept...' : 'Loading plot structure...'}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      header={{ title: project?.title || 'Loading...', subtitle: 'Plot Structure & Timeline' }}
      projectId={projectId}
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

        {extractingFromConcept && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            border: '2px solid #C7D2FE',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '3px solid #E0E7FF',
                borderTopColor: '#667eea',
                animation: 'spin 1s linear infinite',
              }} />
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#4338CA', margin: 0 }}>
                  Analyzing Story Concept
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#6366F1', margin: '0.25rem 0 0 0' }}>
                  Extracting plot threads and story structure from your concept...
                </p>
              </div>
            </div>
            <div style={{
              background: '#E0E7FF',
              borderRadius: '4px',
              height: '6px',
              overflow: 'hidden',
            }}>
              <div style={{
                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                height: '100%',
                width: '100%',
                animation: 'progressPulse 2s ease-in-out infinite',
              }} />
            </div>
            <style jsx>{`
              @keyframes spin { to { transform: rotate(360deg); } }
              @keyframes progressPulse {
                0%, 100% { transform: translateX(-100%); }
                50% { transform: translateX(100%); }
              }
            `}</style>
          </div>
        )}


        {/* Version Selector - only show if versions exist */}
        {versions.length > 0 && (
          <div style={{
            ...cardStyle,
            marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}>
                Viewing Plot for Version:
              </label>
              <select
                value={selectedVersionId || ''}
                onChange={(e) => handleVersionChange(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  maxWidth: '350px',
                  padding: '0.625rem 0.75rem',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                {versions.map(version => (
                  <option key={version.id} value={version.id}>
                    {version.version_name || `Version ${version.version_number}`}
                    {version.is_active === 1 ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
              {selectedVersionId && selectedVersionId !== activeVersionId && (
                <span style={{
                  padding: '0.375rem 0.75rem',
                  background: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  borderRadius: '6px',
                  color: '#B45309',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}>
                  Historical Snapshot
                </span>
              )}
            </div>
          </div>
        )}

        {/* Historical Snapshot Warning */}
        {isViewingSnapshot && (
          <div style={{
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>📜</span>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: '#B45309',
                  margin: '0 0 0.25rem 0',
                }}>
                  Viewing Historical Plot Snapshot
                </h3>
                <p style={{ fontSize: '0.8125rem', color: '#92400E', margin: 0 }}>
                  This is the plot structure as it was when this version was created.
                  Changes will NOT be saved. To edit, switch to the active version.
                </p>
              </div>
              <button
                onClick={() => {
                  if (activeVersionId) {
                    handleVersionChange(activeVersionId);
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#FFFFFF',
                  border: '1px solid #F59E0B',
                  borderRadius: '6px',
                  color: '#B45309',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Switch to Active Version
              </button>
            </div>
          </div>
        )}

        {/* Advanced Mode - Original UI */}
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
              <label htmlFor="act-one-end" style={labelStyle}>Act I Ends (Chapter)</label>
              <input
                id="act-one-end"
                type="number"
                min={1}
                max={totalChapters}
                value={structure.act_structure.act_one_end}
                onChange={(e) => handleActStructureChange('act_one_end', parseInt(e.target.value) || 1)}
                style={inputStyle}
                aria-describedby="act-one-end-help"
              />
              <span id="act-one-end-help" style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                Inciting incident, hero commits
              </span>
            </div>
            <div>
              <label htmlFor="act-two-midpoint" style={labelStyle}>Midpoint (Chapter)</label>
              <input
                id="act-two-midpoint"
                type="number"
                min={1}
                max={totalChapters}
                value={structure.act_structure.act_two_midpoint}
                onChange={(e) => handleActStructureChange('act_two_midpoint', parseInt(e.target.value) || 1)}
                style={inputStyle}
                aria-describedby="act-two-midpoint-help"
              />
              <span id="act-two-midpoint-help" style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                Major revelation or reversal
              </span>
            </div>
            <div>
              <label htmlFor="act-two-end" style={labelStyle}>Act II Ends (Chapter)</label>
              <input
                id="act-two-end"
                type="number"
                min={1}
                max={totalChapters}
                value={structure.act_structure.act_two_end}
                onChange={(e) => handleActStructureChange('act_two_end', parseInt(e.target.value) || 1)}
                style={inputStyle}
                aria-describedby="act-two-end-help"
              />
              <span id="act-two-end-help" style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                All is lost moment, darkest hour
              </span>
            </div>
            <div>
              <label htmlFor="act-three-climax" style={labelStyle}>Climax (Chapter)</label>
              <input
                id="act-three-climax"
                type="number"
                min={1}
                max={totalChapters}
                value={structure.act_structure.act_three_climax}
                onChange={(e) => handleActStructureChange('act_three_climax', parseInt(e.target.value) || 1)}
                style={inputStyle}
                aria-describedby="act-three-climax-help"
              />
              <span id="act-three-climax-help" style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
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
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowRegenerateModal(true)}
                disabled={regenerating || isViewingSnapshot}
                title="Delete all plots and regenerate from story concept using best practices"
                style={{
                  padding: '0.5rem 1rem',
                  background: regenerating ? '#94A3B8' : '#FFFFFF',
                  border: '1px solid #DC2626',
                  borderRadius: '8px',
                  color: regenerating ? '#FFFFFF' : '#DC2626',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: regenerating || isViewingSnapshot ? 'not-allowed' : 'pointer',
                  opacity: isViewingSnapshot ? 0.5 : 1,
                }}
              >
                {regenerating ? 'Regenerating...' : '🔄 Regenerate All'}
              </button>
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
          </div>

          {(structure.plot_layers?.length || 0) === 0 ? (
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
              {(structure.plot_layers || []).map(layer => (
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
                        {(layer.points?.length || 0)} plot point{(layer.points?.length || 0) !== 1 ? 's' : ''}
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
                      {layer.deletable !== false && (
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
                      )}
                      {layer.deletable === false && (
                        <span style={{
                          padding: '0.375rem 0.75rem',
                          background: '#F3F4F6',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          color: '#6B7280',
                          fontSize: '0.625rem',
                          fontWeight: 500,
                        }}>
                          Required Layer
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Plot Points List */}
                  {(layer.points?.length || 0) > 0 && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(layer.points || [])
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

        {/* Continue to Quality button */}
        <div style={{
          ...cardStyle,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          border: '1px solid rgba(102, 126, 234, 0.3)',
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: colors.text, marginBottom: '0.25rem' }}>
              Ready to proceed?
            </h3>
            <p style={{ fontSize: '0.813rem', color: colors.textSecondary, margin: 0 }}>
              Continue to validate your plot structure for coherence.
            </p>
          </div>
          <button
            onClick={() => router.push(`/projects/${projectId}/quality`)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '0.938rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            Continue to Quality →
          </button>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Name</label>
                    <button
                      type="button"
                      onClick={() => handleGenerateLayerField('name')}
                      disabled={generatingField !== null}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: generatingField === 'name' ? '#94A3B8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#FFFFFF',
                        fontSize: '0.625rem',
                        fontWeight: 500,
                        cursor: generatingField !== null ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {generatingField === 'name' ? 'Generating...' : '✨ Generate'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={layerForm.name}
                    onChange={(e) => setLayerForm({ ...layerForm, name: e.target.value })}
                    placeholder="e.g., Romance Arc, Political Intrigue"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Description</label>
                    <button
                      type="button"
                      onClick={() => handleGenerateLayerField('description')}
                      disabled={generatingField !== null}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: generatingField === 'description' ? '#94A3B8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#FFFFFF',
                        fontSize: '0.625rem',
                        fontWeight: 500,
                        cursor: generatingField !== null ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {generatingField === 'description' ? 'Generating...' : '✨ Generate'}
                    </button>
                  </div>
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
                  <label style={labelStyle}>Colour</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {LAYER_COLORS.map(color => {
                      const colorName = COLOR_NAMES[color] || 'Unknown';
                      const isSelected = layerForm.color === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setLayerForm({ ...layerForm, color })}
                          aria-label={`Select ${colorName} for plot layer${isSelected ? ' (selected)' : ''}`}
                          aria-pressed={isSelected}
                          title={colorName}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: color,
                            border: isSelected ? '3px solid #1A1A2E' : '2px solid transparent',
                            cursor: 'pointer',
                          }}
                        />
                      );
                    })}
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

        {/* Regenerate Confirmation Modal */}
        {showRegenerateModal && (
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
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#FEF2F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#DC2626', margin: '0 0 0.5rem 0' }}>
                    Regenerate Plot Structure?
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
                    This will <strong>permanently delete</strong> all existing plot layers and plot points.
                  </p>
                </div>
              </div>

              <div style={{
                background: '#F8FAFC',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
              }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.text, margin: '0 0 0.75rem 0' }}>
                  New plots will be generated based on:
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.813rem', color: colors.textSecondary }}>
                  <li>Your story concept (synopsis, logline, hook)</li>
                  <li>Story DNA (genre, tone, themes)</li>
                  <li>Characters from your Story Bible</li>
                  <li>Lessons from VEB &amp; Outline reviews</li>
                  <li>Best practices for bestselling novels</li>
                </ul>
              </div>

              <div style={{
                background: '#FEF3C7',
                border: '1px solid #F59E0B',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                fontSize: '0.813rem',
                color: '#92400E',
              }}>
                <strong>Current structure:</strong> {structure.plot_layers?.length || 0} plot layers with{' '}
                {structure.plot_layers?.reduce((sum, l) => sum + (l.points?.length || 0), 0) || 0} plot points will be deleted.
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowRegenerateModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    color: '#64748B',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegeneratePlotStructure}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#DC2626',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Delete &amp; Regenerate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Regenerating Overlay */}
        {regenerating && (
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
                Regenerating Plot Structure
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
                AI is analysing your story elements and creating a comprehensive plot structure with best practices for {project?.genre || 'your genre'}...
              </p>
            </div>
            <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
