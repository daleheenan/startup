// API client for NovelForge backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface QueueStats {
  queue: {
    pending: number;
    running: number;
    completed: number;
    paused: number;
    failed: number;
    total: number;
  };
  session: {
    isActive: boolean;
    requestsThisSession: number;
    timeRemaining: string;
    resetTime: string | null;
  };
}

export interface HealthStatus {
  status: string;
  timestamp: string;
}

/**
 * Check if the backend server is healthy
 */
export async function checkHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error('Backend server is not responding');
  }
  return response.json();
}

/**
 * Get queue and session statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  const response = await fetch(`${API_BASE_URL}/api/queue/stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch queue stats');
  }
  return response.json();
}

/**
 * Create a test job
 */
export async function createTestJob(type: string, targetId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/queue/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, targetId }),
  });

  if (!response.ok) {
    throw new Error('Failed to create test job');
  }

  return response.json();
}
