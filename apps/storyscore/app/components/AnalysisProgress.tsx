'use client';

import { useEffect, useState } from 'react';
import { connectToProgress } from '../lib/sse';
import { AnalysisProgress as ProgressType } from '../types';

interface AnalysisProgressProps {
  analysisId: string;
  onComplete?: (data: any) => void;
  onError?: (error: Error) => void;
}

export default function AnalysisProgress({ analysisId, onComplete, onError }: AnalysisProgressProps) {
  const [progress, setProgress] = useState<ProgressType>({
    analysisId,
    step: 'Initialising',
    progress: 0,
    message: 'Preparing to analyse your story...',
  });
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    try {
      cleanup = connectToProgress(
        analysisId,
        (event) => {
          switch (event.type) {
            case 'story_score:started':
              setProgress({
                analysisId,
                step: 'Started',
                progress: 5,
                message: 'Analysis started',
              });
              break;
            case 'story_score:progress':
              setProgress({
                analysisId: event.data.analysisId,
                step: event.data.step || 'Processing',
                progress: event.data.progress || 50,
                message: event.data.message || 'Analysing...',
                estimatedTimeRemaining: event.data.estimatedTime,
              });
              break;
            case 'story_score:completed':
              setProgress({
                analysisId,
                step: 'Complete',
                progress: 100,
                message: 'Analysis complete!',
              });
              setIsComplete(true);
              if (onComplete) {
                onComplete(event.data);
              }
              break;
            case 'story_score:failed':
              const errorMsg = event.data.error || 'Analysis failed';
              setError(errorMsg);
              if (onError) {
                onError(new Error(errorMsg));
              }
              break;
          }
        },
        (err) => {
          setError(err.message);
          if (onError) {
            onError(err);
          }
        }
      );
    } catch (err: any) {
      setError(err.message);
      if (onError) {
        onError(err);
      }
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [analysisId, onComplete, onError]);

  if (error) {
    return (
      <div className="card bg-red-500/10 border-red-500/30">
        <div className="flex items-start space-x-3">
          <svg
            className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-semibold text-red-400 mb-1">Analysis Failed</h3>
            <p className="text-text-secondary">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="space-y-6">
        {/* Progress header */}
        <div className="text-centre">
          <h3 className="text-2xl font-bold mb-2">
            {isComplete ? '✓ Complete' : 'Analysing Your Story'}
          </h3>
          <p className="text-text-secondary">{progress.message}</p>
        </div>

        {/* Progress circle */}
        <div className="flex justify-centre">
          <div className="relative w-48 h-48">
            <svg className="transform -rotate-90 w-full h-full">
              <circle
                cx="50%"
                cy="50%"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-slate-700"
              />
              <circle
                cx="50%"
                cy="50%"
                r="45"
                stroke="url(#gradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 - (progress.progress / 100) * 2 * Math.PI * 45}`}
                className="transition-all duration-500"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-centre justify-centre">
              <span className="text-4xl font-bold gradient-text">
                {Math.round(progress.progress)}%
              </span>
            </div>
          </div>
        </div>

        {/* Current step */}
        <div className="text-centre">
          <p className="text-sm font-medium text-primary-400">{progress.step}</p>
          {progress.estimatedTimeRemaining && (
            <p className="text-xs text-text-muted mt-1">
              Est. {progress.estimatedTimeRemaining} remaining
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress.progress}%` }}
          />
        </div>

        {/* Loading animation */}
        {!isComplete && (
          <div className="flex justify-centre">
            <div className="spinner" />
          </div>
        )}
      </div>
    </div>
  );
}
