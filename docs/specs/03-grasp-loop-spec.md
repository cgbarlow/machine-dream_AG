# GRASP Loop Specification

**Component:** Core Continuous Thinking Mechanism
**Version:** 1.0
**Date:** January 4, 2026
**Status:** Implementation-Ready

---

## 1. Component Overview

### 1.1 Purpose and Responsibilities

The GRASP Loop (Generate-Review-Absorb-Synthesize-Persist) is the **core continuous thinking engine** that enables sustained, iterative problem-solving through cognitive persistence. It transforms single-shot AI responses into continuous, reflective reasoning that improves over time.

**Primary Responsibilities:**
- Execute iterative problem-solving cycles with self-reflection
- Maintain cognitive state across iterations
- Learn from successes and failures through experience absorption
- Synthesize insights by connecting patterns across iterations
- Manage iteration lifecycle and stopping conditions

### 1.2 Position in Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   COGNITIVE PUZZLE SOLVER                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  GRASP LOOP (THIS SPEC)                │ │
│  │                                                        │ │
│  │   ┌─────────┐   ┌─────────┐   ┌─────────┐           │ │
│  │   │GENERATE │──▶│ REVIEW  │──▶│ ABSORB  │           │ │
│  │   │ moves   │   │validate │   │ store   │           │ │
│  │   └─────────┘   └─────────┘   └────┬────┘           │ │
│  │         ▲                            │                │ │
│  │         │        ┌──────────┐        │                │ │
│  │         │        │SYNTHESIZE│◀───────┘                │ │
│  │         │        │ insights │                         │ │
│  │         │        └─────┬────┘                         │ │
│  │         │              │                              │ │
│  │         │        ┌─────▼────┐                         │ │
│  │         └────────│ PERSIST  │                         │ │
│  │                  │continue? │                         │ │
│  │                  └──────────┘                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                              │
│              ┌───────────────┼────────────────┐             │
│              ▼               ▼                ▼             │
│    ┌─────────────┐  ┌──────────────┐  ┌──────────┐        │
│    │   MEMORY    │  │  ATTENTION   │  │  PUZZLE  │        │
│    │   SYSTEM    │  │  MECHANISM   │  │  ENGINE  │        │
│    │ (Spec 02)   │  │  (Spec 04)   │  │ (Spec 01)│        │
│    └─────────────┘  └──────────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**Integration Points:**
- **Memory System**: Stores experiences, retrieves patterns, consolidates knowledge
- **Attention Mechanism**: Selects focus cells for next iteration
- **Puzzle Engine**: Validates moves, checks constraints, detects solution

### 1.3 Dependencies on Other Components

| Component | Dependency Type | Usage |
|-----------|----------------|-------|
| Puzzle Engine | Strong | Move validation, constraint checking, solution detection |
| Memory System | Strong | Experience storage, pattern retrieval, trajectory logging |
| Attention Mechanism | Strong | Focus selection, priority calculation |
| Dreaming Pipeline | Weak | Consolidation triggered after solving phase |

---

## 2. Functional Requirements

### 2.1 Core GRASP Phases

#### 2.1.1 GENERATE Phase

**Purpose:** Explore candidate moves for current puzzle state

**Input:**
```typescript
interface GenerateInput {
  currentState: PuzzleState;
  focus: Cell;  // From attention mechanism
  availableStrategies: string[];
  recentHistory: Move[];  // Last 5-10 moves
}
```

**Output:**
```typescript
interface GenerateOutput {
  candidateMoves: Move[];  // Ranked by promise
  strategiesApplied: string[];
  explorationDepth: number;
}
```

**Requirements:**
- FR-G1: MUST generate at least 1 valid candidate move if any exist
- FR-G2: SHOULD apply multiple strategies (naked single, hidden single, elimination, etc.)
- FR-G3: MUST rank candidates by confidence/likelihood of correctness
- FR-G4: SHOULD explore backtracking if no progress made in last N iterations
- FR-G5: MUST update candidate sets for all affected cells

