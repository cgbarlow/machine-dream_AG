# Specification 17: Architecture Decision Records (ADR)

**Version:** 1.0.0
**Date:** 2026-01-12
**Status:** Active
**Reference:** [cgbarlow/adr](https://github.com/cgbarlow/adr/tree/architecturally_significant_decisions)

---

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| [ADR-004: Spec-First Development](../adr/004-spec-first-development.md) | Authorizes ADR methodology |
| [ADR-000: Master Machine Dream](../adr/000-master-machine-dream.md) | Master ADR |

---

## 1. Overview

This specification defines the Architecture Decision Record (ADR) system for machine-dream, using the enhanced WH(Y) format for documenting architecturally significant decisions.

### 1.1 Purpose

ADRs provide:
- Traceable decision history
- Rationale preservation for future maintainers
- Dependency mapping between decisions
- Governance and review structure

---

## 2. ADR Format

### 2.1 WH(Y) Statement Template

Every ADR must include a WH(Y) statement:

```
In the context of [situation/problem space],
facing [non-functional concern or challenge],
we decided for [chosen approach/option],
and neglected [alternatives considered],
to achieve [expected benefits],
accepting that [trade-offs and consequences].
```

### 2.2 Full ADR Template

```markdown
# ADR-NNN: Title

**Date:** YYYY-MM-DD
**Status:** [proposed | accepted | deprecated | superseded by ADR-XXX]
**Decision Makers:** [List]
**Master ADR:** [Reference to parent ADR if applicable]

## Context

[Detailed context and problem description]

## Decision

[WH(Y) statement]

## Consequences

[Detailed consequences, both positive and negative]

## Dependencies

| Type | ADR | Description |
|------|-----|-------------|
| Depends On | ADR-XXX | [Why this dependency exists] |
| Supersedes | ADR-YYY | [What changed] |
| Relates To | ADR-ZZZ | [How they relate] |
| Part Of | ADR-000 | [Master ADR relationship] |

## Spec References

**REQUIRED FORMAT:** Use markdown links for bidirectional navigation.

| Spec | Section | Relationship |
|------|---------|--------------|
| [Spec NN: Title](../specs/NN-filename.md) | Section X | [How spec implements decision] |

## Definition of Done

- [ ] Evidence gathered
- [ ] Agreement reached
- [ ] Documentation complete
- [ ] Review completed
- [ ] Dependencies mapped
- [ ] References linked
- [ ] Master ADR updated

## Revision History

| Date | Change | Author |
|------|--------|--------|
| YYYY-MM-DD | Initial version | [Name] |
```

---

## 3. Decision Criteria

### 3.1 When ADR is Required

An architecturally significant decision requires an ADR if it meets ANY of:

| Criterion | Description |
|-----------|-------------|
| **Hard-to-Change** | High reversal cost, strategic impact |
| **New** | Novel approach, departure from patterns |
| **Not Strategically Aligned** | Deviation from approved strategies |
| **Risk** | Significant technology-related risk |
| **Budget/Delivery/Benefits** | Major resource implications |
| **Governance Request** | Explicitly requested documentation |

### 3.2 Decision Categories

| Category | Examples |
|----------|----------|
| **Core Architecture** | Data model, persistence layer, API design |
| **Technology Choice** | LLM provider, memory system, UI framework |
| **Development Process** | Spec-first, TDD, code organization |
| **Feature Design** | Learning approach, dreaming pipeline |
| **Integration** | External APIs, protocols, formats |

---

## 4. Dependency Types

### 4.1 Relationship Types

| Type | Symbol | Meaning |
|------|--------|---------|
| Depends On | `→` | Requires another decision to be in place |
| Supersedes | `⊃` | Replaces a previous decision |
| Relates To | `↔` | Connected but independent |
| Refines | `⊂` | Adds detail to a broader decision |
| Part Of | `∈` | Component of a Master ADR |

### 4.2 Dependency Graph

ADRs form a directed graph:
```
ADR-000 (Master)
  ├── ADR-001 (Pure LLM Solving)
  │     └── ADR-003 (Memory Persistence) → ADR-005 (Learning Units)
  ├── ADR-002 (Local LLM Provider)
  │     └── ADR-008 (Model Management)
  ├── ADR-004 (Spec-First Development)
  └── ADR-006 (AISP Integration)
```

---

## 5. Master ADR

### 5.1 Purpose

Master ADRs group related decisions for complex initiatives:
- Provide high-level overview
- Link component ADRs
- Track overall initiative status

### 5.2 Master ADR Structure

```markdown
# ADR-000: [Initiative Name] Master

**Type:** Master ADR
**Status:** active

## Initiative Overview

[High-level description]

## Component Decisions

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Decision 1 | accepted |
| ADR-002 | Decision 2 | accepted |

## Decision Graph

[Visual or textual dependency representation]

## Governance

| Role | Person | Responsibility |
|------|--------|----------------|
| Owner | [Name] | Final approval |
| Reviewer | [Name] | Technical review |
```

---

## 6. ADR Lifecycle

### 6.1 States

```
proposed → accepted → [deprecated | superseded]
                          ↓
                    superseded by ADR-XXX
```

### 6.2 State Transitions

| From | To | Trigger |
|------|----|---------|
| proposed | accepted | Review approved |
| accepted | deprecated | No longer applies |
| accepted | superseded | Replaced by new ADR |

---

## 7. File Organization

### 7.1 Directory Structure

```
docs/adr/
├── 000-master-machine-dream.md      # Master ADR
├── 001-pure-llm-solving.md
├── 002-local-llm-provider.md
├── 003-memory-persistence.md
├── ...
└── templates/
    └── adr-template.md
```

### 7.2 Naming Convention

- Format: `NNN-short-kebab-case-title.md`
- Master ADRs: `000-master-[initiative].md`
- Sequential numbering within project

---

## 8. Spec-ADR Mapping

### 8.1 Current Mappings

| Spec | Primary ADRs | Description |
|------|--------------|-------------|
| 01 | ADR-001 | Puzzle Engine |
| 02 | ADR-003 | Memory System |
| 03 | ADR-007 | GRASP Loop |
| 04 | ADR-007 | Attention Mechanism |
| 05 | ADR-007 | Dreaming Pipeline |
| 06 | ADR-004 | Benchmarking |
| 07 | ADR-004 | Orchestration |
| 08 | ADR-003 | AgentDB |
| 09 | ADR-009 | CLI Interface |
| 10 | ADR-009 | Terminal UI |
| 11 | ADR-001, ADR-002 | LLM Player |
| 12 | ADR-001 | Puzzle Generation |
| 13 | ADR-002 | Profile Management |
| 14 | ADR-009 | Console Menu |
| 15 | ADR-004 | Batch Testing |
| 16 | ADR-006 | AISP Mode |

---

## 9. Review Process

### 9.1 Review Cadence

| ADR Type | Review Frequency |
|----------|-----------------|
| Master | Quarterly |
| Core Architecture | Bi-annually |
| Technology Choice | Annually |
| Feature Design | As needed |

### 9.2 Review Checklist

- [ ] Decision still valid?
- [ ] Context changed?
- [ ] Dependencies still accurate?
- [ ] Supersession needed?
- [ ] Documentation current?

---

## 10. Definition of Done

An ADR is complete when:

1. **Evidence**: Supporting research/analysis documented
2. **Agreement**: Stakeholders have approved
3. **Documentation**: Full template completed
4. **Review**: Peer review performed
5. **Dependencies**: All relationships mapped
6. **References**: Spec links established
7. **Master**: Included in Master ADR if applicable
8. **Status**: Marked as `accepted`

---

## References

- [cgbarlow/adr](https://github.com/cgbarlow/adr/tree/architecturally_significant_decisions)
- [Michael Nygard's ADR Blog Post](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR Tools](https://github.com/npryce/adr-tools)
