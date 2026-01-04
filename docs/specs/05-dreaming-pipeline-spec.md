# Dreaming Pipeline Specification

**Component:** Dreaming Pipeline (5-Phase Knowledge Consolidation)
**Date:** January 4, 2026
**Version:** 1.0
**Status:** Specification

---

## 1. Component Overview

### 1.1 Purpose and Responsibilities

The Dreaming Pipeline is the "night cycle" consolidation system that transforms episodic puzzle-solving experiences into reusable, transferable knowledge. It implements a biological-inspired memory consolidation process that:

- **Compresses** large volumes of raw experiences (target 10:1 ratio)
- **Abstracts** specific instances into general principles (4-level hierarchy)
- **Integrates** patterns across different solving sessions
- **Prunes** redundant or low-value knowledge
- **Verifies** consistency of consolidated knowledge

### 1.2 Position in Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    COGNITIVE PUZZLE SOLVER                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DAY CYCLE (Solving)           NIGHT CYCLE (Dreaming) ⭐    │
│  ═══════════════════            ════════════════════════    │
│                                                             │
│  GRASP Loop                     Dreaming Pipeline           │
│  ├── Generate moves             ├── Phase 1: Capture ✅     │
│  ├── Review outcomes            ├── Phase 2: Triage         │
│  ├── Absorb experiences         ├── Phase 3: Compression    │
│  ├── Synthesize insights        ├── Phase 4: Abstraction    │
│  └── Persist state              ├── Phase 5: Integration    │
│                                 └── Verification            │
│         │                                │                  │
│         ▼                                ▼                  │
│  AgentDB Memory (ReasoningBank) ◄────────┘                  │
│  (Persistent Storage)                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Input**: Raw experiences from ReasoningBank (47+ per session)
**Output**: Consolidated knowledge structures (5-7 patterns, 4-level abstraction ladder)
**Trigger**: Session completion, scheduled intervals, or manual invocation

### 1.3 Dependencies on Other Components

| Component | Dependency | Nature |
|-----------|-----------|--------|
| **AgentDB (Memory System)** | Critical | Source of raw experiences, storage of consolidated knowledge |
| **GRASP Loop** | Input Provider | Generates experiences during solving |
| **Attention Mechanism** | Metadata Source | Importance scores for triage |
| **Puzzle Engine** | Domain Context | Validation of strategy correctness |

---

## 2. Functional Requirements

### 2.1 Five-Phase Consolidation Process

#### FR-2.1.1: Phase 1 - Experience Capture (Automatic)

**Requirement**: System SHALL automatically log all solving experiences during GRASP loop execution

**Capture Points**:
```typescript
interface CapturedExperience {
  // Move-level capture
  onMoveAttempt: {
    move: Move;
    outcome: 'success' | 'failure' | 'progress';
    candidatesEliminated: number;
    strategyUsed: string;
    confidenceLevel: number;
  };

  // Strategy-level capture
  onStrategyApplication: {
    strategy: string;
    context: PuzzleState;
    result: ValidationResult;
    duration: number;
  };

  // Insight-level capture
  onInsightDetection: {
    type: 'breakthrough' | 'pattern' | 'error';
    description: string;
    triggerCondition: string;
    impact: 'high' | 'medium' | 'low';
  };
}
```

**Acceptance Criteria**:
- ✅ Every GRASP iteration logs at least one experience
- ✅ Capture overhead < 5% of iteration time
- ✅ Experiences stored in ReasoningBank with <100ms latency
- ✅ Session metadata automatically attached (puzzle difficulty, duration)

#### FR-2.1.2: Phase 2 - Triage (Significance Filtering)

**Requirement**: System SHALL filter experiences to identify the most significant for consolidation

**Triage Algorithm**:
```typescript
interface TriageFilter {
  // Importance-based filtering
  minImportanceScore: number;    // Default: 0.3 (scale 0-1)

  // Outcome-based filtering
  includeSuccessful: boolean;    // Default: true
  includeErrors: boolean;        // Default: true (learn from mistakes)
  includeBreakthroughs: boolean; // Default: true (always keep)

  // Deduplication
  similarityThreshold: number;   // Default: 0.8 (semantic similarity)
  keepRepresentative: boolean;   // Keep 1 per cluster

  // Volume control
  maxExperiencesPerSession: number; // Default: 100
}

function calculateImportance(experience: Experience): number {
  const weights = {
    outcomeImpact: 0.4,      // Did it solve the puzzle?
    novelty: 0.3,            // New strategy or pattern?
    error: 0.2,              // Learning opportunity?
    efficiency: 0.1          // Fast/optimal solution?
  };

  return (
    weights.outcomeImpact * outcomeScore(experience) +
    weights.novelty * noveltyScore(experience) +
    weights.error * (experience.outcome === 'failure' ? 1 : 0) +
    weights.efficiency * efficiencyScore(experience)
  );
}
```

**Acceptance Criteria**:
- ✅ Reduces 47+ experiences to ≤20 significant ones
- ✅ Preserves all breakthrough moments (100% recall)
- ✅ Deduplicates similar experiences (>80% similarity = 1 representative)
- ✅ Triage completes in <5 seconds for 100 experiences

#### FR-2.1.3: Phase 3 - Compression (Pattern Extraction)

**Requirement**: System SHALL cluster similar experiences and extract representative patterns

