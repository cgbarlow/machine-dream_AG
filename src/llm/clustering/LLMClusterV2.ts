/**
 * LLMCluster v2 - Improved fully LLM-driven pattern identification
 *
 * Improvements over v1:
 * - Require MUTUALLY EXCLUSIVE patterns during identification
 * - LLM self-critique step before categorization
 * - More demanding categorization prompt (most SPECIFIC pattern)
 * - Request 15-20 patterns initially for more diversity
 * - Two-pass refinement for dominant clusters (>50% experiences)
 *
 * AISP Mode Support (ADR-013):
 * - When aispMode === 'aisp-full', all prompts use pure AISP syntax
 * - Pattern identification uses AISP mutual exclusivity constraints
 * - Categorization uses AISP output format
 * - LLM responses validated with aisp-validator
 *
 * Philosophy: LLM does the heavy lifting. No hints, no examples from us.
 * We just ask the model to think harder and critique its own work.
 *
 * Performance: <180s for 500 experiences (similar to v1)
 *
 * See:
 * - Spec 18: Algorithm Versioning System - Section 3.3
 * - ADR-011: Versioned Algorithms Architecture
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
import { ValidatedLLMClient } from '../ValidatedLLMClient.js';
import { AISPBuilder } from '../AISPBuilder.js';

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
  distinctionCriteria?: string;  // v2: What makes this distinct from other patterns
}

/**
 * Configuration options for LLMCluster v2
 */
export interface LLMClusterV2Config {
  batchSize: number;           // Default: 50 - Experiences per LLM categorization batch
  parallelBatches: number;     // Default: 3 - Number of concurrent batch requests
  enableSelfCritique: boolean; // Default: true - LLM reviews patterns before categorization
  enableRefinement: boolean;   // Default: true - Two-pass refinement for dominant clusters
  dominanceThreshold: number;  // Default: 0.5 - Threshold for dominant cluster refinement
}

const DEFAULT_CONFIG: LLMClusterV2Config = {
  batchSize: 50,
  parallelBatches: 3,
  enableSelfCritique: true,
  enableRefinement: true,
  dominanceThreshold: 0.5,
};

/**
 * LLMCluster v2 Algorithm
 *
 * Performance: <180s for 500 experiences
 * Approach: Improved LLM-driven pattern identification with mutual exclusivity
 */
export class LLMClusterV2 extends BaseClusteringAlgorithm {
  private llmClient: ValidatedLLMClient;
  private config: LLMClusterV2Config;
  private debugMode = false;
  private aispBuilder: AISPBuilder;

  /**
   * Sample size for pattern identification (100-150 experiences)
   */
  private readonly SAMPLE_SIZE_MIN = 100;
  private readonly SAMPLE_SIZE_MAX = 150;

  /**
   * Request more patterns initially for diversity (v2 improvement)
   */
  private readonly PATTERN_COUNT_MIN = 15;
  private readonly PATTERN_COUNT_MAX = 20;

