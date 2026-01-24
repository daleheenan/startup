'use client';

import { useState } from 'react';

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
      const response = await fetch(`http://localhost:3001/api/export/docx/${projectId}`);
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
      const response = await fetch(`http://localhost:3001/api/export/pdf/${projectId}`);
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
      const response = await fetch(`http://localhost:3001/api/export/story-bible/${projectId}`);
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
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '2rem',
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ededed' }}>
        Export
      </h2>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <button
          onClick={handleExportDocx}
          disabled={exportingDocx}
          style={{
            padding: '1rem',
            background: exportingDocx
              ? 'rgba(102, 126, 234, 0.5)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: exportingDocx ? 'not-allowed' : 'pointer',
            opacity: exportingDocx ? 0.7 : 1,
          }}
        >
          {exportingDocx ? 'Generating DOCX...' : 'Export as DOCX (Microsoft Word)'}
        </button>

        <button
          onClick={handleExportPdf}
          disabled={exportingPdf}
          style={{
            padding: '1rem',
            background: exportingPdf
              ? 'rgba(102, 126, 234, 0.5)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: exportingPdf ? 'not-allowed' : 'pointer',
            opacity: exportingPdf ? 0.7 : 1,
          }}
        >
          {exportingPdf ? 'Generating PDF...' : 'Export as PDF (Print-Ready)'}
        </button>

        <button
          onClick={handleExportStoryBible}
          disabled={exportingBible}
          style={{
            padding: '1rem',
            background: exportingBible
              ? 'rgba(16, 185, 129, 0.5)'
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: exportingBible ? 'not-allowed' : 'pointer',
            opacity: exportingBible ? 0.7 : 1,
          }}
        >
          {exportingBible ? 'Generating Story Bible...' : 'Export Story Bible (DOCX)'}
        </button>
      </div>
    </div>
  );
}
