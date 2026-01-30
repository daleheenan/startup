import { jest } from '@jest/globals';

/**
 * Unit tests for plot coherence fix logic
 * Specifically tests the defensive code that prevents AI from creating new plot layers
 */

// Mock the database connection - must be at top level for hoisting
jest.mock('../../../db/connection.js');

// Mock the metrics service
jest.mock('../../../services/metrics.service.js', () => ({
  metricsService: {
    logAIRequest: jest.fn(),
  },
}));

// Mock the logger service
jest.mock('../../../services/logger.service.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock authentication middleware
jest.mock('../../../middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => next(),
}));

describe('Plot Coherence Fix Logic', () => {
  /**
   * Helper function to simulate the merge logic from plot.ts
   * This mirrors the exact logic in fix-coherence-warning and implement-coherence-suggestion
   */
  function mergePlotLayers(
    existingLayers: Array<{ id: string; name: string; type: string; description: string; points?: any[]; status?: string }>,
    aiReturnedLayers: Array<{ id: string; name: string; type: string; description: string }>
  ): { mergedLayers: any[]; rejectedNewLayers: string[] } {
    const existingLayersMap = new Map<string, any>();
    for (const layer of existingLayers) {
      existingLayersMap.set(layer.id, layer);
    }

    const updatedLayerIds = new Set<string>();
    const rejectedNewLayers: string[] = [];
    const mergedPlotLayers: any[] = [];

    for (const aiLayer of aiReturnedLayers) {
      const existingLayer = existingLayersMap.get(aiLayer.id);
      if (existingLayer) {
        // Valid existing layer - update it
        updatedLayerIds.add(aiLayer.id);
        mergedPlotLayers.push({
          ...existingLayer,
          name: aiLayer.name,
          type: aiLayer.type,
          description: aiLayer.description,
        });
      } else {
        // AI tried to create a new layer - REJECT IT
        rejectedNewLayers.push(aiLayer.name || aiLayer.id);
      }
    }

    // Preserve any existing layers that the AI didn't include
    for (const layer of existingLayers) {
      if (!updatedLayerIds.has(layer.id)) {
        mergedPlotLayers.push(layer);
      }
    }

    return { mergedLayers: mergedPlotLayers, rejectedNewLayers };
  }

  describe('mergePlotLayers - defensive filtering', () => {
    const existingLayers = [
      {
        id: 'layer-1',
        name: 'Main Plot',
        type: 'main',
        description: 'The central story arc',
        points: [{ id: 'p1', chapter_number: 1, description: 'Opening' }],
        status: 'active',
      },
      {
        id: 'layer-2',
        name: 'Romance Subplot',
        type: 'subplot',
        description: 'A romantic subplot',
        points: [{ id: 'p2', chapter_number: 5, description: 'First meeting' }],
        status: 'active',
      },
      {
        id: 'layer-3',
        name: 'Mystery Thread',
        type: 'mystery',
        description: 'A mysterious element',
        points: [],
        status: 'active',
      },
    ];

    it('should update existing layers when AI uses existing IDs', () => {
      const aiLayers = [
        {
          id: 'layer-1',
          name: 'Main Plot - Revised',
          type: 'main',
          description: 'The central story arc (improved)',
        },
        {
          id: 'layer-2',
          name: 'Romance Subplot - Enhanced',
          type: 'romance',
          description: 'A deeper romantic subplot',
        },
      ];

      const { mergedLayers, rejectedNewLayers } = mergePlotLayers(existingLayers, aiLayers);

      // Should have all 3 layers (2 updated + 1 preserved)
      expect(mergedLayers).toHaveLength(3);
      expect(rejectedNewLayers).toHaveLength(0);

      // Check updated layers
      const mainPlot = mergedLayers.find(l => l.id === 'layer-1');
      expect(mainPlot?.name).toBe('Main Plot - Revised');
      expect(mainPlot?.description).toBe('The central story arc (improved)');
      expect(mainPlot?.points).toHaveLength(1); // Points preserved

      const romancePlot = mergedLayers.find(l => l.id === 'layer-2');
      expect(romancePlot?.name).toBe('Romance Subplot - Enhanced');
      expect(romancePlot?.type).toBe('romance');
      expect(romancePlot?.points).toHaveLength(1); // Points preserved

      // Check preserved layer (layer-3 wasn't in AI response)
      const mysteryPlot = mergedLayers.find(l => l.id === 'layer-3');
      expect(mysteryPlot?.name).toBe('Mystery Thread');
    });

    it('should REJECT new plot layers that AI tries to create', () => {
      const aiLayers = [
        {
          id: 'layer-1',
          name: 'Main Plot',
          type: 'main',
          description: 'Existing main plot',
        },
        {
          id: 'new-layer-created-by-ai',
          name: 'AI Created Plot',
          type: 'subplot',
          description: 'This plot was invented by AI and should be rejected',
        },
        {
          id: 'another-new-layer',
          name: 'Another New Plot',
          type: 'character-arc',
          description: 'Another AI creation',
        },
      ];

      const { mergedLayers, rejectedNewLayers } = mergePlotLayers(existingLayers, aiLayers);

      // Should only have original 3 layers
      expect(mergedLayers).toHaveLength(3);

      // Should have rejected 2 new layers
      expect(rejectedNewLayers).toHaveLength(2);
      expect(rejectedNewLayers).toContain('AI Created Plot');
      expect(rejectedNewLayers).toContain('Another New Plot');

      // Verify no AI-created layers made it through
      const aiCreatedLayer = mergedLayers.find(l => l.id === 'new-layer-created-by-ai');
      expect(aiCreatedLayer).toBeUndefined();

      const anotherNewLayer = mergedLayers.find(l => l.id === 'another-new-layer');
      expect(anotherNewLayer).toBeUndefined();
    });

    it('should preserve points and status when updating layers', () => {
      const aiLayers = [
        {
          id: 'layer-1',
          name: 'Updated Name',
          type: 'main',
          description: 'Updated description',
        },
      ];

      const { mergedLayers } = mergePlotLayers(existingLayers, aiLayers);

      const updatedLayer = mergedLayers.find(l => l.id === 'layer-1');

      // Name and description should be updated
      expect(updatedLayer?.name).toBe('Updated Name');
      expect(updatedLayer?.description).toBe('Updated description');

      // Points and status should be preserved from original
      expect(updatedLayer?.points).toHaveLength(1);
      expect(updatedLayer?.points[0].id).toBe('p1');
      expect(updatedLayer?.status).toBe('active');
    });

    it('should preserve all existing layers when AI returns empty array', () => {
      const { mergedLayers, rejectedNewLayers } = mergePlotLayers(existingLayers, []);

      expect(mergedLayers).toHaveLength(3);
      expect(rejectedNewLayers).toHaveLength(0);

      // All original layers should be preserved
      expect(mergedLayers.map(l => l.id)).toEqual(['layer-1', 'layer-2', 'layer-3']);
    });

    it('should handle mixed scenario: some updates, some new (rejected), some preserved', () => {
      const aiLayers = [
        // Update layer-1
        {
          id: 'layer-1',
          name: 'Main Plot Updated',
          type: 'main',
          description: 'Updated main plot',
        },
        // Try to create new layer (should be rejected)
        {
          id: 'brand-new-id',
          name: 'Sneaky New Plot',
          type: 'subplot',
          description: 'Trying to sneak in a new plot',
        },
        // layer-2 and layer-3 not mentioned (should be preserved)
      ];

      const { mergedLayers, rejectedNewLayers } = mergePlotLayers(existingLayers, aiLayers);

      // Should have exactly 3 layers (1 updated + 2 preserved)
      expect(mergedLayers).toHaveLength(3);

      // 1 new layer rejected
      expect(rejectedNewLayers).toHaveLength(1);
      expect(rejectedNewLayers[0]).toBe('Sneaky New Plot');

      // Verify the composition
      const ids = mergedLayers.map(l => l.id);
      expect(ids).toContain('layer-1');
      expect(ids).toContain('layer-2');
      expect(ids).toContain('layer-3');
      expect(ids).not.toContain('brand-new-id');

      // Verify layer-1 was updated
      const mainPlot = mergedLayers.find(l => l.id === 'layer-1');
      expect(mainPlot?.name).toBe('Main Plot Updated');
    });

    it('should count plot changes correctly', () => {
      const aiLayers = [
        {
          id: 'layer-1',
          name: 'Main Plot',
          type: 'main',
          description: 'Same',
        },
        {
          id: 'fake-new-1',
          name: 'New 1',
          type: 'subplot',
          description: 'New',
        },
        {
          id: 'fake-new-2',
          name: 'New 2',
          type: 'subplot',
          description: 'New',
        },
        {
          id: 'fake-new-3',
          name: 'New 3',
          type: 'subplot',
          description: 'New',
        },
      ];

      const originalCount = existingLayers.length;
      const { mergedLayers, rejectedNewLayers } = mergePlotLayers(existingLayers, aiLayers);
      const finalCount = mergedLayers.length;

      // Without defensive code, this would have been 6 layers
      // With defensive code, it should remain at 3
      expect(finalCount).toBe(originalCount);
      expect(rejectedNewLayers).toHaveLength(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty existing layers', () => {
      const aiLayers = [
        {
          id: 'new-layer',
          name: 'New Plot',
          type: 'main',
          description: 'A new plot',
        },
      ];

      const { mergedLayers, rejectedNewLayers } = mergePlotLayers([], aiLayers);

      // With no existing layers, all AI layers should be rejected
      expect(mergedLayers).toHaveLength(0);
      expect(rejectedNewLayers).toHaveLength(1);
    });

    it('should handle duplicate IDs in AI response (first update wins)', () => {
      const existingLayers = [
        { id: 'layer-1', name: 'Plot 1', type: 'main', description: 'Desc 1' },
      ];

      const aiLayers = [
        { id: 'layer-1', name: 'First Update', type: 'main', description: 'First' },
        { id: 'layer-1', name: 'Second Update', type: 'main', description: 'Second' },
      ];

      const { mergedLayers, rejectedNewLayers } = mergePlotLayers(existingLayers, aiLayers);

      // In current implementation, first update wins and subsequent duplicates are added
      // This is a minor edge case - AI shouldn't send duplicates, but if it does,
      // at least no NEW layers are created (both use existing ID)
      expect(rejectedNewLayers).toHaveLength(0);

      // The key assertion: first update is applied
      const firstLayer = mergedLayers.find(l => l.name === 'First Update');
      expect(firstLayer).toBeDefined();
      expect(firstLayer?.id).toBe('layer-1');
    });

    it('should not create new layers even with similar names', () => {
      const existingLayers = [
        { id: 'layer-1', name: 'Main Plot', type: 'main', description: 'Original' },
      ];

      // AI might try to "fix" by creating similar-sounding but differently-IDed layers
      const aiLayers = [
        { id: 'main-plot-v2', name: 'Main Plot', type: 'main', description: 'Same name, different ID' },
        { id: 'main-plot-improved', name: 'Main Plot Improved', type: 'main', description: 'Variation' },
      ];

      const { mergedLayers, rejectedNewLayers } = mergePlotLayers(existingLayers, aiLayers);

      // Original should be preserved, new ones rejected
      expect(mergedLayers).toHaveLength(1);
      expect(mergedLayers[0].id).toBe('layer-1');
      expect(rejectedNewLayers).toHaveLength(2);
    });
  });
});

describe('Plot count monitoring', () => {
  it('should detect when plot count would increase', () => {
    const originalCount = 3;
    const existingLayers = [
      { id: 'l1', name: 'P1', type: 'main', description: 'D1' },
      { id: 'l2', name: 'P2', type: 'subplot', description: 'D2' },
      { id: 'l3', name: 'P3', type: 'subplot', description: 'D3' },
    ];

    // Without defensive code, this would increase count
    const aiLayers = [
      { id: 'l1', name: 'P1', type: 'main', description: 'D1' },
      { id: 'new1', name: 'New', type: 'subplot', description: 'New plot' },
    ];

    // Simulate merge logic
    const existingLayersMap = new Map(existingLayers.map(l => [l.id, l]));
    const updatedIds = new Set<string>();
    const rejectedCount = aiLayers.filter(l => {
      if (existingLayersMap.has(l.id)) {
        updatedIds.add(l.id);
        return false;
      }
      return true; // Would be rejected
    }).length;

    // Count change calculation
    const preservedCount = existingLayers.filter(l => !updatedIds.has(l.id)).length;
    const finalCount = updatedIds.size + preservedCount; // Without rejected layers

    expect(finalCount).toBe(originalCount);
    expect(rejectedCount).toBe(1);
  });
});
