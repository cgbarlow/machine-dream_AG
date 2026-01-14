/**
 * Prompt Builder - Constructs prompts from puzzle state
 * Specification: docs/specs/11-llm-sudoku-player.md
 * Specification: docs/specs/16-aisp-mode-spec.md
 */

import type {
  LLMExperience,
  FewShotExample,
  SynthesizedPattern,
  SynthesizedAntiPattern,
  ReasoningCorrection,
} from './types.js';
import { BoardFormatter } from './BoardFormatter.js';
import { AISPBuilder, type ForbiddenMove } from './AISPBuilder.js';

/**
 * Prompt Builder
 *
 * Spec 11: Constructs prompts with:
 * - Current puzzle state (formatted grid)
 * - Move history for this puzzle
 * - Few-shot examples (when memory enabled)
 * - Enhanced strategy evaluation format (Spec 11 - Enhanced Prompt Format)
 *
 * Spec 16: AISP mode support
 * - --aisp: Convert prompts to AISP syntax (normal output)
 * - --aisp-full: Include AISP spec, expect AISP output
 */
export class PromptBuilder {
  private useAnonymousPatterns = false;
  private useAISP = false;
  private useAISPFull = false;
  private aispBuilder: AISPBuilder | null = null;

  /**
   * @param includeReasoning - Include reasoning snippets in move history
   * @param useEnhancedStrategies - Use new evaluation-based strategy format (default: true)
   */
  constructor(
    private includeReasoning: boolean = false,
    private useEnhancedStrategies: boolean = true
  ) {}

  /**
   * Enable/disable anonymous pattern mode
   *
   * When enabled, uses formatAnonymousPatterns() instead of named strategies.
   * This has shown to improve accuracy by removing strategy name overhead.
   */
  setAnonymousPatternMode(enabled: boolean): void {
    this.useAnonymousPatterns = enabled;
  }

  /**
   * Enable AISP mode
   *
   * Spec 16: AISP mode converts prompts to AISP syntax.
   * @param mode - 'off' | 'aisp' | 'aisp-full'
   */
  setAISPMode(mode: 'off' | 'aisp' | 'aisp-full'): void {
    this.useAISP = mode === 'aisp' || mode === 'aisp-full';
    this.useAISPFull = mode === 'aisp-full';
    if (this.useAISP && !this.aispBuilder) {
      this.aispBuilder = new AISPBuilder();
    }
  }

