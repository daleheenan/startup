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
}

export class ExportService {
  /**
   * Generate DOCX file for a project
   */
  async generateDOCX(projectId: string): Promise<Buffer> {
    // Get project and chapters
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project;
    if (!project) {
      throw new Error('Project not found');
    }

    const chapters = db.prepare(`
      SELECT c.* FROM chapters c
      JOIN books b ON c.book_id = b.id
      WHERE b.project_id = ?
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
              text: 'by Your Name',
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

    // Chapter content - split into paragraphs
    const contentParagraphs = chapter.content.split('\n\n');
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
   */
  async generatePDF(projectId: string): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        // Get project and chapters
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Project;
        if (!project) {
          throw new Error('Project not found');
        }

        const chapters = db.prepare(`
          SELECT c.* FROM chapters c
          JOIN books b ON c.book_id = b.id
          WHERE b.project_id = ?
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
        doc.fontSize(14).text('by Your Name', {
          align: 'center',
        });
        doc.moveDown();
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

          // Chapter content
          const contentParagraphs = chapter.content.split('\n\n');
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
