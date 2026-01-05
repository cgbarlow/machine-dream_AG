# 🎮 Machine Dream POC - User Guide

Welcome to the **Machine Dream** Proof-of-Concept! This system demonstrates "Continuous Machine Thinking" by autonomously solving Sudoku puzzles (`Day Cycle`) and consolidating its learnings into long-term memory (`Night Cycle`).

This guide will help you install, configure, and run the system using either the **Command-Line Interface (CLI)** or the new **Terminal User Interface (TUI)**.

---

## ⚡ Quick Start

### Prerequisites
- **Node.js**: v20 or higher.
- **npm**: Installed with Node.

### 1. Installation
Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd machine-dream_AG
npm install
```

### 2. Choose Your Interface

#### 🐳 CLI (Command-Line Interface)
Perfect for scripting, automation, and advanced users:

```bash
# Run the demo
npm run dev
# OR
npx tsx src/index.ts
```

#### 🎯 TUI (Terminal User Interface)
Great for interactive exploration and visual feedback:

```bash
# Launch the TUI
npx tsx src/tui/tui-bin.ts
# OR after building
npm run build:cli
node dist/tui-bin.js
```

**What you will see in both interfaces:**
1. **Orchestrator Init**: System boots up and initializes the Local AgentDB (SQLite).
2. **Day Cycle**: The Agent generates a Sudoku puzzle and solves it step-by-step using the **GRASP** loop.
   - You'll see logs of strategies like `naked-single` or `guess`.
3. **Night Cycle**: After solving, the system enters "Dreaming Mode" to consolidate experiences.
   - It distills patterns and clears short-term buffers.

---

## 🎮 Interface Comparison

| Feature | CLI | TUI |
|---------|-----|-----|
| **Best For** | Scripting, Automation, CI/CD | Interactive Use, Exploration |
| **Learning Curve** | Requires command knowledge | Intuitive menus and forms |
| **Navigation** | Command-line arguments | Keyboard + Mouse navigation |
| **Visualization** | Text-based output | Rich visualizations and dashboards |
| **Help System** | `--help` flags | Context-sensitive help (F1) |
| **Command Discovery** | Documentation | Command palette (Ctrl+P) |
| **Error Handling** | Text errors | Interactive error dialogs |

**Recommendation**: Use CLI for automation and TUI for interactive exploration and learning.

---

## 🛠️ CLI Commands

The system provides a comprehensive CLI for advanced users and automation.

### Basic Usage
```bash
machine-dream <command> [subcommand] [options]
```

### Available Commands

#### Solve Puzzles
```bash
# Basic solve
machine-dream solve puzzles/easy-01.json

# Advanced solve with AgentDB + RL
machine-dream solve puzzles/hard-01.json \
  --memory-system agentdb \
  --enable-rl \
  --enable-reflexion \
  --max-iterations 100

# Demo mode with visualization
machine-dream solve puzzles/demo.json \
  --demo-mode \
  --visualize \
  --pause-on-insight
```

#### Memory Operations
```bash
# Store data in memory
machine-dream memory store "test-key" "test-value"

# Search memory patterns
machine-dream memory search "naked-single"

# Consolidate memory
machine-dream memory consolidate --compression-ratio 10
```

#### Dreaming & Consolidation
```bash
# Run dream cycle
machine-dream dream run --visualize

# Check dream status
machine-dream dream status --last 5
```

#### Benchmarking
```bash
# Run quick benchmark
machine-dream benchmark run quick

# Full benchmark suite
machine-dream benchmark run full --parallel 4
```

#### System Utilities
```bash
# System status
machine-dream system status --verbose

# Initialize system
machine-dream system init

