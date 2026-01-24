import type { ChapterAnalytics, SceneCard } from '../shared/types/index.js';
import { ProseAnalyzer } from './proseAnalyzer.js';

/**
 * Service for calculating chapter and book analytics
 * Sprint 19: Analytics & Insights
 */

export class AnalyticsService {
  /**
   * Analyze a chapter and calculate all metrics
   */
  static async analyzeChapter(chapterId: string, content: string, sceneCards: SceneCard[]): Promise<Partial<ChapterAnalytics>> {
    // Calculate all metrics in parallel
    const [pacing, characterScreenTime, dialogue, readability, tension] = await Promise.all([
      this.analyzePacing(content, sceneCards),
      this.analyzeCharacterScreenTime(content, sceneCards),
      this.analyzeDialogue(content),
      this.analyzeReadability(content),
      this.analyzeTension(content, sceneCards),
    ]);

    return {
      chapter_id: chapterId,
      ...pacing,
      ...characterScreenTime,
      ...dialogue,
      ...readability,
      ...tension,
    };
  }

  /**
   * Analyze pacing across scenes
   * Returns pacing score and per-scene breakdown
   */
  private static async analyzePacing(content: string, sceneCards: SceneCard[]) {
    const scenes = this.splitIntoScenes(content, sceneCards.length);
    const scenePacing = scenes.map((sceneText, index) => {
      const sceneCard = sceneCards[index];
      const wordCount = this.countWords(sceneText);

      // Analyze pacing indicators
      const sentences = ProseAnalyzer['splitIntoSentences'](sceneText);
      const avgSentenceLength = this.countWords(sceneText) / (sentences.length || 1);

      // Detect action indicators (fast pacing)
      const actionWords = this.countActionWords(sceneText);
      const dialogueRatio = this.calculateDialogueRatio(sceneText);

      // Calculate pace
      let pace: 'slow' | 'medium' | 'fast' = 'medium';

      // Fast: short sentences, lots of action, high dialogue
      if (avgSentenceLength < 15 && actionWords > 10) pace = 'fast';
      // Slow: long sentences, description-heavy, low action
      else if (avgSentenceLength > 25 && actionWords < 5) pace = 'slow';

      return {
        scene: sceneCard?.goal || `Scene ${index + 1}`,
        pace,
        word_count: wordCount,
      };
    });

    // Overall pacing score
    const fastScenes = scenePacing.filter(s => s.pace === 'fast').length;
    const slowScenes = scenePacing.filter(s => s.pace === 'slow').length;
    const variety = Math.abs(fastScenes - slowScenes) / (scenePacing.length || 1);
    const pacingScore = 50 + variety * 50; // Higher variety = better pacing

    return {
      pacing_score: pacingScore,
      pacing_data: { scene_pacing: scenePacing },
    };
  }

  /**
   * Track character appearances and screen time
   */
  private static async analyzeCharacterScreenTime(content: string, sceneCards: SceneCard[]) {
    const characterStats: Record<string, { appearances: number; word_count: number; pov_time: number }> = {};

    const scenes = this.splitIntoScenes(content, sceneCards.length);

    scenes.forEach((sceneText, index) => {
      const sceneCard = sceneCards[index];
      const sceneWordCount = this.countWords(sceneText);

      // Track all characters in scene
      sceneCard.characters.forEach(charName => {
        if (!characterStats[charName]) {
          characterStats[charName] = { appearances: 0, word_count: 0, pov_time: 0 };
        }

        // Count appearances (mentions in text)
        const mentions = this.countMentions(sceneText, charName);
        characterStats[charName].appearances += mentions;

        // Estimate word count allocation (evenly split among characters for now)
        characterStats[charName].word_count += sceneWordCount / sceneCard.characters.length;

        // POV time
        if (sceneCard.povCharacter === charName) {
          characterStats[charName].pov_time += sceneWordCount;
        }
      });
    });

    return {
      character_screen_time: characterStats,
    };
  }

  /**
   * Analyze dialogue vs narrative ratio
   */
  private static async analyzeDialogue(content: string) {
    const dialogueWordCount = this.countDialogueWords(content);
    const totalWords = this.countWords(content);
    const narrativeWordCount = totalWords - dialogueWordCount;

    const dialoguePercentage = (dialogueWordCount / (totalWords || 1)) * 100;

    return {
      dialogue_percentage: dialoguePercentage,
      dialogue_word_count: dialogueWordCount,
      narrative_word_count: narrativeWordCount,
    };
  }

