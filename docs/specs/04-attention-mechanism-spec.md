# Attention Mechanism Specification

**Component:** Attention Mechanism (Focus Selection and Reflection)
**Version:** 1.0
**Date:** January 4, 2026
**Status:** Final Specification
**Dependencies:** Puzzle Engine, Memory System, GRASP Loop

---

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| [ADR-007: Event-Driven Integration](../adr/007-event-driven-integration.md) | Authorizes this spec |

---

## 1. Component Overview

### 1.1 Purpose and Responsibilities

The Attention Mechanism determines **where the continuous thinking system should focus** during puzzle-solving iterations. It implements the uncertainty-weighted attention model from continuous machine thinking research, enabling:

- **Intelligent focus selection**: Prioritizing cells most likely to advance progress
- **Scheduled reflection**: Periodic consolidation of working memory
- **Progress tracking**: Detecting forward momentum, plateaus, and insight moments
- **Insight detection**: Identifying breakthrough moments and strategy shifts

### 1.2 Position in Overall Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    GRASP LOOP                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │  GENERATE  │─▶│   REVIEW   │─▶│   ABSORB   │         │
│  └────────────┘  └────────────┘  └────────────┘         │
│         ▲                                │                │
│         │         ┌────────────────┐     │                │
│         │         │  SYNTHESIZE    │◀────┘                │
│         │         └────────┬───────┘                      │
│         │                  │                              │
│         │         ┌────────▼───────┐                      │
│         └─────────│ ATTENTION MGR  │◀──── THIS COMPONENT │
│                   │ • Focus select │                      │
│                   │ • Reflection   │                      │
│                   │ • Progress     │                      │
│                   │ • Insights     │                      │
│                   └────────────────┘                      │
└──────────────────────────────────────────────────────────┘
```

**The Attention Mechanism sits between SYNTHESIZE and GENERATE**, determining:
- Which cell to explore next (focal attention)
- When to reflect on progress (scheduled reflection)
- Whether an insight has occurred (meta-cognitive monitoring)

### 1.3 Dependencies

**Required Components:**
- **Puzzle Engine** → Current grid state, candidate sets, constraint information
- **Working Memory** → Recent moves, last visited cells, active strategy
- **GRASP Loop** → Integration point for iteration control

**Provides Services To:**
- **GRASP Loop (Generate)** → Next cell to focus on
- **GRASP Loop (Synthesize)** → Reflection triggers and insight detection
- **Progress Tracker** → Metrics on solving momentum

---

## 2. Functional Requirements

### FR-4.1: Attention Score Calculation

**Requirement:** The system MUST calculate attention scores for all unfilled cells using the uncertainty-weighted formula.

**Formula Specification:**

```
AttentionScore(cell) = w₁·uncertainty + w₂·relevance + w₃·importance + w₄·recency

where:
  uncertainty = 1 / candidateCount(cell)     [Higher = fewer candidates = more certain]
  relevance   = semanticSimilarity(cell, recentMoves)
  importance  = constraintImpact(cell)
  recency     = decayFunction(timeSinceLastVisit(cell))

Weights (from research):
  w₁ = 0.4  (uncertainty dominates - "most constrained variable" heuristic)
  w₂ = 0.3  (relevance to recent activity)
  w₃ = 0.2  (importance to constraint network)
  w₄ = 0.1  (temporal recency)
