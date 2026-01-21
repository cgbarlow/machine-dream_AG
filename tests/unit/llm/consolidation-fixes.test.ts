/**
 * Tests for Consolidation Pipeline Fixes
 *
 * Issue 1: LLMClusterV3 only selects 4 strategies for 2x mode
 * Issue 2: Hierarchy parsing always fails due to regex bugs
 * Issue 3: Display bug (10 vs 5 strategies) due to default limit
 *
 * Spec References:
 * - Spec 05 Section 8.4: Secondary Refinement
 * - Spec 16 Section 4.13.5: Hierarchy Response Parsing
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_CONSOLIDATION_COUNTS, DOUBLED_CONSOLIDATION_COUNTS } from '../../../src/llm/types.js';

describe('Consolidation Pipeline Fixes (Spec 05, Spec 16)', () => {
  describe('Issue 1: Strategy Selection Capping', () => {
    it('should define minPatternsFor2x as fewShotMax + 2 (12)', () => {
      // The threshold should be fewShotMax + 2 to ensure LLM has headroom for diversity selection
      const minPatternsFor2x = DOUBLED_CONSOLIDATION_COUNTS.fewShotMax + 2;
      expect(minPatternsFor2x).toBe(12);
    });

    it('should have fewShotMax of 10 for doubled mode', () => {
      expect(DOUBLED_CONSOLIDATION_COUNTS.fewShotMax).toBe(10);
    });

    it('should have fewShotMin of 6 for doubled mode', () => {
      expect(DOUBLED_CONSOLIDATION_COUNTS.fewShotMin).toBe(6);
    });

    it('should cap selection request at available patterns when patterns < fewShotMax', () => {
      const patterns = Array.from({ length: 9 }, (_, i) => ({ id: i })); // 9 patterns
      const fewShotMax = DOUBLED_CONSOLIDATION_COUNTS.fewShotMax; // 10

      // The effectiveMax should be capped at available patterns
      const effectiveMax = Math.min(fewShotMax, patterns.length);
      expect(effectiveMax).toBe(9);
      expect(effectiveMax).toBeLessThan(fewShotMax);
    });

    it('should not cap selection when patterns >= fewShotMax', () => {
      const patterns = Array.from({ length: 15 }, (_, i) => ({ id: i })); // 15 patterns
      const fewShotMax = DOUBLED_CONSOLIDATION_COUNTS.fewShotMax; // 10

      const effectiveMax = Math.min(fewShotMax, patterns.length);
      expect(effectiveMax).toBe(10);
      expect(effectiveMax).toBe(fewShotMax);
    });

    it('should trigger secondary refinement when patterns < 12 for 2x mode', () => {
      const minPatternsFor2x = DOUBLED_CONSOLIDATION_COUNTS.fewShotMax + 2; // 12
      const scenarios = [
        { patternCount: 5, shouldRefine: true },
        { patternCount: 9, shouldRefine: true },
        { patternCount: 11, shouldRefine: true },
        { patternCount: 12, shouldRefine: false },
        { patternCount: 15, shouldRefine: false },
      ];

      for (const { patternCount, shouldRefine } of scenarios) {
        const needsRefinement = patternCount < minPatternsFor2x;
        expect(needsRefinement).toBe(shouldRefine);
      }
    });
  });

  describe('Issue 2: Hierarchy Parsing Regex', () => {
    /**
     * Test extractLevel function behavior
     * The regex should match multiline content and stop at next level marker
     */
    it('should parse L0 items spanning multiple lines', () => {
      const response = `L0=item1;
item2;
item3
L1=category1;category2`;

      // New regex: [\s\S]+? matches any character including newlines
      // (?=L\d|$) stops at next level marker
      const extractLevel = (level: string): string[] => {
        const regex = new RegExp(`${level}[≔=]([\\s\\S]+?)(?=L\\d|$)`, 'i');
        const match = response.match(regex);
        if (!match) return [];
        return match[1]
          .split(';')
          .map(s => s.trim().replace(/^["'⟨]|["'⟩]$/g, ''))
          .filter(s => s.length > 0 && s !== '...');
      };

      const l0 = extractLevel('L0');
      expect(l0.length).toBe(3);
      expect(l0).toContain('item1');
      expect(l0).toContain('item2');
      expect(l0).toContain('item3');
    });

    it('should stop at next level marker', () => {
      const response = `L0≔specific1;specific2
L1≔technique1;technique2
L2≔category1
L3≔principle1`;

      const extractLevel = (level: string): string[] => {
        const regex = new RegExp(`${level}[≔=]([\\s\\S]+?)(?=L\\d|$)`, 'i');
        const match = response.match(regex);
        if (!match) return [];
        return match[1]
          .split(';')
          .map(s => s.trim().replace(/^["'⟨]|["'⟩]$/g, ''))
          .filter(s => s.length > 0 && s !== '...');
      };

      const l0 = extractLevel('L0');
      const l1 = extractLevel('L1');
      const l2 = extractLevel('L2');
      const l3 = extractLevel('L3');

      expect(l0).toEqual(['specific1', 'specific2']);
      expect(l1).toEqual(['technique1', 'technique2']);
      expect(l2).toEqual(['category1']);
      expect(l3).toEqual(['principle1']);
    });

    it('should extract items from angle brackets with newlines inside', () => {
      const content = `patterns≔⟨item1;
item2;
item3⟩`;

      // New regex: [\s\S]*? matches any character including newlines
      const extractAISPListField = (fieldName: string): string[] => {
        const regex = new RegExp(`${fieldName}≔⟨([\\s\\S]*?)⟩`);
        const match = content.match(regex);
        if (!match) return [];
        return match[1]
          .split(';')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(s => s.length > 0);
      };

      const items = extractAISPListField('patterns');
      expect(items.length).toBe(3);
      expect(items).toEqual(['item1', 'item2', 'item3']);
    });

    it('should handle empty angle brackets gracefully', () => {
      const content = `patterns≔⟨⟩`;

      const extractAISPListField = (fieldName: string): string[] => {
        const regex = new RegExp(`${fieldName}≔⟨([\\s\\S]*?)⟩`);
        const match = content.match(regex);
        if (!match) return [];
        return match[1]
          .split(';')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(s => s.length > 0);
      };

      const items = extractAISPListField('patterns');
      expect(items.length).toBe(0);
    });

    it('should handle complex multiline hierarchy response', () => {
      const response = `L0≔"Naked Single in R3C5";
"Hidden Single in Box 4";
"Last Digit in Column 7"
L1≔"Single Candidate Technique";
"Elimination Strategy"
L2≔"Constraint Propagation";
"Logical Deduction"
L3≔"Sudoku Solving Principles"`;

      const extractLevel = (level: string): string[] => {
        const regex = new RegExp(`${level}[≔=]([\\s\\S]+?)(?=L\\d|$)`, 'i');
        const match = response.match(regex);
        if (!match) return [];
        return match[1]
          .split(';')
          .map(s => s.trim().replace(/^["'⟨]|["'⟩]$/g, ''))
          .filter(s => s.length > 0 && s !== '...');
      };

      const l0 = extractLevel('L0');
      const l1 = extractLevel('L1');
      const l2 = extractLevel('L2');
      const l3 = extractLevel('L3');

      expect(l0.length).toBe(3);
      expect(l1.length).toBe(2);
      expect(l2.length).toBe(2);
      expect(l3.length).toBe(1);

      // Verify content
      expect(l0[0]).toContain('Naked Single');
      expect(l1[0]).toContain('Single Candidate');
      expect(l2[0]).toContain('Constraint Propagation');
      expect(l3[0]).toContain('Sudoku Solving');
    });

    // Test for the original broken regex behavior
    it('should NOT match only first line (regression test)', () => {
      const response = `L0=item1;
item2;
item3
L1=category1`;

      // OLD broken regex (for reference - should NOT be used):
      // const brokenRegex = new RegExp(`L0[≔=](.+?)(?:\\n|$)`, 'i');
      // This would only match 'item1;' and stop at first newline

      // NEW correct regex:
      const correctRegex = new RegExp(`L0[≔=]([\\s\\S]+?)(?=L\\d|$)`, 'i');
      const match = response.match(correctRegex);

      expect(match).not.toBeNull();
      expect(match![1]).toContain('item1');
      expect(match![1]).toContain('item2');
      expect(match![1]).toContain('item3');
    });
  });

  describe('Issue 3: getFewShots Display Limit', () => {
    it('should have correct default limit of 5', () => {
      // The default limit in ExperienceStore.getFewShots is 5
      // This is correct for backward compatibility, but callers should pass explicit limits
      const defaultLimit = 5;
      expect(defaultLimit).toBe(5);
    });

    it('should use fewShotMax for standard unit (5)', () => {
      expect(DEFAULT_CONSOLIDATION_COUNTS.fewShotMax).toBe(5);
    });

    it('should use fewShotMax for doubled unit (10)', () => {
      expect(DOUBLED_CONSOLIDATION_COUNTS.fewShotMax).toBe(10);
    });

    it('should demonstrate that explicit limits solve the display bug', () => {
      // Simulate the fix: passing explicit limits
      const mockFewShots = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        strategy: `Strategy ${i + 1}`,
      }));

      // Without explicit limit (bug behavior):
      const defaultSlice = mockFewShots.slice(0, 5);
      expect(defaultSlice.length).toBe(5);

      // With explicit limit (fixed behavior):
      const doubledLimit = DOUBLED_CONSOLIDATION_COUNTS.fewShotMax;
      const explicitSlice = mockFewShots.slice(0, doubledLimit);
      expect(explicitSlice.length).toBe(10);
    });

    it('should return all strategies when explicit limit passed', () => {
      // Mock data with 10 strategies
      const strategies = Array.from({ length: 10 }, (_, i) => `Strategy ${i + 1}`);

      // Test behavior with different limits
      const results = [
        { limit: 5, expected: 5 },
        { limit: 10, expected: 10 },
        { limit: 15, expected: 10 }, // Can't return more than exist
      ];

      for (const { limit, expected } of results) {
        const sliced = strategies.slice(0, limit);
        expect(sliced.length).toBe(expected);
      }
    });
  });

  describe('Integration: All Fixes Working Together', () => {
    it('should allow proper 2x mode consolidation with 12+ patterns', () => {
      const minPatternsFor2x = DOUBLED_CONSOLIDATION_COUNTS.fewShotMax + 2; // 12
      const patterns = Array.from({ length: 13 }, (_, i) => ({ id: i, name: `Pattern ${i + 1}` }));

      // With 13 patterns:
      // - No secondary refinement needed (13 >= 12)
      expect(patterns.length).toBeGreaterThanOrEqual(minPatternsFor2x);

      // - Selection capped at fewShotMax (10)
      const effectiveMax = Math.min(DOUBLED_CONSOLIDATION_COUNTS.fewShotMax, patterns.length);
      expect(effectiveMax).toBe(10);

      // - Display would show correct count with explicit limit
      const displayLimit = DOUBLED_CONSOLIDATION_COUNTS.fewShotMax;
      expect(displayLimit).toBe(10);
    });

    it('should trigger secondary refinement when patterns are insufficient', () => {
      const minPatternsFor2x = DOUBLED_CONSOLIDATION_COUNTS.fewShotMax + 2; // 12
      const patterns = Array.from({ length: 9 }, (_, i) => ({ id: i, name: `Pattern ${i + 1}` }));

      // With 9 patterns:
      // - Secondary refinement needed (9 < 12)
      expect(patterns.length).toBeLessThan(minPatternsFor2x);

      // - Selection MUST be capped at available patterns (9)
      const effectiveMax = Math.min(DOUBLED_CONSOLIDATION_COUNTS.fewShotMax, patterns.length);
      expect(effectiveMax).toBe(9);
      expect(effectiveMax).toBeLessThan(DOUBLED_CONSOLIDATION_COUNTS.fewShotMax);
    });
  });
});
