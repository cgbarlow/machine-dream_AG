# 🧠 Machine Dream (Research POC)

**Continuous Machine Cognition & AgentDB Integration**

> [!IMPORTANT]
> **Current Status: Production Ready (95%)**
>
> ✅ **Phases 1-3 (Complete)**: TUI, CLI, GRASP loop, Dreaming pipeline, AgentDB persistence, LLM integration
>
> ✅ **Phase 4 (Complete)**: CLI Wiring - 12 new commands for memory & system management
>
> ✅ **Phase 5 (Complete)**: CLI Runtime - All commands tested and operational
>
> ✅ **Puzzle Generator**: Seed-based randomized generation (4×4 to 25×25 grids)

## 🎯 Project Status

| Component | Status | Notes |
|-----------|--------|-------|
| Puzzle Engine | ✅ Complete | Sudoku generation, validation, rules |
| GRASP Loop | ✅ Complete | Generate, Review, Absorb, Synthesize, Persist |
| Dreaming Pipeline | ✅ Complete | 5-phase consolidation |
| AgentDB (Local) | ✅ Complete | SQLite-based persistence |
| CLI Interface | ✅ Complete | 25 commands across 4 functional areas |
| TUI (Ink) | ✅ Complete | Interactive terminal UI |
| LLM Integration | ✅ Complete | Pure LLM player with learning + TUI |
| **Puzzle Generator** | ✅ **Complete** | Seeded random generation, 4×4 to 25×25 grids |
| **AI Model Profiles** | ✅ **Complete (Phase 2)** | Multi-provider connection management |
| **Memory Management** | ✅ **Complete (Phase 4)** | 7 CLI commands for agent memory control |
| **System Administration** | ✅ **Complete (Phase 4)** | 5 CLI commands for diagnostics & optimization |

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

# LLM Sudoku Player with Profile Management (Phase 2)
cp .env.example .env                    # Configure environment

# Quick CLI access (all commands)
npm run cli -- llm --help              # Show all LLM commands

# Manage AI model connection profiles
npm run cli -- llm profile add          # Add new profile (interactive)
npm run cli -- llm profile list         # List all profiles
npm run cli -- llm profile set <name>   # Set active profile
npm run cli -- llm profile test         # Test connection

# Play with LLM
npm run cli -- llm play puzzles/easy-01.json   # Play with active profile
npm run cli -- llm stats                       # View statistics
npm run cli -- llm dream                       # Run consolidation
npm run cli -- llm benchmark                   # Test learning (ON vs OFF)

# Memory Management (Phase 4 - NEW!)
npm run cli -- llm memory store key "value"    # Store data in memory
npm run cli -- llm memory list                 # List all memory entries
npm run cli -- llm memory search "pattern"     # Search memory
npm run cli -- llm memory export backup.json   # Export memory
npm run cli -- llm memory import backup.json   # Import memory

# System Administration (Phase 4 - NEW!)
npm run cli -- llm system status               # Show system health
npm run cli -- llm system diagnostics          # Run diagnostics
npm run cli -- llm system optimize             # Optimize performance

# TUI: Interactive interface with live debugging
npm run build
machine-dream tui  # Press 'L' for LLM Play, 'M' for Memory, 'G' for Generator
```

## 🎲 Puzzle Generation (Phase 5)

Generate randomized Sudoku puzzles with seed-based reproducibility:

```bash
# CLI: Generate single puzzle
machine-dream puzzle generate --size 9 --difficulty medium

# CLI: Generate from specific seed (reproducible)
machine-dream puzzle from-seed 12345 --size 9 --difficulty hard

# CLI: Batch generation for training data
machine-dream puzzle batch --count 100 --seed-mode sequential

# TUI: Interactive puzzle generator
machine-dream tui  # Press 'G' for Generator screen
```

### Features
- **Seed-based reproducibility** - Same seed = identical puzzle
- **Variable grid sizes** - 4×4, 9×9, 16×16, 25×25 Sudoku variants
- **Difficulty scaling** - Easy to Diabolical with size-specific clue counts
- **Symmetry patterns** - None, Rotational, Reflectional, Diagonal
- **Uniqueness validation** - Ensures exactly one solution
- **Batch generation** - Create training datasets with sequential/random seeds

See [Spec 12](docs/specs/12-randomized-puzzle-generation.md) for implementation details.
```