# Cleanup
machine-dream system cleanup --all
```

### Global Options
```bash
--config <file>              # Custom configuration file
--log-level <level>          # debug|info|warn|error
--output-format <format>     # json|table|yaml
--quiet                      # Suppress non-essential output
--verbose                    # Show detailed output
--no-color                   # Disable colored output
--help, -h                   # Show help for command
--version, -v                # Show version information
```

---

## 🎯 Terminal User Interface (TUI)

> **⚠️ TUI Under Reconstruction**
> The TUI is currently being rebuilt with enhanced testability, improved text alignment, and component-based architecture.
> See [TUI Specification](specs/10-terminal-menu-interface-spec.md) for details on the new architecture.
> **Expected completion**: TBD

The TUI will provide an intuitive, menu-driven interface to all Machine Dream functionality.

### Launching the TUI (Coming Soon)

The `machine-dream tui` command is currently disabled during the rebuild. Running it will show:

```bash
machine-dream tui
# ⚠️  TUI is currently being rebuilt with enhanced testability and architecture.
# 📖 See docs/specs/10-terminal-menu-interface-spec.md for details.
# 🔜 TUI will be available again soon with improved features.
```

Once the rebuild is complete, you'll be able to launch it with:
```bash
# Quick launch
machine-dream tui

# With options
machine-dream tui --theme light --no-mouse --debug-output /tmp/tui-events.jsonl
```

### TUI Navigation

#### Keyboard Shortcuts

**Global Shortcuts:**
- `F1` - Help (context-sensitive)
- `F10` - Toggle menu
- `Ctrl+C` - Exit application
- `Ctrl+P` - Open command palette
- `Ctrl+R` - Refresh current view
- `Ctrl+S` - Save current state

**Navigation:**
- `↑↓` - Navigate menu items / table rows
- `←→` - Navigate menu hierarchy / table columns
- `Tab` - Next field / Next section
- `Shift+Tab` - Previous field / Previous section
- `Enter` - Select / Submit / Execute
- `Esc` - Cancel / Go back / Close modal

**Menu Shortcuts:**
- `S` - Solve Puzzle
- `M` - Memory Browser
- `D` - Dream Cycle
- `B` - Benchmark
- `O` - Demo
- `C` - Config
- `E` - Export
- `Y` - System Utilities
- `H` - Help
- `Q` - Quit

### TUI Screens

#### 🏠 Home Dashboard
Displays system status, recent activity, quick actions, and performance metrics.

#### 🧩 Solve Puzzle Form
Interactive form with all solving options:
- Puzzle file selection
- Memory system configuration
- Solving parameters (iterations, time limits)
- Strategy selection (checkboxes)
- Output options (visualization, export)

#### 🧠 Memory Browser
Browse and manage learned patterns, skills, and experiences:
- Search and filter functionality
- Detailed pattern information
- Store, retrieve, delete operations
- Export and backup options

#### 💭 Dream Controls
Manage the dreaming/consolidation process:
- Run dream cycles with phase selection
- Configure dream scheduling
- View dream status and metrics
- Visualize consolidation process

#### 📊 Benchmark Suite
Run and analyze performance benchmarks:
- Select benchmark suites
- Configure parameters
- View results and comparisons
- Generate reports

#### 🎬 Demo Center
Run pre-configured demonstrations:
- Stakeholder presentation (5 acts)
- Quick solve demonstration
- Transfer learning demo
- Dreaming visualization
- Baseline comparison

#### ⚙️ Configuration
View and edit system settings:
- Memory system configuration
- Solving parameters
- Dreaming settings
- Theme and display options

#### 📤 Export Center
Export system data and results:
- Metrics and performance data
- Solving results and trajectories
- Memory patterns and knowledge
- Configuration settings

#### 🔧 System Dashboard
Monitor and manage system health:
- Real-time system status
- Database health monitoring
- Cleanup and maintenance
- Migration tools

### TUI Themes

The TUI supports multiple themes for different preferences:

```bash
# Dark theme (default)
machine-dream tui --theme dark

# Light theme
machine-dream tui --theme light

