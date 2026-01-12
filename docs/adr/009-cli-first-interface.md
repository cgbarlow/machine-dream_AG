# ADR-009: CLI-First Interface Design

**Date:** 2026-01-12
**Status:** accepted
**Decision Makers:** Project Team
**Master ADR:** ADR-000

## Context

In the context of providing user access to the machine-dream system,
facing the choice between GUI, web interface, API-first, or CLI-first approaches,

## Decision

We decided for CLI-first design with rich terminal output and optional TUI enhancements,
and neglected GUI-first and web-first approaches,

## Consequences

To achieve rapid development, scriptability, automation-friendly operation, and cross-platform compatibility,
accepting that non-technical users may find it less accessible and some visualizations are harder to implement.

## WH(Y) Summary

> "In the context of user interface design, facing GUI vs CLI trade-offs, we decided for CLI-first with TUI enhancements, and neglected GUI approaches, to achieve scriptability and rapid development, accepting reduced accessibility for non-technical users."

---

## Rationale

1. **Scriptability**: All operations can be automated in shell scripts
2. **Rapid Development**: No frontend framework complexity
3. **Research Focus**: Researchers prefer command-line tools
4. **A/B Testing**: Easy to run batch experiments with scripts
5. **Cross-Platform**: Works anywhere Node.js runs
6. **Composability**: Output can be piped to other tools

## Command Structure

```
machine-dream
├── llm
│   ├── play <puzzle>      # Play a puzzle
│   ├── benchmark          # Run benchmark suite
│   ├── dream              # Consolidate experiences
│   ├── learning           # Manage learning units
│   ├── model              # LM Studio model management
│   ├── experience         # View stored experiences
│   └── profile            # Manage LLM profiles
├── puzzle
│   ├── generate           # Generate puzzles
│   └── validate           # Validate puzzle files
└── config                 # Configuration management
```

## Output Modes

| Mode | Flag | Use Case |
|------|------|----------|
| Default | (none) | Human-readable output |
| JSON | `--json` | Machine processing |
| Quiet | `--quiet` | Scripts that only need exit code |
| Verbose | `--verbose` | Debugging |
| Visualize | `--visualize` | Rich puzzle display |

## Dependencies

| Type | ADR | Description |
|------|-----|-------------|
| Part Of | ADR-000 | Primary user interface |
| Relates To | ADR-002 | LLM profile management |
| Relates To | ADR-005 | Learning unit commands |

## Spec References

| Spec | Section | Relationship |
|------|---------|--------------|
| [Spec 09: CLI Interface](../specs/09-cli-interface-spec.md) | Full spec | CLI specification |
| [Spec 10: Terminal UI](../specs/10-terminal-menu-interface-spec.md) | Full spec | TUI specification |
| [Spec 14: Console Menu](../specs/14-console-menu-interface-spec.md) | Full spec | Console menu |

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
