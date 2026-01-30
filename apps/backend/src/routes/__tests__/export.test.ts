import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock the export service
const mockGenerateDOCX = jest.fn<() => Promise<Buffer>>();
const mockGeneratePDF = jest.fn<() => Promise<Buffer>>();
const mockGenerateStoryBibleDOCX = jest.fn<() => Promise<Buffer>>();

jest.mock('../../services/export.service.js', () => ({
  exportService: {
    generateDOCX: mockGenerateDOCX,
    generatePDF: mockGeneratePDF,
    generateStoryBibleDOCX: mockGenerateStoryBibleDOCX,
  },
}));

// Mock logger to prevent console output
jest.mock('../../services/logger.service.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('Export Router', () => {
  let app: express.Application;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());

    const exportRouter = (await import('../export.js')).default;
    app.use('/api/export', exportRouter);
  });

  describe('GET /api/export/docx/:projectId', () => {
    const projectId = 'project-123';

    it('should export project as DOCX successfully', async () => {
      const mockBuffer = Buffer.from('mock docx content');
      mockGenerateDOCX.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/docx/${projectId}`)
        .expect(200);

      expect(response.header['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.header['content-disposition']).toBe(`attachment; filename="manuscript-${projectId}.docx"`);
      expect(mockGenerateDOCX).toHaveBeenCalledWith(projectId);
      // Response body will be a buffer but supertest parses it differently
      expect(response.status).toBe(200);
    });

    it('should handle special characters in projectId', async () => {
      const specialProjectId = 'project-abc-123-xyz';
      const mockBuffer = Buffer.from('mock docx content');
      mockGenerateDOCX.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/docx/${specialProjectId}`)
        .expect(200);

      expect(response.header['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.header['content-disposition']).toBe(`attachment; filename="manuscript-${specialProjectId}.docx"`);
      expect(mockGenerateDOCX).toHaveBeenCalledWith(specialProjectId);
    });

    it('should return 500 when project not found', async () => {
      mockGenerateDOCX.mockRejectedValue(new Error('Project not found'));

      const response = await request(app)
        .get(`/api/export/docx/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate DOCX');
      expect(response.body.message).toBe('Project not found');
      expect(mockGenerateDOCX).toHaveBeenCalledWith(projectId);
    });

    it('should return 500 when no chapters found', async () => {
      mockGenerateDOCX.mockRejectedValue(new Error('No chapters found for project'));

      const response = await request(app)
        .get(`/api/export/docx/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate DOCX');
      expect(response.body.message).toBe('No chapters found for project');
    });

    it('should return 500 when service throws error without message', async () => {
      mockGenerateDOCX.mockRejectedValue(new Error());

      const response = await request(app)
        .get(`/api/export/docx/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate DOCX');
      expect(response.body.message).toBe('');
    });

    it('should return 500 when service throws non-Error object', async () => {
      mockGenerateDOCX.mockRejectedValue('String error');

      const response = await request(app)
        .get(`/api/export/docx/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate DOCX');
      expect(response.body.message).toBe('Unknown error');
    });

    it('should handle database connection errors', async () => {
      mockGenerateDOCX.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/export/docx/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate DOCX');
      expect(response.body.message).toBe('Database connection failed');
    });

    it('should return buffer content in response body', async () => {
      const mockContent = 'Test DOCX content with special chars: £€¥';
      const mockBuffer = Buffer.from(mockContent);
      mockGenerateDOCX.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/docx/${projectId}`)
        .expect(200);

      // Supertest automatically parses response, verify headers and status instead
      expect(response.header['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(mockGenerateDOCX).toHaveBeenCalledWith(projectId);
    });
  });

  describe('GET /api/export/pdf/:projectId', () => {
    const projectId = 'project-456';

    it('should export project as PDF successfully', async () => {
      const mockBuffer = Buffer.from('mock pdf content');
      mockGeneratePDF.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/pdf/${projectId}`)
        .expect(200);

      expect(response.header['content-type']).toBe('application/pdf');
      expect(response.header['content-disposition']).toBe(`attachment; filename="manuscript-${projectId}.pdf"`);
      expect(response.body).toEqual(mockBuffer);
      expect(mockGeneratePDF).toHaveBeenCalledWith(projectId);
    });

    it('should handle UUID format projectId', async () => {
      const uuidProjectId = '550e8400-e29b-41d4-a716-446655440000';
      const mockBuffer = Buffer.from('mock pdf content');
      mockGeneratePDF.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/pdf/${uuidProjectId}`)
        .expect(200);

      expect(response.header['content-type']).toBe('application/pdf');
      expect(response.header['content-disposition']).toBe(`attachment; filename="manuscript-${uuidProjectId}.pdf"`);
      expect(mockGeneratePDF).toHaveBeenCalledWith(uuidProjectId);
    });

    it('should return 500 when project not found', async () => {
      mockGeneratePDF.mockRejectedValue(new Error('Project not found'));

      const response = await request(app)
        .get(`/api/export/pdf/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate PDF');
      expect(response.body.message).toBe('Project not found');
      expect(mockGeneratePDF).toHaveBeenCalledWith(projectId);
    });

    it('should return 500 when no chapters found', async () => {
      mockGeneratePDF.mockRejectedValue(new Error('No chapters found for project'));

      const response = await request(app)
        .get(`/api/export/pdf/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate PDF');
      expect(response.body.message).toBe('No chapters found for project');
    });

    it('should return 500 when PDF generation fails', async () => {
      mockGeneratePDF.mockRejectedValue(new Error('PDF rendering error'));

      const response = await request(app)
        .get(`/api/export/pdf/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate PDF');
      expect(response.body.message).toBe('PDF rendering error');
    });

    it('should return 500 when service throws error without message', async () => {
      mockGeneratePDF.mockRejectedValue(new Error());

      const response = await request(app)
        .get(`/api/export/pdf/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate PDF');
      expect(response.body.message).toBe('');
    });

    it('should return 500 when service throws non-Error object', async () => {
      mockGeneratePDF.mockRejectedValue({ code: 'UNKNOWN' });

      const response = await request(app)
        .get(`/api/export/pdf/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate PDF');
      expect(response.body.message).toBe('Unknown error');
    });

    it('should handle empty buffer response', async () => {
      const emptyBuffer = Buffer.from('');
      mockGeneratePDF.mockResolvedValue(emptyBuffer);

      const response = await request(app)
        .get(`/api/export/pdf/${projectId}`)
        .expect(200);

      expect(response.body).toEqual(emptyBuffer);
      expect(response.body.length).toBe(0);
    });

    it('should handle large PDF buffer', async () => {
      // Create a large buffer (1MB)
      const largeBuffer = Buffer.alloc(1024 * 1024, 'a');
      mockGeneratePDF.mockResolvedValue(largeBuffer);

      const response = await request(app)
        .get(`/api/export/pdf/${projectId}`)
        .expect(200);

      expect(Buffer.isBuffer(response.body)).toBe(true);
      expect(response.body.length).toBe(1024 * 1024);
    });
  });

  describe('GET /api/export/story-bible/:projectId', () => {
    const projectId = 'project-789';

    it('should export story bible as DOCX successfully', async () => {
      const mockBuffer = Buffer.from('mock story bible docx content');
      mockGenerateStoryBibleDOCX.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/story-bible/${projectId}`)
        .expect(200);

      expect(response.header['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.header['content-disposition']).toBe(`attachment; filename="story-bible-${projectId}.docx"`);
      expect(mockGenerateStoryBibleDOCX).toHaveBeenCalledWith(projectId);
      expect(response.status).toBe(200);
    });

    it('should handle different projectId formats', async () => {
      const customProjectId = 'custom-project-id-2024';
      const mockBuffer = Buffer.from('mock story bible content');
      mockGenerateStoryBibleDOCX.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/story-bible/${customProjectId}`)
        .expect(200);

      expect(response.header['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.header['content-disposition']).toBe(`attachment; filename="story-bible-${customProjectId}.docx"`);
      expect(mockGenerateStoryBibleDOCX).toHaveBeenCalledWith(customProjectId);
    });

    it('should return 500 when project not found', async () => {
      mockGenerateStoryBibleDOCX.mockRejectedValue(new Error('Project not found'));

      const response = await request(app)
        .get(`/api/export/story-bible/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate Story Bible');
      expect(response.body.message).toBe('Project not found');
      expect(mockGenerateStoryBibleDOCX).toHaveBeenCalledWith(projectId);
    });

    it('should return 500 when story bible data is missing', async () => {
      mockGenerateStoryBibleDOCX.mockRejectedValue(new Error('Story bible not initialised'));

      const response = await request(app)
        .get(`/api/export/story-bible/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate Story Bible');
      expect(response.body.message).toBe('Story bible not initialised');
    });

    it('should return 500 when service throws error without message', async () => {
      mockGenerateStoryBibleDOCX.mockRejectedValue(new Error());

      const response = await request(app)
        .get(`/api/export/story-bible/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate Story Bible');
      expect(response.body.message).toBe('');
    });

    it('should return 500 when service throws non-Error object', async () => {
      mockGenerateStoryBibleDOCX.mockRejectedValue(null);

      const response = await request(app)
        .get(`/api/export/story-bible/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate Story Bible');
      expect(response.body.message).toBe('Unknown error');
    });

    it('should handle export with empty story bible', async () => {
      const mockBuffer = Buffer.from('empty story bible template');
      mockGenerateStoryBibleDOCX.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/story-bible/${projectId}`)
        .expect(200);

      expect(response.header['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(mockGenerateStoryBibleDOCX).toHaveBeenCalledWith(projectId);
    });

    it('should return buffer content in response body', async () => {
      const mockContent = 'Story Bible DOCX with Unicode: 日本語';
      const mockBuffer = Buffer.from(mockContent);
      mockGenerateStoryBibleDOCX.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/story-bible/${projectId}`)
        .expect(200);

      // Verify headers and service was called correctly
      expect(response.header['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(mockGenerateStoryBibleDOCX).toHaveBeenCalledWith(projectId);
    });
  });

  describe('Content-Type and Content-Disposition Headers', () => {
    const projectId = 'header-test-project';

    it('should set correct headers for DOCX export', async () => {
      const mockBuffer = Buffer.from('test');
      mockGenerateDOCX.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/docx/${projectId}`)
        .expect(200);

      expect(response.header['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.header['content-disposition']).toMatch(/^attachment; filename="manuscript-/);
      expect(response.header['content-disposition']).toContain('.docx"');
    });

    it('should set correct headers for PDF export', async () => {
      const mockBuffer = Buffer.from('test');
      mockGeneratePDF.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/pdf/${projectId}`)
        .expect(200);

      expect(response.header['content-type']).toBe('application/pdf');
      expect(response.header['content-disposition']).toMatch(/^attachment; filename="manuscript-/);
      expect(response.header['content-disposition']).toContain('.pdf"');
    });

    it('should set correct headers for Story Bible export', async () => {
      const mockBuffer = Buffer.from('test');
      mockGenerateStoryBibleDOCX.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/story-bible/${projectId}`)
        .expect(200);

      expect(response.header['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.header['content-disposition']).toMatch(/^attachment; filename="story-bible-/);
      expect(response.header['content-disposition']).toContain('.docx"');
    });

    it('should include projectId in filename for DOCX', async () => {
      const mockBuffer = Buffer.from('test');
      mockGenerateDOCX.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/docx/${projectId}`)
        .expect(200);

      expect(response.header['content-disposition']).toBe(`attachment; filename="manuscript-${projectId}.docx"`);
    });

    it('should include projectId in filename for PDF', async () => {
      const mockBuffer = Buffer.from('test');
      mockGeneratePDF.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/pdf/${projectId}`)
        .expect(200);

      expect(response.header['content-disposition']).toBe(`attachment; filename="manuscript-${projectId}.pdf"`);
    });

    it('should include projectId in filename for Story Bible', async () => {
      const mockBuffer = Buffer.from('test');
      mockGenerateStoryBibleDOCX.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/story-bible/${projectId}`)
        .expect(200);

      expect(response.header['content-disposition']).toBe(`attachment; filename="story-bible-${projectId}.docx"`);
    });
  });

  describe('Error Response Format', () => {
    const projectId = 'error-test-project';

    it('should return consistent error format for DOCX errors', async () => {
      mockGenerateDOCX.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get(`/api/export/docx/${projectId}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Failed to generate DOCX');
      expect(response.body.message).toBe('Test error');
    });

    it('should return consistent error format for PDF errors', async () => {
      mockGeneratePDF.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get(`/api/export/pdf/${projectId}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Failed to generate PDF');
      expect(response.body.message).toBe('Test error');
    });

    it('should return consistent error format for Story Bible errors', async () => {
      mockGenerateStoryBibleDOCX.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get(`/api/export/story-bible/${projectId}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Failed to generate Story Bible');
      expect(response.body.message).toBe('Test error');
    });

    it('should handle null error message for DOCX', async () => {
      mockGenerateDOCX.mockRejectedValue(null);

      const response = await request(app)
        .get(`/api/export/docx/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate DOCX');
      expect(response.body.message).toBe('Unknown error');
    });

    it('should handle undefined error message for PDF', async () => {
      mockGeneratePDF.mockRejectedValue(undefined);

      const response = await request(app)
        .get(`/api/export/pdf/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate PDF');
      expect(response.body.message).toBe('Unknown error');
    });

    it('should handle number as error for Story Bible', async () => {
      mockGenerateStoryBibleDOCX.mockRejectedValue(500);

      const response = await request(app)
        .get(`/api/export/story-bible/${projectId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to generate Story Bible');
      expect(response.body.message).toBe('Unknown error');
    });
  });

  describe('Concurrent Export Requests', () => {
    const projectId1 = 'concurrent-project-1';
    const projectId2 = 'concurrent-project-2';

    it('should handle concurrent DOCX export requests', async () => {
      const mockBuffer1 = Buffer.from('project 1 content');
      const mockBuffer2 = Buffer.from('project 2 content');

      mockGenerateDOCX
        .mockResolvedValueOnce(mockBuffer1)
        .mockResolvedValueOnce(mockBuffer2);

      const [response1, response2] = await Promise.all([
        request(app).get(`/api/export/docx/${projectId1}`),
        request(app).get(`/api/export/docx/${projectId2}`),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.header['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response2.header['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(mockGenerateDOCX).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent PDF export requests', async () => {
      const mockBuffer1 = Buffer.from('pdf 1 content');
      const mockBuffer2 = Buffer.from('pdf 2 content');

      mockGeneratePDF
        .mockResolvedValueOnce(mockBuffer1)
        .mockResolvedValueOnce(mockBuffer2);

      const [response1, response2] = await Promise.all([
        request(app).get(`/api/export/pdf/${projectId1}`),
        request(app).get(`/api/export/pdf/${projectId2}`),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body).toEqual(mockBuffer1);
      expect(response2.body).toEqual(mockBuffer2);
    });

    it('should handle mixed concurrent export requests', async () => {
      const mockDOCXBuffer = Buffer.from('docx content');
      const mockPDFBuffer = Buffer.from('pdf content');
      const mockStoryBibleBuffer = Buffer.from('story bible content');

      mockGenerateDOCX.mockResolvedValue(mockDOCXBuffer);
      mockGeneratePDF.mockResolvedValue(mockPDFBuffer);
      mockGenerateStoryBibleDOCX.mockResolvedValue(mockStoryBibleBuffer);

      const [response1, response2, response3] = await Promise.all([
        request(app).get(`/api/export/docx/${projectId1}`),
        request(app).get(`/api/export/pdf/${projectId1}`),
        request(app).get(`/api/export/story-bible/${projectId1}`),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response3.status).toBe(200);
      expect(response1.header['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response2.header['content-type']).toBe('application/pdf');
      expect(response3.header['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long project IDs in DOCX export', async () => {
      const longProjectId = 'a'.repeat(500);
      const mockBuffer = Buffer.from('test');
      mockGenerateDOCX.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/docx/${longProjectId}`)
        .expect(200);

      expect(response.header['content-disposition']).toContain(longProjectId);
      expect(mockGenerateDOCX).toHaveBeenCalledWith(longProjectId);
    });

    it('should handle project ID with URL-encoded characters', async () => {
      const encodedProjectId = 'project%20with%20spaces';
      const decodedProjectId = 'project with spaces'; // Express decodes URL parameters
      const mockBuffer = Buffer.from('test');
      mockGeneratePDF.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get(`/api/export/pdf/${encodedProjectId}`)
        .expect(200);

      // Express automatically decodes URL parameters
      expect(mockGeneratePDF).toHaveBeenCalledWith(decodedProjectId);
    });

    it('should handle timeout scenario for DOCX generation', async () => {
      mockGenerateDOCX.mockRejectedValue(new Error('Request timeout'));

      const response = await request(app)
        .get('/api/export/docx/slow-project')
        .expect(500);

      expect(response.body.error).toBe('Failed to generate DOCX');
      expect(response.body.message).toBe('Request timeout');
    });

    it('should handle timeout scenario for PDF generation', async () => {
      mockGeneratePDF.mockRejectedValue(new Error('PDF generation timeout'));

      const response = await request(app)
        .get('/api/export/pdf/large-project')
        .expect(500);

      expect(response.body.error).toBe('Failed to generate PDF');
      expect(response.body.message).toBe('PDF generation timeout');
    });
  });
});
