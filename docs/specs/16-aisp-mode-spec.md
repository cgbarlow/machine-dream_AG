# Specification 16: AISP Mode Integration

**Version:** 1.1.0
**Date:** 2026-01-12
**Status:** Implemented
**Depends On:** Spec 11 (LLM Sudoku Player), Spec 05 (Dreaming Pipeline)

---

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| [ADR-001: Pure LLM Solving](../adr/001-pure-llm-solving.md) | Authorizes AISP integration |

---

## 1. Overview

AISP (AI Specification Protocol) mode integrates the low-ambiguity AI-to-AI communication protocol into machine-dream's LLM Sudoku player. AISP provides formal, mathematical notation that reduces ambiguity (`Ambig < 0.02`) and enables precise reasoning.

**Key Insight:** AIs understand AISP natively. The AISP spec is only needed by developers to GENERATE AISP-compliant prompts - not by AI models to interpret them.

### 1.1 Two AISP Modes

| Flag | System Prompt | User Prompt | Model Output | Strategy Storage |
|------|---------------|-------------|--------------|------------------|
| `--aisp` | Pure AISP | Pure AISP | Normal text (ROW/COL/VALUE) | Natural language |
| `--aisp-full` | Pure AISP + Gen Spec | Pure AISP | Pure AISP | AISP-encoded |

**Critical Distinction:**
- `--aisp`: The **entire prompt** (system + user) is in pure AISP syntax, but the model responds in normal text format
- `--aisp-full`: Everything is AISP - prompt, reasoning, output, and strategy storage

---

## 2. Functional Requirements

### FR-01: Prompt Conversion (`--aisp`)

When `--aisp` is enabled:
- **System prompt**: Converted to pure AISP via `buildAISPSystemPromptBasic()`
- **User prompt**: Converted to AISP via `AISPBuilder.buildAISPPrompt()`
- Grid state uses tensor notation (`board≜Vec₉(Vec₉(Fin₁₀))`)
- Few-shot examples use AISP strategy format
- Move history uses constraint chain format
- Forbidden moves use constraint blocks (`⟦Χ:Forbidden⟧`)
- Model responds in **normal text format** (ROW/COL/VALUE/REASONING)

### FR-02: Full AISP Mode (`--aisp-full`)

When `--aisp-full` is enabled:
- **System prompt**: Pure AISP + AISP Generation Spec via `AISPBuilder.buildAISPSystemPrompt()`
- **User prompt**: Pure AISP via `AISPBuilder.buildFullAISPPrompt()`
- AISP Generation Spec included (~80 lines from Platinum 5.1):
  - `⟦Σ:QuickRef⟧` - Essential symbols
  - `⟦Σ:Template⟧` - Document structure
  - `⟦Σ:Rosetta⟧` - Prose↔AISP translation examples
  - `⟦Γ:Agent⟧` - **CRITICAL** - Enforcement rules
  - `⟦Σ:Grammar⟧` - Block structure
- Instructions direct model to use pure AISP for ALL output
- Model outputs entirely in AISP syntax (`⟦Σ:Analysis⟧{...}⟦Ε:Move⟧{...}`)
- Response parsing handles AISP move format

### FR-03: AISP Strategy Encoding

During dreaming with `--aisp-full`:
- `DreamingConsolidator.setAISPMode('aisp-full')` enables AISP dreaming
- System prompt uses `AISPBuilder.buildAISPDreamingSystemPrompt()`
- User prompts use AISP format via `buildAISPPatternPrompt()`
- Synthesized strategies are encoded via `AISPStrategyEncoder.encodePattern()`
- `aispEncoded` field is populated on SynthesizedPattern and FewShotExample
- Future prompts inject AISP-encoded strategies
- Enables pure AISP reasoning chains

### FR-04: Batch Script Integration

Both modes are supported in:
- `scripts/ab-test-learning.sh`
- `scripts/iterative-learning.sh`
- `scripts/training-run.sh`
- `scripts/abx-test.sh`

---

## 3. AISP Syntax Reference

### 3.1 Header Format

```
𝔸X.Y.name@YYYY-MM-DD
γ≔domain
ρ≔⟨section1,section2,...⟩
```

### 3.2 Block Delimiters