```

**Input:**
```typescript
interface AttentionContext {
  currentState: PuzzleState;
  recentMoves: Move[];           // Last 5-10 moves
  lastVisited: Map<string, number>;  // "row,col" -> timestamp
  constraints: Constraint[];
}
```

**Output:**
```typescript
interface AttentionScore {
  cell: Cell;
  score: number;            // Final weighted score [0, 1]
  uncertainty: number;      // Component [0, 1]
  relevance: number;        // Component [0, 1]
  importance: number;       // Component [0, 1]
  recency: number;          // Component [0, 1]
}
```

**Acceptance Criteria:**
- ✅ Scores calculated for all empty cells
- ✅ All component values normalized to [0, 1]
- ✅ Final score is weighted sum of components
- ✅ Higher scores indicate higher priority for attention

---

### FR-4.2: Focus Selection Algorithm

**Requirement:** The system MUST select the highest-scoring cell as the next focus, with tie-breaking.

**Algorithm:**

```typescript
function selectFocus(context: AttentionContext): Cell {
  // 1. Calculate scores for all empty cells
  const scores: AttentionScore[] = [];
  for (const cell of getEmptyCells(context.currentState.grid)) {
    scores.push(calculateAttentionScore(cell, context));
  }

  // 2. Sort by score (descending)
  scores.sort((a, b) => b.score - a.score);

  // 3. Handle ties (within 0.01 threshold)
  const topScore = scores[0].score;
  const topCandidates = scores.filter(s => Math.abs(s.score - topScore) < 0.01);

  // 4. Tie-breaking: prefer highest uncertainty (fewer candidates)
  if (topCandidates.length > 1) {
    topCandidates.sort((a, b) => b.uncertainty - a.uncertainty);
  }

  return topCandidates[0].cell;
}
```

**Input:** `AttentionContext`
**Output:** `Cell` (next cell to explore)

**Acceptance Criteria:**
- ✅ Always returns a valid empty cell
- ✅ Returns cell with highest attention score
- ✅ Breaks ties using uncertainty (most constrained first)
- ✅ Deterministic for same input state

---

### FR-4.3: Scheduled Reflection Triggers

**Requirement:** The system MUST trigger reflection at scheduled intervals during continuous thinking.

**Reflection Schedule:**

```typescript
interface ReflectionSchedule {
  // Trigger reflection every N iterations
  iterationInterval: 5;

  // Trigger after each successful move
  afterSuccess: true;

  // Trigger after each failed move
  afterFailure: true;

  // Trigger when strategy changes
  onStrategyChange: true;

  // Trigger when insight detected
  onInsight: true;
}
```

**Reflection Actions:**

```typescript
interface ReflectionActions {
  // Update all candidate sets based on new constraints
  updateCandidateSets(): Promise<void>;

  // Detect patterns in recent move sequence
  detectPatterns(): Promise<Pattern[]>;

  // Evaluate progress toward solution
  evaluateProgress(): Promise<ProgressMetrics>;

  // Log experience to memory
  logExperience(): Promise<void>;
}
```

**Acceptance Criteria:**
- ✅ Reflection triggered every 5 iterations (configurable)
- ✅ Reflection triggered after move outcomes
- ✅ All reflection actions execute sequentially
- ✅ Reflection does not interrupt GRASP loop
- ✅ Reflection duration < 2 seconds

---

### FR-4.4: Progress Tracking

**Requirement:** The system MUST track and quantify progress toward puzzle solution.

**Progress Metrics:**

```typescript
interface ProgressMetrics {
  // Absolute progress
  cellsFilled: number;          // 0-81 for 9x9
  percentComplete: number;      // 0.0-1.0

  // Rate metrics
  movesPerMinute: number;
  successRate: number;          // Successful moves / total attempts

  // Momentum indicators
  momentum: 'accelerating' | 'steady' | 'decelerating' | 'stuck';
  plateauDuration: number;      // Iterations without progress

  // Strategy effectiveness
  currentStrategy: string;
  strategySuccessRate: number;