**Algorithm:**
```typescript
async function generatePhase(input: GenerateInput): Promise<GenerateOutput> {
  const { currentState, focus, availableStrategies, recentHistory } = input;

  // 1. Select strategies based on puzzle state and recent success
  const selectedStrategies = selectStrategies(
    currentState,
    recentHistory,
    availableStrategies
  );

  // 2. Apply each strategy to generate candidate moves
  const candidates: Move[] = [];
  for (const strategy of selectedStrategies) {
    const moves = await applyStrategy(strategy, currentState, focus);
    candidates.push(...moves);
  }

  // 3. If stuck, consider backtracking or guessing
  if (candidates.length === 0 && isStuck(recentHistory)) {
    const backtrackMoves = await generateBacktrackMoves(currentState, recentHistory);
    candidates.push(...backtrackMoves);
  }

  // 4. Rank candidates by confidence
  const rankedMoves = rankByConfidence(candidates, currentState);

  // 5. Update candidate sets
  updateCandidateSets(currentState, rankedMoves);

  return {
    candidateMoves: rankedMoves,
    strategiesApplied: selectedStrategies,
    explorationDepth: candidates.length
  };
}

// Strategy selection based on context
function selectStrategies(
  state: PuzzleState,
  history: Move[],
  available: string[]
): string[] {
  const strategies: string[] = [];

  // Always try basic strategies first
  if (available.includes('naked-single')) strategies.push('naked-single');
  if (available.includes('hidden-single')) strategies.push('hidden-single');

  // Add intermediate strategies if basics failing
  const recentSuccesses = history.slice(-5).filter(m => m.strategy !== 'guess');
  if (recentSuccesses.length < 2) {
    if (available.includes('pointing-pairs')) strategies.push('pointing-pairs');
    if (available.includes('box-line-reduction')) strategies.push('box-line-reduction');
  }

  // Add advanced strategies if still stuck
  const progressInLast10 = history.slice(-10).filter(m => m.value > 0).length;
  if (progressInLast10 < 3) {
    if (available.includes('x-wing')) strategies.push('x-wing');
    if (available.includes('xy-wing')) strategies.push('xy-wing');
  }

  return strategies;
}
```

#### 2.1.2 REVIEW Phase

**Purpose:** Validate candidate moves and select best action

**Input:**
```typescript
interface ReviewInput {
  candidateMoves: Move[];
  currentState: PuzzleState;
  constraints: Constraint[];
}
```

**Output:**
```typescript
interface ReviewOutput {
  selectedMove: Move;
  validationResult: ValidationResult;
  alternativesConsidered: number;
  confidenceLevel: number;
}
```

**Requirements:**
- FR-R1: MUST validate move against all constraints (row, column, box)
- FR-R2: MUST simulate move to check for contradictions
- FR-R3: SHOULD detect if move leads to solution or dead-end
- FR-R4: MUST track validation metrics for learning
- FR-R5: SHOULD explain why move was selected

**Algorithm:**
```typescript
async function reviewPhase(input: ReviewInput): Promise<ReviewOutput> {
  const { candidateMoves, currentState, constraints } = input;

  // 1. Validate each candidate move
  const validatedMoves: Array<{move: Move, validation: ValidationResult}> = [];

  for (const move of candidateMoves) {
    const validation = validateMove(move, currentState, constraints);

    if (validation.isValid) {
      // Simulate move to check for contradictions
      const simulatedState = applyMoveToState(currentState, move);
      const hasContradiction = detectContradiction(simulatedState);

      if (!hasContradiction) {
        validatedMoves.push({ move, validation });
      } else {
        validation.outcome = 'failure';
        validation.error = new Error('Move leads to contradiction');
      }
    }
  }

  // 2. Select best move
  if (validatedMoves.length === 0) {
    throw new Error('No valid moves available - puzzle may be unsolvable or requires backtracking');
  }

  // Prefer moves with highest certainty
  const best = validatedMoves.reduce((a, b) =>
    (b.move.confidence ?? 0) > (a.move.confidence ?? 0) ? b : a
  );

  // 3. Check if move solves puzzle
  const nextState = best.validation.nextState;
  if (isPuzzleSolved(nextState)) {
    best.validation.outcome = 'success';
  } else if (hasProgress(currentState, nextState)) {
    best.validation.outcome = 'progress';
  }

  return {
    selectedMove: best.move,
    validationResult: best.validation,
    alternativesConsidered: candidateMoves.length,
    confidenceLevel: best.move.confidence ?? 0.5
  };
}

// Validate move against puzzle constraints
function validateMove(
  move: Move,
  state: PuzzleState,
  constraints: Constraint[]
): ValidationResult {
  const { cell, value } = move;

  // Check if cell is already filled
  if (state.grid[cell.row][cell.col] !== 0) {
    return {
      move,
      isValid: false,
      outcome: 'failure',
      error: new Error(`Cell (${cell.row}, ${cell.col}) already filled`),
      nextState: state
    };
  }

  // Check row constraint
  if (state.grid[cell.row].includes(value)) {
    return {
      move,
      isValid: false,
      outcome: 'failure',
      error: new Error(`Value ${value} already in row ${cell.row}`),
      nextState: state
    };
  }

  // Check column constraint
  const columnValues = state.grid.map(row => row[cell.col]);
  if (columnValues.includes(value)) {
    return {
      move,
      isValid: false,
      outcome: 'failure',
      error: new Error(`Value ${value} already in column ${cell.col}`),
      nextState: state
    };
  }

  // Check box constraint
  const boxRow = Math.floor(cell.row / 3) * 3;
  const boxCol = Math.floor(cell.col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (state.grid[r][c] === value) {
        return {
          move,
          isValid: false,
          outcome: 'failure',
          error: new Error(`Value ${value} already in box at (${r}, ${c})`),
          nextState: state
        };
      }
    }
  }

  // Move is valid - apply it
  const nextState = applyMoveToState(state, move);

  return {
    move,
    isValid: true,
    outcome: 'progress',
    nextState
  };
}
```