  constructor(llmClient: ValidatedLLMClient, config?: Partial<LLMClusterV2Config>) {
    const metadata: AlgorithmMetadata = {
      name: 'LLMCluster',
      version: 2,
      identifier: 'llmclusterv2',
      description: 'Improved LLM-driven pattern identification with mutual exclusivity, self-critique, and AISP support',
      codeHash: computeCodeHash(__filename),
      createdAt: new Date('2026-01-15'),
    };
    super(metadata);
    this.llmClient = llmClient;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aispBuilder = new AISPBuilder();
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMClusterV2Config {
    return { ...this.config };
  }

  /**
   * Cluster experiences using improved LLM-driven approach
   */
  async cluster(
    experiences: LLMExperience[],
    targetCount: number,
    config: LLMConfig
  ): Promise<ClusteringResult> {
    const startTime = Date.now();
    this.debugMode = config.debug ?? false;

    console.log(`🔍 Clustering ${experiences.length} experiences with ${this.getIdentifier()}...`);
    console.log(`   Target clusters: ${targetCount}`);
    if (this.aispMode === 'aisp-full') {
      console.log(`   🔤 AISP mode enabled - all prompts will use AISP syntax`);
    }

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

    // Step 2: Ask LLM to identify MUTUALLY EXCLUSIVE patterns
    const patternCount = Math.max(this.PATTERN_COUNT_MIN, Math.min(this.PATTERN_COUNT_MAX, targetCount * 2));
    console.log(`   Step 2: Asking LLM to identify ${patternCount} MUTUALLY EXCLUSIVE patterns...`);

    let patterns = await this.identifyMutuallyExclusivePatterns(sampled, patternCount);
    console.log(`   ✓ LLM identified ${patterns.length} patterns`);

    // Step 2.5: LLM self-critique (if enabled)
    if (this.config.enableSelfCritique && patterns.length > 0) {
      console.log(`   Step 2.5: LLM self-critique of patterns...`);
      patterns = await this.selfCritiquePatterns(patterns, sampled);
      console.log(`   ✓ After self-critique: ${patterns.length} patterns`);
    }

    // Step 3: Categorize all experiences with demanding prompt
    console.log(`   Step 3: LLM categorizing ${experiences.length} experiences (most SPECIFIC pattern)...`);
    let clusters = await this.categorizeByPatterns(experiences, patterns);

    // Step 4: Two-pass refinement for dominant clusters (if enabled)
    if (this.config.enableRefinement) {
      const dominantCluster = this.findDominantCluster(clusters, experiences.length);
      if (dominantCluster) {
        console.log(`   Step 4: Refining dominant cluster "${dominantCluster.name}" (${dominantCluster.percentage.toFixed(0)}% of experiences)...`);
        clusters = await this.refineDominantCluster(clusters, dominantCluster, patterns);
      }
    }

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
   * Sample experiences balanced by difficulty
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
   * Ask LLM to identify MUTUALLY EXCLUSIVE reasoning patterns
   * v2 improvement: Emphasize non-overlapping criteria
   * AISP mode: Uses pure AISP prompts when aispMode === 'aisp-full'
   */
  private async identifyMutuallyExclusivePatterns(
    sampled: LLMExperience[],
    targetCount: number
  ): Promise<ReasoningPattern[]> {
    // Select prompt based on AISP mode
    const systemPrompt = this.aispMode === 'aisp-full'
      ? this.buildAISPPatternSystemPrompt()
      : `You are a Sudoku reasoning expert. Your task is to identify DISTINCT, NON-OVERLAPPING reasoning patterns.

CRITICAL: Each pattern MUST be mutually exclusive from all others. If an experience could fit multiple patterns, your patterns are not distinct enough.

Think like a taxonomist creating a classification system where each item belongs to exactly ONE category.`;

    const prompt = this.aispMode === 'aisp-full'
      ? this.buildAISPMutuallyExclusivePrompt(sampled, targetCount)
      : this.buildMutuallyExclusivePrompt(sampled, targetCount);

    const response = await this.llmClient.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      {
        validatePrompt: false, // Prompts contain embedded data; only validate responses
        validateResponse: this.aispMode === 'aisp-full',
        context: 'pattern-identification',
      }
    );

    if (this.debugMode && response.content.length > 0) {
      console.log(`   📝 LLM response preview: ${response.content.substring(0, 500)}...`);
    }

    // Parse based on AISP mode - validation handled by ValidatedLLMClient
    let patterns: ReasoningPattern[];
    if (this.aispMode === 'aisp-full') {
      patterns = this.parseAISPPatterns(response.content);
      if (patterns.length === 0) {
        // Fall back to English parsing if AISP parsing fails
        patterns = this.parsePatterns(response.content);
      }
    } else {
      patterns = this.parsePatterns(response.content);
    }

    if (patterns.length === 0) {
      console.warn(`   ⚠️  Failed to parse patterns, using fallback`);
      return this.getFallbackPatterns();
    }

    return patterns;
  }

  /**
   * Parse AISP-formatted patterns
   */
  private parseAISPPatterns(response: string): ReasoningPattern[] {
    const patterns: ReasoningPattern[] = [];
    const patternRegex = /⟦Λ:Pattern\.(\w+)⟧\{([^}]+)\}/g;
    let match;

    while ((match = patternRegex.exec(response)) !== null) {
      const id = match[1];
      const content = match[2];

      // Extract fields
      const nameMatch = content.match(/name≔"?([^",]+)"?/);
      const descMatch = content.match(/desc≔"?([^",]+)"?/);
      const distinctMatch = content.match(/distinct≔"?([^",]+)"?/);
      const keywordsMatch = content.match(/keywords≔\{([^}]+)\}/);
      const charMatch = content.match(/char≔\{([^}]+)\}/);

      if (nameMatch) {
        patterns.push({
          id,
          name: nameMatch[1].trim(),
          description: descMatch?.[1]?.trim() || '',
          distinctionCriteria: distinctMatch?.[1]?.trim(),
          keywords: keywordsMatch?.[1]
            ?.split(',')
            .map((k) => k.trim().toLowerCase().replace(/"/g, ''))
            .filter((k) => k.length > 0) || [],
          characteristics: charMatch?.[1]
            ?.split(',')
            .map((c) => c.trim().replace(/"/g, ''))
            .filter((c) => c.length > 0) || [],
        });
      }
    }

    return patterns;
  }

  /**
   * Build prompt requiring MUTUALLY EXCLUSIVE patterns
   */
  private buildMutuallyExclusivePrompt(
    sampled: LLMExperience[],
    targetCount: number
  ): string {
    return `Analyze these ${sampled.length} Sudoku solving experiences and identify ${targetCount} MUTUALLY EXCLUSIVE reasoning patterns.

REQUIREMENTS:
1. Each pattern MUST be distinct - no overlap with other patterns
2. Every experience should clearly belong to exactly ONE pattern
3. Patterns must have NON-OVERLAPPING criteria
4. If two patterns could apply to the same experience, MERGE them or make criteria more specific

For each pattern, provide:
- ID (P1, P2, etc.)
- NAME: Concise name
- DESC: When this pattern applies (be SPECIFIC)
- DISTINCTION: What makes this DIFFERENT from all other patterns (required!)
- KEYWORDS: Terms that signal ONLY this pattern
- CHAR: Unique characteristics

IMPORTANT: The DISTINCTION field is critical. Explain exactly why an experience matching this pattern could NOT match any other pattern.

Output in PLAIN TEXT format:

PATTERN: P1
NAME: [name]
DESC: [specific description]
DISTINCTION: [how this differs from ALL other patterns]
KEYWORDS: [comma-separated, UNIQUE to this pattern]
CHAR: [comma-separated]

PATTERN: P2
...

Sample experiences to analyze:
${sampled
  .slice(0, 60)
  .map((exp, i) => `${i + 1}. "${exp.move.reasoning}"`)
  .join('\n\n')}

${sampled.length > 60 ? `... and ${sampled.length - 60} more experiences` : ''}

Now identify ${targetCount} MUTUALLY EXCLUSIVE patterns:`;
  }

  /**
   * Build AISP system prompt for pattern identification
   */
  private buildAISPPatternSystemPrompt(): string {
    const date = new Date().toISOString().split('T')[0];

    return `𝔸1.0.sudoku.clustering@${date}
γ≔sudoku.pattern.identification
ρ≔⟨patterns,taxonomy,mutual_exclusivity⟩

${this.aispBuilder.getAISPGenerationSpec()}

⟦Ω:Task⟧{
  task≜identify(reasoning_patterns)
  constraint≜∀p₁,p₂∈patterns:p₁≠p₂⇒¬overlap(p₁,p₂)
  mutual_exclusivity≜∀exp:∃!p∈patterns:matches(exp,p)
}

⟦Σ:PatternFormat⟧{
  Pattern≜⟦Λ:Pattern.ID⟧{
    name≔string
    desc≔when_applicable
    distinct≔what_differs_from_others
    keywords≔{unique_terms}
    char≔{characteristics}
  }
}

⟦Ε:Output⟧{
  ∀pattern:format∈PatternFormat
  ∀output:syntax∈AISP
  ¬prose; ¬natural_language
}`;
  }

  /**
   * Build AISP prompt requiring MUTUALLY EXCLUSIVE patterns
   */
  private buildAISPMutuallyExclusivePrompt(
    sampled: LLMExperience[],
    targetCount: number
  ): string {
    const date = new Date().toISOString().split('T')[0];

    return `𝔸1.0.sudoku.pattern.identification@${date}
γ≔pattern.extraction

⟦Σ:Input⟧{
  experiences≔⟨
${sampled.slice(0, 60).map((exp, i) => `    e${i + 1}≔"${exp.move.reasoning.replace(/"/g, "'").substring(0, 100)}"`).join('\n')}
  ⟩
  ${sampled.length > 60 ? `  ;; ...and ${sampled.length - 60} more experiences` : ''}
  target_count≔${targetCount}
}

