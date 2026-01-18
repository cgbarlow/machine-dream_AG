/**
 * Dreaming Consolidator - LLM-Driven Pattern Synthesis
 * Specification: docs/specs/11-llm-sudoku-player.md
 * Specification: docs/specs/05-dreaming-pipeline-spec.md Section 8
 *
 * ⚠️ IMPORTANT: This class handles consolidation for LLM EXPERIENCES ONLY.
 * For deterministic solver consolidation, use:
 *   - src/consolidation/DreamingController.ts (5-phase pipeline)
 *   - `machine-dream dream run` (CLI command)
 *
 * KEY PRINCIPLE: The LLM is the "brain" that performs consolidation.
 * Like human sleep cycles, the LLM analyzes its experiences and SYNTHESIZES
 * what it learned - NOT just copy raw data.
 *
 * CRITICAL: Full reasoning must be used - NEVER truncate reasoning chains.
 */

import type {
  LLMExperience,
  FewShotExample,
  ConsolidationReport,
  DualConsolidationResult,
  LLMErrorPattern,
  LLMWrongPath,
  LLMConfig,
  SynthesizedPattern,
  AbstractionHierarchy,
  HierarchyLevel,
  ConsolidationOptions,
  SynthesizedAntiPattern,
  ReasoningCorrection,
} from './types.js';
import {
  DEFAULT_CONSOLIDATION_COUNTS,
  DOUBLED_CONSOLIDATION_COUNTS,
  DOUBLE_STRATEGY_SUFFIX,
} from './types.js';
import { ValidatedLLMClient } from './ValidatedLLMClient.js';
import { createLLMClient } from './LLMClientFactory.js';
import { ExperienceStore } from './ExperienceStore.js';
import { LearningUnitManager } from './LearningUnitManager.js';
import { AISPBuilder, type AISPMode } from './AISPBuilder.js';
import { AISPStrategyEncoder } from './AISPStrategyEncoder.js';
import { AlgorithmRegistry, type ClusteringAlgorithm } from './clustering/index.js';

/**
 * Dreaming Consolidator
 *
 * Spec 11 Section: Dreaming Consolidation (LLM-Driven)
 * Spec 05 Section 8: LLM Experience Consolidation
 *
 * The LLM "brain" analyzes experiences and synthesizes:
 * - Reusable strategies from successful moves
 * - A 4-level abstraction hierarchy
 * - Few-shot examples that TEACH strategies (not raw data)
 */
export class DreamingConsolidator {
  private llmClient: ValidatedLLMClient;
  private llmConfig: LLMConfig;
  private generateAnonymousPatterns = false;
  private consolidationOptions: Required<Omit<ConsolidationOptions, 'doubleStrategies' | 'preserveExperiences'>> = { ...DEFAULT_CONSOLIDATION_COUNTS };
  private preserveExperiences = false;  // For multi-algorithm workflows (Spec 05 Section 8.6.1)
  private aispMode: AISPMode = 'off';
  private aispBuilder: AISPBuilder;
  private aispEncoder: AISPStrategyEncoder;
  private clusteringAlgorithm: ClusteringAlgorithm;

  constructor(
    private experienceStore: ExperienceStore,
    config: LLMConfig,
    clusteringAlgorithm?: ClusteringAlgorithm
  ) {
    this.llmConfig = config;
    this.llmClient = createLLMClient(config);
    this.aispBuilder = new AISPBuilder();
    this.aispEncoder = new AISPStrategyEncoder();

    // Use provided algorithm or get default from registry
    this.clusteringAlgorithm = clusteringAlgorithm || AlgorithmRegistry.getInstance().getDefaultAlgorithm();
    console.log(`🔧 Using clustering algorithm: ${this.clusteringAlgorithm.getIdentifier()}`);
  }

  /**
   * Enable AISP mode for dreaming consolidation
   *
   * Spec 16: When enabled, dreaming uses AISP for:
   * - Prompts sent to LLM for synthesis
   * - Strategy storage format (aispEncoded field)
   * - All reasoning and analysis
   * - Clustering algorithm prompts (ADR-013)
   *
   * @param mode - 'off' | 'aisp' | 'aisp-full'
   */
  setAISPMode(mode: AISPMode): void {
    this.aispMode = mode;
    this.llmClient.setAISPMode(mode);

    // Propagate to clustering algorithm (ADR-013)
    if (this.clusteringAlgorithm.setAISPMode) {
      this.clusteringAlgorithm.setAISPMode(mode);
    }

    console.log(`🔤 AISP mode set to: ${mode}`);
  }

  /**
   * Set consolidation options for strategy counts
   *
   * Spec 05 Section 8.4: Strategy Count Configuration
   */
  setConsolidationOptions(options: ConsolidationOptions): void {
    if (options.doubleStrategies) {
      // Use doubled counts
      this.consolidationOptions = { ...DOUBLED_CONSOLIDATION_COUNTS };
    } else {
      // Use custom counts or defaults
      this.consolidationOptions = {
        fewShotMin: options.fewShotMin ?? DEFAULT_CONSOLIDATION_COUNTS.fewShotMin,
        fewShotMax: options.fewShotMax ?? DEFAULT_CONSOLIDATION_COUNTS.fewShotMax,
        mergeMin: options.mergeMin ?? DEFAULT_CONSOLIDATION_COUNTS.mergeMin,
        mergeMax: options.mergeMax ?? DEFAULT_CONSOLIDATION_COUNTS.mergeMax,
      };
    }

    // Handle preserveExperiences option (Spec 05 Section 8.6.1)
    if (options.preserveExperiences !== undefined) {
      this.preserveExperiences = options.preserveExperiences;
    }

    console.log(`📊 Consolidation options: few-shots ${this.consolidationOptions.fewShotMin}-${this.consolidationOptions.fewShotMax}, merge ${this.consolidationOptions.mergeMin}-${this.consolidationOptions.mergeMax}`);
    if (this.preserveExperiences) {
      console.log(`📦 Experience preservation mode enabled (originals kept after absorbing)`);
    }
  }

  /**
   * Enable/disable anonymous pattern generation mode
   *
   * When enabled, synthesized patterns will NOT have strategy names.
   * Instead, they use situation-action-template format for improved accuracy.
   */
  setAnonymousPatternMode(enabled: boolean): void {
    this.generateAnonymousPatterns = enabled;
  }

  /**
   * Calculate cluster target for the clustering algorithm
   *
   * Scales cluster target with experience count to handle 10x runs:
   * - Base target from fewShotMax
   * - Scale with ~1 cluster per 25 experiences for large datasets
   * - Apply 1.5x multiplier in doubled mode for diversity headroom
   *
   * @param experienceCount - Number of experiences to cluster
   */
  private getClusterTarget(experienceCount: number): number {
    const baseTarget = this.consolidationOptions.fewShotMax;

    // Scale with experience count: ~1 cluster per 25 experiences for large datasets
    const experienceBasedTarget = Math.ceil(experienceCount / 25);

    // Use whichever is larger to ensure good coverage at scale
    const scaledTarget = Math.max(baseTarget, experienceBasedTarget);

    // Apply 1.5x multiplier for diversity headroom in doubled mode
    const isDoubledMode = this.consolidationOptions.fewShotMax >= 10;
    if (isDoubledMode) {
      return Math.ceil(scaledTarget * 1.5);
    }
    return scaledTarget;
  }