#### 2.1.3 ABSORB Phase

**Purpose:** Store experience in memory for learning

**Input:**
```typescript
interface AbsorbInput {
  move: Move;
  validationResult: ValidationResult;
  currentIteration: number;
  sessionId: string;
}
```

**Output:**
```typescript
interface AbsorbOutput {
  stored: boolean;
  memoryKey: string;
  importance: number;
}
```

**Requirements:**
- FR-A1: MUST log every move to ReasoningBank trajectory
- FR-A2: MUST store validation outcome (success/failure/progress)
- FR-A3: SHOULD assign importance score for later consolidation
- FR-A4: MUST link to previous moves in trajectory
- FR-A5: SHOULD capture strategy used and context

**Algorithm:**
```typescript
async function absorbPhase(input: AbsorbInput): Promise<AbsorbOutput> {
  const { move, validationResult, currentIteration, sessionId } = input;

  // 1. Calculate importance score
  const importance = calculateImportance(move, validationResult);

  // 2. Create experience record
  const experience: ExperienceRecord = {
    sessionId,
    iteration: currentIteration,
    move,
    outcome: validationResult.outcome,
    strategy: move.strategy,
    importance,
    timestamp: Date.now(),
    context: {
      candidatesRemaining: getCandidateCount(validationResult.nextState),
      cellsFilled: getFilledCellCount(validationResult.nextState),
      progressMade: validationResult.outcome === 'progress'
    }
  };

  // 3. Log to ReasoningBank
  const memoryKey = await reasoningBank.logMove(move, validationResult);

  // 4. If error occurred, also log for learning
  if (validationResult.error) {
    await reasoningBank.logError({
      move,
      error: validationResult.error,
      context: experience.context
    });
  }

  // 5. If strategy succeeded, log strategy success
  if (validationResult.outcome === 'progress' || validationResult.outcome === 'success') {
    await reasoningBank.logStrategy(move.strategy, validationResult);
  }

  return {
    stored: true,
    memoryKey,
    importance
  };
}

// Calculate importance for memory consolidation
function calculateImportance(move: Move, result: ValidationResult): number {
  let score = 0.5; // Base importance

  // Successful moves are more important
  if (result.outcome === 'success') score += 0.4;
  else if (result.outcome === 'progress') score += 0.2;

  // Errors are important for learning
  if (result.error) score += 0.3;

  // Advanced strategies are more important
  const advancedStrategies = ['x-wing', 'xy-wing', 'swordfish', 'forcing-chain'];
  if (advancedStrategies.includes(move.strategy)) {
    score += 0.2;
  }

  // Breakthrough moments (significant progress) are important
  const cellsRevealed = countCellsRevealed(result.nextState, move);
  if (cellsRevealed > 3) score += 0.3;

  return Math.min(1.0, score);
}
```

#### 2.1.4 SYNTHESIZE Phase

**Purpose:** Connect patterns and generate insights

**Input:**
```typescript
interface SynthesizeInput {
  currentState: PuzzleState;
  recentMoves: Move[];
  sessionId: string;
}
```

**Output:**
```typescript
interface SynthesizeOutput {
  insights: Insight[];
  patternsDetected: Pattern[];
  strategyRecommendations: string[];
}
```

**Requirements:**
- FR-S1: MUST query ReasoningBank for similar situations
- FR-S2: SHOULD detect patterns in recent move history
- FR-S3: SHOULD generate insights when breakthroughs occur
- FR-S4: MUST recommend strategies based on context
- FR-S5: SHOULD detect when stuck and suggest alternatives

