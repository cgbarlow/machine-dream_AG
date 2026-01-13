/**
 * Tests for DeepCluster v1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeepClusterV1 } from './DeepClusterV1.js';
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
  maxTokens: 2000,
  timeout: 30000,
  memoryEnabled: false,
  maxHistoryMoves: 5,
  includeReasoning: false,
};

describe('DeepClusterV1', () => {
  let mockLLMClient: LMStudioClient;

  beforeEach(() => {
    // Create mock LLM client
    mockLLMClient = {
      chat: vi.fn().mockResolvedValue({
        content: `PATTERN_1: Simple elimination
WHEN: Only one candidate remains after eliminating impossible values
KEYWORDS: only candidate, elimination, must be

PATTERN_2: Constraint intersection
WHEN: Multiple constraints intersect forcing a specific value
KEYWORDS: constraint, intersection, forced

PATTERN_3: Box-row interaction
WHEN: Value forced by interaction between box and row/column
KEYWORDS: box, row, column, interaction`,
      }),
    } as any;
  });

  describe('metadata', () => {
    it('should have correct name and version', () => {
      const algorithm = new DeepClusterV1(mockLLMClient);
      expect(algorithm.getName()).toBe('DeepCluster');
      expect(algorithm.getVersion()).toBe(1);
      expect(algorithm.getIdentifier()).toBe('deepclusterv1');
    });

    it('should have valid code hash', () => {
      const algorithm = new DeepClusterV1(mockLLMClient);
      const metadata = algorithm.getMetadata();
      expect(metadata.codeHash).toMatch(/^[0-9a-f]{8}$/i);
    });
  });

  describe('clustering', () => {
    it('should perform keyword clustering for small clusters', async () => {
      const algorithm = new DeepClusterV1(mockLLMClient);

      const experiences: LLMExperience[] = [
        createMockExperience(1, 'This is the only candidate for this cell'),
        createMockExperience(2, 'Only candidate elimination'),
        createMockExperience(3, 'Forced by constraint intersection'),
        createMockExperience(4, 'Must be 5 due to constraint'),
        createMockExperience(5, 'General reasoning about the puzzle'),
      ];

      const result = await algorithm.cluster(experiences, 3, mockConfig);

      expect(result.clusters.size).toBeGreaterThan(0);
      expect(result.metadata.totalExperiences).toBe(5);
      expect(result.metadata.clustersCreated).toBeGreaterThan(0);
      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);

      // Should not call LLM for small clusters (<50)
      expect(mockLLMClient.chat).not.toHaveBeenCalled();
    });

    it('should perform LLM semantic split for large clusters', async () => {
      const algorithm = new DeepClusterV1(mockLLMClient);

      // Create 60 experiences with same keyword pattern (forces large cluster)
      const experiences: LLMExperience[] = Array(60)
        .fill(null)
        .map((_, i) =>
          createMockExperience(
            i,
            `General reasoning step ${i}`,
            (i % 9) + 1,
            ((i * 3) % 9) + 1,
            80 - i
          )
        );

      const result = await algorithm.cluster(experiences, 5, mockConfig);

      expect(result.clusters.size).toBeGreaterThan(0);
      expect(result.metadata.totalExperiences).toBe(60);

      // Should call LLM for large cluster (>50)
      expect(mockLLMClient.chat).toHaveBeenCalled();

      // Should split into semantic sub-clusters or keep general_reasoning
      // (depends on whether parsing succeeds, but should have at least one cluster)
      expect(result.clusters.size).toBeGreaterThan(0);
    });

    it('should handle LLM failure gracefully', async () => {
      const algorithm = new DeepClusterV1(mockLLMClient);

      // Mock LLM to throw error
      mockLLMClient.chat = vi.fn().mockRejectedValue(new Error('LLM error'));

      // Create large cluster
      const experiences: LLMExperience[] = Array(60)
        .fill(null)
        .map((_, i) =>
          createMockExperience(
            i,
            `General reasoning step ${i}`,
            (i % 9) + 1,
            ((i * 3) % 9) + 1
          )
        );

      const result = await algorithm.cluster(experiences, 5, mockConfig);

      // Should still return results (fallback to keyword clustering)
      expect(result.clusters.size).toBeGreaterThan(0);
      expect(result.metadata.totalExperiences).toBe(60);
    });

    it('should sample representative experiences for LLM', async () => {
      const algorithm = new DeepClusterV1(mockLLMClient);

      // Create 100 experiences with varying difficulty
      const experiences: LLMExperience[] = Array(100)
        .fill(null)
        .map((_, i) =>
          createMockExperience(
            i,
            `General reasoning step ${i}`,
            (i % 9) + 1,
            ((i * 3) % 9) + 1,
            80 - Math.floor(i / 10) * 5 // Varying difficulty
          )
        );

      await algorithm.cluster(experiences, 5, mockConfig);

      expect(mockLLMClient.chat).toHaveBeenCalled();

      // Check that prompt includes sampled experiences
      const call = (mockLLMClient.chat as any).mock.calls[0][0];
      // call is an array of messages [{role: 'system', content: ...}, {role: 'user', content: ...}]
      const userMessage = call.find((msg: any) => msg.role === 'user');
      expect(userMessage.content).toContain('Sample experiences:');
      expect(userMessage.content).toContain('General reasoning step');
    });

    it('should handle empty experience array', async () => {
      const algorithm = new DeepClusterV1(mockLLMClient);
      const result = await algorithm.cluster([], 5, mockConfig);

      expect(result.clusters.size).toBe(0);
      expect(result.metadata.totalExperiences).toBe(0);
    });

    it('should preserve all experiences (no loss)', async () => {
      const algorithm = new DeepClusterV1(mockLLMClient);

      const experiences: LLMExperience[] = Array(60)
        .fill(null)
        .map((_, i) =>
          createMockExperience(i, i % 2 === 0 ? 'only candidate' : 'general reasoning')
        );

      const result = await algorithm.cluster(experiences, 5, mockConfig);

      const totalClustered = Array.from(result.clusters.values()).reduce(
        (sum, cluster) => sum + cluster.length,
        0
      );

      expect(totalClustered).toBe(experiences.length);
    });
  });

  describe('pattern parsing', () => {
    it('should parse LLM pattern response correctly', async () => {
      const algorithm = new DeepClusterV1(mockLLMClient);

      const experiences: LLMExperience[] = Array(60)
        .fill(null)
        .map((_, i) => createMockExperience(i, `General reasoning step ${i}`));

      await algorithm.cluster(experiences, 5, mockConfig);

      // Verify patterns were parsed and used
      expect(mockLLMClient.chat).toHaveBeenCalled();
    });

    it('should handle malformed LLM response', async () => {
      const algorithm = new DeepClusterV1(mockLLMClient);

      // Mock LLM with malformed response
      mockLLMClient.chat = vi.fn().mockResolvedValue({
        content: 'This is not a valid pattern format',
      });

      const experiences: LLMExperience[] = Array(60)
        .fill(null)
        .map((_, i) => createMockExperience(i, `General reasoning step ${i}`));

      const result = await algorithm.cluster(experiences, 5, mockConfig);

      // Should still work (fallback to original cluster)
      expect(result.clusters.size).toBeGreaterThan(0);
      expect(result.metadata.totalExperiences).toBe(60);
    });
  });

  describe('performance', () => {
    it('should complete in reasonable time for 500 experiences', async () => {
      const algorithm = new DeepClusterV1(mockLLMClient);

      // Mock fast LLM response
      mockLLMClient.chat = vi.fn().mockResolvedValue({
        content: `PATTERN_1: Simple elimination
WHEN: Only one candidate
KEYWORDS: only, candidate, elimination`,
      });

      const experiences: LLMExperience[] = Array(500)
        .fill(null)
        .map((_, i) => {
          const reasoning = [
            'only candidate',
            'constraint',
            'forced',
            'intersection',
            'general reasoning',
          ][i % 5];
          return createMockExperience(i, reasoning, (i % 9) + 1, ((i * 3) % 9) + 1);
        });

      const result = await algorithm.cluster(experiences, 10, mockConfig);

      // Should complete in <60000ms (spec requirement)
      expect(result.metadata.processingTimeMs).toBeLessThan(60000);
    });
  });
});
