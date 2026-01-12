# ADR-000: Machine-Dream Architecture Master

**Date:** 2026-01-12
**Type:** Master ADR
**Status:** active
**Owner:** Project Team

---

## Initiative Overview

Machine-Dream is an AI learning research platform that uses Sudoku as a controlled environment to study how large language models can learn, consolidate knowledge, and improve through experience. The system implements a novel cognitive architecture based on continuous thinking, memory consolidation, and knowledge abstraction.

### Core Research Questions

1. Can LLMs improve at constraint satisfaction through experience?
2. Does memory consolidation ("dreaming") enable knowledge transfer?
3. What abstraction strategies emerge from experience?

---

## Component Decisions

| ADR | Title | Status | Category |
|-----|-------|--------|----------|
| ADR-001 | Pure LLM Solving | accepted | Core Approach |
| ADR-002 | Local LLM Provider (LM Studio) | accepted | Technology |
| ADR-003 | Memory Persistence (AgentDB) | accepted | Storage |
| ADR-004 | Specification-First Development | accepted | Process |
| ADR-005 | Learning Units | accepted | Feature |
| ADR-006 | GRASP Loop Cognitive Architecture | accepted | Core Architecture |
| ADR-007 | Event-Driven Integration | accepted | Architecture Pattern |
| ADR-008 | Dreaming Pipeline Design | accepted | Core Architecture |
| ADR-009 | CLI-First Interface | accepted | Interface |
| ADR-010 | Immutable Puzzle Engine | accepted | Foundation |

---

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

---

## Spec-ADR Mapping

| Spec | Description | Primary ADRs |
|------|-------------|--------------|
| 01 | Puzzle Engine | ADR-010 |
| 02 | Memory System | ADR-003 |
| 03 | GRASP Loop | ADR-006 |
| 04 | Attention Mechanism | ADR-006 |
| 05 | Dreaming Pipeline | ADR-008 |
| 06 | Benchmarking | ADR-004, ADR-006 |
| 07 | Integration | ADR-007 |
| 08 | AgentDB Integration | ADR-003 |
| 09 | CLI Interface | ADR-009 |
| 10 | Terminal UI | ADR-009 |
| 11 | LLM Sudoku Player | ADR-001, ADR-002 |
| 12 | Puzzle Generation | ADR-010 |
| 13 | Profile Management | ADR-002 |
| 14 | Console Menu | ADR-009 |
| 15 | Batch Testing | ADR-004, ADR-001 |
| 16 | AISP Mode | ADR-001, ADR-007 |
| 17 | ADR Implementation | ADR-004 |

---

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

---

## Risk Register

| Risk | Mitigation | Related ADRs |
|------|------------|--------------|
| LLM accuracy too low | Learning pipeline improves over time | ADR-001, ADR-008 |
| AgentDB instability | ReasoningBank fallback | ADR-003 |
| High token costs | Local LLM inference | ADR-002 |
| Inconsistent components | Spec-first development | ADR-004 |
| Complex debugging | Event correlation IDs | ADR-007 |

---

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-12 | Initial version | Project Team |