**Algorithm:**
```typescript
async function synthesizePhase(input: SynthesizeInput): Promise<SynthesizeOutput> {
  const { currentState, recentMoves, sessionId } = input;

  const insights: Insight[] = [];
  const patterns: Pattern[] = [];
  const recommendations: string[] = [];

  // 1. Query for similar puzzle states
  const similarExperiences = await reasoningBank.querySimilar(currentState);

  // 2. Detect patterns in recent moves
  const recentPatterns = detectPatterns(recentMoves);
  patterns.push(...recentPatterns);

  // 3. Check if stuck (no progress in recent moves)
  const stuckDuration = detectStuckState(recentMoves);
  if (stuckDuration > 3) {
    insights.push({
      type: 'error',
      content: `Stuck for ${stuckDuration} iterations - may need to try different strategy`,
      confidence: 0.8,
      timestamp: Date.now(),
      relatedMoves: recentMoves.slice(-stuckDuration)
    });

    // Recommend trying different strategies
    const unusedStrategies = findUnusedStrategies(recentMoves);
    recommendations.push(...unusedStrategies);
  }

  // 4. Detect breakthrough moments
  const recentProgress = recentMoves.filter(m =>
    m.value > 0 && !m.strategy.includes('guess')
  );

  if (recentProgress.length >= 3) {
    const strategyUsed = recentProgress[0].strategy;
    insights.push({
      type: 'breakthrough',
      content: `Strategy "${strategyUsed}" producing consistent progress`,
      confidence: 0.9,
      timestamp: Date.now(),
      relatedMoves: recentProgress
    });

    recommendations.push(strategyUsed); // Continue with winning strategy
  }

  // 5. Learn from similar experiences
  if (similarExperiences.length > 0) {
    const successfulStrategies = similarExperiences
      .filter(exp => exp.outcome === 'solved')
      .flatMap(exp => exp.strategySequence);

    const mostSuccessful = findMostFrequent(successfulStrategies);
    if (mostSuccessful) {
      insights.push({
        type: 'strategy',
        content: `Past similar puzzles solved using "${mostSuccessful}"`,
        confidence: 0.7,
        timestamp: Date.now(),
        relatedMoves: []
      });

      recommendations.push(mostSuccessful);
    }
  }

  // 6. Pattern-based insights
  for (const pattern of patterns) {
    if (pattern.successRate > 0.7) {
      insights.push({
        type: 'pattern',
        content: `Pattern detected: ${pattern.description}`,
        confidence: pattern.successRate,
        timestamp: Date.now(),
        relatedMoves: recentMoves
      });
    }
  }

  return {
    insights,
    patternsDetected: patterns,
    strategyRecommendations: [...new Set(recommendations)] // Deduplicate
  };
}

// Detect if system is stuck
function detectStuckState(recentMoves: Move[]): number {
  let stuckCount = 0;

  for (let i = recentMoves.length - 1; i >= 0; i--) {
    const move = recentMoves[i];

    // If move made progress, not stuck
    if (move.value > 0 && !move.strategy.includes('backtrack')) {
      break;
    }

    stuckCount++;
  }

  return stuckCount;
}

// Detect patterns in move sequence
function detectPatterns(moves: Move[]): Pattern[] {
  const patterns: Pattern[] = [];

  // Pattern: Same strategy working repeatedly
  const strategyGroups = groupConsecutiveBy(moves, m => m.strategy);
  for (const [strategy, group] of Object.entries(strategyGroups)) {
    if (group.length >= 3) {
      patterns.push({
        id: `repeated-${strategy}`,
        type: 'strategy',
        description: `${strategy} working consecutively`,
        conditions: [`puzzle difficulty`, `candidate density`],
        actions: [`continue using ${strategy}`],
        successRate: group.filter(m => m.value > 0).length / group.length,
        usageCount: group.length,
        examples: []
      });
    }
  }

  // Pattern: Alternating strategies
  if (moves.length >= 4) {
    const last4Strategies = moves.slice(-4).map(m => m.strategy);
    if (last4Strategies[0] === last4Strategies[2] &&
        last4Strategies[1] === last4Strategies[3]) {
      patterns.push({
        id: 'alternating-strategies',
        type: 'technique',
        description: `Alternating between ${last4Strategies[0]} and ${last4Strategies[1]}`,
        conditions: ['complex puzzle state'],
        actions: ['continue alternation'],
        successRate: 0.6,
        usageCount: 4,
        examples: []
      });
    }
  }

  return patterns;
}
```

#### 2.1.5 PERSIST Phase

**Purpose:** Determine continuation and update state

**Input:**
```typescript
interface PersistInput {
  currentState: PuzzleState;
  insights: Insight[];
  iterationCount: number;
  maxIterations: number;
  timeElapsed: number;
  maxTime: number;
}
```

**Output:**
```typescript
interface PersistOutput {
  shouldContinue: boolean;
  reason: StoppingReason;
  nextFocus?: Cell;
  finalState: PuzzleState;
}

type StoppingReason =
  | 'solved'
  | 'timeout'
  | 'max-iterations'
  | 'stuck'
  | 'unsolvable'
  | 'continue';
```

**Requirements:**
- FR-P1: MUST check if puzzle is solved
- FR-P2: MUST enforce iteration and time limits
- FR-P3: SHOULD detect unsolvable or stuck states
- FR-P4: MUST select next focus cell if continuing
- FR-P5: MUST persist state for next iteration

