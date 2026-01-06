# 🧠 Machine Dream (Research POC)

**Continuous Machine Cognition & AgentDB Integration**

> [!IMPORTANT]
> **Current Status: Phase 1 Complete, Phase 2 In Progress**
>
> ✅ **Phase 1 (Complete)**: TUI, CLI, GRASP loop, Dreaming pipeline, AgentDB persistence
>
> 🚧 **Phase 2 (In Progress)**: True LLM integration - an actual LLM playing Sudoku

## 🎯 Project Status

| Component | Status | Notes |
|-----------|--------|-------|
| Puzzle Engine | ✅ Complete | Sudoku generation, validation, rules |
| GRASP Loop | ✅ Complete | Generate, Review, Absorb, Synthesize, Persist |
| Dreaming Pipeline | ✅ Complete | 5-phase consolidation |
| AgentDB (Local) | ✅ Complete | SQLite-based persistence |
| CLI Interface | ✅ Complete | Full command set |
| TUI (Ink) | ✅ Complete | Interactive terminal UI |
| **LLM Integration** | ✅ **Phase 1 Complete** | Pure LLM Sudoku player (MVP) |

### The Critical Gap

The current system uses **deterministic rule-based solving** (naked singles, hidden singles, backtracking). While architecturally sound, **the LLM never actually plays Sudoku**.

Phase 2 will implement a **true LLM Sudoku player** where:
- The LLM receives puzzle state and proposes moves
- Moves are validated (correct/invalid/wrong)
- The LLM learns from feedback
- Experiences persist for "dreaming" consolidation
- No hints, no fallbacks - pure LLM reasoning

## 🚀 Quick Start

See the [**User Guide**](docs/USER_GUIDE.md) for full instructions.

```bash
# Install
npm install

# Run Demo
npm run dev

# Run Tests
npm test

# LLM Sudoku Player (Phase 2)
cp .env.example .env           # Configure LM Studio endpoint
npm run llm:play puzzles/easy-01.json  # Play with LLM
npm run llm:stats              # View learning statistics
```

## 🤖 LLM Integration (Phase 2)

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| LLM Provider | **LM Studio (local)** | Privacy, no API costs, offline |
| Target Model | **Qwen3 30B** | Capable reasoning, runs locally |
| Deterministic Fallback | **None** | Pure LLM - must learn on its own |
| Hints | **None** | LLM must struggle and learn |
| Memory Persistence | **Yes** | Experiences persist across sessions |
| Memory Toggle | **Yes** | Enable/disable to verify learning |

### LM Studio Setup

