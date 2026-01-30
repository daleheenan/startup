/**
 * Back Matter Service
 * Generates author bio, "Also By" section, preview chapter
 */

export interface AuthorBio {
  name: string;
  bio: string;
  photoUrl?: string; // Base64 or URL
  website?: string;
  socialMedia?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    goodreads?: string;
  };
}

export interface AlsoByBook {
  title: string;
  series?: string;
  description?: string;
  available?: string; // e.g., "Available now", "Coming 2026"
}

export interface PreviewChapter {
  bookTitle: string;
  chapterNumber: number;
  chapterTitle?: string;
  content: string;
  bookDescription?: string;
  availabilityNote?: string; // e.g., "Coming Spring 2026"
}

/**
 * Generate HTML for About the Author page
 */
export function generateAboutAuthorPage(author: AuthorBio): string {
  let html = `
<div class="about-author" style="page-break-before: always; padding: 2em;">
  <h1 style="text-align: center; margin-bottom: 1.5em;">About the Author</h1>
`;

  if (author.photoUrl) {
    html += `  <div style="text-align: center; margin-bottom: 2em;">
    <img src="${author.photoUrl}" alt="${escapeHtml(author.name)}" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover;"/>
  </div>
`;
  }

  html += `  <div style="text-align: justify; line-height: 1.6; margin-bottom: 1.5em;">
    ${formatBioParagraphs(author.bio)}
  </div>
`;

  // Contact/social links
  const links: string[] = [];
  if (author.website) {
    links.push(`<a href="${escapeHtml(author.website)}" style="color: inherit; text-decoration: underline;">Website</a>`);
  }
  if (author.socialMedia?.twitter) {
    links.push(`<a href="https://twitter.com/${escapeHtml(author.socialMedia.twitter)}" style="color: inherit; text-decoration: underline;">Twitter</a>`);
  }
  if (author.socialMedia?.instagram) {
    links.push(`<a href="https://instagram.com/${escapeHtml(author.socialMedia.instagram)}" style="color: inherit; text-decoration: underline;">Instagram</a>`);
  }
  if (author.socialMedia?.goodreads) {
    links.push(`<a href="${escapeHtml(author.socialMedia.goodreads)}" style="color: inherit; text-decoration: underline;">Goodreads</a>`);
  }

  if (links.length > 0) {
    html += `  <div style="text-align: center; margin-top: 2em;">
    <p style="font-size: 0.95em;">Connect with ${escapeHtml(author.name)}:</p>
    <p style="font-size: 0.9em;">${links.join(' • ')}</p>
  </div>
`;
  }

  html += `</div>\n`;
  return html;
}

/**
 * Generate HTML for "Also By This Author" page
 */
export function generateAlsoByPage(authorName: string, books: AlsoByBook[]): string {
  if (books.length === 0) {
    return '';
  }

  let html = `
<div class="also-by" style="page-break-before: always; padding: 2em;">
  <h1 style="text-align: center; margin-bottom: 1.5em;">Also By ${escapeHtml(authorName)}</h1>
`;

  // Group by series if applicable
  const seriesBooks = new Map<string, AlsoByBook[]>();
  const standaloneBooks: AlsoByBook[] = [];

  books.forEach((book) => {
    if (book.series) {
      if (!seriesBooks.has(book.series)) {
        seriesBooks.set(book.series, []);
      }
      seriesBooks.get(book.series)!.push(book);
    } else {
      standaloneBooks.push(book);
    }
  });

  // Render series
  seriesBooks.forEach((seriesBookList, seriesName) => {
    html += `  <div style="margin-bottom: 2em;">
    <h2 style="font-size: 1.2em; margin-bottom: 0.5em;">${escapeHtml(seriesName)}</h2>
`;
    seriesBookList.forEach((book) => {
      html += renderBookEntry(book);
    });
    html += `  </div>\n`;
  });

  // Render standalone books
  if (standaloneBooks.length > 0) {
    if (seriesBooks.size > 0) {
      html += `  <div style="margin-bottom: 2em;">
    <h2 style="font-size: 1.2em; margin-bottom: 0.5em;">Standalone Novels</h2>
`;
    }
    standaloneBooks.forEach((book) => {
      html += renderBookEntry(book);
    });
    if (seriesBooks.size > 0) {
      html += `  </div>\n`;
    }
  }

  html += `</div>\n`;
  return html;
}

