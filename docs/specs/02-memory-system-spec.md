# Memory System Specification

**Date:** January 4, 2026
**Component:** AgentDB (Primary Memory System)
**Version:** 2.0 (AgentDB Migration)
**Status:** Specification

---

## 1. Component Overview

### 1.1 Purpose and Responsibilities

The Memory System is the foundational persistent storage and retrieval layer for the Cognitive Puzzle Solver POC. It bridges the gap between ephemeral working memory (active puzzle state) and long-term knowledge consolidation (dreaming pipeline).

**Core Responsibilities:**
- **Experience Logging**: Capture all solve attempts, moves, strategies, and outcomes during GRASP iterations
- **Pattern Storage**: Persist extracted patterns and consolidated knowledge from dreaming cycles
- **Similarity Retrieval**: Query similar past experiences to inform current solving decisions
- **Knowledge Consolidation**: Support the 5-phase dreaming pipeline with pattern distillation and abstraction
- **Transfer Learning**: Enable skill and strategy reuse across different puzzles and variants

### 1.2 Position in Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    COGNITIVE PUZZLE SOLVER                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SOLVING PHASE (DAY)                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  GRASP Loop → Working Memory (in-memory)            │   │
│  │       ↓                                              │   │
│  │  Memory System: Experience logging & retrieval       │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  DREAMING PHASE (NIGHT)                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Memory System: Pattern distillation & consolidation │   │
│  │       ↓                                              │   │
│  │  Abstraction Ladder → Consolidated Knowledge         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Dependencies on Other Components

**Upstream Dependencies (Memory System depends on):**
- **Puzzle Engine**: Provides `PuzzleState`, `Grid`, `Move` structures
- **GRASP Loop**: Generates `Experience`, `ValidationResult` data
- **Attention Mechanism**: Supplies focus selection context

**Downstream Dependencies (Components that depend on Memory System):**
- **GRASP Synthesize Phase**: Queries similar experiences for insight generation
- **Dreaming Pipeline**: Reads all experiences for consolidation
- **Benchmarking Framework**: Analyzes stored metrics and learning curves

---

## 2. Functional Requirements

### 2.1 Memory Tier Architecture

The Memory System uses a two-tier architecture to balance performance and persistence:

#### Tier 1: Working Memory (In-Memory)

**Purpose:** Fast access to active solving state (sub-second read/write)

**Storage Duration:** Single puzzle solve session

**Data Structures:**
```typescript
interface WorkingMemory {
  // Current puzzle state
  grid: number[][];                         // 9x9 or 16x16 grid
  candidates: Map<string, Set<number>>;     // "row,col" → possible values

  // Attention context
  focus: Cell;                              // Current cell being examined
  recentMoves: Move[];                      // Last 5-10 moves (circular buffer)

  // Active solving context
  activeStrategy: string;                   // Current strategy being applied
  lastVisited: Map<string, number>;         // "row,col" → timestamp
}
```

**Operations:**
- `updateGrid(cell: Cell, value: number): void`
- `updateCandidates(cell: Cell, candidates: Set<number>): void`
- `setFocus(cell: Cell): void`
- `addMove(move: Move): void`
- `clear(): void` - Called after puzzle completion

**Performance Target:** <1ms for all operations

#### Tier 2: Persistent Memory (ReasoningBank/AgentDB)

**Purpose:** Long-term experience storage, pattern consolidation, cross-session learning

**Storage Duration:** Unlimited (until explicit cleanup)

**Data Categories:**
1. **Episodic Memory**: Individual solve attempts and trajectories
2. **Semantic Memory**: Extracted patterns and abstraction ladders
3. **Skill Library**: Reusable strategies and techniques (AgentDB only)
4. **Reflexion Memory**: Error-correction pairs (AgentDB only)

**Operations (detailed in Section 2.3)**

### 2.2 Memory System Architecture
**Primary System: AgentDB**
- Implementation: Advanced vector database with RL capabilities (v2.0.0+)
- Status: Primary Production System
- Core Features:
  - **ReasoningBank**: Semantic pattern matching
  - **ReflexionMemory**: Episodic replay with self-critique
  - **SkillLibrary**: Transformation of successful patterns into reusable, composable skills
  - **Causal Memory Graph**: Tracking interventions and outcomes

### 2.3 Core Operations

#### 2.3.1 Experience Logging (GRASP Absorb Phase)

**Requirement:** Capture all solving attempts with full context

```typescript
interface ExperienceLogOperation {
  // Basic logging (ReasoningBank)
  logMove(move: Move, outcome: ValidationResult): Promise<void>;
  logStrategy(strategy: string, result: ValidationResult): Promise<void>;
  logInsight(insight: Insight): Promise<void>;

  // Enhanced logging (AgentDB only)
  storeReflexion(experience: {
    trajectory: Move[];
    outcome: ValidationResult;
    error: Error | null;
    correction: Move | null;
  }): Promise<void>;
}
```

**Data to Capture:**
- Move sequence (trajectory)
- Strategy applied at each step
- Validation outcome (success/failure/progress)
- Insights generated during synthesis
- Errors and corrections (AgentDB only)
- Timing and performance metrics
- **Importance score** (0-1, calculated at creation per Spec 03 formula)
- **Grid context metrics** (empty cells, constraint density)
- **Reasoning depth proxy** (character count)

**Storage Format:**
```json
{
  "experienceId": "uuid",
  "sessionId": "session-uuid",
  "puzzleId": "puzzle-uuid",
  "timestamp": 1704384000000,
  "trajectory": [
    {
      "cell": { "row": 0, "col": 4 },
      "value": 7,
      "strategy": "naked_single",
      "timestamp": 1704384001000
    }
  ],
  "outcome": "solved",
  "duration": 45000,
  "importance": 0.9,
  "context": {
    "emptyCellsAtMove": 45,
    "reasoningLength": 312,
    "constraintDensity": 3.2
  },
  "insights": [
    {
      "type": "strategy",
      "content": "Naked singles effective in early solving",
      "confidence": 0.85
    }
  ]
}
```

**Performance Target:** <10ms per log operation

#### 2.3.2 Similarity Retrieval (GRASP Synthesize Phase)

**Requirement:** Find similar past experiences to inform current solving

