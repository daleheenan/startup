/**
 * Plot Layer Constants
 *
 * Constants for auto-generated plot layers and plot population logic
 */

import type { ExtendedPlotLayer, PlotLayer, Project } from '../../shared/types';

/**
 * Minimal character interface for plot layer creation
 * Only requires name and role since that's all we use
 */
interface PlotCharacter {
  name: string;
  role?: string;
}

/**
 * Key plot layer IDs that cannot be deleted
 */
export const KEY_PLOT_LAYER_IDS = [
  'main-plot',
  'character-arcs',
  'subplots',
  'specialized-threads',
] as const;

/**
 * Auto-generated plot layers created when user first visits Plot page
 * These are the 4 key layers that cannot be deleted but can be edited
 */
export const AUTO_GENERATED_PLOT_LAYERS: ExtendedPlotLayer[] = [
  {
    id: 'main-plot',
    name: 'Main Plot',
    description: 'Primary story arc - the central narrative driving your story',
    type: 'main',
    color: '#667eea', // Purple
    points: [],
    status: 'active',
    deletable: false,
    editable: true,
  },
  {
    id: 'character-arcs',
    name: 'Character Arcs',
    description: 'Character development and transformation throughout the story',
    type: 'character-arc',
    color: '#F59E0B', // Amber
    points: [],
    status: 'active',
    deletable: false,
    editable: true,
  },
  {
    id: 'subplots',
    name: 'Subplots',
    description: 'Secondary story threads that enrich the main narrative',
    type: 'subplot',
    color: '#10B981', // Emerald
    points: [],
    status: 'active',
    deletable: false,
    editable: true,
  },
  {
    id: 'specialized-threads',
    name: 'Specialized Threads',
    description: 'Mystery, romance, or other genre-specific story arcs',
    type: 'mystery', // Will be updated based on genre
    color: '#8B5CF6', // Violet
    points: [],
    status: 'active',
    deletable: false,
    editable: true,
  },
];

/**
 * Genre to specialized thread type mapping
 */
export const GENRE_TO_THREAD_TYPE: Record<string, PlotLayer['type']> = {
  'mystery': 'mystery',
  'thriller': 'mystery',
  'crime': 'mystery',
  'romance': 'romance',
  'romantic': 'romance',
  'fantasy': 'subplot',
  'sci-fi': 'subplot',
  'horror': 'mystery',
  'historical': 'subplot',
  'contemporary': 'subplot',
  'literary': 'character-arc',
};

/**
 * Get the specialized thread type based on genre
 */
export function getSpecializedThreadType(genre: string): PlotLayer['type'] {
  const normalizedGenre = genre.toLowerCase();

  for (const [key, value] of Object.entries(GENRE_TO_THREAD_TYPE)) {
    if (normalizedGenre.includes(key)) {
      return value;
    }
  }

  return 'subplot'; // Default fallback
}

/**
 * Get specialized thread name based on type
 */
export function getSpecializedThreadName(type: PlotLayer['type']): string {
  switch (type) {
    case 'mystery':
      return 'Mystery Thread';
    case 'romance':
      return 'Romance Thread';
    case 'character-arc':
      return 'Character Development Thread';
    default:
      return 'Specialized Thread';
  }
}

/**
 * Check if a plot layer is a key layer that cannot be deleted
 */
export function isKeyPlotLayer(layerId: string): boolean {
  return KEY_PLOT_LAYER_IDS.includes(layerId as any);
}

/**
 * Convert regular PlotLayer to ExtendedPlotLayer
 */
export function toExtendedPlotLayer(layer: PlotLayer): ExtendedPlotLayer {
  const isKey = isKeyPlotLayer(layer.id);
  return {
    ...layer,
    deletable: !isKey,
    editable: true,
  };
}

/**
 * Create initial plot layers from story concept and characters
 */
export function createInitialPlotLayers(
  project: Project,
  characters?: PlotCharacter[]
): ExtendedPlotLayer[] {
  const layers = AUTO_GENERATED_PLOT_LAYERS.map(layer => ({ ...layer }));

  // Update specialized thread type based on genre
  if (project.genre) {
    const specializedType = getSpecializedThreadType(project.genre);
    const specializedLayer = layers.find(l => l.id === 'specialized-threads');
    if (specializedLayer) {
      specializedLayer.type = specializedType;
      specializedLayer.name = getSpecializedThreadName(specializedType);
    }
  }

  // Set descriptions based on story concept if available
  const concept = (project as any).story_concept;
  if (concept) {
    const mainPlot = layers.find(l => l.id === 'main-plot');
    if (mainPlot && concept.logline) {
      mainPlot.description = concept.logline;
    }
  }

  // Add character arc descriptions if characters exist
  if (characters && characters.length > 0) {
    const charLayer = layers.find(l => l.id === 'character-arcs');
    if (charLayer) {
      const protagonists = characters.filter(c =>
        c.role?.toLowerCase().includes('protagonist') ||
        c.role?.toLowerCase().includes('main')
      );
      if (protagonists.length > 0) {
        const names = protagonists.map(c => c.name).join(', ');
        charLayer.description = `Development arcs for ${names} and supporting characters`;
      }
    }
  }

  return layers;
}

/**
 * Default act structure for plot
 */
export const DEFAULT_ACT_STRUCTURE = {
  act_one_end: 8,      // Chapter where Act 1 ends (typically ~25%)
  act_two_midpoint: 15, // Midpoint chapter
  act_two_end: 22,     // Chapter where Act 2 ends (typically ~75%)
  act_three_climax: 28, // Climax chapter
};

/**
 * Get default pacing notes based on genre
 */
export function getDefaultPacingNotes(genre: string): string {
  const normalizedGenre = genre.toLowerCase();

  if (normalizedGenre.includes('thriller') || normalizedGenre.includes('action')) {
    return 'Fast-paced with short chapters and frequent cliffhangers. Build tension steadily towards climax.';
  }
  if (normalizedGenre.includes('romance')) {
    return 'Balanced pacing with emotional beats. Allow time for relationship development between plot points.';
  }
  if (normalizedGenre.includes('mystery')) {
    return 'Strategic reveal of clues. Build suspense with red herrings and tension before the resolution.';
  }
  if (normalizedGenre.includes('literary') || normalizedGenre.includes('historical')) {
    return 'Measured pacing with room for character introspection and atmospheric description.';
  }
  if (normalizedGenre.includes('fantasy') || normalizedGenre.includes('sci-fi')) {
    return 'Balance world-building with plot advancement. Use action sequences to maintain momentum.';
  }

  return 'Balance plot advancement with character development. Vary pacing to maintain reader engagement.';
}
