'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { getToken } from '../../lib/auth';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import { colors, typography, spacing, borderRadius, transitions, shadows } from '../../lib/design-tokens';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AuthorProfile {
  id: string;
  authorBio: string | null;
  authorPhoto: string | null;
  authorPhotoType: string | null;
  authorWebsite: string | null;
  authorSocialMedia: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    goodreads?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export default function AuthorProfilePage() {
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [authorBio, setAuthorBio] = useState('');
  const [authorWebsite, setAuthorWebsite] = useState('');
  const [socialMedia, setSocialMedia] = useState({
    twitter: '',
    instagram: '',
    facebook: '',
    goodreads: '',
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/author-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setAuthorBio(data.authorBio || '');
        setAuthorWebsite(data.authorWebsite || '');
        setSocialMedia({
          twitter: data.authorSocialMedia?.twitter || '',
          instagram: data.authorSocialMedia?.instagram || '',
          facebook: data.authorSocialMedia?.facebook || '',
          goodreads: data.authorSocialMedia?.goodreads || '',
        });
        if (data.authorPhoto && data.authorPhotoType) {
          setPhotoPreview(`data:${data.authorPhotoType};base64,${data.authorPhoto}`);
        }
      }
    } catch (err: any) {
      console.error('Error fetching author profile:', err);
      setError('Failed to load author profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/author-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          authorBio,
          authorWebsite,
          authorSocialMedia: socialMedia,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save author profile');
      }

      setSuccessMessage('Author profile saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save author profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    setError(null);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        const base64 = dataUrl.split(',')[1];

        // Upload to server
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/author-profile/photo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            image: base64,
            imageType: file.type,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to upload photo');
        }

        const data = await response.json();
        setPhotoPreview(data.dataUrl);
        setSuccessMessage('Photo uploaded successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        setUploadingPhoto(false);
      };

      reader.onerror = () => {
        setError('Failed to read image file');
        setUploadingPhoto(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm('Are you sure you want to delete your author photo?')) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/author-profile/photo`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }

      setPhotoPreview(null);
      setSuccessMessage('Photo deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete photo');
    }
  };

  return (
    <DashboardLayout
      header={{
        title: 'Author Profile',
        subtitle: 'Your "About the Author" information for book publishing',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Success Message */}
        {successMessage && (
          <div style={{
            background: '#D1FAE5',
            border: '1px solid #6EE7B7',
            borderRadius: borderRadius.lg,
            padding: spacing[4],
            marginBottom: spacing[6],
            color: '#10B981',
          }}>
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: borderRadius.lg,
            padding: spacing[4],
            marginBottom: spacing[6],
            color: '#DC2626',
          }}>
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: spacing[12], color: colors.text.tertiary }}>
            Loading author profile...
          </div>
        )}

        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
            {/* Author Photo Section */}
            <div style={{
              background: colors.background.surface,
              border: `1px solid ${colors.border.default}`,
              borderRadius: borderRadius.xl,
              padding: spacing[6],
            }}>
              <h2 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                margin: 0,
                marginBottom: spacing[4],
              }}>
                Author Photo
              </h2>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[6] }}>
                {/* Photo Preview */}
                <div style={{
                  width: '150px',
                  height: '150px',
                  borderRadius: borderRadius.lg,
                  background: colors.background.primary,
                  border: `2px dashed ${colors.border.default}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Author photo"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '3rem', color: colors.text.disabled }}>
                      👤
                    </span>
                  )}
                </div>

                {/* Upload Controls */}
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.text.tertiary,
                    margin: 0,
                    marginBottom: spacing[4],
                  }}>
                    Upload a professional author photo. This will appear in the "About the Author" section of your published books.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }}
                  />

                  <div style={{ display: 'flex', gap: spacing[3] }}>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      style={{
                        padding: `${spacing[2]} ${spacing[4]}`,
                        background: uploadingPhoto ? colors.text.disabled : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: borderRadius.md,
                        color: colors.white,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {uploadingPhoto ? 'Uploading...' : (photoPreview ? 'Change Photo' : 'Upload Photo')}
                    </button>

                    {photoPreview && (
                      <button
                        onClick={handleDeletePhoto}
                        style={{
                          padding: `${spacing[2]} ${spacing[4]}`,
                          background: 'transparent',
                          border: `1px solid ${colors.border.default}`,
                          borderRadius: borderRadius.md,
                          color: colors.text.secondary,
                          fontSize: typography.fontSize.sm,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <p style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.text.disabled,
                    margin: 0,
                    marginTop: spacing[2],
                  }}>
                    Recommended: Square image, at least 300x300 pixels. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Biography Section */}
            <div style={{
              background: colors.background.surface,
              border: `1px solid ${colors.border.default}`,
              borderRadius: borderRadius.xl,
              padding: spacing[6],
            }}>
              <h2 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                margin: 0,
                marginBottom: spacing[4],
              }}>
                Author Biography
              </h2>

              <p style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.tertiary,
                margin: 0,
                marginBottom: spacing[4],
              }}>
                Write a compelling biography that will appear in the "About the Author" section of your books.
                Third person is traditional (e.g., "Jane Smith is an award-winning author...").
              </p>

              <textarea
                value={authorBio}
                onChange={(e) => setAuthorBio(e.target.value)}
                placeholder="Jane Smith is the author of several bestselling novels. When not writing, she can be found..."
                rows={6}
                style={{
                  width: '100%',
                  padding: spacing[4],
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: borderRadius.lg,
                  fontSize: typography.fontSize.sm,
                  lineHeight: typography.lineHeight.relaxed,
                  resize: 'vertical',
                  fontFamily: typography.fontFamily.base,
                }}
              />

              <p style={{
                fontSize: typography.fontSize.xs,
                color: colors.text.disabled,
                margin: 0,
                marginTop: spacing[2],
                textAlign: 'right',
              }}>
                {authorBio.length} characters
              </p>
            </div>

            {/* Website & Social Media Section */}
            <div style={{
              background: colors.background.surface,
              border: `1px solid ${colors.border.default}`,
              borderRadius: borderRadius.xl,
              padding: spacing[6],
            }}>
              <h2 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                margin: 0,
                marginBottom: spacing[4],
              }}>
                Website & Social Media
              </h2>

              <p style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.tertiary,
                margin: 0,
                marginBottom: spacing[4],
              }}>
                Add links where readers can find more about you. These may be included in the back matter of your books.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                    marginBottom: spacing[2],
                  }}>
                    Website
                  </label>
                  <input
                    type="url"
                    value={authorWebsite}
                    onChange={(e) => setAuthorWebsite(e.target.value)}
                    placeholder="https://www.yourwebsite.com"
                    style={{
                      width: '100%',
                      padding: spacing[3],
                      border: `1px solid ${colors.border.default}`,
                      borderRadius: borderRadius.md,
                      fontSize: typography.fontSize.sm,
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      Twitter / X
                    </label>
                    <input
                      type="text"
                      value={socialMedia.twitter}
                      onChange={(e) => setSocialMedia({ ...socialMedia, twitter: e.target.value })}
                      placeholder="@yourhandle"
                      style={{
                        width: '100%',
                        padding: spacing[3],
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      Instagram
                    </label>
                    <input
                      type="text"
                      value={socialMedia.instagram}
                      onChange={(e) => setSocialMedia({ ...socialMedia, instagram: e.target.value })}
                      placeholder="@yourhandle"
                      style={{
                        width: '100%',
                        padding: spacing[3],
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      Facebook
                    </label>
                    <input
                      type="text"
                      value={socialMedia.facebook}
                      onChange={(e) => setSocialMedia({ ...socialMedia, facebook: e.target.value })}
                      placeholder="facebook.com/yourpage"
                      style={{
                        width: '100%',
                        padding: spacing[3],
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      marginBottom: spacing[2],
                    }}>
                      Goodreads
                    </label>
                    <input
                      type="text"
                      value={socialMedia.goodreads}
                      onChange={(e) => setSocialMedia({ ...socialMedia, goodreads: e.target.value })}
                      placeholder="goodreads.com/author/show/..."
                      style={{
                        width: '100%',
                        padding: spacing[3],
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.sm,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div style={{
              background: '#DBEAFE',
              border: '1px solid #93C5FD',
              borderRadius: borderRadius.xl,
              padding: spacing[4],
            }}>
              <p style={{
                fontSize: typography.fontSize.sm,
                color: '#1E40AF',
                margin: 0,
                lineHeight: typography.lineHeight.relaxed,
              }}>
                This profile will be used in the "About the Author" section when you export books for publishing.
                It applies to all your projects.
              </p>
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[4] }}>
              <Link
                href="/settings"
                style={{
                  padding: `${spacing[3]} ${spacing[6]}`,
                  background: colors.background.primary,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: borderRadius.lg,
                  color: colors.text.secondary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Cancel
              </Link>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: `${spacing[3]} ${spacing[6]}`,
                  background: saving ? colors.text.disabled : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: borderRadius.lg,
                  color: colors.white,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
