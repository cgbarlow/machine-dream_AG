# Specification 11: LLM Sudoku Player

---

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| [ADR-001: Pure LLM Solving](../adr/001-pure-llm-solving.md) | Authorizes pure LLM approach |
| [ADR-002: Local LLM Provider](../adr/002-local-llm-provider.md) | Authorizes LM Studio integration |
| [ADR-013: AISP Validator Integration](../adr/013-aisp-validator-integration.md) | Authorizes AISP validation and ValidatedLLMClient |

---

## Overview

This specification defines the architecture for a **true LLM-based Sudoku player** where a Large Language Model iteratively attempts to solve puzzles through reasoning, feedback, and learning.

## Design Decisions

The following decisions are **final and non-negotiable**:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **LLM Provider** | LM Studio (local) | Privacy, no API costs, works offline |
| **Target Model** | Qwen3 30B | Capable reasoning, runs locally |
| **Deterministic Fallback** | **NONE** | Pure LLM - no rule-based assistance |
| **Hints** | **NONE** | LLM must struggle and learn independently |
| **Memory Persistence** | **YES** | Experiences persist across sessions |
| **Memory Toggle** | **YES** | Enable/disable to verify learning works |
| **Hybrid Mode** | **NO** | Pure LLM only - no algorithmic solving |

## Core Principles

### 1. Pure LLM Solving
The LLM is the **sole decision maker**. There is no:
- Naked singles detection
- Hidden singles detection
- Backtracking algorithms
- Constraint propagation
- Any traditional Sudoku solving techniques

The system only provides:
- Current puzzle state
- Validation of proposed moves
- Feedback on errors
- Historical context (when memory enabled)

### 2. Learning Through Struggle
The LLM will make mistakes. This is **expected and valuable**:
- Invalid moves (rule violations) teach constraints
- Wrong moves (valid but incorrect) teach strategy
- Repeated failures on similar patterns reveal weaknesses
- No hints or assistance - the LLM must figure it out

### 3. Memory-Driven Improvement
Experiences persist to enable genuine learning:
- All moves (successful and failed) are stored
- Reasoning chains are preserved
- Patterns are consolidated during "dreaming"
- Few-shot examples are updated from successful strategies

### 4. Verifiable Learning
Memory can be toggled to scientifically verify learning:
- **Memory ON**: Include past experiences in prompts
- **Memory OFF**: Fresh context only (baseline)
- Compare performance to measure actual improvement

## Architecture

### System Components

```
┌──────────────────────────────────────────────────────────────────┐
│                     LLM Sudoku Player                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐                                              │
│  │  Configuration │  memory: on/off                              │
│  │                │  model: qwen3-30b                            │
│  │                │  endpoint: localhost:1234                    │
│  └───────┬────────┘                                              │
│          │                                                       │
│          ▼                                                       │
│  ┌────────────────┐    ┌─────────────────┐                      │
│  │ Puzzle Loader  │───▶│ Prompt Builder  │                      │
│  │                │    │                 │                      │
│  │ • Load puzzle  │    │ • System prompt │                      │
│  │ • Track state  │    │ • Grid state    │                      │
│  │ • Validate     │    │ • History       │◀──┐                  │
│  └────────────────┘    │ • Few-shots     │   │                  │
│                        └────────┬────────┘   │                  │
│                                 │            │                  │
│                                 ▼            │                  │
│                    ┌────────────────────┐    │                  │
│                    │   LM Studio Client │    │                  │
│                    │                    │    │                  │
│                    │ POST /v1/chat/     │    │                  │
│                    │   completions      │    │                  │
│                    └─────────┬──────────┘    │                  │
│                              │               │                  │
│                              ▼               │                  │
│                    ┌────────────────────┐    │                  │
│                    │  Response Parser   │    │                  │
│                    │                    │    │                  │
│                    │ Extract:           │    │                  │
│                    │ • row, col, value  │    │                  │
│                    │ • reasoning        │    │                  │
│                    └─────────┬──────────┘    │                  │
│                              │               │                  │
│                              ▼               │                  │
│                    ┌────────────────────┐    │                  │
│                    │   Move Validator   │    │                  │
│                    │                    │    │                  │
│                    │ • Cell empty?      │    │                  │
│                    │ • Rule violation?  │    │                  │
│                    │ • Matches solution?│    │                  │
│                    └─────────┬──────────┘    │                  │
│                              │               │                  │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│     │   CORRECT   │  │   INVALID   │  │VALID_WRONG  │          │
│     │             │  │             │  │             │          │
│     │ Apply move  │  │ Explain     │  │ Apply move  │          │
│     │ Continue    │  │ error       │  │ (wrong path)│          │
│     └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│            │                │                │                  │
│            └────────────────┼────────────────┘                  │
│                             ▼                                   │
│                    ┌────────────────────┐                       │
│                    │ Experience Store   │───────────────────────┘
│                    │                    │   (if memory ON)
│                    │ AgentDB:           │
│                    │ • ReasoningBank    │
│                    │ • ReflexionMemory  │
│                    └─────────┬──────────┘
│                              │
│                              ▼
│                    ┌────────────────────┐
│                    │ Dreaming Phase     │
│                    │                    │
│                    │ • Pattern analysis │
│                    │ • Insight synthesis│
│                    │ • Few-shot update  │
│                    └────────────────────┘
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/llm/
├── LMStudioClient.ts       # OpenAI-compatible API client
├── PromptBuilder.ts        # Constructs prompts from state
├── ResponseParser.ts       # Extracts moves from LLM output
├── MoveValidator.ts        # Validates moves against rules
├── ExperienceStore.ts      # Persists experiences to AgentDB
├── LLMSudokuPlayer.ts      # Main orchestration class
├── DreamingConsolidator.ts # Pattern synthesis
├── BoardFormatter.ts       # Shared grid display utility (DRY)
├── profiles/               # Profile Management (Spec 13)
│   ├── LLMProfileManager.ts # Profile CRUD operations
│   ├── ProfileStorage.ts    # Profile persistence
│   └── types.ts             # Profile type definitions
├── types.ts                # LLM-specific type definitions
└── config.ts               # LM Studio configuration
```

