# 🧠 Machine Dream (Research POC)

**Continuous Machine Cognition & AgentDB Integration**

> [!NOTE]
> **Research Preview**: This repository is a Proof-of-Concept and Reference Implementation. It contains core type definitions and extensive research documentation but is not yet a fully functional CLI application.

## 📖 Overview

Machine Dream explores the frontier of AI systems that "never stop thinking." It investigates the paradigm shift that occurs when frontier LLMs run locally or with abundant resources, moving from stateless, request-response interactions to persistent, exploration-focused continuous cognition.

This project implements the **SPARC** (Specification, Pseudocode, Architecture, Refinement, Completion) methodology and the **GRASP** cognitive loop, utilizing **AgentDB** as the foundational memory and coordination layer.

## 🔬 Research Focus

The core question driving this research is: **"What would you build if thinking were free?"**

### Core Concepts

*   **AgentDB Integration**: We have standardized on `agentdb` for all memory operations, leveraging its specialized cognitive banks:
    *   **ReasoningBank**: For storing and retrieving successful problem-solving patterns.
    *   **ReflexionMemory**: For episodic replay and self-critique.
    *   **SkillLibrary**: For consolidating repeated successes into reusable skills.
*   **GRASP Framework**: A cognitive loop consisting of **G**enerate, **R**eview, **A**bsorb, **S**ynthesize, and **P**ersist.
*   **Dreaming Architecture**: A five-phase consolidation process (Capture, Triage, Deep Dreaming, Pruning, Verification) to manage memory and prevent cognitive decay.

## 📂 Project Structure

This repository serves as a reference for the data structures and architectural patterns required for continuous cognition.

```
machine-dream/
├── docs/                    # 📚 Comprehensive Research Documentation
│   ├── continuous-machine-thinking-research.md  # Main Research Report
│   ├── poc-strategy-report.md                   # Strategy & Implementation details
│   ├── agentdb-analysis.md                      # Memory system analysis
│   └── ...
├── src/
│   └── types.ts             # 🏗️ Core Type Definitions & Architecture Specs
└── README.md
```

## 📚 Key Documentation

| Document | Description |
| :--- | :--- |
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
