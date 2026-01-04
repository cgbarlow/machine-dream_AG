# Benchmarking Framework Specification

**Component:** Benchmarking Framework
**Version:** 1.0.0
**Date:** January 4, 2026
**Purpose:** Performance measurement, comparison, and validation system for POC

---

## 1. Component Overview

### 1.1 Purpose and Responsibilities

The Benchmarking Framework provides comprehensive measurement and comparison capabilities to validate the core POC hypotheses:

1. **Continuous Thinking** improves solve rates compared to single-shot approaches
2. **Machine Dreaming** consolidates experiences into transferable knowledge
3. **Transfer Learning** demonstrates genuine skill acquisition across puzzle variants

**Core Responsibilities:**
- Establish baseline performance metrics (single-shot, naive-continuous)
- Measure GRASP loop performance (iterations, insights, strategies)
- Track dreaming consolidation effectiveness (compression, abstraction)
- Validate transfer learning across difficulty levels and puzzle variants
- Generate statistical analysis and visualizations for stakeholder presentations
- Compare ReasoningBank vs AgentDB memory systems (if Phase 2 succeeds)

### 1.2 Position in Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    POC ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Puzzle Engine ──▶ GRASP Loop ──▶ Memory System            │
│       │                 │              │                    │
│       │                 │              │                    │
│       ▼                 ▼              ▼                    │
│  ┌────────────────────────────────────────────────┐        │
│  │       BENCHMARKING FRAMEWORK ⭐                │        │
│  │                                                 │        │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │        │
│  │  │ Baseline │  │ Learning │  │ Transfer │     │        │
│  │  │ Collector│  │  Curve   │  │  Tests   │     │        │
│  │  └──────────┘  └──────────┘  └──────────┘     │        │
│  │       │             │              │           │        │
│  │       └─────────────┴──────────────┘           │        │
│  │                     │                          │        │
│  │       ┌─────────────▼────────────┐             │        │
│  │       │  Statistical Analysis    │             │        │
│  │       └─────────────┬────────────┘             │        │
│  │                     │                          │        │
│  │       ┌─────────────▼────────────┐             │        │
│  │       │    Visualization &       │             │        │
│  │       │      Reporting           │             │        │
│  │       └──────────────────────────┘             │        │
│  └────────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Dependencies

**Input Dependencies:**
- **Puzzle Engine**: Puzzle generation, validation, difficulty assessment
- **GRASP Loop**: Iteration data, move sequences, strategy application
- **Memory System**: Experience storage, pattern retrieval, knowledge consolidation
- **Attention Mechanism**: Focus selection, insight detection
- **Dreaming Pipeline**: Consolidation metrics, abstraction ladders

**Output Consumers:**
- **Demo System**: Key metrics for presentation
- **Analysis Reports**: Statistical validation
- **Stakeholder Dashboard**: Real-time progress visualization

---

## 2. Functional Requirements

### 2.1 Baseline Collection (FR-BENCH-001)

**Requirement:** Establish performance baselines for comparison

**Baseline Types:**

#### 2.1.1 Single-Shot Baseline (FR-BENCH-001.1)

**Purpose:** Measure performance without iterative refinement

```typescript
interface SingleShotConfig {
  prompt: "Solve this Sudoku puzzle completely in one response. Output the final grid.";
  trials: 50; // Per difficulty level
  difficulties: ['easy', 'medium', 'hard', 'expert', 'evil'];
  timeout: 120000; // 2 minutes max
  model: 'claude-sonnet-4-20250514';
}
```

**Measured Metrics:**
- `successRate`: % of puzzles solved correctly
- `averageSolveTime`: Mean time to solution (ms)
- `tokenUsage`: Mean tokens per puzzle
- `errorTypes`: Classification of failure modes
- `partialSolutionRate`: % of cells correctly filled in failed attempts

**Collection Protocol:**
1. Load 50 puzzles per difficulty level (250 total)
2. Submit each puzzle with single-shot prompt
3. Validate solution correctness
4. Record all metrics to database
5. Calculate statistical distributions (mean, median, std dev, p95)

**Storage Format:**
```typescript
interface BaselineResult {
  benchmarkType: 'single-shot';
  puzzleId: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'evil';
  success: boolean;
  solveTime: number; // milliseconds
  tokensUsed: number;
  cost: number; // USD
  gridCompletion: number; // 0.0 - 1.0
  errorType?: 'timeout' | 'invalid-move' | 'incomplete' | 'contradiction';
  timestamp: number;
}
```

#### 2.1.2 Naive Continuous Baseline (FR-BENCH-001.2)

**Purpose:** Measure iterative solving without GRASP enhancements

```typescript
interface NaiveContinuousConfig {
  prompt: "Keep trying to solve this puzzle. Show your work step by step.";
  maxIterations: 20;
  trials: 50; // Per difficulty level
  timeout: 300000; // 5 minutes max
  reflectionDisabled: true; // No scheduled reflection
  memoryDisabled: true; // No experience retrieval
}
```

**Measured Metrics:**
- `successRate`: % of puzzles solved
- `averageIterations`: Mean iterations to solution
- `iterationsPerMove`: Efficiency metric
- `plateauDuration`: Iterations without progress
- `tokenEfficiency`: Tokens per successful move

**Collection Protocol:**
1. Same puzzle sets as single-shot
2. Run naive loop (generate → validate → continue)
3. Stop on: solution found, max iterations, timeout
4. Track iteration-level metrics
5. Compare to single-shot baseline

#### 2.1.3 GRASP Baseline (FR-BENCH-001.3)

**Purpose:** Full GRASP loop without dreaming (Day 1-3 performance)

```typescript
interface GRASPBaselineConfig {
  enableGRASP: true;
  enableDreaming: false; // No dreamed knowledge
  enableMemory: true; // ReasoningBank logging
  enableReflection: true; // Scheduled reflection
  maxIterations: 30;
  reflectionInterval: 5; // Every 5 moves
}
```

**Measured Metrics:**
- All naive-continuous metrics PLUS:
- `strategyChanges`: Number of strategy shifts
- `insightCount`: Detected insight moments
- `attentionShifts`: Focus change frequency
- `memoryRetrievalCount`: Similar experience queries

**Expected Improvement:** 40%+ solve rate vs single-shot

#### 2.1.4 GRASP + Dreaming (FR-BENCH-001.4)

**Purpose:** Full system with dreamed knowledge (Day 4+ performance)

```typescript
interface GRASPDreamingConfig {
  enableGRASP: true;
  enableDreaming: true; // Apply consolidated knowledge
  enableMemory: true;
  knowledgeSource: 'dream-consolidation'; // From Night cycle
  applyPatterns: true;
  applyAbstractions: true;
}
```

**Measured Metrics:**
- All GRASP metrics PLUS:
- `patternsApplied`: Number of dreamed patterns used
- `abstractionLevel`: Highest abstraction level accessed
- `transferEffectiveness`: % improvement from dreamed knowledge

**Expected Improvement:** 60%+ solve rate vs single-shot, 30%+ vs GRASP-only

### 2.2 Learning Curve Tracking (FR-BENCH-002)

**Requirement:** Measure performance improvement over time

**Data Collection:**
```typescript
interface LearningCurvePoint {
  puzzleNumber: number; // Sequential index (1-100)
  difficulty: string;
  solveTime: number;
  moveCount: number;
  successRate: number; // Trailing window average
  strategiesKnown: string[]; // Cumulative strategy set
  newStrategiesDiscovered: string[]; // This puzzle
  insightMoments: Insight[];
  performanceMetrics: {
    iterationsToSolve: number;
    backtrackCount: number;
    confidenceCalibration: number; // Predicted vs actual
  };
}
```