**Compression Pipeline**:
```typescript
interface CompressionConfig {
  targetRatio: number;           // Default: 10:1
  clusteringMethod: 'semantic' | 'structural' | 'hybrid';
  minClusterSize: number;        // Default: 3 experiences
  extractionStrategy: 'centroid' | 'exemplar' | 'composite';
}

async function compress(
  experiences: Experience[],
  config: CompressionConfig
): Promise<Pattern[]> {
  // Step 1: Cluster by similarity using AgentDB HNSW
  const clusters = await agentDB.cluster(experiences, {
    method: config.clusteringMethod,
    minSize: config.minClusterSize
  });

  // Step 2: Extract pattern from each cluster
  const patterns = await Promise.all(
    clusters.map(cluster => extractPattern(cluster, {
      strategy: config.extractionStrategy
    }))
  );

  // Step 3: Validate compression ratio
  const actualRatio = experiences.length / patterns.length;
  if (actualRatio < config.targetRatio * 0.7) {
    console.warn(`Compression ratio ${actualRatio} below target ${config.targetRatio}`);
  }

  return patterns;
}
```

**Pattern Structure**:
```typescript
interface ExtractedPattern {
  id: string;
  type: 'strategy' | 'technique' | 'heuristic';

  // Core pattern definition
  description: string;           // Natural language summary
  conditions: string[];          // When to apply (IF...)
  actions: string[];             // What to do (THEN...)

  // Evidence and metrics
  examples: Experience[];        // Source experiences (3-5 representative)
  successRate: number;           // 0-1, from cluster
  usageCount: number;            // Frequency in source data

  // Confidence and validation
  confidence: number;            // Statistical confidence
  verificationStatus: 'unverified' | 'verified' | 'invalidated';
}
```

**Clustering Example (Sudoku)**:
```
Input: 47 experiences from solving 5 puzzles

Cluster 1 (18 experiences): "Naked Single" applications
├── Pattern: "When cell has only 1 candidate, place that digit"
├── Success rate: 100%
└── Examples: [exp_12, exp_23, exp_31]

Cluster 2 (12 experiences): "Hidden Single" applications
├── Pattern: "When digit has only 1 position in unit, place it there"
├── Success rate: 95%
└── Examples: [exp_7, exp_18, exp_29]

Cluster 3 (8 experiences): "Pointing Pair" applications
├── Pattern: "Candidates in box-line intersection eliminate from line"
├── Success rate: 78%
└── Examples: [exp_15, exp_33]

Cluster 4 (9 experiences): Error corrections
├── Pattern: "Backtrack when contradiction detected"
├── Success rate: N/A (error recovery)
└── Examples: [exp_41, exp_42, exp_43]

Output: 4 patterns (compression ratio: 47:4 = 11.75:1) ✅
```

**Acceptance Criteria**:
- ✅ Achieves 10:1 compression ratio (±30% tolerance)
- ✅ Each pattern supported by ≥3 examples
- ✅ Pattern descriptions are human-readable
- ✅ Preserves semantic meaning (verified by retrieval test)

#### FR-2.1.4: Phase 4 - Abstraction Ladder (Hierarchy Building)

**Requirement**: System SHALL construct 4-level abstraction hierarchy from specific to general

**Ladder Structure**:
```typescript
interface AbstractionLadder {
  levels: AbstractionLevel[];
  domain: string;                // e.g., "Sudoku solving"
  createdAt: number;
  metadata: {
    sourcePatternCount: number;
    abstractionMethod: string;
    verificationScore: number;
  };
}

interface AbstractionLevel {
  level: number;                 // 0 = most specific, 3 = most general
  name: string;
  patterns: Pattern[];
  generalizations: string[];     // Natural language principles
  exampleCount: number;          // Total examples supporting this level
}
```

**Abstraction Algorithm**:
```typescript
async function buildAbstractionLadder(
  patterns: Pattern[]
): Promise<AbstractionLadder> {
  const ladder: AbstractionLadder = {
    levels: [],
    domain: 'Sudoku solving',
    createdAt: Date.now(),
    metadata: {
      sourcePatternCount: patterns.length,
      abstractionMethod: 'hierarchical-clustering',
      verificationScore: 0
    }
  };

  // Level 0: Specific instances
  ladder.levels[0] = {
    level: 0,
    name: 'Concrete Instances',
    patterns: patterns,
    generalizations: patterns.map(p => p.description),
    exampleCount: patterns.reduce((sum, p) => sum + p.examples.length, 0)
  };

  // Level 1: Technique names
  ladder.levels[1] = await abstractToLevel1(patterns);

  // Level 2: Strategy categories
  ladder.levels[2] = await abstractToLevel2(ladder.levels[1]);

  // Level 3: General principles
  ladder.levels[3] = await abstractToLevel3(ladder.levels[2]);

  // Level 4: Meta-cognitive principles (optional, if enough data)
  if (patterns.length >= 10) {
    ladder.levels[4] = await abstractToLevel4(ladder.levels[3]);
  }

  return ladder;
}
```

