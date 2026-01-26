'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getToken } from '../../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Job {
  id: string;
  type: string;
  target_id: string;
  status: 'pending' | 'running' | 'completed' | 'paused' | 'failed';
  attempts: number;
  error: string | null;
  checkpoint: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  chapter_number: number | null;
  chapter_title: string | null;
  book_number: number | null;
  book_title: string | null;
  project_id: string | null;
  project_title: string | null;
}

interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  paused: number;
  failed: number;
  total: number;
}

interface SessionStats {
  requestsThisSession: number;
  sessionResetTime: string | null;
  isRateLimited: boolean;
}

export default function QueueAdminPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'all',
    projectId: '',
  });
  const [total, setTotal] = useState(0);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchData();

    // Set up auto-refresh
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchData, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [filter, autoRefresh]);

  const fetchData = async () => {
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch stats
      const statsRes = await fetch(`${API_BASE_URL}/api/queue/stats`, { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setQueueStats(statsData.queue);
        setSessionStats(statsData.session);
      }

      // Fetch jobs
      let url = `${API_BASE_URL}/api/queue/jobs?limit=100`;
      if (filter.status !== 'all') {
        url += `&status=${filter.status}`;
      }
      if (filter.projectId) {
        url += `&projectId=${filter.projectId}`;
      }

      const jobsRes = await fetch(url, { headers });
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData.jobs);
        setTotal(jobsData.total);
      }
    } catch (error) {
      console.error('Error fetching queue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#FEF3C7', color: '#B45309' };
      case 'running': return { bg: '#DBEAFE', color: '#1D4ED8' };
      case 'completed': return { bg: '#DCFCE7', color: '#15803D' };
      case 'paused': return { bg: '#E5E7EB', color: '#6B7280' };
      case 'failed': return { bg: '#FEE2E2', color: '#DC2626' };
      default: return { bg: '#F3F4F6', color: '#374151' };
    }
  };

  const getJobTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'generate_chapter': 'Generate Chapter',
      'dev_edit': 'Developmental Edit',
      'author_revision': 'Author Revision',
      'line_edit': 'Line Edit',
      'continuity_check': 'Continuity Check',
      'copy_edit': 'Copy Edit',
      'generate_summary': 'Generate Summary',
      'update_states': 'Update States',
    };
    return labels[type] || type;
  };

  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt) return '-';
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const durationMs = end - start;

    if (durationMs < 1000) return `${durationMs}ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
    if (durationMs < 3600000) return `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`;
    return `${Math.floor(durationMs / 3600000)}h ${Math.floor((durationMs % 3600000) / 60000)}m`;
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: '#FAFAFA',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '600',
              color: '#212121',
              marginBottom: '0.5rem',
            }}>
              Job Queue Monitor
            </h1>
            <p style={{
              fontSize: '0.875rem',
              color: '#757575',
            }}>
              Real-time view of chapter generation and editing jobs
            </p>
          </div>
          <Link
            href="/projects"
            style={{
              padding: '0.5rem 1rem',
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            ← Back to Projects
          </Link>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          {queueStats && (
            <>
              <StatCard label="Pending" value={queueStats.pending} color="#B45309" bgColor="#FEF3C7" />
              <StatCard label="Running" value={queueStats.running} color="#1D4ED8" bgColor="#DBEAFE" />
              <StatCard label="Completed" value={queueStats.completed} color="#15803D" bgColor="#DCFCE7" />
              <StatCard label="Paused" value={queueStats.paused} color="#6B7280" bgColor="#E5E7EB" />
              <StatCard label="Failed" value={queueStats.failed} color="#DC2626" bgColor="#FEE2E2" />
              <StatCard label="Total" value={queueStats.total} color="#374151" bgColor="#F3F4F6" />
            </>
          )}
        </div>

        {/* Session Info */}
        {sessionStats && (
          <div style={{
            background: sessionStats.isRateLimited ? '#FEF3C7' : '#FFFFFF',
            border: `1px solid ${sessionStats.isRateLimited ? '#F59E0B' : '#E0E0E0'}`,
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#757575', textTransform: 'uppercase' }}>API Requests</span>
              <p style={{ fontSize: '1.25rem', fontWeight: '600', color: '#212121', margin: 0 }}>
                {sessionStats.requestsThisSession}
              </p>
            </div>
            {sessionStats.isRateLimited && (
              <div style={{
                padding: '0.5rem 1rem',
                background: '#F59E0B',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}>
                Rate Limited - Queue Paused
              </div>
            )}
            {sessionStats.sessionResetTime && (
              <div>
                <span style={{ fontSize: '0.75rem', color: '#757575', textTransform: 'uppercase' }}>Session Resets</span>
                <p style={{ fontSize: '0.875rem', color: '#212121', margin: 0 }}>
                  {new Date(sessionStats.sessionResetTime).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
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
              Status
            </label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              style={{
                padding: '0.5rem',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '0.875rem',
                minWidth: '120px',
              }}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: '#757575',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (3s)
            </label>
            <button
              onClick={fetchData}
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
          {loading ? 'Loading...' : `${jobs.length} of ${total} jobs`}
        </div>

        {/* Jobs Table */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '900px',
            }}>
              <thead>
                <tr style={{
                  background: '#F5F5F5',
                  borderBottom: '1px solid #E0E0E0',
                }}>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Project</th>
                  <th style={thStyle}>Chapter</th>
                  <th style={thStyle}>Duration</th>
                  <th style={thStyle}>Attempts</th>
                  <th style={thStyle}>Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const statusColors = getStatusColor(job.status);
                  const isRunning = job.status === 'running';

                  return (
                    <tr
                      key={job.id}
                      style={{
                        borderBottom: '1px solid #E0E0E0',
                        cursor: 'pointer',
                        background: isRunning ? '#EFF6FF' : undefined,
                      }}
                      onClick={() => setSelectedJob(job)}
                    >
                      <td style={tdStyle}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          background: statusColors.bg,
                          color: statusColors.color,
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          textTransform: 'uppercase',
                        }}>
                          {job.status}
                        </span>
                      </td>
                      <td style={tdStyle}>{getJobTypeLabel(job.type)}</td>
                      <td style={tdStyle}>
                        {job.project_title ? (
                          <Link
                            href={`/projects/${job.project_id}/progress`}
                            style={{ color: '#667eea', textDecoration: 'none' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {job.project_title}
                          </Link>
                        ) : (
                          <span style={{ color: '#9CA3AF' }}>-</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {job.chapter_number ? (
                          <span>
                            Ch. {job.chapter_number}
                            {job.chapter_title && (
                              <span style={{ color: '#9CA3AF', marginLeft: '0.5rem' }}>
                                {job.chapter_title}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: '#9CA3AF' }}>-</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {formatDuration(job.started_at, job.completed_at)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          color: job.attempts > 1 ? '#F59E0B' : '#9CA3AF',
                          fontWeight: job.attempts > 1 ? '600' : '400',
                        }}>
                          {job.attempts}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: '#9CA3AF', fontSize: '0.75rem' }}>
                        {new Date(job.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}

                {jobs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#757575' }}>
                      No jobs found matching the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Job Detail Panel */}
        {selectedJob && (
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
            zIndex: 100,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#212121' }}>Job Details</h2>
              <button
                onClick={() => setSelectedJob(null)}
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

            <DetailRow label="Job ID" value={selectedJob.id} />
            <DetailRow label="Status" value={
              <span style={{
                padding: '0.25rem 0.5rem',
                background: getStatusColor(selectedJob.status).bg,
                color: getStatusColor(selectedJob.status).color,
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: '500',
                textTransform: 'uppercase',
              }}>
                {selectedJob.status}
              </span>
            } />
            <DetailRow label="Type" value={getJobTypeLabel(selectedJob.type)} />
            <DetailRow label="Target ID" value={selectedJob.target_id} />
            <DetailRow label="Attempts" value={selectedJob.attempts.toString()} />

            {selectedJob.project_title && (
              <DetailRow label="Project" value={
                <Link
                  href={`/projects/${selectedJob.project_id}`}
                  style={{ color: '#667eea', textDecoration: 'none' }}
                >
                  {selectedJob.project_title}
                </Link>
              } />
            )}

            {selectedJob.chapter_number && (
              <DetailRow label="Chapter" value={`Chapter ${selectedJob.chapter_number}: ${selectedJob.chapter_title || 'Untitled'}`} />
            )}

            <DetailRow label="Created" value={new Date(selectedJob.created_at).toLocaleString()} />
            {selectedJob.started_at && (
              <DetailRow label="Started" value={new Date(selectedJob.started_at).toLocaleString()} />
            )}
            {selectedJob.completed_at && (
              <DetailRow label="Completed" value={new Date(selectedJob.completed_at).toLocaleString()} />
            )}
            {selectedJob.started_at && (
              <DetailRow label="Duration" value={formatDuration(selectedJob.started_at, selectedJob.completed_at)} />
            )}

            {selectedJob.error && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#DC2626', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Error</h3>
                <pre style={{
                  padding: '1rem',
                  background: '#FEE2E2',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: '#991B1B',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {selectedJob.error}
                </pre>
              </div>
            )}

            {selectedJob.checkpoint && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#757575', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Checkpoint</h3>
                <pre style={{
                  padding: '1rem',
                  background: '#F5F5F5',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: '#374151',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '200px',
                }}>
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedJob.checkpoint), null, 2);
                    } catch {
                      return selectedJob.checkpoint;
                    }
                  })()}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

const thStyle: React.CSSProperties = {
  padding: '1rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: '600',
  color: '#757575',
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '1rem',
  fontSize: '0.875rem',
  color: '#212121',
};

function StatCard({ label, value, color, bgColor }: { label: string; value: number; color: string; bgColor: string }) {
  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${color}20`,
      borderRadius: '12px',
      padding: '1rem 1.5rem',
      textAlign: 'center',
    }}>
      <p style={{
        fontSize: '0.75rem',
        fontWeight: '500',
        color: color,
        textTransform: 'uppercase',
        margin: '0 0 0.25rem 0',
      }}>
        {label}
      </p>
      <p style={{
        fontSize: '2rem',
        fontWeight: '700',
        color: color,
        margin: 0,
      }}>
        {value}
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <h3 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#757575', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</h3>
      <div style={{ fontSize: '0.875rem', color: '#212121' }}>{value}</div>
    </div>
  );
}
