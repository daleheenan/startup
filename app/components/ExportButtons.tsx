'use client';

import { useState } from 'react';
import { getToken } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ExportButtonsProps {
  projectId: string;
}

export default function ExportButtons({ projectId }: ExportButtonsProps) {
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingBible, setExportingBible] = useState(false);

  const handleExportDocx = async () => {
    setExportingDocx(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/export/docx/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manuscript-${projectId}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      alert('Failed to export DOCX');
    } finally {
      setExportingDocx(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/export/pdf/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manuscript-${projectId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportStoryBible = async () => {
    setExportingBible(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/export/story-bible/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `story-bible-${projectId}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting Story Bible:', error);
      alert('Failed to export Story Bible');
    } finally {
      setExportingBible(false);
    }
  };

  return (
    <section
      id="export"
      aria-labelledby="export-heading"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '2rem',
      }}>
      <h2
        id="export-heading"
        style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#FFFFFF' }}>
        Export
      </h2>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <button
          onClick={handleExportDocx}
          disabled={exportingDocx}
          aria-label={exportingDocx ? 'Generating DOCX file, please wait' : 'Export manuscript as DOCX file for Microsoft Word'}
          aria-busy={exportingDocx}
          style={{
            padding: '1rem',
            minHeight: '44px',
            background: exportingDocx
              ? 'rgba(102, 126, 234, 0.5)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: exportingDocx ? 'not-allowed' : 'pointer',
            opacity: exportingDocx ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
          onFocus={(e) => {
            if (!exportingDocx) {
              e.currentTarget.style.outline = '2px solid #FFFFFF';
              e.currentTarget.style.outlineOffset = '2px';
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          {exportingDocx ? 'Generating DOCX...' : 'Export as DOCX (Microsoft Word)'}
        </button>

        <button
          onClick={handleExportPdf}
          disabled={exportingPdf}
          aria-label={exportingPdf ? 'Generating PDF file, please wait' : 'Export manuscript as PDF file for printing'}
          aria-busy={exportingPdf}
          style={{
            padding: '1rem',
            minHeight: '44px',
            background: exportingPdf
              ? 'rgba(102, 126, 234, 0.5)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: exportingPdf ? 'not-allowed' : 'pointer',
            opacity: exportingPdf ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
          onFocus={(e) => {
            if (!exportingPdf) {
              e.currentTarget.style.outline = '2px solid #FFFFFF';
              e.currentTarget.style.outlineOffset = '2px';
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          {exportingPdf ? 'Generating PDF...' : 'Export as PDF (Print-Ready)'}
        </button>

        <button
          onClick={handleExportStoryBible}
          disabled={exportingBible}
          aria-label={exportingBible ? 'Generating Story Bible, please wait' : 'Export Story Bible as DOCX file'}
          aria-busy={exportingBible}
          style={{
            padding: '1rem',
            minHeight: '44px',
            background: exportingBible
              ? 'rgba(5, 150, 105, 0.5)'
              : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: exportingBible ? 'not-allowed' : 'pointer',
            opacity: exportingBible ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
          onFocus={(e) => {
            if (!exportingBible) {
              e.currentTarget.style.outline = '2px solid #FFFFFF';
              e.currentTarget.style.outlineOffset = '2px';
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          {exportingBible ? 'Generating Story Bible...' : 'Export Story Bible (DOCX)'}
        </button>
      </div>
    </section>
  );
}
