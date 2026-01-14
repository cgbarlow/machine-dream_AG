/**
 * LLMCluster v1 - Fully LLM-driven pattern identification
 *
 * Fully LLM-driven clustering algorithm:
 * - Sample 100-150 experiences (balanced by difficulty)
 * - Ask LLM to identify 10-15 distinct patterns
 * - Categorize all experiences using identified patterns
 *
 * Performance: <180s for 500 experiences
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
 * Reasoning pattern identified by LLM
 */
interface ReasoningPattern {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  characteristics: string[];
}

/**
 * Configuration options for LLMCluster v1 (Spec 18 Section 3.3.4)
 */
export interface LLMClusterConfig {
  batchSize: number;        // Default: 50 - Experiences per LLM categorization batch
  parallelBatches: number;  // Default: 3 - Number of concurrent batch requests
  hybridMode: boolean;      // Default: false - Use keyword matching for high-confidence
  useCache: boolean;        // Default: true - Cache pattern assignments
}

const DEFAULT_CONFIG: LLMClusterConfig = {
  batchSize: 50,
  parallelBatches: 3,
  hybridMode: false,
  useCache: true,
};

/**
 * LLMCluster v1 Algorithm
 *
 * Performance: <180s for 500 experiences
 * Approach: Fully LLM-driven pattern identification and categorization
 */
export class LLMClusterV1 extends BaseClusteringAlgorithm {
  private llmClient: LMStudioClient;
  private config: LLMClusterConfig;
  private patternCache: Map<string, string> = new Map();  // experienceId -> patternName

  /**
   * Sample size for pattern identification (100-150 experiences)
   */
  private readonly SAMPLE_SIZE_MIN = 100;
  private readonly SAMPLE_SIZE_MAX = 150;

