'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, logout } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ChapterEditorProps {
  chapterId: string;
  onClose?: () => void;
}

interface ChapterEdit {
  id: string;
  chapter_id: string;
  edited_content: string;
  word_count: number;
  is_locked: number;
  edit_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ChapterEditResponse {
  chapterId: string;
  hasEdit: boolean;
  edit: ChapterEdit | null;
  original: {
    content: string;
    wordCount: number;
  };
}

export default function ChapterEditor({ chapterId, onClose }: ChapterEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const fetchChapterData = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/editing/chapters/${chapterId}/edit`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          logout();
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch chapter');
      }

      const data: ChapterEditResponse = await res.json();

      setOriginalContent(data.original.content);

      if (data.hasEdit && data.edit) {
        setContent(data.edit.edited_content);
        setIsLocked(data.edit.is_locked === 1);
        setEditNotes(data.edit.edit_notes || '');
      } else {
        setContent(data.original.content);
        setIsLocked(false);
        setEditNotes('');
      }

      calculateWordCount(data.hasEdit && data.edit ? data.edit.edited_content : data.original.content);
    } catch (error) {
      console.error('Error fetching chapter:', error);
      alert('Failed to load chapter');
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    fetchChapterData();
  }, [fetchChapterData]);

  const calculateWordCount = (text: string) => {
    const count = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    setWordCount(count);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    calculateWordCount(newContent);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/editing/chapters/${chapterId}/edit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          isLocked,
          editNotes,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save edit');
      }

      setHasUnsavedChanges(false);
      alert('Chapter saved successfully');
    } catch (error) {
      console.error('Error saving chapter:', error);
      alert('Failed to save chapter');
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to revert to the original version? This will delete all your edits.'
    );

    if (!confirmed) return;

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/editing/chapters/${chapterId}/edit`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to revert');
      }

      setContent(originalContent);
      setIsLocked(false);
      setEditNotes('');
      setHasUnsavedChanges(false);
      calculateWordCount(originalContent);
      alert('Reverted to original version');
    } catch (error) {
      console.error('Error reverting:', error);
      alert('Failed to revert');
    }
  };

  const handleToggleLock = async () => {
    try {
      const token = getToken();
      const newLockState = !isLocked;

      const res = await fetch(`${API_BASE_URL}/api/editing/chapters/${chapterId}/lock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isLocked: newLockState }),
      });

      if (!res.ok) {
        throw new Error('Failed to toggle lock');
      }

      setIsLocked(newLockState);
      alert(newLockState ? 'Chapter locked from regeneration' : 'Chapter unlocked');
    } catch (error) {
      console.error('Error toggling lock:', error);
      alert('Failed to toggle lock');
    }
  };

  const handleFindReplace = () => {
    const find = prompt('Find text:');
    if (!find) return;

    const replace = prompt('Replace with:');
    if (replace === null) return;

    const newContent = content.split(find).join(replace);
    setContent(newContent);
    calculateWordCount(newContent);
    setHasUnsavedChanges(true);
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading chapter...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Chapter Editor</h2>
        <div style={styles.toolbar}>
          <button
            onClick={() => setEditMode(!editMode)}
            style={{...styles.button, ...styles.buttonPrimary}}
          >
            {editMode ? 'View Mode' : 'Edit Mode'}
          </button>

          {editMode && (
            <>
              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || saving}
                style={{
                  ...styles.button,
                  ...styles.buttonSuccess,
                  ...((!hasUnsavedChanges || saving) && styles.buttonDisabled),
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>

              <button
                onClick={handleRevert}
                style={{...styles.button, ...styles.buttonDanger}}
              >
                Revert to Original
              </button>

              <button
                onClick={handleFindReplace}
                style={styles.button}
              >
                Find & Replace
              </button>
            </>
          )}

          <button
            onClick={handleToggleLock}
            style={{
              ...styles.button,
              ...(isLocked ? styles.buttonWarning : styles.buttonSecondary),
            }}
          >
            {isLocked ? '🔒 Locked' : '🔓 Unlocked'}
          </button>

          {onClose && (
            <button onClick={onClose} style={styles.button}>
              Close
            </button>
          )}
        </div>
      </div>

      <div style={styles.stats}>
        <span>Word Count: {wordCount}</span>
        {hasUnsavedChanges && <span style={styles.unsaved}>• Unsaved changes</span>}
        {isLocked && <span style={styles.locked}>• Protected from regeneration</span>}
      </div>

      {editMode ? (
        <div style={styles.editorContainer}>
          <textarea
            value={content}
            onChange={handleContentChange}
            style={styles.textarea}
            placeholder="Start editing..."
          />

          <div style={styles.notesContainer}>
            <label style={styles.label}>
              Edit Notes (optional):
              <textarea
                value={editNotes}
                onChange={(e) => {
                  setEditNotes(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                style={styles.notesTextarea}
                placeholder="Add notes about your changes..."
              />
            </label>
          </div>
        </div>
      ) : (
        <div style={styles.viewContainer}>
          <div style={styles.content}>
            {content.split('\n').map((paragraph, index) => (
              <p key={index} style={styles.paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    color: '#666',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
    color: '#1A1A2E',
  },
  toolbar: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  stats: {
    display: 'flex',
    gap: '16px',
    padding: '12px',
    backgroundColor: '#F8FAFC',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#666',
  },
  unsaved: {
    color: '#F59E0B',
    fontWeight: 600,
  },
  locked: {
    color: '#10B981',
    fontWeight: 600,
  },
  button: {
    padding: '8px 16px',
    borderRadius: '4px',
    border: '1px solid #D1D5DB',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  buttonPrimary: {
    backgroundColor: '#3B82F6',
    color: '#fff',
    border: 'none',
  },
  buttonSuccess: {
    backgroundColor: '#10B981',
    color: '#fff',
    border: 'none',
  },
  buttonDanger: {
    backgroundColor: '#EF4444',
    color: '#fff',
    border: 'none',
  },
  buttonWarning: {
    backgroundColor: '#F59E0B',
    color: '#fff',
    border: 'none',
  },
  buttonSecondary: {
    backgroundColor: '#6B7280',
    color: '#fff',
    border: 'none',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  editorContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  textarea: {
    width: '100%',
    minHeight: '500px',
    padding: '16px',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    fontSize: '16px',
    lineHeight: '1.6',
    fontFamily: 'Georgia, serif',
    resize: 'vertical',
  },
  notesContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  notesTextarea: {
    width: '100%',
    minHeight: '80px',
    padding: '8px',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    resize: 'vertical',
  },
  viewContainer: {
    padding: '16px',
    backgroundColor: '#FAFAFA',
    borderRadius: '4px',
    minHeight: '500px',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  paragraph: {
    fontSize: '18px',
    lineHeight: '1.8',
    fontFamily: 'Georgia, serif',
    color: '#1A1A2E',
    marginBottom: '16px',
  },
};
