/**
 * Tests for AlgorithmRegistry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AlgorithmRegistry } from './AlgorithmRegistry.js';
import {
  BaseClusteringAlgorithm,
  type AlgorithmMetadata,
  type ClusteringResult,
} from './ClusteringAlgorithm.js';
import type { LLMExperience, LLMConfig } from '../types.js';

/**
 * Mock algorithm for testing
 */
class MockAlgorithm extends BaseClusteringAlgorithm {
  constructor(name: string, version: number) {
    const metadata: AlgorithmMetadata = {
      name,
      version,
      identifier: `${name.toLowerCase()}v${version}`,
      description: `Mock ${name} v${version}`,
      codeHash: '12345678',
      createdAt: new Date('2026-01-13'),
    };
    super(metadata);
  }

  async cluster(
    experiences: LLMExperience[],
    _targetCount: number,
    _config: LLMConfig
  ): Promise<ClusteringResult> {
    return {
      clusters: new Map(),
      metadata: {
        totalExperiences: experiences.length,
        clustersCreated: 0,
        processingTimeMs: 0,
      },
    };
  }
}

describe('AlgorithmRegistry', () => {
  let registry: AlgorithmRegistry;

  beforeEach(() => {
    // Get fresh registry instance and clear it
    registry = AlgorithmRegistry.getInstance();
    registry.clearAll();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AlgorithmRegistry.getInstance();
      const instance2 = AlgorithmRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('register', () => {
    it('should register an algorithm', () => {
      const algo = new MockAlgorithm('TestAlgo', 1);
      expect(() => registry.register(algo)).not.toThrow();
    });

    it('should throw on duplicate version', () => {
      const algo1 = new MockAlgorithm('TestAlgo', 1);
      const algo2 = new MockAlgorithm('TestAlgo', 1);

      registry.register(algo1);
      expect(() => registry.register(algo2)).toThrow(/already registered/);
    });

    it('should allow different versions of same algorithm', () => {
      const algo1 = new MockAlgorithm('TestAlgo', 1);
      const algo2 = new MockAlgorithm('TestAlgo', 2);

      expect(() => {
        registry.register(algo1);
        registry.register(algo2);
      }).not.toThrow();
    });

    it('should register as default when specified', () => {
      const algo = new MockAlgorithm('TestAlgo', 1);
      registry.register(algo, true);
      registry.setDefaultAlgorithm('TestAlgo');

      expect(registry.getDefaultAlgorithm()).toBe(algo);
    });
  });

  describe('getAlgorithm', () => {
    beforeEach(() => {
      registry.register(new MockAlgorithm('AlgoA', 1));
      registry.register(new MockAlgorithm('AlgoA', 2));
      registry.register(new MockAlgorithm('AlgoA', 3));
      registry.register(new MockAlgorithm('AlgoB', 1));
    });

    it('should return latest version when no version specified', () => {
      const algo = registry.getAlgorithm('AlgoA');
      expect(algo).not.toBeNull();
      expect(algo!.getVersion()).toBe(3);
    });

    it('should return specific version when requested', () => {
      const algo = registry.getAlgorithm('AlgoA', 2);
      expect(algo).not.toBeNull();
      expect(algo!.getVersion()).toBe(2);
    });

    it('should return null for non-existent algorithm', () => {
      const algo = registry.getAlgorithm('NonExistent');
      expect(algo).toBeNull();
    });

    it('should return null for non-existent version', () => {
      const algo = registry.getAlgorithm('AlgoA', 99);
      expect(algo).toBeNull();
    });
  });

  describe('getAllAlgorithms', () => {
    it('should return empty array when no algorithms registered', () => {
      const algorithms = registry.getAllAlgorithms();
      expect(algorithms).toEqual([]);
    });

    it('should return latest version of each algorithm', () => {
      registry.register(new MockAlgorithm('AlgoA', 1));
      registry.register(new MockAlgorithm('AlgoA', 2));
      registry.register(new MockAlgorithm('AlgoB', 1));
      registry.register(new MockAlgorithm('AlgoB', 3));

      const algorithms = registry.getAllAlgorithms();
      expect(algorithms).toHaveLength(2);

      const algoA = algorithms.find((a) => a.getName() === 'AlgoA');
      const algoB = algorithms.find((a) => a.getName() === 'AlgoB');

      expect(algoA?.getVersion()).toBe(2);
      expect(algoB?.getVersion()).toBe(3);
    });
  });

  describe('default algorithm', () => {
    it('should throw when default algorithm not registered', () => {
      expect(() => registry.getDefaultAlgorithm()).toThrow(/not registered/);
    });

    it('should return default algorithm after registration', () => {
      const algo = new MockAlgorithm('FastCluster', 2);
      registry.register(algo);
      registry.setDefaultAlgorithm('FastCluster');

      expect(registry.getDefaultAlgorithm()).toBe(algo);
    });

    it('should throw when setting non-existent algorithm as default', () => {
      expect(() => registry.setDefaultAlgorithm('NonExistent')).toThrow(
        /not registered/
      );
    });

    it('should allow changing default algorithm', () => {
      const algoA = new MockAlgorithm('AlgoA', 1);
      const algoB = new MockAlgorithm('AlgoB', 1);

      registry.register(algoA);
      registry.register(algoB);

      registry.setDefaultAlgorithm('AlgoA');
      expect(registry.getDefaultAlgorithm()).toBe(algoA);

      registry.setDefaultAlgorithm('AlgoB');
      expect(registry.getDefaultAlgorithm()).toBe(algoB);
    });
  });

  describe('mapLegacyUnit', () => {
    beforeEach(() => {
      const algo = new MockAlgorithm('FastCluster', 2);
      registry.register(algo);
      registry.setDefaultAlgorithm('FastCluster');
    });

    it('should return unchanged if already has algorithm', () => {
      const unitName = 'gpt-oss-120b_aisp_fastclusterv2_20260113';
      expect(registry.mapLegacyUnit(unitName)).toBe(unitName);
    });

    it('should insert algorithm before date', () => {
      const legacyName = 'gpt-oss-120b_aisp_20260113';
      const mapped = registry.mapLegacyUnit(legacyName);
      expect(mapped).toBe('gpt-oss-120b_aisp_fastclusterv2_20260113');
    });

    it('should preserve _2x suffix', () => {
      const legacyName = 'gpt-oss-120b_aisp_20260113_2x';
      const mapped = registry.mapLegacyUnit(legacyName);
      expect(mapped).toBe('gpt-oss-120b_aisp_fastclusterv2_20260113_2x');
    });

    it('should preserve collision suffix', () => {
      const legacyName = 'gpt-oss-120b_aisp_20260113_01';
      const mapped = registry.mapLegacyUnit(legacyName);
      expect(mapped).toBe('gpt-oss-120b_aisp_fastclusterv2_20260113_01');
    });

    it('should preserve both _2x and collision suffix', () => {
      const legacyName = 'gpt-oss-120b_aisp_20260113_2x_01';
      const mapped = registry.mapLegacyUnit(legacyName);
      expect(mapped).toBe('gpt-oss-120b_aisp_fastclusterv2_20260113_2x_01');
    });

    it('should append algorithm to end if no date pattern', () => {
      const legacyName = 'gpt-oss-120b_aisp';
      const mapped = registry.mapLegacyUnit(legacyName);
      expect(mapped).toBe('gpt-oss-120b_aisp_fastclusterv2');
    });

    it('should handle different algorithm identifiers', () => {
      const deepCluster = 'gpt-oss-120b_aisp_deepclusterv1_20260113';
      expect(registry.mapLegacyUnit(deepCluster)).toBe(deepCluster);

      const llmCluster = 'gpt-oss-120b_aisp_llmclusterv1_20260113';
      expect(registry.mapLegacyUnit(llmCluster)).toBe(llmCluster);
    });
  });

  describe('getAlgorithmNames', () => {
    it('should return empty array when no algorithms registered', () => {
      expect(registry.getAlgorithmNames()).toEqual([]);
    });

    it('should return all registered algorithm names', () => {
      registry.register(new MockAlgorithm('AlgoA', 1));
      registry.register(new MockAlgorithm('AlgoB', 1));
      registry.register(new MockAlgorithm('AlgoC', 1));

      const names = registry.getAlgorithmNames();
      expect(names).toContain('AlgoA');
      expect(names).toContain('AlgoB');
      expect(names).toContain('AlgoC');
      expect(names).toHaveLength(3);
    });

    it('should not duplicate names for multiple versions', () => {
      registry.register(new MockAlgorithm('AlgoA', 1));
      registry.register(new MockAlgorithm('AlgoA', 2));
      registry.register(new MockAlgorithm('AlgoA', 3));

      const names = registry.getAlgorithmNames();
      expect(names).toEqual(['AlgoA']);
    });
  });

  describe('getVersions', () => {
    it('should return empty array for non-existent algorithm', () => {
      expect(registry.getVersions('NonExistent')).toEqual([]);
    });

    it('should return all versions in descending order', () => {
      registry.register(new MockAlgorithm('AlgoA', 1));
      registry.register(new MockAlgorithm('AlgoA', 3));
      registry.register(new MockAlgorithm('AlgoA', 2));

      const versions = registry.getVersions('AlgoA');
      expect(versions).toEqual([3, 2, 1]);
    });
  });

  describe('hasAlgorithm', () => {
    beforeEach(() => {
      registry.register(new MockAlgorithm('AlgoA', 1));
      registry.register(new MockAlgorithm('AlgoA', 2));
    });

    it('should return true for registered algorithm', () => {
      expect(registry.hasAlgorithm('AlgoA')).toBe(true);
    });

    it('should return false for non-existent algorithm', () => {
      expect(registry.hasAlgorithm('NonExistent')).toBe(false);
    });

    it('should return true for registered version', () => {
      expect(registry.hasAlgorithm('AlgoA', 1)).toBe(true);
      expect(registry.hasAlgorithm('AlgoA', 2)).toBe(true);
    });

    it('should return false for non-existent version', () => {
      expect(registry.hasAlgorithm('AlgoA', 99)).toBe(false);
    });
  });

  describe('version sorting', () => {
    it('should return latest version first', () => {
      // Register in non-sequential order
      registry.register(new MockAlgorithm('AlgoA', 5));
      registry.register(new MockAlgorithm('AlgoA', 2));
      registry.register(new MockAlgorithm('AlgoA', 8));
      registry.register(new MockAlgorithm('AlgoA', 1));

      const latest = registry.getAlgorithm('AlgoA');
      expect(latest!.getVersion()).toBe(8);

      const versions = registry.getVersions('AlgoA');
      expect(versions).toEqual([8, 5, 2, 1]);
    });
  });
});