```typescript
interface SimilarityRetrievalOperation {
  // AgentDB Native Retrieval
  retrieveWithReasoning(context: PuzzleState, options: {
    k: number;                    // Top-k results
    useMMR: boolean;              // Maximal Marginal Relevance
    synthesizeContext: boolean;   // Rich context generation
    domain: string;               // Filter by domain
  }): Promise<RichContext>;
}
```

**Similarity Criteria:**
1. **Grid State Similarity**: Percentage of cells filled, candidate set overlap
2. **Strategy Context**: Previously successful strategies in similar states
3. **Difficulty Level**: Prefer experiences from same difficulty tier
4. **Recency**: Weight recent experiences higher (temporal decay)

**Retrieval Algorithm (ReasoningBank):**
```
1. Convert PuzzleState to feature vector
   - Filled cells: 81 dimensions (binary)
   - Candidate counts: 81 dimensions (integer)
   - Strategy sequence: embedding vector

2. Query ReasoningBank pattern matching
   - Find experiences with similar feature patterns
   - Apply recency weighting

3. Return top-k (default k=10) experiences
```

**Retrieval Algorithm (AgentDB - Enhanced):**
```
1. Convert PuzzleState to embedding vector (384-dim)
   - Use PatternMatcher agent for HNSW search

2. Apply Maximal Marginal Relevance (MMR) if enabled
   - Balance relevance vs diversity
   - Avoid redundant similar experiences

3. Use ContextSynthesizer agent to generate rich context
   - Synthesize insights from multiple experiences
   - Identify common success patterns

4. Filter by domain and apply skill library
   - Match applicable skills from auto-consolidation
```

**Performance Targets:**
- ReasoningBank: <50ms for top-10 query
- AgentDB: <1ms for top-10 query (HNSW indexing)

#### 2.3.3 Pattern Distillation (Dreaming Pipeline)

**Requirement:** Extract reusable patterns from raw experiences

```typescript
interface PatternDistillationOperation {
  // Basic distillation (ReasoningBank)
  distillPatterns(sessionId: string, options?: {
    minImportance?: number;
    compressionRatio?: number;
  }): Promise<Pattern[]>;

  // Enhanced distillation (AgentDB only)
  consolidateSkills(filter: {
    minSuccessRate: number;
    domain: string;
    minUsageCount?: number;
  }): Promise<Skill[]>;
}
```

**Distillation Process (ReasoningBank):**
```
1. TRIAGE: Filter experiences by importance
   - Successful solves weighted higher
   - Novel strategies prioritized
   - Error patterns included for learning

2. CLUSTER: Group similar experiences
   - K-means clustering on feature vectors
   - Target: 10:1 compression ratio

3. EXTRACT: Generate pattern from each cluster
   - Identify common strategy sequence
   - Extract conditions and actions
   - Calculate success rate
```

**Distillation Process (AgentDB - Enhanced):**
```
1. CURATE: ExperienceCurator agent filters by quality
   - Automatic quality scoring
   - Remove noise and outliers

2. OPTIMIZE: MemoryOptimizer consolidates patterns
   - Graph-based pattern merging
   - Quantization for 4-32x compression

3. AUTO-SKILL: Skill library auto-extraction
   - Identify reusable techniques
   - Track transferability scores
   - Build skill dependency graph
```

**Pattern Schema:**
```json
{
  "patternId": "uuid",
  "type": "strategy",
  "name": "naked_single_detection",
  "description": "When cell has only one candidate, place that digit",
  "conditions": [
    "cell.candidates.size === 1",
    "grid[cell.row][cell.col] === 0"
  ],
  "actions": [
    "place digit in cell",
    "update candidates in row/col/box"
  ],
  "successRate": 0.95,
  "usageCount": 47,
  "examples": ["exp-uuid-1", "exp-uuid-2"]
}
```

**Performance Target:** <5 seconds for session distillation (50-100 experiences)

#### 2.3.4 Abstraction Ladder Building

**Requirement:** Generate multi-level abstraction hierarchy from patterns

```typescript
interface AbstractionLadderOperation {
  buildAbstractionLadder(patterns: Pattern[], options?: {
    maxLevels?: number;
    minPatternsPerLevel?: number;
  }): Promise<AbstractionLadder>;
}
```

**Ladder Construction Algorithm:**
```
INPUT: 47 patterns from distillation
TARGET: 4-level abstraction ladder

LEVEL 0 (Specific): Individual patterns
├── Pattern 1: "Naked single in R3C5"
├── Pattern 2: "Hidden single in box 7"
└── Pattern 3: "Pointing pair eliminates candidates"
(47 total)

LEVEL 1 (Techniques): Group by technique category
├── Technique 1: "Naked singles"
│   └── Subsumes: Pattern 1, Pattern 4, Pattern 9...
├── Technique 2: "Hidden singles"
│   └── Subsumes: Pattern 2, Pattern 7...
└── Technique 3: "Pointing pairs"
    └── Subsumes: Pattern 3, Pattern 12...
(~12 techniques)

LEVEL 2 (Categories): Group techniques by approach
├── Category 1: "Elimination strategies"
│   └── Subsumes: Naked singles, Hidden singles, Pointing pairs...
├── Category 2: "Placement strategies"
│   └── Subsumes: Box/line reduction, Naked pairs...
└── Category 3: "Pattern recognition"
    └── Subsumes: X-Wing, Swordfish...
(~5 categories)

LEVEL 3 (Principles): Abstract meta-strategies
├── Principle 1: "Constraint propagation"
│   └── Subsumes: All elimination and placement strategies
├── Principle 2: "Most constrained first"
│   └── Subsumes: Attention mechanisms, focus selection
└── Principle 3: "Consistency maintenance"
    └── Subsumes: Validation, backtracking prevention
(~3 principles)

LEVEL 4 (Meta): Top-level generalization
└── Meta: "Iterative constraint satisfaction + informed search"
    └── Subsumes: All principles
(1 meta-concept)
```

**Abstraction Criteria:**
- **Vertical Consistency**: Higher levels must subsume lower levels
- **Horizontal Coherence**: Items at same level have similar abstraction degree
- **Groundedness**: All abstractions traceable to specific experiences