1. Download [LM Studio](https://lmstudio.ai/)
2. Load **Qwen3 30B** (or similar capable model)
3. Start local server (default: `localhost:1234`)
4. The system connects via OpenAI-compatible API

### How It Works

```
┌─────────────────────────────────────────────────────┐
│                LLM Sudoku Player                    │
├─────────────────────────────────────────────────────┤
│  1. Show puzzle state to LLM                        │
│  2. LLM proposes a move (row, col, value)           │
│  3. System validates move                           │
│  4. Feedback: "CORRECT" / "INVALID: reason"         │
│  5. Store experience in AgentDB                     │
│  6. Repeat until solved                             │
│  7. Consolidate patterns during "dreaming"          │
└─────────────────────────────────────────────────────┘
```

### Memory Toggle

To verify learning is working:
- `--no-memory`: Fresh start, no history (baseline)
- `--memory`: Include past experiences (should improve over time)

### Documentation

- [LLM Integration Plan](docs/LLM_INTEGRATION_PLAN.md) - Architecture overview
- [Spec 11: LLM Sudoku Player](docs/specs/11-llm-sudoku-player.md) - Formal specification

## 📖 Overview

Machine Dream explores the frontier of AI systems that "never stop thinking." It investigates the paradigm shift that occurs when frontier LLMs run locally or with abundant resources, moving from stateless, request-response interactions to persistent, exploration-focused continuous cognition.

This project implements the **SPARC** (Specification, Pseudocode, Architecture, Refinement, Completion) methodology and the **GRASP** cognitive loop, utilizing **AgentDB** as the foundational memory and coordination layer.

## 🔬 Research Focus

The core question driving this research is: **"What would you build if thinking were free?"**

### Core Concepts

*   **AgentDB Integration**: This project is designed to use **AgentDB** as its cognitive memory layer.
    *   *Note*: Due to current availability issues with the `agentdb` package, this POC utilizes a **Local SQLite Adapter** (`src/agentdb/LocalAgentDB`) as a temporary solution. This adapter mimics the standard AgentDB interfaces (`ReasoningBank`, `ReflexionMemory`) to ensure architectural compatibility for future migration.
    *   **ReasoningBank**: Stores successful moves and strategies (`agent.db`).
    *   **ReflexionMemory**: For episodic replay and self-critique.
    *   **SkillLibrary**: For consolidating repeated successes into reusable skills.
*   **GRASP Framework**: A cognitive loop consisting of **G**enerate, **R**eview, **A**bsorb, **S**ynthesize, and **P**ersist.
*   **Dreaming Architecture**: A five-phase consolidation process (Capture, Triage, Deep Dreaming, Pruning, Verification) to manage memory and prevent cognitive decay.

## 📂 Project Structure

This repository serves as a reference for the data structures and architectural patterns required for continuous cognition.

```
machine-dream/
├── docs/                    # 📚 User Guide & Specs
│   ├── USER_GUIDE.md
│   └── specs/               # 01-08 Specifications
├── src/
│   ├── agentdb/             # 💾 Local SQLite Implementation
│   ├── benchmarking/        # 📊 Performance Suite
│   ├── cognition/           # 🧠 GRASP Loop & Strategy Engine
│   ├── consolidation/       # 🌙 Dreaming Pipeline
│   ├── engine/              # 🧩 Sudoku Rules & Generator
│   ├── memory/              # 💾 AgentMemory Wrapper
│   ├── orchestration/       # 🎼 System Lifecycle
│   ├── types.ts             # 🏗️ Core Definitions
│   └── index.ts             # 🚀 Entry Point
└── tests/                   # ✅ Unit & Integration Tests
```

## ✨ Key Features
- **Real-time Cognitive Loop**: Implements the GRASP cycle to solve puzzles step-by-step.
- **Persistent Memory**: Uses SQLite to remember effective strategies across sessions.
- **Day/Night Cycle**: Autonomous transition from active solving ("Day") to knowledge consolidation ("Night").
- **Robust Verification**: 100% Test Coverage for all documented specifications.

## 📚 Key Documentation

| Document | Description |
| :--- | :--- |
| [**User Guide**](docs/USER_GUIDE.md) | **Start Here!** Instructions for installation, usage, and configuration. |
| [**Continuous Machine Thinking Research**](docs/continuous-machine-thinking-research.md) | The foundational research report detailing the theory, findings, and performance metrics. |
| [**POC Strategy Report**](docs/poc-strategy-report.md) | Detailed strategic analysis and implementation roadmap. |
| [**Source Types**](src/types.ts) | TypeScript definitions that serve as the "Code-as-Spec" for the architecture, utilizing native `agentdb` types. |

## 🧩 Architecture Highlights

### The GRASP Loop (`src/types.ts`)
The `GRASPIteration` type defines the contract for a continuous cognitive step:
1.  **Generate**: Propose next actions or thoughts.
2.  **Review**: Validate proposals against constraints.
3.  **Absorb**: Update internal state with validated results.
4.  **Synthesize**: Generate higher-order insights from the updated state.
5.  **Persist**: Store insights in `agentdb`.

### Dreaming Phases
To handle the "Stateless Problem", the system implements a dreaming pipeline powered by AgentDB's background consolidation:
1.  **Experience Capture**: Logging raw interactions.
2.  **Triage**: Initial filtering of experiences.
3.  **Deep Dreaming**: Compression and abstraction of patterns.
4.  **Pruning**: Forgetting less relevant information.
5.  **Verification**: Ensuring integrity of consolidated knowledge.

## 🤝 Contributing

This is a research project. Contributions are welcome in the form of:
*   Theoretical improvements to the cognitive architecture.
*   Discussion on memory system implementations.
*   Review of the research findings.

## 📄 License

MIT