  /**
   * Calculate readability metrics
   */
  private static async analyzeReadability(content: string) {
    const metrics = ProseAnalyzer.calculateTextMetrics(content);

    return {
      readability_score: metrics.fleschKincaidScore,
      avg_sentence_length: metrics.avgSentenceLength,
      complex_word_percentage: metrics.complexWordRatio * 100,
    };
  }

  /**
   * Analyze tension arc throughout chapter
   */
  private static async analyzeTension(content: string, sceneCards: SceneCard[]) {
    const scenes = this.splitIntoScenes(content, sceneCards.length);
    const tensionPoints: Array<{ position: number; tension: number }> = [];

    let cumulativeWordCount = 0;
    const totalWords = this.countWords(content);

    scenes.forEach((sceneText, index) => {
      const sceneCard = sceneCards[index];
      const sceneWordCount = this.countWords(sceneText);

      // Calculate tension for this scene
      const tensionScore = this.calculateSceneTension(sceneText, sceneCard);

      // Position in chapter (percentage)
      const position = ((cumulativeWordCount + sceneWordCount / 2) / totalWords) * 100;

      tensionPoints.push({
        position: Math.round(position),
        tension: tensionScore,
      });

      cumulativeWordCount += sceneWordCount;
    });

    // Overall tension score (average of all points)
    const avgTension = tensionPoints.reduce((sum, p) => sum + p.tension, 0) / (tensionPoints.length || 1);

    return {
      tension_score: avgTension,
      tension_arc: { points: tensionPoints },
    };
  }

