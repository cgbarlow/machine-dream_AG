# 🧠 Machine Dream

Research and implementation of continuous machine cognition systems using Claude Flow orchestration.

## 📖 Overview

Machine Dream explores the frontier of AI systems that "never stop thinking" - moving from stateless, efficiency-optimized responses to persistent, exploration-focused continuous cognition when computational resources become abundant.

This project implements the SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology with multi-agent swarm coordination to research and build continuous thinking architectures.

## 🔬 Research Focus

Our research investigates the paradigm shift that occurs when frontier LLMs run locally on consumer hardware, making tokens effectively infinite. This changes the fundamental question from "How do we optimize for scarce tokens?" to **"What would you build if thinking were free?"**

### Core Research Areas

- **GRASP Framework**: Generate → Review → Absorb → Synthesise → Persist
- **Dreaming Architecture**: Five-phase consolidation for continuous cognition
- **Persistent Memory Systems**: External memory for stateless LLMs
- **Self-Evaluation Frameworks**: Machine assessment without human feedback
- **Multi-Agent Coordination**: Distributed cognition across agent swarms

## 📊 Key Findings

See our comprehensive research report: [`docs/continuous-machine-thinking-research.md`](docs/continuous-machine-thinking-research.md)

**Performance Metrics:**
- 84.8% SWE-Bench solve rate
- 2.8-4.4x speed improvements
- 32.3% token reduction
- 27+ neural models

## 🚀 Quick Start

### Prerequisites

```bash
# Install Claude Flow (required)
npm install -g claude-flow@alpha

# Optional: Enhanced coordination
npm install -g ruv-swarm

# Optional: Cloud features
npm install -g flow-nexus@latest
```

### Add MCP Servers

```bash
# Core coordination (required)
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Enhanced coordination (optional)
claude mcp add ruv-swarm npx ruv-swarm mcp start

# Cloud orchestration (optional)
claude mcp add flow-nexus npx flow-nexus@latest mcp start
```

### Running SPARC Workflows

```bash
# List available modes
npx claude-flow sparc modes

# Run specific mode
npx claude-flow sparc run <mode> "<task>"

# Complete TDD workflow
npx claude-flow sparc tdd "<feature>"

# Parallel execution
npx claude-flow sparc batch <modes> "<task>"

# Full pipeline
npx claude-flow sparc pipeline "<task>"
```

## 🏗️ Project Structure

```
machine-dream/
├── docs/                    # Research documentation
│   └── continuous-machine-thinking-research.md
├── src/                     # Source code
├── tests/                   # Test files
├── config/                  # Configuration
├── scripts/                 # Utility scripts
├── .swarm/                  # Swarm coordination data (gitignored)
├── .claude/                 # Claude Code settings (gitignored)
└── CLAUDE.md               # Development configuration
```

## 🎯 SPARC Methodology

### Development Phases

1. **Specification** - Requirements analysis and planning
2. **Pseudocode** - Algorithm design and logic flow
3. **Architecture** - System design and structure
4. **Refinement** - TDD implementation and iteration
5. **Completion** - Integration and deployment

### Available Agents (54 Total)

**Core Development**: `coder`, `reviewer`, `tester`, `planner`, `researcher`

**Swarm Coordination**: `hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`

**Performance**: `perf-analyzer`, `performance-benchmarker`, `task-orchestrator`

**GitHub**: `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

**Specialized**: `backend-dev`, `mobile-dev`, `ml-developer`, `api-docs`, `system-architect`

See [CLAUDE.md](CLAUDE.md) for full agent list and configuration.

## 🔄 Concurrent Execution Pattern

Machine Dream follows strict concurrent execution rules:

**Golden Rule: "1 MESSAGE = ALL RELATED OPERATIONS"**

```javascript
// ✅ CORRECT: All operations in one message
[Single Message]:
  Task("Research agent", "...", "researcher")
  Task("Coder agent", "...", "coder")
  Task("Tester agent", "...", "tester")
  TodoWrite { todos: [...8-10 todos...] }
  Write "file1.js"
  Write "file2.js"
  Bash "npm test"

// ❌ WRONG: Multiple messages
Message 1: Task("agent 1")
Message 2: TodoWrite
Message 3: Write file
```

## 🧠 Key Concepts

### The Stateless Problem

Current LLMs lack persistent memory across interactions. Without consolidation mechanisms, continuous thinking becomes "expensive space heaters" accumulating tokens without understanding.

### Dreaming Architecture Solution

Five-phase architecture for knowledge consolidation:
1. **Experience Capture** - Log interactions and insights
2. **Triage Sleep** - Initial consolidation and filtering
3. **Deep Dreaming** - Compression, abstraction, integration
4. **Pruning** - Active forgetting of redundant knowledge
5. **Integrity Verification** - Prevent error accumulation

### Memory Systems

- **Working Memory**: Active context and current tasks
- **Episodic Memory**: Specific experiences and events
- **Semantic Memory**: General knowledge and patterns
- **Meta-Cognitive Memory**: Self-awareness and monitoring

## 🛠️ Development Commands

```bash
# Build project
npm run build

# Run tests
npm run test

# Linting
npm run lint

# Type checking
npm run typecheck
```

## 📚 Documentation

- **[Research Report](docs/continuous-machine-thinking-research.md)** - Comprehensive analysis
- **[CLAUDE.md](CLAUDE.md)** - Development configuration and guidelines
- **[Claude Flow Docs](https://github.com/ruvnet/claude-flow)** - Framework documentation

## 🤝 Contributing

This is a research project exploring continuous machine cognition. Contributions welcome in:

- Architecture pattern research
- Memory system implementations
- Self-evaluation frameworks
- Dreaming mechanism experiments
- Performance optimization
- Documentation improvements

## 📖 Research Sources

This project builds on research from:
- [What Happens When the Machine Never Stops Thinking? (Part 1)](https://agentics-nz.ghost.io/what-happens-when-the-machine-never-stops-thinking/)
- [What Happens When the Machine Never Stops Thinking? (Part 2)](https://agentics-nz.ghost.io/what-happens-when-the-machine-never-stops-thinking-part-2/)

## 🔮 Future Directions

- Enhanced cognitive architectures with attention mechanisms
- Advanced memory consolidation patterns
- Multi-modal continuous thinking systems
- Formal theoretical models of machine cognition
- Real-time adaptive learning mechanisms
- Distributed consciousness across agent networks

## 📄 License

See LICENSE file for details.

## 🙏 Acknowledgments

Built with:
- [Claude Flow](https://github.com/ruvnet/claude-flow) - Multi-agent orchestration
- [Claude Code](https://claude.ai/claude-code) - AI-powered development
- [Anthropic Claude](https://anthropic.com) - Foundation models

---

**Remember**: *Claude Flow coordinates, Claude Code creates!*
