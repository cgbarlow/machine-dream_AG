# Failure Learning Specification

**Component:** Failure Learning (Anti-Patterns and Reasoning Corrections)
**Date:** January 14, 2026
**Version:** 1.0
**Status:** Specification

---

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| [ADR-012: Failure Learning](../adr/012-failure-learning.md) | Authorizes this spec |
| [ADR-011: Versioned Algorithms](../adr/011-versioned-algorithms.md) | Clustering infrastructure |

---

## 1. Component Overview

### 1.1 Purpose and Responsibilities

The Failure Learning system extends the Dreaming Pipeline to learn from mistakes, not just successes. It implements a hybrid approach that:

- **Clusters invalid moves** (rule violations) into anti-patterns
- **Analyzes valid-but-wrong moves** (logic errors) for reasoning corrections
- **Stores failure patterns** in learning units alongside positive strategies
- **Injects failure guidance** into play prompts to prevent repeated mistakes

### 1.2 Position in Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DREAMING PIPELINE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Phase 1: Capture                                           │
│  Phase 2: Triage                                            │
│  Phase 3: Compression (success clustering)                  │
│  Phase 3.5: FAILURE LEARNING ⭐ NEW                         │
│      ├── 3.5a: Cluster invalid moves → Anti-Patterns        │
│      └── 3.5b: Analyze wrong moves → Reasoning Corrections  │
│  Phase 4: Abstraction                                       │
│  Phase 5: Integration                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Failure Types

| Type | Definition | Treatment |
|------|------------|-----------|
| **Invalid** | Move violates Sudoku rules (row/column/box constraint, cell filled) | Cluster by error type → Synthesize anti-patterns |
| **Valid-but-wrong** | Move is legal but doesn't match solution | LLM analysis → Reasoning corrections |

---

## 2. Functional Requirements

### 2.1 Anti-Pattern Synthesis (Invalid Moves)

#### FR-2.1.1: Error Clustering

**Requirement**: System SHALL cluster invalid moves by error type.

**Error Categories**:
- `row_constraint_violation` - Value already exists in row
- `column_constraint_violation` - Value already exists in column
- `box_constraint_violation` - Value already exists in 3x3 box
- `cell_already_filled` - Cell already contains a value
- `unknown_error` - Other validation failures

#### FR-2.1.2: Anti-Pattern Generation

**Requirement**: For each error cluster with >= 2 experiences, system SHALL use LLM to synthesize an anti-pattern.

**Anti-Pattern Structure**:
```typescript
interface SynthesizedAntiPattern {
  id: string;
  antiPatternName: string;         // e.g., "Constraint Blindness"
  clusterName: string;             // Error type cluster
  whatGoesWrong: string;           // Description of mistake
  whyItFails: string;              // Root cause
  preventionSteps: string[];       // Action items to avoid
  examples: Array<{
    move: LLMMove;
    error: string;
  }>;
  frequency: number;
  sourceExperienceCount: number;
}
```

#### FR-2.1.3: Anti-Pattern Prompt Template

**Requirement**: System SHALL use the following prompt structure for anti-pattern synthesis:

```
You made ${count} invalid moves that violated ${errorType} constraint.

Examples:
${examples.map(e => `- Move (${e.row},${e.col})=${e.value}: "${e.error}"
  Your reasoning: ${e.reasoning.slice(0, 200)}...`).join('\n')}

Analyze these mistakes and synthesize an ANTI-PATTERN.

Respond in this exact format:
ANTI_PATTERN_NAME: [short descriptive name]
WHAT_GOES_WRONG: [describe the common mistake pattern]
WHY_IT_FAILS: [explain root cause]
PREVENTION_STEP_1: [specific action to avoid this]
PREVENTION_STEP_2: [another preventive action]
PREVENTION_STEP_3: [optional third step]
```

### 2.2 Reasoning Correction Analysis (Valid-but-Wrong Moves)

#### FR-2.2.1: Reasoning Analysis

**Requirement**: For valid-but-wrong moves, system SHALL use LLM to analyze the flawed reasoning.

**Analysis Limit**: Process up to 10 valid-but-wrong moves per consolidation (to control LLM costs).

