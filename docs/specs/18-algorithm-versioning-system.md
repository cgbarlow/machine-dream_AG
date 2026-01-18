# Algorithm Versioning System Specification

**Component:** Dreaming Algorithm Versioning System
**Date:** January 13, 2026
**Version:** 1.0
**Status:** Specification

---

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| [ADR-011: Versioned Algorithms](../adr/011-versioned-algorithms.md) | Authorizes this spec |
| [ADR-008: Dreaming Pipeline](../adr/008-dreaming-pipeline.md) | Extends dreaming consolidation |
| [ADR-003: Memory Persistence](../adr/003-memory-persistence.md) | Algorithm metadata storage |

---

## 1. Component Overview

### 1.1 Purpose and Responsibilities

The Algorithm Versioning System provides a pluggable architecture for dreaming consolidation algorithms, enabling:

- **Algorithm Abstraction**: Common interface for clustering experience patterns
- **Version Management**: Automatic tracking of algorithm versions based on code changes
- **A/B Testing**: Simultaneous execution of multiple algorithms for comparison
- **Historical Consistency**: Backward compatibility for existing learning units
- **Scientific Rigor**: Reproducible results with explicit algorithm metadata

### 1.2 Position in Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DREAMING CONSOLIDATION                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DreamingConsolidator                                       │
│         │                                                   │
│         ├──► ClusteringAlgorithm Interface ⭐              │
│         │        │                                          │
│         │        ├──► FastCluster v2 (default)             │
│         │        ├──► DeepCluster v1 (LLM semantic)        │
│         │        └──► LLMCluster v1 (fully LLM-driven)     │
│         │                                                   │
│         └──► AlgorithmRegistry (singleton) ⭐               │
│                   ├── Version tracking                      │
│                   ├── Backward compatibility                │
│                   └── Default selection                     │
│                                                             │
│  Learning Unit Naming:                                      │
│  {profile}_{mode}_{algo}v{version}_{date}[_2x]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Input**: Raw LLM experiences + target strategy count
**Output**: Clustered patterns + algorithm metadata
**Trigger**: Dreaming consolidation (Phase 3: COMPRESSION)

### 1.3 Dependencies on Other Components

| Component | Dependency | Nature |
|-----------|-----------|--------|
| **DreamingConsolidator** | Critical | Delegates clustering to algorithms |
| **LearningUnitManager** | Critical | Stores learning units with algorithm identifiers |
| **CLI (llm dream)** | Integration | Algorithm selection interface |
| **LMStudioClient** | Optional | Required for LLM-based algorithms |

---

## 2. Functional Requirements

### 2.1 Algorithm Interface

#### FR-2.1.1: ClusteringAlgorithm Interface

**Requirement**: System SHALL define a common interface for all clustering algorithms

```typescript
export interface ClusteringResult {
  clusters: Map<string, LLMExperience[]>;
  metadata: {
    totalExperiences: number;
    clustersCreated: number;
    processingTimeMs: number;
  };
}

export interface AlgorithmMetadata {
  name: string;              // "FastCluster"
  version: number;           // 2
  identifier: string;        // "fastclusterv2"
  description: string;
  codeHash: string;         // For auto-versioning
  createdAt: Date;
}

export interface ClusteringAlgorithm {
  cluster(
    experiences: LLMExperience[],
    targetCount: number,
    config: LLMConfig
  ): Promise<ClusteringResult>;

  getMetadata(): AlgorithmMetadata;
  getName(): string;
  getVersion(): number;
  getIdentifier(): string;  // "fastclusterv2"
}
```

**Validation**:
- ✅ All algorithms MUST implement the interface
- ✅ `cluster()` MUST return between 1 and `targetCount * 2` clusters
- ✅ Identifier MUST be lowercase alphanumeric: `{name}v{version}`
- ✅ Code hash MUST be computed from algorithm implementation file

#### FR-2.1.2: BaseClusteringAlgorithm Abstract Class

**Requirement**: System SHALL provide a base implementation for common functionality

```typescript
export abstract class BaseClusteringAlgorithm implements ClusteringAlgorithm {
  protected metadata: AlgorithmMetadata;

  constructor(metadata: AlgorithmMetadata) {
    this.metadata = metadata;
  }

  abstract cluster(
    experiences: LLMExperience[],
    targetCount: number,
    config: LLMConfig
  ): Promise<ClusteringResult>;

  getMetadata(): AlgorithmMetadata { return this.metadata; }
  getName(): string { return this.metadata.name; }
  getVersion(): number { return this.metadata.version; }
  getIdentifier(): string { return this.metadata.identifier; }
}
```

**Validation**:
- ✅ Concrete algorithms MUST extend `BaseClusteringAlgorithm`
- ✅ Metadata accessor methods MUST NOT be overridden

### 2.2 Algorithm Registry

#### FR-2.2.1: Singleton Registry Pattern