  /**
   * Run LLM-driven consolidation on unconsolidated experiences
   *
   * 5-Phase Pipeline:
   * 1. CAPTURE (already done during play)
   * 2. TRIAGE - Filter by importance
   * 3. COMPRESSION - Cluster and LLM synthesizes patterns
   * 4. ABSTRACTION - LLM builds hierarchy
   * 5. INTEGRATION - Generate few-shots and store
   */
  async consolidate(profileName?: string): Promise<ConsolidationReport> {
    // Phase 1: CAPTURE (already done during play)
    let experiences = await this.experienceStore.getUnconsolidated(profileName);

    if (experiences.length === 0) {
      return this.createEmptyReport();
    }

    console.log(`🌙 Starting LLM Dream Cycle...`);
    console.log(`📊 Found ${experiences.length} unconsolidated experiences`);

    // Phase 2: TRIAGE - Filter by importance
    experiences = experiences
      .sort((a, b) => (b.importance ?? 0.5) - (a.importance ?? 0.5))
      .filter((e) => (e.importance ?? 0.5) >= 0.6);

    if (experiences.length < 5) {
      console.log(`⚠️  Only ${experiences.length} high-importance experiences - need at least 5`);
      return this.createEmptyReport();
    }

    // Group by outcome
    const successful = experiences.filter((e) => e.validation.isCorrect);
    const invalid = experiences.filter((e) => !e.validation.isValid);
    const wrong = experiences.filter(
      (e) => e.validation.isValid && !e.validation.isCorrect
    );

    console.log(`   Successful: ${successful.length}, Invalid: ${invalid.length}, Wrong: ${wrong.length}`);

    // Phase 3: COMPRESSION - Cluster similar experiences
    const clusterTarget = this.getClusterTarget(successful.length);
    console.log(`🔍 Clustering ${successful.length} experiences with ${this.clusteringAlgorithm.getIdentifier()}...`);
    console.log(`   Cluster target: ${clusterTarget} (strategy selection: ${this.consolidationOptions.fewShotMin}-${this.consolidationOptions.fewShotMax})`);
    const clusterResult = await this.clusteringAlgorithm.cluster(
      successful,
      clusterTarget,
      this.llmConfig
    );
    const clusters = clusterResult.clusters;
    console.log(`✅ Created ${clusters.size} clusters in ${clusterResult.metadata.processingTimeMs}ms`);

    // Phase 3b: LLM SYNTHESIZES pattern for each cluster
    const synthesizedPatterns: SynthesizedPattern[] = [];
    for (const [clusterName, cluster] of clusters.entries()) {
      if (cluster.length >= 2) {
        console.log(`🧠 LLM synthesizing pattern from cluster "${clusterName}" (${cluster.length} experiences)...`);
        try {
          const pattern = await this.synthesizePattern(cluster, clusterName);
          if (pattern) {
            synthesizedPatterns.push(pattern);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to synthesize pattern for cluster "${clusterName}":`, error);
        }
      }
    }

    console.log(`✅ Created ${synthesizedPatterns.length} synthesized strategies`);

    // Phase 3.5: FAILURE LEARNING (Spec 19)
    console.log(`\n📛 Phase 3.5: Failure Learning`);

    let antiPatterns: SynthesizedAntiPattern[] = [];
    let reasoningCorrections: ReasoningCorrection[] = [];

    // 3.5a: Cluster invalid moves and synthesize anti-patterns
    if (invalid.length >= 3) {
      console.log(`   Clustering ${invalid.length} invalid moves by error type...`);
      antiPatterns = await this.synthesizeAntiPatternsFromClusters(invalid);
      console.log(`   ↳ Generated ${antiPatterns.length} anti-patterns`);
    } else {
      console.log(`   ⚠️  Only ${invalid.length} invalid moves (need >= 3 for anti-patterns)`);
    }

    // 3.5b: Analyze valid-but-wrong moves for reasoning corrections
    if (wrong.length >= 2) {
      console.log(`   Analyzing ${wrong.length} valid-but-wrong moves...`);
      reasoningCorrections = await this.analyzeWrongReasoning(wrong);
      console.log(`   ↳ Generated ${reasoningCorrections.length} reasoning corrections`);
    } else {
      console.log(`   ⚠️  Only ${wrong.length} valid-but-wrong moves (need >= 2 for corrections)`);
    }

    // Phase 4: ABSTRACTION - Build hierarchy
    let hierarchy: AbstractionHierarchy | undefined;
    if (synthesizedPatterns.length >= 2) {
      console.log(`📈 Building abstraction hierarchy...`);
      try {
        hierarchy = await this.buildAbstractionHierarchy(synthesizedPatterns, profileName);
        console.log(`✅ Built ${hierarchy.levels.length}-level abstraction hierarchy`);
      } catch (error) {
        console.warn(`⚠️  Failed to build hierarchy:`, error);
      }
    }

    // Phase 5: INTEGRATION - Generate few-shots from synthesized patterns
    console.log(`💡 Generating few-shot examples from synthesized patterns...`);
    const fewShots = await this.generateFewShotsFromPatterns(synthesizedPatterns);
    console.log(`💾 Saved ${fewShots.length} few-shot examples`);

    // Store results
    await this.experienceStore.saveFewShots(fewShots, profileName);
    if (hierarchy) {
      await this.experienceStore.saveAbstractionHierarchy(hierarchy, profileName);
    }

    // Mark experiences as consolidated
    const experienceIds = experiences.map((e) => e.id);
    await this.experienceStore.markConsolidated(experienceIds);

    // Calculate compression ratio
    const compressionRatio = synthesizedPatterns.length > 0
      ? experiences.length / synthesizedPatterns.length
      : 0;

    console.log(`\n📊 Compression ratio: ${experiences.length}:${synthesizedPatterns.length} (${compressionRatio.toFixed(1)}:1)`);

    // Synthesize anti-patterns from invalid moves (LLM-driven)
    let antiPatternInsights = '';
    if (invalid.length >= 3) {
      antiPatternInsights = await this.synthesizeAntiPatterns(invalid);
    }

    // Generate insights summary
    let insights = await this.synthesizeInsightsSummary(synthesizedPatterns, hierarchy);
    if (antiPatternInsights) {
      insights += '\n\n### Anti-Patterns (What NOT to Do)\n' + antiPatternInsights;
    }

    // Analyze errors for the report (keep existing error analysis)
    const commonErrors = this.groupErrors(invalid);
    const wrongPathPatterns = this.analyzeWrongPaths(wrong);

    return {
      patterns: {
        successStrategies: synthesizedPatterns,
        commonErrors,
        wrongPathPatterns,
      },
      hierarchy,
      // Failure Learning (Spec 19)
      antiPatterns,
      reasoningCorrections,
      insights,
      fewShotsUpdated: fewShots.length,
      experiencesConsolidated: experiences.length,
      compressionRatio,
      abstractionLevels: hierarchy?.levels.length,
      algorithmUsed: {
        name: this.clusteringAlgorithm.getName(),
        version: this.clusteringAlgorithm.getVersion(),
        identifier: this.clusteringAlgorithm.getIdentifier(),
      },
    };
  }

  /**
   * LLM synthesizes a reusable pattern from a cluster of experiences
   *
   * This is the "dreaming brain" analyzing what worked.
   *
   * CRITICAL: Uses FULL reasoning chain, never truncated!
   *
   * Spec 16: When AISP mode is 'aisp-full':
   * - Uses AISP system prompt
   * - Uses AISP user prompt format
   * - Encodes synthesized pattern in AISP format
   */
  private async synthesizePattern(
    cluster: LLMExperience[],
    clusterName: string
  ): Promise<SynthesizedPattern | null> {
    // Build prompt with FULL reasoning for each experience
    const experienceDescriptions = cluster.slice(0, this.consolidationOptions.fewShotMax).map((exp, i) => `
${i + 1}. Grid context: ${this.describeGridContext(exp.gridState, exp.move)}
   Your move: (${exp.move.row},${exp.move.col}) = ${exp.move.value}

   YOUR FULL REASONING:
   ${exp.move.reasoning}
`).join('\n');

    // Spec 16: Use AISP prompts when aisp-full mode enabled
    let systemPrompt: string;
    let userPrompt: string;

    if (this.aispMode === 'aisp-full') {
      systemPrompt = this.aispBuilder.buildAISPDreamingSystemPrompt();
      userPrompt = this.buildAISPPatternPrompt(cluster.length, experienceDescriptions, clusterName);
    } else {
      // Use different prompt based on anonymous pattern mode
      userPrompt = this.generateAnonymousPatterns
        ? this.buildAnonymousPatternPrompt(cluster.length, experienceDescriptions)
        : this.buildNamedStrategyPrompt(cluster.length, experienceDescriptions);

      systemPrompt = this.generateAnonymousPatterns
        ? 'You are extracting reusable patterns from Sudoku moves. Focus on situation and action, NOT strategy names.'
        : 'You are reflecting on your Sudoku solving experiences to extract reusable strategies. Be specific and practical.';
    }

    try {
      const result = await this.llmClient.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          validatePrompt: this.aispMode !== 'off', // NL stripped before validation
          validateResponse: this.aispMode === 'aisp-full',
          context: 'pattern-synthesis',
        }
      );

      let pattern: SynthesizedPattern | null;

      if (this.aispMode === 'aisp-full') {
        pattern = this.parseAISPPatternResponse(result.content, clusterName, cluster.length);
      } else if (this.generateAnonymousPatterns) {
        pattern = this.parseAnonymousPatternResponse(result.content, clusterName, cluster.length);
      } else {
        pattern = this.parsePatternResponse(result.content, clusterName, cluster.length);
      }

      // Spec 16: Encode pattern in AISP format when aisp-full mode enabled
      if (pattern && this.aispMode === 'aisp-full') {
        pattern.aispEncoded = this.aispEncoder.encodePattern(pattern);
      }

      return pattern;
    } catch (error) {
      console.warn(`Failed to synthesize pattern:`, error);
      return null;
    }
  }

  /**
   * Build AISP-formatted prompt for pattern synthesis
   *
   * Spec 16: Used when --aisp-full mode is enabled
   */
  private buildAISPPatternPrompt(count: number, experienceDescriptions: string, clusterName: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `𝔸1.0.pattern.synthesis@${date}
γ≔sudoku.pattern.extraction
ρ≔⟨experiences,synthesis⟩

⟦Γ:Context⟧{
  cluster≜"${clusterName}"
  experience_count≜${count}
  task≜synthesize(experiences)→⟦Λ:Strategy⟧
}

⟦Σ:Experiences⟧{
${experienceDescriptions}
}

⟦Ε:Output⟧{
  ;; Synthesize strategy in AISP format
  format≔⟦Λ:Strategy.Name⟧{
    when≜condition
    action≜⟨step1,step2,...⟩
    proof≜justification
    conf≔0.0-1.0
    level≔0-3
  }

  ∀output:syntax∈AISP
  ¬prose
}`;
  }

  /**
   * Parse AISP-formatted pattern response
   *
   * Spec 16: Parses strategy blocks in AISP format
   *
   * IMPORTANT: Must handle AISP special characters like {1..9} in field values.
   * Uses balanced brace matching for fields that may contain nested braces.
   */
  private parseAISPPatternResponse(
    response: string,
    clusterName: string,
    sourceCount: number
  ): SynthesizedPattern | null {
    try {
      // Extract strategy name from ⟦Λ:Strategy.Name⟧ block
      const nameMatch = response.match(/⟦Λ:Strategy\.([^⟧]+)⟧/);
      const strategyName = nameMatch ? nameMatch[1].replace(/_/g, ' ') : clusterName;

      // Extract when condition - use AISP-aware parsing
      const whenToUse = this.extractAISPField(response, 'when') || 'Not specified';

      // Extract action/steps - handle nested ⟨...⟩
      const actionMatch = response.match(/action≜⟨([^⟩]+)⟩/);
      const reasoningSteps = actionMatch
        ? actionMatch[1].split(/;\s*step\d+≔/).map(s => s.trim().replace(/^"?|"?$/g, '').replace(/^step\d+≔"?/, ''))
        : ['Apply constraint reasoning'];

      // Extract proof/insight - use AISP-aware parsing for fields with special chars
      const successInsight = this.extractAISPField(response, 'proof') || '';

      // Extract confidence
      const confMatch = response.match(/conf≔([\d.]+)/);
      const confidence = confMatch ? parseFloat(confMatch[1]) || 0.7 : 0.7;

      // Extract level
      const levelMatch = response.match(/level≔(\d)/);
      const parsedLevel = levelMatch ? parseInt(levelMatch[1], 10) : 1;
      const level = (parsedLevel >= 0 && parsedLevel <= 3 ? parsedLevel : 1) as 0 | 1 | 2 | 3;
      const levelNames = ['Instance', 'Technique', 'Category', 'Principle'];

      return {
        strategyName,
        clusterName,
        whenToUse,
        reasoningSteps,
        example: '',
        successInsight,
        abstractionLevel: {
          level,
          name: levelNames[level],
          description: `AISP-encoded level ${level}`,
        },
        sourceExperienceCount: sourceCount,
        confidence,
        // aispEncoded will be set by caller
      };
    } catch (error) {
      console.warn(`Failed to parse AISP pattern response:`, error);
      return null;
    }
  }

  /**
   * Extract AISP field value with proper handling of special characters
   *
   * Handles:
   * - Quoted strings: field≜"value with {braces} and ; semicolons"
   * - AISP notation: field≜∀r,c:candidates≔{1..9}
   * - Nested structures: field≜⟨step1;step2⟩
   */
  private extractAISPField(response: string, fieldName: string): string | null {
    // Try quoted string first: field≜"..."
    const quotedMatch = response.match(new RegExp(`${fieldName}≜"([^"]*(?:\\\\.[^"]*)*)"`));
    if (quotedMatch) {
      return quotedMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim();
    }

    // Try AISP notation until next field marker (;fieldname≜ or ;fieldname≔)
    // This handles: when≜∀r,c:candidates≔{1..9};proof≜...
    const aispMatch = response.match(new RegExp(`${fieldName}[≜≔]([^;]*(?:\\{[^}]*\\}[^;]*)*?)(?=;[a-z]+[≜≔]|\\}$|$)`));
    if (aispMatch) {
      return aispMatch[1].trim();
    }

    // Fallback: simple extraction until semicolon or newline (may truncate)
    const simpleMatch = response.match(new RegExp(`${fieldName}[≜≔]([^;\\n]+)`));
    return simpleMatch ? simpleMatch[1].trim() : null;
  }

  /**
   * Extract list from AISP field (handles ⟨item₁;item₂⟩ format)
   * Spec 16 Section 4.12: AISP Prompt Coverage
   */
  private extractAISPListField(content: string, fieldName: string): string[] {
    const regex = new RegExp(`${fieldName}≔⟨([^⟩]+)⟩`);
    const match = content.match(regex);
    if (!match) return [];

    return match[1]
      .split(';')
      .map(s => s.trim().replace(/^["']|["']$/g, ''))
      .filter(s => s.length > 0);
  }

  /**
   * Sanitize string for AISP embedding (escape quotes, remove control chars)
   * Spec 16 Section 4.12: AISP Prompt Coverage
   */
  private sanitizeForAISP(text: string): string {
    return text
      .replace(/"/g, "'")
      .replace(/[\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Build prompt for named strategy synthesis (default mode)
   */
  private buildNamedStrategyPrompt(count: number, experienceDescriptions: string): string {
    return `You are reviewing ${count} successful Sudoku moves you made.
Analyze them and extract a REUSABLE STRATEGY that you can apply in future puzzles.

Your successful moves:
${experienceDescriptions}

Now synthesize what you learned. Respond in EXACTLY this format:

STRATEGY_NAME: [A short, memorable name for this approach, e.g., "Last Digit in Row"]
WHEN_TO_USE: [The conditions that signal when this strategy applies]
REASONING_STEPS:
1. [First step of the reasoning process]
2. [Second step]
3. [Continue as needed]
ABSTRACTION_LEVEL: [0-3, where:
  0 = Specific instance (references exact cell positions or configurations)
  1 = Named technique (reusable pattern with clear trigger)
  2 = Strategy category (groups related techniques)
  3 = General principle (universal problem-solving rule)]
EXAMPLE: [One clear example showing the strategy in action from the experiences above]
SUCCESS_INSIGHT: [Why this approach reliably works - the underlying principle]
CONFIDENCE: [A number 0.0-1.0 indicating how reliable this strategy is]`;
  }

  /**
   * Build prompt for anonymous pattern synthesis (--anonymous-patterns mode)
   *
   * Spec 11: Anonymous Pattern Mode
   * Generates patterns without strategy names for improved accuracy.
   */
  private buildAnonymousPatternPrompt(count: number, experienceDescriptions: string): string {
    return `You are reviewing ${count} successful Sudoku moves.
Extract a REUSABLE PATTERN (without naming it as a strategy).

Your successful moves:
${experienceDescriptions}

Respond in EXACTLY this format:

WHEN_TO_USE: [The situation/condition when this pattern applies]
ACTION: [What to do when you see this situation]
REASONING_STEPS:
1. [First step]
2. [Second step]
ABSTRACTION_LEVEL: [0-3, where:
  0 = Specific instance (references exact cell positions)
  1 = Named technique (reusable pattern)
  2 = Strategy category (groups techniques)
  3 = General principle (universal rule)]
TEMPLATE: [Reasoning template, e.g., "Cell (R,C). Row missing {X}. Intersection={V}."]
CONFIDENCE: [0.0-1.0]

IMPORTANT: Do NOT give this pattern a name. Focus on situation and action.`;
  }

  /**
   * Parse anonymous pattern response from LLM
   */
  private parseAnonymousPatternResponse(
    response: string,
    clusterName: string,
    sourceCount: number
  ): SynthesizedPattern | null {
    try {
      const whenToUse = this.extractField(response, 'WHEN_TO_USE') || 'Not specified';
      const action = this.extractField(response, 'ACTION') || 'Apply constraint reasoning';
      const reasoningSteps = this.extractReasoningSteps(response);
      const template = this.extractField(response, 'TEMPLATE') || '';
      const confidenceStr = this.extractField(response, 'CONFIDENCE');
      const confidence = confidenceStr ? parseFloat(confidenceStr) || 0.7 : 0.7;

      // Extract LLM-determined abstraction level (Spec 11 - 2026-01-11)
      const abstractionLevelStr = this.extractField(response, 'ABSTRACTION_LEVEL');
      const parsedLevel = abstractionLevelStr ? parseInt(abstractionLevelStr, 10) : 1;
      const level = (parsedLevel >= 0 && parsedLevel <= 3 ? parsedLevel : 1) as 0 | 1 | 2 | 3;
      const levelNames = ['Instance', 'Technique', 'Category', 'Principle'];

      return {
        strategyName: undefined, // No name for anonymous patterns
        isAnonymous: true,
        clusterName,
        whenToUse,
        reasoningSteps: [action, ...reasoningSteps],
        reasoningTemplate: template,
        example: '',
        successInsight: action,
        abstractionLevel: {
          level,
          name: levelNames[level],
          description: `LLM-determined level ${level}`,
        },
        sourceExperienceCount: sourceCount,
        confidence,
      };
    } catch (error) {
      console.warn(`Failed to parse anonymous pattern response:`, error);
      return null;
    }
  }

  /**
   * Parse LLM response into a SynthesizedPattern
   */
  private parsePatternResponse(
    response: string,
    clusterName: string,
    sourceCount: number
  ): SynthesizedPattern | null {
    try {
      // Extract fields using regex
      const strategyName = this.extractField(response, 'STRATEGY_NAME') || clusterName;
      const whenToUse = this.extractField(response, 'WHEN_TO_USE') || 'Not specified';
      const reasoningSteps = this.extractReasoningSteps(response);
      const example = this.extractField(response, 'EXAMPLE') || '';
      const successInsight = this.extractField(response, 'SUCCESS_INSIGHT') || '';
      const confidenceStr = this.extractField(response, 'CONFIDENCE');
      const confidence = confidenceStr ? parseFloat(confidenceStr) || 0.7 : 0.7;

      // Extract LLM-determined abstraction level (Spec 11 - 2026-01-11)
      const abstractionLevelStr = this.extractField(response, 'ABSTRACTION_LEVEL');
      const parsedLevel = abstractionLevelStr ? parseInt(abstractionLevelStr, 10) : 1;
      const level = (parsedLevel >= 0 && parsedLevel <= 3 ? parsedLevel : 1) as 0 | 1 | 2 | 3;
      const levelNames = ['Instance', 'Technique', 'Category', 'Principle'];

      return {
        strategyName,
        clusterName,
        whenToUse,
        reasoningSteps,
        example,
        successInsight,
        abstractionLevel: {
          level,
          name: levelNames[level],
          description: `LLM-determined level ${level}`,
        },
        sourceExperienceCount: sourceCount,
        confidence,
      };
    } catch (error) {
      console.warn(`Failed to parse pattern response:`, error);
      return null;
    }
  }

  /**
   * Extract a field value from LLM response
   * Handles both single and double newlines before the next field marker
   * Strips markdown bold formatting (**) before parsing
   */
  private extractField(response: string, fieldName: string): string | null {
    // Strip markdown bold markers before matching
    const cleanedResponse = response.replace(/\*\*/g, '');
    // Match field content until we hit another FIELD: marker (allowing blank lines before it)
    const regex = new RegExp(`${fieldName}:\\s*(.+?)(?=\\n\\s*[A-Z_]+:|$)`, 's');
    const match = cleanedResponse.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract reasoning steps as array
   */
  private extractReasoningSteps(response: string): string[] {
    const stepsSection = this.extractField(response, 'REASONING_STEPS');
    if (!stepsSection) return ['Apply constraint reasoning'];

    const steps = stepsSection
      .split(/\n/)
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);

    return steps.length > 0 ? steps : ['Apply constraint reasoning'];
  }

  /**
   * LLM builds abstraction hierarchy from synthesized patterns
   * Spec 16 Section 4.12: Conditional AISP/English prompts
   */
  private async buildAbstractionHierarchy(
    patterns: SynthesizedPattern[],
    profileName?: string
  ): Promise<AbstractionHierarchy> {
    // Build prompts based on mode
    const systemPrompt = this.aispMode === 'aisp-full'
      ? this.buildAISPHierarchySystemPrompt()
      : 'You are organizing Sudoku strategies into an abstraction hierarchy, from specific to general.';

    const prompt = this.aispMode === 'aisp-full'
      ? this.buildAISPHierarchyPrompt(patterns)
      : this.buildEnglishHierarchyPrompt(patterns);

    try {
      const result = await this.llmClient.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        {
          validatePrompt: this.aispMode !== 'off',
          validateResponse: this.aispMode === 'aisp-full',
          context: 'hierarchy-build',
        }
      );

      // Parse based on mode with fallback
      let hierarchy: AbstractionHierarchy;
      if (this.aispMode === 'aisp-full') {
        hierarchy = this.parseAISPHierarchyResponse(result.content, patterns.length, profileName);
        if (hierarchy.levels.length === 0) {
          // Fallback to English parsing
          hierarchy = this.parseHierarchyResponse(result.content, patterns.length, profileName);
        }
      } else {
        hierarchy = this.parseHierarchyResponse(result.content, patterns.length, profileName);
      }

      // If parsing still failed, create basic hierarchy from patterns
      if (hierarchy.levels.length === 0) {
        console.log(`   ⚠️  Hierarchy parsing failed, creating basic hierarchy`);
        return this.createBasicHierarchy(patterns, profileName);
      }
      return hierarchy;
    } catch (error) {
      // Return a basic hierarchy if LLM fails
      console.log(`   ⚠️  Hierarchy LLM call failed, creating basic hierarchy`);
      return this.createBasicHierarchy(patterns, profileName);
    }
  }

  /**
   * Build AISP-formatted hierarchy system prompt
   * Spec 16 Section 4.12: AISP Prompt Coverage
   */
  private buildAISPHierarchySystemPrompt(): string {
    return `𝔸1.0.sudoku.hierarchy.system
γ≔abstraction.hierarchy.construction

⟦Ω:Rules⟧{
  task≜organize(strategies)→hierarchy[L0..L3]
  L0≜specific_instances
  L1≜grouped_techniques
  L2≜broad_categories
  L3≜universal_principles
}

⟦Ε:Output⟧{
  format≔⟨
    L0≔item1;item2;item3
    L1≔tech1;tech2
    L2≔cat1;cat2
    L3≔principle1
  ⟩
  ;; Each level on one line, items separated by semicolons
  ∀output:syntax∈AISP
  ¬prose
}`;
  }

  /**
   * Build AISP-formatted hierarchy user prompt
   * Spec 16 Section 4.12: AISP Prompt Coverage
   */
  private buildAISPHierarchyPrompt(patterns: SynthesizedPattern[]): string {
    const date = new Date().toISOString().split('T')[0];
    const strategyList = patterns.map((p, i) =>
      `    s[${i}]≔"${this.sanitizeForAISP(p.strategyName || p.clusterName || 'Unknown')}"`
    ).join('\n');

    return `𝔸1.0.sudoku.hierarchy.build@${date}
γ≔abstraction.hierarchy

⟦Σ:Strategies⟧{
${strategyList}
}

⟦Ω:Task⟧{
  task≜organize(strategies)→hierarchy
  L0≜select(2..3,specific_instances)
  L1≜group(similar→techniques,2..4)
  L2≜abstract(techniques→categories,1..3)
  L3≜extract(1..2,universal_principles)
}

⟦Ε:Output⟧{
  format≔⟨
    L0≔instance1;instance2;instance3
    L1≔technique1;technique2
    L2≔category1;category2
    L3≔principle1
  ⟩
  ;; Each level on one line, items separated by semicolons
  ;; Use concise phrases (2-5 words each)
  ∀output:syntax∈AISP
  ¬prose
}`;
  }

  /**
   * Build English-formatted hierarchy prompt (original format)
   */
  private buildEnglishHierarchyPrompt(patterns: SynthesizedPattern[]): string {
    const patternList = patterns.map(p => `- ${p.strategyName}: ${p.whenToUse}`).join('\n');

    return `You have ${patterns.length} Sudoku solving strategies. Organize them into a 4-level abstraction hierarchy.

Your strategies:
${patternList}

Create a hierarchy with these 4 levels:

LEVEL_0_INSTANCES:
[List 2-3 specific examples/instances from the strategies above]

LEVEL_1_TECHNIQUES:
[Group similar strategies into named techniques, 2-4 items]

LEVEL_2_CATEGORIES:
[Group techniques into broader categories like "Completion" or "Elimination", 1-3 items]

LEVEL_3_PRINCIPLES:
[Extract 1-2 universal problem-solving principles]

Be concise. Each item should be a short phrase or sentence.`;
  }

  /**
   * Parse AISP hierarchy response
   * Spec 16 Section 4.12: AISP Prompt Coverage
   * Handles format: L0≔item1;item2;item3 (one level per line)
   */
  private parseAISPHierarchyResponse(
    response: string,
    patternCount: number,
    profileName?: string
  ): AbstractionHierarchy {
    // New simpler format: L0≔item1;item2;item3 (semicolon-separated on each line)
    const extractLevel = (level: string): string[] => {
      // Match L0≔... or L0=... pattern, handle both ≔ and =
      const regex = new RegExp(`${level}[≔=](.+?)(?:\\n|$)`, 'i');
      const match = response.match(regex);
      if (!match) return [];
      // Split by semicolon, clean up
      return match[1]
        .split(';')
        .map(s => s.trim().replace(/^["'⟨]|["'⟩]$/g, ''))
        .filter(s => s.length > 0 && s !== '...');
    };

    const l0 = extractLevel('L0');
    const l1 = extractLevel('L1');
    const l2 = extractLevel('L2');
    const l3 = extractLevel('L3');

    // Fallback to old format if new format didn't work
    if (l0.length === 0 && l1.length === 0 && l2.length === 0 && l3.length === 0) {
      const hierarchyMatch = response.match(/⟦Θ:Hierarchy⟧\{([^}]+)\}/s);
      if (hierarchyMatch) {
        const content = hierarchyMatch[1];
        const levels: HierarchyLevel[] = [
          { level: 0 as const, name: 'Specific Instances', items: this.extractAISPListField(content, 'L0') },
          { level: 1 as const, name: 'Named Techniques', items: this.extractAISPListField(content, 'L1') },
          { level: 2 as const, name: 'Categories', items: this.extractAISPListField(content, 'L2') },
          { level: 3 as const, name: 'Universal Principles', items: this.extractAISPListField(content, 'L3') },
        ].filter(l => l.items.length > 0);

        return {
          levels,
          profileName: profileName || 'default',
          createdAt: new Date(),
          totalPatterns: patternCount,
        };
      }
      return this.createBasicHierarchy([], profileName);
    }

    // Build levels array using proper HierarchyLevel structure
    const levels: HierarchyLevel[] = [
      { level: 0 as const, name: 'Specific Instances', items: l0 },
      { level: 1 as const, name: 'Named Techniques', items: l1 },
      { level: 2 as const, name: 'Categories', items: l2 },
      { level: 3 as const, name: 'Universal Principles', items: l3 },
    ].filter(l => l.items.length > 0);

    return {
      levels,
      profileName: profileName || 'default',
      createdAt: new Date(),
      totalPatterns: patternCount,
    };
  }

  /**
   * Convert FewShotExample array to SynthesizedPattern array for reuse
   */
  private fewShotsToPatterns(fewShots: FewShotExample[]): SynthesizedPattern[] {
    return fewShots.map((fs, i) => ({
      strategyName: fs.strategy || `Strategy ${i + 1}`,
      clusterName: 'fewshot',
      whenToUse: fs.situation || 'General constraint reasoning',
      reasoningSteps: fs.analysis?.split('\n').filter(s => s.trim()) || [],
      example: fs.gridContext || '',
      successInsight: '',
      abstractionLevel: {
        level: (fs.abstractionLevel || 1) as 0 | 1 | 2 | 3,
        name: 'Technique',
        description: 'Converted from few-shot',
      },
      sourceExperienceCount: 1,
      confidence: 0.8,
    }));
  }

  /**
   * Parse hierarchy response from LLM
   */
  private parseHierarchyResponse(
    response: string,
    patternCount: number,
    profileName?: string
  ): AbstractionHierarchy {
    const levels: HierarchyLevel[] = [
      { level: 0, name: 'Specific Instances', items: this.extractLevelItems(response, 'LEVEL_0_INSTANCES') },
      { level: 1, name: 'Named Techniques', items: this.extractLevelItems(response, 'LEVEL_1_TECHNIQUES') },
      { level: 2, name: 'Strategy Categories', items: this.extractLevelItems(response, 'LEVEL_2_CATEGORIES') },
      { level: 3, name: 'General Principles', items: this.extractLevelItems(response, 'LEVEL_3_PRINCIPLES') },
    ];

    return {
      levels: levels.filter(l => l.items.length > 0),
      profileName: profileName || 'default',
      createdAt: new Date(),
      totalPatterns: patternCount,
    };
  }

  /**
   * Extract items for a hierarchy level
   * Uses explicit boundary detection to avoid bleeding between levels
   */
  private extractLevelItems(response: string, levelKey: string): string[] {
    // Find start of this level
    const startMatch = response.match(new RegExp(`${levelKey}:`, 'i'));
    if (!startMatch || startMatch.index === undefined) return [];

    const startIdx = startMatch.index + startMatch[0].length;

    // Find start of next LEVEL_X marker after this one
    const nextLevelRegex = /LEVEL_\d+_[A-Z]+:/gi;
    nextLevelRegex.lastIndex = startIdx; // Start searching after current level

    const nextMatch = nextLevelRegex.exec(response);
    const endIdx = nextMatch ? nextMatch.index : response.length;

    // Extract just this level's section
    const section = response.substring(startIdx, endIdx);

    return section
      .split(/\n/)
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line =>
        line.length > 0 &&
        !line.startsWith('[') &&
        !line.match(/^LEVEL_\d+/)
      );
  }

  /**
   * Create basic hierarchy when LLM fails
   */
  private createBasicHierarchy(
    patterns: SynthesizedPattern[],
    profileName?: string
  ): AbstractionHierarchy {
    return {
      levels: [
        {
          level: 1,
          name: 'Named Techniques',
          items: patterns.map(p => p.strategyName || p.clusterName).filter((n): n is string => n !== undefined),
        },
      ],
      profileName: profileName || 'default',
      createdAt: new Date(),
      totalPatterns: patterns.length,
    };
  }

  /**
   * Convert a SynthesizedPattern to a FewShotExample
   *
   * Spec 16: Includes aispEncoded field when present
   * Spec 05 Section 8.5: Includes friendlyName, category, trainingCount metadata
   */
  private patternToFewShot(pattern: SynthesizedPattern): FewShotExample {
    // Generate friendly name from strategy name or cluster name
    const friendlyName = this.generateFriendlyName(
      pattern.strategyName || pattern.clusterName || 'Strategy'
    );

    // Assign category based on abstraction level (Spec 05 Section 8.5)
    const level = pattern.abstractionLevel.level;
    const category = level <= 1 ? 'basic' : level === 2 ? 'intermediate' : 'advanced';

    return {
      strategy: pattern.strategyName,
      abstractionLevel: pattern.abstractionLevel.level,
      situation: pattern.whenToUse,
      analysis: pattern.reasoningSteps.join('\n'),
      move: { row: 0, col: 0, value: 0 },
      outcome: 'CORRECT' as const,
      gridContext: pattern.example,
      reasoningTemplate: pattern.reasoningTemplate,
      isAnonymous: pattern.isAnonymous,
      // Spec 16: Include AISP encoding when available
      aispEncoded: pattern.aispEncoded,
      // Spec 05 Section 8.5: Strategy metadata
      friendlyName,
      category,
      trainingCount: pattern.sourceExperienceCount,
      playCount: 0, // Initialize to 0, incremented during play
    };
  }

  /**
   * Generate a human-readable friendly name from a strategy identifier
   *
   * Converts underscores to spaces and applies title case.
   * Example: "naked_single_elimination" → "Naked Single Elimination"
   */
  private generateFriendlyName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  /**
   * Generate few-shot examples from synthesized patterns
   *
   * Few-shots are LLM-synthesized teaching examples, NOT raw move data
   * Uses LLM to select diverse strategies (Spec 11 - LLM-Driven Diversity)
   * Spec 16 Section 4.12: Conditional AISP/English prompts
   */
  private async generateFewShotsFromPatterns(
    patterns: SynthesizedPattern[]
  ): Promise<FewShotExample[]> {
    if (patterns.length === 0) return [];

    // If only 1-2 patterns, no need for diversity selection
    if (patterns.length <= 2) {
      return patterns.map((pattern) => this.patternToFewShot(pattern));
    }

    // Use LLM to select diverse strategies
    console.log(`🎯 Asking LLM to select diverse strategies from ${patterns.length} patterns...`);

    // Build prompts based on mode
    const systemPrompt = this.aispMode === 'aisp-full'
      ? this.buildAISPFewShotSelectionSystemPrompt()
      : 'You are selecting diverse Sudoku strategies. Be strict about avoiding duplicates.';

    const prompt = this.aispMode === 'aisp-full'
      ? this.buildAISPFewShotSelectionPrompt(patterns, this.consolidationOptions.fewShotMax)
      : this.buildEnglishFewShotSelectionPrompt(patterns);

    try {
      const result = await this.llmClient.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        {
          validatePrompt: this.aispMode !== 'off',
          validateResponse: this.aispMode === 'aisp-full',
          context: 'fewshot-selection',
        }
      );

      // Parse based on mode with fallback
      let selectedIndices: number[];
      if (this.aispMode === 'aisp-full') {
        selectedIndices = this.parseAISPSelectionResponse(result.content, patterns.length);
        if (selectedIndices.length === 0) {
          // Fallback to English parsing
          selectedIndices = this.parseSelectedStrategies(result.content, patterns.length);
        }
      } else {
        selectedIndices = this.parseSelectedStrategies(result.content, patterns.length);
      }

      console.log(`   LLM selected ${selectedIndices.length} diverse strategies: ${selectedIndices.join(', ')}`);

      // Map selected indices to patterns
      const selectedPatterns = selectedIndices
        .filter(i => i >= 0 && i < patterns.length)
        .map(i => patterns[i]);

      // Fallback if parsing failed
      if (selectedPatterns.length === 0) {
        console.log(`   ⚠️ LLM selection parsing failed, using first ${this.consolidationOptions.fewShotMin} patterns`);
        return patterns.slice(0, this.consolidationOptions.fewShotMin).map((pattern) => this.patternToFewShot(pattern));
      }

      return selectedPatterns.map((pattern) => this.patternToFewShot(pattern));

    } catch (error) {
      console.warn(`   ⚠️ LLM diversity selection failed:`, error);
      // Fallback to minimum patterns
      return patterns.slice(0, this.consolidationOptions.fewShotMin).map((pattern) => this.patternToFewShot(pattern));
    }
  }

  /**
   * Build AISP-formatted fewshot selection system prompt
   * Spec 16 Section 4.12: AISP Prompt Coverage
   */
  private buildAISPFewShotSelectionSystemPrompt(): string {
    return `𝔸1.0.sudoku.fewshot.system
γ≔strategy.diversity.selection

⟦Ω:Rules⟧{
  task≜select(diverse_strategies)
  constraint≜∀s₁,s₂∈selected:¬overlap(s₁,s₂)
  goal≜maximize(reasoning_coverage)
}

⟦Ε:Output⟧{
  format≔⟨
    sel[0]→s2
    sel[1]→s5
    sel[2]→s1
  ⟩
  ;; Each line: sel[order]→s{strategy_index}
  ∀output:syntax∈AISP
  ¬prose
}`;
  }

  /**
   * Build AISP-formatted fewshot selection user prompt
   * Spec 16 Section 4.12: AISP Prompt Coverage
   */
  private buildAISPFewShotSelectionPrompt(
    patterns: SynthesizedPattern[],
    count: number
  ): string {
    const date = new Date().toISOString().split('T')[0];
    const patternList = patterns.map((p, i) =>
      `    s[${i}]≔{name:"${this.sanitizeForAISP(p.strategyName || p.clusterName || 'Unknown')}",when:"${this.sanitizeForAISP((p.whenToUse || '').substring(0, 80))}"}`
    ).join('\n');

    return `𝔸1.0.sudoku.strategy.selection@${date}
γ≔fewshot.diversity.selection

⟦Σ:Candidates⟧{
${patternList}
}

⟦Ω:Task⟧{
  task≜select(EXACTLY:${count},diverse_strategies)
  rule≜∀s₁,s₂∈selected:different(s₁.approach,s₂.approach)
  target≔${count}
  ;; MUST select exactly ${count} strategies - do not stop early
  ;; Pick strategies that cover different reasoning techniques
}

⟦Ε:Output⟧{
  format≔⟨
    sel[0]→s2
    sel[1]→s0
    sel[2]→s4
  ⟩
  ;; Each line: sel[order]→s{index} where index is 0-${patterns.length - 1}
  ;; Select ${count} diverse strategies
  ∀output:syntax∈AISP
  ¬prose
}`;
  }

  /**
   * Build English-formatted fewshot selection prompt (original format)
   */
  private buildEnglishFewShotSelectionPrompt(patterns: SynthesizedPattern[]): string {
    return `You have synthesized ${patterns.length} Sudoku strategies from your experiences.

Your strategies:
${patterns.map((p, i) => `${i + 1}. ${p.strategyName}: ${p.whenToUse}`).join('\n')}

Now select EXACTLY ${this.consolidationOptions.fewShotMax} DIVERSE strategies to remember as few-shot examples.
(Target: ${this.consolidationOptions.fewShotMax} strategies, minimum acceptable: ${this.consolidationOptions.fewShotMin})

CRITICAL: Select the FULL ${this.consolidationOptions.fewShotMax} strategies!
- You MUST provide ${this.consolidationOptions.fewShotMax} selections to maximize learning diversity
- Do NOT stop early - find ${this.consolidationOptions.fewShotMax} distinct approaches
- Do NOT select strategies that use the same underlying technique
- If multiple strategies are variations of "last digit in row/column/box", pick only ONE
- Aim for variety: completion strategies, elimination strategies, constraint checking, etc.
- Identify and reject duplicates explicitly

For each selected strategy, respond with ONLY the strategy numbers you selected, one per line:
SELECTED: [number]
WHY_DIVERSE: [brief explanation of why this is different from others]

Example response:
SELECTED: 1
WHY_DIVERSE: Focuses on row completion
SELECTED: 4
WHY_DIVERSE: Uses box constraint checking, different from row-based strategies
SELECTED: 7
WHY_DIVERSE: Elimination approach rather than completion`;
  }

  /**
   * Parse AISP selection response
   * Spec 16 Section 4.12: AISP Prompt Coverage
   * Handles format: sel[0]→s2 or sel[0]→s{2}
   */
  private parseAISPSelectionResponse(response: string, maxIndex: number): number[] {
    const indices: number[] = [];

    // New format: sel[n]→s{m} or sel[n]→sm
    const newRegex = /sel\[\d+\]→s\{?(\d+)\}?/gi;
    let match;
    while ((match = newRegex.exec(response)) !== null) {
      const idx = parseInt(match[1], 10);
      if (idx >= 0 && idx < maxIndex && !indices.includes(idx)) {
        indices.push(idx);
      }
    }

    // Fallback to old format if new format didn't match
    if (indices.length === 0) {
      const oldRegex = /⟦Χ:Selection\.\d+⟧\{[^}]*idx≔(\d+)/g;
      while ((match = oldRegex.exec(response)) !== null) {
        const idx = parseInt(match[1], 10);
        if (idx >= 0 && idx < maxIndex && !indices.includes(idx)) {
          indices.push(idx);
        }
      }
    }

    const selected = indices.slice(0, this.consolidationOptions.fewShotMax);
    if (selected.length < this.consolidationOptions.fewShotMin) {
      console.warn(`   ⚠️ LLM selected only ${selected.length} strategies (min: ${this.consolidationOptions.fewShotMin})`);
    }
    return selected;
  }

  /**
   * Parse selected strategy indices from English LLM response
   */
  private parseSelectedStrategies(response: string, maxIndex: number): number[] {
    const indices: number[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const match = line.match(/SELECTED:\s*(\d+)/i);
      if (match) {
        const index = parseInt(match[1], 10) - 1; // Convert 1-indexed to 0-indexed
        if (index >= 0 && index < maxIndex && !indices.includes(index)) {
          indices.push(index);
        }
      }
    }

    const selected = indices.slice(0, this.consolidationOptions.fewShotMax);
    if (selected.length < this.consolidationOptions.fewShotMin) {
      console.warn(`   ⚠️ LLM selected only ${selected.length} strategies (min: ${this.consolidationOptions.fewShotMin})`);
    }
    return selected;
  }

  /**
   * LLM-driven anti-pattern synthesis from invalid moves
   *
   * Spec 11: Negative Example Learning (2026-01-09)
   * Spec 16: AISP-compliant prompts when aisp modes enabled
   *
   * The LLM analyzes its mistakes and synthesizes anti-patterns.
   * Returns free-text summary that can be included in insights.
   */
  async synthesizeAntiPatterns(invalid: LLMExperience[]): Promise<string> {
    if (invalid.length < 3) {
      return ''; // Need at least 3 errors to be meaningful
    }

    console.log(`🔍 Asking LLM to analyze ${invalid.length} mistakes and identify anti-patterns...`);

    let systemPrompt: string;
    let userPrompt: string;

    if (this.aispMode !== 'off') {
      // Use AISP-compliant prompts when any aisp mode is enabled
      const mistakes = invalid.slice(0, 20).map(exp => ({
        row: exp.move.row,
        col: exp.move.col,
        value: exp.move.value,
        error: exp.validation.error || '',
        reasoning: exp.move.reasoning,
      }));

      systemPrompt = this.aispBuilder.buildAISPAntiPatternSystemPrompt();
      userPrompt = this.aispMode === 'aisp-full'
        ? this.aispBuilder.buildAISPAntiPatternPrompt('general_analysis', mistakes)
        : this.aispBuilder.buildAISPLiteAntiPatternPrompt('general_analysis', mistakes);
    } else {
      // Standard mode - use natural language prompts
      const mistakesList = invalid.slice(0, 20).map((exp, i) => `
${i + 1}. Move (${exp.move.row},${exp.move.col})=${exp.move.value}
   Error: ${exp.validation.error}
   Your reasoning: ${exp.move.reasoning.substring(0, 200)}...`).join('\n');

      systemPrompt = 'You are analyzing your Sudoku solving mistakes to identify patterns of errors.';
      userPrompt = `You made ${invalid.length} invalid moves during Sudoku solving.

Your mistakes:
${mistakesList}

Analyze your mistakes and identify ANTI-PATTERNS - things you should NOT do.

For each anti-pattern you identify, explain:
1. MISTAKE: What you did wrong (the pattern of error)
2. WHY_WRONG: Why this approach fails
3. INSTEAD: What to do instead

Focus on the most common/impactful mistakes. Synthesize patterns, don't just list individual errors.
Identify at most 3 anti-patterns.`;
    }

    try {
      const result = await this.llmClient.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          validatePrompt: this.aispMode !== 'off',
          validateResponse: this.aispMode === 'aisp-full',
          context: 'anti-pattern-analysis',
        }
      );

      console.log(`   ✅ LLM synthesized anti-patterns`);
      return result.content;
    } catch (error) {
      console.warn(`   ⚠️ LLM anti-pattern synthesis failed:`, error);
      return '';
    }
  }

  // ============================================================================
  // Failure Learning Methods (Spec 19)
  // ============================================================================

  /**
   * Synthesize structured anti-patterns from clustered invalid moves
   *
   * Groups invalid moves by error type and asks LLM to synthesize
   * anti-patterns for each cluster.
   *
   * Spec 19 Section 3
   */
  async synthesizeAntiPatternsFromClusters(
    invalid: LLMExperience[]
  ): Promise<SynthesizedAntiPattern[]> {
    if (invalid.length < 3) {
      return [];
    }

    // Group by error type
    const errorGroups = new Map<string, LLMExperience[]>();
    for (const exp of invalid) {
      const errorType = this.categorizeError(exp.validation.error || '');
      const group = errorGroups.get(errorType) || [];
      group.push(exp);
      errorGroups.set(errorType, group);
    }

    const antiPatterns: SynthesizedAntiPattern[] = [];

    for (const [errorType, experiences] of errorGroups) {
      if (experiences.length < 2) continue;

      console.log(`   🔍 Synthesizing anti-pattern for "${errorType}" (${experiences.length} errors)...`);

      try {
        const antiPattern = await this.synthesizeSingleAntiPattern(errorType, experiences);
        if (antiPattern) {
          antiPatterns.push(antiPattern);
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to synthesize anti-pattern for "${errorType}":`, error);
      }
    }

    return antiPatterns;
  }