  constructor(llmClient: LMStudioClient, config?: Partial<LLMClusterConfig>) {
    const metadata: AlgorithmMetadata = {
      name: 'LLMCluster',
      version: 1,
      identifier: 'llmclusterv1',
      description: 'Fully LLM-driven pattern identification and categorization',
      codeHash: computeCodeHash(__filename),
      createdAt: new Date('2026-01-13'),
    };
    super(metadata);
    this.llmClient = llmClient;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current configuration (for debugging/inspection)
   */
  getConfig(): LLMClusterConfig {
    return { ...this.config };
  }

  /**
   * Clear the pattern cache (useful when patterns change)
   */
  clearCache(): void {
    this.patternCache.clear();
  }

  /**
   * Cluster experiences using fully LLM-driven approach
   */
  async cluster(
    experiences: LLMExperience[],
    targetCount: number,
    config: LLMConfig
  ): Promise<ClusteringResult> {
    const startTime = Date.now();

    console.log(`🔍 Clustering ${experiences.length} experiences with ${this.getIdentifier()}...`);
    console.log(`   Target clusters: ${targetCount}`);

    if (experiences.length === 0) {
      return {
        clusters: new Map(),
        metadata: {
          totalExperiences: 0,
          clustersCreated: 0,
          processingTimeMs: 0,
        },
      };
    }

    // Step 1: Sample experiences (balanced by difficulty)
    const sampleSize = Math.min(
      this.SAMPLE_SIZE_MAX,
      Math.max(this.SAMPLE_SIZE_MIN, Math.floor(experiences.length * 0.3))
    );
    const sampled = this.sampleBalanced(experiences, sampleSize);

    console.log(`   Step 1: Sampled ${sampled.length} experiences`);

    // Step 2: Ask LLM to identify patterns
    const patternCount = Math.max(10, targetCount);
    console.log(`   Step 2: Asking LLM to identify ${patternCount} patterns...`);

    let patterns: ReasoningPattern[];
    try {
      patterns = await this.identifyPatterns(sampled, patternCount, config);
      console.log(`   ✓ LLM identified ${patterns.length} patterns`);

      // If LLM returned 0 patterns (parsing failed), use fallback
      if (patterns.length === 0) {
        console.warn(`   ⚠️  LLM returned 0 patterns, using fallback patterns`);
        patterns = this.getFallbackPatterns();
      }
    } catch (error) {
      console.warn(`   ⚠️  LLM pattern identification failed, using fallback`);
      patterns = this.getFallbackPatterns();
    }

    // Step 3: Categorize all experiences by patterns (using LLM)
    console.log(`   Step 3: LLM categorizing ${experiences.length} experiences...`);
    const clusters = await this.categorizeByPatterns(experiences, patterns);

    console.log(`   Final clusters: ${clusters.size}`);

    const processingTimeMs = Date.now() - startTime;

    return {
      clusters,
      metadata: {
        totalExperiences: experiences.length,
        clustersCreated: clusters.size,
        processingTimeMs,
      },
    };
  }

  /**
   * Sample experiences balanced by difficulty (empty cells)
   */
  private sampleBalanced(
    experiences: LLMExperience[],
    sampleSize: number
  ): LLMExperience[] {
    if (experiences.length <= sampleSize) {
      return experiences;
    }

    // Sort by difficulty (empty cells at move)
    const sorted = [...experiences].sort(
      (a, b) => (b.context?.emptyCellsAtMove ?? 0) - (a.context?.emptyCellsAtMove ?? 0)
    );

    // Stratified sampling across difficulty levels
    const sampled: LLMExperience[] = [];
    const step = sorted.length / sampleSize;

    for (let i = 0; i < sampleSize; i++) {
      const index = Math.floor(i * step);
      if (index < sorted.length) {
        sampled.push(sorted[index]);
      }
    }

    return sampled;
  }

  /**
   * Ask LLM to identify reasoning patterns
   */
  private async identifyPatterns(
    sampled: LLMExperience[],
    targetCount: number,
    _config: LLMConfig
  ): Promise<ReasoningPattern[]> {
    const prompt = this.buildPatternIdentificationPrompt(sampled, targetCount);

    const response = await this.llmClient.chat([
      {
        role: 'system',
        content:
          'You are a Sudoku reasoning expert identifying distinct solving strategies from gameplay experiences.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    // Debug: log first 500 chars of LLM response (if debug enabled)
    if (_config.debug) {
      if (response.content.length > 0) {
        console.log(`   📝 LLM response preview: ${response.content.substring(0, 500)}...`);
      } else {
        console.warn(`   ⚠️  LLM returned empty response`);
      }
    }

    const patterns = this.parsePatterns(response.content);

    // If parsing failed, log the full response for debugging (if debug enabled)
    if (patterns.length === 0 && _config.debug) {
      console.warn(`   ⚠️  Failed to parse any patterns from LLM response`);
      console.warn(`   Full response length: ${response.content.length} chars`);
    }

    return patterns;
  }

  /**
   * Build prompt for pattern identification
   */
  private buildPatternIdentificationPrompt(
    sampled: LLMExperience[],
    targetCount: number
  ): string {
    return `Analyze ${sampled.length} Sudoku solving experiences and identify ${targetCount} distinct reasoning patterns.

For each pattern, provide:
1. ID (e.g., P1, P2, P3)
2. Name (concise, describes approach)
3. Description (when and why this pattern is used)
4. Keywords (terms that signal this pattern)
5. Characteristics (what makes this pattern distinct)

Focus on REASONING APPROACHES, not specific positions or values.

Examples of distinct patterns:
- "Single candidate elimination" - Only one possible value remains
- "Constraint intersection" - Multiple constraints force a value
- "Hidden singles in box" - Value only appears once in a box
- "Naked pairs" - Two cells in a unit can only contain two values
- "Pointing pairs" - Candidates in a box point to elimination in row/column

IMPORTANT: Output in PLAIN TEXT format (no markdown, no bold, no formatting):

PATTERN: P1
NAME: [name]
DESC: [description]
KEYWORDS: [comma-separated]
CHAR: [comma-separated characteristics]

PATTERN: P2
NAME: [name]
DESC: [description]
KEYWORDS: [comma-separated]
CHAR: [comma-separated characteristics]

Sample experiences:
${sampled
  .slice(0, 50)
  .map((exp, i) => `${i + 1}. "${exp.move.reasoning}"`)
  .join('\n\n')}

${sampled.length > 50 ? `... and ${sampled.length - 50} more experiences` : ''}

Provide ${targetCount} distinct patterns now in PLAIN TEXT (no markdown):`;
  }

  /**
   * Parse patterns from LLM response
   * Handles both plain text and markdown formatting (strips ** bold **)
   */
  private parsePatterns(response: string): ReasoningPattern[] {
    const patterns: ReasoningPattern[] = [];
    const lines = response.split('\n');

    let currentPattern: Partial<ReasoningPattern> = {};

    for (const line of lines) {
      // Strip markdown bold formatting (** at start/end) and trim
      const trimmed = line.trim().replace(/^\*\*|\*\*$/g, '').trim();

      if (trimmed.startsWith('PATTERN:')) {
        // Save previous pattern
        if (currentPattern.id && currentPattern.name && currentPattern.keywords) {
          patterns.push(currentPattern as ReasoningPattern);
        }

        // Start new pattern
        const idMatch = trimmed.match(/PATTERN:\s*(\w+)/);
        if (idMatch) {
          currentPattern = {
            id: idMatch[1],
            name: '',
            description: '',
            keywords: [],
            characteristics: [],
          };
        }
      } else if (trimmed.startsWith('NAME:') && currentPattern.id) {
        const nameMatch = trimmed.match(/NAME:\s*(.+)/);
        if (nameMatch) {
          currentPattern.name = nameMatch[1].trim();
        }
      } else if (trimmed.startsWith('DESC:') && currentPattern.id) {
        const descMatch = trimmed.match(/DESC:\s*(.+)/);
        if (descMatch) {
          currentPattern.description = descMatch[1].trim();
        }
      } else if (trimmed.startsWith('KEYWORDS:') && currentPattern.id) {
        const kwMatch = trimmed.match(/KEYWORDS:\s*(.+)/);
        if (kwMatch) {
          currentPattern.keywords = kwMatch[1]
            .split(',')
            .map((k) => k.trim().toLowerCase())
            .filter((k) => k.length > 0);
        }
      } else if (trimmed.startsWith('CHAR:') && currentPattern.id) {
        const charMatch = trimmed.match(/CHAR:\s*(.+)/);
        if (charMatch) {
          currentPattern.characteristics = charMatch[1]
            .split(',')
            .map((c) => c.trim())
            .filter((c) => c.length > 0);
        }
      }
    }

    // Save last pattern
    if (currentPattern.id && currentPattern.name && currentPattern.keywords) {
      patterns.push(currentPattern as ReasoningPattern);
    }

    return patterns;
  }

  /**
   * Categorize experiences by patterns using LLM
   * Supports configurable batch size, parallel processing, hybrid mode, and caching
   * (Spec 18 Section 3.3.4)
   */
  private async categorizeByPatterns(
    experiences: LLMExperience[],
    patterns: ReasoningPattern[]
  ): Promise<Map<string, LLMExperience[]>> {
    const result = new Map<string, LLMExperience[]>();

    // Initialize clusters for each pattern
    for (const pattern of patterns) {
      result.set(pattern.name, []);
    }

    // Add fallback cluster for unmatched experiences
    result.set('uncategorized', []);

    // Use configurable batch size
    const BATCH_SIZE = this.config.batchSize;
    const PARALLEL = this.config.parallelBatches;

    // Split experiences into batches
    const batches: LLMExperience[][] = [];
    for (let i = 0; i < experiences.length; i += BATCH_SIZE) {
      batches.push(experiences.slice(i, i + BATCH_SIZE));
    }

    const totalBatches = batches.length;
    console.log(`   Categorizing ${experiences.length} experiences in ${totalBatches} batches (batch_size=${BATCH_SIZE}, parallel=${PARALLEL})...`);

    // Process batches in parallel chunks
    for (let i = 0; i < batches.length; i += PARALLEL) {
      const chunk = batches.slice(i, i + PARALLEL);
      const chunkStartNum = i + 1;
      const chunkEndNum = Math.min(i + PARALLEL, totalBatches);

      if (PARALLEL > 1 && chunk.length > 1) {
        console.log(`   Batches ${chunkStartNum}-${chunkEndNum}/${totalBatches}: processing ${chunk.length} batches in parallel...`);
      } else {
        console.log(`   Batch ${chunkStartNum}/${totalBatches}: categorizing ${chunk[0].length} experiences...`);
      }

      try {
        // Process batch chunk in parallel
        const promises = chunk.map((batch, idx) =>
          this.processBatch(batch, patterns, i + idx, totalBatches)
        );
        const batchResults = await Promise.all(promises);

        // Merge results into clusters
        for (const batchResult of batchResults) {
          for (const { exp, patternName } of batchResult) {
            if (patternName && result.has(patternName)) {
              result.get(patternName)!.push(exp);
            } else {
              result.get('uncategorized')!.push(exp);
            }
          }
        }
      } catch (error) {
        console.warn(`   ⚠️  Chunk ${chunkStartNum}-${chunkEndNum} categorization failed, using uncategorized`);
        // If all batches in chunk fail, add all to uncategorized
        for (const batch of chunk) {
          for (const exp of batch) {
            result.get('uncategorized')!.push(exp);
          }
        }
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

  /**
   * Process a single batch with hybrid mode and caching support
   */
  private async processBatch(
    batch: LLMExperience[],
    patterns: ReasoningPattern[],
    _batchNum: number,
    _totalBatches: number
  ): Promise<{ exp: LLMExperience; patternName: string }[]> {
    const results: { exp: LLMExperience; patternName: string }[] = [];

    if (this.config.hybridMode) {
      // Hybrid mode: try keyword matching first, LLM for uncertain
      const uncertain: LLMExperience[] = [];

      for (const exp of batch) {
        // Check cache first
        if (this.config.useCache && exp.id) {
          const cached = this.patternCache.get(exp.id);
          if (cached) {
            results.push({ exp, patternName: cached });
            continue;
          }
        }

        // Try keyword matching
        const keywordMatch = this.tryKeywordMatch(exp, patterns);
        if (keywordMatch) {
          results.push({ exp, patternName: keywordMatch });
          if (this.config.useCache && exp.id) {
            this.patternCache.set(exp.id, keywordMatch);
          }
        } else {
          uncertain.push(exp);
        }
      }

      // LLM categorize uncertain ones
      if (uncertain.length > 0) {
        const llmResults = await this.llmCategorizeBatch(uncertain, patterns);
        for (let i = 0; i < uncertain.length; i++) {
          const patternName = llmResults[i];
          results.push({ exp: uncertain[i], patternName });
          if (this.config.useCache && uncertain[i].id) {
            this.patternCache.set(uncertain[i].id, patternName);
          }
        }
      }
    } else {
      // Pure LLM categorization (default)
      const llmResults = await this.llmCategorizeBatch(batch, patterns);
      for (let i = 0; i < batch.length; i++) {
        const patternName = llmResults[i];
        results.push({ exp: batch[i], patternName });
        if (this.config.useCache && batch[i].id) {
          this.patternCache.set(batch[i].id, patternName);
        }
      }
    }

    return results;
  }

  /**
   * Try to match experience to pattern using keywords (for hybrid mode)
   * Returns pattern name if confident match, null otherwise
   */
  private tryKeywordMatch(
    exp: LLMExperience,
    patterns: ReasoningPattern[]
  ): string | null {
    const reasoning = exp.move.reasoning.toLowerCase();

    // Score each pattern based on keyword matches
    let bestMatch: { pattern: ReasoningPattern; score: number } | null = null;

    for (const pattern of patterns) {
      let score = 0;
      for (const keyword of pattern.keywords) {
        if (reasoning.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }

      // Need at least 2 keyword matches for confident classification
      if (score >= 2 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { pattern, score };
      }
    }

    return bestMatch ? bestMatch.pattern.name : null;
  }

  /**
   * Ask LLM to categorize a batch of experiences
   */
  private async llmCategorizeBatch(
    batch: LLMExperience[],
    patterns: ReasoningPattern[]
  ): Promise<string[]> {
    // Build pattern list for LLM
    const patternList = patterns
      .map((p, i) => `${i + 1}. ${p.name}: ${p.description}`)
      .join('\n');

    // Build experience list
    const experienceList = batch
      .map((exp, i) => `${i + 1}. "${exp.move.reasoning}"`)
      .join('\n\n');

    const prompt = `You are categorizing Sudoku solving reasoning into patterns.

Available patterns:
${patternList}

For each reasoning statement below, respond with ONLY the pattern number (1-${patterns.length}) that best matches.
If none match well, respond with "0" for uncategorized.

Format: One number per line, no other text.

Reasoning statements:
${experienceList}

Pattern numbers (one per line):`;

    const response = await this.llmClient.chat([
      {
        role: 'system',
        content: 'You categorize Sudoku reasoning into patterns. Output only numbers, one per line.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    // Parse response: expect one number per line
    const lines = response.content.trim().split('\n');
    const categorizations: string[] = [];

    for (let i = 0; i < batch.length; i++) {
      const line = lines[i]?.trim();
      const patternNum = parseInt(line || '0', 10);

      if (patternNum > 0 && patternNum <= patterns.length) {
        categorizations.push(patterns[patternNum - 1].name);
      } else {
        categorizations.push('uncategorized');
      }
    }

    return categorizations;
  }

  /**
   * Fallback patterns when LLM fails
   * Keywords made more specific to avoid dominant cluster (80% in P1)
   */
  private getFallbackPatterns(): ReasoningPattern[] {
    return [
      {
        id: 'P1',
        name: 'Direct naked single',
        description: 'Cell has only one candidate after basic elimination',
        keywords: ['naked single', 'sole candidate', 'last remaining', 'only value'],
        characteristics: ['deterministic', 'single-step'],
      },
      {
        id: 'P2',
        name: 'Hidden single in unit',
        description: 'Value appears only once in a row, column, or box',
        keywords: ['hidden single', 'only place', 'only spot', 'must go'],
        characteristics: ['deterministic', 'unit-scanning'],
      },
      {
        id: 'P3',
        name: 'Constraint-based deduction',
        description: 'Multiple constraints eliminate all but one possibility',
        keywords: ['constraint', 'eliminate', 'ruled out', 'cannot be'],
        characteristics: ['logical', 'multi-constraint'],
      },
      {
        id: 'P4',
        name: 'Box analysis',
        description: 'Analyzing 3x3 box constraints to identify placements',
        keywords: ['box', 'square', 'region', '3x3'],
        characteristics: ['spatial', 'box-focused'],
      },
      {
        id: 'P5',
        name: 'Row analysis',
        description: 'Analyzing row constraints to identify placements',
        keywords: ['row', 'horizontal', 'across'],
        characteristics: ['spatial', 'row-focused'],
      },
      {
        id: 'P6',
        name: 'Column analysis',
        description: 'Analyzing column constraints to identify placements',
        keywords: ['column', 'vertical', 'down'],
        characteristics: ['spatial', 'column-focused'],
      },
      {
        id: 'P7',
        name: 'Multi-unit intersection',
        description: 'Interaction between multiple units (row+column+box)',
        keywords: ['intersection', 'overlap', 'both', 'all three'],
        characteristics: ['cross-unit', 'complex'],
      },
      {
        id: 'P8',
        name: 'Process of elimination',
        description: 'Systematic elimination of impossible values',
        keywords: ['process', 'elimination', 'checking', 'trying'],
        characteristics: ['systematic', 'exploratory'],
      },
    ];
  }
}