⟦Ω:Task⟧{
  task≜identify(${targetCount},MUTUALLY_EXCLUSIVE,reasoning_patterns)
  ∀p₁,p₂∈output:p₁≠p₂⇒¬overlap(p₁,p₂)
  ∀exp∈experiences:∃!p∈patterns:matches(exp,p)
}

⟦Σ:RequiredFields⟧{
  ID≜P1,P2,...,P${targetCount}
  name≜concise_pattern_name
  desc≜when_pattern_applies
  distinct≜CRITICAL:why_different_from_ALL_other_patterns
  keywords≜{terms_UNIQUE_to_this_pattern}
  char≜{characteristics}
}

⟦Ε:Output⟧{
  format≔⟨
    ⟦Λ:Pattern.P1⟧{name≔...,desc≔...,distinct≔...,keywords≔{...},char≔{...}}
    ⟦Λ:Pattern.P2⟧{...}
    ...
  ⟩
  ∀output:syntax∈AISP
  ¬prose; ¬natural_language
}`;
  }

  /**
   * LLM self-critique step: Ask LLM to review and revise patterns
   * v2 improvement: Quality control before categorization
   * AISP mode: Uses AISP prompts when aispMode === 'aisp-full'
   */
  private async selfCritiquePatterns(
    patterns: ReasoningPattern[],
    sampled: LLMExperience[]
  ): Promise<ReasoningPattern[]> {
    // Build prompts based on AISP mode
    let systemPrompt: string;
    let userPrompt: string;

    if (this.aispMode === 'aisp-full') {
      systemPrompt = this.buildAISPCritiqueSystemPrompt();
      userPrompt = this.buildAISPSelfCritiquePrompt(patterns, sampled);
    } else {
      systemPrompt = 'You are reviewing pattern definitions for quality. Be critical. Identify any overlap or ambiguity.';

      const patternSummary = patterns
        .map((p) => `${p.id}. ${p.name}: ${p.description}`)
        .join('\n');

      userPrompt = `You previously identified these ${patterns.length} reasoning patterns:

