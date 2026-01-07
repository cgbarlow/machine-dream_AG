/**
 * Dreaming Consolidator - Pattern synthesis from LLM experiences
 * Specification: docs/specs/11-llm-sudoku-player.md
 * Specification: docs/specs/05-dreaming-pipeline-spec.md Section 8
 */

import type {
  LLMExperience,
  FewShotExample,
  ConsolidationReport,
  LLMPattern,
  LLMErrorPattern,
  LLMWrongPath,
  LLMConfig,
} from './types.js';
import { LMStudioClient } from './LMStudioClient.js';
import { ExperienceStore } from './ExperienceStore.js';

/**
 * Dreaming Consolidator
 *
 * Spec 11 Section: Dreaming Consolidation
 * Spec 05 Section 8: LLM Experience Consolidation
 *
 * Analyzes accumulated LLM experiences to:
 * - Extract successful patterns
 * - Identify common error types
 * - Analyze wrong path patterns
 * - Generate few-shot examples
 * - Synthesize meta-insights using LLM
 */
export class DreamingConsolidator {
  private llmClient: LMStudioClient;

  constructor(
    private experienceStore: ExperienceStore,
    _config: LLMConfig
  ) {
    this.llmClient = new LMStudioClient(_config);
  }

  /**
   * Run consolidation on unconsolidated experiences
   *
   * Spec 11: Dreaming Consolidation algorithm
   */
  async consolidate(): Promise<ConsolidationReport> {
    // 1. Load experiences since last consolidation
    const experiences = await this.experienceStore.getUnconsolidated();

    if (experiences.length === 0) {
      return this.createEmptyReport();
    }

    // 2. Group by outcome
    const successful = experiences.filter((e) => e.validation.isCorrect);
    const invalid = experiences.filter((e) => !e.validation.isValid);
    const wrong = experiences.filter(
      (e) => e.validation.isValid && !e.validation.isCorrect
    );

    // 3. Extract patterns
    const successStrategies = this.extractStrategies(successful);
    const commonErrors = this.groupErrors(invalid);
    const wrongPathPatterns = this.analyzeWrongPaths(wrong);

    // 4. Use LLM to synthesize insights
    const insights = await this.synthesizeInsights({
      successStrategies,
      commonErrors,
      wrongPathPatterns,
    });

    // 5. Generate few-shot examples from best patterns
    const fewShots = this.generateFewShots(successStrategies);

    // 6. Update few-shot examples in storage
    await this.experienceStore.saveFewShots(fewShots);

    // 7. Mark experiences as consolidated
    const experienceIds = experiences.map((e) => e.id);
    await this.experienceStore.markConsolidated(experienceIds);

    return {
      patterns: {
        successStrategies,
        commonErrors,
        wrongPathPatterns,
      },
      insights,
      fewShotsUpdated: fewShots.length,
      experiencesConsolidated: experiences.length,
    };
  }