### BoardFormatter Utility

**Purpose**: Shared utility for formatting Sudoku grids across all components (DRY principle).

**Used By**:
- `PromptBuilder` - Plain text grids for LLM prompts
- CLI commands - Color-highlighted grids for terminal display
- TUI components - Can use for text fallback rendering

**Methods**:
- `format(grid, options)` - Core formatting with highlighting support
- `formatForPrompt(grid)` - Plain text for LLM (no ANSI colors)
- `formatForCLI(grid, lastMove?)` - Terminal display with green highlighting
- `countEmptyCells(grid)` - Utility to count empty cells

**Design Pattern**: Static utility class to avoid code duplication

### Reasoning Token Capture (Added 2026-01-12)

LM Studio v0.3.9+ can expose the model's internal reasoning separately from the final output.

#### LM Studio Configuration

Enable in **LM Studio → App Settings → Developer**:
> "When applicable, separate reasoning_content and content in API responses"

#### API Response Fields

| Mode | Field |
|------|-------|
| Non-streaming | `choices.message.reasoning` or `choices.message.reasoning_content` |
| Streaming | `choices.delta.reasoning` or `choices.delta.reasoning_content` |

#### CLI Flag

```bash
npx machine-dream llm play puzzle.json --profile <name> --show-reasoning
```

When `--show-reasoning` is enabled:
- Full reasoning tokens are displayed before the final ROW/COL/VALUE output
- Useful for debugging model behavior and understanding decision chains
- Works with reasoning-capable models (gpt-oss-120b, DeepSeek-R1, etc.)

#### Implementation Notes

`LMStudioClient.handleStreamingResponse()` extracts both:
- `delta.reasoning` / `delta.reasoning_content` → Internal reasoning
- `delta.content` → Final output

Both are streamed to display via the `onStream` callback.

## Interfaces

### Configuration

```typescript
interface LLMConfig {
  // Connection Profile (see Spec 13: LLM Profile Management)
  profileName?: string;     // Load from saved profile
  activeProfile?: LLMProfile; // Currently active profile

  // LM Studio connection (overridable if not using profile)
  baseUrl: string;          // 'http://localhost:1234/v1'
  model: string;            // 'qwen3-30b' or 'local-model'

  // Generation parameters
  temperature: number;      // 0.3 default (reduced 2026-01-08 for deterministic reasoning)
  maxTokens: number;        // 2048 default (increased 2026-01-08 evening to allow complete reasoning)
  timeout: number;          // 60000ms for large models

  // Learning settings
  memoryEnabled: boolean;   // Toggle for A/B testing
  maxHistoryMoves: number;  // Limit move history to last N moves (20 default, 0=unlimited)
  includeReasoning: boolean; // Include LLM's reasoning in move history (default: off)

  // No hints, no fallback - these are NOT configurable
}
```

### Move Types

```typescript
interface LLMMove {
  row: number;              // 1-9 (user-facing)
  col: number;              // 1-9 (user-facing)
  value: number;            // 1-9
  reasoning: string;        // LLM's explanation
  confidence?: number;      // Optional self-assessment
}

interface MoveValidation {
  isValid: boolean;         // Doesn't violate Sudoku rules
  isCorrect: boolean;       // Matches the solution
  outcome: 'correct' | 'invalid' | 'valid_but_wrong';
  error?: string;           // Human-readable error
}

interface LLMExperience {
  id: string;
  puzzleId: string;
  puzzleHash: string;       // For finding similar puzzles
  moveNumber: number;
  gridState: number[][];
  move: LLMMove;
  validation: MoveValidation;
  timestamp: Date;
  modelUsed: string;
  memoryWasEnabled: boolean;

  // Importance scoring (Spec 03 FR-A3)
  importance: number;       // 0.0 - 1.0, calculated at creation
  context: LLMExperienceContext;

  // Profile tracking (for A/B testing and configuration analysis)
  profileName: string;      // LLM profile used (e.g., "lm-studio-qwen3")

  // Learning features active at time of move
  learningContext: LearningContext;
}

interface LLMExperienceContext {
  emptyCellsAtMove: number;   // Grid complexity indicator
  reasoningLength: number;    // Token proxy (character count)
  constraintDensity: number;  // Avg candidates per empty cell
}

interface LearningContext {
  fewShotsUsed: boolean;              // Were few-shot examples injected?
  fewShotCount: number;               // How many few-shots were used (0-5 typically)
  patternsAvailable: number;          // Learned patterns available at session start
  consolidatedExperiences: number;    // Prior consolidated experience count
}
```

### Play Session

```typescript
interface PlaySession {
  id: string;                       // Unique session identifier (GUID)
  puzzleId: string;
  startTime: Date;
  endTime?: Date;

  // AISP Mode tracking
  aispMode: 'off' | 'aisp' | 'aisp-full';  // AISP mode used for this session

  // Outcome
  solved: boolean;
  abandoned: boolean;
  abandonReason?: string;           // Why session was abandoned:
                                    // - 'max_moves': Hit move limit
                                    // - 'llm_error: <msg>': LLM response error
                                    // - 'consecutive_forbidden: <msg>': Stuck on forbidden moves
                                    // - 'user_interrupt: Ctrl-C pressed': User cancelled

  // Statistics
  totalMoves: number;
  correctMoves: number;
  invalidMoves: number;
  validButWrongMoves: number;

  // Learning data
  experiences: LLMExperience[];
  memoryWasEnabled: boolean;

  // Profile and learning tracking (for A/B testing)
  profileName: string;              // LLM profile used for this session
  learningContext: LearningContext; // Learning features available at session start
}
```

### Session Metadata Persistence

Session metadata (including `abandonReason`) is stored separately from individual experiences to enable session-level analysis:

```typescript
// ExperienceStore methods for session metadata
async saveSession(session: PlaySession): Promise<void>
async getSession(sessionId: string): Promise<Partial<PlaySession> | null>
async getAllSessions(): Promise<Partial<PlaySession>[]>
```

This allows:
- Tracking why sessions failed (for debugging and learning improvement)
- Filtering sessions by exit status in `llm session list`
- Analyzing patterns in session failures during dreaming