${patternSummary}

SELF-CRITIQUE TASK:
1. Are these patterns TRULY mutually exclusive?
2. Could any experience fit multiple patterns?
3. Are any patterns too broad (would capture most experiences)?
4. Are any patterns too similar and should be merged?

If patterns are NOT distinct enough, provide a REVISED list.
If patterns ARE distinct, respond with "PATTERNS_OK" on the first line.

For any revision, use the same format:
PATTERN: P1
NAME: [name]
DESC: [description]
DISTINCTION: [how this differs from others]
KEYWORDS: [comma-separated]
CHAR: [comma-separated]

Sample experiences for reference:
${sampled.slice(0, 20).map((exp, i) => `${i + 1}. "${exp.move.reasoning}"`).join('\n')}

Your response:`;
    }

    const response = await this.llmClient.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        validatePrompt: false, // Prompts contain embedded data; only validate responses
        validateResponse: this.aispMode === 'aisp-full',
        context: 'pattern-self-critique',
      }
    );

    // Check for PATTERNS_OK response (AISP or English)
    if (response.content.trim().startsWith('PATTERNS_OK') ||
        response.content.includes('⊤:patterns_valid')) {
      if (this.debugMode) {
        console.log(`   ✓ LLM approved patterns as distinct`);
      }
      return patterns;
    }

    // Otherwise, try to parse revised patterns - validation handled by ValidatedLLMClient
    let revisedPatterns: ReasoningPattern[];
    if (this.aispMode === 'aisp-full') {
      revisedPatterns = this.parseAISPPatterns(response.content);
      if (revisedPatterns.length === 0) {
        revisedPatterns = this.parsePatterns(response.content);
      }
    } else {
      revisedPatterns = this.parsePatterns(response.content);
    }

    if (revisedPatterns.length > 0) {
      if (this.debugMode) {
        console.log(`   ✓ LLM revised patterns: ${revisedPatterns.length}`);
      }
      return revisedPatterns;
    }

    // If parsing failed, keep original
    return patterns;
  }

  /**
   * Build AISP system prompt for self-critique
   */
  private buildAISPCritiqueSystemPrompt(): string {
    const date = new Date().toISOString().split('T')[0];

    return `𝔸1.0.sudoku.pattern.critique@${date}
γ≔pattern.quality.review

${this.aispBuilder.getAISPGenerationSpec()}

⟦Ω:Task⟧{
  task≜review(patterns)→critique∨approve
  criteria≜mutual_exclusivity∧specificity∧coverage
}

⟦Ε:Output⟧{
  approve≔⊤:patterns_valid
  revise≔⟦Λ:Pattern.P1⟧{...}...
  ∀output:syntax∈AISP
  ¬prose
}`;
  }

  /**
   * Build AISP self-critique prompt
   */
  private buildAISPSelfCritiquePrompt(
    patterns: ReasoningPattern[],
    sampled: LLMExperience[]
  ): string {
    const date = new Date().toISOString().split('T')[0];

    const patternList = patterns
      .map((p) => `    ⟦Λ:Pattern.${p.id}⟧{name≔"${p.name}",desc≔"${p.description}"}`)
      .join('\n');

    return `𝔸1.0.sudoku.pattern.critique@${date}
γ≔self.critique

⟦Σ:Patterns⟧{
${patternList}
}