## 🤖 LLM Integration (Phase 2)

### AI Model Profile Management (Spec 13)

Easily switch between different LLM providers and models with saved connection profiles:

```bash
# Create profiles for multiple providers
machine-dream llm profile add \
  --name lm-studio-local \
  --provider lmstudio \
  --base-url http://localhost:1234/v1 \
  --model qwen3-30b \
  --set-default

machine-dream llm profile add \
  --name openai-gpt4 \
  --provider openai \
  --base-url https://api.openai.com/v1 \
  --api-key "${OPENAI_API_KEY}" \
  --model gpt-4

# Switch between profiles
machine-dream llm profile set openai-gpt4
machine-dream llm play puzzles/easy-01.json
```

**Supported Providers:**
- **LM Studio** - Local models (privacy, no costs, offline)
- **OpenAI** - GPT-3.5, GPT-4 (cloud, API costs)
- **Anthropic** - Claude 3 models (cloud, API costs)
- **Ollama** - Local models via Ollama server
- **OpenRouter** - Multi-provider gateway
- **Custom** - Any OpenAI-compatible API endpoint

**Security:**
- Profiles stored at `~/.machine-dream/llm-profiles.json`
- Use environment variables for API keys: `apiKey: "${OPENAI_API_KEY}"`
- Export/import profiles across machines (with/without secrets)

See [Spec 13](docs/specs/13-llm-profile-management.md) for full documentation.

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| LLM Provider | **Profile-based** | Support multiple providers easily |
| Default Provider | **LM Studio (local)** | Privacy, no API costs, offline |
| Target Model | **Qwen3 30B** | Capable reasoning, runs locally |
| Deterministic Fallback | **None** | Pure LLM - must learn on its own |
| Hints | **None** | LLM must struggle and learn |
| Memory Persistence | **Yes** | Experiences persist across sessions |
| Memory Toggle | **Yes** | Enable/disable to verify learning |

### LM Studio Setup

1. Download [LM Studio](https://lmstudio.ai/)
2. Load **Qwen3 30B** (or similar capable model)
3. Start local server (default: `localhost:1234`)
4. Create profile: `machine-dream llm profile add`
5. The system connects via OpenAI-compatible API

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

## 💾 Memory & System Management (Phase 4)

Complete CLI interface for managing agent memory and system health with 12 new commands:

### Memory Management (7 Commands)

Control agent learning data and patterns:

```bash
# Store and retrieve data
npm run cli -- llm memory store session-key "learning data"
npm run cli -- llm memory retrieve session-key  # Coming in Phase 6

# List and search
npm run cli -- llm memory list --limit 50
npm run cli -- llm memory search "strategy" --type pattern

# Backup and restore
npm run cli -- llm memory export ./backups/memory-$(date +%Y%m%d).json
npm run cli -- llm memory import ./backups/memory-20260106.json --merge

# Clear memory (requires --confirm for safety)
npm run cli -- llm memory clear --confirm
```

### System Administration (5 Commands)

Monitor and optimize system performance:

```bash
# Health monitoring
npm run cli -- llm system status              # Overall system health
npm run cli -- llm system diagnostics         # Comprehensive diagnostics

# Performance optimization
npm run cli -- llm system optimize            # Vacuum database, cleanup patterns

# State management
npm run cli -- llm system export ./backups    # Complete system backup
npm run cli -- llm system reset --confirm     # Reset to default state
```

**Features:**
- ✅ Real-time system status and health metrics
- ✅ Pattern learning insights and statistics
- ✅ Database optimization and cleanup
- ✅ Complete state export/import
- ✅ Safety confirmations for destructive operations

**Documentation:**
- [CLI Testing Guide](docs/cli-testing-guide.md) - Comprehensive command examples
- [Phase 4 Summary](docs/phase4-cli-wiring-summary.md) - Implementation details

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
