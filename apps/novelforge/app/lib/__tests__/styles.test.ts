import { describe, it, expect } from 'vitest';
import {
  card,
  cardCompact,
  loadingContainer,
  loadingSpinner,
  loadingText,
  errorContainer,
  statusBadge,
  button,
  buttonPrimary,
  buttonSecondary,
  buttonDisabled,
  input,
  label,
  sidebar,
  header,
  pageTitle,
  pageSubtitle,
  statusDot,
  sectionHeading,
} from '../styles';
import { colors, gradients, shadows, borderRadius } from '../constants';
import type { CSSProperties } from 'react';

describe('styles', () => {
  describe('card styles', () => {
    describe('card', () => {
      it('should have background color', () => {
        expect(card.background).toBe(colors.surface);
      });

      it('should have border', () => {
        expect(card.border).toContain(colors.border);
        expect(card.border).toMatch(/^\d+px solid/);
      });

      it('should have border radius', () => {
        expect(card.borderRadius).toBe(borderRadius.lg);
      });

      it('should have padding', () => {
        expect(card.padding).toBeDefined();
        expect(card.padding).toMatch(/\d+(\.\d+)?rem/);
      });

      it('should have box shadow', () => {
        expect(card.boxShadow).toBe(shadows.sm);
      });
    });

    describe('cardCompact', () => {
      it('should extend card styles', () => {
        expect(cardCompact.background).toBe(card.background);
        expect(cardCompact.border).toBe(card.border);
        expect(cardCompact.borderRadius).toBe(card.borderRadius);
      });

      it('should have smaller padding than card', () => {
        const cardPadding = parseFloat(card.padding as string);
        const compactPadding = parseFloat(cardCompact.padding as string);
        expect(compactPadding).toBeLessThan(cardPadding);
      });
    });
  });

  describe('loading styles', () => {
    describe('loadingContainer', () => {
      it('should be full viewport height', () => {
        expect(loadingContainer.minHeight).toBe('100vh');
      });

      it('should be centered flexbox', () => {
        expect(loadingContainer.display).toBe('flex');
        expect(loadingContainer.alignItems).toBe('center');
        expect(loadingContainer.justifyContent).toBe('center');
      });

      it('should have background color', () => {
        expect(loadingContainer.background).toBe(colors.background);
      });
    });

    describe('loadingSpinner', () => {
      it('should be inline-block', () => {
        expect(loadingSpinner.display).toBe('inline-block');
      });

      it('should have dimensions', () => {
        expect(loadingSpinner.width).toBe('48px');
        expect(loadingSpinner.height).toBe('48px');
      });

      it('should have circular border', () => {
        expect(loadingSpinner.borderRadius).toBe(borderRadius.full);
        expect(loadingSpinner.border).toContain(colors.border);
      });

      it('should have animated top border', () => {
        expect(loadingSpinner.borderTopColor).toBe(colors.brandStart);
      });

      it('should have spin animation', () => {
        expect(loadingSpinner.animation).toContain('spin');
        expect(loadingSpinner.animation).toContain('1s');
        expect(loadingSpinner.animation).toContain('linear');
        expect(loadingSpinner.animation).toContain('infinite');
      });
    });

    describe('loadingText', () => {
      it('should have margin', () => {
        expect(loadingText.marginTop).toBeDefined();
      });

      it('should have secondary text color', () => {
        expect(loadingText.color).toBe(colors.textSecondary);
      });
    });
  });

  describe('error styles', () => {
    describe('errorContainer', () => {
      it('should have error light background', () => {
        expect(errorContainer.background).toBe(colors.errorLight);
      });

      it('should have error border', () => {
        expect(errorContainer.border).toContain(colors.errorBorder);
      });

      it('should have border radius', () => {
        expect(errorContainer.borderRadius).toBe(borderRadius.lg);
      });

      it('should have padding', () => {
        expect(errorContainer.padding).toBeDefined();
      });

      it('should have error text color', () => {
        expect(errorContainer.color).toBe(colors.error);
      });

      it('should have bottom margin', () => {
        expect(errorContainer.marginBottom).toBeDefined();
      });
    });
  });

  describe('statusBadge', () => {
    it('should return CSSProperties object', () => {
      const badge = statusBadge('setup');
      expect(badge).toHaveProperty('padding');
      expect(badge).toHaveProperty('background');
      expect(badge).toHaveProperty('color');
    });

    describe('status colors', () => {
      it('should use purple for setup', () => {
        const badge = statusBadge('setup');
        expect(badge.background).toContain(colors.purple);
        expect(badge.color).toBe(colors.purple);
      });

      it('should use orange for generating', () => {
        const badge = statusBadge('generating');
        expect(badge.background).toContain(colors.orange);
        expect(badge.color).toBe(colors.orange);
      });

      it('should use success for completed', () => {
        const badge = statusBadge('completed');
        expect(badge.background).toContain(colors.success);
        expect(badge.color).toBe(colors.success);
      });

      it('should use gray for unknown status', () => {
        const badge = statusBadge('unknown-status');
        expect(badge.background).toContain(colors.gray);
        expect(badge.color).toBe(colors.gray);
      });
    });

    describe('badge styling', () => {
      it('should have padding', () => {
        const badge = statusBadge('setup');
        expect(badge.padding).toBeDefined();
        expect(badge.padding).toMatch(/\d+(\.\d+)?rem/);
      });

      it('should have rounded border', () => {
        const badge = statusBadge('setup');
        expect(badge.borderRadius).toBe('20px');
      });

      it('should have small font size', () => {
        const badge = statusBadge('setup');
        expect(badge.fontSize).toBe('0.75rem');
      });

      it('should have medium font weight', () => {
        const badge = statusBadge('setup');
        expect(badge.fontWeight).toBe('500');
      });

      it('should capitalise text', () => {
        const badge = statusBadge('setup');
        expect(badge.textTransform).toBe('capitalize');
      });

      it('should have semi-transparent background', () => {
        const badge = statusBadge('setup');
        // Background should be color + opacity suffix (e.g., "#667eea15")
        expect(badge.background).toMatch(/#[0-9A-Fa-f]{6}15$/);
      });
    });

    describe('consistency', () => {
      it('should return same result for same status', () => {
        const badge1 = statusBadge('completed');
        const badge2 = statusBadge('completed');
        expect(badge1).toEqual(badge2);
      });

      it('should return different colors for different statuses', () => {
        const setup = statusBadge('setup');
        const completed = statusBadge('completed');
        expect(setup.color).not.toBe(completed.color);
      });
    });
  });

  describe('button styles', () => {
    describe('button base', () => {
      it('should have padding', () => {
        expect(button.padding).toBeDefined();
        expect(button.padding).toMatch(/\d+(\.\d+)?rem/);
      });

      it('should have border radius', () => {
        expect(button.borderRadius).toBe(borderRadius.md);
      });

      it('should have no border', () => {
        expect(button.border).toBe('none');
      });

      it('should have font properties', () => {
        expect(button.fontSize).toBe('1rem');
        expect(button.fontWeight).toBe(600);
      });

      it('should have pointer cursor', () => {
        expect(button.cursor).toBe('pointer');
      });

      it('should have transition', () => {
        expect(button.transition).toBeDefined();
        expect(button.transition).toContain('all');
      });
    });

    describe('buttonPrimary', () => {
      it('should extend button base', () => {
        expect(buttonPrimary.padding).toBe(button.padding);
        expect(buttonPrimary.borderRadius).toBe(button.borderRadius);
      });

      it('should have brand gradient background', () => {
        expect(buttonPrimary.background).toBe(gradients.brand);
      });

      it('should have surface color text', () => {
        expect(buttonPrimary.color).toBe(colors.surface);
      });

      it('should have box shadow', () => {
        expect(buttonPrimary.boxShadow).toBe(shadows.md);
      });
    });

    describe('buttonSecondary', () => {
      it('should extend button base', () => {
        expect(buttonSecondary.padding).toBe(button.padding);
        expect(buttonSecondary.borderRadius).toBe(button.borderRadius);
      });

      it('should have surface background', () => {
        expect(buttonSecondary.background).toBe(colors.surface);
      });

      it('should have border', () => {
        expect(buttonSecondary.border).toContain(colors.border);
      });

      it('should have secondary text color', () => {
        expect(buttonSecondary.color).toBe(colors.textSecondary);
      });
    });

    describe('buttonDisabled', () => {
      it('should have reduced opacity', () => {
        expect(buttonDisabled.opacity).toBe(0.5);
      });

      it('should have not-allowed cursor', () => {
        expect(buttonDisabled.cursor).toBe('not-allowed');
      });
    });
  });

  describe('input styles', () => {
    describe('input', () => {
      it('should be full width', () => {
        expect(input.width).toBe('100%');
      });

      it('should have padding', () => {
        expect(input.padding).toBeDefined();
        expect(input.padding).toMatch(/\d+(\.\d+)?rem/);
      });

      it('should have surface background', () => {
        expect(input.background).toBe(colors.surface);
      });

      it('should have border', () => {
        expect(input.border).toContain(colors.border);
      });

      it('should have border radius', () => {
        expect(input.borderRadius).toBe(borderRadius.sm);
      });

      it('should have text color', () => {
        expect(input.color).toBe(colors.text);
      });

      it('should have font size', () => {
        expect(input.fontSize).toBe('1rem');
      });
    });

    describe('label', () => {
      it('should be block display', () => {
        expect(label.display).toBe('block');
      });

      it('should have bottom margin', () => {
        expect(label.marginBottom).toBeDefined();
      });

      it('should have dark color', () => {
        expect(label.color).toBeDefined();
        expect(label.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      it('should have medium font weight', () => {
        expect(label.fontWeight).toBe(600);
      });

      it('should have small font size', () => {
        expect(label.fontSize).toBe('0.875rem');
      });
    });
  });

  describe('layout styles', () => {
    describe('sidebar', () => {
      it('should have fixed width', () => {
        expect(sidebar.width).toBe('72px');
      });

      it('should have surface background', () => {
        expect(sidebar.background).toBe(colors.surface);
      });

      it('should have right border', () => {
        expect(sidebar.borderRight).toContain(colors.border);
      });

      it('should be flexbox column', () => {
        expect(sidebar.display).toBe('flex');
        expect(sidebar.flexDirection).toBe('column');
      });

      it('should center items', () => {
        expect(sidebar.alignItems).toBe('center');
      });

      it('should have padding', () => {
        expect(sidebar.padding).toBeDefined();
      });
    });

    describe('header', () => {
      it('should have padding', () => {
        expect(header.padding).toBeDefined();
      });

      it('should have surface background', () => {
        expect(header.background).toBe(colors.surface);
      });

      it('should have bottom border', () => {
        expect(header.borderBottom).toContain(colors.border);
      });

      it('should be flexbox', () => {
        expect(header.display).toBe('flex');
      });

      it('should space between items', () => {
        expect(header.justifyContent).toBe('space-between');
      });

      it('should center items vertically', () => {
        expect(header.alignItems).toBe('center');
      });
    });

    describe('pageTitle', () => {
      it('should have large font size', () => {
        expect(pageTitle.fontSize).toBe('1.5rem');
      });

      it('should have bold font weight', () => {
        expect(pageTitle.fontWeight).toBe('700');
      });

      it('should have text color', () => {
        expect(pageTitle.color).toBe(colors.text);
      });

      it('should have no margin', () => {
        expect(pageTitle.margin).toBe(0);
      });
    });

    describe('pageSubtitle', () => {
      it('should have small font size', () => {
        expect(pageSubtitle.fontSize).toBe('0.875rem');
      });

      it('should have secondary text color', () => {
        expect(pageSubtitle.color).toBe(colors.textSecondary);
      });

      it('should have no margin', () => {
        expect(pageSubtitle.margin).toBe(0);
      });
    });
  });

  describe('statusDot', () => {
    it('should return CSSProperties object', () => {
      const dot = statusDot(true);
      expect(dot).toHaveProperty('width');
      expect(dot).toHaveProperty('height');
      expect(dot).toHaveProperty('borderRadius');
      expect(dot).toHaveProperty('background');
    });

    describe('dimensions', () => {
      it('should be square', () => {
        const dot = statusDot(true);
        expect(dot.width).toBe('8px');
        expect(dot.height).toBe('8px');
      });

      it('should be circular', () => {
        const dot = statusDot(true);
        expect(dot.borderRadius).toBe(borderRadius.full);
      });
    });

    describe('colors', () => {
      it('should be green when active', () => {
        const dot = statusDot(true);
        expect(dot.background).toBe(colors.green);
      });

      it('should be red when inactive', () => {
        const dot = statusDot(false);
        expect(dot.background).toBe(colors.red);
      });
    });

    describe('consistency', () => {
      it('should return same result for same active state', () => {
        const dot1 = statusDot(true);
        const dot2 = statusDot(true);
        expect(dot1).toEqual(dot2);
      });

      it('should return different colors for different states', () => {
        const activeDot = statusDot(true);
        const inactiveDot = statusDot(false);
        expect(activeDot.background).not.toBe(inactiveDot.background);
      });
    });
  });

  describe('sectionHeading', () => {
    it('should have small font size', () => {
      expect(sectionHeading.fontSize).toBe('0.875rem');
    });

    it('should have secondary text color', () => {
      expect(sectionHeading.color).toBe(colors.textSecondary);
    });

    it('should have bottom margin', () => {
      expect(sectionHeading.marginBottom).toBeDefined();
    });
  });

  describe('type safety', () => {
    it('should return valid CSSProperties for all style objects', () => {
      const styles: CSSProperties[] = [
        card,
        cardCompact,
        loadingContainer,
        loadingSpinner,
        loadingText,
        errorContainer,
        button,
        buttonPrimary,
        buttonSecondary,
        buttonDisabled,
        input,
        label,
        sidebar,
        header,
        pageTitle,
        pageSubtitle,
        sectionHeading,
      ];

      for (const style of styles) {
        expect(style).toBeDefined();
        expect(typeof style).toBe('object');
      }
    });

    it('should return valid CSSProperties for function styles', () => {
      const badge = statusBadge('setup');
      const dot = statusDot(true);

      expect(badge).toBeDefined();
      expect(typeof badge).toBe('object');
      expect(dot).toBeDefined();
      expect(typeof dot).toBe('object');
    });
  });

  describe('integration with constants', () => {
    it('should use colors from constants', () => {
      expect(card.background).toBe(colors.surface);
      expect(errorContainer.color).toBe(colors.error);
      expect(buttonPrimary.color).toBe(colors.surface);
    });

    it('should use gradients from constants', () => {
      expect(buttonPrimary.background).toBe(gradients.brand);
    });

    it('should use shadows from constants', () => {
      expect(card.boxShadow).toBe(shadows.sm);
      expect(buttonPrimary.boxShadow).toBe(shadows.md);
    });

    it('should use borderRadius from constants', () => {
      expect(card.borderRadius).toBe(borderRadius.lg);
      expect(button.borderRadius).toBe(borderRadius.md);
      expect(input.borderRadius).toBe(borderRadius.sm);
    });
  });

  describe('consistency and patterns', () => {
    it('should use consistent padding units (rem)', () => {
      const paddingValues = [
        card.padding,
        cardCompact.padding,
        button.padding,
        input.padding,
      ];

      for (const padding of paddingValues) {
        expect(padding).toMatch(/rem/);
      }
    });

    it('should use consistent font size units (rem or px)', () => {
      const fontSizes = [
        button.fontSize,
        input.fontSize,
        pageTitle.fontSize,
        pageSubtitle.fontSize,
      ];

      for (const fontSize of fontSizes) {
        expect(fontSize).toMatch(/rem|px/);
      }
    });

    it('should use consistent border syntax', () => {
      const borders = [
        card.border,
        errorContainer.border,
        buttonSecondary.border,
        input.border,
      ];

      for (const border of borders) {
        expect(border).toMatch(/^\d+px solid #[0-9A-Fa-f]{6}$/);
      }
    });
  });

  describe('accessibility considerations', () => {
    it('should have visible focus states (cursor pointer for interactive elements)', () => {
      expect(button.cursor).toBe('pointer');
      expect(buttonDisabled.cursor).toBe('not-allowed');
    });

    it('should have sufficient color contrast for text', () => {
      // Primary text on light background
      expect(colors.text).toBeDefined();
      // This is a basic check - real contrast testing would need more logic
      expect(colors.text).not.toBe(colors.surface);
    });

    it('should distinguish disabled state visually', () => {
      expect(buttonDisabled.opacity).toBeLessThan(1);
      expect(buttonDisabled.cursor).toBe('not-allowed');
    });
  });
});
