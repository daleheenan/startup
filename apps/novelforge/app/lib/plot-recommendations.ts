/**
 * Plot Recommendations Service
 *
 * Provides recommendations for plot layer counts based on book length,
 * and utilities for analyzing plot distribution in a story.
 */

export interface Recommendation {
  min: number;
  max: number;
  ideal: number;
}

export interface PlotRecommendations {
  mainPlot: Recommendation;
  subplots: Recommendation;
  characterArcs: Recommendation;
  mysteryThreads?: Recommendation;
  romanceArcs?: Recommendation;
  emotionalArcs?: Recommendation;
  thematicArcs?: Recommendation;
}

export type BookLengthCategory = 'novella' | 'novel' | 'epic';

export type PlotLayerType =
  | 'mainPlot'
  | 'subplots'
  | 'characterArcs'
  | 'mysteryThreads'
  | 'romanceArcs'
  | 'emotionalArcs'
  | 'thematicArcs';

export interface PlotLayer {
  type: string;
  [key: string]: any;
}

export type PlotStatus = 'under' | 'ideal' | 'over';

export interface PlotTypeStatus {
  current: number;
  recommended: Recommendation;
  status: PlotStatus;
}

export type PlotAnalysis = {
  [K in PlotLayerType]?: PlotTypeStatus;
};

/**
 * Recommended plot counts by book length category
 */
export const PLOT_RECOMMENDATIONS: Record<BookLengthCategory, PlotRecommendations> = {
  novella: { // 20,000-40,000 words
    mainPlot: { min: 1, max: 1, ideal: 1 },
    subplots: { min: 1, max: 2, ideal: 1 },
    characterArcs: { min: 1, max: 2, ideal: 1 },
    mysteryThreads: { min: 0, max: 1, ideal: 0 },
    romanceArcs: { min: 0, max: 1, ideal: 0 },
  },
  novel: { // 70,000-90,000 words
    mainPlot: { min: 1, max: 1, ideal: 1 },
    subplots: { min: 2, max: 4, ideal: 3 },
    characterArcs: { min: 2, max: 4, ideal: 3 },
    mysteryThreads: { min: 0, max: 2, ideal: 1 },
    romanceArcs: { min: 0, max: 2, ideal: 1 },
    emotionalArcs: { min: 1, max: 2, ideal: 1 },
  },
  epic: { // 100,000+ words
    mainPlot: { min: 1, max: 1, ideal: 1 },
    subplots: { min: 3, max: 6, ideal: 4 },
    characterArcs: { min: 3, max: 6, ideal: 4 },
    mysteryThreads: { min: 1, max: 3, ideal: 2 },
    romanceArcs: { min: 0, max: 3, ideal: 1 },
    emotionalArcs: { min: 2, max: 4, ideal: 2 },
    thematicArcs: { min: 1, max: 2, ideal: 1 },
  },
};

/**
 * Determines the book length category based on word count
 *
 * @param wordCount - Total word count of the book
 * @returns Book length category
 */
export function getBookLengthCategory(wordCount: number): BookLengthCategory {
  if (wordCount < 50000) {
    return 'novella';
  } else if (wordCount < 100000) {
    return 'novel';
  } else {
    return 'epic';
  }
}

/**
 * Gets plot recommendations for a given word count
 *
 * @param wordCount - Total word count of the book
 * @returns Plot recommendations object
 */
export function getPlotRecommendations(wordCount: number): PlotRecommendations {
  const category = getBookLengthCategory(wordCount);
  return PLOT_RECOMMENDATIONS[category];
}

/**
 * Determines if a plot count is under, ideal, or over the recommendation
 *
 * @param current - Current count
 * @param recommendation - Recommendation object with min, max, ideal
 * @returns Plot status
 */
function determinePlotStatus(current: number, recommendation: Recommendation): PlotStatus {
  if (current < recommendation.min) {
    return 'under';
  } else if (current > recommendation.max) {
    return 'over';
  } else if (current === recommendation.ideal) {
    return 'ideal';
  } else {
    // Within range but not ideal - still considered "ideal" status
    return 'ideal';
  }
}

/**
 * Calculates plot status for all plot types based on current layers and word count
 *
 * @param plotLayers - Array of plot layer objects with type property
 * @param wordCount - Total word count of the book
 * @returns Object mapping plot types to their status
 */
export function calculatePlotStatus(
  plotLayers: PlotLayer[],
  wordCount: number
): PlotAnalysis {
  const recommendations = getPlotRecommendations(wordCount);
  const result: PlotAnalysis = {};

  // Count current plot layers by type
  const plotCounts: Partial<Record<PlotLayerType, number>> = {};

  for (const layer of plotLayers) {
    const type = layer.type as PlotLayerType;
    plotCounts[type] = (plotCounts[type] || 0) + 1;
  }

  // Analyze each plot type in recommendations
  for (const [plotType, recommendation] of Object.entries(recommendations)) {
    const type = plotType as PlotLayerType;
    const current = plotCounts[type] || 0;
    const status = determinePlotStatus(current, recommendation);

    result[type] = {
      current,
      recommended: recommendation,
      status,
    };
  }

  return result;
}

/**
 * Converts camelCase plot type to Title Case display text
 *
 * @param type - Plot type in camelCase (e.g., "mysteryThreads")
 * @returns Formatted text (e.g., "Mystery Threads")
 */
export function formatPlotType(type: string): string {
  // Insert space before capital letters
  const withSpaces = type.replace(/([A-Z])/g, ' $1');

  // Capitalize first letter and trim
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).trim();
}