#### FR-2.2.2: Reasoning Correction Structure

```typescript
interface ReasoningCorrection {
  id: string;
  gridContext: string;             // Cell position, constraint state
  wrongMove: LLMMove;              // The incorrect move
  correctValue: number;            // What should have been placed
  flawedReasoningStep: string;     // The specific error in reasoning
  correction: string;              // How to reason correctly
  generalPrinciple: string;        // Abstracted lesson
  confidence: number;              // LLM confidence (0-1)
}
```

#### FR-2.2.3: Reasoning Analysis Prompt Template

**Requirement**: System SHALL use the following prompt for reasoning analysis:

```
You made a valid but WRONG move in Sudoku.

Grid context: ${gridContext}
Your move: (${row},${col}) = ${wrongValue}
Correct value: ${correctValue}

Your reasoning was:
${fullReasoning}

Analyze what went wrong in your reasoning.

Respond in this exact format:
FLAWED_STEP: [the specific step in your reasoning that was wrong]
CORRECTION: [how you should have reasoned instead]
GENERAL_PRINCIPLE: [a general rule to remember]
CONFIDENCE: [0.0-1.0 how confident you are in this analysis]
```

---

## 3. Storage Schema

### 3.1 Learning Unit Extension

**Requirement**: LearningUnit interface SHALL be extended to include failure learning data.

```typescript
interface LearningUnit {
  // Existing fields...
  id: string;
  profileName: string;
  fewShots: FewShotExample[];           // Positive strategies (unchanged)

  // Failure Learning (NEW)
  antiPatterns?: SynthesizedAntiPattern[];
  reasoningCorrections?: ReasoningCorrection[];
}
```

### 3.2 Storage Keys

| Data | Storage Key Pattern |
|------|---------------------|
| Anti-patterns | `llm_antipatterns:${profileName}:${unitId}` |
| Reasoning corrections | `llm_corrections:${profileName}:${unitId}` |

---

## 4. Prompt Integration

### 4.1 Anti-Pattern Section

**Requirement**: When anti-patterns exist in learning unit, system SHALL inject them into play prompts.

**Format**:
```markdown
## COMMON MISTAKES TO AVOID

### ❌ [antiPatternName]
**What goes wrong:** [whatGoesWrong]
**Why it fails:** [whyItFails]
**Prevention:**
- [preventionStep1]
- [preventionStep2]
- [preventionStep3]
```

**Limit**: Include top 3 anti-patterns by frequency.

### 4.2 Reasoning Corrections Section

**Requirement**: When reasoning corrections exist, system SHALL inject them into play prompts.

**Format**:
```markdown
## REASONING TRAPS TO AVOID

### ⚠️ Flawed reasoning pattern
**The trap:** [flawedReasoningStep]
**Correct approach:** [correction]
**Remember:** [generalPrinciple]
```

**Limit**: Include top 3 reasoning corrections by confidence.

---

## 5. CLI Interface

### 5.1 Dream Command Options

| Option | Default | Description |
|--------|---------|-------------|
| `--no-failure-learning` | false | Disable failure learning phase |

### 5.2 Learning Show Display

**Requirement**: `llm learning show` command SHALL display failure learning data.

**Output Format**:
```
📚 Learning Unit: [unit-id]
   Strategies: 5

📛 Anti-Patterns (3):
   ❌ Constraint Blindness
      What goes wrong: Forgetting to check row constraint...
      Frequency: 15
   ❌ Box Boundary Confusion
      What goes wrong: Miscounting 3x3 box boundaries...
      Frequency: 8

⚠️  Reasoning Corrections (5):
   ⚠️  Always verify all three constraints before...
   ⚠️  When multiple candidates exist, eliminate...
```

---

## 6. Thresholds and Limits

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Min invalid moves for clustering | 3 | Need enough data for pattern |
| Min cluster size for anti-pattern | 2 | At least 2 examples needed |
| Max anti-patterns per consolidation | 5 | Limit prompt bloat |
| Min valid-but-wrong for analysis | 2 | Need multiple to find patterns |
| Max reasoning corrections analyzed | 10 | Control LLM costs |
| Max reasoning corrections stored | 10 | Limit storage growth |
| Anti-patterns in prompt | 3 | Balance guidance vs prompt length |
| Corrections in prompt | 3 | Balance guidance vs prompt length |

