'use client';

import { useState } from 'react';
import { Recommendation } from '../types';

interface RecommendationsProps {
  recommendations: Recommendation[];
}

export default function Recommendations({ recommendations }: RecommendationsProps) {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const filtered = recommendations.filter(
    (rec) => filter === 'all' || rec.priority === filter
  );

  const getPriorityColour = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-400 bg-red-400/10';
      case 'medium':
        return 'text-amber-400 bg-amber-400/10';
      case 'low':
        return 'text-blue-400 bg-blue-400/10';
      default:
        return 'text-text-secondary bg-slate-700/50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-centre">
        <h2 className="text-2xl font-bold">Recommendations</h2>

        {/* Filter buttons */}
        <div className="flex space-x-2">
          {['all', 'high', 'medium', 'low'].map((priority) => (
            <button
              key={priority}
              onClick={() => setFilter(priority as any)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === priority
                  ? 'bg-primary-600 text-white'
                  : 'bg-background-surface text-text-secondary hover:bg-background-hover'
              }`}
            >
              {priority === 'all' ? 'All' : priority.charAt(0).toUpperCase() + priority.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-centre py-12">
          <p className="text-text-muted">No recommendations for this filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec, index) => (
            <div key={index} className="card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-centre space-x-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getPriorityColour(
                      rec.priority
                    )}`}
                  >
                    {rec.priority}
                  </span>
                  <span className="text-sm text-text-muted">{rec.category}</span>
                </div>
                {rec.estimatedImpact && (
                  <span className="text-sm text-primary-400">
                    Impact: {rec.estimatedImpact}
                  </span>
                )}
              </div>

              <h4 className="font-semibold text-lg mb-2">{rec.issue}</h4>
              <p className="text-text-secondary mb-3">{rec.suggestion}</p>

              {rec.affectedChapters && rec.affectedChapters.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <span className="text-sm text-text-muted">
                    Affected chapters: {rec.affectedChapters.join(', ')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
