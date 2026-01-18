# Machine Dream CLI Reference

Complete command-line reference for the Machine Dream Sudoku solver and AI learning system.

## Quick Reference

### Core Commands

| Command | Description |
|---------|-------------|
| `solve <puzzle>` | Solve puzzle using GRASP algorithm |
| `puzzle` | Generate and manage puzzles |
| `memory` | Memory system management |
| `dream` | Dreaming/consolidation system |
| `benchmark` | Performance benchmarking |
| `config` | System configuration |
| `export` | Data export utilities |
| `system` | System utilities |
| `tui` | Terminal user interface |
| `interactive` | Interactive REPL mode |
| `demo` | Demonstration scripts |

### LLM Commands

| Command | Description |
|---------|-------------|
| `llm play` | Play puzzle with LLM |
| `llm profile` | Manage LLM profiles |
| `llm model` | LM Studio model management |
| `llm memory` | LLM experience memory |
| `llm session` | Session management |
| `llm learning` | Learning unit management |
| `llm dream` | Learning consolidation |
| `llm stats` | Usage statistics |
| `llm benchmark` | LLM performance benchmarks |

---

## Global Options

| Option | Description |
|--------|-------------|
| `--verbose, -v` | Verbose output |
| `--quiet, -q` | Suppress non-critical output |
| `--format <format>` | Output format: text\|json\|yaml |
| `--config <file>` | Path to configuration file |
| `--log-level <level>` | trace\|debug\|info\|warn\|error\|fatal |
| `--help, -h` | Show help information |
| `--version, -V` | Show version |

---

## Core Commands

### solve

Solve a Sudoku puzzle using the GRASP algorithm.

```bash
machine-dream solve <puzzle-file> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--memory-system <type>` | Memory system: reasoningbank\|agentdb | agentdb |
| `--enable-rl` | Enable reinforcement learning | false |
| `--enable-reflexion` | Enable error correction memory | false |
| `--max-iterations <n>` | Maximum GRASP iterations | - |
| `--visualize` | Show live solving visualization | false |
| `--dream-after` | Trigger dreaming after solving | false |

### puzzle

Generate and manage Sudoku puzzles.

#### puzzle generate

```bash
machine-dream puzzle generate [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--seed <n>` | Random seed for reproducibility | random |
| `--size <n>` | Grid size: 4\|9\|16\|25 | 9 |
| `--difficulty <level>` | easy\|medium\|hard\|expert\|diabolical | medium |
| `--symmetry <type>` | none\|rotational\|reflectional\|diagonal | none |
| `--output <file>` | Save puzzle to file | - |

#### puzzle from-seed

```bash
machine-dream puzzle from-seed <seed> [options]
```

Generate a puzzle from a specific seed.

#### puzzle batch

```bash
machine-dream puzzle batch [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--count <n>` | Number to generate | 10 |
| `--seed-start <n>` | Starting seed | 1 |
| `--output-dir <dir>` | Output directory | ./puzzles |

#### puzzle validate

```bash
machine-dream puzzle validate <puzzle-file>
```

Validate a puzzle has a unique solution.

#### puzzle list

```bash
machine-dream puzzle list [directory]
```

List available puzzles in a directory.

### memory

Memory system management commands.

#### memory store

Store data in memory system.

#### memory retrieve

Retrieve data from memory system.

#### memory search

Search memory for patterns.

#### memory consolidate

Run memory consolidation.

#### memory optimize

Optimize memory storage.

#### memory backup

Backup memory data.

#### memory restore

Restore memory from backup.

### dream

Dreaming and consolidation for the deterministic solver.

#### dream run

```bash
machine-dream dream run [options]
```

Run dreaming consolidation cycle.

#### dream schedule

Schedule dreaming cycles.

#### dream status

Show dreaming status and history.

### benchmark

Performance benchmarking system.

#### benchmark run

```bash
machine-dream benchmark run <suite> [options]
```

Run a benchmark suite.

#### benchmark report

```bash
machine-dream benchmark report <results>
```

Generate benchmark report.

### config

System configuration management.

#### config show

Show current configuration.

#### config set

Set configuration value.

#### config validate

Validate configuration.

#### config export

Export configuration.

### export

Data export utilities.