**Requirement**: System SHALL maintain a single global registry of available algorithms

```typescript
export class AlgorithmRegistry {
  private static instance: AlgorithmRegistry;
  private algorithms: Map<string, AlgorithmEntry[]>;  // name -> versions
  private defaultAlgorithm: string;

  private constructor() {
    this.algorithms = new Map();
    this.defaultAlgorithm = 'FastCluster';
  }

  static getInstance(): AlgorithmRegistry;

  register(algorithm: ClusteringAlgorithm, isDefault?: boolean): void;
  getAlgorithm(name: string, version?: number): ClusteringAlgorithm | null;
  getAllAlgorithms(): ClusteringAlgorithm[];
  getDefaultAlgorithm(): ClusteringAlgorithm;
  setDefaultAlgorithm(name: string): void;
  mapLegacyUnit(unitName: string): string;
}
```

**Validation**:
- ✅ Registry MUST prevent duplicate version registration
- ✅ Registry MUST return latest version when version not specified
- ✅ Registry MUST initialize with FastCluster v2 as default
- ✅ Legacy unit mapping MUST insert default algorithm identifier

#### FR-2.2.2: Version Tracking

**Requirement**: System SHALL track multiple versions of the same algorithm

**Rules**:
- Latest version is returned when no version specified
- All versions remain accessible for reproducibility
- Versions are sorted in descending order (latest first)
- Duplicate versions throw error on registration

**Example**:
```typescript
registry.register(new FastClusterV1());  // Historical
registry.register(new FastClusterV2());  // Current

registry.getAlgorithm('FastCluster');      // Returns v2
registry.getAlgorithm('FastCluster', 1);   // Returns v1
```

#### FR-2.2.3: Backward Compatibility

**Requirement**: System SHALL map legacy learning unit names to default algorithm

**Mapping Rules**:
```typescript
// Legacy format: {profile}_{mode}_{date}[_2x]
"gpt-oss-120b_aisp_20260113"
// Maps to: {profile}_{mode}_{algo}v{version}_{date}[_2x]
"gpt-oss-120b_aisp_fastclusterv2_20260113"

// Already has algorithm: no change
"gpt-oss-120b_aisp_deepclusterv1_20260113"
// Returns: "gpt-oss-120b_aisp_deepclusterv1_20260113"
```

**Algorithm**:
1. Check if unit name contains `_(fastcluster|deepcluster|llmcluster)v\d+_`
2. If yes, return unchanged
3. If no, find date pattern `_(\d{8})`
4. Insert default algorithm identifier before date
5. If no date found, append algorithm identifier to end

**Validation**:
- ✅ Legacy units MUST be retrievable without explicit algorithm
- ✅ Mapped units MUST resolve to actual learning units
- ✅ Mapping MUST be deterministic (same input → same output)

---

## 3. Algorithm Specifications

### 3.1 FastCluster v2 (Default)

#### 3.1.1 Overview

**Name**: FastCluster
**Version**: 2
**Identifier**: `fastclusterv2`
**Approach**: Keyword-based clustering with forced subdivision for dominant clusters

**Performance Targets**:
- Speed: <5 seconds for 500 experiences
- Quality: 5-15 semantically coherent clusters
- Memory: <100MB peak usage

#### 3.1.2 Algorithm Description

**Phase 1: Keyword Clustering**
```typescript
// Extract reasoning signature from each experience
const keywordDepth = target >= 6 ? 4 : target >= 4 ? 3 : 2;
const signature = extractReasoningSignature(reasoning, keywordDepth);

// Group experiences by signature
clusters.set(signature, [...experiences]);
```

**Reasoning Keywords** (priority order):
1. "only candidate"
2. "forced"
3. "intersection"
4. "constraint"
5. "must be"
6. "unique"
7. "eliminated"
8. "remaining"
9. "possible"
10. "candidates"

**Phase 2: Dominant Cluster Check** (NEW in v2)
```typescript
const totalExperiences = experiences.length;
const hasDominantCluster = Array.from(clusters.values())
  .some(cluster => cluster.length > totalExperiences * 0.4);
```

**Phase 3: Subdivision (if needed)**
```typescript
if (clusters.size < target || hasDominantCluster) {
  return subdivideClustersByContent(clusters, target);
}
```

#### 3.1.3 Key Difference from v1

**v1 Behavior** (buggy):
- Subdivision triggered only when `clusters.size < target`
- AISP creates 11 clusters (>target of 10) → no subdivision
- "general_reasoning" dominates with 71% of experiences

**v2 Behavior** (fixed):
- Subdivision triggered when `clusters.size < target` OR dominant cluster >40%
- Forces subdivision even when cluster count meets target
- Prevents single cluster from dominating consolidation

#### 3.1.4 Validation Criteria

