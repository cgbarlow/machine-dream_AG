# LLM Integration Plan: True Machine Dreaming POC

> **IMPORTANT**: This is a planning document. All implementation MUST follow the formal specifications.
> Always build to spec - no changes unless outlined in specification documents.

## Specification References

This integration plan is governed by the following specifications:

| Spec | Document | Relevance |
|------|----------|-----------|
| **Spec 11** | [LLM Sudoku Player](specs/11-llm-sudoku-player.md) | **Primary spec** - Core LLM player architecture |
| **Spec 03** | [GRASP Loop](specs/03-grasp-loop-spec.md) | LLM drives Generate phase |
| **Spec 05** | [Dreaming Pipeline](specs/05-dreaming-pipeline-spec.md) | LLM experience consolidation |
| **Spec 07** | [Integration Orchestration](specs/07-integration-orchestration-spec.md) | LLM event types and lifecycle |
| **Spec 08** | [AgentDB Integration](specs/08-agentdb-integration-spec.md) | LLMExperience storage (Appendix D) |
| **Spec 09** | [CLI Interface](specs/09-cli-interface-spec.md) | `llm` command and subcommands |
| **Spec 10** | [TUI Interface](specs/10-terminal-menu-interface-spec.md) | LLM Solve Screen visualization |

**Implementation Rule**: Before implementing any component, verify it is defined in the appropriate specification. If a feature is not specified, update the spec first, then implement.

## The Problem

Current system is **NOT** a true LLM Sudoku player. It uses:
- Deterministic rule-based strategies (naked singles, hidden singles)
- Traditional backtracking/search algorithms
- The LLM is never actually called

## The Vision

An LLM that **actually plays Sudoku**:
1. Receives puzzle state as input
2. Reasons about the puzzle
3. Proposes a move
4. Gets feedback (valid/invalid, correct/incorrect)
5. Learns from outcomes
6. Improves over time through "dreaming" consolidation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    LLM Sudoku Player                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │   Puzzle State   │───▶│  Prompt Builder  │                   │
│  │   (9x9 grid)     │    │                  │                   │
│  └─────────────────┘    └────────┬─────────┘                   │
│                                  │                              │
│                                  ▼                              │
│  ┌─────────────────────────────────────────┐                   │
│  │           LM Studio Client              │                   │
│  │  (OpenAI-compatible: localhost:1234)    │                   │
│  └────────────────────┬────────────────────┘                   │
│                       │                                         │
│                       ▼                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │         LLM Response Parser             │                   │
│  │  Extracts: row, col, value, reasoning   │                   │
│  └────────────────────┬────────────────────┘                   │
│                       │                                         │
│                       ▼                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │           Move Validator                │                   │
│  │  • Is cell empty?                       │                   │
│  │  • Does value violate Sudoku rules?     │                   │
│  │  • Does move match solution?            │                   │
│  └────────────────────┬────────────────────┘                   │
│                       │                                         │
│           ┌───────────┴───────────┐                            │
│           ▼                       ▼                             │
│  ┌─────────────┐         ┌─────────────────┐                   │
│  │   Valid     │         │    Invalid      │                   │
│  │   Apply &   │         │    Explain      │                   │
│  │   Continue  │         │    Error &      │                   │
│  │             │         │    Retry        │                   │
│  └──────┬──────┘         └────────┬────────┘                   │
│         │                         │                             │
│         └────────────┬────────────┘                            │
│                      ▼                                          │
│  ┌─────────────────────────────────────────┐                   │
│  │         Experience Storage              │                   │
│  │  AgentDB: moves, outcomes, patterns     │                   │
│  └─────────────────────────────────────────┘                   │
│                      │                                          │
│                      ▼                                          │
│  ┌─────────────────────────────────────────┐                   │
│  │       Dreaming / Consolidation          │                   │
│  │  • Analyze successful patterns          │                   │
│  │  • Identify common mistakes             │                   │
│  │  • Generate strategic insights          │                   │
│  │  • Update few-shot examples             │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. LLM Client (`/src/llm/LMStudioClient.ts`)

```typescript
interface LLMClientConfig {
  baseUrl: string;          // 'http://localhost:1234/v1'
  model: string;            // 'local-model' or specific name
  temperature: number;      // 0.7 for exploration, 0.1 for exploitation
  maxTokens: number;        // 512 for move + reasoning
  timeout: number;          // 30000ms
}

class LMStudioClient {
  async chat(messages: Message[]): Promise<string>;
  async generateMove(prompt: string): Promise<LLMMove>;
}
```

### 2. Prompt System (`/src/llm/prompts/`)