```bash
machine-dream export <type> [options]
```

Types: metrics|results|config|logs|memory|all

### system

System utilities and maintenance.

#### system init

Initialize the system.

#### system status

Show system status.

#### system cleanup

Clean up temporary data.

#### system health

Run health checks.

#### system migrate

Run data migrations.

### tui

Launch the terminal user interface.

```bash
machine-dream tui
```

### interactive

Launch interactive REPL mode.

```bash
machine-dream interactive
```

### demo

Run demonstration scripts.

```bash
machine-dream demo <script-name>
```

---

## LLM Commands

### llm play

Play a Sudoku puzzle using pure LLM reasoning.

```bash
machine-dream llm play <puzzle> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--profile <name>` | LLM profile to use | active profile |
| `--no-memory` | Disable memory (baseline mode) | false |
| `--no-learning` | Disable few-shot injection | false |
| `--learning` | Enable few-shot injection | true |
| `--model <model>` | Override model name | - |
| `--endpoint <url>` | Override LLM endpoint | - |
| `--timeout <ms>` | Request timeout | 300000 |
| `--max-moves <n>` | Maximum moves before abandoning | 200 |
| `--visualize` | Show live solving visualization | false |
| `--debug` | Show detailed debug output | false |
| `--include-reasoning` | Include reasoning in history | false |
| `--history-limit <n>` | Limit move history to last N moves (0=unlimited) | 3 |
| `--learning-unit <id>` | Use specific learning unit | "default" |
| `--reasoning-template` | Use structured reasoning format | false |
| `--no-anonymous-patterns` | Disable anonymous pattern format | false (enabled) |
| `--no-streaming` | Disable streaming mode | false (enabled) |
| `--show-reasoning` | Display full reasoning tokens | false |
| `--save-reasoning` | Store full reasoning in memory | false |
| `--aisp` | Use AISP syntax (low-ambiguity) | false |
| `--aisp-lite` | Use simplified AISP (better for smaller models) | false |
| `--aisp-full` | Use full AISP mode (16384 maxTokens) | false |
| `--succinct-reasoning` | Request shorter responses without full analysis | false |
| `--timeout <ms>` | Request timeout (uses profile timeout if not specified) | - |

**Examples:**
```bash
# Basic play
machine-dream llm play puzzles/9x9-easy.json

# With specific profile and learning unit
machine-dream llm play puzzles/9x9-medium.json --profile qwen3-coder --learning-unit training-v1

# With AISP mode and reasoning storage
machine-dream llm play puzzles/4x4-expert.json --aisp --save-reasoning

# AISP-lite for smaller models (simplified format, natural language proofs allowed)
machine-dream llm play puzzles/9x9-easy.json --aisp-lite --profile small-model

# Succinct mode for faster responses
machine-dream llm play puzzles/9x9-easy.json --succinct-reasoning

# Baseline mode (no learning)
machine-dream llm play puzzles/9x9-easy.json --no-learning
```

### llm profile

Manage LLM connection profiles.

#### llm profile list

```bash
machine-dream llm profile list [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--provider <provider>` | Filter by provider |
| `--tags <tags>` | Filter by tags (comma-separated) |
| `--sort <sort>` | Sort by: usage\|last-used\|name |
| `--format <format>` | Output format: text\|json |

#### llm profile add

```bash
machine-dream llm profile add [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--name <name>` | Profile name (auto-suffixed with date) |
| `--provider <provider>` | Provider: lmstudio\|openai\|anthropic\|ollama\|openrouter\|custom |
| `--base-url <url>` | API endpoint URL |
| `--api-key <key>` | API key or ${ENV_VAR} reference |
| `--model <model>` | Model name |
| `--temperature <n>` | Temperature (0.0-2.0) |
| `--max-tokens <n>` | Max response tokens |
| `--timeout <ms>` | Request timeout |
| `--tags <tags>` | Comma-separated tags |
| `--color <color>` | Display color |
| `--system-prompt <text>` | Additional system prompt |
| `--set-default` | Set as active profile |

**Automatic Naming:**
Profile names are automatically suffixed with the current date (YYYYMMDD format):
- `gpt-oss-120b` → `gpt-oss-120b_20260112`
- If name exists, increments are added: `gpt-oss-120b_20260112_001`, `_002`, etc.