⟦Σ:SampleExperiences⟧{
${sampled.slice(0, 20).map((exp, i) => `  e${i + 1}≔"${exp.move.reasoning.replace(/"/g, "'").substring(0, 80)}"`).join('\n')}
}

⟦Ω:CritiqueTask⟧{
  q1≜∀p₁,p₂:mutually_exclusive(p₁,p₂)?
  q2≜∃exp:matches(exp,p₁)∧matches(exp,p₂)?
  q3≜∃p:too_broad(p)⇒captures(>50%)?
  q4≜∃p₁,p₂:too_similar(p₁,p₂)⇒merge?
}

⟦Ε:Output⟧{
  if(all_valid)⇒⊤:patterns_valid
  else⇒revised_patterns:⟦Λ:Pattern.P1⟧{name≔...,desc≔...,distinct≔...,keywords≔{...},char≔{...}}...
  ∀output:syntax∈AISP
  ¬prose
}`;
  }

  /**
   * Parse patterns from LLM response
   */
  private parsePatterns(response: string): ReasoningPattern[] {
    const patterns: ReasoningPattern[] = [];
    const lines = response.split('\n');

    let currentPattern: Partial<ReasoningPattern> = {};

    for (const line of lines) {
      // Strip markdown bold formatting
      const trimmed = line.trim().replace(/^\*\*|\*\*$/g, '').trim();

      if (trimmed.startsWith('PATTERN:')) {
        // Save previous pattern
        if (currentPattern.id && currentPattern.name && currentPattern.keywords) {
          patterns.push(currentPattern as ReasoningPattern);
        }

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
        const match = trimmed.match(/NAME:\s*(.+)/);
        if (match) {
          currentPattern.name = match[1].trim();
        }
      } else if (trimmed.startsWith('DESC:') && currentPattern.id) {
        const match = trimmed.match(/DESC:\s*(.+)/);
        if (match) {
          currentPattern.description = match[1].trim();
        }
      } else if (trimmed.startsWith('DISTINCTION:') && currentPattern.id) {
        const match = trimmed.match(/DISTINCTION:\s*(.+)/);
        if (match) {
          currentPattern.distinctionCriteria = match[1].trim();
        }
      } else if (trimmed.startsWith('KEYWORDS:') && currentPattern.id) {
        const match = trimmed.match(/KEYWORDS:\s*(.+)/);
        if (match) {
          currentPattern.keywords = match[1]
            .split(',')
            .map((k) => k.trim().toLowerCase())
            .filter((k) => k.length > 0);
        }
      } else if (trimmed.startsWith('CHAR:') && currentPattern.id) {
        const match = trimmed.match(/CHAR:\s*(.+)/);
        if (match) {
          currentPattern.characteristics = match[1]
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
   * Categorize experiences with demanding prompt (most SPECIFIC pattern)
   * v2 improvement: Force LLM to choose the most specific match
   */
  private async categorizeByPatterns(
    experiences: LLMExperience[],
    patterns: ReasoningPattern[]
  ): Promise<Map<string, LLMExperience[]>> {
    const result = new Map<string, LLMExperience[]>();

    // Initialize clusters
    for (const pattern of patterns) {
      result.set(pattern.name, []);
    }
    result.set('uncategorized', []);

    const BATCH_SIZE = this.config.batchSize;
    const PARALLEL = this.config.parallelBatches;

    // Split into batches
    const batches: LLMExperience[][] = [];
    for (let i = 0; i < experiences.length; i += BATCH_SIZE) {
      batches.push(experiences.slice(i, i + BATCH_SIZE));
    }

    const totalBatches = batches.length;
    console.log(`   Categorizing ${experiences.length} experiences in ${totalBatches} batches...`);

    // Process in parallel chunks
    for (let i = 0; i < batches.length; i += PARALLEL) {
      const chunk = batches.slice(i, i + PARALLEL);
      const chunkStart = i + 1;
      const chunkEnd = Math.min(i + PARALLEL, totalBatches);

      if (chunk.length > 1) {
        console.log(`   Batches ${chunkStart}-${chunkEnd}/${totalBatches}: processing in parallel...`);
      }

      try {
        const promises = chunk.map((batch) =>
          this.categorizeBatchDemanding(batch, patterns)
        );
        const batchResults = await Promise.all(promises);

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
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`   ⚠️  Batch categorization failed: ${errorMsg}`);
        if (this.debugMode) {
          console.warn(`   Full error:`, error);
        }
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
   * Categorize batch with demanding prompt
   * v2 improvement: Ask for MOST SPECIFIC pattern
   * AISP mode: Uses AISP prompts when aispMode === 'aisp-full'
   */
  private async categorizeBatchDemanding(
    batch: LLMExperience[],
    patterns: ReasoningPattern[]
  ): Promise<{ exp: LLMExperience; patternName: string }[]> {
    let systemPrompt: string;
    let userPrompt: string;

    if (this.aispMode === 'aisp-full') {
      systemPrompt = this.buildAISPCategorizationSystemPrompt();
      userPrompt = this.buildAISPCategorizationBatchPrompt(batch, patterns);
    } else {
      // Build pattern list with distinction criteria
      const patternList = patterns
        .map((p, i) => `${i + 1}. ${p.name}: ${p.description}${p.distinctionCriteria ? ` [DISTINCT: ${p.distinctionCriteria}]` : ''}`)
        .join('\n');

      const experienceList = batch
        .map((exp, i) => `${i + 1}. "${exp.move.reasoning}"`)
        .join('\n\n');

      systemPrompt = `You categorize Sudoku reasoning into SPECIFIC patterns.
