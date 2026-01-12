# ADR-003: Memory Persistence with AgentDB

**Date:** 2026-01-12
**Status:** accepted
**Decision Makers:** Project Team
**Master ADR:** ADR-000

## Context

In the context of storing LLM experiences, learned strategies, and session data,
facing the choice between simple file storage, SQLite, and specialized agent memory systems,

## Decision

We decided for AgentDB as the persistence layer with native vector embeddings,
and neglected simple JSON file storage and traditional relational databases,

## Consequences

To achieve semantic search over experiences, efficient retrieval of similar patterns, and future extensibility for reinforcement learning,
accepting that AgentDB adds dependency complexity and requires understanding of vector storage concepts.

## WH(Y) Summary

> "In the context of storing LLM learning data, facing the choice between file/SQL/vector storage, we decided for AgentDB, and neglected simpler options, to achieve semantic search and RL extensibility, accepting that it adds complexity."

---

## Rationale

1. **Semantic Search**: Find similar experiences by meaning, not just text matching
2. **Pattern Recognition**: Vector embeddings enable clustering of similar strategies
3. **RL Ready**: AgentDB's RL plugin provides foundation for future decision transformer integration
4. **Single Source of Truth**: All learning data in one queryable system
5. **Native TypeScript**: Good integration with the codebase

## Storage Structure

```
~/.machine-dream/agentdb/
  ├── experiences/       # Raw LLM move experiences
  ├── sessions/          # Play session records
  ├── learning-units/    # Consolidated strategies
  └── profiles/          # LLM connection profiles
```

## Dependencies

| Type | ADR | Description |
|------|-----|-------------|
| Part Of | ADR-000 | Storage layer decision |
| Supports | ADR-001 | Stores learning data |
| Required By | ADR-005 | Learning units storage |
| Required By | ADR-006 | GRASP experience storage |
| Required By | ADR-008 | Dreaming reads/writes experiences |

## Spec References

| Spec | Section | Relationship |
|------|---------|--------------|
| [Spec 02: Memory System](../specs/02-memory-system-spec.md) | Full spec | Memory system design |
| [Spec 08: AgentDB Integration](../specs/08-agentdb-integration-spec.md) | Full spec | AgentDB integration |

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