  // Confidence
  confidenceLevel: number;      // 0.0-1.0, based on candidate certainty
}
```

**Momentum Detection:**

```typescript
function detectMomentum(recentProgress: number[]): Momentum {
  // recentProgress = [cells filled in last N iterations]

  // No progress for 3+ iterations = stuck
  if (recentProgress.slice(-3).every(p => p === 0)) {
    return 'stuck';
  }

  // Acceleration: progress increasing
  const slope = linearRegression(recentProgress).slope;
  if (slope > 0.1) return 'accelerating';
  if (slope < -0.1) return 'decelerating';
  return 'steady';
}
```

**Acceptance Criteria:**
- ✅ Metrics updated after each move
- ✅ Momentum correctly classified
- ✅ Plateau detection accurate (3+ iterations no progress)
- ✅ Confidence correlates with solution proximity

---

### FR-4.5: Insight Detection Heuristics

**Requirement:** The system MUST detect and classify insight moments during problem-solving.

**Insight Types:**

```typescript
type InsightType =
  | 'strategy-discovery'      // New solving technique found
  | 'breakthrough'            // Sudden progress after plateau
  | 'pattern-recognition'     // Structural pattern identified
  | 'error-correction';       // Learning from mistake

interface InsightEvent {
  type: InsightType;
  timestamp: number;
  description: string;
  confidence: number;         // 0.0-1.0
  relatedMoves: Move[];
  triggerCondition: string;
}
```

**Detection Heuristics:**

```typescript
function detectInsights(context: AttentionContext): InsightEvent[] {
  const insights: InsightEvent[] = [];

  // HEURISTIC 1: Breakthrough detection
  // Sudden progress (3+ cells) after plateau (5+ iterations stuck)
  if (context.plateauDuration >= 5 && context.recentProgress >= 3) {
    insights.push({
      type: 'breakthrough',
      description: `Filled ${context.recentProgress} cells after ${context.plateauDuration}-iteration plateau`,
      confidence: 0.9,
      relatedMoves: context.recentMoves.slice(-context.recentProgress),
      triggerCondition: 'plateauDuration >= 5 && recentProgress >= 3'
    });
  }

  // HEURISTIC 2: Strategy discovery
  // New strategy used with >70% success rate
  if (context.currentStrategy !== context.previousStrategy) {
    const successRate = calculateStrategySuccessRate(context.currentStrategy);
    if (successRate > 0.7) {
      insights.push({
        type: 'strategy-discovery',
        description: `Adopted ${context.currentStrategy} with ${(successRate*100).toFixed(0)}% success`,
        confidence: successRate,
        relatedMoves: context.movesWithStrategy(context.currentStrategy),
        triggerCondition: 'newStrategy && successRate > 0.7'
      });
    }
  }

  // HEURISTIC 3: Pattern recognition
  // Repeating move sequence with consistent outcomes
  const patterns = detectMovePatterns(context.recentMoves);
  for (const pattern of patterns) {
    if (pattern.occurrences >= 2 && pattern.consistentOutcome) {
      insights.push({
        type: 'pattern-recognition',
        description: pattern.description,
        confidence: pattern.consistency,
        relatedMoves: pattern.instances.flat(),
        triggerCondition: 'repeatingPattern && consistentOutcome'
      });
    }
  }

  // HEURISTIC 4: Error correction
  // Backtrack followed by successful alternative
  const backtrackSequence = detectBacktrack(context.recentMoves);
  if (backtrackSequence && backtrackSequence.alternativeSucceeded) {
    insights.push({
      type: 'error-correction',
      description: `Recovered from error by switching from ${backtrackSequence.failedStrategy} to ${backtrackSequence.successfulStrategy}`,
      confidence: 0.8,
      relatedMoves: backtrackSequence.moves,
      triggerCondition: 'backtrack detected && alternative succeeded'
    });
  }

  return insights;
}
```

**Acceptance Criteria:**
- ✅ All four heuristics implemented
- ✅ Insights logged to memory for dreaming
- ✅ Confidence scores calibrated (verified against manual labeling)
- ✅ No duplicate insights within same iteration

---

## 3. Non-Functional Requirements

### NFR-4.1: Performance

**Requirement:** Attention calculations MUST NOT significantly slow down GRASP loop.

**Targets:**
- Attention score calculation: < 50ms for 9×9 grid (up to 81 cells)
- Focus selection: < 10ms
- Progress tracking update: < 5ms
- Insight detection: < 100ms

**Total overhead per iteration: < 200ms (acceptable for POC)**

### NFR-4.2: Memory Efficiency

**Requirement:** Attention manager MUST operate within working memory constraints.

**Memory Budget:**
- AttentionContext: < 50 KB
- Score cache (for 81 cells): < 10 KB
- Progress history (last 100 iterations): < 20 KB
- **Total: < 100 KB**

### NFR-4.3: Accuracy

**Requirement:** Focus selection MUST correlate with puzzle-solving progress.

**Validation Metrics:**
- When focusing on high-uncertainty cells, success rate > 60%
- Insight detection precision > 70% (manual verification on 50 puzzles)
- Plateau detection accuracy > 85%

---

## 4. API/Interface Design

### 4.1 Core Interface

```typescript
class AttentionManager {
  private context: AttentionContext;
  private schedule: ReflectionSchedule;
  private progressHistory: ProgressMetrics[];