IMPORTANT: Always prefer more specific patterns over general ones.
Output only numbers, one per line.`;

      userPrompt = `CATEGORIZATION TASK: Assign each reasoning statement to the MOST SPECIFIC pattern.

Available patterns (${patterns.length}):
${patternList}

RULES:
1. Choose the MOST SPECIFIC pattern that applies (not the most general)
2. If multiple patterns could match, pick the one with the most distinctive fit
3. Use "0" ONLY if the reasoning truly doesn't match ANY pattern
4. Consider the DISTINCTION criteria when choosing between similar patterns

Reasoning statements to categorize:
${experienceList}

Output ONLY pattern numbers (1-${patterns.length}), one per line.
For each statement, output the number of the MOST SPECIFIC matching pattern:`;
    }

    const response = await this.llmClient.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        validatePrompt: false, // Prompts contain embedded data; only validate responses
        validateResponse: this.aispMode === 'aisp-full',
        context: 'pattern-categorization',
      }
    );

    // Parse response
    const lines = response.content.trim().split('\n');
    const results: { exp: LLMExperience; patternName: string }[] = [];

    for (let i = 0; i < batch.length; i++) {
      const line = lines[i]?.trim();
      const patternNum = parseInt(line || '0', 10);

      if (patternNum > 0 && patternNum <= patterns.length) {
        results.push({ exp: batch[i], patternName: patterns[patternNum - 1].name });
      } else {
        results.push({ exp: batch[i], patternName: 'uncategorized' });
      }
    }

    return results;
  }

  /**
   * Build AISP system prompt for categorization
   */
  private buildAISPCategorizationSystemPrompt(): string {
    const date = new Date().toISOString().split('T')[0];

    return `𝔸1.0.sudoku.categorization@${date}
γ≔sudoku.experience.categorization

⟦Ω:Task⟧{
  task≜categorize(experiences)→most_specific(pattern)
  rule≜prefer(specific)>prefer(general)
}

⟦Ε:Output⟧{
  format≔⟦Σ:Categories⟧{⟨n₁,n₂,...,nₖ⟩}
  ;; One number per experience, one per line
  ∀output:syntax∈AISP
  ¬prose
}`;
  }

  /**
   * Build AISP batch categorization prompt
   */
  private buildAISPCategorizationBatchPrompt(
    batch: LLMExperience[],
    patterns: ReasoningPattern[]
  ): string {
    const date = new Date().toISOString().split('T')[0];

    return `𝔸1.0.sudoku.categorization.batch@${date}
γ≔batch.categorization

⟦Σ:Patterns⟧{
${patterns.map((p, i) => `  p${i + 1}≔⟦Λ:Pattern.${p.id}⟧{name≔"${p.name}",desc≔"${p.description}"${p.distinctionCriteria ? `,distinct≔"${p.distinctionCriteria}"` : ''}}`).join('\n')}
}

⟦Σ:Experiences⟧{
${batch.map((exp, i) => `  e${i + 1}≔"${exp.move.reasoning.replace(/"/g, "'").substring(0, 100)}"`).join('\n')}
}

⟦Ω:Task⟧{
  ∀eᵢ∈Experiences:assign(eᵢ)→most_specific(pⱼ)
  prefer(specific)>prefer(general)
  no_match⇒0
}

