'use client';

import { useState } from 'react';

export interface StoryPreferences {
  genre: string;
  genres: string[]; // Support multi-genre
  subgenres: string[]; // Support multi-subgenre
  modifiers: string[]; // Genre modifiers like Political, Military
  tone: string;
  themes: string[];
  targetLength: number;
  additionalNotes?: string;
}

interface GenrePreferenceFormProps {
  onSubmit: (preferences: StoryPreferences) => void;
  isLoading: boolean;
}

const GENRES = [
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'science-fiction', label: 'Science Fiction' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'romance', label: 'Romance' },
  { value: 'horror', label: 'Horror' },
  { value: 'literary', label: 'Literary Fiction' },
  { value: 'historical', label: 'Historical Fiction' },
  { value: 'contemporary', label: 'Contemporary Fiction' },
];

const SUBGENRES: Record<string, string[]> = {
  fantasy: ['Epic Fantasy', 'Urban Fantasy', 'Dark Fantasy', 'High Fantasy', 'Low Fantasy', 'Sword & Sorcery'],
  'science-fiction': ['Space Opera', 'Cyberpunk', 'Hard SF', 'Dystopian', 'Post-Apocalyptic', 'First Contact'],
  mystery: ['Cozy Mystery', 'Police Procedural', 'Detective', 'Noir', 'Whodunit', 'Legal Mystery'],
  thriller: ['Psychological Thriller', 'Action Thriller', 'Legal Thriller', 'Medical Thriller', 'Spy Thriller'],
  romance: ['Contemporary Romance', 'Historical Romance', 'Paranormal Romance', 'Romantic Comedy', 'Slow Burn'],
  horror: ['Supernatural Horror', 'Psychological Horror', 'Gothic Horror', 'Cosmic Horror', 'Body Horror'],
  literary: ['Contemporary Literary', 'Experimental', 'Philosophical', 'Character-Driven', 'Magical Realism'],
  historical: ['Ancient History', 'Medieval', 'Victorian Era', 'World War Era', '20th Century', 'Alternate History'],
  contemporary: ['Family Drama', 'Coming of Age', 'Social Issues', 'Workplace Drama', 'Slice of Life'],
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

const TONES = [
  'Dark and Gritty',
  'Light and Humorous',
  'Epic and Grand',
  'Intimate and Personal',
  'Mysterious and Suspenseful',
  'Hopeful and Uplifting',
  'Satirical and Witty',
  'Melancholic and Reflective',
  'Tense and Fast-Paced',
  'Morally Complex',
];

const COMMON_THEMES = [
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
];

export default function GenrePreferenceForm({ onSubmit, isLoading }: GenrePreferenceFormProps) {
  const [genres, setGenres] = useState<string[]>([]);
  const [subgenres, setSubgenres] = useState<string[]>([]);
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [tone, setTone] = useState('');
  const [themes, setThemes] = useState<string[]>([]);
  const [targetLength, setTargetLength] = useState(80000);
  const [additionalNotes, setAdditionalNotes] = useState('');
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

  // Get available subgenres based on selected genres
  const availableSubgenres = genres.flatMap(g => SUBGENRES[g] || []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (genres.length === 0) newErrors.genres = 'Please select at least one genre';
    if (subgenres.length === 0) newErrors.subgenres = 'Please select at least one subgenre';
    if (!tone) newErrors.tone = 'Please select a tone';
    if (themes.length === 0) newErrors.themes = 'Please select at least one theme';
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

    const preferences: StoryPreferences = {
      genre: combinedGenre,
      genres,
      subgenres,
      modifiers,
      tone,
      themes,
      targetLength,
      additionalNotes: additionalNotes.trim() || undefined,
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
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          {GENRES.map(g => (
            <button
              key={g.value}
              type="button"
              onClick={() => handleGenreToggle(g.value)}
              disabled={isLoading || (!genres.includes(g.value) && genres.length >= 3)}
              style={chipStyle(genres.includes(g.value), isLoading || (!genres.includes(g.value) && genres.length >= 3))}
            >
              {g.label}
            </button>
          ))}
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

      {/* Tone Selection */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Tone <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          style={selectStyle}
          disabled={isLoading}
        >
          <option value="">Select a tone...</option>
          {TONES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {errors.tone && <div style={errorStyle}>{errors.tone}</div>}
      </div>

      {/* Themes Selection */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Themes <span style={{ color: '#DC2626' }}>*</span>
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Select 1-5)</span>
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

      {/* Additional Notes */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Additional Notes
          <span style={{ fontWeight: 400, color: '#64748B', marginLeft: '0.5rem' }}>(Optional)</span>
        </label>
        <textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Any specific preferences, inspirations, or elements you'd like to include..."
          rows={4}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: '100px',
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