### Experience Importance Calculation

Importance is calculated at experience creation time following the GRASP framework (Spec 03). This score (0.0-1.0) helps prioritize experiences during consolidation and pattern extraction.

**Formula Components:**

| Factor | Contribution | Condition |
|--------|-------------|-----------|
| Base | 0.5 | Always applied |
| Correct move | +0.4 | `validation.isCorrect === true` |
| Valid but wrong | +0.2 | `validation.isValid && !validation.isCorrect` |
| Invalid move | +0.3 | `!validation.isValid` (learning opportunity) |
| Breakthrough | +0.3 | First correct move after 3+ consecutive errors |
| Long reasoning | +0.1 | `move.reasoning.length > 500` characters |
| Complex grid | +0.1 | `emptyCellsAtMove > 50` cells |

**Capped at 1.0**

**Examples:**
- Correct move on simple grid: 0.5 + 0.4 = **0.9**
- Parse failure: 0.5 + 0.3 = **0.8** (learning from malformed responses)
- Breakthrough after struggle: 0.5 + 0.4 + 0.3 = 1.2 → **1.0** (capped)
- Valid but wrong with deep reasoning: 0.5 + 0.2 + 0.1 = **0.8**

## Prompt Engineering

### System Prompt (Updated 2026-01-08 - Simplified)

```
You are solving Sudoku puzzles through trial and error.

RULES:
- 9x9 grid, nine 3x3 boxes
- Each row contains 1-9 exactly once
- Each column contains 1-9 exactly once
- Each box contains 1-9 exactly once

NOTATION:
- Numbers 1-9 are filled cells (cannot be changed)
- Underscore (_) is empty cell you can fill
- Rows/columns numbered 1-9

FEEDBACK:
- CORRECT: Move accepted
- INVALID: Violates rules
- VALID_BUT_WRONG: Legal but incorrect

CRITICAL CONSTRAINT:
- NEVER attempt any move listed in FORBIDDEN MOVES
- If a move appears in FORBIDDEN MOVES, it has been proven wrong
- You MUST choose a different cell or value

OUTPUT FORMAT:
ROW: <1-9>
COL: <1-9>
VALUE: <1-9>
REASONING: <brief analysis>
```

**Changes from original (2026-01-08 morning)**:
- Removed "CRITICAL INSTRUCTIONS FOR REASONING" meta-instructions
- Removed hints like "try a different cell or value"
- Changed notation from `.` to `_` for better visibility
- Simplified language throughout
- Removed all "how to think" guidance - let LLM learn naturally from feedback

**Additional changes (2026-01-08 evening)**:
- Added "CRITICAL CONSTRAINT" section explicitly forbidding moves in FORBIDDEN MOVES list
- This prevents LLM from ignoring the forbidden moves section in the prompt

### Reasoning Template Mode (Added 2026-01-10)

An optional system prompt mode that enforces **structured constraint-intersection reasoning** using mathematical set notation. This mode has been shown to significantly improve accuracy (62.5% vs 26-39% with default mode) by:

1. **Removing strategy name references** - No "Applying Strategy 1..." overhead
2. **Enforcing set notation** - `{1,3,8}` instead of prose
3. **Requiring explicit constraint enumeration** - Row → Column → Box → Intersection
4. **Shorter reasoning limit** - 150 characters (vs 200 in default mode)

**Enable with**: `--reasoning-template` flag on `llm play` or batch scripts

**Reasoning Template System Prompt**:
```
SOLVING METHOD (follow exactly):
1. Pick an empty cell
2. List digits MISSING from its ROW as a set {x,y,z}
3. List digits MISSING from its COLUMN as a set {a,b,c}
4. List digits MISSING from its BOX as a set {p,q,r}
5. Find the INTERSECTION of all three sets
6. If intersection has exactly ONE digit, that's your answer
7. If multiple digits possible, pick the most constrained cell instead

OUTPUT FORMAT:
ROW: <1-9>
COL: <1-9>
VALUE: <1-9>
REASONING: <use template below>

REASONING TEMPLATE (follow exactly):
"Cell (R,C). Row missing {X,Y,Z}. Col missing {A,B,C}. Box missing {P,Q,R}. Intersection={V}."

CRITICAL:
- Use set notation {1,2,3} not prose
- Keep reasoning under 150 characters
- Do NOT reference strategy names
- Do NOT say "Applying Strategy" or "Using technique"
- Pure constraint math only
```

**Example high-accuracy reasoning** (from session bfa9a98a with 62.5% accuracy):
```
Cell (5,5). Row missing {1,3,8}. Col missing {1,2,4,5,7,8,9}.
Box missing {5,6,8}. Intersection={8}.
```

**When to use**:
- For larger grids (9x9+) where token budget is constrained
- When accuracy is more important than strategy diversity
- For training runs focused on pure constraint solving

### Anonymous Pattern Mode (Added 2026-01-10)

An optional prompt format mode that replaces named strategies with **anonymous constraint-based patterns**. This mode has shown to significantly improve accuracy (62.5% vs 26-39% with named strategies) by:

1. **Removing strategy names** - No "Strategy 1: Last Digit..." overhead
2. **Focusing on situation detection** - Clear triggers for each pattern
3. **Providing reasoning templates** - Exact format to follow
4. **No YES/NO evaluation** - Direct pattern matching instead

**Enable with**: `--anonymous-patterns` flag on `llm play` or `llm dream run`

**Anonymous Pattern Prompt Format**:
```
REASONING PATTERNS (apply when situation matches):

Pattern A - When you see: A row/col/box with only one empty cell
Do this: That cell must contain the only missing digit
Template: "Cell (R,C). Row/Col/Box has {filled}. Missing={answer}."

Pattern B - When you see: A cell where only one digit is possible
Do this: That digit must go in this cell
Template: "Cell (R,C). Row missing {X}. Col missing {Y}. Box missing {Z}. Intersection={V}."

For each empty cell, check if any pattern applies.
Use the first matching pattern. Follow its template exactly.
```

