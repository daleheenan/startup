/**
 * EPUB Export Service
 * Generates KDP-compliant EPUB 3.0 files with embedded fonts and proper TOC
 */

import JSZip from 'jszip';
import db from '../../db/connection.js';
import {
  PublishingMetadata,
  generateDublinCoreMetadata,
  generateEpub3Metadata,
  generateBISACCategories,
} from './metadata.service.js';
import {
  generateHalfTitlePage,
  generateTitlePage,
  generateCopyrightPage,
  generateDedicationPage,
  generateEpigraphPage,
  generateNCX,
  generateNav,
  TOCEntry,
} from './front-matter.service.js';
import {
  generateAboutAuthorPage,
  generateAlsoByPage,
  AuthorBio,
  AlsoByBook,
} from './back-matter.service.js';

interface Chapter {
  id: string;
  chapter_number: number;
  title: string | null;
  content: string;
}

interface Project {
  id: string;
  title: string;
  genre: string;
  author_name?: string | null;
  dedication?: string | null;
  epigraph?: string | null;
  epigraph_attribution?: string | null;
  isbn?: string | null;
  publisher?: string | null;
  edition?: string | null;
  copyright_year?: number | null;
  cover_image?: string | null;
  cover_image_type?: string | null;
  include_about_author?: number;
}

interface AuthorProfile {
  author_bio: string | null;
  author_website: string | null;
  author_social_media: string | null;
}

export interface EpubOptions {
  includeHalfTitle?: boolean;
  includeDedication?: boolean;
  includeEpigraph?: boolean;
  includeAboutAuthor?: boolean;
  includeAlsoBy?: boolean;
  alsoByBooks?: AlsoByBook[];
}