**Examples:**
```bash
# Create profile - automatically becomes "qwen3-coder_20260112"
machine-dream llm profile add --name qwen3-coder --provider lmstudio --base-url http://localhost:1234/v1 --model qwen3-coder

# If created again same day - becomes "qwen3-coder_20260112_001"
machine-dream llm profile add --name qwen3-coder --provider lmstudio --base-url http://localhost:1234/v1 --model qwen3-coder-v2
```

#### llm profile show

```bash
machine-dream llm profile show <name>
```

Show profile details.

#### llm profile delete

```bash
machine-dream llm profile delete <name>
```

Delete a profile.

#### llm profile update

```bash
machine-dream llm profile update <name> [options]
```

Update profile settings.

#### llm profile set

```bash
machine-dream llm profile set <name>
```

Set active profile.

#### llm profile test

```bash
machine-dream llm profile test <name>
```

Test profile connection.

#### llm profile export

```bash
machine-dream llm profile export <name> [output-file]
```

Export profile to file.

#### llm profile import

```bash
machine-dream llm profile import <file>
```

Import profile from file.

### llm model

LM Studio model management.

#### llm model list

```bash
machine-dream llm model list [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--loaded-only` | Only show loaded models |
| `--format <format>` | Output format: text\|json |

#### llm model load [DEPRECATED]

```bash
machine-dream llm model load <model-id> [options]
```

> **⚠️ DEPRECATED:** This command is deprecated. The `llm play` command now automatically loads the required model based on the profile configuration. Use `lms load <model>` directly if manual loading is needed.

**Options:**
| Option | Description |
|--------|-------------|
| `--ttl <seconds>` | Auto-unload after idle time |
| `--context-length <n>` | Override context length |
| `--gpu-layers <n>` | GPU layers to offload |

#### llm model unload [DEPRECATED]

```bash
machine-dream llm model unload [model-id]
```

> **⚠️ DEPRECATED:** This command is deprecated. The `llm play` command now automatically manages model loading/unloading. Use `lms unload --all` directly if manual unloading is needed.

Unload model from memory. If no model specified, unloads all.

### llm memory

LLM experience memory management.

#### llm memory store

Store experience in memory.

#### llm memory retrieve

Retrieve experiences.

#### llm memory list

List stored experiences.

#### llm memory show

Show experience details.

#### llm memory search

Search experiences.

#### llm memory clear

Clear experience memory.

#### llm memory export

Export experiences to file.

#### llm memory import

Import experiences from file.

### llm session

Play session management.

#### llm session list

```bash
machine-dream llm session list [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--profile <name>` | Filter by profile |
| `--unit <name>` | Filter by learning unit |
| `--puzzle <name>` | Filter by puzzle |
| `--solved` | Only show solved sessions |
| `--limit <n>` | Maximum sessions to show |
| `--format <format>` | Output format: text\|json |

#### llm session show

```bash
machine-dream llm session show <session-id>
```

Show session details and moves.

#### llm session delete

```bash
machine-dream llm session delete <session-id>
```

Delete a session.

#### llm session rename

```bash
machine-dream llm session rename <session-id> <new-name>
```

Rename a session.

#### llm session export

```bash
machine-dream llm session export <session-id> [output-file]
```

Export session data.

### llm learning

Learning unit management.

#### llm learning list

```bash
machine-dream llm learning list [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--profile <name>` | Filter by profile | all profiles |
| `--format <format>` | Output format: table\|json | table |
| `--sort <order>` | Sort order: name\|created\|updated | name |
| `--reverse` | Reverse sort order | false |

**Examples:**
```bash
# List all learning units sorted by name
machine-dream llm learning list

# List units for a specific profile, newest first
machine-dream llm learning list --profile gpt-oss-120b --sort created --reverse

# JSON output sorted by last update
machine-dream llm learning list --format json --sort updated --reverse
```

#### llm learning show

```bash
machine-dream llm learning show <unit-id>
```

Show learning unit details including:
- Unit metadata (profile, creation date, last update)
- Strategies synthesized from successful moves
- **Anti-patterns** from clustered invalid moves (if failure learning enabled)
- **Reasoning corrections** from valid-but-wrong move analysis (if failure learning enabled)

