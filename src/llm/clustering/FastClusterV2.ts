/**
 * FastCluster v2 - Keyword-based clustering with dominant cluster fix
 *
 * Fast clustering algorithm using keyword extraction from reasoning text.
 * Version 2 adds forced subdivision when any cluster exceeds 40% of total experiences.
 *
 * Key changes from v1:
 * - Adds dominant cluster detection (>40% threshold)
 * - Forces subdivision even when cluster count meets target
 * - Fixes bug where AISP doubled mode created same strategies as standard mode
 *
 * See:
 * - Spec 18: Algorithm Versioning System
 * - ADR-011: Versioned Algorithms Architecture
 */

import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  BaseClusteringAlgorithm,
  type AlgorithmMetadata,
  type ClusteringResult,
} from './ClusteringAlgorithm.js';
import type { LLMExperience, LLMConfig } from '../types.js';

// ES module equivalent of __filename
const __filename = fileURLToPath(import.meta.url);

/**
 * Compute SHA-256 hash of file content (first 8 chars)
 * @param filePath - Path to file
 * @returns First 8 characters of SHA-256 hash
 */
function computeCodeHash(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 8);
}

/**
 * FastCluster v2 Algorithm
 *
 * Performance: <5s for 500 experiences
 * Approach: Keyword-based clustering + forced subdivision for dominant clusters
 */
export class FastClusterV2 extends BaseClusteringAlgorithm {
  /**
   * Reasoning keywords for clustering (priority order)
   */
  private readonly REASONING_KEYWORDS = [
    'only candidate',
    'missing from row',
    'missing from column',
    'missing from box',
    'last remaining',
    'process of elimination',
    'constraint',
    'elimination',
    'naked single',
    'hidden single',
    'only option',
    'must be',
    'intersection',
    'subset',
    'unique',
    'forced',
    'pair',
    'triple',
  ];

  /**
   * Dominant cluster threshold (40% of total experiences)
   */
  private readonly DOMINANT_THRESHOLD = 0.4;

  constructor() {
    const metadata: AlgorithmMetadata = {
      name: 'FastCluster',
      version: 2,
      identifier: 'fastclusterv2',
      description: 'Keyword-based clustering with forced subdivision for dominant clusters',
      codeHash: computeCodeHash(__filename),
      createdAt: new Date('2026-01-13'),
    };
    super(metadata);
  }

  /**
   * Cluster experiences using keyword-based approach
   */
  async cluster(
    experiences: LLMExperience[],
    targetCount: number,
    _config: LLMConfig
  ): Promise<ClusteringResult> {
    const startTime = Date.now();

    console.log(`🔍 Clustering ${experiences.length} experiences with ${this.getIdentifier()}...`);
    console.log(`   Target clusters: ${targetCount}`);

    // Phase 1: Keyword-based clustering
    const initialClusters = this.clusterByKeywords(experiences, targetCount);

    console.log(`   Initial clusters: ${initialClusters.size}`);

    // Phase 2: Check for dominant cluster (NEW in v2)
    const totalExperiences = experiences.length;
    const hasDominantCluster = this.checkDominantCluster(initialClusters, totalExperiences);

    if (hasDominantCluster) {
      console.log(`   ⚠️  Dominant cluster detected (>${this.DOMINANT_THRESHOLD * 100}% of experiences)`);
    }

    // Phase 3: Subdivide if needed
    let finalClusters = initialClusters;
    if (initialClusters.size < targetCount || hasDominantCluster) {
      console.log(`   🔄 Subdividing clusters...`);
      finalClusters = this.subdivideClustersByContent(initialClusters, targetCount);
      console.log(`   Final clusters: ${finalClusters.size}`);
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      clusters: finalClusters,
      metadata: {
        totalExperiences,
        clustersCreated: finalClusters.size,
        processingTimeMs,
      },
    };
  }