**Algorithm:**
```typescript
async function persistPhase(input: PersistInput): Promise<PersistOutput> {
  const {
    currentState,
    insights,
    iterationCount,
    maxIterations,
    timeElapsed,
    maxTime
  } = input;

  // 1. Check if puzzle is solved
  if (isPuzzleSolved(currentState)) {
    return {
      shouldContinue: false,
      reason: 'solved',
      finalState: currentState
    };
  }

  // 2. Check time limit
  if (timeElapsed >= maxTime) {
    return {
      shouldContinue: false,
      reason: 'timeout',
      finalState: currentState
    };
  }

  // 3. Check iteration limit
  if (iterationCount >= maxIterations) {
    return {
      shouldContinue: false,
      reason: 'max-iterations',
      finalState: currentState
    };
  }

  // 4. Check if stuck (no progress in last N iterations)
  const stuckInsights = insights.filter(i => i.type === 'error' && i.content.includes('Stuck'));
  if (stuckInsights.length > 0 && stuckInsights[0].relatedMoves.length > 10) {
    return {
      shouldContinue: false,
      reason: 'stuck',
      finalState: currentState
    };
  }

  // 5. Check for contradictions (unsolvable state)
  if (hasContradiction(currentState)) {
    return {
      shouldContinue: false,
      reason: 'unsolvable',
      finalState: currentState
    };
  }

  // 6. Continue - select next focus cell
  const nextFocus = await attentionMechanism.selectFocus(currentState);

  return {
    shouldContinue: true,
    reason: 'continue',
    nextFocus,
    finalState: currentState
  };
}

// Check if puzzle is completely solved
function isPuzzleSolved(state: PuzzleState): boolean {
  // All cells must be filled
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (state.grid[row][col] === 0) {
        return false;
      }
    }
  }

  // All constraints must be satisfied
  return validateAllConstraints(state);
}

// Check for contradictions (no valid moves possible)
function hasContradiction(state: PuzzleState): boolean {
  // Check if any empty cell has no candidates
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (state.grid[row][col] === 0) {
        const key = `${row},${col}`;
        const candidates = state.candidates.get(key);

        if (!candidates || candidates.size === 0) {
          return true; // No valid moves for this cell
        }
      }
    }
  }

  return false;
}
```

### 2.2 Orchestration and Control Flow

#### 2.2.1 Main GRASP Loop

```typescript
class GRASPLoop {
  private memory: ReasoningBankAdapter;
  private attention: AttentionMechanism;
  private puzzle: PuzzleEngine;

  async solve(
    initialState: PuzzleState,
    config: GRASPConfig
  ): Promise<SolveResult> {
    const sessionId = generateSessionId();
    const startTime = Date.now();
    let currentState = initialState;
    let iterationCount = 0;

    // Main loop
    while (true) {
      iterationCount++;

      // Select focus cell
      const focus = await this.attention.selectFocus(currentState);

      // === GENERATE ===
      const generateOutput = await generatePhase({
        currentState,
        focus,
        availableStrategies: config.strategies,
        recentHistory: currentState.moveHistory.slice(-10)
      });

      // === REVIEW ===
      const reviewOutput = await reviewPhase({
        candidateMoves: generateOutput.candidateMoves,
        currentState,
        constraints: this.puzzle.getConstraints(currentState)
      });

      // === ABSORB ===
      await absorbPhase({
        move: reviewOutput.selectedMove,
        validationResult: reviewOutput.validationResult,
        currentIteration: iterationCount,
        sessionId
      });

      // Update state with selected move
      currentState = reviewOutput.validationResult.nextState;

      // === SYNTHESIZE === (every N iterations or on breakthrough)
      let synthesizeOutput: SynthesizeOutput | null = null;

      if (iterationCount % config.reflectionInterval === 0 ||
          reviewOutput.validationResult.outcome === 'success') {
        synthesizeOutput = await synthesizePhase({
          currentState,
          recentMoves: currentState.moveHistory.slice(-20),
          sessionId
        });

        // Store insights
        for (const insight of synthesizeOutput.insights) {
          await this.memory.logInsight(insight);
        }
      }

      // === PERSIST ===
      const persistOutput = await persistPhase({
        currentState,
        insights: synthesizeOutput?.insights ?? [],
        iterationCount,
        maxIterations: config.maxIterations,
        timeElapsed: Date.now() - startTime,
        maxTime: config.maxTime
      });

      // Check if should continue
      if (!persistOutput.shouldContinue) {
        return {
          finalState: persistOutput.finalState,
          solved: persistOutput.reason === 'solved',
          stoppingReason: persistOutput.reason,
          iterations: iterationCount,
          timeElapsed: Date.now() - startTime,
          sessionId
        };
      }

      // Continue to next iteration
      currentState = persistOutput.finalState;
    }
  }
}
```

