'use client';

import { useState } from 'react';

export type NationalityMode = 'none' | 'single' | 'mixed' | 'custom';

export interface NationalityDistribution {
  nationality: string;
  count: number;
}

export interface NationalityConfig {
  mode: NationalityMode;
  singleNationality?: string;
  distribution?: NationalityDistribution[];
}

interface NationalitySelectorProps {
  value: NationalityConfig;
  onChange: (config: NationalityConfig) => void;
  characterCount?: number;
  disabled?: boolean;
}

const AVAILABLE_NATIONALITIES = [
  { value: 'british', label: 'British', emoji: '🇬🇧' },
  { value: 'american', label: 'American', emoji: '🇺🇸' },
  { value: 'russian', label: 'Russian', emoji: '🇷🇺' },
  { value: 'german', label: 'German', emoji: '🇩🇪' },
  { value: 'french', label: 'French', emoji: '🇫🇷' },
  { value: 'japanese', label: 'Japanese', emoji: '🇯🇵' },
  { value: 'chinese', label: 'Chinese', emoji: '🇨🇳' },
  { value: 'indian', label: 'Indian', emoji: '🇮🇳' },
  { value: 'spanish', label: 'Spanish', emoji: '🇪🇸' },
  { value: 'italian', label: 'Italian', emoji: '🇮🇹' },
];

