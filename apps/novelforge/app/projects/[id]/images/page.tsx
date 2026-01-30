'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import { Loader2, ImageIcon, User, MapPin, BookOpen, Trash2, Download } from 'lucide-react';
import Image from 'next/image';
import { colors, borderRadius, shadows } from '@/app/lib/constants';
import { card, button, buttonPrimary, buttonSecondary, buttonDisabled, input } from '@/app/lib/styles';

interface GeneratedImage {
  id: string;
  projectId: string;
  type: 'character' | 'location' | 'cover' | 'scene';
  referenceId?: string;
  referenceName?: string;
  url: string;
  prompt: string;
  revisedPrompt?: string;
  stylePreset?: string;
  createdAt: string;
  status: 'pending' | 'completed' | 'failed';
}

interface Character {
  id: string;
  name: string;
  physicalDescription?: string;
}

interface WorldElement {
  id: string;
  name: string;
  type: string;
}

export default function ImagesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<WorldElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [stylePreset, setStylePreset] = useState<string>('realistic');
  const [activeTab, setActiveTab] = useState<'generate' | 'gallery'>('generate');

  const stylePresets = [
    { value: 'realistic', label: 'Realistic' },
    { value: 'fantasy-art', label: 'Fantasy Art' },
    { value: 'anime', label: 'Anime' },
    { value: 'oil-painting', label: 'Oil Painting' },
    { value: 'watercolour', label: 'Watercolour' },
    { value: 'digital-art', label: 'Digital Art' },
    { value: 'comic-book', label: 'Comic Book' },
    { value: 'cinematic', label: 'Cinematic' },
  ];

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load existing images
      const imagesRes = await fetch(`/api/images?projectId=${projectId}`);
      const imagesData = await imagesRes.json();
      setImages(imagesData.images || []);

      // Load characters from story bible
      const projectRes = await fetch(`/api/projects/${projectId}`);
      const projectData = await projectRes.json();

      if (projectData.story_bible) {
        const bible = typeof projectData.story_bible === 'string'
          ? JSON.parse(projectData.story_bible)
          : projectData.story_bible;
        setCharacters(bible.characters || []);
        setLocations(bible.world?.filter((w: WorldElement) =>
          ['location', 'setting', 'place'].includes(w.type?.toLowerCase() || '')
        ) || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const generateCharacterPortrait = async () => {
    if (!selectedCharacter) return;
    setGenerating('character');
    try {
      const res = await fetch(`/api/images/character/${selectedCharacter}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, stylePreset })
      });
      const data = await res.json();
      if (data.image) {
        setImages(prev => [data.image, ...prev]);
      }
    } catch (error) {
      console.error('Failed to generate:', error);
    }
    setGenerating(null);
  };

  const generateLocationImage = async () => {
    if (!selectedLocation) return;
    setGenerating('location');
    try {
      const res = await fetch(`/api/images/location/${selectedLocation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, stylePreset })
      });
      const data = await res.json();
      if (data.image) {
        setImages(prev => [data.image, ...prev]);
      }
    } catch (error) {
      console.error('Failed to generate:', error);
    }
    setGenerating(null);
  };

  const generateCover = async () => {
    setGenerating('cover');
    try {
      const res = await fetch(`/api/images/cover/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stylePreset })
      });
      const data = await res.json();
      if (data.image) {
        setImages(prev => [data.image, ...prev]);
      }
    } catch (error) {
      console.error('Failed to generate:', error);
    }
    setGenerating(null);
  };

  const deleteImage = async (imageId: string) => {
    try {
      await fetch(`/api/images/${imageId}`, { method: 'DELETE' });
      setImages(prev => prev.filter(img => img.id !== imageId));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        header={{
          title: 'Image Generation',
          subtitle: 'Loading images...',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.brandPrimary }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      header={{
        title: 'Image Generation',
        subtitle: 'Create character portraits, location images, and book covers',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <button
            onClick={() => setActiveTab('generate')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'generate' ? `3px solid ${colors.brandPrimary}` : '3px solid transparent',
              color: activeTab === 'generate' ? colors.brandText : colors.textSecondary,
              fontWeight: activeTab === 'generate' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Generate
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'gallery' ? `3px solid ${colors.brandPrimary}` : '3px solid transparent',
              color: activeTab === 'gallery' ? colors.brandText : colors.textSecondary,
              fontWeight: activeTab === 'gallery' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Gallery ({images.length})
          </button>
        </div>

        {activeTab === 'generate' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Character Portraits */}
            <div style={{ ...card, padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <User style={{ width: '1.25rem', height: '1.25rem', color: colors.brandPrimary }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Character Portrait</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: colors.textPrimary }}>
                    Select Character
                  </label>
                  <select
                    value={selectedCharacter}
                    onChange={(e) => setSelectedCharacter(e.target.value)}
                    style={{
                      ...input,
                      width: '100%',
                    }}
                  >
                    <option value="">Choose a character...</option>
                    {characters.map(char => (
                      <option key={char.id} value={char.id}>
                        {char.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: colors.textPrimary }}>
                    Style Preset
                  </label>
                  <select
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value)}
                    style={{
                      ...input,
                      width: '100%',
                    }}
                  >
                    {stylePresets.map(style => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={generateCharacterPortrait}
                  disabled={!selectedCharacter || generating === 'character'}
                  style={{
                    ...(selectedCharacter && generating !== 'character' ? buttonPrimary : buttonDisabled),
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {generating === 'character' && <Loader2 style={{ width: '1rem', height: '1rem' }} className="animate-spin" />}
                  {generating === 'character' ? 'Generating...' : 'Generate Portrait'}
                </button>
              </div>
            </div>

            {/* Location Images */}
            <div style={{ ...card, padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <MapPin style={{ width: '1.25rem', height: '1.25rem', color: colors.brandPrimary }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Location Image</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: colors.textPrimary }}>
                    Select Location
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    style={{
                      ...input,
                      width: '100%',
                    }}
                  >
                    <option value="">Choose a location...</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: colors.textPrimary }}>
                    Style Preset
                  </label>
                  <select
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value)}
                    style={{
                      ...input,
                      width: '100%',
                    }}
                  >
                    {stylePresets.map(style => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={generateLocationImage}
                  disabled={!selectedLocation || generating === 'location'}
                  style={{
                    ...(selectedLocation && generating !== 'location' ? buttonPrimary : buttonDisabled),
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {generating === 'location' && <Loader2 style={{ width: '1rem', height: '1rem' }} className="animate-spin" />}
                  {generating === 'location' ? 'Generating...' : 'Generate Location'}
                </button>
              </div>
            </div>

            {/* Cover Art */}
            <div style={{ ...card, padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <BookOpen style={{ width: '1.25rem', height: '1.25rem', color: colors.brandPrimary }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Book Cover</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: 0 }}>
                  Generate cover art based on your story&apos;s characters, setting, and themes.
                </p>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: colors.textPrimary }}>
                    Style Preset
                  </label>
                  <select
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value)}
                    style={{
                      ...input,
                      width: '100%',
                    }}
                  >
                    {stylePresets.map(style => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={generateCover}
                  disabled={generating === 'cover'}
                  style={{
                    ...(generating !== 'cover' ? buttonPrimary : buttonDisabled),
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {generating === 'cover' && <Loader2 style={{ width: '1rem', height: '1rem' }} className="animate-spin" />}
                  {generating === 'cover' ? 'Generating...' : 'Generate Cover'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <>
            {images.length === 0 ? (
              <div style={{ ...card, padding: '3rem', textAlign: 'center' }}>
                <ImageIcon style={{ width: '3rem', height: '3rem', color: colors.textSecondary, margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '1rem', color: colors.textSecondary, marginBottom: '0.5rem' }}>No images generated yet</p>
                <p style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                  Use the Generate tab to create character portraits, locations, or cover art
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {images.map(image => (
                  <div key={image.id} style={{ ...card, overflow: 'hidden', padding: 0 }}>
                    <div style={{ position: 'relative', paddingTop: '100%', background: colors.surfaceAlt }}>
                      <Image
                        src={image.url}
                        alt={image.referenceName || image.type}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, margin: 0, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {image.referenceName || image.type}
                          </p>
                          <p style={{ fontSize: '0.875rem', color: colors.textSecondary, margin: 0, textTransform: 'capitalize' }}>
                            {image.type} • {image.stylePreset}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
                          <a
                            href={image.url}
                            download
                            style={{
                              ...buttonSecondary,
                              padding: '0.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textDecoration: 'none',
                            }}
                          >
                            <Download style={{ width: '1rem', height: '1rem' }} />
                          </a>
                          <button
                            onClick={() => deleteImage(image.id)}
                            style={{
                              ...buttonSecondary,
                              padding: '0.5rem',
                            }}
                          >
                            <Trash2 style={{ width: '1rem', height: '1rem' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
