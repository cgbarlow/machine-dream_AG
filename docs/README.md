# Documentation Overview

Welcome to the Machine Dream documentation. This directory contains all project documentation organized by type and purpose.

---

## 📚 Quick Navigation

| Documentation | Location | Purpose |
|---------------|----------|---------|
| **Main Project README** | [`/README.md`](../README.md) | Project overview, quick start, core capabilities |
| **User Guide** | [`USER_GUIDE.md`](USER_GUIDE.md) | Comprehensive usage guide, installation, configuration |
| **CLI Reference** | [`cli-reference.md`](cli-reference.md) | Complete CLI command reference |
| **Architecture Specs** | [`specs/`](specs/) | 15 formal specifications (Spec 01-15) |
| **Architecture Decisions** | [`adr/`](adr/) | 10 Architecture Decision Records |
| **Scripts Guide** | [`/scripts/SCRIPTS.md`](../scripts/SCRIPTS.md) | Batch testing scripts documentation |
| **Archive** | [`archive/`](archive/) | Historical development documents |

---

## 📖 Primary Documentation

### User Documentation

**[USER_GUIDE.md](USER_GUIDE.md)** (52K)
- Installation and setup
- Core concepts (GRASP Loop, Dreaming Pipeline, Learning Units)
- LLM Integration guide
- Profile management
- Batch testing workflows
- Troubleshooting

**[cli-reference.md](cli-reference.md)** (24K)
- Complete CLI command reference
- All `machine-dream` commands with examples
- Options and flags
- Output formats
- WSL setup guide

### Research Documentation

**[continuous-machine-thinking-research.md](continuous-machine-thinking-research.md)** (52K)
- Core research concepts
- Continuous machine cognition
- Economics of infinite thinking
- Theoretical foundations
- Related work and citations

**[poc-strategy-report.md](poc-strategy-report.md)** (64K)
- Proof of concept strategy
- Implementation approach
- Technical architecture
- Validation methodology
- Success criteria

---

## 🏗️ Architecture Documentation

### Formal Specifications

**[specs/](specs/)** - 15 formal specifications defining system behavior

| Spec | Title | Purpose |
|------|-------|---------|
| [01](specs/01-puzzle-engine-spec.md) | Puzzle Engine | Sudoku generation, validation, rules |
| [02](specs/02-memory-system-spec.md) | Memory System | AgentDB integration, persistence |
| [03](specs/03-grasp-loop-spec.md) | GRASP Loop | Generate, Review, Absorb, Synthesize, Persist |
| [04](specs/04-attention-mechanism-spec.md) | Attention Mechanism | Focus and priority system |
| [05](specs/05-dreaming-pipeline-spec.md) | Dreaming Pipeline | 5-phase consolidation |
| [06](specs/06-benchmarking-framework-spec.md) | Benchmarking | Performance testing framework |
| [07](specs/07-integration-orchestration-spec.md) | Integration | System orchestration |
| [08](specs/08-agentdb-integration-spec.md) | AgentDB | Native AgentDB features |
| [09](specs/09-cli-interface-spec.md) | CLI Interface | Command-line interface |
| [10](specs/10-terminal-menu-interface-spec.md) | Terminal UI | Interactive TUI (experimental) |
| [11](specs/11-llm-sudoku-player.md) | LLM Integration | AI model Sudoku player |
| [12](specs/12-randomized-puzzle-generation.md) | Puzzle Generation | Seeded random puzzles |
| [13](specs/13-llm-profile-management.md) | Profile Management | AI model profiles |
| [14](specs/14-console-menu-interface-spec.md) | Console Menu | TUI console & help system |
| [15](specs/15-batch-testing-spec.md) | Batch Testing | A/B testing & iterative learning |

### Architecture Decision Records

**[adr/](adr/)** - 10 ADRs documenting key architectural decisions

See [adr/README.md](adr/README.md) for complete index. Key decisions:

- [ADR-000](adr/000-master-machine-dream.md): Master ADR (decision graph)
- [ADR-001](adr/001-pure-llm-solving.md): Pure LLM solving (no deterministic fallback)
- [ADR-005](adr/005-learning-units.md): Learning Units for isolated learning contexts
- [ADR-006](adr/006-grasp-loop-architecture.md): GRASP Loop cognitive architecture
- [ADR-008](adr/008-dreaming-pipeline.md): Dreaming pipeline design

---

## 📊 Reports & Analysis

### Performance Reports

**[reports/](reports/)** - Performance analysis and benchmarking

- `accuracy-comparison-20260110.md` - Accuracy comparison analysis
- `performance-analysis-20260110.md` - Performance profiling results

### Research Papers

**[research/](research/)** - Research documentation and analysis

- `hardest-sudoku-puzzles.md` - Analysis of world's hardest Sudoku puzzles (AI Escargot)

### Feature Documentation

**[features/](features/)** - Detailed feature documentation

- `llm-reasoning-tokens.md` - LM Studio reasoning token display (v0.3.9+)

---

## 📦 Archive

**[archive/](archive/)** - Historical development documents

See [archive/README.md](archive/README.md) for complete index. Contains:

- **Development Progress** (18 docs): Week 1/2 summaries, phase completions, session notes
- **TUI Migration** (10 docs): blessed→neo-blessed→Ink migration debugging
- **Planning** (6 docs): Production planning, implementation plans (goals achieved)
- **Integration Analysis** (6 docs): LLM integration, AgentDB analysis, spec reviews