#### llm learning delete

```bash
machine-dream llm learning delete <unit-id>
```

Delete a learning unit.

#### llm learning clone

```bash
machine-dream llm learning clone <source-id> <target-id>
```

Clone a learning unit and all its data (strategies, experiences, hierarchy).

**Options:**
| Option | Description |
|--------|-------------|
| `--profile <name>` | LLM profile (searches all if not specified) |

**Example:**
```bash
# Create backup before modifications
machine-dream llm learning clone my-unit my-unit-backup
```

#### llm learning unconsolidate

```bash
machine-dream llm learning unconsolidate <unit-id>
```

Restore unit-bound experiences back to the global unconsolidated pool. Useful for re-dreaming with different algorithms.

**Options:**
| Option | Description |
|--------|-------------|
| `--profile <name>` | LLM profile (searches all if not specified) |
| `--delete-unit` | Delete the learning unit after unconsolidating |
| `--yes` | Skip confirmation prompt |

**Example:**
```bash
# Restore experiences for re-consolidation
machine-dream llm learning unconsolidate my-unit

# Restore and delete the unit
machine-dream llm learning unconsolidate my-unit --delete-unit --yes
```

#### llm learning rename

```bash
machine-dream llm learning rename <unit-id> <new-name>
```

Rename a learning unit.

#### llm learning export

```bash
machine-dream llm learning export <unit-id> [output-file]
```

Export learning unit.

#### llm learning import

```bash
machine-dream llm learning import <file>
```

Import learning unit.

### llm dream

LLM learning consolidation (dreaming).

#### llm dream run

```bash
machine-dream llm dream run [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--profile <name>` | Profile to consolidate | active profile |
| `--all` | Consolidate all profiles | false |
| `--learning-unit <id>` | Target learning unit | auto-generated |
| `--reset` | Reset and reprocess | false |
| `--rerun <unit-id>` | Re-run consolidation on an existing unit | - |
| `--algorithm <name>` | Clustering algorithm: legacy\|llm-cluster-v1 | llm-cluster-v1 |
| `--anonymous-patterns` | Use anonymous format | false |
| `--double-strategies` | Double strategy count (6-10) | false |
| `--aisp` | Mark unit as AISP mode (for naming) | false |
| `--aisp-lite` | Mark unit as AISP-lite mode (for naming) | false |
| `--aisp-full` | Mark unit as AISP-full mode (for naming) | false |
| `--succinct-reasoning` | Request shorter responses | false |
| `--no-dual-unit` | Create only single unit (default: creates BOTH standard and -2x) | false (dual enabled) |
| `--no-failure-learning` | Disable failure learning (anti-patterns & reasoning corrections) | false (enabled) |
| `--preserve-experiences` | Keep original experiences after absorbing (for multi-algorithm workflows) | false |
| `--output <file>` | Save report to file | - |
| `--debug` | Show detailed debug output | false |

**Auto-generated Learning Unit Names:**
When `--learning-unit` is not specified, a unique name is generated:
- Format: `{profile}_{AISP|AISP-lite|AISP-full}_{2x}_{YYYYMMDD}_{XX}`
- Examples:
  - `qwen3-coder_20260112` (basic)
  - `qwen3-coder_AISP_20260112` (with --aisp)
  - `qwen3-coder_AISP-lite_20260112` (with --aisp-lite)
  - `qwen3-coder_AISP-full_2x_20260112` (with --aisp-full --double-strategies)
  - `qwen3-coder_20260112_01` (increment if exists)

**Examples:**
```bash
# Auto-generated name - creates qwen3-coder_20260112 AND qwen3-coder_20260112-2x
machine-dream llm dream run --profile qwen3-coder

# With AISP marker - creates qwen3-coder_AISP_20260112 AND qwen3-coder_AISP_20260112-2x
machine-dream llm dream run --profile qwen3-coder --aisp

# Explicit learning unit name
machine-dream llm dream run --profile qwen3-coder --learning-unit my-training

# Single unit mode (disable dual)
machine-dream llm dream run --profile qwen3-coder --learning-unit training --no-dual-unit

# Re-run consolidation on existing unit with different algorithm
machine-dream llm dream run --rerun my-training --algorithm llm-cluster-v1 --debug

# Disable failure learning (skip anti-patterns and reasoning corrections)
machine-dream llm dream run --profile qwen3-coder --no-failure-learning
```

