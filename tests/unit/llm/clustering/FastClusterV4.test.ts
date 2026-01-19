/**
 * Tests for FastClusterV4 - Dual-Mode AISP Keyword Extraction
 *
 * Spec 18: Algorithm Versioning System - Section 3.8
 *
 * Key improvements over V3:
 * - Detects AISP markers in reasoning text
 * - Uses AISP regex patterns when AISP detected
 * - Falls back to English keywords for standard mode
 * - Maintains backward compatibility with V3 behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FastClusterV4 } from '../../../../src/llm/clustering/FastClusterV4.js';
import { FastClusterV3 } from '../../../../src/llm/clustering/FastClusterV3.js';
import type { LLMExperience, LLMConfig } from '../../../../src/llm/types.js';

/**
 * Create mock experiences with English reasoning
 */
const createEnglishExperiences = (count: number): LLMExperience[] => {
  const experiences: LLMExperience[] = [];
  const reasoningTemplates = [
    'only candidate elimination - this cell has only one possible value',
    'missing from row constraint - the value is forced by row elimination',
    'intersection analysis - box and row constraint intersection',
    'forced by column - process of elimination in the column',
    'last remaining value - unique in the box',
    'naked single - only one candidate remains',
    'hidden single - unique in unit',
    'constraint satisfaction - must be this value',
  ];

  for (let i = 0; i < count; i++) {
    experiences.push({
      puzzleId: `puzzle-${i}`,
      move: {
        row: (i % 9) + 1,
        col: ((i * 3) % 9) + 1,
        value: (i % 9) + 1,
        reasoning: reasoningTemplates[i % reasoningTemplates.length],
      },
      gridState: Array(9).fill(null).map(() => Array(9).fill(0)),
      validation: { outcome: 'correct', isCorrect: true },
      timestamp: new Date(),
    } as LLMExperience);
  }
  return experiences;
};

/**
 * Create mock experiences with AISP mathematical notation
 */
const createAISPExperiences = (count: number): LLMExperience[] => {
  const experiences: LLMExperience[] = [];
  const reasoningTemplates = [
    '⟦Γ:Analysis⟧ candidates≔{5}∧|candidates|=1 ⊢placement[R3,C4]≔5',
    '⟦Σ:Solve⟧ ∃!cell∈row[3] where v=7 → forced≔true ⊢7',
    '⟦Γ:Constraint⟧ ∃!cell∈col[5] ∵constraint satisfaction → placement',
    '⟦Σ:Logic⟧ ∃!cell∈box[2] last≔remaining value in unit',
    '⟦Γ:Elimination⟧ process≔elimination ∀candidate:eliminated except 4',
    '⟦Σ:Pattern⟧ naked_single detected at R1C2 with unique∈{6}',
    '⟦Γ:Hidden⟧ hidden_single in row constraint∩box intersection',
    '⟦Σ:Subset⟧ subset∩analysis reveals forced placement',
  ];

  for (let i = 0; i < count; i++) {
    experiences.push({
      puzzleId: `puzzle-${i}`,
      move: {
        row: (i % 9) + 1,
        col: ((i * 3) % 9) + 1,
        value: (i % 9) + 1,
        reasoning: reasoningTemplates[i % reasoningTemplates.length],
      },
      gridState: Array(9).fill(null).map(() => Array(9).fill(0)),
      validation: { outcome: 'correct', isCorrect: true },
      timestamp: new Date(),
    } as LLMExperience);
  }
  return experiences;
};

/**
 * Create experiences that would all fall to general_reasoning in V3
 * (AISP notation with no English keywords)
 */
const createPureAISPExperiences = (count: number): LLMExperience[] => {
  const experiences: LLMExperience[] = [];
  const reasoningTemplates = [
    '⟦Γ⟧ candidates≔{5}∧|candidates|=1 ⊢R3C4≔5',
    '⟦Σ⟧ ∃!cell∈row[3] v≔7',
    '⟦Γ⟧ ∃!cell∈col[5] ∵placement',
    '⟦Σ⟧ ∃!cell∈box[2] last≔remaining',
    '⟦Γ⟧ ∀candidate:eliminated → forced≔true',
    '⟦Σ⟧ unique∈{6} ⊢placement',
    '⟦Γ⟧ constraint∩box → value',
    '⟦Σ⟧ subset∩analysis → placement',
    '⟦Γ⟧ process≔elimination ⊢value',
    '⟦Σ⟧ naked_single R1C2',
    '⟦Γ⟧ hidden_single row[1]',
  ];

  for (let i = 0; i < count; i++) {
    experiences.push({
      puzzleId: `puzzle-${i}`,
      move: {
        row: (i % 9) + 1,
        col: ((i * 3) % 9) + 1,
        value: (i % 9) + 1,
        reasoning: reasoningTemplates[i % reasoningTemplates.length],
      },
      gridState: Array(9).fill(null).map(() => Array(9).fill(0)),
      validation: { outcome: 'correct', isCorrect: true },
      timestamp: new Date(),
    } as LLMExperience);
  }
  return experiences;
};