**Success Criteria**:
- ✅ Doubled mode (target=10) creates MORE strategies than standard mode (target=5)
- ✅ No single cluster contains >50% of experiences after subdivision
- ✅ All clusters have at least 2 experiences (no singletons)
- ✅ Processing time <5 seconds for 500 experiences

### 3.2 DeepCluster v1

#### 3.2.1 Overview

**Name**: DeepCluster
**Version**: 1
**Identifier**: `deepclusterv1`
**Approach**: Two-phase clustering (keyword + LLM semantic split for large clusters)

**Performance Targets**:
- Speed: <60 seconds for 500 experiences
- Quality: 8-20 semantically diverse clusters
- Memory: <200MB peak usage

#### 3.2.2 Algorithm Description

**Phase 1: Keyword Clustering**
```typescript
// Reuse FastCluster v2 keyword clustering logic
const initialClusters = clusterByKeywords(experiences, targetCount);
```

**Phase 2: LLM Semantic Split** (for clusters >50 experiences)
```typescript
for (const [name, cluster] of initialClusters) {
  if (cluster.length > 50) {
    // Sample 30-50 representative experiences
    const sampled = sampleRepresentative(cluster, 40);

    // Ask LLM to identify 4-8 semantic patterns
    const patterns = await llmIdentifyPatterns(sampled, name);

    // Categorize all cluster experiences by patterns
    const subClusters = categorizeByPatterns(cluster, patterns);

    // Add subclusters to result
    for (const [subName, subCluster] of subClusters) {
      refinedClusters.set(`${name}_${subName}`, subCluster);
    }
  } else {
    refinedClusters.set(name, cluster);
  }
}
```

**LLM Prompt Template**:
```
You have {N} Sudoku move experiences labeled "{cluster_name}".

Analyze the REASONING PATTERNS, not positions or values.

What distinct reasoning approaches do you see? Examples:
- 'Only candidate elimination' vs 'Forced by constraint intersection'
- 'Single-step deduction' vs 'Multi-step logical chain'
- 'Box-focused' vs 'Row-column intersection'

Identify 4-8 semantically distinct categories.

For each category, provide:
1. Category name (describes reasoning approach)
2. When this pattern is used (what makes it distinct)
3. Example IDs that match this pattern

Samples:
{experience samples with IDs and reasoning}

Output format:
PATTERN_1: [name]
WHEN: [description]
EXAMPLES: [comma-separated IDs]
```

#### 3.2.3 Validation Criteria

**Success Criteria**:
- ✅ Clusters >50 experiences are subdivided by LLM
- ✅ Semantic patterns are distinct (>60% inter-cluster dissimilarity)
- ✅ Processing time <60 seconds for 500 experiences
- ✅ Graceful fallback to keyword-only if LLM fails

### 3.3 LLMCluster v1

#### 3.3.1 Overview

**Name**: LLMCluster
**Version**: 1
**Identifier**: `llmclusterv1`
**Approach**: Fully LLM-driven pattern identification and categorization

**Performance Targets**:
- Speed: <180 seconds for 500 experiences
- Quality: 10-25 highly semantic clusters
- Memory: <300MB peak usage

#### 3.3.2 Algorithm Description

**Step 1: Balanced Sampling**
```typescript
// Sample 100-150 experiences (balanced by difficulty/success)
const sampled = sampleBalanced(experiences, 150);
```

**Step 2: Pattern Identification**
```typescript
// Ask LLM to identify 10-15 distinct reasoning patterns
const patterns = await llmIdentifyPatterns(sampled, targetCount);
```

**LLM Prompt Template**:
```
Analyze {N} Sudoku solving experiences.

Identify {M} distinct reasoning patterns (aim for ~10-15 patterns).

For each pattern:
1. Name (concise, describes approach)
2. Description (when and why this pattern is used)
3. Keywords (terms that signal this pattern)
4. Example experience IDs

Experiences:
{experience samples with IDs and full reasoning}

Output format:
PATTERN_1: [name]
DESC: [description]
KEYWORDS: [comma-separated]
EXAMPLES: [IDs]
```

**Step 3: Full Categorization**
```typescript
// Categorize ALL experiences using identified patterns
for (const exp of experiences) {
  const pattern = matchBestPattern(exp, patterns);
  clusters.get(pattern.name).push(exp);
}
```

#### 3.3.3 Validation Criteria

**Success Criteria**:
- ✅ Patterns are semantically distinct (>70% inter-cluster dissimilarity)
- ✅ Pattern descriptions are actionable and clear
- ✅ Processing time <180 seconds for 500 experiences
- ✅ At least 80% of experiences match a pattern (not "uncategorized")

#### 3.3.4 Performance Options (Added 2026-01-14)

LLMCluster v1 supports CLI switches for performance tuning:

| Option | Default | Description |
|--------|---------|-------------|
| `--batch-size <n>` | 50 | Experiences per LLM categorization batch |
| `--parallel-batches <n>` | 3 | Number of concurrent batch requests |
| `--hybrid` | false | Use keyword matching for high-confidence, LLM for uncertain |
| `--no-cache` | false | Disable pattern caching |