**Output Format:**
```json
{
  "domain": "sudoku-solving",
  "levels": [
    {
      "level": 0,
      "name": "Specific Patterns",
      "patterns": [ /* 47 patterns */ ],
      "generalizations": []
    },
    {
      "level": 1,
      "name": "Techniques",
      "patterns": [ /* 12 technique patterns */ ],
      "generalizations": [
        "Naked singles: when cell has one candidate",
        "Hidden singles: when digit has one location in unit"
      ]
    }
    // ... levels 2-4
  ],
  "createdAt": 1704384000000
}
```

**Performance Target:** <30 seconds for 4-level ladder construction

#### 2.3.5 Knowledge Consolidation (Final Dream Phase)

**Requirement:** Integrate and verify consolidated knowledge

```typescript
interface KnowledgeConsolidationOperation {
  consolidate(experiences: Experience[]): Promise<ConsolidatedKnowledge>;
  verify(knowledge: ConsolidatedKnowledge): Promise<boolean>;
}
```

**Consolidation Process:**
```
1. INTEGRATE: Cross-connect patterns across abstraction levels
   - Build pattern dependency graph
   - Identify prerequisite relationships
   - Mark mutually exclusive strategies

2. PRUNE: Remove redundant/contradictory patterns
   - Similarity threshold: 0.95
   - Keep higher success rate if duplicate
   - Log conflicts for manual review

3. VERIFY: Consistency checking
   - All patterns have grounded examples
   - Abstraction ladder maintains vertical consistency
   - No logical contradictions in strategy sequences
   - Success rates consistent with examples
```

**Verification Checks:**
```typescript
interface VerificationResult {
  groundednessCheck: boolean;      // All abstractions trace to experiences
  consistencyCheck: boolean;       // No logical contradictions
  completenessCheck: boolean;      // All experiences represented
  qualityScore: number;            // Overall consolidation quality (0-1)
  issues: string[];                // List of detected problems
}
```

**Storage:**
```json
{
  "consolidatedKnowledgeId": "uuid",
  "sessionIds": ["session-1", "session-2"],
  "patterns": [ /* 5 consolidated patterns */ ],
  "abstractionLadder": { /* 4-level ladder */ },
  "compressionRatio": 9.4,
  "verificationStatus": "verified",
  "timestamp": 1704384000000,
  "metadata": {
    "experienceCount": 47,
    "patternCount": 5,
    "verificationScore": 0.92
  }
}
```

---

## 3. Non-Functional Requirements

### 3.1 Performance Targets

| Operation | ReasoningBank | AgentDB | Requirement |
|-----------|---------------|---------|-------------|
| **Experience Logging** | <10ms | <5ms | Real-time during GRASP |
| **Similarity Query (k=10)** | <50ms | <1ms | GRASP synthesis phase |
| **Batch Insert (100)** | ~1s | <10ms | Dreaming capture phase |
| **Pattern Distillation** | <5s | <2s | Dreaming compress phase |
| **Abstraction Ladder** | <30s | <10s | Dreaming abstract phase |
| **Large Query (1M vectors)** | ~100s | <10ms | Transfer learning tests |
| **Memory Footprint** | Baseline | 4-32x smaller | Large dataset handling |

### 3.2 Scalability Requirements

**POC Scale:**
- 100 puzzle solves
- ~50 experiences per solve
- Total: 5,000 experiences
- Expected storage: 50-100MB (ReasoningBank), 10-25MB (AgentDB with quantization)

**Future Scale (Beyond POC):**
- 10,000+ puzzle solves
- 500,000+ experiences
- AgentDB required for performance at this scale

### 3.3 Reliability Requirements

**Data Integrity:**
- ACID compliance for all writes
- No data loss on crashes (use transactions)
- Corruption detection and repair

**Consistency:**
- Pattern success rates match underlying experiences
- Abstraction ladders maintain vertical consistency
- No dangling references between patterns and experiences

**Availability:**
- 99.9% uptime during POC (3 weeks)
- Graceful degradation if memory system unavailable (fallback to working memory only)
- Backup strategy: Daily exports to JSON

### 3.4 Maintainability Requirements

**API Stability:**
- ReasoningBank: Stable, production-tested
- AgentDB: Alpha version - pin to v2.0.0-alpha.3.3

**Backward Compatibility:**
- AgentDB maintains 100% API compatibility with ReasoningBank
- Migration path from ReasoningBank to AgentDB must preserve all data

**Monitoring:**
- Log all memory operations
- Track performance metrics (latency, throughput)
- Alert on anomalies (high latency, errors)

---

## 4. API/Interface Design

### 4.1 ReasoningBank Adapter (Primary - Phase 1)

