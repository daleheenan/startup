'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  useAgentWorkflowState,
  AGENT_PIPELINE,
  PHASE_COLOURS,
  AgentPhase,
  ChapterJobType,
  JobStatus,
  AgentNode,
} from '../hooks/useAgentWorkflowState';

// Breakpoints for responsive design
const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
};

interface AgentWorkflowVisualizationProps {
  projectId: string;
  bookId?: string;
  chapterId?: string;
  showMultipleChapters?: boolean;
}

// SVG layout configuration
const SVG_CONFIG = {
  width: 1100,
  height: 140,
  nodeRadius: 16,
  nodeSpacing: 52,
  phaseGap: 20,
  rowY: 70,
  labelOffset: 28,
  phaseLabelY: 18,
};

// Phase definitions for grouping
const PHASES: { id: AgentPhase; label: string; startIndex: number; endIndex: number }[] = [
  { id: 'creation', label: 'Creation', startIndex: 0, endIndex: 0 },
  { id: 'editorial', label: 'Editorial', startIndex: 1, endIndex: 5 },
  { id: 'specialist', label: 'Specialist', startIndex: 6, endIndex: 12 },
  { id: 'finalisation', label: 'Finalisation', startIndex: 13, endIndex: 14 },
];

// Calculate X position for a node
const getNodeX = (index: number): number => {
  let x = 40; // Left margin
  let phaseGapsAdded = 0;

  for (let i = 0; i <= index; i++) {
    // Check if we're crossing a phase boundary
    const currentPhase = PHASES.find((p) => i >= p.startIndex && i <= p.endIndex);
    const prevPhase = i > 0 ? PHASES.find((p) => i - 1 >= p.startIndex && i - 1 <= p.endIndex) : null;

    if (prevPhase && currentPhase && prevPhase.id !== currentPhase.id) {
      phaseGapsAdded++;
    }

    if (i < index) {
      x += SVG_CONFIG.nodeSpacing;
    }
  }

  return x + phaseGapsAdded * SVG_CONFIG.phaseGap;
};

// Get phase background rectangle bounds
const getPhaseRect = (phase: (typeof PHASES)[0]): { x: number; width: number } => {
  const startX = getNodeX(phase.startIndex) - SVG_CONFIG.nodeRadius - 10;
  const endX = getNodeX(phase.endIndex) + SVG_CONFIG.nodeRadius + 10;
  return { x: startX, width: endX - startX };
};

// Get node fill colour based on status and phase
const getNodeFill = (status: JobStatus | undefined, phase: AgentPhase): string => {
  if (!status || status === 'pending') return '#E5E7EB';
  if (status === 'failed') return '#EF4444';
  if (status === 'paused') return '#9CA3AF';
  return PHASE_COLOURS[phase].primary;
};

// Get node stroke colour
const getNodeStroke = (status: JobStatus | undefined, phase: AgentPhase): string => {
  if (!status || status === 'pending') return '#D1D5DB';
  if (status === 'failed') return '#DC2626';
  if (status === 'running') return PHASE_COLOURS[phase].dark;
  return PHASE_COLOURS[phase].primary;
};

// Connection line colour
const getConnectionColour = (
  fromStatus: JobStatus | undefined,
  toStatus: JobStatus | undefined,
  fromPhase: AgentPhase
): string => {
  if (fromStatus === 'completed') return PHASE_COLOURS[fromPhase].primary;
  return '#D1D5DB';
};

