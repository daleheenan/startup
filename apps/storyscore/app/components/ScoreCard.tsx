'use client';

import { getScoreColour } from '../lib/constants';

interface ScoreCardProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ScoreCard({ score, label = 'Overall Score', size = 'md' }: ScoreCardProps) {
  const colour = getScoreColour(score);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const sizes = {
    sm: { container: 'w-32 h-32', text: 'text-2xl', label: 'text-sm' },
    md: { container: 'w-48 h-48', text: 'text-4xl', label: 'text-base' },
    lg: { container: 'w-64 h-64', text: 'text-6xl', label: 'text-lg' },
  };

  return (
    <div className="flex flex-col items-centre">
      <div className={`${sizes[size].container} relative`}>
        <svg className="transform -rotate-90 w-full h-full">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-slate-700"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r="45"
            stroke={colour}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: 'drop-shadow(0 0 8px currentColor)',
            }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-centre justify-centre">
          <span className={`${sizes[size].text} font-bold`} style={{ color: colour }}>
            {Math.round(score)}
          </span>
          <span className="text-text-secondary text-sm">/ 100</span>
        </div>
      </div>
      {label && (
        <p className={`${sizes[size].label} text-text-secondary mt-4 font-medium`}>
          {label}
        </p>
      )}
    </div>
  );
}