export default function NationalitySelector({
  value,
  onChange,
  characterCount = 5,
  disabled = false,
}: NationalitySelectorProps) {
  const handleModeChange = (mode: NationalityMode) => {
    if (mode === 'none') {
      onChange({ mode: 'none' });
    } else if (mode === 'single') {
      onChange({
        mode: 'single',
        singleNationality: value.singleNationality || 'british',
      });
    } else if (mode === 'mixed') {
      onChange({
        mode: 'mixed',
        distribution: value.distribution || [
          { nationality: 'british', count: Math.ceil(characterCount / 2) },
          { nationality: 'american', count: Math.floor(characterCount / 2) },
        ],
      });
    } else {
      onChange({ mode: 'custom' });
    }
  };

  const handleSingleNationalityChange = (nationality: string) => {
    onChange({
      ...value,
      singleNationality: nationality,
    });
  };

  const handleDistributionChange = (index: number, field: 'nationality' | 'count', newValue: string | number) => {
    const newDistribution = [...(value.distribution || [])];
    newDistribution[index] = {
      ...newDistribution[index],
      [field]: newValue,
    };
    onChange({
      ...value,
      distribution: newDistribution,
    });
  };

  const addDistributionEntry = () => {
    const newDistribution = [...(value.distribution || [])];
    newDistribution.push({ nationality: 'british', count: 1 });
    onChange({
      ...value,
      distribution: newDistribution,
    });
  };

  const removeDistributionEntry = (index: number) => {
    const newDistribution = [...(value.distribution || [])];
    newDistribution.splice(index, 1);
    onChange({
      ...value,
      distribution: newDistribution,
    });
  };

  const totalAssigned = (value.distribution || []).reduce((sum, d) => sum + d.count, 0);

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '8px',
      padding: '1.5rem',
    }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: 600,
        color: '#1A1A2E',
        marginBottom: '1rem',
      }}>
        Character Nationality Settings
      </h3>

      {/* Mode Selection */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        <button
          type="button"
          onClick={() => handleModeChange('none')}
          disabled={disabled}
          style={{
            padding: '0.875rem',
            background: value.mode === 'none' ? '#EEF2FF' : '#F8FAFC',
            border: value.mode === 'none' ? '2px solid #667eea' : '1px solid #E2E8F0',
            borderRadius: '8px',
            color: value.mode === 'none' ? '#667eea' : '#64748B',
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Not Specified</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>AI chooses culturally diverse names</div>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('single')}
          disabled={disabled}
          style={{
            padding: '0.875rem',
            background: value.mode === 'single' ? '#EEF2FF' : '#F8FAFC',
            border: value.mode === 'single' ? '2px solid #667eea' : '1px solid #E2E8F0',
            borderRadius: '8px',
            color: value.mode === 'single' ? '#667eea' : '#64748B',
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Single Nationality</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>All characters from one country</div>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('mixed')}
          disabled={disabled}
          style={{
            padding: '0.875rem',
            background: value.mode === 'mixed' ? '#EEF2FF' : '#F8FAFC',
            border: value.mode === 'mixed' ? '2px solid #667eea' : '1px solid #E2E8F0',
            borderRadius: '8px',
            color: value.mode === 'mixed' ? '#667eea' : '#64748B',
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Mixed Distribution</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Specify nationality counts</div>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('custom')}
          disabled={disabled}
          style={{
            padding: '0.875rem',
            background: value.mode === 'custom' ? '#EEF2FF' : '#F8FAFC',
            border: value.mode === 'custom' ? '2px solid #667eea' : '1px solid #E2E8F0',
            borderRadius: '8px',
            color: value.mode === 'custom' ? '#667eea' : '#64748B',
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Custom Per Character</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Set individually when creating</div>
        </button>
      </div>

      {/* Single Nationality Selector */}
      {value.mode === 'single' && (
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: '#374151',
            fontWeight: 500,
            fontSize: '0.875rem',
          }}>
            Select Nationality
          </label>
          <select
            value={value.singleNationality || 'british'}
            onChange={(e) => handleSingleNationalityChange(e.target.value)}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              color: '#1A1A2E',
              fontSize: '1rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {AVAILABLE_NATIONALITIES.map(nat => (
              <option key={nat.value} value={nat.value}>
                {nat.emoji} {nat.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Mixed Distribution Builder */}
      {value.mode === 'mixed' && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}>
            <label style={{
              color: '#374151',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}>
              Nationality Distribution
            </label>
            <div style={{
              fontSize: '0.75rem',
              color: totalAssigned === characterCount ? '#10B981' : '#DC2626',
              fontWeight: 500,
            }}>
              {totalAssigned} / {characterCount} assigned
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(value.distribution || []).map((entry, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                }}
              >
                <select
                  value={entry.nationality}
                  onChange={(e) => handleDistributionChange(index, 'nationality', e.target.value)}
                  disabled={disabled}
                  style={{
                    flex: 1,
                    padding: '0.625rem',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    color: '#1A1A2E',
                    fontSize: '0.875rem',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {AVAILABLE_NATIONALITIES.map(nat => (
                    <option key={nat.value} value={nat.value}>
                      {nat.emoji} {nat.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  max={characterCount}
                  value={entry.count}
                  onChange={(e) => handleDistributionChange(index, 'count', parseInt(e.target.value) || 1)}
                  disabled={disabled}
                  style={{
                    width: '80px',
                    padding: '0.625rem',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    color: '#1A1A2E',
                    fontSize: '0.875rem',
                    textAlign: 'center',
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeDistributionEntry(index)}
                  disabled={disabled || (value.distribution?.length || 0) <= 1}
                  style={{
                    padding: '0.625rem',
                    background: 'transparent',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    color: '#DC2626',
                    cursor: disabled || (value.distribution?.length || 0) <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addDistributionEntry}
            disabled={disabled}
            style={{
              marginTop: '0.75rem',
              width: '100%',
              padding: '0.625rem',
              background: '#F8FAFC',
              border: '1px dashed #E2E8F0',
              borderRadius: '6px',
              color: '#667eea',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            + Add Nationality
          </button>

          {totalAssigned !== characterCount && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.75rem',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '6px',
              color: '#DC2626',
              fontSize: '0.813rem',
            }}>
              Total must equal {characterCount} characters
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {(value.mode === 'single' || value.mode === 'mixed') && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#F8FAFC',
          borderRadius: '6px',
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
          }}>
            Preview
          </div>
          <div style={{ fontSize: '0.875rem', color: '#1A1A2E' }}>
            {value.mode === 'single' && value.singleNationality && (
              <span>
                All characters will have{' '}
                <strong>
                  {AVAILABLE_NATIONALITIES.find(n => n.value === value.singleNationality)?.label}
                </strong>{' '}
                names
              </span>
            )}
            {value.mode === 'mixed' && value.distribution && (
              <div>
                {value.distribution.map((entry, index) => {
                  const nat = AVAILABLE_NATIONALITIES.find(n => n.value === entry.nationality);
                  return (
                    <div key={index} style={{ marginBottom: '0.25rem' }}>
                      {nat?.emoji} <strong>{entry.count}</strong> {nat?.label} character{entry.count !== 1 ? 's' : ''}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