// Checkmark SVG path
const CheckIcon = () => (
  <path
    d="M-5 0 L-2 3 L5 -4"
    fill="none"
    stroke="#FFFFFF"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

// Error X icon
const ErrorIcon = () => (
  <g stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round">
    <line x1="-4" y1="-4" x2="4" y2="4" />
    <line x1="4" y1="-4" x2="-4" y2="4" />
  </g>
);

// Pause icon
const PauseIcon = () => (
  <g fill="#FFFFFF">
    <rect x="-4" y="-5" width="3" height="10" rx="1" />
    <rect x="1" y="-5" width="3" height="10" rx="1" />
  </g>
);

export default function AgentWorkflowVisualization({
  projectId,
  bookId,
  chapterId,
  showMultipleChapters = true,
}: AgentWorkflowVisualizationProps) {
  const { chapters, connected, activeChapterId, queueStats, totalAgents } = useAgentWorkflowState(
    bookId,
    chapterId
  );

  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(chapterId || null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size for responsive layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.tablet);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get the active chapter state to display
  const activeChapter = useMemo(() => {
    if (selectedChapterId && chapters.has(selectedChapterId)) {
      return chapters.get(selectedChapterId);
    }
    if (activeChapterId && chapters.has(activeChapterId)) {
      return chapters.get(activeChapterId);
    }
    // Return the first chapter with any activity
    const firstActive = Array.from(chapters.values()).find(
      (c) => c.currentAgent !== null || c.overallProgress > 0
    );
    return firstActive || null;
  }, [chapters, selectedChapterId, activeChapterId]);

  // Get agent status for the active chapter
  const getAgentStatus = (agentType: ChapterJobType): JobStatus | undefined => {
    return activeChapter?.agents.get(agentType)?.status;
  };

  // Check if agent is currently running
  const isAgentRunning = (agentType: ChapterJobType): boolean => {
    return activeChapter?.currentAgent === agentType;
  };

  // No active generation - show empty state
  if (!activeChapter && chapters.size === 0) {
    return (
      <div
        style={{
          padding: '1.5rem',
          textAlign: 'center',
          color: '#64748B',
          fontSize: '0.875rem',
        }}
      >
        <div style={{ marginBottom: '0.5rem' }}>No active generation</div>
        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
          Start generating chapters to see the agent workflow
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Connection status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          padding: '0.5rem 0.75rem',
          background: connected ? '#F0FDF4' : '#FEF2F2',
          borderRadius: '6px',
          fontSize: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: connected ? '#10B981' : '#EF4444',
              animation: connected ? 'pulse 2s ease-in-out infinite' : 'none',
            }}
          />
          <span style={{ color: connected ? '#059669' : '#DC2626' }}>
            {connected ? 'Live updates active' : 'Disconnected'}
          </span>
        </div>
        {activeChapter && (
          <div style={{ color: '#64748B' }}>
            Progress: {activeChapter.overallProgress}% ({Math.round((activeChapter.overallProgress / 100) * totalAgents)}/{totalAgents} agents)
          </div>
        )}
      </div>

      {/* Chapter selector (if multiple chapters) */}
      {showMultipleChapters && chapters.size > 1 && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {Array.from(chapters.entries()).map(([id, chapter]) => (
            <button
              key={id}
              onClick={() => setSelectedChapterId(id)}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                borderRadius: '4px',
                border: selectedChapterId === id || (!selectedChapterId && activeChapterId === id)
                  ? '2px solid #667eea'
                  : '1px solid #E2E8F0',
                background: selectedChapterId === id || (!selectedChapterId && activeChapterId === id)
                  ? '#EEF2FF'
                  : '#FFFFFF',
                color: '#374151',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Ch. {chapter.chapterNumber || '?'} ({chapter.overallProgress}%)
            </button>
          ))}
        </div>
      )}

      {/* Mobile Compact View */}
      {isMobile && (
        <div style={{ marginBottom: '1rem' }}>
          {/* Phase progress bars */}
          {PHASES.map((phase) => {
            const phaseAgents = AGENT_PIPELINE.filter((a) => a.phase === phase.id);
            const completedCount = phaseAgents.filter(
              (a) => getAgentStatus(a.type) === 'completed'
            ).length;
            const runningAgent = phaseAgents.find((a) => isAgentRunning(a.type));
            const progress = (completedCount / phaseAgents.length) * 100;

            return (
              <div
                key={phase.id}
                style={{
                  marginBottom: '0.75rem',
                  padding: '0.75rem',
                  background: PHASE_COLOURS[phase.id].light,
                  borderRadius: '8px',
                  border: runningAgent ? `2px solid ${PHASE_COLOURS[phase.id].primary}` : 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: '0.813rem',
                      color: PHASE_COLOURS[phase.id].dark,
                    }}
                  >
                    {phase.label}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {completedCount}/{phaseAgents.length}
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: '6px',
                    background: '#E5E7EB',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: PHASE_COLOURS[phase.id].primary,
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                {/* Current agent indicator */}
                {runningAgent && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.75rem',
                      color: PHASE_COLOURS[phase.id].dark,
                    }}
                  >
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: PHASE_COLOURS[phase.id].primary,
                        animation: 'pulse 1.5s ease-in-out infinite',
                      }}
                    />
                    <span>{runningAgent.label}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SVG Workflow Diagram (desktop) */}
      {!isMobile && (
      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
        <svg
          viewBox={`0 0 ${SVG_CONFIG.width} ${SVG_CONFIG.height}`}
          style={{ width: '100%', minWidth: '800px', height: 'auto' }}
          role="img"
          aria-label="Agent workflow pipeline showing 15 agents processing the chapter"
        >
          {/* Phase background rectangles */}
          {PHASES.map((phase) => {
            const rect = getPhaseRect(phase);
            return (
              <g key={`phase-bg-${phase.id}`}>
                <rect
                  x={rect.x}
                  y={30}
                  width={rect.width}
                  height={SVG_CONFIG.height - 40}
                  rx="8"
                  fill={PHASE_COLOURS[phase.id].light}
                  opacity="0.5"
                />
                <text
                  x={rect.x + rect.width / 2}
                  y={SVG_CONFIG.phaseLabelY}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill={PHASE_COLOURS[phase.id].dark}
                >
                  {phase.label}
                </text>
              </g>
            );
          })}

          {/* Connection lines */}
          {AGENT_PIPELINE.slice(0, -1).map((agent, i) => {
            const nextAgent = AGENT_PIPELINE[i + 1];
            const fromX = getNodeX(i) + SVG_CONFIG.nodeRadius;
            const toX = getNodeX(i + 1) - SVG_CONFIG.nodeRadius;
            const fromStatus = getAgentStatus(agent.type);
            const toStatus = getAgentStatus(nextAgent.type);
            const isActive = fromStatus === 'running' || toStatus === 'running';

            return (
              <line
                key={`conn-${agent.id}`}
                x1={fromX}
                y1={SVG_CONFIG.rowY}
                x2={toX}
                y2={SVG_CONFIG.rowY}
                stroke={getConnectionColour(fromStatus, toStatus, agent.phase)}
                strokeWidth="2"
                strokeDasharray={fromStatus === 'completed' ? '0' : '4 4'}
                style={{
                  animation: isActive ? 'dash 0.5s linear infinite' : 'none',
                }}
              />
            );
          })}

          {/* Agent nodes */}
          {AGENT_PIPELINE.map((agent, i) => {
            const x = getNodeX(i);
            const status = getAgentStatus(agent.type);
            const running = isAgentRunning(agent.type);
            const isHovered = hoveredAgent === agent.id;

            return (
              <g
                key={agent.id}
                transform={`translate(${x}, ${SVG_CONFIG.rowY})`}
                onMouseEnter={() => setHoveredAgent(agent.id)}
                onMouseLeave={() => setHoveredAgent(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Pulse ring for running agents */}
                {running && (
                  <circle
                    r={SVG_CONFIG.nodeRadius + 6}
                    fill="none"
                    stroke={PHASE_COLOURS[agent.phase].primary}
                    strokeWidth="2"
                    opacity="0.5"
                    style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
                  />
                )}

                {/* Hover highlight */}
                {isHovered && (
                  <circle
                    r={SVG_CONFIG.nodeRadius + 3}
                    fill="none"
                    stroke={PHASE_COLOURS[agent.phase].dark}
                    strokeWidth="1"
                    opacity="0.3"
                  />
                )}

                {/* Main node circle */}
                <circle
                  r={SVG_CONFIG.nodeRadius}
                  fill={getNodeFill(status, agent.phase)}
                  stroke={getNodeStroke(status, agent.phase)}
                  strokeWidth="2"
                  style={{
                    transition: 'fill 0.3s ease, stroke 0.3s ease',
                  }}
                />

                {/* Status icon */}
                {status === 'completed' && <CheckIcon />}
                {status === 'failed' && <ErrorIcon />}
                {status === 'paused' && <PauseIcon />}
                {running && (
                  <circle
                    r="4"
                    fill="#FFFFFF"
                    style={{ animation: 'spin 1s linear infinite', transformOrigin: 'center' }}
                  />
                )}

                {/* Agent label */}
                <text
                  y={SVG_CONFIG.labelOffset}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight={running ? '600' : '400'}
                  fill={running ? PHASE_COLOURS[agent.phase].dark : '#64748B'}
                >
                  {agent.shortLabel}
                </text>

                {/* Tooltip on hover */}
                {isHovered && (
                  <g transform={`translate(0, ${-SVG_CONFIG.nodeRadius - 35})`}>
                    <rect
                      x="-50"
                      y="-12"
                      width="100"
                      height="24"
                      rx="4"
                      fill="#1F2937"
                      opacity="0.95"
                    />
                    <text
                      textAnchor="middle"
                      fontSize="10"
                      fill="#FFFFFF"
                      dominantBaseline="middle"
                    >
                      {agent.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          fontSize: '0.75rem',
          color: '#64748B',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#E5E7EB',
              border: '1px solid #D1D5DB',
            }}
          />
          <span>Pending</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#3B82F6',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <span>Running</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#10B981',
            }}
          />
          <span>Completed</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#EF4444',
            }}
          />
          <span>Failed</span>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.7;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes dash {
          to {
            stroke-dashoffset: -8;
          }
        }
      `}</style>
    </div>
  );
}
