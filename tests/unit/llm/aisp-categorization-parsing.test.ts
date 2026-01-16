/**
 * Tests for AISP Categorization Response Parsing
 *
 * Spec 16: AISP Mode Integration - Section 4.13
 * ADR-015: AISP Response Parsing Robustness
 *
 * Tests the tolerant regex that handles both P1 and P{1} formats.
 */

import { describe, it, expect } from 'vitest';

describe('AISP Categorization Parsing (Spec 16 Section 4.13)', () => {
  // The regex under test - same as in LLMClusterV2.ts
  const PATTERN_REGEX = /(?:exp\[\d+\]→)?P\{?(\d+)\}?/i;

  /**
   * Parse a pattern number from a line of LLM response.
   * Returns null if no match found.
   */
  const parsePatternNum = (line: string): number | null => {
    const trimmed = line.trim();
    const match = trimmed.match(PATTERN_REGEX);
    return match ? parseInt(match[1], 10) : null;
  };

  describe('Standard formats (no braces)', () => {
    it('should parse P1, P2, P3', () => {
      expect(parsePatternNum('P1')).toBe(1);
      expect(parsePatternNum('P2')).toBe(2);
      expect(parsePatternNum('P3')).toBe(3);
    });

    it('should parse double-digit patterns', () => {
      expect(parsePatternNum('P10')).toBe(10);
      expect(parsePatternNum('P15')).toBe(15);
      expect(parsePatternNum('P99')).toBe(99);
    });

    it('should parse exp[n]→Pm format', () => {
      expect(parsePatternNum('exp[0]→P1')).toBe(1);
      expect(parsePatternNum('exp[5]→P3')).toBe(3);
      expect(parsePatternNum('exp[35]→P7')).toBe(7);
    });
  });

  describe('Curly brace formats (the fix)', () => {
    it('should parse P{1}, P{2}, P{3}', () => {
      expect(parsePatternNum('P{1}')).toBe(1);
      expect(parsePatternNum('P{2}')).toBe(2);
      expect(parsePatternNum('P{3}')).toBe(3);
    });

    it('should parse double-digit patterns with braces', () => {
      expect(parsePatternNum('P{10}')).toBe(10);
      expect(parsePatternNum('P{15}')).toBe(15);
      expect(parsePatternNum('P{99}')).toBe(99);
    });

    it('should parse exp[n]→P{m} format with braces', () => {
      expect(parsePatternNum('exp[0]→P{1}')).toBe(1);
      expect(parsePatternNum('exp[5]→P{3}')).toBe(3);
      expect(parsePatternNum('exp[35]→P{7}')).toBe(7);
    });
  });

  describe('Case insensitivity', () => {
    it('should handle lowercase p', () => {
      expect(parsePatternNum('p1')).toBe(1);
      expect(parsePatternNum('p{2}')).toBe(2);
    });

    it('should handle mixed case in exp prefix', () => {
      expect(parsePatternNum('EXP[0]→P1')).toBe(1);
      expect(parsePatternNum('Exp[0]→p{2}')).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should return null for empty string', () => {
      expect(parsePatternNum('')).toBeNull();
    });

    it('should return null for garbage input', () => {
      expect(parsePatternNum('garbage')).toBeNull();
      expect(parsePatternNum('not a pattern')).toBeNull();
      expect(parsePatternNum('Pattern 1')).toBeNull();
    });

    it('should handle P0 (no match indicator)', () => {
      expect(parsePatternNum('P0')).toBe(0);
      expect(parsePatternNum('P{0}')).toBe(0);
      expect(parsePatternNum('exp[0]→P0')).toBe(0);
      expect(parsePatternNum('exp[0]→P{0}')).toBe(0);
    });

    it('should handle leading/trailing whitespace', () => {
      expect(parsePatternNum('  P1  ')).toBe(1);
      expect(parsePatternNum('\tP{2}\n')).toBe(2);
      expect(parsePatternNum('  exp[0]→P3  ')).toBe(3);
    });

    it('should still match P when spaces around arrow (tolerant parsing)', () => {
      // The regex is tolerant - it finds P{n} anywhere in the line
      // This is by design for robustness with LLM variations
      expect(parsePatternNum('exp[0] → P1')).toBe(1);
      expect(parsePatternNum('exp[0] →P1')).toBe(1);
      expect(parsePatternNum('exp[0]→ P1')).toBe(1);
    });

    it('should handle only opening brace (malformed)', () => {
      // P{1 without closing brace - regex still captures the number
      expect(parsePatternNum('P{1')).toBe(1);
    });

    it('should handle only closing brace (malformed)', () => {
      // P1} with extra closing brace - regex captures the number
      expect(parsePatternNum('P1}')).toBe(1);
    });
  });

  describe('Multi-line response parsing', () => {
    /**
     * Simulates parsing a full LLM response with multiple lines.
     */
    const parseResponse = (response: string, batchSize: number): number[] => {
      const lines = response.trim().split('\n');
      const results: number[] = [];
      for (let i = 0; i < batchSize; i++) {
        const line = lines[i]?.trim() || '';
        const num = parsePatternNum(line);
        results.push(num ?? 0); // null becomes 0 (uncategorized)
      }
      return results;
    };

    it('should parse all-AISP response', () => {
      const response = `exp[0]→P1
exp[1]→P2
exp[2]→P3
exp[3]→P1`;
      expect(parseResponse(response, 4)).toEqual([1, 2, 3, 1]);
    });

    it('should parse all-curly-brace response', () => {
      const response = `exp[0]→P{1}
exp[1]→P{2}
exp[2]→P{3}
exp[3]→P{1}`;
      expect(parseResponse(response, 4)).toEqual([1, 2, 3, 1]);
    });

    it('should parse mixed format responses', () => {
      const response = `exp[0]→P1
P{2}
exp[2]→P{3}
P4`;
      expect(parseResponse(response, 4)).toEqual([1, 2, 3, 4]);
    });

    it('should handle fewer lines than batch size', () => {
      const response = `P1
P2`;
      expect(parseResponse(response, 4)).toEqual([1, 2, 0, 0]);
    });

    it('should handle more lines than batch size', () => {
      const response = `P1
P2
P3
P4
P5`;
      expect(parseResponse(response, 3)).toEqual([1, 2, 3]);
    });

    it('should handle response with P0 (no match)', () => {
      const response = `P1
P0
P3
P0`;
      expect(parseResponse(response, 4)).toEqual([1, 0, 3, 0]);
    });

    it('should handle response with garbage lines', () => {
      const response = `P1
garbage
P3
not a pattern`;
      expect(parseResponse(response, 4)).toEqual([1, 0, 3, 0]);
    });
  });

  describe('Realistic LLM response scenarios', () => {
    it('should handle response with explanatory comments (lines ignored)', () => {
      // Sometimes LLMs add explanation lines - our parser ignores them
      // because we only process lines[0..batchSize-1]
      const response = `exp[0]→P1
exp[1]→P2
exp[2]→P1
;; Pattern 1 is most common
;; Done`;
      const parseResponse = (response: string, batchSize: number): number[] => {
        const lines = response.trim().split('\n');
        const results: number[] = [];
        for (let i = 0; i < batchSize; i++) {
          const line = lines[i]?.trim() || '';
          const num = parsePatternNum(line);
          results.push(num ?? 0);
        }
        return results;
      };
      expect(parseResponse(response, 3)).toEqual([1, 2, 1]);
    });

    it('should handle response with AISP header (skipped by batch indexing)', () => {
      // If LLM adds header, it shifts indices - but we parse lines[0..n]
      // This test documents current behavior (may need adjustment)
      const response = `𝔸1.0.response
exp[0]→P1
exp[1]→P2`;
      const parseResponse = (response: string, batchSize: number): number[] => {
        const lines = response.trim().split('\n');
        const results: number[] = [];
        for (let i = 0; i < batchSize; i++) {
          const line = lines[i]?.trim() || '';
          const num = parsePatternNum(line);
          results.push(num ?? 0);
        }
        return results;
      };
      // First line is header (no match), so first result is 0
      expect(parseResponse(response, 3)).toEqual([0, 1, 2]);
    });
  });
});
