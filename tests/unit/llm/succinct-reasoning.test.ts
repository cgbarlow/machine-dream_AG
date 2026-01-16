/**
 * Tests for Succinct Reasoning Mode
 *
 * Spec 16 FR-05: When enabled, prompts instruct the model to provide ONLY
 * the move without full candidate analysis.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PromptBuilder } from '../../../src/llm/PromptBuilder.js';
import { AISPBuilder } from '../../../src/llm/AISPBuilder.js';
import type { LLMExperience } from '../../../src/llm/types.js';

describe('Succinct Reasoning Mode (Spec 16 FR-05)', () => {
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

  const testExperiences: LLMExperience[] = [];

  beforeEach(() => {
    promptBuilder = new PromptBuilder(false, true);
  });

  describe('PromptBuilder succinct mode', () => {
    it('should add succinct instructions when enabled', () => {
      promptBuilder.setSuccinctReasoning(true);
      const prompt = promptBuilder.buildPrompt(testGrid, testExperiences, []);

      // Should include succinct instructions
      expect(prompt).toContain('⚠️ IMPORTANT: Provide ONLY your chosen move');
      expect(prompt).toContain('Do NOT analyze all cells');
      expect(prompt).toContain('brief reasoning (1-2 sentences)');
    });

    it('should not add succinct instructions when disabled', () => {
      promptBuilder.setSuccinctReasoning(false);
      const prompt = promptBuilder.buildPrompt(testGrid, testExperiences, []);

      // Should NOT include succinct instructions
      expect(prompt).not.toContain('Provide ONLY your chosen move');
    });

    it('should default to succinct disabled', () => {
      // Don't call setSuccinctReasoning at all
      const prompt = promptBuilder.buildPrompt(testGrid, testExperiences, []);

      // Should NOT include succinct instructions
      expect(prompt).not.toContain('⚠️ IMPORTANT: Provide ONLY');
    });

    it('should add succinct instructions before final question', () => {
      promptBuilder.setSuccinctReasoning(true);
      const prompt = promptBuilder.buildPrompt(testGrid, testExperiences, []);

      // Instructions should appear before the question
      const succinctIndex = prompt.indexOf('Provide ONLY your chosen move');
      const questionIndex = prompt.indexOf('What is your next move?');

      expect(succinctIndex).toBeLessThan(questionIndex);
      expect(succinctIndex).toBeGreaterThan(0);
    });

    it('should toggle succinct mode on and off', () => {
      // Enable
      promptBuilder.setSuccinctReasoning(true);
      let prompt = promptBuilder.buildPrompt(testGrid, testExperiences, []);
      expect(prompt).toContain('Provide ONLY your chosen move');

      // Disable
      promptBuilder.setSuccinctReasoning(false);
      prompt = promptBuilder.buildPrompt(testGrid, testExperiences, []);
      expect(prompt).not.toContain('Provide ONLY your chosen move');
    });
  });

  describe('succinct mode with AISP', () => {
    it('should work independently from AISP mode', () => {
      // Both succinct and AISP can be enabled
      promptBuilder.setAISPMode('aisp');
      promptBuilder.setSuccinctReasoning(true);

      // No error should be thrown
      const prompt = promptBuilder.buildPrompt(testGrid, testExperiences, []);

      // AISP mode takes over the prompt format
      expect(prompt).toContain('⟦');
    });

    it('should work with standard prompt when AISP is off', () => {
      promptBuilder.setAISPMode('off');
      promptBuilder.setSuccinctReasoning(true);
      const prompt = promptBuilder.buildPrompt(testGrid, testExperiences, []);

      // Standard format with succinct
      expect(prompt).toContain('CURRENT PUZZLE STATE:');
      expect(prompt).toContain('Provide ONLY your chosen move');
    });
  });
});