### 2.3 State Management

**Working Memory (In-Process):**
```typescript
interface GRASPState {
  // Current puzzle state
  puzzleState: PuzzleState;

  // Iteration tracking
  currentIteration: number;
  startTime: number;

  // Recent history (window = 20 moves)
  recentMoves: Move[];
  recentInsights: Insight[];

  // Strategy tracking
  strategySequence: string[];
  strategySuccessRate: Map<string, number>;

  // Progress metrics
  cellsFilledCount: number;
  candidatesEliminatedCount: number;
  breakthroughCount: number;
}
```

---

## 3. Non-Functional Requirements

### 3.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Iteration latency | <5 seconds | P95 per GRASP cycle |
| Memory footprint | <50 MB | Working memory size |
| Token efficiency | <500 tokens/iteration | Average token usage |
| Reflection overhead | <20% | Synthesize phase time / Total time |

### 3.2 Memory Constraints

- **Working Memory**: Maximum 20 recent moves in memory
- **Candidate Sets**: Update only affected cells, not entire grid
- **Insight Storage**: Store only insights with confidence >0.6
- **Pattern Cache**: Maximum 50 patterns in active memory

### 3.3 Error Handling

**Error Categories:**

1. **Validation Errors** (Expected)
   - Invalid move attempts
   - Constraint violations
   - Action: Log, continue with alternative move

2. **State Errors** (Recoverable)
   - Contradiction detected
   - No valid moves available
   - Action: Trigger backtracking or stop

3. **System Errors** (Critical)
   - Memory system failure
   - Attention mechanism failure
   - Action: Graceful shutdown with state preservation

**Error Recovery Strategy:**
```typescript
class GRASPErrorHandler {
  async handleError(
    error: Error,
    context: GRASPState
  ): Promise<RecoveryAction> {

    // Category 1: Validation errors
    if (error instanceof ValidationError) {
      await this.memory.logError(error);
      return { action: 'continue', withBacktracking: false };
    }

    // Category 2: State errors
    if (error instanceof StateError) {
      const canBacktrack = context.recentMoves.length > 0;
      if (canBacktrack) {
        return {
          action: 'backtrack',
          steps: 3 // Backtrack 3 moves
        };
      } else {
        return { action: 'stop', reason: 'unsolvable' };
      }
    }

    // Category 3: System errors
    await this.saveState(context);
    return { action: 'shutdown', reason: error.message };
  }
}
```

---

## 4. API/Interface Design

### 4.1 Public Methods

```typescript
interface IGRASPLoop {
  /**
   * Initialize GRASP loop with configuration
   */
  initialize(config: GRASPConfig): Promise<void>;

  /**
   * Execute main solving loop
   * @returns Solution result with final state and metrics
   */
  solve(puzzle: PuzzleState): Promise<SolveResult>;

  /**
   * Pause execution and save state
   */
  pause(): Promise<GRASPState>;

  /**
   * Resume from saved state
   */
  resume(state: GRASPState): Promise<SolveResult>;

  /**
   * Get current iteration metrics
   */
  getMetrics(): GRASPMetrics;
}
```

### 4.2 Data Structures

**Configuration:**
```typescript
interface GRASPConfig {
  // Strategy selection
  strategies: string[];

  // Iteration limits
  maxIterations: number;      // Default: 100
  maxTime: number;            // Default: 300000 (5 min)

  // Reflection frequency
  reflectionInterval: number; // Default: 5 (every 5 iterations)

  // Memory settings
  historyWindowSize: number;  // Default: 20

  // Stopping conditions
  stuckThreshold: number;     // Default: 10 (iterations without progress)
}
```

**Solve Result:**
```typescript
interface SolveResult {
  // Final state
  finalState: PuzzleState;
  solved: boolean;

  // Termination info
  stoppingReason: StoppingReason;

  // Metrics
  iterations: number;
  timeElapsed: number;
  sessionId: string;

  // Performance
  tokensUsed?: number;
  averageIterationTime?: number;

  // Learning data
  strategiesUsed: string[];
  insightsGenerated: number;
  patternsDetected: number;
}
```

### 4.3 Type Signatures

See `/workspaces/machine-dream/src/types.ts` for complete type definitions:
- `GRASPIteration`
- `ValidationResult`
- `Insight`
- `Move`
- `PuzzleState`

---

## 5. Implementation Notes

### 5.1 Key Algorithms

#### 5.1.1 Strategy Selection Algorithm