```typescript
export interface ReasoningBankAdapter {
  // =========================================================================
  // Initialization & Setup
  // =========================================================================

  /**
   * Initialize ReasoningBank database
   * @returns void
   * CLI: npx claude-flow@alpha agent memory init
   */
  initialize(): Promise<void>;

  /**
   * Get memory system status and statistics
   * @returns Statistics including experience count, pattern count, storage size
   * CLI: npx claude-flow@alpha agent memory status
   */
  getStatus(): Promise<MemoryStatus>;

  // =========================================================================
  // Experience Logging (GRASP Absorb Phase)
  // =========================================================================

  /**
   * Log a single move with its outcome
   * @param move - Move made during solving
   * @param outcome - Validation result (success/failure/progress)
   * Called during: GRASP Absorb phase, every iteration
   */
  logMove(move: Move, outcome: ValidationResult): Promise<void>;

  /**
   * Log strategy application with result
   * @param strategy - Strategy name (e.g., "naked_single")
   * @param result - Validation result
   * Called during: GRASP Absorb phase, when strategy changes
   */
  logStrategy(strategy: string, result: ValidationResult): Promise<void>;

  /**
   * Log insight generation event
   * @param insight - Insight discovered during synthesis
   * Called during: GRASP Synthesize phase, when insight occurs
   */
  logInsight(insight: Insight): Promise<void>;

  /**
   * Log complete solve session
   * @param experience - Full experience including trajectory, outcome, timing
   * Called during: End of puzzle solve session
   */
  logExperience(experience: Experience): Promise<void>;

  // =========================================================================
  // Similarity Retrieval (GRASP Synthesize Phase)
  // =========================================================================

  /**
   * Query similar past experiences based on current puzzle state
   * @param context - Current puzzle state
   * @param options - Query options (limit, filters)
   * @returns Top-k similar experiences
   * Called during: GRASP Synthesize phase
   * Performance: <50ms for k=10
   */
  querySimilar(
    context: PuzzleState,
    options?: {
      limit?: number;        // Default: 10
      minSimilarity?: number; // Default: 0.5
      domain?: string;       // Default: 'sudoku-solving'
    }
  ): Promise<Experience[]>;

  /**
   * Query patterns by strategy name
   * @param strategyName - Strategy identifier
   * @returns Patterns matching strategy
   */
  getPatternsByStrategy(strategyName: string): Promise<Pattern[]>;

  /**
   * Query experiences by outcome
   * @param outcome - Outcome filter ('success' | 'failure' | 'timeout')
   * @returns Filtered experiences
   */
  getExperiencesByOutcome(
    outcome: 'solved' | 'failed' | 'timeout'
  ): Promise<Experience[]>;

  // =========================================================================
  // Pattern Distillation (Dreaming Pipeline)
  // =========================================================================

  /**
   * Extract patterns from session experiences
   * @param sessionId - Session identifier
   * @param options - Distillation configuration
   * @returns Extracted patterns
   * Called during: Dreaming Compress phase
   * Performance: <5s for 50-100 experiences
   */
  distillPatterns(
    sessionId: string,
    options?: {
      minImportance?: number;    // Default: 0.3
      compressionRatio?: number; // Default: 10
      maxPatterns?: number;      // Default: unlimited
    }
  ): Promise<Pattern[]>;

  /**
   * Build abstraction ladder from patterns
   * @param patterns - Patterns to abstract
   * @param options - Ladder configuration
   * @returns Multi-level abstraction hierarchy
   * Called during: Dreaming Abstract phase
   * Performance: <30s for 4-level ladder
   */
  buildAbstractionLadder(
    patterns: Pattern[],
    options?: {
      maxLevels?: number;        // Default: 4
      minPatternsPerLevel?: number; // Default: 1
    }
  ): Promise<AbstractionLadder>;

  // =========================================================================
  // Knowledge Consolidation (Dreaming Final Phase)
  // =========================================================================

  /**
   * Consolidate experiences into verified knowledge
   * @param experiences - Experiences to consolidate
   * @returns Consolidated knowledge with verification status
   * Called during: Dreaming Integrate/Verify phase
   */
  consolidate(experiences: Experience[]): Promise<ConsolidatedKnowledge>;

  /**
   * Verify consolidated knowledge consistency
   * @param knowledge - Knowledge to verify
   * @returns Verification result (true if verified)
   * Called during: Dreaming Verify phase
   */
  verify(knowledge: ConsolidatedKnowledge): Promise<boolean>;

  // =========================================================================
  // Cleanup & Maintenance
  // =========================================================================

  /**
   * Export memory database to JSON
   * @param filepath - Export destination
   */
  export(filepath: string): Promise<void>;

  /**
   * Import memory database from JSON
   * @param filepath - Import source
   */
  import(filepath: string): Promise<void>;

  /**
   * Clear all data (use with caution)
   */
  clear(): Promise<void>;
}

// Supporting Types
interface MemoryStatus {
  experienceCount: number;
  patternCount: number;
  storageSize: number;      // bytes
  lastUpdated: number;      // timestamp
  performanceMetrics: {
    avgQueryTime: number;   // ms
    avgLogTime: number;     // ms
  };
}
```

### 4.2 AgentDB Adapter (Optional - Phase 2 Evaluation)