**Failure Learning:**
By default, consolidation includes failure learning which generates:
- **Anti-patterns**: Synthesized from clustered invalid moves, describing what NOT to do
- **Reasoning corrections**: Analysis of valid-but-wrong moves, explaining flawed reasoning

Use `--no-failure-learning` to disable this if you want faster consolidation without failure analysis.

#### llm dream show

```bash
machine-dream llm dream show [options]
```

Show dream storage contents.

#### llm dream status

```bash
machine-dream llm dream status [options]
```

Show consolidation status.

### llm stats

Usage statistics.

```bash
machine-dream llm stats [options]
```

Show LLM usage statistics.

### llm benchmark

LLM performance benchmarks.

```bash
machine-dream llm benchmark <suite> [options]
```

Run LLM benchmark suite.

---

## Batch Scripts

Located in `scripts/` directory:

### ab-test-learning.sh

A/B testing: learning vs no learning.

```bash
./scripts/ab-test-learning.sh [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--profile <name>` | LLM profile | qwen3-coder |
| `--puzzle <path>` | Puzzle file | puzzles/4x4-expert.json |
| `--runs <n>` | Runs per phase | 10 |
| `--learning-unit <id>` | Learning unit | "default" |
| `--stream` | Show live gameplay | false |
| `--skip-dream` | Skip dream cycle | false |
| `--reasoning-template` | Use structured format | false |
| `--anonymous-patterns` | Use anonymous patterns | false |
| `--debug` | Show full prompts | false |
| `--aisp` | Use AISP mode | false |
| `--aisp-full` | Use full AISP mode | false |
| `--save-reasoning` | Store full reasoning | false |

### iterative-learning.sh

Iterative learning with batch consolidation.

```bash
./scripts/iterative-learning.sh [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--profile <name>` | LLM profile | qwen3-coder |
| `--puzzle <path>` | Puzzle file | puzzles/4x4-expert.json |
| `--batch-size <n>` | Plays before dreaming | 1 |
| `--total-plays <n>` | Total plays | 10 |
| `--learning-unit <id>` | Learning unit | auto-generated |
| `--stream` | Show live gameplay | false |
| `--reasoning-template` | Use structured format | false |
| `--anonymous-patterns` | Use anonymous patterns | false |
| `--debug` | Show full prompts | false |
| `--aisp` | Use AISP mode | false |
| `--aisp-full` | Use full AISP mode | false |
| `--save-reasoning` | Store full reasoning | false |

### training-run.sh

Training runs with optional dreaming.

```bash
./scripts/training-run.sh --puzzle <path> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--profile <name>` | LLM profile | qwen3-coder |
| `--puzzle <path>` | Puzzle file (required) | - |
| `--runs <n>` | Number of runs | 10 |
| `--learning-unit <id>` | Learning unit | "default" |
| `--max-moves <n>` | Max moves per puzzle | 200 |
| `--stream` | Show live gameplay | false |
| `--dream-after` | Dream after all runs | false |
| `--reasoning-template` | Use structured format | false |
| `--anonymous-patterns` | Use anonymous patterns | false |
| `--debug` | Show full prompts | false |
| `--aisp` | Use AISP mode | false |
| `--aisp-full` | Use full AISP mode | false |
| `--save-reasoning` | Store full reasoning | false |

### comprehensive-test-suite.sh

Run comprehensive tests across all profiles and modes.

```bash
./scripts/comprehensive-test-suite.sh [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--runs <n>` | Runs per mode | 3 |
| `--puzzle <path>` | Puzzle file | puzzles/9x9-easy.json |
| `--dual` | Enable dual mode | false |
| `--save-reasoning` | Store full reasoning | false |
| `--skip-dream` | Skip consolidation | false |
| `--profiles <list>` | Comma-separated profiles | all |

### abx-test.sh

A/B/X multi-model comparison.

```bash
./scripts/abx-test.sh <config.json>
```

