# ADR-011: Versioned Dreaming Algorithms Architecture

**Date:** 2026-01-13
**Status:** accepted
**Decision Makers:** Project Team
**Master ADR:** ADR-000

## Context

In the context of consolidating LLM experiences through dreaming pipeline clustering,
facing the choice between a single fixed clustering algorithm, manually managed algorithm variations, or a versioned plugin architecture,
we identified a critical bug where AISP mode produces identical strategy counts in both standard and doubled modes (Phase 1: 3 strategies, Phase 2: 3 strategies instead of 6-10) due to dominant cluster issue.

## Decision

We decided for a pluggable versioned algorithm architecture with automatic version tracking, supporting three initial algorithms (FastCluster v2 with dominant cluster fix, DeepCluster v1 with two-phase LLM clustering, LLMCluster v1 fully LLM-driven),
and neglected single monolithic clustering approach and manual algorithm management,

## Consequences

To achieve bug fix for doubled mode, enable scientific A/B testing of clustering approaches, and maintain reproducibility with explicit algorithm metadata,
accepting additional architectural complexity, versioning system overhead, and sequential execution time for multiple algorithms.

## WH(Y) Summary

> "In the context of dreaming consolidation clustering, facing dominant cluster bug and need for algorithm experimentation, we decided for versioned pluggable algorithm architecture with three initial implementations, and neglected monolithic fixed approach, to achieve bug fix, scientific rigor, and reproducible A/B testing, accepting architectural complexity and sequential execution overhead."

---

## Rationale

### 1. Root Cause Analysis

**Dominant Cluster Bug**:
- Current `clusterByReasoning()` uses keyword-based clustering with `extractReasoningSignature()`
- `keywordDepth` increases from 3 to 4 when target increases from 5 to 10
- However, most reasoning texts contain ≤3 keywords, so `slice(0, 4)` doesn't help
- AISP produces 11 initial clusters (>target of 10), preventing subdivision
- "general_reasoning" cluster dominates with 634/893 experiences (71%)
- Result: Phase 1 and Phase 2 produce identical 3 strategies

**Fix Requirements**:
- Force subdivision when any cluster >40% of experiences
- Enable semantic (not spatial) diversity in clustering
- Support A/B testing of different clustering approaches

### 2. Why Versioned Architecture?

**Scientific Reproducibility**:
- Each learning unit must be traceable to specific algorithm version
- Code changes should increment version automatically (via code hash)
- Historical learning units remain valid and reproducible

**Algorithm Experimentation**:
- Enable A/B testing: FastCluster vs DeepCluster vs LLMCluster
- Compare clustering quality across approaches
- Measure impact on downstream solve performance

**Backward Compatibility**:
- Existing learning units (pre-versioning) continue to work
- Legacy unit names map transparently to default algorithm
- No manual migration required

### 3. Why Three Algorithms?

| Algorithm | Speed | Approach | Use Case |
|-----------|-------|----------|----------|
| **FastCluster v2** | Fast (<5s) | Keyword + forced subdivision | Production default, bug fix |
| **DeepCluster v1** | Medium (<60s) | Keyword + LLM semantic | Better semantic quality |
| **LLMCluster v1** | Slow (<180s) | Fully LLM-driven | Research, maximum quality |

**Design Philosophy**:
- Fast default for production use
- Medium option for quality improvement
- Slow option for research and maximum LLM leverage
- All three run by default for comprehensive A/B testing

---

## The Three Algorithms

### FastCluster v2 (Default)

**Key Changes from v1**:
```typescript
// v1: Only subdivide when clusters.size < target
if (clusters.size < target && clusters.size > 0) {
  return subdivideClustersByContent(clusters, target);
}

// v2: ALSO subdivide when dominant cluster >40%
const hasDominantCluster = Array.from(clusters.values())
  .some(cluster => cluster.length > totalExperiences * 0.4);

if (clusters.size < target || hasDominantCluster) {
  return subdivideClustersByContent(clusters, target);
}
```

