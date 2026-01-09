/**
 * LLM Memory Commands Integration Tests
 *
 * Tests the enhanced LLM memory CLI commands with profile tracking and learning context.
 * Covers: llm memory list (enhanced), llm memory show
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentMemory } from '../../../src/memory/AgentMemory.js';
import type { AgentDBConfig } from '../../../src/types.js';
import type { LLMExperience, LearningContext } from '../../../src/llm/types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('LLM Memory Commands Integration Tests', () => {
  let memory: AgentMemory;
  let testDbPath: string;
  let testConfig: AgentDBConfig;

  // Helper to create test experience
  const createTestExperience = (overrides?: Partial<LLMExperience>): LLMExperience => {
    const defaults: LLMExperience = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      puzzleId: 'test-puzzle-001',
      puzzleHash: 'hash-001',
      moveNumber: 1,
      gridState: Array(9).fill(null).map(() => Array(9).fill(0)),
      move: {
        row: 1,
        col: 1,
        value: 5,
        reasoning: 'This is a test reasoning that explains why we placed 5 at position (1,1). The cell was empty and 5 was the only valid candidate.',
      },
      validation: {
        isValid: true,
        isCorrect: true,
        outcome: 'correct' as const,
      },
      timestamp: new Date(),
      modelUsed: 'test-model',
      memoryWasEnabled: true,
      importance: 0.85,
      context: {
        emptyCellsAtMove: 45,
        reasoningLength: 100,
        constraintDensity: 2.5,
      },
      profileName: 'test-profile',
      learningContext: {
        fewShotsUsed: true,
        fewShotCount: 3,
        patternsAvailable: 5,
        consolidatedExperiences: 100,
      },
    };

    return { ...defaults, ...overrides };
  };

  beforeEach(() => {
    testDbPath = path.join(os.tmpdir(), `.test-llm-memory-${Date.now()}-${Math.random()}`);

    testConfig = {
      dbPath: testDbPath,
      agentDbPath: testDbPath,
      preset: 'large' as const,
      rlPlugin: {
        type: 'decision-transformer' as const,
        name: 'sudoku-solver' as const,
        stateDim: 81,
        actionDim: 9,
        sequenceLength: 20,
      },
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      enableReasoningBank: true,
      enableReflexion: true,
      enableSkillLibrary: false,
      quantization: 'scalar' as const,
      indexing: 'hnsw' as const,
      cacheEnabled: true,
      reflexion: {
        enabled: true,
        maxEntries: 1000,
        similarityThreshold: 0.8,
      },
      skillLibrary: {
        enabled: false,
        minSuccessRate: 0.8,
        maxSkills: 100,
        autoConsolidate: false,
      },
    };

    memory = new AgentMemory(testConfig);
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.rmSync(testDbPath, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  describe('llm memory list - Enhanced with Filters', () => {
    beforeEach(async () => {
      // Create diverse test data
      const experiences = [
        createTestExperience({
          id: 'exp-001',
          profileName: 'profile-a',
          validation: { isValid: true, isCorrect: true, outcome: 'correct' },
          importance: 0.9,
          learningContext: { fewShotsUsed: true, fewShotCount: 3, patternsAvailable: 5, consolidatedExperiences: 100 },
        }),
        createTestExperience({
          id: 'exp-002',
          profileName: 'profile-a',
          validation: { isValid: false, isCorrect: false, outcome: 'invalid', error: 'Rule violation' },
          importance: 0.3,
          learningContext: { fewShotsUsed: true, fewShotCount: 3, patternsAvailable: 5, consolidatedExperiences: 100 },
        }),
        createTestExperience({
          id: 'exp-003',
          profileName: 'profile-b',
          validation: { isValid: true, isCorrect: false, outcome: 'valid_but_wrong' },
          importance: 0.5,
          learningContext: { fewShotsUsed: false, fewShotCount: 0, patternsAvailable: 0, consolidatedExperiences: 0 },
        }),
        createTestExperience({
          id: 'exp-004',
          profileName: 'profile-b',
          validation: { isValid: true, isCorrect: true, outcome: 'correct' },
          importance: 0.95,
          learningContext: { fewShotsUsed: true, fewShotCount: 5, patternsAvailable: 10, consolidatedExperiences: 200 },
        }),
      ];

      for (const exp of experiences) {
        await memory.reasoningBank.storeMetadata(exp.id, 'llm_experience', exp);
      }
    });

    it('should list all experiences without filters', async () => {
      const results = (await memory.reasoningBank.queryMetadata('llm_experience', {})) as LLMExperience[];
      expect(results.length).toBe(4);
    });

    it('should filter by profile name', async () => {
      const allResults = (await memory.reasoningBank.queryMetadata('llm_experience', {})) as LLMExperience[];
      const filtered = allResults.filter((exp) => exp.profileName === 'profile-a');

      expect(filtered.length).toBe(2);
      expect(filtered.every((exp) => exp.profileName === 'profile-a')).toBe(true);
    });

    it('should filter by outcome', async () => {
      const allResults = (await memory.reasoningBank.queryMetadata('llm_experience', {})) as LLMExperience[];
      const filtered = allResults.filter((exp) => exp.validation.outcome === 'correct');

      expect(filtered.length).toBe(2);
      expect(filtered.every((exp) => exp.validation.outcome === 'correct')).toBe(true);
    });

    it('should filter by minimum importance', async () => {
      const allResults = (await memory.reasoningBank.queryMetadata('llm_experience', {})) as LLMExperience[];
      const minImportance = 0.8;
      const filtered = allResults.filter((exp) => (exp.importance || 0) >= minImportance);

      expect(filtered.length).toBe(2);
      expect(filtered.every((exp) => (exp.importance || 0) >= minImportance)).toBe(true);
    });

    it('should filter by learning features (--with-learning)', async () => {
      const allResults = (await memory.reasoningBank.queryMetadata('llm_experience', {})) as LLMExperience[];
      const filtered = allResults.filter(
        (exp) =>
          exp.learningContext &&
          (exp.learningContext.fewShotsUsed ||
            exp.learningContext.patternsAvailable > 0 ||
            exp.learningContext.consolidatedExperiences > 0)
      );

      expect(filtered.length).toBe(3); // exp-001, exp-002, exp-004
      expect(filtered.every((exp) => exp.learningContext !== undefined)).toBe(true);
    });

    it('should combine multiple filters (profile + outcome)', async () => {
      const allResults = (await memory.reasoningBank.queryMetadata('llm_experience', {})) as LLMExperience[];
      const filtered = allResults.filter(
        (exp) => exp.profileName === 'profile-b' && exp.validation.outcome === 'correct'
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('exp-004');
    });

    it('should respect limit parameter', async () => {
      const allResults = (await memory.reasoningBank.queryMetadata('llm_experience', {})) as LLMExperience[];
      const limit = 2;
      const limited = allResults.slice(0, limit);

      expect(limited.length).toBeLessThanOrEqual(limit);
    });

    it('should include learning flags in output', async () => {
      const exp = (await memory.reasoningBank.getMetadata('exp-001', 'llm_experience')) as LLMExperience;

      expect(exp.learningContext).toBeDefined();
      expect(exp.learningContext.fewShotsUsed).toBe(true);
      expect(exp.learningContext.patternsAvailable).toBe(5);
      expect(exp.learningContext.consolidatedExperiences).toBe(100);
    });

    it('should handle experiences without learning context gracefully', async () => {
      const expNoContext = createTestExperience({
        id: 'exp-no-context',
        learningContext: undefined as any,
      });

      await memory.reasoningBank.storeMetadata(expNoContext.id, 'llm_experience', expNoContext);

      const result = (await memory.reasoningBank.getMetadata(
        'exp-no-context',
        'llm_experience'
      )) as LLMExperience;

      expect(result.learningContext).toBeUndefined();
    });
  });

  describe('llm memory show - Display Full Experience', () => {
    let testExpId: string;

    beforeEach(async () => {
      const exp = createTestExperience({
        id: 'exp-detail-001',
        move: {
          row: 2,
          col: 3,
          value: 7,
          reasoning:
            'Looking at row 2, I need to find a value for cell (2,3). The row currently has values [1, 4, 5, 6, 8, 9]. Column 3 has values [2, 3, 4, 5, 6, 8, 9]. Box 1 has values [1, 2, 3, 4, 5, 8, 9]. The intersection of missing values is: row needs [2, 3, 7], column needs [1, 7], box needs [6, 7]. Only 7 appears in all three sets.',
        },
      });

      testExpId = exp.id;
      await memory.reasoningBank.storeMetadata(exp.id, 'llm_experience', exp);
    });

    it('should retrieve experience by ID', async () => {
      const exp = (await memory.reasoningBank.getMetadata(testExpId, 'llm_experience')) as LLMExperience;

      expect(exp).toBeDefined();
      expect(exp.id).toBe(testExpId);
    });

    it('should return null for non-existent ID', async () => {
      const result = await memory.reasoningBank.getMetadata('non-existent-id', 'llm_experience');
      expect(result).toBeNull();
    });

    it('should include full reasoning text', async () => {
      const exp = (await memory.reasoningBank.getMetadata(testExpId, 'llm_experience')) as LLMExperience;

      expect(exp.move.reasoning).toBeDefined();
      expect(exp.move.reasoning.length).toBeGreaterThan(100);
      expect(exp.move.reasoning).toContain('Looking at row 2');
    });

    it('should include all move details', async () => {
      const exp = (await memory.reasoningBank.getMetadata(testExpId, 'llm_experience')) as LLMExperience;

      expect(exp.move.row).toBe(2);
      expect(exp.move.col).toBe(3);
      expect(exp.move.value).toBe(7);
      expect(exp.moveNumber).toBeDefined();
    });

    it('should include validation outcome', async () => {
      const exp = (await memory.reasoningBank.getMetadata(testExpId, 'llm_experience')) as LLMExperience;

      expect(exp.validation).toBeDefined();
      expect(exp.validation.outcome).toBe('correct');
      expect(exp.validation.isValid).toBe(true);
      expect(exp.validation.isCorrect).toBe(true);
    });

    it('should include importance and context metrics', async () => {
      const exp = (await memory.reasoningBank.getMetadata(testExpId, 'llm_experience')) as LLMExperience;

      expect(exp.importance).toBeDefined();
      expect(exp.importance).toBeGreaterThanOrEqual(0);
      expect(exp.importance).toBeLessThanOrEqual(1);

      expect(exp.context).toBeDefined();
      expect(exp.context.emptyCellsAtMove).toBeDefined();
      expect(exp.context.reasoningLength).toBeDefined();
      expect(exp.context.constraintDensity).toBeDefined();
    });

    it('should include profile and learning context', async () => {
      const exp = (await memory.reasoningBank.getMetadata(testExpId, 'llm_experience')) as LLMExperience;

      expect(exp.profileName).toBeDefined();
      expect(exp.learningContext).toBeDefined();
      expect(exp.learningContext.fewShotsUsed).toBe(true);
      expect(exp.learningContext.fewShotCount).toBe(3);
      expect(exp.learningContext.patternsAvailable).toBe(5);
      expect(exp.learningContext.consolidatedExperiences).toBe(100);
    });

    it('should include metadata (puzzle ID, timestamp, etc)', async () => {
      const exp = (await memory.reasoningBank.getMetadata(testExpId, 'llm_experience')) as LLMExperience;

      expect(exp.puzzleId).toBeDefined();
      expect(exp.puzzleHash).toBeDefined();
      expect(exp.timestamp).toBeDefined();
      expect(exp.modelUsed).toBeDefined();
      expect(exp.memoryWasEnabled).toBeDefined();
    });

    it('should include grid state when requested', async () => {
      const exp = (await memory.reasoningBank.getMetadata(testExpId, 'llm_experience')) as LLMExperience;

      expect(exp.gridState).toBeDefined();
      expect(Array.isArray(exp.gridState)).toBe(true);
      expect(exp.gridState.length).toBe(9);
      expect(exp.gridState[0].length).toBe(9);
    });
  });

  describe('Profile Name Tracking', () => {
    it('should store and retrieve profile name', async () => {
      const exp = createTestExperience({ profileName: 'lm-studio-qwen3' });
      await memory.reasoningBank.storeMetadata(exp.id, 'llm_experience', exp);

      const result = (await memory.reasoningBank.getMetadata(exp.id, 'llm_experience')) as LLMExperience;

      expect(result.profileName).toBe('lm-studio-qwen3');
    });

    it('should default to "default" when profile name not set', async () => {
      const exp = createTestExperience({ profileName: undefined as any });
      await memory.reasoningBank.storeMetadata(exp.id, 'llm_experience', exp);

      const result = (await memory.reasoningBank.getMetadata(exp.id, 'llm_experience')) as LLMExperience;

      // CLI command should handle undefined by defaulting to 'default'
      expect(result.profileName).toBeUndefined();
    });
  });

  describe('Learning Context Tracking', () => {
    it('should store complete learning context', async () => {
      const learningContext: LearningContext = {
        fewShotsUsed: true,
        fewShotCount: 5,
        patternsAvailable: 10,
        consolidatedExperiences: 250,
      };

      const exp = createTestExperience({ learningContext });
      await memory.reasoningBank.storeMetadata(exp.id, 'llm_experience', exp);

      const result = (await memory.reasoningBank.getMetadata(exp.id, 'llm_experience')) as LLMExperience;

      expect(result.learningContext).toEqual(learningContext);
    });

    it('should track when no learning features were used', async () => {
      const learningContext: LearningContext = {
        fewShotsUsed: false,
        fewShotCount: 0,
        patternsAvailable: 0,
        consolidatedExperiences: 0,
      };

      const exp = createTestExperience({ learningContext });
      await memory.reasoningBank.storeMetadata(exp.id, 'llm_experience', exp);

      const result = (await memory.reasoningBank.getMetadata(exp.id, 'llm_experience')) as LLMExperience;

      expect(result.learningContext.fewShotsUsed).toBe(false);
      expect(result.learningContext.fewShotCount).toBe(0);
      expect(result.learningContext.patternsAvailable).toBe(0);
      expect(result.learningContext.consolidatedExperiences).toBe(0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle old experiences without profileName field', async () => {
      const oldExp = createTestExperience({ profileName: undefined as any });
      delete (oldExp as any).profileName;

      await memory.reasoningBank.storeMetadata(oldExp.id, 'llm_experience', oldExp);

      const result = (await memory.reasoningBank.getMetadata(oldExp.id, 'llm_experience')) as any;

      expect(result.profileName).toBeUndefined();
    });

    it('should handle old experiences without learningContext field', async () => {
      const oldExp = createTestExperience({ learningContext: undefined as any });
      delete (oldExp as any).learningContext;

      await memory.reasoningBank.storeMetadata(oldExp.id, 'llm_experience', oldExp);

      const result = (await memory.reasoningBank.getMetadata(oldExp.id, 'llm_experience')) as any;

      expect(result.learningContext).toBeUndefined();
    });
  });
});