⟦Ε:Output⟧{
  ;; Output pattern numbers (1-${patterns.length}), one per line
  format≔⟨n₁⟩\\n⟨n₂⟩\\n...⟨nₖ⟩
  ∀nᵢ∈{0..${patterns.length}}
  ¬prose
}`;
  }

  /**
   * Find dominant cluster (>threshold of experiences)
   */
  private findDominantCluster(
    clusters: Map<string, LLMExperience[]>,
    totalExperiences: number
  ): { name: string; experiences: LLMExperience[]; percentage: number } | null {
    for (const [name, exps] of clusters) {
      if (name === 'uncategorized') continue;

      const percentage = (exps.length / totalExperiences) * 100;
      if (percentage >= this.config.dominanceThreshold * 100) {
        return { name, experiences: exps, percentage };
      }
    }
    return null;
  }

  /**
   * Refine dominant cluster by asking LLM to split it
   * v2 improvement: LLM-driven refinement, no heuristics
   * AISP mode: Uses AISP prompts when aispMode === 'aisp-full'
   */
  private async refineDominantCluster(
    clusters: Map<string, LLMExperience[]>,
    dominant: { name: string; experiences: LLMExperience[]; percentage: number },
    _existingPatterns: ReasoningPattern[]
  ): Promise<Map<string, LLMExperience[]>> {
    console.log(`   🔄 Asking LLM to split "${dominant.name}" into sub-patterns...`);

    // Sample from dominant cluster for analysis
    const sampleSize = Math.min(100, dominant.experiences.length);
    const sampled = this.sampleBalanced(dominant.experiences, sampleSize);

    let systemPrompt: string;
    let userPrompt: string;

    if (this.aispMode === 'aisp-full') {
      systemPrompt = this.buildAISPRefinementSystemPrompt();
      userPrompt = this.buildAISPRefinementPrompt(dominant, sampled);
    } else {
      systemPrompt = 'You are splitting a broad category into specific sub-categories. Be precise and ensure sub-patterns are mutually exclusive.';
      userPrompt = `The pattern "${dominant.name}" captured ${dominant.percentage.toFixed(0)}% of all experiences. This is too broad.

Analyze these ${sampled.length} experiences from this pattern and identify 3-5 DISTINCT SUB-PATTERNS within them:

${sampled.slice(0, 50).map((exp, i) => `${i + 1}. "${exp.move.reasoning}"`).join('\n\n')}

${sampled.length > 50 ? `... and ${sampled.length - 50} more similar experiences` : ''}

Identify sub-patterns that exist WITHIN "${dominant.name}". These should be mutually exclusive subdivisions.

Output in PLAIN TEXT:
PATTERN: P1
NAME: [specific sub-pattern name]
DESC: [what makes this sub-pattern distinct]
KEYWORDS: [unique keywords]
CHAR: [characteristics]

Provide 3-5 sub-patterns:`;
    }

    const response = await this.llmClient.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        validatePrompt: false, // Prompts contain embedded data; only validate responses
        validateResponse: this.aispMode === 'aisp-full',
        context: 'dominant-cluster-refinement',
      }
    );

    // Parse patterns based on AISP mode - validation handled by ValidatedLLMClient
    let subPatterns: ReasoningPattern[];
    if (this.aispMode === 'aisp-full') {
      subPatterns = this.parseAISPPatterns(response.content);
      if (subPatterns.length === 0) {
        subPatterns = this.parsePatterns(response.content);
      }
    } else {
      subPatterns = this.parsePatterns(response.content);
    }

    if (subPatterns.length < 2) {
      console.log(`   ⚠️  LLM couldn't split dominant cluster (found ${subPatterns.length} sub-patterns)`);
      return clusters;
    }

    console.log(`   ✓ LLM identified ${subPatterns.length} sub-patterns`);

    // Re-categorize dominant cluster experiences into sub-patterns
    const dominantExperiences = dominant.experiences;
    const subClusters = await this.categorizeByPatterns(dominantExperiences, subPatterns);

    // Merge results: remove dominant cluster, add sub-clusters
    const refined = new Map<string, LLMExperience[]>();

    for (const [name, exps] of clusters) {
      if (name !== dominant.name) {
        refined.set(name, exps);
      }
    }

    // Add sub-clusters with prefixed names
    for (const [name, exps] of subClusters) {
      if (exps.length > 0) {
        const prefixedName = name === 'uncategorized' ? dominant.name : `${dominant.name}:${name}`;
        refined.set(prefixedName, exps);
      }
    }

    return refined;
  }

  /**
   * Build AISP system prompt for refinement
   */
  private buildAISPRefinementSystemPrompt(): string {
    const date = new Date().toISOString().split('T')[0];

    return `𝔸1.0.sudoku.pattern.refinement@${date}
γ≔cluster.subdivision

${this.aispBuilder.getAISPGenerationSpec()}

⟦Ω:Task⟧{
  task≜split(dominant_cluster)→sub_patterns
  constraint≜∀p₁,p₂:mutually_exclusive(p₁,p₂)
}

⟦Ε:Output⟧{
  format≔⟦Λ:Pattern.P1⟧{...}⟦Λ:Pattern.P2⟧{...}...
  ∀output:syntax∈AISP
  ¬prose
}`;
  }

  /**
   * Build AISP refinement prompt for dominant cluster
   */
  private buildAISPRefinementPrompt(
    dominant: { name: string; percentage: number },
    sampled: LLMExperience[]
  ): string {
    const date = new Date().toISOString().split('T')[0];

    return `𝔸1.0.sudoku.pattern.refinement@${date}
γ≔dominant.cluster.split

⟦Σ:DominantCluster⟧{
  name≔"${dominant.name}"
  percentage≔${dominant.percentage.toFixed(0)}%
  problem≔too_broad
}

⟦Σ:Experiences⟧{
${sampled.slice(0, 50).map((exp, i) => `  e${i + 1}≔"${exp.move.reasoning.replace(/"/g, "'").substring(0, 100)}"`).join('\n')}
  ${sampled.length > 50 ? `  ;; ...and ${sampled.length - 50} more similar experiences` : ''}
}