**Configuration Interface**:
```typescript
export interface LLMClusterConfig {
  batchSize: number;        // Default: 50
  parallelBatches: number;  // Default: 3
  hybridMode: boolean;      // Default: false
  useCache: boolean;        // Default: true
}
```

**Batch Processing**:
- Experiences are grouped into batches of `batchSize`
- Multiple batches can run concurrently with `parallelBatches`
- Example: 1000 experiences, batch=100, parallel=3 → ~4x speedup

**Hybrid Mode**:
- First attempts keyword matching for high-confidence categorization
- Only uses LLM for uncertain experiences
- Reduces API calls and processing time
- Maintains quality for ambiguous cases

**Pattern Caching**:
- Caches pattern assignments by experience ID
- Avoids re-categorizing identical experiences
- Default enabled; disable with `--no-cache`

**CLI Usage**:
```bash
# Larger batches (fewer API calls, may be slower per call)
machine-dream llm dream run --algorithm llmcluster --batch-size 100

# Parallel processing (faster, more API load)
machine-dream llm dream run --algorithm llmcluster --parallel-batches 3

# Hybrid mode (keyword + LLM)
machine-dream llm dream run --algorithm llmcluster --hybrid

# Disable caching (fresh categorization)
machine-dream llm dream run --algorithm llmcluster --no-cache
```

### 3.4 FastCluster v3 (AISP Support)

#### 3.4.1 Overview

**Name**: FastCluster
**Version**: 3
**Identifier**: `fastclusterv3`
**Approach**: FastCluster v2 with AISP cluster naming and encoding support

**Performance Targets**:
- Speed: <5 seconds for 500 experiences (same as v2)
- Quality: 5-15 semantically coherent clusters with AISP naming
- Memory: <100MB peak usage

#### 3.4.2 Algorithm Description

Extends FastClusterV2 with AISP mode support:

**AISP Cluster Naming** (when `aispMode === 'aisp-full'`):
```typescript
protected formatClusterName(keywords: string[]): string {
  if (this.aispMode === 'aisp-full') {
    // "only candidate" -> ⟦Λ:Cluster.OnlyCandidate⟧
    return `⟦Λ:Cluster.${this.toAISPIdentifier(keywords)}⟧`;
  }
  return keywords.join('_');  // v2 behavior
}

private toAISPIdentifier(keywords: string[]): string {
  // Convert to PascalCase: "only candidate" -> "OnlyCandidate"
  return keywords.map(k => k.split(' ').map(w =>
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join('')).join('');
}
```

**Backward Compatibility**:
- When `aispMode === 'off'`: Identical behavior to FastClusterV2
- Only cluster names change in AISP mode; clustering logic remains the same

#### 3.4.3 Validation Criteria

**Success Criteria**:
- ✅ All FastClusterV2 tests pass when `aispMode === 'off'`
- ✅ Cluster names use `⟦Λ:Cluster.Name⟧` format when `aispMode === 'aisp-full'`
- ✅ Cluster contents are identical to v2 (only naming changes)

### 3.5 DeepCluster v2 (AISP Support)

#### 3.5.1 Overview

**Name**: DeepCluster
**Version**: 2
**Identifier**: `deepclusterv2`
**Approach**: DeepCluster v1 with AISP LLM prompts and validation

**Performance Targets**:
- Speed: <60 seconds for 500 experiences (same as v1)
- Quality: 8-20 semantically diverse clusters with AISP formatting
- Memory: <200MB peak usage

#### 3.5.2 Algorithm Description

Extends DeepClusterV1 with AISP mode support:

**Phase 2: AISP Semantic Split** (when `aispMode === 'aisp-full'`):
```typescript
// Build AISP prompt for pattern identification
private buildAISPSemanticSplitPrompt(
  clusterName: string,
  experiences: LLMExperience[]
): string {
  const date = new Date().toISOString().split('T')[0];
  return `𝔸1.0.sudoku.semantic.split@${date}
γ≔sudoku.pattern.identification
ρ≔⟨cluster,patterns,categorization⟩

${this.aispBuilder.getAISPGenerationSpec()}

⟦Γ:Context⟧{
  cluster≜"${clusterName}"
  experience_count≜${experiences.length}
  task≜identify(semantic_patterns)→categorize
}

⟦Σ:Experiences⟧{
  ${experiences.map((e, i) => `exp[${i}]≔"${e.reasoning.substring(0, 100)}..."`).join('\n  ')}
}

