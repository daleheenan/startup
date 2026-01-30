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

  historical: [
    {
      name: 'Period Accuracy',
      description: 'Authentic historical details and cultural context for the era',
      required: true,
      category: 'structure',
      examples: ['Accurate clothing and customs', 'Historical events woven in', 'Period-appropriate language'],
    },
    {
      name: 'Historical Events or Figures',
      description: 'Connection to real historical moments or people',
      required: false,
      category: 'structure',
      examples: ['Major wars or conflicts', 'Famous historical figures', 'Significant cultural moments'],
    },
    {
      name: 'Social Context of Era',
      description: 'Exploration of period-specific social issues and norms',
      required: true,
      category: 'theme',
      examples: ['Class divisions', 'Gender roles', 'Political tensions', 'Cultural conflicts'],
    },
    {
      name: 'Immersive Setting',
      description: 'Rich sensory details that transport reader to the time period',
      required: true,
      category: 'tone',
      examples: ['Vivid descriptions', 'Period-specific details', 'Atmospheric world-building'],
    },
  ],

  contemporary: [
    {
      name: 'Modern Setting',
      description: 'Story takes place in present day or recent past',
      required: true,
      category: 'structure',
      examples: ['Current technology', 'Modern social issues', 'Contemporary culture'],
    },
    {
      name: 'Relatable Themes',
      description: 'Issues and conflicts that resonate with modern readers',
      required: true,
      category: 'theme',
      examples: ['Work-life balance', 'Relationships', 'Identity', 'Social pressures'],
    },
    {
      name: 'Realistic Characters',
      description: 'Characters with believable motivations and modern sensibilities',
      required: true,
      category: 'character',
      examples: ['Complex personalities', 'Modern values', 'Authentic dialogue'],
    },
    {
      name: 'Social Commentary',
      description: 'Reflection on current social, political, or cultural issues',
      required: false,
      category: 'theme',
      examples: ['Technology impact', 'Social justice', 'Environmental concerns', 'Cultural shifts'],
    },
  ],

  western: [
    {
      name: 'Frontier Setting',
      description: 'Story set in American Old West or frontier environment',
      required: true,
      category: 'structure',
      examples: ['Small frontier towns', 'Open range', 'Mining camps', 'Cattle drives'],
    },
    {
      name: 'Code of Honour',
      description: 'Characters follow personal code or moral principles',
      required: true,
      category: 'character',
      examples: ['Justice vs law', 'Personal integrity', 'Keeping your word', 'Defending the weak'],
    },
    {
      name: 'Showdown or Confrontation',
      description: 'Climactic face-off between protagonist and antagonist',
      required: true,
      category: 'ending',
      examples: ['Gunfight', 'Standoff', 'Final confrontation', 'Justice served'],
    },
    {
      name: 'Man vs Nature/Wilderness',
      description: 'Conflict with harsh environment and survival challenges',
      required: false,
      category: 'theme',
      examples: ['Harsh weather', 'Dangerous wildlife', 'Survival skills', 'Taming the land'],
    },
  ],

  romantasy: [
    {
      name: 'Magic and Romance Balance',
      description: 'Equal weight given to fantasy world-building and romantic relationship',
      required: true,
      category: 'structure',
      examples: ['Fae courts with relationship drama', 'Magic system intertwined with love story'],
    },
    {
      name: 'Romantic HEA/HFN',
      description: 'Romantic relationship must end happily or hopeful',
      required: true,
      category: 'ending',
      examples: ['Couple together and committed', 'Obstacles overcome', 'Future together implied'],
    },
    {
      name: 'Fantasy Elements',
      description: 'Clear magical or fantastical world-building',
      required: true,
      category: 'structure',
      examples: ['Magic systems', 'Mythical creatures', 'Fantasy realms', 'Supernatural abilities'],
    },
    {
      name: 'High Stakes Romance',
      description: 'Romantic relationship intertwined with plot-level stakes',
      required: true,
      category: 'theme',
      examples: ['Forbidden love with consequences', 'Fate of kingdoms tied to relationship', 'Magical bonds'],
    },
  ],

  'cozy-fantasy': [
    {
      name: 'Low Stakes Comfort',
      description: 'Warm, comforting atmosphere without world-ending threats',
      required: true,
      category: 'tone',
      examples: ['Small town magic', 'Personal goals', 'Community problems', 'Slice of life'],
    },
    {
      name: 'Found Family or Community',
      description: 'Strong emphasis on relationships and belonging',
      required: true,
      category: 'theme',
      examples: ['Chosen family', 'Supportive community', 'Friendship circles', 'Acceptance'],
    },
    {
      name: 'Gentle Magic',
      description: 'Magic used for everyday purposes, not combat',
      required: true,
      category: 'structure',
      examples: ['Magical crafts', 'Helpful spells', 'Cosy enchantments', 'Domestic magic'],
    },
    {
      name: 'Feel-Good Resolution',
      description: 'Satisfying, uplifting ending that leaves reader content',
      required: true,
      category: 'ending',
      examples: ['Problems solved', 'Relationships strengthened', 'Community thriving', 'Personal growth'],
    },
  ],

  grimdark: [
    {
      name: 'Morally Grey Characters',
      description: 'No clear heroes, characters make difficult choices with consequences',
      required: true,
      category: 'character',
      examples: ['Anti-heroes', 'Villainous protagonists', 'Complex motivations', 'Moral ambiguity'],
    },
    {
      name: 'Dark Tone and Violence',
      description: 'Unflinching depiction of brutality and harsh realities',
      required: true,
      category: 'tone',
      examples: ['Graphic violence', 'Dark themes', 'Cynical worldview', 'Gritty realism'],
    },
    {
      name: 'Bleak World-Building',
      description: 'Harsh, oppressive setting without easy answers',
      required: true,
      category: 'structure',
      examples: ['Corrupt systems', 'Hopeless situations', 'Dystopian elements', 'Survival focus'],
    },
    {
      name: 'Pyrrhic Victories or Tragedy',
      description: 'Success comes at great cost, or protagonist fails',
      required: false,
      category: 'ending',
      examples: ['Costly wins', 'Tragic endings', 'Bittersweet conclusions', 'Ambiguous outcomes'],
    },
  ],

  litrpg: [
    {
      name: 'Game Mechanics',
      description: 'Explicit stats, levels, skills displayed or tracked',
      required: true,
      category: 'structure',
      examples: ['Character sheets', 'Level-up notifications', 'Skill trees', 'XP systems'],
    },
    {
      name: 'Progression System',
      description: 'Clear advancement path with measurable improvements',
      required: true,
      category: 'structure',
      examples: ['Levelling up', 'Gaining new abilities', 'Power scaling', 'Unlocking content'],
    },
    {
      name: 'RPG World Logic',
      description: 'World operates by game-like rules and systems',
      required: true,
      category: 'tone',
      examples: ['Quest systems', 'NPC behaviour', 'Loot drops', 'Class systems'],
    },
    {
      name: 'Strategic Problem-Solving',
      description: 'Challenges overcome through builds, stats, and game knowledge',
      required: false,
      category: 'theme',
      examples: ['Min-maxing', 'Strategic builds', 'Exploiting mechanics', 'Power combinations'],
    },
  ],

  afrofuturism: [
    {
      name: 'African Diaspora Culture',
      description: 'Central incorporation of African or African diaspora cultural elements',
      required: true,
      category: 'theme',
      examples: ['African mythology', 'Cultural traditions', 'Black identity', 'Diaspora experiences'],
    },
    {
      name: 'Speculative Elements',
      description: 'Science fiction or fantasy elements reimagining the future or past',
      required: true,
      category: 'structure',
      examples: ['Advanced African civilisations', 'Alternate histories', 'Future technologies', 'Magic systems'],
    },
    {
      name: 'Liberation and Empowerment',
      description: 'Themes of freedom, self-determination, and cultural pride',
      required: true,
      category: 'theme',
      examples: ['Overcoming oppression', 'Cultural reclamation', 'Black excellence', 'Community strength'],
    },
    {
      name: 'Reimagined History or Future',
      description: 'Alternative visions of past, present, or future',
      required: false,
      category: 'structure',
      examples: ['Altered timelines', 'Utopian futures', 'Reclaimed narratives', 'Speculative societies'],
    },
  ],

  'climate-fiction': [
    {
      name: 'Environmental Crisis',
      description: 'Climate change or ecological disaster as central plot element',
      required: true,
      category: 'structure',
      examples: ['Rising seas', 'Extreme weather', 'Ecosystem collapse', 'Resource scarcity'],
    },
    {
      name: 'Societal Impact',
      description: 'Exploration of how environmental changes affect civilisation',
      required: true,
      category: 'theme',
      examples: ['Climate refugees', 'Resource wars', 'Societal collapse', 'Adaptation struggles'],
    },
    {
      name: 'Human Responsibility',
      description: 'Questions of accountability and human impact on nature',
      required: false,
      category: 'theme',
      examples: ['Corporate greed', 'Political failure', 'Individual choices', 'Generational impact'],
    },
    {
      name: 'Adaptation or Solutions',
      description: 'Characters seeking ways to survive or reverse damage',
      required: false,
      category: 'structure',
      examples: ['Technological solutions', 'Community resilience', 'Lifestyle changes', 'Environmental activism'],
    },
  ],

  solarpunk: [
    {
      name: 'Optimistic Future Vision',
      description: 'Hopeful depiction of sustainable, equitable future society',
      required: true,
      category: 'tone',
      examples: ['Green cities', 'Renewable energy', 'Community focus', 'Social equality'],
    },
    {
      name: 'Sustainable Technology',
      description: 'Eco-friendly technology integrated into daily life',
      required: true,
      category: 'structure',
      examples: ['Solar power', 'Vertical gardens', 'Clean transport', 'Circular economy'],
    },
    {
      name: 'Community and Cooperation',
      description: 'Emphasis on collective action and mutual support',
      required: true,
      category: 'theme',
      examples: ['Co-operatives', 'Shared resources', 'Local governance', 'Cultural diversity'],
    },
    {
      name: 'Harmony with Nature',
      description: 'Integration of human civilisation with natural world',
      required: true,
      category: 'structure',
      examples: ['Green architecture', 'Rewilding', 'Biodiversity', 'Ecological balance'],
    },
  ],

  steampunk: [
    {
      name: 'Victorian Aesthetic',
      description: '19th century inspired setting with industrial revolution elements',
      required: true,
      category: 'structure',
      examples: ['Victorian fashion', 'Gas lamps', 'Class structures', 'Empire aesthetics'],
    },
    {
      name: 'Steam-Powered Technology',
      description: 'Anachronistic technology based on steam power',
      required: true,
      category: 'structure',
      examples: ['Airships', 'Clockwork machines', 'Steam engines', 'Mechanical inventions'],
    },
    {
      name: 'Industrial Revolution Themes',
      description: 'Exploration of industrialisation, class, and progress',
      required: false,
      category: 'theme',
      examples: ['Labour movements', 'Social change', 'Innovation vs tradition', 'Class conflict'],
    },
    {
      name: 'Adventurous Tone',
      description: 'Sense of exploration, invention, and adventure',
      required: false,
      category: 'tone',
      examples: ['Expeditions', 'Inventions', 'Discovery', 'Danger and excitement'],
    },
  ],

  'new-weird': [
    {
      name: 'Transgressive Elements',
      description: 'Deliberately unsettling or boundary-pushing content',
      required: true,
      category: 'tone',
      examples: ['Body horror', 'Psychological disturbance', 'Taboo subjects', 'Uncomfortable themes'],
    },
    {
      name: 'Genre Blending',
      description: 'Mixing horror, fantasy, sci-fi in unconventional ways',
      required: true,
      category: 'structure',
      examples: ['Weird fiction', 'Surreal elements', 'Genre mash-ups', 'Experimental narratives'],
    },
    {
      name: 'Bizarre World-Building',
      description: 'Strange, dreamlike, or incomprehensible settings',
      required: true,
      category: 'structure',
      examples: ['Surreal cities', 'Impossible physics', 'Alien logic', 'Nightmarish landscapes'],
    },
    {
      name: 'Ambiguity and Mystery',
      description: 'Deliberately unclear explanations or unresolved elements',
      required: false,
      category: 'ending',
      examples: ['Unexplained phenomena', 'Open interpretations', 'Mysterious forces', 'Cosmic horror'],
    },
  ],

  paranormal: [
    {
      name: 'Supernatural Phenomena',
      description: 'Ghosts, psychics, or paranormal abilities in modern world',
      required: true,
      category: 'structure',
      examples: ['Ghosts and hauntings', 'Psychic powers', 'Mediums', 'Supernatural creatures'],
    },
    {
      name: 'Contemporary Setting',
      description: 'Paranormal elements in modern, recognisable world',
      required: true,
      category: 'structure',
      examples: ['Modern cities', 'Current technology', 'Everyday locations', 'Realistic backdrop'],
    },
    {
      name: 'Mystery or Investigation',
      description: 'Uncovering truth about supernatural events',
      required: false,
      category: 'structure',
      examples: ['Paranormal investigation', 'Solving hauntings', 'Discovering powers', 'Uncovering secrets'],
    },
    {
      name: 'Otherworldly Atmosphere',
      description: 'Eerie, mysterious tone that builds tension',
      required: true,
      category: 'tone',
      examples: ['Unsettling events', 'Strange occurrences', 'Sense of unease', 'Mysterious atmosphere'],
    },
  ],

  wuxia: [
    {
      name: 'Martial Arts Mastery',
      description: 'Skilled martial artists with superhuman abilities',
      required: true,
      category: 'character',
      examples: ['Sword techniques', 'Qinggong (lightness skill)', 'Internal energy', 'Combat mastery'],
    },
    {
      name: 'Cultivation or Training',
      description: 'Protagonist improves through dedicated practice and trials',
      required: true,
      category: 'structure',
      examples: ['Training arcs', 'Power cultivation', 'Breaking through realms', 'Master-student relationships'],
    },
    {
      name: 'Honour and Justice',
      description: 'Strong moral code, righteousness, and martial ethics',
      required: true,
      category: 'theme',
      examples: ['Xia (chivalry)', 'Protecting the weak', 'Righting wrongs', 'Loyalty and honour'],
    },
    {
      name: 'Jianghu Setting',
      description: 'Martial arts underworld separate from normal society',
      required: false,
      category: 'structure',
      examples: ['Martial sects', 'Hidden masters', 'Wandering heroes', 'Wulin (martial world)'],
    },
  ],

  'legal-drama': [
    {
      name: 'Courtroom Scenes',
      description: 'Legal proceedings, trials, or courtroom confrontations',
      required: true,
      category: 'structure',
      examples: ['Cross-examinations', 'Opening statements', 'Verdict reveals', 'Legal arguments'],
    },
    {
      name: 'Legal Investigation',
      description: 'Building case through evidence gathering and strategy',
      required: true,
      category: 'structure',
      examples: ['Discovery process', 'Witness interviews', 'Evidence analysis', 'Legal research'],
    },
    {
      name: 'Moral Complexity',
      description: 'Exploration of justice, ethics, and legal grey areas',
      required: true,
      category: 'theme',
      examples: ['Ethical dilemmas', 'Justice vs law', 'Moral compromises', 'Complex cases'],
    },
    {
      name: 'High Stakes Verdict',
      description: 'Trial outcome with significant personal or societal impact',
      required: true,
      category: 'ending',
      examples: ['Life-changing verdicts', 'Career implications', 'Justice served', 'Precedent set'],
    },
  ],

  'medical-drama': [
    {
      name: 'Medical Cases',
      description: 'Diagnosis, treatment, and medical crises as central plot',
      required: true,
      category: 'structure',
      examples: ['Emergency cases', 'Complex diagnoses', 'Surgical procedures', 'Medical mysteries'],
    },
    {
      name: 'Life and Death Stakes',
      description: 'Patients in critical condition with urgent time pressure',
      required: true,
      category: 'tone',
      examples: ['Emergency situations', 'Critical patients', 'Ticking clocks', 'Life-saving decisions'],
    },
    {
      name: 'Professional and Personal Balance',
      description: 'Medical professionals juggling career and relationships',
      required: false,
      category: 'theme',
      examples: ['Work-life conflict', 'Burnout', 'Hospital politics', 'Personal relationships'],
    },
    {
      name: 'Medical Ethics',
      description: 'Questions of professional responsibility and moral choices',
      required: true,
      category: 'theme',
      examples: ['Difficult decisions', 'Patient rights', 'Ethical dilemmas', 'Medical judgment'],
    },
  ],

  'sports-fiction': [
    {
      name: 'Athletic Competition',
      description: 'Sports contests and competitive events as central focus',
      required: true,
      category: 'structure',
      examples: ['Championship games', 'Tournaments', 'Rivalries', 'Competitive matches'],
    },
    {
      name: 'Training and Improvement',
      description: 'Protagonist develops skills through dedication and practice',
      required: true,
      category: 'structure',
      examples: ['Training montages', 'Skill development', 'Coaching relationships', 'Overcoming weaknesses'],
    },
    {
      name: 'Team Dynamics',
      description: 'Relationships, conflict, and cooperation among teammates',
      required: false,
      category: 'theme',
      examples: ['Team bonding', 'Internal conflicts', 'Leadership', 'Collective success'],
    },
    {
      name: 'Overcoming Adversity',
      description: 'Protagonist faces and conquers personal or external obstacles',
      required: true,
      category: 'theme',
      examples: ['Injury recovery', 'Personal demons', 'Underdog journey', 'Redemption arc'],
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
