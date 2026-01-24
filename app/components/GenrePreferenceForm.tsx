'use client';

import { useState } from 'react';

export interface StoryPreferences {
  genre: string;
  genres: string[]; // Support multi-genre
  subgenres: string[]; // Support multi-subgenre
  modifiers: string[]; // Genre modifiers like Political, Military
  tone: string; // For backward compatibility (first selected tone)
  tones: string[]; // Support multi-tone selection
  themes: string[];
  customTheme?: string; // Free text custom theme
  targetLength: number;
  additionalNotes?: string;
  customIdeas?: string;
}

interface GenrePreferenceFormProps {
  onSubmit: (preferences: StoryPreferences) => void;
  isLoading: boolean;
}

// Market trend indicators (2026 data)
const MARKET_TRENDS: Record<string, 'trending' | 'rising' | 'stable'> = {
  'romantasy': 'trending',          // Extremely hot in 2024-2026
  'cozy-fantasy': 'trending',       // Major growth in 2025-2026
  'litrpg': 'rising',               // Steady growth, especially on Kindle Unlimited
  'climate-fiction': 'rising',      // Growing interest due to real-world events
  'afrofuturism': 'rising',         // Increasing representation and demand
  'grimdark': 'stable',             // Consistent fanbase
  'solarpunk': 'rising',            // Alternative to dystopian narratives
  'romance': 'trending',            // Romance dominates market share
  'fantasy': 'trending',            // Perennial bestseller
  'thriller': 'stable',             // Consistently popular
  'mystery': 'stable',              // Reliable genre
};

// Classic genres - traditional, well-established categories
const CLASSIC_GENRES = [
  { value: 'fantasy', label: 'Fantasy', trend: MARKET_TRENDS.fantasy },
  { value: 'science-fiction', label: 'Science Fiction' },
  { value: 'romance', label: 'Romance', trend: MARKET_TRENDS.romance },
  { value: 'mystery', label: 'Mystery', trend: MARKET_TRENDS.mystery },
  { value: 'thriller', label: 'Thriller', trend: MARKET_TRENDS.thriller },
  { value: 'horror', label: 'Horror' },
  { value: 'historical', label: 'Historical Fiction' },
  { value: 'literary', label: 'Literary Fiction' },
  { value: 'contemporary', label: 'Contemporary Fiction' },
  { value: 'western', label: 'Western' },
];

// Specialist genres - niche, emerging, or cross-genre categories
const SPECIALIST_GENRES = [
  { value: 'romantasy', label: 'Romantasy', trend: MARKET_TRENDS.romantasy },
  { value: 'cozy-fantasy', label: 'Cozy Fantasy', trend: MARKET_TRENDS['cozy-fantasy'] },
  { value: 'grimdark', label: 'Grimdark', trend: MARKET_TRENDS.grimdark },
  { value: 'litrpg', label: 'LitRPG / GameLit', trend: MARKET_TRENDS.litrpg },
  { value: 'afrofuturism', label: 'Afrofuturism', trend: MARKET_TRENDS.afrofuturism },
  { value: 'climate-fiction', label: 'Climate Fiction (Cli-Fi)', trend: MARKET_TRENDS['climate-fiction'] },
  { value: 'solarpunk', label: 'Solarpunk', trend: MARKET_TRENDS.solarpunk },
  { value: 'steampunk', label: 'Steampunk' },
  { value: 'new-weird', label: 'New Weird' },
  { value: 'paranormal', label: 'Paranormal' },
  { value: 'wuxia', label: 'Wuxia / Xianxia' },
  { value: 'legal-drama', label: 'Legal Drama' },
  { value: 'medical-drama', label: 'Medical Drama' },
  { value: 'sports-fiction', label: 'Sports Fiction' },
];

// Combined for lookups
const GENRES = [...CLASSIC_GENRES, ...SPECIALIST_GENRES];