  /**
   * Phase 1: Cluster by reasoning keywords
   */
  private clusterByKeywords(
    experiences: LLMExperience[],
    targetCount: number
  ): Map<string, LLMExperience[]> {
    const clusters = new Map<string, LLMExperience[]>();

    // Determine keyword depth based on target
    const keywordDepth = targetCount >= 6 ? 4 : targetCount >= 4 ? 3 : 2;

    // Group experiences by reasoning signature
    for (const exp of experiences) {
      const signature = this.extractReasoningSignature(exp.move.reasoning, keywordDepth);

      if (!clusters.has(signature)) {
        clusters.set(signature, []);
      }
      clusters.get(signature)!.push(exp);
    }

    return clusters;
  }

  /**
   * Extract reasoning signature from text
   *
   * @param reasoning - Reasoning text to analyze
   * @param keywordDepth - Number of keywords to include in signature
   * @returns Signature string (e.g., "only candidate_constraint")
   */
  private extractReasoningSignature(reasoning: string, keywordDepth: number): string {
    const lower = reasoning.toLowerCase();
    const found = this.REASONING_KEYWORDS.filter((kw) => lower.includes(kw));

    return found.length > 0
      ? found.slice(0, keywordDepth).join('_')
      : 'general_reasoning';
  }

  /**
   * Phase 2: Check for dominant cluster (NEW in v2)
   *
   * @param clusters - Clusters to check
   * @param totalExperiences - Total number of experiences
   * @returns True if any cluster exceeds DOMINANT_THRESHOLD
   */
  private checkDominantCluster(
    clusters: Map<string, LLMExperience[]>,
    totalExperiences: number
  ): boolean {
    const threshold = totalExperiences * this.DOMINANT_THRESHOLD;

    for (const cluster of clusters.values()) {
      if (cluster.length > threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Phase 3: Subdivide clusters to meet target count
   */
  private subdivideClustersByContent(
    clusters: Map<string, LLMExperience[]>,
    targetCount: number
  ): Map<string, LLMExperience[]> {
    const result = new Map<string, LLMExperience[]>();

    // Sort clusters by size (largest first)
    const sortedClusters = Array.from(clusters.entries())
      .sort((a, b) => b[1].length - a[1].length);

    let currentCount = 0;

    for (const [name, experiences] of sortedClusters) {
      const needed = targetCount - currentCount;

      if (needed <= 1 || experiences.length < 6) {
        // Don't split if we've met target or cluster is too small
        result.set(name, experiences);
        currentCount++;
      } else {
        // Split this cluster into sub-clusters by grid context
        const subClusters = this.splitByGridContext(
          experiences,
          name,
          Math.min(needed, 3)
        );

        for (const [subName, subExps] of subClusters) {
          result.set(subName, subExps);
          currentCount++;
        }
      }
    }

    return result;
  }

  /**
   * Split cluster by grid context (row regions)
   *
   * @param experiences - Experiences to split
   * @param baseName - Base cluster name
   * @param targetSplits - Number of splits to create
   * @returns Sub-clusters by row region
   */
  private splitByGridContext(
    experiences: LLMExperience[],
    baseName: string,
    targetSplits: number
  ): Map<string, LLMExperience[]> {
    const result = new Map<string, LLMExperience[]>();

    // Split by move position (row region)
    const gridSize = experiences[0]?.gridState?.length || 9;
    const regionSize = Math.ceil(gridSize / targetSplits);

    for (const exp of experiences) {
      const rowRegion = Math.floor((exp.move.row - 1) / regionSize);
      const subName = `${baseName}_region${rowRegion}`;

      if (!result.has(subName)) {
        result.set(subName, []);
      }
      result.get(subName)!.push(exp);
    }

    // Filter out sub-clusters that are too small (< 2 experiences)
    const filtered = new Map<string, LLMExperience[]>();
    const tooSmall: LLMExperience[] = [];

    for (const [name, exps] of result) {
      if (exps.length >= 2) {
        filtered.set(name, exps);
      } else {
        tooSmall.push(...exps);
      }
    }

    // Merge too-small experiences into largest sub-cluster
    if (tooSmall.length > 0 && filtered.size > 0) {
      const largest = Array.from(filtered.entries())
        .sort((a, b) => b[1].length - a[1].length)[0];
      largest[1].push(...tooSmall);
    } else if (tooSmall.length > 0) {
      // No valid sub-clusters, return original
      filtered.set(baseName, experiences);
    }

    return filtered;
  }
}
