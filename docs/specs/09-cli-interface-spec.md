# Machine Dream - Complete CLI Interface Specification

**Component:** Command-Line Interface (CLI)
**Version:** 1.0.0
**Date:** January 5, 2026
**Status:** Implementation-Ready

---

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| [ADR-009: CLI-First Interface](../adr/009-cli-first-interface.md) | Authorizes this spec |

---

## 1. Executive Summary

This specification defines a comprehensive, production-ready CLI for the Machine Dream system - a Cognitive Puzzle Solver using the GRASP loop and AgentDB memory. The CLI provides unified access to all system capabilities including puzzle solving, memory management, dreaming/consolidation, benchmarking, configuration, and data export.

### Key Design Principles

1. **Hierarchical Commands**: Organized by domain (solve, memory, dream, benchmark, etc.)
2. **Intuitive Defaults**: Sensible defaults for all parameters
3. **Progressive Disclosure**: Simple commands for beginners, advanced options for experts
4. **Consistent Patterns**: Similar options across related commands
5. **Machine-Readable Output**: JSON/structured formats for automation
6. **Human-Friendly Display**: Rich terminal UI for interactive use

### TUI Integration

The CLI is also accessible through the Terminal User Interface (TUI) Console feature (Spec 14):
- **Console Screen**: Full-screen console accessible via `[T]` menu item
- **Console Overlay**: Quick toggle with backtick (`` ` ``) key from any TUI screen
- **Direct Command Entry**: Type CLI commands directly in the TUI console
- **Output Capture**: All CLI output displayed within the TUI, not escaping to terminal
- **Command History**: Navigate previous commands with arrow keys

See Spec 14 (Console Menu Interface) for complete TUI console integration details.

---

## 2. Architecture Overview

### 2.1 Command Structure

```
machine-dream <command> [subcommand] [options] [arguments]
│
├── solve           # Puzzle solving operations
├── memory          # Memory system operations
├── dream           # Dreaming/consolidation operations
├── benchmark       # Performance benchmarking
├── demo            # Demo & presentation mode
├── config          # Configuration management
├── export          # Data export utilities
└── system          # System utilities
```

### 2.2 Global Options

Available for all commands:

```bash
--config <file>              # Custom configuration file (.poc-config.json)
--log-level <level>          # debug|info|warn|error (default: info)
--output-format <format>     # json|table|yaml (default: table)
--quiet                      # Suppress non-essential output
--verbose                    # Show detailed output
--no-color                   # Disable colored output
--help, -h                   # Show help for command
--version, -v                # Show version information
```

---

## 3. Core Commands

### 3.1 Solve Command

Execute puzzle solving with GRASP loop and AgentDB memory.

```bash
machine-dream solve <puzzle-file> [options]
```

**Arguments:**
- `<puzzle-file>`: Path to puzzle file (JSON format, 9x9 or 16x16 Sudoku)

**Options:**
```bash
# Memory System
--memory-system <type>       # reasoningbank|agentdb (default: agentdb)
--enable-rl                  # Enable RL learning (AgentDB only)
--enable-reflexion           # Enable error correction memory
--enable-skill-library       # Auto-extract reusable skills

# Solving Behavior
--max-iterations <n>         # Maximum GRASP iterations (default: 50)
--max-time <ms>              # Maximum solve time in milliseconds (default: 300000)
--reflection-interval <n>    # Iterations between reflections (default: 5)
--attention-window <n>       # Window size for attention mechanism (default: 10)

# Strategy Configuration
--strategies <list>          # Comma-separated strategy list (default: all)
                             # Available: naked-single,hidden-single,pointing-pairs,
                             #            box-line-reduction,naked-pairs,x-wing,etc.
--backtrack-enabled          # Enable backtracking for hard puzzles
--guess-threshold <n>        # Confidence threshold before guessing (0.0-1.0, default: 0.3)

# Output & Logging
--output <file>              # Save result to file (.json)
--session-id <id>            # Custom session identifier
--dream-after                # Trigger dreaming after solving
--visualize                  # Show live solving visualization
--export-trajectory          # Export full move trajectory

# Demo Mode
--demo-mode                  # Enable presentation-friendly output
--demo-speed <speed>         # realtime|fast|instant (default: realtime)
--pause-on-insight           # Pause when insights discovered
```

**Examples:**

```bash
# Basic solve
machine-dream solve puzzles/easy-01.json

# Advanced solve with AgentDB + RL
machine-dream solve puzzles/hard-showcase.json \
  --memory-system agentdb \
  --enable-rl \
  --enable-reflexion \
  --max-iterations 100 \
  --output results/hard-showcase.json

# Demo mode for presentation
machine-dream solve puzzles/demo.json \
  --demo-mode \
  --demo-speed realtime \
  --visualize \
  --pause-on-insight

# Batch solving with custom strategies
machine-dream solve puzzles/medium-*.json \
  --strategies naked-single,hidden-single,pointing-pairs \
  --max-time 60000 \
  --output results/batch-{timestamp}.json
```

**Output Format:**

```json
{
  "puzzleId": "hard-showcase",
  "success": true,
  "solveTime": 12487,
  "iterations": 47,
  "strategiesUsed": ["naked-single", "hidden-single", "pointing-pairs", "guess"],
  "insightsDiscovered": 5,
  "finalState": { /* puzzle grid */ },
  "trajectory": [ /* array of moves */ ],
  "sessionId": "solve-abc123"
}
```

---

### 3.2 Memory Command

Manage AgentDB memory system and persistent storage.

```bash
machine-dream memory <subcommand> [options]
```

**Subcommands:**

#### 3.2.1 `memory store` - Store Data

```bash
machine-dream memory store <key> <value> [options]

Arguments:
  <key>                        # Memory key
  <value>                      # Value to store (string or JSON)

Options:
  --namespace <ns>             # Memory namespace (default: "default")
  --ttl <seconds>              # Time-to-live in seconds
  --type <type>                # experience|pattern|skill|insight
```

#### 3.2.2 `memory retrieve` - Retrieve Data

```bash
machine-dream memory retrieve <key> [options]

Arguments:
  <key>                        # Memory key or pattern

Options:
  --namespace <ns>             # Memory namespace (default: "default")
  --format <format>            # json|yaml|table (default: json)
```

#### 3.2.3 `memory search` - Search Memory

```bash
machine-dream memory search <pattern> [options]

Arguments:
  <pattern>                    # Search pattern (supports regex)

Options:
  --namespace <ns>             # Memory namespace
  --limit <n>                  # Maximum results (default: 10)
  --type <type>                # Filter by type
  --similarity <threshold>     # Similarity threshold for vector search (0.0-1.0)
```

#### 3.2.4 `memory consolidate` - Trigger Consolidation

```bash
machine-dream memory consolidate [options]

Options:
  --session-ids <list>         # Comma-separated session IDs to consolidate
  --compression-ratio <n>      # Target compression ratio (default: 10)
  --min-success-rate <n>       # Minimum success rate for skills (default: 0.7)
  --output <file>              # Save consolidated knowledge
```

#### 3.2.5 `memory optimize` - Optimize Memory

```bash
machine-dream memory optimize [options]

Options:
  --quantization <type>        # scalar|binary|product (default: scalar)
  --prune-redundancy           # Remove redundant patterns
  --similarity-threshold <n>   # Similarity threshold for deduplication (default: 0.95)
```

#### 3.2.6 `memory backup` - Backup Memory

```bash
machine-dream memory backup <output-dir> [options]

Arguments:
  <output-dir>                 # Backup destination directory

Options:
  --namespaces <list>          # Specific namespaces to backup (default: all)
  --compress                   # Compress backup files
```

#### 3.2.7 `memory restore` - Restore Memory

```bash
machine-dream memory restore <backup-dir> [options]

Arguments:
  <backup-dir>                 # Backup source directory

Options:
  --validate                   # Validate integrity before restore
  --merge                      # Merge with existing data
```

---

### 3.3 Dream Command

Trigger and manage night cycle (dreaming/consolidation) operations.

```bash
machine-dream dream [subcommand] [options]
```

**Subcommands:**

#### 3.3.1 `dream run` - Run Dream Cycle

```bash
machine-dream dream run [options]

Options:
  --sessions <list>            # Comma-separated session IDs (default: all recent)
  --phases <list>              # Phases to run: capture,triage,compress,abstract,integrate
                               # (default: all)
  --compression-ratio <n>      # Target compression ratio (default: 10)
  --abstraction-levels <n>     # Number of abstraction levels (default: 4)
  --visualize                  # Show consolidation visualization
  --output <file>              # Save consolidated knowledge
```

**Example:**
```bash
# Run full dream cycle
machine-dream dream run \
  --sessions session-001,session-002,session-003 \
  --compression-ratio 15 \
  --abstraction-levels 5 \
  --visualize

# Quick consolidation
machine-dream dream run --phases compress,abstract
```

#### 3.3.2 `dream schedule` - Configure Schedule

```bash
machine-dream dream schedule <schedule-type> [options]

Arguments:
  <schedule-type>              # after-session|periodic|manual

Options:
  --interval <n>               # Interval for periodic (sessions, default: 10)
  --enable                     # Enable scheduled dreaming
  --disable                    # Disable scheduled dreaming
```

#### 3.3.3 `dream status` - Check Dream Status

```bash
machine-dream dream status [options]

Options:
  --last <n>                   # Show last N dream cycles (default: 5)
  --metrics                    # Include consolidation metrics
```

---

### 3.4 Benchmark Command

Run performance benchmarks and evaluations.

```bash
machine-dream benchmark <subcommand> [options]
```

**Subcommands:**

#### 3.4.1 `benchmark run` - Run Benchmarks

```bash
machine-dream benchmark run <suite-name> [options]

Arguments:
  <suite-name>                 # full|quick|memory|solve|transfer|custom

Options:
  --baseline <type>            # single-shot|naive-continuous|grasp|all (default: all)
  --difficulty <level>         # easy|medium|hard|expert|all (default: all)
  --count <n>                  # Puzzles per difficulty (default: 50)
  --output-dir <dir>           # Benchmark report directory
  --parallel <n>               # Number of parallel workers (default: 1)
  --compare-with <file>        # Compare with previous benchmark
```

**Benchmark Suites:**
- **full**: Comprehensive benchmark (all baselines, all difficulties)
- **quick**: Fast smoke test (10 puzzles, easy/medium only)
- **memory**: Memory system performance (AgentDB vs ReasoningBank)
- **solve**: Solving performance and accuracy
- **transfer**: Transfer learning evaluation (9x9 → 16x16)

**Example:**
```bash
# Run full benchmark suite
machine-dream benchmark run full \
  --baseline all \
  --difficulty all \
  --count 50 \
  --output-dir benchmarks/$(date +%Y%m%d) \
  --parallel 4

# Quick smoke test
machine-dream benchmark run quick \
  --baseline grasp \
  --difficulty easy,medium

# Compare with previous run
machine-dream benchmark run full \
  --compare-with benchmarks/20260104/report.json
```

#### 3.4.2 `benchmark report` - Generate Report

```bash
machine-dream benchmark report <results-dir> [options]

Arguments:
  <results-dir>                # Directory with benchmark results

Options:
  --format <format>            # markdown|html|pdf|json (default: markdown)
  --output <file>              # Output file path
  --charts                     # Generate performance charts
  --compare <files>            # Compare multiple benchmark runs
```

---

### 3.5 Demo Command

Run demonstration and presentation modes for puzzle solving.

```bash
machine-dream demo <script-name> [options]
```

**Arguments:**
- `<script-name>`: Demo script to run

**Available Scripts:**
- `stakeholder-presentation` - Full 10-minute stakeholder demo (5 acts)
- `quick-solve` - Quick puzzle solving demonstration
- `transfer-learning` - Transfer learning demonstration (9x9 → 16x16)
- `dreaming-visualization` - Consolidation process visualization
- `baseline-comparison` - Side-by-side baseline comparison

**Options:**
```bash
--pause-after-step           # Wait for keypress after each step
--speed <speed>              # realtime|fast|instant (default: realtime)
--export-recording <file>    # Export recording (.txt)
--skip-act <number>          # Skip specified act (testing only)
--act <number>               # Run specific act only
```

**Example:**
```bash
# Run full stakeholder presentation
machine-dream demo stakeholder-presentation \
  --pause-after-step \
  --export-recording demo-presentation.txt

# Quick solving demonstration
machine-dream demo quick-solve --speed instant

# Run specific act only
machine-dream demo stakeholder-presentation --act 3
```

---

### 3.6 Config Command

Manage system configuration.

```bash
machine-dream config <subcommand> [options]
```

**Subcommands:**

#### 3.6.1 `config show` - Show Configuration

```bash
machine-dream config show [options]

Options:
  --format <format>            # json|yaml|table (default: yaml)
  --key <key>                  # Show specific config key
```

#### 3.6.2 `config set` - Set Configuration

```bash
machine-dream config set <key> <value> [options]

Arguments:
  <key>                        # Configuration key (dot notation)
  <value>                      # Value to set

Options:
  --type <type>                # string|number|boolean|json (auto-detect if not specified)
  --global                     # Set in global config
```

**Example:**
```bash
# Set memory system
machine-dream config set memorySystem agentdb

# Set nested value
machine-dream config set agentdb.enableRL true

# Set complex value
machine-dream config set strategies '["naked-single","hidden-single"]' --type json
```

#### 3.6.3 `config validate` - Validate Configuration

```bash
machine-dream config validate [config-file] [options]

Arguments:
  [config-file]                # Config file to validate (default: .poc-config.json)

Options:
  --fix                        # Attempt to fix common issues
```

#### 3.6.4 `config export` - Export Configuration

```bash
machine-dream config export <output-file> [options]

Arguments:
  <output-file>                # Output file path

Options:
  --format <format>            # json|yaml (default: json)
  --include-defaults           # Include default values
```

---

### 3.7 Export Command

Export data, metrics, and results.

```bash
machine-dream export <type> [options]
```

**Arguments:**
- `<type>`: Data type to export (metrics|results|config|logs|memory|all)

**Options:**
```bash
--output-dir <dir>           # Output directory (default: ./export)
--format <format>            # json|csv|markdown (default: json)
--sessions <list>            # Specific session IDs to export
--compress                   # Compress exported data
--include-raw                # Include raw data (not just summaries)
```

**Example:**
```bash
# Export all data
machine-dream export all \
  --output-dir export/$(date +%Y%m%d) \
  --compress

# Export specific sessions
machine-dream export results \
  --sessions session-001,session-002 \
  --format csv

# Export memory snapshots
machine-dream export memory \
  --format json \
  --include-raw
```

---

### 3.8 LLM Command

LLM Sudoku Player operations and profile management (see [Spec 11: LLM Sudoku Player](./11-llm-sudoku-player.md) and [Spec 13: LLM Profile Management](./13-llm-profile-management.md)).

```bash
machine-dream llm <subcommand> [options]
```

**Subcommands:**

#### 3.8.0 `llm profile` - Manage AI Model Connection Profiles

See [Spec 13: LLM Profile Management](./13-llm-profile-management.md) for complete details.

```bash
machine-dream llm profile <action> [options]

Actions:
  list                         # List all profiles
  add                          # Create new profile (interactive)
  show <name>                  # Show profile details
  edit <name>                  # Edit existing profile
  delete <name>                # Delete profile
  set <name>                   # Set active profile
  test [name]                  # Test profile connection
  export <file>                # Export profiles to file
  import <file>                # Import profiles from file

Options (for 'add' action):
  --name <name>                # Profile name (required)
  --provider <provider>        # lmstudio|openai|anthropic|ollama|openrouter|custom
  --base-url <url>             # API endpoint URL
  --api-key <key>              # API key or ${ENV_VAR} reference
  --model <model>              # Model name
  --temperature <n>            # Temperature (0.0-2.0, default: 0.7)
  --max-tokens <n>             # Max response tokens (default: 2048)
  --timeout <ms>               # Request timeout (default: 60000)
  --tags <tag1,tag2>           # Comma-separated tags
  --color <color>              # Display color for TUI
  --set-default                # Set as active profile after creation
```

**Examples:**

```bash
# List all profiles
machine-dream llm profile list

# Create LM Studio profile (interactive)
machine-dream llm profile add

# Create profile with all options
machine-dream llm profile add \
  --name lm-studio-qwen3 \
  --provider lmstudio \
  --base-url http://localhost:1234/v1 \
  --model qwen3-30b \
  --temperature 0.7 \
  --max-tokens 2048 \
  --tags local,default \
  --set-default

# Create OpenAI profile with environment variable
machine-dream llm profile add \
  --name openai-gpt4 \
  --provider openai \
  --api-key '${OPENAI_API_KEY}' \
  --model gpt-4 \
  --tags cloud,production

# Switch active profile
machine-dream llm profile set lm-studio-qwen3

# Test connection
machine-dream llm profile test lm-studio-qwen3

# Show profile details
machine-dream llm profile show lm-studio-qwen3

# Edit profile (interactive)
machine-dream llm profile edit lm-studio-qwen3

# Delete profile (with confirmation)
machine-dream llm profile delete openai-gpt4

# Export profiles (without sensitive keys)
machine-dream llm profile export profiles-backup.json

# Import profiles
machine-dream llm profile import profiles-backup.json
```

#### 3.8.1 `llm play` - Play Puzzle with AI Model

```bash
machine-dream llm play <puzzle-file> [options]

Arguments:
  <puzzle-file>                # Path to puzzle file (JSON format)

Options:
  --no-memory                  # Disable memory (baseline mode for A/B testing)
  --profile <name>             # Use specific profile (overrides active profile)
  --model <model>              # Override model from profile (default: from profile)
  --endpoint <url>             # Override endpoint from profile (default: from profile)
  --max-moves <n>              # Maximum moves before abandoning (default: 200)
  --temperature <n>            # Override temperature from profile (default: from profile)
  --output <file>              # Save session results to file
  --visualize                  # Show live solving visualization
  --no-learning                # Disable few-shot learning injection (baseline mode)
  --learning                   # Enable few-shot learning injection (default when available)
  --learning-unit <id>         # Use specific learning unit (default: "default")
  --reasoning-template         # Use structured constraint-intersection system prompt
  --anonymous-patterns         # Use anonymous pattern format for learned strategies
```

**Learning Modes:**
- **Default**: Load few-shots if available for profile (learning enabled)
- **`--no-learning`**: Run without any learned patterns (for A/B testing baseline)
- **`--learning`**: Explicitly enable (useful after --no-learning was default)

**Example:**
```bash
# Play with active profile and memory enabled (default)
machine-dream llm play puzzles/easy-01.json --visualize

# Play with specific profile
machine-dream llm play puzzles/easy-01.json --profile lm-studio-qwen3

# Play without memory (baseline for comparison)
machine-dream llm play puzzles/easy-01.json --no-memory

# Play without learning (disable few-shot injection)
machine-dream llm play puzzles/easy-01.json --no-learning

# Override profile settings
machine-dream llm play puzzles/medium-01.json \
  --profile openai-gpt4 \
  --temperature 0.5 \
  --max-tokens 4096
```

#### 3.8.2 `llm stats` - View Learning Statistics

```bash
machine-dream llm stats [options]

Options:
  --sessions <n>               # Number of recent sessions to analyze (default: 10)
  --compare                    # Compare memory ON vs OFF performance
  --format <format>            # json|table|yaml (default: table)
```

#### 3.8.3 `llm dream` - Consolidate LLM Learning

Commands for consolidating LLM learning from play experiences into reusable few-shot examples.

**Subcommands:**

##### 3.8.3.1 `llm dream run` - Run Consolidation

Consolidate experiences into few-shot examples for a specific profile.

```bash
machine-dream llm dream run [options]

Options:
  --profile <name>             # LLM profile to consolidate (default: active profile)
  --all                        # Consolidate all profiles separately
  --output <file>              # Save consolidation report
  --learning-unit <id>         # Update specific learning unit (default: "default")
  --anonymous-patterns         # Generate patterns in anonymous format (no strategy names)
```

**Output:**
- Experiences found and processed
- Few-shots created
- Patterns extracted
- Updated few-shot count for profile

**Example:**
```bash
# Consolidate experiences for active profile
machine-dream llm dream run

# Consolidate for specific profile
machine-dream llm dream run --profile qwen3-coder

# Consolidate all profiles
machine-dream llm dream run --all

# Save consolidation report
machine-dream llm dream run --profile qwen3-coder --output dream-report.json
```

**Example output:**
```
🌙 Starting LLM dream cycle for profile: qwen3-coder
📊 Found 42 unconsolidated experiences

🌙 Dream Cycle Complete
────────────────────────────────────────
Profile: qwen3-coder
Experiences processed: 42
Few-shots created: 5
Patterns extracted: 8

✅ Profile now has 12 few-shot examples for learning
```

##### 3.8.3.2 `llm dream status` - Check Learning Status

Show current learning state for a profile.

```bash
machine-dream llm dream status [options]

Options:
  --profile <name>             # LLM profile to check (default: active profile)
  --all                        # Show status for all profiles
  --format <format>            # Output format (table|json), default: table
```

**Output:**
- Unconsolidated experience count
- Few-shot examples available
- Last consolidation timestamp
- Profile name and model

**Example:**
```bash
# Check status for active profile
machine-dream llm dream status

# Check status for specific profile
machine-dream llm dream status --profile qwen3-coder

# Check all profiles
machine-dream llm dream status --all
```

**Example output:**
```
📊 Learning Status: qwen3-coder
────────────────────────────────────────
Unconsolidated experiences: 42
Few-shot examples: 12
Last consolidation: 2024-01-15 14:32:15
Model: qwen3-30b

💡 Run 'llm dream run --profile qwen3-coder' to consolidate
```

#### 3.8.4 `llm benchmark` - Compare Memory ON vs OFF

```bash
machine-dream llm benchmark [options]

Options:
  --puzzles <n>                # Number of puzzles per mode (default: 5)
  --difficulty <level>         # easy|medium|hard (default: easy)
  --output <dir>               # Benchmark report directory
```

#### 3.8.5 `llm memory show` - View Experience Details

View complete details of a stored LLM experience including full reasoning text and board state.

```bash
machine-dream llm memory show <experience-id> [options]

Arguments:
  <experience-id>              # Experience ID (from `llm memory list`)

Options:
  --format <format>            # Output format (text|json), default: text
  --no-grid                    # Hide grid state (shown by default)
```

**Output includes:**
- Move details (row, col, value)
- Full reasoning text (complete LLM explanation)
- Validation outcome and error message (if any)
- Importance score and context metrics
- Profile name and model used
- Learning context (few-shots used, patterns available)
- Timestamp
- **Grid state at time of move (9x9 board, shown by default)**

**Example:**
```bash
# View experience in detail (includes grid by default)
machine-dream llm memory show exp-abc123

# Output as JSON for processing
machine-dream llm memory show exp-abc123 --format json

# Hide grid state if you only want text details
machine-dream llm memory show exp-abc123 --no-grid
```

#### 3.8.6 `llm memory list` - Enhanced Experience List

Enhanced version of `llm memory list` with additional filtering and display options.

```bash
machine-dream llm memory list [options]

Options:
  --session <id>               # Filter by session ID
  --puzzle <id>                # Filter by puzzle ID
  --profile <name>             # Filter by LLM profile name
  --outcome <type>             # Filter: correct|invalid|valid_but_wrong
  --importance <n>             # Filter by minimum importance (0.0-1.0)
  --with-learning              # Only show experiences that used learning features
  --limit <n>                  # Maximum entries to show (default: 50)
  --verbose                    # Show reasoning snippet (first 100 chars)
  --format <format>            # Output format (text|json), default: text
```

**Examples:**
```bash
# List experiences from specific profile
machine-dream llm memory list --profile lm-studio-qwen3

# List only experiences that used few-shot learning
machine-dream llm memory list --with-learning

# List with reasoning snippets
machine-dream llm memory list --verbose

# Compare profiles (export as JSON for analysis)
machine-dream llm memory list --profile openai-gpt4 --format json > gpt4.json
machine-dream llm memory list --profile lm-studio-qwen3 --format json > qwen3.json
```

#### 3.8.6.1 `llm memory clear` - Clear All Memory

Clear ALL agent memory data. For selective deletion, use `llm session delete` instead.

```bash
machine-dream llm memory clear [options]

Options:
  --confirm                    # Skip confirmation prompt (for scripts)
```

**Behavior:**
- Deletes the entire agent database
- Removes ALL sessions, experiences, few-shots, and learning units
- Cannot be undone
- Requires typing "yes" to confirm unless `--confirm` is provided

**Examples:**
```bash
# Clear all memory (with confirmation prompt)
machine-dream llm memory clear

# Clear all memory without prompt (for scripts)
machine-dream llm memory clear --confirm
```

**Note:** To delete specific sessions while preserving others, use `llm session delete` with filters.

#### 3.8.7 `llm session list` - List Play Sessions

List play sessions with aggregate statistics, exit status, and learning flags for A/B testing analysis.

```bash
machine-dream llm session list [options]

Options:
  --profile <name>             # Filter by LLM profile name
  --unit <name>                # Filter by learning unit
  --puzzle <name>              # Filter by puzzle name (partial match)
  --solved                     # Only show solved sessions
  --limit <n>                  # Maximum sessions to show (default: 20)
  --format <format>            # Output format (text|json), default: text
```

**Output columns:**
- Session ID (GUID)
- Profile name
- Unit (learning unit)
- Puzzle ID
- Done% (completion percentage based on correct moves / empty cells)
- Moves (total moves attempted)
- Acc% (accuracy: correct / total)
- Exit (why session ended: SOLVED, max_moves, llm_error, stuck, timeout, user_interrupt, abandoned, ok)
- Learning flags: [F#]=Few-shots used (#=count), [C]=Consolidated experiences, [N]=Has notes
- Date/time
- Notes (if present, shown on second line)

**Example output:**
```
📋 Play Sessions

ID                                    Profile           Unit           Puzzle            Done%  Moves   Acc%   Exit        Learning    Date
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
be1171ea-1b0d-47a9-b28e-3826134424e2  qwen3-coder       default        4x4-expert         78%      9   77.8%   SOLVED      [F3][C][N]  Jan 9, 10:45 PM
    📝 A/B testing baseline run
bec4f33f-a057-46da-b34a-ba2274f5f591  qwen3-coder       default        4x4-expert         11%     12    8.3%   llm_error   [F3][C]     Jan 9, 10:30 PM

Legend: [F#]=Few-shots used, [C]=Consolidated, [N]=Has notes, Exit: SOLVED/max_moves/llm_error/stuck/timeout/abandoned
```

**Examples:**
```bash
# List all sessions
machine-dream llm session list

# Only solved sessions
machine-dream llm session list --solved

# Filter by profile
machine-dream llm session list --profile qwen3-coder

# Filter by profile and puzzle
machine-dream llm session list --profile qwen3-coder --puzzle 9x9-easy

# Filter by learning unit
machine-dream llm session list --unit my-learning-unit

# Export as JSON
machine-dream llm session list --format json > sessions.json
```

#### 3.8.8 `llm session show` - Session Details

Show detailed breakdown of a play session including move-by-move analysis and learning context.

```bash
machine-dream llm session show <session-id> [options]

Arguments:
  <session-id>                 # Session ID (from `llm session list`)

Options:
  --format <format>            # Output format (text|json), default: text
```

**Output includes:**
- Session summary (profile, puzzle, outcome, exit reason, duration)
- Learning context at session start
- Move-by-move breakdown with outcomes
- Aggregate statistics
- Accuracy progression over time
- Comparison to baseline (if available)

**Example:**
```bash
# Show session details
machine-dream llm session show be1171ea-1b0d-47a9-b28e-3826134424e2

# Export as JSON
machine-dream llm session show be1171ea-1b0d-47a9-b28e-3826134424e2 --format json
```

**Example output:**
```
📋 Session: be1171ea-1b0d-47a9-b28e-3826134424e2
============================================================

📊 Summary:
  Profile: qwen3-coder
  Puzzle: 4x4-expert
  Outcome: ✗ UNSOLVED
  Exit reason: llm_error: LLM response incomplete: finish_reason=length
  Duration: 2 minutes

🎯 Move Statistics:
  Total moves: 12
  Correct: 1 (8.3%)
  Invalid: 10 (83.3%)
  Valid but wrong: 1 (8.3%)

📚 Learning Context (at session start):
  Memory enabled: Yes
  Few-shots used: 3 examples
  Patterns available: 5
  Consolidated experiences: 130

📈 Accuracy Progression:
  Moves 1-20:   35.0% accuracy
  Moves 21-40:  50.0% accuracy
  Moves 41-60:  55.0% accuracy
  Moves 61-80:  65.0% accuracy
  Moves 81-93:  72.0% accuracy

  Trend: Improving (learning from mistakes)

🔍 Use 'llm memory list --session sess-abc1' to see all moves
```

#### 3.8.9 `llm session edit` - Edit Session Metadata

Edit session metadata such as notes and annotations.

```bash
machine-dream llm session edit <session-id> [options]

Arguments:
  <session-id>                 # Session ID (from `llm session list`)

Options:
  --notes <text>               # Set session notes
```

**Examples:**
```bash
# Add notes to a session
machine-dream llm session edit be1171ea-1b0d-47a9-b28e-3826134424e2 --notes "A/B testing baseline run"

# Update notes
machine-dream llm session edit be1171ea-1b0d-47a9-b28e-3826134424e2 --notes "Updated notes"
```

#### 3.8.10 `llm session delete` - Delete Sessions

Delete sessions and their associated experiences (memories). Supports filtering to delete multiple sessions at once.

```bash
machine-dream llm session delete [options]

Options:
  --id <session-id>            # Delete specific session by ID
  --profile <name>             # Filter by LLM profile name
  --unit <name>                # Filter by learning unit
  --puzzle <name>              # Filter by puzzle name (partial match)
  --yes                        # Skip confirmation prompt
```

**Behavior:**
- Deletes all experiences (`llm_experience`) for matching sessions
- Deletes session metadata (`llm_session`) if it exists
- Requires confirmation unless `--yes` is provided
- Shows preview of sessions to be deleted before confirmation

**Examples:**
```bash
# Delete a specific session
machine-dream llm session delete --id be1171ea-1b0d-47a9-b28e-3826134424e2

# Delete all sessions for a profile
machine-dream llm session delete --profile qwen3-coder --yes

# Delete sessions matching profile and puzzle
machine-dream llm session delete --profile qwen3-coder --puzzle 9x9-easy

# Delete all sessions for a learning unit
machine-dream llm session delete --unit my-test-unit --yes
```

**Note:** For clearing ALL memory data, use `llm memory clear` instead.

---

### 3.9 System Command

System utilities and maintenance.

```bash
machine-dream system <subcommand> [options]
```

**Subcommands:**

#### 3.8.1 `system init` - Initialize System

```bash
machine-dream system init [options]

Options:
  --force                      # Force re-initialization
  --db-path <path>             # Custom database path
  --preset <name>              # Configuration preset (default|minimal|full)
```

#### 3.8.2 `system status` - Check System Status

```bash
machine-dream system status [options]

Options:
  --verbose                    # Include detailed component status
  --format <format>            # table|json|yaml (default: table)
```

#### 3.8.3 `system cleanup` - Clean Temporary Data

```bash
machine-dream system cleanup [options]

Options:
  --sessions                   # Clean session data
  --logs                       # Clean old logs
  --cache                      # Clean cache
  --all                        # Clean everything
  --older-than <days>          # Only clean data older than N days
  --dry-run                    # Show what would be deleted
```

#### 3.8.4 `system health` - Health Check

```bash
machine-dream system health [options]

Options:
  --components <list>          # Check specific components (comma-separated)
  --watch                      # Continuous monitoring
```

#### 3.8.5 `system migrate` - Database Migration

```bash
machine-dream system migrate [options]

Options:
  --from <system>              # Source memory system (reasoningbank|agentdb)
  --to <system>                # Target memory system
  --validate                   # Validate after migration
  --dry-run                    # Preview migration without executing
```

---

### 3.10 Puzzle Command

Puzzle generation and management operations (see [Spec 12: Randomized Puzzle Generation](./12-randomized-puzzle-generation.md)).

```bash
machine-dream puzzle <subcommand> [options]
```

**Subcommands:**

#### 3.10.1 `puzzle generate` - Generate Single Puzzle

Generate a randomized puzzle with optional seed for reproducibility.

```bash
machine-dream puzzle generate [options]

Options:
  --seed <number>              # Random seed for reproducibility (auto-generated if not provided)
  --size <n>                   # Grid size: 4|9|16|25 (default: 9)
  --difficulty <level>         # easy|medium|hard|expert|diabolical (default: medium)
  --symmetry <type>            # none|rotational|reflectional|diagonal (default: none)
  --output <file>              # Save to file (JSON format)
  --print-seed                 # Print seed to stdout (for reproducibility)
  --validate                   # Validate uniqueness (default: true)
  --format <format>            # output format: json|string|visual (default: json)
```

**Examples:**
```bash
# Generate with random seed (seed will be printed)
machine-dream puzzle generate --difficulty hard --output puzzles/random-hard.json

# Generate with specific seed (reproducible)
machine-dream puzzle generate --seed 12345 --difficulty medium --output puzzles/seed-12345.json

# Generate 16x16 puzzle
machine-dream puzzle generate --size 16 --difficulty expert --output puzzles/16x16-expert.json

# Generate with symmetry
machine-dream puzzle generate --symmetry rotational --output puzzles/symmetric.json
```

#### 3.10.2 `puzzle from-seed` - Regenerate from Seed

Recreate an exact puzzle from a known seed.

```bash
machine-dream puzzle from-seed <seed> [options]

Arguments:
  <seed>                       # Seed number to regenerate

Options:
  --size <n>                   # Grid size (must match original, default: 9)
  --difficulty <level>         # Difficulty level (must match original)
  --output <file>              # Save to file
  --verify                     # Verify against original if provided
  --original <file>            # Original puzzle file for verification
```

**Examples:**
```bash
# Recreate puzzle from seed
machine-dream puzzle from-seed 12345 --difficulty medium --output puzzles/recreated.json

# Verify recreation matches original
machine-dream puzzle from-seed 12345 --difficulty medium --original puzzles/original.json --verify
```

#### 3.10.3 `puzzle batch` - Generate Multiple Puzzles

Generate a batch of puzzles for training or testing.

```bash
machine-dream puzzle batch [options]

Options:
  --count <n>                  # Number of puzzles to generate (required)
  --seed-start <number>        # Starting seed (auto-generated if not provided)
  --seed-mode <mode>           # sequential|random (default: sequential)
  --size <n>                   # Grid size for all puzzles (default: 9)
  --difficulty <level>         # Single difficulty or comma-separated list
  --output-dir <dir>           # Output directory (default: puzzles/batch-<timestamp>/)
  --name-pattern <pattern>     # Filename pattern (default: puzzle-{seed}.json)
  --progress                   # Show progress during generation
  --summary                    # Print summary statistics
```

**Examples:**
```bash
# Generate 100 medium puzzles with sequential seeds
machine-dream puzzle batch --count 100 --seed-start 1000 --difficulty medium --output-dir puzzles/training/

# Generate mixed difficulty batch
machine-dream puzzle batch --count 30 --difficulty easy,medium,hard --output-dir puzzles/mixed/

# Generate with custom naming
machine-dream puzzle batch --count 50 --seed-start 5000 --name-pattern "training-{seed}-medium.json" --output-dir puzzles/
```

#### 3.10.4 `puzzle validate` - Validate Puzzle

Validate puzzle uniqueness and solvability.

```bash
machine-dream puzzle validate <puzzle-file> [options]

Arguments:
  <puzzle-file>                # Path to puzzle file

Options:
  --check-uniqueness           # Verify exactly one solution (default: true)
  --check-solvability          # Verify puzzle is solvable
  --check-difficulty           # Estimate and report actual difficulty
  --max-solutions <n>          # Max solutions to find (default: 2)
  --output <file>              # Save validation report
```

**Examples:**
```bash
# Full validation
machine-dream puzzle validate puzzles/custom.json --check-uniqueness --check-solvability

# Difficulty estimation
machine-dream puzzle validate puzzles/unknown.json --check-difficulty

# Find all solutions (up to limit)
machine-dream puzzle validate puzzles/test.json --max-solutions 5
```

#### 3.10.5 `puzzle list` - List Available Puzzles

List static and generated puzzles.

```bash
machine-dream puzzle list [options]

Options:
  --directory <dir>            # Directory to search (default: puzzles/)
  --filter-difficulty <level>  # Filter by difficulty
  --filter-size <n>            # Filter by grid size
  --show-seeds                 # Show seed numbers for generated puzzles
  --format <format>            # table|json|yaml (default: table)
```

**Examples:**
```bash
# List all puzzles
machine-dream puzzle list

# List only hard puzzles
machine-dream puzzle list --filter-difficulty hard

# List 16x16 puzzles
machine-dream puzzle list --filter-size 16 --show-seeds
```

---

## 4. Advanced Features

### 4.1 Interactive Mode

Launch interactive REPL for exploratory operations:

```bash
machine-dream interactive

# Or shorthand
machine-dream -i
```

**Features:**
- Command history and auto-completion
- Multi-line input support
- Live syntax highlighting
- Contextual help
- Session persistence

### 4.2 Piping and Composition

Commands support Unix-style piping:

```bash
# Solve and immediately dream
machine-dream solve puzzles/hard-01.json | machine-dream dream run

# Export and analyze
machine-dream export results --format json | jq '.[] | select(.iterations > 50)'

# Batch processing
cat puzzle-list.txt | xargs -I {} machine-dream solve puzzles/{}.json
```

### 4.3 Watch Mode

Monitor operations in real-time:

```bash
# Watch solving progress
machine-dream solve --watch --visualize

# Watch memory operations
machine-dream memory list --watch --interval 2

# Watch system health
machine-dream system health --watch
```

### 4.4 Hooks Integration

Execute custom hooks at key lifecycle events:

```bash
# Configure pre-task hook
machine-dream config set hooks.preTask "./scripts/pre-task-hook.sh"

# Configure post-task hook
machine-dream config set hooks.postTask "./scripts/post-task-hook.sh"

# Available hooks:
# - hooks.preTask
# - hooks.postTask
# - hooks.preEdit
# - hooks.postEdit
# - hooks.sessionEnd
# - hooks.sessionRestore
```

---

## 5. Configuration File Format

### 5.1 Complete Configuration Schema

`.poc-config.json`:

```json
{
  "memorySystem": "agentdb",
  "enableRL": true,
  "enableReflexion": true,
  "enableSkillLibrary": true,

  "solving": {
    "maxIterations": 100,
    "maxSolveTime": 300000,
    "reflectionInterval": 5,
    "attentionWindowSize": 10,
    "backtrackEnabled": true,
    "guessThreshold": 0.3,
    "strategies": ["naked-single", "hidden-single", "pointing-pairs", "box-line-reduction"]
  },

  "dreaming": {
    "schedule": "after-session",
    "compressionRatio": 10,
    "abstractionLevels": 4,
    "minSuccessRate": 0.7
  },

  "agentdb": {
    "dbPath": ".agentdb",
    "preset": "large",
    "quantization": "scalar",
    "indexing": "hnsw"
  },

  "benchmarking": {
    "enabled": true,
    "outputDir": "./benchmarks",
    "parallel": 4
  },

  "logging": {
    "level": "info",
    "outputDir": "./logs",
    "format": "json"
  },

  "demo": {
    "mode": false,
    "speed": "realtime",
    "pauseOnInsight": false
  },

  "hooks": {
    "preTask": null,
    "postTask": null,
    "preEdit": null,
    "postEdit": null,
    "sessionEnd": null,
    "sessionRestore": null
  }
}
```

### 5.2 Environment Variables

All configuration can be set via environment variables:

```bash
# Memory System
MACHINE_DREAM_MEMORY_SYSTEM=agentdb
MACHINE_DREAM_ENABLE_RL=true

# Solving
MACHINE_DREAM_MAX_ITERATIONS=100
MACHINE_DREAM_MAX_SOLVE_TIME=300000

# Logging
MACHINE_DREAM_LOG_LEVEL=debug
MACHINE_DREAM_LOG_DIR=./logs

# Database
MACHINE_DREAM_DB_PATH=.agentdb
```

---

## 6. Output Formats

### 6.1 JSON Output

All commands support `--output-format json`:

```bash
machine-dream solve puzzles/easy-01.json --output-format json
```

```json
{
  "status": "success",
  "data": {
    "puzzleId": "easy-01",
    "solved": true,
    "iterations": 15,
    "solveTime": 3247
  },
  "metadata": {
    "timestamp": "2026-01-05T10:30:00Z",
    "version": "0.1.0"
  }
}
```

### 6.2 Table Output

Default human-friendly format:

```
┌─────────────┬──────────┬────────────┬───────────┐
│ Puzzle ID   │ Status   │ Iterations │ Time (ms) │
├─────────────┼──────────┼────────────┼───────────┤
│ easy-01     │ ✓ Solved │ 15         │ 3,247     │
│ medium-01   │ ✓ Solved │ 47         │ 12,893    │
│ hard-01     │ ✗ Failed │ 100        │ 300,000   │
└─────────────┴──────────┴────────────┴───────────┘
```

### 6.3 YAML Output

Structured but human-readable:

```yaml
status: success
puzzle:
  id: easy-01
  difficulty: easy
  solved: true
metrics:
  iterations: 15
  solveTime: 3247
  strategiesUsed:
    - naked-single
    - hidden-single
```

---

## 7. Error Handling

### 7.1 Exit Codes

| Code | Meaning | Example |
|------|---------|---------|
| 0 | Success | Puzzle solved, no errors |
| 1 | General failure | Puzzle unsolvable, critical error |
| 2 | Partial success | Timeout with partial progress |
| 3 | Configuration error | Invalid config, missing field |
| 4 | Initialization error | Component failed to initialize |
| 5 | System error | Unexpected exception |
| 6 | User cancellation | User interrupted operation |

### 7.2 Error Output Format

```json
{
  "error": {
    "code": "SOLVE_TIMEOUT",
    "message": "Solving exceeded maximum time limit",
    "severity": "warning",
    "details": {
      "maxTime": 300000,
      "actualTime": 305432,
      "partialProgress": 0.73
    },
    "suggestions": [
      "Increase --max-time parameter",
      "Try simpler strategies first",
      "Enable --backtrack-enabled"
    ]
  }
}
```

---

## 8. Performance Optimization

### 8.1 Parallel Execution

```bash
# Parallel benchmark execution
machine-dream benchmark run full --parallel 8

# Parallel batch solving
ls puzzles/*.json | parallel -j 4 machine-dream solve {}
```

### 8.2 Caching

```bash
# Enable result caching
machine-dream config set cache.enabled true
machine-dream config set cache.ttl 3600

# Clear cache
machine-dream system cleanup --cache
```

### 8.3 Resource Limits

```bash
# Set memory limit
machine-dream solve puzzles/hard-01.json \
  --max-memory 2048  # MB

# Set CPU limit
machine-dream benchmark run full \
  --max-cpu 80  # Percentage
```

---

## 9. Integration Examples

### 9.1 CI/CD Integration

```yaml
# .github/workflows/benchmark.yml
name: Benchmark

on: [push, pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run benchmarks
        run: |
          machine-dream benchmark run quick \
            --output-format json \
            --output results.json

      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: benchmark-results
          path: results.json
```

### 9.2 Scripting Integration

```bash
#!/bin/bash
# automated-testing.sh

set -e

# Initialize system
machine-dream system init --preset full

# Run solve
RESULT=$(machine-dream solve puzzles/test.json --output-format json)

# Extract metrics
ITERATIONS=$(echo $RESULT | jq '.data.iterations')
SOLVE_TIME=$(echo $RESULT | jq '.data.solveTime')

# Assertions
if [ $ITERATIONS -gt 50 ]; then
  echo "FAIL: Too many iterations"
  exit 1
fi

if [ $SOLVE_TIME -gt 10000 ]; then
  echo "FAIL: Solve time too slow"
  exit 1
fi

echo "PASS: All tests passed"
```

### 9.3 API Integration

```typescript
// Using as a library
import { MachineDream } from 'machine-dream-poc';

const md = new MachineDream({
  memorySystem: 'agentdb',
  enableRL: true
});

await md.initialize();

const result = await md.solve('puzzles/hard-01.json');
console.log(`Solved in ${result.iterations} iterations`);

await md.dream.run();
```

---

## 10. Troubleshooting Guide

### 10.1 Common Issues

**Issue: Command not found**
```bash
# Solution: Add to PATH or use npx
npx machine-dream <command>

# Or install globally
npm install -g machine-dream-poc
```

**Issue: Database locked**
```bash
# Solution: Kill hanging processes
machine-dream system cleanup --sessions
# Or force cleanup
rm .agentdb/agent.db-wal .agentdb/agent.db-shm
```

**Issue: Out of memory**
```bash
# Solution: Reduce batch size or enable memory optimization
machine-dream config set agentdb.quantization scalar
machine-dream memory optimize --prune-redundancy
```

**Issue: Slow performance**
```bash
# Solution: Check and optimize
machine-dream memory optimize
machine-dream system cleanup --cache
```

### 10.2 Debug Mode

```bash
# Enable debug logging
machine-dream --log-level debug solve puzzles/test.json

# Trace execution
MACHINE_DREAM_TRACE=1 machine-dream solve puzzles/test.json

# Profile performance
MACHINE_DREAM_PROFILE=1 machine-dream benchmark run quick
```

---

## 11. Version Management

### 11.1 Version Commands

```bash
# Show version
machine-dream --version
# Output: machine-dream v0.1.0

# Show detailed version info
machine-dream system status --verbose
# Includes: Node version, dependencies, database schema version
```

### 11.2 Backward Compatibility

```bash
# Check compatibility
machine-dream system migrate --dry-run --to agentdb

# Force migration
machine-dream system migrate --from reasoningbank --to agentdb --validate
```

---

## 12. Security Considerations

### 12.1 Sensitive Data

```bash
# Exclude sensitive data from exports
machine-dream export all --exclude-sensitive

# Encrypt exports
machine-dream export all --encrypt --password-file secrets/export-key.txt
```

### 12.2 Access Control

```bash
# Set file permissions
machine-dream config set security.fileMode 0600

# Restrict database access
chmod 600 .agentdb/agent.db
```

---

## 13. Documentation and Help

### 13.1 Built-in Help

```bash
# General help
machine-dream --help
machine-dream -h

# Command-specific help
machine-dream solve --help
machine-dream memory --help

# Examples for command
machine-dream solve --examples
```

### 13.2 Man Pages

```bash
# View man page
man machine-dream
man machine-dream-solve
man machine-dream-memory
```

---

## 14. Success Criteria

### 14.1 Functional Requirements

- ✅ All commands execute without errors
- ✅ Help documentation accurate and complete
- ✅ Configuration loading supports all sources (CLI, env, file, defaults)
- ✅ Output formats (JSON, table, YAML) work correctly
- ✅ Error messages actionable with clear suggestions
- ✅ Exit codes consistent and documented

### 14.2 Performance Requirements

- ✅ Command parsing: <50ms
- ✅ Help display: <100ms
- ✅ Configuration loading: <200ms
- ✅ Interactive mode startup: <1s

### 14.3 Usability Requirements

- ✅ Commands follow Unix conventions
- ✅ Tab completion works in common shells
- ✅ Progress indicators for long operations
- ✅ Confirmations for destructive operations
- ✅ Consistent naming across commands

---

## 15. Implementation Roadmap

### Phase 1: Core Commands (Week 1)
- [ ] `solve` command with basic options
- [ ] `config` command for configuration
- [ ] `system init` and `system status`
- [ ] JSON output format

### Phase 2: Advanced Commands (Week 2)
- [ ] `memory` command suite
- [ ] `dream` command
- [ ] Table and YAML output formats
- [ ] Interactive mode

### Phase 3: Integration (Week 3)
- [ ] `benchmark` command
- [ ] `demo` command
- [ ] `config` command
- [ ] Export utilities

### Phase 4: Polish (Week 4)
- [ ] `export` command enhancements
- [ ] Error handling improvements
- [ ] Performance optimization
- [ ] Documentation completion
- [ ] Advanced visualization options

### Phase 5: Backend Integration (Week 5)
- [ ] Integrate `memory` commands with AgentDB backend
- [ ] Integrate `dream` commands with DreamingController
- [ ] Integrate `system` commands with SystemOrchestrator
- [ ] Integrate `benchmark` commands with BenchmarkSuite
- [ ] Implement interactive REPL mode
- [ ] Enhance configuration validation and export
- [ ] Complete data export utilities
- [ ] Update all error handling with backend-specific messages

---

## 16. Backend Integration Specification

### 16.1 Overview

This section specifies the integration between the CLI interface and existing backend systems. The CLI interface is complete and tested. This phase focuses on connecting CLI commands to functional backend components.

### 16.2 Available Backend Systems

| System | Location | Responsibility |
|--------|----------|---------------|
| AgentDB | `src/agentdb/LocalAgentDB.ts` | Database operations and memory storage |
| Memory | `src/memory/AgentMemory.ts` | Memory management and retrieval |
| Dreaming | `src/consolidation/DreamingController.ts` | Dreaming and knowledge consolidation |
| Benchmarking | `src/benchmarking/BenchmarkSuite.ts` | Performance testing and metrics |
| Orchestration | `src/orchestration/SystemOrchestrator.ts` | System coordination and workflows |

### 16.3 Integration Requirements

#### 16.3.1 Memory Commands Integration

**Commands**: `store`, `retrieve`, `search`, `consolidate`, `optimize`, `backup`, `restore`

**Backend**: `AgentMemory` and `LocalAgentDB` classes

**Requirements**:
- `store`: Must use `AgentMemory.storeExperience()` with proper metadata
- `retrieve`: Must support key-based and pattern-based retrieval
- `search`: Must implement similarity search with configurable thresholds
- `consolidate`: Must trigger `DreamingController.consolidate()`
- `backup/restore`: Must handle file serialization/deserialization
- **Error Handling**: Must provide actionable error messages for all failure modes

#### 16.3.2 Dream Commands Integration

**Commands**: `run`, `status`, `schedule`

**Backend**: `DreamingController` class

**Requirements**:
- `run`: Must support all dream phases (capture, triage, compress, abstract, integrate)
- `status`: Must show recent dream cycles with metrics
- `schedule`: Must update system configuration persistently
- **Visualization**: Must support `--visualize` flag for consolidation process

#### 16.3.3 System Commands Integration

**Commands**: `init`, `status`, `cleanup`, `health`, `migrate`

**Backend**: `SystemOrchestrator` class

**Requirements**:
- `init`: Must handle database initialization and configuration
- `status`: Must show system health and component status
- `cleanup`: Must safely clean temporary files and old data
- `migrate`: Must support database migration with validation
- **Safety**: Must confirm destructive operations

### 16.4 Integration Testing Requirements

#### 16.4.1 Unit Testing
- ✅ Existing CLI interface tests (15 tests) - **Complete**
- ✅ Backend integration tests for each command (13 tests) - **Complete**
- ✅ Error handling and edge case tests - **Complete**

#### 16.4.2 Integration Testing
- ✅ Backend system initialization tests (4 tests)
- ✅ Memory system integration tests (3 tests)
- ✅ Dream system integration tests (2 tests)
- ✅ System integration tests (2 tests)
- ✅ Error handling integration tests (2 tests)

#### 16.4.3 Test Coverage Goals
- ✅ **Unit Tests**: 15 CLI interface tests + 13 backend integration tests = 28 tests
- ✅ **Integration Tests**: All major backend systems tested
- ✅ **Error Tests**: Error handling validated

### 16.5 Success Criteria

#### 16.5.1 Functional Requirements
- ✅ All CLI commands execute without errors
- ✅ Help documentation accurate and complete
- ✅ Configuration loading supports all sources
- ✅ Output formats (JSON, table, YAML) work correctly
- ✅ Error messages actionable with clear suggestions
- ✅ Exit codes consistent and documented
- 🔧 **Backend Integration**: All commands connected to backend systems

#### 16.5.2 Integration Requirements
- ✅ Memory commands work with AgentDB (verified in tests)
- ✅ Dream commands work with DreamingController (verified in tests)
- ✅ System commands work with SystemOrchestrator (verified in tests)
- ⚠️ Benchmark commands work with BenchmarkSuite (not yet integrated)
- ⚠️ Interactive REPL functional (not yet implemented)
- ⚠️ Configuration validation working (partial implementation)
- ⚠️ Export utilities functional (not yet integrated)

### 16.6 Implementation Timeline

| Phase | Duration | Milestones | Status |
|-------|----------|------------|--------|
| Phase 5.1 | 2-3 hours | Memory and Dream integration complete | ✅ Complete |
| Phase 5.2 | 1-2 hours | System integration complete | ✅ Complete |
| Phase 5.3 | 1 hour | Configuration, Export, and REPL complete | ⚠️ Partial |
| Phase 5.4 | 1 hour | Testing and validation complete | ✅ Complete |
| **Total** | **4-6 hours** | Full backend integration | 🟡 75% Complete |

### 16.7 Risk Assessment

| Risk Area | Impact | Mitigation Strategy |
|-----------|--------|---------------------|
| Backend API changes | Medium | Use adapter pattern if needed |
| Performance issues | Low | Optimize after basic integration |
| Configuration conflicts | Low | Thorough testing |
| Error handling gaps | Medium | Comprehensive error testing |

### 16.8 Documentation Updates Required

- ✅ Update CLI spec with integration details
- ✅ Add backend integration examples
- ✅ Update error message documentation
- ⚠️ Add troubleshooting guide for integration issues

---



---

## 17. TUI Integration Interface

### 17.1 Programmatic Command Execution

**Purpose**: Enable the TUI to execute CLI commands programmatically without spawning subprocess.

**Core Interface**:
```typescript
// src/cli/executor.ts
export interface CommandExecutor {
  execute(
    command: string,
    args: string[],
    options: Record<string, unknown>,
    callbacks?: ExecutionCallbacks
  ): Promise<CommandResult>;
}

export interface ExecutionCallbacks {
  onProgress?: (event: CommandProgressEvent) => void;
  onOutput?: (data: string) => void;
  onError?: (error: Error) => void;
}

export interface CommandProgressEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  command: string;
  percentage?: number;
  message?: string;
  data?: unknown;
}

export interface CommandResult {
  success: boolean;
  data?: unknown;
  error?: Error;
  executionTime?: number;
}
```

### 17.2 Implementation Pattern

```typescript
// Example: TUI executes solve command
import { executeCommand } from './cli/executor';
import { OutputManager } from './tui/services/OutputManager';

class SolveScreen {
  private outputManager: OutputManager;

  async handleSubmit(formData: SolveFormData): Promise<void> {
    // Emit TUI event
    this.outputManager.emit({
      timestamp: Date.now(),
      eventType: 'command',
      component: 'SolveScreen',
      data: {
        command: 'solve',
        args: [formData.puzzleFile],
        status: 'started'
      }
    });

    // Execute CLI command programmatically
    const result = await executeCommand(
      'solve',
      [formData.puzzleFile],
      {
        memorySystem: formData.memorySystem,
        enableRL: formData.enableRL,
        maxIterations: formData.maxIterations
      },
      {
        onProgress: (event) => {
          // Update TUI progress bar
          this.progressBar.setProgress(event.percentage || 0);
          this.statusText.setContent(event.message || '');

          // Emit progress event for tests
          this.outputManager.emit({
            timestamp: Date.now(),
            eventType: 'command',
            component: 'SolveScreen',
            data: { ...event, status: 'progress' }
          });
        }
      }
    );

    // Emit completion event
    this.outputManager.emit({
      timestamp: Date.now(),
      eventType: 'command',
      component: 'SolveScreen',
      data: {
        command: 'solve',
        status: result.success ? 'complete' : 'error',
        result
      }
    });
  }
}
```

### 17.3 Progress Event Streaming

**Progress events for different commands**:

| Command | Progress Events |
|---------|----------------|
| `solve` | Iteration count, current cell, insights generated |
| `dream run` | Phase (capture/triage/compress/abstract/integrate), patterns processed |
| `benchmark run` | Puzzle completion, metrics collected |
| `memory consolidate` | Patterns compressed, abstraction level |

**Example progress sequence**:
```typescript
// solve command progress events
{ type: 'start', command: 'solve', message: 'Initializing...' }
{ type: 'progress', command: 'solve', percentage: 10, message: 'Iteration 1/10', data: { iteration: 1, cell: 'r0c0' } }
{ type: 'progress', command: 'solve', percentage: 50, message: 'Iteration 5/10', data: { iteration: 5, insights: 3 } }
{ type: 'complete', command: 'solve', percentage: 100, message: 'Solved!', data: { solved: true, iterations: 8 } }
```

### 17.4 Output Capturing

**Redirect stdout/stderr for TUI display**:

```typescript
interface OutputCapture {
  stdout: string[];  // Captured stdout lines
  stderr: string[];  // Captured stderr lines
  logs: LogEntry[];  // Structured log entries
}

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

// Example: Capture command output for TUI log viewer
const result = await executeCommand('solve', args, options, {
  onOutput: (line) => {
    this.logViewer.appendLine(line);
  }
});
```

### 17.5 Error Handling

**Map CLI errors to TUI-friendly messages**:

```typescript
try {
  const result = await executeCommand('solve', args, options);
  if (!result.success && result.error) {
    this.showErrorDialog({
      title: 'Command Failed',
      message: result.error.message,
      details: result.error.stack,
      suggestions: result.error.suggestions || []
    });
  }
} catch (error) {
  this.showErrorDialog({
    title: 'Unexpected Error',
    message: error instanceof Error ? error.message : String(error),
    suggestions: ['Check logs', 'Try again', 'Report issue']
  });
}
```

### 17.6 Session Management

**Share configuration between CLI and TUI**:

```typescript
// Both CLI and TUI use same configuration
import { Configuration } from './config/Configuration';

const config = Configuration.load('.poc-config.json');

// CLI uses config
await executeCommand('solve', args, { config });

// TUI uses config
const tui = new TUIApplication({ config });
```

### 17.7 Command Discovery

**TUI automatically discovers available CLI commands**:

```typescript
import { getAvailableCommands } from './cli/registry';

const commands = getAvailableCommands();
/*
Returns:
[
  { name: 'solve', description: '...', options: [...] },
  { name: 'memory store', description: '...', options: [...] },
  { name: 'dream run', description: '...', options: [...] },
  ...
]
*/

// TUI builds menus from command registry
const menus = buildMenusFromCommands(commands);
```

---

**Document Status:** 🟡 Implementation-In-Progress (75% Complete)

**Next Steps:**
1. ✅ Review with development team
2. ✅ Begin Phase 1 implementation (CLI interface complete)
3. ✅ Complete Phase 5.1-5.2: Core backend integration (Memory, Dream, System)
4. ⚠️ Complete Phase 5.3: Advanced features (Benchmark, REPL, Config/Export)
5. ✅ Testing and validation complete