  /**
   * Build complete prompt for LLM
   *
   * @param gridState - Current 9x9 grid (0 = empty, 1-9 = filled)
   * @param experiencesToShow - Past experiences to display in move history (may be truncated)
   * @param fewShots - Few-shot examples from memory (if enabled)
   * @param allExperiences - FULL session history for forbidden list (Spec 11 - 2026-01-11 fix)
   *                         CRITICAL: Forbidden list must use full history to prevent old forbidden
   *                         moves from being "forgotten" when move history is truncated
   * @param profileSystemPrompt - Additional system prompt from profile (Spec 13)
   * @param antiPatterns - Anti-patterns from failure learning (Spec 19)
   * @param reasoningCorrections - Reasoning corrections from failure learning (Spec 19)
   */
  buildPrompt(
    gridState: number[][],
    experiencesToShow: LLMExperience[] = [],
    fewShots: FewShotExample[] = [],
    allExperiences?: LLMExperience[],
    profileSystemPrompt?: string,
    antiPatterns?: SynthesizedAntiPattern[],
    reasoningCorrections?: ReasoningCorrection[]
  ): string {
    // Spec 16: Route to AISP format when enabled
    if (this.useAISP && this.aispBuilder) {
      return this.buildAISPPrompt(gridState, experiencesToShow, fewShots, allExperiences);
    }

    const size = gridState.length;
    let prompt = '';

    // Option C (2026-01-11): Add explicit rejection feedback at TOP of prompt
    // This makes it immediately visible that the last move was rejected
    const lastExp = (allExperiences || experiencesToShow).slice(-1)[0];
    if (lastExp && (lastExp.validation.outcome === 'invalid' || lastExp.validation.outcome === 'valid_but_wrong')) {
      const { row, col, value } = lastExp.move;
      const reason = lastExp.validation.error || lastExp.validation.outcome.toUpperCase();
      prompt += `>>> YOUR LAST MOVE (${row},${col})=${value} WAS REJECTED: ${reason}\n`;
      prompt += `>>> YOU MUST CHOOSE A DIFFERENT CELL OR VALUE\n\n`;
    }

    // Simplified prompt: use only row format (no visual grid)
    prompt += 'CURRENT PUZZLE STATE:\n';
    for (let row = 0; row < size; row++) {
      const rowStr = gridState[row]
        .map(cell => cell === 0 ? '_' : cell.toString())
        .join(',');
      prompt += `R${row + 1}: ${rowStr}\n`;
    }
    prompt += '\n';

    // NOTE: Removed buildConstraintInfo() call - redundant with grid display
    // The grid already shows filled cells; listing them again wastes ~500 tokens

    // Add few-shot examples if memory enabled
    if (fewShots.length > 0) {
      if (this.useAnonymousPatterns) {
        prompt += this.formatAnonymousPatterns(fewShots);
      } else if (this.useEnhancedStrategies) {
        prompt += this.formatStrategiesWithEvaluation(fewShots);
      } else {
        prompt += this.formatFewShots(fewShots);
      }
      prompt += '\n\n';
    }

    // Add failure learning sections (Spec 19)
    if (antiPatterns && antiPatterns.length > 0) {
      prompt += this.formatAntiPatterns(antiPatterns);
      prompt += '\n\n';
    }

    if (reasoningCorrections && reasoningCorrections.length > 0) {
      prompt += this.formatReasoningCorrections(reasoningCorrections);
      prompt += '\n\n';
    }

    // Add move history for this puzzle
    if (experiencesToShow.length > 0) {
      prompt += 'YOUR PREVIOUS ATTEMPTS ON THIS PUZZLE:\n';
      prompt += this.formatMoveHistory(experiencesToShow);
      prompt += '\n\n';
    }

    // Add empty cell count
    const emptyCells = BoardFormatter.countEmptyCells(gridState);
    prompt += `Empty cells remaining: ${emptyCells}\n\n`;

    // CRITICAL: Build forbidden list from FULL history and place PROMINENTLY before the question
    // Strengthened positioning and language (Spec 11 - 2026-01-11)
    const forbiddenSource = allExperiences || experiencesToShow;
    const forbiddenMoves = this.extractForbiddenMoves(forbiddenSource);
    if (forbiddenMoves.length > 0) {
      const cappedMoves = forbiddenMoves.slice(0, 30);
      // Strong visual separator and warning language
      prompt += '════════════════════════════════════════\n';
      prompt += `BANNED MOVES (${cappedMoves.length} total) - WILL BE REJECTED:\n`;
      // Group in sets of 10 for readability
      for (let i = 0; i < cappedMoves.length; i += 10) {
        const group = cappedMoves.slice(i, i + 10).join(', ');
        prompt += `${group}\n`;
      }
      if (forbiddenMoves.length > 30) {
        prompt += `(+${forbiddenMoves.length - 30} more banned)\n`;
      }
      prompt += 'DO NOT attempt any move above. Choose a DIFFERENT cell or value.\n';
      prompt += '════════════════════════════════════════\n\n';
    }

    // Add per-profile system prompt if provided (Spec 13)
    if (profileSystemPrompt) {
      prompt += profileSystemPrompt + '\n\n';
    }

    prompt += 'What is your next move?';

    return prompt;
  }

  /**
   * Extract forbidden moves from experience history
   * Returns list of (cell,value) pairs that have been proven wrong
   */
  private extractForbiddenMoves(experiences: LLMExperience[]): string[] {
    const forbidden = new Set<string>();

    for (const exp of experiences) {
      // Track INVALID (rule violations) and VALID_BUT_WRONG (incorrect guesses) as forbidden
      // This prevents the LLM from repeatedly trying the same wrong move
      if (exp.validation.outcome === 'invalid' || exp.validation.outcome === 'valid_but_wrong') {
        const { row, col, value } = exp.move;
        forbidden.add(`(${row},${col})=${value}`);
      }
    }

    return Array.from(forbidden).sort();
  }

  // NOTE: buildConstraintInfo() was removed (2026-01-09)
  // It listed filled cells which is redundant - the grid already shows them.
  // This was adding ~500 tokens of noise per prompt.

  /**
   * Format move history with outcomes - facts only
   * Note: Caller is responsible for limiting experiences array if needed
   */
  private formatMoveHistory(experiences: LLMExperience[]): string {
    return experiences
      .map((exp) => {
        const { row, col, value } = exp.move;
        const outcome = this.formatOutcome(exp.validation);

        // Include reasoning snippet as factual record (if enabled)
        let reasoning = '';
        if (this.includeReasoning && exp.move.reasoning) {
          const snippet = exp.move.reasoning
            .replace(/\n/g, ' ')
            .substring(0, 80)
            .trim();
          reasoning = `\n  Your reasoning: "${snippet}${exp.move.reasoning.length > 80 ? '...' : ''}"`;
        }

        // Use actual move number instead of array index
        return `Move ${exp.moveNumber}: (${row},${col})=${value} → ${outcome}${reasoning}`;
      })
      .join('\n');
  }

