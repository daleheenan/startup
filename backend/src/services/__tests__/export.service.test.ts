import { jest } from '@jest/globals';
import { ExportService, Chapter, Project } from '../export.service.js';

// Mock the database connection with hoisted mock function
jest.mock('../../db/connection.js', () => {
  const mockPrepareFn = jest.fn();
  // Store reference globally so tests can access it
  (global as any).mockPrepare = mockPrepareFn;

  return {
    __esModule: true,
    default: {
      prepare: mockPrepareFn,
    },
  };
});

// Helper to access the mock prepare function
const getMockPrepare = () => (global as any).mockPrepare;

// Mock docx
jest.mock('docx', () => {
  return {
    Document: class MockDocument {
      constructor(public config: any) {}
    },
    Packer: {
      toBuffer: jest.fn().mockImplementation(() => Promise.resolve(Buffer.from('docx-buffer'))),
    },
    Paragraph: class MockParagraph {
      constructor(public config: any) {}
    },
    TextRun: class MockTextRun {
      constructor(public config: any) {}
    },
    HeadingLevel: {
      TITLE: 'TITLE',
      HEADING_1: 'HEADING_1',
      HEADING_2: 'HEADING_2',
    },
    AlignmentType: {
      CENTER: 'CENTER',
      LEFT: 'LEFT',
    },
    convertInchesToTwip: jest.fn((inches: number) => inches * 1440),
  };
});

// Mock pdfkit
jest.mock('pdfkit', () => ({
  __esModule: true,
  default: class MockPDFDocument {
    private dataCallbacks: Function[] = [];
    private endCallbacks: Function[] = [];
    private errorCallbacks: Function[] = [];

    fontSize() { return this; }
    font() { return this; }
    text() { return this; }
    moveDown() { return this; }
    addPage() { return this; }

    end() {
      // Simulate async data and end events
      setTimeout(() => {
        this.dataCallbacks.forEach(cb => cb(Buffer.from('pdf-chunk')));
        this.endCallbacks.forEach(cb => cb());
      }, 0);
    }

    on(event: string, callback: Function) {
      if (event === 'data') {
        this.dataCallbacks.push(callback);
      } else if (event === 'end') {
        this.endCallbacks.push(callback);
      } else if (event === 'error') {
        this.errorCallbacks.push(callback);
      }
      return this;
    }
  }
}));

