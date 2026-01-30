/**
 * Query Letter Templates
 * Genre-specific templates and guidelines for query letters to literary agents
 */

export interface QueryLetterTemplate {
  genre: string;
  templateName: string;
  structure: {
    paragraph1: {
      purpose: string;
      elements: string[];
      tips: string[];
    };
    paragraph2: {
      purpose: string;
      elements: string[];
      tips: string[];
    };
    paragraph3: {
      purpose: string;
      elements: string[];
      tips: string[];
    };
  };
  exampleHook: string;
  genreSpecificTips: string[];
}

export const QUERY_LETTER_TEMPLATES: Record<string, QueryLetterTemplate> = {
  romance: {
    genre: 'Romance',
    templateName: 'Romance Query Letter',
    structure: {
      paragraph1: {
        purpose: 'Hook with romantic premise and conflict',
        elements: [
          'Introduce protagonist and love interest',
          'Establish the romantic tension or obstacle',
          'Hint at the emotional stakes'
        ],
        tips: [
          'Lead with the emotional hook',
          'Show why these two people cannot be together (yet)',
          'Avoid clichés like "opposites attract" without specificity'
        ]
      },
      paragraph2: {
        purpose: 'Develop the central romantic conflict and character arcs',
        elements: [
          'Elaborate on the obstacles keeping them apart',
          'Show character growth through the romance',
          'Hint at the emotional journey',
          'Include genre-specific elements (contemporary, historical, paranormal, etc.)'
        ],
        tips: [
          'Focus on emotional stakes, not just external plot',
          'Show how falling in love changes both characters',
          'Be specific about the setting if it\'s integral to the romance'
        ]
      },
      paragraph3: {
        purpose: 'Author bio with relevant credentials',
        elements: [
          'Romance writing experience or credentials',
          'Relevant life experience that informs the writing',
          'Why you chose this agent/agency'
        ],
        tips: [
          'Mention if you read romance or are active in the romance community',
          'Name specific romance titles the agent has represented',
          'Keep it brief and professional'
        ]
      }
    },
    exampleHook: 'When workaholic chef Emma inherits a failing vineyard in Provence, the last thing she needs is a brooding French winemaker telling her she\'s doing everything wrong—especially when he\'s infuriatingly right.',
    genreSpecificTips: [
      'Emphasise the emotional journey and character arc',
      'Specify the romance subgenre (contemporary, historical, paranormal, etc.)',
      'Mention heat level if appropriate (sweet, sensual, steamy)',
      'Include comp titles from the same subgenre',
      'Show awareness of current market trends in romance'
    ]
  },

  thriller: {
    genre: 'Thriller',
    templateName: 'Thriller Query Letter',
    structure: {
      paragraph1: {
        purpose: 'Inciting incident and immediate danger',
        elements: [
          'Introduce protagonist and their expertise',
          'Present the inciting incident or threat',
          'Establish the stakes (what happens if they fail)'
        ],
        tips: [
          'Start with high-stakes action or discovery',
          'Make the threat specific and terrifying',
          'Show why this protagonist is uniquely positioned to face this threat'
        ]
      },
      paragraph2: {
        purpose: 'Escalating danger and race against time',
        elements: [
          'Show how the threat escalates',
          'Introduce key obstacles and antagonistic forces',
          'Emphasise the ticking clock',
          'Hint at twists without spoiling'
        ],
        tips: [
          'Build tension with each sentence',
          'Be specific about what\'s at stake (lives, nations, humanity)',
          'Avoid vague phrases like "nothing is as it seems"',
          'Show the protagonist\'s agency in fighting back'
        ]
      },
      paragraph3: {
        purpose: 'Author credentials and comparative titles',
        elements: [
          'Relevant expertise or background',
          'Writing credentials (published works, awards)',
          'Why you chose this agent (specific titles they\'ve represented)'
        ],
        tips: [
          'Mention any background that adds authenticity (military, law enforcement, tech)',
          'Name thriller titles the agent has represented',
          'Keep bio short—the query should focus on the hook'
        ]
      }
    },
    exampleHook: 'When cybersecurity expert Sarah Chen uncovers a backdoor in the Pentagon\'s missile defence system, she has 72 hours to find the traitor before a hostile nation launches a first strike—and every clue points to someone in her own team.',
    genreSpecificTips: [
      'Lead with immediate danger or an irresistible hook',
      'Specify subgenre (psychological, techno, legal, political, etc.)',
      'Emphasise what makes your thriller unique',
      'Show escalating stakes and time pressure',
      'Comp titles should be recent (within 2-3 years) and from the same subgenre'
    ]
  },

  fantasy: {
    genre: 'Fantasy',
    templateName: 'Fantasy Query Letter',
    structure: {
      paragraph1: {
        purpose: 'Introduce protagonist, world, and central conflict',
        elements: [
          'Present the protagonist and their ordinary world',
          'Hint at the magical system or fantasy elements',
          'Introduce the inciting incident or call to adventure'
        ],
        tips: [
          'Ground the reader in the protagonist\'s voice and situation first',
          'Avoid info-dumping about the world or magic system',
          'Make the protagonist\'s goal clear and compelling'
        ]
      },
      paragraph2: {
        purpose: 'Develop the quest and raise the stakes',
        elements: [
          'Show the protagonist\'s journey and what they must do',
          'Introduce key conflicts (internal and external)',
          'Reveal what\'s at stake (personal, world-level, or both)',
          'Hint at unique fantasy elements'
        ],
        tips: [
          'Balance world-building with character and plot',
          'Avoid fantasy clichés unless you\'re subverting them',
          'Show what makes your magic system or world unique',
          'Focus on character arc, not just quest mechanics'
        ]
      },
      paragraph3: {
        purpose: 'Author bio and market positioning',
        elements: [
          'Fantasy writing credentials or relevant experience',
          'Comparable titles (show awareness of the market)',
          'Why you chose this agent (fantasy titles they\'ve represented)'
        ],
        tips: [
          'Mention if you\'re active in the fantasy writing community',
          'Name fantasy titles the agent has represented',
          'Specify subgenre (epic, urban, dark, romantic, YA, etc.)',
          'Mention if it\'s a standalone or series (agents care about this)'
        ]
      }
    },
    exampleHook: 'Seventeen-year-old Kael can see the threads of fate that bind every person\'s destiny—except his own, which vanished the night his village burned. Now the empire\'s Weavers want him dead, and the rebels want to use him as a weapon, but Kael just wants to know if he even has a future worth fighting for.',
    genreSpecificTips: [
      'Specify fantasy subgenre (epic, urban, dark, romantic, YA, etc.)',
      'Mention if it\'s standalone or series',
      'Focus on character and emotional stakes, not just world-building',
      'Avoid over-explaining the magic system',
      'Use comp titles from the same subgenre and target audience',
      'Show how your fantasy offers something fresh to the genre'
    ]
  },

  'science-fiction': {
    genre: 'Science Fiction',
    templateName: 'Science Fiction Query Letter',
    structure: {
      paragraph1: {
        purpose: 'Establish protagonist, speculative premise, and conflict',
        elements: [
          'Introduce the protagonist and their role in this future/world',
          'Present the core sci-fi concept (tech, world, society)',
          'Show the inciting incident or disruption'
        ],
        tips: [
          'Ground the speculative element in character and conflict',
          'Avoid jargon—make the concept accessible',
          'Show how the sci-fi premise affects the protagonist personally'
        ]
      },
      paragraph2: {
        purpose: 'Explore implications and escalate stakes',
        elements: [
          'Show the consequences of the sci-fi premise',
          'Introduce moral dilemmas or philosophical questions',
          'Reveal what the protagonist must do and what they\'ll lose',
          'Build tension around the speculative concept'
        ],
        tips: [
          'Balance hard sci-fi details with emotional stakes',
          'Show the human cost of the technology or premise',
          'Avoid technical info-dumps',
          'Focus on character choices, not just cool concepts'
        ]
      },
      paragraph3: {
        purpose: 'Author credentials and market awareness',
        elements: [
          'Technical expertise or research background (if relevant)',
          'Writing credentials',
          'Why you chose this agent (sci-fi titles they\'ve represented)'
        ],
        tips: [
          'Mention any STEM background if it adds credibility',
          'Name recent sci-fi titles the agent has represented',
          'Specify subgenre (hard SF, space opera, cyberpunk, cli-fi, etc.)',
          'Show awareness of current trends in sci-fi publishing'
        ]
      }
    },
    exampleHook: 'In 2157, memory architect Dr. Lena Okafor can cure trauma by editing people\'s memories—until she discovers her own memories have been altered, and the truth she uncovers could topple the government that controls every citizen\'s past.',
    genreSpecificTips: [
      'Specify sci-fi subgenre (hard SF, space opera, cyberpunk, etc.)',
      'Ground high-concept ideas in character and emotion',
      'Avoid technobabble—agents aren\'t scientists',
      'Show the human implications of your speculative premise',
      'Use recent comp titles (sci-fi trends change quickly)',
      'Mention if it\'s standalone or series'
    ]
  },

  mystery: {
    genre: 'Mystery',
    templateName: 'Mystery Query Letter',
    structure: {
      paragraph1: {
        purpose: 'Introduce sleuth and the mystery',
        elements: [
          'Introduce the detective/sleuth and their world',
          'Present the central mystery or crime',
          'Show why this case is personal or compelling'
        ],
        tips: [
          'Make the crime specific and intriguing',
          'Show what makes your sleuth unique',
          'Establish the hook—why this mystery matters'
        ]
      },
      paragraph2: {
        purpose: 'Complicate the investigation',
        elements: [
          'Show the investigation and key clues',
          'Introduce obstacles and red herrings',
          'Raise the personal stakes for the sleuth',
          'Hint at the mystery\'s complexity'
        ],
        tips: [
          'Don\'t reveal the solution',
          'Show the sleuth\'s skills and methods',
          'Include personal stakes or character arc',
          'Avoid listing suspects—focus on the core conflict'
        ]
      },
      paragraph3: {
        purpose: 'Author bio and series information',
        elements: [
          'Relevant expertise (law enforcement, legal, medical, etc.)',
          'Writing credentials',
          'Series potential',
          'Why you chose this agent'
        ],
        tips: [
          'Mention if this is book one in a series',
          'Name mystery titles the agent has represented',
          'Specify subgenre (cosy, hard-boiled, police procedural, etc.)',
          'Relevant professional background adds credibility'
        ]
      }
    },
    exampleHook: 'When antique book dealer Harriet Quinn discovers a coded message in a rare Agatha Christie first edition, she\'s drawn into a decades-old mystery—and a modern-day murder that suggests someone will kill to keep the past buried.',
    genreSpecificTips: [
      'Specify mystery subgenre (cosy, hard-boiled, police procedural, etc.)',
      'Make the crime compelling and specific',
      'Show what makes your sleuth unique',
      'Mention if it\'s standalone or series (many mysteries are series)',
      'Include any relevant professional background',
      'Use comp titles from the same subgenre'
    ]
  },

  'historical-fiction': {
    genre: 'Historical Fiction',
    templateName: 'Historical Fiction Query Letter',
    structure: {
      paragraph1: {
        purpose: 'Ground in time, place, and protagonist',
        elements: [
          'Establish the historical period and setting',
          'Introduce the protagonist and their world',
          'Present the inciting incident or conflict'
        ],
        tips: [
          'Be specific about time and place',
          'Make the historical period vivid but not overwhelming',
          'Show how the historical context shapes the conflict'
        ]
      },
      paragraph2: {
        purpose: 'Develop historical and personal stakes',
        elements: [
          'Show how historical events impact the protagonist',
          'Develop the personal story within the historical context',
          'Reveal the emotional and historical stakes',
          'Weave in unique historical details'
        ],
        tips: [
          'Balance historical detail with character emotion',
          'Avoid history lesson mode—focus on story',
          'Show what makes your take on this period unique',
          'Emphasise timeless themes within historical context'
        ]
      },
      paragraph3: {
        purpose: 'Research credentials and market positioning',
        elements: [
          'Research background or expertise',
          'Relevant academic or professional credentials',
          'Why you chose this agent',
          'Comparable titles'
        ],
        tips: [
          'Mention significant research or expertise in this period',
          'Name historical fiction titles the agent has represented',
          'Show awareness of current historical fiction trends',
          'Specify time period and geographic setting clearly'
        ]
      }
    },
    exampleHook: 'In 1943 London, codebreaker Eleanor Ashford intercepts a message that could shorten the war by years—but acting on it would expose her girlfriend, a German defector, as a double agent and condemn her to execution.',
    genreSpecificTips: [
      'Be specific about historical period and setting',
      'Show extensive research without info-dumping',
      'Balance historical accuracy with engaging storytelling',
      'Emphasise timeless themes within historical context',
      'Use comp titles from similar time periods or settings',
      'Mention any academic or research credentials'
    ]
  },

  'literary-fiction': {
    genre: 'Literary Fiction',
    templateName: 'Literary Fiction Query Letter',
    structure: {
      paragraph1: {
        purpose: 'Establish voice, character, and thematic premise',
        elements: [
          'Introduce protagonist and their world',
          'Establish the literary voice',
          'Present the central question or thematic exploration'
        ],
        tips: [
          'Voice is crucial—show your prose style',
          'Focus on character interiority and theme',
          'Avoid plot-heavy summaries—literary fiction is character-driven'
        ]
      },
      paragraph2: {
        purpose: 'Develop character arc and thematic depth',
        elements: [
          'Show the protagonist\'s internal journey',
          'Explore the thematic questions',
          'Reveal emotional and philosophical stakes',
          'Demonstrate the quality of your prose'
        ],
        tips: [
          'Emphasise character psychology and relationships',
          'Show thematic depth without being pretentious',
          'Let your prose style shine through',
          'Focus on emotional truth, not plot mechanics'
        ]
      },
      paragraph3: {
        purpose: 'Literary credentials and positioning',
        elements: [
          'MFA, writing workshops, or literary publications',
          'Awards or notable mentions',
          'Why you chose this agent (literary titles they\'ve represented)',
          'Comparable literary titles'
        ],
        tips: [
          'Literary credentials matter more in this genre',
          'Name literary titles and authors the agent represents',
          'Show awareness of contemporary literary fiction',
          'Be specific about what makes your voice unique'
        ]
      }
    },
    exampleHook: 'After her mother\'s sudden death, Japanese-American pianist Yuki Tanaka returns to Kyoto and discovers a cache of letters revealing her mother\'s secret life during the Occupation—and a half-brother she never knew existed.',
    genreSpecificTips: [
      'Emphasise voice, character, and theme over plot',
      'Literary credentials (MFA, publications, awards) are valuable',
      'Show awareness of contemporary literary trends',
      'Comp titles should be recent and from similar literary voices',
      'Demonstrate prose quality in the query itself',
      'Avoid genre plot conventions—focus on character interiority'
    ]
  },

  horror: {
    genre: 'Horror',
    templateName: 'Horror Query Letter',
    structure: {
      paragraph1: {
        purpose: 'Establish protagonist and introduce the threat',
        elements: [
          'Introduce protagonist and their ordinary world',
          'Present the first sign of horror or wrongness',
          'Establish the tone (psychological, supernatural, body horror, etc.)'
        ],
        tips: [
          'Create atmosphere and dread immediately',
          'Make the threat specific and visceral',
          'Show why the protagonist is vulnerable'
        ]
      },
      paragraph2: {
        purpose: 'Escalate horror and reveal stakes',
        elements: [
          'Show how the horror escalates',
          'Reveal what the protagonist must do to survive',
          'Introduce psychological or emotional stakes',
          'Build tension and dread'
        ],
        tips: [
          'Balance external horror with internal fear',
          'Be specific about the type of horror',
          'Don\'t shy away from disturbing details (but don\'t overdo gore)',
          'Show the protagonist fighting back'
        ]
      },
      paragraph3: {
        purpose: 'Author bio and market positioning',
        elements: [
          'Horror writing credentials',
          'Relevant expertise or background',
          'Why you chose this agent',
          'Comparable horror titles'
        ],
        tips: [
          'Mention if you\'re active in horror writing communities',
          'Specify horror subgenre (psychological, supernatural, cosmic, etc.)',
          'Name horror titles the agent has represented',
          'Show awareness of current horror market trends'
        ]
      }
    },
    exampleHook: 'Sleep therapist Dr. Marcus Webb has cured hundreds of insomniacs—until his patients start experiencing the same nightmare, one that shows them how they\'re going to die. And the deaths are coming true.',
    genreSpecificTips: [
      'Specify horror subgenre (psychological, supernatural, cosmic, splatterpunk, etc.)',
      'Create atmosphere and dread in the query itself',
      'Balance visceral horror with psychological depth',
      'Show what makes your horror unique or fresh',
      'Use comp titles from the same horror subgenre',
      'Don\'t be afraid of disturbing content, but avoid gratuitous gore in the query'
    ]
  },

  'young-adult': {
    genre: 'Young Adult',
    templateName: 'Young Adult Query Letter',
    structure: {
      paragraph1: {
        purpose: 'Introduce teen protagonist and central conflict',
        elements: [
          'Introduce protagonist (age 14-18)',
          'Establish their world and voice',
          'Present the inciting incident'
        ],
        tips: [
          'Voice is critical—sound authentically teen',
          'Make the age and teen experience clear',
          'Avoid talking down or being overly trendy'
        ]
      },
      paragraph2: {
        purpose: 'Develop stakes and character arc',
        elements: [
          'Show the teen\'s journey and challenges',
          'Reveal emotional and external stakes',
          'Emphasise agency—the teen drives the plot',
          'Hint at coming-of-age themes'
        ],
        tips: [
          'YA is about agency and coming-of-age',
          'Show the protagonist making hard choices',
          'Emotional stakes are paramount',
          'Avoid adult characters solving the problems'
        ]
      },
      paragraph3: {
        purpose: 'Author bio and YA market positioning',
        elements: [
          'YA writing credentials',
          'Connection to teen readers or experiences',
          'Why you chose this agent (YA titles they\'ve represented)',
          'Age category (14-18) and target audience'
        ],
        tips: [
          'Specify YA subgenre (contemporary, fantasy, sci-fi, etc.)',
          'Mention if you work with teens or have YA expertise',
          'Name YA titles the agent has represented',
          'Use comp titles from the same YA subgenre and target age',
          'Show awareness of YA trends and sensitivities'
        ]
      }
    },
    exampleHook: 'Sixteen-year-old hacker Zara Ali can break into any system—except the algorithm that matches teens with their government-assigned soulmate. When she finally cracks it, she discovers her match is the boy she\'s spent three years trying to forget.',
    genreSpecificTips: [
      'Specify YA subgenre and target age range',
      'Voice must sound authentically teen',
      'Emphasise teen agency and coming-of-age themes',
      'Show awareness of YA market and diversity',
      'Use recent YA comp titles (YA trends change quickly)',
      'Avoid condescending or preachy tone',
      'Content warnings if dealing with sensitive topics'
    ]
  },

  general: {
    genre: 'General',
    templateName: 'General Query Letter Template',
    structure: {
      paragraph1: {
        purpose: 'Hook with premise and protagonist',
        elements: [
          'Introduce protagonist',
          'Present the central conflict or question',
          'Establish the stakes'
        ],
        tips: [
          'Lead with the most compelling element',
          'Be specific about genre',
          'Make it personal and unique'
        ]
      },
      paragraph2: {
        purpose: 'Develop the story and raise stakes',
        elements: [
          'Show how the conflict escalates',
          'Reveal what the protagonist must do',
          'Hint at character arc',
          'Build tension'
        ],
        tips: [
          'Focus on character choices and stakes',
          'Avoid plot summary—focus on conflict',
          'Show what makes your story unique',
          'Leave the agent wanting more'
        ]
      },
      paragraph3: {
        purpose: 'Author bio and personalisation',
        elements: [
          'Relevant writing credentials',
          'Why you chose this specific agent',
          'Comparable titles',
          'Any relevant expertise'
        ],
        tips: [
          'Personalise to the agent (mention specific titles they\'ve represented)',
          'Keep bio brief and relevant',
          'Use recent comp titles (within 2-3 years)',
          'Be professional and confident'
        ]
      }
    },
    exampleHook: 'When [PROTAGONIST] must [ACTION], they discover [REVELATION], forcing them to choose between [CHOICE A] and [CHOICE B].',
    genreSpecificTips: [
      'Research the agent thoroughly before querying',
      'Be specific about genre and word count',
      'Use comparable titles strategically',
      'Professional, confident tone',
      'Proofread meticulously—typos are query killers',
      'Follow agent submission guidelines exactly'
    ]
  }
};

/**
 * Get query letter template for a specific genre
 */
export function getQueryLetterTemplate(genre: string): QueryLetterTemplate {
  const normalizedGenre = genre.toLowerCase().replace(/\s+/g, '-');
  return QUERY_LETTER_TEMPLATES[normalizedGenre] || QUERY_LETTER_TEMPLATES.general;
}

/**
 * Get all available query letter templates
 */
export function getAllQueryLetterTemplates(): QueryLetterTemplate[] {
  return Object.values(QUERY_LETTER_TEMPLATES);
}

/**
 * Get genres with query letter templates
 */
export function getAvailableQueryGenres(): string[] {
  return Object.keys(QUERY_LETTER_TEMPLATES).filter(key => key !== 'general');
}
