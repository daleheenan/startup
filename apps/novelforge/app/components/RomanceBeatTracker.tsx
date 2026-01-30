'use client';

import { useState, useEffect } from 'react';
import {
  ROMANCE_BEATS,
  BEAT_PLACEMENT_GUIDE,
  REQUIRED_ROMANCE_BEATS,
  type RomanceBeat,
} from '../lib/genre-data/romance-beats';

interface BeatTracking {
  id: string;
  projectId: string;
  beatType: string;
  chapterNumber: number | null;
  sceneDescription?: string;
  emotionalIntensity?: number;
  notes?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ValidationWarning {
  beatType: string;
  message: string;
  severity: 'error' | 'warning';
}

interface RomanceBeatTrackerProps {
  projectId: string;
  totalChapters: number;
  onBeatUpdate?: () => void;
}

export default function RomanceBeatTracker({
  projectId,
  totalChapters,
  onBeatUpdate,
}: RomanceBeatTrackerProps) {
  const [trackedBeats, setTrackedBeats] = useState<BeatTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [expandedBeat, setExpandedBeat] = useState<string | null>(null);
  const [editingBeat, setEditingBeat] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    chapterNumber: number | null;
    completed: boolean;
    notes: string;
  }>({ chapterNumber: null, completed: false, notes: '' });

  // Load tracked beats on mount
  useEffect(() => {
    loadTrackedBeats();
  }, [projectId]);

  // Validate beats whenever they change
  useEffect(() => {
    validateBeats();
  }, [trackedBeats, totalChapters]);

