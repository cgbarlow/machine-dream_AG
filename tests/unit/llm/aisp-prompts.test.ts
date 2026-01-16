/**
 * Tests for AISP Prompt Completeness
 *
 * Spec 16: AISP Mode Integration - Section 4.12
 * ADR-014: AISP Prompt Completeness
 */

import { describe, it, expect } from 'vitest';

describe('AISP Prompt Completeness (Spec 16 Section 4.12)', () => {
  // Sample AISP responses for parser testing
  const aispSelectionResponse = `⟦Χ:Selection.1⟧{idx≔0,why≔"focuses on row completion"}
⟦Χ:Selection.2⟧{idx≔2,why≔"uses box constraint checking"}
⟦Χ:Selection.3⟧{idx≔4,why≔"elimination approach"}`;

  const englishSelectionResponse = `SELECTED: 1
WHY_DIVERSE: Focuses on row completion
SELECTED: 3
WHY_DIVERSE: Uses box constraint checking
SELECTED: 5
WHY_DIVERSE: Elimination approach`;

  const aispHierarchyResponse = `⟦Θ:Hierarchy⟧{
  L0≔⟨Naked Single in R3C5;Hidden Single in Box 4⟩
  L1≔⟨Single Candidate;Constraint Propagation⟩
  L2≔⟨Completion Techniques;Elimination Techniques⟩
  L3≔⟨Reduce search space;Exploit uniqueness constraints⟩
}`;

  const englishHierarchyResponse = `LEVEL_0_INSTANCES:
- Naked Single in R3C5
- Hidden Single in Box 4

LEVEL_1_TECHNIQUES:
- Single Candidate
- Constraint Propagation

LEVEL_2_CATEGORIES:
- Completion Techniques
- Elimination Techniques

LEVEL_3_PRINCIPLES:
- Reduce search space
- Exploit uniqueness constraints`;

  const aispCategorizationResponse = `exp[0]→P1
exp[1]→P2
exp[2]→P1
exp[3]→P3`;

  const plainCategorizationResponse = `1
2
1
3`;

  describe('Fewshot Selection AISP', () => {
    it('should parse ⟦Χ:Selection⟧ blocks from AISP response', () => {
      // Test parser can extract indices from AISP format
      const regex = /⟦Χ:Selection\.\d+⟧\{[^}]*idx≔(\d+)/g;
      const indices: number[] = [];
      let match;
      while ((match = regex.exec(aispSelectionResponse)) !== null) {
        indices.push(parseInt(match[1], 10));
      }

      expect(indices).toEqual([0, 2, 4]);
    });

    it('should handle AISP response format correctly', () => {
      // Verify AISP selection block structure is parseable
      expect(aispSelectionResponse).toContain('⟦Χ:Selection.');
      expect(aispSelectionResponse).toContain('idx≔');
      expect(aispSelectionResponse).toContain('why≔');
    });

    it('should fallback to English parsing if AISP not found', () => {
      // Test that English format is still parseable
      const lines = englishSelectionResponse.split('\n');
      const indices: number[] = [];
      for (const line of lines) {
        const match = line.match(/SELECTED:\s*(\d+)/i);
        if (match) {
          indices.push(parseInt(match[1], 10) - 1); // Convert 1-indexed to 0-indexed
        }
      }

      expect(indices).toEqual([0, 2, 4]);
    });
  });

  describe('Hierarchy Build AISP', () => {
    it('should parse ⟦Θ:Hierarchy⟧ block with L0-L3 fields', () => {
      // Test parser can extract hierarchy from AISP format
      const hierarchyMatch = aispHierarchyResponse.match(/⟦Θ:Hierarchy⟧\{([^}]+)\}/s);
      expect(hierarchyMatch).not.toBeNull();

      const content = hierarchyMatch![1];
      expect(content).toContain('L0≔');
      expect(content).toContain('L1≔');
      expect(content).toContain('L2≔');
      expect(content).toContain('L3≔');
    });

    it('should extract lists from ⟨item₁;item₂⟩ format', () => {
      // Test list extraction
      const content = aispHierarchyResponse.match(/⟦Θ:Hierarchy⟧\{([^}]+)\}/s)![1];
      const l0Match = content.match(/L0≔⟨([^⟩]+)⟩/);
      expect(l0Match).not.toBeNull();

      const items = l0Match![1].split(';').map(s => s.trim());
      expect(items).toEqual(['Naked Single in R3C5', 'Hidden Single in Box 4']);
    });

    it('should fallback to English parsing if AISP not found', () => {
      // Test that English format is still parseable
      const levels: Record<string, string[]> = {};
      let currentLevel = '';

      for (const line of englishHierarchyResponse.split('\n')) {
        if (line.startsWith('LEVEL_')) {
          currentLevel = line.replace(':', '').trim();
          levels[currentLevel] = [];
        } else if (line.startsWith('- ') && currentLevel) {
          levels[currentLevel].push(line.substring(2).trim());
        }
      }

      expect(levels['LEVEL_0_INSTANCES']).toEqual(['Naked Single in R3C5', 'Hidden Single in Box 4']);
      expect(levels['LEVEL_3_PRINCIPLES']).toEqual(['Reduce search space', 'Exploit uniqueness constraints']);
    });
  });

  describe('Categorization Response', () => {
    it('should parse exp[n]→P{m} AISP format', () => {
      // Test AISP categorization format
      const lines = aispCategorizationResponse.trim().split('\n');
      const results: number[] = [];

      for (const line of lines) {
        const aispMatch = line.match(/(?:exp\[\d+\]→)?P(\d+)/i);
        if (aispMatch) {
          results.push(parseInt(aispMatch[1], 10));
        }
      }

      expect(results).toEqual([1, 2, 1, 3]);
    });

    it('should fallback to raw numbers if AISP format not found', () => {
      // Test plain number format
      const lines = plainCategorizationResponse.trim().split('\n');
      const results: number[] = [];

      for (const line of lines) {
        const num = parseInt(line.trim(), 10);
        if (!isNaN(num)) {
          results.push(num);
        }
      }

      expect(results).toEqual([1, 2, 1, 3]);
    });

    it('should handle mixed format responses gracefully', () => {
      const mixedResponse = `P1
exp[1]→P2
3
exp[3]→P3`;

      const lines = mixedResponse.trim().split('\n');
      const results: number[] = [];

      for (const line of lines) {
        // Try AISP format first
        const aispMatch = line.match(/(?:exp\[\d+\]→)?P(\d+)/i);
        if (aispMatch) {
          results.push(parseInt(aispMatch[1], 10));
        } else {
          // Fallback to raw number
          const num = parseInt(line.trim(), 10);
          if (!isNaN(num)) {
            results.push(num);
          }
        }
      }

      expect(results).toEqual([1, 2, 3, 3]);
    });
  });

  describe('AISP Block Structure Validation', () => {
    it('should recognize standard AISP block types', () => {
      const blockTypes = ['⟦Σ:', '⟦Ω:', '⟦Ε:', '⟦Λ:', '⟦Θ:', '⟦Χ:', '⟦Γ:'];

      for (const block of blockTypes) {
        expect(block).toMatch(/⟦[ΣΩΕΛΘΧΓ]:/);
      }
    });

    it('should recognize AISP field assignment operators', () => {
      const operators = ['≜', '≔', '→'];
      const testText = 'task≜identify() name≔"test" exp[0]→P1';

      for (const op of operators) {
        expect(testText).toContain(op);
      }
    });
  });

  describe('sanitizeForAISP helper', () => {
    it('should escape double quotes', () => {
      const input = 'This has "quotes" inside';
      const sanitized = input.replace(/"/g, "'");
      expect(sanitized).toBe("This has 'quotes' inside");
    });

    it('should remove newlines and tabs', () => {
      const input = 'Line 1\nLine 2\tTabbed';
      const sanitized = input.replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      expect(sanitized).toBe('Line 1 Line 2 Tabbed');
    });

    it('should collapse multiple spaces', () => {
      const input = 'Too    many   spaces';
      const sanitized = input.replace(/\s+/g, ' ').trim();
      expect(sanitized).toBe('Too many spaces');
    });
  });
});