**Why Archived:** These documents are historical records from development phases now complete. Preserved for reference but not part of active documentation.

---

## 🎯 Documentation by Role

### For New Users
1. Start with [`/README.md`](../README.md) - Project overview and quick start
2. Read [USER_GUIDE.md](USER_GUIDE.md) - Comprehensive usage guide
3. Review [cli-reference.md](cli-reference.md) - CLI commands

### For Developers
1. Review [adr/](adr/) - Understand architectural decisions
2. Read [specs/](specs/) - Formal system specifications
3. Check [continuous-machine-thinking-research.md](continuous-machine-thinking-research.md) - Theoretical foundations

### For Researchers
1. Read [continuous-machine-thinking-research.md](continuous-machine-thinking-research.md) - Core research
2. Review [poc-strategy-report.md](poc-strategy-report.md) - Implementation strategy
3. Check [research/](research/) - Research papers and analysis

### For Contributors
1. Read [specs/](specs/) - System specifications (authoritative)
2. Review [adr/](adr/) - Architectural decisions and rationale
3. Check [Spec 04: Spec-First Development](specs/04-spec-first-development.md) - Process guidelines

---

## 🔍 Finding Documentation

### By Topic

**LLM Integration & Learning:**
- [Spec 11: LLM Sudoku Player](specs/11-llm-sudoku-player.md)
- [Spec 13: Profile Management](specs/13-llm-profile-management.md)
- [Spec 15: Batch Testing](specs/15-batch-testing-spec.md)
- [ADR-001: Pure LLM Solving](adr/001-pure-llm-solving.md)
- [ADR-005: Learning Units](adr/005-learning-units.md)

**Memory & Persistence:**
- [Spec 02: Memory System](specs/02-memory-system-spec.md)
- [Spec 08: AgentDB Integration](specs/08-agentdb-integration-spec.md)
- [ADR-003: Memory Persistence](adr/003-memory-persistence.md)

**Cognitive Architecture:**
- [Spec 03: GRASP Loop](specs/03-grasp-loop-spec.md)
- [Spec 05: Dreaming Pipeline](specs/05-dreaming-pipeline-spec.md)
- [ADR-006: GRASP Loop Architecture](adr/006-grasp-loop-architecture.md)
- [ADR-008: Dreaming Pipeline Design](adr/008-dreaming-pipeline.md)

**Testing & Validation:**
- [Spec 06: Benchmarking Framework](specs/06-benchmarking-framework-spec.md)
- [Spec 15: Batch Testing](specs/15-batch-testing-spec.md)
- [`/scripts/SCRIPTS.md`](../scripts/SCRIPTS.md) - Batch testing scripts

**Command-Line Interface:**
- [Spec 09: CLI Interface](specs/09-cli-interface-spec.md)
- [cli-reference.md](cli-reference.md) - Complete CLI reference
- [ADR-009: CLI-First Interface](adr/009-cli-first-interface.md)

---

## 📝 Documentation Standards

### Specification Authority

Per [ADR-004: Spec-First Development](adr/004-spec-first-development.md):

- **Specs are authoritative** - Implementation must match specifications
- **No implementation without spec** - Features require specification first
- **Spec changes require review** - Updates go through approval process

### Markdown Conventions

- **Headers**: Use ATX style (`#` not underlines)
- **Links**: Use relative paths from document location
- **Code blocks**: Specify language for syntax highlighting
- **Tables**: Use for structured data, align columns
- **Lists**: Use `-` for unordered, `1.` for ordered

### Documentation Updates

When updating documentation:

1. **Check specifications** - Ensure changes align with specs
2. **Update related docs** - Keep cross-references current
3. **Preserve history** - Use git for version control
4. **Test examples** - Verify code examples work
5. **Update indexes** - Keep this README current

---

## 🔗 External Links

- **Main Repository**: [GitHub](https://github.com/your-org/machine-dream)
- **Research Articles**:
  - [What Happens When the Machine Never Stops Thinking?](https://agentics-nz.ghost.io/what-happens-when-the-machine-never-stops-thinking/)
  - [Part 2: Economics and Architecture](https://agentics-nz.ghost.io/what-happens-when-the-machine-never-stops-thinking-part-2/)
- **AISP Protocol**: [AI Specification Protocol 5.1](https://github.com/bar181/aisp-open-core)

---

## 📊 Documentation Statistics

| Category | Count | Total Size |
|----------|-------|------------|
| Formal Specifications | 15 | ~768K |
| Architecture Decisions | 10 | ~64K |
| Primary Docs (active) | 4 | ~192K |
| Archived Documents | 41 | ~500K+ |
| Research Papers | 3 | ~120K |
| Performance Reports | 2 | ~20K |

**Total Documentation**: 75+ documents, ~1.6MB+ of technical content

---

## 🤝 Contributing to Documentation

When contributing documentation:

1. **Follow specifications** - Check [specs/](specs/) for system behavior
2. **Review ADRs** - Understand architectural decisions in [adr/](adr/)
3. **Use templates** - Follow existing document structure
4. **Cross-reference** - Link to related specs and ADRs
5. **Keep current** - Update this README when adding documents

For specification changes, see [Spec 17: ADR Implementation](specs/17-adr-implementation-spec.md).

---

**Last Updated:** 2026-01-13
**Documentation Version:** 1.0
**Project Status:** Active Development

For issues or questions about documentation, please file an issue on GitHub.
