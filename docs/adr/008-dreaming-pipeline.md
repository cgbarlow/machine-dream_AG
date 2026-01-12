# ADR-008: Dreaming Pipeline Design

**Date:** 2026-01-12
**Status:** accepted
**Decision Makers:** Project Team
**Master ADR:** ADR-000

## Context

In the context of consolidating LLM experiences into reusable knowledge,
facing the choice between simple experience replay, vector clustering, or LLM-driven synthesis,

## Decision

We decided for a 5-phase dreaming pipeline with LLM-driven pattern synthesis and 4-level abstraction ladder,
and neglected simple experience replay and purely algorithmic clustering,

## Consequences

To achieve meaningful knowledge consolidation, transferable strategies, and hierarchical abstraction,
accepting that consolidation is computationally expensive and requires careful prompt engineering.

## WH(Y) Summary

> "In the context of knowledge consolidation, facing replay vs synthesis trade-offs, we decided for LLM-driven 5-phase dreaming with abstraction ladder, and neglected simpler approaches, to achieve meaningful transferable strategies, accepting computational cost and prompt complexity."

---

## Rationale

1. **Meaningful Synthesis**: LLM understands patterns at semantic level
2. **Abstraction Hierarchy**: Strategies can be applied at multiple specificity levels
3. **Cross-Pattern Connections**: Discover relationships between strategies
4. **Quality Control**: Verification phase ensures consistency
5. **Compression**: 10:1 ratio keeps knowledge base manageable

## The 5 Phases

| Phase | Input | Output | Key Operation |
|-------|-------|--------|---------------|
| **Capture** | Raw experiences | Scored experiences | Importance calculation |
| **Triage** | Scored experiences | Filtered set | Top-k selection |
| **Compression** | Filtered experiences | Clusters | Semantic clustering |
| **Abstraction** | Clusters | Strategy ladder | LLM synthesis at 4 levels |
| **Integration** | Strategies | Updated knowledge base | Merge + prune + verify |

## 4-Level Abstraction Ladder

| Level | Name | Example |
|-------|------|---------|
| L0 | Specific Pattern | "Row 5 had only one empty cell" |
| L1 | Named Technique | "Last remaining cell in row" |
| L2 | Strategy Category | "Single candidate strategies" |
| L3 | General Principle | "Constraint propagation" |

## Importance Scoring Formula

```
importance = (outcome × 0.4) + (novelty × 0.3) + (error_learning × 0.2) + (efficiency × 0.1)
```

## Dependencies

| Type | ADR | Description |
|------|-----|-------------|
| Depends On | ADR-003 | Reads/writes to memory system |
| Depends On | ADR-006 | Consumes GRASP loop experiences |
| Relates To | ADR-005 | Produces learning units |
| Relates To | ADR-001 | LLM-driven synthesis |

## Spec References

| Spec | Section | Relationship |
|------|---------|--------------|
| [Spec 05: Dreaming Pipeline](../specs/05-dreaming-pipeline-spec.md) | Full spec | Primary specification |
| [Spec 02: Memory System](../specs/02-memory-system-spec.md) | Memory | Storage target |
| [Spec 11: LLM Sudoku Player](../specs/11-llm-sudoku-player.md) | LLM Player | Experience source |

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
