// API client for StoryScore backend

import { fetchWithAuth, fetchJson, post } from './fetch-utils';
import { AnalysisResult, AnalysisHistoryItem } from '../types';

export interface SubmitAnalysisRequest {
  contentType: 'book' | 'chapter' | 'raw';
  contentId: string;
  analysisType?: 'full' | 'quick' | 'comparison';
  title?: string;
  content?: string; // For raw text submissions
}

export interface SubmitAnalysisResponse {
  analysisId: string;
  jobId: string;
  status: string;
  message: string;
  sseEndpoint: string;
}

/**
 * Submit content for analysis
 */
export async function submitAnalysis(request: SubmitAnalysisRequest): Promise<SubmitAnalysisResponse> {
  return post<SubmitAnalysisResponse>('/api/story-scores/analyse', request);
}

/**
 * Submit raw text for analysis
 */
export async function submitRawText(
  title: string,
  content: string,
  analysisType: 'full' | 'quick' | 'comparison' = 'full',
  genre?: string
): Promise<SubmitAnalysisResponse> {
  // First, create a submission
  const submission = await post<{ id: string }>('/api/story-scores/submit', {
    title,
    content,
    genre,
    wordCount: content.split(/\s+/).length,
  });

  // Then, submit for analysis
  return submitAnalysis({
    contentType: 'raw',
    contentId: submission.id,
    analysisType,
  });
}

/**
 * Get analysis status and results
 */
export async function getAnalysisResults(analysisId: string): Promise<AnalysisResult> {
  return fetchJson<AnalysisResult>(`/api/story-scores/${analysisId}`);
}

/**
 * Get analysis history
 */
export async function getAnalysisHistory(): Promise<AnalysisHistoryItem[]> {
  return fetchJson<AnalysisHistoryItem[]>('/api/story-scores/history');
}

/**
 * Get detailed analysis breakdown
 */
export async function getDetailedAnalysis(analysisId: string): Promise<any> {
  return fetchJson(`/api/story-scores/${analysisId}/detailed`);
}

/**
 * Cancel a pending analysis
 */
export async function cancelAnalysis(analysisId: string): Promise<void> {
  await fetchWithAuth(`/api/story-scores/${analysisId}`, {
    method: 'DELETE',
  });
}

/**
 * Health check
 */
export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  return fetchJson('/health', { skipAuth: true });
}