---

## 7. Performance Considerations

### 7.1 LLM Calls

**Anti-pattern synthesis**: 1 LLM call per error cluster (typically 3-5 clusters)
**Reasoning analysis**: 1 LLM call per valid-but-wrong move (max 10)

**Expected additional time**: 30-60 seconds per consolidation with typical failure counts.

### 7.2 Storage Impact

**Anti-patterns**: ~500 bytes each × 5 max = ~2.5KB per unit
**Reasoning corrections**: ~400 bytes each × 10 max = ~4KB per unit

Total additional storage: ~6.5KB per learning unit (negligible).

---

## 8. Verification

### 8.1 Unit Tests

- Anti-pattern clustering groups by error type
- Anti-pattern prompt formatting is correct
- Reasoning correction prompt formatting is correct
- Storage methods save and retrieve correctly
- Prompt integration includes failure sections

### 8.2 Integration Tests

```bash
# Run dream and verify failure learning output
npx machine-dream llm dream run --profile test --debug
# Should show: "Phase 3.5: Failure Learning" with counts

# Verify storage
npx machine-dream llm learning show <unit-id>
# Should display anti-patterns and reasoning corrections

# Verify prompt integration
npx machine-dream llm play --profile test --debug
# Should show "COMMON MISTAKES TO AVOID" section in prompt
```

---

## 9. AISP Encoding for Anti-Patterns

### 9.1 Overview

When `--aisp-full` mode is enabled, anti-patterns are encoded in AISP syntax for compact storage and lower-ambiguity prompt injection.

### 9.2 Anti-Pattern AISP Format

**Structure**:
```
⟦Λ:AntiPattern.Name⟧{avoid≜mistake;why≜failure;prevent≜⟨steps⟩;freq≔N}
```

**Fields**:
- `avoid≜` - What goes wrong (the mistake pattern to avoid)
- `why≜` - Why this approach fails (root cause)
- `prevent≜⟨...⟩` - Prevention steps (numbered)
- `freq≔` - Frequency count

### 9.3 Example AISP Anti-Pattern

**Human-readable**:
```
Anti-Pattern: Constraint Blindness
What goes wrong: Placing a digit without checking all three constraints
Why it fails: Violates row, column, or box uniqueness rule
Prevention:
  1. Always check row constraint before placing
  2. Always check column constraint before placing
  3. Always check box constraint before placing
```

**AISP-encoded**:
```
⟦Λ:AntiPattern.Constraint_Blindness⟧{avoid≜"Placing a digit without checking all three constraints";why≜"Violates row, column, or box uniqueness rule";prevent≜⟨step1≔"Always check row constraint before placing";step2≔"Always check column constraint before placing";step3≔"Always check box constraint before placing"⟩;freq≔15}
```

### 9.4 Storage

The `aispEncoded` field is added to `SynthesizedAntiPattern`:

```typescript
interface SynthesizedAntiPattern {
  // ... existing fields ...
  aispEncoded?: string;  // AISP-encoded version when aisp-full mode enabled
}
```

### 9.5 CLI Display

The `--verbose` flag on `learning show` displays the AISP encoding:

```bash
npx machine-dream llm learning show <unit-id> --verbose
```

**Output**:
```
📛 Anti-Patterns (3):

   ❌ Constraint Blindness
      What goes wrong: Placing a digit without checking all three constraints
      Why it fails: Violates row, column, or box uniqueness rule
      Prevention steps:
        1. Always check row constraint before placing
        2. Always check column constraint before placing
        3. Always check box constraint before placing
      AISP: ⟦Λ:AntiPattern.Constraint_Blindness⟧{avoid≜"...";...}
      Frequency: 15
```

---

## 10. Future Enhancements

1. **Cross-profile anti-patterns**: Share common mistakes across profiles
2. **Anti-pattern decay**: Reduce weight of old anti-patterns over time
3. **Failure clustering algorithms**: Apply DeepCluster/LLMCluster to failures
4. **Positive reinforcement**: Track when anti-patterns successfully prevent errors
