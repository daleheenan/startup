'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ScoreCard from '../../components/ScoreCard';
import CategoryBreakdown from '../../components/CategoryBreakdown';
import StrengthsWeaknesses from '../../components/StrengthsWeaknesses';
import Recommendations from '../../components/Recommendations';
import AnalysisProgress from '../../components/AnalysisProgress';
import { isAuthenticated } from '../../lib/auth';
import { getAnalysisResults } from '../../lib/api';
import { AnalysisResult } from '../../types';

export default function ResultsPage({ params }: { params: { analysisId: string } }) {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    async function loadResults() {
      try {
        const data = await getAnalysisResults(params.analysisId);
        setResult(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }

    loadResults();
  }, [params.analysisId, router]);

  const handleComplete = async () => {
    try {
      const data = await getAnalysisResults(params.analysisId);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-centre py-12">
              <div className="spinner" />
            </div>
          ) : error ? (
            <div className="card bg-red-500/10 border-red-500/30">
              <p className="text-red-400">{error}</p>
              <Link href="/dashboard" className="btn-primary mt-4 inline-block">
                Back to Dashboard
              </Link>
            </div>
          ) : result?.status === 'pending' || result?.status === 'processing' ? (
            <div className="space-y-8">
              <div className="flex justify-between items-centre">
                <h1 className="text-4xl font-bold">Analysis in Progress</h1>
                <Link href="/dashboard" className="btn-ghost">
                  Back to Dashboard
                </Link>
              </div>
              <AnalysisProgress
                analysisId={params.analysisId}
                onComplete={handleComplete}
                onError={(err) => setError(err.message)}
              />
            </div>
          ) : result?.status === 'failed' ? (
            <div className="card bg-red-500/10 border-red-500/30">
              <h2 className="text-2xl font-bold mb-2 text-red-400">Analysis Failed</h2>
              <p className="text-text-secondary mb-4">
                {result.error || 'An error occurred during analysis'}
              </p>
              <div className="flex space-x-4">
                <Link href="/analyse" className="btn-primary">
                  Try Again
                </Link>
                <Link href="/dashboard" className="btn-secondary">
                  Back to Dashboard
                </Link>
              </div>
            </div>
          ) : result?.status === 'completed' ? (
            <div className="space-y-12">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-bold mb-2">Analysis Results</h1>
                  <p className="text-text-secondary">
                    Completed {result.completedAt ? new Date(result.completedAt).toLocaleDateString() : ''}
                  </p>
                </div>
                <div className="flex space-x-4">
                  <Link href="/analyse" className="btn-primary">
                    Analyse Another
                  </Link>
                  <Link href="/dashboard" className="btn-secondary">
                    Dashboard
                  </Link>
                </div>
              </div>

              {/* Overall Score */}
              <div className="flex justify-centre">
                <ScoreCard score={result.overallScore} size="lg" />
              </div>

              {/* Category Breakdown */}
              <CategoryBreakdown categories={result.categories} />

              {/* Strengths & Weaknesses */}
              <StrengthsWeaknesses
                strengths={result.strengths}
                weaknesses={result.weaknesses}
              />

              {/* Recommendations */}
              <Recommendations recommendations={result.recommendations} />

              {/* Token Usage (if available) */}
              {result.tokenUsage && (
                <div className="card">
                  <h3 className="text-lg font-semibold mb-3">Analysis Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-text-muted">Input Tokens</span>
                      <div className="text-xl font-bold">
                        {result.tokenUsage.totalInput.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-text-muted">Output Tokens</span>
                      <div className="text-xl font-bold">
                        {result.tokenUsage.totalOutput.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-text-muted">Duration</span>
                      <div className="text-xl font-bold">
                        {result.durationMs ? `${(result.durationMs / 1000).toFixed(1)}s` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-text-muted">Cost</span>
                      <div className="text-xl font-bold">
                        £{result.tokenUsage.estimatedCostGbp.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <p>Unknown analysis status</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
