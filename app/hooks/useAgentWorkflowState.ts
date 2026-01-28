import { useState, useEffect, useMemo } from 'react';
import { useProgressStream, JobUpdate, QueueStats } from '../lib/progress-stream';

// Agent phases for colour-coding
export type AgentPhase = 'creation' | 'editorial' | 'specialist' | 'finalisation';

// Job types relevant to chapter generation workflow
export type ChapterJobType =
  | 'generate_chapter'
  | 'dev_edit'
  | 'author_revision'
  | 'line_edit'
  | 'continuity_check'
  | 'copy_edit'
  | 'proofread'
  | 'sensitivity_review'
  | 'research_review'
  | 'beta_reader_review'
  | 'opening_review'
  | 'dialogue_review'
  | 'hook_review'
  | 'generate_summary'
  | 'update_states';

export type JobStatus = 'pending' | 'running' | 'completed' | 'paused' | 'failed';

export interface AgentNode {
  id: string;
  type: ChapterJobType;
  label: string;
  shortLabel: string;
  phase: AgentPhase;
  order: number;
}

export interface AgentStatus {
  status: JobStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ChapterWorkflowState {
  chapterId: string;
  chapterNumber: number;
  agents: Map<ChapterJobType, AgentStatus>;
  currentAgent: ChapterJobType | null;
  overallProgress: number;
}

// The 15-agent pipeline (14 core + author_revision which may be dynamically added)
export const AGENT_PIPELINE: AgentNode[] = [
  // Creation Phase (green)
  { id: 'gen', type: 'generate_chapter', label: 'Generate Chapter', shortLabel: 'Author', phase: 'creation', order: 1 },

  // Editorial Phase (blue)
  { id: 'dev', type: 'dev_edit', label: 'Developmental Edit', shortLabel: 'Dev Ed', phase: 'editorial', order: 2 },
  { id: 'auth', type: 'author_revision', label: 'Author Revision', shortLabel: 'Revise', phase: 'editorial', order: 3 },
  { id: 'line', type: 'line_edit', label: 'Line Edit', shortLabel: 'Line', phase: 'editorial', order: 4 },
  { id: 'copy', type: 'copy_edit', label: 'Copy Edit', shortLabel: 'Copy', phase: 'editorial', order: 5 },
  { id: 'proof', type: 'proofread', label: 'Proofread', shortLabel: 'Proof', phase: 'editorial', order: 6 },

  // Specialist Phase (purple)
  { id: 'cont', type: 'continuity_check', label: 'Continuity Check', shortLabel: 'Cont', phase: 'specialist', order: 7 },
  { id: 'sens', type: 'sensitivity_review', label: 'Sensitivity Review', shortLabel: 'Sens', phase: 'specialist', order: 8 },
  { id: 'res', type: 'research_review', label: 'Research Review', shortLabel: 'Research', phase: 'specialist', order: 9 },
  { id: 'beta', type: 'beta_reader_review', label: 'Beta Reader', shortLabel: 'Beta', phase: 'specialist', order: 10 },
  { id: 'open', type: 'opening_review', label: 'Opening Review', shortLabel: 'Opening', phase: 'specialist', order: 11 },
  { id: 'dial', type: 'dialogue_review', label: 'Dialogue Review', shortLabel: 'Dialog', phase: 'specialist', order: 12 },
  { id: 'hook', type: 'hook_review', label: 'Hook Review', shortLabel: 'Hook', phase: 'specialist', order: 13 },

  // Finalisation Phase (orange)
  { id: 'sum', type: 'generate_summary', label: 'Generate Summary', shortLabel: 'Summary', phase: 'finalisation', order: 14 },
  { id: 'state', type: 'update_states', label: 'Update States', shortLabel: 'States', phase: 'finalisation', order: 15 },
];

// Phase colours for the visualisation
export const PHASE_COLOURS = {
  creation: { primary: '#10B981', light: '#D1FAE5', dark: '#059669' },
  editorial: { primary: '#3B82F6', light: '#DBEAFE', dark: '#1D4ED8' },
  specialist: { primary: '#8B5CF6', light: '#EDE9FE', dark: '#6D28D9' },
  finalisation: { primary: '#F59E0B', light: '#FEF3C7', dark: '#D97706' },
};

// Check if a job type is part of the chapter workflow
const isChapterJobType = (type: string): type is ChapterJobType => {
  return AGENT_PIPELINE.some((agent) => agent.type === type);
};

// Get agent order for progress calculation
const getAgentOrder = (type: ChapterJobType): number => {
  const agent = AGENT_PIPELINE.find((a) => a.type === type);
  return agent?.order ?? 0;
};

interface UseAgentWorkflowStateResult {
  chapters: Map<string, ChapterWorkflowState>;
  connected: boolean;
  activeChapterId: string | null;
  queueStats: QueueStats | undefined;
  totalAgents: number;
}

/**
 * Custom hook for tracking agent workflow state across chapters
 * Consumes the SSE progress stream and maps job updates to workflow states
 */
export function useAgentWorkflowState(
  bookId?: string,
  chapterId?: string
): UseAgentWorkflowStateResult {
  const { connected, jobUpdates, currentProgress, queueStats } = useProgressStream();

  const [chapters, setChapters] = useState<Map<string, ChapterWorkflowState>>(new Map());
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  // Process job updates and update chapter workflow states
  useEffect(() => {
    if (jobUpdates.length === 0) return;

    setChapters((prev) => {
      const updated = new Map(prev);

      for (const job of jobUpdates) {
        // Only process chapter workflow job types
        if (!isChapterJobType(job.type)) continue;

        const targetId = job.target_id;

        // Get or create chapter state
        let chapterState = updated.get(targetId);
        if (!chapterState) {
          chapterState = {
            chapterId: targetId,
            chapterNumber: 0, // Will be updated from chapter data
            agents: new Map(),
            currentAgent: null,
            overallProgress: 0,
          };
        }

        // Update agent status
        const agentStatus: AgentStatus = {
          status: job.status,
          startedAt: job.status === 'running' ? job.timestamp : chapterState.agents.get(job.type)?.startedAt,
          completedAt: job.status === 'completed' ? job.timestamp : undefined,
        };
        chapterState.agents.set(job.type, agentStatus);

        // Track current running agent
        if (job.status === 'running') {
          chapterState.currentAgent = job.type;
          setActiveChapterId(targetId);
        } else if (job.status === 'completed' && chapterState.currentAgent === job.type) {
          chapterState.currentAgent = null;
        }

        // Calculate overall progress
        const completedCount = Array.from(chapterState.agents.values()).filter(
          (a) => a.status === 'completed'
        ).length;
        chapterState.overallProgress = Math.round((completedCount / AGENT_PIPELINE.length) * 100);

        updated.set(targetId, chapterState);
      }

      return updated;
    });
  }, [jobUpdates]);

  // Update active chapter from current progress
  useEffect(() => {
    if (currentProgress?.chapter_id) {
      setActiveChapterId(currentProgress.chapter_id);
    }
  }, [currentProgress]);

  return {
    chapters,
    connected,
    activeChapterId,
    queueStats,
    totalAgents: AGENT_PIPELINE.length,
  };
}
