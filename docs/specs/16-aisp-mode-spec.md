# Specification 16: AISP Mode Integration

**Version:** 1.3.2
**Date:** 2026-01-16
**Status:** Implemented
**Depends On:** Spec 11 (LLM Sudoku Player), Spec 05 (Dreaming Pipeline), Spec 18 (Algorithm Versioning)

---

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| [ADR-001: Pure LLM Solving](../adr/001-pure-llm-solving.md) | Authorizes AISP integration |
| [ADR-013: AISP Validator Integration](../adr/013-aisp-validator-integration.md) | Authorizes aisp-validator for clustering |

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

### FR-05: Clustering Algorithm AISP Mode

When `--aisp-full` is enabled during dreaming consolidation:
- `DreamingConsolidator.setAISPMode()` propagates mode to clustering algorithm
- `ClusteringAlgorithm.setAISPMode()` enables AISP prompt generation
- All LLM-based clustering prompts (pattern identification, categorization, refinement) use AISP syntax
- LLM responses are validated using `aisp-validator` package (v0.2.2)
- Validation failures trigger LLM self-critique for guidance on AISP compliance
- Fallback to English parsing on AISP validation failure with tier ⊘ (δ < 0.20)

**AISP Clustering Tiers:**
| Tier | Symbol | Density (δ) | Action |
|------|--------|-------------|--------|
| Platinum | ◊⁺⁺ | δ ≥ 0.75 | Accept |
| Gold | ◊⁺ | δ ≥ 0.60 | Accept |
| Silver | ◊ | δ ≥ 0.40 | Accept |
| Bronze | ◊⁻ | δ ≥ 0.20 | Accept with warning |
| Reject | ⊘ | δ < 0.20 | Request critique, fallback |

**Algorithm Support:**
- **FastClusterV3**: AISP cluster naming (`⟦Λ:Cluster.Name⟧` format)
- **DeepClusterV2**: AISP semantic split prompts for LLM pattern identification
- **LLMClusterV2**: Full AISP prompts for all phases (pattern, categorization, refinement)

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

### 4.8 ClusteringAlgorithm AISP Integration

Extends the clustering algorithm interface with AISP mode support (`src/llm/clustering/ClusteringAlgorithm.ts`):

```typescript
import type { AISPMode } from '../AISPBuilder.js';

export interface ClusteringAlgorithm {
  // ... existing methods ...

  /**
   * Set AISP mode for prompt generation
   * When 'aisp-full', all prompts use pure AISP syntax
   */
  setAISPMode?(mode: AISPMode): void;
}

export abstract class BaseClusteringAlgorithm {
  protected aispMode: AISPMode = 'off';

  setAISPMode(mode: AISPMode): void {
    this.aispMode = mode;
  }
}
```

### 4.9 AISPValidatorService

Wrapper around `aisp-validator` package with LLM critique functionality (`src/llm/AISPValidator.ts`):

```typescript
import AISP from 'aisp-validator';

export interface AISPValidationResult {
  valid: boolean;
  tier: string;           // ◊⁺⁺, ◊⁺, ◊, ◊⁻, ⊘
  tierName: string;       // Platinum, Gold, Silver, Bronze, Reject
  delta: number;          // Density [0, 1]
  pureDensity: number;    // Symbol/token ratio
  error?: string;
}

export class AISPValidatorService {
  private initialized: boolean = false;

  /**
   * Initialize WASM kernel (required before validation)
   */
  async init(): Promise<void>;

  /**
   * Validate AISP text
   * @returns Validation result with tier and delta
   */
  validate(text: string): AISPValidationResult;

  /**
   * Validate with LLM critique on failure
   * Requests guidance on making prompt AISP compliant
   */
  async validateWithCritique(
    text: string,
    originalPrompt: string,
    llmClient: LMStudioClient
  ): Promise<{
    result: AISPValidationResult;
    critique?: string;      // LLM critique if tier = ⊘
    guidance?: string;      // How to improve AISP compliance
  }>;

  /**
   * Get detailed density breakdown for debugging
   */
  debug(text: string): object;
}
```

### 4.10 DreamingConsolidator AISP Propagation

Updates to propagate AISP mode to clustering algorithms:

```typescript
// src/llm/DreamingConsolidator.ts
setAISPMode(mode: AISPMode): void {
  this.aispMode = mode;
  // Propagate to clustering algorithm
  if (this.clusteringAlgorithm.setAISPMode) {
    this.clusteringAlgorithm.setAISPMode(mode);
  }
  console.log(`🔤 AISP mode set to: ${mode}`);
}
```

### 4.11 Centralized AISP Validation Layer

All LLM I/O passes through a centralized validation layer when AISP mode is enabled (`src/llm/ValidatedLLMClient.ts`):

