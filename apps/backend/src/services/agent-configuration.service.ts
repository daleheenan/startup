import { createLogger } from './logger.service.js';

const logger = createLogger('services:agent-configuration');

// ============================================================================
// Type Definitions
// ============================================================================

export type GenerationMode = 'draft' | 'publication' | 'custom';

export type AgentType =
  | 'generate_chapter'
  | 'dev_edit'
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

export interface AgentCostInfo {
  type: AgentType;
  name: string;
  description: string;
  estimatedCost: number; // in USD
  estimatedTokens: number;
  category: 'core' | 'editing' | 'specialist' | 'finalization';
  isOptional: boolean;
}

export interface GenerationModeConfig {
  mode: GenerationMode;
  agents: AgentType[];
  totalCost: number;
  totalAgents: number;
  description: string;
}

export interface CostEstimate {
  mode: GenerationMode;
  totalAgents: number;
  costPerChapter: number;
  costPerBook: number; // Based on typical 35-40 chapter book
  agents: AgentCostInfo[];
  breakdown: {
    core: number;
    editing: number;
    specialist: number;
    finalization: number;
  };
}

// ============================================================================
// Agent Cost Data
// ============================================================================

/**
 * Cost estimates based on Claude Sonnet 3.5 pricing and typical chapter processing
 *
 * Assumptions:
 * - Input: ~8K tokens (chapter brief, story context, previous chapter)
 * - Output: Varies by agent (content generation = 3K tokens, editing = 500 tokens)
 * - Sonnet 3.5: $3/M input, $15/M output
 */
const AGENT_COSTS: Record<AgentType, AgentCostInfo> = {
  generate_chapter: {
    type: 'generate_chapter',
    name: 'Author Agent',
    description: 'Generates initial chapter draft from brief',
    estimatedCost: 0.069, // 8K input ($0.024) + 3K output ($0.045)
    estimatedTokens: 11000,
    category: 'core',
    isOptional: false,
  },
  dev_edit: {
    type: 'dev_edit',
    name: 'Developmental Editor',
    description: 'Reviews structure, pacing, and narrative flow',
    estimatedCost: 0.032, // 8K input + 800 output
    estimatedTokens: 8800,
    category: 'editing',
    isOptional: false,
  },
  line_edit: {
    type: 'line_edit',
    name: 'Line Editor',
    description: 'Polishes prose, improves sentence structure',
    estimatedCost: 0.030, // 8K input + 600 output
    estimatedTokens: 8600,
    category: 'editing',
    isOptional: false,
  },
  continuity_check: {
    type: 'continuity_check',
    name: 'Continuity Editor',
    description: 'Ensures consistency with story bible and previous chapters',
    estimatedCost: 0.028, // 8K input + 400 output
    estimatedTokens: 8400,
    category: 'editing',
    isOptional: false,
  },
  copy_edit: {
    type: 'copy_edit',
    name: 'Copy Editor',
    description: 'Fixes grammar, spelling, and style issues',
    estimatedCost: 0.027, // 8K input + 300 output
    estimatedTokens: 8300,
    category: 'editing',
    isOptional: false,
  },
  proofread: {
    type: 'proofread',
    name: 'Proofreader',
    description: 'Final quality check for typos and formatting',
    estimatedCost: 0.027, // 8K input + 300 output
    estimatedTokens: 8300,
    category: 'editing',
    isOptional: false,
  },
  sensitivity_review: {
    type: 'sensitivity_review',
    name: 'Sensitivity Reader',
    description: 'Reviews representation and cultural sensitivity',
    estimatedCost: 0.031, // 8K input + 700 output
    estimatedTokens: 8700,
    category: 'specialist',
    isOptional: true,
  },
  research_review: {
    type: 'research_review',
    name: 'Research Reviewer',
    description: 'Validates historical accuracy and factual details',
    estimatedCost: 0.030, // 8K input + 600 output
    estimatedTokens: 8600,
    category: 'specialist',
    isOptional: true,
  },
  beta_reader_review: {
    type: 'beta_reader_review',
    name: 'Beta Reader',
    description: 'Simulates reader engagement and emotional response',
    estimatedCost: 0.033, // 8K input + 900 output
    estimatedTokens: 8900,
    category: 'specialist',
    isOptional: true,
  },
  opening_review: {
    type: 'opening_review',
    name: 'Opening Specialist',
    description: 'Ensures strong chapter opening hook',
    estimatedCost: 0.028, // 8K input + 400 output
    estimatedTokens: 8400,
    category: 'specialist',
    isOptional: false, // Always run for strong pacing
  },
  dialogue_review: {
    type: 'dialogue_review',
    name: 'Dialogue Coach',
    description: 'Polishes dialogue for naturalness and character voice',
    estimatedCost: 0.029, // 8K input + 500 output
    estimatedTokens: 8500,
    category: 'specialist',
    isOptional: false, // Always run for dialogue quality
  },
  hook_review: {
    type: 'hook_review',
    name: 'Hook Specialist',
    description: 'Ensures chapter ending creates momentum',
    estimatedCost: 0.028, // 8K input + 400 output
    estimatedTokens: 8400,
    category: 'specialist',
    isOptional: false, // Always run for page-turner quality
  },
  generate_summary: {
    type: 'generate_summary',
    name: 'Summary Generator',
    description: 'Creates chapter summary for next chapter context',
    estimatedCost: 0.026, // 8K input + 200 output
    estimatedTokens: 8200,
    category: 'finalization',
    isOptional: false,
  },
  update_states: {
    type: 'update_states',
    name: 'State Updater',
    description: 'Updates character states and story bible',
    estimatedCost: 0.026, // 8K input + 200 output
    estimatedTokens: 8200,
    category: 'finalization',
    isOptional: false,
  },
};

