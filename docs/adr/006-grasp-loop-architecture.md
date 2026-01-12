# ADR-006: GRASP Loop Cognitive Architecture

**Date:** 2026-01-12
**Status:** accepted
**Decision Makers:** Project Team
**Master ADR:** ADR-000

## Context

In the context of designing a cognitive architecture for LLM-based problem solving,
facing the choice between single-shot prompting, simple retry loops, and more sophisticated thinking patterns,

## Decision

We decided for the 5-phase GRASP loop (Generate-Review-Absorb-Synthesize-Persist) as the core cognitive architecture,
and neglected single-shot prompting and simple retry-on-failure approaches,

## Consequences

To achieve continuous thinking, experience accumulation, and measurable learning over time,
accepting that the architecture is more complex, requires careful orchestration, and consumes more tokens per puzzle.

## WH(Y) Summary

> "In the context of designing cognitive architecture, facing the choice between single-shot and iterative approaches, we decided for the 5-phase GRASP loop, and neglected simpler patterns, to achieve continuous thinking and measurable learning, accepting higher complexity and token usage."

---

## Rationale

1. **Continuous Thinking**: Each phase builds on the previous, enabling reflection and refinement
2. **Experience Capture**: Every iteration generates experiences for the dreaming pipeline
3. **Attention Focus**: The Review phase enables strategic focus on high-value cells
4. **Memory Integration**: Absorb phase queries past experiences for guidance
5. **Knowledge Growth**: Persist phase ensures learning accumulates across sessions

## The 5 Phases

| Phase | Purpose | Key Action |
|-------|---------|------------|
| **G**enerate | Produce candidate move | LLM reasons about puzzle state |
| **R**eview | Evaluate move quality | Attention mechanism scores candidates |
| **A**bsorb | Learn from experience | Query similar past experiences |
| **S**ynthesize | Integrate knowledge | Combine current + historical insights |
| **P**ersist | Store for future | Save experience to memory system |

## Dependencies

| Type | ADR | Description |
|------|-----|-------------|
| Depends On | ADR-010 | Requires immutable puzzle engine |
| Depends On | ADR-003 | Requires memory persistence |
| Relates To | ADR-001 | Implements pure LLM approach |
| Relates To | ADR-008 | Feeds experiences to dreaming |

## Spec References

| Spec | Section | Relationship |
|------|---------|--------------|
| [Spec 03: GRASP Loop](../specs/03-grasp-loop-spec.md) | Full spec | Primary specification |
| [Spec 04: Attention Mechanism](../specs/04-attention-mechanism-spec.md) | Attention | Review phase implementation |
| [Spec 02: Memory System](../specs/02-memory-system-spec.md) | Memory | Absorb/Persist phase storage |

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
| 2026-01-12 | Initial version | Project Team |