```typescript
import type { AISPMode } from './AISPBuilder.js';
import type { AISPValidationResult } from './AISPValidator.js';

export interface AISPValidationOptions {
  /** Validate the prompt before sending */
  validatePrompt?: boolean;
  /** Validate the response after receiving */
  validateResponse?: boolean;
  /** Context label for logging (e.g., "move-generation", "pattern-synthesis") */
  context?: string;
}

export interface ValidatedChatResult {
  content: string;
  promptValidation?: AISPValidationResult;
  responseValidation?: AISPValidationResult;
  critiqueFallback?: boolean;
}

export class ValidatedLLMClient {
  private aispMode: AISPMode = 'off';

  setAISPMode(mode: AISPMode): void;

  /**
   * Chat with optional AISP validation
   * - aispMode='off': No validation (passthrough)
   * - aispMode='aisp': Validate prompts only (warn on low tier)
   * - aispMode='aisp-full': Validate both prompts AND responses
   */
  chat(
    messages: ChatMessage[],
    options?: AISPValidationOptions
  ): Promise<ValidatedChatResult>;
}
```

**Validation Behavior by Mode:**

| Mode | Prompt Validation | Response Validation | On Reject (⊘) |
|------|------------------|---------------------|---------------|
| `off` | None | None | N/A |
| `aisp` | Yes (warn) | No | Log warning |
| `aisp-full` | Yes (warn) | Yes (critique) | Request critique, fallback |

**Natural Language Stripping for Prompt Validation:**

AISP prompts often contain embedded natural language data (experience reasoning, puzzle states) in quoted strings. This dilutes the AISP density score. Before validating prompts, quoted string content is replaced with stubs to preserve AISP structure while calculating accurate density:

```
Before: e1≔"The cell at position (1,2) can only be 5 because all other values are eliminated"
After:  e1≔"…"
```

Implementation in `ValidatedLLMClient`:

```typescript
private stripNaturalLanguageForValidation(text: string): string {
  // Replace quoted string content with ellipsis stub
  return text.replace(/"[^"]*"/g, '"…"');
}
```

This ensures:
- AISP structure (`⟦Σ⟧`, `≜`, `∈`, etc.) is validated
- Embedded natural language doesn't affect delta score
- Prompts with embedded data can still achieve high tiers

**Centralized Smart Validation (`AISPValidatorService.validateSmart`):**

The AISP validator WASM has a 1KB limit (bytes, not chars). AISP symbols are 3-byte UTF-8, so ~300 chars ≈ 900 bytes. The centralized `validateSmart()` method handles:

1. **NL Stripping**: Replace quoted strings with `"…"` stubs
2. **Sampling**: For documents >300 chars, validate first 300 as representative sample

```typescript
// src/llm/AISPValidator.ts
validateSmart(text: string): AISPValidationResult {
  // Strip embedded natural language from quoted strings
  const stripped = text.replace(/"[^"]*"/g, '"…"');

  // Sample for large documents
  if (stripped.length <= 300) return this.validate(stripped);

  const sample = stripped.substring(0, 300);
  return this.validate(sample);  // Logs: 📊 AISP sample: Gold δ=0.680 (sampled 300/1113 chars)
}
```

**All convenience methods use `validateSmart`:** `isValid`, `getDensity`, `getTier`, `meetsTier`, `logValidation`, `validateWithCritique`

**Tier-Based Logging:**
- Platinum/Gold/Silver: `✓ AISP [context] tier (δ=X.XXX)`
- Bronze: `⚠️ AISP [context] Bronze (δ=X.XXX)`
- Reject: `❌ AISP [context] Reject (δ=X.XXX)` + critique workflow

**Factory Pattern:**

All consumers use `LLMClientFactory` instead of direct `LMStudioClient` instantiation:

```typescript
// src/llm/LLMClientFactory.ts
export function createLLMClient(
  config: LLMConfig,
  aispMode: AISPMode = 'off'
): ValidatedLLMClient;
```

**Consumers Updated:**
- `LLMSudokuPlayer` - move generation
- `DreamingConsolidator` - synthesis, anti-patterns, hierarchy
- `LLMClusterV1` - pattern identification
- `LLMClusterV2` - pattern identification (inline validation removed)
- `DeepClusterV1` - semantic split
- `DeepClusterV2` - semantic split (inline validation removed)

**Event Emission:**

```typescript
// Emitted on each validation
eventEmitter.emit('llm:aisp:validation', {
  context: string;
  tier: string;
  delta: number;
  isPrompt: boolean;
  critique?: string;
});
```

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
| 1.3.2 | 2026-01-16 | Representative sample validation for large documents (Section 4.11) |
| 1.3.1 | 2026-01-16 | Natural language stripping for prompt validation (Section 4.11) |
| 1.3.0 | 2026-01-16 | Centralized AISP validation: Section 4.11, ValidatedLLMClient wrapper, factory pattern |
| 1.2.0 | 2026-01-16 | Clustering AISP support: FR-05, aisp-validator integration, FastClusterV3, DeepClusterV2, LLMClusterV2 AISP |
| 1.1.0 | 2026-01-12 | Full implementation: AISP system prompts, dreaming integration, strategy encoding |
| 1.0.0 | 2026-01-12 | Initial specification |

---

## References

- [AISP 5.1 Platinum Specification](aisp-platinum-5.1.md)
- [Spec 11: LLM Sudoku Player](11-llm-sudoku-player.md)
- [Spec 05: Dreaming Pipeline](05-dreaming-pipeline-spec.md)
