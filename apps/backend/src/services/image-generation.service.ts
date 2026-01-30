/**
 * Image Generation Service
 * Sprint 24: Visual Enhancements
 *
 * Handles AI-generated imagery for characters, locations, and covers using DALL-E 3.
 * Implements style consistency, caching, and prompt engineering for high-quality results.
 */

import { createLogger } from './logger.service.js';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('image-generation');

// Style presets for consistent art direction
export const STYLE_PRESETS = {
  realistic: 'photorealistic, detailed, professional photography',
  artistic: 'artistic illustration, painted style, expressive',
  cinematic: 'cinematic lighting, dramatic composition, film still',
  sketch: 'detailed pencil sketch, artistic rendering, black and white',
  watercolor: 'watercolour painting, soft edges, artistic interpretation',
  digital_art: 'digital art, detailed illustration, modern style',
};

export type StylePreset = keyof typeof STYLE_PRESETS;

export interface GenerationParams {
  model?: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

export interface ImageMetadata {
  id: string;
  projectId: string;
  entityType: 'character' | 'location' | 'cover' | 'scene';
  entityId?: string;
  imageType: 'portrait' | 'landscape' | 'cover' | 'scene_illustration';
  prompt: string;
  stylePreset?: string;
  filePath: string;
  fileSize: number;
  width: number;
  height: number;
  generationParams: GenerationParams;
  status: 'generating' | 'completed' | 'failed';
  errorMessage?: string;
}

export class ImageGenerationService {
  private apiKey: string;
  private storageDir: string;
  private apiUrl = 'https://api.openai.com/v1/images/generations';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.storageDir = process.env.IMAGE_STORAGE_DIR || path.join(process.cwd(), '..', 'data', 'images');