**Compatibility**:
- `--reasoning-template`: Changes system prompt (constraint intersection format)
- `--anonymous-patterns`: Changes how learned strategies are formatted in the user prompt
- Both flags can be used together for maximum structure

**When to use**:
- For larger grids (9x9+) where named strategies add cognitive overhead
- When model tends to reference "Applying Strategy 1..." in reasoning
- For A/B testing anonymous vs named strategy performance

### Puzzle State Prompt (with history)

**Updated 2026-01-09**: Optimized prompt to reduce noise and improve signal-to-noise ratio.

**Prompt Optimization Principles**:
1. **No redundant information** - Grid already shows filled cells, don't repeat them
2. **Capped forbidden moves** - Maximum 15 entries to prevent prompt bloat
3. **Clear, simple language** - No emoji, no ALL-CAPS threats, just facts
4. **Compact formatting** - Every token counts

```
CURRENT PUZZLE STATE:
R1: 5,3,_,_,7,_,_,_,_
R2: 6,_,_,1,9,5,_,_,_
R3: _,9,8,_,_,_,_,6,_
R4: 8,_,_,_,6,_,_,_,3
R5: 4,_,_,8,_,3,_,_,1
R6: 7,_,_,_,2,_,_,_,6
R7: _,6,_,_,_,_,2,8,_
R8: _,_,_,4,1,9,_,_,5
R9: _,_,_,_,8,_,_,7,9

YOUR PREVIOUS ATTEMPTS ON THIS PUZZLE:
Move 1: (2,2)=7 → INVALID (Value 7 already exists in column 2)
Move 2: (3,4)=5 → INVALID (Value 5 already exists in box 2)
Move 3: (2,2)=4 → CORRECT
Move 4: (1,3)=2 → VALID_BUT_WRONG

FORBIDDEN MOVES (do not repeat):
(2,2)=7, (3,4)=5, (1,3)=2
(Note: List capped at 15 most recent to avoid prompt bloat)

Empty cells remaining: 48

What is your next move?
```

**Removed from prompt** (2026-01-09):
- "FILLED CELLS" section - redundant with grid display
- Emoji warnings (⚠️) - adds noise without value
- ALL-CAPS threat language - doesn't improve compliance
- Unlimited forbidden moves - now capped at 15

### Few-Shot Examples (from memory)

When memory is enabled, include successful patterns:

```
LEARNED PATTERNS FROM PREVIOUS PUZZLES:

Example 1 - Finding the only candidate:
Grid context: Row 3 had [1,2,4,5,6,7,8,9] filled
Cell (3,5) was empty
Analysis: Only 3 is missing from row 3
Move: (3,5)=3 → CORRECT

Example 2 - Box constraint reasoning:
Grid context: Box 5 (center) had [1,2,3,5,6,7,8,9] filled
Cell (5,5) was empty
Analysis: Only 4 is missing from box 5
Move: (5,5)=4 → CORRECT
```

## Play Loop Algorithm

```typescript
async playPuzzle(puzzle: Puzzle): Promise<PlaySession> {
  const session = this.initSession(puzzle);
  let state = puzzle.toState();

  while (!state.isSolved() && !session.abandoned) {
    // 1. Build prompt
    const prompt = await this.buildPrompt(state, session.experiences);

    // 2. Call LLM
    const response = await this.llmClient.chat([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ]);

    // 3. Parse response
    const move = this.parseMove(response);
    if (!move) {
      // Malformed response - ask again
      session.experiences.push(this.recordParseFailure(response));
      continue;
    }

    // 4. Validate move
    const validation = this.validator.validate(state, move, puzzle.solution);

    // 5. Record experience
    const experience = this.recordExperience(state, move, validation);
    session.experiences.push(experience);

    // 6. Update state ONLY if correct
    // IMPORTANT: Only apply correct moves to avoid corrupting the grid state
    if (validation.isCorrect) {
      state = state.applyMove(move);
      session.correctMoves++;
    } else if (validation.isValid) {
      // Valid but wrong - don't apply! Tell LLM it's wrong and let it retry
      session.validButWrongMoves++;
    } else {
      // Invalid - rule violation, don't apply
      session.invalidMoves++;
    }

    session.totalMoves++;

    // 7. Persist experience if memory enabled
    if (this.config.memoryEnabled) {
      await this.experienceStore.save(experience);
    }

    // 8. Emit progress for TUI
    this.emit('move', { experience, state });
  }

  session.endTime = new Date();
  session.solved = state.isSolved();

  return session;
}
```

## Memory Toggle Behavior

### Memory ON
- Past experiences included in prompts (up to maxHistoryMoves)
- Few-shot examples from successful patterns
- Error patterns from similar puzzles
- Full context for learning

### Memory OFF
- Only current puzzle state in prompt
- No history from this puzzle
- No few-shot examples
- Fresh start every time

### Verification Protocol
To verify learning is working:
1. Solve 5 puzzles with memory OFF - record avg moves
2. Solve 5 puzzles with memory ON - record avg moves
3. Compare: Memory ON should show improvement over time
4. After dreaming consolidation, repeat test

## Dreaming Consolidation (LLM-Driven)

The dreaming phase is where the LLM "brain" consolidates experiences during a "sleep cycle" -
analogous to how human memory consolidation works during sleep. The LLM itself analyzes its
experiences and synthesizes reusable strategies.

### Key Principle: LLM Performs the Synthesis

The LLM must **analyze and synthesize** patterns from its experiences - NOT just copy raw move data.
This is the critical difference from simple replay or keyword matching.

### CRITICAL: Full Reasoning Must Be Used

**NEVER truncate reasoning.** The complete thought process for each move must be fed to the LLM
during dreaming. Truncating to 200 characters (like `.substring(0, 200)`) destroys the learning signal.

The LLM produces detailed reasoning like:
> "Looking at row 3, cells 1,2,4,5,6,7,9 are filled with 1,4,7,2,5,8,9. The only missing values
> are 3 and 6. Cell (3,3) is in box 1 which already has 3 in position (1,1). Therefore, cell
> (3,3) must be 6. Cell (3,8) must be 3."

The complete chain is essential for extracting the underlying strategy.

