/**
 * AISP Builder - Converts prompts to AISP (AI Specification Protocol) format
 * Specification: docs/specs/16-aisp-mode-spec.md
 *
 * AISP provides low-ambiguity (Ambig < 0.02) AI-to-AI communication using
 * formal mathematical notation from Category Theory and Natural Deduction.
 *
 * Key insight: AIs understand AISP natively. The AISP spec is needed to
 * GENERATE AISP-compliant output, not to interpret it.
 */

import type { FewShotExample, LLMExperience } from './types.js';

/**
 * AISP Mode options
 */
export type AISPMode = 'off' | 'aisp' | 'aisp-lite' | 'aisp-full';

/**
 * Forbidden move for AISP constraint block
 */
export interface ForbiddenMove {
  row: number;
  col: number;
  value: number;
  reason: string;
}

/**
 * Options for AISP prompt generation
 */
export interface AISPOptions {
  includeSpec?: boolean;      // Include AISP spec summary (--aisp-full)
  gridSize?: number;          // 4, 9, 16, etc.
  anonymousPatterns?: boolean; // Use anonymous pattern format
}

/**
 * AISP Builder
 *
 * Converts machine-dream prompt sections to AISP syntax.
 * AIs understand AISP natively - no interpretation needed.
 */
export class AISPBuilder {
  /**
   * Build AISP-formatted grid state
   *
   * Converts 2D grid to tensor notation:
   * board≜Vec₉(Vec₉(Fin₁₀))
   * board[0]≔⟨1,0,0,0,0,7,0,9,0⟩
   */
  buildGrid(grid: number[][]): string {
    const size = grid.length;
    const lines: string[] = [
      `⟦Σ:State⟧{`,
      `  board≜Vec${this.subscript(size)}(Vec${this.subscript(size)}(Fin${this.subscript(size + 1)}))`,
    ];

    // Add each row
    for (let r = 0; r < size; r++) {
      const row = grid[r].join(',');
      lines.push(`  board[${r}]≔⟨${row}⟩`);
    }

    // Add empty cells set
    const emptyCells: string[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) {
          emptyCells.push(`(${r + 1},${c + 1})`);
        }
      }
    }
    lines.push(`  empty≔{${emptyCells.join(',')}}`);
    lines.push(`}`);

    return lines.join('\n');
  }

  /**
   * Build AISP-formatted few-shot strategies
   *
   * ⟦Λ:Strategies⟧{
   *   ⟦Λ:S1⟧{
   *     when≜∃!cell∈row:cell=0
   *     action≜cell←{1..9}∖row
   *   }
   * }
   */
  buildFewShots(examples: FewShotExample[], options?: AISPOptions): string {
    if (examples.length === 0) {
      return '';
    }

    const lines: string[] = ['⟦Λ:Strategies⟧{'];

    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];
      const strategyId = options?.anonymousPatterns || ex.isAnonymous
        ? `S${i + 1}`
        : ex.strategy || `S${i + 1}`;

      lines.push(`  ⟦Λ:${this.sanitizeId(strategyId)}⟧{`);

      // Use AISP-encoded version if available
      if (ex.aispEncoded) {
        lines.push(`    ${ex.aispEncoded}`);
      } else {
        // Convert natural language to AISP-like format
        lines.push(`    when≜${this.toAISPCondition(ex.situation)}`);
        lines.push(`    action≜${this.toAISPAction(ex.analysis)}`);
        if (ex.reasoningTemplate) {
          lines.push(`    template≜"${ex.reasoningTemplate}"`);
        }
        lines.push(`    example≜"R${ex.move.row}C${ex.move.col}←${ex.move.value}"`);
      }

      lines.push(`  }`);
    }

    lines.push(`}`);
    return lines.join('\n');
  }

  /**
   * Build AISP-formatted move history
   *
   * ⟦Γ:History⟧{
   *   move[1]≔(3,5,7)⊕CORRECT
   *   move[2]≔(2,8,4)⊖INVALID:"violates row"
   * }
   */
  buildHistory(experiences: LLMExperience[]): string {
    if (experiences.length === 0) {
      return '';
    }

    const lines: string[] = ['⟦Γ:History⟧{'];

    for (let i = 0; i < experiences.length; i++) {
      const exp = experiences[i];
      const move = exp.move;
      const outcome = exp.validation.outcome;

      let symbol: string;
      let suffix = '';

      switch (outcome) {
        case 'correct':
          symbol = '⊕';
          suffix = 'CORRECT';
          break;
        case 'invalid':
          symbol = '⊖';
          suffix = `INVALID:"${exp.validation.error || 'constraint violation'}"`;
          break;
        case 'valid_but_wrong':
          symbol = '⊘';
          suffix = 'WRONG';
          break;
        default:
          symbol = '?';
          suffix = 'UNKNOWN';
      }

      lines.push(`  move[${i + 1}]≔(${move.row},${move.col},${move.value})${symbol}${suffix}`);
    }

    lines.push(`}`);
    return lines.join('\n');
  }

  /**
   * Build AISP-formatted forbidden moves
   *
   * ⟦Χ:Forbidden⟧{
   *   ;; CRITICAL: These moves WILL be rejected. Do NOT attempt.
   *   ¬(1,1,5):"already attempted"
   *   ¬(3,7,9):"violates box"
   *   constraint≔HARD
   *   ¬retry(forbidden)
   * }
   */
  buildForbidden(moves: ForbiddenMove[]): string {
    if (moves.length === 0) {
      return '';
    }

    const lines: string[] = [
      '⟦Χ:Forbidden⟧{',
      '  ;; CRITICAL: These moves WILL be rejected. Do NOT attempt.',
    ];

    for (const m of moves) {
      lines.push(`  ¬(${m.row},${m.col},${m.value}):"${m.reason}"`);
    }

    lines.push(`  constraint≔HARD`);
    lines.push(`  ¬retry(forbidden)`);
    lines.push(`}`);
    return lines.join('\n');
  }

  /**
   * Build complete AISP-formatted prompt
   */
  buildAISPPrompt(
    grid: number[][],
    history: LLMExperience[],
    fewShots: FewShotExample[],
    forbidden: ForbiddenMove[],
    options?: AISPOptions
  ): string {
    const size = options?.gridSize ?? grid.length;
    const date = new Date().toISOString().split('T')[0];

    const sections: string[] = [
      `𝔸1.0.sudoku@${date}`,
      `γ≔sudoku.solving.${size}x${size}`,
      '',
    ];

    // Add AISP spec summary if in full mode
    if (options?.includeSpec) {
      sections.push(this.getAISPSpecSummary());
      sections.push('');
    }

    // Add grid state
    sections.push(this.buildGrid(grid));
    sections.push('');

    // Add strategies if available
    if (fewShots.length > 0) {
      sections.push(this.buildFewShots(fewShots, options));
      sections.push('');
    }

    // Add history if available
    if (history.length > 0) {
      sections.push(this.buildHistory(history));
      sections.push('');
    }

    // Add forbidden moves if available
    if (forbidden.length > 0) {
      sections.push(this.buildForbidden(forbidden));
      sections.push('');
    }

    // Add execution block
    sections.push(this.buildExecutionBlock(options));

    return sections.join('\n');
  }

  /**
   * Build execution instruction block with explicit output format examples (FR-08)
   */
  private buildExecutionBlock(options?: AISPOptions): string {
    const lines: string[] = ['⟦Ε:Execute⟧{'];

    lines.push(`  ⊢?next_move∈empty∧valid(next_move)`);

    if (options?.includeSpec) {
      // Full AISP mode - expect AISP output
      lines.push(`  mode≔AISP_FULL`);
      lines.push(`  ∀reasoning:output∈AISP`);
      lines.push(`  format≔⟦Σ:Analysis⟧{...}⟦Ε:Move⟧{(r,c,v)⊢proof}`);
      lines.push('');
      lines.push('  ;; REQUIRED OUTPUT FORMAT - Your response MUST include:');
      lines.push('  ;; ⟦Σ:Analysis⟧{cell≜(r,c);candidates≔{...}}');
      lines.push('  ;; ⟦Ε:Move⟧{(r,c,v)⊢reason}');
      lines.push('  ;; Example: ⟦Ε:Move⟧{(3,6,6)⊢candidates={6}∧|candidates|=1}');
    } else {
      // Standard AISP mode - expect normal output
      lines.push(`  output≔"REASONING: ...\\nROW: r\\nCOL: c\\nVALUE: v"`);
      lines.push('');
      lines.push('  ;; REQUIRED OUTPUT FORMAT - Your response MUST include:');
      lines.push('  ;; ROW: <number 1-9>');
      lines.push('  ;; COL: <number 1-9>');
      lines.push('  ;; VALUE: <number 1-9>');
      lines.push('  ;; REASONING: <brief explanation>');
      lines.push('');
      lines.push('  ;; Example output:');
      lines.push('  ;; ROW: 3');
      lines.push('  ;; COL: 6');
      lines.push('  ;; VALUE: 6');
      lines.push('  ;; REASONING: Cell (3,6) can only be 6 - all other values appear in row, column, or box.');
    }

    lines.push(`}`);
    return lines.join('\n');
  }

  /**
   * Get AISP specification summary for --aisp-full mode
   *
   * This is a condensed version of the AISP spec that AIs can use
   * as a reference for pure AISP reasoning.
   */
  getAISPSpecSummary(): string {
    return `⟦Ω:AISP.Reference⟧{
  ;; AISP symbols
  𝔄≜{⊤⊥∧∨¬→⇒∀∃∃!λΠΣ≜≡≢∈∉⊂⊃∪∩⊕⊖⊗⟨⟩⟦⟧⊢⊨∎}

  ;; Logic operators
  ⊤≔true; ⊥≔false; ∧≔and; ∨≔or; ¬≔not; →≔implies; ⇒≔entails
  ∀≔forall; ∃≔exists; ∃!≔unique_exists

  ;; Set operators
  ∈≔in; ∉≔notin; ∪≔union; ∩≔intersect; ∖≔setminus

  ;; Definition operators
  ≜≔defined_as; ≔≔assign; ←≔gets

  ;; Result operators
  ⊕≔success; ⊖≔failure; ⊗≔product; ⊘≔reject

  ;; Block types
  ⟦Σ⟧≔types/state; ⟦Λ⟧≔functions; ⟦Γ⟧≔context; ⟦Χ⟧≔constraints; ⟦Ε⟧≔execute
}`;
  }

  /**
   * Get AISP Generation Specification
   *
   * Essential sections needed for generating AISP-compliant output.
   * This is a curated ~80-100 line subset of the full AISP Platinum spec
   * containing only what's needed for generation, not interpretation.
   *
   * Includes:
   * - Quick Reference (essential symbols)
   * - Template (document structure)
   * - Rosetta Stone (Prose↔AISP examples)
   * - Agent Guide (enforcement rules) - CRITICAL
   * - Grammar (block structure)
   */
  getAISPGenerationSpec(): string {
    return `⟦Σ:QuickRef⟧{
  Core≜{≜:def,≔:assign,≡:identical,⇒:implies,↔:iff,∀:all,∃:exists,∃!:unique,∈:elem,⊆:subset,∧:and,∨:or,¬:not,⊤:true,⊥:false,λ:lambda,∘:compose,→:func,↦:mapsto,⟨⟩:tuple,⟦⟧:block,∅:empty}
  Tiers≜{◊⁺⁺:δ≥0.75,◊⁺:δ≥0.60,◊:δ≥0.40,◊⁻:δ≥0.20,⊘:δ<0.20}
  Blocks≜{⟦Ω⟧:meta,⟦Σ⟧:types,⟦Γ⟧:rules,⟦Λ⟧:funcs,⟦Χ⟧:constraints,⟦Ε⟧:evidence}
}

⟦Σ:Template⟧{
  ;; Minimal AISP document structure
  Minimal≜𝔸X.Y.name@YYYY-MM-DD∘γ≔ctx∘⟦Σ⟧{state}∘⟦Λ⟧{funcs}∘⟦Ε⟧{output}

  ;; Full document structure
  Full≜𝔸X.Y.name@YYYY-MM-DD∘γ≔domain∘ρ≔⟨tags⟩∘⟦Ω⟧{rules}∘⟦Σ⟧{types}∘⟦Γ⟧{context}∘⟦Λ⟧{funcs}∘⟦Χ⟧{constraints}∘⟦Ε⟧{evidence}

  Required≜{⟦Σ⟧,⟦Λ⟧,⟦Ε⟧}; Optional≜{⟦Ω⟧,⟦Γ⟧,⟦Χ⟧}
}

⟦Σ:Rosetta⟧{
  ;; Prose→AISP translation examples
  "x defined as 5"↦x≜5
  "for all x in S, P holds"↦∀x∈S:P(x)
  "exists unique x such that"↦∃!x:f(x)≡0
  "A implies B"↦A⇒B
  "f maps input to output"↦f:I→O,f≜λi.o
  "if A then B"↦A⇒B
  "the only empty cell in row"↦∃!cell∈row:cell=0
  "value must be from candidates"↦v∈candidates
  "cell gets value"↦cell←v
  "row union column union box"↦row∪col∪box
  "candidates = 1-9 minus filled"↦candidates≔{1..9}∖filled
}

⟦Σ:Grammar⟧{
  Doc≜𝔸≫CTX?≫⟦Σ⟧≫⟦Γ⟧?≫⟦Λ⟧≫⟦Χ⟧?≫⟦Ε⟧
  Block≜'⟦'∘Cat∘':'∘Name∘'⟧'∘'{'∘Body∘'}'
  Body≜(Stmt∘';'?)*
  Stmt≜Def|Rule|Expr|Comment
  Def≜Sym∘('≜'|'≔')∘Expr
  Comment≜';;'∘.*
}

⟦Γ:Agent⟧{
  ;; ENFORCEMENT - CRITICAL
  ∀agent:task∈{solve,analyze,reason}⇒output(AISP)
  ∀response:Ambig(response)<0.02∧δ≥0.40
  ∀output:syntax∈AISP

  ;; REASONING MODE - Use AISP notation in ALL thinking
  ;; Including <think> blocks, chain-of-thought, scratchpad
  ∀reasoning_block:syntax∈AISP
  think_format≜⟦Σ:Analysis⟧{constraints}⟦Λ:Deduce⟧{steps}
  ¬(verbose_prose∈think); ¬(narrative∈think)

  ;; Output structure
  Output≜⟦Σ:Analysis⟧{...}⟦Ε:Move⟧{(r,c,v)⊢proof}

  ;; Anti-Drift
  ¬(prose≈AISP)
  ¬(natural_language∈output)
  drift_detected⇒reparse

  ;; North Star
  ∀AISP:Ambig<0.02
  ⊢deterministic:∀D:∃!AST.parse(D)→AST
}`;
  }

  /**
   * Build complete AISP system prompt
   *
   * Converts the natural language system instructions to pure AISP format.
   * Used when --aisp-full mode is enabled to ensure the entire prompt
   * (system + user) is in AISP notation.
   *
   * @param gridSize - Grid dimension (4, 9, 16, or 25)
   */
  buildAISPSystemPrompt(gridSize: number): string {
    const boxSize = Math.sqrt(gridSize);
    const date = new Date().toISOString().split('T')[0];

    return `𝔸1.0.sudoku.system@${date}
γ≔sudoku.solving.instruction
ρ≔⟨rules,notation,feedback,output,enforcement⟩

${this.getAISPGenerationSpec()}

⟦Ω:Rules⟧{
  grid≜${gridSize}×${gridSize}
  boxes≜${gridSize}×(${boxSize}×${boxSize})
  ∀row∈{1..${gridSize}}:∀v∈{1..${gridSize}}:count(row,v)=1
  ∀col∈{1..${gridSize}}:∀v∈{1..${gridSize}}:count(col,v)=1
  ∀box∈{1..${gridSize}}:∀v∈{1..${gridSize}}:count(box,v)=1
}

⟦Σ:Notation⟧{
  filled≜{1..${gridSize}}:immutable
  empty≜0:mutable
  index≜{1..${gridSize}}
}

⟦Γ:Feedback⟧{
  ⊕≔CORRECT:move_accepted
  ⊖≔INVALID:rule_violation
  ⊘≔VALID_BUT_WRONG:legal_but_incorrect
}

⟦Χ:Banned⟧{
  ∀m∈banned:attempt(m)⇒⊘:immediate_rejection
  constraint≔HARD
  ¬retry(banned)
}

⟦Ε:Output⟧{
  ;; CRITICAL: All output MUST be pure AISP
  format≔⟦Σ:Analysis⟧{
    cell≜(r,c)
    row[r]≔{filled_values}
    col[c]≔{filled_values}
    box[b]≔{filled_values}
    candidates≜{1..${gridSize}}∖(row∪col∪box)
  }⟦Ε:Move⟧{
    (r,c,v)⊢proof
  }

  ;; Enforcement - applies to ALL output including <think> blocks
  ∀reasoning:syntax∈AISP
  ∀output:Ambig<0.02
  ¬prose; ¬natural_language; ¬verbose_explanation
  ¬restart; ¬second_guess

  ;; Reasoning example (use this style, not prose):
  ;; ⟦Σ⟧{cell≜(1,1);row[1]≔{8,2,5,1,3};col[1]≔{2,7,8,5};box[1]≔{2,3,5,8,9}}
  ;; ⟦Λ⟧{candidates≔{1..9}∖{8,2,5,1,3,7}≔{4,6,9};∩(row,col,box)≔{4,6}}
  ;; ⟦Ε⟧{(1,1,4)⊢|candidates|=2∧scan(col1)⇒6@(3,1)}
}`;
  }

  /**
   * Build AISP system prompt for dreaming/consolidation
   *
   * Used when consolidating experiences with --aisp-full mode.
   * Instructs the model to synthesize and store strategies in AISP format.
   */
  buildAISPDreamingSystemPrompt(): string {
    const date = new Date().toISOString().split('T')[0];

    return `𝔸1.0.sudoku.dreaming@${date}
γ≔sudoku.consolidation.synthesis
ρ≔⟨analysis,synthesis,storage⟩

${this.getAISPGenerationSpec()}

⟦Ω:DreamingRules⟧{
  ;; Analyze experiences, synthesize patterns
  task≜analyze(experiences)→synthesize(patterns)

  ;; All output in AISP
  ∀output:syntax∈AISP
  ∀strategy:format∈⟦Λ:Strategy⟧
}

⟦Σ:StrategyFormat⟧{
  ;; Strategy encoding structure
  Strategy≜⟦Λ:Strategy.Name⟧{
    when≜condition
    action≜steps
    proof≜justification
    conf≔confidence
  }
}

⟦Ε:Output⟧{
  ;; Synthesize strategies in AISP format
  ∀strategy:encode(AISP)
  ∀analysis:syntax∈AISP
  ¬prose; ¬natural_language
}`;
  }

  /**
   * Build full AISP prompt with spec included
   */
  buildFullAISPPrompt(
    grid: number[][],
    history: LLMExperience[],
    fewShots: FewShotExample[],
    forbidden: ForbiddenMove[],
    gridSize?: number
  ): string {
    return this.buildAISPPrompt(grid, history, fewShots, forbidden, {
      includeSpec: true,
      gridSize,
    });
  }

  /**
   * Build AISP-Lite prompt (FR-06)
   *
   * Based on AISP 5.1 Platinum Spec Minimal Template (Section 7.1):
   * - Uses only 5 required blocks: header, ⟦Ω⟧, ⟦Σ⟧, ⟦Λ⟧, ⟦Ε⟧
   * - Smaller reference block with core symbols only
   * - Natural language proofs allowed in output
   * - Target ◊⁻ (Bronze) tier minimum (δ≥0.20)
   * - Better suited for smaller/weaker models
   *
   * @param grid - Current puzzle grid
   * @param forbidden - Forbidden moves to include
   * @param fewShots - Learning strategies to include (optional)
   */
  buildAISPLitePrompt(
    grid: number[][],
    forbidden: ForbiddenMove[] = [],
    fewShots: FewShotExample[] = []
  ): string {
    const size = grid.length;
    const date = new Date().toISOString().split('T')[0];

    const lines: string[] = [];

    // Header (required) - Minimal template format
    lines.push(`𝔸1.0.sudoku-lite@${date}`);
    lines.push(`γ≔sudoku.solving.${size}x${size}`);
    lines.push('');

    // Minimal reference block (core symbols only)
    lines.push('⟦Ω:Ref⟧{');
    lines.push('  ⊤≔true; ⊥≔false; ∈≔in; ¬≔not');
    lines.push('  ≔≔assign; ⊕≔success; ⊖≔failure');
    lines.push('}');
    lines.push('');

    // State block (simplified board notation)
    lines.push('⟦Σ:State⟧{');
    lines.push(`  board≜${this.formatBoardSimple(grid)}`);
    const emptyCells = this.formatEmptyCells(grid);
    lines.push(`  empty≔{${emptyCells}}`);
    lines.push('}');
    lines.push('');

    // Rules block (minimal)
    lines.push('⟦Γ:Rules⟧{');
    lines.push('  valid(r,c,v)≔v∉row(r)∧v∉col(c)∧v∉box(r,c)');
    lines.push('}');
    lines.push('');

    // Functions block (minimal)
    lines.push('⟦Λ:Solve⟧{');
    lines.push('  find_move≔select (r,c)∈empty where |candidates(r,c)|=1');
    lines.push('}');
    lines.push('');

    // Add strategies from learning unit if available (simplified format for AISP-lite)
    if (fewShots.length > 0) {
      lines.push('⟦Λ:Strategies⟧{');
      lines.push('  ;; Learned patterns from previous successes');
      for (let i = 0; i < fewShots.length; i++) {
        const ex = fewShots[i];
        const strategyId = ex.strategy || `S${i + 1}`;
        // Use AISP-encoded version if available, otherwise use simplified format
        if (ex.aispEncoded) {
          lines.push(`  ${this.sanitizeId(strategyId)}≔${ex.aispEncoded}`);
        } else {
          // Simplified natural language format for AISP-lite
          lines.push(`  ${this.sanitizeId(strategyId)}≔"${ex.situation.slice(0, 100)}"`);
          if (ex.move) {
            lines.push(`    example≔(${ex.move.row},${ex.move.col},${ex.move.value})`);
          }
        }
      }
      lines.push('}');
      lines.push('');
    }

    // Add forbidden moves if any (using stronger format)
    if (forbidden.length > 0) {
      lines.push('⟦Χ:Forbidden⟧{');
      lines.push('  ;; CRITICAL: These moves WILL be rejected. Do NOT attempt.');
      for (const m of forbidden) {
        lines.push(`  ¬(${m.row},${m.col},${m.value}):"${m.reason}"`);
      }
      lines.push('  constraint≔HARD');
      lines.push('}');
      lines.push('');
    }

    // Execute block (with natural language allowed + explicit example)
    lines.push('⟦Ε:Execute⟧{');
    lines.push('  ⊢?move∈empty∧valid(move)');
    lines.push('  output≔"ROW: r, COL: c, VALUE: v"');
    lines.push('  proof≔natural_language_allowed');
    lines.push('');
    lines.push('  ;; REQUIRED OUTPUT FORMAT - Your response MUST include:');
    lines.push('  ;; ROW: <number 1-9>');
    lines.push('  ;; COL: <number 1-9>');
    lines.push('  ;; VALUE: <number 1-9>');
    lines.push('  ;; REASONING: <brief explanation>');
    lines.push('');
    lines.push('  ;; Example output:');
    lines.push('  ;; ROW: 3');
    lines.push('  ;; COL: 6');
    lines.push('  ;; VALUE: 6');
    lines.push('  ;; REASONING: Cell (3,6) can only be 6 - all other values appear in row, column, or box.');
    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Format board in simple row notation for AISP-lite
   */
  private formatBoardSimple(grid: number[][]): string {
    const rows = grid.map((row, i) => `R${i + 1}:[${row.join(',')}]`);
    return `{${rows.join(';')}}`;
  }

  /**
   * Format empty cells list
   */
  private formatEmptyCells(grid: number[][]): string {
    const cells: string[] = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === 0) {
          cells.push(`(${r + 1},${c + 1})`);
        }
      }
    }
    return cells.join(',');
  }

  /**
   * Convert subscript numbers
   */
  private subscript(n: number): string {
    const subscripts: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    };
    return String(n).split('').map(c => subscripts[c] || c).join('');
  }

  /**
   * Sanitize strategy ID for AISP block name
   */
  private sanitizeId(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  }

  /**
   * Convert natural language condition to AISP-like format
   */
  private toAISPCondition(situation: string): string {
    // Simple heuristic conversion - not perfect but provides structure
    const lower = situation.toLowerCase();

    if (lower.includes('only one') && lower.includes('row')) {
      return '∃!cell∈row:cell=0';
    }
    if (lower.includes('only one') && lower.includes('column')) {
      return '∃!cell∈col:cell=0';
    }
    if (lower.includes('only one') && lower.includes('box')) {
      return '∃!cell∈box:cell=0';
    }
    if (lower.includes('single candidate')) {
      return '|candidates(cell)|=1';
    }

    // Default: quote the natural language
    return `"${situation.substring(0, 80)}"`;
  }

  /**
   * Convert natural language action to AISP-like format
   */
  private toAISPAction(analysis: string): string {
    const lower = analysis.toLowerCase();

    if (lower.includes('remaining') && lower.includes('digit')) {
      return 'cell←{1..9}∖(row∪col∪box)';
    }
    if (lower.includes('only value') || lower.includes('only candidate')) {
      return 'cell←unique(candidates)';
    }

    // Default: quote a snippet
    return `"${analysis.substring(0, 60)}..."`;
  }
}
