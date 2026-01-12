# ADR-001: Pure LLM Solving (No Deterministic Fallback)

**Date:** 2026-01-12
**Status:** accepted
**Decision Makers:** Project Team
**Master ADR:** ADR-000

## Context

In the context of building an AI-powered Sudoku solver for learning research,
facing the temptation to add deterministic constraint solvers as fallback when the LLM makes mistakes,

## Decision

We decided for pure LLM-based solving with no deterministic fallback or hints,
and neglected hybrid approaches that combine LLM reasoning with rule-based solvers,

## Consequences

To achieve authentic measurement of LLM learning capabilities and ensure all improvements come from the dreaming/consolidation pipeline,
accepting that initial accuracy will be lower, puzzles may go unsolved, and training will require more iterations.

## WH(Y) Summary

> "In the context of building an AI learning research platform, facing the temptation to add deterministic fallbacks, we decided for pure LLM solving with no hints, and neglected hybrid approaches, to achieve authentic learning measurement, accepting that initial accuracy will be lower."

---

## Rationale

1. **Scientific Validity**: Adding fallbacks would mask the LLM's actual learning progress
2. **True Learning Signal**: Mistakes provide valuable training data for the dreaming pipeline
3. **Measurable Progress**: Clear baseline enables tracking improvement over time
4. **Research Focus**: Understanding how LLMs learn constraint satisfaction, not just solving puzzles

## Dependencies

| Type | ADR | Description |
|------|-----|-------------|
| Part Of | ADR-000 | Core approach decision |
| Depends On | ADR-002 | Requires LLM provider |
| Relates To | ADR-003 | Learning data storage |
| Relates To | ADR-006 | GRASP implements this approach |
| Relates To | ADR-008 | Dreaming enables improvement |

## Spec References

| Spec | Section | Relationship |
|------|---------|--------------|
| [Spec 11: LLM Sudoku Player](../specs/11-llm-sudoku-player.md) | Full spec | LLM Sudoku Player |
| [Spec 15: Batch Testing](../specs/15-batch-testing-spec.md) | A/B Testing | Validates pure LLM approach |

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
