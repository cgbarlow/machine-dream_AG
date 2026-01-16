/**
 * Tests for AISP-lite Mode
 *
 * Spec 16 FR-06: AISP-lite uses simplified AISP syntax based on the
 * Minimal template from AISP 5.1 spec. Better for smaller/weaker models.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AISPBuilder } from '../../../src/llm/AISPBuilder.js';
import { PromptBuilder } from '../../../src/llm/PromptBuilder.js';
import type { LLMExperience, FewShotExample, ForbiddenMove } from '../../../src/llm/types.js';

describe('AISP-lite Mode (Spec 16 FR-06)', () => {
  let aispBuilder: AISPBuilder;
  let promptBuilder: PromptBuilder;

  // Test grid with some filled cells
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

  // Test experiences (for PromptBuilder tests)
  const testExperiences: LLMExperience[] = [
    {
      move: { row: 1, col: 3, value: 2, reasoning: 'Test reasoning' },
      validation: { outcome: 'correct' },
      puzzleId: 'test-puzzle',
      moveNumber: 1,
      timestamp: new Date(),
    },
  ];

  // Test forbidden moves (for AISPBuilder tests)
  const testForbidden: ForbiddenMove[] = [];

  // Test few-shot examples (for strategy tests)
  const testFewShots: FewShotExample[] = [
    {
      situation: 'Cell has only one candidate remaining after elimination',
      analysis: 'Single candidate in cell',
      move: { row: 1, col: 3, value: 4 },
      strategy: 'NakedSingle',
    },
    {
      situation: 'Only one cell in row can contain this value',
      analysis: 'Hidden single in row',
      move: { row: 2, col: 5, value: 7 },
      strategy: 'HiddenSingle',
      aispEncoded: 'when≜∃!cell∈row:candidates(cell)∩{v}≠∅',
    },
  ];

  beforeEach(() => {
    aispBuilder = new AISPBuilder();
    promptBuilder = new PromptBuilder(false, true);
  });

  describe('AISPBuilder.buildAISPLitePrompt', () => {
    it('should generate minimal AISP header', () => {
      const prompt = aispBuilder.buildAISPLitePrompt(testGrid, testForbidden);

      // Should start with AISP lite header
      expect(prompt).toContain('𝔸1.0.sudoku-lite');
      expect(prompt).toContain('γ≔sudoku.solving.9x9');
    });

    it('should include minimal reference block', () => {
      const prompt = aispBuilder.buildAISPLitePrompt(testGrid, testForbidden);

      // Should have minimal reference block
      expect(prompt).toContain('⟦Ω:Ref⟧');
      expect(prompt).toContain('⊤≔true');
      expect(prompt).toContain('⊥≔false');
    });

    it('should include state block with board', () => {
      const prompt = aispBuilder.buildAISPLitePrompt(testGrid, testForbidden);

      // Should have state block
      expect(prompt).toContain('⟦Σ:State⟧');
      expect(prompt).toContain('board≜');
      expect(prompt).toContain('empty≔');
    });

    it('should include minimal rules block', () => {
      const prompt = aispBuilder.buildAISPLitePrompt(testGrid, testForbidden);

      // Should have rules block
      expect(prompt).toContain('⟦Γ:Rules⟧');
      expect(prompt).toContain('valid(r,c,v)');
    });

    it('should include functions block', () => {
      const prompt = aispBuilder.buildAISPLitePrompt(testGrid, testForbidden);

      // Should have functions block
      expect(prompt).toContain('⟦Λ:Solve⟧');
      expect(prompt).toContain('find_move');
    });

    it('should include execute block with natural language allowed', () => {
      const prompt = aispBuilder.buildAISPLitePrompt(testGrid, testForbidden);

      // Should have execute block
      expect(prompt).toContain('⟦Ε:Execute⟧');
      expect(prompt).toContain('proof≔natural_language_allowed');
    });

    it('should include explicit output format example', () => {
      const prompt = aispBuilder.buildAISPLitePrompt(testGrid, testForbidden);

      // FR-08: Should have explicit output format example
      expect(prompt).toContain('ROW:');
      expect(prompt).toContain('COL:');
      expect(prompt).toContain('VALUE:');
      expect(prompt).toContain('REASONING:');
      expect(prompt).toContain('Example output:');
    });

    it('should be shorter than full AISP prompt', () => {
      const litePrompt = aispBuilder.buildAISPLitePrompt(testGrid, testForbidden);
      const fullPrompt = aispBuilder.buildAISPPrompt(
        testGrid,
        testExperiences,
        [],
        [],
        { includeSpec: true, gridSize: 9, anonymousPatterns: false }
      );

      // AISP-lite should be significantly shorter
      expect(litePrompt.length).toBeLessThan(fullPrompt.length);
    });

    it('should include strategies block when fewShots provided', () => {
      const prompt = aispBuilder.buildAISPLitePrompt(testGrid, testForbidden, testFewShots);

      // Should have strategies block
      expect(prompt).toContain('⟦Λ:Strategies⟧');
      expect(prompt).toContain('Learned patterns');
      expect(prompt).toContain('NakedSingle');
      expect(prompt).toContain('HiddenSingle');
    });

    it('should include AISP-encoded strategies when available', () => {
      const prompt = aispBuilder.buildAISPLitePrompt(testGrid, testForbidden, testFewShots);

      // Should use AISP-encoded version for HiddenSingle
      expect(prompt).toContain('when≜∃!cell∈row:candidates(cell)∩{v}≠∅');
    });

    it('should include example moves for strategies', () => {
      const prompt = aispBuilder.buildAISPLitePrompt(testGrid, testForbidden, testFewShots);

      // Should include example move coordinates
      expect(prompt).toContain('example≔(1,3,4)');
    });
  });

  describe('PromptBuilder AISP-lite routing', () => {
    it('should route to AISP-lite when mode is set', () => {
      promptBuilder.setAISPMode('aisp-lite');
      const prompt = promptBuilder.buildPrompt(testGrid, testExperiences, []);

      // Should contain AISP-lite markers
      expect(prompt).toContain('𝔸1.0.sudoku-lite');
      expect(prompt).toContain('⟦Σ:State⟧');
    });

    it('should not use AISP-lite for standard AISP mode', () => {
      promptBuilder.setAISPMode('aisp');
      const prompt = promptBuilder.buildPrompt(testGrid, testExperiences, []);

      // Should NOT contain lite-specific header
      expect(prompt).not.toContain('𝔸1.0.sudoku-lite');
    });

    it('should not use AISP-lite for AISP-full mode', () => {
      promptBuilder.setAISPMode('aisp-full');
      const prompt = promptBuilder.buildPrompt(testGrid, testExperiences, []);

      // Should NOT contain lite-specific header
      expect(prompt).not.toContain('𝔸1.0.sudoku-lite');
    });

    it('should produce standard prompt when AISP is off', () => {
      promptBuilder.setAISPMode('off');
      const prompt = promptBuilder.buildPrompt(testGrid, testExperiences, []);

      // Should have standard format
      expect(prompt).toContain('CURRENT PUZZLE STATE:');
      expect(prompt).toContain('What is your next move?');
      expect(prompt).not.toContain('⟦');
    });
  });
});
