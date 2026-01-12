# ADR-007: Event-Driven Integration Architecture

**Date:** 2026-01-12
**Status:** accepted
**Decision Makers:** Project Team
**Master ADR:** ADR-000

## Context

In the context of integrating multiple cognitive components (puzzle engine, GRASP loop, attention, dreaming, memory),
facing the choice between direct method calls, shared state, or message-based communication,

## Decision

We decided for event-driven architecture with a typed event bus and correlation IDs,
and neglected direct component coupling and shared mutable state,

## Consequences

To achieve loose coupling, testability, extensibility, and graceful degradation,
accepting that debugging requires correlation tracking and there's overhead in event serialization.

## WH(Y) Summary

> "In the context of component integration, facing coupling vs messaging trade-offs, we decided for event-driven architecture, and neglected direct coupling, to achieve loose coupling and graceful degradation, accepting debugging complexity and serialization overhead."

---

## Rationale

1. **Loose Coupling**: Components don't know about each other's internals
2. **Testability**: Easy to mock event producers/consumers
3. **Extensibility**: New components subscribe without changing existing code
4. **Graceful Degradation**: Failed components don't crash the system
5. **Traceability**: Correlation IDs enable full request tracing

## Event Categories

| Category | Examples | Publishers |
|----------|----------|------------|
| Puzzle | `puzzle:loaded`, `puzzle:move` | Puzzle Engine |
| LLM | `llm:generating`, `llm:response`, `llm:reasoning` | LLM Player |
| Memory | `memory:stored`, `memory:retrieved` | Memory System |
| Dream | `dream:started`, `dream:consolidated` | Dreaming Pipeline |
| Session | `session:started`, `session:ended` | Orchestrator |

## Failure Handling

| Scenario | Behavior |
|----------|----------|
| AgentDB unavailable | Fallback to ReasoningBank |
| Memory system fails | Continue with in-memory only |
| Event handler throws | Logged, other handlers continue |
| Component timeout | Circuit breaker pattern |

## Dependencies

| Type | ADR | Description |
|------|-----|-------------|
| Part Of | ADR-000 | Core architectural pattern |
| Relates To | ADR-006 | GRASP loop emits events |
| Relates To | ADR-008 | Dreaming consumes events |
| Relates To | ADR-003 | Memory events |

## Spec References

| Spec | Section | Relationship |
|------|---------|--------------|
| [Spec 07: Integration & Orchestration](../specs/07-integration-orchestration-spec.md) | Full spec | Integration specification |
| [Spec 09: CLI Interface](../specs/09-cli-interface-spec.md) | CLI events | CLI event handling |

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