### LLM Pattern Synthesis

The LLM analyzes clusters of similar experiences and synthesizes WHAT worked and WHY:

```typescript
// Example LLM synthesis prompt for a cluster of experiences
const synthesisPrompt = `You are reviewing ${cluster.length} successful Sudoku moves you made.
Analyze them and extract a REUSABLE STRATEGY.

Your successful moves:
${cluster.map((exp, i) => `
${i + 1}. Grid context: ${describeGridContext(exp.gridState, exp.move)}
   Your move: (${exp.move.row},${exp.move.col}) = ${exp.move.value}

   YOUR FULL REASONING:
   ${exp.move.reasoning}  // ← FULL reasoning, never truncated!
`).join('\n\n')}

Synthesize a reusable strategy in this format:
STRATEGY_NAME: [Short name, e.g., "Last Digit in Row"]
WHEN_TO_USE: [Conditions that signal this strategy applies]
REASONING_STEPS:
1. [First step]
2. [Second step]
HOW_TO_EXECUTE: [Step-by-step approach]
EXAMPLE: [One clear example from your experiences]
`;
```

### 4-Level Abstraction Hierarchy

Few-shots should represent different abstraction levels, built by the LLM:

| Level | Name | Example | Purpose |
|-------|------|---------|---------|
| 0 | Instance | "Cell (3,5) had only 7 missing from row" | Specific example |
| 1 | Technique | "When a row has 8 cells filled, the empty cell must contain the missing digit" | Named technique |
| 2 | Category | "Row/Column/Box completion strategies" | Group related techniques |
| 3 | Principle | "Constraint satisfaction: find cells with minimum options" | General principle |

### LLM-Determined Abstraction Levels (Added 2026-01-11)

During pattern synthesis, the LLM determines the appropriate abstraction level for each pattern instead of hardcoding all patterns to Level 1.

**Synthesis Prompt Addition**:
```
ABSTRACTION_LEVEL: [0-3, where:
  0 = Specific instance (concrete example with exact cell/values)
  1 = Named technique (reusable pattern with clear trigger)
  2 = Strategy category (groups related techniques)
  3 = General principle (universal problem-solving rule)]
```

**Level Determination Guidelines**:
- Level 0: Pattern references specific cell positions or exact configurations
- Level 1: Pattern describes a repeatable technique (e.g., "Last Digit in Row")
- Level 2: Pattern groups techniques (e.g., "Elimination strategies")
- Level 3: Pattern expresses universal principle (e.g., "Constraint propagation")

**Diversity Requirement**: Few-shots SHOULD include patterns at multiple levels, not all Level 1. The LLM evaluates each pattern's specificity to assign the appropriate level during synthesis.

### Few-Shot Quality Requirements

- Each few-shot must be **LLM-synthesized**, not raw move data
- Must include: strategy name, conditions, reasoning pattern, example
- No duplicates (same strategy at same abstraction level)
- Aim for 5-7 few-shots covering different strategies
- Target compression ratio: 10:1 (e.g., 91 experiences → 9 patterns)

### Strategy Diversity Enforcement (Added 2026-01-09)

Few-shot selection must ensure **diverse strategies**, not variations of the same technique:

**Problem**: Without diversity enforcement, all few-shots may teach the same strategy (e.g., 5 variations of "naked singles"), providing no learning value.

**Solution**: LLM-driven diversity selection. The LLM itself evaluates strategies and selects diverse ones:

```typescript
// The LLM is prompted to select diverse strategies
const prompt = `You have synthesized ${patterns.length} strategies.

Your strategies:
${patterns.map((p, i) => `${i + 1}. ${p.strategyName}: ${p.whenToUse}`).join('\n')}

Select 3-5 DIVERSE strategies. Do NOT select strategies that use the same technique.
For each, explain WHY it's different from others you selected.`;

// The LLM returns which strategies to keep, with justification
```

**Key Principle**: The LLM does the diversity evaluation, not programmatic keyword matching.

### Negative Example Learning (Added 2026-01-09)

During dreaming, the LLM analyzes its invalid moves and synthesizes **anti-patterns**:

```typescript
// The LLM is prompted to analyze its mistakes
const prompt = `You made ${invalid.length} invalid moves.

Your mistakes:
${mistakes.map(m => `Move (${m.row},${m.col})=${m.value}: ${m.error}`)}

Analyze and identify ANTI-PATTERNS - things you should NOT do.
For each: MISTAKE, WHY_WRONG, INSTEAD.`;

// The LLM synthesizes patterns of errors, not a hardcoded mapping
```

**Key Principle**: The LLM synthesizes what it learned from mistakes as free text.
Anti-patterns are stored as part of the consolidation insights, not as structured data.

### Consolidation Algorithm

```typescript
async consolidate(profileName?: string): Promise<ConsolidationReport> {
  // Phase 1: CAPTURE (already done during play)
  let experiences = await this.store.getUnconsolidated(profileName);

  if (experiences.length < 10) {
    return this.createEmptyReport(); // Need minimum experiences
  }

  // Phase 2: TRIAGE - Filter by importance
  experiences = experiences
    .sort((a, b) => b.importance - a.importance)
    .filter(e => e.importance >= 0.6);

  // Phase 3: COMPRESSION - Cluster and LLM synthesizes patterns
  const successful = experiences.filter(e => e.validation.isCorrect);
  const clusters = this.clusterByReasoning(successful);

  const synthesizedPatterns: SynthesizedPattern[] = [];
  for (const [clusterName, cluster] of clusters) {
    if (cluster.length >= 2) {
      // LLM synthesizes pattern from cluster (uses FULL reasoning)
      const pattern = await this.synthesizePattern(cluster, clusterName);
      synthesizedPatterns.push(pattern);
    }
  }

  // Phase 4: ABSTRACTION - LLM builds hierarchy
  const hierarchy = await this.buildAbstractionHierarchy(synthesizedPatterns);

  // Phase 5: INTEGRATION - Generate few-shots from synthesized patterns
  const fewShots = await this.generateFewShotsFromPatterns(synthesizedPatterns);

  // Store results
  await this.store.saveFewShots(fewShots, profileName);
  await this.store.saveAbstractionHierarchy(hierarchy, profileName);
  await this.store.markConsolidated(experiences.map(e => e.id));

  return {
    patterns: synthesizedPatterns,
    hierarchy,
    fewShotsUpdated: fewShots.length,
    experiencesConsolidated: experiences.length,
    compressionRatio: experiences.length / synthesizedPatterns.length,
  };
}
```

## Profile-Specific Learning

Each LLM profile maintains its own independent learning trajectory. This enables:
1. **A/B Testing** - Compare performance of different models/configurations
2. **Learning Isolation** - Prevent cross-contamination between profiles
3. **Baseline Comparison** - Test with/without learned patterns

### Storage Namespacing

Few-shot examples are stored per-profile using namespaced keys:

```typescript
// Storage key format
const fewShotsKey = `llm_fewshots:${profileName}`;

