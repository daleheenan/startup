'use client';

import { useState, useEffect } from 'react';

interface GenreOption {
  value: string;
  label: string;
}

interface BlendedGenre {
  name: string;
  description: string;
  subgenres: string[];
  compatibilityScore: number;
  recommendations: string[];
}

interface GenreBlenderProps {
  availableGenres: GenreOption[];
  availableSubgenres: Record<string, string[]>;
  onBlendComplete: (blendedGenre: BlendedGenre) => void;
  isLoading?: boolean;
}

export default function GenreBlender({
  availableGenres,
  availableSubgenres,
  onBlendComplete,
  isLoading = false,
}: GenreBlenderProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [blendedGenre, setBlendedGenre] = useState<BlendedGenre | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Genre compatibility matrix (simplified version)
  const genreCompatibility: Record<string, Record<string, number>> = {
    fantasy: { 'science-fiction': 0.8, romance: 0.9, horror: 0.85, mystery: 0.7, western: 0.75 },
    'science-fiction': { fantasy: 0.8, horror: 0.9, thriller: 0.85, mystery: 0.8, western: 0.7 },
    mystery: { thriller: 0.95, horror: 0.85, romance: 0.7, fantasy: 0.7, 'science-fiction': 0.8 },
    thriller: { mystery: 0.95, horror: 0.9, 'science-fiction': 0.85, romance: 0.6 },
    romance: { fantasy: 0.9, contemporary: 0.95, historical: 0.9, paranormal: 0.85, horror: 0.6 },
    horror: { thriller: 0.9, 'science-fiction': 0.9, fantasy: 0.85, mystery: 0.85, romance: 0.6 },
    historical: { romance: 0.9, mystery: 0.85, fantasy: 0.8, western: 0.8 },
    contemporary: { romance: 0.95, mystery: 0.8, literary: 0.9, thriller: 0.75 },
  };

  useEffect(() => {
    if (selectedGenres.length >= 2) {
      generateBlend();
    } else {
      setBlendedGenre(null);
    }
  }, [selectedGenres]);

  const handleGenreToggle = (genreValue: string) => {
    if (selectedGenres.includes(genreValue)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genreValue));
    } else {
      if (selectedGenres.length < 3) {
        setSelectedGenres([...selectedGenres, genreValue]);
      }
    }
  };

  const getCompatibilityScore = (genres: string[]): number => {
    if (genres.length < 2) return 0;

    let totalScore = 0;
    let comparisons = 0;

    for (let i = 0; i < genres.length; i++) {
      for (let j = i + 1; j < genres.length; j++) {
        const g1 = genres[i];
        const g2 = genres[j];
        const score = genreCompatibility[g1]?.[g2] || genreCompatibility[g2]?.[g1] || 0.5;
        totalScore += score;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalScore / comparisons : 0;
  };

  const generateBlend = () => {
    if (selectedGenres.length < 2) {
      return;
    }

    const genreLabels = selectedGenres
      .map((g) => availableGenres.find((genre) => genre.value === g)?.label)
      .filter(Boolean);

    const blendName = genreLabels.join(' + ');

    // Merge subgenres from all selected genres
    const mergedSubgenres: string[] = [];
    selectedGenres.forEach((genre) => {
      const subgenres = availableSubgenres[genre] || [];
      // Take the first 2-3 subgenres from each genre
      mergedSubgenres.push(...subgenres.slice(0, Math.ceil(6 / selectedGenres.length)));
    });

    const compatibilityScore = getCompatibilityScore(selectedGenres);

    const recommendations = generateRecommendations(selectedGenres, compatibilityScore);

    const description = generateDescription(genreLabels, compatibilityScore);

    const blend: BlendedGenre = {
      name: blendName,
      description,
      subgenres: mergedSubgenres,
      compatibilityScore,
      recommendations,
    };

    setBlendedGenre(blend);
  };

  const generateDescription = (labels: (string | undefined)[], score: number): string => {
    const validLabels = labels.filter((l): l is string => l !== undefined);

    if (score >= 0.85) {
      return `A highly compatible blend of ${validLabels.join(' and ')}. These genres complement each other naturally and offer exciting creative possibilities.`;
    } else if (score >= 0.7) {
      return `A promising fusion of ${validLabels.join(' and ')}. With careful execution, this combination can create a unique and engaging story.`;
    } else if (score >= 0.5) {
      return `An experimental mix of ${validLabels.join(' and ')}. This unconventional combination requires skillful balancing but could result in something truly original.`;
    } else {
      return `A bold and challenging blend of ${validLabels.join(' and ')}. These genres have different conventions and audiences, but a creative approach could bridge the gap.`;
    }
  };

  const generateRecommendations = (genres: string[], score: number): string[] => {
    const recs: string[] = [];

    if (genres.includes('fantasy') && genres.includes('romance')) {
      recs.push('Focus on character relationships within magical settings');
      recs.push('Consider a quest that strengthens romantic bonds');
    }

    if (genres.includes('science-fiction') && genres.includes('horror')) {
      recs.push('Explore cosmic horror or technological dread');
      recs.push('Use isolation in space or future settings to heighten tension');
    }

    if (genres.includes('mystery') && genres.includes('fantasy')) {
      recs.push('Create magical investigative methods and supernatural clues');
      recs.push('Balance the mystery solving with magic system rules');
    }

    if (genres.includes('western') && genres.includes('fantasy')) {
      recs.push('Consider a "Weird West" approach with magic in frontier settings');
      recs.push('Blend cowboy archetypes with fantasy tropes');
    }

    if (score < 0.7) {
      recs.push('Clearly define which genre conventions are primary vs. secondary');
      recs.push('Consider using one genre as setting and another as plot structure');
    }

    if (genres.length === 3) {
      recs.push('With three genres, consider making one a subtle influence rather than equal weight');
      recs.push('Ensure all three genres serve the core story rather than competing');
    }

    // Generic recommendations if no specific ones were added
    if (recs.length === 0) {
      recs.push('Identify core elements from each genre that will define your story');
      recs.push('Consider which genre conventions to embrace and which to subvert');
      recs.push('Focus on how the genres enhance each other rather than conflict');
    }

    return recs;
  };

  const applyBlend = () => {
    if (blendedGenre) {
      onBlendComplete(blendedGenre);
    }
  };

  const getCompatibilityColor = (score: number): string => {
    if (score >= 0.85) return '#10B981';
    if (score >= 0.7) return '#F59E0B';
    if (score >= 0.5) return '#EF4444';
    return '#DC2626';
  };

  const getCompatibilityLabel = (score: number): string => {
    if (score >= 0.85) return 'Excellent';
    if (score >= 0.7) return 'Good';
    if (score >= 0.5) return 'Fair';
    return 'Challenging';
  };

  return (
    <div
      style={{
        width: '100%',
        padding: '1.5rem',
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#1A1A2E',
            margin: '0 0 0.5rem 0',
          }}
        >
          Genre Blending Tool
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
          Combine 2-3 genres to create unique hybrid stories. The tool will analyze compatibility
          and suggest merged subgenres.
        </p>
      </div>

      {/* Genre Selection */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '0.75rem',
            color: '#374151',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          Select Genres to Blend (2-3)
        </label>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          {availableGenres.map((genre) => {
            const isSelected = selectedGenres.includes(genre.value);
            const isDisabled = !isSelected && selectedGenres.length >= 3;

            return (
              <button
                key={genre.value}
                type="button"
                onClick={() => handleGenreToggle(genre.value)}
                disabled={isLoading || isDisabled}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: isSelected
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#FFFFFF',
                  border: isSelected ? '2px solid #667eea' : '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: isSelected ? '#FFFFFF' : '#374151',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.5 : 1,
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? '0 2px 8px rgba(102, 126, 234, 0.3)' : 'none',
                }}
              >
                {genre.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Blended Result */}
      {blendedGenre && (
        <div
          style={{
            padding: '1.5rem',
            background: '#FFFFFF',
            border: '2px solid #667eea',
            borderRadius: '12px',
            marginBottom: '1rem',
          }}
        >
          {/* Blend Name */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h4
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#1A1A2E',
                margin: 0,
              }}
            >
              {blendedGenre.name}
            </h4>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>
                Compatibility:
              </span>
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: getCompatibilityColor(blendedGenre.compatibilityScore),
                  padding: '0.25rem 0.75rem',
                  background: `${getCompatibilityColor(blendedGenre.compatibilityScore)}20`,
                  borderRadius: '12px',
                }}
              >
                {getCompatibilityLabel(blendedGenre.compatibilityScore)} (
                {Math.round(blendedGenre.compatibilityScore * 100)}%)
              </span>
            </div>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: '0.875rem',
              color: '#64748B',
              margin: '0 0 1rem 0',
              lineHeight: '1.5',
            }}
          >
            {blendedGenre.description}
          </p>

          {/* Merged Subgenres */}
          <div style={{ marginBottom: '1rem' }}>
            <h5
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
                margin: '0 0 0.5rem 0',
              }}
            >
              Suggested Subgenres for This Blend:
            </h5>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              {blendedGenre.subgenres.map((subgenre) => (
                <span
                  key={subgenre}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: '#EEF2FF',
                    border: '1px solid #C7D2FE',
                    borderRadius: '6px',
                    color: '#4F46E5',
                    fontSize: '0.813rem',
                    fontWeight: 500,
                  }}
                >
                  {subgenre}
                </span>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div style={{ marginBottom: '1rem' }}>
            <h5
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151',
                margin: '0 0 0.5rem 0',
              }}
            >
              Writing Recommendations:
            </h5>
            <ul
              style={{
                margin: 0,
                paddingLeft: '1.25rem',
                fontSize: '0.813rem',
                color: '#64748B',
                lineHeight: '1.6',
              }}
            >
              {blendedGenre.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>

          {/* Apply Button */}
          <button
            type="button"
            onClick={applyBlend}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '0.938rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            }}
          >
            Apply This Genre Blend
          </button>
        </div>
      )}

      {/* Info Box */}
      {selectedGenres.length === 0 && (
        <div
          style={{
            padding: '1rem',
            background: '#EEF2FF',
            border: '1px solid #C7D2FE',
            borderRadius: '8px',
            fontSize: '0.813rem',
            color: '#4F46E5',
            textAlign: 'center',
          }}
        >
          Select 2-3 genres above to see how they blend together
        </div>
      )}

      {selectedGenres.length === 1 && (
        <div
          style={{
            padding: '1rem',
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: '8px',
            fontSize: '0.813rem',
            color: '#92400E',
            textAlign: 'center',
          }}
        >
          Select at least one more genre to create a blend
        </div>
      )}
    </div>
  );
}