  /**
   * Select the next cell to focus on
   * @returns Cell with highest attention score
   */
  selectFocus(currentState: PuzzleState): Cell;

  /**
   * Calculate attention score for a specific cell
   * @returns Detailed attention score breakdown
   */
  calculateAttentionScore(cell: Cell, context: AttentionContext): AttentionScore;

  /**
   * Check if reflection should be triggered
   * @returns True if any reflection condition met
   */
  shouldReflect(iteration: number, lastMoveOutcome: MoveOutcome): boolean;

  /**
   * Execute reflection cycle
   * @returns Reflection results (patterns, progress, insights)
   */
  async executeReflection(): Promise<ReflectionResult>;

  /**
   * Update progress tracking
   * @param move Most recent move
   * @param outcome Move outcome
   */
  updateProgress(move: Move, outcome: ValidationResult): void;

  /**
   * Detect insights from recent activity
   * @returns Array of detected insights (may be empty)
   */
  detectInsights(): InsightEvent[];

  /**
   * Get current progress metrics
   */
  getProgress(): ProgressMetrics;

  /**
   * Reset attention state for new puzzle
   */
  reset(): void;
}
```

### 4.2 Configuration Interface

```typescript
interface AttentionConfig {
  // Weights for attention formula
  weights: {
    uncertainty: 0.4;
    relevance: 0.3;
    importance: 0.2;
    recency: 0.1;
  };

  // Reflection schedule
  reflection: {
    iterationInterval: 5;
    afterSuccess: true;
    afterFailure: true;
    onStrategyChange: true;
    onInsight: true;
  };

  // Insight detection thresholds
  insights: {
    breakthroughMinProgress: 3;       // Cells filled
    breakthroughMinPlateau: 5;        // Iterations stuck
    strategySuccessThreshold: 0.7;    // Success rate
    patternMinOccurrences: 2;         // Repetitions
  };

  // Progress tracking
  progress: {
    historySize: 100;                 // Iterations to remember
    plateauThreshold: 3;              // Iterations without progress
  };
}
```

### 4.3 Type Definitions (from src/types.ts)

**Already Defined:**
```typescript
// AttentionScore (lines 131-138)
export type AttentionScore = {
  cell: Cell;
  score: number;
  uncertainty: number;
  relevance: number;
  importance: number;
  recency: number;
};

// AttentionContext (lines 140-145)
export type AttentionContext = {
  currentState: PuzzleState;
  recentMoves: Move[];
  lastVisited: Map<string, number>;
  constraints: Constraint[];
};

// Constraint (lines 147-152)
export type Constraint = {
  type: 'row' | 'column' | 'box';
  index: number;
  satisfiedValues: Set<number>;
  remainingValues: Set<number>;
};
```

**New Types Required:**
```typescript
// Add to src/types.ts

export type Momentum = 'accelerating' | 'steady' | 'decelerating' | 'stuck';