| Block | Purpose | Example |
|-------|---------|---------|
| `⟦Ω⟧` | Rules/Foundation | Constraint rules |
| `⟦Σ⟧` | Types/State | Grid state, move types |
| `⟦Γ⟧` | Context | Puzzle context |
| `⟦Λ⟧` | Functions/Strategies | Solving strategies |
| `⟦Χ⟧` | Constraints | Forbidden moves |
| `⟦Ε⟧` | Execution | Move command |

### 3.3 Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `≜` | Definition | `board≜Vec₉(Vec₉(Fin₁₀))` |
| `≔` | Assignment | `cell[3,5]≔7` |
| `∀` | Universal | `∀v∈row:v≠0⇒v∈solution` |
| `∃` | Existential | `∃!cell∈row:cell=0` |
| `∈` | Membership | `v∈{1..9}∖row` |
| `⇒` | Implies | `constraint⇒action` |
| `∧` | And | `row∧col∧box` |
| `∨` | Or | `strategy1∨strategy2` |
| `¬` | Not | `¬∈forbidden` |

### 3.4 Tensor Notation for Grid

```
⟦Σ:State⟧{
  board≜Vec₉(Vec₉(Fin₁₀))
  board[0]≔⟨1,0,0,0,0,7,0,9,0⟩
  board[1]≔⟨0,3,0,0,2,0,0,0,8⟩
  ...
}
```

### 3.5 Strategy Encoding

```
⟦Λ:Strategy.LastDigitInRow⟧{
  when≜∃!cell∈row:cell=0
  action≜cell←{1..9}∖row
  proof≜∀v∈row:v≠0⇒v∈solution
}
```

---

## 4. Implementation Architecture

### 4.1 AISPBuilder

Converts prompt sections to AISP syntax (`src/llm/AISPBuilder.ts`):

```typescript
export type AISPMode = 'off' | 'aisp' | 'aisp-full';

export class AISPBuilder {
  // Grid conversion - tensor notation
  buildGrid(grid: number[][]): string;

  // Few-shot examples - AISP strategy format
  buildFewShots(examples: FewShotExample[], options?: AISPOptions): string;

  // Move history - constraint chain format
  buildHistory(experiences: LLMExperience[]): string;

  // Forbidden moves - constraint blocks
  buildForbidden(moves: ForbiddenMove[]): string;

  // Full prompt assembly (user message)
  buildAISPPrompt(
    grid: number[][],
    history: LLMExperience[],
    fewShots: FewShotExample[],
    forbidden: ForbiddenMove[],
    options?: AISPOptions
  ): string;

  // AISP symbol reference (included in both modes)
  getAISPSpecSummary(): string;

  // AISP Generation Spec (~80 lines from Platinum 5.1)
  // Includes: QuickRef, Template, Rosetta, Agent, Grammar
  getAISPGenerationSpec(): string;

  // Full AISP system prompt (--aisp-full mode)
  buildAISPSystemPrompt(gridSize: number): string;

  // AISP dreaming system prompt
  buildAISPDreamingSystemPrompt(): string;
}
```

### 4.2 AISPStrategyEncoder

Encodes/decodes strategies in AISP format:

```typescript
export class AISPStrategyEncoder {
  // Encode for storage
  encodePattern(pattern: SynthesizedPattern): string;
  encodeFewShot(example: FewShotExample): string;

  // Decode for display
  decodeToReadable(aispStrategy: string): string;
}
```

### 4.3 Type Extensions

```typescript
interface FewShotExample {
  // ... existing fields
  aispEncoded?: string;  // AISP-formatted version
}

interface SynthesizedPattern {
  // ... existing fields
  aispEncoded?: string;  // AISP-formatted version
}
```

### 4.4 Config Extensions

```typescript
// src/llm/config.ts
export type AISPMode = 'off' | 'aisp' | 'aisp-full';

export interface SystemPromptOptions {
  useReasoningTemplate?: boolean;
  aispMode?: AISPMode;
}

// Builds appropriate system prompt based on mode
export function buildSystemPrompt(
  gridSize: number,
  options: SystemPromptOptions = {}
): string;
```

### 4.5 LLMSudokuPlayer Integration

```typescript
// src/llm/LLMSudokuPlayer.ts
export class LLMSudokuPlayer {
  private aispMode: AISPMode = 'off';

  setAISPMode(mode: AISPMode): void {
    this.aispMode = mode;
    this.promptBuilder.setAISPMode(mode);
  }
}
```

