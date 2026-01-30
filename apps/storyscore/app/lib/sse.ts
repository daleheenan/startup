// Server-Sent Events (SSE) utilities for real-time progress updates

import { getToken } from './auth';
import { API_BASE_URL } from './constants';
import { AnalysisProgress } from '../types';

export type ProgressEventType =
  | 'story_score:started'
  | 'story_score:progress'
  | 'story_score:completed'
  | 'story_score:failed';

export interface ProgressEvent {
  type: ProgressEventType;
  data: any;
}

export type ProgressCallback = (event: ProgressEvent) => void;

/**
 * Connect to progress stream for real-time updates
 */
export function connectToProgress(
  analysisId: string,
  onEvent: ProgressCallback,
  onError?: (error: Error) => void
): () => void {
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const url = `${API_BASE_URL}/api/progress/stream?token=${encodeURIComponent(token)}`;
  const eventSource = new EventSource(url);

  // Listen for analysis-specific events
  const eventTypes: ProgressEventType[] = [
    'story_score:started',
    'story_score:progress',
    'story_score:completed',
    'story_score:failed',
  ];

  const handlers = eventTypes.map(eventType => {
    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        // Only forward events for this analysisId
        if (data.analysisId === analysisId) {
          onEvent({ type: eventType, data });
        }
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };
    eventSource.addEventListener(eventType, handler);
    return { eventType, handler };
  });

  // Error handler
  const errorHandler = (e: Event) => {
    console.error('SSE connection error:', e);
    if (onError) {
      onError(new Error('Connection to progress stream failed'));
    }
  };
  eventSource.addEventListener('error', errorHandler);

  // Return cleanup function
  return () => {
    handlers.forEach(({ eventType, handler }) => {
      eventSource.removeEventListener(eventType, handler);
    });
    eventSource.removeEventListener('error', errorHandler);
    eventSource.close();
  };
}

/**
 * Simple promise-based progress tracker
 * Returns a promise that resolves when analysis is complete
 */
export function waitForAnalysis(
  analysisId: string,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const cleanup = connectToProgress(
      analysisId,
      (event) => {
        switch (event.type) {
          case 'story_score:progress':
            if (onProgress) {
              onProgress({
                analysisId: event.data.analysisId,
                step: event.data.step,
                progress: event.data.progress,
                message: event.data.message,
                estimatedTimeRemaining: event.data.estimatedTime,
              });
            }
            break;
          case 'story_score:completed':
            cleanup();
            resolve(event.data);
            break;
          case 'story_score:failed':
            cleanup();
            reject(new Error(event.data.error || 'Analysis failed'));
            break;
        }
      },
      (error) => {
        cleanup();
        reject(error);
      }
    );
  });
}
