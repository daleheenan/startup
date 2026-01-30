'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { colors, typography, spacing, borderRadius, shadows } from '@/app/lib/design-tokens';
import { SimpleBarChart } from '@/app/components/analytics/SimpleBarChart';
import { SimpleDonutChart } from '@/app/components/analytics/SimpleDonutChart';

interface OverviewStats {
  total_books: number;
  total_words: number;
  total_projects: number;
  total_series: number;
  total_pen_names: number;
  published_books: number;
}

interface PenNameData {
  pen_name_id: string;
  pen_name: string;
  book_count: number;
  word_count: number;
}

interface GenreData {
  genre: string;
  book_count: number;
}

interface StatusData {
  status: string;
  count: number;
}

interface YearData {
  year: number;
  book_count: number;
  word_count: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: colors.status.setup,
  beta_readers: colors.metrics.blue,
  editing: colors.metrics.orange,
  submitted: colors.semantic.info,
  published: colors.semantic.successDark,
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  beta_readers: 'Beta Readers',
  editing: 'Editing',
  submitted: 'Submitted',
  published: 'Published',
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [penNameData, setPenNameData] = useState<PenNameData[]>([]);
  const [genreData, setGenreData] = useState<GenreData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [yearData, setYearData] = useState<YearData[]>([]);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        // Fetch all analytics in parallel, handling individual failures gracefully
        const results = await Promise.allSettled([
          fetch(`${API_URL}/api/analytics/overview`, { headers }),
          fetch(`${API_URL}/api/analytics/by-pen-name`, { headers }),
          fetch(`${API_URL}/api/analytics/by-genre`, { headers }),
          fetch(`${API_URL}/api/analytics/by-status`, { headers }),
          fetch(`${API_URL}/api/analytics/by-year`, { headers }),
        ]);

        // Process overview - this is the most important endpoint
        const overviewResult = results[0];
        if (overviewResult.status === 'fulfilled' && overviewResult.value.ok) {
          const overviewData = await overviewResult.value.json();
          setOverview(overviewData);
        } else {
          // If overview fails, show error but continue loading other data
          console.error('Failed to fetch overview analytics');
          setOverview({
            total_books: 0,
            total_words: 0,
            total_projects: 0,
            total_series: 0,
            total_pen_names: 0,
            published_books: 0,
          });
        }

        // Process pen name data
        const penNameResult = results[1];
        if (penNameResult.status === 'fulfilled' && penNameResult.value.ok) {
          const penNameData = await penNameResult.value.json();
          setPenNameData(penNameData.data || []);
        }

        // Process genre data
        const genreResult = results[2];
        if (genreResult.status === 'fulfilled' && genreResult.value.ok) {
          const genreData = await genreResult.value.json();
          setGenreData(genreData.data || []);
        }

        // Process status data
        const statusResult = results[3];
        if (statusResult.status === 'fulfilled' && statusResult.value.ok) {
          const statusData = await statusResult.value.json();
          setStatusData(statusData.data || []);
        }

        // Process year data
        const yearResult = results[4];
        if (yearResult.status === 'fulfilled' && yearResult.value.ok) {
          const yearData = await yearResult.value.json();
          setYearData(yearData.data || []);
        }

        // Only set error if ALL requests failed
        const allFailed = results.every(
          (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)
        );
        if (allFailed) {
          throw new Error('Unable to connect to server. Please check your connection and try again.');
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: spacing[8],
          textAlign: 'center',
          color: colors.text.secondary,
        }}
      >
        Loading analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: spacing[8],
          textAlign: 'center',
        }}
      >
        <p style={{ color: colors.semantic.error, marginBottom: spacing[4] }}>
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: `${spacing[3]} ${spacing[6]}`,
            backgroundColor: colors.brand.primary,
            color: colors.text.inverse,
            border: 'none',
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: spacing[8], maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: spacing[8] }}>
        <h1
          style={{
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing[2],
          }}
        >
          Analytics Dashboard
        </h1>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base }}>
          Overview of your writing portfolio and productivity
        </p>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: spacing[4],
            marginBottom: spacing[8],
          }}
        >
          <StatCard label="Total Books" value={overview.total_books} color={colors.metrics.blue} />
          <StatCard
            label="Total Words"
            value={overview.total_words.toLocaleString()}
            color={colors.metrics.green}
          />
          <StatCard label="Projects" value={overview.total_projects} color={colors.metrics.orange} />
          <StatCard label="Series" value={overview.total_series} color={colors.brand.primary} />
          <StatCard label="Pen Names" value={overview.total_pen_names} color={colors.metrics.red} />
          <StatCard
            label="Published"
            value={overview.published_books}
            color={colors.semantic.successDark}
          />
        </div>
      )}

      {/* Charts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: spacing[6],
        }}
      >
        {/* Books by Pen Name */}
        <SimpleBarChart
          title="Books by Pen Name"
          data={penNameData.map(item => ({
            label: item.pen_name,
            value: item.book_count,
            color: colors.brand.primary,
          }))}
          horizontal
        />

        {/* Books by Genre */}
        <SimpleBarChart
          title="Books by Genre"
          data={genreData.map(item => ({
            label: item.genre,
            value: item.book_count,
            color: colors.metrics.blue,
          }))}
          horizontal
        />

        {/* Books by Status */}
        <SimpleDonutChart
          title="Books by Status"
          data={statusData.map(item => ({
            label: STATUS_LABELS[item.status] || item.status,
            value: item.count,
            color: STATUS_COLORS[item.status] || colors.text.secondary,
          }))}
        />

        {/* Words by Year */}
        <SimpleBarChart
          title="Words by Year"
          data={yearData.map(item => ({
            label: item.year.toString(),
            value: item.word_count,
            color: colors.semantic.successDark,
          }))}
          valueLabel="words"
        />
      </div>

      {/* Footer Navigation */}
      <div
        style={{
          marginTop: spacing[8],
          padding: spacing[6],
          backgroundColor: colors.background.surface,
          borderRadius: borderRadius.lg,
          border: `1px solid ${colors.border.default}`,
          textAlign: 'center',
        }}
      >
        <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
          Want to dive deeper into your writing?
        </p>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            padding: `${spacing[3]} ${spacing[6]}`,
            backgroundColor: colors.brand.primary,
            color: colors.text.inverse,
            textDecoration: 'none',
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div
      style={{
        padding: spacing[6],
        backgroundColor: colors.background.surface,
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.border.default}`,
        boxShadow: shadows.sm,
      }}
    >
      <div
        style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          marginBottom: spacing[2],
          fontWeight: typography.fontWeight.medium,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: typography.fontSize['3xl'],
          fontWeight: typography.fontWeight.bold,
          color: color,
        }}
      >
        {value}
      </div>
    </div>
  );
}