⟦Ε:Output⟧{
  format≔⟦Λ:Pattern.Name⟧{
    desc≔when_applicable
    keywords≔{terms}
    examples≔{exp_ids}
  }
  ∀output:syntax∈AISP
  ¬prose
}`;
}

// Parse AISP pattern response
private parseAISPPatternResponse(response: string): SemanticPattern[] {
  // Extract ⟦Λ:Pattern.Name⟧{...} blocks
  const patternRegex = /⟦Λ:Pattern\.(\w+)⟧\{([^}]+)\}/g;
  // ... pattern extraction logic
}
```

**AISP Validation**:
- All LLM responses validated using `AISPValidatorService`
- On tier ⊘ (δ < 0.20): Request LLM critique, fallback to English parsing
- Log warnings for tier ◊⁻ (δ < 0.40)

**Backward Compatibility**:
- When `aispMode === 'off'`: Identical behavior to DeepClusterV1

#### 3.5.3 Validation Criteria

**Success Criteria**:
- ✅ All DeepClusterV1 tests pass when `aispMode === 'off'`
- ✅ LLM prompts use AISP syntax when `aispMode === 'aisp-full'`
- ✅ aisp-validator validates prompts with tier ≥ ◊⁻ (δ ≥ 0.20)
- ✅ Graceful fallback on AISP validation failure

### 3.6 LLMCluster v2 (AISP Support)

#### 3.6.1 Overview

**Name**: LLMCluster
**Version**: 2
**Identifier**: `llmclusterv2`
**Approach**: Full AISP prompts for pattern identification, categorization, and refinement

**Note**: LLMClusterV2 receives an in-place update to add AISP support. The version identifier remains `llmclusterv2` but the codeHash changes.

#### 3.6.2 AISP Prompt Types

When `aispMode === 'aisp-full'`, all four prompt types use AISP syntax:

1. **Pattern Identification**: `buildAISPMutuallyExclusivePrompt()`
2. **Self-Critique**: `buildAISPSelfCritiquePrompt()`
3. **Categorization**: `buildAISPCategorizationSystemPrompt()` + `buildAISPCategorizationBatchPrompt()`
4. **Refinement**: `buildAISPRefinementPrompt()`

#### 3.6.3 AISP Validation

- All LLM responses validated using `AISPValidatorService.validateWithCritique()`
- Validation tiers: ◊⁺⁺ (δ≥0.75), ◊⁺ (δ≥0.60), ◊ (δ≥0.40), ◊⁻ (δ≥0.20), ⊘ (δ<0.20)
- On tier ⊘: Request LLM critique for guidance, fallback to English parsing

#### 3.6.4 Validation Criteria

**Success Criteria**:
- ✅ All existing LLMClusterV2 tests pass when `aispMode === 'off'`
- ✅ All prompts use AISP syntax when `aispMode === 'aisp-full'`
- ✅ aisp-validator reports tier ≥ ◊⁻ for generated prompts
- ✅ LLM critique logged on validation failure

### 3.7 LLMCluster v3 (Scale-Aware Pattern Diversity)

#### 3.7.1 Overview

**Name**: LLMCluster
**Version**: 3
**Identifier**: `llmclusterv3`
**Approach**: Scale-aware LLM-driven pattern identification with diversity breadth

**Performance Targets**:
- Speed: <180s for 500 experiences (same as v2)
- Quality: 10-25 highly semantic clusters with diverse reasoning approaches
- Memory: <300MB peak usage

#### 3.7.2 Improvements over v2

1. **Explicit 1-indexed pattern numbering**: All prompts emphasize that patterns are numbered P1 through PN, never P0. This fixes categorization bugs where LLMs incorrectly used P0.

2. **Broader pattern definitions**: Pattern identification prompts emphasize REASONING APPROACHES (constraint-based, elimination-based, completion-based, multi-constraint) rather than constraint variations. Prevents creating separate patterns for "row constraint" vs "column constraint" vs "box constraint".

3. **Self-critique breadth checking**: The self-critique step now checks for pattern BREADTH across different reasoning approaches, not just mutual exclusivity. If 5+ patterns are all variations of "constraint", the critique requests revision.

4. **AISP 1-indexed emphasis**: All AISP prompts include explicit comments that pattern numbers are 1-indexed (P1, P2, P3...) and never P0.

#### 3.7.3 When to Use

**Use LLMCluster v3 when**:
- Running 10x or larger batches (371+ experiences)
- AISP mode is enabled and categorization has been producing too many "uncategorized" results
- Pattern diversity has been insufficient (all patterns are variations of the same technique)

**Default**: LLMCluster v3 replaces v2 for new consolidations.

#### 3.7.4 Validation Criteria

**Success Criteria**:
- ✅ All LLMClusterV2 tests pass (backward compatible)
- ✅ 1x mode produces 3-5 strategies (not 1)
- ✅ 2x mode produces 6-10 strategies
- ✅ No P0 pattern assignments in categorization output
- ✅ Patterns span at least 2 different reasoning approaches

---

## 4. Learning Unit Naming Convention

### 4.1 Naming Format