const SUBGENRES: Record<string, string[]> = {
  afrofuturism: ['Afrofuturist SF', 'Afrofuturist Fantasy', 'Afro-Cyberpunk', 'African Mythology SF', 'Black Space Opera', 'Afrofuturist Horror'],
  'climate-fiction': ['Near Future Climate', 'Climate Disaster', 'Eco-Thriller', 'Solarpunk Utopia', 'Post-Climate Collapse', 'Climate Mystery'],
  contemporary: ['Family Drama', 'Coming of Age', 'Social Issues', 'Workplace Drama', 'Slice of Life'],
  'cozy-fantasy': ['Slice of Life Fantasy', 'Cozy Mystery Fantasy', 'Cozy Romance Fantasy', 'Low Stakes Adventure', 'Found Family Fantasy', 'Cottage Core Fantasy'],
  fantasy: ['Epic Fantasy', 'Urban Fantasy', 'Dark Fantasy', 'High Fantasy', 'Low Fantasy', 'Sword & Sorcery'],
  grimdark: ['Grimdark Fantasy', 'Grimdark Sci-Fi', 'Military Grimdark', 'Cosmic Grimdark', 'Historical Grimdark', 'Post-Apocalyptic Grimdark'],
  historical: ['Ancient History', 'Medieval', 'Victorian Era', 'World War Era', '20th Century', 'Alternate History'],
  horror: ['Supernatural Horror', 'Psychological Horror', 'Gothic Horror', 'Cosmic Horror', 'Body Horror'],
  'legal-drama': ['Courtroom Drama', 'Legal Thriller', 'Criminal Defense', 'Corporate Law', 'Legal Mystery', 'Legal Romance'],
  literary: ['Contemporary Literary', 'Experimental', 'Philosophical', 'Character-Driven', 'Magical Realism'],
  litrpg: ['Dungeon Core', 'GameLit', 'Virtual Reality', 'System Apocalypse', 'Progression Fantasy', 'Cultivation'],
  'medical-drama': ['Hospital Drama', 'Medical Thriller', 'Medical Mystery', 'Medical Romance', 'Emergency Medicine', 'Medical Horror'],
  mystery: ['Cozy Mystery', 'Police Procedural', 'Detective', 'Noir', 'Whodunit', 'Legal Mystery'],
  'new-weird': ['Urban Weird', 'Weird Horror', 'Weird Fantasy', 'Slipstream', 'Bizarro Fiction', 'Surreal Fiction'],
  paranormal: ['Paranormal Mystery', 'Paranormal Thriller', 'Paranormal Investigation', 'Ghost Stories', 'Supernatural Drama', 'Paranormal Action'],
  romance: ['Contemporary Romance', 'Historical Romance', 'Paranormal Romance', 'Romantic Comedy', 'Slow Burn'],
  romantasy: ['Fae Romance', 'Witch Romance', 'Dragon Romance', 'Vampire Romance', 'Magical Royalty Romance', 'Court Intrigue Romance'],
  'science-fiction': ['Space Opera', 'Cyberpunk', 'Hard SF', 'Dystopian', 'Post-Apocalyptic', 'First Contact'],
  solarpunk: ['Eco-Utopia', 'Green Tech SF', 'Sustainable Future', 'Hopeful Climate Fiction', 'Community-Focused SF', 'Biomimicry Fiction'],
  'sports-fiction': ['Sports Drama', 'Sports Romance', 'Underdog Sports', 'Professional Sports', 'College Sports', 'Fantasy Sports'],
  steampunk: ['Victorian Steampunk', 'Dieselpunk', 'Clockpunk', 'Gaslamp Fantasy', 'Steampunk Romance', 'Post-Apocalyptic Steampunk'],
  thriller: ['Psychological Thriller', 'Action Thriller', 'Legal Thriller', 'Medical Thriller', 'Spy Thriller'],
  western: ['Classic Western', 'Weird West', 'Space Western', 'Contemporary Western', 'Western Romance', 'Revisionist Western'],
  wuxia: ['Classical Wuxia', 'Xianxia Cultivation', 'Modern Wuxia', 'Wuxia Romance', 'Historical Wuxia', 'Mythological Wuxia'],
};

// Genre modifiers that can combine with any genre
const GENRE_MODIFIERS = [
  { value: 'political', label: 'Political' },
  { value: 'military', label: 'Military' },
  { value: 'espionage', label: 'Espionage' },
  { value: 'heist', label: 'Heist' },
  { value: 'action', label: 'Action' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'comedic', label: 'Comedic' },
  { value: 'dark', label: 'Dark' },
  { value: 'epic', label: 'Epic' },
  { value: 'survival', label: 'Survival' },
  { value: 'psychological', label: 'Psychological' },
];