  /**
   * Format validation outcome - factual only, no hints
   */
  private formatOutcome(validation: {
    outcome: 'correct' | 'invalid' | 'valid_but_wrong';
    error?: string;
  }): string {
    if (validation.outcome === 'correct') {
      return 'CORRECT';
    }
    if (validation.outcome === 'invalid') {
      // Include specific error for learning
      return `INVALID (${validation.error || 'Rule violation'})`;
    }
    return 'VALID_BUT_WRONG';
  }

  /**
   * Format few-shot examples from synthesized strategies
   *
   * Few-shots are now LLM-synthesized teaching examples, not raw move data.
   * Each teaches a strategy that can be applied to similar situations.
   *
   * @deprecated Use formatStrategiesWithEvaluation() for enhanced prompt format
   */
  private formatFewShots(fewShots: FewShotExample[]): string {
    if (fewShots.length === 0) return '';

    let result = 'LEARNED STRATEGIES FROM PREVIOUS PUZZLES:\n\n';

    fewShots.forEach((example, idx) => {
      // Use new synthesized format if available, fall back to legacy format
      const strategyName = example.strategy || `Strategy ${idx + 1}`;
      const situation = example.situation || example.gridContext || 'General puzzle solving';
      const analysis = example.analysis;

      result += `Strategy ${idx + 1}: ${strategyName}\n`;
      result += `When this applies: ${situation}\n`;
      result += `How I reasoned:\n${analysis}\n`;

      // Include example move if coordinates are valid
      if (example.move.row > 0 && example.move.col > 0) {
        result += `Result: Move (${example.move.row},${example.move.col}) = ${example.move.value} → ${example.outcome}\n`;
      }

      result += '\n---\n\n';
    });

    result += 'Apply these strategies when you see similar patterns.\n';

    return result.trim();
  }

  /**
   * Format strategies with explicit evaluation requirements
   *
   * Spec 11 - Enhanced Prompt Format:
   * Forces the LLM to explicitly evaluate each strategy before making a move.
   * Includes confidence ratings to ensure thoughtful application.
   *
   * Design principles:
   * - Explicit YES/NO evaluation required for each strategy
   * - Confidence rating (1-10) when applicable
   * - Threshold guidance (7+ to use a strategy)
   * - Clear fallback for when no strategy applies
   * - Concise language (under 100 words per strategy)
   */
  formatStrategiesWithEvaluation(fewShots: FewShotExample[]): string {
    if (fewShots.length === 0) return '';

    // Build strategy descriptions
    const strategies = fewShots.map((fs, i) => {
      const name = fs.strategy || `Strategy ${i + 1}`;
      const situation = fs.situation || fs.gridContext || 'When applicable';

      // Extract reasoning steps - either from analysis or construct from content
      let steps: string[];
      if (fs.analysis) {
        // Split analysis into numbered steps if possible
        const lines = fs.analysis.split(/\n|;|\.\s+/).filter(s => s.trim().length > 5);
        steps = lines.slice(0, 4).map(s => s.trim()); // Cap at 4 steps
      } else {
        steps = ['Analyze the current board state', 'Apply the strategy logic', 'Make the move'];
      }

      const stepsFormatted = steps.map((s, j) => `  ${j + 1}. ${s}`).join('\n');

      return `Strategy ${i + 1}: "${name}"
Situation: ${situation}
Steps:
${stepsFormatted}`;
    }).join('\n\n');

    return `LEARNED STRATEGIES - EVALUATE EACH BEFORE MOVING:

${strategies}

Before moving, for EACH strategy above:
1. Does this situation match the current board? (YES/NO)
2. If YES, what is your confidence (1-10)?

Use the highest-confidence applicable strategy (7+).
If none apply confidently, use your own reasoning.`;
  }

  /**
   * Format synthesized patterns with evaluation requirements
   *
   * Similar to formatStrategiesWithEvaluation but works with SynthesizedPattern objects
   * which have more structured data from the dreaming consolidation.
   */
  formatPatternsWithEvaluation(patterns: SynthesizedPattern[]): string {
    if (patterns.length === 0) return '';

    const strategies = patterns.map((p, i) => {
      const stepsFormatted = p.reasoningSteps.slice(0, 4).map((s, j) => `  ${j + 1}. ${s}`).join('\n');

      return `Strategy ${i + 1}: "${p.strategyName}"
Situation: ${p.whenToUse}
Steps:
${stepsFormatted}`;
    }).join('\n\n');

    return `LEARNED STRATEGIES - EVALUATE EACH BEFORE MOVING:

${strategies}

Before moving, for EACH strategy above:
1. Does this situation match the current board? (YES/NO)
2. If YES, what is your confidence (1-10)?

Use the highest-confidence applicable strategy (7+).
If none apply confidently, use your own reasoning.`;
  }

