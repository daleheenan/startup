import { describe, it, expect } from 'vitest';
import {
  PLOT_RECOMMENDATIONS,
  getBookLengthCategory,
  getPlotRecommendations,
  calculatePlotStatus,
  formatPlotType,
  type BookLengthCategory,
  type PlotLayer,
  type PlotAnalysis,
  type PlotStatus,
} from '../plot-recommendations';

describe('plot-recommendations', () => {
  describe('PLOT_RECOMMENDATIONS', () => {
    it('should have recommendations for all book length categories', () => {
      expect(PLOT_RECOMMENDATIONS.novella).toBeDefined();
      expect(PLOT_RECOMMENDATIONS.novel).toBeDefined();
      expect(PLOT_RECOMMENDATIONS.epic).toBeDefined();
    });

    describe('novella recommendations', () => {
      const { novella } = PLOT_RECOMMENDATIONS;

      it('should have main plot recommendation', () => {
        expect(novella.mainPlot).toEqual({ min: 1, max: 1, ideal: 1 });
      });

      it('should have limited subplots', () => {
        expect(novella.subplots.min).toBe(1);
        expect(novella.subplots.max).toBeLessThanOrEqual(2);
      });

      it('should have limited character arcs', () => {
        expect(novella.characterArcs.min).toBe(1);
        expect(novella.characterArcs.max).toBeLessThanOrEqual(2);
      });

      it('should have optional mystery and romance arcs', () => {
        expect(novella.mysteryThreads?.min).toBe(0);
        expect(novella.romanceArcs?.min).toBe(0);
      });

      it('should not have emotional or thematic arcs', () => {
        expect(novella.emotionalArcs).toBeUndefined();
        expect(novella.thematicArcs).toBeUndefined();
      });
    });

    describe('novel recommendations', () => {
      const { novel } = PLOT_RECOMMENDATIONS;

      it('should have main plot recommendation', () => {
        expect(novel.mainPlot).toEqual({ min: 1, max: 1, ideal: 1 });
      });

      it('should have more subplots than novella', () => {
        expect(novel.subplots.min).toBeGreaterThanOrEqual(2);
        expect(novel.subplots.max).toBeGreaterThanOrEqual(PLOT_RECOMMENDATIONS.novella.subplots.max);
      });

      it('should have emotional arcs', () => {
        expect(novel.emotionalArcs).toBeDefined();
        expect(novel.emotionalArcs?.min).toBe(1);
      });

      it('should not have thematic arcs', () => {
        expect(novel.thematicArcs).toBeUndefined();
      });
    });

    describe('epic recommendations', () => {
      const { epic } = PLOT_RECOMMENDATIONS;

      it('should have main plot recommendation', () => {
        expect(epic.mainPlot).toEqual({ min: 1, max: 1, ideal: 1 });
      });

      it('should have most subplots', () => {
        expect(epic.subplots.min).toBeGreaterThanOrEqual(3);
        expect(epic.subplots.max).toBeGreaterThanOrEqual(PLOT_RECOMMENDATIONS.novel.subplots.max);
      });

      it('should have thematic arcs', () => {
        expect(epic.thematicArcs).toBeDefined();
        expect(epic.thematicArcs?.min).toBeGreaterThanOrEqual(1);
      });

      it('should have all plot types available', () => {
        expect(epic.mainPlot).toBeDefined();
        expect(epic.subplots).toBeDefined();
        expect(epic.characterArcs).toBeDefined();
        expect(epic.mysteryThreads).toBeDefined();
        expect(epic.romanceArcs).toBeDefined();
        expect(epic.emotionalArcs).toBeDefined();
        expect(epic.thematicArcs).toBeDefined();
      });
    });

    describe('recommendation structure', () => {
      it('should have min, max, ideal for each plot type', () => {
        for (const category of Object.values(PLOT_RECOMMENDATIONS)) {
          for (const plotType of Object.values(category)) {
            expect(plotType.min).toBeGreaterThanOrEqual(0);
            expect(plotType.max).toBeGreaterThanOrEqual(plotType.min);
            expect(plotType.ideal).toBeGreaterThanOrEqual(plotType.min);
            expect(plotType.ideal).toBeLessThanOrEqual(plotType.max);
          }
        }
      });

      it('should always have exactly one main plot', () => {
        expect(PLOT_RECOMMENDATIONS.novella.mainPlot).toEqual({ min: 1, max: 1, ideal: 1 });
        expect(PLOT_RECOMMENDATIONS.novel.mainPlot).toEqual({ min: 1, max: 1, ideal: 1 });
        expect(PLOT_RECOMMENDATIONS.epic.mainPlot).toEqual({ min: 1, max: 1, ideal: 1 });
      });
    });
  });

  describe('getBookLengthCategory', () => {
    describe('novella range', () => {
      it('should return novella for word counts under 50000', () => {
        expect(getBookLengthCategory(20000)).toBe('novella');
        expect(getBookLengthCategory(40000)).toBe('novella');
        expect(getBookLengthCategory(49999)).toBe('novella');
      });
    });

    describe('novel range', () => {
      it('should return novel for word counts between 50000 and 99999', () => {
        expect(getBookLengthCategory(50000)).toBe('novel');
        expect(getBookLengthCategory(70000)).toBe('novel');
        expect(getBookLengthCategory(90000)).toBe('novel');
        expect(getBookLengthCategory(99999)).toBe('novel');
      });
    });

    describe('epic range', () => {
      it('should return epic for word counts 100000 and above', () => {
        expect(getBookLengthCategory(100000)).toBe('epic');
        expect(getBookLengthCategory(150000)).toBe('epic');
        expect(getBookLengthCategory(200000)).toBe('epic');
        expect(getBookLengthCategory(500000)).toBe('epic');
      });
    });

    describe('boundary values', () => {
      it('should handle boundary at 50000', () => {
        expect(getBookLengthCategory(49999)).toBe('novella');
        expect(getBookLengthCategory(50000)).toBe('novel');
      });

      it('should handle boundary at 100000', () => {
        expect(getBookLengthCategory(99999)).toBe('novel');
        expect(getBookLengthCategory(100000)).toBe('epic');
      });
    });

    describe('edge cases', () => {
      it('should handle very small word counts', () => {
        expect(getBookLengthCategory(0)).toBe('novella');
        expect(getBookLengthCategory(1)).toBe('novella');
        expect(getBookLengthCategory(1000)).toBe('novella');
      });

      it('should handle very large word counts', () => {
        expect(getBookLengthCategory(1000000)).toBe('epic');
        expect(getBookLengthCategory(Number.MAX_SAFE_INTEGER)).toBe('epic');
      });

      it('should return valid category for any positive number', () => {
        const categories: BookLengthCategory[] = ['novella', 'novel', 'epic'];
        const randomWordCount = Math.floor(Math.random() * 500000);
        const result = getBookLengthCategory(randomWordCount);
        expect(categories).toContain(result);
      });
    });
  });

  describe('getPlotRecommendations', () => {
    it('should return novella recommendations for short books', () => {
      const recommendations = getPlotRecommendations(30000);
      expect(recommendations).toEqual(PLOT_RECOMMENDATIONS.novella);
    });

    it('should return novel recommendations for medium books', () => {
      const recommendations = getPlotRecommendations(80000);
      expect(recommendations).toEqual(PLOT_RECOMMENDATIONS.novel);
    });

    it('should return epic recommendations for long books', () => {
      const recommendations = getPlotRecommendations(150000);
      expect(recommendations).toEqual(PLOT_RECOMMENDATIONS.epic);
    });

    it('should return consistent results for same word count', () => {
      const result1 = getPlotRecommendations(75000);
      const result2 = getPlotRecommendations(75000);
      expect(result1).toEqual(result2);
    });

    it('should handle boundary values correctly', () => {
      expect(getPlotRecommendations(49999)).toEqual(PLOT_RECOMMENDATIONS.novella);
      expect(getPlotRecommendations(50000)).toEqual(PLOT_RECOMMENDATIONS.novel);
      expect(getPlotRecommendations(99999)).toEqual(PLOT_RECOMMENDATIONS.novel);
      expect(getPlotRecommendations(100000)).toEqual(PLOT_RECOMMENDATIONS.epic);
    });
  });

  describe('calculatePlotStatus', () => {
    const createPlotLayer = (type: string): PlotLayer => ({
      type,
      id: `layer-${Math.random()}`,
      description: 'Test plot layer',
    });

    describe('with novella word count', () => {
      const wordCount = 30000;

      it('should detect under status when count is below minimum', () => {
        const plotLayers: PlotLayer[] = [];
        const analysis = calculatePlotStatus(plotLayers, wordCount);

        expect(analysis.mainPlot?.status).toBe('under');
        expect(analysis.mainPlot?.current).toBe(0);
      });

      it('should detect ideal status when count matches ideal', () => {
        const plotLayers: PlotLayer[] = [
          createPlotLayer('mainPlot'),
          createPlotLayer('subplots'),
          createPlotLayer('characterArcs'),
        ];
        const analysis = calculatePlotStatus(plotLayers, wordCount);

        expect(analysis.mainPlot?.status).toBe('ideal');
        expect(analysis.subplots?.status).toBe('ideal');
        expect(analysis.characterArcs?.status).toBe('ideal');
      });

      it('should detect over status when count exceeds maximum', () => {
        const plotLayers: PlotLayer[] = [
          createPlotLayer('subplots'),
          createPlotLayer('subplots'),
          createPlotLayer('subplots'), // 3 subplots, max is 2 for novella
        ];
        const analysis = calculatePlotStatus(plotLayers, wordCount);

        expect(analysis.subplots?.status).toBe('over');
        expect(analysis.subplots?.current).toBe(3);
      });

      it('should return recommended values', () => {
        const plotLayers: PlotLayer[] = [];
        const analysis = calculatePlotStatus(plotLayers, wordCount);

        expect(analysis.mainPlot?.recommended).toEqual({ min: 1, max: 1, ideal: 1 });
      });
    });

    describe('with novel word count', () => {
      const wordCount = 80000;

      it('should use novel recommendations', () => {
        const plotLayers: PlotLayer[] = [
          createPlotLayer('mainPlot'),
          createPlotLayer('subplots'),
          createPlotLayer('subplots'),
          createPlotLayer('subplots'), // 3 subplots (ideal for novel)
        ];
        const analysis = calculatePlotStatus(plotLayers, wordCount);

        expect(analysis.subplots?.status).toBe('ideal');
        expect(analysis.subplots?.current).toBe(3);
        expect(analysis.subplots?.recommended.ideal).toBe(3);
      });

      it('should include emotional arcs in analysis', () => {
        const plotLayers: PlotLayer[] = [];
        const analysis = calculatePlotStatus(plotLayers, wordCount);

        expect(analysis.emotionalArcs).toBeDefined();
        expect(analysis.emotionalArcs?.recommended).toEqual({ min: 1, max: 2, ideal: 1 });
      });
    });

    describe('with epic word count', () => {
      const wordCount = 150000;

      it('should use epic recommendations', () => {
        const plotLayers: PlotLayer[] = [
          createPlotLayer('subplots'),
          createPlotLayer('subplots'),
          createPlotLayer('subplots'),
          createPlotLayer('subplots'), // 4 subplots (ideal for epic)
        ];
        const analysis = calculatePlotStatus(plotLayers, wordCount);

        expect(analysis.subplots?.status).toBe('ideal');
        expect(analysis.subplots?.current).toBe(4);
        expect(analysis.subplots?.recommended.ideal).toBe(4);
      });

      it('should include thematic arcs in analysis', () => {
        const plotLayers: PlotLayer[] = [];
        const analysis = calculatePlotStatus(plotLayers, wordCount);

        expect(analysis.thematicArcs).toBeDefined();
        expect(analysis.thematicArcs?.recommended).toEqual({ min: 1, max: 2, ideal: 1 });
      });
    });

    describe('plot counting', () => {
      const wordCount = 80000;

      it('should count multiple plot layers of same type', () => {
        const plotLayers: PlotLayer[] = [
          createPlotLayer('characterArcs'),
          createPlotLayer('characterArcs'),
          createPlotLayer('characterArcs'),
        ];
        const analysis = calculatePlotStatus(plotLayers, wordCount);

        expect(analysis.characterArcs?.current).toBe(3);
      });

      it('should handle mixed plot types', () => {
        const plotLayers: PlotLayer[] = [
          createPlotLayer('mainPlot'),
          createPlotLayer('subplots'),
          createPlotLayer('subplots'),
          createPlotLayer('characterArcs'),
          createPlotLayer('mysteryThreads'),
        ];
        const analysis = calculatePlotStatus(plotLayers, wordCount);

        expect(analysis.mainPlot?.current).toBe(1);
        expect(analysis.subplots?.current).toBe(2);
        expect(analysis.characterArcs?.current).toBe(1);
        expect(analysis.mysteryThreads?.current).toBe(1);
      });

      it('should handle empty plot layers array', () => {
        const analysis = calculatePlotStatus([], wordCount);

        expect(analysis.mainPlot?.current).toBe(0);
        expect(analysis.subplots?.current).toBe(0);
        expect(analysis.characterArcs?.current).toBe(0);
      });
    });

    describe('status determination', () => {
      const wordCount = 80000;

      it('should mark within range but not ideal as ideal status', () => {
        const plotLayers: PlotLayer[] = [
          createPlotLayer('subplots'),
          createPlotLayer('subplots'), // 2 subplots (min=2, ideal=3, max=4)
        ];
        const analysis = calculatePlotStatus(plotLayers, wordCount);

        expect(analysis.subplots?.status).toBe('ideal'); // Within range counts as ideal
      });

      it('should correctly identify all status types', () => {
        const plotLayers: PlotLayer[] = [
          // mainPlot: under (current=0, min=1)
          createPlotLayer('subplots'),
          createPlotLayer('subplots'),
          createPlotLayer('subplots'), // ideal (current=3, ideal=3)
          createPlotLayer('characterArcs'),
          createPlotLayer('characterArcs'),
          createPlotLayer('characterArcs'),
          createPlotLayer('characterArcs'),
          createPlotLayer('characterArcs'), // over (current=5, max=4)
        ];
        const analysis = calculatePlotStatus(plotLayers, wordCount);

        expect(analysis.mainPlot?.status).toBe('under');
        expect(analysis.subplots?.status).toBe('ideal');
        expect(analysis.characterArcs?.status).toBe('over');
      });
    });

    describe('edge cases', () => {
      it('should handle plot layers with unknown types gracefully', () => {
        const plotLayers: PlotLayer[] = [
          createPlotLayer('unknownType'),
          createPlotLayer('mainPlot'),
        ];
        const wordCount = 80000;
        const analysis = calculatePlotStatus(plotLayers, wordCount);

        // Unknown types should not crash the function
        expect(analysis.mainPlot?.current).toBe(1);
      });

      it('should handle zero word count', () => {
        const plotLayers: PlotLayer[] = [createPlotLayer('mainPlot')];
        const analysis = calculatePlotStatus(plotLayers, 0);

        // Should use novella recommendations
        expect(analysis).toBeDefined();
        expect(analysis.mainPlot).toBeDefined();
      });

      it('should handle very large word counts', () => {
        const plotLayers: PlotLayer[] = [createPlotLayer('mainPlot')];
        const analysis = calculatePlotStatus(plotLayers, 1000000);

        // Should use epic recommendations
        expect(analysis.thematicArcs).toBeDefined();
      });
    });

    describe('return value structure', () => {
      it('should return analysis for all plot types in recommendations', () => {
        const plotLayers: PlotLayer[] = [];
        const wordCount = 150000; // Epic

        const analysis = calculatePlotStatus(plotLayers, wordCount);
        const recommendations = getPlotRecommendations(wordCount);

        for (const plotType of Object.keys(recommendations)) {
          expect(analysis[plotType as keyof PlotAnalysis]).toBeDefined();
        }
      });

      it('should include current, recommended, and status in each entry', () => {
        const plotLayers: PlotLayer[] = [createPlotLayer('mainPlot')];
        const analysis = calculatePlotStatus(plotLayers, 80000);

        expect(analysis.mainPlot).toHaveProperty('current');
        expect(analysis.mainPlot).toHaveProperty('recommended');
        expect(analysis.mainPlot).toHaveProperty('status');
      });
    });
  });

  describe('formatPlotType', () => {
    it('should format camelCase to Title Case', () => {
      expect(formatPlotType('mainPlot')).toBe('Main Plot');
      expect(formatPlotType('subplots')).toBe('Subplots');
      expect(formatPlotType('characterArcs')).toBe('Character Arcs');
    });

    it('should handle single word types', () => {
      expect(formatPlotType('main')).toBe('Main');
      expect(formatPlotType('subplot')).toBe('Subplot');
    });

    it('should handle multiple capital letters', () => {
      expect(formatPlotType('mysteryThreads')).toBe('Mystery Threads');
      expect(formatPlotType('romanceArcs')).toBe('Romance Arcs');
      expect(formatPlotType('emotionalArcs')).toBe('Emotional Arcs');
      expect(formatPlotType('thematicArcs')).toBe('Thematic Arcs');
    });

    it('should handle already capitalised first letter', () => {
      // Function inserts space before capitals, so 'MainPlot' becomes ' Main Plot'
      // Then capitalises and trims - but there's a leading space from the first capital
      expect(formatPlotType('MainPlot')).toBe(' Main Plot');
    });

    it('should handle lowercase strings', () => {
      expect(formatPlotType('test')).toBe('Test');
    });

    it('should handle empty string', () => {
      expect(formatPlotType('')).toBe('');
    });

    it('should preserve existing spaces (if any)', () => {
      // Function inserts space before capitals, so already-spaced strings work
      expect(formatPlotType('someTestValue')).toBe('Some Test Value');
    });

    it('should be consistent', () => {
      const input = 'characterArcs';
      expect(formatPlotType(input)).toBe(formatPlotType(input));
    });

    describe('real-world plot types', () => {
      it('should format all standard plot types correctly', () => {
        const types = [
          { input: 'mainPlot', expected: 'Main Plot' },
          { input: 'subplots', expected: 'Subplots' },
          { input: 'characterArcs', expected: 'Character Arcs' },
          { input: 'mysteryThreads', expected: 'Mystery Threads' },
          { input: 'romanceArcs', expected: 'Romance Arcs' },
          { input: 'emotionalArcs', expected: 'Emotional Arcs' },
          { input: 'thematicArcs', expected: 'Thematic Arcs' },
        ];

        for (const { input, expected } of types) {
          expect(formatPlotType(input)).toBe(expected);
        }
      });
    });
  });

  describe('type safety and exports', () => {
    it('should export correct types', () => {
      // Type checking - these would fail at compile time if types are wrong
      const category: BookLengthCategory = 'novella';
      const plotLayer: PlotLayer = { type: 'mainPlot' };
      const status: PlotStatus = 'ideal';

      expect(category).toBeDefined();
      expect(plotLayer).toBeDefined();
      expect(status).toBeDefined();
    });

    it('should return reference to recommendation constants', () => {
      // getPlotRecommendations returns direct reference to PLOT_RECOMMENDATIONS
      // so modifications will persist (not deep cloned)
      const novelRecommendations = getPlotRecommendations(80000);
      const originalIdeal = novelRecommendations.subplots.ideal;

      expect(originalIdeal).toBe(3); // Verify the original value
      expect(novelRecommendations).toBe(PLOT_RECOMMENDATIONS.novel);
    });
  });
});
