'use client';

import { useState } from 'react';

export interface StoryPreferences {
  genre: string;
  subgenre: string;
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
  fantasy: ['Epic Fantasy', 'Urban Fantasy', 'Dark Fantasy', 'High Fantasy', 'Low Fantasy'],
  'science-fiction': ['Space Opera', 'Cyberpunk', 'Hard SF', 'Dystopian', 'Post-Apocalyptic'],
  mystery: ['Cozy Mystery', 'Police Procedural', 'Detective', 'Noir', 'Whodunit'],
  thriller: ['Psychological Thriller', 'Action Thriller', 'Legal Thriller', 'Medical Thriller'],
  romance: ['Contemporary Romance', 'Historical Romance', 'Paranormal Romance', 'Romantic Comedy'],
  horror: ['Supernatural Horror', 'Psychological Horror', 'Gothic Horror', 'Cosmic Horror'],
  literary: ['Contemporary Literary', 'Experimental', 'Philosophical', 'Character-Driven'],
  historical: ['Ancient History', 'Medieval', 'Victorian Era', 'World War Era', '20th Century'],
  contemporary: ['Family Drama', 'Coming of Age', 'Social Issues', 'Workplace Drama'],
};

const TONES = [
  'Dark and Gritty',
  'Light and Humorous',
  'Epic and Grand',
  'Intimate and Personal',
  'Mysterious and Suspenseful',
  'Hopeful and Uplifting',
  'Satirical and Witty',
  'Melancholic and Reflective',
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
];

export default function GenrePreferenceForm({ onSubmit, isLoading }: GenrePreferenceFormProps) {
  const [genre, setGenre] = useState('');
  const [subgenre, setSubgenre] = useState('');
  const [tone, setTone] = useState('');
  const [themes, setThemes] = useState<string[]>([]);
  const [targetLength, setTargetLength] = useState(80000);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleThemeToggle = (theme: string) => {
    if (themes.includes(theme)) {
      setThemes(themes.filter(t => t !== theme));
    } else {
      if (themes.length < 5) {
        setThemes([...themes, theme]);
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!genre) newErrors.genre = 'Please select a genre';
    if (!subgenre) newErrors.subgenre = 'Please select a subgenre';
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

    const preferences: StoryPreferences = {
      genre,
      subgenre,
      tone,
      themes,
      targetLength,
      additionalNotes: additionalNotes.trim() || undefined,
    };

    onSubmit(preferences);
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    color: '#ededed',
    fontSize: '1rem',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#ededed',
    fontWeight: 500,
  };

  const errorStyle = {
    color: '#ef4444',
    fontSize: '0.875rem',
    marginTop: '0.25rem',
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {/* Genre Selection */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={labelStyle}>
          Genre *
        </label>
        <select
          value={genre}
          onChange={(e) => {
            setGenre(e.target.value);
            setSubgenre(''); // Reset subgenre when genre changes
          }}
          style={inputStyle}
          disabled={isLoading}
        >
          <option value="">Select a genre...</option>
          {GENRES.map(g => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
        {errors.genre && <div style={errorStyle}>{errors.genre}</div>}
      </div>

      {/* Subgenre Selection */}
      {genre && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>
            Subgenre *
          </label>
          <select
            value={subgenre}
            onChange={(e) => setSubgenre(e.target.value)}
            style={inputStyle}
            disabled={isLoading}
          >
            <option value="">Select a subgenre...</option>
            {SUBGENRES[genre]?.map(sg => (
              <option key={sg} value={sg}>{sg}</option>
            ))}
          </select>
          {errors.subgenre && <div style={errorStyle}>{errors.subgenre}</div>}
        </div>
      )}

      {/* Tone Selection */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={labelStyle}>
          Tone *
        </label>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          style={inputStyle}
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
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={labelStyle}>
          Themes * (Select 1-5)
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '0.5rem'
        }}>
          {COMMON_THEMES.map(theme => (
            <button
              key={theme}
              type="button"
              onClick={() => handleThemeToggle(theme)}
              disabled={isLoading || (!themes.includes(theme) && themes.length >= 5)}
              style={{
                padding: '0.5rem 1rem',
                background: themes.includes(theme)
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: themes.includes(theme)
                  ? '1px solid rgba(102, 126, 234, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#ededed',
                fontSize: '0.875rem',
                cursor: isLoading || (!themes.includes(theme) && themes.length >= 5) ? 'not-allowed' : 'pointer',
                opacity: isLoading || (!themes.includes(theme) && themes.length >= 5) ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              {theme}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#888' }}>
          Selected: {themes.length}/5
        </div>
        {errors.themes && <div style={errorStyle}>{errors.themes}</div>}
      </div>

      {/* Target Length */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={labelStyle}>
          Target Length (words) *
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
        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#888' }}>
          Typical novel: 70,000-100,000 words. Epic fantasy: 100,000-150,000 words.
        </div>
        {errors.targetLength && <div style={errorStyle}>{errors.targetLength}</div>}
      </div>

      {/* Additional Notes */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={labelStyle}>
          Additional Notes (Optional)
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
            ? 'rgba(102, 126, 234, 0.3)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '1.125rem',
          fontWeight: 600,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {isLoading ? 'Generating Concepts...' : 'Generate Story Concepts'}
      </button>
    </form>
  );
}