**System Prompt:**
```
You are learning to play Sudoku. You will be shown a 9x9 grid where:
- 0 represents an empty cell you can fill
- 1-9 are fixed numbers you cannot change

Rules:
- Each row must contain 1-9 exactly once
- Each column must contain 1-9 exactly once
- Each 3x3 box must contain 1-9 exactly once

Analyze the puzzle carefully and suggest ONE move.
Respond in this exact format:
ROW: <1-9>
COL: <1-9>
VALUE: <1-9>
REASONING: <your step-by-step logic>
```

**Puzzle State Prompt:**
```
Current puzzle state:
  1 2 3   4 5 6   7 8 9
  ─────────────────────
1 │ 5 3 .│ . 7 .│ . . .│
2 │ 6 . .│ 1 9 5│ . . .│
3 │ . 9 8│ . . .│ . 6 .│
  ├──────┼──────┼──────┤
4 │ 8 . .│ . 6 .│ . . 3│
5 │ 4 . .│ 8 . 3│ . . 1│
6 │ 7 . .│ . 2 .│ . . 6│
  ├──────┼──────┼──────┤
7 │ . 6 .│ . . .│ 2 8 .│
8 │ . . .│ 4 1 9│ . . 5│
9 │ . . .│ . 8 .│ . 7 9│
  ─────────────────────

Your previous attempts on this puzzle:
- Move (1,4)=6: INCORRECT - violated row constraint (6 exists in row 1)
- Move (1,4)=2: CORRECT - good move!

What is your next move?
```

### 3. Move Validator (`/src/llm/MoveValidator.ts`)

```typescript
interface MoveValidation {
  isValid: boolean;
  isCorrect: boolean;  // matches solution
  error?: string;      // "Value 5 already exists in row 3"
  hint?: string;       // "Consider what values are missing in column 4"
}

class MoveValidator {
  validate(puzzle: PuzzleState, move: Move): MoveValidation;
}
```

### 4. Experience Store (extends AgentDB)

```typescript
interface LLMExperience {
  puzzleId: string;
  puzzleState: number[][];
  move: { row: number; col: number; value: number };
  reasoning: string;
  outcome: 'correct' | 'invalid' | 'valid_but_wrong';
  errorMessage?: string;
  timestamp: Date;
  modelUsed: string;
}

// Store in ReasoningBank for pattern analysis
await agentDB.storeReasoning({
  trajectory_id: puzzleId,
  step_index: moveNumber,
  action: JSON.stringify(move),
  reasoning: llmReasoning,
  outcome: 'success' | 'failure',
  feedback: validationResult.error
});
```

### 5. Learning Loop

```typescript
class LLMSudokuPlayer {
  async playPuzzle(puzzle: Puzzle): Promise<PlaySession> {
    let state = puzzle.initialState;
    const experiences: LLMExperience[] = [];

    while (!this.isSolved(state)) {
      // 1. Build prompt with current state + past experiences
      const prompt = this.promptBuilder.build(state, experiences);

      // 2. Get LLM's move
      const llmResponse = await this.llmClient.generateMove(prompt);

      // 3. Validate the move
      const validation = this.validator.validate(state, llmResponse.move);

      // 4. Record experience
      experiences.push({
        puzzleState: state.grid,
        move: llmResponse.move,
        reasoning: llmResponse.reasoning,
        outcome: validation.isCorrect ? 'correct' :
                 validation.isValid ? 'valid_but_wrong' : 'invalid',
        errorMessage: validation.error
      });

      // 5. If valid, apply move
      if (validation.isValid) {
        state = this.applyMove(state, llmResponse.move);
      }

      // 6. If too many failures, offer hint or escalate
      if (this.consecutiveFailures > 5) {
        await this.provideHint(state);
      }
    }

    // 7. Store all experiences for dreaming
    await this.storeExperiences(experiences);

    return { solved: true, experiences, moveCount: experiences.length };
  }
}
```

### 6. Dreaming/Consolidation Phase

```typescript
class DreamingConsolidator {
  async consolidate(): Promise<ConsolidationReport> {
    // 1. Retrieve all experiences since last consolidation
    const experiences = await this.getRecentExperiences();

    // 2. Analyze patterns
    const patterns = {
      successfulMoves: this.groupBySuccess(experiences),
      commonErrors: this.findCommonErrors(experiences),
      strategyEffectiveness: this.analyzeStrategies(experiences)
    };

    // 3. Use LLM to synthesize insights
    const insights = await this.llmClient.chat([
      { role: 'system', content: 'Analyze these Sudoku solving experiences and extract patterns...' },
      { role: 'user', content: JSON.stringify(patterns) }
    ]);

    // 4. Update few-shot examples with best moves
    await this.updateFewShotExamples(patterns.successfulMoves);

    // 5. Store meta-insights for future reference
    await this.storeInsights(insights);

    return { patternsFound: patterns, newInsights: insights };
  }
}
```

## Configuration