**Example Ladder (Sudoku Domain)**:
```
LEVEL 0: Specific Instances
├── "Puzzle #12, R3C5: Only 7 possible, row had 1-6,8,9"
├── "Puzzle #23, R7C2: Only 3 possible, column had 1,2,4-9"
├── "Puzzle #47, R5C8: Only 9 possible, box had 1-8"
└── [20 more specific instances...]

LEVEL 1: Named Techniques
├── "Naked Single: Cell with one candidate → place it"
├── "Hidden Single: Digit with one position in unit → place it"
├── "Pointing Pair: Box-line intersection → eliminate from line"
├── "Box/Line Reduction: Line-box intersection → eliminate from box"
└── [3 more techniques...]

LEVEL 2: Strategy Categories
├── "Elimination Strategies: Reduce candidate sets via constraints"
│   └── Includes: Naked Single, Hidden Single, Pointing Pair
├── "Placement Strategies: Identify forced digit placements"
│   └── Includes: Last digit, Full house
└── "Pattern Recognition: Exploit structural relationships"
    └── Includes: X-Wing, Swordfish

LEVEL 3: General Principles
├── "Constraint Propagation: Infer new constraints from existing ones"
│   └── Subsumes: Elimination, Placement strategies
├── "Most Constrained First: Prioritize cells with fewest options"
│   └── Guides: Cell selection, strategy ordering
└── "Consistency Maintenance: Keep all constraints satisfied"
    └── Ensures: Valid intermediate states

LEVEL 4: Meta-Cognitive Principles (optional)
└── "Problem Solving = Iterative constraint satisfaction + informed search"
    ├── Applies to: Sudoku, N-Queens, Logic puzzles, CSP domains
    └── Transferable: Yes, with domain adaptation
```

**Abstraction Methods**:
```typescript
async function abstractToLevel1(
  level0Patterns: Pattern[]
): Promise<AbstractionLevel> {
  // Group by strategy type
  const strategyGroups = groupByStrategy(level0Patterns);

  // Create named technique for each group
  const techniques = await Promise.all(
    strategyGroups.map(async group => {
      const representative = selectRepresentative(group);
      return {
        name: inferTechniqueName(group),
        description: await summarizeGroup(group),
        conditions: extractCommonConditions(group),
        actions: extractCommonActions(group),
        successRate: averageSuccessRate(group)
      };
    })
  );

  return {
    level: 1,
    name: 'Named Techniques',
    patterns: techniques,
    generalizations: techniques.map(t => t.description),
    exampleCount: level0Patterns.reduce((sum, p) => sum + p.examples.length, 0)
  };
}
```

**Acceptance Criteria**:
- ✅ Constructs 4-level hierarchy (3 levels minimum, 5 maximum)
- ✅ Each level has meaningful abstractions (not just rewording)
- ✅ Higher levels subsume lower levels (vertical consistency)
- ✅ Items at same level have similar abstraction degree (horizontal coherence)
- ✅ Ladder is grounded (can trace L3 → L2 → L1 → L0)

#### FR-2.1.5: Phase 5 - Integration & Pruning (Cross-Connection & Deduplication)

**Requirement**: System SHALL cross-connect related patterns and remove redundancies

**Integration Process**:
```typescript
interface IntegrationConfig {
  crossConnectThreshold: number;    // Default: 0.6 (semantic similarity)
  redundancyThreshold: number;      // Default: 0.8 (high similarity = duplicate)
  utilityThreshold: number;         // Default: 0.2 (min value to keep)
}

async function integrate(
  abstraction: AbstractionLadder,
  config: IntegrationConfig
): Promise<AbstractionLadder> {
  // Step 1: Cross-connect related patterns
  const connected = await crossConnect(abstraction, {
    threshold: config.crossConnectThreshold
  });

  // Step 2: Prune redundancies
  const pruned = await pruneRedundant(connected, {
    threshold: config.redundancyThreshold
  });

  // Step 3: Remove low-utility patterns
  const filtered = await filterLowUtility(pruned, {
    minUtility: config.utilityThreshold
  });

  return filtered;
}
```

**Cross-Connection**:
```typescript
interface PatternConnection {
  fromPattern: string;              // Pattern ID
  toPattern: string;                // Related pattern ID
  relationshipType: 'prerequisite' | 'alternative' | 'refinement' | 'complement';
  strength: number;                 // 0-1, semantic similarity
  evidence: string[];               // Supporting examples
}

async function crossConnect(
  ladder: AbstractionLadder,
  config: { threshold: number }
): Promise<AbstractionLadder> {
  const connections: PatternConnection[] = [];

  // For each level
  for (const level of ladder.levels) {
    const patterns = level.patterns;

    // Find related patterns (O(n²) but n is small)
    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const similarity = await calculateSimilarity(patterns[i], patterns[j]);

        if (similarity >= config.threshold) {
          const relationship = inferRelationship(patterns[i], patterns[j]);
          connections.push({
            fromPattern: patterns[i].id,
            toPattern: patterns[j].id,
            relationshipType: relationship,
            strength: similarity,
            evidence: findSharedExamples(patterns[i], patterns[j])
          });
        }
      }
    }
  }

  // Attach connections to ladder metadata
  ladder.metadata.connections = connections;

  return ladder;
}
```