  /**
   * Format patterns in anonymous constraint-based format
   *
   * Spec 11 - Anonymous Pattern Mode:
   * Key differences from named strategies:
   * - No strategy names (Pattern A, B, C instead)
   * - Focus on situation detection
   * - Provides reasoning template to follow
   * - No YES/NO evaluation instructions
   *
   * This format has shown 62.5% accuracy vs 26-39% for named strategies.
   */
  formatAnonymousPatterns(fewShots: FewShotExample[]): string {
    if (fewShots.length === 0) return '';

    const patterns = fewShots.map((fs, i) => {
      const label = String.fromCharCode(65 + i);  // A, B, C...
      const situation = fs.situation || fs.gridContext || 'When applicable';
      const template = fs.reasoningTemplate ||
        'Cell (R,C). Row missing {X}. Col missing {Y}. Box missing {Z}. Intersection={V}.';
      const action = this.extractActionFromAnalysis(fs.analysis);

      return `Pattern ${label} - When you see: ${situation}
Do this: ${action}
Template: "${template}"`;
    }).join('\n\n');

    return `REASONING PATTERNS (apply when situation matches):

${patterns}

For each empty cell, check if any pattern applies.
Use the first matching pattern. Follow its template exactly.`;
  }

  /**
   * Extract the core action from analysis text
   * Takes the first sentence or line as the key action
   */
  private extractActionFromAnalysis(analysis: string): string {
    if (!analysis) return 'Apply constraint reasoning';
    const firstLine = analysis.split('\n')[0] || analysis.split('.')[0];
    return firstLine.trim().substring(0, 100);
  }

  /**
   * Format anti-patterns for the prompt
   *
   * Spec 19 Section 4.1: Anti-Pattern Section
   * Shows top 3 anti-patterns by frequency to help LLM avoid common mistakes.
   */
  formatAntiPatterns(antiPatterns: SynthesizedAntiPattern[]): string {
    if (!antiPatterns || antiPatterns.length === 0) return '';

    // Sort by frequency and take top 3 (Spec 19: limit 3 in prompt)
    const sorted = [...antiPatterns].sort((a, b) => b.frequency - a.frequency);
    const top3 = sorted.slice(0, 3);

    let output = '## COMMON MISTAKES TO AVOID\n\n';

    for (const ap of top3) {
      output += `### ❌ ${ap.antiPatternName}\n`;
      output += `**What goes wrong:** ${ap.whatGoesWrong}\n`;
      output += `**Why it fails:** ${ap.whyItFails}\n`;
      output += `**Prevention:**\n`;
      for (const step of ap.preventionSteps) {
        output += `- ${step}\n`;
      }
      output += '\n';
    }

    return output.trim();
  }

  /**
   * Format reasoning corrections for the prompt
   *
   * Spec 19 Section 4.2: Reasoning Corrections Section
   * Shows top 3 corrections by confidence to help LLM avoid reasoning traps.
   */
  formatReasoningCorrections(corrections: ReasoningCorrection[]): string {
    if (!corrections || corrections.length === 0) return '';

    // Sort by confidence and take top 3 (Spec 19: limit 3 in prompt)
    const sorted = [...corrections].sort((a, b) => b.confidence - a.confidence);
    const top3 = sorted.slice(0, 3);

    let output = '## REASONING TRAPS TO AVOID\n\n';

    for (const rc of top3) {
      output += `### ⚠️ Flawed reasoning pattern\n`;
      output += `**The trap:** ${rc.flawedReasoningStep}\n`;
      output += `**Correct approach:** ${rc.correction}\n`;
      output += `**Remember:** ${rc.generalPrinciple}\n\n`;
    }

    return output.trim();
  }

  /**
   * Build AISP-formatted prompt
   *
   * Spec 16: Converts prompt to AISP syntax for low-ambiguity communication.
   * Uses AISPBuilder to format grid, strategies, history, and forbidden moves.
   */
  private buildAISPPrompt(
    gridState: number[][],
    experiencesToShow: LLMExperience[],
    fewShots: FewShotExample[],
    allExperiences?: LLMExperience[]
  ): string {
    if (!this.aispBuilder) {
      throw new Error('AISPBuilder not initialized');
    }

    // Extract forbidden moves from all experiences
    const forbiddenSource = allExperiences || experiencesToShow;
    const forbidden: ForbiddenMove[] = [];

    for (const exp of forbiddenSource) {
      if (exp.validation.outcome === 'invalid' || exp.validation.outcome === 'valid_but_wrong') {
        forbidden.push({
          row: exp.move.row,
          col: exp.move.col,
          value: exp.move.value,
          reason: exp.validation.error || exp.validation.outcome,
        });
      }
    }

    // Build AISP prompt
    return this.aispBuilder.buildAISPPrompt(
      gridState,
      experiencesToShow,
      fewShots,
      forbidden,
      {
        includeSpec: this.useAISPFull,
        gridSize: gridState.length,
        anonymousPatterns: this.useAnonymousPatterns,
      }
    );
  }

}

