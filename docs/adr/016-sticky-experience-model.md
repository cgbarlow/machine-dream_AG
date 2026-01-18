# ADR-016: Sticky Experience Model

**Date:** 2026-01-18
**Status:** accepted
**Decision Makers:** Chris, Claude

## Context

In the context of the LLM learning system where experiences are generated during play sessions and absorbed into learning units during dreaming/consolidation,
facing the problem that experiences were stored as global entities referenced by multiple learning units, leading to:

1. **Stale metadata**: When experiences were deleted, learning unit metadata became inconsistent (showing 408 absorbed experiences when only 52 existed)
2. **Shared state issues**: Deleting a learning unit could affect other units that referenced the same experiences
3. **Unclear ownership**: It was ambiguous whether experiences "belonged" to a unit or were just referenced
4. **Complex sync logic**: Required periodic metadata sync to reconcile learning unit counts with actual experience existence

## Decision

We decided for **unit-bound experience copies (sticky model)**:

1. When experiences are absorbed into a learning unit during dreaming:
   - **Copy** full experience data to unit-specific storage (`unit_experience` type)
   - **Delete** the original global experience (experiences are "consumed")
   - Mark the copy with `boundToUnit`, `boundAt`, and `unitVersion` metadata

2. Storage key pattern: `unit_exp:{unitId}:{experienceId}`

3. Lifecycle rules:
   - **1b**: Original experience is deleted after absorption (consumed by first unit)
   - **2a**: Session deletion only affects unconsolidated global experiences
   - **2b**: Unit-bound copies are retained when sessions are deleted
   - **3a**: Re-consolidation (`--rerun`) re-analyzes existing unit experiences only

And neglected:
- **Binding table approach**: Would have kept experiences global with a separate binding layer
- **Embedded bindings**: Would have added per-unit tracking on experience objects themselves
- **Reference-only model**: The current approach that led to the problems above

## Consequences

To achieve:
- **Clear ownership**: Each unit owns its experience copies independently
- **Clean deletion**: Deleting a unit deletes only its copies, not affecting other units
- **Consistent metadata**: Unit experience count equals actual stored copies
- **Simpler sync**: No need for cross-referencing global pool

Accepting that:
- **Storage duplication**: Each absorbed experience is copied (acceptable given small JSON size)
- **Migration needed**: Legacy units with only `absorbedExperienceIds` require fallback logic
- **One-time absorption**: An experience can only be absorbed by one unit (first wins)

## Implementation Details

### New Storage Type

```typescript
LLM_STORAGE_KEYS.UNIT_EXPERIENCE_TYPE = 'unit_experience'
LLM_STORAGE_KEYS.getUnitExperienceKey(unitId, experienceId)
// Returns: "unit_exp:{unitId}:{experienceId}"
```

### Updated Methods in LearningUnitManager

| Method | Change |
|--------|--------|
| `markExperiencesAbsorbed()` | Now copies experiences to unit storage, then deletes originals |
| `getUnitExperiences()` | New method: retrieves unit-bound copies, falls back to legacy |
| `deleteUnitExperiences()` | New method: deletes all unit-bound copies when unit is deleted |
| `syncMetadata()` | Updated to check unit-bound storage first, then legacy |
| `migrateToNewExperienceModel()` | New method: migrates legacy unit to sticky model |

### Backwards Compatibility

- Legacy units (pre-update) continue to work via `absorbedExperienceIds` fallback
- `getUnitExperiences()` checks unit-bound storage first, falls back to global
- `syncMetadata()` handles both storage models
- No breaking changes to CLI or public APIs

## WH(Y) Format Summary

> "In the context of LLM learning units referencing shared global experiences, facing metadata staleness and unclear ownership when experiences were deleted, we decided for unit-bound experience copies (sticky model) where experiences are copied to unit storage and originals are deleted upon absorption, and neglected binding tables and embedded tracking, to achieve clear ownership, clean deletion semantics, and consistent metadata, accepting that storage is duplicated and experiences can only be absorbed by one unit."

---

## Related

- Spec 11: LLM Sudoku Player (Learning Units section)
- Spec 05: Dreaming Pipeline (consolidation)
- ADR-011: Versioned Algorithms (clustering)