**Standard Format**:
```
{profile}_{mode}_{algo}v{version}_{date}[_2x][_collision]
```

**Components**:
- `profile`: LLM profile name (e.g., "gpt-oss-120b", "qwen3-8b")
- `mode`: Consolidation mode ("standard", "aisp", "aisp-full")
- `algo`: Algorithm name lowercase (e.g., "fastcluster", "deepcluster")
- `version`: Algorithm version number (e.g., "2", "1")
- `date`: Creation date YYYYMMDD (e.g., "20260113")
- `_2x`: Optional suffix for doubled strategy count
- `_collision`: Optional numeric suffix for name collision (e.g., "_01", "_02")

**Examples**:
```
gpt-oss-120b_standard_fastclusterv2_20260113
gpt-oss-120b_standard_fastclusterv2_20260113_2x
gpt-oss-120b_aisp_deepclusterv1_20260113
qwen3-8b_standard_llmclusterv1_20260113_2x
```

### 4.2 Legacy Format Support

**Legacy Format** (before algorithm versioning):
```
{profile}_{mode}_{date}[_2x]
```

**Examples**:
```
gpt-oss-120b_aisp_20260113         → gpt-oss-120b_aisp_fastclusterv2_20260113
qwen3-8b_standard_20260112_2x      → qwen3-8b_standard_fastclusterv2_20260112_2x
```

**Mapping Rules**:
1. Detect legacy format (no algorithm identifier)
2. Insert default algorithm identifier before date
3. Preserve all other components (_2x, collision suffixes)

---

## 5. CLI Integration

### 5.1 Command Options

#### FR-5.1.1: Algorithm Selection

**Command**: `machine-dream llm dream run`

**Options**:
```bash
--algorithm <name>           # Single algorithm (e.g., "fastcluster")
--algorithms <list>          # Comma-separated list (e.g., "fastcluster,deepcluster")
--algorithm-version <num>    # Specific version (e.g., "2")
```

**Default Behavior** (no algorithm options):
- Run ALL registered algorithms (latest versions)
- Sequential execution (one after another)
- Creates learning units for each algorithm

**Examples**:
```bash
# Default: Run all algorithms (latest versions)
machine-dream llm dream run --profile gpt-oss-120b

# Run single algorithm (latest version)
machine-dream llm dream run --profile gpt-oss-120b --algorithm fastcluster

# Run specific version
machine-dream llm dream run --profile gpt-oss-120b --algorithm fastcluster --algorithm-version 1

# Run multiple algorithms
machine-dream llm dream run --profile gpt-oss-120b --algorithms fastcluster,deepcluster

# With other options
machine-dream llm dream run --profile gpt-oss-120b --aisp --dual-unit
# Creates:
#   gpt-oss-120b_aisp_fastclusterv2_20260113
#   gpt-oss-120b_aisp_fastclusterv2_20260113_2x
#   gpt-oss-120b_aisp_deepclusterv1_20260113
#   gpt-oss-120b_aisp_deepclusterv1_20260113_2x
#   gpt-oss-120b_aisp_llmclusterv1_20260113
#   gpt-oss-120b_aisp_llmclusterv1_20260113_2x
```

#### FR-5.1.2: Algorithm Information

**Command**: `machine-dream llm algorithm`

**Subcommands**:
```bash
# List all available algorithms
machine-dream llm algorithm list

# Show algorithm details
machine-dream llm algorithm info <name> [version]

# Show default algorithm
machine-dream llm algorithm default
```

**Example Output**:
```
Available Dreaming Algorithms:

FastCluster v2 (default)
  Identifier: fastclusterv2
  Speed: Fast (<5s for 500 experiences)
  Approach: Keyword clustering + forced subdivision
  Status: Production-ready

DeepCluster v1
  Identifier: deepclusterv1
  Speed: Medium (<60s for 500 experiences)
  Approach: Two-phase (keyword + LLM semantic)
  Status: Experimental

LLMCluster v1
  Identifier: llmclusterv1
  Speed: Slow (<180s for 500 experiences)
  Approach: Fully LLM-driven
  Status: Research
```

### 5.2 Learning Unit Output

**Console Output** (after consolidation):
```
✅ DUAL consolidation complete:
   Standard "gpt-oss-120b_aisp_fastclusterv2_20260113": 3 strategies
   Doubled "gpt-oss-120b_aisp_fastclusterv2_20260113_2x": 7 strategies

✅ DUAL consolidation complete:
   Standard "gpt-oss-120b_aisp_deepclusterv1_20260113": 4 strategies
   Doubled "gpt-oss-120b_aisp_deepclusterv1_20260113_2x": 9 strategies

✅ DUAL consolidation complete:
   Standard "gpt-oss-120b_aisp_llmclusterv1_20260113": 5 strategies
   Doubled "gpt-oss-120b_aisp_llmclusterv1_20260113_2x": 11 strategies

🎉 All algorithms complete (3)
  fastclusterv2: 3/7 strategies
  deepclusterv1: 4/9 strategies
  llmclusterv1: 5/11 strategies
```

