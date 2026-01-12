# ADR-005: Learning Units for Isolated Learning Contexts

**Date:** 2026-01-12
**Status:** accepted
**Decision Makers:** Project Team
**Master ADR:** ADR-000

## Context

In the context of managing multiple learning experiments and configurations,
facing the need to isolate learning contexts, compare approaches, and share learned knowledge,

## Decision

We decided for Learning Units as discrete packages of consolidated knowledge separate from profiles,
and neglected simpler per-profile storage and monolithic learning databases,

## Consequences

To achieve isolated experiments, iterative learning, A/B testing, and shareable knowledge packages,
accepting that the mental model is more complex and requires explicit unit management.

## WH(Y) Summary

> "In the context of managing multiple learning experiments, facing the need for isolation and comparison, we decided for Learning Units, and neglected per-profile storage, to achieve isolated experiments and shareable knowledge, accepting that the model is more complex."

---

## Rationale

1. **Isolation**: Different experiments don't pollute each other
2. **Iteration**: Units can absorb new experiences over time
3. **Comparison**: A/B test different learning approaches
4. **Sharing**: Export/import learned strategies between installations
5. **Reset**: Easy to start fresh without affecting other units

## Learning Unit Structure

```typescript
interface LearningUnit {
  id: string;                    // Unique identifier
  profileName: string;           // Parent profile
  name: string;                  // Display name
  fewShots: FewShotExample[];    // Consolidated strategies
  absorbedExperienceIds: string[]; // Already processed experiences
  metadata: LearningUnitMetadata;
}
```

## Use Cases

| Scenario | Approach |
|----------|----------|
| New experiment | Create new learning unit |
| Iterative training | Reuse same learning unit with `--learning-unit` |
| A/B testing | Compare units with different configurations |
| Share knowledge | Export unit, import on another machine |
| Fresh start | Delete or ignore existing unit |

## Commands

```bash
# Use specific learning unit
npx machine-dream llm play puzzle.json --learning-unit my-experiment

# List learning units
npx machine-dream llm learning list --profile qwen3-coder

# Show unit contents
npx machine-dream llm learning show my-experiment

# Export/import
npx machine-dream llm learning export my-experiment --output export.json
npx machine-dream llm learning import export.json --as imported-unit
```

## Dependencies

| Type | ADR | Description |
|------|-----|-------------|
| Part Of | ADR-000 | Feature decision |
| Depends On | ADR-003 | Requires memory persistence |
| Relates To | ADR-008 | Dreaming produces units |
| Relates To | ADR-001 | Units store LLM learning |

## Spec References

| Spec | Section | Relationship |
|------|---------|--------------|
| [Spec 11: LLM Sudoku Player](../specs/11-llm-sudoku-player.md) | Learning Units | Primary specification |
| [Spec 05: Dreaming Pipeline](../specs/05-dreaming-pipeline-spec.md) | Consolidation | Dreaming produces units |

## Definition of Done

- [x] Evidence gathered
- [x] Agreement reached
- [x] Documentation complete
- [x] Review completed
- [x] Dependencies mapped
- [x] References linked
- [x] Master ADR updated

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-12 | Added dependencies and Master ADR | Project Team |
| 2026-01-12 | Initial version | Project Team |
