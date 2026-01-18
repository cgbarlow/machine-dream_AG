/**
 * Tests for LearningUnitManager
 *
 * TDD Tests for:
 * - clone() method (Plan: Step B1)
 * - unconsolidateExperiences() method (Plan: Step B2)
 * - markExperiencesAbsorbed() with preserveOriginals option (Plan: Step B3)
 *
 * Spec References:
 * - docs/specs/09-cli-interface-spec.md Section 3.8.11
 * - docs/specs/05-dreaming-pipeline-spec.md Section 8.6.1
 * - docs/specs/11-llm-sudoku-player.md Experience Preservation Mode
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LearningUnitManager } from '../../../src/llm/LearningUnitManager.js';
import type { AgentMemory } from '../../../src/memory/AgentMemory.js';
import type { LearningUnit, LLMExperience } from '../../../src/llm/types.js';
import { LLM_STORAGE_KEYS } from '../../../src/llm/storage-keys.js';
import { AlgorithmRegistry } from '../../../src/llm/clustering/AlgorithmRegistry.js';

// Mock AlgorithmRegistry to avoid initialization issues
vi.mock('../../../src/llm/clustering/AlgorithmRegistry.js', () => ({
  AlgorithmRegistry: {
    getInstance: () => ({
      mapLegacyUnit: (id: string) => id, // Return same ID (no mapping)
      getDefaultAlgorithm: () => null,
    }),
  },
}));

// Mock AgentMemory
const createMockAgentMemory = () => {
  const storage = new Map<string, unknown>();

  return {
    reasoningBank: {
      storeMetadata: vi.fn(async (key: string, _type: string, data: unknown) => {
        storage.set(key, data);
      }),
      getMetadata: vi.fn(async (key: string, _type: string) => {
        return storage.get(key) || null;
      }),
      deleteMetadata: vi.fn(async (key: string, _type: string) => {
        return storage.delete(key);
      }),
      listByType: vi.fn(async (type: string) => {
        const items: { key: string; value: unknown }[] = [];
        for (const [key, value] of storage.entries()) {
          if (type === LLM_STORAGE_KEYS.UNIT_EXPERIENCE_TYPE && key.startsWith('unit_exp:')) {
            items.push({ key, value });
          } else if (type === LLM_STORAGE_KEYS.EXPERIENCE_TYPE && !key.startsWith('unit_exp:')) {
            items.push({ key, value });
          } else if (type === LLM_STORAGE_KEYS.LEARNING_UNIT_TYPE && key.startsWith('llm_learning_unit:')) {
            items.push({ key, value });
          }
        }
        return items;
      }),
      queryMetadata: vi.fn(async (type: string, filter: Record<string, unknown>) => {
        const items: unknown[] = [];
        for (const [key, value] of storage.entries()) {
          if (type === LLM_STORAGE_KEYS.UNIT_EXPERIENCE_TYPE && key.startsWith('unit_exp:')) {
            const exp = value as Record<string, unknown>;
            // Filter by boundToUnit if specified
            if (filter.boundToUnit && exp.boundToUnit !== filter.boundToUnit) {
              continue;
            }
            items.push(value);
          }
        }
        return items;
      }),
    },
    _storage: storage, // Expose for test assertions
  } as unknown as AgentMemory & { _storage: Map<string, unknown> };
};

// Create mock experience
const createMockExperience = (id: string, overrides: Partial<LLMExperience> = {}): LLMExperience => ({
  id,
  puzzleId: `puzzle-${id}`,
  move: { row: 1, col: 1, value: 5 },
  reasoning: `Test reasoning for ${id}`,
  validation: { outcome: 'correct', isCorrect: true },
  timestamp: new Date(),
  sessionId: 'test-session',
  importance: 0.8,
  consolidated: false,
  ...overrides,
} as LLMExperience);

// Create mock learning unit
const createMockLearningUnit = (id: string, overrides: Partial<LearningUnit> = {}): LearningUnit => ({
  id,
  name: `Test Unit ${id}`,
  profile: 'test-profile',
  description: 'Test learning unit',
  fewShots: [
    { situation: 'Test situation', steps: ['Step 1', 'Step 2'], example: 'Example', successInsight: 'Insight' },
  ],
  absorbedExperienceIds: [],
  createdAt: new Date(),
  lastUpdatedAt: new Date(),
  metadata: {
    version: 1,
    totalExperiences: 0,
    puzzleBreakdown: {},
  },
  ...overrides,
});

describe('LearningUnitManager', () => {
  let mockAgentMemory: AgentMemory & { _storage: Map<string, unknown> };
  let manager: LearningUnitManager;

  beforeEach(() => {
    mockAgentMemory = createMockAgentMemory();
    manager = new LearningUnitManager(mockAgentMemory, 'test-profile');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('clone() - Plan Step B1', () => {
    it('should clone a learning unit with a new ID', async () => {
      // Setup: Create source unit
      const sourceUnit = createMockLearningUnit('source-unit');
      const metadataKey = LLM_STORAGE_KEYS.getLearningUnitKey('test-profile', 'source-unit');
      mockAgentMemory._storage.set(metadataKey, sourceUnit);

      // Store few-shots for source unit (wrapped in { examples: [...] } as saveFewShots() does)
      const fewShotsKey = LLM_STORAGE_KEYS.getFewShotsKey('test-profile', 'source-unit');
      mockAgentMemory._storage.set(fewShotsKey, {
        examples: sourceUnit.fewShots,
        updated: new Date(),
        profileName: 'test-profile',
        learningUnitId: 'source-unit',
      });

      // Execute: Clone the unit
      const cloned = await manager.clone('source-unit', 'target-unit');

      // Assert: Cloned unit has correct properties
      expect(cloned.id).toBe('target-unit');
      expect(cloned.name).toBe('Test Unit source-unit (clone)');
      expect(cloned.fewShots).toEqual(sourceUnit.fewShots);
      expect(cloned.profile).toBe(sourceUnit.profile);
    });

    it('should copy all unit-bound experiences to cloned unit', async () => {
      // Setup: Create source unit with experiences
      const sourceUnit = createMockLearningUnit('source-unit', {
        absorbedExperienceIds: ['exp-1', 'exp-2'],
        metadata: { version: 1, totalExperiences: 2, puzzleBreakdown: { '9x9-easy': 2 } },
      });
      const metadataKey = LLM_STORAGE_KEYS.getLearningUnitKey('test-profile', 'source-unit');
      mockAgentMemory._storage.set(metadataKey, sourceUnit);

      // Store unit-bound experiences
      const exp1 = createMockExperience('exp-1', { boundToUnit: 'source-unit' });
      const exp2 = createMockExperience('exp-2', { boundToUnit: 'source-unit' });
      mockAgentMemory._storage.set(LLM_STORAGE_KEYS.getUnitExperienceKey('source-unit', 'exp-1'), exp1);
      mockAgentMemory._storage.set(LLM_STORAGE_KEYS.getUnitExperienceKey('source-unit', 'exp-2'), exp2);

      // Execute: Clone the unit
      const cloned = await manager.clone('source-unit', 'target-unit');

      // Assert: Cloned unit has the experiences
      expect(cloned.absorbedExperienceIds).toContain('exp-1');
      expect(cloned.absorbedExperienceIds).toContain('exp-2');

      // Assert: Experience copies exist in target unit storage
      const targetExp1Key = LLM_STORAGE_KEYS.getUnitExperienceKey('target-unit', 'exp-1');
      const targetExp1 = mockAgentMemory._storage.get(targetExp1Key) as LLMExperience;
      expect(targetExp1).toBeDefined();
      expect(targetExp1.boundToUnit).toBe('target-unit');
    });

    it('should copy hierarchy if it exists', async () => {
      // Setup: Create source unit with hierarchy
      const hierarchy = {
        levels: [{ level: 0, name: 'Techniques', patterns: [], generalizations: [], exampleCount: 10 }],
        domain: 'Sudoku',
        createdAt: Date.now(),
        metadata: { sourcePatternCount: 5, abstractionMethod: 'llm', verificationScore: 0.9 },
      };
      const sourceUnit = createMockLearningUnit('source-unit', { hierarchy });
      const metadataKey = LLM_STORAGE_KEYS.getLearningUnitKey('test-profile', 'source-unit');
      mockAgentMemory._storage.set(metadataKey, sourceUnit);

      // Store hierarchy separately (as saveHierarchy() does)
      const hierarchyKey = `llm_hierarchy:test-profile:source-unit`;
      mockAgentMemory._storage.set(hierarchyKey, {
        ...hierarchy,
        profileName: 'test-profile',
        learningUnitId: 'source-unit',
      });

      // Execute: Clone the unit
      const cloned = await manager.clone('source-unit', 'target-unit');

      // Assert: Hierarchy was copied
      expect(cloned.hierarchy).toBeDefined();
      expect(cloned.hierarchy?.levels).toEqual(hierarchy.levels);
    });

    it('should throw error if source unit does not exist', async () => {
      await expect(manager.clone('nonexistent', 'target')).rejects.toThrow(
        /Source unit 'nonexistent' not found/
      );
    });

    it('should throw error if target unit already exists', async () => {
      // Setup: Create both source and target units
      const sourceUnit = createMockLearningUnit('source-unit');
      const targetUnit = createMockLearningUnit('target-unit');
      mockAgentMemory._storage.set(
        LLM_STORAGE_KEYS.getLearningUnitKey('test-profile', 'source-unit'),
        sourceUnit
      );
      mockAgentMemory._storage.set(
        LLM_STORAGE_KEYS.getLearningUnitKey('test-profile', 'target-unit'),
        targetUnit
      );

      await expect(manager.clone('source-unit', 'target-unit')).rejects.toThrow(
        /Target unit 'target-unit' already exists/
      );
    });
  });

  describe('unconsolidateExperiences() - Plan Step B2', () => {
    it('should restore unit-bound experiences to global pool', async () => {
      // Setup: Create unit with bound experiences
      const unit = createMockLearningUnit('test-unit', {
        absorbedExperienceIds: ['exp-1', 'exp-2'],
      });
      mockAgentMemory._storage.set(
        LLM_STORAGE_KEYS.getLearningUnitKey('test-profile', 'test-unit'),
        unit
      );

      // Store unit-bound experiences
      const exp1 = createMockExperience('exp-1', {
        boundToUnit: 'test-unit',
        boundAt: '2026-01-19T10:00:00Z',
        consolidated: true,
      });
      const exp2 = createMockExperience('exp-2', {
        boundToUnit: 'test-unit',
        boundAt: '2026-01-19T10:00:00Z',
        consolidated: true,
      });
      mockAgentMemory._storage.set(LLM_STORAGE_KEYS.getUnitExperienceKey('test-unit', 'exp-1'), exp1);
      mockAgentMemory._storage.set(LLM_STORAGE_KEYS.getUnitExperienceKey('test-unit', 'exp-2'), exp2);

      // Execute: Unconsolidate experiences
      const restoredCount = await manager.unconsolidateExperiences('test-unit');

      // Assert: Experiences were restored to global pool
      expect(restoredCount).toBe(2);

      // Check global experiences exist
      const globalExp1 = mockAgentMemory._storage.get('exp-1') as LLMExperience;
      expect(globalExp1).toBeDefined();
      expect(globalExp1.consolidated).toBe(false);
      expect(globalExp1.boundToUnit).toBeUndefined();
      expect(globalExp1.boundAt).toBeUndefined();
    });

    it('should remove unit binding metadata from restored experiences', async () => {
      // Setup: Create unit with bound experience
      const unit = createMockLearningUnit('test-unit', {
        absorbedExperienceIds: ['exp-1'],
      });
      mockAgentMemory._storage.set(
        LLM_STORAGE_KEYS.getLearningUnitKey('test-profile', 'test-unit'),
        unit
      );

      const exp = createMockExperience('exp-1', {
        boundToUnit: 'test-unit',
        boundAt: '2026-01-19T10:00:00Z',
        unitVersion: 3,
        consolidated: true,
      });
      mockAgentMemory._storage.set(LLM_STORAGE_KEYS.getUnitExperienceKey('test-unit', 'exp-1'), exp);

      // Execute: Unconsolidate
      await manager.unconsolidateExperiences('test-unit');

      // Assert: Binding metadata was removed
      const globalExp = mockAgentMemory._storage.get('exp-1') as LLMExperience & { unitVersion?: number };
      expect(globalExp.boundToUnit).toBeUndefined();
      expect(globalExp.boundAt).toBeUndefined();
      expect(globalExp.unitVersion).toBeUndefined();
      expect(globalExp.consolidated).toBe(false);
    });

    it('should return 0 if unit has no experiences', async () => {
      // Setup: Create unit with no experiences
      const unit = createMockLearningUnit('empty-unit', {
        absorbedExperienceIds: [],
      });
      mockAgentMemory._storage.set(
        LLM_STORAGE_KEYS.getLearningUnitKey('test-profile', 'empty-unit'),
        unit
      );

      // Execute: Unconsolidate
      const restoredCount = await manager.unconsolidateExperiences('empty-unit');

      // Assert: No experiences restored
      expect(restoredCount).toBe(0);
    });

    it('should throw error if unit does not exist', async () => {
      await expect(manager.unconsolidateExperiences('nonexistent')).rejects.toThrow(
        /Learning unit 'nonexistent' not found/
      );
    });
  });

  describe('markExperiencesAbsorbed() with preserveOriginals - Plan Step B3', () => {
    it('should delete global experiences by default (preserveOriginals=false)', async () => {
      // Setup: Create unit and global experiences
      const unit = createMockLearningUnit('test-unit');
      mockAgentMemory._storage.set(
        LLM_STORAGE_KEYS.getLearningUnitKey('test-profile', 'test-unit'),
        unit
      );

      const exp1 = createMockExperience('exp-1');
      const exp2 = createMockExperience('exp-2');
      mockAgentMemory._storage.set('exp-1', exp1);
      mockAgentMemory._storage.set('exp-2', exp2);

      // Execute: Mark as absorbed (default behavior)
      await manager.markExperiencesAbsorbed('test-unit', ['exp-1', 'exp-2'], undefined, [exp1, exp2]);

      // Assert: Global experiences were deleted
      expect(mockAgentMemory.reasoningBank.deleteMetadata).toHaveBeenCalledWith(
        'exp-1',
        expect.any(String)
      );
      expect(mockAgentMemory.reasoningBank.deleteMetadata).toHaveBeenCalledWith(
        'exp-2',
        expect.any(String)
      );
    });

    it('should preserve global experiences when preserveOriginals=true', async () => {
      // Setup: Create unit and global experiences
      const unit = createMockLearningUnit('test-unit');
      mockAgentMemory._storage.set(
        LLM_STORAGE_KEYS.getLearningUnitKey('test-profile', 'test-unit'),
        unit
      );

      const exp1 = createMockExperience('exp-1');
      const exp2 = createMockExperience('exp-2');
      mockAgentMemory._storage.set('exp-1', exp1);
      mockAgentMemory._storage.set('exp-2', exp2);

      // Execute: Mark as absorbed with preserveOriginals=true
      await manager.markExperiencesAbsorbed(
        'test-unit',
        ['exp-1', 'exp-2'],
        undefined,
        [exp1, exp2],
        { preserveOriginals: true }
      );

      // Assert: Global experiences were NOT deleted
      expect(mockAgentMemory._storage.has('exp-1')).toBe(true);
      expect(mockAgentMemory._storage.has('exp-2')).toBe(true);

      // But unit-bound copies were still created
      expect(mockAgentMemory._storage.has(
        LLM_STORAGE_KEYS.getUnitExperienceKey('test-unit', 'exp-1')
      )).toBe(true);
      expect(mockAgentMemory._storage.has(
        LLM_STORAGE_KEYS.getUnitExperienceKey('test-unit', 'exp-2')
      )).toBe(true);
    });

    it('should still copy experiences to unit storage when preserveOriginals=true', async () => {
      // Setup: Create unit and global experience
      const unit = createMockLearningUnit('test-unit');
      mockAgentMemory._storage.set(
        LLM_STORAGE_KEYS.getLearningUnitKey('test-profile', 'test-unit'),
        unit
      );

      const exp = createMockExperience('exp-1');
      mockAgentMemory._storage.set('exp-1', exp);

      // Execute: Mark as absorbed with preserveOriginals=true
      await manager.markExperiencesAbsorbed(
        'test-unit',
        ['exp-1'],
        undefined,
        [exp],
        { preserveOriginals: true }
      );

      // Assert: Unit-bound copy was created
      const unitExpKey = LLM_STORAGE_KEYS.getUnitExperienceKey('test-unit', 'exp-1');
      const unitExp = mockAgentMemory._storage.get(unitExpKey) as LLMExperience;
      expect(unitExp).toBeDefined();
      expect(unitExp.boundToUnit).toBe('test-unit');
    });

    it('should support multiple dream runs with preserved experiences', async () => {
      // Setup: Create experiences in global pool
      const exp1 = createMockExperience('exp-1');
      const exp2 = createMockExperience('exp-2');
      mockAgentMemory._storage.set('exp-1', exp1);
      mockAgentMemory._storage.set('exp-2', exp2);

      // Execute: First dream run with preserve
      const unit1 = createMockLearningUnit('unit-1');
      mockAgentMemory._storage.set(
        LLM_STORAGE_KEYS.getLearningUnitKey('test-profile', 'unit-1'),
        unit1
      );
      await manager.markExperiencesAbsorbed(
        'unit-1',
        ['exp-1', 'exp-2'],
        undefined,
        [exp1, exp2],
        { preserveOriginals: true }
      );

      // Assert: Global experiences still exist for second run
      expect(mockAgentMemory._storage.has('exp-1')).toBe(true);
      expect(mockAgentMemory._storage.has('exp-2')).toBe(true);

      // Execute: Second dream run with preserve (different algorithm)
      const unit2 = createMockLearningUnit('unit-2');
      mockAgentMemory._storage.set(
        LLM_STORAGE_KEYS.getLearningUnitKey('test-profile', 'unit-2'),
        unit2
      );
      await manager.markExperiencesAbsorbed(
        'unit-2',
        ['exp-1', 'exp-2'],
        undefined,
        [exp1, exp2],
        { preserveOriginals: true }
      );

      // Assert: Both units have copies of experiences
      expect(mockAgentMemory._storage.has(
        LLM_STORAGE_KEYS.getUnitExperienceKey('unit-1', 'exp-1')
      )).toBe(true);
      expect(mockAgentMemory._storage.has(
        LLM_STORAGE_KEYS.getUnitExperienceKey('unit-2', 'exp-1')
      )).toBe(true);

      // Assert: Global experiences still exist
      expect(mockAgentMemory._storage.has('exp-1')).toBe(true);
      expect(mockAgentMemory._storage.has('exp-2')).toBe(true);

      // Execute: Final run WITHOUT preserve (consumes experiences)
      const unit3 = createMockLearningUnit('unit-3');
      mockAgentMemory._storage.set(
        LLM_STORAGE_KEYS.getLearningUnitKey('test-profile', 'unit-3'),
        unit3
      );
      await manager.markExperiencesAbsorbed(
        'unit-3',
        ['exp-1', 'exp-2'],
        undefined,
        [exp1, exp2]
        // No preserveOriginals option = delete after copy
      );

      // Assert: deleteMetadata was called for global experiences
      expect(mockAgentMemory.reasoningBank.deleteMetadata).toHaveBeenCalled();
    });
  });
});
