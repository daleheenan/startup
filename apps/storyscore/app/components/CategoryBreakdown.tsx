'use client';

import { useState } from 'react';
import { CategoryScores } from '../types';
import { getScoreColour } from '../lib/constants';

interface CategoryBreakdownProps {
  categories: CategoryScores;
}

export default function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const categoryList = [
    { key: 'plot', label: 'Plot', icon: '📖' },
    { key: 'character', label: 'Character', icon: '👥' },
    { key: 'pacing', label: 'Pacing', icon: '⚡' },
    { key: 'prose', label: 'Prose', icon: '✍️' },
    { key: 'marketability', label: 'Marketability', icon: '📊' },
  ];

  const toggleCategory = (key: string) => {
    setExpandedCategory(expandedCategory === key ? null : key);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-6">Category Breakdown</h2>
      {categoryList.map(({ key, label, icon }) => {
        const category = categories[key as keyof CategoryScores];
        if (!category) return null;

        const colour = getScoreColour(category.score);
        const isExpanded = expandedCategory === key;

        return (
          <div key={key} className="card">
            {/* Main category bar */}
            <button
              onClick={() => toggleCategory(key)}
              className="w-full text-left"
            >
              <div className="flex items-centre justify-between mb-3">
                <div className="flex items-centre space-x-3">
                  <span className="text-2xl">{icon}</span>
                  <span className="text-lg font-semibold">{label}</span>
                </div>
                <div className="flex items-centre space-x-4">
                  <span className="text-2xl font-bold" style={{ color: colour }}>
                    {Math.round(category.score)}
                  </span>
                  <svg
                    className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              {/* Progress bar */}
              <div className="progress-bar">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${category.score}%`,
                    backgroundColor: colour,
                  }}
                />
              </div>
            </button>

            {/* Expanded subscores */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                {/* Notes */}
                {category.notes && (
                  <p className="text-text-secondary text-sm mb-4">{category.notes}</p>
                )}

                {/* Subscores */}
                {category.subscores && Object.keys(category.subscores).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                      Subscores
                    </h4>
                    {Object.entries(category.subscores).map(([subKey, subScore]) => {
                      const subColour = getScoreColour(subScore);
                      return (
                        <div key={subKey} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">
                              {subKey.replace(/_/g, ' ')}
                            </span>
                            <span style={{ color: subColour }} className="font-semibold">
                              {Math.round(subScore)}
                            </span>
                          </div>
                          <div className="progress-bar h-1.5">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${subScore}%`,
                                backgroundColor: subColour,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
