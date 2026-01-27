'use client';

import { useState, useEffect } from 'react';
import type { ProseStyle, StylePreset } from '../../shared/types';

interface ProseStyleEditorProps {
  projectId: string;
  currentStyleId?: string;
  onStyleChange?: (style: ProseStyle) => void;
}

export default function ProseStyleEditor({ projectId, currentStyleId, onStyleChange }: ProseStyleEditorProps) {
  const [style, setStyle] = useState<Partial<ProseStyle>>({
    project_id: projectId,
    name: 'Custom Style',
    sentence_length_preference: 'varied',
    sentence_complexity: 'moderate',
    sentence_variety_score: 0.7,
    target_reading_level: 'general',
    flesch_kincaid_target: 70.0,
    formality_level: 'moderate',
    voice_tone: 'neutral',
    narrative_distance: 'close',
    vocabulary_complexity: 'moderate',
    use_metaphors: true,
    use_similes: true,
    default_pacing: 'moderate',
    scene_transition_style: 'smooth',
    paragraph_length_preference: 'varied',
  });

  const [presets, setPresets] = useState<StylePreset[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [voiceSample, setVoiceSample] = useState('');
  const [analysing, setAnalysing] = useState(false);

  // BUG-010 FIX: Add try/catch to async useEffect
  useEffect(() => {
    const loadData = async () => {
      try {
        if (currentStyleId) {
          await loadStyle(currentStyleId);
        }
        await loadPresets();
      } catch (err) {
        console.error('Failed to load style data on mount:', err);
      }
    };
    loadData();
  }, [currentStyleId]);

  const loadStyle = async (styleId: string) => {
    try {
      const response = await fetch(`/api/prose-styles/${styleId}`);
      const data = await response.json();
      if (data.style) {
        setStyle(data.style);
      }
    } catch (error) {
      console.error('Error loading style:', error);
    }
  };

  const loadPresets = async () => {
    try {
      const response = await fetch('/api/prose-styles/presets/all');
      const data = await response.json();
      setPresets(data.presets || []);
    } catch (error) {
      console.error('Error loading presets:', error);
    }
  };

  const handleSave = async () => {
    try {
      const url = style.id ? `/api/prose-styles/${style.id}` : '/api/prose-styles';
      const method = style.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(style),
      });

      const data = await response.json();
      if (data.style) {
        setStyle(data.style);
        onStyleChange?.(data.style);
        alert('Style saved successfully!');
      }
    } catch (error) {
      console.error('Error saving style:', error);
      alert('Failed to save style');
    }
  };

  const handleApplyPreset = async (preset: StylePreset) => {
    try {
      const response = await fetch(`/api/prose-styles/presets/${preset.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, name: preset.preset_name }),
      });

      const data = await response.json();
      if (data.style) {
        setStyle(data.style);
        onStyleChange?.(data.style);
        setShowPresets(false);
        alert('Preset applied successfully!');
      }
    } catch (error) {
      console.error('Error applying preset:', error);
      alert('Failed to apply preset');
    }
  };

  const handleAnalyseVoice = async () => {
    if (!voiceSample.trim()) {
      alert('Please enter a text sample to analyse');
      return;
    }

    setAnalysing(true);

    try {
      // First save the style if it doesn't exist
      if (!style.id) {
        const saveResponse = await fetch('/api/prose-styles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(style),
        });
        const saveData = await saveResponse.json();
        setStyle(saveData.style);
      }

      // Add voice sample
      const response = await fetch(`/api/prose-styles/${style.id}/voice-samples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sample_text: voiceSample,
          sample_source: 'User-provided sample',
        }),
      });

      const data = await response.json();
      if (data.sample) {
        // Update style based on voice sample analysis
        setStyle(prev => ({
          ...prev,
          flesch_kincaid_target: data.sample.flesch_kincaid_score || prev.flesch_kincaid_target,
        }));

        alert('Voice sample analysed! Style updated based on the sample.');
        setVoiceSample('');
      }
    } catch (error) {
      console.error('Error analysing voice:', error);
      alert('Failed to analyse voice sample');
    } finally {
      setAnalysing(false);
    }
  };

  // Guard against invalid style state
  if (!style) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Prose Style Editor</h2>
        <p style={{ color: '#666' }}>Fine-tune your writing style with visual controls</p>
      </div>

      {/* Style Name */}
      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="style-name" style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Style Name</label>
        <input
          id="style-name"
          type="text"
          value={style?.name || ''}
          onChange={(e) => setStyle({ ...style, name: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
      </div>

      {/* Preset Selector */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => setShowPresets(!showPresets)}
          style={{
            padding: '8px 16px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {showPresets ? 'Hide' : 'Show'} Genre Presets
        </button>

        {showPresets && (
          <div style={{ marginTop: '16px', maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '12px' }}>
            {presets.map((preset) => (
              <div
                key={preset.id}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={() => handleApplyPreset(preset)}
              >
                <div style={{ fontWeight: '500' }}>{preset.preset_name}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>{preset.description}</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  {preset.genre} {preset.subgenre && `• ${preset.subgenre}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sentence Structure */}
      <div style={{ marginBottom: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Sentence Structure</h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Sentence Length</label>
          <select
            value={style.sentence_length_preference}
            onChange={(e) => setStyle({ ...style, sentence_length_preference: e.target.value as any })}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="short">Short (punchy, action-oriented)</option>
            <option value="medium">Medium (balanced)</option>
            <option value="long">Long (flowing, descriptive)</option>
            <option value="varied">Varied (dynamic rhythm)</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Sentence Complexity</label>
          <select
            value={style.sentence_complexity}
            onChange={(e) => setStyle({ ...style, sentence_complexity: e.target.value as any })}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="simple">Simple (straightforward)</option>
            <option value="moderate">Moderate (some complexity)</option>
            <option value="complex">Complex (sophisticated)</option>
            <option value="varied">Varied (mixed)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>
            Variety Score: {style.sentence_variety_score?.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={style.sentence_variety_score}
            onChange={(e) => setStyle({ ...style, sentence_variety_score: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
            aria-label="Variety Score"
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Higher = more varied sentence structures
          </div>
        </div>
      </div>

      {/* Readability */}
      <div style={{ marginBottom: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Readability</h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Target Reading Level</label>
          <select
            value={style.target_reading_level}
            onChange={(e) => setStyle({ ...style, target_reading_level: e.target.value as any })}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="8th_grade">8th Grade (very accessible)</option>
            <option value="high_school">High School (accessible)</option>
            <option value="general">General Adult (standard)</option>
            <option value="literary">Literary (sophisticated)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>
            Flesch Reading Ease: {style.flesch_kincaid_target?.toFixed(0)} (0-100, higher = easier)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={style.flesch_kincaid_target}
            onChange={(e) => setStyle({ ...style, flesch_kincaid_target: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
            aria-label="Flesch Reading Ease"
          />
        </div>
      </div>

      {/* Voice & Tone */}
      <div style={{ marginBottom: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Voice & Tone</h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Formality Level</label>
          <select
            value={style.formality_level}
            onChange={(e) => setStyle({ ...style, formality_level: e.target.value as any })}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="casual">Casual</option>
            <option value="moderate">Moderate</option>
            <option value="formal">Formal</option>
            <option value="literary">Literary</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Voice Tone</label>
          <select
            value={style.voice_tone}
            onChange={(e) => setStyle({ ...style, voice_tone: e.target.value as any })}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="neutral">Neutral</option>
            <option value="intimate">Intimate</option>
            <option value="distant">Distant</option>
            <option value="conversational">Conversational</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Narrative Distance</label>
          <select
            value={style.narrative_distance}
            onChange={(e) => setStyle({ ...style, narrative_distance: e.target.value as any })}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="close">Close (deep POV)</option>
            <option value="moderate">Moderate</option>
            <option value="distant">Distant (omniscient)</option>
          </select>
        </div>
      </div>

      {/* Voice Sample Analyser */}
      <div style={{ marginBottom: '24px', padding: '16px', background: '#f0f8ff', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Voice Sample Analyser</h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
          Paste a sample of your writing to analyse its style patterns
        </p>

        <textarea
          value={voiceSample}
          onChange={(e) => setVoiceSample(e.target.value)}
          placeholder="Paste a paragraph or two of your writing here..."
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginBottom: '12px',
          }}
        />

        <button
          onClick={handleAnalyseVoice}
          disabled={analysing || !voiceSample.trim()}
          style={{
            padding: '8px 16px',
            background: analysing ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: analysing ? 'not-allowed' : 'pointer',
          }}
        >
          {analysing ? 'Analysing...' : 'Analyse Sample'}
        </button>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #ddd' }}>
        <button
          onClick={handleSave}
          style={{
            padding: '12px 24px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Save Style
        </button>
      </div>
    </div>
  );
}
