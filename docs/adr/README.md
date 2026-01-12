# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the Machine Dream project, documenting key architectural and design decisions that shape the system.

> **📋 Specification Reference:** [Spec 17: ADR Implementation](../specs/17-adr-implementation-spec.md)
> Defines the ADR system, WH(Y) format, governance, and review processes.

## What are ADRs?

Architecture Decision Records capture important architectural decisions along with their context and consequences. Each ADR follows the **WH(Y) framework** as defined in Spec 17:

- **W**hat: The decision made
- **H**ow: Implementation approach
- **Y**ay: Benefits and positive consequences
- **N**ay (neglected): Alternatives considered and rejected

## Master ADR

**[ADR-000: Machine-Dream Architecture Master](000-master-machine-dream.md)** - The master ADR that provides an overview of all architectural decisions, their relationships, and how they map to specifications.

## Core Architecture Decisions

### Foundation

| ADR | Title | Status | Description |
|-----|-------|--------|-------------|
| [ADR-010](010-immutable-puzzle-engine.md) | Immutable Puzzle Engine | accepted | Foundation for all puzzle operations with immutable state |

### Storage & Persistence

| ADR | Title | Status | Description |
|-----|-------|--------|-------------|
| [ADR-003](003-memory-persistence.md) | Memory Persistence (AgentDB) | accepted | SQLite-based cognitive memory layer |
| [ADR-005](005-learning-units.md) | Learning Units | accepted | Discrete knowledge packages for isolated learning contexts |

### Core Architecture

| ADR | Title | Status | Description |
|-----|-------|--------|-------------|
| [ADR-006](006-grasp-loop-architecture.md) | GRASP Loop Cognitive Architecture | accepted | Generate, Review, Absorb, Synthesize, Persist cycle |
| [ADR-008](008-dreaming-pipeline.md) | Dreaming Pipeline Design | accepted | 5-phase consolidation (Capture, Triage, Compression, Abstraction, Verification) |
| [ADR-007](007-event-driven-integration.md) | Event-Driven Integration | accepted | Loosely coupled components via typed events |

### LLM Integration

| ADR | Title | Status | Description |
|-----|-------|--------|-------------|
| [ADR-001](001-pure-llm-solving.md) | Pure LLM Solving | accepted | No deterministic fallbacks - authentic learning measurement |
| [ADR-002](002-local-llm-provider.md) | Local LLM Provider (LM Studio) | accepted | Privacy-first local inference |

### Interface & Process

| ADR | Title | Status | Description |
|-----|-------|--------|-------------|
| [ADR-009](009-cli-first-interface.md) | CLI-First Interface | accepted | Command-line as primary interface |
| [ADR-004](004-spec-first-development.md) | Specification-First Development | accepted | No implementation without specification |

## Decision Graph

```
Foundation Layer:
  ADR-010 (Immutable Puzzle Engine)
    └── Forms base for all puzzle operations

Storage Layer:
  ADR-003 (Memory Persistence)
    ├── Stores experiences from ADR-001
    └── Supports ADR-005 (Learning Units)

Core Architecture:
  ADR-006 (GRASP Loop)
    ├── Depends on: ADR-010, ADR-003
    └── Implements ADR-001 (Pure LLM approach)

  ADR-008 (Dreaming Pipeline)
    ├── Depends on: ADR-003, ADR-006
    └── Produces: ADR-005 (Learning Units)

Integration:
  ADR-007 (Event-Driven)
    └── Connects all components

Interface:
  ADR-009 (CLI-First)
    └── User access to all features

Technology Choices:
  ADR-002 (LM Studio)
    └── Supports ADR-001

Process:
  ADR-004 (Spec-First)
    └── Governs all development
```

## Spec-ADR Mapping

| Spec | Description | Primary ADRs |
|------|-------------|--------------|
| [Spec 01](../specs/01-puzzle-engine-spec.md) | Puzzle Engine | ADR-010 |
| [Spec 02](../specs/02-memory-system-spec.md) | Memory System | ADR-003 |
| [Spec 03](../specs/03-grasp-loop-spec.md) | GRASP Loop | ADR-006 |
| [Spec 04](../specs/04-attention-mechanism-spec.md) | Attention Mechanism | ADR-006 |
| [Spec 05](../specs/05-dreaming-pipeline-spec.md) | Dreaming Pipeline | ADR-008 |
| [Spec 06](../specs/06-benchmarking-framework-spec.md) | Benchmarking | ADR-004, ADR-006 |
| [Spec 07](../specs/07-integration-orchestration-spec.md) | Integration | ADR-007 |
| [Spec 08](../specs/08-agentdb-integration-spec.md) | AgentDB Integration | ADR-003 |
| [Spec 09](../specs/09-cli-interface-spec.md) | CLI Interface | ADR-009 |
| [Spec 10](../specs/10-terminal-menu-interface-spec.md) | Terminal UI | ADR-009 |
| [Spec 11](../specs/11-llm-sudoku-player.md) | LLM Sudoku Player | ADR-001, ADR-002 |
| [Spec 12](../specs/12-randomized-puzzle-generation.md) | Puzzle Generation | ADR-010 |
| [Spec 13](../specs/13-llm-profile-management.md) | Profile Management | ADR-002 |
| [Spec 15](../specs/15-batch-testing-spec.md) | Batch Testing | ADR-004, ADR-001 |

## Architectural Principles

### 1. Scientific Validity First
All design decisions prioritize authentic measurement of LLM learning capabilities. No shortcuts that would mask real progress or regression.

### 2. Graceful Degradation
Systems have fallback paths. If AgentDB fails, ReasoningBank takes over. If memory fails, in-memory operation continues.

### 3. Spec-Driven Development
No implementation without specification. Specs are authoritative. Changes require spec updates first.

### 4. Event-Driven Loose Coupling
Components communicate via typed events. No direct dependencies between cognitive components.

### 5. Immutability Where Possible
Puzzle state is immutable. Experience records are append-only. This ensures reproducibility and debugging.

## How to Read ADRs

1. **Start with the Master ADR** ([ADR-000](000-master-machine-dream.md)) for the big picture
2. **Follow the Decision Graph** to understand dependencies
3. **Read by category** based on your interest:
   - New to the project? Start with ADR-001, ADR-006, ADR-008
   - Implementing storage? Read ADR-003, ADR-005
   - Working on interfaces? Read ADR-009
   - Understanding process? Read ADR-004

## ADR Template

Use [000-adr-template.md](000-adr-template.md) when creating new ADRs. The template follows the WH(Y) framework and includes sections for context, decision, consequences, rationale, dependencies, and spec references.

See [Spec 17: ADR Implementation](../specs/17-adr-implementation-spec.md) for the full ADR format specification and governance process.

## Status Definitions

- **proposed**: Under discussion, not yet decided
- **accepted**: Decision approved and being implemented
- **superseded**: Replaced by a newer ADR
- **deprecated**: No longer in use
- **rejected**: Considered but not adopted

## Contributing

When making significant architectural decisions:

1. Create a new ADR using the template
2. Number it sequentially (e.g., ADR-011)
3. Update ADR-000 (Master ADR) with the new decision
4. Link related specs and ADRs
5. Get team review before marking as "accepted"

---

**Last Updated:** 2026-01-13
