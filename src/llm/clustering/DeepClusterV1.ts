/**
 * DeepCluster v1 - Two-phase clustering with LLM semantic split
 *
 * Two-phase clustering algorithm:
 * - Phase 1: Keyword-based clustering (like FastCluster)
 * - Phase 2: LLM semantic split for large clusters (>50 experiences)
 *
 * Performance: <60s for 500 experiences
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
import { LMStudioClient } from '../LMStudioClient.js';

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
 * Semantic pattern identified by LLM
 */
interface SemanticPattern {
  name: string;
  description: string;
  keywords: string[];
  exampleIds: string[];
}

/**
 * DeepCluster v1 Algorithm
 *
 * Performance: <60s for 500 experiences
 * Approach: Two-phase clustering with LLM semantic enhancement
 */
export class DeepClusterV1 extends BaseClusteringAlgorithm {
  private llmClient: LMStudioClient;

  /**
   * Reasoning keywords for Phase 1 clustering (priority order)
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
   * Threshold for LLM semantic split (cluster size)
   */
  private readonly SEMANTIC_SPLIT_THRESHOLD = 50;

  constructor(llmClient: LMStudioClient) {
    const metadata: AlgorithmMetadata = {
      name: 'DeepCluster',
      version: 1,
      identifier: 'deepclusterv1',
      description: 'Two-phase clustering: keyword + LLM semantic split for large clusters',
      codeHash: computeCodeHash(__filename),
      createdAt: new Date('2026-01-13'),
    };
    super(metadata);
    this.llmClient = llmClient;
  }

  /**
   * Cluster experiences using two-phase approach
   */
  async cluster(
    experiences: LLMExperience[],
    targetCount: number,
    config: LLMConfig
  ): Promise<ClusteringResult> {
    const startTime = Date.now();

    console.log(`🔍 Clustering ${experiences.length} experiences with ${this.getIdentifier()}...`);
    console.log(`   Target clusters: ${targetCount}`);

    // Phase 1: Keyword-based clustering
    const initialClusters = this.clusterByKeywords(experiences, targetCount);

    console.log(`   Phase 1 (keyword): ${initialClusters.size} clusters`);

    // Phase 2: LLM semantic split for large clusters
    const refinedClusters = new Map<string, LLMExperience[]>();
    let llmSplitsPerformed = 0;

    for (const [name, cluster] of initialClusters) {
      if (cluster.length > this.SEMANTIC_SPLIT_THRESHOLD) {
        console.log(`   🧠 LLM semantic split for cluster "${name}" (${cluster.length} experiences)...`);
        try {
          const subClusters = await this.llmSemanticSplit(cluster, name, config);
          for (const [subName, subCluster] of subClusters) {
            refinedClusters.set(subName, subCluster);
          }
          llmSplitsPerformed++;
        } catch (error) {
          console.warn(`   ⚠️  LLM split failed for "${name}", keeping original cluster`);
          refinedClusters.set(name, cluster);
        }
      } else {
        refinedClusters.set(name, cluster);
      }
    }

    console.log(`   Phase 2 (LLM): ${llmSplitsPerformed} clusters split semantically`);
    console.log(`   Final clusters: ${refinedClusters.size}`);

    const processingTimeMs = Date.now() - startTime;

    return {
      clusters: refinedClusters,
      metadata: {
        totalExperiences: experiences.length,
        clustersCreated: refinedClusters.size,
        processingTimeMs,
      },
    };
  }

  /**
   * Phase 1: Cluster by reasoning keywords (same as FastCluster)
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
   */
  private extractReasoningSignature(reasoning: string, keywordDepth: number): string {
    const lower = reasoning.toLowerCase();
    const found = this.REASONING_KEYWORDS.filter((kw) => lower.includes(kw));

    return found.length > 0
      ? found.slice(0, keywordDepth).join('_')
      : 'general_reasoning';
  }

