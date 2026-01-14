# ADR-012: Failure Learning

**Date:** 2026-01-14
**Status:** accepted
**Decision Makers:** Development team

## Context

In the context of the LLM-driven Sudoku solver learning system,
facing the limitation that the Dreaming Pipeline only learns from successful moves while discarding valuable information from failures (invalid moves and valid-but-wrong moves),

## Decision

We decided for a **hybrid failure learning approach** that:

1. **Clusters invalid moves** by error type and synthesizes anti-patterns via LLM
2. **Analyzes valid-but-wrong moves** individually via LLM to extract reasoning corrections
3. **Stores failure patterns** in learning units as separate collections (not replacing positive strategies)
4. **Injects failure guidance** into play prompts as "COMMON MISTAKES TO AVOID" and "REASONING TRAPS" sections

And neglected:
- **Option A: Negative Few-Shots** - storing failures as INCORRECT examples alongside positive ones (risk of negative priming, LLMs learn better from positives)
- **Option C: Simple Forbidden Context** - accumulating raw errors without abstraction (no pattern learning, unbounded growth)
- **Single-approach options** - treating all failures the same way (different failure types benefit from different treatments)

## Consequences

To achieve:
- **Reduced repeated mistakes** - LLM sees common error patterns before making moves
- **Better reasoning quality** - Reasoning corrections teach correct analysis
- **Comprehensive learning** - System learns from both success and failure
- **Pattern abstraction** - Anti-patterns are synthesized, not just accumulated

Accepting that:
- **Increased consolidation time** - Additional LLM calls for failure analysis (~30-60s)
- **Higher implementation complexity** - Two separate synthesis pathways
- **Prompt length growth** - Additional sections in play prompts (~500-1000 chars)
- **LLM analysis errors** - Reasoning corrections may occasionally be incorrect

## WH(Y) Format Summary

> "In the context of LLM Sudoku learning, facing the loss of valuable failure information, we decided for a hybrid approach with failure clustering for invalid moves and LLM reasoning analysis for wrong moves, and neglected negative few-shots and raw error accumulation, to achieve pattern-based failure prevention and reasoning quality improvement, accepting that consolidation time increases and prompt length grows."

---

## Implementation Reference

- **Specification:** [Spec 19: Failure Learning](../specs/19-failure-learning-spec.md)
- **Types:** `SynthesizedAntiPattern`, `ReasoningCorrection` in `src/llm/types.ts`
- **Integration point:** Phase 3.5 in DreamingConsolidator

## Related ADRs

- [ADR-008: Dreaming Pipeline](./008-dreaming-pipeline.md) - Parent consolidation system
- [ADR-011: Versioned Algorithms](./011-versioned-algorithms.md) - Clustering infrastructure
