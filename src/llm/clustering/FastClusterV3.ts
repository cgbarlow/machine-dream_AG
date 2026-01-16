/**
 * FastCluster v3 - Keyword-based clustering with AISP cluster naming
 *
 * Extends FastCluster v2 with AISP mode support.
 * When aispMode === 'aisp-full', cluster names use AISP notation:
 * - ⟦Λ:Cluster.OnlyCandidate⟧ instead of "only_candidate"
 *
 * Key changes from v2:
 * - AISP cluster naming when aispMode === 'aisp-full'
 * - Keywords converted to PascalCase AISP identifiers
 * - Backward compatible: aispMode === 'off' behaves like v2
 *
 * See:
 * - Spec 18: Algorithm Versioning System - Section 3.4
 * - ADR-013: AISP Validator Integration
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
 */
function computeCodeHash(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 8);
}

/**
 * FastCluster v3 Algorithm
 *
 * Performance: <5s for 500 experiences
 * Approach: Keyword-based clustering with AISP cluster naming
 */
export class FastClusterV3 extends BaseClusteringAlgorithm {
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
      version: 3,
      identifier: 'fastclusterv3',
      description: 'Keyword-based clustering with AISP cluster naming support',
      codeHash: computeCodeHash(__filename),
      createdAt: new Date('2026-01-16'),
    };
    super(metadata);
  }

  /**
   * Cluster experiences using keyword-based approach with AISP naming
   */
  async cluster(
    experiences: LLMExperience[],
    targetCount: number,
    _config: LLMConfig
  ): Promise<ClusteringResult> {
    const startTime = Date.now();

    console.log(`🔍 Clustering ${experiences.length} experiences with ${this.getIdentifier()}...`);
    console.log(`   Target clusters: ${targetCount}`);
    if (this.aispMode === 'aisp-full') {
      console.log(`   🔤 AISP naming enabled`);
    }

    // Phase 1: Keyword-based clustering
    const initialClusters = this.clusterByKeywords(experiences, targetCount);

    console.log(`   Initial clusters: ${initialClusters.size}`);

    // Phase 2: Check for dominant cluster
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
   * Phase 1: Cluster by reasoning keywords with AISP naming
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
      const keywords = this.extractKeywords(exp.move.reasoning, keywordDepth);
      const signature = this.formatClusterName(keywords);

      if (!clusters.has(signature)) {
        clusters.set(signature, []);
      }
      clusters.get(signature)!.push(exp);
    }

    return clusters;
  }

  /**
   * Extract keywords from reasoning text
   */
  private extractKeywords(reasoning: string, keywordDepth: number): string[] {
    const lower = reasoning.toLowerCase();
    const found = this.REASONING_KEYWORDS.filter((kw) => lower.includes(kw));

    if (found.length === 0) {
      return ['general_reasoning'];
    }

    return found.slice(0, keywordDepth);
  }

  /**
   * Format cluster name based on AISP mode
   *
   * AISP-full: ⟦Λ:Cluster.OnlyCandidate⟧
   * Off: only_candidate
   */
  protected formatClusterName(keywords: string[]): string {
    if (this.aispMode === 'aisp-full') {
      const identifier = this.toAISPIdentifier(keywords);
      return `⟦Λ:Cluster.${identifier}⟧`;
    }

    // Default (off mode): underscore-separated
    return keywords.join('_');
  }

  /**
   * Convert keywords to PascalCase AISP identifier
   *
   * "only candidate" -> "OnlyCandidate"
   * ["missing from row", "constraint"] -> "MissingFromRow.Constraint"
   */
  private toAISPIdentifier(keywords: string[]): string {
    return keywords
      .map((kw) => this.toPascalCase(kw))
      .join('.');
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(text: string): string {
    return text
      .split(/[\s_]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Phase 2: Check for dominant cluster
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
      const subName = this.formatSubClusterName(baseName, rowRegion);

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

  /**
   * Format sub-cluster name based on AISP mode
   */
  private formatSubClusterName(baseName: string, regionIndex: number): string {
    if (this.aispMode === 'aisp-full') {
      // Parse AISP block name and add region
      // ⟦Λ:Cluster.OnlyCandidate⟧ -> ⟦Λ:Cluster.OnlyCandidate.Region0⟧
      if (baseName.startsWith('⟦Λ:') && baseName.endsWith('⟧')) {
        const inner = baseName.slice(3, -1);
        return `⟦Λ:${inner}.Region${regionIndex}⟧`;
      }
    }

    // Default: underscore-separated
    return `${baseName}_region${regionIndex}`;
  }
}