⟦Ω:Task⟧{
  task≜identify(3..5,sub_patterns)∈"${dominant.name}"
  constraint≜∀p:distinct(p)∧mutually_exclusive
}

⟦Ε:Output⟧{
  format≔⟨
    ⟦Λ:Pattern.P1⟧{name≔...,desc≔...,keywords≔{...},char≔{...}}
    ⟦Λ:Pattern.P2⟧{...}
    ...
  ⟩
  ∀output:syntax∈AISP
  ¬prose
}`;
  }

  /**
   * Fallback patterns when LLM fails
   */
  private getFallbackPatterns(): ReasoningPattern[] {
    return [
      {
        id: 'P1',
        name: 'Naked Single',
        description: 'Cell has only one candidate after elimination',
        distinctionCriteria: 'Focus is on the CELL having one option, not on a value being unique in a unit',
        keywords: ['naked single', 'sole candidate', 'only value', 'last remaining'],
        characteristics: ['cell-focused', 'direct-elimination'],
      },
      {
        id: 'P2',
        name: 'Hidden Single in Row',
        description: 'Value can only go in one cell within a row',
        distinctionCriteria: 'Focus is on ROW constraint, value unique to one cell in row',
        keywords: ['row', 'horizontal', 'only place in row'],
        characteristics: ['row-focused', 'value-scanning'],
      },
      {
        id: 'P3',
        name: 'Hidden Single in Column',
        description: 'Value can only go in one cell within a column',
        distinctionCriteria: 'Focus is on COLUMN constraint, value unique to one cell in column',
        keywords: ['column', 'vertical', 'only place in column'],
        characteristics: ['column-focused', 'value-scanning'],
      },
      {
        id: 'P4',
        name: 'Hidden Single in Box',
        description: 'Value can only go in one cell within a 3x3 box',
        distinctionCriteria: 'Focus is on BOX/REGION constraint, value unique to one cell in box',
        keywords: ['box', 'square', 'region', '3x3', 'only place in box'],
        characteristics: ['box-focused', 'value-scanning'],
      },
      {
        id: 'P5',
        name: 'Multi-Unit Intersection',
        description: 'Combining constraints from row, column, and box',
        distinctionCriteria: 'Uses MULTIPLE unit constraints together (row+column+box)',
        keywords: ['intersection', 'overlap', 'all three', 'row and column'],
        characteristics: ['multi-constraint', 'cross-unit'],
      },
      {
        id: 'P6',
        name: 'Constraint Elimination',
        description: 'Systematic elimination of impossible values',
        distinctionCriteria: 'Focuses on ELIMINATING candidates, not placing values',
        keywords: ['eliminate', 'cannot be', 'ruled out', 'impossible'],
        characteristics: ['elimination-focused', 'negative-reasoning'],
      },
      {
        id: 'P7',
        name: 'Forced Placement',
        description: 'Value must be placed due to combined constraints',
        distinctionCriteria: 'Emphasizes the FORCING nature of constraints',
        keywords: ['forced', 'must be', 'has to be', 'required'],
        characteristics: ['constraint-driven', 'necessity'],
      },
      {
        id: 'P8',
        name: 'Process of Deduction',
        description: 'Step-by-step logical deduction to find value',
        distinctionCriteria: 'Emphasizes the PROCESS and steps of reasoning',
        keywords: ['checking', 'trying', 'process', 'step by step'],
        characteristics: ['methodical', 'multi-step'],
      },
    ];
  }
}
