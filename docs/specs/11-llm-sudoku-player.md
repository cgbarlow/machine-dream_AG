# Specification 11: LLM Sudoku Player

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
├── types.ts                # LLM-specific type definitions
└── config.ts               # LM Studio configuration
```

## Interfaces

### Configuration

```typescript
interface LLMConfig {
  // LM Studio connection
  baseUrl: string;          // 'http://localhost:1234/v1'
  model: string;            // 'qwen3-30b' or 'local-model'

  // Generation parameters
  temperature: number;      // 0.7 default
  maxTokens: number;        // 1024 for reasoning
  timeout: number;          // 60000ms for large models

  // Learning settings
  memoryEnabled: boolean;   // Toggle for A/B testing
  maxHistoryMoves: number;  // How many past moves to include

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
}
```

### Play Session

```typescript
interface PlaySession {
  puzzleId: string;
  startTime: Date;
  endTime?: Date;

  // Outcome
  solved: boolean;
  abandoned: boolean;

  // Statistics
  totalMoves: number;
  correctMoves: number;
  invalidMoves: number;
  validButWrongMoves: number;

  // Learning data
  experiences: LLMExperience[];
  memoryWasEnabled: boolean;
}
```

## Prompt Engineering

### System Prompt

```
You are learning to solve Sudoku puzzles through practice and feedback.

RULES:
- A 9x9 grid divided into nine 3x3 boxes
- Each row must contain digits 1-9 exactly once
- Each column must contain digits 1-9 exactly once
- Each 3x3 box must contain digits 1-9 exactly once

GRID NOTATION:
- Numbers 1-9 are filled cells (cannot be changed)
- The dot (.) represents an empty cell you can fill
- Rows are numbered 1-9 from top to bottom
- Columns are numbered 1-9 from left to right

YOUR TASK:
Analyze the current puzzle state and propose ONE move.
Think step-by-step about which cell to fill and why.

RESPONSE FORMAT (you must follow this exactly):
ROW: <number 1-9>
COL: <number 1-9>
VALUE: <number 1-9>
REASONING: <your step-by-step analysis>
```

### Puzzle State Prompt (with history)

```
CURRENT PUZZLE STATE:
    1 2 3   4 5 6   7 8 9
  ┌───────┬───────┬───────┐
1 │ 5 3 . │ . 7 . │ . . . │
2 │ 6 . . │ 1 9 5 │ . . . │
3 │ . 9 8 │ . . . │ . 6 . │
  ├───────┼───────┼───────┤
4 │ 8 . . │ . 6 . │ . . 3 │
5 │ 4 . . │ 8 . 3 │ . . 1 │
6 │ 7 . . │ . 2 . │ . . 6 │
  ├───────┼───────┼───────┤
7 │ . 6 . │ . . . │ 2 8 . │
8 │ . . . │ 4 1 9 │ . . 5 │
9 │ . . . │ . 8 . │ . 7 9 │
  └───────┴───────┴───────┘

YOUR PREVIOUS ATTEMPTS ON THIS PUZZLE:
Move 1: (2,2)=7 → INVALID: Value 7 already exists in column 2
Move 2: (2,2)=4 → CORRECT: Good move!
Move 3: (1,3)=2 → INVALID: Value 2 already exists in box 1

Empty cells remaining: 48

What is your next move?
```

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

    // 6. Update state if valid
    if (validation.isValid) {
      state = state.applyMove(move);
      if (validation.isCorrect) {
        session.correctMoves++;
      } else {
        session.validButWrongMoves++;
        // Note: We apply valid-but-wrong moves and let LLM discover the error later
      }
    } else {
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

## Dreaming Consolidation

The dreaming phase synthesizes patterns from accumulated experiences:

```typescript
async consolidate(): Promise<ConsolidationReport> {
  // 1. Load experiences since last consolidation
  const experiences = await this.store.getUnconsolidated();

  // 2. Group by outcome
  const successful = experiences.filter(e => e.validation.isCorrect);
  const invalid = experiences.filter(e => !e.validation.isValid);
  const wrong = experiences.filter(e =>
    e.validation.isValid && !e.validation.isCorrect
  );

  // 3. Extract patterns
  const patterns = {
    successStrategies: this.extractStrategies(successful),
    commonErrors: this.groupErrors(invalid),
    wrongPathPatterns: this.analyzeWrongPaths(wrong)
  };

  // 4. Use LLM to synthesize insights
  const insights = await this.llmClient.chat([
    { role: 'system', content: 'Analyze these Sudoku solving experiences...' },
    { role: 'user', content: JSON.stringify(patterns) }
  ]);

  // 5. Update few-shot examples
  await this.updateFewShots(patterns.successStrategies);

  // 6. Store insights
  await this.store.saveInsights(insights);

  // 7. Mark experiences as consolidated
  await this.store.markConsolidated(experiences);

  return { patterns, insights };
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

```bash
# Play a puzzle with LLM
npm run llm:play -- --puzzle easy-01

# Play with memory disabled (baseline)
npm run llm:play -- --puzzle easy-01 --no-memory

# View learning statistics
npm run llm:stats

# Run dreaming consolidation
npm run llm:dream

# Compare memory ON vs OFF performance
npm run llm:benchmark
```

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