```typescript
export interface AgentDBAdapter extends ReasoningBankAdapter {
  // AgentDB includes ALL ReasoningBank operations (100% compatible)
  // PLUS the following advanced capabilities:

  // =========================================================================
  // Reinforcement Learning (Decision Transformer)
  // =========================================================================

  /**
   * Train RL model on collected experiences
   * @param config - Training configuration
   * @returns Training results
   * Called during: Days 6-10 evaluation phase
   */
  trainRL(config: {
    algorithm: 'decision-transformer' | 'q-learning' | 'sarsa' |
               'actor-critic' | 'active-learning' | 'adversarial-training' |
               'curriculum-learning' | 'federated-learning' | 'multi-task';
    epochs: number;           // Default: 50
    batchSize: number;        // Default: 32
    learningRate?: number;    // Default: 0.001
  }): Promise<{
    convergenceEpochs: number;
    finalSuccessRate: number;
    averageReward: number;
  }>;

  /**
   * Use trained RL model to select next action
   * @param state - Current puzzle state
   * @param availableActions - Legal moves
   * @returns Recommended action with confidence
   * Called during: GRASP Generate phase (if RL enabled)
   */
  selectActionRL(
    state: PuzzleState,
    availableActions: Move[]
  ): Promise<RLAction>;

  // =========================================================================
  // Reflexion Memory (Error Learning)
  // =========================================================================

  /**
   * Store error trajectory with correction
   * @param reflexion - Error and correction pair
   * Called during: GRASP Absorb phase, when error detected
   */
  storeReflexion(reflexion: {
    trajectory: Move[];
    outcome: ValidationResult;
    error: Error;
    correction: Move;
  }): Promise<void>;

  /**
   * Retrieve corrections for similar errors
   * @param error - Error to match
   * @returns Past corrections for similar errors
   * Called during: GRASP Synthesize phase, after error
   */
  getCorrections(error: Error): Promise<Move[]>;

  /**
   * Measure reflexion learning effectiveness
   * @returns Metrics on error reduction
   */
  getReflexionMetrics(): Promise<{
    errorsDetected: number;
    correctionsApplied: number;
    repeatErrorRate: number;
    improvementCurve: number[];
  }>;

  // =========================================================================
  // Skill Library (Auto-Consolidation)
  // =========================================================================

  /**
   * Auto-consolidate successful patterns into skills
   * @param filter - Skill extraction criteria
   * @returns Extracted skills
   * Called during: Dreaming Compress phase
   */
  consolidateSkills(filter: {
    minSuccessRate: number;   // Default: 0.7
    domain: string;           // e.g., 'sudoku-solving'
    minUsageCount?: number;   // Default: 3
  }): Promise<Skill[]>;

  /**
   * Apply skill library to current state
   * @param state - Current puzzle state
   * @returns Applicable skill or null
   * Called during: GRASP Generate phase
   */
  applySkill(state: PuzzleState): Promise<Move | null>;

  /**
   * Get skill library statistics
   */
  getSkillLibraryStats(): Promise<{
    skillsExtracted: number;
    avgSuccessRate: number;
    reuseRate: number;
    transferability: number;
  }>;

  // =========================================================================
  // Advanced Reasoning (4 Agent Modules)
  // =========================================================================

  /**
   * Retrieve with rich context synthesis
   * Uses PatternMatcher + ContextSynthesizer agents
   * @param state - Current puzzle state
   * @param options - Retrieval configuration
   * @returns Rich context with synthesized insights
   * Called during: GRASP Synthesize phase (enhanced)
   */
  retrieveWithReasoning(
    state: PuzzleState,
    options: {
      k: number;                    // Top-k results (default: 10)
      useMMR?: boolean;             // Maximal Marginal Relevance (default: true)
      synthesizeContext?: boolean;  // Rich context generation (default: true)
      domain: string;               // Domain filter
    }
  ): Promise<RichContext>;

  /**
   * Optimize memory (MemoryOptimizer agent)
   * Auto-consolidates patterns, removes redundancies
   * Called during: Dreaming Prune phase
   */
  optimizeMemory(): Promise<{
    patternsConsolidated: number;
    redundanciesRemoved: number;
    compressionRatio: number;
  }>;

  // =========================================================================
  // Graph Database Queries
  // =========================================================================

  /**
   * Execute Cypher query on knowledge graph
   * @param query - Cypher query string
   * @returns Query results
   * Use case: Complex pattern relationship queries
   */
  queryCypher(query: string): Promise<GraphResult[]>;

  /**
   * Build strategy dependency graph
   * @returns Graph of prerequisite relationships
   */
  buildStrategyGraph(): Promise<StrategyGraph>;

  // =========================================================================
  // Performance Features
  // =========================================================================

  /**
   * Enable quantization for memory efficiency
   * @param mode - Quantization mode
   * Reduces memory usage by 4-32x
   */
  enableQuantization(
    mode: 'binary' | 'scalar' | 'product'
  ): Promise<void>;

  /**
   * Get performance statistics
   */
  getPerformanceStats(): Promise<{
    avgQueryTime: number;        // μs (microseconds)
    hnswIndexSize: number;       // bytes
    vectorCount: number;
    quantizationRatio: number;
  }>;
}

// Supporting Types
interface RLAction {
  cell: Cell;
  value: number;
  confidence: number;
  expectedReward: number;
}

interface Skill {
  id: string;
  name: string;
  pattern: Pattern;
  successRate: number;
  applicationCount: number;
  transferability: number;
  prerequisites: string[];     // Skill IDs
}

interface RichContext {
  similarExperiences: Experience[];
  applicableSkills: Skill[];
  synthesizedInsights: Insight[];
  recommendedStrategies: string[];
  confidenceScore: number;
}

interface GraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface StrategyGraph {
  strategies: Map<string, StrategyNode>;
  dependencies: Map<string, string[]>; // strategy → prerequisites
}
```

---

## 5. Implementation Notes

### 5.1 ReasoningBank Implementation (Phase 1)

**Setup (Day 2):**
```bash
# Initialize ReasoningBank (5 minutes)
npx claude-flow@alpha agent memory init

# Verify setup
npx claude-flow@alpha agent memory status

# Test basic operations
npx claude-flow@alpha memory store "test_key" '{"strategy": "naked_single"}'
npx claude-flow@alpha memory query "naked_single"
```

**Integration Points:**
```typescript
// src/memory/reasoningbank-adapter.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ReasoningBankAdapter implements ReasoningBankAdapter {
  private dbPath: string = '.swarm/memory.db';

  async logMove(move: Move, outcome: ValidationResult): Promise<void> {
    const data = JSON.stringify({
      type: 'move',
      move,
      outcome,
      timestamp: Date.now()
    });

    await execAsync(
      `npx claude-flow@alpha memory store "move_${move.timestamp}" '${data}'`
    );
  }

  async querySimilar(context: PuzzleState): Promise<Experience[]> {
    // Convert context to query string
    const query = this.buildQuery(context);

    const { stdout } = await execAsync(
      `npx claude-flow@alpha memory query "${query}"`
    );

    return JSON.parse(stdout);
  }

  // ... additional methods
}
```

**Performance Optimization:**
- Batch log operations during GRASP iterations
- Use in-memory buffer, flush every 5 iterations
- Cache frequent queries (similarity searches)

**Limitations:**
- No built-in RL learning
- Manual pattern distillation required
- Linear search for some queries

### 5.2 AgentDB Implementation (Phase 2 Evaluation)

**Setup (Day 6):**
```bash
# Initialize AgentDB (10 minutes)
npx agentdb@latest init ./.agentdb/memory.db --preset large

# Start MCP server
npx agentdb@latest mcp
claude mcp add agentdb npx agentdb@latest mcp

# Create Decision Transformer plugin (30 minutes)
npx agentdb@latest create-plugin \
  -t decision-transformer \
  -n sudoku-solver \
  --state-dim 81 \
  --action-dim 729

# Migrate ReasoningBank data (30 minutes)
npx agentdb@latest migrate --source .swarm/memory.db

# Verify migration
npx agentdb@latest stats ./.agentdb/memory.db
```