**Bug Fix**:
- AISP with 11 clusters (>target 10) now triggers subdivision
- "general_reasoning" (71% of experiences) forced to subdivide
- Phase 2 doubled mode creates 6-10 strategies (not 3)

### DeepCluster v1

**Two-Phase Approach**:
1. **Phase 1**: Keyword clustering (reuse FastCluster v2 logic)
2. **Phase 2**: LLM semantic split for clusters >50 experiences

**LLM Semantic Split**:
- Sample 30-50 representative experiences from large cluster
- Ask LLM to identify 4-8 semantic reasoning patterns
- Categorize all cluster experiences by LLM-identified patterns
- Result: Semantic diversity instead of spatial subdivision

**Benefits**:
- Semantic patterns (reasoning structure) not spatial patterns (grid position)
- "Only candidate elimination" vs "Forced by constraint intersection"
- Better quality few-shot examples with distinct reasoning approaches

### LLMCluster v1

**Fully LLM-Driven**:
1. Sample 100-150 experiences (balanced by difficulty/success)
2. Ask LLM to identify 10-15 distinct reasoning patterns
3. Categorize ALL experiences using LLM-identified patterns

**Benefits**:
- Maximum LLM leverage for pattern discovery
- No keyword heuristics, purely semantic understanding
- Research-grade quality for best few-shot examples

**Trade-offs**:
- Slower execution (<180s vs <5s)
- Higher token cost
- Requires robust LLM error handling

---

## Architecture Components

### ClusteringAlgorithm Interface

```typescript
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

**Design Principles**:
- Pure function: same inputs → same outputs
- Async for LLM-based algorithms
- Metadata includes code hash for versioning
- Identifier is canonical name: `{name}v{version}`

### AlgorithmRegistry Singleton

**Responsibilities**:
1. **Version Management**: Track multiple versions of same algorithm
2. **Default Selection**: Identify default algorithm (FastCluster v2)
3. **Version Resolution**: Get latest or specific version
4. **Backward Compatibility**: Map legacy unit names to default algorithm

**Key Methods**:
```typescript
register(algorithm, isDefault?)         // Add algorithm to registry
getAlgorithm(name, version?)            // Get specific or latest version
getAllAlgorithms()                      // Get all latest versions
mapLegacyUnit(unitName)                 // Map old name to new format
```

**Initialization**:
```typescript
function initializeAlgorithmRegistry(llmClient?: LMStudioClient): void {
  const registry = AlgorithmRegistry.getInstance();

  // Default algorithm (no LLM client needed)
  registry.register(new FastClusterV2(), true);
  registry.setDefaultAlgorithm('FastCluster');

  // LLM-based algorithms (if client provided)
  if (llmClient) {
    registry.register(new DeepClusterV1(llmClient));
    registry.register(new LLMClusterV1(llmClient));
  }
}
```

### Learning Unit Naming

**New Format**:
```
{profile}_{mode}_{algo}v{version}_{date}[_2x][_collision]
```

**Examples**:
```
gpt-oss-120b_standard_fastclusterv2_20260113
gpt-oss-120b_aisp_deepclusterv1_20260113_2x
qwen3-8b_standard_llmclusterv1_20260113
```

**Legacy Support**:
```
gpt-oss-120b_aisp_20260113
  → maps to: gpt-oss-120b_aisp_fastclusterv2_20260113
```

---

## Integration Points

### DreamingConsolidator Changes

**Before** (lines 251-402):
```typescript
private clusterByReasoning(
  experiences: LLMExperience[],
  targetClusterCount?: number
): Map<string, LLMExperience[]> {
  // 150+ lines of clustering logic
  // ...
}
```

**After**:
```typescript
constructor(
  experienceStore: ExperienceStore,
  config: LLMConfig,
  clusteringAlgorithm?: ClusteringAlgorithm  // NEW
) {
  this.clusteringAlgorithm = clusteringAlgorithm ||
    AlgorithmRegistry.getInstance().getDefaultAlgorithm();
}

