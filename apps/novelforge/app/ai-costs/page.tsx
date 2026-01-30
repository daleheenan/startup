'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../lib/auth';
import { colors, typography, spacing, borderRadius, shadows, transitions } from '../lib/design-tokens';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ==================== TYPES ====================

interface AICostEntry {
  id: string;
  request_type: string;
  request_type_label: string;
  project_id: string | null;
  project_name: string | null;
  series_id: string | null;
  series_name: string | null;
  chapter_id: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  cost_gbp: number;
  model_used: string | null;
  success: number;
  error_message: string | null;
  context_summary: string | null;
  created_at: string;
}

interface AICostSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  totalCostGBP: number;
  totalRequests: number;
  formattedCostUSD?: string;
  formattedCostGBP?: string;
  formattedInputTokens?: string;
  formattedOutputTokens?: string;
}

interface RequestTypeOption {
  value: string;
  label: string;
}

interface Project {
  id: string;
  name: string;
}

interface Series {
  id: string;
  name: string;
}

// ==================== COMPONENT ====================

export default function AICostsPage() {
  const [entries, setEntries] = useState<AICostEntry[]>([]);
  const [summary, setSummary] = useState<AICostSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    projectId: '',
    seriesId: '',
    requestType: '',
    startDate: '',
    endDate: '',
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
  });

  // Dropdown options
  const [projects, setProjects] = useState<Project[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestTypeOption[]>([]);

  // Fetch dropdown options on mount
  useEffect(() => {
    fetchProjects();
    fetchSeries();
    fetchRequestTypes();
  }, []);

  // Fetch data when filters or pagination change
  useEffect(() => {
    fetchAICosts();
  }, [filters, pagination]);

  const fetchProjects = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchSeries = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/series`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSeries(data.series || []);
      }
    } catch (err) {
      console.error('Error fetching series:', err);
    }
  };

  const fetchRequestTypes = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/ai-costs/request-types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequestTypes(data.types || []);
      }
    } catch (err) {
      console.error('Error fetching request types:', err);
    }
  };

  const fetchAICosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const params = new URLSearchParams();

      if (filters.projectId) params.append('projectId', filters.projectId);
      if (filters.seriesId) params.append('seriesId', filters.seriesId);
      if (filters.requestType) params.append('requestType', filters.requestType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      const res = await fetch(`${API_BASE_URL}/api/ai-costs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch AI costs');
      }

      const data = await res.json();
      setEntries(data.entries || []);
      setSummary(data.summary || null);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, offset: 0 })); // Reset to first page
  };

  const handlePageChange = (newOffset: number) => {
    setPagination((prev) => ({ ...prev, offset: newOffset }));
  };

  const clearFilters = () => {
    setFilters({
      projectId: '',
      seriesId: '',
      requestType: '',
      startDate: '',
      endDate: '',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTokens = (count: number): string => {
    if (count >= 1_000_000) {
      return (count / 1_000_000).toFixed(1) + 'M';
    } else if (count >= 1_000) {
      return (count / 1_000).toFixed(0) + 'K';
    }
    return count.toString();
  };

  // ==================== STYLES ====================

  const cardStyle = {
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
  };

  const summaryGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: spacing[4],
    marginBottom: spacing[6],
  };

  const summaryCardStyle = {
    ...cardStyle,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
  };

  const summaryValueStyle = {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  };

  const summaryLabelStyle = {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  };

  const filtersStyle = {
    ...cardStyle,
    marginBottom: spacing[6],
  };

  const filterGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing[4],
    marginBottom: spacing[4],
  };

  const filterLabelStyle = {
    display: 'block',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  };

  const filterInputStyle = {
    width: '100%',
    padding: `${spacing[2]} ${spacing[3]}`,
    background: colors.background.primary,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    outline: 'none',
  };

  const tableContainerStyle = {
    ...cardStyle,
    overflowX: 'auto' as const,
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: typography.fontSize.sm,
  };

  const thStyle = {
    textAlign: 'left' as const,
    padding: `${spacing[3]} ${spacing[4]}`,
    borderBottom: `2px solid ${colors.border.default}`,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    whiteSpace: 'nowrap' as const,
  };

  const tdStyle = {
    padding: `${spacing[3]} ${spacing[4]}`,
    borderBottom: `1px solid ${colors.border.default}`,
    color: colors.text.primary,
    verticalAlign: 'top' as const,
  };

  const paginationStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTop: `1px solid ${colors.border.default}`,
  };

  const buttonStyle = {
    padding: `${spacing[2]} ${spacing[4]}`,
    background: colors.brand.primary,
    color: colors.white,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    transition: transitions.all,
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: 'transparent',
    color: colors.text.secondary,
    border: `1px solid ${colors.border.default}`,
  };

  const statusBadgeStyle = (success: boolean) => ({
    display: 'inline-block',
    padding: `${spacing[1]} ${spacing[2]}`,
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    background: success ? colors.semantic.success + '20' : colors.semantic.error + '20',
    color: success ? colors.semantic.success : colors.semantic.error,
  });

  // ==================== RENDER ====================

  return (
    <DashboardLayout
      header={{
        title: 'AI Costs',
        subtitle: 'Track and analyse AI request costs across all projects',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Summary Cards */}
        <div style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <div style={summaryValueStyle}>
              {summary?.formattedCostGBP || `£${(summary?.totalCostGBP || 0).toFixed(2)}`}
            </div>
            <div style={summaryLabelStyle}>Total Cost (GBP)</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={summaryValueStyle}>
              {summary?.formattedCostUSD || `$${(summary?.totalCostUSD || 0).toFixed(2)}`}
            </div>
            <div style={summaryLabelStyle}>Total Cost (USD)</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={summaryValueStyle}>
              {summary?.formattedInputTokens || formatTokens(summary?.totalInputTokens || 0)}
            </div>
            <div style={summaryLabelStyle}>Input Tokens</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={summaryValueStyle}>
              {summary?.formattedOutputTokens || formatTokens(summary?.totalOutputTokens || 0)}
            </div>
            <div style={summaryLabelStyle}>Output Tokens</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={summaryValueStyle}>{summary?.totalRequests || 0}</div>
            <div style={summaryLabelStyle}>Total Requests</div>
          </div>
        </div>

        {/* Filters */}
        <div style={filtersStyle}>
          <h3
            style={{
              margin: 0,
              marginBottom: spacing[4],
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}
          >
            Filters
          </h3>
          <div style={filterGridStyle}>
            <div>
              <label style={filterLabelStyle}>Project</label>
              <select
                style={filterInputStyle}
                value={filters.projectId}
                onChange={(e) => handleFilterChange('projectId', e.target.value)}
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={filterLabelStyle}>Series</label>
              <select
                style={filterInputStyle}
                value={filters.seriesId}
                onChange={(e) => handleFilterChange('seriesId', e.target.value)}
              >
                <option value="">All Series</option>
                {series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={filterLabelStyle}>Request Type</label>
              <select
                style={filterInputStyle}
                value={filters.requestType}
                onChange={(e) => handleFilterChange('requestType', e.target.value)}
              >
                <option value="">All Types</option>
                {requestTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={filterLabelStyle}>Start Date</label>
              <input
                type="date"
                style={filterInputStyle}
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label style={filterLabelStyle}>End Date</label>
              <input
                type="date"
                style={filterInputStyle}
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            <button style={secondaryButtonStyle} onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div
            style={{
              ...cardStyle,
              background: colors.semantic.error + '10',
              borderColor: colors.semantic.error,
              marginBottom: spacing[6],
            }}
          >
            <p style={{ margin: 0, color: colors.semantic.error }}>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ ...cardStyle, textAlign: 'center' as const }}>
            <p style={{ margin: 0, color: colors.text.secondary }}>Loading AI costs...</p>
          </div>
        )}

        {/* Data Table */}
        {!loading && !error && (
          <div style={tableContainerStyle}>
            {entries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing[8] }}>
                <p style={{ margin: 0, color: colors.text.tertiary }}>
                  No AI cost records found. AI costs will appear here as you use AI features.
                </p>
              </div>
            ) : (
              <>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Timestamp</th>
                      <th style={thStyle}>Project</th>
                      <th style={thStyle}>Request Type</th>
                      <th style={thStyle}>Tokens In</th>
                      <th style={thStyle}>Tokens Out</th>
                      <th style={thStyle}>Cost (USD)</th>
                      <th style={thStyle}>Cost (GBP)</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td style={tdStyle}>{formatDate(entry.created_at)}</td>
                        <td style={tdStyle}>
                          {entry.project_name || '—'}
                          {entry.series_name && (
                            <span
                              style={{
                                display: 'block',
                                fontSize: typography.fontSize.xs,
                                color: colors.text.tertiary,
                              }}
                            >
                              {entry.series_name}
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>{entry.request_type_label}</td>
                        <td style={tdStyle}>{formatTokens(entry.input_tokens)}</td>
                        <td style={tdStyle}>{formatTokens(entry.output_tokens)}</td>
                        <td style={tdStyle}>${entry.cost_usd.toFixed(4)}</td>
                        <td style={tdStyle}>£{entry.cost_gbp.toFixed(4)}</td>
                        <td style={tdStyle}>
                          <span style={statusBadgeStyle(entry.success === 1)}>
                            {entry.success === 1 ? 'Success' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div style={paginationStyle}>
                  <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                    Showing {pagination.offset + 1} -{' '}
                    {Math.min(pagination.offset + entries.length, total)} of {total} records
                  </span>
                  <div style={{ display: 'flex', gap: spacing[2] }}>
                    <button
                      style={{
                        ...secondaryButtonStyle,
                        opacity: pagination.offset === 0 ? 0.5 : 1,
                        cursor: pagination.offset === 0 ? 'not-allowed' : 'pointer',
                      }}
                      onClick={() => handlePageChange(Math.max(0, pagination.offset - pagination.limit))}
                      disabled={pagination.offset === 0}
                    >
                      Previous
                    </button>
                    <button
                      style={{
                        ...secondaryButtonStyle,
                        opacity: pagination.offset + entries.length >= total ? 0.5 : 1,
                        cursor: pagination.offset + entries.length >= total ? 'not-allowed' : 'pointer',
                      }}
                      onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                      disabled={pagination.offset + entries.length >= total}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
