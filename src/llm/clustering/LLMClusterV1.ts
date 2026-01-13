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
 * LLMCluster v1 Algorithm
 *
 * Performance: <180s for 500 experiences
 * Approach: Fully LLM-driven pattern identification and categorization
 */
export class LLMClusterV1 extends BaseClusteringAlgorithm {
  private llmClient: LMStudioClient;

  /**
   * Sample size for pattern identification (100-150 experiences)
   */
  private readonly SAMPLE_SIZE_MIN = 100;
  private readonly SAMPLE_SIZE_MAX = 150;

  constructor(llmClient: LMStudioClient) {
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

    // Step 3: Categorize all experiences by patterns
    console.log(`   Step 3: Categorizing ${experiences.length} experiences...`);
    const clusters = this.categorizeByPatterns(experiences, patterns);

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

Output format:
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

Provide ${targetCount} distinct patterns now:`;
  }

  /**
   * Parse patterns from LLM response
   */
  private parsePatterns(response: string): ReasoningPattern[] {
    const patterns: ReasoningPattern[] = [];
    const lines = response.split('\n');

    let currentPattern: Partial<ReasoningPattern> = {};

    for (const line of lines) {
      const trimmed = line.trim();

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
   * Categorize experiences by patterns
   */
  private categorizeByPatterns(
    experiences: LLMExperience[],
    patterns: ReasoningPattern[]
  ): Map<string, LLMExperience[]> {
    const result = new Map<string, LLMExperience[]>();

    // Initialize clusters for each pattern
    for (const pattern of patterns) {
      result.set(pattern.name, []);
    }

    // Add fallback cluster for unmatched experiences
    result.set('uncategorized', []);

    // Categorize each experience
    for (const exp of experiences) {
      const reasoning = exp.move.reasoning.toLowerCase();
      let matched = false;

      // Try to match with patterns (by keywords)
      for (const pattern of patterns) {
        const keywordMatch = pattern.keywords.some((kw) => reasoning.includes(kw));

        if (keywordMatch) {
          result.get(pattern.name)!.push(exp);
          matched = true;
          break;
        }
      }

      // Add to fallback cluster if no match
      if (!matched) {
        result.get('uncategorized')!.push(exp);
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
   * Fallback patterns when LLM fails
   */
  private getFallbackPatterns(): ReasoningPattern[] {
    return [
      {
        id: 'P1',
        name: 'Single candidate elimination',
        description: 'Only one possible value remains after elimination',
        keywords: ['only', 'candidate', 'option', 'possible', 'remaining'],
        characteristics: ['deterministic', 'single-step'],
      },
      {
        id: 'P2',
        name: 'Constraint intersection',
        description: 'Multiple constraints intersect to force a value',
        keywords: ['constraint', 'intersection', 'forced', 'impossible'],
        characteristics: ['logical', 'multi-constraint'],
      },
      {
        id: 'P3',
        name: 'Box-focused analysis',
        description: 'Analyzing box constraints to identify candidates',
        keywords: ['box', 'square', 'region', 'contains'],
        characteristics: ['spatial', 'box-focused'],
      },
      {
        id: 'P4',
        name: 'Row-column interaction',
        description: 'Interaction between row and column constraints',
        keywords: ['row', 'column', 'line', 'intersect'],
        characteristics: ['cross-unit', 'spatial'],
      },
      {
        id: 'P5',
        name: 'Unique candidate in unit',
        description: 'Value appears only once in a row, column, or box',
        keywords: ['unique', 'only appears', 'single occurrence'],
        characteristics: ['deterministic', 'unit-analysis'],
      },
      {
        id: 'P6',
        name: 'General deductive reasoning',
        description: 'General logical deduction and problem-solving',
        keywords: ['must', 'therefore', 'because', 'since', 'thus'],
        characteristics: ['exploratory', 'general', 'deductive'],
      },
    ];
  }
}