**Integration Points:**
```typescript
// src/memory/agentdb-adapter.ts
import { AgentDB } from 'agentdb';

export class AgentDBAdapter implements AgentDBAdapter {
  private db: AgentDB;
  private rlPlugin: DecisionTransformerPlugin;

  async initialize(): Promise<void> {
    this.db = await AgentDB.init('./.agentdb/memory.db', {
      preset: 'large',
      quantization: 'scalar'  // 4x memory reduction
    });

    this.rlPlugin = await this.db.loadPlugin('sudoku-solver');
  }

  async selectActionRL(
    state: PuzzleState,
    availableActions: Move[]
  ): Promise<RLAction> {
    const stateVector = this.stateToVector(state);

    const result = await this.rlPlugin.selectAction({
      state: stateVector,
      availableActions: availableActions.map(m => this.moveToAction(m)),
      returnTokens: 128
    });

    return {
      cell: result.action.cell,
      value: result.action.value,
      confidence: result.confidence,
      expectedReward: result.reward
    };
  }

  async consolidateSkills(filter: {
    minSuccessRate: number;
    domain: string;
  }): Promise<Skill[]> {
    // Use built-in skill library consolidation
    return await this.db.skills.consolidate({
      domain: filter.domain,
      minSuccessRate: filter.minSuccessRate,
      autoTransferability: true
    });
  }

  // ... additional methods leveraging AgentDB features
}
```

**Performance Optimization:**
- Enable HNSW indexing for <1ms queries
- Use scalar quantization for 4x memory reduction
- Batch RL training (daily, not per-puzzle)
- Cache skill library (reload only after consolidation)

**Alpha Version Stability Monitoring:**
```typescript
// src/memory/stability-monitor.ts
export class StabilityMonitor {
  private errorCount = 0;
  private corruptionCount = 0;
  private performanceSamples: number[] = [];

  async checkStability(): Promise<boolean> {
    // Check 1: No crashes during Days 6-10
    if (this.errorCount > 5) return false;

    // Check 2: No data corruption
    if (this.corruptionCount > 0) return false;

    // Check 3: Performance claims validated
    const avgQueryTime = this.average(this.performanceSamples);
    if (avgQueryTime > 10) return false; // Should be <1ms

    // Check 4: RL convergence
    const rlMetrics = await this.getRLMetrics();
    if (rlMetrics.epochs > 50) return false;

    return true; // All checks passed
  }
}
```

### 5.3 Key Algorithms

#### 5.3.1 State-to-Vector Conversion

**Purpose:** Convert PuzzleState to embedding for similarity search

```typescript
function stateToVector(state: PuzzleState): number[] {
  const vector: number[] = [];

  // Part 1: Grid state (81 dimensions for 9x9)
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      vector.push(state.grid[row][col] || 0);
    }
  }

  // Part 2: Candidate counts (81 dimensions)
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const key = `${row},${col}`;
      const candidates = state.candidates.get(key);
      vector.push(candidates ? candidates.size : 0);
    }
  }

  // Part 3: Strategy embedding (128 dimensions)
  const strategyEmbedding = embedStrategy(state.moveHistory.map(m => m.strategy));
  vector.push(...strategyEmbedding);

  // Total: 81 + 81 + 128 = 290 dimensions
  return vector;
}
```

#### 5.3.2 Experience Clustering (Pattern Distillation)

**Purpose:** Group similar experiences for compression

```typescript
async function clusterExperiences(
  experiences: Experience[],
  targetClusters: number
): Promise<Experience[][]> {
  // Convert to vectors
  const vectors = experiences.map(exp =>
    stateToVector(exp.trajectory[0].state) // Use initial state
  );

  // K-means clustering
  const kmeans = new KMeans(targetClusters);
  const clusters = await kmeans.fit(vectors);

  // Group experiences by cluster
  const grouped: Experience[][] = Array(targetClusters).fill([]).map(() => []);
  experiences.forEach((exp, i) => {
    const cluster = clusters.labels[i];
    grouped[cluster].push(exp);
  });

  return grouped;
}
```

#### 5.3.3 Pattern Extraction from Cluster

**Purpose:** Generate representative pattern from experience cluster

```typescript
function extractPattern(cluster: Experience[]): Pattern {
  // Find common strategy sequence
  const strategyFreq = new Map<string, number>();
  cluster.forEach(exp => {
    exp.strategySequence.forEach(strategy => {
      strategyFreq.set(strategy, (strategyFreq.get(strategy) || 0) + 1);
    });
  });

  const topStrategy = Array.from(strategyFreq.entries())
    .sort((a, b) => b[1] - a[1])[0][0];

  // Calculate success rate
  const successCount = cluster.filter(exp => exp.outcome === 'solved').length;
  const successRate = successCount / cluster.length;

  // Extract conditions (common puzzle state features)
  const conditions = extractCommonConditions(cluster);

  // Extract actions (common move patterns)
  const actions = extractCommonActions(cluster);

  return {
    id: generateUUID(),
    type: 'strategy',
    name: topStrategy,
    description: `Strategy: ${topStrategy}`,
    conditions,
    actions,
    successRate,
    usageCount: cluster.length,
    examples: cluster.slice(0, 3).map(exp => exp.id)
  };
}
```

### 5.4 Edge Cases to Handle

**Empty Results:**
```typescript
async querySimilar(context: PuzzleState): Promise<Experience[]> {
  const results = await this.performQuery(context);

  // Edge case: No similar experiences found
  if (results.length === 0) {
    // Return empty array, GRASP will use random exploration
    console.warn('No similar experiences found, using exploration mode');
    return [];
  }

  return results;
}
```

**Corrupted Data:**
```typescript
async logExperience(experience: Experience): Promise<void> {
  // Validate before storing
  if (!this.validateExperience(experience)) {
    throw new Error(`Invalid experience: ${JSON.stringify(experience)}`);
  }

  try {
    await this.performLog(experience);
  } catch (error) {
    // Rollback on failure
    await this.rollback();
    throw error;
  }
}
```

**Concurrent Access:**
```typescript
// Use transaction locking
async consolidate(experiences: Experience[]): Promise<ConsolidatedKnowledge> {
  await this.db.transaction(async (tx) => {
    // All consolidation operations within transaction
    const patterns = await tx.distillPatterns(experiences);
    const ladder = await tx.buildAbstractionLadder(patterns);
    const knowledge = await tx.store(patterns, ladder);

    // Atomic commit
    return knowledge;
  });
}
```

**Memory Overflow:**
```typescript
async distillPatterns(sessionId: string): Promise<Pattern[]> {
  const experiences = await this.getExperiences(sessionId);

  // Edge case: Too many experiences (>10,000)
  if (experiences.length > 10000) {
    // Batch process in chunks
    const chunks = this.chunk(experiences, 1000);
    const patterns: Pattern[] = [];

    for (const chunk of chunks) {
      patterns.push(...await this.distillChunk(chunk));
    }

    // Merge patterns
    return this.mergePatterns(patterns);
  }

  return this.distillDirect(experiences);
}
```