---

## 6. Performance Requirements

### 6.1 Algorithm Performance Benchmarks

| Algorithm | Speed Target | Quality Target | Memory Target |
|-----------|-------------|----------------|---------------|
| **FastCluster v2** | <5s (500 exp) | 5-15 clusters | <100MB |
| **DeepCluster v1** | <60s (500 exp) | 8-20 clusters | <200MB |
| **LLMCluster v1** | <180s (500 exp) | 10-25 clusters | <300MB |

**Measurement Points**:
- `ClusteringResult.metadata.processingTimeMs`: Algorithm execution time
- Peak memory: Measured during algorithm execution
- Cluster quality: Inter-cluster dissimilarity score

### 6.2 Registry Performance

**Requirements**:
- Algorithm lookup: <1ms (O(1) access by name)
- Version resolution: <1ms (sorted array scan)
- Legacy mapping: <5ms (regex pattern matching)

---

## 7. Testing Requirements

### 7.1 Unit Tests

#### Test Coverage Requirements:
- Algorithm interface: 100% (all methods)
- Registry: 100% (all public methods)
- Each concrete algorithm: >80% (core logic)

#### Key Test Cases:

**ClusteringAlgorithm Interface**:
- ✅ Metadata accessor methods
- ✅ Identifier format validation (`{name}v{version}`)
- ✅ Code hash computation

**AlgorithmRegistry**:
- ✅ Registration and retrieval
- ✅ Version sorting (descending)
- ✅ Duplicate version prevention
- ✅ Legacy unit mapping
- ✅ Default algorithm behavior

**FastCluster v2**:
- ✅ Keyword clustering correctness
- ✅ Dominant cluster detection (>40%)
- ✅ Forced subdivision when dominant
- ✅ Keyword depth variation (2, 3, 4)
- ✅ Spatial subdivision by row region

**DeepCluster v1**:
- ✅ Two-phase clustering execution
- ✅ LLM semantic split for clusters >50
- ✅ Fallback behavior on LLM failure
- ✅ Pattern parsing correctness

**LLMCluster v1**:
- ✅ Balanced sampling by difficulty
- ✅ LLM pattern identification
- ✅ Experience categorization
- ✅ Fallback on LLM failure

### 7.2 Integration Tests

**DreamingConsolidator Integration**:
- ✅ Algorithm delegation correctness
- ✅ Metadata included in consolidation report
- ✅ Learning unit naming with algorithm identifier

**CLI Integration**:
- ✅ Algorithm selection via flags
- ✅ Sequential execution of multiple algorithms
- ✅ Learning unit creation for each algorithm

**Backward Compatibility**:
- ✅ Legacy unit retrieval without algorithm suffix
- ✅ Mapping correctness
- ✅ Fallback behavior

### 7.3 Bug Fix Verification

**AISP Doubled Mode Bug**:
- ✅ Standard mode (target=5): Creates 3-5 strategies
- ✅ Doubled mode (target=10): Creates 6-10 strategies (NOT 3!)
- ✅ Dominant cluster check triggers subdivision
- ✅ "general_reasoning" cluster <50% of experiences after subdivision

**Test Setup**:
```bash
# Reset experiences
node scripts/reset-aisp-experiences.js

# Run dream with FastCluster v2
machine-dream llm dream run --profile gpt-oss-120b --algorithm fastcluster

# Verify learning units
machine-dream llm learning show gpt-oss-120b_standard_fastclusterv2_20260113_2x --profile gpt-oss-120b
# Expected: 6-10 strategies (NOT 3)
```

---

## 8. Migration Strategy

### 8.1 Existing Learning Units

**Scenario**: User has learning units created before algorithm versioning

**Migration Approach**: Transparent backward compatibility (no migration required)

**Mechanism**:
1. `LearningUnitManager.getLearningUnit(unitId)` called with legacy ID
2. Direct lookup fails (unit not found)
3. Registry maps legacy ID to default algorithm ID
4. Retry lookup with mapped ID
5. Return learning unit if found

**Example**:
```typescript
// User requests legacy unit
await manager.getLearningUnit('gpt-oss-120b_aisp_20260113');

// Internal flow:
// 1. Try direct: 'gpt-oss-120b_aisp_20260113' → NOT FOUND
// 2. Map legacy: 'gpt-oss-120b_aisp_fastclusterv2_20260113'
// 3. Try mapped: 'gpt-oss-120b_aisp_fastclusterv2_20260113' → FOUND
// 4. Log: "📦 Mapping legacy unit..."
// 5. Return learning unit
```

### 8.2 Storage Migration

**No storage migration required.**

**Rationale**:
- New learning units use new naming format
- Old learning units remain unchanged
- Registry provides transparent mapping
- Both formats coexist indefinitely