### 4.6 DreamingConsolidator Integration

```typescript
// src/llm/DreamingConsolidator.ts
export class DreamingConsolidator {
  private aispMode: AISPMode = 'off';
  private aispBuilder: AISPBuilder;
  private aispEncoder: AISPStrategyEncoder;

  setAISPMode(mode: AISPMode): void {
    this.aispMode = mode;
  }

  // When aisp-full mode:
  // - Uses AISP dreaming system prompt
  // - Uses AISP user prompts
  // - Encodes synthesized patterns in AISP format
}
```

### 4.7 ResponseParser AISP Support

```typescript
// src/llm/ResponseParser.ts
export class ResponseParser {
  parse(rawResponse: string, gridSize: number = 9): LLMResponse {
    // Try AISP format first if response contains AISP markers
    if (rawResponse.includes('⟦Ε:Move⟧') || rawResponse.includes('⟦Ε:')) {
      const move = this.extractAISPMove(rawResponse);
      if (move) return { move, rawResponse, parseSuccess: true };
    }
    // Fall back to standard ROW/COL/VALUE format
    return this.extractStandardMove(rawResponse);
  }

  // Parses: ⟦Ε:Move⟧{(r,c,v)⊢proof}
  // Extracts: row=r, col=c, value=v, reasoning=proof
  private extractAISPMove(text: string): LLMMove | null;
}
```

**AISP Move Format Examples:**

```
⟦Ε:Move⟧{
  (1,1,2)⊢∧(row_missing=2)∧(col_missing=2)∧(box_missing=2)
}
```

Parsed as:
- `row: 1`
- `col: 1`
- `value: 2`
- `reasoning: "∧(row_missing=2)∧(col_missing=2)∧(box_missing=2)"`

---

## 5. Prompt Structure

### 5.1 AISP Mode (`--aisp`)

```
𝔸1.0.sudoku@2026-01-12
γ≔sudoku.solving

⟦Σ:State⟧{
  board≜Vec₉(Vec₉(Fin₁₀))
  board[0]≔⟨1,0,0,0,0,7,0,9,0⟩
  ...
  empty≔{(r,c)|board[r][c]=0}
}

⟦Λ:Strategies⟧{
  ⟦Λ:S1⟧{
    when≜∃!cell∈row:cell=0
    action≜cell←{1..9}∖row
    example≜"R3C5←7: row missing only 7"
  }
  ...
}

⟦Γ:History⟧{
  move[1]≔(3,5,7)⊕CORRECT
  move[2]≔(2,8,4)⊖INVALID:"violates row"
  ...
}

⟦Χ:Forbidden⟧{
  ¬(1,1,5):"already attempted"
  ¬(3,7,9):"violates box"
}

⟦Ε:Execute⟧{
  ⊢?next_move∈empty∧valid(next_move)
  output≔"ROW: r\nCOL: c\nVALUE: v\nREASONING: ..."
}
```

### 5.2 Full AISP Mode (`--aisp-full`)

Includes AISP spec summary + instruction:
```
⟦Ω:AISP⟧{
  ;; AISP protocol summary
  𝔄≜{⊤⊥∧∨¬→↔∀∃∃!λΠΣ≜≡≢∈∉⊂⊃∪∩∘⊕⊖⊗⟨⟩⟦⟧⊢⊨↦⇒∎}
  ...
}

⟦Ε:Instruction⟧{
  mode≔AISP_FULL
  ∀reasoning:output∈AISP
  ∀move:format∈⟦Σ:Move⟧{(r,c,v)⊢proof}
}

[... rest of prompt in AISP ...]
```

---

## 6. CLI Integration

### 6.1 Play Command

```bash
# Basic AISP mode - prompt conversion only
npx machine-dream llm play puzzle.json --aisp

# Full AISP mode - end-to-end AISP
npx machine-dream llm play puzzle.json --aisp-full

# Combined with other options
npx machine-dream llm play puzzle.json --profile qwen3 --aisp --visualize
```

### 6.2 Dream Command

```bash
# Standard dreaming
npx machine-dream llm dream run --profile qwen3

# AISP-encoded strategy generation
npx machine-dream llm dream run --profile qwen3 --aisp-full
```

### 6.3 Benchmark Command

```bash
# Benchmark with AISP mode
npx machine-dream llm benchmark run --profile qwen3 --aisp
npx machine-dream llm benchmark run --profile qwen3 --aisp-full
```