// Tones with descriptions to help users understand each option
const TONES = [
  { value: 'Dark and Gritty', description: 'Harsh realities, moral ambiguity, unflinching portrayal of violence or hardship' },
  { value: 'Light and Humorous', description: 'Comedic moments, witty dialogue, fun and entertaining atmosphere' },
  { value: 'Epic and Grand', description: 'Large scale, sweeping narratives, world-changing stakes and heroic journeys' },
  { value: 'Intimate and Personal', description: 'Character-focused, emotional depth, close relationships and inner journeys' },
  { value: 'Mysterious and Suspenseful', description: 'Secrets, tension, unanswered questions that keep readers guessing' },
  { value: 'Hopeful and Uplifting', description: 'Optimistic outlook, triumph over adversity, feel-good endings' },
  { value: 'Satirical and Witty', description: 'Social commentary, clever humor, ironic observations about society' },
  { value: 'Melancholic and Reflective', description: 'Thoughtful, bittersweet, contemplative exploration of loss or memory' },
  { value: 'Tense and Fast-Paced', description: 'High stakes, quick action, page-turner momentum that builds urgency' },
  { value: 'Morally Complex', description: 'Grey areas, difficult choices, characters who challenge simple right and wrong' },
  { value: 'Romantic and Passionate', description: 'Emotional intensity, love-focused, deep connections and yearning' },
  { value: 'Whimsical and Fantastical', description: 'Playful imagination, magical wonder, dreamlike and enchanting' },
];

const COMMON_THEMES = [
  // Core Themes
  'Power and Corruption',
  'Love and Sacrifice',
  'Revenge and Justice',
  'Identity and Self-Discovery',
  'Good vs Evil',
  'Survival',
  'Family and Loyalty',
  'Freedom and Oppression',
  'Betrayal and Trust',
  'Redemption',
  'Coming of Age',
  'Nature vs Technology',
  'War and Peace',
  'Class and Society',
  'Morality and Ethics',
  // Additional Themes
  'Forbidden Love',
  'Time and Mortality',
  'Ambition and Hubris',
  'Faith and Doubt',
  'Memory and Forgetting',
  'Isolation and Connection',
  'Legacy and Heritage',
  'Secrets and Lies',
  'Hope and Despair',
  'Transformation',
  'Obsession',
  'Fate vs Free Will',
  'Truth and Deception',
  'Innocence and Experience',
  'Greed and Generosity',
];

