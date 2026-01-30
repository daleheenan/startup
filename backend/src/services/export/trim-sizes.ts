/**
 * Trim Sizes for Print-Ready PDFs
 * Standard book sizes for KDP and other print services
 */

export interface TrimSize {
  name: string;
  width: number; // in inches
  height: number; // in inches
  description: string;
  margins: {
    inside: number; // gutter margin (in inches)
    outside: number; // in inches
    top: number; // in inches
    bottom: number; // in inches
  };
  bleed: number; // in inches
  recommendedFor: string[];
}

export const TRIM_SIZES: Record<string, TrimSize> = {
  '5x8': {
    name: '5" × 8"',
    width: 5,
    height: 8,
    description: 'Compact fiction, novellas',
    margins: {
      inside: 0.625, // 5/8"
      outside: 0.5,
      top: 0.625,
      bottom: 0.625,
    },
    bleed: 0.125,
    recommendedFor: ['Novellas', 'Short fiction', 'Poetry'],
  },

  '5.5x8.5': {
    name: '5.5" × 8.5"',
    width: 5.5,
    height: 8.5,
    description: 'Standard fiction',
    margins: {
      inside: 0.75,
      outside: 0.5,
      top: 0.75,
      bottom: 0.75,
    },
    bleed: 0.125,
    recommendedFor: ['Fiction', 'Memoirs', 'Biographies'],
  },

  '6x9': {
    name: '6" × 9"',
    width: 6,
    height: 9,
    description: 'Most common trade paperback',
    margins: {
      inside: 0.75,
      outside: 0.5,
      top: 0.75,
      bottom: 0.75,
    },
    bleed: 0.125,
    recommendedFor: ['Novels', 'Non-fiction', 'Textbooks'],
  },

  '8.5x11': {
    name: '8.5" × 11"',
    width: 8.5,
    height: 11,
    description: 'US Letter size for manuscripts',
    margins: {
      inside: 1.0,
      outside: 1.0,
      top: 1.0,
      bottom: 1.0,
    },
    bleed: 0,
    recommendedFor: ['Manuscripts', 'Workbooks', 'Textbooks'],
  },

  '5.25x8': {
    name: '5.25" × 8"',
    width: 5.25,
    height: 8,
    description: 'Mass market paperback',
    margins: {
      inside: 0.5,
      outside: 0.375,
      top: 0.5,
      bottom: 0.5,
    },
    bleed: 0.125,
    recommendedFor: ['Mass market fiction', 'Genre fiction'],
  },
};

/**
 * Get trim size by key, defaults to 6x9
 */
export function getTrimSize(key?: string): TrimSize {
  if (!key || !TRIM_SIZES[key]) {
    return TRIM_SIZES['6x9'];
  }
  return TRIM_SIZES[key];
}

/**
 * Calculate page dimensions in points including bleed
 */
export function getPageDimensions(trimSize: TrimSize): {
  width: number;
  height: number;
  withBleed: {
    width: number;
    height: number;
  };
} {
  const pointsPerInch = 72;

  return {
    width: trimSize.width * pointsPerInch,
    height: trimSize.height * pointsPerInch,
    withBleed: {
      width: (trimSize.width + trimSize.bleed * 2) * pointsPerInch,
      height: (trimSize.height + trimSize.bleed * 2) * pointsPerInch,
    },
  };
}

/**
 * Calculate content area (width and height after margins)
 */
export function getContentArea(trimSize: TrimSize): {
  width: number;
  height: number;
} {
  const pointsPerInch = 72;

  return {
    width:
      (trimSize.width - trimSize.margins.inside - trimSize.margins.outside) *
      pointsPerInch,
    height:
      (trimSize.height - trimSize.margins.top - trimSize.margins.bottom) *
      pointsPerInch,
  };
}

/**
 * Get list of all available trim sizes
 */
export function getAvailableTrimSizes(): Array<{ key: string; trimSize: TrimSize }> {
  return Object.keys(TRIM_SIZES).map((key) => ({
    key,
    trimSize: TRIM_SIZES[key],
  }));
}