// ============================================================================
// Mode Configurations
// ============================================================================

/**
 * Draft Mode: Core editing pipeline with essential specialists
 * Focus: Fast iteration, good quality, lower cost
 * ~$0.39 per chapter
 */
const DRAFT_MODE_AGENTS: AgentType[] = [
  'generate_chapter',
  'dev_edit',
  'line_edit',
  'continuity_check',
  'copy_edit',
  'proofread',
  'opening_review',
  'dialogue_review',
  'hook_review',
  'generate_summary',
  'update_states',
];

/**
 * Publication Mode: Full editorial pipeline
 * Focus: Publication-ready quality, comprehensive review
 * ~$0.65 per chapter
 */
const PUBLICATION_MODE_AGENTS: AgentType[] = [
  'generate_chapter',
  'dev_edit',
  'line_edit',
  'continuity_check',
  'copy_edit',
  'proofread',
  'sensitivity_review',
  'research_review',
  'beta_reader_review',
  'opening_review',
  'dialogue_review',
  'hook_review',
  'generate_summary',
  'update_states',
];

// ============================================================================
// Service Class
// ============================================================================

export class AgentConfigurationService {
  /**
   * Get all available agents with cost information
   */
  getAllAgents(): AgentCostInfo[] {
    return Object.values(AGENT_COSTS);
  }

  /**
   * Get agent cost information by type
   */
  getAgentCost(type: AgentType): AgentCostInfo {
    return AGENT_COSTS[type];
  }

  /**
   * Get agents for a specific generation mode
   */
  getModeAgents(mode: GenerationMode, customAgents?: AgentType[]): AgentType[] {
    switch (mode) {
      case 'draft':
        return DRAFT_MODE_AGENTS;
      case 'publication':
        return PUBLICATION_MODE_AGENTS;
      case 'custom':
        return customAgents || DRAFT_MODE_AGENTS;
      default:
        logger.warn({ mode }, '[AgentConfig] Unknown mode, defaulting to publication');
        return PUBLICATION_MODE_AGENTS;
    }
  }

  /**
   * Calculate cost estimate for a generation mode
   */
  estimateCost(mode: GenerationMode, customAgents?: AgentType[], chapterCount: number = 35): CostEstimate {
    const agents = this.getModeAgents(mode, customAgents);
    const agentInfos = agents.map(type => AGENT_COSTS[type]);

    const costPerChapter = agentInfos.reduce((sum, agent) => sum + agent.estimatedCost, 0);
    const costPerBook = costPerChapter * chapterCount;

    // Calculate breakdown by category
    const breakdown = {
      core: 0,
      editing: 0,
      specialist: 0,
      finalization: 0,
    };

    for (const agent of agentInfos) {
      breakdown[agent.category] += agent.estimatedCost;
    }

    return {
      mode,
      totalAgents: agents.length,
      costPerChapter: Math.round(costPerChapter * 100) / 100,
      costPerBook: Math.round(costPerBook * 100) / 100,
      agents: agentInfos,
      breakdown,
    };
  }

  /**
   * Get configuration for a specific mode
   */
  getModeConfig(mode: GenerationMode, customAgents?: AgentType[]): GenerationModeConfig {
    const agents = this.getModeAgents(mode, customAgents);
    const cost = this.estimateCost(mode, customAgents, 1);

    const descriptions: Record<GenerationMode, string> = {
      draft: 'Fast iteration with core editing and essential specialists. Optimised for cost.',
      publication: 'Full editorial pipeline with all specialists. Publication-ready quality.',
      custom: 'User-selected agents for tailored workflow and cost control.',
    };

    return {
      mode,
      agents,
      totalCost: cost.costPerChapter,
      totalAgents: agents.length,
      description: descriptions[mode],
    };
  }

  /**
   * Validate custom agent selection
   */
  validateCustomAgents(agents: AgentType[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required core agents
    const requiredAgents: AgentType[] = [
      'generate_chapter',
      'generate_summary',
      'update_states',
    ];

    for (const required of requiredAgents) {
      if (!agents.includes(required)) {
        errors.push(`Missing required agent: ${AGENT_COSTS[required].name}`);
      }
    }

    // Warn if skipping recommended agents
    const recommendedAgents: AgentType[] = [
      'dev_edit',
      'copy_edit',
      'proofread',
    ];

    for (const recommended of recommendedAgents) {
      if (!agents.includes(recommended)) {
        warnings.push(`Recommended agent not selected: ${AGENT_COSTS[recommended].name}`);
      }
    }

    // Check for invalid agent types
    for (const agent of agents) {
      if (!AGENT_COSTS[agent]) {
        errors.push(`Unknown agent type: ${agent}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Compare costs between modes
   */
  compareModes(): {
    draft: CostEstimate;
    publication: CostEstimate;
    savings: {
      absolute: number;
      percentage: number;
    };
  } {
    const draft = this.estimateCost('draft');
    const publication = this.estimateCost('publication');

    const savings = {
      absolute: publication.costPerChapter - draft.costPerChapter,
      percentage: ((publication.costPerChapter - draft.costPerChapter) / publication.costPerChapter) * 100,
    };

    return {
      draft,
      publication,
      savings,
    };
  }
}

// Export singleton instance
export const agentConfigurationService = new AgentConfigurationService();