**Analysis Metrics:**
- **Slope of Learning**: Linear regression coefficient over puzzle sequence
- **Time to First Insight**: Puzzle number where first non-obvious strategy appears
- **Plateau Detection**: Identify performance stabilization points
- **Strategy Emergence Timeline**: When each strategy first appears
- **Discontinuity Detection**: Sudden performance jumps (insight moments)

**Visualization Requirements:**
```
Performance vs Puzzle Number
    │
100%│                    ┌─────────── Mastery plateau
    │               ┌────┘
 75%│          ┌────┘         ↑ Insight moments
    │     ┌────┘              │ (discontinuities)
 50%│ ┌───┘
    │─┘
 25%│
    │
  0%└──────────────────────────────────────►
     0    20    40    60    80   100
          Puzzles Solved
```

**Statistical Tests:**
- Mann-Kendall trend test (non-parametric)
- Changepoint detection (Bayesian)
- Rolling window averaging (window size: 10 puzzles)

### 2.3 Transfer Learning Tests (FR-BENCH-003)

**Requirement:** Validate knowledge transfer across puzzle variants

#### 2.3.1 Same-Domain Transfer (Easy → Hard)

**Protocol:**
1. Train on 9×9 Sudoku (easy-medium, 100 puzzles)
2. Dream cycle consolidation
3. Test on 9×9 Sudoku (hard-expert, 50 puzzles)
4. Compare to baseline (no training)

```typescript
interface SameDomainTransferTest {
  source: {
    domain: 'sudoku-9x9';
    difficulty: ['easy', 'medium'];
    trainingPuzzles: 100;
    dreamCycles: 1;
  };
  target: {
    domain: 'sudoku-9x9';
    difficulty: ['hard', 'expert'];
    testPuzzles: 50;
  };
  metrics: {
    baselinePerformance: SolveStats; // No training
    transferPerformance: SolveStats; // With training
    improvement: number; // Percentage
    strategyReuse: number; // % of trained strategies applied
  };
}
```

**Success Criterion:** 30%+ improvement over baseline

#### 2.3.2 Cross-Variant Transfer (9×9 → 16×16)

**Protocol:**
1. Train on 9×9 Sudoku (all difficulties, 100 puzzles)
2. Dream cycle consolidation
3. Test on 16×16 Sudoku (medium difficulty, 30 puzzles)
4. Measure strategy adaptation

```typescript
interface CrossVariantTransferTest {
  source: {
    domain: 'sudoku-9x9';
    difficulty: ['easy', 'medium', 'hard'];
    trainingPuzzles: 100;
  };
  target: {
    domain: 'sudoku-16x16';
    difficulty: ['medium']; // Scaled difficulty
    testPuzzles: 30;
  };
  metrics: {
    strategyReuse: number; // % applicable
    adaptationTime: number; // Time to first 16×16 solve
    novelStrategyRate: number; // % new strategies needed
    performanceRatio: number; // vs. baseline 16×16
  };
}
```

**Success Criterion:** 25%+ improvement, 50%+ strategy reuse

#### 2.3.3 Cross-Domain Transfer (Sudoku → Tower of Hanoi)

**Protocol:**
1. Train on Sudoku (constraint satisfaction patterns)
2. Extract high-level abstractions (Level 3-4)
3. Test on Tower of Hanoi (recursive optimization)
4. Measure abstraction reuse

```typescript
interface CrossDomainTransferTest {
  source: {
    domain: 'sudoku';
    abstractionsExtracted: AbstractionLadder; // Focus on Level 3-4
  };
  target: {
    domain: 'tower-of-hanoi';
    problemSizes: [3, 4, 5, 6]; // Disks
    testCases: 20;
  };
  metrics: {
    abstractionReuse: number; // High-level principles applied
    performanceBoost: number; // vs. no prior experience
    optimalityRatio: number; // Moves vs. optimal (2^n - 1)
    recursionDiscovery: boolean; // Did it find pattern?
  };
}
```

**Success Criterion:** 18%+ improvement, recursive pattern discovery

### 2.4 Metrics Tracking (FR-BENCH-004)

**Requirement:** Comprehensive metric collection and storage

#### 2.4.1 Solve Metrics

```typescript
interface SolveMetrics {
  // Identification
  benchmarkType: BenchmarkType;
  puzzleId: string;
  sessionId: string;
  difficulty: string;
  timestamp: number;

  // Outcome
  success: boolean;
  solveTime: number; // milliseconds
  moveCount: number;
  iterationCount: number;

  // Strategy
  strategiesUsed: string[];
  strategyChanges: number;
  dominantStrategy: string;

  // Insights
  insightCount: number;
  insightMoments: number[]; // Iteration indices
  breakthroughDetected: boolean;

  // Errors
  backtrackCount: number;
  errorRate: number;
  errorTypes: string[];

  // Resources
  tokensUsed: number;
  cost: number; // USD
  memoryQueries: number;

  // Quality
  confidenceCalibration: number; // 0-1
  solutionQuality: number; // 0-1 (optimality)
}
```

#### 2.4.2 Transfer Metrics

```typescript
interface TransferMetrics {
  // Task Definition
  sourceTask: string;
  targetTask: string;
  transferType: 'same-domain' | 'cross-variant' | 'cross-domain';

  // Performance
  baselinePerformance: number; // No transfer
  transferPerformance: number; // With transfer
  improvement: number; // Percentage

  // Knowledge Reuse
  skillsTransferred: number;
  patternsReused: number;
  abstractionsApplied: number;

  // Adaptation
  adaptationTime: number; // Time to first success
  novelStrategiesNeeded: number;
  strategyModificationRate: number;

  // Quality
  transferEffectiveness: number; // 0-1 score
  knowledgeRetention: number; // % of source knowledge retained
}
```

#### 2.4.3 Dreaming Consolidation Metrics

```typescript
interface DreamingMetrics {
  // Session Info
  sessionId: string;
  dreamCycleId: string;
  timestamp: number;

  // Input
  inputExperiences: number;
  totalTrajectories: number;
  totalMoves: number;

  // Compression
  outputPatterns: number;
  compressionRatio: number; // Input / Output
  informationLoss: number; // Estimated 0-1

  // Abstraction
  abstractionLevels: number;
  patternsPerLevel: number[];
  maxAbstractionDepth: number;

  // Quality
  patternNovelty: number; // 0-1 (non-obviousness)
  patternUtility: number; // 0-1 (future performance gain)
  contradictionRate: number; // Internal consistency
  verificationStatus: 'verified' | 'unverified' | 'failed';

  // Performance
  consolidationTime: number; // milliseconds
  pruningRate: number; // % patterns removed
  deduplicationCount: number;
}
```

### 2.5 Statistical Analysis (FR-BENCH-005)

**Requirement:** Rigorous statistical validation of hypotheses

#### 2.5.1 Hypothesis Tests

**H1: Continuous Thinking improves solve rates**
```typescript
interface HypothesisTest {
  hypothesis: 'continuous-thinking-improvement';
  comparisonGroups: ['single-shot', 'grasp-baseline'];
  metric: 'solve-rate';
  test: 'two-sample-t-test'; // Or Mann-Whitney U if non-normal
  alpha: 0.05; // Significance level
  result: {
    pValue: number;
    significant: boolean;
    effectSize: number; // Cohen's d
    confidenceInterval: [number, number];
  };
}
```