**Adaptive Strategy Selection:**
```typescript
function selectStrategies(
  state: PuzzleState,
  history: Move[],
  available: string[]
): string[] {
  const strategies: string[] = [];

  // Level 1: Always try basic strategies
  strategies.push('naked-single', 'hidden-single');

  // Level 2: Add intermediate if basics not working
  const recentSuccess = history.slice(-5).filter(m => m.value > 0).length;
  if (recentSuccess < 3) {
    strategies.push('pointing-pairs', 'box-line-reduction');
  }

  // Level 3: Add advanced if stuck
  const progressInLast10 = history.slice(-10).filter(m => m.value > 0).length;
  if (progressInLast10 < 2) {
    strategies.push('naked-pairs', 'naked-triples');
  }

  // Level 4: Expert strategies if really stuck
  if (progressInLast10 === 0) {
    strategies.push('x-wing', 'xy-wing', 'forcing-chains');
  }

  return strategies.filter(s => available.includes(s));
}
```

#### 5.1.2 Backtracking Algorithm

**Intelligent Backtracking:**
```typescript
async function generateBacktrackMoves(
  state: PuzzleState,
  history: Move[]
): Promise<Move[]> {
  // Find last non-deterministic move (guessed value)
  let backtrackPoint = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].strategy.includes('guess') ||
        history[i].confidence < 0.8) {
      backtrackPoint = i;
      break;
    }
  }

  if (backtrackPoint === -1) {
    return []; // No backtrack point found
  }

  // Revert to state before backtrack point
  const moveToChange = history[backtrackPoint];
  const alternativeValues = getAlternativeCandidates(
    state,
    moveToChange.cell
  ).filter(v => v !== moveToChange.value);

  // Generate alternative moves
  return alternativeValues.map(value => ({
    cell: moveToChange.cell,
    value,
    strategy: 'backtrack-guess',
    timestamp: Date.now(),
    confidence: 0.5
  }));
}
```

### 5.2 Edge Cases to Handle

1. **Empty Candidate Set**
   - Scenario: Cell has no valid candidates after constraint propagation
   - Handling: Trigger backtracking or mark as unsolvable

2. **Multiple Equally Valid Moves**
   - Scenario: Several moves have same confidence level
   - Handling: Use tie-breaking heuristics (cell position, strategy type)

3. **Infinite Loop Detection**
   - Scenario: Same state reached multiple times
   - Handling: Track state hashes, detect cycles, force different strategy

4. **Memory Overflow**
   - Scenario: History grows too large
   - Handling: Sliding window, consolidate old moves

5. **Time Budget Exhaustion**
   - Scenario: Puzzle too complex for time limit
   - Handling: Graceful termination with partial solution

### 5.3 Testing Strategy

#### Unit Tests

```typescript
describe('GRASP Loop - Generate Phase', () => {
  it('should generate valid candidate moves', async () => {
    const input = createTestGenerateInput();
    const output = await generatePhase(input);

    expect(output.candidateMoves.length).toBeGreaterThan(0);
    expect(output.strategiesApplied).toContain('naked-single');
  });

  it('should handle stuck state with backtracking', async () => {
    const stuckInput = createStuckStateInput();
    const output = await generatePhase(stuckInput);

    expect(output.candidateMoves.some(m =>
      m.strategy === 'backtrack-guess'
    )).toBe(true);
  });
});

describe('GRASP Loop - Review Phase', () => {
  it('should validate moves against constraints', async () => {
    const move = createInvalidMove(); // Violates row constraint
    const result = await reviewPhase({
      candidateMoves: [move],
      currentState: testState,
      constraints: testConstraints
    });

    expect(result.validationResult.isValid).toBe(false);
    expect(result.validationResult.error).toBeDefined();
  });

  it('should detect puzzle solution', async () => {
    const finalMove = createSolutionMove();
    const result = await reviewPhase({
      candidateMoves: [finalMove],
      currentState: nearCompleteState,
      constraints: testConstraints
    });

    expect(result.validationResult.outcome).toBe('success');
  });
});

describe('GRASP Loop - Persist Phase', () => {
  it('should stop when puzzle solved', async () => {
    const result = await persistPhase({
      currentState: solvedState,
      insights: [],
      iterationCount: 20,
      maxIterations: 100,
      timeElapsed: 5000,
      maxTime: 300000
    });

    expect(result.shouldContinue).toBe(false);
    expect(result.reason).toBe('solved');
  });

  it('should enforce time limits', async () => {
    const result = await persistPhase({
      currentState: partialState,
      insights: [],
      iterationCount: 20,
      maxIterations: 100,
      timeElapsed: 310000,
      maxTime: 300000
    });

    expect(result.shouldContinue).toBe(false);
    expect(result.reason).toBe('timeout');
  });
});
```

#### Integration Tests