// Example keys:
// - llm_fewshots:qwen3-coder
// - llm_fewshots:gpt4-turbo
// - llm_fewshots:default
```

### Profile-Aware Consolidation

The `DreamingConsolidator.consolidate()` method accepts an optional `profileName` parameter:

```typescript
// Consolidate only experiences from specific profile
async consolidate(profileName?: string): Promise<ConsolidationReport> {
  // Get experiences for this profile only
  const experiences = await this.store.getUnconsolidated(profileName);

  // Process and extract patterns
  const patterns = this.extractPatterns(experiences);

  // Save few-shots for THIS profile
  await this.store.saveFewShots(patterns.fewShots, profileName);

  // Mark experiences as consolidated
  await this.store.markConsolidated(experiences.map(e => e.id));

  return { experiencesProcessed: experiences.length, ...patterns };
}
```

### ExperienceStore Interface

The ExperienceStore provides profile-aware methods:

```typescript
interface ExperienceStore {
  // Save single experience
  save(experience: LLMExperience): Promise<void>;

  // Profile-aware methods
  getFewShots(profileName?: string, limit?: number): Promise<FewShotExample[]>;
  saveFewShots(examples: FewShotExample[], profileName?: string): Promise<void>;
  getUnconsolidated(profileName?: string): Promise<LLMExperience[]>;
  markConsolidated(experienceIds: string[]): Promise<void>;

  // Statistics
  getStats(): Promise<ExperienceStats>;
}
```

### Learning Control

Players can enable/disable learning via the `useLearning` parameter:

```typescript
// Play WITH learned patterns (default)
const session = await player.playPuzzle(
  puzzleId,
  grid,
  solution,
  maxMoves,
  true  // useLearning = true
);

// Play WITHOUT learned patterns (baseline)
const baselineSession = await player.playPuzzle(
  puzzleId,
  grid,
  solution,
  maxMoves,
  false // useLearning = false
);
```

This enables rigorous A/B testing:
- **Control group**: `--no-learning` flag (no few-shots injected)
- **Treatment group**: Default behavior (few-shots loaded if available)
- **Comparison**: Measure performance difference to verify learning works

## Learning Units

Learning Units provide a higher-level abstraction for managing consolidated knowledge. While profiles define the LLM connection, learning units define discrete packages of learned strategies that can be independently created, updated, merged, and shared.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Learning Unit** | A named package of few-shots and metadata, identified by profile + unit ID |
| **Unit ID** | Unique identifier within a profile (e.g., "easy-puzzles", "advanced-techniques") |
| **Absorbed Experiences** | Experiences that have been consolidated into this unit |
| **Metadata** | Statistics about the unit's content and source |

### Why Learning Units?

1. **Multiple Learning Tracks** - Train on different puzzle types separately
2. **Iterative Learning** - Absorb new experiences over time without losing prior learning
3. **Merge & Distill** - Combine units and let LLM synthesize the best strategies
4. **Export/Import** - Share learned knowledge between installations
5. **Experimentation** - Compare performance of different learning approaches

### Learning Unit Interface

```typescript
interface LearningUnit {
  id: string;                           // Unique ID within profile
  profileName: string;                  // Parent profile
  name: string;                         // Display name (e.g., "Easy Puzzles")
  description?: string;                 // Optional description
  createdAt: Date;
  lastUpdatedAt: Date;

  // Content
  fewShots: FewShotExample[];           // Consolidated strategies
  hierarchy?: AbstractionHierarchy;     // Abstraction levels

  // Tracking
  absorbedExperienceIds: string[];      // Experiences already absorbed
  metadata: LearningUnitMetadata;
}

interface LearningUnitMetadata {
  totalExperiences: number;             // Total experiences absorbed
  puzzleBreakdown: Record<string, number>; // e.g., {"4x4:easy": 50, "9x9:hard": 20}
  lastConsolidationAt?: Date;
  mergedFromUnits?: string[];           // If this unit was created from merging
  version: number;                      // Increments on each update
}
```

### Storage Keys

Learning unit data is stored using namespaced keys:

```typescript
// Few-shots for a specific learning unit
const fewShotsKey = `llm_fewshots:${profileName}:${learningUnitId}`;

// Learning unit metadata
const metadataKey = `llm_learning_unit:${profileName}:${learningUnitId}`;

// Example keys:
// - llm_fewshots:qwen3-coder:default
// - llm_fewshots:qwen3-coder:easy-puzzles
// - llm_learning_unit:qwen3-coder:advanced-techniques
```

### Default Learning Unit

For backwards compatibility, a "default" unit exists for each profile:
- ID: `default`
- Created automatically if no unit specified
- Used when `--learning-unit` option is omitted

### Learning Unit CLI Commands

```bash
# List all learning units for a profile
machine-dream llm learning list [--profile <name>]

# Create new learning unit
machine-dream llm learning create <id> [--profile <name>] [--description <text>]

# Show unit details and metadata
machine-dream llm learning show <id> [--profile <name>]

# Delete a learning unit
machine-dream llm learning delete <id> [--yes]

# Merge multiple units into one
machine-dream llm learning merge <unit1> <unit2> [--output <new-id>] [--profile <name>]

# Export unit to JSON file
machine-dream llm learning export <id> <file> [--profile <name>]