**Pruning Logic**:
```typescript
async function pruneRedundant(
  ladder: AbstractionLadder,
  config: { threshold: number }
): Promise<AbstractionLadder> {
  const pruned = { ...ladder, levels: [] };

  for (const level of ladder.levels) {
    const uniquePatterns: Pattern[] = [];
    const seen = new Set<string>();

    // Sort by utility (keep highest utility when deduplicating)
    const sorted = level.patterns.sort((a, b) =>
      calculateUtility(b) - calculateUtility(a)
    );

    for (const pattern of sorted) {
      // Check if similar pattern already kept
      const isDuplicate = uniquePatterns.some(existing =>
        semanticSimilarity(pattern, existing) >= config.threshold
      );

      if (!isDuplicate) {
        uniquePatterns.push(pattern);
      } else {
        console.log(`Pruned redundant pattern: ${pattern.description}`);
      }
    }

    pruned.levels.push({
      ...level,
      patterns: uniquePatterns
    });
  }

  return pruned;
}

function calculateUtility(pattern: Pattern): number {
  return (
    pattern.successRate * 0.5 +         // 50% weight: effectiveness
    (pattern.usageCount / 100) * 0.3 +  // 30% weight: frequency (normalized)
    pattern.confidence * 0.2             // 20% weight: confidence
  );
}
```

**Acceptance Criteria**:
- ✅ Identifies cross-pattern relationships (≥5 connections expected)
- ✅ Removes redundant patterns (reduces count by 10-20%)
- ✅ Preserves high-utility patterns (utility >0.2)
- ✅ Maintains ladder coherence (no broken references)

#### FR-2.1.6: Verification (Consistency Checking)

**Requirement**: System SHALL validate consolidated knowledge for internal consistency

**Verification Checks**:
```typescript
interface VerificationResult {
  status: 'verified' | 'warnings' | 'failed';
  checks: {
    verticalConsistency: CheckResult;    // Higher levels subsume lower
    horizontalCoherence: CheckResult;    // Same-level items similar abstraction
    groundedness: CheckResult;           // Abstractions traceable to instances
    nonContradiction: CheckResult;       // No conflicting patterns
    utilityThreshold: CheckResult;       // All patterns meet minimum utility
  };
  warnings: string[];
  errors: string[];
  score: number;  // 0-1, overall quality
}

async function verify(
  knowledge: ConsolidatedKnowledge
): Promise<VerificationResult> {
  const result: VerificationResult = {
    status: 'verified',
    checks: {},
    warnings: [],
    errors: [],
    score: 0
  };

  // Check 1: Vertical consistency
  result.checks.verticalConsistency = await checkVerticalConsistency(
    knowledge.abstractionLadder
  );

  // Check 2: Horizontal coherence
  result.checks.horizontalCoherence = await checkHorizontalCoherence(
    knowledge.abstractionLadder
  );

  // Check 3: Groundedness
  result.checks.groundedness = await checkGroundedness(
    knowledge.abstractionLadder
  );

  // Check 4: Non-contradiction
  result.checks.nonContradiction = await checkNonContradiction(
    knowledge.patterns
  );

  // Check 5: Utility threshold
  result.checks.utilityThreshold = await checkUtilityThreshold(
    knowledge.patterns
  );

  // Aggregate results
  const allPassed = Object.values(result.checks).every(c => c.passed);
  result.status = allPassed ? 'verified' :
    (result.errors.length > 0 ? 'failed' : 'warnings');

  result.score = calculateOverallScore(result.checks);

  return result;
}
```

**Consistency Checks**:
```typescript
async function checkVerticalConsistency(
  ladder: AbstractionLadder
): Promise<CheckResult> {
  // For each pair of adjacent levels
  for (let i = 0; i < ladder.levels.length - 1; i++) {
    const lowerLevel = ladder.levels[i];
    const higherLevel = ladder.levels[i + 1];

    // Verify higher level abstracts lower level
    for (const higherPattern of higherLevel.patterns) {
      const subsumes = await checkSubsumption(higherPattern, lowerLevel.patterns);

      if (!subsumes) {
        return {
          passed: false,
          message: `Level ${i+1} pattern "${higherPattern.description}" doesn't subsume Level ${i}`,
          severity: 'error'
        };
      }
    }
  }

  return { passed: true, message: 'Vertical consistency verified' };
}

async function checkNonContradiction(
  patterns: Pattern[]
): Promise<CheckResult> {
  const contradictions: string[] = [];

  // Check for logical contradictions
  for (let i = 0; i < patterns.length; i++) {
    for (let j = i + 1; j < patterns.length; j++) {
      const p1 = patterns[i];
      const p2 = patterns[j];

      // Check if patterns have conflicting conditions/actions
      if (sameConditions(p1, p2) && conflictingActions(p1, p2)) {
        contradictions.push(
          `Patterns "${p1.description}" and "${p2.description}" contradict`
        );
      }
    }
  }

  return {
    passed: contradictions.length === 0,
    message: contradictions.length === 0 ?
      'No contradictions found' :
      `Found ${contradictions.length} contradictions`,
    details: contradictions
  };
}
```

**Acceptance Criteria**:
- ✅ Detects vertical inconsistencies (higher level doesn't abstract lower)
- ✅ Detects contradictions (conflicting patterns)
- ✅ Validates groundedness (all abstractions traceable)
- ✅ Overall verification score ≥0.8 required to pass
- ✅ Verification completes in <10 seconds

### 2.2 Night Cycle Scheduling

#### FR-2.2.1: Trigger Mechanisms

**Requirement**: System SHALL support multiple trigger mechanisms for consolidation

```typescript
type DreamTrigger = 'session-complete' | 'periodic' | 'manual' | 'threshold';

interface DreamScheduler {
  // Trigger 1: After session completion
  onSessionComplete: (sessionId: string) => Promise<void>;