  /**
   * Phase 2: LLM semantic split for large clusters
   */
  private async llmSemanticSplit(
    cluster: LLMExperience[],
    baseName: string,
    _config: LLMConfig
  ): Promise<Map<string, LLMExperience[]>> {
    // Sample representative experiences (30-50)
    const sampleSize = Math.min(50, Math.max(30, Math.floor(cluster.length * 0.3)));
    const sampled = this.sampleRepresentative(cluster, sampleSize);

    // Build prompt for LLM
    const prompt = this.buildSemanticSplitPrompt(sampled, baseName);

    // Get LLM response
    const response = await this.llmClient.chat([
      {
        role: 'system',
        content: 'You are analyzing Sudoku reasoning patterns to identify distinct semantic approaches.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    // Parse semantic patterns from LLM response
    const patterns = this.parseSemanticPatterns(response.content);

    if (patterns.length === 0) {
      // Fallback: return original cluster if parsing fails
      return new Map([[baseName, cluster]]);
    }

    // Categorize all experiences by patterns
    return this.categorizeByPatterns(cluster, patterns, baseName);
  }

  /**
   * Sample representative experiences from cluster
   */
  private sampleRepresentative(
    experiences: LLMExperience[],
    sampleSize: number
  ): LLMExperience[] {
    if (experiences.length <= sampleSize) {
      return experiences;
    }

    // Stratified sampling by grid difficulty (empty cells)
    const sorted = [...experiences].sort(
      (a, b) => (a.context?.emptyCellsAtMove ?? 0) - (b.context?.emptyCellsAtMove ?? 0)
    );

    const sampled: LLMExperience[] = [];
    const step = experiences.length / sampleSize;

    for (let i = 0; i < sampleSize; i++) {
      const index = Math.floor(i * step);
      sampled.push(sorted[index]);
    }

    return sampled;
  }

  /**
   * Build prompt for LLM semantic split
   */
  private buildSemanticSplitPrompt(sampled: LLMExperience[], baseName: string): string {
    return `You have ${sampled.length} Sudoku move experiences labeled "${baseName}".

Analyze the REASONING PATTERNS, not positions or values.

What distinct reasoning approaches do you see? Examples:
- 'Only candidate elimination' vs 'Forced by constraint intersection'
- 'Single-step deduction' vs 'Multi-step logical chain'
- 'Box-focused' vs 'Row-column intersection'

Identify 4-8 semantically distinct categories.

For each category, provide:
1. Category name (describes reasoning approach)
2. When this pattern is used (what makes it distinct)
3. Keywords that signal this pattern

Output format:
PATTERN_1: [name]
WHEN: [description]
KEYWORDS: [comma-separated keywords]

PATTERN_2: [name]
WHEN: [description]
KEYWORDS: [comma-separated keywords]

Sample experiences:
${sampled.map((exp, i) => `${i}. "${exp.move.reasoning.substring(0, 150)}..."`).join('\n\n')}

Provide 4-8 patterns now:`;
  }

  /**
   * Parse semantic patterns from LLM response
   */
  private parseSemanticPatterns(response: string): SemanticPattern[] {
    const patterns: SemanticPattern[] = [];
    const lines = response.split('\n');

    let currentPattern: Partial<SemanticPattern> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('PATTERN_')) {
        // Save previous pattern
        if (currentPattern.name && currentPattern.keywords) {
          patterns.push(currentPattern as SemanticPattern);
        }

        // Start new pattern
        const nameMatch = trimmed.match(/PATTERN_\d+:\s*(.+)/);
        if (nameMatch) {
          currentPattern = {
            name: nameMatch[1].trim(),
            description: '',
            keywords: [],
            exampleIds: [],
          };
        }
      } else if (trimmed.startsWith('WHEN:') && currentPattern.name) {
        const descMatch = trimmed.match(/WHEN:\s*(.+)/);
        if (descMatch) {
          currentPattern.description = descMatch[1].trim();
        }
      } else if (trimmed.startsWith('KEYWORDS:') && currentPattern.name) {
        const kwMatch = trimmed.match(/KEYWORDS:\s*(.+)/);
        if (kwMatch) {
          currentPattern.keywords = kwMatch[1]
            .split(',')
            .map((k) => k.trim().toLowerCase())
            .filter((k) => k.length > 0);
        }
      }
    }

    // Save last pattern
    if (currentPattern.name && currentPattern.keywords) {
      patterns.push(currentPattern as SemanticPattern);
    }

    return patterns;
  }

  /**
   * Categorize experiences by semantic patterns
   */
  private categorizeByPatterns(
    experiences: LLMExperience[],
    patterns: SemanticPattern[],
    baseName: string
  ): Map<string, LLMExperience[]> {
    const result = new Map<string, LLMExperience[]>();

    // Initialize clusters for each pattern
    for (const pattern of patterns) {
      result.set(`${baseName}_${pattern.name}`, []);
    }

    // Add fallback cluster for unmatched experiences
    result.set(`${baseName}_other`, []);

    // Categorize each experience
    for (const exp of experiences) {
      const reasoning = exp.move.reasoning.toLowerCase();
      let matched = false;

      // Try to match with patterns (by keywords)
      for (const pattern of patterns) {
        const keywordMatch = pattern.keywords.some((kw) => reasoning.includes(kw));
        if (keywordMatch) {
          result.get(`${baseName}_${pattern.name}`)!.push(exp);
          matched = true;
          break;
        }
      }

      // Add to fallback cluster if no match
      if (!matched) {
        result.get(`${baseName}_other`)!.push(exp);
      }
    }

    // Remove empty clusters
    const filtered = new Map<string, LLMExperience[]>();
    for (const [name, exps] of result) {
      if (exps.length > 0) {
        filtered.set(name, exps);
      }
    }

    return filtered;
  }
}
