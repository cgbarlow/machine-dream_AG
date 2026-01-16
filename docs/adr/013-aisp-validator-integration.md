# ADR-013: AISP Validator Integration

**Date:** 2026-01-16
**Status:** accepted
**Decision Makers:** Chris, Claude

## Context

In the context of AISP mode (`--aisp-full`) for LLM dreaming consolidation,
facing the issue that clustering algorithms (LLMClusterV2, DeepClusterV1) construct all prompts in English even when AISP mode is enabled,

## Decision

We decided for:
1. Integrating the `aisp-validator` npm package (v0.2.2) to validate AISP compliance of prompts and LLM responses
2. Implementing LLM self-critique workflow when AISP validation fails (tier ⊘, δ < 0.20)
3. Extending the `ClusteringAlgorithm` interface with `setAISPMode()` method
4. Creating new algorithm versions with AISP support:
   - FastClusterV3: AISP cluster naming
   - DeepClusterV2: AISP LLM prompts for semantic split
   - LLMClusterV2: Full AISP prompts (in-place update)

And neglected:
1. Building custom AISP validation logic (reinventing the wheel)
2. Strict rejection without fallback (would break functionality if LLM fails AISP)
3. Modifying existing algorithm versions (breaks backward compatibility)

## Consequences

To achieve:
- End-to-end AISP compliance when `--aisp-full` is used
- Quality metrics via density scoring (δ) and tier classification
- Actionable feedback on AISP non-compliance through LLM critique
- Backward compatibility with existing learning units and workflows

Accepting that:
- Additional LLM calls are needed for critique on validation failures
- aisp-validator WASM initialization adds ~50ms startup overhead
- Fallback to English parsing reduces AISP purity when validation fails
- Three new algorithm files increase codebase size

## Implementation Details

### aisp-validator Integration

```typescript
import AISP from 'aisp-validator';

// Initialize WASM kernel on startup
await AISP.init();

// Validate AISP text
const result = AISP.validate(source);
// Returns: { valid, tier, tierValue, tierName, delta, pureDensity, ambiguity }

// Tiers:
// ◊⁺⁺ (Platinum): δ ≥ 0.75
// ◊⁺  (Gold):     δ ≥ 0.60
// ◊   (Silver):   δ ≥ 0.40
// ◊⁻  (Bronze):   δ ≥ 0.20
// ⊘   (Reject):   δ < 0.20
```

### AISP Mode Propagation

```
CLI (--aisp-full)
    ↓
DreamingConsolidator.setAISPMode('aisp-full')
    ↓
ClusteringAlgorithm.setAISPMode('aisp-full')
    ↓
AISP prompts generated → validated → sent to LLM
    ↓
LLM response → validated → parsed (AISP or fallback)
```

### Validation Workflow

1. Generate AISP prompt
2. Validate with aisp-validator
3. If tier < ◊ (δ < 0.40): Log warning
4. Send to LLM
5. Validate LLM response
6. If tier = ⊘ (δ < 0.20):
   a. Request LLM critique
   b. Log critique for debugging
   c. Fallback to English parsing
7. Continue processing

## Related Specifications

- [Spec 16: AISP Mode Integration](../specs/16-aisp-mode-spec.md) - FR-05, Sections 4.8-4.10
- [Spec 18: Algorithm Versioning System](../specs/18-algorithm-versioning-system.md) - Sections 3.4-3.6

## WH(Y) Format Summary

> "In the context of AISP mode for LLM dreaming consolidation, facing the issue that clustering algorithms ignore AISP mode, we decided for integrating aisp-validator with LLM critique workflow, and neglected building custom validation or strict rejection, to achieve end-to-end AISP compliance with quality metrics, accepting that additional LLM calls and WASM overhead are required."