---

## 9. Security and Safety

### 9.1 Code Hash Integrity

**Requirement**: Algorithm version MUST be traceable to specific code implementation

**Implementation**:
```typescript
import crypto from 'crypto';
import fs from 'fs';

function computeCodeHash(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 8);
}
```

**Usage**:
```typescript
new FastClusterV2({
  name: 'FastCluster',
  version: 2,
  codeHash: computeCodeHash(__filename),  // Auto-computed
  // ...
});
```

**Purpose**:
- Detect unintended code changes
- Verify reproducibility of results
- Enable forensic analysis of learning unit creation

### 9.2 LLM-Based Algorithm Safety

**Concerns**:
- LLM API failures
- Malformed LLM responses
- Unexpected token costs
- Timeout issues

**Mitigations**:
- **Graceful Degradation**: Fallback to keyword-only clustering on LLM failure
- **Timeout Protection**: 60-second timeout for LLM calls
- **Cost Limits**: Sample-based approach (40-150 experiences, not all)
- **Response Validation**: Parse and validate LLM pattern output
- **Error Logging**: Detailed error messages for debugging

---

## 10. Monitoring and Observability

### 10.1 Algorithm Metrics

**Metrics to Track**:
```typescript
interface AlgorithmMetrics {
  algorithmName: string;
  algorithmVersion: number;
  processingTimeMs: number;
  clustersCreated: number;
  totalExperiences: number;
  strategiesSynthesized: number;
  timestamp: Date;
}
```

**Console Logging**:
```
🔧 Using clustering algorithm: fastclusterv2
🔍 Clustering 893 experiences with fastclusterv2...
✅ Created 11 clusters in 1247ms
✅ FastCluster v2 complete: 3 strategies
```

### 10.2 Consolidation Report Extension

**Added to `ConsolidationReport`**:
```typescript
export interface ConsolidationReport {
  // ... existing fields ...
  algorithmUsed?: {
    name: string;
    version: number;
    identifier: string;
  };
}
```

**Purpose**: Track which algorithm produced each learning unit

---

## 11. Future Extensions

### 11.1 Planned Enhancements

**v1.1 Features** (future):
- GUI algorithm selection in TUI
- Algorithm performance comparison dashboard
- Automatic algorithm recommendation based on experience characteristics
- Cross-algorithm ensemble methods

**v2.0 Features** (future):
- Custom algorithm plugins
- Algorithm A/B test automation
- Multi-stage hybrid algorithms
- Neural network-based clustering

### 11.2 Research Opportunities

**Open Questions**:
- What is the optimal cluster count for different experience volumes?
- How do algorithm choices affect downstream solve performance?
- Can we predict best algorithm based on experience characteristics?
- Should we blend strategies from multiple algorithms?

---

## 12. References

### 12.1 Related Specifications

- [Spec 05: Dreaming Pipeline](./05-dreaming-pipeline-spec.md)
- [Spec 11: LLM Sudoku Player](./11-llm-sudoku-player.md)
- [Spec 13: Profile Management](./13-llm-profile-management.md)

### 12.2 Related ADRs

- [ADR-011: Versioned Algorithms](../adr/011-versioned-algorithms.md)
- [ADR-008: Dreaming Pipeline](../adr/008-dreaming-pipeline.md)
- [ADR-005: Learning Units](../adr/005-learning-units.md)

### 12.3 Implementation Files

**New Files**:
- `src/llm/clustering/ClusteringAlgorithm.ts`
- `src/llm/clustering/AlgorithmRegistry.ts`
- `src/llm/clustering/FastClusterV2.ts`
- `src/llm/clustering/DeepClusterV1.ts`
- `src/llm/clustering/LLMClusterV1.ts`
- `src/llm/clustering/index.ts`

**Modified Files**:
- `src/llm/DreamingConsolidator.ts` (remove clustering methods, add delegation)
- `src/llm/types.ts` (add `algorithmUsed` to `ConsolidationReport`)
- `src/cli/commands/llm.ts` (add algorithm selection options)

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Algorithm** | A specific clustering implementation (FastCluster, DeepCluster, LLMCluster) |
| **Version** | Integer version number of an algorithm (e.g., v2) |
| **Identifier** | Lowercase name + version (e.g., "fastclusterv2") |
| **Clustering** | Process of grouping similar experiences into pattern categories |
| **Dominant Cluster** | A cluster containing >40% of total experiences |
| **Subdivision** | Splitting large clusters into smaller semantic groups |
| **Legacy Unit** | Learning unit created before algorithm versioning system |
| **Doubled Mode** | Consolidation with 2x strategy count (6-10 vs 3-5) |
| **AISP Mode** | AI Specification Protocol for low-ambiguity prompts |

---

**Document Status**: ✅ Complete and Approved
**Implementation Status**: Pending (see ADR-011 for implementation plan)