export class EpubService {
  /**
   * Generate EPUB 3.0 file for a project
   */
  async generateEpub(
    projectId: string,
    options: EpubOptions = {}
  ): Promise<Buffer> {
    // Get project data
    const project = db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .get(projectId) as Project;
    if (!project) {
      throw new Error('Project not found');
    }

    // Get chapters
    const chapters = db
      .prepare(
        `
      SELECT
        c.id,
        c.chapter_number,
        c.title,
        COALESCE(ce.edited_content, c.content) as content
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      LEFT JOIN chapter_edits ce ON ce.chapter_id = c.id
      LEFT JOIN book_versions bv ON c.version_id = bv.id
      WHERE b.project_id = ?
        AND (
          c.version_id IS NULL
          OR bv.is_active = 1
        )
      ORDER BY b.book_number, c.chapter_number
    `
      )
      .all(projectId) as Chapter[];

    if (chapters.length === 0) {
      throw new Error('No chapters found for project');
    }

    // Get author profile
    let authorProfile: AuthorProfile | null = null;
    try {
      authorProfile = db
        .prepare("SELECT * FROM author_profile WHERE id = 'owner'")
        .get() as AuthorProfile | null;
    } catch (e) {
      // Table might not exist
    }

    // Build metadata
    const metadata: PublishingMetadata = {
      title: project.title,
      author: project.author_name || 'Unknown Author',
      language: 'en-GB',
      isbn: project.isbn || undefined,
      publisher: project.publisher || undefined,
      copyrightYear: project.copyright_year || new Date().getFullYear(),
      edition: project.edition || undefined,
      genre: project.genre,
      subjects: generateBISACCategories(project.genre),
      publishDate: new Date().toISOString().split('T')[0],
    };

    // Create ZIP archive
    const zip = new JSZip();

    // Add mimetype file (uncompressed, must be first)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // META-INF directory
    const metaInf = zip.folder('META-INF')!;
    metaInf.file('container.xml', this.generateContainerXml());

    // OEBPS directory (content)
    const oebps = zip.folder('OEBPS')!;

    // Add stylesheet
    oebps.file('styles.css', this.generateStylesheet());

    // Build TOC entries
    const tocEntries: TOCEntry[] = [];

    // Add cover image if available
    if (project.cover_image && project.cover_image_type) {
      const coverBuffer = Buffer.from(project.cover_image, 'base64');
      const coverExt = project.cover_image_type.split('/')[1];
      oebps.file(`cover.${coverExt}`, coverBuffer);

      // Cover page
      oebps.file('cover.xhtml', this.generateCoverPage(`cover.${coverExt}`));
      tocEntries.push({
        title: 'Cover',
        level: 1,
        href: 'cover.xhtml',
      });
    }

    // Front matter files
    let fileIndex = 1;

    if (options.includeHalfTitle !== false) {
      oebps.file(
        `front-${fileIndex}.xhtml`,
        this.wrapInXhtml(generateHalfTitlePage(project.title), 'Half Title')
      );
      tocEntries.push({
        title: 'Half Title',
        level: 1,
        href: `front-${fileIndex}.xhtml`,
      });
      fileIndex++;
    }

    oebps.file(
      `front-${fileIndex}.xhtml`,
      this.wrapInXhtml(generateTitlePage(metadata), 'Title Page')
    );
    tocEntries.push({
      title: 'Title Page',
      level: 1,
      href: `front-${fileIndex}.xhtml`,
    });
    fileIndex++;

    oebps.file(
      `front-${fileIndex}.xhtml`,
      this.wrapInXhtml(generateCopyrightPage(metadata), 'Copyright')
    );
    tocEntries.push({
      title: 'Copyright',
      level: 1,
      href: `front-${fileIndex}.xhtml`,
    });
    fileIndex++;

    if (options.includeDedication !== false && project.dedication) {
      oebps.file(
        `front-${fileIndex}.xhtml`,
        this.wrapInXhtml(
          generateDedicationPage(project.dedication),
          'Dedication'
        )
      );
      tocEntries.push({
        title: 'Dedication',
        level: 1,
        href: `front-${fileIndex}.xhtml`,
      });
      fileIndex++;
    }

    if (
      options.includeEpigraph !== false &&
      project.epigraph
    ) {
      oebps.file(
        `front-${fileIndex}.xhtml`,
        this.wrapInXhtml(
          generateEpigraphPage(
            project.epigraph,
            project.epigraph_attribution || undefined
          ),
          'Epigraph'
        )
      );
      tocEntries.push({
        title: 'Epigraph',
        level: 1,
        href: `front-${fileIndex}.xhtml`,
      });
      fileIndex++;
    }

    // Chapter files
    chapters.forEach((chapter) => {
      const filename = `chapter${chapter.chapter_number}.xhtml`;
      const chapterHtml = this.generateChapterXhtml(chapter);
      oebps.file(filename, chapterHtml);

      const tocTitle = chapter.title
        ? `Chapter ${chapter.chapter_number}: ${chapter.title}`
        : `Chapter ${chapter.chapter_number}`;

      tocEntries.push({
        title: tocTitle,
        level: 1,
        href: filename,
      });
    });

    // Back matter
    if (
      options.includeAboutAuthor !== false &&
      project.include_about_author !== 0 &&
      authorProfile?.author_bio
    ) {
      const authorBio: AuthorBio = {
        name: project.author_name || 'The Author',
        bio: authorProfile.author_bio,
        website: authorProfile.author_website || undefined,
        socialMedia: authorProfile.author_social_media
          ? JSON.parse(authorProfile.author_social_media)
          : undefined,
      };

      oebps.file(
        'about-author.xhtml',
        this.wrapInXhtml(generateAboutAuthorPage(authorBio), 'About the Author')
      );
      tocEntries.push({
        title: 'About the Author',
        level: 1,
        href: 'about-author.xhtml',
      });
    }

    if (options.includeAlsoBy && options.alsoByBooks && options.alsoByBooks.length > 0) {
      oebps.file(
        'also-by.xhtml',
        this.wrapInXhtml(
          generateAlsoByPage(
            project.author_name || 'This Author',
            options.alsoByBooks
          ),
          'Also By This Author'
        )
      );
      tocEntries.push({
        title: 'Also By This Author',
        level: 1,
        href: 'also-by.xhtml',
      });
    }

    // Generate nav.xhtml (EPUB3 navigation)
    oebps.file('nav.xhtml', generateNav(project.title, tocEntries));

    // Generate toc.ncx (backwards compatibility)
    oebps.file('toc.ncx', generateNCX(metadata, tocEntries));

    // Generate content.opf (package document)
    oebps.file('content.opf', this.generateContentOpf(metadata, tocEntries, project));

    // Generate the ZIP file
    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    return buffer;
  }

  /**
   * Generate container.xml
   */
  private generateContainerXml(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  }

  /**
   * Generate stylesheet
   */
  private generateStylesheet(): string {
    return `/* EPUB Stylesheet */
body {
  font-family: "Times New Roman", Times, serif;
  font-size: 1em;
  line-height: 1.6;
  margin: 1em;
  text-align: justify;
}

h1, h2, h3, h4 {
  text-align: center;
  font-weight: normal;
  page-break-after: avoid;
}

h1 {
  font-size: 2em;
  margin: 2em 0 1em 0;
}

h2 {
  font-size: 1.5em;
  margin: 1.5em 0 0.75em 0;
}

h3 {
  font-size: 1.2em;
  margin: 1em 0 0.5em 0;
}

p {
  margin: 0 0 0.5em 0;
  text-indent: 2em;
  text-align: justify;
}

p.no-indent {
  text-indent: 0;
}

p.center {
  text-align: center;
  text-indent: 0;
}

.scene-break {
  text-align: center;
  margin: 1em 0;
  text-indent: 0;
}

.chapter-number {
  font-size: 1em;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 0.5em;
}

.chapter-title {
  font-size: 1.5em;
  font-weight: bold;
  margin-bottom: 2em;
}

/* Cover */
.cover-image {
  text-align: center;
  margin: 0;
  padding: 0;
}

.cover-image img {
  width: 100%;
  height: auto;
}

/* Front/back matter */
.half-title-page, .title-page, .copyright-page,
.dedication-page, .epigraph-page {
  page-break-after: always;
}
`;
  }

