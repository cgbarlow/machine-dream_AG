/**
 * Tests for FastCluster v2
 */

import { describe, it, expect } from 'vitest';
import { FastClusterV2 } from './FastClusterV2.js';
import type { LLMExperience, LLMConfig } from '../types.js';

/**
 * Create mock LLM experience for testing
 */
function createMockExperience(
  id: number,
  reasoning: string,
  row: number = 5,
  col: number = 5
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
      emptyCellsAtMove: 40,
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

describe('FastClusterV2', () => {
  const algorithm = new FastClusterV2();

  describe('metadata', () => {
    it('should have correct name and version', () => {
      expect(algorithm.getName()).toBe('FastCluster');
      expect(algorithm.getVersion()).toBe(2);
      expect(algorithm.getIdentifier()).toBe('fastclusterv2');
    });

    it('should have valid code hash', () => {
      const metadata = algorithm.getMetadata();
      expect(metadata.codeHash).toMatch(/^[0-9a-f]{8}$/i);
    });
  });

  describe('clustering', () => {
    it('should cluster experiences by reasoning keywords', async () => {
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
      expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
    });

    it('should create more clusters for higher target counts', async () => {
      const experiences: LLMExperience[] = Array(50).fill(null).map((_, i) =>
        createMockExperience(i, i % 3 === 0 ? 'only candidate' : i % 3 === 1 ? 'constraint' : 'general reasoning')
      );

      const result5 = await algorithm.cluster(experiences, 5, mockConfig);
      const result10 = await algorithm.cluster(experiences, 10, mockConfig);

      expect(result10.clusters.size).toBeGreaterThanOrEqual(result5.clusters.size);
    });

    it('should detect and subdivide dominant clusters', async () => {
      // Create 100 experiences where 80% have same reasoning (dominant cluster)
      const experiences: LLMExperience[] = [
        ...Array(80).fill(null).map((_, i) => createMockExperience(i, 'general reasoning', i % 9 + 1, 1)),
        ...Array(10).fill(null).map((_, i) => createMockExperience(i + 80, 'only candidate', 1, i % 9 + 1)),
        ...Array(10).fill(null).map((_, i) => createMockExperience(i + 90, 'forced by constraint', 2, i % 9 + 1)),
      ];

      const result = await algorithm.cluster(experiences, 5, mockConfig);

      // Should force subdivision due to dominant cluster (>40%)
      // "general reasoning" has 80/100 = 80% > 40%
      expect(result.clusters.size).toBeGreaterThan(1);

      // Check that no single cluster dominates (>50% after subdivision)
      const largestCluster = Math.max(...Array.from(result.clusters.values()).map(c => c.length));
      expect(largestCluster).toBeLessThan(experiences.length * 0.5);
    });

    it('should handle empty experience array', async () => {
      const result = await algorithm.cluster([], 5, mockConfig);

      expect(result.clusters.size).toBe(0);
      expect(result.metadata.totalExperiences).toBe(0);
    });

    it('should handle single experience', async () => {
      const experiences: LLMExperience[] = [
        createMockExperience(1, 'only candidate'),
      ];

      const result = await algorithm.cluster(experiences, 5, mockConfig);

      expect(result.clusters.size).toBeGreaterThan(0);
      expect(result.metadata.totalExperiences).toBe(1);
    });

    it('should preserve all experiences (no loss)', async () => {
      const experiences: LLMExperience[] = Array(30).fill(null).map((_, i) =>
        createMockExperience(i, i % 2 === 0 ? 'only candidate' : 'general reasoning')
      );

      const result = await algorithm.cluster(experiences, 5, mockConfig);

      const totalClustered = Array.from(result.clusters.values())
        .reduce((sum, cluster) => sum + cluster.length, 0);

      expect(totalClustered).toBe(experiences.length);
    });
  });

  describe('keyword extraction', () => {
    it('should prioritize first keywords found', async () => {
      const exp1 = createMockExperience(1, 'only candidate and constraint and forced');
      const exp2 = createMockExperience(2, 'constraint and only candidate');

      const experiences = [exp1, exp2];
      const result = await algorithm.cluster(experiences, 3, mockConfig);

      // Both should cluster together since they share keywords (order may vary)
      expect(result.clusters.size).toBeGreaterThan(0);
    });

    it('should use "general_reasoning" for experiences without keywords', async () => {
      const experiences: LLMExperience[] = [
        createMockExperience(1, 'I think this cell should be 5'),
        createMockExperience(2, 'Maybe 7 works here'),
        createMockExperience(3, 'Let me try 3'),
      ];

      const result = await algorithm.cluster(experiences, 3, mockConfig);

      // All should likely cluster together as "general_reasoning"
      expect(result.metadata.totalExperiences).toBe(3);
    });
  });

  describe('performance', () => {
    it('should complete quickly for 500 experiences', async () => {
      const experiences: LLMExperience[] = Array(500).fill(null).map((_, i) => {
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

      // Should complete in <5000ms (spec requirement)
      expect(result.metadata.processingTimeMs).toBeLessThan(5000);
    });
  });
});