### Environment Variables
```bash
# .env file
LLM_BASE_URL=http://localhost:1234/v1
LLM_MODEL=local-model
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=512
LLM_TIMEOUT=30000
```

### LM Studio Setup
1. Download & install LM Studio
2. Load a capable model (e.g., Llama 2 7B, Mistral 7B, Phi-3)
3. Start local server (default: localhost:1234)
4. Server provides OpenAI-compatible API

## Metrics & Learning Tracking

```typescript
interface LearningMetrics {
  // Per puzzle
  puzzleId: string;
  totalMoves: number;
  correctMoves: number;
  invalidMoves: number;
  validButWrongMoves: number;
  timeToSolve: number;
  hintsUsed: number;

  // Aggregate over time
  puzzlesSolved: number;
  avgMovesToSolve: number;
  accuracyTrend: number[];  // Track improvement
  commonMistakeReduction: Record<string, number>;
}
```

## Implementation Phases

### Phase 1: Basic LLM Play (MVP) ✅ COMPLETE
- [x] LM Studio client with OpenAI-compatible API
- [x] Basic prompt builder for puzzle state
- [x] Move parser and validator
- [x] Simple play loop
- [x] Console output showing LLM reasoning
- [x] CLI commands (llm play, llm stats)

### Phase 2: Learning & Memory ✅ COMPLETE
- [x] Experience storage in AgentDB
- [x] Few-shot examples in prompts
- [x] Error pattern tracking
- [x] Basic metrics collection
- [x] Memory toggle for A/B testing

### Phase 3: Dreaming Consolidation ✅ COMPLETE
- [x] Pattern analysis from experiences
- [x] LLM-powered insight synthesis
- [x] Updated prompts based on learnings
- [x] Performance improvement tracking
- [x] Benchmark command (memory ON vs OFF)
- [x] Automated few-shot generation

### Phase 4: TUI Integration
- [ ] Live display of LLM thinking
- [ ] Visual move validation feedback
- [ ] Learning progress dashboard
- [ ] Dreaming phase visualization

## Key Differences from Current System

| Aspect | Current System | LLM Integration |
|--------|---------------|-----------------|
| Move Generation | Rule-based algorithms | LLM reasoning |
| Learning | None (static) | Experience-based |
| Mistakes | Impossible (correct by design) | Expected & valuable |
| Improvement | N/A | Measurable over time |
| Reasoning | Hidden in code | Explicit in prompts |
| Dreaming | Pattern storage only | Active consolidation |

## Success Criteria

1. **LLM successfully solves easy puzzles** (may take many attempts)
2. **Error rate decreases over time** (measurable learning)
3. **Dreaming produces actionable insights** (not just data collection)
4. **System works offline** with LM Studio
5. **Graceful degradation** when LLM unavailable

## Design Decisions (FINAL)

These decisions have been made and are **non-negotiable**:

| Question | Decision | Rationale |
|----------|----------|-----------|
| Hint strategy | **NO HINTS** | LLM must struggle and learn independently |
| Deterministic fallback | **NONE** | Pure LLM only - no rule-based assistance |
| Model | **Qwen3 30B** | Running locally via LM Studio |
| Memory persistence | **YES** | Experiences persist across sessions |
| Memory toggle | **YES** | Enable/disable to verify learning works |
| Hybrid mode | **NO** | Pure LLM solving only |

## Target Configuration

```typescript
const config: LLMConfig = {
  baseUrl: 'http://localhost:1234/v1',
  model: 'qwen3-30b',
  temperature: 0.7,
  maxTokens: 1024,
  timeout: 60000,

  // Learning
  memoryEnabled: true,  // Toggle for A/B testing
  maxHistoryMoves: 20,  // Recent moves to include in prompt

  // Explicitly disabled
  enableHints: false,
  enableDeterministicFallback: false,
};
```

## Memory Toggle Verification

To scientifically verify that learning is working:

1. **Baseline (Memory OFF)**:
   - Solve 5 puzzles with `--no-memory` flag
   - Record average moves, error rate, solve time

2. **With Learning (Memory ON)**:
   - Solve 5 puzzles with memory enabled
   - Record same metrics

3. **Compare**:
   - Memory ON should show improvement over time
   - After dreaming consolidation, improvement should be more pronounced

4. **A/B Testing**:
   - Alternate between memory ON/OFF
   - Track performance divergence over sessions

## Implementation Checklist

Before implementing any feature, verify:

- [ ] Feature is defined in a specification document
- [ ] Interface types match spec definitions
- [ ] Event types are registered in Spec 07
- [ ] Storage types are defined in Spec 08
- [ ] CLI commands match Spec 09
- [ ] TUI screens match Spec 10

**If a feature is missing from specs**: Update the spec first, get approval, then implement.