**H2: Dreaming enables transfer learning**
```typescript
interface HypothesisTest {
  hypothesis: 'dreaming-transfer-learning';
  comparisonGroups: ['grasp-baseline', 'grasp-with-dreaming'];
  metric: 'transfer-improvement';
  test: 'paired-t-test'; // Same puzzles before/after
  alpha: 0.05;
  result: {
    pValue: number;
    significant: boolean;
    effectSize: number;
    powerAnalysis: number; // Statistical power
  };
}
```

**H3: Strategy emergence correlates with performance**
```typescript
interface CorrelationTest {
  hypothesis: 'strategy-performance-correlation';
  variable1: 'unique-strategies-known';
  variable2: 'solve-rate';
  test: 'pearson-correlation'; // Or Spearman if non-linear
  result: {
    correlation: number; // -1 to 1
    pValue: number;
    significant: boolean;
    scatterPlot: DataPoint[];
  };
}
```

#### 2.5.2 Statistical Methods

**Descriptive Statistics:**
- Mean, median, mode
- Standard deviation, variance
- Percentiles (p25, p50, p75, p95)
- Min, max, range

**Inferential Statistics:**
- Two-sample t-tests (parametric)
- Mann-Whitney U test (non-parametric)
- Paired t-tests (before/after comparisons)
- ANOVA (multiple group comparisons)
- Effect size calculations (Cohen's d)

**Time Series Analysis:**
- Trend detection (Mann-Kendall test)
- Changepoint detection (Bayesian)
- Rolling window averages
- Autocorrelation analysis

**Confidence Intervals:**
- 95% CI for all mean estimates
- Bootstrap resampling for non-normal distributions
- Bonferroni correction for multiple comparisons

### 2.6 Visualization Requirements (FR-BENCH-006)

**Requirement:** Clear, stakeholder-friendly visualizations

#### 2.6.1 Learning Curves

```typescript
interface LearningCurveVisualization {
  chartType: 'line-chart';
  xAxis: 'puzzle-number';
  yAxis: 'solve-rate' | 'solve-time' | 'strategy-count';
  series: [
    { name: 'Single-shot', color: '#FF6B6B' },
    { name: 'Naive continuous', color: '#FFA500' },
    { name: 'GRASP baseline', color: '#4ECDC4' },
    { name: 'GRASP + Dreaming', color: '#95E1D3' }
  ];
  annotations: {
    insightMoments: { icon: '💡', color: '#FFD700' };
    dreamCycles: { icon: '🌙', color: '#9B59B6' };
    strategyDiscovery: { icon: '⭐', color: '#3498DB' };
  };
  format: 'svg' | 'png';
  resolution: { width: 1200, height: 600 };
}
```

**Example Output:**
```
Solve Rate vs Puzzles Solved
100%│                              ⭐💡
    │                          ┌───────
 80%│                      ┌──┘    GRASP+Dream
    │                  ┌──┘
 60%│              ┌──┘         GRASP baseline
    │          ┌──┘
 40%│      ┌──┘              Naive continuous
    │  ┌──┘
 20%│──                   Single-shot
    │
  0%└─────────────────────────────────────►
     0    25    50    75   100
          🌙              🌙
       (Dream)         (Dream)
```

#### 2.6.2 Transfer Learning Comparison

```typescript
interface TransferVisualization {
  chartType: 'grouped-bar-chart';
  groups: ['Same Domain', 'Cross-Variant', 'Cross-Domain'];
  bars: [
    { name: 'Baseline', color: '#95A5A6' },
    { name: 'With Transfer', color: '#2ECC71' }
  ];
  metric: 'solve-rate-percentage';
  showImprovement: true; // Display % improvement labels
  errorBars: '95-confidence-interval';
}
```

**Example Output:**
```
Transfer Learning Results
100%│
    │  ┌──┐                          +35%
 75%│  │  │  ┌──┐       +28%         ┌──┐
    │  │  │  │  │       ┌──┐         │  │
 50%│  │▓▓│  │▓▓│       │▓▓│  +18%  │▓▓│
    │  │▓▓│  │▓▓│       │▓▓│  ┌──┐  │▓▓│
 25%│  │░░│  │░░│       │░░│  │░░│  │░░│
    │  │░░│  │░░│       │░░│  │░░│  │░░│
  0%└──┴──┴──┴──┴───────┴──┴──┴──┴──┴──┴──
      Same      Cross-      Cross-
     Domain    Variant     Domain

     ░ Baseline    ▓ With Transfer
```

#### 2.6.3 Abstraction Ladder Visualization

```typescript
interface AbstractionLadderVisualization {
  chartType: 'tree-diagram';
  layout: 'vertical';
  levels: AbstractionLevel[];
  nodeSize: 'proportional-to-examples'; // Larger = more evidence
  colorScheme: 'gradient-by-level'; // L0=blue → L4=purple
  interactivity: {
    hover: 'show-examples';
    click: 'expand-details';
  };
}
```

**Example Output:**
```
                    Level 4 (Meta)
                         │
            "Problem Solving = Iterative
         Constraint Satisfaction + Search"
                         │
        ┌────────────────┴────────────────┐
        │                                  │
   Level 3 (Principle)              Level 3 (Principle)
        │                                  │
"Constraint Propagation"        "Most Constrained First"
        │                                  │
    ┌───┴───┐                          ┌──┴──┐
    │       │                          │     │
  L2 (Category)                      L2 (Category)
    │       │                          │     │
"Elimination" "Placement"         "Search" "Heuristics"
    │       │                          │     │
  [47 specific examples...]      [32 examples...]
```

#### 2.6.4 Strategy Emergence Timeline

```typescript
interface StrategyTimelineVisualization {
  chartType: 'gantt-timeline';
  xAxis: 'puzzle-number';
  yAxis: 'strategy-name';
  bars: {
    firstDiscovery: { marker: '⭐', color: '#FFD700' };
    consistentUse: { color: '#2ECC71', opacity: 0.6 };
    mastery: { color: '#27AE60', opacity: 1.0 };
  };
  sortOrder: 'by-discovery-time';
}
```

**Example Output:**
```
Strategy Discovery Timeline
                     Puzzle Number
Strategy          0    25    50    75   100
─────────────────────────────────────────
Naked Single      ⭐═══════════════════
Hidden Single       ⭐═════════════════
Pointing Pair            ⭐═══════════
Box/Line Reduction           ⭐═══════
Naked Pair                       ⭐═══
X-Wing                              ⭐═
─────────────────────────────────────────
⭐ First discovery  ═ Consistent use
```

### 2.7 Data Export Formats (FR-BENCH-007)

**Requirement:** Export data in standard formats for external analysis

#### 2.7.1 JSON Export

```typescript
interface BenchmarkExport {
  metadata: {
    exportDate: string;
    pocVersion: string;
    totalPuzzles: number;
    totalSessions: number;
    memorySystem: 'reasoningbank' | 'agentdb';
  };

  baselines: BaselineResult[];
  learningCurve: LearningCurvePoint[];
  transferTests: TransferMetrics[];
  dreamingCycles: DreamingMetrics[];

  statistics: {
    hypothesisTests: HypothesisTest[];
    correlations: CorrelationTest[];
    descriptiveStats: {
      [metric: string]: {
        mean: number;
        median: number;
        stdDev: number;
        p95: number;
      };
    };
  };

  visualizations: {
    learningCurves: { svg: string; png: string };
    transferComparison: { svg: string; png: string };
    abstractionLadder: { svg: string; png: string };
  };
}
```

**File Path:** `/workspaces/machine-dream/data/exports/benchmark-export-{timestamp}.json`

#### 2.7.2 CSV Export

**File 1: Solve Metrics**
```csv
benchmark_type,puzzle_id,difficulty,success,solve_time_ms,move_count,tokens_used,cost_usd,strategies_used,insight_count
single-shot,puzzle-001,easy,true,45234,27,12450,0.037,"naked-single;hidden-single",2
grasp-baseline,puzzle-001,easy,true,89123,31,23100,0.069,"naked-single;hidden-single;pointing-pair",5
...
```

**File 2: Transfer Results**
```csv
source_task,target_task,transfer_type,baseline_rate,transfer_rate,improvement_pct,skills_transferred
sudoku-9x9-easy,sudoku-9x9-hard,same-domain,0.42,0.58,38.1,7
sudoku-9x9-all,sudoku-16x16-med,cross-variant,0.35,0.47,34.3,5
sudoku,tower-hanoi,cross-domain,0.68,0.82,20.6,3
```

**File 3: Dreaming Consolidation**
```csv
session_id,dream_cycle_id,input_experiences,output_patterns,compression_ratio,abstraction_levels,consolidation_time_ms
session-001,dream-001,47,5,9.4,4,3421
session-002,dream-002,63,7,9.0,4,4123
```

**Export Directory:** `/workspaces/machine-dream/data/exports/csv/`

#### 2.7.3 Statistical Report (Markdown)

```markdown
# POC Benchmarking Results

**Date:** {timestamp}
**Memory System:** ReasoningBank | AgentDB
**Total Puzzles:** {count}

## Executive Summary

- **H1 (Continuous Thinking):** ✅ VALIDATED - 47% improvement (p<0.001)
- **H2 (Dreaming Transfer):** ✅ VALIDATED - 35% improvement (p<0.001)
- **H3 (Strategy Correlation):** ✅ VALIDATED - r=0.82 (p<0.001)

## Baseline Performance

| Benchmark Type      | Solve Rate | Avg Time (s) | Tokens | Cost |
|---------------------|------------|--------------|--------|------|
| Single-shot         | 42%        | 45.2         | 12.5K  | $0.04|
| Naive continuous    | 58%        | 67.3         | 18.2K  | $0.05|
| GRASP baseline      | 73%        | 89.1         | 23.1K  | $0.07|
| GRASP + Dreaming    | 89%        | 76.4         | 20.8K  | $0.06|

[Full statistical analysis follows...]
```

**File Path:** `/workspaces/machine-dream/data/exports/benchmark-report-{timestamp}.md`

### 2.8 Comparison Reporting (FR-BENCH-008)

**Requirement:** Compare ReasoningBank vs AgentDB (if Phase 2 succeeds)

#### 2.8.1 Memory System Comparison

```typescript
interface MemorySystemComparison {
  reasoningBank: {
    performanceMetrics: PerformanceMetrics;
    learningCurve: LearningCurvePoint[];
    transferResults: TransferMetrics[];
    consolidationMetrics: DreamingMetrics[];
  };

  agentDB: {
    performanceMetrics: PerformanceMetrics;
    learningCurve: LearningCurvePoint[];
    transferResults: TransferMetrics[];
    consolidationMetrics: DreamingMetrics[];
    rlMetrics: {
      convergenceRate: number; // Epochs to convergence
      actionQuality: number; // 0-1 score
      explorationRate: number;
    };
    reflexionMetrics: {
      errorReductionRate: number; // % repeat errors reduced
      correctionAccuracy: number;
    };
    skillLibraryMetrics: {
      skillsExtracted: number;
      skillReuseRate: number;
      skillTransferability: number;
    };
  };

  comparison: {
    performanceSpeedup: number; // AgentDB / ReasoningBank
    memoryEfficiency: number; // MB used ratio
    querySpeed: number; // ms per query ratio
    learningRateImprovement: number; // Slope ratio
    transferEffectiveness: number; // Transfer % improvement
    productionRecommendation: 'reasoningbank' | 'agentdb' | 'both';
    rationale: string;
  };
}
```

#### 2.8.2 Comparison Visualization

```typescript
interface ComparisonVisualization {
  chartType: 'radar-chart';
  dimensions: [
    'Query Speed',
    'Memory Efficiency',
    'Learning Rate',
    'Transfer Effectiveness',
    'Consolidation Quality',
    'Error Reduction'
  ];
  series: [
    { name: 'ReasoningBank', color: '#3498DB', data: [...] },
    { name: 'AgentDB', color: '#E74C3C', data: [...] }
  ];
  normalization: 'scale-to-max'; // 0-100 scale
}
```

**Example Output:**
```
Memory System Comparison
        Query Speed
             /\
            /  \
   Memory  /    \  Learning
  Efficiency    Rate
        |        |
        |   RB   |
        |   / \  |
Transfer|  /   \ |Error
Effective\ /   \ /Reduction
         \/     \/
     Consolidation
         Quality

 ── ReasoningBank  ── AgentDB
```

---

## 3. Non-Functional Requirements

### 3.1 Performance (NFR-BENCH-001)

**Metric Collection Overhead:**
- Benchmark data collection MUST NOT increase solve time by >5%
- Metrics should be logged asynchronously where possible
- Database writes batched (100 records per transaction)

**Statistical Analysis Speed:**
- Full analysis MUST complete in <60 seconds for 500 puzzles
- Real-time visualizations update in <2 seconds
- Export generation completes in <30 seconds

### 3.2 Accuracy (NFR-BENCH-002)

**Metric Precision:**
- Time measurements accurate to 1ms
- Token counts exact (no estimation)
- Cost calculations accurate to $0.001
- Solve verification 100% accurate (no false positives)

**Statistical Rigor:**
- Minimum sample size: 50 puzzles per condition
- Significance level: α=0.05
- Power analysis: β=0.20 (80% power)
- Effect size calculation: Cohen's d for all comparisons

### 3.3 Storage (NFR-BENCH-003)

**Data Retention:**
- Raw metrics stored for all 500+ puzzles
- Aggregated statistics computed and cached
- Visualization assets stored in multiple formats (SVG, PNG)
- Database size estimate: 50-100 MB

**Database Schema:**
```sql
CREATE TABLE solve_metrics (
  id TEXT PRIMARY KEY,
  benchmark_type TEXT NOT NULL,
  puzzle_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  solve_time_ms INTEGER NOT NULL,
  move_count INTEGER NOT NULL,
  iteration_count INTEGER,
  strategies_used TEXT, -- JSON array
  insight_count INTEGER,
  tokens_used INTEGER NOT NULL,
  cost_usd REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (puzzle_id) REFERENCES puzzles(id)
);

CREATE TABLE transfer_metrics (
  id TEXT PRIMARY KEY,
  source_task TEXT NOT NULL,
  target_task TEXT NOT NULL,
  transfer_type TEXT NOT NULL,
  baseline_performance REAL NOT NULL,
  transfer_performance REAL NOT NULL,
  improvement_pct REAL NOT NULL,
  skills_transferred INTEGER,
  timestamp INTEGER NOT NULL
);

CREATE TABLE dreaming_metrics (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  dream_cycle_id TEXT NOT NULL,
  input_experiences INTEGER NOT NULL,
  output_patterns INTEGER NOT NULL,
  compression_ratio REAL NOT NULL,
  abstraction_levels INTEGER NOT NULL,
  consolidation_time_ms INTEGER NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE INDEX idx_solve_benchmark ON solve_metrics(benchmark_type, difficulty);
CREATE INDEX idx_solve_session ON solve_metrics(session_id);
CREATE INDEX idx_transfer_type ON transfer_metrics(transfer_type);
```

### 3.4 Extensibility (NFR-BENCH-004)

**New Metrics:**
- Framework MUST support adding new metrics without schema migration
- Custom metrics stored in JSON `metadata` field
- Metric definitions versioned for backward compatibility

**New Benchmark Types:**
- Plugin architecture for custom baseline collectors
- Configuration-driven benchmark definitions
- Automated test discovery and execution

---

## 4. API/Interface Design

### 4.1 Baseline Collector Interface

```typescript
interface BaselineCollector {
  /**
   * Run baseline benchmark on puzzle set
   */
  runBaseline(config: BaselineConfig): Promise<BaselineResult[]>;

  /**
   * Get baseline statistics
   */
  getStatistics(type: BenchmarkType): Promise<BaselineStatistics>;

  /**
   * Compare baseline to experimental condition
   */
  compareToBaseline(
    baselineType: BenchmarkType,
    experimentalResults: SolveMetrics[]
  ): Promise<ComparisonReport>;
}

interface BaselineConfig {
  type: BenchmarkType;
  puzzleSet: string[]; // Puzzle IDs
  trials: number;
  timeout: number; // milliseconds
  model: string;
  options?: Record<string, unknown>;
}

interface BaselineStatistics {
  sampleSize: number;
  solveRate: number;
  meanSolveTime: number;
  medianSolveTime: number;
  stdDevSolveTime: number;
  p95SolveTime: number;
  meanTokens: number;
  meanCost: number;
  distribution: {
    solveTimeHistogram: number[];
    successByDifficulty: Record<string, number>;
  };
}
```

### 4.2 Learning Curve Tracker

```typescript
interface LearningCurveTracker {
  /**
   * Record solve attempt for learning curve
   */
  recordSolveAttempt(metrics: SolveMetrics): Promise<void>;

  /**
   * Get learning curve data
   */
  getLearningCurve(sessionId: string): Promise<LearningCurvePoint[]>;

  /**
   * Analyze learning trends
   */
  analyzeTrends(sessionId: string): Promise<LearningAnalysis>;

  /**
   * Detect insight moments (discontinuities)
   */
  detectInsights(sessionId: string): Promise<InsightMoment[]>;
}

interface LearningAnalysis {
  slope: number; // Learning rate
  rSquared: number; // Goodness of fit
  plateaus: PlateauPoint[];
  insightMoments: InsightMoment[];
  strategyEmergenceTimeline: StrategyEmergence[];
  performanceProjection: {
    puzzles100: number; // Predicted performance at 100 puzzles
    puzzles200: number;
  };
}

interface PlateauPoint {
  startPuzzle: number;
  endPuzzle: number;
  performanceLevel: number;
  duration: number; // Number of puzzles
}

interface InsightMoment {
  puzzleNumber: number;
  performanceBefore: number;
  performanceAfter: number;
  jump: number; // Percentage improvement
  associatedStrategy: string;
}

interface StrategyEmergence {
  strategy: string;
  firstAppearance: number; // Puzzle number
  consistentUseFrom: number; // When it became regular
  masteryFrom: number; // When success rate >90%
  usageRate: number; // Overall usage percentage
}
```

### 4.3 Transfer Test Runner

```typescript
interface TransferTestRunner {
  /**
   * Run transfer learning test
   */
  runTransferTest(config: TransferTestConfig): Promise<TransferMetrics>;

  /**
   * Compare transfer effectiveness across conditions
   */
  compareTransferTests(tests: TransferMetrics[]): Promise<TransferComparison>;

  /**
   * Analyze knowledge reuse
   */
  analyzeKnowledgeReuse(
    sourceSession: string,
    targetSession: string
  ): Promise<KnowledgeReuseAnalysis>;
}

interface TransferTestConfig {
  transferType: 'same-domain' | 'cross-variant' | 'cross-domain';
  sourceTask: {
    domain: string;
    difficulty: string[];
    trainingPuzzles: number;
    dreamCycles: number;
  };
  targetTask: {
    domain: string;
    difficulty: string[];
    testPuzzles: number;
  };
  knowledgeSource: 'dream-consolidation' | 'episodic-memory' | 'none';
}

interface TransferComparison {
  tests: TransferMetrics[];
  ranking: string[]; // By improvement percentage
  statisticalSignificance: {
    [testId: string]: {
      pValue: number;
      significant: boolean;
    };
  };
  bestPractices: string[]; // Recommendations
}

interface KnowledgeReuseAnalysis {
  patternsAvailable: number;
  patternsReused: number;
  reuseRate: number; // Percentage
  adaptationRequired: boolean;
  adaptationQuality: number; // 0-1 score
  novelKnowledgeGenerated: number; // New patterns created
  transferEffectiveness: number; // Overall score
}
```

### 4.4 Statistical Analyzer

```typescript
interface StatisticalAnalyzer {
  /**
   * Run hypothesis test
   */
  runHypothesisTest(test: HypothesisTestConfig): Promise<HypothesisTestResult>;

  /**
   * Calculate descriptive statistics
   */
  calculateDescriptiveStats(metrics: number[]): Promise<DescriptiveStats>;

  /**
   * Detect changepoints in time series
   */
  detectChangepoints(series: LearningCurvePoint[]): Promise<Changepoint[]>;

  /**
   * Calculate correlation
   */
  calculateCorrelation(
    variable1: number[],
    variable2: number[]
  ): Promise<CorrelationResult>;

  /**
   * Run ANOVA for multiple groups
   */
  runANOVA(groups: Record<string, number[]>): Promise<ANOVAResult>;
}

interface HypothesisTestConfig {
  hypothesis: string;
  comparisonGroups: string[];
  metric: string;
  test: 'two-sample-t-test' | 'mann-whitney-u' | 'paired-t-test' | 'anova';
  alpha: number; // Significance level
}

interface HypothesisTestResult {
  hypothesis: string;
  pValue: number;
  significant: boolean;
  effectSize: number;
  confidenceInterval: [number, number];
  powerAnalysis: number;
  interpretation: string;
}

interface DescriptiveStats {
  count: number;
  mean: number;
  median: number;
  mode: number;
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    p99: number;
  };
  skewness: number;
  kurtosis: number;
}

interface Changepoint {
  index: number; // Data point index
  puzzleNumber?: number;
  confidence: number; // 0-1
  magnitudeOfChange: number;
  direction: 'increase' | 'decrease';
}

interface CorrelationResult {
  correlation: number; // -1 to 1
  pValue: number;
  significant: boolean;
  method: 'pearson' | 'spearman';
  confidenceInterval: [number, number];
}

interface ANOVAResult {
  fStatistic: number;
  pValue: number;
  significant: boolean;
  groups: string[];
  groupMeans: number[];
  postHoc: {
    [comparison: string]: {
      pValue: number;
      significant: boolean;
    };
  };
}
```

### 4.5 Visualization Generator

```typescript
interface VisualizationGenerator {
  /**
   * Generate learning curve chart
   */
  generateLearningCurve(
    data: LearningCurvePoint[],
    config: ChartConfig
  ): Promise<ChartOutput>;

  /**
   * Generate transfer comparison chart
   */
  generateTransferComparison(
    data: TransferMetrics[],
    config: ChartConfig
  ): Promise<ChartOutput>;

  /**
   * Generate abstraction ladder diagram
   */
  generateAbstractionLadder(
    ladder: AbstractionLadder,
    config: DiagramConfig
  ): Promise<ChartOutput>;

  /**
   * Generate strategy timeline
   */
  generateStrategyTimeline(
    strategies: StrategyEmergence[],
    config: TimelineConfig
  ): Promise<ChartOutput>;

  /**
   * Generate statistical summary dashboard
   */
  generateDashboard(
    metrics: BenchmarkMetrics,
    config: DashboardConfig
  ): Promise<DashboardOutput>;
}

interface ChartConfig {
  width: number;
  height: number;
  format: 'svg' | 'png' | 'both';
  theme: 'light' | 'dark';
  annotations?: Annotation[];
  title?: string;
  subtitle?: string;
}

interface ChartOutput {
  svg?: string;
  png?: Buffer;
  metadata: {
    generatedAt: number;
    dataPoints: number;
    dimensions: { width: number; height: number };
  };
}

interface Annotation {
  type: 'vertical-line' | 'horizontal-line' | 'point' | 'region';
  position: number | [number, number];
  label: string;
  color: string;
  icon?: string;
}
```

### 4.6 Data Exporter

```typescript
interface DataExporter {
  /**
   * Export benchmark data to JSON
   */
  exportJSON(config: ExportConfig): Promise<string>;

  /**
   * Export metrics to CSV
   */
  exportCSV(config: ExportConfig): Promise<string[]>;

  /**
   * Generate statistical report (Markdown)
   */
  generateReport(config: ReportConfig): Promise<string>;

  /**
   * Export comparison (ReasoningBank vs AgentDB)
   */
  exportComparison(
    comparison: MemorySystemComparison
  ): Promise<ComparisonExport>;
}

interface ExportConfig {
  outputPath: string;
  includeBaselines: boolean;
  includeLearningCurves: boolean;
  includeTransferTests: boolean;
  includeDreamingMetrics: boolean;
  includeVisualizations: boolean;
  format: 'json' | 'csv' | 'markdown' | 'all';
}

interface ReportConfig extends ExportConfig {
  template: 'executive-summary' | 'technical-detail' | 'stakeholder';
  includeStatistics: boolean;
  includeHypothesisTests: boolean;
  includeVisualizations: boolean;
}

interface ComparisonExport {
  jsonPath: string;
  markdownPath: string;
  visualizationPaths: {
    radarChart: string;
    learningCurveComparison: string;
    performanceComparison: string;
  };
  recommendation: {
    system: 'reasoningbank' | 'agentdb' | 'both';
    rationale: string;
    productionReadiness: number; // 0-1 score
  };
}
```

---

## 5. Implementation Notes

### 5.1 Key Algorithms

#### 5.1.1 Insight Detection Algorithm

**Purpose:** Detect sudden performance improvements (insight moments)

```typescript
function detectInsights(learningCurve: LearningCurvePoint[]): InsightMoment[] {
  const insights: InsightMoment[] = [];
  const windowSize = 5; // Trailing window

  for (let i = windowSize; i < learningCurve.length; i++) {
    const beforeWindow = learningCurve.slice(i - windowSize, i);
    const afterWindow = learningCurve.slice(i, i + windowSize);

    const beforeAvg = mean(beforeWindow.map(p => p.successRate));
    const afterAvg = mean(afterWindow.map(p => p.successRate));

    const jump = (afterAvg - beforeAvg) / beforeAvg;

    // Insight detected if >20% improvement
    if (jump > 0.20) {
      insights.push({
        puzzleNumber: learningCurve[i].puzzleNumber,
        performanceBefore: beforeAvg,
        performanceAfter: afterAvg,
        jump: jump * 100, // Convert to percentage
        associatedStrategy: learningCurve[i].newStrategiesDiscovered[0] || 'unknown'
      });
    }
  }

  return insights;
}
```

#### 5.1.2 Changepoint Detection (Bayesian)

**Purpose:** Identify significant shifts in learning curve

```typescript
function detectChangepoints(series: number[]): Changepoint[] {
  // Bayesian Online Changepoint Detection (simplified)
  const changepoints: Changepoint[] = [];
  const threshold = 0.7; // Confidence threshold

  let runLength = 0;
  let runLengthProb: number[] = [1.0];

  for (let t = 1; t < series.length; t++) {
    // Calculate predictive probability
    const predictiveProb = calculatePredictive(series, t, runLengthProb);

    // Update run length probabilities
    runLengthProb = updateRunLength(predictiveProb, runLengthProb);

    // Detect changepoint if run length resets with high probability
    if (runLengthProb[0] > threshold) {
      const magnitudeOfChange = Math.abs(series[t] - series[t - 1]);
      const direction = series[t] > series[t - 1] ? 'increase' : 'decrease';

      changepoints.push({
        index: t,
        confidence: runLengthProb[0],
        magnitudeOfChange,
        direction
      });
    }
  }

  return changepoints;
}
```

#### 5.1.3 Effect Size Calculation (Cohen's d)

**Purpose:** Measure magnitude of difference between groups

```typescript
function calculateCohenD(group1: number[], group2: number[]): number {
  const mean1 = mean(group1);
  const mean2 = mean(group2);

  const n1 = group1.length;
  const n2 = group2.length;

  // Pooled standard deviation
  const variance1 = variance(group1);
  const variance2 = variance(group2);
  const pooledVariance = ((n1 - 1) * variance1 + (n2 - 1) * variance2) / (n1 + n2 - 2);
  const pooledStdDev = Math.sqrt(pooledVariance);

  // Cohen's d = (mean1 - mean2) / pooledStdDev
  const d = (mean1 - mean2) / pooledStdDev;

  return d;
}

// Interpretation:
// |d| < 0.2: Small effect
// 0.2 ≤ |d| < 0.5: Medium effect
// |d| ≥ 0.5: Large effect
```

### 5.2 Edge Cases

#### 5.2.1 Incomplete Baseline Collection

**Scenario:** Some puzzles timeout or fail

**Handling:**
- Log failures separately with error type
- Continue collecting remaining baselines
- Report actual sample size in statistics
- Use non-parametric tests if sample size <30

#### 5.2.2 Non-Normal Distributions

**Scenario:** Solve times are not normally distributed

**Handling:**
- Use Mann-Whitney U test instead of t-test
- Use Spearman correlation instead of Pearson
- Report median instead of mean
- Include distribution plots in visualizations

#### 5.2.3 Multiple Comparisons

**Scenario:** Testing multiple hypotheses increases false positive rate

**Handling:**
- Apply Bonferroni correction: α_corrected = α / n_tests
- Report both raw and corrected p-values
- Use False Discovery Rate (FDR) control
- Clearly mark which tests are corrected

#### 5.2.4 Missing Transfer Data

**Scenario:** Target task has no baseline (novel variant)

**Handling:**
- Collect baseline in parallel with transfer test
- Use within-subject comparison (before/after dreaming)
- Report absolute performance rather than improvement
- Flag as exploratory analysis

### 5.3 Testing Strategy

#### 5.3.1 Unit Tests

**Baseline Collector:**
```typescript
describe('BaselineCollector', () => {
  it('should collect single-shot baseline correctly', async () => {
    const collector = new BaselineCollector();
    const config = { type: 'single-shot', puzzleSet: ['test-001'], trials: 1 };
    const results = await collector.runBaseline(config);

    expect(results).toHaveLength(1);
    expect(results[0].benchmarkType).toBe('single-shot');
    expect(results[0].success).toBeDefined();
  });

  it('should handle timeout gracefully', async () => {
    const collector = new BaselineCollector();
    const config = { type: 'single-shot', puzzleSet: ['hard-001'], timeout: 100 };
    const results = await collector.runBaseline(config);

    expect(results[0].errorType).toBe('timeout');
  });
});
```

**Statistical Analyzer:**
```typescript
describe('StatisticalAnalyzer', () => {
  it('should calculate correct Cohen\'s d', () => {
    const analyzer = new StatisticalAnalyzer();
    const group1 = [1, 2, 3, 4, 5];
    const group2 = [3, 4, 5, 6, 7];

    const result = analyzer.calculateCohenD(group1, group2);
    expect(result).toBeCloseTo(-1.414, 2);
  });

  it('should detect significant t-test result', async () => {
    const analyzer = new StatisticalAnalyzer();
    const config = {
      hypothesis: 'test',
      comparisonGroups: ['group1', 'group2'],
      metric: 'solve-rate',
      test: 'two-sample-t-test',
      alpha: 0.05
    };

    const result = await analyzer.runHypothesisTest(config);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.significant).toBe(true);
  });
});
```

#### 5.3.2 Integration Tests

**End-to-End Benchmark:**
```typescript
describe('Benchmarking Framework Integration', () => {
  it('should run complete baseline collection', async () => {
    const framework = new BenchmarkingFramework();

    // Run all baselines
    await framework.collectBaselines({
      types: ['single-shot', 'naive-continuous', 'grasp-baseline'],
      puzzleCount: 10
    });

    // Verify storage
    const baselines = await framework.getBaselines('single-shot');
    expect(baselines).toHaveLength(10);
  });

  it('should generate complete statistical report', async () => {
    const framework = new BenchmarkingFramework();
    await framework.collectBaselines({ types: ['all'], puzzleCount: 50 });

    const report = await framework.generateReport({
      template: 'technical-detail',
      includeStatistics: true,
      includeHypothesisTests: true
    });

    expect(report).toContain('## Executive Summary');
    expect(report).toContain('## Baseline Performance');
    expect(report).toContain('## Statistical Analysis');
  });
});
```

---

## 6. Success Criteria

### 6.1 Implementation Verification

**✅ Baseline Collection:**
- [ ] Single-shot baseline completes for 250 puzzles
- [ ] Naive continuous baseline completes for 250 puzzles
- [ ] GRASP baseline completes for 100 puzzles
- [ ] All baselines stored in database correctly
- [ ] Statistical summaries generated for each baseline

**✅ Learning Curve Tracking:**
- [ ] Learning curve data collected for 100+ puzzles
- [ ] Insight moments detected automatically
- [ ] Strategy emergence timeline generated
- [ ] Changepoint detection identifies plateaus
- [ ] Trend analysis produces slope and R²

**✅ Transfer Learning Tests:**
- [ ] Same-domain transfer test completes (easy → hard)
- [ ] Cross-variant transfer test completes (9×9 → 16×16)
- [ ] Cross-domain transfer test completes (Sudoku → Hanoi)
- [ ] Knowledge reuse analysis generated for each test
- [ ] Transfer metrics stored and exportable

**✅ Statistical Analysis:**
- [ ] Hypothesis tests run for all 3 core hypotheses
- [ ] Effect sizes calculated (Cohen's d)
- [ ] Confidence intervals computed (95% CI)
- [ ] Power analysis performed (80% power)
- [ ] Multiple comparison corrections applied

**✅ Visualizations:**
- [ ] Learning curve charts generated (SVG + PNG)
- [ ] Transfer comparison charts generated
- [ ] Abstraction ladder diagrams generated
- [ ] Strategy timeline visualizations created
- [ ] All visualizations meet stakeholder requirements

**✅ Data Export:**
- [ ] JSON export contains all metrics
- [ ] CSV exports generated for all tables
- [ ] Markdown report generated
- [ ] Comparison report generated (if Phase 2 succeeds)
- [ ] All exports stored in correct directories

### 6.2 Acceptance Tests

**Test 1: Baseline Performance Validation**
```typescript
test('Baselines demonstrate expected performance hierarchy', async () => {
  const baselines = await benchmarkingFramework.getStatistics();

  // Expected hierarchy: GRASP+Dream > GRASP > Naive > Single-shot
  expect(baselines['grasp-with-dreaming'].solveRate)
    .toBeGreaterThan(baselines['grasp-baseline'].solveRate);
  expect(baselines['grasp-baseline'].solveRate)
    .toBeGreaterThan(baselines['naive-continuous'].solveRate);
  expect(baselines['naive-continuous'].solveRate)
    .toBeGreaterThan(baselines['single-shot'].solveRate);
});
```

**Test 2: Transfer Learning Validation**
```typescript
test('Transfer learning shows positive improvement', async () => {
  const transferResults = await benchmarkingFramework.getTransferMetrics();

  for (const result of transferResults) {
    expect(result.improvement).toBeGreaterThan(0);
    expect(result.transferPerformance)
      .toBeGreaterThan(result.baselinePerformance);
  }
});
```

**Test 3: Statistical Significance**
```typescript
test('Core hypotheses validated with statistical significance', async () => {
  const hypothesisTests = await benchmarkingFramework.runAllTests();

  // H1: Continuous thinking improves solve rates
  expect(hypothesisTests['continuous-thinking'].pValue).toBeLessThan(0.05);
  expect(hypothesisTests['continuous-thinking'].significant).toBe(true);

  // H2: Dreaming enables transfer
  expect(hypothesisTests['dreaming-transfer'].pValue).toBeLessThan(0.05);
  expect(hypothesisTests['dreaming-transfer'].significant).toBe(true);

  // H3: Strategy emergence correlates with performance
  expect(hypothesisTests['strategy-correlation'].pValue).toBeLessThan(0.05);
  expect(hypothesisTests['strategy-correlation'].correlation).toBeGreaterThan(0.5);
});
```

**Test 4: Visualization Quality**
```typescript
test('Visualizations meet stakeholder requirements', async () => {
  const visualizations = await benchmarkingFramework.generateAllVisualizations();

  // Learning curve
  expect(visualizations.learningCurve.svg).toContain('<svg');
  expect(visualizations.learningCurve.png).toBeInstanceOf(Buffer);

  // Transfer comparison
  expect(visualizations.transferComparison.svg).toContain('Same Domain');
  expect(visualizations.transferComparison.svg).toContain('Cross-Variant');

  // Abstraction ladder
  expect(visualizations.abstractionLadder.svg).toContain('Level 4');
});
```

### 6.3 POC Validation Criteria

**Minimum Success Criteria:**
- ✅ Continuous thinking shows 25%+ solve rate improvement (Target: 40%)
- ✅ Same-domain transfer shows 15%+ improvement (Target: 30%)
- ✅ Cross-variant transfer shows 10%+ improvement (Target: 25%)
- ✅ At least 3 distinct strategies discovered (Target: 8)
- ✅ Abstraction ladder reaches 2+ levels (Target: 4)
- ✅ All statistical tests have p < 0.05

**Target Success Criteria:**
- ✅ Continuous thinking: 40%+ improvement
- ✅ Same-domain transfer: 30%+ improvement
- ✅ Cross-variant transfer: 25%+ improvement
- ✅ 8+ strategies discovered
- ✅ 4-level abstraction ladder
- ✅ Cohen's d > 0.5 (large effect) for core comparisons

**Stretch Success Criteria:**
- ✅ Continuous thinking: 60%+ improvement
- ✅ Same-domain transfer: 50%+ improvement
- ✅ Cross-variant transfer: 40%+ improvement
- ✅ Cross-domain transfer: 18%+ improvement
- ✅ 15+ strategies discovered
- ✅ 5-level abstraction ladder

---

## 7. Integration Points

### 7.1 Puzzle Engine Integration

**Data Flow:**
```
Puzzle Engine → Benchmarking Framework
├── Puzzle generation (difficulty-stratified sets)
├── Solution validation (correctness checking)
├── Difficulty assessment (puzzle complexity metrics)
└── Grid state snapshots (for visualization)
```

**Interface:**
```typescript
interface PuzzleEngineIntegration {
  generatePuzzleSet(difficulty: string, count: number): Promise<Puzzle[]>;
  validateSolution(puzzleId: string, grid: Grid): Promise<boolean>;
  assessDifficulty(puzzle: Puzzle): Promise<string>;
  exportGridState(puzzleId: string): Promise<GridSnapshot>;
}
```

### 7.2 GRASP Loop Integration

**Data Flow:**
```
GRASP Loop → Benchmarking Framework
├── Iteration metrics (per-iteration performance)
├── Strategy application events (which strategies used)
├── Insight detection events (breakthrough moments)
├── Move sequences (complete trajectory)
└── Timing data (per-phase durations)
```

**Interface:**
```typescript
interface GRASPLoopIntegration {
  onIterationComplete(iteration: GRASPIteration, metrics: IterationMetrics): void;
  onStrategyApplied(strategy: string, outcome: ValidationResult): void;
  onInsightDetected(insight: Insight): void;
  onSolveComplete(metrics: SolveMetrics): void;
}
```

### 7.3 Memory System Integration

**Data Flow:**
```
Memory System → Benchmarking Framework
├── Experience retrieval counts (memory query frequency)
├── Pattern application events (dreamed knowledge use)
├── Consolidation metrics (dreaming pipeline output)
└── Knowledge quality scores (pattern utility)
```

**Interface:**
```typescript
interface MemorySystemIntegration {
  getMemoryStats(sessionId: string): Promise<MemoryStats>;
  getConsolidationMetrics(dreamCycleId: string): Promise<DreamingMetrics>;
  getPatternApplicationHistory(sessionId: string): Promise<PatternApplication[]>;
}

interface MemoryStats {
  experiencesStored: number;
  queriesExecuted: number;
  patternsAvailable: number;
  avgQueryTime: number; // milliseconds
}
```

### 7.4 Demo System Integration

**Data Flow:**
```
Benchmarking Framework → Demo System
├── Real-time metrics (current performance)
├── Key visualizations (charts for presentation)
├── Comparison summaries (ReasoningBank vs AgentDB)
└── Statistical highlights (p-values, effect sizes)
```

**Interface:**
```typescript
interface DemoSystemIntegration {
  getKeyMetrics(): Promise<DemoMetrics>;
  getVisualization(type: string): Promise<ChartOutput>;
  getComparisonSummary(): Promise<ComparisonSummary>;
}

interface DemoMetrics {
  currentSolveRate: number;
  improvementVsBaseline: number;
  strategiesDiscovered: number;
  transferEffectiveness: number;
  statisticalSignificance: boolean;
}
```

---

## 8. Configuration

### 8.1 Benchmark Configuration File

**Location:** `/workspaces/machine-dream/config/benchmark.config.json`

```json
{
  "baselines": {
    "singleShot": {
      "enabled": true,
      "trials": 50,
      "timeout": 120000,
      "model": "claude-sonnet-4-20250514"
    },
    "naiveContinuous": {
      "enabled": true,
      "trials": 50,
      "maxIterations": 20,
      "timeout": 300000
    },
    "graspBaseline": {
      "enabled": true,
      "trials": 100,
      "maxIterations": 30,
      "enableDreaming": false
    },
    "graspWithDreaming": {
      "enabled": true,
      "trials": 50,
      "maxIterations": 30,
      "enableDreaming": true
    }
  },

  "learningCurve": {
    "enabled": true,
    "puzzleCount": 100,
    "difficultiesProgression": ["easy", "easy", "medium", "medium", "hard"],
    "insightDetectionThreshold": 0.20,
    "windowSize": 5
  },

  "transferTests": {
    "sameDomain": {
      "enabled": true,
      "sourceTrainingCount": 100,
      "targetTestCount": 50,
      "dreamCycles": 1
    },
    "crossVariant": {
      "enabled": true,
      "sourceTrainingCount": 100,
      "targetTestCount": 30
    },
    "crossDomain": {
      "enabled": true,
      "sourceTrainingCount": 100,
      "targetTestCount": 20
    }
  },

  "statistics": {
    "alpha": 0.05,
    "power": 0.80,
    "confidenceLevel": 0.95,
    "multipleComparisonCorrection": "bonferroni"
  },

  "visualizations": {
    "format": ["svg", "png"],
    "theme": "light",
    "width": 1200,
    "height": 600
  },

  "export": {
    "formats": ["json", "csv", "markdown"],
    "outputDirectory": "/workspaces/machine-dream/data/exports"
  }
}
```

---

## 9. Appendix

### 9.1 Benchmark Type Reference

| Type | Purpose | Sample Size | Duration |
|------|---------|-------------|----------|
| `single-shot` | Baseline (no iteration) | 250 | Day 11 AM |
| `naive-continuous` | Baseline (simple loop) | 250 | Day 11 PM |
| `grasp-baseline` | Without dreaming | 100 | Day 12 |
| `grasp-with-dreaming` | Full system | 50 | Day 13-14 |

### 9.2 Statistical Test Reference

| Hypothesis | Test | Metric | Groups |
|------------|------|--------|--------|
| H1: CT improves solve rate | Two-sample t-test | solve-rate | single-shot vs grasp |
| H2: Dreaming enables transfer | Paired t-test | transfer-improvement | before vs after dream |
| H3: Strategies correlate | Pearson correlation | strategies vs solve-rate | learning curve |

### 9.3 Metric Units Reference

| Metric | Unit | Range | Precision |
|--------|------|-------|-----------|
| `solveTime` | milliseconds | 0 - 600,000 | 1 ms |
| `tokensUsed` | tokens | 0 - 100,000 | 1 token |
| `cost` | USD | 0 - 1.00 | $0.001 |
| `solveRate` | percentage | 0 - 100 | 0.1% |
| `improvement` | percentage | -100 - +200 | 0.1% |
| `correlation` | coefficient | -1 to +1 | 0.01 |
| `pValue` | probability | 0 - 1 | 0.001 |

---

**Document Status:** ✅ Complete
**Ready for Implementation:** Yes
**Estimated Implementation Time:** Days 11-14 (4 days)
**Dependencies:** All other POC components
**Critical Path:** Yes (final validation)