# Import unit from JSON file
machine-dream llm learning import <file> [--id <override-id>] [--profile <name>]
```

### Using Learning Units in Play

```bash
# Play using specific learning unit
machine-dream llm play puzzle.json --learning-unit easy-puzzles

# Play with default unit (backwards compatible)
machine-dream llm play puzzle.json

# Dream consolidation updates specific unit
machine-dream llm dream run --learning-unit easy-puzzles
```

## Enhanced Prompt Format

The prompt format for learned strategies has been enhanced to require explicit evaluation before each move. This ensures the LLM actively considers its learned patterns rather than ignoring them.

### Strategy Evaluation Section

When learning is enabled, strategies are presented in a format that requires evaluation:

```
LEARNED STRATEGIES - EVALUATE EACH BEFORE MOVING:

Strategy 1: "Last Digit in Row"
Situation: When a row has only one empty cell remaining
Steps:
  1. Identify which digit 1-9 is missing from the row
  2. Place that digit in the empty cell

Strategy 2: "Single Candidate"
Situation: When a cell has only one valid digit remaining
Steps:
  1. Check row, column, and box constraints
  2. Eliminate impossible digits
  3. If only one remains, place it

Before moving, for EACH strategy above:
1. Does this situation match the current board? (YES/NO)
2. If YES, what is your confidence (1-10)?

Use the highest-confidence applicable strategy (7+).
If none apply confidently, use your own reasoning.
```

### Design Principles

| Principle | Description |
|-----------|-------------|
| **Explicit Evaluation** | Force LLM to state YES/NO for each strategy |
| **Confidence Rating** | Numeric score (1-10) indicates certainty |
| **Threshold Guidance** | Only use strategies with confidence 7+ |
| **Fallback Path** | Clear instruction for when no strategy applies |
| **Concise Language** | Under 100 words per strategy |
| **No Aggressive Tone** | Calm, instructional language |

### Prompt Builder Changes

The `PromptBuilder.formatStrategiesWithEvaluation()` method replaces `formatFewShots()`:

```typescript
formatStrategiesWithEvaluation(fewShots: FewShotExample[]): string {
  if (fewShots.length === 0) return '';

  const strategies = fewShots.map((fs, i) => `
Strategy ${i + 1}: "${fs.strategyName}"
Situation: ${fs.whenToUse}
Steps:
${fs.reasoningSteps.map((s, j) => `  ${j + 1}. ${s}`).join('\n')}
`).join('\n');

  return `
LEARNED STRATEGIES - EVALUATE EACH BEFORE MOVING:

${strategies}

Before moving, for EACH strategy above:
1. Does this situation match the current board? (YES/NO)
2. If YES, what is your confidence (1-10)?

Use the highest-confidence applicable strategy (7+).
If none apply confidently, use your own reasoning.
`;
}
```

## Iterative Learning

Iterative learning allows a learning unit to absorb new experiences over time without losing prior consolidated knowledge. This is critical for continuous improvement.

### Re-Consolidation Process

Unlike initial consolidation (which starts fresh), re-consolidation:
1. Loads existing few-shots from the learning unit
2. Gets new unconsolidated experiences not yet absorbed
3. Synthesizes patterns from new experiences
4. Uses LLM to merge new patterns with existing (deduplicate, select best)
5. Saves merged few-shots back to the unit
6. Marks experiences as absorbed
7. Updates metadata (counts, puzzle breakdown)

### LLM-Driven Merging

When merging new patterns with existing, the LLM evaluates and decides:

```typescript
const mergePrompt = `You have existing strategies and new strategies to integrate.

EXISTING STRATEGIES (proven effective):
${existingStrategies.map(s => `- ${s.name}: ${s.whenToUse}`).join('\n')}

NEW STRATEGIES (from recent experiences):
${newStrategies.map(s => `- ${s.name}: ${s.whenToUse}`).join('\n')}

Merge these into a unified set of 5-7 strategies:
1. Keep existing strategies that are still valuable
2. Add new strategies that provide different insights
3. Remove duplicates (same technique, different wording)
4. Prefer more specific, actionable strategies

For each strategy in your merged set, explain why you kept/added it.`;
```

### Absorption Tracking

Experiences are tracked to prevent re-processing:

```typescript
interface ExperienceStore {
  // Get unconsolidated experiences EXCLUDING already-absorbed ones
  getUnconsolidatedExcluding(
    profileName: string,
    excludeIds: string[]
  ): Promise<LLMExperience[]>;

  // Mark experiences as absorbed by a learning unit
  markAbsorbedByUnit(
    experienceIds: string[],
    learningUnitId: string
  ): Promise<void>;
}
```

### Iterative Learning Script

See Spec 15 for the `iterative-learning.sh` script that automates:
1. Play N puzzles with learning
2. Dream to absorb experiences
3. Repeat for multiple batches
4. Track improvement over iterations

## Learning Unit Merging

Learning units can be merged to combine knowledge from different training runs or puzzle types.

### Merge Process

```bash
# Merge two units into a new one
machine-dream llm learning merge unit-a unit-b --output merged-unit
```

The merge process:
1. Load few-shots from all source units
2. Present all strategies to LLM
3. LLM selects diverse, non-redundant strategies
4. LLM synthesizes unified abstraction hierarchy
5. Create new unit with merged content
6. Metadata tracks which units were merged

### LLM-Driven Distillation

The LLM decides which strategies to keep:

```typescript
const distillPrompt = `You have strategies from ${units.length} different learning sessions.

${units.map((u, i) => `
=== Unit ${i + 1}: ${u.name} ===
${u.fewShots.map(fs => `- ${fs.strategyName}: ${fs.whenToUse}`).join('\n')}
`).join('\n')}

Create a UNIFIED set of 5-7 strategies that:
1. Covers the most important techniques from all units
2. Eliminates redundancy (same strategy, different words)
3. Prefers strategies that are clear and actionable
4. Maintains abstraction hierarchy (specific → general)

Return your merged strategy set with explanations.`;
```

### Merge Metadata

```typescript
interface LearningUnitMetadata {
  // ... other fields ...
  mergedFromUnits?: string[];  // Source unit IDs if merged
}
```

## Metrics

### Per-Puzzle Metrics
- Total moves attempted
- Correct moves (match solution)
- Invalid moves (rule violations)
- Valid but wrong moves
- Time to solve (if solved)
- Memory was enabled (yes/no)

### Aggregate Metrics (tracked over time)
- Puzzles attempted
- Puzzles solved
- Average moves to solve
- Invalid move rate (should decrease)
- First-attempt accuracy (should increase)
- Improvement rate (comparing memory ON vs OFF)

### Learning Indicators
- Reduction in common error types
- Increased use of successful patterns
- Faster solving of similar puzzles
- Higher accuracy on first attempt

## CLI Commands

### Profile Management (Spec 13)

**IMPORTANT**: LLM connection profiles are managed via `llm profile` commands. See [Spec 13: LLM Profile Management](./13-llm-profile-management.md) for complete details.

```bash
# Profile Management Commands
machine-dream llm profile list                    # List all saved profiles
machine-dream llm profile add                     # Create new profile (interactive)
machine-dream llm profile set lm-studio-local     # Set active profile
machine-dream llm profile show lm-studio-local    # View profile details
machine-dream llm profile test                    # Test connection