async consolidate(profileName?: string): Promise<ConsolidationReport> {
  // ...
  // Delegate to algorithm
  const clusterResult = await this.clusteringAlgorithm.cluster(
    successful,
    this.consolidationOptions.fewShotMax,
    config
  );
  // ...

  return {
    // ... existing fields ...
    algorithmUsed: {
      name: this.clusteringAlgorithm.getName(),
      version: this.clusteringAlgorithm.getVersion(),
      identifier: this.clusteringAlgorithm.getIdentifier(),
    },
  };
}
```

**Benefits**:
- DreamingConsolidator is algorithm-agnostic
- Clustering logic extracted to dedicated classes
- Easier to test and maintain
- Algorithm metadata tracked in reports

### CLI Integration

**New Options**:
```bash
machine-dream llm dream run [options]
  --algorithm <name>           # Single algorithm (e.g., "fastcluster")
  --algorithms <list>          # Multiple algorithms (e.g., "fastcluster,deepcluster")
  --algorithm-version <num>    # Specific version (e.g., "2")
```

**Default Behavior** (no algorithm flags):
- Run ALL registered algorithms (latest versions)
- Sequential execution (one after another)
- Creates learning units for each algorithm

**Example**:
```bash
# Default: Run all algorithms
$ machine-dream llm dream run --profile gpt-oss-120b --aisp

# Creates:
#   gpt-oss-120b_aisp_fastclusterv2_20260113
#   gpt-oss-120b_aisp_fastclusterv2_20260113_2x
#   gpt-oss-120b_aisp_deepclusterv1_20260113
#   gpt-oss-120b_aisp_deepclusterv1_20260113_2x
#   gpt-oss-120b_aisp_llmclusterv1_20260113
#   gpt-oss-120b_aisp_llmclusterv1_20260113_2x

# Single algorithm
$ machine-dream llm dream run --profile gpt-oss-120b --algorithm fastcluster

# Specific version
$ machine-dream llm dream run --profile gpt-oss-120b --algorithm fastcluster --algorithm-version 1
```

### Backward Compatibility

**LearningUnitManager Update**:
```typescript
async getLearningUnit(unitId: string): Promise<LearningUnit | null> {
  // Try direct lookup first
  let unit = await this.storage.get(unitId);

  if (!unit) {
    // Try mapping legacy unit name
    const registry = AlgorithmRegistry.getInstance();
    const mappedId = registry.mapLegacyUnit(unitId);

    if (mappedId !== unitId) {
      console.log(`📦 Mapping legacy unit "${unitId}" → "${mappedId}"`);
      unit = await this.storage.get(mappedId);
    }
  }

  return unit;
}
```

**Benefits**:
- Transparent to users
- No manual migration required
- Old CLI commands continue to work
- Legacy and new formats coexist

---

## Dependencies

| Type | ADR/Spec | Description |
|------|----------|-------------|
| Depends On | ADR-008 | Extends dreaming pipeline Phase 3 (COMPRESSION) |
| Depends On | ADR-003 | Algorithm metadata stored in memory system |
| Relates To | ADR-005 | Learning unit naming includes algorithm identifier |
| Relates To | ADR-001 | LLM-based algorithms leverage LLM client |
| Implements | Spec 18 | Algorithm Versioning System specification |
| Modifies | Spec 05 | Dreaming Pipeline (Section 9 on algorithms) |

---

## Spec References

| Spec | Section | Relationship |
|------|---------|--------------|
| [Spec 18: Algorithm Versioning](../specs/18-algorithm-versioning-system.md) | Full spec | Primary specification |
| [Spec 05: Dreaming Pipeline](../specs/05-dreaming-pipeline-spec.md) | Section 9 | Extended with algorithm abstraction |
| [Spec 11: LLM Sudoku Player](../specs/11-llm-sudoku-player.md) | LLM Player | Experience source |
| [Spec 13: Profile Management](../specs/13-llm-profile-management.md) | Profiles | LLM client configuration |

---

## Trade-offs

### Accepted Trade-offs

| Trade-off | Why Acceptable |
|-----------|----------------|
| **Architectural Complexity** | Justified by bug fix, scientific rigor, and A/B testing needs |
| **Sequential Execution Time** | 3x longer dream cycles acceptable for comprehensive algorithm comparison |
| **Versioning System Overhead** | Minimal overhead (<5ms registry lookup) for reproducibility benefits |
| **Storage Duplication** | 3x learning units acceptable for A/B testing value |

### Rejected Alternatives

**1. Manual Algorithm Selection Only**
- Requires user to remember to test all algorithms
- No systematic A/B testing
- Harder to compare results

**2. Parallel Algorithm Execution**
- Race conditions in experience marking
- Complex coordination logic
- Sequential is simpler and sufficient

**3. Automatic Version Detection via Git**
- Ties versioning to Git commits (not always 1:1)
- Breaks in detached HEAD state
- Code hash is more reliable

---

## Performance Implications

### Dream Cycle Duration

**Before** (single algorithm):
- Standard mode: ~2 seconds
- Doubled mode: ~2 seconds
- **Total**: ~4 seconds

**After** (3 algorithms):
- FastCluster v2: ~5 seconds (both modes)
- DeepCluster v1: ~60 seconds (both modes)
- LLMCluster v1: ~180 seconds (both modes)
- **Total**: ~490 seconds (~8 minutes)

**Mitigation**: Users can select specific algorithms via CLI flags

### Memory Usage

**Before**: ~50MB peak (single algorithm)
**After**: ~300MB peak (LLMCluster v1)

**Mitigation**: Algorithms run sequentially, memory released between runs

---

## Testing Strategy

### Unit Tests

**ClusteringAlgorithm Interface**:
- Metadata accessor methods
- Identifier format validation
- Code hash computation

**AlgorithmRegistry**:
- Registration and retrieval
- Version sorting
- Duplicate version prevention
- Legacy unit mapping

**Each Concrete Algorithm**:
- Clustering correctness (>80% coverage)
- Performance benchmarks
- Error handling

### Integration Tests

**DreamingConsolidator**:
- Algorithm delegation
- Metadata in consolidation report

**CLI**:
- Algorithm selection via flags
- Sequential execution
- Learning unit naming

**Bug Fix Verification**:
```bash
# CRITICAL TEST
# Reset experiences
node scripts/reset-aisp-experiences.js

