import { describe, it, expect, beforeEach } from '@jest/globals';
import { genreConventionsService } from '../genre-conventions.service';
import type { GenreConvention, ValidationResult, ConventionCheck } from '../genre-conventions.service';

describe('GenreConventionsService', () => {
  describe('getAvailableGenres', () => {
    it('should return a list of available genres', () => {
      const genres = genreConventionsService.getAvailableGenres();

      expect(genres).toBeDefined();
      expect(Array.isArray(genres)).toBe(true);
      expect(genres.length).toBeGreaterThan(0);
    });

    it('should include common genres', () => {
      const genres = genreConventionsService.getAvailableGenres();

      expect(genres).toContain('romance');
      expect(genres).toContain('mystery');
      expect(genres).toContain('fantasy');
      expect(genres).toContain('science-fiction');
      expect(genres).toContain('horror');
      expect(genres).toContain('thriller');
      expect(genres).toContain('literary');
    });
  });

  describe('getGenreConventions', () => {
    describe('Romance genre', () => {
      it('should return conventions for romance genre', () => {
        const conventions = genreConventionsService.getGenreConventions('romance');

        expect(conventions).toBeDefined();
        expect(Array.isArray(conventions)).toBe(true);
        expect(conventions.length).toBeGreaterThan(0);
      });

      it('should include required romance conventions', () => {
        const conventions = genreConventionsService.getGenreConventions('romance');
        const conventionNames = conventions.map(c => c.name);

        expect(conventionNames).toContain('Central Love Story');
        expect(conventionNames).toContain('Happily Ever After (HEA) or Happy For Now (HFN)');
        expect(conventionNames).toContain('Emotional Focus');
      });

      it('should have proper convention structure', () => {
        const conventions = genreConventionsService.getGenreConventions('romance');
        const firstConvention = conventions[0];

        expect(firstConvention).toHaveProperty('name');
        expect(firstConvention).toHaveProperty('description');
        expect(firstConvention).toHaveProperty('required');
        expect(firstConvention).toHaveProperty('category');
        expect(firstConvention).toHaveProperty('examples');
        expect(Array.isArray(firstConvention.examples)).toBe(true);
      });

      it('should have both required and optional conventions', () => {
        const conventions = genreConventionsService.getGenreConventions('romance');
        const requiredCount = conventions.filter(c => c.required).length;
        const optionalCount = conventions.filter(c => !c.required).length;

        expect(requiredCount).toBeGreaterThan(0);
        expect(optionalCount).toBeGreaterThan(0);
      });
    });

    describe('Mystery genre', () => {
      it('should return conventions for mystery genre', () => {
        const conventions = genreConventionsService.getGenreConventions('mystery');

        expect(conventions).toBeDefined();
        expect(conventions.length).toBeGreaterThan(0);
      });

      it('should include required mystery conventions', () => {
        const conventions = genreConventionsService.getGenreConventions('mystery');
        const conventionNames = conventions.map(c => c.name);

        expect(conventionNames).toContain('Central Mystery/Crime');
        expect(conventionNames).toContain('Fair Play Clues');
        expect(conventionNames).toContain('Logical Resolution');
        expect(conventionNames).toContain('Investigation Process');
      });

      it('should include optional mystery conventions', () => {
        const conventions = genreConventionsService.getGenreConventions('mystery');
        const optionalConventions = conventions.filter(c => !c.required);

        expect(optionalConventions.length).toBeGreaterThan(0);
        expect(optionalConventions.some(c => c.name === 'Red Herrings')).toBe(true);
      });
    });

    describe('Fantasy genre', () => {
      it('should return conventions for fantasy genre', () => {
        const conventions = genreConventionsService.getGenreConventions('fantasy');

        expect(conventions).toBeDefined();
        expect(conventions.length).toBeGreaterThan(0);
      });

      it('should include required fantasy conventions', () => {
        const conventions = genreConventionsService.getGenreConventions('fantasy');
        const conventionNames = conventions.map(c => c.name);

        expect(conventionNames).toContain('Magic System or Supernatural Elements');
        expect(conventionNames).toContain('World-Building');
      });
    });

    describe('Science Fiction genre', () => {
      it('should return conventions for science-fiction genre', () => {
        const conventions = genreConventionsService.getGenreConventions('science-fiction');

        expect(conventions).toBeDefined();
        expect(conventions.length).toBeGreaterThan(0);
      });

      it('should include required sci-fi conventions', () => {
        const conventions = genreConventionsService.getGenreConventions('science-fiction');
        const conventionNames = conventions.map(c => c.name);

        expect(conventionNames).toContain('Speculative Technology or Science');
        expect(conventionNames).toContain('Extrapolation from Current Science');
        expect(conventionNames).toContain('Futuristic or Alternative Setting');
      });
    });

    describe('Horror genre', () => {
      it('should return conventions for horror genre', () => {
        const conventions = genreConventionsService.getGenreConventions('horror');

        expect(conventions).toBeDefined();
        expect(conventions.length).toBeGreaterThan(0);
      });

      it('should include required horror conventions', () => {
        const conventions = genreConventionsService.getGenreConventions('horror');
        const conventionNames = conventions.map(c => c.name);

        expect(conventionNames).toContain('Fear and Dread');
        expect(conventionNames).toContain('Threat or Monster');
        expect(conventionNames).toContain('Escalating Danger');
        expect(conventionNames).toContain('Dark Atmosphere');
      });
    });

    describe('Thriller genre', () => {
      it('should return conventions for thriller genre', () => {
        const conventions = genreConventionsService.getGenreConventions('thriller');

        expect(conventions).toBeDefined();
        expect(conventions.length).toBeGreaterThan(0);
      });

      it('should include required thriller conventions', () => {
        const conventions = genreConventionsService.getGenreConventions('thriller');
        const conventionNames = conventions.map(c => c.name);

        expect(conventionNames).toContain('High Stakes');
        expect(conventionNames).toContain('Fast Pacing');
        expect(conventionNames).toContain('Suspense and Tension');
      });
    });

    describe('Literary genre', () => {
      it('should return conventions for literary genre', () => {
        const conventions = genreConventionsService.getGenreConventions('literary');

        expect(conventions).toBeDefined();
        expect(conventions.length).toBeGreaterThan(0);
      });

      it('should include required literary conventions', () => {
        const conventions = genreConventionsService.getGenreConventions('literary');
        const conventionNames = conventions.map(c => c.name);

        expect(conventionNames).toContain('Character Depth');
        expect(conventionNames).toContain('Thematic Depth');
      });
    });

    describe('Unknown genre', () => {
      it('should return empty array for unknown genre', () => {
        const conventions = genreConventionsService.getGenreConventions('non-existent-genre');

        expect(conventions).toBeDefined();
        expect(Array.isArray(conventions)).toBe(true);
        expect(conventions.length).toBe(0);
      });

      it('should handle case-sensitive genre names', () => {
        const conventions = genreConventionsService.getGenreConventions('Romance');

        expect(conventions.length).toBe(0);
      });

      it('should return empty array for empty string', () => {
        const conventions = genreConventionsService.getGenreConventions('');

        expect(conventions).toBeDefined();
        expect(conventions.length).toBe(0);
      });
    });
  });

  describe('validateOutline', () => {
    describe('Romance validation', () => {
      it('should validate a strong romance outline', () => {
        const outline = `
          Sarah and James meet at a wedding and feel an instant connection.
          Despite initial misunderstandings, they fall deeply in love.
          The story focuses on their emotional journey as they overcome trust issues.
          They build a relationship based on mutual respect and understanding.
          In the finale, James proposes and Sarah accepts, committing to their future together.
          The ending shows them happy and planning their wedding.
        `;

        const result = genreConventionsService.validateOutline('romance', outline);

        expect(result).toBeDefined();
        expect(result.genre).toBe('romance');
        expect(result.overallScore).toBeGreaterThan(0.2);
        expect(result.checks.length).toBeGreaterThan(0);
        expect(result.summary).toBeDefined();
      });

      it('should identify missing HEA ending', () => {
        const outline = `
          Two characters meet and fall in love.
          They face relationship challenges and emotional conflicts.
          The story explores their feelings and connection.
          However, they decide to part ways in the end.
        `;

        const result = genreConventionsService.validateOutline('romance', outline);

        expect(result.overallScore).toBeLessThan(0.9);
        expect(result.warnings.length).toBeGreaterThan(0);
      });

      it('should provide suggestions for weak romance outline', () => {
        const outline = 'A story about a person living their daily life.';

        const result = genreConventionsService.validateOutline('romance', outline);

        expect(result.overallScore).toBeLessThan(0.5);
        expect(result.recommendations.length).toBeGreaterThan(0);
        expect(result.checks.some(c => c.suggestions && c.suggestions.length > 0)).toBe(true);
      });
    });

    describe('Mystery validation', () => {
      it('should validate a strong mystery outline', () => {
        const outline = `
          Detective Morgan investigates a murder at the mansion.
          The crime scene reveals crucial evidence including fingerprints and a mysterious note.
          She interviews multiple suspects, each with their own motives.
          Red herrings and false leads complicate the investigation.
          Morgan follows clues systematically, piecing together the puzzle.
          In the resolution, she logically explains how all evidence points to the butler.
          The mystery is solved with all clues tying together perfectly.
        `;

        const result = genreConventionsService.validateOutline('mystery', outline);

        expect(result.genre).toBe('mystery');
        expect(result.overallScore).toBeGreaterThan(0.3);
        expect(result.warnings.length).toBeLessThan(5);
      });

      it('should identify missing investigation process', () => {
        const outline = `
          A crime happens.
          The detective suddenly knows who did it.
          The criminal is arrested.
        `;

        const result = genreConventionsService.validateOutline('mystery', outline);

        expect(result.overallScore).toBeLessThan(0.6);
        expect(result.warnings.some(w => w.includes('Investigation Process'))).toBe(true);
      });

      it('should detect fair play clues', () => {
        const outline = `
          A theft occurs at the museum.
          The detective finds physical evidence at the scene.
          Witness testimony provides additional clues.
          The investigation reveals suspicious behavior from several people.
        `;

        const result = genreConventionsService.validateOutline('mystery', outline);
        const fairPlayCheck = result.checks.find(c => c.convention.name === 'Fair Play Clues');

        expect(fairPlayCheck).toBeDefined();
        expect(fairPlayCheck?.confidence).toBeGreaterThan(0);
      });
    });

    describe('Fantasy validation', () => {
      it('should validate a strong fantasy outline', () => {
        const outline = `
          In the magical realm of Eldoria, wizards cast powerful spells.
          Dragons soar through mystical skies protecting ancient treasures.
          The world has a rich history of enchanted kingdoms and legendary heroes.
          Our protagonist discovers a magical artifact and embarks on an epic quest.
          The magic system follows strict rules about elemental powers.
          A great evil threatens the realm, and our hero must save the world.
        `;

        const result = genreConventionsService.validateOutline('fantasy', outline);

        expect(result.genre).toBe('fantasy');
        expect(result.overallScore).toBeGreaterThan(0.3);
      });

      it('should require magic or supernatural elements', () => {
        const outline = `
          A person goes on a journey.
          They face challenges and overcome obstacles.
          They return home changed.
        `;

        const result = genreConventionsService.validateOutline('fantasy', outline);
        const magicCheck = result.checks.find(c => c.convention.name === 'Magic System or Supernatural Elements');

        expect(magicCheck).toBeDefined();
        expect(magicCheck?.met).toBe(false);
        expect(result.warnings.some(w => w.includes('Magic System'))).toBe(true);
      });
    });

    describe('Science Fiction validation', () => {
      it('should validate a strong sci-fi outline', () => {
        const outline = `
          In the year 2250, humanity has mastered interstellar space travel.
          Advanced AI systems manage the colony ships exploring alien worlds.
          The story explores the ethics of artificial intelligence and consciousness.
          Scientists discover evidence of alien life on a distant planet.
          Time travel technology creates philosophical questions about causality.
          The futuristic setting on a space station features advanced genetic engineering.
        `;

        const result = genreConventionsService.validateOutline('science-fiction', outline);

        expect(result.genre).toBe('science-fiction');
        expect(result.overallScore).toBeGreaterThan(0.3);
      });

      it('should require speculative technology', () => {
        const outline = 'A story about people having conversations in present day.';

        const result = genreConventionsService.validateOutline('science-fiction', outline);
        const techCheck = result.checks.find(c => c.convention.name === 'Speculative Technology or Science');

        expect(techCheck).toBeDefined();
        expect(techCheck?.met).toBe(false);
      });
    });

    describe('Horror validation', () => {
      it('should validate a strong horror outline', () => {
        const outline = `
          The abandoned house creates an atmosphere of dread and fear.
          A supernatural entity haunts the dark corridors.
          Tension builds as the threat becomes more dangerous.
          Characters experience psychological terror and suspense.
          The monster attacks with increasing intensity.
          Dark and ominous descriptions pervade the bleak setting.
          Body count rises as danger escalates throughout the story.
        `;

        const result = genreConventionsService.validateOutline('horror', outline);

        expect(result.genre).toBe('horror');
        expect(result.overallScore).toBeGreaterThan(0.3);
      });

      it('should require fear and dread', () => {
        const outline = 'A happy story about a sunny day at the beach.';

        const result = genreConventionsService.validateOutline('horror', outline);
        const fearCheck = result.checks.find(c => c.convention.name === 'Fear and Dread');

        expect(fearCheck).toBeDefined();
        expect(fearCheck?.met).toBe(false);
      });
    });

    describe('Thriller validation', () => {
      it('should validate a strong thriller outline', () => {
        const outline = `
          The protagonist faces life-or-death stakes as a bomb threatens the city.
          Fast-paced action sequences and chase scenes drive the story forward.
          Tension and suspense build with each cliffhanger chapter ending.
          Time is running out with only hours to prevent disaster.
          Multiple threats converge as enemies close in.
          A shocking betrayal reveals hidden identities.
          The pace never slows as revelations pile up.
        `;

        const result = genreConventionsService.validateOutline('thriller', outline);

        expect(result.genre).toBe('thriller');
        expect(result.overallScore).toBeGreaterThan(0.3);
      });

      it('should require high stakes', () => {
        const outline = 'A person tries to decide what to have for lunch.';

        const result = genreConventionsService.validateOutline('thriller', outline);
        const stakesCheck = result.checks.find(c => c.convention.name === 'High Stakes');

        expect(stakesCheck).toBeDefined();
        expect(stakesCheck?.met).toBe(false);
      });
    });

    describe('Literary validation', () => {
      it('should validate a strong literary outline', () => {
        const outline = `
          The protagonist is a complex character with deep psychological conflicts.
          The story explores themes of identity, mortality, and the human condition.
          Character development shows significant growth and moral ambiguity.
          Rich backstory reveals the character's motivations and inner life.
          Metaphors and symbolism add layers of meaning.
          The exploration questions the purpose and meaning of existence.
          The ending leaves some questions open for interpretation.
        `;

        const result = genreConventionsService.validateOutline('literary', outline);

        expect(result.genre).toBe('literary');
        expect(result.overallScore).toBeGreaterThan(0.3);
      });

      it('should require character depth', () => {
        const outline = 'A simple story with one-dimensional characters doing simple things.';

        const result = genreConventionsService.validateOutline('literary', outline);
        const depthCheck = result.checks.find(c => c.convention.name === 'Character Depth');

        expect(depthCheck).toBeDefined();
        expect(depthCheck?.confidence).toBeLessThan(0.5);
      });
    });

    describe('Unknown genre validation', () => {
      it('should handle unknown genre gracefully', () => {
        const outline = 'A story about something happening.';

        const result = genreConventionsService.validateOutline('unknown-genre', outline);

        expect(result).toBeDefined();
        expect(result.genre).toBe('unknown-genre');
        expect(result.overallScore).toBe(1.0);
        expect(result.checks.length).toBe(0);
        expect(result.warnings.length).toBe(1);
        expect(result.warnings[0]).toContain('No specific conventions defined');
        expect(result.summary).toBeDefined();
      });

      it('should not crash on empty genre', () => {
        const outline = 'Some content';

        const result = genreConventionsService.validateOutline('', outline);

        expect(result).toBeDefined();
        expect(result.checks.length).toBe(0);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty outline', () => {
        const result = genreConventionsService.validateOutline('romance', '');

        expect(result).toBeDefined();
        expect(result.overallScore).toBeLessThan(0.5);
        expect(result.checks.length).toBeGreaterThan(0);
        expect(result.checks.every(c => !c.met)).toBe(true);
      });

      it('should handle very short outline', () => {
        const result = genreConventionsService.validateOutline('mystery', 'A crime.');

        expect(result).toBeDefined();
        expect(result.overallScore).toBeLessThan(0.5);
      });

      it('should handle very long outline', () => {
        const longOutline = 'The story begins with a mystery. '.repeat(500);

        const result = genreConventionsService.validateOutline('mystery', longOutline);

        expect(result).toBeDefined();
        expect(result.overallScore).toBeGreaterThan(0);
      });

      it('should be case-insensitive for outline content', () => {
        const upperOutline = 'DETECTIVE INVESTIGATES MURDER CRIME SCENE EVIDENCE CLUES SUSPECTS MYSTERY SOLVED';
        const lowerOutline = 'detective investigates murder crime scene evidence clues suspects mystery solved';

        const upperResult = genreConventionsService.validateOutline('mystery', upperOutline);
        const lowerResult = genreConventionsService.validateOutline('mystery', lowerOutline);

        expect(upperResult.overallScore).toBeCloseTo(lowerResult.overallScore, 2);
      });

      it('should handle special characters in outline', () => {
        const outline = 'Detective @#$% investigates **MURDER** crime (evidence!) [clues] suspects?';

        const result = genreConventionsService.validateOutline('mystery', outline);

        expect(result).toBeDefined();
        expect(result.checks.length).toBeGreaterThan(0);
      });
    });

    describe('Validation result structure', () => {
      it('should return properly structured ValidationResult', () => {
        const result = genreConventionsService.validateOutline('romance', 'love story couple together commitment');

        expect(result).toHaveProperty('genre');
        expect(result).toHaveProperty('overallScore');
        expect(result).toHaveProperty('checks');
        expect(result).toHaveProperty('warnings');
        expect(result).toHaveProperty('recommendations');
        expect(result).toHaveProperty('summary');

        expect(typeof result.genre).toBe('string');
        expect(typeof result.overallScore).toBe('number');
        expect(Array.isArray(result.checks)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);
        expect(typeof result.summary).toBe('string');
      });

      it('should have overallScore between 0 and 1', () => {
        const results = [
          genreConventionsService.validateOutline('romance', 'perfect romance story love couple commitment happy ending together'),
          genreConventionsService.validateOutline('mystery', 'nothing relevant'),
          genreConventionsService.validateOutline('fantasy', 'magic wizard dragon spell quest'),
        ];

        results.forEach(result => {
          expect(result.overallScore).toBeGreaterThanOrEqual(0);
          expect(result.overallScore).toBeLessThanOrEqual(1);
        });
      });

      it('should return ConventionCheck with proper structure', () => {
        const result = genreConventionsService.validateOutline('romance', 'love story');
        const check = result.checks[0];

        expect(check).toHaveProperty('convention');
        expect(check).toHaveProperty('met');
        expect(check).toHaveProperty('confidence');

        expect(typeof check.met).toBe('boolean');
        expect(typeof check.confidence).toBe('number');
        expect(check.confidence).toBeGreaterThanOrEqual(0);
        expect(check.confidence).toBeLessThanOrEqual(1);

        expect(check.convention).toHaveProperty('name');
        expect(check.convention).toHaveProperty('description');
        expect(check.convention).toHaveProperty('required');
        expect(check.convention).toHaveProperty('category');
        expect(check.convention).toHaveProperty('examples');
      });

      it('should provide evidence when conventions are met', () => {
        const outline = `
          Detective investigates murder crime evidence suspects mystery.
          Investigation process includes examining the crime scene.
          Physical evidence and witness testimony provide clues.
          The detective methodically follows leads to solve the case.
          All evidence logically ties together in the resolution.
        `;
        const result = genreConventionsService.validateOutline('mystery', outline);

        const metChecks = result.checks.filter(c => c.met);
        expect(metChecks.length).toBeGreaterThan(0);
        expect(metChecks.some(c => c.evidence !== undefined)).toBe(true);
      });

      it('should provide suggestions when conventions are not met', () => {
        const result = genreConventionsService.validateOutline('romance', 'a story');

        const unmetChecks = result.checks.filter(c => !c.met);
        expect(unmetChecks.length).toBeGreaterThan(0);
        expect(unmetChecks.every(c => c.suggestions && c.suggestions.length > 0)).toBe(true);
      });

      it('should generate appropriate summary based on score', () => {
        const excellentOutline = 'love romance couple emotional relationship commitment together happy ending proposal marriage';
        const poorOutline = 'story';

        const excellentResult = genreConventionsService.validateOutline('romance', excellentOutline);
        const poorResult = genreConventionsService.validateOutline('romance', poorOutline);

        expect(excellentResult.summary).toContain('%');
        expect(poorResult.summary).toContain('%');
        expect(excellentResult.overallScore).toBeGreaterThan(poorResult.overallScore);
      });

      it('should generate warnings for missing required conventions', () => {
        const outline = 'a simple story without genre-specific elements';

        const result = genreConventionsService.validateOutline('mystery', outline);
        const requiredConventions = result.checks.filter(c => c.convention.required && !c.met);

        expect(requiredConventions.length).toBeGreaterThan(0);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('Missing required'))).toBe(true);
      });

      it('should generate recommendations for optional conventions', () => {
        const outline = 'detective crime investigation evidence clues mystery solved';

        const result = genreConventionsService.validateOutline('mystery', outline);
        const optionalConventions = result.checks.filter(c => !c.convention.required && !c.met);

        if (optionalConventions.length > 0) {
          expect(result.recommendations.some(r => r.includes('Consider strengthening'))).toBe(true);
        }
      });

      it('should provide genre-specific recommendations for low scores', () => {
        const result = genreConventionsService.validateOutline('thriller', 'a quiet day');

        expect(result.overallScore).toBeLessThan(0.5);
        expect(result.recommendations.length).toBeGreaterThan(0);
        expect(result.recommendations.some(r => r.includes('thriller'))).toBe(true);
      });
    });

    describe('Convention categories', () => {
      it('should validate structure category conventions', () => {
        const result = genreConventionsService.validateOutline('mystery', 'plot story arc chapter scene');
        const structureChecks = result.checks.filter(c => c.convention.category === 'structure');

        expect(structureChecks.length).toBeGreaterThan(0);
      });

      it('should validate character category conventions', () => {
        const result = genreConventionsService.validateOutline('literary', 'protagonist character development hero growth complex');
        const characterChecks = result.checks.filter(c => c.convention.category === 'character');

        expect(characterChecks.length).toBeGreaterThan(0);
      });

      it('should validate theme category conventions', () => {
        const result = genreConventionsService.validateOutline('literary', 'theme explores questions meaning identity');
        const themeChecks = result.checks.filter(c => c.convention.category === 'theme');

        expect(themeChecks.length).toBeGreaterThan(0);
      });

      it('should validate ending category conventions', () => {
        const result = genreConventionsService.validateOutline('romance', 'ending conclusion resolution finale happy together');
        const endingChecks = result.checks.filter(c => c.convention.category === 'ending');

        expect(endingChecks.length).toBeGreaterThan(0);
      });

      it('should validate pacing category conventions', () => {
        const result = genreConventionsService.validateOutline('thriller', 'pace fast action tension escalate quick');
        const pacingChecks = result.checks.filter(c => c.convention.category === 'pacing');

        expect(pacingChecks.length).toBeGreaterThan(0);
      });

      it('should validate tone category conventions', () => {
        const result = genreConventionsService.validateOutline('horror', 'dark atmosphere mood feeling dread fear');
        const toneChecks = result.checks.filter(c => c.convention.category === 'tone');

        expect(toneChecks.length).toBeGreaterThan(0);
      });
    });
  });
});
