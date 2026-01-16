/**
 * DeepCluster v2 - Two-phase clustering with AISP semantic prompts
 *
 * Extends DeepCluster v1 with AISP mode support.
 * When aispMode === 'aisp-full':
 * - Phase 2 LLM semantic split uses AISP prompts
 * - Pattern output uses ⟦Λ:Pattern⟧ format
 * - Responses validated with aisp-validator
 *
 * Key changes from v1:
 * - AISP prompts for LLM semantic split when aispMode === 'aisp-full'
 * - AISP cluster naming
 * - Validation with critique fallback
 * - Backward compatible: aispMode === 'off' behaves like v1
 *
 * See:
 * - Spec 18: Algorithm Versioning System - Section 3.5
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
import { LMStudioClient } from '../LMStudioClient.js';
import { AISPBuilder } from '../AISPBuilder.js';
import { AISPValidatorService } from '../AISPValidator.js';

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
 * DeepCluster v2 Algorithm
 *
 * Performance: <60s for 500 experiences
 * Approach: Two-phase clustering with AISP-enhanced LLM semantic split
 */
export class DeepClusterV2 extends BaseClusteringAlgorithm {
  private llmClient: LMStudioClient;
  private aispBuilder: AISPBuilder;
  private aispValidator: AISPValidatorService;
  private validatorInitialized = false;

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
      version: 2,
      identifier: 'deepclusterv2',
      description: 'Two-phase clustering with AISP-enhanced LLM semantic split',
      codeHash: computeCodeHash(__filename),
      createdAt: new Date('2026-01-16'),
    };
    super(metadata);
    this.llmClient = llmClient;
    this.aispBuilder = new AISPBuilder();
    this.aispValidator = new AISPValidatorService();
  }

  /**
   * Initialize AISP validator if needed
   */
  private async ensureValidatorInitialized(): Promise<void> {
    if (this.validatorInitialized) return;

    if (this.aispMode === 'aisp-full') {
      try {
        await this.aispValidator.init();
        this.validatorInitialized = true;
      } catch (error) {
        console.warn(`⚠️ Failed to initialize AISP validator: ${error}`);
      }
    }
  }

  /**
   * Cluster experiences using two-phase approach with AISP support
   */
  async cluster(
    experiences: LLMExperience[],
    targetCount: number,
    config: LLMConfig
  ): Promise<ClusteringResult> {
    const startTime = Date.now();

    console.log(`🔍 Clustering ${experiences.length} experiences with ${this.getIdentifier()}...`);
    console.log(`   Target clusters: ${targetCount}`);
    if (this.aispMode === 'aisp-full') {
      console.log(`   🔤 AISP mode enabled`);
      await this.ensureValidatorInitialized();
    }

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

    if (found.length === 0) {
      return this.formatClusterName('general_reasoning');
    }

    const keywords = found.slice(0, keywordDepth).join('_');
    return this.formatClusterName(keywords);
  }

  /**
   * Format cluster name based on AISP mode
   */
  private formatClusterName(name: string): string {
    if (this.aispMode === 'aisp-full') {
      const identifier = this.toPascalCase(name);
      return `⟦Λ:Cluster.${identifier}⟧`;
    }
    return name;
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

    // Build prompt (AISP or English based on mode)
    const prompt = this.aispMode === 'aisp-full'
      ? this.buildAISPSemanticSplitPrompt(sampled, baseName)
      : this.buildSemanticSplitPrompt(sampled, baseName);

    // System prompt
    const systemPrompt = this.aispMode === 'aisp-full'
      ? this.buildAISPSystemPrompt()
      : 'You are analyzing Sudoku reasoning patterns to identify distinct semantic approaches.';

    // Get LLM response
    const response = await this.llmClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]);

    // Validate and parse response
    let patterns: SemanticPattern[];

    if (this.aispMode === 'aisp-full' && this.validatorInitialized) {
      patterns = await this.parseAISPPatterns(response.content, prompt);
    } else {
      patterns = this.parseSemanticPatterns(response.content);
    }

    if (patterns.length === 0) {
      // Fallback: return original cluster if parsing fails
      return new Map([[baseName, cluster]]);
    }

    // Categorize all experiences by patterns
    return this.categorizeByPatterns(cluster, patterns, baseName);
  }

  /**
   * Build AISP system prompt for semantic split
   */
  private buildAISPSystemPrompt(): string {
    const date = new Date().toISOString().split('T')[0];

    return `𝔸1.0.sudoku.semantic.analysis@${date}
γ≔sudoku.pattern.identification

${this.aispBuilder.getAISPGenerationSpec()}

⟦Ω:Task⟧{
  task≜identify(semantic_patterns)∈cluster
  constraint≜∀p₁,p₂:p₁≠p₂⇒distinct(p₁,p₂)
}

⟦Ε:Output⟧{
  ∀output:syntax∈AISP
  ∀pattern:format∈⟦Λ:Pattern⟧
  ¬prose; ¬natural_language
}`;
  }

  /**
   * Build AISP semantic split prompt
   */
  private buildAISPSemanticSplitPrompt(sampled: LLMExperience[], baseName: string): string {
    const date = new Date().toISOString().split('T')[0];

    return `𝔸1.0.sudoku.semantic.split@${date}
γ≔cluster.subdivision

⟦Σ:Input⟧{
  cluster≔"${baseName}"
  size≔${sampled.length}
  experiences≔⟨
${sampled.map((exp, i) => `    e${i}≔"${exp.move.reasoning.substring(0, 100)}..."`).join('\n')}
  ⟩
}

⟦Ω:Task⟧{
  task≜identify(4..8,semantic_patterns)∈cluster
  constraint≜∀p:distinct(p.reasoning_approach)
  output≜⟦Λ:Pattern⟧×n
}

⟦Σ:PatternFormat⟧{
  Pattern≜⟦Λ:Pattern.ID⟧{
    name≔string
    desc≔when_applicable
    keywords≔{terms}
  }
}

⟦Ε:Output⟧{
  format≔⟦Λ:Pattern.P1⟧{name≔...,desc≔...,keywords≔{...}}
  ∀output:syntax∈AISP
  ¬prose
}`;
  }

  /**
   * Build English semantic split prompt (fallback/off mode)
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
   * Parse AISP-formatted patterns with validation
   */
  private async parseAISPPatterns(response: string, originalPrompt: string): Promise<SemanticPattern[]> {
    // Validate response
    const validation = await this.aispValidator.validateWithCritique(
      response,
      originalPrompt,
      this.llmClient
    );

    if (validation.result.tierValue === 0) {
      // Reject tier - log critique and fall back to English parsing
      console.warn(`   ⚠️ AISP validation failed (δ=${validation.result.delta.toFixed(3)})`);
      if (validation.critique) {
        console.warn(`   Critique: ${validation.critique.substring(0, 200)}...`);
      }
      console.warn(`   Falling back to English parsing`);
      return this.parseSemanticPatterns(response);
    }

    // Try to parse AISP patterns
    const patterns: SemanticPattern[] = [];
    const patternRegex = /⟦Λ:Pattern\.(\w+)⟧\{([^}]+)\}/g;
    let match;

    while ((match = patternRegex.exec(response)) !== null) {
      const content = match[2];

      // Extract fields
      const nameMatch = content.match(/name≔"?([^"]+)"?/);
      const descMatch = content.match(/desc≔"?([^"]+)"?/);
      const keywordsMatch = content.match(/keywords≔\{([^}]+)\}/);

      if (nameMatch) {
        patterns.push({
          name: nameMatch[1].trim(),
          description: descMatch?.[1]?.trim() || '',
          keywords: keywordsMatch?.[1]
            ?.split(',')
            .map((k) => k.trim().toLowerCase().replace(/"/g, ''))
            .filter((k) => k.length > 0) || [],
          exampleIds: [],
        });
      }
    }

    // If AISP parsing failed, fall back to English
    if (patterns.length === 0) {
      console.warn(`   ⚠️ No AISP patterns parsed, falling back to English parsing`);
      return this.parseSemanticPatterns(response);
    }

    return patterns;
  }

  /**
   * Parse English-formatted semantic patterns
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
      const clusterName = this.formatSubClusterName(baseName, pattern.name);
      result.set(clusterName, []);
    }

    // Add fallback cluster for unmatched experiences
    const otherName = this.formatSubClusterName(baseName, 'other');
    result.set(otherName, []);

    // Categorize each experience
    for (const exp of experiences) {
      const reasoning = exp.move.reasoning.toLowerCase();
      let matched = false;

      // Try to match with patterns (by keywords)
      for (const pattern of patterns) {
        const keywordMatch = pattern.keywords.some((kw) => reasoning.includes(kw));
        if (keywordMatch) {
          const clusterName = this.formatSubClusterName(baseName, pattern.name);
          result.get(clusterName)!.push(exp);
          matched = true;
          break;
        }
      }

      // Add to fallback cluster if no match
      if (!matched) {
        result.get(otherName)!.push(exp);
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
   * Format sub-cluster name based on AISP mode
   */
  private formatSubClusterName(baseName: string, patternName: string): string {
    if (this.aispMode === 'aisp-full') {
      const identifier = this.toPascalCase(patternName);
      // Extract base identifier if already AISP formatted
      if (baseName.startsWith('⟦Λ:') && baseName.endsWith('⟧')) {
        const base = baseName.slice(3, -1);
        return `⟦Λ:${base}.${identifier}⟧`;
      }
      return `⟦Λ:Cluster.${this.toPascalCase(baseName)}.${identifier}⟧`;
    }
    return `${baseName}_${patternName}`;
  }
}