# Run dream with FastCluster v2
machine-dream llm dream run --profile gpt-oss-120b --algorithm fastcluster --aisp

# Verify doubled mode creates MORE strategies
machine-dream llm learning show gpt-oss-120b_aisp_fastclusterv2_20260113_2x
# Expected: 6-10 strategies (NOT 3!)
```

---

## Migration Path

### Phase 1: Infrastructure (No User Impact)
1. Create ClusteringAlgorithm interface
2. Create AlgorithmRegistry singleton
3. Extract FastCluster v2 from DreamingConsolidator
4. Add unit tests

### Phase 2: Integration (Backward Compatible)
1. Update DreamingConsolidator to use algorithms
2. Add backward compatibility to LearningUnitManager
3. Update CLI with algorithm flags
4. Default behavior unchanged (FastCluster v2 only)

### Phase 3: New Algorithms (Opt-In)
1. Implement DeepCluster v1
2. Implement LLMCluster v1
3. Enable multi-algorithm default behavior
4. Update documentation

### Phase 4: Validation
1. Run comprehensive test suite
2. Verify bug fix (AISP doubled mode)
3. Compare algorithm results
4. Update README with findings

---

## Definition of Done

- [x] Evidence gathered (bug logs analyzed)
- [x] Agreement reached (plan approved)
- [x] Documentation complete (Spec 18, ADR-011)
- [ ] Review completed (pending implementation)
- [ ] Dependencies mapped (done)
- [ ] References linked (done)
- [ ] Master ADR updated (pending)
- [ ] Bug fix verified (pending implementation)

---

## Future Enhancements

### v1.1 (Short-term)
- GUI algorithm selection in TUI
- Algorithm performance dashboard
- Automatic algorithm recommendation

### v2.0 (Long-term)
- Custom algorithm plugins
- Algorithm A/B test automation
- Multi-stage hybrid algorithms
- Neural network-based clustering

---

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-13 | Initial version | Project Team |