  // Trigger 2: Periodic (e.g., every 30 minutes of activity)
  periodicInterval: number;  // milliseconds
  onPeriodicTrigger: () => Promise<void>;

  // Trigger 3: Manual invocation
  manualTrigger: () => Promise<void>;

  // Trigger 4: Threshold-based (e.g., 50+ new experiences)
  thresholdConfig: {
    experienceCount: number;     // Default: 50
    timeSinceLastDream: number;  // Minimum interval (ms)
  };
  onThresholdReached: () => Promise<void>;
}
```

**Default Configuration** (POC):
```typescript
const defaultSchedule: DreamSchedulerConfig = {
  primaryTrigger: 'session-complete',

  // Backup trigger: Every 30 min if session very long
  periodicBackup: {
    enabled: true,
    interval: 1800000  // 30 minutes
  },

  // Threshold backup: Many experiences
  thresholdBackup: {
    enabled: true,
    minExperiences: 50,
    minTimeSinceLastDream: 600000  // 10 minutes
  }
};
```

**Acceptance Criteria**:
- ✅ Session-complete trigger works 100% of the time
- ✅ Periodic trigger fires within 5% of configured interval
- ✅ Manual trigger executes immediately
- ✅ Threshold trigger prevents memory overflow

#### FR-2.2.2: Consolidation Session Orchestration

**Requirement**: System SHALL orchestrate complete consolidation workflow

```typescript
async function runDreamCycle(sessionId: string): Promise<ConsolidatedKnowledge> {
  console.log(`🌙 Starting dream cycle for session ${sessionId}`);

  try {
    // Phase 1: CAPTURE (already done during solving) ✅
    const rawExperiences = await reasoningBank.getExperiences(sessionId);
    console.log(`📊 Captured ${rawExperiences.length} experiences`);

    // Phase 2: TRIAGE
    const significant = await triage(rawExperiences, {
      minImportance: 0.3,
      maxItems: 100
    });
    console.log(`🔍 Triaged to ${significant.length} significant experiences`);

    // Phase 3: COMPRESSION
    const patterns = await compress(significant, {
      targetRatio: 10,
      clusteringMethod: 'hybrid'
    });
    console.log(`🗜️ Compressed to ${patterns.length} patterns (ratio: ${rawExperiences.length / patterns.length}:1)`);

    // Phase 4: ABSTRACTION
    const ladder = await buildAbstractionLadder(patterns);
    console.log(`📈 Built ${ladder.levels.length}-level abstraction ladder`);

    // Phase 5: INTEGRATION & PRUNING
    const integrated = await integrate(ladder, {
      crossConnectThreshold: 0.6,
      redundancyThreshold: 0.8,
      utilityThreshold: 0.2
    });
    console.log(`🔗 Integrated and pruned`);

    // VERIFICATION
    const verificationResult = await verify({
      sessionIds: [sessionId],
      patterns,
      abstractionLadder: integrated,
      compressionRatio: rawExperiences.length / patterns.length,
      verificationStatus: 'unverified',
      timestamp: Date.now()
    });

    if (verificationResult.status === 'failed') {
      throw new Error(`Verification failed: ${verificationResult.errors.join(', ')}`);
    }

    console.log(`✅ Verification passed (score: ${verificationResult.score.toFixed(2)})`);

    // Store consolidated knowledge
    const knowledge: ConsolidatedKnowledge = {
      sessionIds: [sessionId],
      patterns,
      abstractionLadder: integrated,
      compressionRatio: rawExperiences.length / patterns.length,
      verificationStatus: 'verified',
      timestamp: Date.now()
    };

    await reasoningBank.storeKnowledge(knowledge);
    console.log(`💾 Stored consolidated knowledge`);

    return knowledge;

  } catch (error) {
    console.error(`❌ Dream cycle failed: ${error.message}`);
    throw error;
  }
}
```

**Acceptance Criteria**:
- ✅ Complete cycle executes in <60 seconds for typical session
- ✅ Handles failures gracefully (retries, fallbacks)
- ✅ Logs progress at each phase
- ✅ Stores results in ReasoningBank

---

## 3. Non-Functional Requirements

### 3.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Triage latency** | <5 seconds | 100 experiences → 20 significant |
| **Compression time** | <15 seconds | 20 experiences → 5 patterns |
| **Abstraction time** | <10 seconds | 5 patterns → 4-level ladder |
| **Integration time** | <5 seconds | Cross-connect + prune |
| **Verification time** | <10 seconds | Full consistency check |
| **Total cycle time** | <60 seconds | End-to-end consolidation |
| **Memory overhead** | <500MB | Peak RAM during consolidation |

### 3.2 Quality Targets

| Metric | Target | Validation Method |
|--------|--------|-------------------|
| **Compression ratio** | 10:1 (±30%) | Count experiences vs patterns |
| **Pattern quality** | ≥0.7 success rate | Weighted average across patterns |
| **Abstraction depth** | 4 levels (3-5 range) | Count ladder levels |
| **Vertical consistency** | 100% | Automated verification |
| **Contradiction rate** | <5% | Automated detection |
| **Verification score** | ≥0.8 | Aggregate check score |

### 3.3 Robustness Requirements

**NFR-3.3.1: Graceful Degradation**
- If triage fails: Use all experiences (no filtering)
- If compression fails: Store raw experiences
- If abstraction fails: Use 2-level ladder (instances + techniques)
- If verification fails: Store with 'unverified' status + warnings

**NFR-3.3.2: Error Handling**
```typescript
interface DreamErrorHandler {
  onTriageFail: 'skip-filtering' | 'abort';        // Default: skip-filtering
  onCompressionFail: 'use-raw' | 'abort';          // Default: use-raw
  onAbstractionFail: 'minimal-ladder' | 'abort';   // Default: minimal-ladder
  onVerificationFail: 'warn-and-store' | 'abort';  // Default: warn-and-store

