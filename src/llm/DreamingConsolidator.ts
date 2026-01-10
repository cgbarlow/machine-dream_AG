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
  LLMErrorPattern,
  LLMWrongPath,
  LLMConfig,
  SynthesizedPattern,
  AbstractionHierarchy,
  HierarchyLevel,
} from './types.js';
import { LMStudioClient } from './LMStudioClient.js';
import { ExperienceStore } from './ExperienceStore.js';

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
  private llmClient: LMStudioClient;

  constructor(
    private experienceStore: ExperienceStore,
    config: LLMConfig
  ) {
    this.llmClient = new LMStudioClient(config);
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
    console.log(`🔍 Clustering by reasoning approach...`);
    const clusters = this.clusterByReasoning(successful);

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
      insights,
      fewShotsUpdated: fewShots.length,
      experiencesConsolidated: experiences.length,
      compressionRatio,
      abstractionLevels: hierarchy?.levels.length,
    };
  }

  /**
   * Cluster experiences by reasoning approach
   * Uses keyword extraction to group similar reasoning patterns
   */
  private clusterByReasoning(experiences: LLMExperience[]): Map<string, LLMExperience[]> {
    const clusters = new Map<string, LLMExperience[]>();

    for (const exp of experiences) {
      const signature = this.extractReasoningSignature(exp.move.reasoning);

      if (!clusters.has(signature)) {
        clusters.set(signature, []);
      }
      clusters.get(signature)!.push(exp);
    }

    return clusters;
  }

  /**
   * LLM synthesizes a reusable pattern from a cluster of experiences
   *
   * This is the "dreaming brain" analyzing what worked.
   *
   * CRITICAL: Uses FULL reasoning chain, never truncated!
   */
  private async synthesizePattern(
    cluster: LLMExperience[],
    clusterName: string
  ): Promise<SynthesizedPattern | null> {
    // Build prompt with FULL reasoning for each experience
    const experienceDescriptions = cluster.slice(0, 5).map((exp, i) => `
${i + 1}. Grid context: ${this.describeGridContext(exp.gridState, exp.move)}
   Your move: (${exp.move.row},${exp.move.col}) = ${exp.move.value}

   YOUR FULL REASONING:
   ${exp.move.reasoning}
`).join('\n');

    const prompt = `You are reviewing ${cluster.length} successful Sudoku moves you made.
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
EXAMPLE: [One clear example showing the strategy in action from the experiences above]
SUCCESS_INSIGHT: [Why this approach reliably works - the underlying principle]
CONFIDENCE: [A number 0.0-1.0 indicating how reliable this strategy is]`;

    try {
      const response = await this.llmClient.chat([
        {
          role: 'system',
          content: 'You are reflecting on your Sudoku solving experiences to extract reusable strategies. Be specific and practical.',
        },
        { role: 'user', content: prompt },
      ]);

      return this.parsePatternResponse(response, clusterName, cluster.length);
    } catch (error) {
      console.warn(`Failed to synthesize pattern:`, error);
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

      return {
        strategyName,
        clusterName,
        whenToUse,
        reasoningSteps,
        example,
        successInsight,
        abstractionLevel: {
          level: 1, // Named technique level by default
          name: 'Technique',
          description: 'A named technique extracted from successful moves',
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
   */
  private extractField(response: string, fieldName: string): string | null {
    // Match field content until we hit another FIELD: marker (allowing blank lines before it)
    const regex = new RegExp(`${fieldName}:\\s*(.+?)(?=\\n\\s*[A-Z_]+:|$)`, 's');
    const match = response.match(regex);
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
   */
  private async buildAbstractionHierarchy(
    patterns: SynthesizedPattern[],
    profileName?: string
  ): Promise<AbstractionHierarchy> {
    const patternList = patterns.map(p => `- ${p.strategyName}: ${p.whenToUse}`).join('\n');

    const prompt = `You have ${patterns.length} Sudoku solving strategies. Organize them into a 4-level abstraction hierarchy.

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

    try {
      const response = await this.llmClient.chat([
        {
          role: 'system',
          content: 'You are organizing Sudoku strategies into an abstraction hierarchy, from specific to general.',
        },
        { role: 'user', content: prompt },
      ]);

      return this.parseHierarchyResponse(response, patterns.length, profileName);
    } catch (error) {
      // Return a basic hierarchy if LLM fails
      return this.createBasicHierarchy(patterns, profileName);
    }
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
          items: patterns.map(p => p.strategyName),
        },
      ],
      profileName: profileName || 'default',
      createdAt: new Date(),
      totalPatterns: patterns.length,
    };
  }

  /**
   * Generate few-shot examples from synthesized patterns
   *
   * Few-shots are LLM-synthesized teaching examples, NOT raw move data
   * Uses LLM to select diverse strategies (Spec 11 - LLM-Driven Diversity)
   */
  private async generateFewShotsFromPatterns(
    patterns: SynthesizedPattern[]
  ): Promise<FewShotExample[]> {
    if (patterns.length === 0) return [];

    // If only 1-2 patterns, no need for diversity selection
    if (patterns.length <= 2) {
      return patterns.map((pattern) => ({
        strategy: pattern.strategyName,
        abstractionLevel: pattern.abstractionLevel.level,
        situation: pattern.whenToUse,
        analysis: pattern.reasoningSteps.join('\n'),
        move: { row: 0, col: 0, value: 0 },
        outcome: 'CORRECT' as const,
        gridContext: pattern.example,
      }));
    }

    // Use LLM to select diverse strategies
    console.log(`🎯 Asking LLM to select diverse strategies from ${patterns.length} patterns...`);

    const prompt = `You have synthesized ${patterns.length} Sudoku strategies from your experiences.

Your strategies:
${patterns.map((p, i) => `${i + 1}. ${p.strategyName}: ${p.whenToUse}`).join('\n')}

Now select 3-5 DIVERSE strategies to remember as few-shot examples.

CRITICAL: Ensure diversity!
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

    try {
      const response = await this.llmClient.chat([
        {
          role: 'system',
          content: 'You are selecting diverse Sudoku strategies. Be strict about avoiding duplicates.',
        },
        { role: 'user', content: prompt },
      ]);

      // Parse selected indices from LLM response
      const selectedIndices = this.parseSelectedStrategies(response, patterns.length);
      console.log(`   LLM selected ${selectedIndices.length} diverse strategies: ${selectedIndices.join(', ')}`);

      // Map selected indices to patterns
      const selectedPatterns = selectedIndices
        .filter(i => i >= 0 && i < patterns.length)
        .map(i => patterns[i]);

      // Fallback if parsing failed
      if (selectedPatterns.length === 0) {
        console.log(`   ⚠️ LLM selection parsing failed, using first 3 patterns`);
        return patterns.slice(0, 3).map((pattern) => ({
          strategy: pattern.strategyName,
          abstractionLevel: pattern.abstractionLevel.level,
          situation: pattern.whenToUse,
          analysis: pattern.reasoningSteps.join('\n'),
          move: { row: 0, col: 0, value: 0 },
          outcome: 'CORRECT' as const,
          gridContext: pattern.example,
        }));
      }

      return selectedPatterns.map((pattern) => ({
        strategy: pattern.strategyName,
        abstractionLevel: pattern.abstractionLevel.level,
        situation: pattern.whenToUse,
        analysis: pattern.reasoningSteps.join('\n'),
        move: { row: 0, col: 0, value: 0 },
        outcome: 'CORRECT' as const,
        gridContext: pattern.example,
      }));

    } catch (error) {
      console.warn(`   ⚠️ LLM diversity selection failed:`, error);
      // Fallback to first 3 patterns
      return patterns.slice(0, 3).map((pattern) => ({
        strategy: pattern.strategyName,
        abstractionLevel: pattern.abstractionLevel.level,
        situation: pattern.whenToUse,
        analysis: pattern.reasoningSteps.join('\n'),
        move: { row: 0, col: 0, value: 0 },
        outcome: 'CORRECT' as const,
        gridContext: pattern.example,
      }));
    }
  }

  /**
   * Parse selected strategy indices from LLM response
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

    return indices.slice(0, 5); // Max 5 strategies
  }

  /**
   * LLM-driven anti-pattern synthesis from invalid moves
   *
   * Spec 11: Negative Example Learning (2026-01-09)
   * The LLM analyzes its mistakes and synthesizes anti-patterns.
   * Returns free-text summary that can be included in insights.
   */
  async synthesizeAntiPatterns(invalid: LLMExperience[]): Promise<string> {
    if (invalid.length < 3) {
      return ''; // Need at least 3 errors to be meaningful
    }

    console.log(`🔍 Asking LLM to analyze ${invalid.length} mistakes and identify anti-patterns...`);

    const mistakesList = invalid.slice(0, 20).map((exp, i) => `
${i + 1}. Move (${exp.move.row},${exp.move.col})=${exp.move.value}
   Error: ${exp.validation.error}
   Your reasoning: ${exp.move.reasoning.substring(0, 200)}...`).join('\n');

    const prompt = `You made ${invalid.length} invalid moves during Sudoku solving.

Your mistakes:
${mistakesList}

Analyze your mistakes and identify ANTI-PATTERNS - things you should NOT do.

For each anti-pattern you identify, explain:
1. MISTAKE: What you did wrong (the pattern of error)
2. WHY_WRONG: Why this approach fails
3. INSTEAD: What to do instead

Focus on the most common/impactful mistakes. Synthesize patterns, don't just list individual errors.
Identify at most 3 anti-patterns.`;

    try {
      const response = await this.llmClient.chat([
        {
          role: 'system',
          content: 'You are analyzing your Sudoku solving mistakes to identify patterns of errors.',
        },
        { role: 'user', content: prompt },
      ]);

      console.log(`   ✅ LLM synthesized anti-patterns`);
      return response;
    } catch (error) {
      console.warn(`   ⚠️ LLM anti-pattern synthesis failed:`, error);
      return '';
    }
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
   * Extract reasoning signature for clustering
   */
  private extractReasoningSignature(reasoning: string): string {
    const keywords = [
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
    ];

    const lower = reasoning.toLowerCase();
    const found = keywords.filter((kw) => lower.includes(kw));

    return found.length > 0 ? found.slice(0, 2).join('_') : 'general_reasoning';
  }

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
