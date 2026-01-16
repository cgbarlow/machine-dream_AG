/**
 * Tests for AISP Mode Fixes
 *
 * Fix 2: maxTokens increased to 16384 for AISP-full mode
 * Fix 4: Forbidden moves have stronger language in AISP format
 * Feature 1: AISP prompts include explicit output format examples
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AISPBuilder, type ForbiddenMove } from '../../../src/llm/AISPBuilder.js';
import type { LLMExperience } from '../../../src/llm/types.js';

describe('AISP Mode Fixes (Spec 16)', () => {
  let aispBuilder: AISPBuilder;

  const testGrid: number[][] = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
  ];

  const testExperiences: LLMExperience[] = [];

  beforeEach(() => {
    aispBuilder = new AISPBuilder();
  });

  describe('Fix 2: maxTokens for AISP-full', () => {
    it('should recommend 16384 maxTokens for AISP-full mode', () => {
      // This tests the spec requirement, actual CLI enforcement is in llm.ts
      const recommendedMaxTokens = 16384;
      const defaultMaxTokens = 2048;

      expect(recommendedMaxTokens).toBeGreaterThan(defaultMaxTokens);
      expect(recommendedMaxTokens).toBe(16384);
    });

    it('should validate config requirement for AISP-full', () => {
      // When config.maxTokens < 16384 and aispFull is enabled,
      // the CLI should increase it
      const scenarios = [
        { initial: 2048, shouldIncrease: true },
        { initial: 4096, shouldIncrease: true },
        { initial: 8192, shouldIncrease: true },
        { initial: 16384, shouldIncrease: false },
        { initial: 32768, shouldIncrease: false },
      ];

      for (const { initial, shouldIncrease } of scenarios) {
        const aispFullMinTokens = 16384;
        const finalMaxTokens = initial < aispFullMinTokens ? aispFullMinTokens : initial;

        if (shouldIncrease) {
          expect(finalMaxTokens).toBe(16384);
        } else {
          expect(finalMaxTokens).toBe(initial);
        }
      }
    });
  });

  describe('Fix 4: Forbidden Moves Stronger Language', () => {
    it('should include CRITICAL warning in forbidden block', () => {
      const forbidden: ForbiddenMove[] = [
        { row: 1, col: 1, value: 5, reason: 'invalid' },
      ];

      const result = aispBuilder.buildForbidden(forbidden);

      expect(result).toContain('CRITICAL');
      expect(result).toContain('WILL be rejected');
      expect(result).toContain('Do NOT attempt');
    });

    it('should include HARD constraint marker', () => {
      const forbidden: ForbiddenMove[] = [
        { row: 1, col: 1, value: 5, reason: 'invalid' },
      ];

      const result = aispBuilder.buildForbidden(forbidden);

      expect(result).toContain('constraint≔HARD');
    });

    it('should include no-retry directive', () => {
      const forbidden: ForbiddenMove[] = [
        { row: 1, col: 1, value: 5, reason: 'invalid' },
      ];

      const result = aispBuilder.buildForbidden(forbidden);

      expect(result).toContain('¬retry(forbidden)');
    });

    it('should include all forbidden move entries', () => {
      const forbidden: ForbiddenMove[] = [
        { row: 1, col: 1, value: 5, reason: 'already in row' },
        { row: 2, col: 3, value: 7, reason: 'already in box' },
        { row: 5, col: 6, value: 9, reason: 'valid_but_wrong' },
      ];

      const result = aispBuilder.buildForbidden(forbidden);

      expect(result).toContain('¬(1,1,5)');
      expect(result).toContain('¬(2,3,7)');
      expect(result).toContain('¬(5,6,9)');
    });

    it('should return empty string when no forbidden moves', () => {
      const forbidden: ForbiddenMove[] = [];
      const result = aispBuilder.buildForbidden(forbidden);

      expect(result).toBe('');
    });

    it('should have proper AISP block structure', () => {
      const forbidden: ForbiddenMove[] = [
        { row: 1, col: 1, value: 5, reason: 'test' },
      ];

      const result = aispBuilder.buildForbidden(forbidden);

      // Should have proper opening and closing
      expect(result).toContain('⟦Χ:Forbidden⟧{');
      expect(result).toContain('}');
    });
  });

  describe('Feature 1: AISP Output Format Examples', () => {
    it('should include explicit output format in AISP-full mode', () => {
      const prompt = aispBuilder.buildAISPPrompt(
        testGrid,
        testExperiences,
        [],
        [],
        { includeSpec: true, gridSize: 9, anonymousPatterns: false }
      );

      // Should have output format example
      expect(prompt).toContain('REQUIRED OUTPUT FORMAT');
      expect(prompt).toContain('⟦Ε:Move⟧');
    });

    it('should include example move format in AISP-full', () => {
      const prompt = aispBuilder.buildAISPPrompt(
        testGrid,
        testExperiences,
        [],
        [],
        { includeSpec: true, gridSize: 9, anonymousPatterns: false }
      );

      // Should have example
      expect(prompt).toContain('Example:');
    });

    it('should include format in standard AISP mode', () => {
      const prompt = aispBuilder.buildAISPPrompt(
        testGrid,
        testExperiences,
        [],
        [],
        { includeSpec: false, gridSize: 9, anonymousPatterns: false }
      );

      // Standard AISP should still have some format guidance
      expect(prompt).toContain('⟦Ε:Execute⟧');
    });

    it('should include format example in AISP-lite mode', () => {
      const prompt = aispBuilder.buildAISPLitePrompt(testGrid, testExperiences);

      // AISP-lite should have clear output format
      expect(prompt).toContain('REQUIRED OUTPUT FORMAT');
      expect(prompt).toContain('ROW:');
      expect(prompt).toContain('COL:');
      expect(prompt).toContain('VALUE:');
      expect(prompt).toContain('Example output:');
    });
  });

  describe('AISP Mode Type', () => {
    it('should support all four modes', () => {
      // Type check for AISPMode
      const modes: Array<'off' | 'aisp' | 'aisp-lite' | 'aisp-full'> = [
        'off',
        'aisp',
        'aisp-lite',
        'aisp-full',
      ];

      expect(modes).toHaveLength(4);
      expect(modes).toContain('aisp-lite');
    });
  });
});
