/**
 * Tests for ClusteringAlgorithm interface and BaseClusteringAlgorithm
 */

import { describe, it, expect } from 'vitest';
import {
  BaseClusteringAlgorithm,
  type AlgorithmMetadata,
  type ClusteringResult,
} from './ClusteringAlgorithm.js';
import type { LLMExperience, LLMConfig } from '../types.js';

/**
 * Test implementation of BaseClusteringAlgorithm
 */
class TestAlgorithm extends BaseClusteringAlgorithm {
  constructor(metadata: AlgorithmMetadata) {
    super(metadata);
  }

  async cluster(
    experiences: LLMExperience[],
    targetCount: number,
    _config: LLMConfig
  ): Promise<ClusteringResult> {
    // Simple test implementation: create one cluster per experience
    const clusters = new Map<string, LLMExperience[]>();
    experiences.forEach((exp, index) => {
      clusters.set(`cluster_${index}`, [exp]);
    });

    return {
      clusters,
      metadata: {
        totalExperiences: experiences.length,
        clustersCreated: clusters.size,
        processingTimeMs: 0,
      },
    };
  }
}

describe('ClusteringAlgorithm', () => {
  describe('BaseClusteringAlgorithm', () => {
    const validMetadata: AlgorithmMetadata = {
      name: 'TestAlgo',
      version: 1,
      identifier: 'testalgov1',
      description: 'Test algorithm',
      codeHash: '12345678',
      createdAt: new Date('2026-01-13'),
    };

    describe('constructor', () => {
      it('should accept valid metadata', () => {
        expect(() => new TestAlgorithm(validMetadata)).not.toThrow();
      });

      it('should throw on invalid identifier format', () => {
        const invalidMetadata = {
          ...validMetadata,
          identifier: 'invalid',
        };

        expect(() => new TestAlgorithm(invalidMetadata)).toThrow(
          /Invalid identifier/
        );
      });

      it('should throw on non-integer version', () => {
        const invalidMetadata = {
          ...validMetadata,
          version: 1.5,
        };

        expect(() => new TestAlgorithm(invalidMetadata)).toThrow(
          /Version must be a positive integer/
        );
      });

      it('should throw on zero version', () => {
        const invalidMetadata = {
          ...validMetadata,
          version: 0,
          identifier: 'testalgov0',
        };

        expect(() => new TestAlgorithm(invalidMetadata)).toThrow(
          /Version must be a positive integer/
        );
      });

      it('should throw on negative version', () => {
        const invalidMetadata = {
          ...validMetadata,
          version: -1,
          identifier: 'testalgov-1',
        };

        expect(() => new TestAlgorithm(invalidMetadata)).toThrow(
          /Version must be a positive integer/
        );
      });

      it('should throw on invalid code hash length', () => {
        const invalidMetadata = {
          ...validMetadata,
          codeHash: '1234',
        };

        expect(() => new TestAlgorithm(invalidMetadata)).toThrow(
          /Code hash must be 8 hex characters/
        );
      });

      it('should throw on non-hex code hash', () => {
        const invalidMetadata = {
          ...validMetadata,
          codeHash: 'zzzzzzzz',
        };

        expect(() => new TestAlgorithm(invalidMetadata)).toThrow(
          /Code hash must be 8 hex characters/
        );
      });
    });

    describe('metadata accessors', () => {
      const algorithm = new TestAlgorithm(validMetadata);

      it('should return full metadata', () => {
        expect(algorithm.getMetadata()).toEqual(validMetadata);
      });

      it('should return name', () => {
        expect(algorithm.getName()).toBe('TestAlgo');
      });

      it('should return version', () => {
        expect(algorithm.getVersion()).toBe(1);
      });

      it('should return identifier', () => {
        expect(algorithm.getIdentifier()).toBe('testalgov1');
      });
    });

    describe('identifier format validation', () => {
      it('should accept lowercase name + v + version', () => {
        const metadata: AlgorithmMetadata = {
          name: 'MyAlgorithm',
          version: 3,
          identifier: 'myalgorithmv3',
          description: 'Test',
          codeHash: 'abcdef12',
          createdAt: new Date(),
        };

        expect(() => new TestAlgorithm(metadata)).not.toThrow();
      });

      it('should reject uppercase in identifier', () => {
        const metadata: AlgorithmMetadata = {
          name: 'MyAlgorithm',
          version: 3,
          identifier: 'MyAlgorithmV3',
          description: 'Test',
          codeHash: 'abcdef12',
          createdAt: new Date(),
        };

        expect(() => new TestAlgorithm(metadata)).toThrow(/Invalid identifier/);
      });

      it('should reject missing version in identifier', () => {
        const metadata: AlgorithmMetadata = {
          name: 'MyAlgorithm',
          version: 3,
          identifier: 'myalgorithm',
          description: 'Test',
          codeHash: 'abcdef12',
          createdAt: new Date(),
        };

        expect(() => new TestAlgorithm(metadata)).toThrow(/Invalid identifier/);
      });
    });

    describe('code hash validation', () => {
      it('should accept 8 lowercase hex characters', () => {
        const metadata: AlgorithmMetadata = {
          ...validMetadata,
          codeHash: 'abcdef01',
        };

        expect(() => new TestAlgorithm(metadata)).not.toThrow();
      });

      it('should accept 8 uppercase hex characters', () => {
        const metadata: AlgorithmMetadata = {
          ...validMetadata,
          codeHash: 'ABCDEF01',
        };

        expect(() => new TestAlgorithm(metadata)).not.toThrow();
      });

      it('should accept 8 mixed case hex characters', () => {
        const metadata: AlgorithmMetadata = {
          ...validMetadata,
          codeHash: 'AbCdEf01',
        };

        expect(() => new TestAlgorithm(metadata)).not.toThrow();
      });

      it('should reject 7 hex characters', () => {
        const metadata: AlgorithmMetadata = {
          ...validMetadata,
          codeHash: '1234567',
        };

        expect(() => new TestAlgorithm(metadata)).toThrow(
          /Code hash must be 8 hex characters/
        );
      });

      it('should reject 9 hex characters', () => {
        const metadata: AlgorithmMetadata = {
          ...validMetadata,
          codeHash: '123456789',
        };

        expect(() => new TestAlgorithm(metadata)).toThrow(
          /Code hash must be 8 hex characters/
        );
      });
    });
  });
});
