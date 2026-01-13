/**
 * Tests for LLMCluster v1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMClusterV1 } from './LLMClusterV1.js';
import type { LLMExperience, LLMConfig } from '../types.js';
import { LMStudioClient } from '../LMStudioClient.js';

/**
 * Create mock LLM experience for testing
 */
function createMockExperience(
  id: number,
  reasoning: string,
  row: number = 5,
  col: number = 5,
  emptyCells: number = 40
): LLMExperience {
  return {
    id: `exp_${id}`,
    sessionId: 'test-session',
    profileName: 'test-profile',
    puzzleId: 'test-puzzle',
    puzzleHash: 'test-hash',
    moveNumber: id,
    gridState: Array(9).fill(null).map(() => Array(9).fill(0)),
    move: {
      row,
      col,
      value: 5,
      reasoning,
    },
    validation: {
      isValid: true,
      isCorrect: true,
      outcome: 'correct',
    },
    timestamp: new Date(),
    modelUsed: 'test-model',
    memoryWasEnabled: false,
    importance: 0.7,
    context: {
      emptyCellsAtMove: emptyCells,
      reasoningLength: reasoning.length,
      constraintDensity: 5.0,
    },
    learningContext: {
      fewShotsUsed: false,
      fewShotCount: 0,
      patternsAvailable: 0,
      consolidatedExperiences: 0,
    },
  };
}

/**
 * Mock LLM config
 */
const mockConfig: LLMConfig = {
  baseUrl: 'http://localhost:1234/v1',
  model: 'test-model',
  temperature: 0.3,
  maxTokens: 3000,
  timeout: 30000,
  memoryEnabled: false,
  maxHistoryMoves: 5,
  includeReasoning: false,
};

