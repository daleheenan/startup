/**
 * Author Profile Routes
 *
 * Manages the user's author profile information used in book publishing.
 * This is the "About the Author" information that appears in the back matter of books.
 */

import { Router } from 'express';
import db from '../db/connection.js';
import { createLogger } from '../services/logger.service.js';

const router = Router();
const logger = createLogger('routes:author-profile');

// Ensure author_profile table exists with default row
function ensureAuthorProfileTable() {
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS author_profile (
        id TEXT PRIMARY KEY DEFAULT 'owner',
        author_bio TEXT,
        author_photo TEXT,
        author_photo_type TEXT,
        author_website TEXT,
        author_social_media TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    db.prepare(`INSERT OR IGNORE INTO author_profile (id) VALUES ('owner')`).run();
  } catch (error) {
    // Table might already exist from migration, ignore error
  }
}

// Run on module load
ensureAuthorProfileTable();

/**
 * GET /api/author-profile
 * Get the user's author profile
 */
router.get('/', (req, res) => {
  try {
    const profile = db.prepare(`
      SELECT
        id,
        author_name,
        pen_name,
        preferred_pronouns,
        author_bio,
        author_bio_short,
        author_photo,
        author_photo_type,
        author_website,
        author_social_media,
        contact_email,
        contact_phone,
        contact_address,
        contact_city,
        contact_postcode,
        contact_country,
        writing_credentials,
        created_at,
        updated_at
      FROM author_profile
      WHERE id = 'owner'
    `).get() as any;

    if (!profile) {
      // Create default profile if it doesn't exist
      db.prepare(`INSERT OR IGNORE INTO author_profile (id) VALUES ('owner')`).run();
      return res.json({
        id: 'owner',
        authorName: null,
        penName: null,
        preferredPronouns: null,
        authorBio: null,
        authorBioShort: null,
        authorPhoto: null,
        authorPhotoType: null,
        authorWebsite: null,
        authorSocialMedia: null,
        contactEmail: null,
        contactPhone: null,
        contactAddress: null,
        contactCity: null,
        contactPostcode: null,
        contactCountry: null,
        writingCredentials: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Parse JSON fields if present
    let socialMedia = null;
    if (profile.author_social_media) {
      try {
        socialMedia = JSON.parse(profile.author_social_media);
      } catch {
        socialMedia = null;
      }
    }

    let writingCredentials = [];
    if (profile.writing_credentials) {
      try {
        writingCredentials = JSON.parse(profile.writing_credentials);
      } catch {
        writingCredentials = [];
      }
    }

    res.json({
      id: profile.id,
      authorName: profile.author_name,
      penName: profile.pen_name,
      preferredPronouns: profile.preferred_pronouns,
      authorBio: profile.author_bio,
      authorBioShort: profile.author_bio_short,
      authorPhoto: profile.author_photo,
      authorPhotoType: profile.author_photo_type,
      authorWebsite: profile.author_website,
      authorSocialMedia: socialMedia,
      contactEmail: profile.contact_email,
      contactPhone: profile.contact_phone,
      contactAddress: profile.contact_address,
      contactCity: profile.contact_city,
      contactPostcode: profile.contact_postcode,
      contactCountry: profile.contact_country,
      writingCredentials: writingCredentials,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching author profile');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/author-profile
 * Update the user's author profile
 */
router.put('/', (req, res) => {
  try {
    const {
      authorName,
      penName,
      preferredPronouns,
      authorBio,
      authorBioShort,
      authorWebsite,
      authorSocialMedia,
      contactEmail,
      contactPhone,
      contactAddress,
      contactCity,
      contactPostcode,
      contactCountry,
      writingCredentials,
    } = req.body;
    const now = new Date().toISOString();

    // Validate email format if provided
    if (contactEmail !== undefined && contactEmail !== null && contactEmail !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail)) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' },
        });
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (authorName !== undefined) {
      updates.push('author_name = ?');
      params.push(authorName);
    }

    if (penName !== undefined) {
      updates.push('pen_name = ?');
      params.push(penName);
    }

    if (preferredPronouns !== undefined) {
      updates.push('preferred_pronouns = ?');
      params.push(preferredPronouns);
    }

    if (authorBio !== undefined) {
      updates.push('author_bio = ?');
      params.push(authorBio);
    }

    if (authorBioShort !== undefined) {
      updates.push('author_bio_short = ?');
      params.push(authorBioShort);
    }

    if (authorWebsite !== undefined) {
      updates.push('author_website = ?');
      params.push(authorWebsite);
    }

    if (authorSocialMedia !== undefined) {
      updates.push('author_social_media = ?');
      params.push(authorSocialMedia ? JSON.stringify(authorSocialMedia) : null);
    }

    if (contactEmail !== undefined) {
      updates.push('contact_email = ?');
      params.push(contactEmail);
    }

    if (contactPhone !== undefined) {
      updates.push('contact_phone = ?');
      params.push(contactPhone);
    }

    if (contactAddress !== undefined) {
      updates.push('contact_address = ?');
      params.push(contactAddress);
    }

    if (contactCity !== undefined) {
      updates.push('contact_city = ?');
      params.push(contactCity);
    }

    if (contactPostcode !== undefined) {
      updates.push('contact_postcode = ?');
      params.push(contactPostcode);
    }

    if (contactCountry !== undefined) {
      updates.push('contact_country = ?');
      params.push(contactCountry);
    }

    if (writingCredentials !== undefined) {
      updates.push('writing_credentials = ?');
      params.push(writingCredentials ? JSON.stringify(writingCredentials) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'No fields to update' },
      });
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push('owner');

    const stmt = db.prepare(`
      UPDATE author_profile
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);

    logger.info({ updates: updates.length }, 'Author profile updated');

    // Return updated profile
    const profile = db.prepare(`
      SELECT * FROM author_profile WHERE id = 'owner'
    `).get() as any;

    // Parse JSON fields
    let socialMedia = null;
    if (profile.author_social_media) {
      try {
        socialMedia = JSON.parse(profile.author_social_media);
      } catch {
        socialMedia = null;
      }
    }

    let credentials = [];
    if (profile.writing_credentials) {
      try {
        credentials = JSON.parse(profile.writing_credentials);
      } catch {
        credentials = [];
      }
    }

    res.json({
      id: profile.id,
      authorName: profile.author_name,
      penName: profile.pen_name,
      preferredPronouns: profile.preferred_pronouns,
      authorBio: profile.author_bio,
      authorBioShort: profile.author_bio_short,
      authorPhoto: profile.author_photo,
      authorPhotoType: profile.author_photo_type,
      authorWebsite: profile.author_website,
      authorSocialMedia: socialMedia,
      contactEmail: profile.contact_email,
      contactPhone: profile.contact_phone,
      contactAddress: profile.contact_address,
      contactCity: profile.contact_city,
      contactPostcode: profile.contact_postcode,
      contactCountry: profile.contact_country,
      writingCredentials: credentials,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error updating author profile');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/author-profile/photo
 * Upload author photo
 */
router.post('/photo', (req, res) => {
  try {
    const { image, imageType } = req.body;

    if (!image || !imageType) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'image and imageType are required' },
      });
    }

    // Validate image type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(imageType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_IMAGE_TYPE',
          message: 'Image must be JPEG, PNG, GIF, or WebP',
        },
      });
    }

    // Validate image size (5MB limit for base64)
    const estimatedSize = (image.length * 3) / 4; // Base64 to bytes approximation
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (estimatedSize > maxSize) {
      return res.status(400).json({
        error: {
          code: 'IMAGE_TOO_LARGE',
          message: 'Image must be less than 5MB',
        },
      });
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE author_profile
      SET author_photo = ?, author_photo_type = ?, updated_at = ?
      WHERE id = 'owner'
    `).run(image, imageType, now);

    logger.info({ imageType, size: estimatedSize }, 'Author photo uploaded');

    res.json({
      success: true,
      dataUrl: `data:${imageType};base64,${image}`,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error uploading author photo');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/author-profile/photo
 * Get author photo
 */
router.get('/photo', (req, res) => {
  try {
    const profile = db.prepare(`
      SELECT author_photo, author_photo_type
      FROM author_profile
      WHERE id = 'owner'
    `).get() as any;

    if (!profile || !profile.author_photo) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'No author photo found' },
      });
    }

    res.json({
      dataUrl: `data:${profile.author_photo_type};base64,${profile.author_photo}`,
      image: profile.author_photo,
      imageType: profile.author_photo_type,
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error fetching author photo');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/author-profile/photo
 * Delete author photo
 */
router.delete('/photo', (req, res) => {
  try {
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE author_profile
      SET author_photo = NULL, author_photo_type = NULL, updated_at = ?
      WHERE id = 'owner'
    `).run(now);

    logger.info('Author photo deleted');

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Error deleting author photo');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