  /**
   * Calculate tension score for a scene
   */
  private static calculateSceneTension(sceneText: string, sceneCard: SceneCard): number {
    let tension = 50; // Base tension

    // Conflict indicators
    const conflictWords = this.countConflictWords(sceneText);
    tension += Math.min(conflictWords * 2, 20);

    // Action indicators
    const actionWords = this.countActionWords(sceneText);
    tension += Math.min(actionWords, 15);

    // Emotional intensity from scene card
    const emotionalBeat = sceneCard.emotionalBeat?.toLowerCase() || '';
    if (emotionalBeat.match(/fear|terror|anger|rage|despair/)) tension += 15;
    if (emotionalBeat.match(/calm|peace|content|happy/)) tension -= 10;

    // Conflict from scene card
    if (sceneCard.conflict && sceneCard.conflict.length > 50) tension += 10;

    // Pacing (faster = higher tension)
    const sentences = ProseAnalyzer['splitIntoSentences'](sceneText);
    const avgSentenceLength = this.countWords(sceneText) / (sentences.length || 1);
    if (avgSentenceLength < 15) tension += 10;
    else if (avgSentenceLength > 25) tension -= 5;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, tension));
  }

  /**
   * Split content into scenes based on scene count
   */
  private static splitIntoScenes(content: string, sceneCount: number): string[] {
    if (sceneCount <= 1) return [content];

    // Simple split by scene breaks (### or similar markers)
    const sceneMarkers = content.match(/###[^\n]*\n/g);

    if (sceneMarkers && sceneMarkers.length >= sceneCount - 1) {
      return content.split(/###[^\n]*\n/).filter(s => s.trim().length > 0);
    }

    // Fallback: split roughly evenly
    const paragraphs = content.split(/\n\n+/);
    const parasPerScene = Math.ceil(paragraphs.length / sceneCount);

    const scenes: string[] = [];
    for (let i = 0; i < sceneCount; i++) {
      const start = i * parasPerScene;
      const end = start + parasPerScene;
      scenes.push(paragraphs.slice(start, end).join('\n\n'));
    }

    return scenes.filter(s => s.trim().length > 0);
  }

  /**
   * Count words in text
   */
  private static countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Count dialogue words (text within quotes)
   */
  private static countDialogueWords(text: string): number {
    const dialogueMatches = text.match(/"[^"]*"/g) || [];
    return dialogueMatches.reduce((count, match) => {
      return count + this.countWords(match);
    }, 0);
  }

  /**
   * Calculate dialogue ratio for a scene
   */
  private static calculateDialogueRatio(text: string): number {
    const dialogueWords = this.countDialogueWords(text);
    const totalWords = this.countWords(text);
    return dialogueWords / (totalWords || 1);
  }

  /**
   * Count action words in text
   */
  private static countActionWords(text: string): number {
    const actionWords = [
      'ran', 'jumped', 'fought', 'hit', 'struck', 'grabbed', 'threw',
      'kicked', 'punched', 'dodged', 'rushed', 'charged', 'attacked',
      'fled', 'chased', 'sprinted', 'lunged', 'dashed', 'burst',
    ];

    let count = 0;
    const words = text.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (actionWords.some(aw => word.includes(aw))) count++;
    });

    return count;
  }

  /**
   * Count conflict words in text
   */
  private static countConflictWords(text: string): number {
    const conflictWords = [
      'conflict', 'fight', 'argue', 'battle', 'war', 'struggle',
      'tension', 'confrontation', 'disagreement', 'oppose', 'against',
      'enemy', 'threat', 'danger', 'fear', 'anger', 'rage',
    ];

    let count = 0;
    const words = text.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (conflictWords.some(cw => word.includes(cw))) count++;
    });

    return count;
  }

  /**
   * Count mentions of a character name in text
   */
  private static countMentions(text: string, characterName: string): number {
    const firstName = characterName.split(' ')[0];
    const lastName = characterName.split(' ').slice(1).join(' ');

    let count = 0;

    // Count full name
    const fullNameRegex = new RegExp(characterName, 'gi');
    count += (text.match(fullNameRegex) || []).length;

    // Count first name only (if not already counted)
    if (firstName !== characterName) {
      const firstNameRegex = new RegExp(`\\b${firstName}\\b`, 'gi');
      const firstNameMatches = text.match(firstNameRegex) || [];
      // Subtract full name matches to avoid double counting
      count += Math.max(0, firstNameMatches.length - count);
    }

    return count;
  }

  /**
   * Calculate book-level analytics from chapter analytics
   */
  static calculateBookAnalytics(chapterAnalytics: ChapterAnalytics[], genre: string): any {
    if (chapterAnalytics.length === 0) return null;

    // Average pacing score
    const avgPacingScore = this.average(chapterAnalytics.map(c => c.pacing_score).filter((v): v is number => v !== undefined));

    // Pacing consistency (lower variance = more consistent)
    const pacingScores = chapterAnalytics.map(c => c.pacing_score).filter((v): v is number => v !== undefined);
    const pacingVariance = this.calculateVariance(pacingScores);
    const pacingConsistency = Math.max(0, 100 - pacingVariance);

    // Aggregate character screen time
    const characterBalance: Record<string, any> = {};
    chapterAnalytics.forEach((chapter, index) => {
      if (chapter.character_screen_time) {
        Object.entries(chapter.character_screen_time).forEach(([name, stats]) => {
          if (!characterBalance[name]) {
            characterBalance[name] = {
              name,
              total_appearances: 0,
              total_word_count: 0,
              chapters_appeared_in: [],
            };
          }
          const typedStats = stats as { appearances: number; word_count: number; pov_time: number };
          characterBalance[name].total_appearances += typedStats.appearances;
          characterBalance[name].total_word_count += typedStats.word_count;
          characterBalance[name].chapters_appeared_in.push(index + 1);
        });
      }
    });

    // Average dialogue percentage
    const avgDialoguePercentage = this.average(chapterAnalytics.map(c => c.dialogue_percentage).filter((v): v is number => v !== undefined));

    // Average readability
    const avgReadabilityScore = this.average(chapterAnalytics.map(c => c.readability_score).filter((v): v is number => v !== undefined));

    // Overall tension arc
    const overallTensionArc = {
      chapters: chapterAnalytics.map((chapter, index) => ({
        chapter_number: index + 1,
        avg_tension: chapter.tension_score || 50,
      })),
    };

    return {
      avg_pacing_score: avgPacingScore,
      pacing_consistency: pacingConsistency,
      character_balance: { characters: Object.values(characterBalance) },
      avg_dialogue_percentage: avgDialoguePercentage,
      avg_readability_score: avgReadabilityScore,
      overall_tension_arc: overallTensionArc,
    };
  }

  /**
   * Helper: calculate average
   */
  private static average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Helper: calculate variance
   */
  private static calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = this.average(numbers);
    const squareDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return this.average(squareDiffs);
  }
}
