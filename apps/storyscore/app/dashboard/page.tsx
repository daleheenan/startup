'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { isAuthenticated } from '../lib/auth';
import { getAnalysisHistory } from '../lib/api';
import { AnalysisHistoryItem } from '../types';
import { getScoreColour } from '../lib/constants';

export default function DashboardPage() {
  const router = useRouter();
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    async function loadHistory() {
      try {
        const data = await getAnalysisHistory();
        setHistory(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [router]);

  const getStatusBadge = (status: string) => {
    const colours: Record<string, string> = {
      completed: 'bg-green-400/10 text-green-400',
      processing: 'bg-blue-400/10 text-blue-400',
      pending: 'bg-amber-400/10 text-amber-400',
      failed: 'bg-red-400/10 text-red-400',
    };
    return colours[status] || 'bg-slate-700 text-text-muted';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-centre mb-8">
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <Link href="/analyse" className="btn-primary">
              New Analysis
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-centre py-12">
              <div className="spinner" />
            </div>
          ) : error ? (
            <div className="card bg-red-500/10 border-red-500/30">
              <p className="text-red-400">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="card text-centre py-16">
              <h2 className="text-2xl font-bold mb-4">No Analyses Yet</h2>
              <p className="text-text-secondary mb-6">
                Start your first analysis to see results here
              </p>
              <Link href="/analyse" className="btn-primary inline-block">
                Analyse Your Story
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {history.map((item) => (
                <Link
                  key={item.analysisId}
                  href={`/results/${item.analysisId}`}
                  className="card-hover block"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold mb-2">
                        {item.title || `Analysis ${item.analysisId.slice(0, 8)}`}
                      </h3>
                      <div className="flex items-centre space-x-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                        <span className="text-sm text-text-muted">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {item.overallScore !== undefined && (
                      <div className="text-right">
                        <div className="text-3xl font-bold" style={{ color: getScoreColour(item.overallScore) }}>
                          {Math.round(item.overallScore)}
                        </div>
                        <div className="text-sm text-text-muted">/ 100</div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