  const loadTrackedBeats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/romance-beats`);

      if (!response.ok) {
        throw new Error('Failed to load romance beats');
      }

      const beats = await response.json();
      setTrackedBeats(beats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateBeats = () => {
    const warnings: ValidationWarning[] = [];
    const trackedBeatTypes = new Set(trackedBeats.map((b) => b.beatType));

    // Check for missing required beats
    REQUIRED_ROMANCE_BEATS.forEach((beatType: string) => {
      const tracked = trackedBeats.find((b: BeatTracking) => b.beatType === beatType);
      if (!tracked) {
        warnings.push({
          beatType,
          message: 'Required beat not yet tracked',
          severity: 'error',
        });
      } else if (!tracked.completed) {
        warnings.push({
          beatType,
          message: 'Required beat not yet completed',
          severity: 'warning',
        });
      }
    });

    // Check for beats without chapter assignments
    trackedBeats.forEach((beat) => {
      if (!beat.chapterNumber) {
        warnings.push({
          beatType: beat.beatType,
          message: 'Beat not assigned to a chapter',
          severity: 'warning',
        });
      }
    });

    setValidationWarnings(warnings);
  };

  const trackBeat = async (beatType: string, chapterNumber: number | null, completed: boolean, notes?: string) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/romance-beats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beatType,
          chapterNumber,
          completed,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to track beat');
      }

      await loadTrackedBeats();
      if (onBeatUpdate) onBeatUpdate();
      setEditingBeat(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteBeat = async (beatType: string) => {
    if (!confirm('Are you sure you want to remove tracking for this beat?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/romance-beats/${beatType}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete beat');
      }

      await loadTrackedBeats();
      if (onBeatUpdate) onBeatUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (beatType: string) => {
    const tracked = trackedBeats.find((b) => b.beatType === beatType);
    setEditingBeat(beatType);
    setEditForm({
      chapterNumber: tracked?.chapterNumber || null,
      completed: tracked?.completed || false,
      notes: tracked?.notes || '',
    });
  };

  const cancelEditing = () => {
    setEditingBeat(null);
    setEditForm({ chapterNumber: null, completed: false, notes: '' });
  };

  const saveEdit = async (beatType: string) => {
    await trackBeat(beatType, editForm.chapterNumber, editForm.completed, editForm.notes);
  };

  const getBeatStatus = (beatType: string): 'not_started' | 'planned' | 'completed' => {
    const tracked = trackedBeats.find((b) => b.beatType === beatType);
    if (!tracked) return 'not_started';
    if (tracked.completed) return 'completed';
    return 'planned';
  };

  const getSuggestedChapter = (beat: RomanceBeat): string => {
    const percentage = beat.typicalPlacement.match(/(\d+)/g);
    if (!percentage || percentage.length === 0) return beat.typicalPlacement;

    const minPercent = parseInt(percentage[0], 10);
    const minChapter = Math.ceil((minPercent / 100) * totalChapters);

    if (percentage.length > 1) {
      const maxPercent = parseInt(percentage[1], 10);
      const maxChapter = Math.ceil((maxPercent / 100) * totalChapters);
      return `Chapters ${minChapter}-${maxChapter} (${minPercent}-${maxPercent}%)`;
    }

    return `Around Chapter ${minChapter} (${minPercent}%)`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'planned':
        return '#F59E0B';
      case 'not_started':
        return '#94A3B8';
      default:
        return '#94A3B8';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'planned':
        return 'Planned';
      case 'not_started':
        return 'Not Started';
      default:
        return 'Unknown';
    }
  };

  const requiredBeats = ROMANCE_BEATS.filter((b: RomanceBeat) => b.required);
  const optionalBeats = ROMANCE_BEATS.filter((b: RomanceBeat) => !b.required);
  const completedCount = trackedBeats.filter((b: BeatTracking) => b.completed).length;
  const requiredCompletedCount = trackedBeats.filter(
    (b: BeatTracking) => b.completed && REQUIRED_ROMANCE_BEATS.includes(b.beatType)
  ).length;

  if (loading) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#64748B',
        }}
      >
        Loading romance beat tracking...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '1.5rem',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#1A1A2E',
            margin: '0 0 0.5rem 0',
          }}
        >
          Romance Emotional Beats Tracker
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
          Track the essential emotional moments that romance readers expect. Mark beats as you plan or complete them.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: '1rem',
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            color: '#991B1B',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Progress Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Total Progress */}
        <div
          style={{
            padding: '1rem',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.5rem' }}>
            Total Progress
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1A1A2E' }}>
              {completedCount}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#64748B' }}>
              / {ROMANCE_BEATS.length} beats
            </span>
          </div>
          <div
            style={{
              marginTop: '0.5rem',
              height: '4px',
              background: '#E2E8F0',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                width: `${(completedCount / ROMANCE_BEATS.length) * 100}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Required Beats */}
        <div
          style={{
            padding: '1rem',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.5rem' }}>
            Required Beats
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1A1A2E' }}>
              {requiredCompletedCount}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#64748B' }}>
              / {REQUIRED_ROMANCE_BEATS.length}
            </span>
          </div>
          <div
            style={{
              marginTop: '0.5rem',
              height: '4px',
              background: '#E2E8F0',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background:
                  requiredCompletedCount === REQUIRED_ROMANCE_BEATS.length ? '#10B981' : '#F59E0B',
                width: `${(requiredCompletedCount / REQUIRED_ROMANCE_BEATS.length) * 100}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Validation Status */}
        <div
          style={{
            padding: '1rem',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.5rem' }}>
            Validation
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {validationWarnings.filter((w) => w.severity === 'error').length === 0 ? (
              <>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="10" fill="#10B981" />
                  <path
                    d="M6 10l2 2 6-6"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#10B981' }}>
                  All required beats tracked
                </span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="10" fill="#EF4444" />
                  <path
                    d="M10 6v4m0 4h.01"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#EF4444' }}>
                  {validationWarnings.filter((w) => w.severity === 'error').length} issue(s)
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <div
          style={{
            padding: '1rem',
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: '8px',
            marginBottom: '1.5rem',
          }}
        >
          <h4
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#92400E',
              margin: '0 0 0.5rem 0',
            }}
          >
            Validation Warnings
          </h4>
          <ul
            style={{
              margin: 0,
              paddingLeft: '1.25rem',
              fontSize: '0.813rem',
              color: '#92400E',
            }}
          >
            {validationWarnings.slice(0, 5).map((warning, idx) => {
              const beat = ROMANCE_BEATS.find((b: RomanceBeat) => b.id === warning.beatType);
              return (
                <li key={idx}>
                  <strong>{beat?.name || warning.beatType}</strong>: {warning.message}
                </li>
              );
            })}
          </ul>
          {validationWarnings.length > 5 && (
            <div style={{ fontSize: '0.75rem', color: '#92400E', marginTop: '0.5rem' }}>
              And {validationWarnings.length - 5} more...
            </div>
          )}
        </div>
      )}

      {/* Required Beats Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#374151',
            margin: '0 0 1rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>Required Beats</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#EF4444',
              background: '#FEE2E2',
              padding: '0.125rem 0.5rem',
              borderRadius: '4px',
            }}
          >
            Must Have
          </span>
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {requiredBeats.map((beat) => {
            const status = getBeatStatus(beat.id);
            const tracked = trackedBeats.find((b) => b.beatType === beat.id);
            const isExpanded = expandedBeat === beat.id;
            const isEditing = editingBeat === beat.id;

            return (
              <div
                key={beat.id}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                {/* Beat Header */}
                <div
                  style={{
                    padding: '1rem',
                    background: '#FFFFFF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <h5
                        style={{
                          fontSize: '0.938rem',
                          fontWeight: 600,
                          color: '#1A1A2E',
                          margin: 0,
                        }}
                      >
                        {beat.name}
                      </h5>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: getStatusColor(status),
                          background: `${getStatusColor(status)}20`,
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        {getStatusLabel(status)}
                      </span>
                      {tracked?.chapterNumber && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#64748B',
                          }}
                        >
                          Chapter {tracked.chapterNumber}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.813rem', color: '#64748B', margin: '0.25rem 0 0 0' }}>
                      {beat.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedBeat(isExpanded ? null : beat.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        color: '#475569',
                        fontSize: '0.813rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {isExpanded ? 'Less' : 'More'}
                    </button>
                    {tracked ? (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditing(beat.id)}
                          disabled={saving}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#FFFFFF',
                            fontSize: '0.813rem',
                            fontWeight: 500,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.6 : 1,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBeat(beat.id)}
                          disabled={saving}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#FEE2E2',
                            border: '1px solid #FCA5A5',
                            borderRadius: '6px',
                            color: '#991B1B',
                            fontSize: '0.813rem',
                            fontWeight: 500,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.6 : 1,
                          }}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditing(beat.id)}
                        disabled={saving}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          fontSize: '0.813rem',
                          fontWeight: 500,
                          cursor: saving ? 'not-allowed' : 'pointer',
                          opacity: saving ? 0.6 : 1,
                        }}
                      >
                        Track Beat
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '1rem',
                      background: '#F8FAFC',
                      borderTop: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ marginBottom: '0.75rem' }}>
                      <h6
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#374151',
                          textTransform: 'uppercase',
                          margin: '0 0 0.25rem 0',
                        }}
                      >
                        Suggested Placement
                      </h6>
                      <p style={{ fontSize: '0.813rem', color: '#64748B', margin: 0 }}>
                        {getSuggestedChapter(beat)}
                      </p>
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <h6
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#374151',
                          textTransform: 'uppercase',
                          margin: '0 0 0.25rem 0',
                        }}
                      >
                        Emotional Function
                      </h6>
                      <p style={{ fontSize: '0.813rem', color: '#64748B', margin: 0 }}>
                        {beat.emotionalFunction}
                      </p>
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <h6
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#374151',
                          textTransform: 'uppercase',
                          margin: '0 0 0.25rem 0',
                        }}
                      >
                        Variations
                      </h6>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '1.25rem',
                          fontSize: '0.813rem',
                          color: '#64748B',
                        }}
                      >
                        {beat.variations.map((variation: string, idx: number) => (
                          <li key={idx}>{variation}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h6
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#374151',
                          textTransform: 'uppercase',
                          margin: '0 0 0.25rem 0',
                        }}
                      >
                        Writing Tips
                      </h6>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '1.25rem',
                          fontSize: '0.813rem',
                          color: '#64748B',
                        }}
                      >
                        {beat.tips.map((tip: string, idx: number) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Edit Form */}
                {isEditing && (
                  <div
                    style={{
                      padding: '1rem',
                      background: '#F8FAFC',
                      borderTop: '1px solid #E2E8F0',
                    }}
                  >
                    <h6
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#374151',
                        margin: '0 0 0.75rem 0',
                      }}
                    >
                      Track Beat Details
                    </h6>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: '#374151',
                          marginBottom: '0.25rem',
                        }}
                      >
                        Chapter Number
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={totalChapters}
                        value={editForm.chapterNumber || ''}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            chapterNumber: e.target.value ? parseInt(e.target.value, 10) : null,
                          })
                        }
                        placeholder="Optional"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.813rem',
                          color: '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editForm.completed}
                          onChange={(e) =>
                            setEditForm({ ...editForm, completed: e.target.checked })
                          }
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span>Mark as completed</span>
                      </label>
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: '#374151',
                          marginBottom: '0.25rem',
                        }}
                      >
                        Notes (Optional)
                      </label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder="Add notes about how this beat plays out in your story..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => saveEdit(beat.id)}
                        disabled={saving}
                        style={{
                          flex: 1,
                          padding: '0.625rem',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: saving ? 'not-allowed' : 'pointer',
                          opacity: saving ? 0.6 : 1,
                        }}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={saving}
                        style={{
                          flex: 1,
                          padding: '0.625rem',
                          background: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          color: '#475569',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: saving ? 'not-allowed' : 'pointer',
                          opacity: saving ? 0.6 : 1,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional Beats Section */}
      <div>
        <h4
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#374151',
            margin: '0 0 1rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>Optional Beats</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#64748B',
              background: '#F1F5F9',
              padding: '0.125rem 0.5rem',
              borderRadius: '4px',
            }}
          >
            Enhance Your Story
          </span>
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {optionalBeats.map((beat) => {
            const status = getBeatStatus(beat.id);
            const tracked = trackedBeats.find((b) => b.beatType === beat.id);
            const isExpanded = expandedBeat === beat.id;
            const isEditing = editingBeat === beat.id;

            return (
              <div
                key={beat.id}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                {/* Beat Header */}
                <div
                  style={{
                    padding: '1rem',
                    background: '#FFFFFF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <h5
                        style={{
                          fontSize: '0.938rem',
                          fontWeight: 600,
                          color: '#1A1A2E',
                          margin: 0,
                        }}
                      >
                        {beat.name}
                      </h5>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: getStatusColor(status),
                          background: `${getStatusColor(status)}20`,
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        {getStatusLabel(status)}
                      </span>
                      {tracked?.chapterNumber && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#64748B',
                          }}
                        >
                          Chapter {tracked.chapterNumber}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.813rem', color: '#64748B', margin: '0.25rem 0 0 0' }}>
                      {beat.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedBeat(isExpanded ? null : beat.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        color: '#475569',
                        fontSize: '0.813rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {isExpanded ? 'Less' : 'More'}
                    </button>
                    {tracked ? (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditing(beat.id)}
                          disabled={saving}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#FFFFFF',
                            fontSize: '0.813rem',
                            fontWeight: 500,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.6 : 1,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBeat(beat.id)}
                          disabled={saving}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#FEE2E2',
                            border: '1px solid #FCA5A5',
                            borderRadius: '6px',
                            color: '#991B1B',
                            fontSize: '0.813rem',
                            fontWeight: 500,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.6 : 1,
                          }}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditing(beat.id)}
                        disabled={saving}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          fontSize: '0.813rem',
                          fontWeight: 500,
                          cursor: saving ? 'not-allowed' : 'pointer',
                          opacity: saving ? 0.6 : 1,
                        }}
                      >
                        Track Beat
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '1rem',
                      background: '#F8FAFC',
                      borderTop: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ marginBottom: '0.75rem' }}>
                      <h6
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#374151',
                          textTransform: 'uppercase',
                          margin: '0 0 0.25rem 0',
                        }}
                      >
                        Suggested Placement
                      </h6>
                      <p style={{ fontSize: '0.813rem', color: '#64748B', margin: 0 }}>
                        {getSuggestedChapter(beat)}
                      </p>
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <h6
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#374151',
                          textTransform: 'uppercase',
                          margin: '0 0 0.25rem 0',
                        }}
                      >
                        Emotional Function
                      </h6>
                      <p style={{ fontSize: '0.813rem', color: '#64748B', margin: 0 }}>
                        {beat.emotionalFunction}
                      </p>
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <h6
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#374151',
                          textTransform: 'uppercase',
                          margin: '0 0 0.25rem 0',
                        }}
                      >
                        Variations
                      </h6>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '1.25rem',
                          fontSize: '0.813rem',
                          color: '#64748B',
                        }}
                      >
                        {beat.variations.map((variation: string, idx: number) => (
                          <li key={idx}>{variation}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h6
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#374151',
                          textTransform: 'uppercase',
                          margin: '0 0 0.25rem 0',
                        }}
                      >
                        Writing Tips
                      </h6>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '1.25rem',
                          fontSize: '0.813rem',
                          color: '#64748B',
                        }}
                      >
                        {beat.tips.map((tip: string, idx: number) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Edit Form */}
                {isEditing && (
                  <div
                    style={{
                      padding: '1rem',
                      background: '#F8FAFC',
                      borderTop: '1px solid #E2E8F0',
                    }}
                  >
                    <h6
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#374151',
                        margin: '0 0 0.75rem 0',
                      }}
                    >
                      Track Beat Details
                    </h6>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: '#374151',
                          marginBottom: '0.25rem',
                        }}
                      >
                        Chapter Number
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={totalChapters}
                        value={editForm.chapterNumber || ''}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            chapterNumber: e.target.value ? parseInt(e.target.value, 10) : null,
                          })
                        }
                        placeholder="Optional"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.813rem',
                          color: '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editForm.completed}
                          onChange={(e) =>
                            setEditForm({ ...editForm, completed: e.target.checked })
                          }
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span>Mark as completed</span>
                      </label>
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: '#374151',
                          marginBottom: '0.25rem',
                        }}
                      >
                        Notes (Optional)
                      </label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder="Add notes about how this beat plays out in your story..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => saveEdit(beat.id)}
                        disabled={saving}
                        style={{
                          flex: 1,
                          padding: '0.625rem',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: saving ? 'not-allowed' : 'pointer',
                          opacity: saving ? 0.6 : 1,
                        }}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={saving}
                        style={{
                          flex: 1,
                          padding: '0.625rem',
                          background: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          color: '#475569',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: saving ? 'not-allowed' : 'pointer',
                          opacity: saving ? 0.6 : 1,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
