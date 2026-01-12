# 🧠 Machine Dream - Continuous Machine Cognition Research Platform

## 🎯 What This System Does

Machine Dream is a **research platform** exploring continuous machine cognition through Sudoku puzzle-solving. The system demonstrates how AI models can learn from experience and consolidate knowledge through "dream cycles" inspired by human sleep.

**Core Capabilities**:
- **Pure LLM Reasoning** - No deterministic fallbacks, AI models learn through struggle
- **Learning Units** - Discrete knowledge packages created through experience consolidation
- **Dual Consolidation** - Standard (3-5 strategies) and enhanced -2x (6-10 strategies) units
- **Batch Testing Framework** - Comprehensive testing across multiple AI models and configurations
- **AISP Integration** - Low-ambiguity AI-to-AI communication protocol
- **Persistent Memory** - AgentDB-powered experience storage across sessions
- **Dreaming Pipeline** - 5-phase consolidation (Capture, Triage, Compression, Abstraction, Verification)

**The Innovation**: What if an AI system "thought" continuously, learned from experience, and consolidated knowledge during "dream cycles" like humans do?

---

## 📖 Research Basis

This project is grounded in research exploring **continuous machine cognition** and **the economics of infinite thinking**:

- **[What Happens When the Machine Never Stops Thinking?](https://agentics-nz.ghost.io/what-happens-when-the-machine-never-stops-thinking/)** - Explores the implications of continuous AI cognition and the paradigm shift from token-limited interactions to persistent reasoning systems.

- **[What Happens When the Machine Never Stops Thinking? (Part 2)](https://agentics-nz.ghost.io/what-happens-when-the-machine-never-stops-thinking-part-2/)** - Examines the economic and architectural implications of machines that engage in perpetual cognitive processes, with practical implementations.

Machine Dream implements these concepts through persistent memory (AgentDB), continuous learning loops (GRASP), and sleep-like consolidation (Dreaming Pipeline) to create an AI system that thinks, learns, and improves continuously across sessions.

### Supporting Research

**[AI Specification Protocol (AISP) 5.1](https://github.com/bar181/aisp-open-core)** by Brad Ross - A formal specification language designed for AI-to-AI communication. AISP reduces interpretation ambiguity from 40-65% (natural language) to under 2% through mathematically precise specifications that LLMs (Claude, GPT-4, Gemini) understand natively without training.

**AISP's Demonstrated Results:**
- **97x improvement** in 10-step multi-agent pipeline success rates (0.84% → 81.7%)
- **121% improvement** in technical precision for specification tasks
- **Zero execution overhead** - specification only needed at compilation, not runtime

**Relevance to Machine Dream:**

Machine Dream's LLM player faces similar challenges that AISP addresses: move generation prompts must be interpreted consistently, consolidation instructions need precision, and different AI models should produce comparable reasoning. AISP integration (`--aisp` and `--aisp-full` flags) enables experimentation with whether formal specifications can:

- Reduce parsing errors in move generation (structured output format)
- Improve multi-model consistency (same prompt → identical interpretation)
- Enhance consolidation quality (precise clustering and abstraction instructions)
- Support cross-model learning (learning units transferable between LLMs)

While AISP's benefits are well-documented for multi-agent coordination, its specific impact on Machine Dream's learning pipeline is an area of active experimentation.

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- **Node.js v20+** (v24 fully supported)
- **npm** (comes with Node.js)
- **LM Studio** (optional) - For LLM integration, running on localhost:1234

> **Test Environment Note:** Machine Dream is developed and tested on WSL (Windows Subsystem for Linux) with LM Studio running on the Windows host. The `llm play` command includes automatic model loading that requires the `lms` CLI to be accessible from WSL. See [CLI Reference - WSL Setup](docs/cli-reference.md#test-environment-wsl--lm-studio) for configuration details.

### Installation
```bash
git clone https://github.com/your-org/machine-dream.git
cd machine-dream_AG
npm install
npm run build
npm link  # Makes 'machine-dream' command available globally
```

### Try It Out

```bash
# 1. Check system health (uses real backends)
machine-dream system status

# 2. Solve a puzzle with GRASP loop
machine-dream solve puzzles/easy-01.json

# 3. View memory patterns learned
machine-dream memory list

# 4. Run dream consolidation
machine-dream dream run

# 5. Launch interactive TUI
machine-dream tui
```

**That's it!** You're now running a production-ready continuous cognition system.

---

## 🎮 Component Status

| Component | Implementation | Tests | Status |
|-----------|----------------|-------|--------|
| **Puzzle Engine** | ✅ Stable | 114/114 | Sudoku generation, validation, rules |
| **LLM Integration** | ✅ Stable | Passing | Pure LLM player with profiles, AISP support |
| **AI Model Profiles** | ✅ Stable | 83/83 | Multi-provider connection management |
| **Learning Units** | ✅ Stable | - | Discrete knowledge packages with consolidation |
| **Dreaming Pipeline** | ✅ Stable | 41/41 | 5-phase consolidation (standard + dual -2x) |
| **GRASP Loop** | ✅ Stable | 83/83 | Generate, Review, Absorb, Synthesize, Persist |
| **AgentDB (Local)** | ✅ Stable | 72/72 | SQLite-based persistence layer |
| **CLI Interface** | ✅ Stable | 310/310 | LLM commands, memory, system, dream |
| **Batch Testing** | ✅ Stable | - | Comprehensive suite + validation scripts |
| **Puzzle Generator** | ✅ Stable | Passing | Seeded random generation (4×4 to 25×25) |
| **Memory Management** | ✅ Stable | 18/18 | 7 CLI commands with AgentDB backend |
| **System Administration** | ✅ Stable | 20/20 | 5 CLI commands with real metrics |
| **TUI (Terminal UI)** | ⚠️ Experimental | Passing | Under active development, may not work properly |

**Total Tests**: 310 passing (100% pass rate)
**TypeScript**: 0 errors
**Focus**: LLM learning and batch testing workflows

---

## 💻 Core Workflow

The primary workflow focuses on **LLM learning through experience and consolidation**:

### 1. Profile Setup
```bash
# Create AI model profile
machine-dream llm profile add \
  --name qwen3-coder \
  --provider lmstudio \
  --base-url http://localhost:1234/v1 \
  --model qwen3-30b-instruct \
  --set-default

# Test connection
machine-dream llm profile test
```

### 2. Training Runs (Generate Experiences)
```bash
# Play puzzles and accumulate experiences
machine-dream llm play puzzles/9x9-easy.json --profile qwen3-coder
machine-dream llm play puzzles/9x9-easy.json --visualize-basic

# Training run script (multiple plays)
./scripts/training-run.sh --profile qwen3-coder --puzzle puzzles/9x9-easy.json --runs 10
```

### 3. Consolidation (Create Learning Units)
```bash
# Dream cycle: consolidate experiences into learning unit
machine-dream llm dream --learning-unit my-training-v1

# Comprehensive suite: generate learning units for all profiles
./scripts/comprehensive-test-suite.sh --runs 3
# Creates: profile_puzzle_standard_timestamp
#          profile_puzzle_standard_timestamp-2x (dual consolidation)
```

### 4. Validation Testing
```bash
# Test with specific learning unit
machine-dream llm play puzzles/9x9-easy.json --learning-unit my-training-v1

# Batch validation: compare multiple units
./scripts/batch-test-learning-unit.sh \
  --profiles qwen3:unit_standard,qwen3:unit_standard-2x \
  --runs 10

# A/B testing: learning vs baseline
./scripts/ab-test-learning.sh --profile qwen3-coder --puzzle puzzles/9x9-easy.json --runs 5
```

### 5. Analysis
```bash
# View session statistics
machine-dream llm stats

# List learning units
machine-dream llm learning list

# Check system health
machine-dream system status
```

### Additional Commands

**Memory Management**:
```bash
machine-dream memory list           # List experiences
machine-dream memory search "text"  # Search patterns
machine-dream memory backup backup.json
```

**System Administration**:
```bash
machine-dream system status   # System health
machine-dream system init     # Initialize system
machine-dream system cleanup  # Clean old sessions
```

**Puzzle Generation**:
```bash
machine-dream puzzle generate --size 9 --difficulty medium
machine-dream puzzle from-seed 12345 --size 9 --difficulty hard
```

---

## 🤖 LLM Integration

### AI Model Profiles (Spec 13)

Manage connection profiles for multiple LLM providers:

```bash
# Create profile for local LM Studio
machine-dream llm profile add \
  --name lm-studio-qwen3 \
  --provider lmstudio \
  --base-url http://localhost:1234/v1 \
  --model qwen3-30b \
  --set-default

# Create profile for OpenAI
machine-dream llm profile add \
  --name openai-gpt4 \
  --provider openai \
  --api-key "${OPENAI_API_KEY}" \
  --model gpt-4

# Switch profiles
machine-dream llm profile set openai-gpt4

# Test connection
machine-dream llm profile test

# List all profiles
machine-dream llm profile list
```

**Supported Providers**:
- **LM Studio** - Local models (privacy, no costs, offline)
- **OpenAI** - GPT-3.5, GPT-4 (cloud, API costs)
- **Anthropic** - Claude 3 models (cloud, API costs)
- **Ollama** - Local models via Ollama server
- **OpenRouter** - Multi-provider gateway
- **Custom** - Any OpenAI-compatible API endpoint

### Pure LLM Sudoku Player

```bash
# Play with active profile
machine-dream llm play puzzles/easy-01.json

# Play with specific profile
machine-dream llm play puzzles/easy-01.json --profile lm-studio-qwen3

# Baseline mode (no memory - for A/B testing)
machine-dream llm play puzzles/easy-01.json --no-memory

# View statistics
machine-dream llm stats

# Run consolidation
machine-dream llm dream

# Benchmark learning (memory ON vs OFF)
machine-dream llm benchmark
```

**Design Philosophy**:
- **No hints** - LLM learns through struggle
- **No deterministic fallback** - Pure LLM reasoning
- **Memory persistence** - Experiences stored in AgentDB
- **Dreaming consolidation** - Pattern synthesis during "sleep"

### Learning Units (Spec 11)

Learning units are discrete packages of consolidated knowledge that enable:
- **Multiple learning tracks** - Create separate units for different puzzle types
- **Iterative learning** - Absorb new experiences over time
- **Unit merging** - Combine knowledge from different training runs

```bash
# List learning units for a profile
machine-dream llm learning list --profile qwen3-coder

# Create a new learning unit
machine-dream llm learning create my-training-v1 --profile qwen3-coder

# Play using a specific learning unit
machine-dream llm play puzzles/4x4-expert.json --learning-unit my-training-v1

# Run dream cycle to consolidate into a learning unit
machine-dream llm dream run --learning-unit my-training-v1

# View learning unit details
machine-dream llm learning show my-training-v1

# Export/import for sharing
machine-dream llm learning export my-training-v1 backup.json
machine-dream llm learning import backup.json --id imported-training

# Merge two learning units
machine-dream llm learning merge unit1 unit2 --output merged-unit
```

**Batch Testing Scripts**:
```bash
# A/B test: learning vs no learning
./scripts/ab-test-learning.sh --puzzle puzzles/4x4-expert.json --runs 5

# Iterative learning: track improvement over time
./scripts/iterative-learning.sh --batch-size 2 --total-plays 10 --learning-unit train-v1

# AISP mode for low-ambiguity prompts
./scripts/ab-test-learning.sh --puzzle puzzles/9x9-easy.json --aisp

# Double strategies for enhanced learning
./scripts/iterative-learning.sh --learning-unit deep-v1 --double-strategies
```

### AISP Integration

**[AI Specification Protocol (AISP)](https://github.com/bar181/aisp-open-core)** - A formal specification language that reduces ambiguity in AI-to-AI communication from 40-65% (natural language) to under 2%.

**Research Basis**: [AISP 5.1 Specification](https://github.com/bar181/aisp-open-core) - Formal protocol design and empirical validation demonstrating 97x improvement in multi-agent AI pipeline success rates.

**What is AISP?**
AISP is a proof-carrying protocol that LLMs understand natively—no training, no fine-tuning, no special interpreters required. It uses mathematical notation and formal structures to eliminate interpretation variance across AI models (Claude, GPT-4, Gemini, etc.).

**Key Benefits**:
- **97x improvement** in multi-agent pipeline success rates (82% vs 0.84%)
- **Native comprehension** - Works with modern LLMs without modification
- **Zero execution overhead** - Specification only needed during compilation
- **Self-validating** - Each document carries its own well-formedness proof

**Machine Dream Integration**:
```bash
# --aisp: Convert prompts to AISP syntax (model responds normally)
machine-dream llm play puzzles/9x9-easy.json --aisp

# --aisp-full: End-to-end AISP (spec in prompt, model outputs AISP)
machine-dream llm play puzzles/9x9-easy.json --aisp-full
```

AISP mode is particularly effective for reducing parsing errors and improving move consistency across different AI models. See [Spec 11](docs/specs/11-llm-sudoku-player.md) for implementation details.

### Recent Improvements (2026-01-13)

**Smart Model Loading** - Scripts now detect models in "loading" state and wait instead of triggering unnecessary unload/reload cycles:
```bash
# Automatically waits for loading models (up to 60 seconds)
machine-dream llm play puzzles/9x9-easy.json --profile qwen3-coder
```

**Live Move Output** - New `--visualize-basic` flag shows compact move-by-move results:
```bash
# See each move as it happens
machine-dream llm play puzzles/9x9-easy.json --visualize-basic
# Output: Move 1: (0,2)=5 - CORRECT
#         Move 2: (0,3)=8 - WRONG
#         Move 3: (0,0)=0 - PARSE_FAILURE
```

**Dual Consolidation** - Comprehensive test suite now creates both standard and enhanced learning units:
```bash
# Creates two units: standard (3-5 strategies) and -2x (6-10 strategies)
./scripts/comprehensive-test-suite.sh --runs 3
# Output: gpt-oss_9x9-easy_standard_20260113
#         gpt-oss_9x9-easy_standard_20260113-2x
```

**Profile Exclusion** - Skip specific profiles during batch testing:
```bash
# Test all profiles except deepseek-r1
./scripts/comprehensive-test-suite.sh --exclude deepseek-r1
```

**Size-Based Ordering** - Profiles automatically tested in order from largest to smallest model:
```bash
# Tests 120B model first, then 32B, then smaller
./scripts/comprehensive-test-suite.sh --runs 3
```

**Validation Testing** - New `batch-test-learning-unit.sh` script for testing specific learning units without dream cycle:
```bash
# Compare standard vs -2x units for same profile
./scripts/batch-test-learning-unit.sh \
  --profiles gpt-oss:unit_standard,gpt-oss:unit_standard-2x \
  --runs 10
```

See [scripts/SCRIPTS.md](scripts/SCRIPTS.md) for complete documentation of all batch testing scripts and workflows.

### LM Studio Model Management

> **Note:** The `llm play` command now automatically loads the required model based on your profile configuration. Manual model management is typically not needed.

```bash
# List available models
machine-dream llm model list

# Manual model control (use lms CLI directly)
lms load "qwen3-30b-instruct"
lms unload --all
lms ps  # Show loaded models
```

### Reasoning Token Display

```bash
# Show full LM Studio reasoning tokens (v0.3.9+)
machine-dream llm play puzzles/9x9-easy.json --show-reasoning
```

---

## 🎲 Puzzle Generation (Spec 12)

Generate randomized Sudoku puzzles with seed-based reproducibility:

```bash
# Generate single puzzle
machine-dream puzzle generate --size 9 --difficulty medium

# Generate from specific seed (reproducible)
machine-dream puzzle from-seed 12345 --size 9 --difficulty hard

# Batch generation for training data
machine-dream puzzle batch --count 100 --seed-mode sequential
```

**Features**:
- **Seed-based reproducibility** - Same seed = identical puzzle
- **Variable grid sizes** - 4×4, 9×9, 16×16, 25×25
- **Difficulty scaling** - Easy to Diabolical with size-specific clue counts
- **Symmetry patterns** - None, Rotational, Reflectional, Diagonal
- **Uniqueness validation** - Ensures exactly one solution

---

## 🎯 Interactive Terminal UI (TUI)

Launch the Ink-based TUI for visual exploration:

```bash
# Launch TUI
machine-dream tui

# With theme selection
machine-dream tui --theme light

# With debug output for testing
machine-dream tui --debug-output /tmp/tui-events.jsonl
```

**Status**: ⚠️ **Experimental** - Under active development, may not work properly

The TUI is a work-in-progress terminal interface currently being migrated between UI frameworks. For stable interactions, use the CLI commands directly as documented in the Core Workflow section above.

---

## 📂 Project Structure

```
machine-dream_AG/
├── docs/                         # 📚 Documentation & Specifications
│   ├── specs/                    # 15 formal specifications (Spec 01-15)
│   │   ├── 11-llm-sudoku-player.md    # LLM integration
│   │   ├── 13-llm-profile-management.md # AI model profiles
│   │   ├── 15-batch-testing-spec.md    # Batch testing framework
│   │   └── ...
│   ├── adr/                      # Architecture Decision Records
│   ├── research/                 # Research documentation
│   └── continuous-machine-thinking-research.md
├── src/
│   ├── llm/                      # 🤖 LLM Integration (Primary Focus)
│   │   ├── LMStudioClient.ts     # OpenAI-compatible API client
│   │   ├── LLMSudokuPlayer.ts    # Pure LLM Sudoku solver
│   │   ├── ModelManager.ts       # Model lifecycle management
│   │   ├── DreamingConsolidator.ts # Experience consolidation
│   │   └── ProfileManager.ts     # Multi-provider profiles
│   ├── cli/
│   │   └── commands/             # 🎮 CLI Commands
│   │       ├── llm.ts            # LLM play, profiles, learning units
│   │       ├── memory.ts         # Memory management
│   │       ├── system.ts         # System administration
│   │       └── dream.ts          # Dream consolidation
│   ├── agentdb/                  # 💾 Persistence Layer
│   │   └── LocalAgentDB.ts       # SQLite-based AgentDB adapter
│   ├── engine/                   # 🧩 Sudoku Engine
│   │   ├── SudokuEngine.ts       # Rules and validation
│   │   └── PuzzleGenerator.ts    # Seeded random generation
│   ├── consolidation/            # 🌙 Dreaming Pipeline
│   │   └── DreamingController.ts # 5-phase consolidation
│   ├── cognition/                # 🧠 GRASP Loop
│   ├── memory/                   # 💾 AgentMemory Wrapper
│   ├── tui/                      # ⚠️ Terminal UI (Experimental)
│   └── orchestration/            # 🎼 System Lifecycle
├── scripts/                      # 🧪 Batch Testing Scripts
│   ├── comprehensive-test-suite.sh    # Generate learning units (all profiles)
│   ├── batch-test-learning-unit.sh    # Validate specific units
│   ├── ab-test-learning.sh            # A/B testing (learning vs baseline)
│   ├── iterative-learning.sh          # Iterative improvement tracking
│   ├── training-run.sh                # Basic training runs
│   └── SCRIPTS.md                     # Complete script documentation
├── tests/                        # ✅ 310 Tests (100% passing)
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── llm/                      # LLM-specific tests
└── puzzles/                      # 🎲 Puzzle Collection
    ├── 4x4-expert.json           # Training puzzles
    ├── 9x9-easy.json
    └── 9x9-ai-escargot.json      # World's hardest puzzle
```

---

## 🔬 Research Focus

### Core Question
**"What would you build if thinking were free?"**

### Key Concepts
- **AgentDB Integration** - SQLite-based cognitive memory layer
  - **ReasoningBank** - Stores successful moves and strategies
  - **ReflexionMemory** - Episodic replay and self-critique
  - **SkillLibrary** - Consolidates repeated successes
- **GRASP Framework** - Generate → Review → Absorb → Synthesize → Persist
- **Dreaming Architecture** - 5-phase consolidation (Capture, Triage, Compression, Abstraction, Verification)
- **Continuous Cognition** - AI that "never stops thinking"

### Research Documentation
- [Continuous Machine Thinking Research](docs/continuous-machine-thinking-research.md)
- [POC Strategy Report](docs/poc-strategy-report.md)
- [17 Formal Specifications](docs/specs/)
- [10 Architecture Decision Records](docs/adr/)
- [Hardest Sudoku Puzzles](docs/research/hardest-sudoku-puzzles.md)

### Notable Puzzles
- **AI Escargot** - World's hardest 9x9 Sudoku (Arto Inkala, 2006): `puzzles/9x9-ai-escargot.json`

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [**User Guide**](docs/USER_GUIDE.md) | Complete installation, usage, and configuration guide |
| [**Week 2 Completion Report**](docs/WEEK2-COMPLETION-REPORT.md) | Full Week 2 implementation summary (310 tests, 0 mocks) |
| [**Production Action Plan**](docs/PRODUCTION_ACTION_PLAN.md) | 11-week roadmap to full production deployment |
| [**Week 2 Progress Tracker**](docs/week2-progress.md) | Day-by-day Week 2 breakdown |
| [**Architecture Specs**](docs/specs/) | 17 formal specifications (Spec 01-17) |
| [**Architecture Decision Records**](docs/adr/) | 10 ADRs documenting key decisions |
| [**Hardest Puzzles Research**](docs/research/hardest-sudoku-puzzles.md) | Research on world's hardest Sudoku puzzles |

---

## 🧪 Testing Approach

### Unit & Integration Tests
```bash
# All tests (310 passing)
npm test

# Unit tests only
npm test -- unit

# Integration tests only
npm test -- integration

# With coverage
npm test -- --coverage
```

**Test Coverage**:
- 310 tests passing (100% pass rate)
- 0 TypeScript errors
- Unit tests: Puzzle engine, GRASP loop, memory, consolidation
- Integration tests: CLI commands, LLM player, profiles

### Comprehensive Test Suite

The **comprehensive-test-suite.sh** script is the primary tool for generating and testing learning units across multiple AI models:

```bash
# Generate learning units for all profiles
./scripts/comprehensive-test-suite.sh --runs 3

# Test specific profiles, exclude one
./scripts/comprehensive-test-suite.sh \
  --profiles gpt-oss-120b,qwq-32b \
  --exclude deepseek-r1

# Disable dual mode (only create standard units)
./scripts/comprehensive-test-suite.sh --no-dual --skip-dream
```

**What it does**:
1. **Tests all profiles** in size order (largest model first)
2. **Runs multiple modes**: standard, aisp, aisp-full
3. **Creates dual learning units**:
   - Standard (3-5 strategies)
   - -2x (6-10 strategies for enhanced learning)
4. **Shows live move output** with `--visualize-basic`
5. **Smart model loading** (detects loading state, prevents unnecessary reloads)

**Output**:
- Creates `comprehensive-results/<timestamp>/` directory
- Generates `summary.csv` with solve rates per profile/mode
- Saves individual run logs
- Creates learning units with timestamp IDs

### Batch Testing & Validation

**Validate specific learning units** without dream cycle:

```bash
# Compare standard vs -2x units
./scripts/batch-test-learning-unit.sh \
  --profiles gpt-oss:unit_standard,gpt-oss:unit_standard-2x \
  --runs 10

# Test multiple profiles with their own units
./scripts/batch-test-learning-unit.sh \
  --profiles gpt-oss:unit1,qwq:unit2,nemotron:unit3 \
  --runs 5 \
  --modes standard,aisp
```

**A/B testing** (learning vs baseline):

```bash
# Compare learning ON vs OFF
./scripts/ab-test-learning.sh \
  --profile qwen3-coder \
  --puzzle puzzles/4x4-expert.json \
  --runs 10
```

**Iterative learning** (track improvement over time):

```bash
# Run batches with dream consolidation between
./scripts/iterative-learning.sh \
  --profile qwen3-coder \
  --batch-size 3 \
  --total-plays 15
```

See [scripts/SCRIPTS.md](scripts/SCRIPTS.md) for complete documentation of all testing workflows.

---

## 🛠️ Development

### Run Tests
```bash
# All tests (310 passing)
npm test

# Unit tests only
npm test -- unit

# Integration tests only
npm test -- integration

# With coverage
npm test -- --coverage
```

### Type Checking & Linting
```bash
# TypeScript (0 errors)
npm run typecheck

# Linting
npm run lint

# Build
npm run build
```

### Development Mode
```bash
# CLI development
npm run dev

# TUI development
npx tsx src/tui/tui-bin.ts

# Watch mode
npm run dev:watch
```

---

## 🤝 Contributing

This is a research project. Contributions welcome for:
- Theoretical improvements to cognitive architecture
- Memory system optimizations
- LLM integration enhancements
- Documentation improvements
- Bug reports and fixes

---

## 📄 License

MIT

---

## 🎯 Next Steps

1. **Try the system**: `machine-dream solve puzzles/easy-01.json`
2. **Explore the TUI**: `machine-dream tui`
3. **Read the User Guide**: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
4. **Set up LLM integration**: [docs/specs/11-llm-sudoku-player.md](docs/specs/11-llm-sudoku-player.md)
5. **Review Week 2 achievements**: [docs/WEEK2-COMPLETION-REPORT.md](docs/WEEK2-COMPLETION-REPORT.md)

**Welcome to the frontier of continuous machine cognition!** 🧠✨

