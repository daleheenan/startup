/**
 * Front Matter Service
 * Generates title page, copyright page, dedication, TOC
 */

import { PublishingMetadata } from './metadata.service.js';

export interface FrontMatterOptions {
  includeTitlePage: boolean;
  includeHalfTitlePage: boolean;
  includeCopyrightPage: boolean;
  includeDedication: boolean;
  includeEpigraph: boolean;
  includeTOC: boolean;
}

export interface DedicationOptions {
  text: string;
}

export interface EpigraphOptions {
  quote: string;
  attribution?: string;
}

export interface TOCEntry {
  title: string;
  level: number; // 1 = chapter, 2 = part
  pageNumber?: number; // For print, undefined for EPUB
  href?: string; // For EPUB linking
}

/**
 * Generate HTML for half-title page (book title only, minimal)
 */
export function generateHalfTitlePage(title: string): string {
  return `
<div class="half-title-page" style="text-align: center; padding-top: 33%; page-break-after: always;">
  <h1 style="font-size: 2em; font-weight: normal;">${escapeHtml(title)}</h1>
</div>
`;
}

/**
 * Generate HTML for full title page
 */
export function generateTitlePage(
  metadata: PublishingMetadata,
  includeGenre: boolean = false
): string {
  let html = `
<div class="title-page" style="text-align: center; padding-top: 25%; page-break-after: always;">
  <h1 style="font-size: 2.5em; font-weight: bold; margin-bottom: 1em;">${escapeHtml(metadata.title)}</h1>
`;

  if (metadata.author) {
    html += `  <p style="font-size: 1.3em; margin-bottom: 2em;">by ${escapeHtml(metadata.author)}</p>\n`;
  }

  if (includeGenre && metadata.genre) {
    html += `  <p style="font-size: 1em; font-style: italic; margin-bottom: 2em;">${escapeHtml(metadata.genre)}</p>\n`;
  }

  if (metadata.publisher) {
    html += `  <p style="font-size: 1em; margin-top: 4em;">${escapeHtml(metadata.publisher)}</p>\n`;
  }

  html += `</div>\n`;
  return html;
}

/**
 * Generate HTML for copyright page
 */
export function generateCopyrightPage(metadata: PublishingMetadata): string {
  const year = metadata.copyrightYear || new Date().getFullYear();
  const author = metadata.author || 'The Author';

  let html = `
<div class="copyright-page" style="padding-top: 60%; font-size: 0.9em; text-align: center; page-break-after: always;">
  <p>Copyright © ${year} ${escapeHtml(author)}</p>
  <p style="margin-top: 0.5em;">All rights reserved.</p>

  <p style="margin-top: 1em;">
    No part of this publication may be reproduced, distributed, or transmitted in any form
    or by any means, including photocopying, recording, or other electronic or mechanical methods,
    without the prior written permission of the publisher, except in the case of brief quotations
    embodied in critical reviews and certain other non-commercial uses permitted by copyright law.
  </p>
`;

  // Fiction disclaimer
  if (!metadata.genre?.toLowerCase().includes('non-fiction')) {
    html += `
  <p style="margin-top: 1em;">
    This is a work of fiction. Names, characters, businesses, places, events, and incidents
    are either the products of the author's imagination or used in a fictitious manner.
    Any resemblance to actual persons, living or dead, or actual events is purely coincidental.
  </p>
`;
  }

  if (metadata.isbn) {
    html += `  <p style="margin-top: 1em;">ISBN: ${escapeHtml(metadata.isbn)}</p>\n`;
  }

  if (metadata.edition) {
    html += `  <p>${escapeHtml(metadata.edition)}</p>\n`;
  }

  if (metadata.publisher) {
    html += `  <p style="margin-top: 1em;">${escapeHtml(metadata.publisher)}</p>\n`;
  }

  html += `</div>\n`;
  return html;
}

/**
 * Generate HTML for dedication page
 */
export function generateDedicationPage(dedication: string): string {
  return `
<div class="dedication-page" style="text-align: center; padding-top: 33%; font-style: italic; page-break-after: always;">
  <p>${escapeHtml(dedication)}</p>
</div>
`;
}

/**
 * Generate HTML for epigraph page
 */
export function generateEpigraphPage(quote: string, attribution?: string): string {
  let html = `
<div class="epigraph-page" style="text-align: center; padding-top: 33%; font-style: italic; page-break-after: always;">
  <p style="font-size: 1.1em;">"${escapeHtml(quote)}"</p>
`;

  if (attribution) {
    html += `  <p style="margin-top: 1em; font-style: normal;">— ${escapeHtml(attribution)}</p>\n`;
  }

  html += `</div>\n`;
  return html;
}

/**
 * Generate HTML for table of contents
 */
export function generateTOC(entries: TOCEntry[], includePageNumbers: boolean = false): string {
  let html = `
<div class="toc" style="page-break-after: always;">
  <h1 style="text-align: center; margin-bottom: 2em;">Contents</h1>
  <div style="margin-left: 2em; margin-right: 2em;">
`;

  entries.forEach((entry) => {
    const indent = entry.level > 1 ? 'margin-left: 1.5em;' : '';
    const dots = includePageNumbers && entry.pageNumber
      ? `<span style="flex: 1; border-bottom: 1px dotted #999; margin: 0 0.5em;"></span>`
      : '';
    const pageNum = includePageNumbers && entry.pageNumber ? `<span>${entry.pageNumber}</span>` : '';

    if (entry.href) {
      html += `    <div style="display: flex; align-items: baseline; margin-bottom: 0.5em; ${indent}">
      <a href="${entry.href}" style="text-decoration: none; color: inherit;">${escapeHtml(entry.title)}</a>
      ${dots}
      ${pageNum}
    </div>\n`;
    } else {
      html += `    <div style="display: flex; align-items: baseline; margin-bottom: 0.5em; ${indent}">
      <span>${escapeHtml(entry.title)}</span>
      ${dots}
      ${pageNum}
    </div>\n`;
    }
  });

  html += `  </div>
</div>
`;

  return html;
}

/**
 * Generate EPUB NCX (Navigation Control file for older e-readers)
 */
export function generateNCX(
  metadata: PublishingMetadata,
  entries: TOCEntry[]
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${metadata.isbn || 'uuid'}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(metadata.title)}</text>
  </docTitle>
  <docAuthor>
    <text>${escapeXml(metadata.author)}</text>
  </docAuthor>
  <navMap>
`;

  entries.forEach((entry, index) => {
    const playOrder = index + 1;
    const href = entry.href || `chapter${playOrder}.xhtml`;

    xml += `    <navPoint id="navpoint-${playOrder}" playOrder="${playOrder}">
      <navLabel>
        <text>${escapeXml(entry.title)}</text>
      </navLabel>
      <content src="${href}"/>
    </navPoint>
`;
  });

  xml += `  </navMap>
</ncx>`;

  return xml;
}

/**
 * Generate EPUB3 nav.xhtml (modern navigation document)
 */
export function generateNav(
  title: string,
  entries: TOCEntry[]
): string {
  let html = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${escapeXml(title)}</title>
  <style>
    nav { padding: 2em; }
    ol { list-style-type: none; }
    li { margin: 0.5em 0; }
  </style>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Contents</h1>
    <ol>
`;

  entries.forEach((entry) => {
    const href = entry.href || '#';
    html += `      <li><a href="${href}">${escapeHtml(entry.title)}</a></li>\n`;
  });

  html += `    </ol>
  </nav>
</body>
</html>`;

  return html;
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