# Example: Create profile for LM Studio
machine-dream llm profile add \
  --name lm-studio-local \
  --provider lmstudio \
  --base-url http://localhost:1234/v1 \
  --model qwen3-30b \
  --temperature 0.7

# Example: Create profile for OpenAI
machine-dream llm profile add \
  --name openai-gpt4 \
  --provider openai \
  --api-key ${OPENAI_API_KEY} \
  --model gpt-4
```

### LLM Sudoku Player Commands

```bash
# Play a puzzle with LLM (uses active profile)
npm run llm:play -- --puzzle easy-01

# Play with memory disabled (baseline)
npm run llm:play -- --puzzle easy-01 --no-memory

# Play with specific profile
npm run llm:play -- --puzzle easy-01 --profile lm-studio-local

# View learning statistics
npm run llm:stats

# Run dreaming consolidation
npm run llm:dream

# Compare memory ON vs OFF performance
npm run llm:benchmark
```

## Current Implementation Notes (2026-01-08)

### Enhancement History

**Previous Issues (Before 2026-01-08 Evening)**:
- Parser extracted first occurrence of ROW/COL/VALUE, risking mid-thought values
- Prompt included both visual grid AND row format (~25 lines wasted)
- No constraint information provided before LLM call
- No forbidden move tracking (LLM repeated same invalid moves)
- Token limit at 768 caused response cutoffs

**Implemented Enhancements (2026-01-08 Evening)**:

1. **Parser Improvements** ✅
   - Now finds LAST complete set of ROW/COL/VALUE appearing together (within 200 chars)
   - Prevents extracting mid-thought values from LLM's reasoning process
   - Falls back to first occurrence if no complete set found

2. **Grid Simplification** ✅
   - Removed visual grid (box drawing characters)
   - Use only compact row format: `R1: 5,3,_,_,7,_,_,_,_`
   - Saves ~25 lines in prompt, reduces token usage

3. **Constraint Pre-Information** ✅
   - Prompt now includes "FILLED CELLS (cannot be changed)" section
   - Lists all filled cells to prevent LLM proposing moves for them
   - Format: `(1,1)=5, (1,2)=3, (1,3)=4, ...`

4. **Forbidden Move Tracking** ✅
   - Extracts INVALID and VALID_BUT_WRONG (cell,value) pairs from experience history
   - Displays "FORBIDDEN MOVES (do not attempt again)" in prompt
   - Prevents LLM from repeatedly attempting same wrong moves
   - Added "CRITICAL CONSTRAINT" in system prompt explicitly forbidding these moves

### Forbidden Move Tracking Fix (Added 2026-01-11)

**Critical Implementation Requirement**: The forbidden move list MUST be built from the FULL session history, not truncated history. This ensures old forbidden moves remain forbidden even when move history display is limited to the last N moves.

**Problem**: When move history is truncated (e.g., last 20 moves), building the forbidden list from truncated history causes old forbidden moves to be "forgotten", allowing the LLM to re-propose them.

**Solution**:
```typescript
// CORRECT: Full history for forbidden list, truncated for display
const forbiddenMoves = extractForbiddenMoves(session.experiences);  // ALL experiences
const historyToShow = session.experiences.slice(-maxHistoryMoves);  // Truncated for display

// WRONG: Truncated history loses old forbidden moves
const historyToShow = session.experiences.slice(-maxHistoryMoves);
const forbiddenMoves = extractForbiddenMoves(historyToShow);  // BUG: loses old forbidden
```

**Prompt Display**:
- Show up to 30 forbidden moves (increased from 15)
- Group in sets of 10 for readability
- Include count of omitted moves if exceeding cap

5. **Token Limit Increase** ✅
   - Raised from 768 to 2048 tokens
   - Allows complete reasoning without mid-analysis cutoff
   - Reduces circular reasoning caused by premature truncation

## Error Handling

### LLM Connection Failure
- Retry with exponential backoff (3 attempts)
- If persistent, log error and pause
- Do NOT fall back to deterministic solving

### Malformed Response
- Log the raw response
- Ask LLM to try again with clearer instructions
- After 3 parse failures, record as failed attempt

### Infinite Loop Detection
- Track if same invalid move repeated 3+ times
- Log pattern for debugging
- Continue anyway (LLM must learn)

## Success Criteria

1. **LLM can solve easy puzzles** - May take 100+ moves initially
2. **Error rate decreases** - Measurable reduction over 10+ puzzles
3. **Memory improves performance** - ON vs OFF shows statistical difference
4. **Dreaming produces useful patterns** - Extracted strategies are reused
5. **System runs offline** - Works entirely with local LM Studio

## Non-Goals

The following are explicitly **NOT** goals:

- Optimal solving (minimal moves)
- Competing with algorithmic solvers
- Solving hard puzzles initially
- Fast inference times
- Perfect accuracy

The goal is **learning through experience**, not performance optimization.