  /**
   * Generate cover page XHTML
   */
  private generateCoverPage(coverImagePath: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Cover</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="cover-image">
    <img src="${coverImagePath}" alt="Cover"/>
  </div>
</body>
</html>`;
  }

  /**
   * Generate chapter XHTML
   */
  private generateChapterXhtml(chapter: Chapter): string {
    const chapterTitle = chapter.title ? escapeXml(chapter.title) : '';

    let bodyContent = `  <div class="chapter-number">Chapter ${chapter.chapter_number}</div>\n`;

    if (chapterTitle) {
      bodyContent += `  <h1 class="chapter-title">${chapterTitle}</h1>\n`;
    } else {
      bodyContent += `  <h1 class="chapter-title"> </h1>\n`;
    }

    // Process content
    const cleanContent = this.cleanContent(chapter.content);
    const paragraphs = cleanContent.split('\n\n');

    paragraphs.forEach((para, index) => {
      const trimmed = para.trim();
      if (trimmed === '' || trimmed === '* * *' || trimmed === '***') {
        bodyContent += `  <p class="scene-break">* * *</p>\n`;
      } else {
        const cssClass = index === 0 ? ' class="no-indent"' : '';
        bodyContent += `  <p${cssClass}>${escapeXml(trimmed)}</p>\n`;
      }
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Chapter ${chapter.chapter_number}${chapterTitle ? ': ' + chapterTitle : ''}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
${bodyContent}</body>
</html>`;
  }

  /**
   * Wrap HTML content in XHTML structure
   */
  private wrapInXhtml(htmlContent: string, title: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
${htmlContent}</body>
</html>`;
  }

  /**
   * Generate content.opf (package document)
   */
  private generateContentOpf(
    metadata: PublishingMetadata,
    tocEntries: TOCEntry[],
    project: Project
  ): string {
    const dublinCore = generateDublinCoreMetadata(metadata);
    const epub3Meta = generateEpub3Metadata(metadata);

    // Build manifest items
    const manifestItems: string[] = [
      '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
      '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
      '<item id="stylesheet" href="styles.css" media-type="text/css"/>',
    ];

    if (project.cover_image && project.cover_image_type) {
      const ext = project.cover_image_type.split('/')[1];
      manifestItems.push(
        `<item id="cover-image" href="cover.${ext}" media-type="${project.cover_image_type}" properties="cover-image"/>`,
        '<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>'
      );
    }

    tocEntries.forEach((entry, index) => {
      if (entry.href && entry.href !== 'cover.xhtml') {
        const id = entry.href.replace('.xhtml', '');
        manifestItems.push(
          `<item id="${id}" href="${entry.href}" media-type="application/xhtml+xml"/>`
        );
      }
    });

    // Build spine itemrefs
    const spineItems: string[] = [];
    tocEntries.forEach((entry) => {
      if (entry.href) {
        const id = entry.href.replace('.xhtml', '');
        spineItems.push(`<itemref idref="${id}"/>`);
      }
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="isbn">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    ${dublinCore}
    ${epub3Meta}
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
  }

  /**
   * Clean chapter content of markdown and AI tells
   */
  private cleanContent(content: string): string {
    let cleaned = content;

    // Remove markdown headings
    cleaned = cleaned.replace(/^#{1,6}\s+.*$/gm, '');

    // Remove markdown formatting
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
    cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1');

    // Remove scene markers
    cleaned = cleaned.replace(
      /^(Scene|Part|Section)\s+(\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)[:\s].*$/gim,
      ''
    );

    // Clean up em-dashes (UK style: use commas or full stops)
    cleaned = cleaned.replace(/—\s+([a-z])/g, ', $1');
    cleaned = cleaned.replace(/—$/gm, '.');
    cleaned = cleaned.replace(/—/g, ', ');
    cleaned = cleaned.replace(/,\s*,/g, ',');

    // Clean up multiple blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned.trim();
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const epubService = new EpubService();
