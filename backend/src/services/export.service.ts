import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, convertInchesToTwip } from 'docx';
import PDFDocument from 'pdfkit';
import db from '../db/connection.js';

export interface Chapter {
  id: string;
  chapter_number: number;
  title: string | null;
  content: string;
  word_count: number;
}

export interface Project {
  id: string;
  title: string;
  type: string;
  genre: string;
  story_dna: any;
  story_bible: any;
  author_name?: string | null;
  // Publishing fields
  dedication?: string | null;
  epigraph?: string | null;
  epigraph_attribution?: string | null;
  isbn?: string | null;
  publisher?: string | null;
  edition?: string | null;
  copyright_year?: number | null;
  include_dramatis_personae?: number;
  include_about_author?: number;
  cover_image?: string | null;
  cover_image_type?: string | null;
}

export interface AuthorProfile {
  id: string;
  author_bio: string | null;
  author_photo: string | null;
  author_photo_type: string | null;
  author_website: string | null;
  author_social_media: string | null;
}

interface Character {
  name: string;
  role?: string;
  description?: string;
  traits?: string[];
  backstory?: string;
}

export class ExportService {
  /**
   * Clean content of any markdown artifacts, structural markers, and AI tells
   */
  private cleanContent(content: string): string {
    let cleaned = content;

    // Remove markdown headings (# ## ### etc.)
    cleaned = cleaned.replace(/^#{1,6}\s+.*$/gm, '');

    // Remove markdown bold/italic markers
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
    cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1');

    // Remove scene numbers/titles like "Scene 1:", "Scene One:", "Part 1:", etc.
    cleaned = cleaned.replace(/^(Scene|Part|Section)\s+(\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)[:\s].*$/gim, '');

    // Remove any remaining markdown-style formatting
    cleaned = cleaned.replace(/^[-*]\s+/gm, '');

    // Replace em-dashes with appropriate punctuation (AI tell removal)
    // Em-dash followed by space and lowercase = likely parenthetical, use comma
    cleaned = cleaned.replace(/—\s+([a-z])/g, ', $1');
    // Em-dash at end of sentence fragment = use period
    cleaned = cleaned.replace(/—$/gm, '.');
    // Remaining em-dashes = use comma
    cleaned = cleaned.replace(/—/g, ', ');
    // Clean up double commas that might result
    cleaned = cleaned.replace(/,\s*,/g, ',');

    // Clean up multiple blank lines to single blank line
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Trim leading/trailing whitespace
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Generate DOCX file for a project
   * Sprint 16: Include edited versions when available
   * Sprint D: Only export chapters from active version of each book
   */
  async generateDOCX(projectId: string): Promise<Buffer> {
    // Get project and chapters
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project;
    if (!project) {
      throw new Error('Project not found');
    }

    // Get chapters with edited versions if available
    // Only get chapters from the active version (or legacy chapters without version)
    const chapters = db.prepare(`
      SELECT
        c.id,
        c.chapter_number,
        c.title,
        COALESCE(ce.edited_content, c.content) as content,
        COALESCE(ce.word_count, c.word_count) as word_count
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
    `).all(projectId) as Chapter[];

    if (chapters.length === 0) {
      throw new Error('No chapters found for project');
    }

    // Create DOCX document
    const doc = new Document({
      sections: [
        // Title page
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          children: [
            new Paragraph({
              text: project.title,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: {
                before: convertInchesToTwip(3),
                after: convertInchesToTwip(1),
              },
            }),
            new Paragraph({
              text: project.author_name ? `by ${project.author_name}` : '',
              alignment: AlignmentType.CENTER,
              spacing: {
                after: convertInchesToTwip(0.5),
              },
            }),
            new Paragraph({
              text: `Genre: ${project.genre}`,
              alignment: AlignmentType.CENTER,
              spacing: {
                after: convertInchesToTwip(0.5),
              },
            }),
          ],
        },
        // Chapters
        ...chapters.map((chapter) => this.createChapterSection(chapter)),
      ],
    });

    return await Packer.toBuffer(doc);
  }

  /**
   * Create a DOCX section for a single chapter
   */
  private createChapterSection(chapter: Chapter) {
    const paragraphs: Paragraph[] = [];

    // Chapter heading
    paragraphs.push(
      new Paragraph({
        text: `Chapter ${chapter.chapter_number}`,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 0,
          after: convertInchesToTwip(0.25),
        },
        pageBreakBefore: true,
      })
    );

    // Chapter title (if exists)
    if (chapter.title) {
      paragraphs.push(
        new Paragraph({
          text: chapter.title,
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: {
            after: convertInchesToTwip(0.5),
          },
        })
      );
    }

    // Chapter content - clean and split into paragraphs
    const cleanedContent = this.cleanContent(chapter.content);
    const contentParagraphs = cleanedContent.split('\n\n');
    for (const para of contentParagraphs) {
      const trimmed = para.trim();
      if (trimmed === '' ||  trimmed === '* * *') {
        // Scene break
        paragraphs.push(
          new Paragraph({
            text: '* * *',
            alignment: AlignmentType.CENTER,
            spacing: {
              before: convertInchesToTwip(0.25),
              after: convertInchesToTwip(0.25),
            },
          })
        );
      } else {
        // Regular paragraph
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmed,
                font: 'Times New Roman',
                size: 24, // 12pt
              }),
            ],
            spacing: {
              line: 360, // 1.5 line spacing
              after: convertInchesToTwip(0.1),
            },
            indent: {
              firstLine: convertInchesToTwip(0.5),
            },
          })
        );
      }
    }

    return {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      children: paragraphs,
    };
  }

  /**
   * Generate PDF file for a project
   * Sprint 16: Include edited versions when available
   * Sprint D: Only export chapters from active version of each book
   */
  async generatePDF(projectId: string): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        // Get project and chapters
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project;
        if (!project) {
          throw new Error('Project not found');
        }

        // Get chapters with edited versions if available
        // Only get chapters from the active version (or legacy chapters without version)
        const chapters = db.prepare(`
          SELECT
            c.id,
            c.chapter_number,
            c.title,
            COALESCE(ce.edited_content, c.content) as content,
            COALESCE(ce.word_count, c.word_count) as word_count
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
        `).all(projectId) as Chapter[];

        if (chapters.length === 0) {
          throw new Error('No chapters found for project');
        }

        // Create PDF document
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: {
            top: 72, // 1 inch
            bottom: 72,
            left: 72,
            right: 72,
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Title page
        doc.fontSize(24).font('Times-Roman').text(project.title, {
          align: 'center',
        });
        doc.moveDown();
        if (project.author_name) {
          doc.fontSize(14).text(`by ${project.author_name}`, {
            align: 'center',
          });
          doc.moveDown();
        }
        doc.fontSize(12).text(`Genre: ${project.genre}`, {
          align: 'center',
        });
        doc.addPage();

        // Chapters
        for (const chapter of chapters) {
          // Chapter heading
          doc.fontSize(18).font('Times-Bold').text(`Chapter ${chapter.chapter_number}`, {
            align: 'center',
          });

          if (chapter.title) {
            doc.moveDown(0.5);
            doc.fontSize(14).text(chapter.title, {
              align: 'center',
            });
          }

          doc.moveDown(1);

          // Chapter content - clean and split
          const cleanedContent = this.cleanContent(chapter.content);
          const contentParagraphs = cleanedContent.split('\n\n');
          for (const para of contentParagraphs) {
            const trimmed = para.trim();
            if (trimmed === '' || trimmed === '* * *') {
              // Scene break
              doc.moveDown(0.5);
              doc.fontSize(12).font('Times-Roman').text('* * *', {
                align: 'center',
              });
              doc.moveDown(0.5);
            } else {
              // Regular paragraph
              doc.fontSize(12).font('Times-Roman').text(trimmed, {
                align: 'left',
                lineGap: 6,
                indent: 36, // First line indent (0.5 inch)
              });
              doc.moveDown(0.5);
            }
          }

          // Add page for next chapter
          if (chapter !== chapters[chapters.length - 1]) {
            doc.addPage();
          }
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert Arabic number to Roman numeral
   */
  private toRomanNumeral(num: number): string {
    const romanNumerals: [number, string][] = [
      [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'],
      [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
      [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']
    ];
    let result = '';
    for (const [value, numeral] of romanNumerals) {
      while (num >= value) {
        result += numeral;
        num -= value;
      }
    }
    return result;
  }

  /**
   * Generate PDF file with cover image as first page (publish-ready)
   * Full professional publishing format with front matter, back matter,
   * table of contents, page numbers, and running headers.
   */
  async generatePDFWithCover(projectId: string): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        // Get project with all publishing fields
        const project = db.prepare(`
          SELECT id, title, type, genre, story_dna, story_bible, author_name,
                 cover_image, cover_image_type, dedication, epigraph,
                 epigraph_attribution, isbn, publisher, edition, copyright_year,
                 include_dramatis_personae, include_about_author
          FROM projects WHERE id = ?
        `).get(projectId) as Project;

        if (!project) {
          throw new Error('Project not found');
        }

        // Get author profile for About the Author section
        let authorProfile: AuthorProfile | null = null;
        try {
          authorProfile = db.prepare(`
            SELECT * FROM author_profile WHERE id = 'owner'
          `).get() as AuthorProfile | null;
        } catch (e) {
          // Author profile table might not exist yet
        }

        // Get chapters with edited versions if available
        const chapters = db.prepare(`
          SELECT
            c.id,
            c.chapter_number,
            c.title,
            COALESCE(ce.edited_content, c.content) as content,
            COALESCE(ce.word_count, c.word_count) as word_count
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
        `).all(projectId) as Chapter[];

        if (chapters.length === 0) {
          throw new Error('No chapters found for project');
        }

        // Parse story bible for characters
        let storyBible: any = {};
        if (project.story_bible) {
          try {
            storyBible = typeof project.story_bible === 'string'
              ? JSON.parse(project.story_bible)
              : project.story_bible;
          } catch (e) {
            storyBible = {};
          }
        }
        const characters: Character[] = storyBible.characters || [];

        // Constants
        const pageWidth = 612; // Letter width in points
        const pageHeight = 792; // Letter height in points
        const margin = 72; // 1 inch
        const contentWidth = pageWidth - (margin * 2);

        // Track pages for TOC
        interface TocEntry {
          title: string;
          pageNumber: number;
          isChapter: boolean;
        }
        const tocEntries: TocEntry[] = [];
        let currentPage = 0;
        let frontMatterPages = 0;

        // First pass: Calculate page counts for TOC
        // We'll use a simpler approach - add pages as we go and update TOC at the end

        // Create PDF document
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: margin, bottom: margin, left: margin, right: margin },
          bufferPages: true, // Enable buffering for TOC page numbers
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Helper: Add page number (centered footer)
        const addPageNumber = (pageNum: number, isRoman: boolean = false) => {
          const pageText = isRoman ? this.toRomanNumeral(pageNum) : pageNum.toString();
          doc.fontSize(10).font('Times-Roman').text(
            pageText,
            margin,
            pageHeight - 50,
            { width: contentWidth, align: 'center' }
          );
        };

        // Helper: Add running header
        const addRunningHeader = (leftText: string, rightText: string) => {
          const y = 40;
          doc.fontSize(9).font('Times-Italic');
          doc.text(leftText, margin, y, { width: contentWidth / 2, align: 'left' });
          doc.text(rightText, margin + contentWidth / 2, y, { width: contentWidth / 2, align: 'right' });
        };

        // ===== COVER PAGE =====
        if (project.cover_image && project.cover_image_type) {
          const coverBuffer = Buffer.from(project.cover_image, 'base64');
          doc.image(coverBuffer, 0, 0, {
            width: pageWidth,
            height: pageHeight,
            fit: [pageWidth, pageHeight],
            align: 'center',
            valign: 'center',
          });
          doc.addPage();
        }

        // ===== HALF-TITLE PAGE =====
        currentPage++;
        frontMatterPages++;
        doc.y = pageHeight / 3;
        doc.fontSize(24).font('Times-Roman').text(project.title, {
          align: 'center',
        });
        addPageNumber(frontMatterPages, true);
        doc.addPage();

        // ===== TITLE PAGE =====
        currentPage++;
        frontMatterPages++;
        doc.y = pageHeight / 4;
        doc.fontSize(32).font('Times-Bold').text(project.title, {
          align: 'center',
        });
        doc.moveDown(2);
        if (project.author_name) {
          doc.fontSize(18).font('Times-Roman').text(`by ${project.author_name}`, {
            align: 'center',
          });
        }
        doc.moveDown(4);
        if (project.publisher) {
          doc.fontSize(12).font('Times-Roman').text(project.publisher, {
            align: 'center',
          });
        }
        addPageNumber(frontMatterPages, true);
        doc.addPage();

        // ===== COPYRIGHT PAGE =====
        currentPage++;
        frontMatterPages++;
        doc.y = pageHeight - 300;
        doc.fontSize(10).font('Times-Roman');

        const copyrightYear = project.copyright_year || new Date().getFullYear();
        const authorName = project.author_name || 'The Author';

        doc.text(`Copyright © ${copyrightYear} ${authorName}`, { align: 'center' });
        doc.moveDown(0.5);
        doc.text('All rights reserved.', { align: 'center' });
        doc.moveDown(1);
        doc.text(
          'No part of this publication may be reproduced, distributed, or transmitted in any form ' +
          'or by any means, including photocopying, recording, or other electronic or mechanical methods, ' +
          'without the prior written permission of the publisher, except in the case of brief quotations ' +
          'embodied in critical reviews and certain other non-commercial uses permitted by copyright law.',
          { align: 'center', width: contentWidth }
        );
        doc.moveDown(1);

        if (project.genre.toLowerCase().includes('fiction') ||
            !project.genre.toLowerCase().includes('non-fiction')) {
          doc.text(
            'This is a work of fiction. Names, characters, businesses, places, events, and incidents ' +
            'are either the products of the author\'s imagination or used in a fictitious manner. ' +
            'Any resemblance to actual persons, living or dead, or actual events is purely coincidental.',
            { align: 'center', width: contentWidth }
          );
          doc.moveDown(1);
        }

        if (project.isbn) {
          doc.text(`ISBN: ${project.isbn}`, { align: 'center' });
          doc.moveDown(0.5);
        }

        if (project.edition) {
          doc.text(project.edition, { align: 'center' });
        }

        addPageNumber(frontMatterPages, true);
        doc.addPage();

        // ===== DEDICATION PAGE (if provided) =====
        if (project.dedication) {
          currentPage++;
          frontMatterPages++;
          doc.y = pageHeight / 3;
          doc.fontSize(14).font('Times-Italic').text(project.dedication, {
            align: 'center',
            width: contentWidth,
          });
          addPageNumber(frontMatterPages, true);
          doc.addPage();
        }

        // ===== EPIGRAPH PAGE (if provided) =====
        if (project.epigraph) {
          currentPage++;
          frontMatterPages++;
          doc.y = pageHeight / 3;
          doc.fontSize(14).font('Times-Italic').text(`"${project.epigraph}"`, {
            align: 'center',
            width: contentWidth,
          });
          if (project.epigraph_attribution) {
            doc.moveDown(1);
            doc.fontSize(12).font('Times-Roman').text(project.epigraph_attribution, {
              align: 'center',
            });
          }
          addPageNumber(frontMatterPages, true);
          doc.addPage();
        }

        // ===== TABLE OF CONTENTS PAGE =====
        currentPage++;
        frontMatterPages++;
        const tocPageIndex = currentPage - 1; // For updating later
        doc.fontSize(24).font('Times-Bold').text('Contents', {
          align: 'center',
        });
        doc.moveDown(2);

        // We'll add TOC entries here after we know the page numbers
        // For now, reserve space
        const tocStartY = doc.y;

        addPageNumber(frontMatterPages, true);
        doc.addPage();

        // ===== CHAPTERS =====
        let chapterPageStart = 1; // Arabic numbering starts at 1

        for (let i = 0; i < chapters.length; i++) {
          const chapter = chapters[i];
          currentPage++;

          // Record TOC entry
          tocEntries.push({
            title: chapter.title
              ? `Chapter ${chapter.chapter_number}: ${chapter.title}`
              : `Chapter ${chapter.chapter_number}`,
            pageNumber: chapterPageStart,
            isChapter: true,
          });

          // Running header (skip first page of chapter for cleaner look)
          // addRunningHeader(project.title, chapter.title || `Chapter ${chapter.chapter_number}`);

          // Chapter heading - drop down a bit for visual appeal
          doc.y = 120;
          doc.fontSize(12).font('Times-Roman').text('CHAPTER ' + chapter.chapter_number, {
            align: 'center',
            characterSpacing: 2,
          });
          doc.moveDown(1);

          if (chapter.title) {
            doc.fontSize(18).font('Times-Bold').text(chapter.title, {
              align: 'center',
            });
          }

          doc.moveDown(2);

          // Chapter content
          const cleanedContent = this.cleanContent(chapter.content);
          const contentParagraphs = cleanedContent.split('\n\n');

          for (const para of contentParagraphs) {
            const trimmed = para.trim();
            if (trimmed === '' || trimmed === '* * *') {
              doc.moveDown(0.5);
              doc.fontSize(12).font('Times-Roman').text('* * *', { align: 'center' });
              doc.moveDown(0.5);
            } else {
              doc.fontSize(12).font('Times-Roman').text(trimmed, {
                align: 'justify',
                lineGap: 4,
                indent: 36,
              });
              doc.moveDown(0.5);
            }
          }

          addPageNumber(chapterPageStart);

          // Calculate pages used by this chapter (approximate)
          // PDFKit doesn't give us exact page count easily, so we'll track manually
          chapterPageStart++;

          // Add page for next chapter (or back matter)
          if (i < chapters.length - 1) {
            doc.addPage();
          }
        }

        // ===== BACK MATTER =====

        // DRAMATIS PERSONAE (Character List)
        if (project.include_dramatis_personae !== 0 && characters.length > 0) {
          doc.addPage();
          chapterPageStart++;

          tocEntries.push({
            title: 'Dramatis Personae',
            pageNumber: chapterPageStart,
            isChapter: false,
          });

          doc.y = 100;
          doc.fontSize(24).font('Times-Bold').text('Dramatis Personae', {
            align: 'center',
          });
          doc.moveDown(2);

          // Group characters by role
          const protagonists = characters.filter((c: Character) =>
            c.role?.toLowerCase().includes('protagonist') ||
            c.role?.toLowerCase().includes('main') ||
            c.role?.toLowerCase().includes('hero')
          );
          const antagonists = characters.filter((c: Character) =>
            c.role?.toLowerCase().includes('antagonist') ||
            c.role?.toLowerCase().includes('villain')
          );
          const supporting = characters.filter((c: Character) =>
            !protagonists.includes(c) && !antagonists.includes(c)
          );

          const renderCharacterGroup = (title: string, chars: Character[]) => {
            if (chars.length === 0) return;
            doc.fontSize(14).font('Times-Bold').text(title, { underline: true });
            doc.moveDown(0.5);

            for (const char of chars) {
              doc.fontSize(12).font('Times-Bold').text(char.name);
              if (char.description || char.backstory) {
                doc.font('Times-Roman').text(
                  char.description || char.backstory || '',
                  { indent: 20 }
                );
              }
              doc.moveDown(0.5);
            }
            doc.moveDown(1);
          };

          renderCharacterGroup('Principal Characters', protagonists);
          renderCharacterGroup('Antagonists', antagonists);
          renderCharacterGroup('Supporting Characters', supporting);

          addPageNumber(chapterPageStart);
        }

        // ABOUT THE AUTHOR
        if (project.include_about_author !== 0 && authorProfile?.author_bio) {
          doc.addPage();
          chapterPageStart++;

          tocEntries.push({
            title: 'About the Author',
            pageNumber: chapterPageStart,
            isChapter: false,
          });

          doc.y = 100;
          doc.fontSize(24).font('Times-Bold').text('About the Author', {
            align: 'center',
          });
          doc.moveDown(2);

          // Author photo
          if (authorProfile.author_photo && authorProfile.author_photo_type) {
            try {
              const photoBuffer = Buffer.from(authorProfile.author_photo, 'base64');
              const photoX = (pageWidth - 150) / 2; // Center a 150pt wide image
              doc.image(photoBuffer, photoX, doc.y, {
                width: 150,
                height: 150,
                fit: [150, 150],
              });
              doc.y += 170;
            } catch (e) {
              // Skip photo if there's an error
            }
          }

          // Author bio
          doc.fontSize(12).font('Times-Roman').text(authorProfile.author_bio, {
            align: 'justify',
            lineGap: 4,
          });

          // Website/social media
          if (authorProfile.author_website) {
            doc.moveDown(1);
            doc.fontSize(11).font('Times-Roman').text(
              `Visit: ${authorProfile.author_website}`,
              { align: 'center' }
            );
          }

          if (authorProfile.author_social_media) {
            try {
              const social = typeof authorProfile.author_social_media === 'string'
                ? JSON.parse(authorProfile.author_social_media)
                : authorProfile.author_social_media;

              const socialLinks: string[] = [];
              if (social.twitter) socialLinks.push(`Twitter: ${social.twitter}`);
              if (social.instagram) socialLinks.push(`Instagram: ${social.instagram}`);
              if (social.facebook) socialLinks.push(`Facebook: ${social.facebook}`);
              if (social.goodreads) socialLinks.push(`Goodreads: ${social.goodreads}`);

              if (socialLinks.length > 0) {
                doc.moveDown(0.5);
                doc.fontSize(10).font('Times-Roman').text(
                  socialLinks.join(' | '),
                  { align: 'center' }
                );
              }
            } catch (e) {
              // Skip social media if parsing fails
            }
          }

          addPageNumber(chapterPageStart);
        }

        // ===== GO BACK AND FILL IN TOC =====
        // PDFKit with bufferPages allows us to switch back to earlier pages
        const pages = doc.bufferedPageRange();
        if (pages.count > tocPageIndex) {
          doc.switchToPage(tocPageIndex);
          doc.y = tocStartY;

          doc.fontSize(12).font('Times-Roman');
          for (const entry of tocEntries) {
            const dots = '.'.repeat(Math.max(1, 50 - entry.title.length));
            doc.text(`${entry.title} ${dots} ${entry.pageNumber}`, {
              width: contentWidth,
            });
            doc.moveDown(0.3);
          }
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Story Bible export as DOCX
   */
  async generateStoryBibleDOCX(projectId: string): Promise<Buffer> {
    // Get project with story bible
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project;
    if (!project) {
      throw new Error('Project not found');
    }

    const storyBible = project.story_bible || {};
    const storyDNA = project.story_dna || {};

    // Create DOCX document
    const paragraphs: Paragraph[] = [];

    // Title
    paragraphs.push(
      new Paragraph({
        text: `${project.title} - Story Bible`,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: convertInchesToTwip(0.5) },
      })
    );

    // Story DNA Section
    paragraphs.push(
      new Paragraph({
        text: 'Story DNA',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: convertInchesToTwip(0.25), after: convertInchesToTwip(0.25) },
      })
    );

    if (storyDNA.tone) {
      paragraphs.push(
        new Paragraph({
          text: `Tone: ${storyDNA.tone}`,
          spacing: { after: convertInchesToTwip(0.1) },
        })
      );
    }

    if (storyDNA.themes && Array.isArray(storyDNA.themes)) {
      paragraphs.push(
        new Paragraph({
          text: `Themes: ${storyDNA.themes.join(', ')}`,
          spacing: { after: convertInchesToTwip(0.1) },
        })
      );
    }

    if (storyDNA.proseStyle) {
      paragraphs.push(
        new Paragraph({
          text: `Prose Style: ${JSON.stringify(storyDNA.proseStyle, null, 2)}`,
          spacing: { after: convertInchesToTwip(0.25) },
        })
      );
    }

    // Characters Section
    paragraphs.push(
      new Paragraph({
        text: 'Characters',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: convertInchesToTwip(0.5), after: convertInchesToTwip(0.25) },
      })
    );

    const characters = storyBible.characters || [];
    if (Array.isArray(characters)) {
      for (const char of characters) {
        paragraphs.push(
          new Paragraph({
            text: char.name || 'Unnamed Character',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: convertInchesToTwip(0.25), after: convertInchesToTwip(0.1) },
          })
        );

        if (char.role) {
          paragraphs.push(new Paragraph({ text: `Role: ${char.role}` }));
        }

        if (char.description) {
          paragraphs.push(new Paragraph({ text: `Description: ${char.description}` }));
        }

        if (char.traits && Array.isArray(char.traits)) {
          paragraphs.push(new Paragraph({ text: `Traits: ${char.traits.join(', ')}` }));
        }

        if (char.voiceSample) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Voice Sample: "', italics: false }),
                new TextRun({ text: char.voiceSample, italics: true }),
                new TextRun({ text: '"', italics: false }),
              ],
              spacing: { after: convertInchesToTwip(0.2) },
            })
          );
        }
      }
    }

    // World Elements Section
    paragraphs.push(
      new Paragraph({
        text: 'World Elements',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: convertInchesToTwip(0.5), after: convertInchesToTwip(0.25) },
      })
    );

    const world = storyBible.world || [];
    if (Array.isArray(world)) {
      for (const element of world) {
        paragraphs.push(
          new Paragraph({
            text: element.name || 'Unnamed Element',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: convertInchesToTwip(0.25), after: convertInchesToTwip(0.1) },
          })
        );

        if (element.type) {
          paragraphs.push(new Paragraph({ text: `Type: ${element.type}` }));
        }

        if (element.description) {
          paragraphs.push(new Paragraph({ text: element.description, spacing: { after: convertInchesToTwip(0.2) } }));
        }
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          children: paragraphs,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }
}

export const exportService = new ExportService();