    if (!this.apiKey && process.env.NODE_ENV === 'production') {
      logger.warn('OPENAI_API_KEY not configured - image generation will not function');
    }
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to create storage directory');
      throw new Error('Failed to initialise image storage');
    }
  }

  /**
   * Build prompt for character portrait
   */
  private buildCharacterPrompt(
    characterData: {
      name: string;
      physicalDescription: string;
      personality?: string[];
      role?: string;
      ethnicity?: string;
      nationality?: string;
    },
    stylePreset?: StylePreset,
    projectStyle?: string
  ): string {
    const style = stylePreset ? STYLE_PRESETS[stylePreset] : STYLE_PRESETS.artistic;
    const projectStyleClause = projectStyle ? `, ${projectStyle}` : '';

    // Extract key visual details from physical description
    const description = characterData.physicalDescription;
    const personality = characterData.personality?.slice(0, 2).join(', ') || '';
    const ethnicity = characterData.ethnicity ? `, ${characterData.ethnicity}` : '';

    return `Portrait of ${characterData.name}, ${description}${ethnicity}. ${personality ? `Personality: ${personality}. ` : ''}${style}${projectStyleClause}. Professional character portrait, detailed facial features, expressive eyes, appropriate lighting. Novel character illustration.`;
  }

  /**
   * Build prompt for location image
   */
  private buildLocationPrompt(
    locationData: {
      name: string;
      description: string;
      type: string;
      significance?: string;
    },
    stylePreset?: StylePreset,
    projectStyle?: string
  ): string {
    const style = stylePreset ? STYLE_PRESETS[stylePreset] : STYLE_PRESETS.cinematic;
    const projectStyleClause = projectStyle ? `, ${projectStyle}` : '';

    const locationType = locationData.type === 'location' ? 'Location' : locationData.type;

    return `${locationType}: ${locationData.name}. ${locationData.description}. ${style}${projectStyleClause}. Atmospheric environment shot, detailed setting, immersive world-building illustration. Novel location concept art.`;
  }

  /**
   * Build prompt for cover art
   */
  private buildCoverPrompt(
    projectData: {
      title: string;
      genre: string;
      synopsis?: string;
      mainCharacter?: string;
      tone?: string;
    },
    stylePreset?: StylePreset,
    projectStyle?: string
  ): string {
    const style = stylePreset ? STYLE_PRESETS[stylePreset] : STYLE_PRESETS.cinematic;
    const projectStyleClause = projectStyle ? `, ${projectStyle}` : '';

    const toneClause = projectData.tone ? `, ${projectData.tone} mood` : '';
    const characterClause = projectData.mainCharacter ? ` featuring ${projectData.mainCharacter}` : '';

    return `Book cover for "${projectData.title}", ${projectData.genre} genre${toneClause}${characterClause}. ${projectData.synopsis ? `Story: ${projectData.synopsis.slice(0, 200)}. ` : ''}${style}${projectStyleClause}. Professional book cover design, compelling visual, commercial appeal. No text or titles.`;
  }

  /**
   * Build prompt for scene illustration
   */
  private buildScenePrompt(
    sceneData: {
      chapterTitle: string;
      sceneDescription: string;
      characters?: string[];
      setting?: string;
    },
    stylePreset?: StylePreset,
    projectStyle?: string
  ): string {
    const style = stylePreset ? STYLE_PRESETS[stylePreset] : STYLE_PRESETS.artistic;
    const projectStyleClause = projectStyle ? `, ${projectStyle}` : '';

    const charactersClause = sceneData.characters?.length ? ` Characters: ${sceneData.characters.join(', ')}.` : '';
    const settingClause = sceneData.setting ? ` Setting: ${sceneData.setting}.` : '';

    return `Scene illustration: ${sceneData.sceneDescription}.${charactersClause}${settingClause} ${style}${projectStyleClause}. Dramatic scene composition, novel chapter header illustration.`;
  }

  /**
   * Generate image using DALL-E 3
   */
  private async generateImage(
    prompt: string,
    params: GenerationParams = {}
  ): Promise<{ url: string; revisedPrompt?: string }> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const requestBody = {
      model: params.model || 'dall-e-3',
      prompt,
      n: 1,
      size: params.size || '1024x1024',
      quality: params.quality || 'standard',
      style: params.style || 'vivid',
    };

    logger.info({ prompt: prompt.slice(0, 100) }, 'Generating image with DALL-E 3');

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: { message?: string } };
        logger.error({ error: errorData }, 'DALL-E 3 API error');
        throw new Error(`Image generation failed: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json() as { data: Array<{ url: string; revised_prompt?: string }> };

      return {
        url: data.data[0].url,
        revisedPrompt: data.data[0].revised_prompt,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to generate image');
      throw error;
    }
  }

  /**
   * Download image from URL and save to filesystem
   */
  private async downloadAndSaveImage(url: string, projectId: string, imageId: string): Promise<{ filePath: string; fileSize: number }> {
    await this.ensureStorageDir();

    try {
      // Download image
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Create project subdirectory
      const projectDir = path.join(this.storageDir, projectId);
      await fs.mkdir(projectDir, { recursive: true });

      // Save with UUID filename
      const filename = `${imageId}.png`;
      const fullPath = path.join(projectDir, filename);
      await fs.writeFile(fullPath, buffer);

      // Return relative path for storage
      const relativePath = path.join(projectId, filename);

      logger.info({ filePath: relativePath, size: buffer.length }, 'Image saved successfully');

      return {
        filePath: relativePath,
        fileSize: buffer.length,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to download and save image');
      throw error;
    }
  }

  /**
   * Generate character portrait
   */
  async generateCharacterPortrait(
    projectId: string,
    characterData: {
      id: string;
      name: string;
      physicalDescription: string;
      personality?: string[];
      role?: string;
      ethnicity?: string;
      nationality?: string;
    },
    options: {
      stylePreset?: StylePreset;
      projectStyle?: string;
      size?: '1024x1024' | '1792x1024' | '1024x1792';
      quality?: 'standard' | 'hd';
    } = {}
  ): Promise<ImageMetadata> {
    const imageId = uuidv4();
    const prompt = this.buildCharacterPrompt(characterData, options.stylePreset, options.projectStyle);

    const params: GenerationParams = {
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
      style: 'vivid',
    };

    try {
      // Generate image
      const { url, revisedPrompt } = await this.generateImage(prompt, params);

      // Download and save
      const { filePath, fileSize } = await this.downloadAndSaveImage(url, projectId, imageId);

      // Parse dimensions from size
      const [width, height] = (params.size || '1024x1024').split('x').map(Number);

      return {
        id: imageId,
        projectId,
        entityType: 'character',
        entityId: characterData.id,
        imageType: 'portrait',
        prompt: revisedPrompt || prompt,
        stylePreset: options.stylePreset,
        filePath,
        fileSize,
        width,
        height,
        generationParams: params,
        status: 'completed',
      };
    } catch (error: any) {
      logger.error({ error: error.message, characterId: characterData.id }, 'Failed to generate character portrait');

      return {
        id: imageId,
        projectId,
        entityType: 'character',
        entityId: characterData.id,
        imageType: 'portrait',
        prompt,
        stylePreset: options.stylePreset,
        filePath: '',
        fileSize: 0,
        width: 0,
        height: 0,
        generationParams: params,
        status: 'failed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Generate location image
   */
  async generateLocationImage(
    projectId: string,
    locationData: {
      id: string;
      name: string;
      description: string;
      type: string;
      significance?: string;
    },
    options: {
      stylePreset?: StylePreset;
      projectStyle?: string;
      size?: '1024x1024' | '1792x1024' | '1024x1792';
      quality?: 'standard' | 'hd';
    } = {}
  ): Promise<ImageMetadata> {
    const imageId = uuidv4();
    const prompt = this.buildLocationPrompt(locationData, options.stylePreset, options.projectStyle);

    const params: GenerationParams = {
      size: options.size || '1792x1024', // Wide format for landscapes
      quality: options.quality || 'standard',
      style: 'vivid',
    };

    try {
      const { url, revisedPrompt } = await this.generateImage(prompt, params);
      const { filePath, fileSize } = await this.downloadAndSaveImage(url, projectId, imageId);
      const [width, height] = (params.size || '1792x1024').split('x').map(Number);

      return {
        id: imageId,
        projectId,
        entityType: 'location',
        entityId: locationData.id,
        imageType: 'landscape',
        prompt: revisedPrompt || prompt,
        stylePreset: options.stylePreset,
        filePath,
        fileSize,
        width,
        height,
        generationParams: params,
        status: 'completed',
      };
    } catch (error: any) {
      logger.error({ error: error.message, locationId: locationData.id }, 'Failed to generate location image');

      return {
        id: imageId,
        projectId,
        entityType: 'location',
        entityId: locationData.id,
        imageType: 'landscape',
        prompt,
        stylePreset: options.stylePreset,
        filePath: '',
        fileSize: 0,
        width: 0,
        height: 0,
        generationParams: params,
        status: 'failed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Generate cover art
   */
  async generateCoverArt(
    projectId: string,
    projectData: {
      title: string;
      genre: string;
      synopsis?: string;
      mainCharacter?: string;
      tone?: string;
    },
    options: {
      stylePreset?: StylePreset;
      projectStyle?: string;
      size?: '1024x1024' | '1792x1024' | '1024x1792';
      quality?: 'standard' | 'hd';
    } = {}
  ): Promise<ImageMetadata> {
    const imageId = uuidv4();
    const prompt = this.buildCoverPrompt(projectData, options.stylePreset, options.projectStyle);

    const params: GenerationParams = {
      size: options.size || '1024x1792', // Tall format for book covers
      quality: options.quality || 'hd',
      style: 'vivid',
    };

    try {
      const { url, revisedPrompt } = await this.generateImage(prompt, params);
      const { filePath, fileSize } = await this.downloadAndSaveImage(url, projectId, imageId);
      const [width, height] = (params.size || '1024x1792').split('x').map(Number);

      return {
        id: imageId,
        projectId,
        entityType: 'cover',
        imageType: 'cover',
        prompt: revisedPrompt || prompt,
        stylePreset: options.stylePreset,
        filePath,
        fileSize,
        width,
        height,
        generationParams: params,
        status: 'completed',
      };
    } catch (error: any) {
      logger.error({ error: error.message, projectId }, 'Failed to generate cover art');

      return {
        id: imageId,
        projectId,
        entityType: 'cover',
        imageType: 'cover',
        prompt,
        stylePreset: options.stylePreset,
        filePath: '',
        fileSize: 0,
        width: 0,
        height: 0,
        generationParams: params,
        status: 'failed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Generate scene illustration
   */
  async generateSceneIllustration(
    projectId: string,
    chapterId: string,
    sceneData: {
      chapterTitle: string;
      sceneDescription: string;
      characters?: string[];
      setting?: string;
    },
    options: {
      stylePreset?: StylePreset;
      projectStyle?: string;
      size?: '1024x1024' | '1792x1024' | '1024x1792';
      quality?: 'standard' | 'hd';
    } = {}
  ): Promise<ImageMetadata> {
    const imageId = uuidv4();
    const prompt = this.buildScenePrompt(sceneData, options.stylePreset, options.projectStyle);

    const params: GenerationParams = {
      size: options.size || '1792x1024',
      quality: options.quality || 'standard',
      style: 'vivid',
    };

    try {
      const { url, revisedPrompt } = await this.generateImage(prompt, params);
      const { filePath, fileSize } = await this.downloadAndSaveImage(url, projectId, imageId);
      const [width, height] = (params.size || '1792x1024').split('x').map(Number);

      return {
        id: imageId,
        projectId,
        entityType: 'scene',
        entityId: chapterId,
        imageType: 'scene_illustration',
        prompt: revisedPrompt || prompt,
        stylePreset: options.stylePreset,
        filePath,
        fileSize,
        width,
        height,
        generationParams: params,
        status: 'completed',
      };
    } catch (error: any) {
      logger.error({ error: error.message, chapterId }, 'Failed to generate scene illustration');

      return {
        id: imageId,
        projectId,
        entityType: 'scene',
        entityId: chapterId,
        imageType: 'scene_illustration',
        prompt,
        stylePreset: options.stylePreset,
        filePath: '',
        fileSize: 0,
        width: 0,
        height: 0,
        generationParams: params,
        status: 'failed',
        errorMessage: error.message,
      };
    }
  }

  /**
   * Get file path for serving images
   */
  getImagePath(relativePath: string): string {
    return path.join(this.storageDir, relativePath);
  }

  /**
   * Delete image file
   */
  async deleteImage(relativePath: string): Promise<void> {
    const fullPath = this.getImagePath(relativePath);
    try {
      await fs.unlink(fullPath);
      logger.info({ path: relativePath }, 'Image deleted successfully');
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.error({ error: error.message, path: relativePath }, 'Failed to delete image');
        throw error;
      }
    }
  }
}

// Export singleton instance
export const imageGenerationService = new ImageGenerationService();
