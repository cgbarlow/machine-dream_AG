# 🎮 Machine Dream POC - User Guide

Welcome to the **Machine Dream** Proof-of-Concept! This system demonstrates "Continuous Machine Thinking" by autonomously solving Sudoku puzzles (`Day Cycle`) and consolidating its learnings into long-term memory (`Night Cycle`).

This guide will help you install, configure, and run the system.

---

## ⚡ Quick Start

### Prerequisites
-   **Node.js**: v20 or higher.
-   **npm**: Installed with Node.

### 1. Installation
Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd machine-dream_AG
npm install
```

### 2. Run the Demo
The quickest way to see the system in action is the "Smoke Test" demo. This runs a single puzzle session followed by a dreaming cycle.

```bash
npm run dev
# OR
npx tsx src/index.ts
```

**What you will see:**
1.  **Orchestrator Init**: System boots up and initializes the Local AgentDB (SQLite).
2.  **Day Cycle**: The Agent generates a Sudoku puzzle and solves it step-by-step using the **GRASP** loop.
    -   You'll see logs of strategies like `naked-single` or `guess`.
3.  **Night Cycle**: After solving, the system enters "Dreaming Mode" to consolidate experiences.
    -   It distills patterns and clears short-term buffers.

---

## 🛠️ CLI Commands

The system is controlled via the `src/index.ts` entry point.

### Running Benchmarks
To test the system's performance across multiple puzzles:

```bash
# Run the default benchmark suite
npx tsx src/index.ts benchmark

# Example Output:
# 🧪 Benchmark Suite: Running...
# ...
# 📊 Benchmark Report:
# Total Tests: 1
# Success Rate: 100%
# Avg Solve Time: 12ms
```

### Running Tests
To verify the system's integrity and spec compliance:

```bash
# Run all unit and integration tests
npm test

# Run only integration tests
npm run test:integration
```

---

## ⚙️ Configuration

The system uses a default configuration defined in `src/orchestration/SystemOrchestrator.ts`. You can modify `src/types.ts` `OrchestratorConfig` defaults or pass overrides if you extend the entry point.

**Key Config Options:**
-   `dbPath`: Location of the SQLite database (default: `.agentdb`).
-   `maxIterations`: Safety limit for the GRASP loop to prevent infinite loops.
-   `dreamingSchedule`: When to run the night cycle (default: `after-session`).

---

## 🧠 Understanding the Output

### Day Cycle (GRASP)
-   **Generate**: The agent looks for valid moves.
-   **Strategy**: It labels *why* it picked a move (e.g., `naked-single` is a logical deduction, `guess` is a search step).
-   **Outcome**: `success` means the move was valid; `failure` means it violated a constraint.

### Night Cycle (Dreaming)
-   **Capture**: Counts how many moves were made.
-   **Distill**: Identifies strategies that had a high success rate.
-   **Persist**: Saves these "Skills" to the SQLite `strategies` table for future use.

---

## 📂 Data persistence

All learning is stored locally in `.agentdb/agent.db`.
You can inspect this using any SQLite viewer:

```sql
SELECT * FROM moves LIMIT 10;
SELECT * FROM strategies WHERE outcome = 'success';
```

---

## ❓ Troubleshooting

**"AgentDB unavailable"**
-   The system uses a **Local AgentDB** implementation (`src/agentdb/LocalAgentDB.ts`) that runs on SQLite. No external API keys or cloud connections are required.

**"Constraint violation" during solve**
-   This is normal! The agent may make a wrong guess (`guess` strategy). The `Reflexion` system catches this, logs the error, and the agent backtracks or tries a different number in the next GRASP iteration.
