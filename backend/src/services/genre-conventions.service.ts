/**
 * Genre Conventions Validator Service
 * Validates story outlines against genre-specific conventions and expectations
 */

export interface GenreConvention {
  name: string;
  description: string;
  required: boolean; // true = must have, false = strongly recommended
  category: 'structure' | 'character' | 'theme' | 'ending' | 'pacing' | 'tone';
  examples: string[];
}

export interface ConventionCheck {
  convention: GenreConvention;
  met: boolean;
  confidence: number; // 0-1
  evidence?: string; // Where in the outline this was found
  suggestions?: string[]; // How to address if not met
}

export interface ValidationResult {
  genre: string;
  overallScore: number; // 0-1
  checks: ConventionCheck[];
  warnings: string[];
  recommendations: string[];
  summary: string;
}

// Genre convention definitions
const GENRE_CONVENTIONS: Record<string, GenreConvention[]> = {
  romance: [
    {
      name: 'Central Love Story',
      description: 'The romantic relationship must be the main plot driver',
      required: true,
      category: 'structure',
      examples: ['Two main characters meeting and falling in love', 'Overcoming obstacles to be together'],
    },
    {
      name: 'Happily Ever After (HEA) or Happy For Now (HFN)',
      description: 'Romance must end with the couple together and committed',
      required: true,
      category: 'ending',
      examples: ['Marriage proposal', 'Declaration of love and commitment', 'Moving in together'],
    },
    {
      name: 'Emotional Focus',
      description: 'Story should prioritize emotional development and relationship growth',
      required: true,
      category: 'tone',
      examples: ['Internal monologue about feelings', 'Relationship milestones', 'Emotional conflicts'],
    },
    {
      name: 'Meet-Cute or Initial Attraction',
      description: 'Clear establishment of romantic interest early in the story',
      required: false,
      category: 'structure',
      examples: ['First meeting with chemistry', 'Enemies to lovers setup', 'Second chance introduction'],
    },
  ],

  mystery: [
    {
      name: 'Central Mystery/Crime',
      description: 'A clear puzzle or crime that drives the investigation',
      required: true,
      category: 'structure',
      examples: ['Murder', 'Theft', 'Disappearance', 'Conspiracy'],
    },
    {
      name: 'Fair Play Clues',
      description: 'Reader should have access to clues needed to solve the mystery',
      required: true,
      category: 'structure',
      examples: ['Physical evidence described', 'Witness testimonies', 'Suspicious behavior noted'],
    },
    {
      name: 'Logical Resolution',
      description: 'Solution must make sense based on established facts',
      required: true,
      category: 'ending',
      examples: ['Detective explains reasoning', 'All clues tie together', 'No deus ex machina'],
    },
    {
      name: 'Red Herrings',
      description: 'Misleading clues or suspects to maintain suspense',
      required: false,
      category: 'structure',
      examples: ['False leads', 'Innocent suspects with motive', 'Misinterpreted evidence'],
    },
    {
      name: 'Investigation Process',
      description: 'Show the detective/protagonist actively investigating',
      required: true,
      category: 'structure',
      examples: ['Interviewing suspects', 'Examining crime scene', 'Following leads'],
    },
  ],

  fantasy: [
    {
      name: 'Magic System or Supernatural Elements',
      description: 'Clear presence of magic, supernatural beings, or fantasy world',
      required: true,
      category: 'structure',
      examples: ['Spells and wizards', 'Dragons or mythical creatures', 'Enchanted items'],
    },
    {
      name: 'World-Building',
      description: 'Establishment of unique fantasy world with its own rules',
      required: true,
      category: 'structure',
      examples: ['Geography and cultures', 'History and lore', 'Magic system rules'],
    },
    {
      name: 'Hero\'s Journey or Quest',
      description: 'Protagonist embarks on a journey with clear stakes',
      required: false,
      category: 'structure',
      examples: ['Call to adventure', 'Trials and challenges', 'Return transformed'],
    },
    {
      name: 'Good vs Evil Conflict',
      description: 'Clear moral stakes and opposition between forces',
      required: false,
      category: 'theme',
      examples: ['Dark lord vs heroes', 'Corruption vs purity', 'Light vs darkness'],
    },
  ],

  'science-fiction': [
    {
      name: 'Speculative Technology or Science',
      description: 'Story must explore scientific concepts or advanced technology',
      required: true,
      category: 'structure',
      examples: ['Space travel', 'AI', 'Time travel', 'Genetic engineering', 'Alien contact'],
    },
    {
      name: 'Extrapolation from Current Science',
      description: 'Technology should feel plausible based on scientific principles',
      required: true,
      category: 'tone',
      examples: ['Explained mechanics', 'Logical consequences', 'Scientific basis mentioned'],
    },
    {
      name: 'Social or Philosophical Implications',
      description: 'Explore how technology affects society or raises questions',
      required: false,
      category: 'theme',
      examples: ['Ethics of AI', 'Impact of technology on humanity', 'Political systems in space'],
    },
    {
      name: 'Futuristic or Alternative Setting',
      description: 'Story takes place in future, space, or alternate reality',
      required: true,
      category: 'structure',
      examples: ['Space stations', 'Future Earth', 'Alien worlds', 'Alternate timeline'],
    },
  ],

  horror: [
    {
      name: 'Fear and Dread',
      description: 'Story must evoke fear, tension, or unease in the reader',
      required: true,
      category: 'tone',
      examples: ['Suspenseful scenes', 'Jump scares', 'Psychological dread', 'Body horror'],
    },
    {
      name: 'Threat or Monster',
      description: 'Clear antagonistic force that poses danger',
      required: true,
      category: 'structure',
      examples: ['Supernatural entity', 'Serial killer', 'Psychological threat', 'Cosmic horror'],
    },
    {
      name: 'Escalating Danger',
      description: 'Threat should increase in intensity throughout the story',
      required: true,
      category: 'pacing',
      examples: ['Minor incidents to major attacks', 'Growing body count', 'Increasing desperation'],
    },
    {
      name: 'Dark Atmosphere',
      description: 'Setting and tone create oppressive or unsettling mood',
      required: true,
      category: 'tone',
      examples: ['Isolated locations', 'Dark imagery', 'Ominous descriptions', 'Bleak weather'],
    },
  ],

  thriller: [
    {
      name: 'High Stakes',
      description: 'Clear and significant consequences if protagonist fails',
      required: true,
      category: 'structure',
      examples: ['Life or death', 'National security', 'Loved ones in danger', 'World-ending threat'],
    },
    {
      name: 'Fast Pacing',
      description: 'Rapid plot progression with frequent action or revelations',
      required: true,
      category: 'pacing',
      examples: ['Chase sequences', 'Time limits', 'Quick chapter endings', 'Multiple threats'],
    },
    {
      name: 'Suspense and Tension',
      description: 'Maintain reader anxiety about what will happen next',
      required: true,
      category: 'tone',
      examples: ['Cliffhangers', 'Ticking clocks', 'Near misses', 'Hidden information'],
    },
    {
      name: 'Twists and Turns',
      description: 'Unexpected plot developments that surprise the reader',
      required: false,
      category: 'structure',
      examples: ['Betrayals', 'Hidden identities', 'False victories', 'Revelations'],
    },
  ],

  literary: [
    {
      name: 'Character Depth',
      description: 'Complex, well-developed characters with internal conflicts',
      required: true,
      category: 'character',
      examples: ['Psychological complexity', 'Character growth', 'Moral ambiguity', 'Rich backstory'],
    },
    {
      name: 'Thematic Depth',
      description: 'Exploration of universal themes or the human condition',
      required: true,
      category: 'theme',
      examples: ['Identity', 'Mortality', 'Society', 'Relationships', 'Purpose'],
    },
    {
      name: 'Literary Style',
      description: 'Elevated prose with attention to language and craft',
      required: false,
      category: 'tone',
      examples: ['Metaphors and symbolism', 'Lyrical descriptions', 'Unique voice'],
    },
    {
      name: 'Ambiguous or Open Ending',
      description: 'Ending may leave questions or interpretations open',
      required: false,
      category: 'ending',
      examples: ['Unresolved questions', 'Bittersweet conclusions', 'Philosophical reflections'],
    },
  ],
};