### 5.5 Testing Strategy

**Unit Tests:**
```typescript
describe('ReasoningBankAdapter', () => {
  it('should log move with outcome', async () => {
    const adapter = new ReasoningBankAdapter();
    const move: Move = { /* ... */ };
    const outcome: ValidationResult = { /* ... */ };

    await adapter.logMove(move, outcome);

    const stored = await adapter.querySimilar(/* context */);
    expect(stored).toContainMove(move);
  });

  it('should retrieve similar experiences', async () => {
    const adapter = new ReasoningBankAdapter();
    // Seed with test data
    await seedTestExperiences(adapter);

    const context: PuzzleState = { /* ... */ };
    const similar = await adapter.querySimilar(context);

    expect(similar.length).toBeGreaterThan(0);
    expect(similar[0].similarity).toBeGreaterThan(0.7);
  });
});
```

**Integration Tests:**
```typescript
describe('Memory System Integration', () => {
  it('should complete full GRASP cycle with memory', async () => {
    const solver = new CognitivePuzzleSolver();
    const puzzle = loadTestPuzzle('easy-001');

    const result = await solver.solve(puzzle);

    expect(result.success).toBe(true);
    expect(solver.memory.experienceCount).toBeGreaterThan(0);
  });

  it('should consolidate dreams after session', async () => {
    const solver = new CognitivePuzzleSolver();
    const puzzles = loadTestPuzzles(10);

    for (const puzzle of puzzles) {
      await solver.solve(puzzle);
    }

    const knowledge = await solver.dream();

    expect(knowledge.patterns.length).toBeGreaterThan(0);
    expect(knowledge.compressionRatio).toBeGreaterThan(5);
    expect(knowledge.abstractionLadder.levels.length).toBe(4);
  });
});
```

**Performance Tests:**
```typescript
describe('Memory Performance', () => {
  it('should query in <50ms (ReasoningBank)', async () => {
    const adapter = new ReasoningBankAdapter();
    await seedLargeDataset(adapter, 1000);

    const start = Date.now();
    await adapter.querySimilar(testContext);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  it('should query in <1ms (AgentDB)', async () => {
    const adapter = new AgentDBAdapter();
    await seedLargeDataset(adapter, 1000);

    const start = performance.now();
    await adapter.querySimilar(testContext);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1);
  });
});
```

---

## 6. Success Criteria

### 6.1 Functional Success Criteria

**Phase 1 (ReasoningBank) - Days 1-5:**
- [x] Initialize ReasoningBank in <5 minutes
- [x] Log 50+ experiences during baseline testing
- [x] Retrieve similar experiences in <50ms
- [x] Distill patterns with >5:1 compression ratio
- [x] Build 4-level abstraction ladder
- [x] Consolidate knowledge with verification

**Phase 2 (AgentDB Evaluation) - Days 6-10:**
- [ ] Migrate ReasoningBank data to AgentDB without loss
- [ ] RL training converges in <50 epochs
- [ ] Query performance <1ms (validate 150x claim)
- [ ] Reflexion memory reduces repeat errors by >30%
- [ ] Skill library auto-extracts >10 reusable patterns
- [ ] No crashes or data corruption during testing

**Phase 3 (Final Demo) - Days 11-15:**
- [ ] Select optimal memory system based on Day 10 results
- [ ] Benchmark both systems (if AgentDB stable)
- [ ] Generate comparison report
- [ ] Present data-driven recommendation

### 6.2 Non-Functional Success Criteria

**Performance:**
- [ ] ReasoningBank: 46% faster than custom SQLite (claimed)
- [ ] AgentDB: >50x faster than ReasoningBank (validate claim)
- [ ] Zero data loss during 3-week POC
- [ ] <5% query failure rate

**Reliability:**
- [ ] 99.9% uptime during POC period
- [ ] ACID compliance for all writes
- [ ] Successful daily backup exports

**Maintainability:**
- [ ] Clear API documentation
- [ ] 100% test coverage for critical paths
- [ ] Performance monitoring dashboard

### 6.3 Acceptance Tests

**Test 1: End-to-End Memory Flow**
```typescript
test('E2E: Solve → Log → Dream → Transfer', async () => {
  // 1. Solve easy puzzle, log experiences
  const solver = new CognitivePuzzleSolver();
  await solver.solve(easyPuzzle);

  const experiences = await solver.memory.getExperiences('session-1');
  expect(experiences.length).toBeGreaterThan(10);

  // 2. Dream consolidation
  const knowledge = await solver.dream();
  expect(knowledge.patterns.length).toBeGreaterThan(3);
  expect(knowledge.compressionRatio).toBeGreaterThan(5);

  // 3. Transfer to hard puzzle
  const hardResult = await solver.solve(hardPuzzle);
  expect(hardResult.solveTime).toBeLessThan(baselineTime * 0.7);
});
```

**Test 2: Similarity Retrieval Accuracy**
```typescript
test('Similarity retrieval returns relevant experiences', async () => {
  const adapter = new ReasoningBankAdapter();

  // Seed with known similar and dissimilar experiences
  await seedSimilarExperiences(adapter, 10, 'naked-single-heavy');
  await seedDissimilarExperiences(adapter, 10, 'x-wing-heavy');

  // Query with naked-single context
  const context = createNakedSingleContext();
  const results = await adapter.querySimilar(context, { limit: 5 });

  // Verify all results are actually similar
  results.forEach(exp => {
    expect(exp.strategySequence).toContain('naked_single');
  });
});
```

**Test 3: AgentDB RL Convergence**
```typescript
test('RL training converges in <50 epochs', async () => {
  const adapter = new AgentDBAdapter();

  // Train on easy puzzles
  const result = await adapter.trainRL({
    algorithm: 'decision-transformer',
    epochs: 50,
    batchSize: 32
  });

  expect(result.convergenceEpochs).toBeLessThanOrEqual(50);
  expect(result.finalSuccessRate).toBeGreaterThan(0.7);
});
```