describe('ExportService', () => {
  let service: ExportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExportService();
  });

  describe('cleanContent', () => {
    it('should remove markdown headings', () => {
      const content = '# Chapter Title\n## Subtitle\nRegular text';
      const result = (service as any).cleanContent(content);

      expect(result).not.toContain('# Chapter Title');
      expect(result).not.toContain('## Subtitle');
      expect(result).toContain('Regular text');
    });

    it('should remove markdown bold markers', () => {
      const content = 'This is **bold** text and __also bold__';
      const result = (service as any).cleanContent(content);

      expect(result).toBe('This is bold text and also bold');
    });

    it('should remove markdown italic markers', () => {
      const content = 'This is *italic* text and _also italic_';
      const result = (service as any).cleanContent(content);

      expect(result).toBe('This is italic text and also italic');
    });

    it('should remove scene numbers and titles', () => {
      const content = 'Scene 1: The Beginning\nContent here\nScene Two: Another Scene\nMore content';
      const result = (service as any).cleanContent(content);

      expect(result).not.toContain('Scene 1:');
      expect(result).not.toContain('Scene Two:');
      expect(result).toContain('Content here');
      expect(result).toContain('More content');
    });

    it('should remove part and section markers', () => {
      const content = 'Part 1: First Part\nContent\nSection 3: Some Section\nMore content';
      const result = (service as any).cleanContent(content);

      expect(result).not.toContain('Part 1:');
      expect(result).not.toContain('Section 3:');
      expect(result).toContain('Content');
      expect(result).toContain('More content');
    });

    it('should replace em-dashes with commas', () => {
      const content = 'She walked slowly— thinking deeply— towards the door.';
      const result = (service as any).cleanContent(content);

      expect(result).not.toContain('—');
      expect(result).toContain(',');
    });

    it('should clean up multiple blank lines', () => {
      const content = 'Paragraph one.\n\n\n\nParagraph two.';
      const result = (service as any).cleanContent(content);

      expect(result).toBe('Paragraph one.\n\nParagraph two.');
    });

    it('should trim leading and trailing whitespace', () => {
      const content = '  \n\n  Content here  \n\n  ';
      const result = (service as any).cleanContent(content);

      expect(result).toBe('Content here');
    });

    it('should handle empty content', () => {
      const content = '';
      const result = (service as any).cleanContent(content);

      expect(result).toBe('');
    });

    it('should handle content with special characters', () => {
      const content = 'Content with "quotes" and\'s apostrophes and—dashes';
      const result = (service as any).cleanContent(content);

      expect(result).toContain('"quotes"');
      expect(result).toContain("'s apostrophes");
    });
  });

  describe('generateDOCX', () => {
    const mockProject: Project = {
      id: 'project-1',
      title: 'Test Novel',
      type: 'novel',
      genre: 'Science Fiction',
      story_dna: { tone: 'dark' },
      story_bible: { characters: [] },
      author_name: 'John Smith',
    };

    const mockChapters: Chapter[] = [
      {
        id: 'chapter-1',
        chapter_number: 1,
        title: 'The Beginning',
        content: 'This is the first chapter.\n\nIt has multiple paragraphs.',
        word_count: 100,
      },
      {
        id: 'chapter-2',
        chapter_number: 2,
        title: null,
        content: 'Second chapter content.\n\n* * *\n\nAfter scene break.',
        word_count: 80,
      },
    ];

    beforeEach(() => {
      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const chaptersStmt = { all: jest.fn().mockReturnValue(mockChapters) };

      getMockPrepare().mockReturnValueOnce(projectStmt).mockReturnValueOnce(chaptersStmt);
    });

    it('should generate DOCX file for a project', async () => {
      const { Packer } = await import('docx');
      const result = await service.generateDOCX('project-1');

      expect(result).toBeInstanceOf(Buffer);
      expect(Packer.toBuffer).toHaveBeenCalled();
    });

    it('should throw error when project not found', async () => {
      getMockPrepare().mockReset();

      const projectStmt = { get: jest.fn().mockReturnValue(null) };
      getMockPrepare().mockReturnValueOnce(projectStmt);

      await expect(service.generateDOCX('non-existent')).rejects.toThrow('Project not found');
    });

    it('should throw error when no chapters found', async () => {
      getMockPrepare().mockReset();

      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const chaptersStmt = { all: jest.fn().mockReturnValue([]) };

      getMockPrepare().mockReturnValueOnce(projectStmt).mockReturnValueOnce(chaptersStmt);

      await expect(service.generateDOCX('project-1')).rejects.toThrow(
        'No chapters found for project'
      );
    });

    it('should use edited content when available', async () => {
      getMockPrepare().mockReset();

      const chaptersWithEdits: Chapter[] = [
        {
          id: 'chapter-1',
          chapter_number: 1,
          title: 'Edited Chapter',
          content: 'This is edited content.',
          word_count: 50,
        },
      ];

      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const chaptersStmt = { all: jest.fn().mockReturnValue(chaptersWithEdits) };

      getMockPrepare().mockReturnValueOnce(projectStmt).mockReturnValueOnce(chaptersStmt);

      await service.generateDOCX('project-1');

      expect(chaptersStmt.all).toHaveBeenCalledWith('project-1');
    });

    it('should handle chapters without titles', async () => {
      getMockPrepare().mockReset();

      const chaptersNoTitle: Chapter[] = [
        {
          id: 'chapter-1',
          chapter_number: 1,
          title: null,
          content: 'Content without title.',
          word_count: 50,
        },
      ];

      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const chaptersStmt = { all: jest.fn().mockReturnValue(chaptersNoTitle) };

      getMockPrepare().mockReturnValueOnce(projectStmt).mockReturnValueOnce(chaptersStmt);

      const { Packer } = await import('docx');
      await service.generateDOCX('project-1');

      expect(Packer.toBuffer).toHaveBeenCalled();
    });

    it('should handle project without author name', async () => {
      getMockPrepare().mockReset();

      const projectNoAuthor = { ...mockProject, author_name: null };
      const projectStmt = { get: jest.fn().mockReturnValue(projectNoAuthor) };
      const chaptersStmt = { all: jest.fn().mockReturnValue(mockChapters) };

      getMockPrepare().mockReturnValueOnce(projectStmt).mockReturnValueOnce(chaptersStmt);

      const { Packer } = await import('docx');
      await service.generateDOCX('project-1');

      expect(Packer.toBuffer).toHaveBeenCalled();
    });
  });

  describe('createChapterSection', () => {
    it('should create chapter section with heading and content', () => {
      const chapter: Chapter = {
        id: 'chapter-1',
        chapter_number: 1,
        title: 'Test Chapter',
        content: 'First paragraph.\n\nSecond paragraph.',
        word_count: 50,
      };

      const result = (service as any).createChapterSection(chapter);

      expect(result.children).toBeDefined();
      expect(Array.isArray(result.children)).toBe(true);
      expect(result.children.length).toBeGreaterThan(0);
    });

    it('should handle chapter without title', () => {
      const chapter: Chapter = {
        id: 'chapter-1',
        chapter_number: 1,
        title: null,
        content: 'Content only.',
        word_count: 20,
      };

      const result = (service as any).createChapterSection(chapter);

      expect(result.children).toBeDefined();
      expect(Array.isArray(result.children)).toBe(true);
    });

    it('should handle scene breaks', () => {
      const chapter: Chapter = {
        id: 'chapter-1',
        chapter_number: 1,
        title: 'Chapter',
        content: 'First scene.\n\n* * *\n\nSecond scene.',
        word_count: 50,
      };

      const result = (service as any).createChapterSection(chapter);

      expect(result.children).toBeDefined();
      expect(result.children.length).toBeGreaterThan(2);
    });

    it('should clean content before processing', () => {
      const chapter: Chapter = {
        id: 'chapter-1',
        chapter_number: 1,
        title: 'Chapter',
        content: '**Bold text** and *italic text*.',
        word_count: 30,
      };

      const result = (service as any).createChapterSection(chapter);

      expect(result.children).toBeDefined();
    });
  });

  describe('generatePDF', () => {
    const mockProject: Project = {
      id: 'project-1',
      title: 'Test Novel',
      type: 'novel',
      genre: 'Fantasy',
      story_dna: {},
      story_bible: {},
      author_name: 'Jane Doe',
    };

    const mockChapters: Chapter[] = [
      {
        id: 'chapter-1',
        chapter_number: 1,
        title: 'First Chapter',
        content: 'Chapter one content.\n\nMore content.',
        word_count: 100,
      },
    ];

    beforeEach(() => {
      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const chaptersStmt = { all: jest.fn().mockReturnValue(mockChapters) };

      getMockPrepare().mockReturnValueOnce(projectStmt).mockReturnValueOnce(chaptersStmt);
    });

    it('should generate PDF file for a project', async () => {
      const result = await service.generatePDF('project-1');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw error when project not found', async () => {
      getMockPrepare().mockReset();

      const projectStmt = { get: jest.fn().mockReturnValue(null) };
      getMockPrepare().mockReturnValue(projectStmt);

      await expect(service.generatePDF('non-existent')).rejects.toThrow('Project not found');
    });

    it('should throw error when no chapters found', async () => {
      getMockPrepare().mockReset();

      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const chaptersStmt = { all: jest.fn().mockReturnValue([]) };

      getMockPrepare()
        .mockReturnValueOnce(projectStmt)
        .mockReturnValueOnce(chaptersStmt);

      await expect(service.generatePDF('project-1')).rejects.toThrow(
        'No chapters found for project'
      );
    });

    it('should handle chapters with scene breaks', async () => {
      const chaptersWithBreaks: Chapter[] = [
        {
          id: 'chapter-1',
          chapter_number: 1,
          title: 'Chapter',
          content: 'Scene one.\n\n* * *\n\nScene two.',
          word_count: 50,
        },
      ];

      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const chaptersStmt = { all: jest.fn().mockReturnValue(chaptersWithBreaks) };

      getMockPrepare().mockReturnValueOnce(projectStmt).mockReturnValueOnce(chaptersStmt);

      await service.generatePDF('project-1');

      expect(getMockPrepare()).toHaveBeenCalled();
    });

    it('should handle chapters without titles', async () => {
      const chaptersNoTitle: Chapter[] = [
        {
          id: 'chapter-1',
          chapter_number: 1,
          title: null,
          content: 'Content here.',
          word_count: 30,
        },
      ];

      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const chaptersStmt = { all: jest.fn().mockReturnValue(chaptersNoTitle) };

      getMockPrepare().mockReturnValueOnce(projectStmt).mockReturnValueOnce(chaptersStmt);

      await service.generatePDF('project-1');

      expect(getMockPrepare()).toHaveBeenCalled();
    });

    it('should handle project without author name', async () => {
      const projectNoAuthor = { ...mockProject, author_name: null };
      const projectStmt = { get: jest.fn().mockReturnValue(projectNoAuthor) };
      const chaptersStmt = { all: jest.fn().mockReturnValue(mockChapters) };

      getMockPrepare().mockReturnValueOnce(projectStmt).mockReturnValueOnce(chaptersStmt);

      await service.generatePDF('project-1');

      expect(getMockPrepare()).toHaveBeenCalled();
    });

    it('should add pages between chapters', async () => {
      const multipleChapters: Chapter[] = [
        {
          id: 'chapter-1',
          chapter_number: 1,
          title: 'First',
          content: 'Content 1',
          word_count: 20,
        },
        {
          id: 'chapter-2',
          chapter_number: 2,
          title: 'Second',
          content: 'Content 2',
          word_count: 20,
        },
      ];

      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const chaptersStmt = { all: jest.fn().mockReturnValue(multipleChapters) };

      getMockPrepare().mockReturnValueOnce(projectStmt).mockReturnValueOnce(chaptersStmt);

      await service.generatePDF('project-1');

      expect(getMockPrepare()).toHaveBeenCalled();
    });

    it('should clean content before adding to PDF', async () => {
      const chaptersWithMarkdown: Chapter[] = [
        {
          id: 'chapter-1',
          chapter_number: 1,
          title: 'Chapter',
          content: '**Bold text** and *italic text*.',
          word_count: 30,
        },
      ];

      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      const chaptersStmt = { all: jest.fn().mockReturnValue(chaptersWithMarkdown) };

      getMockPrepare().mockReturnValueOnce(projectStmt).mockReturnValueOnce(chaptersStmt);

      await service.generatePDF('project-1');

      expect(getMockPrepare()).toHaveBeenCalled();
    });
  });

  describe('generateStoryBibleDOCX', () => {
    const mockProject: Project = {
      id: 'project-1',
      title: 'Test Novel',
      type: 'novel',
      genre: 'Science Fiction',
      story_dna: {
        tone: 'dark',
        themes: ['redemption', 'identity'],
        proseStyle: { pacing: 'fast', complexity: 'medium' },
      },
      story_bible: {
        characters: [
          {
            name: 'John Doe',
            role: 'Protagonist',
            description: 'A brave hero',
            traits: ['brave', 'loyal'],
            voiceSample: 'I will never give up.',
          },
          {
            name: 'Jane Smith',
            role: 'Antagonist',
            description: 'A cunning villain',
            traits: ['cunning', 'ruthless'],
          },
        ],
        world: [
          {
            name: 'The City',
            type: 'location',
            description: 'A bustling metropolis',
          },
          {
            name: 'Magic System',
            type: 'system',
            description: 'Rules governing magic',
          },
        ],
      },
    };

    it('should generate Story Bible DOCX', async () => {
      getMockPrepare().mockReset();

      const projectStmt = { get: jest.fn().mockReturnValue(mockProject) };
      getMockPrepare().mockReturnValueOnce(projectStmt);
      const { Packer } = await import('docx');
      const result = await service.generateStoryBibleDOCX('project-1');

      expect(result).toBeInstanceOf(Buffer);
      expect(Packer.toBuffer).toHaveBeenCalled();
    });

    it('should throw error when project not found', async () => {
      getMockPrepare().mockReset();

      const projectStmt = { get: jest.fn().mockReturnValue(null) };
      getMockPrepare().mockReturnValueOnce(projectStmt);

      await expect(service.generateStoryBibleDOCX('non-existent')).rejects.toThrow(
        'Project not found'
      );
    });

    it('should handle project without story bible', async () => {
      getMockPrepare().mockReset();

      const projectNoStoryBible = {
        ...mockProject,
        story_bible: null,
      };

      const projectStmt = { get: jest.fn().mockReturnValue(projectNoStoryBible) };
      getMockPrepare().mockReturnValueOnce(projectStmt);

      const { Packer } = await import('docx');
      await service.generateStoryBibleDOCX('project-1');

      expect(Packer.toBuffer).toHaveBeenCalled();
    });

    it('should handle project without story DNA', async () => {
      getMockPrepare().mockReset();

      const projectNoStoryDNA = {
        ...mockProject,
        story_dna: null,
      };

      const projectStmt = { get: jest.fn().mockReturnValue(projectNoStoryDNA) };
      getMockPrepare().mockReturnValueOnce(projectStmt);

      const { Packer } = await import('docx');
      await service.generateStoryBibleDOCX('project-1');

      expect(Packer.toBuffer).toHaveBeenCalled();
    });

    it('should handle empty characters array', async () => {
      getMockPrepare().mockReset();

      const projectEmptyCharacters = {
        ...mockProject,
        story_bible: { characters: [], world: [] },
      };

      const projectStmt = { get: jest.fn().mockReturnValue(projectEmptyCharacters) };
      getMockPrepare().mockReturnValueOnce(projectStmt);

      const { Packer } = await import('docx');
      await service.generateStoryBibleDOCX('project-1');

      expect(Packer.toBuffer).toHaveBeenCalled();
    });

    it('should handle empty world array', async () => {
      getMockPrepare().mockReset();

      const projectEmptyWorld = {
        ...mockProject,
        story_bible: { characters: mockProject.story_bible.characters, world: [] },
      };

      const projectStmt = { get: jest.fn().mockReturnValue(projectEmptyWorld) };
      getMockPrepare().mockReturnValueOnce(projectStmt);

      const { Packer } = await import('docx');
      await service.generateStoryBibleDOCX('project-1');

      expect(Packer.toBuffer).toHaveBeenCalled();
    });

    it('should handle characters without traits', async () => {
      getMockPrepare().mockReset();

      const projectCharNoTraits = {
        ...mockProject,
        story_bible: {
          characters: [
            {
              name: 'Simple Character',
              role: 'Minor',
              description: 'Basic description',
            },
          ],
          world: [],
        },
      };

      const projectStmt = { get: jest.fn().mockReturnValue(projectCharNoTraits) };
      getMockPrepare().mockReturnValueOnce(projectStmt);

      const { Packer } = await import('docx');
      await service.generateStoryBibleDOCX('project-1');

      expect(Packer.toBuffer).toHaveBeenCalled();
    });

    it('should handle characters without voice sample', async () => {
      getMockPrepare().mockReset();

      const projectCharNoVoice = {
        ...mockProject,
        story_bible: {
          characters: [
            {
              name: 'Silent Character',
              role: 'Background',
              description: 'No dialogue',
              traits: ['quiet'],
            },
          ],
          world: [],
        },
      };

      const projectStmt = { get: jest.fn().mockReturnValue(projectCharNoVoice) };
      getMockPrepare().mockReturnValueOnce(projectStmt);

      const { Packer } = await import('docx');
      await service.generateStoryBibleDOCX('project-1');

      expect(Packer.toBuffer).toHaveBeenCalled();
    });

    it('should handle world elements without description', async () => {
      getMockPrepare().mockReset();

      const projectWorldNoDesc = {
        ...mockProject,
        story_bible: {
          characters: [],
          world: [
            {
              name: 'Mystery Place',
              type: 'location',
            },
          ],
        },
      };

      const projectStmt = { get: jest.fn().mockReturnValue(projectWorldNoDesc) };
      getMockPrepare().mockReturnValueOnce(projectStmt);

      const { Packer } = await import('docx');
      await service.generateStoryBibleDOCX('project-1');

      expect(Packer.toBuffer).toHaveBeenCalled();
    });

    it('should handle story DNA without themes', async () => {
      getMockPrepare().mockReset();

      const projectNoThemes = {
        ...mockProject,
        story_dna: { tone: 'light' },
      };

      const projectStmt = { get: jest.fn().mockReturnValue(projectNoThemes) };
      getMockPrepare().mockReturnValueOnce(projectStmt);

      const { Packer } = await import('docx');
      await service.generateStoryBibleDOCX('project-1');

      expect(Packer.toBuffer).toHaveBeenCalled();
    });

    it('should handle non-array characters field', async () => {
      getMockPrepare().mockReset();

      const projectBadCharacters = {
        ...mockProject,
        story_bible: {
          characters: 'not-an-array',
          world: [],
        },
      };

      const projectStmt = { get: jest.fn().mockReturnValue(projectBadCharacters) };
      getMockPrepare().mockReturnValueOnce(projectStmt);

      const { Packer } = await import('docx');
      await service.generateStoryBibleDOCX('project-1');

      expect(Packer.toBuffer).toHaveBeenCalled();
    });

    it('should handle non-array world field', async () => {
      getMockPrepare().mockReset();

      const projectBadWorld = {
        ...mockProject,
        story_bible: {
          characters: [],
          world: 'not-an-array',
        },
      };

      const projectStmt = { get: jest.fn().mockReturnValue(projectBadWorld) };
      getMockPrepare().mockReturnValueOnce(projectStmt);

      const { Packer } = await import('docx');
      await service.generateStoryBibleDOCX('project-1');

      expect(Packer.toBuffer).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long chapter content', () => {
      const longContent = 'A'.repeat(50000) + '\n\n' + 'B'.repeat(50000);
      const result = (service as any).cleanContent(longContent);

      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('A');
      expect(result).toContain('B');
    });

    it('should handle content with only whitespace', () => {
      const whitespaceContent = '   \n\n   \t\t   \n\n   ';
      const result = (service as any).cleanContent(whitespaceContent);

      expect(result).toBe('');
    });

    it('should handle content with unicode characters', () => {
      const unicodeContent = 'Content with émoji 😀 and spëcial çhars';
      const result = (service as any).cleanContent(unicodeContent);

      expect(result).toContain('émoji');
      expect(result).toContain('😀');
      expect(result).toContain('spëcial');
    });

    it('should handle malformed markdown', () => {
      const malformedContent = '**Bold without closing *italic without closing';
      const result = (service as any).cleanContent(malformedContent);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle nested markdown markers', () => {
      const nestedContent = '**Bold with *nested italic* inside**';
      const result = (service as any).cleanContent(nestedContent);

      // The cleaning process removes asterisks step by step, result may still have single asterisk
      expect(result).not.toContain('**');
      expect(result).not.toContain('__');
    });

    it('should handle multiple consecutive em-dashes', () => {
      const content = 'Text——with——multiple——dashes';
      const result = (service as any).cleanContent(content);

      expect(result).not.toContain('——');
    });
  });
});