describe('LLMClusterV1', () => {
  let mockLLMClient: LMStudioClient;

  beforeEach(() => {
    // Create mock LLM client with pattern response
    mockLLMClient = {
      chat: vi.fn().mockResolvedValue({
        content: `PATTERN: P1
NAME: Single candidate elimination
DESC: Only one possible value remains after eliminating all other options
KEYWORDS: only candidate, only option, must be, last remaining
CHAR: deterministic, single-step, fundamental

PATTERN: P2
NAME: Constraint intersection
DESC: Multiple constraints intersect to force a specific value
KEYWORDS: constraint, forced, intersection, impossible
CHAR: multi-constraint, logical, intermediate

PATTERN: P3
NAME: Box analysis
DESC: Analyzing box constraints to identify candidates
KEYWORDS: box, square, region, contains
CHAR: spatial, box-focused, basic

PATTERN: P4
NAME: Row-column interaction
DESC: Interaction between row and column constraints
KEYWORDS: row, column, interaction, pointing
CHAR: advanced, cross-unit, pattern-based`,
      }),
    } as any;
  });

  describe('metadata', () => {
    it('should have correct name and version', () => {
      const algorithm = new LLMClusterV1(mockLLMClient);
      expect(algorithm.getName()).toBe('LLMCluster');
      expect(algorithm.getVersion()).toBe(1);
      expect(algorithm.getIdentifier()).toBe('llmclusterv1');
    });

    it('should have valid code hash', () => {
      const algorithm = new LLMClusterV1(mockLLMClient);
      const metadata = algorithm.getMetadata();
      expect(metadata.codeHash).toMatch(/^[0-9a-f]{8}$/i);
    });
  });

  describe('clustering', () => {
    it('should identify patterns using LLM', async () => {
      const algorithm = new LLMClusterV1(mockLLMClient);

      const experiences: LLMExperience[] = Array(150)
        .fill(null)
        .map((_, i) => {
          const reasoning = [
            'This is the only candidate for this cell',
            'Forced by constraint intersection',
            'Box analysis shows this value',
            'Row and column interaction',
            'General reasoning step',
          ][i % 5];
          return createMockExperience(i, reasoning, (i % 9) + 1, ((i * 3) % 9) + 1, 80 - i);
        });

      const result = await algorithm.cluster(experiences, 10, mockConfig);

      expect(result.clusters.size).toBeGreaterThan(0);
      expect(result.metadata.totalExperiences).toBe(150);
      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);

      // Should call LLM for pattern identification
      expect(mockLLMClient.chat).toHaveBeenCalled();

      // Check for pattern-based cluster names
      const clusterNames = Array.from(result.clusters.keys());
      expect(clusterNames.length).toBeGreaterThan(0);
    });

    it('should sample experiences balanced by difficulty', async () => {
      const algorithm = new LLMClusterV1(mockLLMClient);

      // Create experiences with varying difficulty (empty cells)
      const experiences: LLMExperience[] = Array(200)
        .fill(null)
        .map((_, i) =>
          createMockExperience(
            i,
            `Reasoning step ${i}`,
            (i % 9) + 1,
            ((i * 3) % 9) + 1,
            80 - Math.floor(i / 20) * 5 // Varying difficulty
          )
        );

      await algorithm.cluster(experiences, 10, mockConfig);

      expect(mockLLMClient.chat).toHaveBeenCalled();

      // Verify prompt includes sampled experiences
      const call = (mockLLMClient.chat as any).mock.calls[0][0];
      const userMessage = call.find((msg: any) => msg.role === 'user');
      expect(userMessage.content).toContain('Sample experiences:');
      expect(userMessage.content).toContain('Reasoning step');
    });

    it('should categorize experiences by identified patterns', async () => {
      const algorithm = new LLMClusterV1(mockLLMClient);

      const experiences: LLMExperience[] = [
        createMockExperience(1, 'This is the only candidate for this cell'),
        createMockExperience(2, 'Only option remaining after elimination'),
        createMockExperience(3, 'Forced by constraint intersection'),
        createMockExperience(4, 'Multiple constraints intersect here'),
        createMockExperience(5, 'Box analysis shows this value'),
        createMockExperience(6, 'The box contains this value'),
        createMockExperience(7, 'Row and column interaction points here'),
        createMockExperience(8, 'Interaction between row and column'),
      ];

      const result = await algorithm.cluster(experiences, 10, mockConfig);

      // Should categorize into pattern-based clusters
      expect(result.clusters.size).toBeGreaterThan(0);

      // Check that experiences are distributed across clusters
      const clusterSizes = Array.from(result.clusters.values()).map((c) => c.length);
      const totalCategorized = clusterSizes.reduce((sum, size) => sum + size, 0);
      expect(totalCategorized).toBe(experiences.length);
    });

    it('should handle LLM failure with fallback patterns', async () => {
      const algorithm = new LLMClusterV1(mockLLMClient);

      // Mock LLM to throw error
      mockLLMClient.chat = vi.fn().mockRejectedValue(new Error('LLM error'));

      const experiences: LLMExperience[] = Array(100)
        .fill(null)
        .map((_, i) => createMockExperience(i, `Reasoning step ${i}`));

      const result = await algorithm.cluster(experiences, 10, mockConfig);

      // Should still return results using fallback patterns
      expect(result.clusters.size).toBeGreaterThan(0);
      expect(result.metadata.totalExperiences).toBe(100);
    });

    it('should handle malformed LLM response', async () => {
      const algorithm = new LLMClusterV1(mockLLMClient);

      // Mock LLM with malformed response
      mockLLMClient.chat = vi.fn().mockResolvedValue({
        content: 'This is not a valid pattern format without proper structure',
      });

      const experiences: LLMExperience[] = Array(100)
        .fill(null)
        .map((_, i) => createMockExperience(i, `Reasoning step ${i}`));

      const result = await algorithm.cluster(experiences, 10, mockConfig);

      // Should handle gracefully (use fallback or return empty patterns)
      expect(result.metadata.totalExperiences).toBe(100);
    });

    it('should handle empty experience array', async () => {
      const algorithm = new LLMClusterV1(mockLLMClient);
      const result = await algorithm.cluster([], 10, mockConfig);

      expect(result.clusters.size).toBe(0);
      expect(result.metadata.totalExperiences).toBe(0);
      expect(mockLLMClient.chat).not.toHaveBeenCalled();
    });

    it('should preserve all experiences (no loss)', async () => {
      const algorithm = new LLMClusterV1(mockLLMClient);

      const experiences: LLMExperience[] = Array(150)
        .fill(null)
        .map((_, i) => createMockExperience(i, `Reasoning step ${i}`));

      const result = await algorithm.cluster(experiences, 10, mockConfig);

      const totalClustered = Array.from(result.clusters.values()).reduce(
        (sum, cluster) => sum + cluster.length,
        0
      );

      expect(totalClustered).toBe(experiences.length);
    });

    it('should request appropriate number of patterns', async () => {
      const algorithm = new LLMClusterV1(mockLLMClient);

      const experiences: LLMExperience[] = Array(150)
        .fill(null)
        .map((_, i) => createMockExperience(i, `Reasoning step ${i}`));

      await algorithm.cluster(experiences, 5, mockConfig);

      expect(mockLLMClient.chat).toHaveBeenCalled();

      // Should request at least 10 patterns (max of 10 and targetCount)
      const call = (mockLLMClient.chat as any).mock.calls[0][0];
      const userMessage = call.find((msg: any) => msg.role === 'user');
      expect(userMessage.content).toContain('10 distinct');
    });
  });

  describe('pattern parsing', () => {
    it('should parse complete pattern structure', async () => {
      const algorithm = new LLMClusterV1(mockLLMClient);

      const experiences: LLMExperience[] = Array(100)
        .fill(null)
        .map((_, i) => createMockExperience(i, `Reasoning step ${i}`));

      await algorithm.cluster(experiences, 10, mockConfig);

      // Patterns should be parsed correctly
      expect(mockLLMClient.chat).toHaveBeenCalled();
    });

    it('should handle partial pattern data', async () => {
      const algorithm = new LLMClusterV1(mockLLMClient);

      // Mock with incomplete pattern
      mockLLMClient.chat = vi.fn().mockResolvedValue({
        content: `PATTERN: P1
NAME: Single candidate
KEYWORDS: only, candidate`,
      });

      const experiences: LLMExperience[] = Array(100)
        .fill(null)
        .map((_, i) => createMockExperience(i, `Reasoning step ${i}`));

      const result = await algorithm.cluster(experiences, 10, mockConfig);

      // Should still work
      expect(result.metadata.totalExperiences).toBe(100);
    });
  });

  describe('performance', () => {
    it('should complete in reasonable time for 500 experiences', async () => {
      const algorithm = new LLMClusterV1(mockLLMClient);

      // Mock fast LLM response
      mockLLMClient.chat = vi.fn().mockResolvedValue({
        content: `PATTERN: P1
NAME: Simple
DESC: Simple pattern
KEYWORDS: simple
CHAR: basic`,
      });

      const experiences: LLMExperience[] = Array(500)
        .fill(null)
        .map((_, i) =>
          createMockExperience(i, `Reasoning step ${i}`, (i % 9) + 1, ((i * 3) % 9) + 1)
        );

      const result = await algorithm.cluster(experiences, 10, mockConfig);

      // Should complete in <180000ms (spec requirement)
      expect(result.metadata.processingTimeMs).toBeLessThan(180000);
    });

    it('should sample at most 150 experiences for pattern identification', async () => {
      const algorithm = new LLMClusterV1(mockLLMClient);

      const experiences: LLMExperience[] = Array(1000)
        .fill(null)
        .map((_, i) => createMockExperience(i, `Reasoning step ${i}`));

      await algorithm.cluster(experiences, 10, mockConfig);

      const call = (mockLLMClient.chat as any).mock.calls[0][0];
      const userMessage = call.find((msg: any) => msg.role === 'user');
      const promptLines = userMessage.content.split('\n');

      // Count experience samples in prompt (should be at most 150)
      const experienceCount = promptLines.filter((line: string) =>
        line.match(/^\d+\.\s*"/)
      ).length;
      expect(experienceCount).toBeLessThanOrEqual(150);
    });
  });
});