  /**
   * Extract successful strategies from correct moves
   */
  private extractStrategies(successful: LLMExperience[]): LLMPattern[] {
    const patternMap = new Map<string, LLMPattern>();

    for (const exp of successful) {
      // Create pattern signature based on reasoning approach
      const signature = this.extractReasoningSignature(exp.move.reasoning);

      if (!patternMap.has(signature)) {
        patternMap.set(signature, {
          gridContext: this.describeGridContext(exp.gridState, exp.move),
          reasoning: exp.move.reasoning,
          move: {
            row: exp.move.row,
            col: exp.move.col,
            value: exp.move.value,
          },
          successRate: 0,
        });
      }

      // Increment success count
      const pattern = patternMap.get(signature)!;
      pattern.successRate += 1;
    }

    // Convert counts to rates
    const totalSuccessful = successful.length;
    const patterns = Array.from(patternMap.values());

    patterns.forEach((p) => {
      p.successRate = totalSuccessful > 0 ? p.successRate / totalSuccessful : 0;
    });

    // Sort by success rate and return top patterns
    return patterns.sort((a, b) => b.successRate - a.successRate).slice(0, 10);
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

      // Keep up to 3 examples per error type
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
   * Analyze wrong path patterns (valid but incorrect moves)
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
            value: 0, // We don't know the correct value here
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
   * Use LLM to synthesize high-level insights
   */
  private async synthesizeInsights(patterns: {
    successStrategies: LLMPattern[];
    commonErrors: LLMErrorPattern[];
    wrongPathPatterns: LLMWrongPath[];
  }): Promise<string> {
    const prompt = `Analyze these Sudoku solving experiences and extract strategic insights:

SUCCESSFUL PATTERNS (${patterns.successStrategies.length} patterns):
${patterns.successStrategies
  .slice(0, 5)
  .map(
    (p, i) =>
      `${i + 1}. ${p.gridContext}
   Reasoning: ${p.reasoning.substring(0, 200)}
   Success rate: ${(p.successRate * 100).toFixed(1)}%`
  )
  .join('\n\n')}

COMMON ERRORS (${patterns.commonErrors.length} error types):
${patterns.commonErrors
  .slice(0, 5)
  .map(
    (e, i) => `${i + 1}. ${e.errorType} (occurred ${e.frequency} times)
   Example: ${e.examples[0]?.error || 'N/A'}`
  )
  .join('\n\n')}

WRONG PATH PATTERNS (${patterns.wrongPathPatterns.length} patterns):
${patterns.wrongPathPatterns
  .slice(0, 3)
  .map(
    (w, i) => `${i + 1}. ${w.context}
   Wrong move: (${w.wrongMove.row},${w.wrongMove.col})=${w.wrongMove.value}
   Frequency: ${w.frequency}`
  )
  .join('\n\n')}

Please provide:
1. Key strategic insights (what works well)
2. Common pitfalls to avoid
3. Suggested improvements for reasoning approach

Keep the analysis concise (3-5 bullet points per section).`;

    try {
      const response = await this.llmClient.chat([
        {
          role: 'system',
          content:
            'You are analyzing Sudoku solving patterns to help improve strategic reasoning.',
        },
        { role: 'user', content: prompt },
      ]);

      return response;
    } catch (error) {
      // If LLM synthesis fails, return a basic summary
      return this.createBasicInsightsSummary(patterns);
    }
  }

  /**
   * Generate few-shot examples from top patterns
   */
  private generateFewShots(patterns: LLMPattern[]): FewShotExample[] {
    return patterns
      .slice(0, 5) // Top 5 patterns
      .map((pattern) => ({
        gridContext: pattern.gridContext,
        analysis: pattern.reasoning,
        move: pattern.move,
        outcome: 'CORRECT' as const,
      }));
  }

  /**
   * Extract reasoning signature for pattern matching
   */
  private extractReasoningSignature(reasoning: string): string {
    // Extract key phrases that indicate reasoning approach
    const keywords = [
      'only candidate',
      'missing from row',
      'missing from column',
      'missing from box',
      'constraint',
      'elimination',
      'naked single',
      'hidden single',
    ];

    const found = keywords.filter((kw) =>
      reasoning.toLowerCase().includes(kw.toLowerCase())
    );

    return found.length > 0 ? found.join(',') : 'general';
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

    // Count filled cells in row, col, box
    const filledInRow = gridState[row].filter((v) => v !== 0).length;
    const filledInCol = gridState.map((r) => r[col]).filter((v) => v !== 0)
      .length;

    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    let filledInBox = 0;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (gridState[r][c] !== 0) filledInBox++;
      }
    }

    return `Cell (${move.row},${move.col}): row ${filledInRow}/9 filled, col ${filledInCol}/9 filled, box ${filledInBox}/9 filled`;
  }

  /**
   * Categorize error type from error message
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
   * Create basic insights summary when LLM synthesis fails
   */
  private createBasicInsightsSummary(patterns: {
    successStrategies: LLMPattern[];
    commonErrors: LLMErrorPattern[];
    wrongPathPatterns: LLMWrongPath[];
  }): string {
    let summary = '## Consolidation Summary\n\n';

    summary += `### Successful Strategies\n`;
    summary += `- ${patterns.successStrategies.length} unique successful patterns identified\n`;
    if (patterns.successStrategies.length > 0) {
      summary += `- Top pattern: ${patterns.successStrategies[0].gridContext}\n`;
    }

    summary += `\n### Common Errors\n`;
    patterns.commonErrors.slice(0, 3).forEach((e) => {
      summary += `- ${e.errorType}: ${e.frequency} occurrences\n`;
    });

    summary += `\n### Wrong Paths\n`;
    summary += `- ${patterns.wrongPathPatterns.length} valid-but-wrong patterns identified\n`;

    return summary;
  }

  /**
   * Create empty report when no experiences to consolidate
   */
  private createEmptyReport(): ConsolidationReport {
    return {
      patterns: {
        successStrategies: [],
        commonErrors: [],
        wrongPathPatterns: [],
      },
      insights: 'No new experiences to consolidate',
      fewShotsUpdated: 0,
      experiencesConsolidated: 0,
    };
  }
}