class GenreConventionsService {
  /**
   * Validate an outline against genre conventions
   */
  validateOutline(genre: string, outline: string): ValidationResult {
    const conventions = GENRE_CONVENTIONS[genre] || [];

    if (conventions.length === 0) {
      return {
        genre,
        overallScore: 1.0,
        checks: [],
        warnings: [`No specific conventions defined for genre: ${genre}`],
        recommendations: [],
        summary: 'Genre validation not available for this genre.',
      };
    }

    const checks = conventions.map((convention) =>
      this.checkConvention(convention, outline)
    );

    const { overallScore, warnings, recommendations } = this.calculateScoreAndFeedback(
      checks,
      genre
    );

    const summary = this.generateSummary(genre, overallScore, checks);

    return {
      genre,
      overallScore,
      checks,
      warnings,
      recommendations,
      summary,
    };
  }

  /**
   * Check if a specific convention is met
   */
  private checkConvention(convention: GenreConvention, outline: string): ConventionCheck {
    const lowerOutline = outline.toLowerCase();

    // Simple keyword matching (could be enhanced with AI analysis)
    let confidence = 0;
    let evidence: string | undefined;
    const suggestions: string[] = [];

    // Check for relevant keywords based on convention
    const keywords = this.getKeywordsForConvention(convention);
    const matches = keywords.filter((keyword) => lowerOutline.includes(keyword.toLowerCase()));

    if (matches.length > 0) {
      confidence = Math.min(matches.length / keywords.length, 1.0);
      evidence = `Found relevant content: ${matches.join(', ')}`;
    }

    const met = confidence >= (convention.required ? 0.5 : 0.3);

    if (!met) {
      suggestions.push(
        `Consider adding: ${convention.description}`,
        ...convention.examples.map((ex) => `Example: ${ex}`)
      );
    }

    return {
      convention,
      met,
      confidence,
      evidence,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Get keywords to look for based on convention
   */
  private getKeywordsForConvention(convention: GenreConvention): string[] {
    const keywords: string[] = [];

    // Extract keywords from name and description
    keywords.push(...convention.name.toLowerCase().split(/\s+/));
    keywords.push(...convention.examples.flatMap((ex) => ex.toLowerCase().split(/\s+/)));

    // Category-specific keywords
    switch (convention.category) {
      case 'structure':
        keywords.push('plot', 'story', 'arc', 'chapter', 'scene');
        break;
      case 'character':
        keywords.push('protagonist', 'character', 'hero', 'villain', 'development');
        break;
      case 'theme':
        keywords.push('theme', 'explores', 'questions', 'meaning');
        break;
      case 'ending':
        keywords.push('ending', 'conclusion', 'resolution', 'finale');
        break;
      case 'pacing':
        keywords.push('pace', 'action', 'tension', 'escalate');
        break;
      case 'tone':
        keywords.push('tone', 'mood', 'atmosphere', 'feeling');
        break;
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Calculate overall score and generate feedback
   */
  private calculateScoreAndFeedback(
    checks: ConventionCheck[],
    genre: string
  ): {
    overallScore: number;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Calculate weighted score
    let totalWeight = 0;
    let earnedScore = 0;

    checks.forEach((check) => {
      const weight = check.convention.required ? 2 : 1;
      totalWeight += weight;
      earnedScore += check.confidence * weight;

      if (!check.met && check.convention.required) {
        warnings.push(
          `Missing required ${genre} convention: ${check.convention.name}`
        );
      } else if (!check.met) {
        recommendations.push(
          `Consider strengthening: ${check.convention.name}`
        );
      }
    });

    const overallScore = totalWeight > 0 ? earnedScore / totalWeight : 0;

    // Add general recommendations based on score
    if (overallScore < 0.5) {
      recommendations.push(
        `This outline may not meet reader expectations for ${genre}. Consider reviewing genre conventions.`
      );
    } else if (overallScore < 0.7) {
      recommendations.push(
        `Good foundation, but some ${genre} conventions could be strengthened.`
      );
    }

    return { overallScore, warnings, recommendations };
  }

  /**
   * Generate a summary of the validation
   */
  private generateSummary(
    genre: string,
    score: number,
    checks: ConventionCheck[]
  ): string {
    const percentage = Math.round(score * 100);
    const metCount = checks.filter((c) => c.met).length;
    const totalCount = checks.length;

    if (score >= 0.8) {
      return `Excellent! This outline strongly adheres to ${genre} conventions (${percentage}%). ${metCount} of ${totalCount} conventions are well-represented.`;
    } else if (score >= 0.6) {
      return `Good. This outline generally follows ${genre} conventions (${percentage}%). ${metCount} of ${totalCount} conventions are present, with room for improvement.`;
    } else if (score >= 0.4) {
      return `Fair. This outline partially follows ${genre} conventions (${percentage}%). ${metCount} of ${totalCount} conventions are present. Consider strengthening genre elements.`;
    } else {
      return `Warning. This outline may not meet ${genre} reader expectations (${percentage}%). Only ${metCount} of ${totalCount} conventions are clearly present. Significant revision recommended.`;
    }
  }

  /**
   * Get conventions for a specific genre
   */
  getGenreConventions(genre: string): GenreConvention[] {
    return GENRE_CONVENTIONS[genre] || [];
  }

  /**
   * Get all available genres with conventions
   */
  getAvailableGenres(): string[] {
    return Object.keys(GENRE_CONVENTIONS);
  }
}

export const genreConventionsService = new GenreConventionsService();