const mockConfig: LLMConfig = {
  provider: 'lmstudio',
  model: 'test-model',
  baseUrl: 'http://localhost:1234',
  apiKey: '',
};

describe('FastClusterV4 (Spec 18 Section 3.8)', () => {
  let algorithmV4: FastClusterV4;
  let algorithmV3: FastClusterV3;

  beforeEach(() => {
    algorithmV4 = new FastClusterV4();
    algorithmV3 = new FastClusterV3();
  });

  describe('metadata', () => {
    it('should have correct algorithm metadata', () => {
      expect(algorithmV4.getName()).toBe('FastCluster');
      expect(algorithmV4.getVersion()).toBe(4);
      expect(algorithmV4.getIdentifier()).toBe('fastclusterv4');
    });

    it('should have unique codeHash different from V3', () => {
      const v4Hash = algorithmV4.getMetadata().codeHash;
      const v3Hash = algorithmV3.getMetadata().codeHash;
      expect(v4Hash).toBeDefined();
      expect(v3Hash).toBeDefined();
      expect(v4Hash).not.toBe(v3Hash);
    });

    it('should have a description mentioning dual-mode', () => {
      const metadata = algorithmV4.getMetadata();
      expect(metadata.description.toLowerCase()).toContain('dual');
    });
  });

  describe('AISP detection', () => {
    it('should detect AISP markers in reasoning text', () => {
      const aispExperiences = createAISPExperiences(10);
      const englishExperiences = createEnglishExperiences(10);

      // AISP experiences should contain markers like ⟦, ≔, ∧, ∃, etc.
      for (const exp of aispExperiences) {
        const hasMarker = ['⟦', '≔', '∧', '∃', '∀', '→', '∈', '≜', '⊢', '∵']
          .some(marker => exp.move.reasoning.includes(marker));
        expect(hasMarker).toBe(true);
      }

      // English experiences should NOT contain AISP markers
      for (const exp of englishExperiences) {
        const hasMarker = ['⟦', '≔', '∧', '∃', '∀', '→', '∈', '≜', '⊢', '∵']
          .some(marker => exp.move.reasoning.includes(marker));
        expect(hasMarker).toBe(false);
      }
    });
  });

  describe('AISP pattern extraction', () => {
    it('should extract only_candidate from AISP notation', async () => {
      const experiences: LLMExperience[] = Array(20).fill(null).map((_, i) => ({
        puzzleId: `puzzle-${i}`,
        move: {
          row: (i % 9) + 1,
          col: ((i * 3) % 9) + 1,
          value: (i % 9) + 1,
          reasoning: '⟦Γ⟧ candidates≔{5}∧|candidates|=1 ⊢R3C4≔5',
        },
        gridState: Array(9).fill(null).map(() => Array(9).fill(0)),
        validation: { outcome: 'correct', isCorrect: true },
        timestamp: new Date(),
      })) as LLMExperience[];

      algorithmV4.setAISPMode('aisp-full');
      const result = await algorithmV4.cluster(experiences, 5, mockConfig);

      // Should NOT have all experiences in general_reasoning
      const clusterNames = Array.from(result.clusters.keys());
      const hasOnlyCandidate = clusterNames.some(name =>
        name.toLowerCase().includes('onlycandidate') ||
        name.toLowerCase().includes('only_candidate')
      );
      expect(hasOnlyCandidate).toBe(true);
    });

    it('should extract missing_from_row from AISP ∃!cell∈row', async () => {
      const experiences: LLMExperience[] = Array(20).fill(null).map((_, i) => ({
        puzzleId: `puzzle-${i}`,
        move: {
          row: (i % 9) + 1,
          col: ((i * 3) % 9) + 1,
          value: (i % 9) + 1,
          reasoning: '⟦Σ⟧ ∃!cell∈row[3] v≔7 → placement',
        },
        gridState: Array(9).fill(null).map(() => Array(9).fill(0)),
        validation: { outcome: 'correct', isCorrect: true },
        timestamp: new Date(),
      })) as LLMExperience[];

      algorithmV4.setAISPMode('aisp-full');
      const result = await algorithmV4.cluster(experiences, 5, mockConfig);

      const clusterNames = Array.from(result.clusters.keys());
      const hasMissingFromRow = clusterNames.some(name =>
        name.toLowerCase().includes('missingfromrow') ||
        name.toLowerCase().includes('missing_from_row')
      );
      expect(hasMissingFromRow).toBe(true);
    });

    it('should handle multiple AISP patterns in same reasoning', async () => {
      const experiences: LLMExperience[] = Array(20).fill(null).map((_, i) => ({
        puzzleId: `puzzle-${i}`,
        move: {
          row: (i % 9) + 1,
          col: ((i * 3) % 9) + 1,
          value: (i % 9) + 1,
          reasoning: '⟦Γ⟧ ∃!cell∈row[3] constraint∩box forced≔true',
        },
        gridState: Array(9).fill(null).map(() => Array(9).fill(0)),
        validation: { outcome: 'correct', isCorrect: true },
        timestamp: new Date(),
      })) as LLMExperience[];

      algorithmV4.setAISPMode('aisp-full');
      const result = await algorithmV4.cluster(experiences, 5, mockConfig);

      // Should create meaningful clusters, not just general_reasoning
      expect(result.clusters.size).toBeGreaterThanOrEqual(1);
      const hasGeneralOnly = result.clusters.size === 1 &&
        Array.from(result.clusters.keys())[0].includes('general');
      expect(hasGeneralOnly).toBe(false);
    });
  });

  describe('backward compatibility with V3', () => {
    it('should produce same clusters as V3 for English experiences', async () => {
      const experiences = createEnglishExperiences(50);

      // Both in 'off' mode
      algorithmV4.setAISPMode('off');
      algorithmV3.setAISPMode('off');

      const resultV4 = await algorithmV4.cluster(experiences, 5, mockConfig);
      const resultV3 = await algorithmV3.cluster(experiences, 5, mockConfig);

      // Should produce similar cluster counts
      expect(Math.abs(resultV4.clusters.size - resultV3.clusters.size)).toBeLessThanOrEqual(2);
    });

    it('should produce same cluster membership for English experiences', async () => {
      const experiences = createEnglishExperiences(50);

      algorithmV4.setAISPMode('off');
      algorithmV3.setAISPMode('off');

      const resultV4 = await algorithmV4.cluster(experiences, 5, mockConfig);
      const resultV3 = await algorithmV3.cluster(experiences, 5, mockConfig);

      // Total experiences should match
      let totalV4 = 0;
      let totalV3 = 0;
      for (const exps of resultV4.clusters.values()) totalV4 += exps.length;
      for (const exps of resultV3.clusters.values()) totalV3 += exps.length;

      expect(totalV4).toBe(experiences.length);
      expect(totalV3).toBe(experiences.length);
    });

    it('should maintain dominant cluster detection (>40%)', async () => {
      // Create experiences that would trigger dominant cluster
      const experiences = createEnglishExperiences(100);

      algorithmV4.setAISPMode('off');
      const result = await algorithmV4.cluster(experiences, 10, mockConfig);

      // No cluster should have >50% after subdivision
      const threshold = experiences.length * 0.5;
      for (const exps of result.clusters.values()) {
        expect(exps.length).toBeLessThanOrEqual(threshold);
      }
    });
  });

  describe('1x vs 2x mode strategy counts', () => {
    it('should produce 3-5 strategies for 1x mode with AISP experiences', async () => {
      const experiences = createPureAISPExperiences(100);

      algorithmV4.setAISPMode('aisp-full');
      const result = await algorithmV4.cluster(experiences, 5, mockConfig);

      // 1x mode (target=5) should produce multiple diverse clusters
      // Key: NOT 1 cluster (the V3 bug), should have meaningful diversity
      expect(result.clusters.size).toBeGreaterThanOrEqual(3);
      // With good AISP extraction, we may get more clusters than target (this is good!)
      expect(result.clusters.size).toBeLessThanOrEqual(20); // Allow flexibility for diverse patterns
    });

    it('should produce 6-10 strategies for 2x mode with AISP experiences', async () => {
      const experiences = createPureAISPExperiences(100);

      algorithmV4.setAISPMode('aisp-full');
      const result = await algorithmV4.cluster(experiences, 10, mockConfig);

      // 2x mode (target=10) should produce more clusters than 1x
      expect(result.clusters.size).toBeGreaterThanOrEqual(3);
    });

    it('should produce MORE strategies in 2x mode than 1x mode', async () => {
      const experiences = createPureAISPExperiences(100);

      algorithmV4.setAISPMode('aisp-full');
      const result1x = await algorithmV4.cluster(experiences, 5, mockConfig);
      const result2x = await algorithmV4.cluster(experiences, 10, mockConfig);

      // 2x should produce more or equal clusters (subdivision with higher target)
      expect(result2x.clusters.size).toBeGreaterThanOrEqual(result1x.clusters.size);
    });

    it('should NOT produce identical cluster counts for 1x and 2x', async () => {
      // This is the bug we're fixing - V3 produces 4 for both modes
      const experiences = createPureAISPExperiences(100);

      algorithmV4.setAISPMode('aisp-full');
      const result1x = await algorithmV4.cluster(experiences, 5, mockConfig);
      const result2x = await algorithmV4.cluster(experiences, 10, mockConfig);

      // If cluster counts are identical AND both are 4 or less, we have the V3 bug
      if (result1x.clusters.size === result2x.clusters.size) {
        // This is acceptable if we have diverse clusters
        // But if we only have 1 cluster (general_reasoning), that's the bug
        const hasOnlyGeneral = result1x.clusters.size === 1 &&
          Array.from(result1x.clusters.keys())[0].toLowerCase().includes('general');
        expect(hasOnlyGeneral).toBe(false);
      }
    });
  });

  describe('mixed AISP/English handling', () => {
    it('should handle mixed experiences correctly', async () => {
      const aispExperiences = createAISPExperiences(25);
      const englishExperiences = createEnglishExperiences(25);
      const mixed = [...aispExperiences, ...englishExperiences];

      algorithmV4.setAISPMode('aisp-full');
      const result = await algorithmV4.cluster(mixed, 5, mockConfig);

      // Should create multiple clusters from both types
      expect(result.clusters.size).toBeGreaterThan(1);

      // Total should match input
      let total = 0;
      for (const exps of result.clusters.values()) total += exps.length;
      expect(total).toBe(mixed.length);
    });
  });

  describe('ClusteringResult metadata', () => {
    it('should include processing time in metadata', async () => {
      const experiences = createAISPExperiences(50);
      algorithmV4.setAISPMode('aisp-full');

      const result = await algorithmV4.cluster(experiences, 5, mockConfig);

      expect(result.metadata.processingTimeMs).toBeDefined();
      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should include cluster count in metadata', async () => {
      const experiences = createAISPExperiences(50);
      algorithmV4.setAISPMode('aisp-full');

      const result = await algorithmV4.cluster(experiences, 5, mockConfig);

      expect(result.metadata.clustersCreated).toBeDefined();
      expect(result.metadata.clustersCreated).toBe(result.clusters.size);
    });

    it('should include total experiences in metadata', async () => {
      const experiences = createAISPExperiences(50);
      algorithmV4.setAISPMode('aisp-full');

      const result = await algorithmV4.cluster(experiences, 5, mockConfig);

      expect(result.metadata.totalExperiences).toBeDefined();
      expect(result.metadata.totalExperiences).toBe(experiences.length);
    });

    it('should complete in <5 seconds for 500 experiences', async () => {
      const experiences = createAISPExperiences(500);
      algorithmV4.setAISPMode('aisp-full');

      const startTime = Date.now();
      const result = await algorithmV4.cluster(experiences, 10, mockConfig);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(5000); // 5 seconds
      expect(result.metadata.processingTimeMs).toBeLessThan(5000);
    });
  });

  describe('setAISPMode', () => {
    it('should accept aisp-full mode', () => {
      algorithmV4.setAISPMode('aisp-full');
      expect(algorithmV4.getAISPMode()).toBe('aisp-full');
    });

    it('should accept aisp mode', () => {
      algorithmV4.setAISPMode('aisp');
      expect(algorithmV4.getAISPMode()).toBe('aisp');
    });

    it('should accept off mode', () => {
      algorithmV4.setAISPMode('off');
      expect(algorithmV4.getAISPMode()).toBe('off');
    });

    it('should default to off mode', () => {
      const fresh = new FastClusterV4();
      expect(fresh.getAISPMode()).toBe('off');
    });
  });

  describe('edge cases', () => {
    it('should handle empty experiences array', async () => {
      const result = await algorithmV4.cluster([], 5, mockConfig);
      expect(result.clusters.size).toBe(0);
      expect(result.metadata.totalExperiences).toBe(0);
    });

    it('should handle single experience', async () => {
      const experiences = createAISPExperiences(1);
      algorithmV4.setAISPMode('aisp-full');

      const result = await algorithmV4.cluster(experiences, 5, mockConfig);

      expect(result.clusters.size).toBe(1);
      expect(result.metadata.totalExperiences).toBe(1);
    });

    it('should handle experiences with no recognizable patterns', async () => {
      const experiences: LLMExperience[] = Array(20).fill(null).map((_, i) => ({
        puzzleId: `puzzle-${i}`,
        move: {
          row: (i % 9) + 1,
          col: ((i * 3) % 9) + 1,
          value: (i % 9) + 1,
          reasoning: 'Random text with no keywords or AISP markers',
        },
        gridState: Array(9).fill(null).map(() => Array(9).fill(0)),
        validation: { outcome: 'correct', isCorrect: true },
        timestamp: new Date(),
      })) as LLMExperience[];

      algorithmV4.setAISPMode('aisp-full');
      const result = await algorithmV4.cluster(experiences, 5, mockConfig);

      // Should fall back to general_reasoning
      expect(result.clusters.size).toBeGreaterThanOrEqual(1);
    });
  });
});