```typescript
describe('GRASP Loop - Full Integration', () => {
  it('should solve easy puzzle in <20 iterations', async () => {
    const grasp = new GRASPLoop(memory, attention, puzzle);
    await grasp.initialize(defaultConfig);

    const result = await grasp.solve(easyPuzzle);

    expect(result.solved).toBe(true);
    expect(result.iterations).toBeLessThan(20);
    expect(result.stoppingReason).toBe('solved');
  });

  it('should detect unsolvable puzzles', async () => {
    const grasp = new GRASPLoop(memory, attention, puzzle);
    await grasp.initialize(defaultConfig);

    const result = await grasp.solve(unsolvablePuzzle);

    expect(result.solved).toBe(false);
    expect(result.stoppingReason).toBe('unsolvable');
  });

  it('should generate insights during solving', async () => {
    const grasp = new GRASPLoop(memory, attention, puzzle);
    await grasp.initialize(defaultConfig);

    const result = await grasp.solve(mediumPuzzle);

    expect(result.insightsGenerated).toBeGreaterThan(0);
    expect(result.patternsDetected).toBeGreaterThan(0);
  });
});
```

---

## 6. Success Criteria

### 6.1 Functional Success

- [ ] **FS-1**: GRASP loop completes full cycle (G→R→A→S→P) on easy puzzle
- [ ] **FS-2**: All five phases execute without errors
- [ ] **FS-3**: Memory system logs all moves and insights
- [ ] **FS-4**: Attention mechanism invoked for focus selection
- [ ] **FS-5**: Stopping conditions correctly trigger (solved, timeout, stuck)

### 6.2 Performance Success

- [ ] **PS-1**: Solves 80%+ of easy puzzles in <30 iterations
- [ ] **PS-2**: Solves 60%+ of medium puzzles in <100 iterations
- [ ] **PS-3**: Average iteration time <5 seconds
- [ ] **PS-4**: Token usage <500 per iteration

### 6.3 Quality Success

- [ ] **QS-1**: Generates valid moves (no constraint violations)
- [ ] **QS-2**: Detects insights (strategy shifts, breakthroughs)
- [ ] **QS-3**: Adapts strategies based on context
- [ ] **QS-4**: Handles errors gracefully without crashes
- [ ] **QS-5**: Maintains state consistency across iterations

### 6.4 Integration Success

- [ ] **IS-1**: Successfully integrates with Memory System (Spec 02)
- [ ] **IS-2**: Successfully integrates with Attention Mechanism (Spec 04)
- [ ] **IS-3**: Successfully integrates with Puzzle Engine (Spec 01)
- [ ] **IS-4**: Triggers Dreaming Pipeline after session completion

### 6.5 Acceptance Tests

**Test 1: Easy Puzzle Solve**
```typescript
Given: An easy 9x9 Sudoku puzzle with 40 filled cells
When: GRASP loop executes with default config
Then:
  - Puzzle solved in <30 iterations
  - At least 5 insights generated
  - No errors or crashes
  - All moves valid
```

**Test 2: Medium Puzzle with Strategy Adaptation**
```typescript
Given: A medium 9x9 Sudoku puzzle requiring multiple strategies
When: GRASP loop executes
Then:
  - Multiple different strategies attempted
  - Strategy shifts detected and logged
  - Puzzle solved or meaningful progress made
  - Insights include strategy recommendations
```

**Test 3: Stuck Detection and Backtracking**
```typescript
Given: A hard puzzle requiring guessing
When: GRASP loop gets stuck (no progress in 10 iterations)
Then:
  - Stuck state detected in Synthesize phase
  - Backtracking moves generated
  - Alternative strategies recommended
  - Eventually either solves or times out gracefully
```

---

## 7. Future Enhancements (Post-POC)

### 7.1 Multi-Path Exploration
- Explore multiple candidate moves in parallel
- Compare outcomes and select best path

### 7.2 Advanced Learning
- Integration with AgentDB RL learning
- Decision Transformer for move selection
- Reflexion memory for error correction

### 7.3 Cross-Puzzle Transfer
- Apply learned patterns from solved puzzles to new ones
- Build strategy library across sessions

### 7.4 Interactive Mode
- Allow human override of move selection
- Explain reasoning in natural language
- Request hints or strategy suggestions

---

## 8. References

- **POC Strategy Report**: `/workspaces/machine-dream/docs/poc-strategy-report.md` (Section 4.1.1)
- **Continuous Thinking Research**: `/workspaces/machine-dream/docs/continuous-machine-thinking-research.md` (GRASP Framework)
- **Type Definitions**: `/workspaces/machine-dream/src/types.ts` (Lines 42-65)
- **Memory System Spec**: `/workspaces/machine-dream/docs/specs/02-memory-system-spec.md`

---

**Document Status:** ✅ Implementation-Ready
**Next Steps:**
1. Review with architecture team
2. Begin implementation (Day 3 of POC timeline)
3. Unit test development alongside implementation
4. Integration testing with Memory System and Attention Mechanism

---

*End of GRASP Loop Specification*