# Auto theme (matches system preference)
machine-dream tui --theme auto
```

**Theme Features:**
- Dark theme: Ideal for low-light environments
- Light theme: Better for bright environments
- High contrast mode: Accessibility-friendly
- Customizable colors and styles

---

## ⚙️ Configuration

Both CLI and TUI use the same configuration system.

### Configuration File
The system uses `.poc-config.json` for persistent configuration:

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
    "strategies": ["naked-single", "hidden-single", "pointing-pairs"]
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

**CLI:**
```bash
# Show current configuration
machine-dream config show

# Set configuration value
machine-dream config set memorySystem agentdb

# Export configuration
machine-dream config export my-config.json
```

**TUI:**
- Navigate to ⚙️ Configuration menu
- Use interactive forms to edit settings
- Changes apply immediately

### Environment Variables
All configuration can be set via environment variables:

```bash
MACHINE_DREAM_MEMORY_SYSTEM=agentdb
MACHINE_DREAM_ENABLE_RL=true
MACHINE_DREAM_MAX_ITERATIONS=100
machine-dream solve puzzles/test.json
```

---

## 🧠 Understanding the Output

### Day Cycle (GRASP)
- **Generate**: The agent looks for valid moves.
- **Strategy**: It labels *why* it picked a move (e.g., `naked-single` is a logical deduction, `guess` is a search step).
- **Outcome**: `success` means the move was valid; `failure` means it violated a constraint.

### Night Cycle (Dreaming)
- **Capture**: Counts how many moves were made.
- **Distill**: Identifies strategies that had a high success rate.
- **Persist**: Saves these "Skills" to the SQLite `strategies` table for future use.

### TUI Visualizations
The TUI provides enhanced visualizations:
- **Live Solving**: Real-time puzzle grid updates
- **Strategy Timeline**: Visual history of strategies used
- **Progress Bars**: Visual indicators of completion
- **Performance Metrics**: Graphical representations of metrics

---

## 📂 Data Persistence

All learning is stored locally in `.agentdb/agent.db`.

### Database Location
- **Default**: `.agentdb/agent.db` (SQLite database)
- **Backup**: Can be exported and restored via TUI or CLI

### Inspecting Data

**CLI:**
```bash
# Export all data
machine-dream export all --format json