---

## 7. Batch Script Integration

### 7.1 ab-test-learning.sh

```bash
# Add AISP mode support
./scripts/ab-test-learning.sh --profile qwen3 --aisp
./scripts/ab-test-learning.sh --profile qwen3 --aisp-full
```

### 7.2 iterative-learning.sh

```bash
# Add AISP mode support
./scripts/iterative-learning.sh --profile qwen3 --aisp --iterations 5
./scripts/iterative-learning.sh --profile qwen3 --aisp-full --iterations 5
```

### 7.3 training-run.sh

```bash
# Add AISP mode support
./scripts/training-run.sh --profile qwen3 --aisp
```

---

## 8. Response Parsing

### 8.1 Normal Mode Response

```
REASONING: Cell (3,5) is the only empty cell in row 3...
ROW: 3
COL: 5
VALUE: 7
```

### 8.2 AISP Full Mode Response

```
⟦Σ:Analysis⟧{
  cell≜(3,5)
  row[3]≔{1,2,3,4,6,8,9}
  col[5]≔{1,2,4,5,6,8}
  box[2]≔{1,2,3,4,5,6,8,9}
  candidates≜{1..9}∖(row∪col∪box)≔{7}
}
⟦Ε:Move⟧{
  (3,5,7)⊢∃!v∈candidates
}
```

Parser extracts: row=3, col=5, value=7

---

## 9. Strategy Storage Format

### 9.1 Natural Language (default)

```json
{
  "strategy": "Last Digit in Row",
  "situation": "Only one cell in row is empty",
  "analysis": "When a row has 8 filled cells...",
  "move": {"row": 3, "col": 5, "value": 7}
}
```

### 9.2 AISP Encoded (`--aisp-full`)

```json
{
  "strategy": "Last Digit in Row",
  "situation": "Only one cell in row is empty",
  "analysis": "When a row has 8 filled cells...",
  "move": {"row": 3, "col": 5, "value": 7},
  "aispEncoded": "⟦Λ:Strategy.LastDigitInRow⟧{when≜∃!cell∈row:cell=0;action≜cell←{1..9}∖row;proof≜∀v∈row:v≠0⇒v∈solution}"
}
```

---

## 10. Verification

### 10.1 AISP Mode Test

```bash
# Play with AISP-formatted prompts
npx machine-dream llm play puzzles/9x9-easy.json --profile qwen3 --aisp --visualize

# Verify prompt contains AISP syntax
# Check for ⟦Σ⟧, ≜, ∈ in prompt output
```

### 10.2 AISP-Full Mode Test

```bash
# Play with full AISP
npx machine-dream llm play puzzles/9x9-easy.json --profile qwen3 --aisp-full --visualize

# Verify model outputs AISP reasoning
# Check for ⟦Σ:Analysis⟧ blocks in response
```

### 10.3 AISP Dreaming Test

```bash
# Generate AISP-encoded strategies
npx machine-dream llm dream run --profile qwen3 --learning-unit aisp-test --aisp-full

# Verify strategies have aispEncoded field
npx machine-dream llm learning show aisp-test --profile qwen3 --format json | grep aispEncoded
```

---

## 11. Benefits

### 11.1 Lower Ambiguity

AISP guarantees `Ambig(D) < 0.02`, reducing misinterpretation of:
- Grid state (exact tensor notation)
- Constraint relationships (formal logic)
- Strategy conditions (predicate logic)

### 11.2 Formal Reasoning

Mathematical notation encourages:
- Set-theoretic constraint analysis
- Proof-carrying moves
- Explicit candidate elimination

### 11.3 Compact Representation

AISP syntax is more compact than natural language:
- "The only empty cell in row 3" → `∃!cell∈row[3]:cell=0`
- "Value must be 7 because..." → `cell←{1..9}∖(row∪col∪box)={7}`

---

## 12. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-01-12 | Full implementation: AISP system prompts, dreaming integration, strategy encoding |
| 1.0.0 | 2026-01-12 | Initial specification |

---

## References

- [AISP 5.1 Platinum Specification](aisp-platinum-5.1.md)
- [Spec 11: LLM Sudoku Player](11-llm-sudoku-player.md)
- [Spec 05: Dreaming Pipeline](05-dreaming-pipeline-spec.md)
