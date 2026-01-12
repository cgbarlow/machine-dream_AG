# 🎮 Machine Dream - Complete User Guide

**Production-Ready Continuous Machine Cognition System**

Welcome to Machine Dream! This guide will help you install, configure, and use this production-ready research platform exploring continuous machine cognition through Sudoku puzzle-solving with persistent learning.

> **Production Status**: ✅ All critical CLI commands use **real backends** (zero mock implementations)
> **Test Suite**: ✅ 310/310 tests passing (100% pass rate)
> **TypeScript**: ✅ 0 errors
> **Documentation**: ✅ Complete and up-to-date

---

## 📑 Table of Contents

1. [Quick Start](#-quick-start-5-minutes)
2. [What Machine Dream Does](#-what-machine-dream-does)
3. [Installation](#-installation)
4. [Command-Line Interface (CLI)](#-command-line-interface-cli)
   - [Memory Management](#memory-management-7-commands-production-ready)
   - [System Administration](#system-administration-5-commands-production-ready)
   - [Dream Consolidation](#dream-consolidation-2-commands-production-ready)
   - [Configuration Management](#configuration-management-2-commands-production-ready)
   - [Puzzle Operations](#puzzle-operations)
   - [LLM Integration](#llm-integration)
5. [Terminal User Interface (TUI)](#-terminal-user-interface-tui)
6. [Configuration](#%EF%B8%8F-configuration)
7. [Understanding the System](#-understanding-the-system)
8. [Data Persistence](#-data-persistence)
9. [Troubleshooting](#-troubleshooting)
10. [Best Practices](#-best-practices)
11. [Advanced Usage](#-advanced-usage)

---

## ⚡ Quick Start (5 Minutes)

### Prerequisites
- **Node.js v20+** (v24 fully supported and tested)
- **npm** (comes with Node.js)
- **Terminal** with UTF-8 support

### 1. Installation
```bash
git clone https://github.com/your-org/machine-dream.git
cd machine-dream_AG
npm install
npm run build
npm link  # Makes 'machine-dream' command globally available
```

### 2. Verify Installation
```bash
# Check system status (uses real process metrics + database)
machine-dream system status

# Expected output:
# ✅ System Status
# ────────────────────────────────────────
# Version: 0.1.0
# Uptime: 12.456 seconds
# Memory: 45.2 MB / 123.4 MB
# Database: Healthy (.agentdb/agent.db)
```

### 3. Try Core Features
```bash
# Solve a puzzle with GRASP loop
machine-dream solve puzzles/easy-01.json

# View learning patterns in memory
machine-dream memory list

# Run dream consolidation
machine-dream dream run

# Launch interactive TUI
machine-dream tui
```

**Success!** You're now running a production-ready continuous cognition system.

---

## 🎯 What Machine Dream Does

Machine Dream is a **research platform** demonstrating continuous machine cognition. Think of it as an AI that "never stops thinking" and learns like humans do through experience and consolidation.

### Core Features

1. **GRASP Cognitive Loop**
   - **G**enerate: Propose next actions or thoughts
   - **R**eview: Validate proposals against constraints
   - **A**bsorb: Update internal state with results
   - **S**ynthesize: Extract higher-order insights
   - **P**ersist: Store insights in AgentDB for future use

2. **Dreaming Pipeline (5 Phases)**
   - **Capture**: Log raw experiences (every move, every outcome)
   - **Triage**: Filter experiences (successful vs failed strategies)
   - **Compression**: Abstract patterns (common sequences)
   - **Abstraction**: Synthesize high-level knowledge
   - **Integration**: Update long-term memory

3. **LLM Integration**
   - Pure LLM reasoning (no hints, no fallbacks)
   - Multi-provider support (LM Studio, OpenAI, Anthropic, etc.)
   - Profile-based connection management
   - A/B testing (memory ON vs OFF)

4. **Persistent Memory**
   - AgentDB-powered SQLite database
   - Cross-session learning
   - Pattern recognition and consolidation
   - Experience replay for self-improvement

### The Innovation

**Question**: "What would you build if thinking were free?"

**Answer**: A system where:
- The AI proposes moves based on past experiences
- Every move (correct or wrong) is logged
- During "dreaming," the system consolidates patterns
- Over time, the AI gets better at solving without external hints

**Example Workflow**:
```
Day 1 (Play):    LLM solves puzzle → 100 moves, 20 errors
Night 1 (Dream): Extract patterns from 100 moves
Day 2 (Play):    LLM solves similar puzzle → 80 moves, 10 errors
Night 2 (Dream): Refine patterns
Day 3 (Play):    LLM solves puzzle → 60 moves, 5 errors
```

This is **continuous cognition** - learning that persists and compounds over time.

---

## 🛠️ Installation

### System Requirements

**Required**:
- Node.js v20+ (v24 recommended)
- npm (comes with Node.js)
- 100MB disk space (for AgentDB + dependencies)
- Terminal with UTF-8 support

**Tested Environments**:
- ✅ Linux (Ubuntu 20.04+, Debian 11+)
- ✅ macOS (12+ Monterey)
- ✅ Windows via WSL2 (Ubuntu 22.04)
- ✅ Docker containers (Node.js Alpine)
- ✅ VS Code Dev Containers

### Installation Steps

#### Option 1: Standard Installation (Recommended)
```bash
# Clone repository
git clone https://github.com/your-org/machine-dream.git
cd machine-dream_AG

# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Link for global access
npm link

# Verify installation
machine-dream --version
machine-dream system status
```

#### Option 2: Development Mode (No Build Required)
```bash
# Clone and install
git clone https://github.com/your-org/machine-dream.git
cd machine-dream_AG
npm install

# Run directly with tsx
npm run dev            # Runs default demo
npm run cli -- <cmd>   # Run specific CLI command
npx tsx src/tui/tui-bin.ts  # Launch TUI
```

#### Option 3: Docker Installation
```bash
# Build Docker image
docker build -t machine-dream .

# Run container
docker run -it machine-dream machine-dream system status
docker run -it machine-dream machine-dream solve puzzles/easy-01.json
```

### Post-Installation Verification

```bash
# Check version
machine-dream --version
# Expected: Machine Dream v0.1.0

# Check TypeScript compilation
npm run typecheck
# Expected: 0 errors

# Run test suite
npm test
# Expected: 310/310 tests passing

# Check system health
machine-dream system status
# Expected: ✅ Healthy status
```

---

## 💻 Command-Line Interface (CLI)

The CLI provides **25 production-ready commands** organized into functional areas. All commands use **real backends** (no mock data).

### CLI Usage Patterns

**After `npm link`** (production mode):
```bash
machine-dream <command> [subcommand] [options]
```

**Development mode** (without link):
```bash
npm run cli -- <command> [subcommand] [options]
```

**Direct execution** (tsx):
```bash
npx tsx src/index.ts <command> [subcommand] [options]
```

### Global Options

Available for all commands:

```bash
--config <file>              # Custom configuration file
--log-level <level>          # debug|info|warn|error (default: info)
--output-format <format>     # json|table|yaml (default: table)
--quiet, -q                  # Suppress non-essential output
--verbose, -v                # Show detailed output
--no-color                   # Disable colored output
--help, -h                   # Show help for command
--version                    # Show version information
```

**Examples**:
```bash
# JSON output for scripting
machine-dream memory list --output-format json > memory.json

# Debug logging
machine-dream --log-level debug solve puzzles/test.json

# Quiet mode (errors only)
machine-dream -q memory consolidate
```

---

### Memory Management (7 Commands - Production-Ready)

All memory commands use **real AgentDB backend** (LocalAgentDB with SQLite).

#### `memory store` - Store Data in Agent Memory

**Status**: ✅ Production-ready (uses `AgentMemory.reasoningBank.storeMetadata`)

```bash
machine-dream memory store <key> <value> [options]
```

**Examples**:
```bash
# Store simple value
machine-dream memory store session-001 "puzzle solved in 45 moves"

# Store with namespace
machine-dream memory store user-pref "dark-mode" --namespace settings

# Store JSON data
machine-dream memory store strategy-data '{"type":"naked-single","success":0.92}'

# JSON output for scripting
machine-dream memory store key "value" --output-format json
```

**Implementation**: Stores data using `memory.reasoningBank.storeMetadata(key, 'cli-store', data)` with timestamp, namespace, and session tracking.

#### `memory retrieve` - Retrieve Stored Data

**Status**: ✅ Production-ready (uses `AgentMemory.reasoningBank.getMetadata`)

```bash
machine-dream memory retrieve <key> [options]
```

**Examples**:
```bash
# Retrieve specific key
machine-dream memory retrieve session-001

# Retrieve from namespace
machine-dream memory retrieve user-pref --namespace settings

# JSON output
machine-dream memory retrieve key --output-format json
```

#### `memory list` - List All Memory Entries

**Status**: ✅ Production-ready (queries AgentDB metadata table)

```bash
machine-dream memory list [options]
```

**Options**:
- `--limit <n>` - Maximum entries to return (default: 50)
- `--namespace <ns>` - Filter by namespace
- `--session <id>` - Filter by session ID
- `--type <type>` - Filter by entry type

**Examples**:
```bash
# List all entries
machine-dream memory list

# List recent 100 entries
machine-dream memory list --limit 100

# List specific namespace
machine-dream memory list --namespace strategies

# JSON output for processing
machine-dream memory list --output-format json | jq '.entries[] | .key'
```

#### `memory search` - Search Memory Patterns

**Status**: ✅ Production-ready (uses `AgentMemory.reasoningBank.queryMetadata` with filtering)

```bash
machine-dream memory search <pattern> [options]
```

**Options**:
- `--type <type>` - Filter by metadata type
- `--limit <n>` - Maximum results (default: 20)
- `--similarity <threshold>` - Minimum similarity score (0-1)

**Examples**:
```bash
# Search for patterns
machine-dream memory search "solving strategy"

# Search specific type
machine-dream memory search "r1c1" --type move

# Limit results
machine-dream memory search "pattern" --limit 10 --output-format json
```

**Implementation**: Queries all metadata entries and filters by pattern matching on keys and values.

#### `memory consolidate` - Run Dream Cycle Consolidation

**Status**: ✅ Production-ready (uses `DreamingController.runDreamCycle`)

```bash
machine-dream memory consolidate [options]
```

**Options**:
- `--sessions <ids>` - Comma-separated session IDs (default: default-session)
- `--phases <list>` - Specific phases to run (default: all)
- `--dry-run` - Simulate without persisting changes

**Examples**:
```bash
# Consolidate default session
machine-dream memory consolidate

# Consolidate multiple sessions
machine-dream memory consolidate --sessions session-1,session-2,session-3

# Dry run to preview
machine-dream memory consolidate --dry-run

# JSON output with metrics
machine-dream memory consolidate --output-format json
```

**Output**:
```
🌙 Dream Cycle Complete
────────────────────────────────────────
Sessions: session-1, session-2
Phases: all
Knowledge Consolidated: 15 patterns
Avg Compression Ratio: 2.35x

Session Details:
  session-1: 8 patterns (2.12x compression)
  session-2: 7 patterns (2.58x compression)
```

#### `memory optimize` - Optimize Database and Cleanup

**Status**: ✅ Production-ready (uses `AgentMemory.optimizeMemory`)

```bash
machine-dream memory optimize [options]
```

**Options**:
- `--vacuum` - Run SQLite VACUUM
- `--cleanup-old` - Remove old experiences
- `--age <days>` - Minimum age for cleanup (default: 30)

**Examples**:
```bash
# Full optimization
machine-dream memory optimize

# Vacuum only
machine-dream memory optimize --vacuum

# Cleanup old data
machine-dream memory optimize --cleanup-old --age 60
```

#### `memory backup` / `memory restore` - Backup/Restore Memory Data

**Status**: ✅ Production-ready (exports/imports AgentDB metadata to/from JSON)

```bash
# Backup to JSON
machine-dream memory backup <output-file>

# Restore from JSON
machine-dream memory restore <input-file> [--merge]
```

**Examples**:
```bash
# Backup with timestamp
machine-dream memory backup "backups/memory-$(date +%Y%m%d).json"

# Restore (overwrites existing)
machine-dream memory restore backups/memory-20260107.json

# Restore and merge with existing
machine-dream memory restore backups/memory.json --merge
```

---

### System Administration (5 Commands - Production-Ready)

All system commands use **real backends** (SystemOrchestrator, process metrics, filesystem operations).

#### `system status` - Real-Time System Status

**Status**: ✅ Production-ready (uses `process.uptime()`, `process.memoryUsage()`, `fs.statSync()`)

```bash
machine-dream system status [options]
```

**Options**:
- `--verbose` - Show detailed metrics
- `--json` - JSON output format

**Examples**:
```bash
# Basic status
machine-dream system status

# Detailed metrics
machine-dream system status --verbose

# JSON for monitoring
machine-dream system status --output-format json
```

**Output**:
```
✅ System Status
────────────────────────────────────────
Version: 0.1.0
Uptime: 2h 15m 32s
Memory: 45.2 MB / 128.0 MB (35.3%)
Database: Healthy
  Path: .agentdb/agent.db
  Size: 1.2 MB
  Sessions: 5 active
```

#### `system init` - Initialize System

**Status**: ✅ Production-ready (uses `SystemOrchestrator.initialize`)

```bash
machine-dream system init [options]
```

**Options**:
- `--db-path <path>` - Custom database path
- `--force` - Reinitialize existing database

**Examples**:
```bash
# Standard initialization
machine-dream system init

# Custom database path
machine-dream system init --db-path /data/agentdb

# Force reinitialize
machine-dream system init --force
```

#### `system cleanup` - Cleanup Old Sessions and Data

**Status**: ✅ Production-ready (uses filesystem operations with age filtering)

```bash
machine-dream system cleanup [options]
```

**Options**:
- `--age <days>` - Minimum age for cleanup (default: 30)
- `--dry-run` - Preview without deleting
- `--sessions` - Cleanup sessions only
- `--all` - Cleanup all temporary data

**Examples**:
```bash
# Cleanup sessions older than 30 days
machine-dream system cleanup

# Preview cleanup
machine-dream system cleanup --dry-run

# Cleanup older than 60 days
machine-dream system cleanup --age 60

# Cleanup everything
machine-dream system cleanup --all
```

#### `system health` - Multi-Component Health Check

**Status**: ✅ Production-ready (checks database, memory, orchestrator, process)

```bash
machine-dream system health [options]
```

**Examples**:
```bash
# Full health check
machine-dream system health

# JSON output
machine-dream system health --output-format json
```

**Output**:
```
🏥 System Health Check
────────────────────────────────────────
Database: ✅ Healthy (responding in 2ms)
Memory: ✅ Healthy (45.2 MB / 128.0 MB)
Orchestrator: ✅ Initialized
Process: ✅ Running (PID: 12345)

Overall Status: ✅ Healthy
```

#### `system migrate` - Database Migrations

**Status**: ⏭️ Intentionally skipped (no migrations needed yet)

This command is reserved for future database schema migrations. Currently, the system uses a stable schema with no migration requirements.

---

### Dream Consolidation (2 Commands - Production-Ready)

Both dream commands use **real DreamingController backend**.

#### `dream run` - Run Dream Cycle Consolidation

**Status**: ✅ Production-ready (uses `DreamingController.runDreamCycle`)

```bash
machine-dream dream run [options]
```

**Options**:
- `--sessions <ids>` - Comma-separated session IDs (default: default-session)
- `--phases <list>` - Specific phases (capture,triage,compression,abstraction,integration)
- `--visualize` - Show progress visualization
- `--dry-run` - Simulate without persisting

**Examples**:
```bash
# Run dream cycle for default session
machine-dream dream run

# Run for multiple sessions
machine-dream dream run --sessions session-1,session-2

# Run specific phases only
machine-dream dream run --phases capture,triage

# Visualize progress
machine-dream dream run --visualize

# Dry run to preview
machine-dream dream run --dry-run --output-format json
```

**Output**:
```
🌙 Dream Cycle Complete
────────────────────────────────────────
Sessions: session-1
Phases: all (5 phases)
Knowledge Consolidated: 12 patterns
Compression Ratio: 3.2x
Verification Status: verified

Metrics:
  Capture: 100 experiences logged
  Triage: 85 successful strategies filtered
  Compression: 85 → 27 patterns (3.2x)
  Abstraction: 12 high-level insights
  Integration: 12 patterns persisted
```

#### `dream status` - Check Dream History

**Status**: ✅ Production-ready (queries `AgentMemory.reasoningBank.queryMetadata('dream-cycle')`)

```bash
machine-dream dream status [options]
```

**Options**:
- `--last <n>` - Show last N cycles (default: 5)
- `--session <id>` - Filter by session ID
- `--json` - JSON output format

**Examples**:
```bash
# Show recent cycles
machine-dream dream status

# Show last 10 cycles
machine-dream dream status --last 10

# Specific session
machine-dream dream status --session session-001

# JSON for analysis
machine-dream dream status --output-format json
```

**Output**:
```
📊 Dream Status
────────────────────────────────────────
Total Dream Cycles: 12
Total Knowledge Consolidated: 89 patterns

Recent Cycles:
Cycle: session-003
  Time: 1/7/2026, 10:45:23 AM
  Knowledge: 8 patterns
  Compression: 2.45x
  Status: verified

Cycle: session-002
  Time: 1/6/2026, 9:30:15 PM
  Knowledge: 7 patterns
  Compression: 3.1x
  Status: verified
```

---

### Configuration Management (2 Commands - Production-Ready)

Both config commands use **real backends** (ProfileValidator, file I/O).

#### `config validate` - Validate Configuration File

**Status**: ✅ Production-ready (uses `ProfileValidator` + structure validation)

```bash
machine-dream config validate [config-file] [options]
```

**Options**:
- `--fix` - Attempt to fix common issues (future)

**Examples**:
```bash
# Validate default config
machine-dream config validate

# Validate specific file
machine-dream config validate my-config.json

# Validate LLM profile
machine-dream config validate llm-profiles.json

# JSON output
machine-dream config validate --output-format json
```

**Validation Checks**:
- **LLM Profiles**: Provider, model, base URL, API key format
- **System Config**: Memory system, AgentDB path, solving parameters
- **JSON Syntax**: Valid JSON structure
- **Required Fields**: All mandatory fields present
- **Best Practices**: Warnings for recommended settings

**Output (Success)**:
```
✅ Configuration Valid
────────────────────────────────────────
File: .machine-dream.json
Status: Valid
Errors: 0
Warnings: 1

⚠️  Warnings:
  1. Adding a description helps identify profiles later
```

**Output (Errors)**:
```
❌ Configuration Invalid
────────────────────────────────────────
File: my-profile.json
Status: Invalid
Errors: 2
Warnings: 0

❌ Errors:
  1. Provider is required
  2. Base URL must be a valid HTTP/HTTPS URL
```

#### `config export` - Export Configuration

**Status**: ✅ Production-ready (uses `fs.writeFileSync` with JSON formatting)

```bash
machine-dream config export <output-file> [options]
```

**Options**:
- `--format <fmt>` - json|yaml (default: json, yaml not implemented yet)
- `--include-defaults` - Include default values

**Examples**:
```bash
# Export current config
machine-dream config export my-config.json

# With timestamp
machine-dream config export "config-$(date +%Y%m%d).json"

# Include defaults
machine-dream config export full-config.json --include-defaults
```

**Output**:
```
💾 Configuration Exported
────────────────────────────────────────
Output File: my-config.json
Format: json
Include Defaults: No
Keys Exported: 12

✅ Configuration saved successfully
```

---

### Puzzle Operations

Complete puzzle generation, solving, and validation tools.

#### `solve` - Solve Sudoku Puzzle with GRASP Loop

```bash
machine-dream solve <puzzle-file> [options]
```

**Options**:
- `--memory-system <sys>` - agentdb|simple (default: agentdb)
- `--enable-rl` - Enable reinforcement learning
- `--enable-reflexion` - Enable reflexion (self-critique)
- `--max-iterations <n>` - Maximum solve iterations (default: 100)
- `--session-id <id>` - Custom session ID
- `--dream-after` - Run dream cycle consolidation after solving (✨ **NEW**)
- `--visualize` - Show progress visualization
- `--output <file>` - Save result to JSON file

**Examples**:
```bash
# Basic solve
machine-dream solve puzzles/easy-01.json

# Advanced solve with all features
machine-dream solve puzzles/hard-01.json \
  --memory-system agentdb \
  --enable-rl \
  --enable-reflexion \
  --max-iterations 200

# Solve with automatic dream cycle consolidation (Week 2 Day 5 Bonus)
machine-dream solve puzzles/medium-01.json \
  --session-id learning-session-001 \
  --dream-after

# Custom session for tracking
machine-dream solve puzzles/test.json --session-id experiment-001
```

**Output (with `--dream-after`)**:
```
🎯 Solve Results: medium-01
──────────────────────────────────────────────────
Status:      ✅ Solved
Iterations:  45
Time (ms):   1250
Session ID:  learning-session-001

🌙 Dream Cycle Complete
──────────────────────────────────────────────────
✨ Consolidated: 12 patterns
📉 Compression: 3.2x
🔍 Status: verified
```

**How It Works**: When `--dream-after` is used, the solve command automatically runs the dreaming pipeline after successfully solving the puzzle. This consolidates the learned experiences into patterns, compresses the knowledge, and persists insights for future solving sessions. This creates a seamless learning loop: solve → consolidate → improve.

#### `puzzle generate` - Generate Random Puzzle

```bash
machine-dream puzzle generate [options]
```

**Options**:
- `--size <n>` - Grid size: 4, 9, 16, 25 (default: 9)
- `--difficulty <level>` - easy|medium|hard|expert|diabolical
- `--symmetry <type>` - none|rotational|reflectional|diagonal
- `--output <file>` - Save to file
- `--validate` - Ensure unique solution

**Examples**:
```bash
# Generate 9x9 medium puzzle
machine-dream puzzle generate --size 9 --difficulty medium

# Generate with symmetry
machine-dream puzzle generate --symmetry rotational --output puzzle.json

# Generate and validate uniqueness
machine-dream puzzle generate --difficulty hard --validate
```

#### `puzzle from-seed` - Generate Reproducible Puzzle

```bash
machine-dream puzzle from-seed <seed> [options]
```

**Examples**:
```bash
# Generate from specific seed (always same puzzle)
machine-dream puzzle from-seed 12345 --size 9 --difficulty hard

# Save to file
machine-dream puzzle from-seed 98765 --output puzzles/seed-98765.json
```

#### `puzzle batch` - Generate Multiple Puzzles

```bash
machine-dream puzzle batch [options]
```

**Options**:
- `--count <n>` - Number of puzzles (1-1000)
- `--seed-mode <mode>` - sequential|random
- `--seed-start <n>` - Starting seed for sequential mode
- `--output-dir <dir>` - Output directory

**Examples**:
```bash
# Generate 100 puzzles with sequential seeds
machine-dream puzzle batch --count 100 --seed-mode sequential

# Generate training dataset
machine-dream puzzle batch \
  --count 1000 \
  --seed-mode sequential \
  --seed-start 1000 \
  --output-dir training-data
```

---

### LLM Integration

Complete LLM profile management and pure AI solving.

#### Profile Management

See full details in [LLM Profile Management](specs/13-llm-profile-management.md).

```bash
# List all profiles
machine-dream llm profile list

# Create new profile (interactive)
machine-dream llm profile add

# Create with CLI options
machine-dream llm profile add \
  --name lm-studio-qwen3 \
  --provider lmstudio \
  --base-url http://localhost:1234/v1 \
  --model qwen3-30b \
  --set-default

# Set active profile
machine-dream llm profile set lm-studio-qwen3

# Test connection
machine-dream llm profile test

# Export profiles
machine-dream llm profile export profiles.json

# Import profiles
machine-dream llm profile import profiles.json
```

#### LLM Play Commands

```bash
# Play with active profile
machine-dream llm play puzzles/easy-01.json

# Play with specific profile
machine-dream llm play puzzles/easy-01.json --profile openai-gpt4

# Baseline mode (no memory - for A/B testing)
machine-dream llm play puzzles/easy-01.json --no-memory

# AISP mode (low-ambiguity prompts)
machine-dream llm play puzzles/easy-01.json --aisp

# Full AISP mode (end-to-end AISP)
machine-dream llm play puzzles/easy-01.json --aisp-full

# Show reasoning tokens from LM Studio
machine-dream llm play puzzles/easy-01.json --show-reasoning

# View statistics
machine-dream llm stats

# Run consolidation
machine-dream llm dream

# Benchmark learning (memory ON vs OFF)
machine-dream llm benchmark
```

#### Model Management Commands

```bash
# List available models in LM Studio
machine-dream llm model list

# List only loaded models
machine-dream llm model list --loaded

# Load a model with time-to-live
machine-dream llm model load "qwen3-30b-instruct" --ttl 3600

# Unload current model
machine-dream llm model unload

# Unload specific model
machine-dream llm model unload "qwen3-30b-instruct"
```

#### AISP Mode

AISP (AI Specification Protocol) enables low-ambiguity communication:

| Mode | Flag | Description |
|------|------|-------------|
| Standard | (none) | Normal prompts, normal responses |
| AISP | `--aisp` | AISP-formatted prompts, normal responses |
| Full AISP | `--aisp-full` | AISP prompts + spec, AISP responses |

```bash
# AISP converts grid state to tensor notation
# Model receives ⟦Σ:State⟧{board≜Vec₉(Vec₉(Fin₁₀))...}

# Full AISP includes spec and expects AISP output
# Strategies are encoded in AISP for storage
```

#### Double Strategies Mode

Enhanced learning with doubled strategy counts:

```bash
# Dream with double strategies (6-10 instead of 3-5)
machine-dream llm dream run --learning-unit my-unit --double-strategies
```

---

## 🎯 Terminal User Interface (TUI)

The TUI provides an **interactive, React-based interface** built with Ink (the same framework Claude Code uses).

### Launching the TUI

```bash
# Standard launch
machine-dream tui

# With theme selection
machine-dream tui --theme light

# With debug output for testing
machine-dream tui --debug-output /tmp/tui-events.jsonl

# Development mode (no build required)
npx tsx src/tui/tui-bin.ts
```

### TUI Features

- ✅ **React-based** - Uses Ink framework (same as Claude Code)
- ✅ **Component architecture** - Modular, testable design
- ✅ **Real-time progress** - Live updates during command execution
- ✅ **Machine-readable output** - JSON event stream for testing
- ✅ **Terminal detection** - Works in CI/Docker/WSL environments
- ✅ **Emoji-aware alignment** - Proper text alignment using string-width
- ✅ **Keyboard navigation** - Full keyboard support with shortcuts
- ✅ **Node.js v24 compatible** - Fully tested on modern Node.js

### Keyboard Shortcuts

**Global Shortcuts**:
- `F1` - Help
- `Ctrl+C` - Exit application
- `Ctrl+R` - Refresh current view

**Navigation**:
- `↑↓` - Navigate menu items
- `Tab` - Next field in forms
- `Shift+Tab` - Previous field in forms
- `Enter` - Select menu item / Submit form
- `Esc` - Cancel input

**Menu Shortcuts**:
- `H` - Home Dashboard
- `S` - Solve Puzzle
- `G` - Generate Puzzle
- `L` - LLM Play
- `M` - Memory Browser
- `D` - Dream Cycle
- `Y` - System Info

### Main TUI Screens

#### 🏠 Home Dashboard
Displays:
- System status and health metrics
- Recent activity log
- Quick action buttons
- Performance metrics

#### 🧩 Solve Puzzle Screen
Interactive puzzle solving:
- **Form Fields**:
  - Puzzle file path (default: puzzles/easy-01.json)
  - Session ID (default: tui-session)
  - Max iterations (default: 10)
- **Real-Time Progress**: Live solving updates
- **Results Display**: Solution, execution time, success status

#### 🎲 Puzzle Generator Screen
Create randomized Sudoku puzzles:
- **Configuration**:
  - Seed mode (Random or Specific seed number)
  - Grid size (4×4, 9×9, 16×16, 25×25)
  - Difficulty (Easy → Diabolical)
  - Symmetry pattern
  - Validation (uniqueness check)
- **Batch Generation**:
  - Generate multiple puzzles (1-1000)
  - Sequential or random seeds
  - Custom output directory
- **Live Preview**:
  - Visual puzzle grid
  - Metadata (seed, clues, generation time)
- **Quick Actions**:
  - Save to file
  - Use for LLM Play
  - Regenerate from same seed
  - Copy seed number

**CLI Equivalents**:
```bash
machine-dream puzzle generate --size 9 --difficulty medium
machine-dream puzzle from-seed 12345 --size 9
machine-dream puzzle batch --count 10 --seed-mode sequential
```

#### 🤖 LLM Play Screen
Pure LLM Sudoku solving:
- **View Modes**: Play, Stats, Dream, Benchmark
- **Configuration**:
  - Puzzle file selection
  - Memory toggle (ON/OFF for A/B testing)
  - Model selection
  - Max moves limit
- **Live Visualization**:
  - Real-time puzzle grid updates
  - Move-by-move progress
  - LLM reasoning display
  - Move validation results
- **Move History Panel**: Recent moves with reasoning
- **CLI Debug Panel**: Real-time command monitoring
- **Statistics View**: Solve rate, accuracy, trends
- **Benchmark Mode**: Memory ON vs OFF comparison

**Requirements**:
- LM Studio running on localhost:1234
- Capable model loaded (Qwen3 30B recommended)
- Profile configured (see LLM Integration section)

#### 💾 Memory Browser
Explore AgentDB memory:
- Store key-value pairs
- List all memory entries
- View entry details
- Delete entries
- Export and backup

#### 🌙 Dream Cycle Screen
Run consolidation with progress tracking:
- Select sessions to consolidate
- Choose phases to run
- Real-time progress visualization
- Results summary with metrics

#### ⚙️ Configuration Screen
View system configuration:
- Current settings display
- Environment variables
- Configuration file locations
- Instructions for CLI-based editing

#### 📊 System Dashboard
Monitor system health:
- Runtime environment (Node.js, platform, uptime)
- Memory usage (heap, RSS, external)
- Machine Dream status (version, DB health)
- Dependencies and file locations
- Diagnostics and health checks

---

## ⚙️ Configuration

### Configuration File

The system uses `.machine-dream.json` for persistent configuration:

```json
{
  "memorySystem": "agentdb",
  "enableRL": true,
  "enableReflexion": true,
  "enableSkillLibrary": false,
  "solving": {
    "maxIterations": 100,
    "maxSolveTime": 300000,
    "reflectionInterval": 5,
    "attentionWindowSize": 10,
    "backtrackEnabled": true,
    "guessThreshold": 0.3,
    "strategies": ["naked-single", "hidden-single", "pointing-pairs"]
  },
  "agentdb": {
    "dbPath": ".agentdb/agent.db",
    "preset": "large",
    "enableReasoningBank": true,
    "enableReflexion": true,
    "quantization": "scalar",
    "indexing": "hnsw",
    "cacheEnabled": true
  },
  "dreaming": {
    "schedule": "after-session",
    "compressionRatio": 10,
    "abstractionLevels": 4,
    "minSuccessRate": 0.7
  }
}
```

### Configuration Commands

```bash
# Show current configuration
machine-dream config show

# Show specific key
machine-dream config show --key solving.maxIterations

# Set configuration value
machine-dream config set memorySystem agentdb
machine-dream config set solving.maxIterations 200

# Validate configuration
machine-dream config validate

# Export configuration
machine-dream config export my-config.json
```

### Environment Variables

All configuration can be set via environment variables:

```bash
# Memory system
export MACHINE_DREAM_MEMORY_SYSTEM=agentdb

# Feature toggles
export MACHINE_DREAM_ENABLE_RL=true
export MACHINE_DREAM_ENABLE_REFLEXION=true

# Solving parameters
export MACHINE_DREAM_MAX_ITERATIONS=200
export MACHINE_DREAM_BACKTRACK_ENABLED=true

# Database paths
export MACHINE_DREAM_DB_PATH=/data/agentdb

# Run with environment config
machine-dream solve puzzles/test.json
```

### LLM Profile Configuration

Profiles are stored separately at `~/.machine-dream/llm-profiles.json`:

```json
{
  "profiles": [
    {
      "name": "lm-studio-qwen3",
      "provider": "lmstudio",
      "baseUrl": "http://localhost:1234/v1",
      "model": "qwen3-30b",
      "temperature": 0.7,
      "maxTokens": 2048,
      "tags": ["local", "default"],
      "isDefault": true
    }
  ],
  "activeProfile": "lm-studio-qwen3"
}
```

**Security Best Practices**:
- Store API keys as environment variables: `"apiKey": "${OPENAI_API_KEY}"`
- Never commit profiles with secrets to version control
- Export without secrets: `machine-dream llm profile export --no-secrets`

---

## 🧠 Understanding the System

### GRASP Loop Explained

The GRASP cognitive loop runs continuously during puzzle-solving:

1. **Generate** (Propose Actions)
   - Analyze current puzzle state
   - Identify candidate cells
   - Generate possible moves

2. **Review** (Validate Proposals)
   - Check Sudoku constraints
   - Verify move legality
   - Apply strategies (naked-single, hidden-single, etc.)

3. **Absorb** (Update State)
   - Apply validated move to puzzle
   - Update internal representations
   - Record move outcome

4. **Synthesize** (Extract Insights)
   - Identify successful strategies
   - Detect error patterns
   - Generate higher-level knowledge

5. **Persist** (Store in AgentDB)
   - Log move to `moves` table
   - Store strategy to `strategies` table
   - Save insights to `insights` table

### Dreaming Pipeline Explained

The dreaming pipeline consolidates experiences after solving:

**Phase 1: Capture** (Experience Logging)
- Collects all moves from session
- Extracts strategy usage
- Identifies successful vs failed attempts

**Phase 2: Triage** (Initial Filtering)
- Filters successful strategies
- Groups similar experiences
- Prioritizes high-value patterns

**Phase 3: Compression** (Pattern Abstraction)
- Compresses similar sequences
- Reduces 100 moves → 30 patterns
- Calculates compression ratio (3.3x)

**Phase 4: Abstraction** (Knowledge Synthesis)
- Synthesizes high-level insights
- Identifies meta-strategies
- Generates few-shot examples

**Phase 5: Integration** (Long-Term Storage)
- Persists patterns to `patterns` table
- Updates skill library
- Verifies knowledge integrity

### LLM Integration Explained

**Pure LLM Reasoning**:
- No hints or deterministic fallbacks
- LLM receives puzzle state + move history
- LLM proposes move (row, col, value)
- System validates move
- Feedback: "CORRECT" / "INVALID: reason" / "WRONG: creates conflict"

**Learning Through Struggle**:
```
Move 1:  LLM: "r1c1=5" → CORRECT → Logged as success
Move 2:  LLM: "r2c3=7" → INVALID (already has 7 in row) → Logged as error
Move 3:  LLM: "r2c3=4" → CORRECT → Learned from previous error
...
Move 50: LLM: "r5c5=2" → WRONG (creates conflict in box) → Logged as error
Move 51: LLM: "r5c5=8" → CORRECT → Refined reasoning
```

**Dreaming Consolidation**:
- After session, extract patterns:
  - "r1c1=5 successful because only valid option (naked-single)"
  - "r2c3 errors teach constraint checking"
  - "Box conflicts common in mid-puzzle"
- Next session, LLM has access to these patterns
- Fewer errors, faster solve times

### Memory Persistence

**AgentDB Tables**:
- `moves` - Every move (session, row, col, value, outcome)
- `strategies` - Strategy usage (type, success rate, frequency)
- `insights` - High-level knowledge (patterns, meta-strategies)
- `patterns` - Consolidated patterns from dreaming
- `reasoning_trajectories` - LLM reasoning chains
- `metadata` - Generic key-value storage (CLI store/retrieve)

**Cross-Session Learning**:
```
Session 1: Solve easy puzzle → 100 moves → Dream → 30 patterns
Session 2: Solve similar puzzle → 80 moves (20% improvement)
Session 3: Solve harder puzzle → 120 moves → Dream → 40 new patterns
Session 4: Solve similar hard puzzle → 90 moves (25% improvement)
```

---

## 📂 Data Persistence

### Database Location

**Default**: `.agentdb/agent.db` (SQLite database)

**Custom Location**:
```bash
# Set via environment variable
export MACHINE_DREAM_DB_PATH=/data/agentdb
machine-dream solve puzzles/test.json

# Set via config file
machine-dream --config custom-config.json solve puzzles/test.json
```

### Inspecting the Database

**Method 1: CLI Commands**
```bash
# Export all data
machine-dream export all --format json > all-data.json

# Export specific sessions
machine-dream export results --sessions session-001,session-002
```

**Method 2: Memory Commands**
```bash
# List all memory entries
machine-dream memory list

# Search patterns
machine-dream memory search "strategy"

# Backup entire database
machine-dream memory backup full-backup.json
```

**Method 3: Direct SQLite Access**
```bash
# Open database
sqlite3 .agentdb/agent.db

# Inspect tables
.tables
# Output: moves  strategies  insights  patterns  reasoning_trajectories  metadata

# Query moves
SELECT * FROM moves WHERE outcome = 'success' LIMIT 10;

# Query strategies
SELECT strategyType, COUNT(*) as count, AVG(successRate) as avgSuccess
FROM strategies
GROUP BY strategyType
ORDER BY avgSuccess DESC;

# Query patterns
SELECT * FROM patterns WHERE compressionRatio > 2.0;

# Export to CSV
.mode csv
.output moves.csv
SELECT * FROM moves;
.quit
```

### Backup and Restore

**Automated Backup**:
```bash
# Create backup directory
mkdir -p backups

# Backup with timestamp
machine-dream memory backup "backups/backup-$(date +%Y%m%d-%H%M%S).json"

# Scheduled backup (cron)
0 3 * * * cd /path/to/machine-dream && machine-dream memory backup backups/daily.json
```

**Restore from Backup**:
```bash
# Restore (overwrites existing)
machine-dream memory restore backups/backup-20260107.json

# Restore and merge
machine-dream memory restore backups/backup.json --merge

# Restore specific sessions
machine-dream memory restore backups/backup.json --sessions session-001
```

**Manual Database Backup** (SQLite):
```bash
# Backup database file
cp .agentdb/agent.db backups/agent-$(date +%Y%m%d).db

# Restore from file backup
cp backups/agent-20260107.db .agentdb/agent.db
```

---

## ❓ Troubleshooting

### Common Issues

#### "AgentDB unavailable"

**Cause**: Database file not initialized or corrupted.

**Solution**:
```bash
# Check database status
machine-dream system status

# Reinitialize database
machine-dream system init

# Check file permissions
ls -la .agentdb/
chmod 755 .agentdb/
chmod 644 .agentdb/agent.db
```

#### "Constraint violation" during solve

**Cause**: This is **normal** during GRASP solving. The agent makes guesses that violate constraints, then backtracks.

**Expected Behavior**:
```
[INFO] Move attempted: r3c5 = 7
[WARN] Constraint violation: 7 already in column 5
[INFO] Backtracking...
[INFO] Move attempted: r3c5 = 4
[INFO] Success! r3c5 = 4
```

**When to Worry**:
- If ALL moves fail (check puzzle file format)
- If solve never completes (increase max iterations)

#### TUI not launching

**Solutions**:
```bash
# Check Node.js version
node --version  # Should be v20+

# Test terminal capabilities
echo $TERM
# Should output: xterm-256color or similar

# Launch with fallback mode
machine-dream tui --no-mouse

# Check for errors
machine-dream tui --debug-output /tmp/tui-debug.log
cat /tmp/tui-debug.log
```

#### CLI command not found

**Solutions**:
```bash
# Check if linked
which machine-dream

# If not found, run npm link again
npm run build
npm link

# Verify installation
machine-dream --version

# Alternative: Run without link
npm run cli -- system status
npx tsx src/index.ts system status
```

#### TypeScript compilation errors

**Solutions**:
```bash
# Clean build artifacts
rm -rf dist/
npm run build

# Check for type errors
npm run typecheck

# Update dependencies
npm install

# If errors persist, check Node.js version
node --version  # Should be v20+
```

#### Memory optimization slow

**Cause**: Large database with many experiences.

**Solutions**:
```bash
# Check database size
ls -lh .agentdb/agent.db

# Cleanup old sessions first
machine-dream system cleanup --age 30

# Then optimize
machine-dream memory optimize --vacuum

# Monitor progress
machine-dream memory optimize --verbose
```

---

## 🎯 Best Practices

### CLI Best Practices

**1. Use Configuration Files**
```bash
# Create project-specific config
cat > .machine-dream.json <<EOF
{
  "memorySystem": "agentdb",
  "solving": {
    "maxIterations": 200,
    "backtrackEnabled": true
  }
}
EOF

# Use in commands
machine-dream solve puzzles/hard-01.json
```

**2. Script Repetitive Tasks**
```bash
#!/bin/bash
# batch-solve.sh - Solve all puzzles in directory

for puzzle in puzzles/*.json; do
  echo "Solving $puzzle..."
  machine-dream solve "$puzzle" \
    --session-id "batch-$(basename "$puzzle" .json)" \
    --output "results/$(basename "$puzzle")"
done

# Run dream consolidation
machine-dream dream run --sessions batch-*
```

**3. Use JSON Output for Processing**
```bash
# Get memory stats
machine-dream memory list --output-format json | \
  jq '.entries | length'

# Get system metrics
machine-dream system status --output-format json | \
  jq '.memory.heapUsed'

# Export and analyze
machine-dream export all --format json | \
  jq '.sessions[] | select(.success == true) | .sessionId'
```

**4. Monitor System Health**
```bash
# Create monitoring script
#!/bin/bash
# monitor.sh

while true; do
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  status=$(machine-dream system health --output-format json)
  echo "$timestamp: $status" >> health.log
  sleep 300  # Check every 5 minutes
done
```

### TUI Best Practices

**1. Use Keyboard Shortcuts**
- Learn the one-letter shortcuts (H, S, G, L, M, D)
- Use Tab for form navigation (faster than mouse)
- F1 for context-sensitive help

**2. Save Frequently Used Configurations**
- Configure settings in TUI Configuration screen
- Export with `machine-dream config export`
- Reuse in CLI scripts

**3. Monitor Long-Running Operations**
- Use TUI for monitoring solve/dream operations
- CLI Debug Panel shows real-time command execution
- Switch to other screens while operations continue

### System Best Practices

**1. Regular Backups**
```bash
# Daily backup cron job
0 3 * * * cd /path/to/machine-dream && \
  machine-dream memory backup "backups/daily-$(date +%Y%m%d).json"

# Keep last 7 days
find backups/ -name "daily-*.json" -mtime +7 -delete
```

**2. Periodic Cleanup**
```bash
# Weekly cleanup cron job
0 4 * * 0 cd /path/to/machine-dream && \
  machine-dream system cleanup --age 30 && \
  machine-dream memory optimize
```

**3. Monitor Performance**
```bash
# Log system metrics
machine-dream system status --output-format json >> metrics/$(date +%Y%m%d).log

# Analyze trends
cat metrics/*.log | jq '.memory.heapUsed' | \
  awk '{sum+=$1; count++} END {print sum/count}'
```

**4. Version Control Configuration**
```bash
# Add to .gitignore
echo ".agentdb/" >> .gitignore
echo "*.db" >> .gitignore
echo "backups/" >> .gitignore

# Track config (without secrets)
git add .machine-dream.json
git commit -m "Update configuration"

# Export LLM profiles without secrets
machine-dream llm profile export llm-profiles.json --no-secrets
git add llm-profiles.json
```

---

## 🚀 Advanced Usage

### Batch Processing

```bash
#!/bin/bash
# advanced-batch.sh - Advanced batch processing with error handling

PUZZLE_DIR="puzzles"
RESULTS_DIR="results"
LOG_FILE="batch.log"

mkdir -p "$RESULTS_DIR"

# Solve all puzzles
for puzzle in "$PUZZLE_DIR"/*.json; do
  name=$(basename "$puzzle" .json)
  echo "[$(date)] Processing $name..." | tee -a "$LOG_FILE"

  if machine-dream solve "$puzzle" \
    --session-id "batch-$name" \
    --output "$RESULTS_DIR/$name-result.json" \
    --output-format json 2>&1 | tee -a "$LOG_FILE"; then
    echo "[$(date)] ✅ Success: $name" | tee -a "$LOG_FILE"
  else
    echo "[$(date)] ❌ Failed: $name" | tee -a "$LOG_FILE"
  fi
done

# Consolidate all sessions
echo "[$(date)] Running dream consolidation..." | tee -a "$LOG_FILE"
machine-dream dream run --sessions batch-* \
  --output-format json > "$RESULTS_DIR/consolidation.json"

# Generate report
echo "[$(date)] Generating report..." | tee -a "$LOG_FILE"
cat "$RESULTS_DIR"/*.json | jq -s '{
  total: length,
  successful: [.[] | select(.success == true)] | length,
  failed: [.[] | select(.success == false)] | length,
  avgMoves: [.[] | .moves] | add / length
}' > "$RESULTS_DIR/summary.json"

echo "[$(date)] Batch complete!" | tee -a "$LOG_FILE"
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Machine Dream Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '24'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: System health check
        run: npm run cli -- system status

      - name: Solve test puzzle
        run: npm run cli -- solve puzzles/easy-01.json --session-id ci-test

      - name: Run dream consolidation
        run: npm run cli -- dream run --sessions ci-test

      - name: Export results
        run: npm run cli -- memory backup ci-results.json

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: ci-results
          path: ci-results.json
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build
RUN npm run build

# Create volume for database
VOLUME /app/.agentdb

# Expose ports (if needed for future web interface)
EXPOSE 3000

# Set entrypoint
ENTRYPOINT ["node", "dist/cli-bin.js"]

# Default command
CMD ["system", "status"]
```

**Usage**:
```bash
# Build image
docker build -t machine-dream .

# Run commands
docker run -v $(pwd)/.agentdb:/app/.agentdb machine-dream solve puzzles/easy-01.json
docker run -v $(pwd)/.agentdb:/app/.agentdb machine-dream memory list
docker run -v $(pwd)/.agentdb:/app/.agentdb machine-dream dream run

# Interactive TUI
docker run -it -v $(pwd)/.agentdb:/app/.agentdb machine-dream tui
```

---

## 📚 Additional Resources

### Documentation

- [README.md](../README.md) - Project overview and quick start
- [Week 2 Completion Report](WEEK2-COMPLETION-REPORT.md) - Production readiness summary
- [Production Action Plan](PRODUCTION_ACTION_PLAN.md) - Full roadmap (Weeks 1-11)
- [Architecture Specs](specs/) - 14 formal specifications

### Specifications

- [Spec 01: Puzzle Engine](specs/01-puzzle-engine-spec.md)
- [Spec 02: Memory System](specs/02-memory-system-spec.md)
- [Spec 03: GRASP Loop](specs/03-grasp-loop-spec.md)
- [Spec 05: Dreaming Pipeline](specs/05-dreaming-pipeline-spec.md)
- [Spec 09: CLI Interface](specs/09-cli-interface-spec.md)
- [Spec 10: Terminal UI](specs/10-terminal-menu-interface-spec.md)
- [Spec 11: LLM Integration](specs/11-llm-sudoku-player.md)
- [Spec 12: Puzzle Generation](specs/12-randomized-puzzle-generation.md)
- [Spec 13: Profile Management](specs/13-llm-profile-management.md)
- [Spec 16: AISP Mode](specs/16-aisp-mode-spec.md)
- [Spec 17: ADR Implementation](specs/17-adr-implementation-spec.md)

### Architecture Decision Records

All major architectural decisions are documented in `docs/adr/`:

- [ADR-000: Master Machine Dream](../adr/000-master-machine-dream.md) - Overview and decision graph
- [ADR-001: Pure LLM Solving](../adr/001-pure-llm-solving.md) - No deterministic fallback
- [ADR-002: Local LLM Provider](../adr/002-local-llm-provider.md) - LM Studio over cloud
- [ADR-003: Memory Persistence](../adr/003-memory-persistence.md) - AgentDB storage
- [ADR-004: Spec-First Development](../adr/004-spec-first-development.md) - Documentation-driven
- [ADR-005: Learning Units](../adr/005-learning-units.md) - Isolated learning contexts
- [ADR-006: GRASP Loop Architecture](../adr/006-grasp-loop-architecture.md) - Cognitive architecture
- [ADR-007: Event-Driven Integration](../adr/007-event-driven-integration.md) - Loose coupling
- [ADR-008: Dreaming Pipeline](../adr/008-dreaming-pipeline.md) - 5-phase consolidation
- [ADR-009: CLI-First Interface](../adr/009-cli-first-interface.md) - Scriptability
- [ADR-010: Immutable Puzzle Engine](../adr/010-immutable-puzzle-engine.md) - Foundation

### Week 2 Documentation

- [Day 3 Summary](week2-day3-summary.md) - Integration tests (38 tests)
- [Day 4 Summary](week2-day4-summary.md) - Dream/config commands
- [Day 5 Audit](week2-day5-audit.md) - Final verification
- [Progress Tracker](week2-progress.md) - Daily breakdown

---

## 🎉 Conclusion

Machine Dream provides a production-ready platform for exploring continuous machine cognition. With **310 passing tests**, **zero mock implementations**, and **comprehensive documentation**, the system is ready for:

- **Research**: Explore continuous cognition patterns
- **Education**: Learn about AI memory systems
- **Development**: Build on the foundation for new features
- **Experimentation**: Test LLM learning capabilities

### What You've Learned

- ✅ How to install and configure Machine Dream
- ✅ All CLI commands with real backend integration
- ✅ How to use the interactive TUI
- ✅ GRASP loop and dreaming pipeline concepts
- ✅ LLM integration and profile management
- ✅ AISP mode for low-ambiguity prompts
- ✅ Model management for LM Studio
- ✅ Memory persistence and consolidation
- ✅ Best practices for production use
- ✅ Advanced usage patterns and automation
- ✅ Architecture Decision Records (ADRs)

### Next Steps

1. **Explore the TUI**: `machine-dream tui`
2. **Set up LLM integration**: Create your first profile
3. **Run experiments**: Test memory ON vs OFF
4. **Contribute**: Improve the cognitive architecture
5. **Read the research**: [Continuous Machine Thinking](continuous-machine-thinking-research.md)

---

**Happy solving! 🧩🧠✨**

*Machine Dream - Where thinking never stops.*
