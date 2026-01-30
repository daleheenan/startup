'use client';

import { useState, useEffect } from 'react';
import { getToken } from '../../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Lesson {
  id: string;
  agent_type: string;
  scope: string;
  category: string;
  title: string;
  content: string;
  score: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export default function LessonsAdminPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    agent: 'all',
    scope: 'all',
    category: 'all',
  });
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    fetchLessons();
  }, [filter]);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/lessons?limit=100`;

      if (filter.agent !== 'all') {
        url += `&agent_type=${filter.agent}`;
      }

      if (filter.scope !== 'all') {
        url += `&scope=${filter.scope}`;
      }

      if (filter.category !== 'all') {
        url += `&category=${filter.category}`;
      }

      const token = getToken();
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch lessons');
      }

      const data = await response.json();
      setLessons(data);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteLesson = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/lessons/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete lesson');
      }

      await fetchLessons();
      setSelectedLesson(null);
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Failed to delete lesson');
    }
  };

  const updateScore = async (id: string, increment: number) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/lessons/${id}/score`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ increment }),
      });

      if (!response.ok) {
        throw new Error('Failed to update score');
      }

      await fetchLessons();
    } catch (error) {
      console.error('Error updating score:', error);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: '#FAFAFA',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '600',
          color: '#212121',
          marginBottom: '1rem',
        }}>
          Agent Lessons Manager
        </h1>

        <p style={{
          fontSize: '0.875rem',
          color: '#757575',
          marginBottom: '2rem',
        }}>
          View and manage lessons learned by AI agents across all projects
        </p>

        {/* Filters */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '500',
              color: '#757575',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
            }}>
              Agent Type
            </label>
            <select
              value={filter.agent}
              onChange={(e) => setFilter({ ...filter, agent: e.target.value })}
              style={{
                padding: '0.5rem',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            >
              <option value="all">All Agents</option>
              <option value="author">Author</option>
              <option value="dev-editor">Developmental Editor</option>
              <option value="line-editor">Line Editor</option>
              <option value="continuity-editor">Continuity Editor</option>
              <option value="copy-editor">Copy Editor</option>
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '500',
              color: '#757575',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
            }}>
              Scope
            </label>
            <select
              value={filter.scope}
              onChange={(e) => setFilter({ ...filter, scope: e.target.value })}
              style={{
                padding: '0.5rem',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            >
              <option value="all">All Scopes</option>
              <option value="global">Global</option>
              <option value="genre:fantasy">Fantasy</option>
              <option value="genre:sci-fi">Sci-Fi</option>
              <option value="genre:mystery">Mystery</option>
              <option value="genre:romance">Romance</option>
              <option value="genre:thriller">Thriller</option>
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '500',
              color: '#757575',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
            }}>
              Category
            </label>
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              style={{
                padding: '0.5rem',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            >
              <option value="all">All Categories</option>
              <option value="technique">Technique</option>
              <option value="pitfall">Pitfall</option>
              <option value="pattern">Pattern</option>
              <option value="preference">Preference</option>
              <option value="correction">Correction</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
            <button
              onClick={fetchLessons}
              style={{
                padding: '0.5rem 1rem',
                background: '#667eea',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div style={{
          marginBottom: '1rem',
          fontSize: '0.875rem',
          color: '#757575',
        }}>
          {loading ? 'Loading...' : `${lessons.length} lessons found`}
        </div>

        {/* Lessons Table */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}>
            <thead>
              <tr style={{
                background: '#F5F5F5',
                borderBottom: '1px solid #E0E0E0',
              }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#757575', textTransform: 'uppercase' }}>Agent</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#757575', textTransform: 'uppercase' }}>Category</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#757575', textTransform: 'uppercase' }}>Title</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#757575', textTransform: 'uppercase' }}>Score</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#757575', textTransform: 'uppercase' }}>Scope</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#757575', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((lesson) => (
                <tr
                  key={lesson.id}
                  style={{
                    borderBottom: '1px solid #E0E0E0',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedLesson(lesson)}
                >
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#212121' }}>{lesson.agent_type}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: getCategoryColor(lesson.category),
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                    }}>
                      {lesson.category}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#212121' }}>{lesson.title}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'center', fontWeight: '600', color: lesson.score >= 0 ? '#4CAF50' : '#F44336' }}>
                    {lesson.score}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.75rem', color: '#757575' }}>{lesson.scope}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateScore(lesson.id, 1);
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#4CAF50',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        marginRight: '0.5rem',
                      }}
                    >
                      +1
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateScore(lesson.id, -1);
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#FF9800',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        marginRight: '0.5rem',
                      }}
                    >
                      -1
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLesson(lesson.id);
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#F44336',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {lessons.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#757575' }}>
                    No lessons found matching the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Lesson Detail Panel */}
        {selectedLesson && (
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '500px',
            height: '100vh',
            background: '#FFFFFF',
            borderLeft: '1px solid #E0E0E0',
            padding: '2rem',
            overflowY: 'auto',
            boxShadow: '-4px 0 10px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#212121' }}>Lesson Details</h2>
              <button
                onClick={() => setSelectedLesson(null)}
                style={{
                  padding: '0.5rem',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#757575',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#757575', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Title</h3>
              <p style={{ fontSize: '1rem', color: '#212121' }}>{selectedLesson.title}</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#757575', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Content</h3>
              <p style={{ fontSize: '0.875rem', color: '#212121', lineHeight: 1.6 }}>{selectedLesson.content}</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#757575', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Metadata</h3>
              <div style={{ fontSize: '0.875rem', color: '#757575' }}>
                <p>Agent: <strong>{selectedLesson.agent_type}</strong></p>
                <p>Category: <strong>{selectedLesson.category}</strong></p>
                <p>Scope: <strong>{selectedLesson.scope}</strong></p>
                <p>Score: <strong style={{ color: selectedLesson.score >= 0 ? '#4CAF50' : '#F44336' }}>{selectedLesson.score}</strong></p>
              </div>
            </div>

            {selectedLesson.tags && selectedLesson.tags.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#757575', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tags</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {selectedLesson.tags.map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#F5F5F5',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#757575',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.75rem', color: '#B0B0B0' }}>
              <p>Created: {new Date(selectedLesson.created_at).toLocaleString()}</p>
              <p>Updated: {new Date(selectedLesson.updated_at).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    technique: '#E3F2FD',
    pitfall: '#FFEBEE',
    pattern: '#F3E5F5',
    preference: '#E8F5E9',
    correction: '#FFF3E0',
  };
  return colors[category] || '#F5F5F5';
}