Config file format:
```json
{
  "testName": "Test description",
  "runsPerConfig": 5,
  "puzzles": ["puzzles/9x9-easy.json"],
  "configurations": [
    {
      "name": "config-name",
      "profile": "profile-name",
      "learningUnit": "unit-name",
      "options": ["--aisp", "--anonymous-patterns"]
    }
  ]
}
```

### run-full-test-pipeline.sh

Master test runner: comprehensive suite + A/B/X comparison.

```bash
./scripts/run-full-test-pipeline.sh [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--runs <n>` | Training runs per mode | 3 |
| `--puzzle <path>` | Training puzzle | puzzles/9x9-easy.json |
| `--abx-runs <n>` | A/B/X comparison runs | 5 |
| `--abx-puzzle <path>` | Comparison puzzle | same as training |
| `--dual` | Enable dual unit generation | false |
| `--save-reasoning` | Store full reasoning | false |
| `--skip-training` | Skip training phase | false |
| `--skip-abx` | Skip A/B/X phase | false |
| `--profiles <list>` | Comma-separated profiles | all |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_BASE_URL` | LLM API endpoint | http://localhost:1234/v1 |
| `LLM_MODEL` | Model name | qwen3-30b |
| `LLM_TEMPERATURE` | Generation temperature | 0.6 |
| `LLM_MAX_TOKENS` | Max response tokens | 2048 |
| `LLM_TIMEOUT` | Request timeout (ms) | 300000 |
| `LLM_MEMORY_ENABLED` | Enable memory | true |
| `LLM_MAX_HISTORY_MOVES` | Move history limit | 20 |
| `LLM_INCLUDE_REASONING` | Include reasoning in history | false |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Configuration error |
| 4 | Network/connection error |
| 5 | LLM error |

---

## Test Environment: WSL + LM Studio

Machine Dream is developed and tested in a WSL (Windows Subsystem for Linux) environment with LM Studio running on the Windows host machine.

### Automatic Model Management

The `llm play` command includes automatic model loading functionality that:

1. Checks if the required model (from profile config) is loaded in LM Studio
2. If not loaded, automatically unloads current models and loads the required one
3. Waits for the model to initialize before starting play

**Current Limitation:** This automatic model management feature is currently only supported in the WSL + Windows LM Studio configuration. It requires the `lms` CLI to be accessible from WSL.

### Setting Up lms CLI Access in WSL

The LM Studio CLI (`lms`) runs on Windows. To access it from WSL:

**Option 1: Create an alias (recommended)**

Add to your `~/.bashrc` or `~/.bash_aliases`:

```bash
alias lms='/mnt/c/Users/<YourUsername>/.lmstudio/bin/lms.exe'
```

**Option 2: Add to PATH**

```bash
export PATH="$PATH:/mnt/c/Users/<YourUsername>/.lmstudio/bin"
```

**Option 3: Create a wrapper script**

```bash
#!/bin/bash
# Save as ~/bin/lms and chmod +x
/mnt/c/Users/<YourUsername>/.lmstudio/bin/lms.exe "$@"
```

### How Machine Dream Finds lms

When auto-loading models, Machine Dream searches for the `lms` executable in this order:

1. `lms` - Direct execution (if in PATH)
2. `lms.exe` - Windows executable accessible from WSL
3. `~/.lmstudio/bin/lms` - Common Linux installation path
4. `~/.lmstudio/bin/lms.exe` - WSL path to Windows installation
5. `/mnt/c/Users/*/AppData/Local/LM-Studio/lms.exe` - Default Windows install location
6. Extracts path from alias definition in `~/.bashrc` or `~/.bash_aliases`

### Manual Model Management

If automatic loading fails or you prefer manual control:

```bash
# List available models
lms ls

# Load a specific model
lms load "model-name"

# Unload all models
lms unload --all

# Check loaded models
lms ps
```

### Troubleshooting

**"lms: not found"** - The lms CLI isn't accessible. Set up an alias or add to PATH (see above).

**Process stops/freezes during load** - This was a known issue with interactive bash shells. Ensure you're using the latest version of machine-dream which uses non-interactive shell execution.

**Model loads but play fails** - Check that LM Studio is accessible from WSL:
```bash
curl http://localhost:1234/v1/models
```