  maxRetries: number;                               // Default: 3
  retryDelay: number;                               // Default: 5000ms
}
```

**NFR-3.3.3: Data Integrity**
- All consolidation operations are atomic (all-or-nothing)
- ReasoningBank writes use transactions
- Backup raw experiences before transformation
- Rollback capability if verification fails

---

## 4. API/Interface Design

### 4.1 Public Interface

```typescript
export class DreamingPipeline {
  constructor(
    private reasoningBank: ReasoningBankAdapter,
    private config: DreamingPipelineConfig
  ) {}

  /**
   * Run complete consolidation cycle for a session
   * @param sessionId - Solving session identifier
   * @returns Consolidated knowledge structure
   */
  async consolidate(sessionId: string): Promise<ConsolidatedKnowledge> {
    // Orchestrates all 5 phases + verification
  }

  /**
   * Phase 2: Filter significant experiences
   * @param experiences - Raw experiences from ReasoningBank
   * @param config - Triage configuration
   * @returns Filtered significant experiences
   */
  async triage(
    experiences: Experience[],
    config: TriageConfig
  ): Promise<Experience[]> {
    // Importance scoring + deduplication
  }

  /**
   * Phase 3: Compress experiences into patterns
   * @param experiences - Significant experiences
   * @param config - Compression configuration
   * @returns Extracted patterns
   */
  async compress(
    experiences: Experience[],
    config: CompressionConfig
  ): Promise<Pattern[]> {
    // Clustering + pattern extraction
  }

  /**
   * Phase 4: Build abstraction hierarchy
   * @param patterns - Compressed patterns
   * @returns Multi-level abstraction ladder
   */
  async buildAbstractionLadder(
    patterns: Pattern[]
  ): Promise<AbstractionLadder> {
    // Hierarchical abstraction
  }

  /**
   * Phase 5: Integrate and prune
   * @param ladder - Abstraction ladder
   * @param config - Integration configuration
   * @returns Refined ladder with cross-connections
   */
  async integrate(
    ladder: AbstractionLadder,
    config: IntegrationConfig
  ): Promise<AbstractionLadder> {
    // Cross-connect + prune redundancies
  }

  /**
   * Verify consolidated knowledge
   * @param knowledge - Knowledge to verify
   * @returns Verification result
   */
  async verify(
    knowledge: ConsolidatedKnowledge
  ): Promise<VerificationResult> {
    // Consistency checks
  }

  /**
   * Schedule automatic consolidation
   * @param scheduler - Scheduling configuration
   */
  scheduleConsolidation(scheduler: DreamSchedulerConfig): void {
    // Set up triggers
  }

  /**
   * Query consolidated knowledge
   * @param query - Search parameters
   * @returns Matching patterns and abstractions
   */
  async queryKnowledge(
    query: KnowledgeQuery
  ): Promise<KnowledgeQueryResult> {
    // Retrieve applicable knowledge
  }
}
```

### 4.2 Configuration Interface

```typescript
export interface DreamingPipelineConfig {
  // Triage settings
  triage: {
    minImportanceScore: number;      // Default: 0.3
    maxExperiencesPerSession: number; // Default: 100
    similarityThreshold: number;      // Default: 0.8
  };

  // Compression settings
  compression: {
    targetRatio: number;              // Default: 10
    clusteringMethod: 'semantic' | 'structural' | 'hybrid';
    minClusterSize: number;           // Default: 3
  };

  // Abstraction settings
  abstraction: {
    targetLevels: number;             // Default: 4
    minLevels: number;                // Default: 3
    maxLevels: number;                // Default: 5
  };

  // Integration settings
  integration: {
    crossConnectThreshold: number;    // Default: 0.6
    redundancyThreshold: number;      // Default: 0.8
    utilityThreshold: number;         // Default: 0.2
  };

  // Verification settings
  verification: {
    minScore: number;                 // Default: 0.8
    strictMode: boolean;              // Default: false
  };

  // Scheduling
  scheduling: {
    primaryTrigger: DreamTrigger;     // Default: 'session-complete'
    periodicInterval?: number;
    thresholdExperiences?: number;
  };

  // Error handling
  errorHandling: DreamErrorHandler;
}
```

---

## 5. Implementation Notes

### 5.1 Key Algorithms

#### 5.1.1 Semantic Similarity Calculation

```typescript
async function calculateSemanticSimilarity(
  item1: Pattern | Experience,
  item2: Pattern | Experience
): Promise<number> {
  // Use ReasoningBank's built-in similarity if available
  if (reasoningBank.calculateSimilarity) {
    return await reasoningBank.calculateSimilarity(item1, item2);
  }

  // Fallback: Simple embedding cosine similarity
  const embedding1 = await generateEmbedding(item1.description);
  const embedding2 = await generateEmbedding(item2.description);

  return cosineSimilarity(embedding1, embedding2);
}