/**
 * Generate HTML for preview chapter
 */
export function generatePreviewChapter(preview: PreviewChapter): string {
  let html = `
<div class="preview-chapter" style="page-break-before: always; padding: 2em;">
  <h1 style="text-align: center; margin-bottom: 0.5em;">Preview</h1>
  <h2 style="text-align: center; font-size: 1.5em; margin-bottom: 2em;">${escapeHtml(preview.bookTitle)}</h2>
`;

  if (preview.bookDescription) {
    html += `  <div style="font-style: italic; text-align: center; margin-bottom: 2em; padding: 0 10%;">
    <p>${escapeHtml(preview.bookDescription)}</p>
  </div>
`;
  }

  if (preview.availabilityNote) {
    html += `  <p style="text-align: center; font-weight: bold; margin-bottom: 2em;">${escapeHtml(preview.availabilityNote)}</p>
`;
  }

  // Chapter heading
  html += `  <div style="margin-top: 3em; margin-bottom: 1.5em;">
    <h3 style="text-align: center; font-size: 1.2em;">Chapter ${preview.chapterNumber}</h3>
`;

  if (preview.chapterTitle) {
    html += `    <h4 style="text-align: center; font-size: 1em; font-style: italic; margin-top: 0.5em;">${escapeHtml(preview.chapterTitle)}</h4>
`;
  }

  html += `  </div>
`;

  // Chapter content
  const paragraphs = preview.content.split('\n\n');
  paragraphs.forEach((para) => {
    const trimmed = para.trim();
    if (trimmed === '' || trimmed === '* * *') {
      html += `  <p style="text-align: center; margin: 1em 0;">* * *</p>\n`;
    } else {
      html += `  <p style="text-align: justify; text-indent: 2em; line-height: 1.6; margin-bottom: 0.5em;">${escapeHtml(trimmed)}</p>\n`;
    }
  });

  // End note
  html += `  <p style="text-align: center; font-style: italic; margin-top: 3em;">—End of Preview—</p>
`;

  if (preview.availabilityNote) {
    html += `  <p style="text-align: center; margin-top: 1em;">${escapeHtml(preview.bookTitle)} is ${escapeHtml(preview.availabilityNote.toLowerCase())}</p>
`;
  }

  html += `</div>\n`;
  return html;
}

/**
 * Generate HTML for acknowledgements page
 */
export function generateAcknowledgementsPage(text: string): string {
  return `
<div class="acknowledgements" style="page-break-before: always; padding: 2em;">
  <h1 style="text-align: center; margin-bottom: 1.5em;">Acknowledgements</h1>
  <div style="text-align: justify; line-height: 1.6;">
    ${formatBioParagraphs(text)}
  </div>
</div>
`;
}

/**
 * Helper: Render a single book entry for "Also By" section
 */
function renderBookEntry(book: AlsoByBook): string {
  let html = `    <div style="margin-bottom: 1em; margin-left: 1.5em;">
      <p style="font-weight: bold; margin-bottom: 0.25em;">${escapeHtml(book.title)}`;

  if (book.available) {
    html += ` <span style="font-weight: normal; font-style: italic; font-size: 0.9em;">(${escapeHtml(book.available)})</span>`;
  }

  html += `</p>
`;

  if (book.description) {
    html += `      <p style="font-size: 0.95em; margin-left: 1em;">${escapeHtml(book.description)}</p>
`;
  }

  html += `    </div>\n`;
  return html;
}

/**
 * Helper: Format bio or acknowledgements text into HTML paragraphs
 */
function formatBioParagraphs(text: string): string {
  const paragraphs = text.split('\n\n').filter((p) => p.trim());
  return paragraphs
    .map((p) => `<p style="margin-bottom: 1em;">${escapeHtml(p.trim())}</p>`)
    .join('\n    ');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