---

## 7. Migration and Fallback Strategy

### 7.1 ReasoningBank → AgentDB Migration

**Migration Script (Day 6):**
```bash
#!/bin/bash
# migrate-to-agentdb.sh

# 1. Export ReasoningBank data
echo "Exporting ReasoningBank data..."
npx claude-flow@alpha memory export .swarm/export.json

# 2. Initialize AgentDB
echo "Initializing AgentDB..."
npx agentdb@latest init ./.agentdb/memory.db --preset large

# 3. Import data
echo "Importing to AgentDB..."
npx agentdb@latest migrate --source .swarm/memory.db

# 4. Verify migration
echo "Verifying migration..."
npx agentdb@latest stats ./.agentdb/memory.db

echo "Migration complete!"
```

**Data Validation:**
```typescript
async function validateMigration(): Promise<boolean> {
  const rbAdapter = new ReasoningBankAdapter();
  const adbAdapter = new AgentDBAdapter();

  // Check counts match
  const rbStatus = await rbAdapter.getStatus();
  const adbStatus = await adbAdapter.getStatus();

  if (rbStatus.experienceCount !== adbStatus.experienceCount) {
    console.error('Experience count mismatch!');
    return false;
  }

  // Spot check: Sample 10 experiences
  const samples = await rbAdapter.getExperiences('session-1', { limit: 10 });
  for (const sample of samples) {
    const adbSample = await adbAdapter.getExperience(sample.id);
    if (!deepEqual(sample, adbSample)) {
      console.error(`Experience ${sample.id} differs after migration`);
      return false;
    }
  }

  return true;
}
```

### 7.2 Fallback to ReasoningBank

**Decision Point (Day 10):**
```typescript
async function selectMemorySystem(): Promise<'reasoningbank' | 'agentdb'> {
  const monitor = new StabilityMonitor();

  // Check AgentDB stability
  const isStable = await monitor.checkStability();

  if (!isStable) {
    console.warn('AgentDB stability check failed, falling back to ReasoningBank');
    return 'reasoningbank';
  }

  // Check performance gains
  const benchmark = await runComparativeBenchmark();

  if (benchmark.agentdb.queryTime < benchmark.reasoningbank.queryTime * 0.5) {
    // AgentDB is >2x faster, meets criteria
    console.log('AgentDB performance validated, proceeding with AgentDB');
    return 'agentdb';
  } else {
    console.warn('AgentDB performance gains not validated, using ReasoningBank');
    return 'reasoningbank';
  }
}
```

**Fallback Configuration:**
```typescript
// src/config/memory-config.ts
export const MEMORY_CONFIG = {
  primary: process.env.MEMORY_SYSTEM || 'reasoningbank',
  fallback: 'reasoningbank',

  agentdb: {
    enabled: false, // Set to true on Day 10 if criteria met
    dataPath: './.agentdb/memory.db',
    rlEnabled: true,
    reflexionEnabled: true,
    skillLibraryEnabled: true
  },

  reasoningbank: {
    enabled: true,  // Always enabled as fallback
    dataPath: '.swarm/memory.db'
  }
};
```

---

## 8. Appendix

### 8.1 CLI Command Reference

**ReasoningBank Commands:**
```bash
# Initialize
npx claude-flow@alpha agent memory init

# Status
npx claude-flow@alpha agent memory status

# Store data
npx claude-flow@alpha memory store <key> <value>

# Query
npx claude-flow@alpha memory query <pattern>

# List all
npx claude-flow@alpha agent memory list

# Export
npx claude-flow@alpha memory export <filepath>
```

**AgentDB Commands:**
```bash
# Initialize
npx agentdb@latest init <path> --preset large

# Start MCP server
npx agentdb@latest mcp

# Create plugin
npx agentdb@latest create-plugin -t decision-transformer -n <name>

# Train plugin
npx agentdb@latest train <plugin-name> --epochs 50

# Query
npx agentdb@latest query <path> <embedding> -k 10

# Statistics
npx agentdb@latest stats <path>

# Migrate
npx agentdb@latest migrate --source <source-db>
```

### 8.2 Performance Benchmarking Script

```bash
#!/bin/bash
# benchmark-memory.sh

echo "Benchmarking Memory Systems..."

# ReasoningBank benchmarks
echo "=== ReasoningBank ==="
time npx claude-flow@alpha memory query "test_pattern" > /dev/null
time npx claude-flow@alpha memory store "bench_key" '{"data": "test"}' > /dev/null

# AgentDB benchmarks (if enabled)
if [ "$ENABLE_AGENTDB" = "true" ]; then
  echo "=== AgentDB ==="
  time npx agentdb@latest query ./.agentdb/memory.db "[0.1, 0.2, ...]" -k 10 > /dev/null
  time npx agentdb@latest insert ./.agentdb/memory.db '{"data": "test"}' > /dev/null
fi

echo "Benchmark complete!"
```

### 8.3 Data Schema Examples

**ReasoningBank Experience Schema:**
```json
{
  "experienceId": "exp-uuid-001",
  "sessionId": "session-uuid-001",
  "puzzleId": "puzzle-uuid-001",
  "timestamp": 1704384000000,
  "trajectory": [
    {
      "cell": { "row": 0, "col": 4 },
      "value": 7,
      "strategy": "naked_single",
      "timestamp": 1704384001000
    }
  ],
  "outcome": "solved",
  "duration": 45000,
  "strategySequence": ["naked_single", "hidden_single", "pointing_pair"],
  "insights": [
    {
      "type": "strategy",
      "content": "Naked singles effective early",
      "confidence": 0.85,
      "timestamp": 1704384005000
    }
  ]
}
```

**AgentDB Skill Schema:**
```json
{
  "skillId": "skill-uuid-001",
  "name": "naked_single_detection",
  "pattern": {
    "id": "pattern-uuid-001",
    "type": "strategy",
    "description": "Detect and fill naked singles"
  },
  "successRate": 0.95,
  "applicationCount": 142,
  "transferability": 0.88,
  "prerequisites": [],
  "domain": "sudoku-solving"
}
```

---

**Document Status:** DRAFT - Ready for Implementation
**Next Steps:** Review with team, then proceed with Day 2 implementation