function cosineSimilarity(vec1: number[], vec2: number[]): number {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

  return dotProduct / (mag1 * mag2);
}
```

#### 5.1.2 Pattern Extraction from Cluster

```typescript
async function extractPattern(
  cluster: Experience[],
  config: { strategy: 'centroid' | 'exemplar' | 'composite' }
): Promise<Pattern> {
  if (config.strategy === 'centroid') {
    // Use LLM to summarize cluster
    const summary = await llm.summarize({
      prompt: `Analyze these ${cluster.length} puzzle-solving experiences and extract a common pattern.

      Experiences:
      ${cluster.map(e => JSON.stringify(e.trajectory)).join('\n')}

      Extract:
      1. Pattern name (short, descriptive)
      2. Conditions (when to apply)
      3. Actions (what to do)
      4. Success rate (calculate from examples)`,
      experiences: cluster
    });

    return {
      id: generateId(),
      type: inferPatternType(summary),
      description: summary.name,
      conditions: summary.conditions,
      actions: summary.actions,
      successRate: calculateSuccessRate(cluster),
      usageCount: cluster.length,
      examples: selectRepresentativeExamples(cluster, 3),
      confidence: calculateConfidence(cluster),
      verificationStatus: 'unverified'
    };
  } else {
    // Similar logic for exemplar/composite
  }
}
```

### 5.2 Edge Cases to Handle

| Edge Case | Handling Strategy |
|-----------|------------------|
| **No experiences captured** | Skip consolidation, log warning |
| **All experiences trivial** | Create minimal ladder (2 levels) |
| **Single cluster (all similar)** | Create 1 pattern, simple ladder |
| **Contradictory patterns** | Flag in verification, present both with confidence scores |
| **Zero compression (ratio <2:1)** | Warn but continue, may indicate novel domain |
| **Verification fails** | Store with 'unverified' status, flag for human review |
| **ReasoningBank unavailable** | Queue consolidation, retry with backoff |

### 5.3 Testing Strategy

#### Unit Tests
```typescript
describe('DreamingPipeline', () => {
  describe('triage', () => {
    it('filters low-importance experiences', async () => {
      const pipeline = new DreamingPipeline(mockReasoningBank, defaultConfig);
      const experiences = generateMockExperiences(50, { lowImportance: 30 });

      const result = await pipeline.triage(experiences, { minImportance: 0.5 });

      expect(result.length).toBeLessThanOrEqual(20);
      expect(result.every(e => e.importance >= 0.5)).toBe(true);
    });
  });

  describe('compress', () => {
    it('achieves target compression ratio', async () => {
      const pipeline = new DreamingPipeline(mockReasoningBank, defaultConfig);
      const experiences = generateMockExperiences(47);

      const patterns = await pipeline.compress(experiences, { targetRatio: 10 });

      const ratio = experiences.length / patterns.length;
      expect(ratio).toBeGreaterThanOrEqual(7);  // 10 ± 30%
      expect(ratio).toBeLessThanOrEqual(13);
    });
  });

  describe('buildAbstractionLadder', () => {
    it('creates 4-level hierarchy', async () => {
      const pipeline = new DreamingPipeline(mockReasoningBank, defaultConfig);
      const patterns = generateMockPatterns(5);

      const ladder = await pipeline.buildAbstractionLadder(patterns);

      expect(ladder.levels.length).toBe(4);
      expect(ladder.levels[0].patterns.length).toBeGreaterThanOrEqual(patterns.length);
    });
  });

  describe('verify', () => {
    it('detects vertical inconsistencies', async () => {
      const pipeline = new DreamingPipeline(mockReasoningBank, defaultConfig);
      const knowledge = generateInconsistentKnowledge();

      const result = await pipeline.verify(knowledge);

      expect(result.status).toBe('failed');
      expect(result.checks.verticalConsistency.passed).toBe(false);
    });
  });
});
```

#### Integration Tests
```typescript
describe('DreamingPipeline Integration', () => {
  it('consolidates full session end-to-end', async () => {
    // Setup: Run GRASP loop to generate real experiences
    const solver = new CognitivePuzzleSolver(realReasoningBank);
    const sessionId = await solver.solvePuzzle(testPuzzle);

    // Execute: Run dream cycle
    const pipeline = new DreamingPipeline(realReasoningBank, defaultConfig);
    const knowledge = await pipeline.consolidate(sessionId);

    // Assert: Verify quality
    expect(knowledge.compressionRatio).toBeGreaterThanOrEqual(7);
    expect(knowledge.abstractionLadder.levels.length).toBeGreaterThanOrEqual(3);
    expect(knowledge.verificationStatus).toBe('verified');

    // Assert: Knowledge is retrievable
    const retrieved = await realReasoningBank.getKnowledge(sessionId);
    expect(retrieved).toEqual(knowledge);
  });
});
```

---

## 6. Success Criteria

### 6.1 Functional Correctness

- [ ] **Phase 1 (Capture)**: 100% of GRASP experiences logged to ReasoningBank
- [ ] **Phase 2 (Triage)**: Reduces experience count by 50-80%
- [ ] **Phase 3 (Compression)**: Achieves 7:1 to 13:1 compression ratio
- [ ] **Phase 4 (Abstraction)**: Creates 3-5 level hierarchy
- [ ] **Phase 5 (Integration)**: Identifies ≥5 cross-pattern connections
- [ ] **Verification**: Achieves ≥0.8 verification score

### 6.2 Performance Criteria

- [ ] Full consolidation cycle completes in <60 seconds (typical session)
- [ ] Handles 100+ experiences without degradation
- [ ] Memory usage stays <500MB during consolidation
- [ ] No memory leaks across multiple consolidation cycles

### 6.3 Quality Criteria

- [ ] Abstraction ladder is human-readable and understandable
- [ ] Patterns are actionable (can be applied to future solving)
- [ ] Vertical consistency verified programmatically
- [ ] No contradictions in consolidated knowledge
- [ ] Transfer learning test shows ≥30% improvement

### 6.4 Integration Criteria

- [ ] ReasoningBank stores consolidated knowledge successfully
- [ ] Knowledge is retrievable for future solving sessions
- [ ] GRASP loop can query and apply consolidated patterns
- [ ] Scheduling triggers work reliably

---

## 7. Example Walkthrough

### Session Input
```
Session ID: session-2026-01-04-001
Puzzles solved: 5 (3 easy, 2 medium)
Total experiences captured: 47
Duration: 18 minutes
```

### Phase Execution

**Phase 1: CAPTURE** (automatic during solving)
```
✅ 47 experiences logged to ReasoningBank
   ├── 23 move attempts
   ├── 12 strategy applications
   ├── 8 insight detections
   └── 4 error corrections