export type InsightType = 'strategy-discovery' | 'breakthrough' | 'pattern-recognition' | 'error-correction';

export type InsightEvent = {
  type: InsightType;
  timestamp: number;
  description: string;
  confidence: number;
  relatedMoves: Move[];
  triggerCondition: string;
};

export type ProgressMetrics = {
  cellsFilled: number;
  percentComplete: number;
  movesPerMinute: number;
  successRate: number;
  momentum: Momentum;
  plateauDuration: number;
  currentStrategy: string;
  strategySuccessRate: number;
  confidenceLevel: number;
};

export type ReflectionResult = {
  patterns: Pattern[];
  progress: ProgressMetrics;
  insights: InsightEvent[];
  candidatesUpdated: number;
  timestamp: number;
};

export type MoveOutcome = 'success' | 'failure' | 'progress';
```

---

## 5. Implementation Notes

### 5.1 Key Algorithms

#### Uncertainty Calculation

```typescript
function calculateUncertainty(cell: Cell, state: PuzzleState): number {
  const candidateCount = state.candidates.get(cellKey(cell))?.size || 9;

  // Inverse relationship: fewer candidates = higher uncertainty score
  // (confusingly named but matches research: "certainty about what to try")
  return 1.0 / candidateCount;
}
```

**Rationale:** Cells with 1 candidate (naked singles) score 1.0 (highest), cells with 9 candidates score 0.11 (lowest). This implements the "most constrained variable" heuristic from constraint satisfaction problems.

#### Relevance Calculation

```typescript
function calculateRelevance(cell: Cell, recentMoves: Move[]): number {
  if (recentMoves.length === 0) return 0.0;

  // Relevance based on spatial proximity and constraint sharing
  const scores: number[] = recentMoves.map(move => {
    const spatialProximity = calculateProximity(cell, move.cell);
    const constraintSharing = shareConstraints(cell, move.cell) ? 1.0 : 0.0;

    // Combine with recency decay
    const recencyFactor = Math.exp(-0.1 * (Date.now() - move.timestamp));

    return (spatialProximity * 0.5 + constraintSharing * 0.5) * recencyFactor;
  });

  // Return maximum relevance to any recent move
  return Math.max(...scores, 0.0);
}