  /**
   * Synthesize a single anti-pattern from a cluster of similar errors
   *
   * When AISP modes are enabled (--aisp, --aisp-lite, --aisp-full), uses
   * AISP-compliant prompts per Spec 16 + Spec 19.
   */
  private async synthesizeSingleAntiPattern(
    errorType: string,
    experiences: LLMExperience[]
  ): Promise<SynthesizedAntiPattern | null> {
    // Format mistakes for prompt
    const mistakes = experiences.slice(0, this.consolidationOptions.fewShotMax).map(exp => ({
      row: exp.move.row,
      col: exp.move.col,
      value: exp.move.value,
      error: exp.validation.error || '',
      reasoning: exp.move.reasoning,
    }));

    let systemPrompt: string;
    let userPrompt: string;

    // Use AISP-compliant prompts when aisp modes are enabled
    if (this.aispMode === 'aisp-full') {
      // Full AISP mode - use full AISP prompt format
      systemPrompt = this.aispBuilder.buildAISPAntiPatternSystemPrompt();
      userPrompt = this.aispBuilder.buildAISPAntiPatternPrompt(errorType, mistakes);
    } else if (this.aispMode === 'aisp') {
      // AISP-lite mode - use simplified AISP prompt format
      systemPrompt = this.aispBuilder.buildAISPAntiPatternSystemPrompt();
      userPrompt = this.aispBuilder.buildAISPLiteAntiPatternPrompt(errorType, mistakes);
    } else {
      // Standard mode - use natural language prompts
      const examples = experiences.slice(0, this.consolidationOptions.fewShotMax).map((exp, i) => `
${i + 1}. Move (${exp.move.row},${exp.move.col})=${exp.move.value}
   Error: ${exp.validation.error}
   Your reasoning: ${exp.move.reasoning.substring(0, 300)}...`).join('\n');

      systemPrompt = 'You are analyzing your Sudoku solving mistakes to identify and prevent error patterns.';
      userPrompt = `You made ${experiences.length} invalid moves that violated the ${errorType.replace(/_/g, ' ')} rule.

Examples:
${examples}

Analyze these mistakes and synthesize an ANTI-PATTERN.

Respond in this exact format:
ANTI_PATTERN_NAME: [short descriptive name, 2-4 words]
WHAT_GOES_WRONG: [describe the common mistake pattern in 1-2 sentences]
WHY_IT_FAILS: [explain the root cause in 1-2 sentences]
PREVENTION_STEP_1: [specific action to avoid this]
PREVENTION_STEP_2: [another preventive action]
PREVENTION_STEP_3: [optional third step]`;
    }

    const result = await this.llmClient.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        validatePrompt: this.aispMode !== 'off',
        validateResponse: this.aispMode === 'aisp-full',
        context: 'anti-pattern-synthesis',
      }
    );

    const antiPattern = this.parseAntiPatternResponse(result.content, errorType, experiences);

    // Spec 19: Encode anti-pattern in AISP format when aisp-full mode enabled
    if (antiPattern && this.aispMode === 'aisp-full') {
      antiPattern.aispEncoded = this.aispEncoder.encodeAntiPattern(antiPattern);
    }

    return antiPattern;
  }

  /**
   * Parse LLM response into a SynthesizedAntiPattern
   *
   * Supports both NL format and AISP format:
   * - NL: WHAT_GOES_WRONG, WHY_IT_FAILS, PREVENTION_STEP_1/2/3
   * - AISP: AVOID, WHY, PREVENT_1/2/3
   */
  private parseAntiPatternResponse(
    response: string,
    errorType: string,
    experiences: LLMExperience[]
  ): SynthesizedAntiPattern | null {
    const cleanResponse = response.replace(/\*\*/g, '');

    const nameMatch = cleanResponse.match(/ANTI_PATTERN_NAME:\s*(.+?)(?=\n|$)/i);

    // Try NL format first, then AISP format
    let whatMatch = cleanResponse.match(/WHAT_GOES_WRONG:\s*(.+?)(?=\n\s*[A-Z_]+:|$)/is);
    if (!whatMatch) {
      // AISP format: AVOID field
      whatMatch = cleanResponse.match(/AVOID:\s*(.+?)(?=\n\s*[A-Z_]+:|$)/is);
    }

    let whyMatch = cleanResponse.match(/WHY_IT_FAILS:\s*(.+?)(?=\n\s*[A-Z_]+:|$)/is);
    if (!whyMatch) {
      // AISP format: WHY field
      whyMatch = cleanResponse.match(/WHY:\s*(.+?)(?=\n\s*[A-Z_]+:|$)/is);
    }

    const preventionSteps: string[] = [];

    // Try NL format: PREVENTION_STEP_1/2/3
    for (let i = 1; i <= 3; i++) {
      const stepMatch = cleanResponse.match(new RegExp(`PREVENTION_STEP_${i}:\\s*(.+?)(?=\\n|$)`, 'i'));
      if (stepMatch) {
        preventionSteps.push(stepMatch[1].trim());
      }
    }

    // If no NL prevention steps found, try AISP format: PREVENT_1/2/3
    if (preventionSteps.length === 0) {
      for (let i = 1; i <= 3; i++) {
        const stepMatch = cleanResponse.match(new RegExp(`PREVENT_${i}:\\s*(.+?)(?=\\n|$)`, 'i'));
        if (stepMatch) {
          preventionSteps.push(stepMatch[1].trim());
        }
      }
    }

    if (!nameMatch || !whatMatch || !whyMatch || preventionSteps.length === 0) {
      console.warn(`   ⚠️  Failed to parse anti-pattern response`);
      return null;
    }

    return {
      id: `ap-${errorType}-${Date.now()}`,
      antiPatternName: nameMatch[1].trim(),
      clusterName: errorType,
      whatGoesWrong: whatMatch[1].trim(),
      whyItFails: whyMatch[1].trim(),
      preventionSteps,
      examples: experiences.slice(0, 3).map(exp => ({
        move: exp.move,
        error: exp.validation.error || '',
      })),
      frequency: experiences.length,
      sourceExperienceCount: experiences.length,
    };
  }

  /**
   * Analyze valid-but-wrong moves to extract reasoning corrections
   *
   * Asks LLM to analyze each wrong move and identify the flawed
   * reasoning step.
   *
   * Spec 19 Section 4
   */
  async analyzeWrongReasoning(
    wrong: LLMExperience[]
  ): Promise<ReasoningCorrection[]> {
    if (wrong.length < 2) {
      return [];
    }

    const corrections: ReasoningCorrection[] = [];

    // Limit to 10 to control LLM costs
    const batch = wrong.slice(0, 10);

    for (const exp of batch) {
      try {
        const correction = await this.analyzeSingleWrongReasoning(exp);
        if (correction) {
          corrections.push(correction);
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to analyze reasoning for move (${exp.move.row},${exp.move.col}):`, error);
      }
    }

    return corrections;
  }

  /**
   * Analyze a single valid-but-wrong move
   */
  private async analyzeSingleWrongReasoning(
    exp: LLMExperience
  ): Promise<ReasoningCorrection | null> {
    const gridContext = this.describeGridContext(exp.gridState, exp.move);

    const prompt = `You made a valid but WRONG move in Sudoku.

Grid context: ${gridContext}
Your move: (${exp.move.row},${exp.move.col}) = ${exp.move.value}
This value was wrong (violates solution).

Your reasoning was:
${exp.move.reasoning}

Analyze what went wrong in your reasoning.

Respond in this exact format:
FLAWED_STEP: [the specific step in your reasoning that was wrong]
CORRECTION: [how you should have reasoned instead]
GENERAL_PRINCIPLE: [a general rule to remember, 1 sentence]
CONFIDENCE: [0.0-1.0 how confident you are in this analysis]`;

    const result = await this.llmClient.chat(
      [
        {
          role: 'system',
          content: 'You are analyzing your own Sudoku solving reasoning to identify where you went wrong.',
        },
        { role: 'user', content: prompt },
      ],
      {
        validatePrompt: this.aispMode !== 'off', // NL stripped before validation
        validateResponse: this.aispMode === 'aisp-full',
        context: 'reasoning-correction',
      }
    );

    return this.parseReasoningCorrectionResponse(result.content, exp);
  }

  /**
   * Parse LLM response into a ReasoningCorrection
   */
  private parseReasoningCorrectionResponse(
    response: string,
    exp: LLMExperience
  ): ReasoningCorrection | null {
    const cleanResponse = response.replace(/\*\*/g, '');

    const flawedMatch = cleanResponse.match(/FLAWED_STEP:\s*(.+?)(?=\n\s*[A-Z_]+:|$)/is);
    const correctionMatch = cleanResponse.match(/CORRECTION:\s*(.+?)(?=\n\s*[A-Z_]+:|$)/is);
    const principleMatch = cleanResponse.match(/GENERAL_PRINCIPLE:\s*(.+?)(?=\n\s*[A-Z_]+:|$)/is);
    const confidenceMatch = cleanResponse.match(/CONFIDENCE:\s*([\d.]+)/i);

    if (!flawedMatch || !correctionMatch || !principleMatch) {
      console.warn(`   ⚠️  Failed to parse reasoning correction response`);
      return null;
    }

    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;

    return {
      id: `rc-${exp.id}-${Date.now()}`,
      gridContext: this.describeGridContext(exp.gridState, exp.move),
      wrongMove: exp.move,
      correctValue: 0, // We don't have the correct value without the solution
      flawedReasoningStep: flawedMatch[1].trim(),
      correction: correctionMatch[1].trim(),
      generalPrinciple: principleMatch[1].trim(),
      confidence: Math.min(1, Math.max(0, confidence)),
    };
  }

  /**
   * Synthesize an insights summary from patterns and hierarchy
   */
  private async synthesizeInsightsSummary(
    patterns: SynthesizedPattern[],
    hierarchy?: AbstractionHierarchy
  ): Promise<string> {
    let summary = '## LLM Dream Consolidation Summary\n\n';

    summary += `### Synthesized Strategies (${patterns.length})\n`;
    patterns.forEach((p, i) => {
      summary += `${i + 1}. **${p.strategyName}**\n`;
      summary += `   - When: ${p.whenToUse}\n`;
      summary += `   - Confidence: ${(p.confidence * 100).toFixed(0)}%\n`;
    });

    if (hierarchy && hierarchy.levels.length > 0) {
      summary += `\n### Abstraction Hierarchy\n`;
      hierarchy.levels.forEach(level => {
        summary += `\n**Level ${level.level}: ${level.name}**\n`;
        level.items.forEach(item => {
          summary += `- ${item}\n`;
        });
      });
    }

    return summary;
  }

  // ============================================================================
  // Legacy methods (kept for error/wrong path analysis)
  // ============================================================================

  /**
   * Describe grid context around a move
   */
  private describeGridContext(
    gridState: number[][],
    move: { row: number; col: number; value: number }
  ): string {
    const row = move.row - 1;
    const col = move.col - 1;

    // Handle edge cases
    if (row < 0 || row >= gridState.length || col < 0 || col >= (gridState[0]?.length || 0)) {
      return `Cell (${move.row},${move.col})`;
    }

    const filledInRow = gridState[row]?.filter((v) => v !== 0).length || 0;
    const filledInCol = gridState.map((r) => r[col]).filter((v) => v !== 0).length;

    // Calculate box for variable grid sizes
    const boxSize = Math.sqrt(gridState.length);
    const boxRow = Math.floor(row / boxSize) * boxSize;
    const boxCol = Math.floor(col / boxSize) * boxSize;
    let filledInBox = 0;
    for (let r = boxRow; r < boxRow + boxSize && r < gridState.length; r++) {
      for (let c = boxCol; c < boxCol + boxSize && c < (gridState[r]?.length || 0); c++) {
        if (gridState[r][c] !== 0) filledInBox++;
      }
    }

    const gridSize = gridState.length;
    return `Cell (${move.row},${move.col}): row ${filledInRow}/${gridSize} filled, col ${filledInCol}/${gridSize} filled, box ${filledInBox}/${gridSize} filled`;
  }

  /**
   * Group common error patterns
   */
  private groupErrors(invalid: LLMExperience[]): LLMErrorPattern[] {
    const errorMap = new Map<string, LLMErrorPattern>();

    for (const exp of invalid) {
      const errorType = this.categorizeError(exp.validation.error || '');

      if (!errorMap.has(errorType)) {
        errorMap.set(errorType, {
          errorType,
          frequency: 0,
          examples: [],
        });
      }

      const pattern = errorMap.get(errorType)!;
      pattern.frequency += 1;

      if (pattern.examples.length < 3) {
        pattern.examples.push({
          move: exp.move,
          error: exp.validation.error || 'Unknown error',
        });
      }
    }

    return Array.from(errorMap.values()).sort(
      (a, b) => b.frequency - a.frequency
    );
  }

  /**
   * Analyze wrong path patterns
   */
  private analyzeWrongPaths(wrong: LLMExperience[]): LLMWrongPath[] {
    const wrongMap = new Map<string, LLMWrongPath>();

    for (const exp of wrong) {
      const context = this.describeGridContext(exp.gridState, exp.move);
      const key = `${exp.move.row},${exp.move.col}`;

      if (!wrongMap.has(key)) {
        wrongMap.set(key, {
          context,
          wrongMove: exp.move,
          correctMove: {
            row: exp.move.row,
            col: exp.move.col,
            value: 0,
          },
          frequency: 0,
        });
      }

      wrongMap.get(key)!.frequency += 1;
    }

    return Array.from(wrongMap.values()).sort(
      (a, b) => b.frequency - a.frequency
    );
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: string): string {
    const lower = error.toLowerCase();

    if (lower.includes('row')) return 'row_constraint_violation';
    if (lower.includes('column')) return 'column_constraint_violation';
    if (lower.includes('box')) return 'box_constraint_violation';
    if (lower.includes('already filled')) return 'cell_already_filled';

    return 'unknown_error';
  }

  /**
   * Re-consolidate: Absorb new experiences into an existing learning unit
   *
   * Spec 11 - Iterative Learning:
   * Unlike initial consolidation (which starts fresh), re-consolidation:
   * 1. Loads existing few-shots from the learning unit
   * 2. Gets new unconsolidated experiences not yet absorbed
   * 3. Synthesizes patterns from new experiences
   * 4. Uses LLM to merge new patterns with existing (deduplicate, select best)
   * 5. Saves merged few-shots back to the unit
   * 6. Marks experiences as absorbed
   * 7. Updates metadata (counts, puzzle breakdown)
   *
   * @param learningUnitManager - Manager for the learning unit
   * @param learningUnitId - ID of the learning unit to update
   * @param profileName - LLM profile name
   */
  async reConsolidate(
    learningUnitManager: LearningUnitManager,
    learningUnitId: string,
    profileName: string,
    restrictToExperienceIds?: string[]
  ): Promise<ConsolidationReport> {
    // 1. Load existing few-shots from learning unit
    const existingFewShots = await learningUnitManager.getFewShots(learningUnitId);
    const absorbedIds = await learningUnitManager.getAbsorbedExperienceIds(learningUnitId);

    console.log(`🔄 Re-consolidating learning unit "${learningUnitId}"`);
    console.log(`📚 Existing strategies: ${existingFewShots.length}`);
    console.log(`📦 Already absorbed: ${absorbedIds.length} experiences`);

    // 2. Get new unconsolidated experiences not yet absorbed
    let allUnconsolidated = await this.experienceStore.getUnconsolidated(profileName);

    // BUGFIX: When --rerun is used, restrict to only the specified unit's experiences
    if (restrictToExperienceIds && restrictToExperienceIds.length > 0) {
      const beforeCount = allUnconsolidated.length;
      allUnconsolidated = allUnconsolidated.filter(exp => restrictToExperienceIds.includes(exp.id));
      if (allUnconsolidated.length < beforeCount) {
        console.log(`📦 Restricted to ${allUnconsolidated.length} experiences (from ${beforeCount} total unconsolidated)`);
      }
    }

    const newExperiences = allUnconsolidated.filter(
      (exp) => !absorbedIds.includes(exp.id)
    );

    if (newExperiences.length === 0) {
      console.log(`⚠️  No new experiences to absorb`);
      return this.createEmptyReport();
    }

    console.log(`🆕 Found ${newExperiences.length} new experiences to absorb`);

    // Filter by importance
    const importantExperiences = newExperiences
      .sort((a, b) => (b.importance ?? 0.5) - (a.importance ?? 0.5))
      .filter((e) => (e.importance ?? 0.5) >= 0.5);

    const lowImportanceCount = newExperiences.length - importantExperiences.length;
    if (lowImportanceCount > 0) {
      console.log(`   ↳ Filtered ${lowImportanceCount} low-importance experiences (< 0.5)`);
    }

    if (importantExperiences.length < 3) {
      console.log(`⚠️  Only ${importantExperiences.length} important experiences - need at least 3`);
      // Still mark them as absorbed even if not enough to synthesize
      // Pass full experiences to enable sticky experience model (copies + deletes originals)
      await learningUnitManager.markExperiencesAbsorbed(
        learningUnitId,
        newExperiences.map((e) => e.id),
        this.computePuzzleBreakdown(newExperiences),
        newExperiences,  // Full experiences for unit-bound copies
        { preserveOriginals: this.preserveExperiences }
      );
      return this.createEmptyReport();
    }

    // 3. Synthesize patterns from new experiences
    const successful = importantExperiences.filter((e) => e.validation.isCorrect);
    const invalid = importantExperiences.filter((e) => !e.validation.isValid);
    const validButWrong = importantExperiences.filter((e) => e.validation.isValid && !e.validation.isCorrect);

    console.log(`   ↳ Correct: ${successful.length}, Invalid: ${invalid.length}, Valid-but-wrong: ${validButWrong.length}`);

    const clusterTarget = this.getClusterTarget(successful.length);
    console.log(`🔍 Clustering ${successful.length} experiences with ${this.clusteringAlgorithm.getIdentifier()}...`);
    console.log(`   Cluster target: ${clusterTarget} (strategy selection: ${this.consolidationOptions.fewShotMin}-${this.consolidationOptions.fewShotMax})`);

    const clusterResult = await this.clusteringAlgorithm.cluster(
      successful,
      clusterTarget,
      this.llmConfig
    );
    const clusters = clusterResult.clusters;
    console.log(`✅ Created ${clusters.size} clusters in ${clusterResult.metadata.processingTimeMs}ms`);
    const newPatterns: SynthesizedPattern[] = [];

    for (const [clusterName, cluster] of clusters.entries()) {
      if (cluster.length >= 2) {
        console.log(`🧠 Synthesizing pattern from "${clusterName}" (${cluster.length} experiences)...`);
        try {
          const pattern = await this.synthesizePattern(cluster, clusterName);
          if (pattern) {
            newPatterns.push(pattern);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to synthesize pattern:`, error);
        }
      }
    }

    console.log(`✅ Synthesized ${newPatterns.length} new patterns`);

    // 3.5. FAILURE LEARNING (Spec 19)
    console.log(`\n📛 Phase 3.5: Failure Learning`);

    let antiPatterns: SynthesizedAntiPattern[] = [];
    let reasoningCorrections: ReasoningCorrection[] = [];

    // 3.5a: Cluster invalid moves and synthesize anti-patterns
    if (invalid.length >= 3) {
      console.log(`   Clustering ${invalid.length} invalid moves by error type...`);
      antiPatterns = await this.synthesizeAntiPatternsFromClusters(invalid);
      console.log(`   ↳ Generated ${antiPatterns.length} anti-patterns`);
    } else {
      console.log(`   ⚠️  Only ${invalid.length} invalid moves (need >= 3 for anti-patterns)`);
    }

    // 3.5b: Analyze valid-but-wrong moves for reasoning corrections
    if (validButWrong.length >= 2) {
      console.log(`   Analyzing ${validButWrong.length} valid-but-wrong moves...`);
      reasoningCorrections = await this.analyzeWrongReasoning(validButWrong);
      console.log(`   ↳ Generated ${reasoningCorrections.length} reasoning corrections`);
    } else {
      console.log(`   ⚠️  Only ${validButWrong.length} valid-but-wrong moves (need >= 2 for corrections)`);
    }

    // 4. Use LLM to merge new patterns with existing
    let mergedFewShots: FewShotExample[];
    if (existingFewShots.length > 0 && newPatterns.length > 0) {
      console.log(`🔀 LLM merging ${existingFewShots.length} existing + ${newPatterns.length} new strategies...`);
      mergedFewShots = await this.mergeStrategies(existingFewShots, newPatterns);
    } else if (newPatterns.length > 0) {
      // No existing, just convert new patterns to few-shots
      mergedFewShots = await this.generateFewShotsFromPatterns(newPatterns);
    } else {
      // Keep existing
      mergedFewShots = existingFewShots;
    }

    console.log(`💾 Saving ${mergedFewShots.length} merged strategies`);

    // 5. Save merged few-shots back to the unit
    await learningUnitManager.saveFewShots(learningUnitId, mergedFewShots);

    // 5.5. Build and save abstraction hierarchy for this learning unit
    if (mergedFewShots.length >= 2) {
      console.log(`📈 Building abstraction hierarchy for learning unit...`);
      try {
        const patternsForHierarchy = this.fewShotsToPatterns(mergedFewShots);
        const hierarchy = await this.buildAbstractionHierarchy(patternsForHierarchy, profileName);
        await learningUnitManager.saveHierarchy(learningUnitId, hierarchy);
        console.log(`✅ Built ${hierarchy.levels.length}-level abstraction hierarchy`);
      } catch (error) {
        console.warn(`⚠️  Failed to build hierarchy:`, error);
      }
    }

    // 5.6. Save failure learning data (Spec 19)
    if (antiPatterns.length > 0 || reasoningCorrections.length > 0) {
      console.log(`📛 Saving failure learning data...`);
      if (antiPatterns.length > 0) {
        await learningUnitManager.saveAntiPatterns(learningUnitId, antiPatterns);
        console.log(`   ↳ Saved ${antiPatterns.length} anti-patterns`);
      }
      if (reasoningCorrections.length > 0) {
        await learningUnitManager.saveReasoningCorrections(learningUnitId, reasoningCorrections);
        console.log(`   ↳ Saved ${reasoningCorrections.length} reasoning corrections`);
      }
    }

    // 6. Mark experiences as absorbed (copies to unit storage, deletes originals)
    const experienceIds = newExperiences.map((e) => e.id);
    // Pass full experiences to enable sticky experience model (copies + deletes originals)
    await learningUnitManager.markExperiencesAbsorbed(
      learningUnitId,
      experienceIds,
      this.computePuzzleBreakdown(newExperiences),
      newExperiences,  // Full experiences for unit-bound copies
      { preserveOriginals: this.preserveExperiences }
    );

    // Note: markConsolidated is no longer needed since sticky experience model
    // deletes global experiences after copying to unit storage (1b: consumed)

    console.log(`✅ Re-consolidation complete: absorbed ${experienceIds.length} experiences`);

    return {
      patterns: {
        successStrategies: newPatterns,
        commonErrors: [],
        wrongPathPatterns: [],
      },
      // Failure Learning (Spec 19)
      antiPatterns,
      reasoningCorrections,
      insights: `Re-consolidated ${experienceIds.length} new experiences into learning unit "${learningUnitId}"`,
      fewShotsUpdated: mergedFewShots.length,
      experiencesConsolidated: experienceIds.length,
      compressionRatio: newPatterns.length > 0 ? importantExperiences.length / newPatterns.length : 0,
    };
  }

  /**
   * Dual consolidation: Create both standard and doubled (-2x) learning units
   *
   * Spec 05 Section 8.4: Dual Mode Support
   *
   * IMPORTANT: Runs clustering ONCE and creates BOTH units from the same patterns.
   * This ensures consistent pattern coverage between standard (3-5) and doubled (6-10).
   *
   * Previous bug: Running clustering twice produced different patterns for each unit,
   * leading to 2x units having far fewer strategies than expected when the second
   * clustering pass produced only 2 valid patterns.
   *
   * @param learningUnitManager - Manager for the learning unit
   * @param learningUnitId - Base ID for the learning unit (without -2x suffix)
   * @param profileName - LLM profile name
   * @returns DualConsolidationResult with both reports
   */
  async consolidateDual(
    learningUnitManager: LearningUnitManager,
    learningUnitId: string,
    profileName: string,
    restrictToExperienceIds?: string[]
  ): Promise<DualConsolidationResult> {
    console.log(`\n🔄 Starting DUAL consolidation for "${learningUnitId}"`);
    console.log(`   Will create: "${learningUnitId}" (standard) + "${learningUnitId}${DOUBLE_STRATEGY_SUFFIX}" (doubled)`);
    console.log(`   🔧 Using SHARED clustering (v2 fix): Both units use same patterns`);

    const originalPreserveExperiences = this.preserveExperiences;
    console.log(`   Experience preservation: ${originalPreserveExperiences ? 'user-requested (keep after dual)' : 'delete after dual'}`);

    // Get all unconsolidated experiences
    let experiences = await this.experienceStore.getUnconsolidated(profileName);

    if (restrictToExperienceIds && restrictToExperienceIds.length > 0) {
      const beforeCount = experiences.length;
      experiences = experiences.filter(exp => restrictToExperienceIds.includes(exp.id));
      if (experiences.length < beforeCount) {
        console.log(`📦 Restricted to ${experiences.length} experiences (from ${beforeCount} total unconsolidated)`);
      }
    }

    if (experiences.length === 0) {
      console.log(`⚠️  No unconsolidated experiences to process`);
      return {
        standard: this.createEmptyReport(),
        doubled: this.createEmptyReport(),
      };
    }

    console.log(`📊 Found ${experiences.length} unconsolidated experiences`);

    // ============================================================
    // SHARED PHASE: Cluster and synthesize patterns ONCE
    // ============================================================
    console.log(`\n🔍 SHARED PHASE: Clustering and pattern synthesis (used by both units)`);

    // Filter by importance
    const importantExperiences = experiences
      .sort((a, b) => (b.importance ?? 0.5) - (a.importance ?? 0.5))
      .filter((e) => (e.importance ?? 0.5) >= 0.5);

    const lowImportanceCount = experiences.length - importantExperiences.length;
    if (lowImportanceCount > 0) {
      console.log(`   ↳ Filtered ${lowImportanceCount} low-importance experiences (< 0.5)`);
    }

    if (importantExperiences.length < 3) {
      console.log(`⚠️  Only ${importantExperiences.length} important experiences - need at least 3`);
      // Mark experiences as absorbed anyway
      await learningUnitManager.markExperiencesAbsorbed(
        learningUnitId,
        experiences.map((e) => e.id),
        this.computePuzzleBreakdown(experiences),
        experiences,
        { preserveOriginals: originalPreserveExperiences }
      );
      return {
        standard: this.createEmptyReport(),
        doubled: this.createEmptyReport(),
      };
    }

    // Group by outcome
    const successful = importantExperiences.filter((e) => e.validation.isCorrect);
    const invalid = importantExperiences.filter((e) => !e.validation.isValid);
    const validButWrong = importantExperiences.filter((e) => e.validation.isValid && !e.validation.isCorrect);

    console.log(`   ↳ Correct: ${successful.length}, Invalid: ${invalid.length}, Valid-but-wrong: ${validButWrong.length}`);

    // Use DOUBLED mode cluster target for more pattern diversity
    // This gives us enough patterns to select 6-10 for 2x mode
    this.setConsolidationOptions({ doubleStrategies: true });
    const clusterTarget = this.getClusterTarget(successful.length);
    console.log(`🔍 Clustering ${successful.length} experiences with ${this.clusteringAlgorithm.getIdentifier()}...`);
    console.log(`   Cluster target: ${clusterTarget} (using 2x target for diversity)`);

    const clusterResult = await this.clusteringAlgorithm.cluster(
      successful,
      clusterTarget,
      this.llmConfig
    );
    const clusters = clusterResult.clusters;
    console.log(`✅ Created ${clusters.size} clusters in ${clusterResult.metadata.processingTimeMs}ms`);

    // Synthesize patterns from clusters (ONCE, shared by both units)
    const sharedPatterns: SynthesizedPattern[] = [];
    for (const [clusterName, cluster] of clusters.entries()) {
      if (cluster.length >= 2) {
        console.log(`🧠 Synthesizing pattern from "${clusterName}" (${cluster.length} experiences)...`);
        try {
          const pattern = await this.synthesizePattern(cluster, clusterName);
          if (pattern) {
            sharedPatterns.push(pattern);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to synthesize pattern:`, error);
        }
      }
    }

    console.log(`✅ Synthesized ${sharedPatterns.length} SHARED patterns for both units`);

    // Secondary refinement: If not enough patterns for 2x mode, split largest clusters
    const minPatternsFor2x = DOUBLED_CONSOLIDATION_COUNTS.fewShotMin;
    if (sharedPatterns.length < minPatternsFor2x && sharedPatterns.length > 0) {
      console.log(`\n⚠️  Only ${sharedPatterns.length} patterns, need ${minPatternsFor2x} for 2x mode`);
      console.log(`🔄 Secondary refinement: splitting largest clusters...`);

      // Find clusters that could be split (sorted by size, descending)
      const sortedClusters = Array.from(clusters.entries())
        .filter(([_, exps]) => exps.length >= 4) // Need at least 4 to split into 2 clusters of 2
        .sort((a, b) => b[1].length - a[1].length);

      const patternsNeeded = minPatternsFor2x - sharedPatterns.length;
      let additionalPatterns = 0;

      for (const [clusterName, clusterExps] of sortedClusters) {
        if (additionalPatterns >= patternsNeeded) break;

        console.log(`   🔍 Splitting "${clusterName}" (${clusterExps.length} experiences)...`);
        try {
          const subPatterns = await this.splitClusterIntoSubPatterns(clusterExps, clusterName);
          if (subPatterns.length > 1) {
            // Replace original pattern with sub-patterns
            const originalIndex = sharedPatterns.findIndex(p => p.strategyName?.includes(clusterName.substring(0, 20)));
            if (originalIndex >= 0) {
              sharedPatterns.splice(originalIndex, 1);
            }
            sharedPatterns.push(...subPatterns);
            additionalPatterns += subPatterns.length - 1; // Net gain
            console.log(`   ✅ Split into ${subPatterns.length} sub-patterns`);
          }
        } catch (error) {
          console.warn(`   ⚠️  Failed to split cluster:`, error);
        }
      }

      console.log(`✅ After secondary refinement: ${sharedPatterns.length} SHARED patterns`);
    }

    if (sharedPatterns.length === 0) {
      console.log(`⚠️  No valid patterns synthesized - cannot create learning units`);
      // Mark experiences as absorbed anyway
      await learningUnitManager.markExperiencesAbsorbed(
        learningUnitId,
        experiences.map((e) => e.id),
        this.computePuzzleBreakdown(experiences),
        experiences,
        { preserveOriginals: originalPreserveExperiences }
      );
      return {
        standard: this.createEmptyReport(),
        doubled: this.createEmptyReport(),
      };
    }

    // Failure learning (shared)
    let antiPatterns: SynthesizedAntiPattern[] = [];
    let reasoningCorrections: ReasoningCorrection[] = [];

    if (invalid.length >= 3) {
      console.log(`   Clustering ${invalid.length} invalid moves by error type...`);
      antiPatterns = await this.synthesizeAntiPatternsFromClusters(invalid);
      console.log(`   ↳ Generated ${antiPatterns.length} anti-patterns`);
    }

    if (validButWrong.length >= 2) {
      console.log(`   Analyzing ${validButWrong.length} valid-but-wrong moves...`);
      reasoningCorrections = await this.analyzeWrongReasoning(validButWrong);
      console.log(`   ↳ Generated ${reasoningCorrections.length} reasoning corrections`);
    }

    // ============================================================
    // PHASE 1: Create STANDARD unit (3-5 strategies)
    // ============================================================
    console.log(`\n📦 Phase 1: Standard unit (${DEFAULT_CONSOLIDATION_COUNTS.fewShotMin}-${DEFAULT_CONSOLIDATION_COUNTS.fewShotMax} strategies)`);
    console.log(`   Selecting from ${sharedPatterns.length} shared patterns...`);

    this.setConsolidationOptions({ doubleStrategies: false });
    const standardFewShots = await this.generateFewShotsFromPatterns(sharedPatterns);
    console.log(`   ✅ Selected ${standardFewShots.length} strategies for standard unit`);

    // Save standard unit
    await learningUnitManager.saveFewShots(learningUnitId, standardFewShots);
    if (standardFewShots.length >= 2) {
      try {
        const patternsForHierarchy = this.fewShotsToPatterns(standardFewShots);
        const hierarchy = await this.buildAbstractionHierarchy(patternsForHierarchy, profileName);
        await learningUnitManager.saveHierarchy(learningUnitId, hierarchy);
        console.log(`   ✅ Built ${hierarchy.levels.length}-level hierarchy`);
      } catch (error) {
        console.warn(`   ⚠️  Failed to build hierarchy:`, error);
      }
    }

    // Save failure learning for standard unit
    if (antiPatterns.length > 0) {
      await learningUnitManager.saveAntiPatterns(learningUnitId, antiPatterns);
    }
    if (reasoningCorrections.length > 0) {
      await learningUnitManager.saveReasoningCorrections(learningUnitId, reasoningCorrections);
    }

    // ============================================================
    // PHASE 2: Create DOUBLED (-2x) unit (6-10 strategies)
    // ============================================================
    const doubledUnitId = `${learningUnitId}${DOUBLE_STRATEGY_SUFFIX}`;
    console.log(`\n📦 Phase 2: Doubled unit (${DOUBLED_CONSOLIDATION_COUNTS.fewShotMin}-${DOUBLED_CONSOLIDATION_COUNTS.fewShotMax} strategies)`);
    console.log(`   Target unit: "${doubledUnitId}"`);
    console.log(`   Selecting from ${sharedPatterns.length} shared patterns...`);

    this.setConsolidationOptions({ doubleStrategies: true });
    const doubledFewShots = await this.generateFewShotsFromPatterns(sharedPatterns);
    console.log(`   ✅ Selected ${doubledFewShots.length} strategies for doubled unit`);

    // Save doubled unit
    await learningUnitManager.saveFewShots(doubledUnitId, doubledFewShots);
    if (doubledFewShots.length >= 2) {
      try {
        const patternsForHierarchy = this.fewShotsToPatterns(doubledFewShots);
        const hierarchy = await this.buildAbstractionHierarchy(patternsForHierarchy, profileName);
        await learningUnitManager.saveHierarchy(doubledUnitId, hierarchy);
        console.log(`   ✅ Built ${hierarchy.levels.length}-level hierarchy`);
      } catch (error) {
        console.warn(`   ⚠️  Failed to build hierarchy:`, error);
      }
    }

    // Save failure learning for doubled unit (same data)
    if (antiPatterns.length > 0) {
      await learningUnitManager.saveAntiPatterns(doubledUnitId, antiPatterns);
    }
    if (reasoningCorrections.length > 0) {
      await learningUnitManager.saveReasoningCorrections(doubledUnitId, reasoningCorrections);
    }

    // ============================================================
    // PHASE 3: Mark experiences as absorbed (ONCE for both)
    // ============================================================
    console.log(`\n📦 Phase 3: Marking ${experiences.length} experiences as absorbed...`);

    // Mark absorbed for standard unit (with preservation for potential other algorithms)
    await learningUnitManager.markExperiencesAbsorbed(
      learningUnitId,
      experiences.map((e) => e.id),
      this.computePuzzleBreakdown(experiences),
      experiences,
      { preserveOriginals: true }  // Keep for doubled unit
    );

    // Mark absorbed for doubled unit (use original preservation setting)
    await learningUnitManager.markExperiencesAbsorbed(
      doubledUnitId,
      experiences.map((e) => e.id),
      this.computePuzzleBreakdown(experiences),
      experiences,
      { preserveOriginals: originalPreserveExperiences }
    );

    // Build reports
    const standardReport: ConsolidationReport = {
      patterns: {
        successStrategies: sharedPatterns.slice(0, standardFewShots.length),
        commonErrors: [],
        wrongPathPatterns: [],
      },
      antiPatterns,
      reasoningCorrections,
      insights: `Created standard unit with ${standardFewShots.length} strategies from ${experiences.length} experiences`,
      fewShotsUpdated: standardFewShots.length,
      experiencesConsolidated: experiences.length,
      compressionRatio: sharedPatterns.length > 0 ? experiences.length / sharedPatterns.length : 0,
    };

    const doubledReport: ConsolidationReport = {
      patterns: {
        successStrategies: sharedPatterns.slice(0, doubledFewShots.length),
        commonErrors: [],
        wrongPathPatterns: [],
      },
      antiPatterns,
      reasoningCorrections,
      insights: `Created doubled unit with ${doubledFewShots.length} strategies from ${experiences.length} experiences`,
      fewShotsUpdated: doubledFewShots.length,
      experiencesConsolidated: experiences.length,
      compressionRatio: sharedPatterns.length > 0 ? experiences.length / sharedPatterns.length : 0,
    };

    console.log(`\n✅ DUAL consolidation complete:`);
    console.log(`   Standard "${learningUnitId}": ${standardFewShots.length} strategies`);
    console.log(`   Doubled "${doubledUnitId}": ${doubledFewShots.length} strategies`);
    console.log(`   Shared patterns: ${sharedPatterns.length}`);

    return {
      standard: standardReport,
      doubled: doubledReport,
    };
  }

  /**
   * Merge new patterns with existing few-shots using LLM
   *
   * The LLM evaluates all strategies and selects the best diverse set,
   * removing duplicates and keeping the most effective ones.
   */
  private async mergeStrategies(
    existingFewShots: FewShotExample[],
    newPatterns: SynthesizedPattern[]
  ): Promise<FewShotExample[]> {
    // Format existing strategies
    const existingList = existingFewShots.map((fs, i) =>
      `E${i + 1}. "${fs.strategy}": ${fs.situation || fs.gridContext || 'General'}`
    ).join('\n');

    // Format new patterns
    const newList = newPatterns.map((p, i) =>
      `N${i + 1}. "${p.strategyName}": ${p.whenToUse}`
    ).join('\n');

    const prompt = `You have existing Sudoku strategies (E) and new strategies (N) to merge.

EXISTING STRATEGIES (proven effective):
${existingList}

NEW STRATEGIES (from recent experiences):
${newList}

Create a UNIFIED set of ${this.consolidationOptions.mergeMin}-${this.consolidationOptions.mergeMax} strategies by:
1. Keep existing strategies that are still valuable
2. Add new strategies that provide different insights
3. Remove duplicates (same technique, different wording)
4. Prefer more specific, actionable strategies

For each strategy in your merged set, indicate:
- Whether it's from EXISTING (E#) or NEW (N#) or a MERGE
- A brief justification

Respond in this format:
MERGED_STRATEGIES:
1. [E1 or N2 or MERGE] "Strategy Name": Justification
2. [source] "Strategy Name": Justification
...`;

    try {
      const result = await this.llmClient.chat(
        [
          {
            role: 'system',
            content: 'You are reviewing Sudoku strategies to create an optimal unified set. Be selective and prioritize diversity.',
          },
          { role: 'user', content: prompt },
        ],
        {
          validatePrompt: this.aispMode !== 'off', // NL stripped before validation
          validateResponse: this.aispMode === 'aisp-full',
          context: 'strategy-merge',
        }
      );

      // Parse the response to determine which strategies to keep
      const mergedFewShots = this.parseMergeResponse(
        result.content,
        existingFewShots,
        newPatterns
      );

      return mergedFewShots.length > 0 ? mergedFewShots : existingFewShots;
    } catch (error) {
      console.warn(`⚠️  LLM merge failed, keeping existing strategies:`, error);
      // Fallback: keep existing + add new patterns as few-shots
      const newFewShots = await this.generateFewShotsFromPatterns(newPatterns);
      return [...existingFewShots, ...newFewShots].slice(0, this.consolidationOptions.mergeMax);
    }
  }

  /**
   * Parse LLM merge response to extract selected strategies
   */
  private parseMergeResponse(
    response: string,
    existingFewShots: FewShotExample[],
    newPatterns: SynthesizedPattern[]
  ): FewShotExample[] {
    const result: FewShotExample[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      // Match patterns like: 1. [E1] "Strategy Name"
      const existingMatch = line.match(/\[E(\d+)\]/i);
      const newMatch = line.match(/\[N(\d+)\]/i);

      if (existingMatch) {
        const idx = parseInt(existingMatch[1]) - 1;
        if (idx >= 0 && idx < existingFewShots.length) {
          result.push(existingFewShots[idx]);
        }
      } else if (newMatch) {
        const idx = parseInt(newMatch[1]) - 1;
        if (idx >= 0 && idx < newPatterns.length) {
          // Convert pattern to few-shot, preserving LLM-determined abstraction level
          const pattern = newPatterns[idx];
          result.push({
            strategy: pattern.strategyName,
            abstractionLevel: pattern.abstractionLevel.level,
            situation: pattern.whenToUse,
            analysis: pattern.reasoningSteps.join('. '),
            move: { row: 0, col: 0, value: 0 },
            outcome: 'CORRECT',
          });
        }
      }
    }

    return result;
  }

  /**
   * Compute puzzle type breakdown from experiences
   */
  private computePuzzleBreakdown(experiences: LLMExperience[]): Record<string, number> {
    const breakdown: Record<string, number> = {};

    for (const exp of experiences) {
      // Extract puzzle info from puzzleId (format: "4x4-easy" or similar)
      const puzzleInfo = exp.puzzleId.replace('.json', '');
      breakdown[puzzleInfo] = (breakdown[puzzleInfo] || 0) + 1;
    }

    return breakdown;
  }

  /**
   * Split a large cluster into sub-patterns for secondary refinement
   *
   * Used when initial clustering produces fewer patterns than needed for 2x mode.
   * Asks LLM to identify 2-3 distinct sub-patterns within the cluster, then
   * categorizes experiences and synthesizes a pattern for each sub-cluster.
   *
   * @param experiences - The cluster experiences to split
   * @param clusterName - Original cluster name
   * @returns Array of synthesized patterns (2-3 patterns if successful)
   */
  private async splitClusterIntoSubPatterns(
    experiences: LLMExperience[],
    clusterName: string
  ): Promise<SynthesizedPattern[]> {
    // Need at least 4 experiences to split into 2 meaningful clusters
    if (experiences.length < 4) {
      return [];
    }

    // Sample experiences for LLM analysis (max 10 for efficiency)
    const sampleSize = Math.min(experiences.length, 10);
    const sampledExps = experiences.slice(0, sampleSize);

    // Build experience descriptions for analysis
    const experienceDescriptions = sampledExps.map((exp, i) => `
${i + 1}. Move: (${exp.move.row},${exp.move.col}) = ${exp.move.value}
   Reasoning: ${exp.move.reasoning.substring(0, 200)}${exp.move.reasoning.length > 200 ? '...' : ''}
`).join('\n');

    // Ask LLM to identify sub-patterns
    const systemPrompt = `You are analyzing Sudoku solving experiences to identify distinct sub-patterns within a cluster.
Your task is to identify 2-3 DISTINCT reasoning approaches within the given experiences.
Each sub-pattern should represent a meaningfully different way of approaching the same general strategy.`;

    const userPrompt = `The following ${sampledExps.length} experiences are from a cluster called "${clusterName}".
Identify 2-3 DISTINCT sub-patterns based on the reasoning differences.

Experiences:
${experienceDescriptions}

For each sub-pattern, provide:
1. A short name (2-4 words)
2. A brief description of what makes it distinct
3. Which experience numbers (1-${sampledExps.length}) belong to this sub-pattern

Format your response as:
SUB-PATTERN 1: [Name]
Description: [What makes it distinct]
Experiences: [comma-separated numbers]

SUB-PATTERN 2: [Name]
Description: [What makes it distinct]
Experiences: [comma-separated numbers]

SUB-PATTERN 3: [Name] (optional)
Description: [What makes it distinct]
Experiences: [comma-separated numbers]`;

    try {
      const result = await this.llmClient.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          validatePrompt: false,
          validateResponse: false,
          context: 'secondary-refinement',
        }
      );

      // Parse sub-pattern assignments
      const subPatternAssignments = this.parseSubPatternResponse(
        result.content,
        clusterName,
        sampledExps.length
      );

      if (subPatternAssignments.length < 2) {
        console.log(`   ⚠️  LLM found fewer than 2 sub-patterns`);
        return [];
      }

      // Create sub-clusters based on LLM assignments
      // For experiences not in sample, assign to sub-pattern based on similarity
      const subClusters: Map<string, LLMExperience[]> = new Map();

      // Initialize sub-clusters
      for (const sp of subPatternAssignments) {
        subClusters.set(sp.name, []);
      }

      // Assign sampled experiences based on LLM categorization
      for (const sp of subPatternAssignments) {
        for (const expIdx of sp.experienceIndices) {
          if (expIdx >= 0 && expIdx < sampledExps.length) {
            subClusters.get(sp.name)!.push(sampledExps[expIdx]);
          }
        }
      }

      // Assign remaining experiences (not in sample) to sub-patterns
      // Use simple keyword matching based on sub-pattern descriptions
      const remainingExps = experiences.slice(sampleSize);
      for (const exp of remainingExps) {
        const reasoning = exp.move.reasoning.toLowerCase();
        let bestMatch = subPatternAssignments[0].name;
        let bestScore = 0;

        for (const sp of subPatternAssignments) {
          // Simple keyword scoring based on description
          const keywords = sp.description.toLowerCase().split(/\s+/);
          const score = keywords.filter(kw => reasoning.includes(kw)).length;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = sp.name;
          }
        }

        subClusters.get(bestMatch)!.push(exp);
      }

      // Filter out sub-clusters that are too small (< 2 experiences)
      const validSubClusters = Array.from(subClusters.entries())
        .filter(([_, exps]) => exps.length >= 2);

      if (validSubClusters.length < 2) {
        console.log(`   ⚠️  Only ${validSubClusters.length} valid sub-clusters after filtering`);
        return [];
      }

      // Synthesize pattern for each sub-cluster
      const subPatterns: SynthesizedPattern[] = [];
      for (const [subName, subExps] of validSubClusters) {
        console.log(`      📝 Synthesizing sub-pattern "${subName}" (${subExps.length} experiences)...`);
        const pattern = await this.synthesizePattern(subExps, `${clusterName}/${subName}`);
        if (pattern) {
          subPatterns.push(pattern);
        }
      }

      return subPatterns;
    } catch (error) {
      console.warn(`   ⚠️  Failed to identify sub-patterns:`, error);
      return [];
    }
  }

  /**
   * Parse LLM response for sub-pattern identification
   */
  private parseSubPatternResponse(
    response: string,
    _clusterName: string,
    sampleSize: number
  ): Array<{ name: string; description: string; experienceIndices: number[] }> {
    const subPatterns: Array<{ name: string; description: string; experienceIndices: number[] }> = [];

    // Match SUB-PATTERN blocks
    const patternMatches = response.matchAll(/SUB-PATTERN\s*\d+:\s*(.+?)(?=\n)/gi);

    for (const match of patternMatches) {
      const name = match[1].trim();

      // Find the description line after this pattern
      const descMatch = response
        .substring(match.index || 0)
        .match(/Description:\s*(.+?)(?=\n)/i);
      const description = descMatch ? descMatch[1].trim() : name;

      // Find the experiences line
      const expMatch = response
        .substring(match.index || 0)
        .match(/Experiences:\s*(.+?)(?=\n|SUB-PATTERN|$)/i);

      let experienceIndices: number[] = [];
      if (expMatch) {
        // Parse comma-separated numbers or ranges
        const expStr = expMatch[1].trim();
        const numbers = expStr.match(/\d+/g);
        if (numbers) {
          experienceIndices = numbers
            .map(n => parseInt(n, 10) - 1) // Convert to 0-indexed
            .filter(n => n >= 0 && n < sampleSize);
        }
      }

      if (name && experienceIndices.length > 0) {
        subPatterns.push({ name, description, experienceIndices });
      }
    }

    return subPatterns;
  }

  /**
   * Create empty report
   */
  private createEmptyReport(): ConsolidationReport {
    return {
      patterns: {
        successStrategies: [],
        commonErrors: [],
        wrongPathPatterns: [],
      },
      insights: 'No new experiences to consolidate (need at least 5 high-importance experiences)',
      fewShotsUpdated: 0,
      experiencesConsolidated: 0,
    };
  }
}