```

**Phase 2: TRIAGE**
```
Input: 47 experiences
Output: 18 significant experiences (62% reduction)

Kept:
├── All 8 insights (100% importance)
├── 6/12 strategy applications (successful ones)
├── 3/23 move attempts (breakthrough moments)
└── 1/4 errors (unique learning opportunity)

Filtered:
└── 29 routine moves (low novelty, high similarity)
```

**Phase 3: COMPRESSION**
```
Input: 18 experiences
Output: 4 patterns (11.75:1 compression)

Pattern 1: "Naked Single" (8 experiences)
├── Condition: "Cell has only 1 candidate"
├── Action: "Place that digit immediately"
└── Success rate: 100%

Pattern 2: "Hidden Single" (5 experiences)
├── Condition: "Digit has only 1 position in unit"
├── Action: "Place digit at that position"
└── Success rate: 100%

Pattern 3: "Pointing Pair" (3 experiences)
├── Condition: "Candidates confined to box-line intersection"
├── Action: "Eliminate candidates from rest of line"
└── Success rate: 67%

Pattern 4: "Backtrack on Contradiction" (2 experiences)
├── Condition: "Cell has zero candidates after move"
├── Action: "Undo last move, try alternative"
└── Success rate: N/A (error recovery)
```

**Phase 4: ABSTRACTION**
```
Input: 4 patterns
Output: 4-level abstraction ladder

Level 0 (Specific):
└── 18 concrete instances with full context

Level 1 (Techniques):
└── 4 named techniques (Naked Single, Hidden Single, Pointing Pair, Backtrack)

Level 2 (Categories):
├── "Elimination Strategies" (Naked Single, Hidden Single)
├── "Pattern Recognition" (Pointing Pair)
└── "Error Recovery" (Backtrack)

Level 3 (Principles):
├── "Constraint Propagation" (subsumes Elimination + Pattern Recognition)
└── "Search with Backtracking" (subsumes Error Recovery)

Level 4 (Meta):
└── "Constraint Satisfaction Problem Solving"
```

**Phase 5: INTEGRATION**
```
Cross-connections identified: 6
├── Naked Single → Hidden Single (prerequisite, strength: 0.7)
├── Hidden Single → Pointing Pair (refinement, strength: 0.6)
├── Elimination → Backtrack (complement, strength: 0.8)
└── [3 more connections]

Pruning:
├── Removed 0 redundant patterns (all unique)
└── All patterns meet utility threshold (0.2)
```

**Verification**
```
✅ Vertical consistency: PASS
✅ Horizontal coherence: PASS
✅ Groundedness: PASS
✅ Non-contradiction: PASS
✅ Utility threshold: PASS

Overall score: 0.93 ✅
Status: VERIFIED
```

### Final Output
```typescript
{
  sessionIds: ['session-2026-01-04-001'],
  patterns: [/* 4 patterns */],
  abstractionLadder: {
    levels: [/* 4 levels */],
    domain: 'Sudoku solving',
    createdAt: 1735999200000
  },
  compressionRatio: 11.75,
  verificationStatus: 'verified',
  timestamp: 1735999200000
}
```

---

## 8. References

- POC Strategy Report: `/workspaces/machine-dream/docs/poc-strategy-report.md` (Section 4.2)
- Continuous Thinking Research: `/workspaces/machine-dream/docs/continuous-machine-thinking-research.md`
- ReasoningBank Analysis: `/workspaces/machine-dream/docs/reasoningbank-memory-analysis.md`
- Type Definitions: `/workspaces/machine-dream/src/types.ts`
- GRASP Loop Spec: `/workspaces/machine-dream/docs/specs/03-grasp-loop-spec.md`
- Memory System Spec: `/workspaces/machine-dream/docs/specs/02-memory-system-spec.md`

---

**Document Status**: ✅ Complete Specification
**Ready for Implementation**: Yes
**Dependencies Specified**: ReasoningBank (primary), GRASP Loop, Attention Mechanism
**Next Steps**: Begin implementation of Phase 1-2 during POC Days 6-7