function calculateProximity(cell1: Cell, cell2: Cell): number {
  // Same row, column, or box = high proximity
  if (cell1.row === cell2.row || cell1.col === cell2.col) return 1.0;
  if (sameBox(cell1, cell2)) return 1.0;

  // Otherwise, Euclidean distance (normalized)
  const dist = Math.sqrt(
    Math.pow(cell1.row - cell2.row, 2) + Math.pow(cell1.col - cell2.col, 2)
  );
  return 1.0 - (dist / Math.sqrt(2 * 64)); // Max distance = 8√2 for 9×9
}
```

#### Importance Calculation

```typescript
function calculateImportance(cell: Cell, constraints: Constraint[]): number {
  // Importance = how many constraints would be affected by filling this cell

  const affectedConstraints = constraints.filter(c =>
    cellAffectsConstraint(cell, c)
  );

  const remainingValueCount = affectedConstraints.reduce(
    (sum, c) => sum + c.remainingValues.size,
    0
  );

  // Normalize by maximum possible (3 constraints × 9 values)
  return Math.min(remainingValueCount / 27, 1.0);
}
```

#### Recency Calculation

```typescript
function calculateRecency(cell: Cell, lastVisited: Map<string, number>): number {
  const key = cellKey(cell);
  const lastTime = lastVisited.get(key);

  if (!lastTime) {
    // Never visited = maximum recency score (explore new cells)
    return 1.0;
  }

  const timeSinceVisit = Date.now() - lastTime;
  const decayConstant = 0.001; // Decay over ~10 minutes

  // Exponential decay
  return Math.exp(-decayConstant * timeSinceVisit);
}
```

### 5.2 Edge Cases

**Edge Case 1: All cells have equal attention scores**
- **Scenario:** Symmetrical puzzle state (e.g., early in solving)
- **Handling:** Tie-breaking by row-major order (top-left first)

**Edge Case 2: Plateau detection at puzzle start**
- **Scenario:** First 3 iterations fail
- **Handling:** Don't flag as plateau until iteration 5 (warm-up period)

**Edge Case 3: Insight detection on first move**
- **Scenario:** Not enough history for pattern detection
- **Handling:** Require minimum 5 moves before detecting insights

**Edge Case 4: Reflection during time pressure**
- **Scenario:** Near maxSolveTime limit
- **Handling:** Skip reflection if remaining time < 5 seconds

### 5.3 Testing Strategy

**Unit Tests:**
```typescript
describe('AttentionManager', () => {
  test('selectFocus returns highest-scoring cell', () => {
    const manager = new AttentionManager();
    const state = createTestState();
    const focus = manager.selectFocus(state);
    const allScores = getAllAttentionScores(state);

    expect(focus).toBe(allScores[0].cell); // Highest score
  });

  test('uncertainty score inversely proportional to candidates', () => {
    const cell1: Cell = { row: 0, col: 0 }; // 1 candidate
    const cell2: Cell = { row: 0, col: 1 }; // 5 candidates

    const score1 = calculateUncertainty(cell1, state);
    const score2 = calculateUncertainty(cell2, state);

    expect(score1).toBe(1.0);
    expect(score2).toBeCloseTo(0.2);
  });

  test('reflection triggered every 5 iterations', () => {
    const manager = new AttentionManager();

    expect(manager.shouldReflect(5, 'success')).toBe(true);
    expect(manager.shouldReflect(10, 'success')).toBe(true);
    expect(manager.shouldReflect(7, 'success')).toBe(false);
  });

  test('breakthrough insight detected after plateau', () => {
    const manager = new AttentionManager();

    // Simulate plateau (5 iterations, no progress)
    for (let i = 0; i < 5; i++) {
      manager.updateProgress(failedMove, { outcome: 'failure' });
    }

    // Simulate breakthrough (3 successful moves)
    for (let i = 0; i < 3; i++) {
      manager.updateProgress(successMove, { outcome: 'success' });
    }

    const insights = manager.detectInsights();
    expect(insights).toContainEqual(
      expect.objectContaining({ type: 'breakthrough' })
    );
  });
});
```

**Integration Tests:**
```typescript
describe('Attention in GRASP Loop', () => {
  test('focus selection guides solving progress', async () => {
    const solver = new CognitivePuzzleSolver();
    const puzzle = loadPuzzle('medium-001');

    const result = await solver.solve(puzzle);

    // Verify that high-attention cells were explored first
    const focusSequence = result.attentionLog.map(a => a.focusCell);
    const expectedOrder = getOptimalExplorationOrder(puzzle);

    const correlation = calculateCorrelation(focusSequence, expectedOrder);
    expect(correlation).toBeGreaterThan(0.6);
  });
});
```

---

## 6. Success Criteria

### 6.1 Functional Verification

✅ **Attention Score Calculation**
- All component scores in range [0, 1]
- Final weighted score correctly computed
- Higher uncertainty (fewer candidates) → higher score

✅ **Focus Selection**
- Always selects valid empty cell
- Selects highest-scoring cell
- Tie-breaking deterministic

✅ **Scheduled Reflection**
- Triggers every 5 iterations (configurable)
- Triggers after move outcomes (success/failure)
- Executes all reflection actions

✅ **Progress Tracking**
- Metrics update after each move
- Momentum correctly classified (accelerating/steady/decelerating/stuck)
- Plateau detection accurate

✅ **Insight Detection**
- All 4 heuristics implemented
- Insights logged with confidence scores
- No duplicate detection

### 6.2 Performance Verification

✅ **Latency Targets**
- Attention calculation: < 50ms (9×9 grid)
- Focus selection: < 10ms
- Progress update: < 5ms
- Insight detection: < 100ms
- **Total overhead: < 200ms per iteration**

✅ **Memory Usage**
- AttentionContext: < 50 KB
- Score cache: < 10 KB
- Progress history: < 20 KB
- **Total: < 100 KB**

### 6.3 Quality Verification

✅ **Effectiveness Metrics** (measured over 50 test puzzles)
- Focus on high-uncertainty cells → success rate > 60%
- Insight detection precision > 70%
- Plateau detection accuracy > 85%

✅ **Correlation with Puzzle Solving**
- Attention-guided solving faster than random cell selection
- Insight moments correlate with actual progress jumps
- Reflection improves subsequent move quality

---

## 7. Integration with GRASP Loop

### 7.1 Generate Phase Integration

```typescript
async function generatePhase(context: GRASPContext): Promise<Move[]> {
  // 1. Use attention manager to select focus
  const focusCell = attentionManager.selectFocus(context.currentState);

  // 2. Log focus decision
  await memory.store({
    key: `session/${sessionId}/focus/${iteration}`,
    value: JSON.stringify({ cell: focusCell, timestamp: Date.now() })
  });

  // 3. Generate candidate moves for focused cell
  const candidates = context.currentState.candidates.get(cellKey(focusCell));
  const moves = Array.from(candidates).map(value => ({
    cell: focusCell,
    value,
    strategy: context.activeStrategy,
    timestamp: Date.now()
  }));

  return moves;
}
```

### 7.2 Synthesize Phase Integration

```typescript
async function synthesizePhase(context: GRASPContext): Promise<Insight[]> {
  // 1. Check if reflection should be triggered
  if (attentionManager.shouldReflect(context.iteration, context.lastMoveOutcome)) {
    const reflectionResult = await attentionManager.executeReflection();

    // 2. Log reflection results
    await memory.store({
      key: `session/${sessionId}/reflection/${context.iteration}`,
      value: JSON.stringify(reflectionResult)
    });

    // 3. Detect insights
    const insights = attentionManager.detectInsights();

    // 4. Log insights for dreaming
    for (const insight of insights) {
      await memory.logInsight(insight);
    }

    return insights;
  }

  return [];
}
```

### 7.3 Progress Monitoring Integration

```typescript
async function reviewPhase(move: Move, outcome: ValidationResult): Promise<void> {
  // Update attention manager with move outcome
  attentionManager.updateProgress(move, outcome);

  // Get current progress
  const progress = attentionManager.getProgress();

  // Log to memory for benchmarking
  await memory.store({
    key: `session/${sessionId}/progress/${iteration}`,
    value: JSON.stringify(progress)
  });

  // Check for stuck state
  if (progress.momentum === 'stuck' && progress.plateauDuration > 10) {
    console.warn(`Stuck for ${progress.plateauDuration} iterations, consider strategy change`);
    // Trigger strategy exploration
  }
}
```

---

## 8. Mathematical Formulation

### 8.1 Attention Score Formula

**Full specification:**

$$
\text{AttentionScore}(c) = \sum_{i=1}^{4} w_i \cdot f_i(c, \mathcal{C})
$$

Where:
- $c$ = cell being scored
- $\mathcal{C}$ = attention context (state, history, constraints)
- $w_i$ = weight for component $i$
- $f_i$ = component scoring function

**Component functions:**

$$
f_1(c, \mathcal{C}) = \frac{1}{|\text{candidates}(c)|} \quad \text{(uncertainty)}
$$

$$
f_2(c, \mathcal{C}) = \max_{m \in \text{recent}(\mathcal{C})} \left[ \text{proximity}(c, m) \cdot e^{-\lambda (t - t_m)} \right] \quad \text{(relevance)}
$$

$$
f_3(c, \mathcal{C}) = \frac{|\{k \in \text{constraints}(\mathcal{C}) : c \text{ affects } k\}|}{27} \quad \text{(importance)}
$$

$$
f_4(c, \mathcal{C}) = \begin{cases}
1.0 & \text{if } c \text{ never visited} \\
e^{-\mu (t - t_{\text{visit}})} & \text{otherwise}
\end{cases} \quad \text{(recency)}
$$

**Parameters:**
- $\lambda = 0.1$ (relevance decay constant)
- $\mu = 0.001$ (recency decay constant)
- $w = [0.4, 0.3, 0.2, 0.1]$ (component weights)

### 8.2 Momentum Detection

**Linear regression on recent progress:**

$$
\text{slope} = \frac{n \sum t_i p_i - \sum t_i \sum p_i}{n \sum t_i^2 - (\sum t_i)^2}
$$

Where:
- $t_i$ = iteration index
- $p_i$ = cells filled in iteration $i$
- $n$ = window size (last 10 iterations)

**Classification:**

$$
\text{momentum} = \begin{cases}
\text{accelerating} & \text{if } \text{slope} > 0.1 \\
\text{decelerating} & \text{if } \text{slope} < -0.1 \\
\text{steady} & \text{if } -0.1 \leq \text{slope} \leq 0.1 \\
\text{stuck} & \text{if } p_i = 0 \text{ for last 3 iterations}
\end{cases}
$$

---

## 9. Alignment with Research

### 9.1 Continuous Machine Thinking Research

**Section 2.1.2: Attention Mechanisms** (lines 81-92)

> "Continuous systems employ sophisticated attention mechanisms to manage cognitive focus:
> ```
> Attention_Score(item) = f(relevance, recency, importance, uncertainty)
> ```"

✅ **This specification implements the exact formula from research**

**Key alignment:**
- Uncertainty-weighted scoring (research line 87)
- Multi-component attention (relevance, recency, importance, uncertainty)
- Adaptive focus selection

### 9.2 POC Strategy Report

**Section 4.1.3: Attention Mechanism** (lines 760-788)

> "Recommendation: Uncertainty-Weighted Focus
>
> From research: `Attention_Score(item) = f(relevance, recency, importance, uncertainty)`
>
> ```typescript
> interface AttentionScore {
>   calculate(cell: Cell, context: SolveContext): number {
>     const uncertainty = 1 / cell.candidates.size;  // Fewer = more certain
>     const relevance = this.calculateRelevance(cell, context.recentMoves);
>     const importance = this.calculateImportance(cell, context.constraints);
>     const recency = this.calculateRecency(cell, context.lastVisited);
>
>     // Weights from research: uncertainty most important for puzzles
>     return (
>       0.4 * uncertainty +
>       0.3 * relevance +
>       0.2 * importance +
>       0.1 * recency
>     );
>   }
> }
> ```"

✅ **This specification uses identical weights and formula**

**Section 4.1.4: Background Processing Model** (lines 789-817)

> "Recommendation: Scheduled Reflection (Research Option 2)
>
> ```typescript
> interface ReflectionSchedule {
>   moveInterval: 5;
>   puzzleComplete: true;
>   strategyApplication: true;
>   actions: ['updateCandidateSets', 'detectPatterns', 'evaluateProgress', 'logExperience']
> }
> ```"

✅ **This specification implements scheduled reflection with identical actions**

---

## 10. References

**Implementation Guidance:**
- POC Strategy Report, Section 4.1.3 (Attention Mechanism)
- Continuous Machine Thinking Research, Section 2.1.2 (Attention Mechanisms)
- Types defined in `src/types.ts` (lines 131-152)

**Related Components:**
- Puzzle Engine (for grid state and candidate sets)
- Memory System (for experience logging)
- GRASP Loop (for integration points)
- Progress Tracker (for benchmarking metrics)

---

**Document Status:** Final Specification - Ready for Implementation (Day 4)