export default function GenrePreferenceForm({ onSubmit, isLoading }: GenrePreferenceFormProps) {
  const [genres, setGenres] = useState<string[]>([]);
  const [subgenres, setSubgenres] = useState<string[]>([]);
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [tones, setTones] = useState<string[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [customTheme, setCustomTheme] = useState('');
  const [targetLength, setTargetLength] = useState(80000);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [customIdeas, setCustomIdeas] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGenreToggle = (genreValue: string) => {
    if (genres.includes(genreValue)) {
      setGenres(genres.filter(g => g !== genreValue));
      // Remove subgenres that belong to the deselected genre
      setSubgenres(subgenres.filter(sg => !SUBGENRES[genreValue]?.includes(sg)));
    } else {
      if (genres.length < 3) {
        setGenres([...genres, genreValue]);
      }
    }
  };

  const handleSubgenreToggle = (subgenre: string) => {
    if (subgenres.includes(subgenre)) {
      setSubgenres(subgenres.filter(sg => sg !== subgenre));
    } else {
      if (subgenres.length < 3) {
        setSubgenres([...subgenres, subgenre]);
      }
    }
  };

  const handleModifierToggle = (modifier: string) => {
    if (modifiers.includes(modifier)) {
      setModifiers(modifiers.filter(m => m !== modifier));
    } else {
      if (modifiers.length < 4) {
        setModifiers([...modifiers, modifier]);
      }
    }
  };

  const handleThemeToggle = (theme: string) => {
    if (themes.includes(theme)) {
      setThemes(themes.filter(t => t !== theme));
    } else {
      if (themes.length < 5) {
        setThemes([...themes, theme]);
      }
    }
  };

  const handleToneToggle = (toneValue: string) => {
    if (tones.includes(toneValue)) {
      setTones(tones.filter(t => t !== toneValue));
    } else {
      if (tones.length < 3) {
        setTones([...tones, toneValue]);
      }
    }
  };

  // Get available subgenres based on selected genres
  const availableSubgenres = genres.flatMap(g => SUBGENRES[g] || []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (genres.length === 0) newErrors.genres = 'Please select at least one genre';
    if (subgenres.length === 0) newErrors.subgenres = 'Please select at least one subgenre';
    if (tones.length === 0) newErrors.tones = 'Please select at least one tone';
    if (themes.length === 0 && !customTheme.trim()) newErrors.themes = 'Please select at least one theme or add a custom theme';
    if (targetLength < 40000) newErrors.targetLength = 'Target length must be at least 40,000 words';
    if (targetLength > 150000) newErrors.targetLength = 'Target length must be at most 150,000 words';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Build combined genre string for backward compatibility
    const genreLabels = genres.map(g => GENRES.find(genre => genre.value === g)?.label || g);
    const modifierLabels = modifiers.map(m => GENRE_MODIFIERS.find(mod => mod.value === m)?.label || m);
    const combinedGenre = [...modifierLabels, ...genreLabels].join(' ');

    // Combine selected themes with custom theme if provided
    const allThemes = customTheme.trim()
      ? [...themes, customTheme.trim()]
      : themes;

    const preferences: StoryPreferences = {
      genre: combinedGenre,
      genres,
      subgenres,
      modifiers,
      tone: tones[0] || '', // First tone for backward compatibility
      tones,
      themes: allThemes,
      customTheme: customTheme.trim() || undefined,
      targetLength,
      additionalNotes: additionalNotes.trim() || undefined,
      customIdeas: customIdeas.trim() || undefined,
    };

    onSubmit(preferences);
  };

  // Build a preview of the genre combination
  const genrePreview = () => {
    const parts: string[] = [];
    if (modifiers.length > 0) {
      parts.push(modifiers.map(m => GENRE_MODIFIERS.find(mod => mod.value === m)?.label).join(', '));
    }
    if (genres.length > 0) {
      parts.push(genres.map(g => GENRES.find(genre => genre.value === g)?.label).join(' + '));
    }
    if (subgenres.length > 0) {
      parts.push(`(${subgenres.join(', ')})`);
    }
    return parts.join(' ') || 'Select genres and modifiers...';
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.875rem 1rem',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    color: '#1A1A2E',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    appearance: 'none',
    WebkitAppearance: 'none',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748B' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
    paddingRight: '2.5rem',
    cursor: 'pointer',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.875rem',
  };

  const errorStyle: React.CSSProperties = {
    color: '#DC2626',
    fontSize: '0.813rem',
    marginTop: '0.375rem',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '1.75rem',
  };

  const chipStyle = (selected: boolean, disabled: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    background: selected
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : '#F8FAFC',
    border: selected
      ? '1px solid #667eea'
      : '1px solid #E2E8F0',
    borderRadius: '20px',
    color: selected ? '#FFFFFF' : '#374151',
    fontSize: '0.813rem',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  });

  const getTrendBadge = (trend?: 'trending' | 'rising' | 'stable') => {
    if (!trend) return null;

    const styles: Record<string, React.CSSProperties> = {
      trending: {
        background: '#EF4444',
        color: '#FFFFFF',
        animation: 'pulse 2s infinite',
      },
      rising: {
        background: '#F59E0B',
        color: '#FFFFFF',
      },
      stable: {
        background: '#10B981',
        color: '#FFFFFF',
      },
    };

    const labels: Record<string, string> = {
      trending: '🔥 Hot',
      rising: '📈 Rising',
      stable: '✓ Popular',
    };

    return (
      <span
        style={{
          ...styles[trend],
          fontSize: '0.625rem',
          fontWeight: 600,
          padding: '0.125rem 0.375rem',
          borderRadius: '4px',
          marginLeft: '0.375rem',
          textTransform: 'uppercase',
        }}
      >
        {labels[trend]}
      </span>
    );
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {/* Genre Preview */}
      <div style={{
        ...sectionStyle,
        padding: '1rem',
        background: '#EEF2FF',
        border: '1px solid #C7D2FE',
        borderRadius: '8px',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>
          Story Genre:
        </div>
        <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1A1A2E' }}>
          {genrePreview()}
        </div>
      </div>

      {/* Genre Modifiers */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Genre Modifiers
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Select up to 4)</span>
        </label>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          {GENRE_MODIFIERS.map(mod => (
            <button
              key={mod.value}
              type="button"
              onClick={() => handleModifierToggle(mod.value)}
              disabled={isLoading || (!modifiers.includes(mod.value) && modifiers.length >= 4)}
              style={chipStyle(modifiers.includes(mod.value), isLoading || (!modifiers.includes(mod.value) && modifiers.length >= 4))}
            >
              {mod.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Genre Selection */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Primary Genre <span style={{ color: '#DC2626' }}>*</span>
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Select 1-3)</span>
        </label>
        <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span>🔥 Hot = Trending now</span>
          <span>📈 Rising = Growing popularity</span>
          <span>✓ Popular = Consistently strong</span>
        </div>

        {/* Classic Genres */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Classic Genres
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            {CLASSIC_GENRES.map(g => (
              <button
                key={g.value}
                type="button"
                onClick={() => handleGenreToggle(g.value)}
                disabled={isLoading || (!genres.includes(g.value) && genres.length >= 3)}
                style={{
                  ...chipStyle(genres.includes(g.value), isLoading || (!genres.includes(g.value) && genres.length >= 3)),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <span>{g.label}</span>
                {getTrendBadge(g.trend)}
              </button>
            ))}
          </div>
        </div>

        {/* Specialist Genres */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Specialist Genres
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            {SPECIALIST_GENRES.map(g => (
              <button
                key={g.value}
                type="button"
                onClick={() => handleGenreToggle(g.value)}
                disabled={isLoading || (!genres.includes(g.value) && genres.length >= 3)}
                style={{
                  ...chipStyle(genres.includes(g.value), isLoading || (!genres.includes(g.value) && genres.length >= 3)),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <span>{g.label}</span>
                {getTrendBadge(g.trend)}
              </button>
            ))}
          </div>
        </div>
        {errors.genres && <div style={errorStyle}>{errors.genres}</div>}
      </div>

      {/* Subgenre Selection */}
      {genres.length > 0 && (
        <div style={sectionStyle}>
          <label style={labelStyle}>
            Subgenre <span style={{ color: '#DC2626' }}>*</span>
            <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Select 1-3)</span>
          </label>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            {availableSubgenres.map(sg => (
              <button
                key={sg}
                type="button"
                onClick={() => handleSubgenreToggle(sg)}
                disabled={isLoading || (!subgenres.includes(sg) && subgenres.length >= 3)}
                style={chipStyle(subgenres.includes(sg), isLoading || (!subgenres.includes(sg) && subgenres.length >= 3))}
              >
                {sg}
              </button>
            ))}
          </div>
          {errors.subgenres && <div style={errorStyle}>{errors.subgenres}</div>}
        </div>
      )}

      {/* Tone Selection - Multi-select with descriptions */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Tone <span style={{ color: '#DC2626' }}>*</span>
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Select 1-3 to combine)</span>
        </label>
        <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.75rem' }}>
          Combine tones for richer storytelling - e.g., "Epic and Grand" + "Tense and Fast-Paced" for action-packed epics
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '0.625rem',
        }}>
          {TONES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleToneToggle(t.value)}
              disabled={isLoading || (!tones.includes(t.value) && tones.length >= 3)}
              style={{
                padding: '0.75rem 1rem',
                background: tones.includes(t.value)
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#F8FAFC',
                border: tones.includes(t.value)
                  ? '1px solid #667eea'
                  : '1px solid #E2E8F0',
                borderRadius: '8px',
                color: tones.includes(t.value) ? '#FFFFFF' : '#374151',
                cursor: isLoading || (!tones.includes(t.value) && tones.length >= 3) ? 'not-allowed' : 'pointer',
                opacity: isLoading || (!tones.includes(t.value) && tones.length >= 3) ? 0.5 : 1,
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                {t.value}
              </div>
              <div style={{
                fontSize: '0.75rem',
                opacity: tones.includes(t.value) ? 0.9 : 0.7,
                lineHeight: 1.3,
              }}>
                {t.description}
              </div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: '0.625rem', fontSize: '0.813rem', color: '#64748B' }}>
          Selected: {tones.length}/3
        </div>
        {errors.tones && <div style={errorStyle}>{errors.tones}</div>}
      </div>

      {/* Themes Selection */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Themes <span style={{ color: '#DC2626' }}>*</span>
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Select up to 5, or add your own)</span>
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '0.625rem',
        }}>
          {COMMON_THEMES.map(theme => (
            <button
              key={theme}
              type="button"
              onClick={() => handleThemeToggle(theme)}
              disabled={isLoading || (!themes.includes(theme) && themes.length >= 5)}
              style={{
                padding: '0.625rem 1rem',
                background: themes.includes(theme)
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#F8FAFC',
                border: themes.includes(theme)
                  ? '1px solid #667eea'
                  : '1px solid #E2E8F0',
                borderRadius: '8px',
                color: themes.includes(theme) ? '#FFFFFF' : '#374151',
                fontSize: '0.813rem',
                fontWeight: 500,
                cursor: isLoading || (!themes.includes(theme) && themes.length >= 5) ? 'not-allowed' : 'pointer',
                opacity: isLoading || (!themes.includes(theme) && themes.length >= 5) ? 0.5 : 1,
                transition: 'all 0.2s',
                textAlign: 'center',
              }}
            >
              {theme}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '0.625rem', fontSize: '0.813rem', color: '#64748B' }}>
          Selected: {themes.length}/5
        </div>

        {/* Custom Theme Input */}
        <div style={{ marginTop: '1rem' }}>
          <label style={{ ...labelStyle, fontSize: '0.813rem' }}>
            Add Your Own Theme
            <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Optional)</span>
          </label>
          <input
            type="text"
            value={customTheme}
            onChange={(e) => setCustomTheme(e.target.value)}
            placeholder="e.g., 'Technology as liberation', 'Urban decay and renewal', 'Generational trauma'..."
            style={inputStyle}
            disabled={isLoading}
          />
          <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: '#64748B' }}>
            Describe a specific thematic focus not covered above. Be as specific as you like.
          </div>
        </div>
        {errors.themes && <div style={errorStyle}>{errors.themes}</div>}
      </div>

      {/* Target Length */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Target Length (words) <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <input
          type="number"
          value={targetLength}
          onChange={(e) => setTargetLength(Number(e.target.value))}
          min={40000}
          max={150000}
          step={1000}
          style={inputStyle}
          disabled={isLoading}
        />
        <div style={{ marginTop: '0.5rem', fontSize: '0.813rem', color: '#64748B' }}>
          Typical novel: 70,000-100,000 words. Epic fantasy: 100,000-150,000 words.
        </div>
        {errors.targetLength && <div style={errorStyle}>{errors.targetLength}</div>}
      </div>

      {/* Custom Story Ideas */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Your Story Ideas
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Optional - describe concepts you want explored)</span>
        </label>
        <textarea
          value={customIdeas}
          onChange={(e) => setCustomIdeas(e.target.value)}
          placeholder="Describe specific story ideas, character concepts, plot elements, or unique twists you want the AI to incorporate. For example: 'A librarian who discovers books can predict the future' or 'A heist involving magical artifacts in a steampunk city'..."
          rows={4}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: '100px',
          }}
          disabled={isLoading}
        />
        <div style={{ marginTop: '0.5rem', fontSize: '0.813rem', color: '#64748B' }}>
          Be specific! The more detail you provide, the more tailored your concepts will be.
        </div>
      </div>

      {/* Additional Notes */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Additional Notes
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Optional)</span>
        </label>
        <textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Any other preferences, inspirations, or style guidelines..."
          rows={3}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: '80px',
          }}
          disabled={isLoading}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '1rem',
          background: isLoading
            ? '#94A3B8'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '8px',
          color: '#FFFFFF',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          boxShadow: isLoading ? 'none' : '0 4px 14px rgba(102, 126, 234, 0.4)',
        }}
      >
        {isLoading ? 'Generating Concepts...' : 'Generate Story Concepts'}
      </button>
    </form>
  );
}
