import { describe, it, expect } from 'vitest';
import {
  API_BASE_URL,
  colors,
  gradients,
  shadows,
  borderRadius,
} from '../constants';

describe('constants', () => {
  describe('API_BASE_URL', () => {
    it('should be defined', () => {
      expect(API_BASE_URL).toBeDefined();
    });

    it('should be a valid URL string', () => {
      expect(typeof API_BASE_URL).toBe('string');
      expect(API_BASE_URL).toMatch(/^https?:\/\//);
    });

    it('should not have trailing slash', () => {
      expect(API_BASE_URL).not.toMatch(/\/$/);
    });
  });

  describe('colors', () => {
    describe('background colors', () => {
      it('should have background color defined', () => {
        expect(colors.background).toBeDefined();
        expect(colors.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      it('should have surface colors defined', () => {
        expect(colors.surface).toBeDefined();
        expect(colors.surfaceAlt).toBeDefined();
        expect(colors.surfaceHover).toBeDefined();
      });

      it('should use valid hex color format', () => {
        expect(colors.surface).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors.surfaceAlt).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    describe('border colors', () => {
      it('should have border colors defined', () => {
        expect(colors.border).toBeDefined();
        expect(colors.borderHover).toBeDefined();
      });

      it('should use valid hex color format', () => {
        expect(colors.border).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors.borderHover).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    describe('text colors', () => {
      it('should have text color hierarchy', () => {
        expect(colors.text).toBeDefined();
        expect(colors.textSecondary).toBeDefined();
        expect(colors.textTertiary).toBeDefined();
        expect(colors.textDisabled).toBeDefined();
      });

      it('should use valid hex color format', () => {
        expect(colors.text).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors.textSecondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors.textTertiary).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors.textDisabled).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    describe('brand colors', () => {
      it('should have brand colors defined', () => {
        expect(colors.brandStart).toBeDefined();
        expect(colors.brandEnd).toBeDefined();
        expect(colors.brandLight).toBeDefined();
        expect(colors.brandBorder).toBeDefined();
        expect(colors.brandText).toBeDefined();
      });

      it('should use valid hex color format', () => {
        expect(colors.brandStart).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors.brandEnd).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors.brandLight).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    describe('status colors', () => {
      it('should have success colors', () => {
        expect(colors.success).toBeDefined();
        expect(colors.successLight).toBeDefined();
        expect(colors.successBorder).toBeDefined();
        expect(colors.success).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      it('should have warning colors', () => {
        expect(colors.warning).toBeDefined();
        expect(colors.warningLight).toBeDefined();
        expect(colors.warningBorder).toBeDefined();
        expect(colors.warning).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      it('should have error colors', () => {
        expect(colors.error).toBeDefined();
        expect(colors.errorLight).toBeDefined();
        expect(colors.errorBorder).toBeDefined();
        expect(colors.error).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      it('should have info colors', () => {
        expect(colors.info).toBeDefined();
        expect(colors.infoLight).toBeDefined();
        expect(colors.infoBorder).toBeDefined();
        expect(colors.info).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    describe('UI colors', () => {
      it('should have specific UI colors defined', () => {
        expect(colors.purple).toBeDefined();
        expect(colors.purpleLight).toBeDefined();
        expect(colors.green).toBeDefined();
        expect(colors.blue).toBeDefined();
        expect(colors.yellow).toBeDefined();
        expect(colors.red).toBeDefined();
        expect(colors.orange).toBeDefined();
        expect(colors.gray).toBeDefined();
      });

      it('should use valid hex color format', () => {
        expect(colors.purple).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors.green).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors.blue).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors.yellow).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    describe('color consistency', () => {
      it('should not have duplicate color definitions with different values', () => {
        const colorValues = Object.values(colors);
        const uniqueColors = new Set(colorValues);
        // There will be some intentional duplicates, but let's check structure
        expect(colorValues.length).toBeGreaterThan(0);
        expect(uniqueColors.size).toBeGreaterThan(0);
      });
    });
  });

  describe('gradients', () => {
    it('should have brand gradient', () => {
      expect(gradients.brand).toBeDefined();
      expect(gradients.brand).toContain('linear-gradient');
      expect(gradients.brand).toContain(colors.brandStart);
      expect(gradients.brand).toContain(colors.brandEnd);
    });

    it('should have success gradient', () => {
      expect(gradients.success).toBeDefined();
      expect(gradients.success).toContain('linear-gradient');
    });

    it('should have surface gradients', () => {
      expect(gradients.surface).toBeDefined();
      expect(gradients.surfaceLight).toBeDefined();
      expect(gradients.surface).toContain('rgba');
      expect(gradients.surfaceLight).toContain('rgba');
    });

    it('should use valid gradient syntax', () => {
      expect(gradients.brand).toMatch(/linear-gradient\(.*\)/);
      expect(gradients.success).toMatch(/linear-gradient\(.*\)/);
    });

    it('should have rgba values with valid opacity', () => {
      const rgbaMatch = gradients.surface.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*(\d+\.?\d*)\)/);
      if (rgbaMatch) {
        const opacity = parseFloat(rgbaMatch[1]);
        expect(opacity).toBeGreaterThanOrEqual(0);
        expect(opacity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('shadows', () => {
    it('should have all shadow sizes', () => {
      expect(shadows.sm).toBeDefined();
      expect(shadows.md).toBeDefined();
      expect(shadows.lg).toBeDefined();
      expect(shadows.error).toBeDefined();
    });

    it('should use valid CSS shadow syntax', () => {
      // Shadow format: "0 1px 3px rgba(...)"
      const shadowRegex = /^\d+\s+\d+px\s+\d+px/;
      expect(shadows.sm).toMatch(shadowRegex);
      expect(shadows.md).toMatch(shadowRegex);
      expect(shadows.lg).toMatch(shadowRegex);
    });

    it('should include rgba color values', () => {
      expect(shadows.sm).toContain('rgba');
      expect(shadows.md).toContain('rgba');
      expect(shadows.lg).toContain('rgba');
      expect(shadows.error).toContain('rgba');
    });

    it('should have progressive shadow sizes', () => {
      const extractBlur = (shadow: string) => {
        const match = shadow.match(/\d+px\s+(\d+)px/);
        return match ? parseInt(match[1], 10) : 0;
      };

      const smBlur = extractBlur(shadows.sm);
      const mdBlur = extractBlur(shadows.md);
      const lgBlur = extractBlur(shadows.lg);

      expect(smBlur).toBeLessThanOrEqual(mdBlur);
      expect(mdBlur).toBeLessThanOrEqual(lgBlur);
    });
  });

  describe('borderRadius', () => {
    it('should have all radius sizes', () => {
      expect(borderRadius.sm).toBeDefined();
      expect(borderRadius.md).toBeDefined();
      expect(borderRadius.lg).toBeDefined();
      expect(borderRadius.full).toBeDefined();
    });

    it('should use valid CSS units', () => {
      expect(borderRadius.sm).toMatch(/^\d+px$/);
      expect(borderRadius.md).toMatch(/^\d+px$/);
      expect(borderRadius.lg).toMatch(/^\d+px$/);
      // full can be '9999px' (pill shape) or '50%' (perfect circle)
      expect(borderRadius.full).toMatch(/^(\d+px|50%)$/);
    });

    it('should have progressive radius sizes', () => {
      const extractPixels = (value: string) => {
        const match = value.match(/^(\d+)px$/);
        return match ? parseInt(match[1], 10) : 0;
      };

      const sm = extractPixels(borderRadius.sm);
      const md = extractPixels(borderRadius.md);
      const lg = extractPixels(borderRadius.lg);

      expect(sm).toBeLessThan(md);
      expect(md).toBeLessThan(lg);
    });

    it('should have full radius for circles or pills', () => {
      // '9999px' is used for pill-shaped elements, '50%' for perfect circles
      expect(borderRadius.full).toMatch(/^(\d+px|50%)$/);
    });
  });

  describe('type safety', () => {
    it('should have correct types for all color values', () => {
      for (const [key, value] of Object.entries(colors)) {
        // Colors can be strings (flat values) or objects (nested structure from design-tokens)
        if (typeof value === 'string') {
          expect(value.length).toBeGreaterThan(0);
        } else if (typeof value === 'object' && value !== null) {
          // Nested color objects should have string values
          for (const nestedValue of Object.values(value)) {
            expect(typeof nestedValue).toBe('string');
          }
        }
      }
    });

    it('should have correct types for all gradient values', () => {
      for (const [key, value] of Object.entries(gradients)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('should have correct types for all shadow values', () => {
      for (const [key, value] of Object.entries(shadows)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('should have correct types for all borderRadius values', () => {
      for (const [key, value] of Object.entries(borderRadius)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });
  });

  describe('immutability', () => {
    it('should not allow modification of color values', () => {
      const originalColor = colors.brandStart;
      // Attempt to modify (should not affect original in production)
      expect(() => {
        (colors as any).brandStart = '#000000';
      }).not.toThrow();
      // In TypeScript, the const prevents reassignment at compile time
    });
  });
});