# Export specific sessions
machine-dream export results --sessions session-001,session-002
```

**TUI:**
- Navigate to 📤 Export menu
- Select data types and format
- Choose export destination

**SQLite Direct Access:**
```sql
SELECT * FROM moves LIMIT 10;
SELECT * FROM strategies WHERE outcome = 'success';
SELECT * FROM sessions ORDER BY timestamp DESC;
```

---

## 🎮 Interface Recommendations

### When to Use CLI
✅ **Automation and scripting**
✅ **CI/CD pipelines**
✅ **Batch processing**
✅ **Remote execution (SSH)**
✅ **Advanced users familiar with commands**

### When to Use TUI
✅ **Interactive exploration**
✅ **Learning the system**
✅ **Visual feedback and monitoring**
✅ **Presentations and demos**
✅ **Users new to the system**

### Hybrid Approach
Many users find a hybrid approach works best:
- Use **TUI** for interactive exploration and learning
- Use **CLI** for automation and scripting once familiar
- Both interfaces share the same configuration and data

---

## ❓ Troubleshooting

### Common Issues

**"AgentDB unavailable"**
- The system uses a **Local AgentDB** implementation that runs on SQLite. No external API keys or cloud connections are required.
- Solution: Run `machine-dream system init` or check file permissions on `.agentdb/`

**"Constraint violation" during solve**
- This is normal! The agent may make a wrong guess (`guess` strategy). The `Reflexion` system catches this, logs the error, and the agent backtracks or tries a different number in the next GRASP iteration.

**TUI not launching**
- Ensure Node.js 20+ is installed
- Check terminal supports UTF-8 and 256 colors
- Try `machine-dream tui --no-mouse` if mouse support causes issues

**CLI command not found**
- Make sure you're in the project directory
- Use `npx tsx src/index.ts` or `npm run dev`
- After building, use `node dist/cli-bin.js`

### Debugging

**CLI Debug Mode:**
```bash
machine-dream --log-level debug solve puzzles/test.json
MACHINE_DREAM_TRACE=1 machine-dream solve puzzles/test.json
```

**TUI Debug Mode:**
- Launch TUI and navigate to ⚙️ Configuration
- Enable verbose logging in settings
- View detailed logs in the system dashboard

---

## 📚 Learning Resources

### CLI Documentation
- Run `machine-dream --help` for general help
- Run `machine-dream <command> --help` for command-specific help
- See `docs/specs/09-cli-interface-spec.md` for complete CLI specification

### TUI Documentation
- Press `F1` in TUI for context-sensitive help
- Navigate to ℹ️ Help menu for comprehensive documentation
- See `docs/specs/10-terminal-menu-interface-spec.md` for complete TUI specification

### Tutorials

**First-time CLI User:**
1. Start with `machine-dream --help`
2. Try `machine-dream system status`
3. Run a simple solve: `machine-dream solve puzzles/easy-01.json`
4. Explore memory: `machine-dream memory search`

**First-time TUI User:**
1. Launch TUI: `npx tsx src/tui/tui-bin.ts`
2. Press `F1` for help
3. Navigate with arrow keys or mouse
4. Try the 🧩 Solve Puzzle menu
5. Explore the 🧠 Memory Browser

---

## 🎯 Best Practices

### CLI Best Practices
- **Use configuration files** for complex setups
- **Script repetitive tasks** using shell scripts
- **Pipe and redirect** output for logging
- **Use JSON output** for programmatic processing

### TUI Best Practices
- **Use keyboard shortcuts** for efficiency
- **Save configurations** as presets
- **Use command palette** (Ctrl+P) for quick access
- **Enable auto-refresh** for monitoring

### System Best Practices
- **Regular backups** of `.agentdb/` directory
- **Monitor system health** periodically
- **Cleanup old sessions** to maintain performance
- **Update configuration** as your needs evolve

---

## 🚀 Advanced Usage

### CLI Automation
```bash
# Batch solve all puzzles
for puzzle in puzzles/*.json; do
  machine-dream solve "$puzzle" --output "results/$(basename "$puzzle")"
done

# Scheduled dreaming
cron: "0 3 * * * cd /path/to/project && machine-dream dream run"
```

### TUI Automation
While TUI is primarily interactive, you can:
- Use TUI to **create configuration presets**
- **Export configurations** and use them in CLI scripts
- **Monitor long-running processes** in TUI while running CLI commands

### Hybrid Workflow
1. **Explore** in TUI to understand available commands
2. **Configure** settings in TUI for your workflow
3. **Export** configuration for CLI use
4. **Automate** with CLI scripts
5. **Monitor** results in TUI

---

## 📞 Support

### Getting Help
- **CLI**: `machine-dream --help` or `machine-dream <command> --help`
- **TUI**: Press `F1` anywhere for context-sensitive help
- **Documentation**: See `docs/` directory for detailed specifications

### Reporting Issues
When reporting issues, please include:
- Interface used (CLI or TUI)
- Command or action performed
- Expected behavior
- Actual behavior
- Error messages (if any)
- System information (Node.js version, OS)

---

## 🎉 Conclusion

The Machine Dream system provides two powerful interfaces for interacting with its cognitive puzzle-solving capabilities:

- **CLI**: Perfect for automation, scripting, and advanced users
- **TUI**: Ideal for interactive exploration, learning, and visualization

Both interfaces share the same underlying functionality, configuration, and data, allowing you to choose the right tool for each task. Whether you prefer the precision of command-line control or the intuitive exploration of a graphical interface, Machine Dream has you covered.

**Happy solving! 🧩**