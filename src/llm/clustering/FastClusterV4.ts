/**
 * FastCluster v4 - Dual-Mode AISP Keyword Extraction
 *
 * Extends FastCluster v3 with dual-mode keyword extraction that
 * detects AISP mathematical notation and extracts keywords accordingly.
 *
 * Problem Solved: FastClusterV3 uses English keyword extraction which
 * NEVER matches AISP mathematical notation. This causes all AISP
 * experiences to fall into a single 'general_reasoning' cluster.
 *
 * Key changes from v3:
 * - Detects AISP markers (⟦, ≔, ∧, ∃, ∀, →, ∈, ≜, ⊢, ∵)
 * - Uses AISP regex patterns when AISP detected
 * - Falls back to English keywords for standard mode
 * - Maintains backward compatibility with V3 behavior
 *
 * See:
 * - Spec 18: Algorithm Versioning System - Section 3.8
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
 * Pattern mapping from AISP notation to English keywords
 */
interface AISPKeywordPattern {
  pattern: RegExp;
  keyword: string;
}

/**
 * FastCluster v4 Algorithm
 *
 * Performance: <5s for 500 experiences
 * Approach: Keyword-based clustering with dual-mode extraction (English AND AISP)
 */
export class FastClusterV4 extends BaseClusteringAlgorithm {
  /**
   * AISP markers that indicate mathematical notation reasoning
   */
  private readonly AISP_MARKERS = ['⟦', '≔', '∧', '∃', '∀', '→', '∈', '≜', '⊢', '∵'];

  /**
   * AISP pattern mapping to English keywords
   * Order matters - more specific patterns first
   */
  private readonly AISP_KEYWORD_PATTERNS: AISPKeywordPattern[] = [
    // Only candidate patterns
    { pattern: /candidates≔\{[^}]*\}∧\|candidates\|=1/, keyword: 'only_candidate' },
    { pattern: /candidates≔\{[^}]*\}/, keyword: 'only_candidate' },
    { pattern: /\|candidates\|=1/, keyword: 'only_candidate' },

    // Row/Column/Box patterns
    { pattern: /∃!cell∈row/, keyword: 'missing_from_row' },
    { pattern: /∃!cell∈col/, keyword: 'missing_from_column' },
    { pattern: /∃!cell∈box/, keyword: 'missing_from_box' },

    // Last remaining
    { pattern: /last≔remaining/, keyword: 'last_remaining' },

    // Intersection/Constraint
    { pattern: /constraint∩/, keyword: 'intersection' },
    { pattern: /∵constraint/, keyword: 'constraint' },

    // Elimination patterns
    { pattern: /∀candidate:eliminated/, keyword: 'elimination' },
    { pattern: /process≔elimination/, keyword: 'process_elimination' },

    // Forced placement
    { pattern: /forced≔true/, keyword: 'forced' },

    // Singles
    { pattern: /naked_single/i, keyword: 'naked_single' },
    { pattern: /hidden_single/i, keyword: 'hidden_single' },

    // Placement
    { pattern: /⊢placement/, keyword: 'placement' },

    // Unique/Subset
    { pattern: /unique∈/, keyword: 'unique' },
    { pattern: /subset∩/, keyword: 'subset' },
  ];

  /**
   * English reasoning keywords for clustering (priority order)
   * Same as V3 for backward compatibility
   */
  private readonly ENGLISH_KEYWORDS = [
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
      version: 4,
      identifier: 'fastclusterv4',
      description: 'Keyword-based clustering with dual-mode AISP pattern extraction',
      codeHash: computeCodeHash(__filename),
      createdAt: new Date('2026-01-19'),
    };
    super(metadata);
  }

  /**
   * Cluster experiences using keyword-based approach with dual-mode extraction
   */
  async cluster(
    experiences: LLMExperience[],
    targetCount: number,
    _config: LLMConfig
  ): Promise<ClusteringResult> {
    const startTime = Date.now();

    if (experiences.length === 0) {
      return {
        clusters: new Map(),
        metadata: {
          totalExperiences: 0,
          clustersCreated: 0,
          processingTimeMs: Date.now() - startTime,
        },
      };
    }

    console.log(`🔍 Clustering ${experiences.length} experiences with ${this.getIdentifier()}...`);
    console.log(`   Target clusters: ${targetCount}`);
    if (this.aispMode === 'aisp-full' || this.aispMode === 'aisp') {
      console.log(`   🔤 AISP dual-mode extraction enabled`);
    }

    // Phase 1: Keyword-based clustering with dual-mode extraction
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
   * Phase 1: Cluster by reasoning keywords with dual-mode extraction
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
   * Detect if reasoning contains AISP mathematical notation
   */
  private isAISPReasoning(reasoning: string): boolean {
    return this.AISP_MARKERS.some(marker => reasoning.includes(marker));
  }

  /**
   * Extract keywords from reasoning text using dual-mode detection
   *
   * If AISP markers detected, uses AISP regex patterns.
   * Otherwise falls back to English keyword matching.
   */
  private extractKeywords(reasoning: string, keywordDepth: number): string[] {
    if (this.isAISPReasoning(reasoning)) {
      return this.extractAISPKeywords(reasoning, keywordDepth);
    }
    return this.extractEnglishKeywords(reasoning, keywordDepth);
  }

  /**
   * Extract keywords using AISP pattern matching
   */
  private extractAISPKeywords(reasoning: string, keywordDepth: number): string[] {
    const found: string[] = [];

    for (const { pattern, keyword } of this.AISP_KEYWORD_PATTERNS) {
      if (pattern.test(reasoning) && !found.includes(keyword)) {
        found.push(keyword);
        if (found.length >= keywordDepth) break;
      }
    }

    if (found.length === 0) {
      return ['general_reasoning'];
    }

    return found;
  }

  /**
   * Extract keywords using English keyword matching (V3 behavior)
   */
  private extractEnglishKeywords(reasoning: string, keywordDepth: number): string[] {
    const lower = reasoning.toLowerCase();
    const found = this.ENGLISH_KEYWORDS.filter(kw => lower.includes(kw));

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
   * "only_candidate" -> "OnlyCandidate"
   * ["missing_from_row", "constraint"] -> "MissingFromRow.Constraint"
   */
  private toAISPIdentifier(keywords: string[]): string {
    return keywords
      .map(kw => this.toPascalCase(kw))
      .join('.');
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(text: string): string {
    return text
      .split(/[\s_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
