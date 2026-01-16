# Machine Dream

**Continuous Machine Cognition Research Platform**

An AI system that learns from experience, consolidates knowledge during "dream cycles," and improves continuously across sessions—using Sudoku as a testbed for exploring persistent machine learning.

## What It Does

Machine Dream demonstrates **continuous cognition**: AI models that think, learn, and remember across sessions without external hints or deterministic fallbacks.

**The Learning Loop:**
```
Play → Make moves (correct and incorrect) → Store experiences
         ↓
Dream → Cluster patterns → Synthesize strategies → Learn from failures
         ↓
Improve → Apply learned strategies → Fewer errors → Better performance
```

**Core Capabilities:**
- **Pure LLM Reasoning** — No hints, no fallbacks; models learn through struggle
- **Dreaming Pipeline** — 5-phase consolidation extracts patterns from experience
- **Failure Learning** — Anti-patterns from mistakes + reasoning corrections
- **Learning Units** — Discrete knowledge packages, transferable between sessions
- **Multi-Algorithm** — FastCluster, DeepCluster, LLMCluster with versioning
- **AISP Integration** — Low-ambiguity AI-to-AI communication protocol

---

## Research Background

This project implements concepts from research on continuous machine cognition:

- [What Happens When the Machine Never Stops Thinking? - Part 1](https://agentics-nz.ghost.io/what-happens-when-the-machine-never-stops-thinking/) — Implications of continuous AI cognition
- [What Happens When the Machine Never Stops Thinking? - Part 2](https://agentics-nz.ghost.io/what-happens-when-the-machine-never-stops-thinking-part-2/) — Economic and architectural implications

**Key architectural concepts:**
- **GRASP Loop** — Generate → Review → Absorb → Synthesize → Persist
- **AgentDB** — SQLite-based cognitive memory (ReasoningBank, ReflexionMemory)
- **Dreaming** — 5-phase consolidation inspired by human sleep

---

## Quick Start

**Prerequisites:** Node.js v20+ and optionally [LM Studio](https://lmstudio.ai/) for local LLM inference.

```bash
git clone https://github.com/your-org/machine-dream.git
cd machine-dream_AG
npm install && npm run build && npm link

# Verify installation
machine-dream system status
```

**Basic usage:**
```bash
machine-dream llm play puzzles/9x9-easy.json    # Play a puzzle
machine-dream llm dream run                      # Consolidate experiences
machine-dream llm learning list                  # View learning units
```

---

## Core Workflow

### 1. Setup Profile
```bash
machine-dream llm profile add \
  --name qwen3 --provider lmstudio \
  --base-url http://localhost:1234/v1 \
  --model qwen3-30b-instruct --set-default

machine-dream llm profile test
```

### 2. Generate Experiences
```bash
# Single play
machine-dream llm play puzzles/9x9-easy.json

# Training batch (10 runs)
./scripts/training-run.sh --profile qwen3 --puzzle puzzles/9x9-easy.json --runs 10
```

### 3. Consolidate (Dream)
```bash
# Create learning unit from experiences
machine-dream llm dream run --profile qwen3

# Creates both standard (3-5 strategies) and -2x (6-10 strategies) units
```

### 4. Validate
```bash
# Play with learned strategies
machine-dream llm play puzzles/9x9-easy.json --learning-unit qwen3_20260114

# A/B test: learning vs baseline
./scripts/ab-test-learning.sh --profile qwen3 --runs 5
```

### 5. Iterate
```bash
# View statistics
machine-dream llm stats

# List all learning units (newest first)
machine-dream llm learning list --sort created --reverse

# Show unit details (strategies, anti-patterns, corrections)
machine-dream llm learning show <unit-id>
```

---

## Key Features

### Dreaming Algorithms

Three clustering algorithms for experience consolidation:

| Algorithm | Speed | Best For |
|-----------|-------|----------|
| **FastCluster v2** | <5s | Production, quick iteration |
| **DeepCluster v1** | <60s | Better semantic quality |
| **LLMCluster v1** | <180s | Research, maximum quality |

```bash
machine-dream llm dream run --algorithm llmcluster --profile qwen3
```

### Failure Learning

The system learns from both successes AND failures:

- **Anti-Patterns** — Clustered invalid moves → "what NOT to do"
- **Reasoning Corrections** — Analysis of valid-but-wrong moves → "why reasoning failed"

```bash
# Enabled by default; disable for faster consolidation
machine-dream llm dream run --no-failure-learning
```

### AISP Mode

[AI Specification Protocol](https://github.com/bar181/aisp-open-core) reduces prompt ambiguity:

```bash
machine-dream llm play puzzles/9x9-easy.json --aisp       # AISP prompt validation
machine-dream llm play puzzles/9x9-easy.json --aisp-full  # Full validation (prompt + response)
machine-dream llm dream run --aisp-full                   # Full validation for dreaming
```

**Validation Modes:**
- `--aisp` — Validates prompts only; warns on low tier
- `--aisp-full` — Validates both prompts AND responses; triggers critique workflow on Reject tier

**Validation Tiers:** Platinum (δ≥0.75), Gold (δ≥0.60), Silver (δ≥0.40), Bronze (δ≥0.20), Reject (δ<0.20)

Session AISP mode is tracked and visible in session list/show:
```bash
machine-dream llm session list    # Shows Mode column (std/aisp/aisp-full)
machine-dream llm session show <id>
```

### Multi-Provider Support

Profiles for LM Studio, OpenAI, Anthropic, Ollama, OpenRouter, or any OpenAI-compatible API.

```bash
machine-dream llm profile list
machine-dream llm profile add --name gpt4 --provider openai --api-key "${OPENAI_API_KEY}"
```

---

## Batch Testing

```bash
# Comprehensive suite: all profiles, all modes, dual consolidation
./scripts/comprehensive-test-suite.sh --runs 3

# Compare learning units
./scripts/batch-test-learning-unit.sh --profiles qwen3:unit1,qwen3:unit2 --runs 10

# Iterative learning with consolidation between batches
./scripts/iterative-learning.sh --batch-size 3 --total-plays 15
```

See [scripts/SCRIPTS.md](scripts/SCRIPTS.md) for complete documentation.

---

## Project Status

| Component | Status |
|-----------|--------|
| Puzzle Engine | Stable (114 tests) |
| LLM Integration | Stable |
| Dreaming Pipeline | Stable (41 tests) |
| Learning Units | Stable |
| CLI Interface | Stable (310 tests total) |
| TUI | Experimental |

**Total:** 310 tests passing, 0 TypeScript errors

---

## Documentation

| Document | Description |
|----------|-------------|
| [User Guide](docs/USER_GUIDE.md) | Complete usage and configuration |
| [CLI Reference](docs/cli-reference.md) | All commands and options |
| [Specifications](docs/specs/) | 19 formal specifications |
| [ADRs](docs/adr/) | 13 architecture decision records |
| [Scripts Guide](scripts/SCRIPTS.md) | Batch testing workflows |

### Key Specifications
- [Spec 11: LLM Integration](docs/specs/11-llm-sudoku-player.md)
- [Spec 18: Algorithm Versioning](docs/specs/18-algorithm-versioning-system.md)
- [Spec 19: Failure Learning](docs/specs/19-failure-learning-spec.md)

---

## Development

```bash
npm test              # Run all tests (310 passing)
npm run typecheck     # TypeScript validation
npm run build         # Build project
npm run dev           # Development mode
```

---

## Contributing

Research project — contributions welcome for:
- Cognitive architecture improvements
- Memory system optimizations
- LLM integration enhancements
- Documentation and bug fixes

---

## License

MIT

