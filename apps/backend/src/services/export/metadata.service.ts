/**
 * Metadata Service for ISBN and Publishing Information
 * Handles embedding metadata in EPUB and other formats
 */

export interface PublishingMetadata {
  // Required fields
  title: string;
  author: string;
  language: string;

  // ISBN and publishing
  isbn?: string;
  publisher?: string;
  publishDate?: string; // ISO date string
  copyrightYear?: number;
  edition?: string;

  // Categorisation
  genre?: string;
  subjects?: string[]; // BISAC categories
  keywords?: string[];

  // Description
  description?: string;
  series?: string;
  seriesNumber?: number;

  // Rights
  rights?: string;
}

/**
 * Generate Dublin Core metadata for EPUB
 */
export function generateDublinCoreMetadata(metadata: PublishingMetadata): string {
  const elements: string[] = [];

  // Required elements
  elements.push(`<dc:title>${escapeXml(metadata.title)}</dc:title>`);
  elements.push(`<dc:creator>${escapeXml(metadata.author)}</dc:creator>`);
  elements.push(`<dc:language>${metadata.language || 'en-GB'}</dc:language>`);

  // Identifier (ISBN or UUID)
  if (metadata.isbn) {
    const cleanIsbn = metadata.isbn.replace(/[-\s]/g, '');
    elements.push(`<dc:identifier id="isbn">${escapeXml(cleanIsbn)}</dc:identifier>`);
  } else {
    const uuid = generateUUID();
    elements.push(`<dc:identifier id="uuid">${uuid}</dc:identifier>`);
  }

  // Publisher
  if (metadata.publisher) {
    elements.push(`<dc:publisher>${escapeXml(metadata.publisher)}</dc:publisher>`);
  }

  // Publication date
  if (metadata.publishDate) {
    elements.push(`<dc:date>${metadata.publishDate}</dc:date>`);
  } else {
    elements.push(`<dc:date>${new Date().toISOString().split('T')[0]}</dc:date>`);
  }

  // Rights
  const copyrightYear = metadata.copyrightYear || new Date().getFullYear();
  const rights =
    metadata.rights ||
    `Copyright © ${copyrightYear} ${metadata.author}. All rights reserved.`;
  elements.push(`<dc:rights>${escapeXml(rights)}</dc:rights>`);

  // Description
  if (metadata.description) {
    elements.push(`<dc:description>${escapeXml(metadata.description)}</dc:description>`);
  }

  // Subjects (BISAC categories)
  if (metadata.subjects && metadata.subjects.length > 0) {
    metadata.subjects.forEach((subject) => {
      elements.push(`<dc:subject>${escapeXml(subject)}</dc:subject>`);
    });
  }

  return elements.join('\n    ');
}

/**
 * Generate EPUB3 metadata (additional to Dublin Core)
 */
export function generateEpub3Metadata(metadata: PublishingMetadata): string {
  const elements: string[] = [];

  // Series information
  if (metadata.series) {
    elements.push(
      `<meta property="belongs-to-collection" id="series">${escapeXml(metadata.series)}</meta>`
    );
    elements.push(`<meta refines="#series" property="collection-type">series</meta>`);
    if (metadata.seriesNumber) {
      elements.push(
        `<meta refines="#series" property="group-position">${metadata.seriesNumber}</meta>`
      );
    }
  }

  // Genre/category
  if (metadata.genre) {
    elements.push(`<meta property="dcterms:subject">${escapeXml(metadata.genre)}</meta>`);
  }

  // Keywords
  if (metadata.keywords && metadata.keywords.length > 0) {
    metadata.keywords.forEach((keyword) => {
      elements.push(`<meta property="schema:keywords">${escapeXml(keyword)}</meta>`);
    });
  }

  // Modified date
  elements.push(`<meta property="dcterms:modified">${new Date().toISOString()}</meta>`);

  return elements.length > 0 ? elements.join('\n    ') : '';
}

/**
 * Generate BISAC categories from genre
 */
export function generateBISACCategories(genre: string): string[] {
  const categories: string[] = [];

  const genreLower = genre.toLowerCase();

  if (genreLower.includes('fantasy')) {
    categories.push('FICTION / Fantasy / General');
    if (genreLower.includes('epic')) {
      categories.push('FICTION / Fantasy / Epic');
    }
    if (genreLower.includes('urban')) {
      categories.push('FICTION / Fantasy / Urban');
    }
  } else if (genreLower.includes('science fiction') || genreLower.includes('sci-fi')) {
    categories.push('FICTION / Science Fiction / General');
    if (genreLower.includes('space')) {
      categories.push('FICTION / Science Fiction / Space Opera');
    }
  } else if (genreLower.includes('romance')) {
    categories.push('FICTION / Romance / General');
    if (genreLower.includes('contemporary')) {
      categories.push('FICTION / Romance / Contemporary');
    }
    if (genreLower.includes('historical')) {
      categories.push('FICTION / Romance / Historical');
    }
  } else if (genreLower.includes('mystery') || genreLower.includes('thriller')) {
    categories.push('FICTION / Mystery & Detective / General');
    if (genreLower.includes('thriller')) {
      categories.push('FICTION / Thrillers / General');
    }
  } else if (genreLower.includes('horror')) {
    categories.push('FICTION / Horror / General');
  } else if (genreLower.includes('literary')) {
    categories.push('FICTION / Literary');
  } else {
    categories.push('FICTION / General');
  }

  return categories;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validate ISBN-10 or ISBN-13
 */
export function validateISBN(isbn: string): {
  valid: boolean;
  type?: 'ISBN-10' | 'ISBN-13';
  error?: string;
} {
  const clean = isbn.replace(/[-\s]/g, '');

  if (clean.length === 10) {
    // ISBN-10
    if (!/^\d{9}[\dX]$/.test(clean)) {
      return { valid: false, error: 'Invalid ISBN-10 format' };
    }
    return { valid: true, type: 'ISBN-10' };
  } else if (clean.length === 13) {
    // ISBN-13
    if (!/^\d{13}$/.test(clean)) {
      return { valid: false, error: 'Invalid ISBN-13 format' };
    }
    return { valid: true, type: 'ISBN-13' };
  } else {
    return { valid: false, error: 'ISBN must be 10 or 13 digits' };
  }
}
