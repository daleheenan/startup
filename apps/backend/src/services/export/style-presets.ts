/**
 * Style Presets for Export Formats
 * Defines chapter heading styles, fonts, spacing options
 */

export interface FontPreset {
  family: string;
  size: {
    title: number;
    heading: number;
    body: number;
    footer: number;
  };
  lineHeight: number;
}

export interface ChapterHeadingStyle {
  alignment: 'left' | 'center' | 'right';
  format: string; // e.g., "Chapter {number}", "CHAPTER {NUMBER}", "{number}"
  includeTitle: boolean;
  spacing: {
    before: number; // in inches
    after: number;
  };
}

export interface StylePreset {
  name: string;
  description: string;
  font: FontPreset;
  chapterHeading: ChapterHeadingStyle;
  sceneBreak: string;
  paragraphIndent: number; // in inches
  paragraphSpacing: number; // in inches
}

// Serif fonts are traditional for print books
export const STYLE_PRESETS: Record<string, StylePreset> = {
  traditional: {
    name: 'Traditional',
    description: 'Classic book formatting with Times New Roman',
    font: {
      family: 'Times New Roman',
      size: {
        title: 24,
        heading: 18,
        body: 12,
        footer: 10,
      },
      lineHeight: 1.5,
    },
    chapterHeading: {
      alignment: 'center',
      format: 'Chapter {number}',
      includeTitle: true,
      spacing: {
        before: 1.0,
        after: 0.5,
      },
    },
    sceneBreak: '* * *',
    paragraphIndent: 0.5,
    paragraphSpacing: 0.1,
  },

  modern: {
    name: 'Modern',
    description: 'Contemporary formatting with Garamond',
    font: {
      family: 'Garamond',
      size: {
        title: 26,
        heading: 20,
        body: 11,
        footer: 9,
      },
      lineHeight: 1.6,
    },
    chapterHeading: {
      alignment: 'left',
      format: 'CHAPTER {NUMBER}',
      includeTitle: true,
      spacing: {
        before: 0.75,
        after: 0.75,
      },
    },
    sceneBreak: '# # #',
    paragraphIndent: 0.3,
    paragraphSpacing: 0.15,
  },

  minimal: {
    name: 'Minimal',
    description: 'Clean, minimalist formatting',
    font: {
      family: 'Georgia',
      size: {
        title: 22,
        heading: 16,
        body: 11,
        footer: 9,
      },
      lineHeight: 1.5,
    },
    chapterHeading: {
      alignment: 'left',
      format: '{number}',
      includeTitle: false,
      spacing: {
        before: 0.5,
        after: 0.5,
      },
    },
    sceneBreak: '***',
    paragraphIndent: 0.4,
    paragraphSpacing: 0.12,
  },

  literary: {
    name: 'Literary',
    description: 'Elegant formatting for literary fiction',
    font: {
      family: 'Baskerville',
      size: {
        title: 24,
        heading: 18,
        body: 11.5,
        footer: 9,
      },
      lineHeight: 1.55,
    },
    chapterHeading: {
      alignment: 'center',
      format: 'CHAPTER {NUMBER}',
      includeTitle: true,
      spacing: {
        before: 1.25,
        after: 0.6,
      },
    },
    sceneBreak: '• • •',
    paragraphIndent: 0.5,
    paragraphSpacing: 0.1,
  },
};

/**
 * Format chapter number according to style
 */
export function formatChapterNumber(
  chapterNum: number,
  format: string
): string {
  const formatted = format
    .replace('{number}', chapterNum.toString())
    .replace('{NUMBER}', chapterNum.toString());

  return formatted;
}

/**
 * Get style preset by name, defaults to traditional
 */
export function getStylePreset(name?: string): StylePreset {
  if (!name || !STYLE_PRESETS[name]) {
    return STYLE_PRESETS.traditional;
  }
  return STYLE_PRESETS[name];
}

/**
 * Convert inches to points (1 inch = 72 points)
 */
export function inchesToPoints(inches: number): number {
  return inches * 72;
}

/**
 * Convert inches to twips (1 inch = 1440 twips)
 */
export function inchesToTwips(inches: number): number {
  return inches * 1440;
}
