# Integration & Orchestration Specification

**Component:** Integration & Orchestration
**Version:** 1.0.0
**Date:** January 4, 2026
**Status:** Draft

---

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| [ADR-007: Event-Driven Integration](../adr/007-event-driven-integration.md) | Authorizes this spec |

---

## 1. Component Overview

### 1.1 Purpose and Responsibilities

The Integration & Orchestration system serves as the **central nervous system** of the Cognitive Puzzle Solver POC, coordinating the lifecycle and communication between all major components:

- **Puzzle Engine** (domain logic)
- **Memory System** (ReasoningBank/AgentDB)
- **GRASP Loop** (cognitive cycle)
- **Attention Mechanism** (focus selection)
- **Dreaming Pipeline** (consolidation)
- **Benchmarking Framework** (evaluation)

**Primary Responsibilities:**

1. **Lifecycle Management**: Initialize, configure, and shutdown all components in correct order
2. **Event Coordination**: Route events between components via event bus pattern
3. **Configuration Management**: Centralized POCConfig handling and validation
4. **Error Handling**: Graceful degradation, retry logic, and comprehensive error reporting
5. **Logging & Monitoring**: Unified observability across all subsystems
6. **Cycle Orchestration**: Coordinate Day (solving) vs Night (dreaming) cycles
7. **CLI Interface**: Provide stakeholder-facing commands for POC execution
8. **Demo Execution**: Scripted demonstration flow for presentations

### 1.2 Position in Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI INTERFACE                           │
│              (stakeholder presentation layer)               │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│           INTEGRATION & ORCHESTRATION (THIS SPEC)           │
│  ┌───────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Lifecycle │  │  Event   │  │  Config  │  │   Error   │  │
│  │  Manager  │  │   Bus    │  │ Manager  │  │  Handler  │  │
│  └───────────┘  └──────────┘  └──────────┘  └───────────┘  │
│  ┌───────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  Logging  │  │   Cycle  │  │   Demo   │                 │
│  │  System   │  │Scheduler │  │  Script  │                 │
│  └───────────┘  └──────────┘  └──────────┘                 │
└─────────────────┬───────────────────────────────────────────┘
                  │ Events, configs, commands
┌─────────────────▼───────────────────────────────────────────┐
│                    COMPONENT LAYER                          │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐    │
│  │  Puzzle  │ │  Memory  │ │  GRASP  │ │  Attention   │    │
│  │  Engine  │ │  System  │ │  Loop   │ │  Mechanism   │    │
│  └──────────┘ └──────────┘ └─────────┘ └──────────────┘    │
│  ┌──────────┐ ┌──────────┐                                 │
│  │ Dreaming │ │Benchmark │                                 │
│  │ Pipeline │ │Framework │                                 │
│  └──────────┘ └──────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Dependencies on Other Components

**Hard Dependencies (Required for POC):**
- Puzzle Engine: Provides domain logic for solving
- Memory System: ReasoningBank adapter (minimum) or AgentDB adapter (optional)
- GRASP Loop: Core cognitive cycle implementation
- Attention Mechanism: Focus selection for solving iterations

**Soft Dependencies (Optional but recommended):**
- Dreaming Pipeline: Consolidation for transfer learning demo
- Benchmarking Framework: Metrics collection for stakeholder reporting
- **LLM Sudoku Player (Spec 11)**: Pure LLM-based solving mode for true machine learning demonstration

> **Phase 2 Note**: The LLM Sudoku Player (see [Spec 11](./11-llm-sudoku-player.md)) introduces a pure LLM solving mode where the LLM iteratively plays Sudoku, learns from feedback, and improves through dreaming consolidation. This is orchestrated as an alternative to the deterministic GRASP loop.

**External Dependencies:**
- Claude Flow MCP: Agent coordination and orchestration
- ReasoningBank: Primary memory adapter (fallback guaranteed)
- AgentDB: Optional enhanced memory adapter (Phase 2 evaluation)
- Node.js 20+: Runtime environment
- TypeScript 5+: Type safety

---

## 2. Functional Requirements

### 2.1 Component Lifecycle Management

**FR-2.1.1: Initialization Sequence**

The system SHALL initialize components in the following order to ensure proper dependency resolution:

```typescript
enum InitializationPhase {
  CONFIG_LOAD = 1,      // Load POCConfig from file/env
  CONFIG_VALIDATE = 2,  // Validate configuration
  LOGGING_INIT = 3,     // Setup logging infrastructure
  MEMORY_INIT = 4,      // Initialize ReasoningBank/AgentDB
  PUZZLE_INIT = 5,      // Setup puzzle engine
  GRASP_INIT = 6,       // Initialize GRASP loop
  ATTENTION_INIT = 7,   // Setup attention mechanism
  DREAMING_INIT = 8,    // Initialize dreaming pipeline (if enabled)
  BENCHMARK_INIT = 9,   // Setup benchmarking (if enabled)
  EVENT_BUS_INIT = 10,  // Start event bus
  READY = 11            // System ready for commands
}
```

**Acceptance Criteria:**
- Each phase completes successfully before next phase begins
- Initialization failure at any phase triggers rollback of previous phases
- Initialization state is logged at each phase transition
- Initialization completes in <5 seconds for basic config
- Initialization completes in <30 seconds for full AgentDB setup

**FR-2.1.2: Component Registration**

Components MUST register themselves with the orchestrator during initialization:

```typescript
interface ComponentRegistration {
  componentId: string;
  componentType: ComponentType;
  dependencies: string[]; // Component IDs this depends on
  lifecycle: {
    initialize: () => Promise<void>;
    start: () => Promise<void>;
    stop: () => Promise<void>;
    cleanup: () => Promise<void>;
  };
  health: () => Promise<HealthStatus>;
}
```

**Acceptance Criteria:**
- All components implement registration interface
- Cyclic dependencies are detected and rejected
- Component start order respects dependency graph
- Health checks available for all registered components

**FR-2.1.3: Graceful Shutdown**

System SHALL support graceful shutdown in reverse dependency order:

1. Stop accepting new commands
2. Complete in-flight GRASP iterations
3. Flush pending memory writes
4. Close ReasoningBank/AgentDB connections
5. Export final metrics
6. Cleanup temporary resources

**Acceptance Criteria:**
- No data loss during shutdown
- Shutdown completes in <10 seconds for normal operation
- Forced shutdown (SIGKILL) supported after 30-second timeout
- All file handles and database connections closed

### 2.2 Event Flow Between Components

**FR-2.2.1: Event Bus Architecture**

System SHALL implement a typed event bus for component communication:

```typescript
enum EventType {
  // GRASP Loop Events
  GRASP_ITERATION_START = 'grasp.iteration.start',
  GRASP_ITERATION_COMPLETE = 'grasp.iteration.complete',
  GRASP_MOVE_GENERATED = 'grasp.move.generated',
  GRASP_MOVE_VALIDATED = 'grasp.move.validated',
  GRASP_INSIGHT_DISCOVERED = 'grasp.insight.discovered',

  // LLM Sudoku Player Events (Spec 11)
  LLM_MOVE_PROPOSED = 'llm.move.proposed',
  LLM_MOVE_VALIDATED = 'llm.move.validated',
  LLM_EXPERIENCE_STORED = 'llm.experience.stored',
  LLM_PARSE_FAILURE = 'llm.parse.failure',
  LLM_SESSION_COMPLETE = 'llm.session.complete',

  // Memory Events
  MEMORY_EXPERIENCE_LOGGED = 'memory.experience.logged',
  MEMORY_PATTERN_EXTRACTED = 'memory.pattern.extracted',
  MEMORY_QUERY_PERFORMED = 'memory.query.performed',

  // Attention Events
  ATTENTION_FOCUS_CHANGED = 'attention.focus.changed',
  ATTENTION_REFLECTION_TRIGGERED = 'attention.reflection.triggered',

  // Dreaming Events
  DREAM_CYCLE_START = 'dream.cycle.start',
  DREAM_CYCLE_COMPLETE = 'dream.cycle.complete',
  DREAM_CONSOLIDATION_PROGRESS = 'dream.consolidation.progress',
  DREAM_FEWSHOT_UPDATED = 'dream.fewshot.updated',  // LLM few-shot examples updated

  // System Events
  SYSTEM_ERROR = 'system.error',
  SYSTEM_WARNING = 'system.warning',
  SYSTEM_CONFIG_CHANGED = 'system.config.changed',

  // Benchmark Events
  BENCHMARK_RUN_START = 'benchmark.run.start',
  BENCHMARK_RUN_COMPLETE = 'benchmark.run.complete',
  BENCHMARK_METRIC_RECORDED = 'benchmark.metric.recorded'
}

interface Event<T = any> {
  type: EventType;
  timestamp: number;
  source: string; // Component ID
  payload: T;
  correlationId?: string; // For tracing related events
}

interface EventBus {
  publish<T>(event: Event<T>): void;
  subscribe<T>(eventType: EventType, handler: (event: Event<T>) => void): () => void;
  subscribeOnce<T>(eventType: EventType, handler: (event: Event<T>) => void): () => void;
  clear(): void;
}
```

**Acceptance Criteria:**
- Events published are delivered to all active subscribers
- Event handlers execute asynchronously (non-blocking)
- Failed event handlers don't crash the system
- Event history available for debugging (last 1000 events)
- Correlation IDs enable end-to-end tracing

**FR-2.2.2: Event-Driven Component Communication**

Components SHALL communicate via events, not direct method calls (where possible):

```typescript
// CORRECT: Event-driven
eventBus.publish({
  type: EventType.GRASP_MOVE_VALIDATED,
  timestamp: Date.now(),
  source: 'grasp-loop',
  payload: { move, validationResult }
});

// memorySystem subscribes to this event
eventBus.subscribe(EventType.GRASP_MOVE_VALIDATED, async (event) => {
  await memorySystem.logMove(event.payload.move, event.payload.validationResult);
});
```

**Benefits:**
- Loose coupling between components
- Easy to add/remove components without code changes
- Natural audit trail for debugging
- Enables replay/testing of event sequences

**Acceptance Criteria:**
- 90%+ of component interactions via events
- Critical path operations (GRASP loop) complete in <100ms despite event overhead
- Event queue never exceeds 10,000 pending events

### 2.3 Configuration Management

**FR-2.3.1: POCConfig Schema**

System SHALL support the POCConfig type from `src/types.ts`:

```typescript
export type POCConfig = {
  // Memory System Selection
  memorySystem: 'reasoningbank' | 'agentdb';
  enableRL: boolean;              // AgentDB only
  enableReflexion: boolean;       // AgentDB only
  enableSkillLibrary: boolean;    // AgentDB only

  // Solving Behavior
  maxSolveTime: number;           // milliseconds
  reflectionInterval: number;     // iterations
  dreamingSchedule: 'after-session' | 'periodic' | 'manual';

  // Performance Tuning
  maxIterations?: number;         // Default: 50
  attentionWindowSize?: number;   // Default: 10 moves

  // Benchmarking
  enableBenchmarking?: boolean;   // Default: true
  benchmarkOutputDir?: string;    // Default: ./benchmarks

  // Logging
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logOutputDir?: string;          // Default: ./logs

  // Demo Mode
  demoMode?: boolean;             // Enables stakeholder-friendly output
  demoSpeed?: 'realtime' | 'fast' | 'instant';
};
```

**FR-2.3.2: Configuration Loading**

System SHALL support multiple configuration sources (priority order):

1. **Command-line arguments** (highest priority)
   ```bash
   npx tsx src/cli.ts solve --memory-system agentdb --enable-rl
   ```

2. **Environment variables**
   ```bash
   POC_MEMORY_SYSTEM=agentdb POC_ENABLE_RL=true npx tsx src/cli.ts solve
   ```

3. **Configuration file** (`.poc-config.json`)
   ```json
   {
     "memorySystem": "reasoningbank",
     "maxSolveTime": 300000,
     "dreamingSchedule": "after-session"
   }
   ```

4. **Default values** (lowest priority)

**Acceptance Criteria:**
- Configuration merging preserves priority order
- Invalid configuration rejected with clear error message
- Configuration changes logged at startup
- Configuration can be exported for reproducibility

**FR-2.3.3: Runtime Configuration Updates**

System SHALL support limited runtime configuration changes:

**Allowed during solving:**
- `logLevel` (debugging)
- `reflectionInterval` (tuning)

**NOT allowed during solving:**
- `memorySystem` (requires restart)
- `enableRL` (requires restart)

**Acceptance Criteria:**
- Runtime updates published as `SYSTEM_CONFIG_CHANGED` event
- Components react to configuration changes within 1 iteration
- Invalid runtime updates rejected with warning

### 2.4 Error Handling Strategy

**FR-2.4.1: Error Classification**

System SHALL classify errors into four severity levels:

```typescript
enum ErrorSeverity {
  FATAL = 'fatal',       // Immediate shutdown required
  ERROR = 'error',       // Component failure, retry possible
  WARNING = 'warning',   // Degraded operation, continue
  INFO = 'info'          // Informational, no action needed
}

interface SystemError extends Error {
  severity: ErrorSeverity;
  component: string;
  recoverable: boolean;
  context: Record<string, any>;
  timestamp: number;
}
```

**Error Severity Examples:**

| Severity | Example | System Response |
|----------|---------|-----------------|
| FATAL | Memory database corruption | Immediate shutdown, data export attempt |
| ERROR | GRASP iteration timeout | Skip move, log error, continue next iteration |
| WARNING | Attention mechanism scoring error | Use fallback scoring, log warning |
| INFO | Reflection scheduled | Normal operation, logged for debugging |

**FR-2.4.2: Error Recovery Strategies**

**Strategy 1: Retry with Exponential Backoff**
```typescript
// For transient errors (network, rate limits)
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(baseDelay * Math.pow(2, attempt));
    }
  }
  throw new Error('Retry exhausted');
}
```

**Strategy 2: Circuit Breaker**
```typescript
// For repeatedly failing components
class CircuitBreaker {
  private failureCount = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker open');
    }
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= 5) {
      this.state = 'open';
      setTimeout(() => this.state = 'half-open', 60000);
    }
  }
}
```

**Strategy 3: Graceful Degradation**
```typescript
// Fallback to simpler behavior
class MemorySystemWithFallback {
  async querySimilar(context: PuzzleState): Promise<Experience[]> {
    try {
      return await this.agentDB.querySimilar(context);
    } catch (error) {
      logger.warn('AgentDB query failed, falling back to ReasoningBank');
      return await this.reasoningBank.querySimilar(context);
    }
  }
}
```

**Acceptance Criteria:**
- All external API calls wrapped in retry logic
- Circuit breakers prevent cascade failures
- Degraded operation clearly logged and reported
- System recovers automatically from transient errors

**FR-2.4.3: Error Reporting**

System SHALL provide comprehensive error context:

```typescript
interface ErrorReport {
  error: SystemError;
  stackTrace: string;
  systemState: {
    activeComponents: string[];
    memoryUsage: number;
    currentIteration?: number;
    lastSuccessfulMove?: Move;
  };
  recentEvents: Event[]; // Last 50 events
  configuration: POCConfig;
  timestamp: number;
}
```

**Error reports SHALL be:**
- Written to `./logs/errors/` directory
- Published as `SYSTEM_ERROR` event
- Included in benchmarking reports (if applicable)

### 2.5 Logging and Monitoring

**FR-2.5.1: Structured Logging**

System SHALL use structured JSON logging for machine readability:

```typescript
interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;
  message: string;
  context?: Record<string, any>;
  correlationId?: string;
}

// Example usage
logger.info('GRASP iteration complete', {
  component: 'grasp-loop',
  context: {
    iteration: 5,
    moveCount: 12,
    insight: 'naked-single-discovered'
  },
  correlationId: 'solve-abc123'
});
```

**FR-2.5.2: Log Levels and Filtering**

| Level | Purpose | Example |
|-------|---------|---------|
| DEBUG | Development debugging | Attention scores for all cells |
| INFO | Normal operation milestones | GRASP iteration complete, move validated |
| WARN | Degraded operation | Fallback to simpler strategy, retry attempt |
| ERROR | Component failures | Memory write failed, validation error |

**Default log level: INFO**

**FR-2.5.3: Performance Monitoring**

System SHALL track key performance metrics:

```typescript
interface PerformanceMetrics {
  // Timing
  solveTimeMs: number;
  iterationTimeMs: number[];
  memoryQueryTimeMs: number[];

  // Resource Usage
  memoryUsageMB: number[];
  tokensUsed: number;

  // Quality
  successRate: number;
  errorRate: number;
  retryCount: number;

  // Component Health
  componentStatus: Map<string, 'healthy' | 'degraded' | 'failed'>;
}
```

**Metrics SHALL be:**
- Collected every iteration
- Aggregated every 10 iterations
- Exported to `./metrics/` directory every 60 seconds
- Available via `/metrics` endpoint (optional HTTP server)

**Acceptance Criteria:**
- Logging overhead <5% of total execution time
- Log files rotated at 100MB
- Metrics exported in Prometheus format (optional)
- Performance dashboard available (demo mode)

### 2.6 Day Cycle vs Night Cycle Orchestration

**FR-2.6.1: Day Cycle (Solving Phase)**

The Day Cycle runs the GRASP loop to solve puzzles:

```typescript
class DayCycleOrchestrator {
  async execute(puzzle: PuzzleState, config: POCConfig): Promise<SolveResult> {
    // Phase 1: Initialize solving session
    const sessionId = this.initializeSession(puzzle);

    // Phase 2: GRASP loop
    let iteration = 0;
    while (!this.isSolved(puzzle) && iteration < config.maxIterations) {
      // Generate candidates
      const moves = await this.graspLoop.generate(puzzle);

      // Review and select best move
      const validation = await this.graspLoop.review(moves);

      // Absorb experience (log to memory)
      await this.graspLoop.absorb(validation);

      // Synthesize insights (query similar experiences)
      const insights = await this.graspLoop.synthesize(puzzle);

      // Persist state
      await this.graspLoop.persist(insights);

      // Scheduled reflection
      if (iteration % config.reflectionInterval === 0) {
        await this.triggerReflection();
      }

      iteration++;
    }

    // Phase 3: Session cleanup
    return this.finalizeSession(sessionId);
  }
}
```

**Acceptance Criteria:**
- Day cycle runs until puzzle solved or max iterations reached
- All experiences logged to memory system
- Attention mechanism guides focus each iteration
- Reflection triggers at configured intervals
- Session results exported for benchmarking

**FR-2.6.2: Night Cycle (Dreaming Phase)**

The Night Cycle consolidates day experiences into patterns:

```typescript
class NightCycleOrchestrator {
  async execute(sessionIds: string[], config: POCConfig): Promise<ConsolidatedKnowledge> {
    // Phase 1: Capture
    const experiences = await this.memorySystem.getExperiences(sessionIds);

    // Phase 2: Triage
    const significant = await this.dreamingPipeline.triage(experiences);

    // Phase 3: Deep Dreaming
    const compressed = await this.dreamingPipeline.compress(significant);
    const abstracted = await this.dreamingPipeline.abstract(compressed);
    const integrated = await this.dreamingPipeline.integrate(abstracted);

    // Phase 4: Pruning
    const pruned = await this.dreamingPipeline.prune(integrated);

    // Phase 5: Verification
    const verified = await this.dreamingPipeline.verify(pruned);

    // Phase 6: Persist consolidated knowledge
    await this.memorySystem.storeKnowledge(verified);

    return verified;
  }
}
```

**Acceptance Criteria:**
- Night cycle triggers based on `dreamingSchedule` config
- Consolidation completes in <60 seconds for 100 experiences
- Compression ratio >10:1 for significant experiences
- Abstraction ladder has 3+ levels
- Verified knowledge stored in memory system

**FR-2.6.3: Cycle Scheduling**

```typescript
enum DreamingSchedule {
  AFTER_SESSION = 'after-session',  // Dream after each puzzle solved
  PERIODIC = 'periodic',            // Dream every N puzzles
  MANUAL = 'manual'                 // Dream on explicit command
}

class CycleScheduler {
  private sessionCount = 0;

  shouldTriggerDreaming(config: POCConfig): boolean {
    switch (config.dreamingSchedule) {
      case 'after-session':
        return true; // Always dream after session

      case 'periodic':
        this.sessionCount++;
        return this.sessionCount % 10 === 0; // Dream every 10 sessions

      case 'manual':
        return false; // Only on explicit command
    }
  }
}
```

**Acceptance Criteria:**
- Dreaming triggered according to schedule
- Manual dreaming command available via CLI
- Dreaming can be skipped if no new experiences
- Cycle transitions logged clearly

### 2.7 CLI Interface Design

**FR-2.7.1: Command Structure**

System SHALL provide CLI commands for all POC operations:

```bash
# Solve a single puzzle
npx tsx src/cli.ts solve <puzzle-file> [options]

# Run benchmark suite
npx tsx src/cli.ts benchmark <suite-name> [options]

# Trigger manual dreaming
npx tsx src/cli.ts dream [--sessions <session-ids>]

# Run demo script
npx tsx src/cli.ts demo <script-name> [options]

# Export metrics/results
npx tsx src/cli.ts export <type> [--output <dir>]

# System utilities
npx tsx src/cli.ts init        # Initialize POC environment
npx tsx src/cli.ts status      # Check system health
npx tsx src/cli.ts cleanup     # Clear temporary data
```

**FR-2.7.2: Solve Command Options**

```bash
npx tsx src/cli.ts solve <puzzle-file> \
  --memory-system [reasoningbank|agentdb] \
  --max-iterations <number> \
  --reflection-interval <number> \
  --enable-rl \
  --enable-reflexion \
  --enable-skill-library \
  --log-level [debug|info|warn|error] \
  --output <result-file> \
  --demo-mode \
  --demo-speed [realtime|fast|instant]
```

**Example:**
```bash
# Solve hard Sudoku with AgentDB + RL in demo mode
npx tsx src/cli.ts solve puzzles/hard-01.json \
  --memory-system agentdb \
  --enable-rl \
  --demo-mode \
  --demo-speed realtime
```

**FR-2.7.3: Benchmark Command Options**

```bash
npx tsx src/cli.ts benchmark <suite-name> \
  --baseline [single-shot|naive-continuous|grasp|all] \
  --difficulty [easy|medium|hard|expert|all] \
  --count <number> \
  --output <report-dir>
```

**Example:**
```bash
# Run comprehensive benchmark comparing all baselines
npx tsx src/cli.ts benchmark full \
  --baseline all \
  --difficulty all \
  --count 50 \
  --output ./benchmarks/$(date +%Y%m%d)
```

**FR-2.7.4: Demo Command**

```bash
npx tsx src/cli.ts demo <script-name> \
  --pause-after-step \
  --export-recording <video-file>
```

**Available scripts:**
- `stakeholder-presentation`: Full 10-minute demo (5 acts)
- `quick-demo`: 3-minute overview
- `transfer-learning`: Focus on transfer testing
- `dreaming-visualization`: Consolidation process

**Acceptance Criteria:**
- All commands provide `--help` documentation
- Invalid arguments rejected with clear error messages
- Progress displayed with spinner/progress bar
- Results exported in JSON and human-readable formats
- Exit codes: 0 (success), 1 (failure), 2 (partial success)

### 2.8 Demo Execution Flow

**FR-2.8.1: Stakeholder Presentation Script**

The system SHALL support a scripted demo for stakeholder presentations:

```typescript
interface DemoScript {
  name: string;
  acts: DemoAct[];
  totalDurationMinutes: number;
}

interface DemoAct {
  actNumber: number;
  title: string;
  durationMinutes: number;
  steps: DemoStep[];
}

interface DemoStep {
  stepNumber: number;
  description: string;
  action: () => Promise<void>;
  visualizations: Visualization[];
  narrative: string; // Spoken explanation
  pauseAfter?: boolean;
}
```

**Full Demo Script (10 minutes):**

```typescript
const stakeholderDemo: DemoScript = {
  name: 'stakeholder-presentation',
  totalDurationMinutes: 10,
  acts: [
    {
      actNumber: 1,
      title: 'The Struggling Beginner',
      durationMinutes: 2,
      steps: [
        {
          stepNumber: 1,
          description: 'Show hard Sudoku puzzle',
          action: async () => loadPuzzle('puzzles/hard-showcase.json'),
          visualizations: [{ type: 'grid', highlight: 'empty-cells' }],
          narrative: 'Here\'s a difficult Sudoku puzzle that would challenge most humans.'
        },
        {
          stepNumber: 2,
          description: 'Attempt single-shot solve',
          action: async () => singleShotSolve(),
          visualizations: [{ type: 'thinking-process', show: 'single-attempt' }],
          narrative: 'Watch what happens when AI tries to solve this in one attempt...'
        },
        {
          stepNumber: 3,
          description: 'Show failure/errors',
          action: async () => displayErrors(),
          visualizations: [{ type: 'error-highlights' }],
          narrative: 'It fails. This is how AI normally works - one attempt, no learning.',
          pauseAfter: true
        }
      ]
    },
    {
      actNumber: 2,
      title: 'Continuous Thinking Emerges',
      durationMinutes: 3,
      steps: [
        {
          stepNumber: 1,
          description: 'Start GRASP loop on same puzzle',
          action: async () => startGRASPLoop(),
          visualizations: [
            { type: 'grid', highlight: 'focus-cell' },
            { type: 'iteration-counter' }
          ],
          narrative: 'Now watch what happens with continuous thinking enabled...'
        },
        {
          stepNumber: 2,
          description: 'Show iterations progressing',
          action: async () => runIterations(10),
          visualizations: [
            { type: 'grid', animate: 'fills' },
            { type: 'candidate-reduction', live: true },
            { type: 'attention-heatmap' }
          ],
          narrative: 'It explores... narrows candidates... learns from mistakes...'
        },
        {
          stepNumber: 3,
          description: 'Highlight strategy emergence',
          action: async () => detectStrategyChange(),
          visualizations: [{ type: 'strategy-timeline' }],
          narrative: 'Notice how strategies evolve - from simple to advanced techniques.'
        },
        {
          stepNumber: 4,
          description: 'Show successful solution',
          action: async () => completeSolve(),
          visualizations: [
            { type: 'grid', highlight: 'solved' },
            { type: 'metrics', show: ['iterations', 'strategies', 'time'] }
          ],
          narrative: 'Solved! This is continuous thinking - exploring, learning, adapting.',
          pauseAfter: true
        }
      ]
    },
    {
      actNumber: 3,
      title: 'The Night of Dreams',
      durationMinutes: 2,
      steps: [
        {
          stepNumber: 1,
          description: 'Trigger consolidation',
          action: async () => startDreaming(),
          visualizations: [{ type: 'phase-indicator', phase: 'dreaming' }],
          narrative: 'Now the AI "sleeps" and consolidates what it learned...'
        },
        {
          stepNumber: 2,
          description: 'Show compression',
          action: async () => runCompression(),
          visualizations: [
            { type: 'compression-animation', from: 47, to: 5 },
            { type: 'pattern-cards', patterns: extractedPatterns }
          ],
          narrative: '47 individual experiences compressed into 5 reusable patterns.'
        },
        {
          stepNumber: 3,
          description: 'Reveal abstraction ladder',
          action: async () => buildLadder(),
          visualizations: [{ type: 'ladder', levels: 4, animated: true }],
          narrative: 'Watch it climb from specific instances to general principles...',
          pauseAfter: true
        }
      ]
    },
    {
      actNumber: 4,
      title: 'The Transfer Test',
      durationMinutes: 2,
      steps: [
        {
          stepNumber: 1,
          description: 'Introduce 16x16 variant',
          action: async () => loadPuzzle('puzzles/16x16-hard.json'),
          visualizations: [{ type: 'grid', size: '16x16' }],
          narrative: 'New challenge: 16×16 Sudoku - twice as complex.'
        },
        {
          stepNumber: 2,
          description: 'Solve with learned knowledge',
          action: async () => solveWithTransfer(),
          visualizations: [
            { type: 'grid', size: '16x16', animate: true },
            { type: 'skill-application', show: 'transferred-patterns' }
          ],
          narrative: 'Watch it apply learned strategies immediately...'
        },
        {
          stepNumber: 3,
          description: 'Compare to baseline',
          action: async () => showComparison(),
          visualizations: [
            { type: 'comparison-chart', metrics: ['time', 'iterations', 'success'] }
          ],
          narrative: '+35% improvement over no dreaming. That\'s real intelligence.',
          pauseAfter: true
        }
      ]
    },
    {
      actNumber: 5,
      title: 'The Vision',
      durationMinutes: 1,
      steps: [
        {
          stepNumber: 1,
          description: 'Display final abstraction ladder',
          action: async () => showFullLadder(),
          visualizations: [{ type: 'ladder', levels: 4, annotated: true }],
          narrative: 'This is the beginning of machines that learn from experience.'
        },
        {
          stepNumber: 2,
          description: 'Show metrics dashboard',
          action: async () => displayMetrics(),
          visualizations: [{ type: 'metrics-dashboard', comprehensive: true }],
          narrative: '+47% solve rate, 15:1 compression, 4 abstraction levels.'
        }
      ]
    }
  ]
};
```

**FR-2.8.2: Demo Execution Engine**

```typescript
class DemoExecutor {
  async run(script: DemoScript, options: DemoOptions): Promise<void> {
    for (const act of script.acts) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`ACT ${act.actNumber}: ${act.title}`);
      console.log(`${'='.repeat(60)}\n`);

      for (const step of act.steps) {
        // Display narrative
        console.log(`\n${step.narrative}\n`);

        // Execute action
        await step.action();

        // Render visualizations
        for (const viz of step.visualizations) {
          await this.renderVisualization(viz, options);
        }

        // Pause if requested
        if (step.pauseAfter || options.pauseAfterStep) {
          await this.waitForKeypress();
        }

        // Speed control
        if (options.demoSpeed === 'realtime') {
          await this.naturalPause(2000);
        }
      }
    }
  }

  private async renderVisualization(viz: Visualization, options: DemoOptions): Promise<void> {
    if (viz.type === 'grid') {
      this.renderGrid(viz);
    } else if (viz.type === 'compression-animation') {
      await this.animateCompression(viz);
    } else if (viz.type === 'ladder') {
      this.renderAbstractionLadder(viz);
    }
    // ... other visualization types
  }
}
```

**Acceptance Criteria:**
- Demo script executes without errors
- Visualizations render clearly in terminal
- Narrative timing feels natural (not rushed)
- Pause points allow stakeholder questions
- Recording export captures all output
- Demo completes in 10 minutes ± 1 minute

---

## 3. Non-Functional Requirements

### 3.1 Performance Targets

**NFR-3.1.1: Initialization Performance**
- System initialization: <5 seconds (ReasoningBank) or <30 seconds (AgentDB)
- Component registration: <1 second
- Configuration loading: <100ms

**NFR-3.1.2: Runtime Performance**
- Event delivery latency: <10ms (95th percentile)
- GRASP iteration overhead: <5% of total iteration time
- Memory query overhead: <100ms per query
- Logging overhead: <5% of total execution time

**NFR-3.1.3: Shutdown Performance**
- Graceful shutdown: <10 seconds
- Forced shutdown: <30 seconds (with timeout)

### 3.2 Memory Constraints

**NFR-3.2.1: Memory Usage Limits**
- Maximum heap size: 2GB
- Event queue: <10MB
- Log buffer: <50MB
- Metrics buffer: <10MB

**NFR-3.2.2: Memory Leak Prevention**
- Event listeners properly cleaned up on unsubscribe
- File handles closed after use
- Database connections pooled and released
- No circular references in event payloads

### 3.3 Error Handling

**NFR-3.3.1: Error Recovery**
- Transient errors: Auto-retry up to 3 times
- Component failures: Graceful degradation to fallback
- Critical errors: Export state before shutdown

**NFR-3.3.2: Error Reporting**
- All errors logged with full context
- Error reports exportable for debugging
- Stakeholder-friendly error messages (demo mode)

### 3.4 Reliability

**NFR-3.4.1: Data Integrity**
- No data loss during normal shutdown
- Partial data recovery during crash
- Database transactions atomic (all-or-nothing)

**NFR-3.4.2: Availability**
- System uptime >99% during benchmark runs
- Component failures don't crash entire system
- Automatic recovery from transient failures

---

## 4. API/Interface Design

### 4.1 Public Orchestrator API

```typescript
/**
 * Main orchestrator class - system entry point
 */
export class POCOrchestrator {
  constructor(config: POCConfig);

  // Lifecycle
  async initialize(): Promise<void>;
  async start(): Promise<void>;
  async stop(): Promise<void>;
  async cleanup(): Promise<void>;

  // Solving
  async solvePuzzle(puzzle: PuzzleState): Promise<SolveResult>;
  async solveMultiple(puzzles: PuzzleState[]): Promise<SolveResult[]>;

  // Dreaming
  async triggerDreaming(sessionIds?: string[]): Promise<ConsolidatedKnowledge>;

  // Benchmarking
  async runBenchmark(suite: BenchmarkSuite): Promise<BenchmarkReport>;

  // Demo
  async runDemo(script: DemoScript, options: DemoOptions): Promise<void>;

  // System
  getStatus(): SystemStatus;
  getMetrics(): PerformanceMetrics;
  exportState(outputDir: string): Promise<void>;
}

interface SolveResult {
  puzzleId: string;
  success: boolean;
  solveTime: number;
  iterations: number;
  finalState: PuzzleState;
  experiencesLogged: number;
  insightsDiscovered: number;
  errorsEncountered: SystemError[];
}

interface SystemStatus {
  initialized: boolean;
  running: boolean;
  components: Map<string, ComponentStatus>;
  memorySystem: 'reasoningbank' | 'agentdb';
  activeSessions: number;
  totalSolved: number;
  errorCount: number;
}

interface ComponentStatus {
  componentId: string;
  health: 'healthy' | 'degraded' | 'failed';
  lastHeartbeat: number;
  errorCount: number;
  metadata?: Record<string, any>;
}
```

### 4.2 Event Bus API

```typescript
/**
 * Type-safe event bus for component communication
 */
export class TypedEventBus implements EventBus {
  publish<T>(event: Event<T>): void;

  subscribe<T>(
    eventType: EventType,
    handler: (event: Event<T>) => void | Promise<void>
  ): Unsubscribe;

  subscribeOnce<T>(
    eventType: EventType,
    handler: (event: Event<T>) => void | Promise<void>
  ): Unsubscribe;

  // Debugging
  getEventHistory(limit?: number): Event[];
  clearHistory(): void;

  // Performance
  getMetrics(): EventBusMetrics;
}

type Unsubscribe = () => void;

interface EventBusMetrics {
  totalPublished: number;
  totalSubscribers: number;
  averageDeliveryTimeMs: number;
  queueSize: number;
  droppedEvents: number;
}
```

### 4.3 Configuration API

```typescript
/**
 * Configuration manager with validation and runtime updates
 */
export class ConfigManager {
  constructor(sources: ConfigSource[]);

  // Loading
  async load(): Promise<POCConfig>;
  merge(configs: Partial<POCConfig>[]): POCConfig;

  // Validation
  validate(config: POCConfig): ValidationResult;

  // Runtime updates
  async updateRuntime(updates: Partial<POCConfig>): Promise<void>;

  // Export
  export(format: 'json' | 'yaml'): string;

  // Access
  get(): POCConfig;
  get<K extends keyof POCConfig>(key: K): POCConfig[K];
}

interface ConfigSource {
  type: 'file' | 'env' | 'cli' | 'default';
  priority: number;
  load(): Promise<Partial<POCConfig>>;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

interface ValidationError {
  field: string;
  message: string;
  invalidValue: any;
}
```

### 4.4 Cycle Orchestrator APIs

```typescript
/**
 * Day cycle orchestrator (solving)
 */
export class DayCycleOrchestrator {
  constructor(
    graspLoop: GRASPLoop,
    memorySystem: ReasoningBankAdapter | AgentDBAdapter,
    attentionMechanism: AttentionMechanism,
    config: POCConfig
  );

  async execute(puzzle: PuzzleState): Promise<SolveResult>;
  async executeWithCallbacks(
    puzzle: PuzzleState,
    callbacks: SolveCallbacks
  ): Promise<SolveResult>;

  // Control
  pause(): void;
  resume(): void;
  stop(): void;
}

interface SolveCallbacks {
  onIterationStart?: (iteration: number) => void;
  onMoveGenerated?: (moves: Move[]) => void;
  onMoveValidated?: (result: ValidationResult) => void;
  onInsightDiscovered?: (insight: Insight) => void;
  onReflectionTriggered?: () => void;
  onIterationComplete?: (iteration: number) => void;
}

/**
 * Night cycle orchestrator (dreaming)
 */
export class NightCycleOrchestrator {
  constructor(
    memorySystem: ReasoningBankAdapter | AgentDBAdapter,
    dreamingPipeline: DreamingPipeline,
    config: POCConfig
  );

  async execute(sessionIds: string[]): Promise<ConsolidatedKnowledge>;
  async executeWithCallbacks(
    sessionIds: string[],
    callbacks: DreamCallbacks
  ): Promise<ConsolidatedKnowledge>;
}

interface DreamCallbacks {
  onPhaseStart?: (phase: DreamPhase) => void;
  onCompressionProgress?: (progress: number) => void;
  onAbstractionLevel?: (level: AbstractionLevel) => void;
  onPhaseComplete?: (phase: DreamPhase) => void;
}
```

---

## 5. Implementation Notes

### 5.1 Component Initialization Order

**Critical dependency resolution:**

```typescript
// 1. Configuration MUST load first
const config = await configManager.load();

// 2. Logging depends on config
const logger = new Logger(config.logLevel, config.logOutputDir);

// 3. Memory system depends on config
const memorySystem = config.memorySystem === 'agentdb'
  ? new AgentDBAdapter(config)
  : new ReasoningBankAdapter(config);

// 4. Puzzle engine has no dependencies
const puzzleEngine = new PuzzleEngine();

// 5. GRASP loop depends on memory
const graspLoop = new GRASPLoop(memorySystem, puzzleEngine);

// 6. Attention depends on puzzle engine
const attentionMechanism = new AttentionMechanism(puzzleEngine);

// 7. Dreaming depends on memory
const dreamingPipeline = new DreamingPipeline(memorySystem);

// 8. Event bus can start anytime
const eventBus = new TypedEventBus();

// 9. Orchestrators depend on everything
const dayCycle = new DayCycleOrchestrator(
  graspLoop, memorySystem, attentionMechanism, config
);
const nightCycle = new NightCycleOrchestrator(
  memorySystem, dreamingPipeline, config
);
```

### 5.2 Key Algorithms

**Algorithm 1: Event Correlation**

```typescript
// Generate correlation ID for related events
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Track related events across components
class EventCorrelator {
  private correlations = new Map<string, Event[]>();

  track(event: Event): void {
    if (!event.correlationId) return;

    const related = this.correlations.get(event.correlationId) || [];
    related.push(event);
    this.correlations.set(event.correlationId, related);

    // Cleanup old correlations (>1 hour)
    this.pruneOld(3600000);
  }

  getRelated(correlationId: string): Event[] {
    return this.correlations.get(correlationId) || [];
  }
}
```

**Algorithm 2: Graceful Shutdown**

```typescript
class GracefulShutdown {
  private shutdownHandlers: (() => Promise<void>)[] = [];
  private shutdownInProgress = false;

  register(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }

  async execute(timeout: number = 10000): Promise<void> {
    if (this.shutdownInProgress) return;
    this.shutdownInProgress = true;

    logger.info('Starting graceful shutdown');

    const shutdownPromise = this.runHandlers();
    const timeoutPromise = this.sleep(timeout);

    const result = await Promise.race([
      shutdownPromise,
      timeoutPromise.then(() => 'timeout')
    ]);

    if (result === 'timeout') {
      logger.warn('Shutdown timeout exceeded, forcing exit');
    }

    process.exit(0);
  }

  private async runHandlers(): Promise<void> {
    // Run in reverse registration order (reverse dependencies)
    for (const handler of this.shutdownHandlers.reverse()) {
      try {
        await handler();
      } catch (error) {
        logger.error('Shutdown handler failed', { error });
      }
    }
  }
}
```

**Algorithm 3: Demo Script Execution with Timing**

```typescript
class DemoExecutor {
  private startTime: number;

  async run(script: DemoScript, options: DemoOptions): Promise<void> {
    this.startTime = Date.now();

    for (const act of script.acts) {
      const actStart = Date.now();
      const actBudget = act.durationMinutes * 60 * 1000;

      await this.executeAct(act, options);

      const actElapsed = Date.now() - actStart;

      // Warn if running over budget
      if (actElapsed > actBudget) {
        logger.warn(`Act ${act.actNumber} over budget`, {
          budget: actBudget,
          elapsed: actElapsed,
          overage: actElapsed - actBudget
        });
      }

      // Speed adjustment for remaining acts
      if (actElapsed > actBudget && options.demoSpeed === 'realtime') {
        options.demoSpeed = 'fast'; // Speed up to recover time
      }
    }
  }
}
```

### 5.3 Edge Cases to Handle

**Edge Case 1: Memory System Unavailable**
- Fallback to in-memory only (no persistence)
- Log warning prominently
- Continue solving but skip dreaming

**Edge Case 2: GRASP Loop Infinite Iteration**
- Enforce hard `maxIterations` limit
- Detect plateaus (no progress for N iterations)
- Early termination with partial results

**Edge Case 3: Event Bus Queue Overflow**
- Drop oldest events when queue exceeds limit
- Log dropped event types
- Circuit breaker on problematic publishers

**Edge Case 4: Demo Script Timing Overrun**
- Dynamic speed adjustment (realtime → fast → instant)
- Skip optional visualization steps
- Provide summary slide for overrun acts

**Edge Case 5: Configuration Conflicts**
- Reject incompatible config combinations (e.g., `enableRL=true` with `memorySystem=reasoningbank`)
- Clear error messages explaining conflict
- Suggest valid alternatives

### 5.4 Testing Strategy

**Unit Tests:**
- Event bus publish/subscribe correctness
- Configuration merging and validation
- Error classification and recovery
- Initialization order enforcement

**Integration Tests:**
- Full day cycle → night cycle → day cycle flow
- Component communication via events
- Memory system adapter swapping (ReasoningBank ↔ AgentDB)
- CLI command execution

**End-to-End Tests:**
- Complete solve → dream → transfer workflow
- Demo script execution without errors
- Benchmark suite completion
- Graceful shutdown under load

**Performance Tests:**
- Event delivery latency under load
- Memory usage over 100 iterations
- Shutdown time with various workloads

**Chaos Tests:**
- Component failure injection
- Network interruption simulation
- Memory system corruption recovery

---

## 6. Success Criteria

### 6.1 Functional Success Criteria

**SC-6.1.1: Lifecycle Management**
- [ ] All components initialize in correct order
- [ ] System starts in <5 seconds (ReasoningBank) or <30 seconds (AgentDB)
- [ ] Graceful shutdown completes without data loss
- [ ] Component health checks return accurate status

**SC-6.1.2: Event Communication**
- [ ] Events delivered to all subscribers within 10ms
- [ ] Event correlation enables end-to-end tracing
- [ ] Event handlers don't block main execution
- [ ] Event history available for last 1000 events

**SC-6.1.3: Configuration Management**
- [ ] Configuration loaded from all sources correctly
- [ ] Priority merging works as specified
- [ ] Invalid configurations rejected with clear errors
- [ ] Runtime updates applied within 1 iteration

**SC-6.1.4: Error Handling**
- [ ] Transient errors auto-retry successfully
- [ ] Circuit breakers prevent cascade failures
- [ ] Error reports contain full context
- [ ] System recovers from component failures

**SC-6.1.5: Cycle Orchestration**
- [ ] Day cycle runs until solved or max iterations
- [ ] Night cycle triggers according to schedule
- [ ] Cycle transitions logged clearly
- [ ] Manual dream command works

**SC-6.1.6: CLI Interface**
- [ ] All commands execute without errors
- [ ] Help documentation accurate
- [ ] Progress indicators work correctly
- [ ] Results exported in specified formats

**SC-6.1.7: Demo Execution**
- [ ] Stakeholder demo completes in 10 minutes ± 1 minute
- [ ] All visualizations render correctly
- [ ] Pause points allow interaction
- [ ] Recording export captures all output

### 6.2 Non-Functional Success Criteria

**SC-6.2.1: Performance**
- [ ] Initialization: <5s (ReasoningBank) or <30s (AgentDB)
- [ ] Event latency: <10ms (95th percentile)
- [ ] GRASP overhead: <5% of iteration time
- [ ] Logging overhead: <5% of execution time

**SC-6.2.2: Memory**
- [ ] Heap usage: <2GB
- [ ] Event queue: <10MB
- [ ] No memory leaks over 100 iterations

**SC-6.2.3: Reliability**
- [ ] System uptime >99% during benchmarks
- [ ] No data loss during normal shutdown
- [ ] Partial recovery from crashes

**SC-6.2.4: Usability**
- [ ] CLI commands intuitive for stakeholders
- [ ] Error messages actionable
- [ ] Demo mode output presentation-ready

### 6.3 Integration Success Criteria

**SC-6.3.1: Component Integration**
- [ ] Puzzle Engine ↔ GRASP Loop integration verified
- [ ] Memory System ↔ GRASP Loop integration verified
- [ ] Attention Mechanism ↔ GRASP Loop integration verified
- [ ] Dreaming Pipeline ↔ Memory System integration verified

**SC-6.3.2: Memory System Compatibility**
- [ ] ReasoningBank adapter passes all tests
- [ ] AgentDB adapter passes all tests (if evaluated)
- [ ] Adapter swapping works without code changes

**SC-6.3.3: End-to-End Workflows**
- [ ] Solve → Dream → Transfer workflow completes
- [ ] Benchmark suite runs to completion
- [ ] Demo script executes without manual intervention

### 6.4 Acceptance Tests

**Test 1: Complete Solve Workflow**
```bash
# Given a hard Sudoku puzzle
npx tsx src/cli.ts solve puzzles/hard-01.json \
  --memory-system reasoningbank \
  --output results/test-1.json

# Expected outcomes:
# - Puzzle solved or max iterations reached
# - Experiences logged to memory
# - Results exported successfully
# - Exit code 0 (success) or 2 (partial)
```

**Test 2: Dream Cycle Trigger**
```bash
# Given 10 completed solving sessions
# When triggering manual dream
npx tsx src/cli.ts dream --sessions session-001 session-002 ... session-010

# Expected outcomes:
# - Consolidation completes in <60 seconds
# - Patterns extracted (compression >10:1)
# - Abstraction ladder built (3+ levels)
# - Knowledge stored in memory system
```

**Test 3: Demo Script Execution**
```bash
# When running stakeholder demo
npx tsx src/cli.ts demo stakeholder-presentation \
  --pause-after-step \
  --export-recording demo-$(date +%Y%m%d).mp4

# Expected outcomes:
# - Demo completes in 10 minutes ± 1 minute
# - All 5 acts execute successfully
# - Visualizations render correctly
# - Recording exported
```

**Test 4: Benchmark Suite**
```bash
# When running comprehensive benchmark
npx tsx src/cli.ts benchmark full \
  --baseline all \
  --difficulty all \
  --count 50

# Expected outcomes:
# - 50 puzzles × 4 baselines = 200 runs
# - Completes in <60 minutes
# - Metrics collected for all runs
# - Report generated with visualizations
```

**Test 5: Graceful Shutdown**
```bash
# Given system running long benchmark
# When SIGTERM sent during iteration
kill -TERM <pid>

# Expected outcomes:
# - Current iteration completes
# - Partial results exported
# - Database connections closed
# - No data corruption
# - Shutdown in <10 seconds
```

**Test 6: Configuration Override**
```bash
# Given config file with reasoningbank
# When CLI overrides to agentdb
npx tsx src/cli.ts solve puzzles/easy-01.json \
  --memory-system agentdb \
  --enable-rl

# Expected outcomes:
# - CLI args override config file
# - AgentDB initialized successfully
# - RL learning enabled
# - Solve completes
```

**Test 7: Error Recovery**
```bash
# Simulate memory system failure
# (inject error in test mode)
npx tsx src/cli.ts solve puzzles/medium-01.json \
  --test-inject-error memory-failure-iteration-5

# Expected outcomes:
# - Iteration 5 memory write fails
# - System retries 3 times
# - Falls back to in-memory only
# - Warning logged prominently
# - Solve continues
# - Dream cycle skipped (no persistence)
```

---

## 7. Appendix

### 7.1 Event Flow Diagrams

**Day Cycle Event Flow:**

```
CLI Command "solve"
    │
    ├─> SYSTEM_INIT
    │       └─> Component initializations
    │
    ├─> DAY_CYCLE_START
    │
    ├─> GRASP_ITERATION_START (iteration 1)
    │       ├─> GRASP_MOVE_GENERATED
    │       │       └─> MEMORY_QUERY_PERFORMED (querySimilar)
    │       ├─> GRASP_MOVE_VALIDATED
    │       │       └─> MEMORY_EXPERIENCE_LOGGED (logMove)
    │       ├─> GRASP_INSIGHT_DISCOVERED
    │       │       └─> MEMORY_EXPERIENCE_LOGGED (logInsight)
    │       └─> GRASP_ITERATION_COMPLETE
    │
    ├─> ATTENTION_REFLECTION_TRIGGERED (iteration 5)
    │       └─> MEMORY_PATTERN_EXTRACTED
    │
    ├─> ... (more iterations)
    │
    ├─> DAY_CYCLE_COMPLETE
    │       └─> BENCHMARK_METRIC_RECORDED
    │
    └─> SYSTEM_SHUTDOWN
```

**Night Cycle Event Flow:**

```
CLI Command "dream" OR Scheduled trigger
    │
    ├─> DREAM_CYCLE_START
    │
    ├─> DREAM_PHASE_CAPTURE
    │       └─> MEMORY_QUERY_PERFORMED (getExperiences)
    │
    ├─> DREAM_PHASE_TRIAGE
    │       └─> DREAM_CONSOLIDATION_PROGRESS (filter significant)
    │
    ├─> DREAM_PHASE_COMPRESS
    │       ├─> MEMORY_PATTERN_EXTRACTED (clustering)
    │       └─> DREAM_CONSOLIDATION_PROGRESS (47 → 5)
    │
    ├─> DREAM_PHASE_ABSTRACT
    │       ├─> DREAM_CONSOLIDATION_PROGRESS (level 0)
    │       ├─> DREAM_CONSOLIDATION_PROGRESS (level 1)
    │       ├─> DREAM_CONSOLIDATION_PROGRESS (level 2)
    │       └─> DREAM_CONSOLIDATION_PROGRESS (level 3)
    │
    ├─> DREAM_PHASE_INTEGRATE
    │       └─> MEMORY_PATTERN_EXTRACTED (cross-connections)
    │
    ├─> DREAM_PHASE_PRUNE
    │       └─> DREAM_CONSOLIDATION_PROGRESS (remove redundant)
    │
    ├─> DREAM_PHASE_VERIFY
    │       └─> MEMORY_EXPERIENCE_LOGGED (storeKnowledge)
    │
    └─> DREAM_CYCLE_COMPLETE
```

### 7.2 Configuration Examples

**Example 1: Minimal Configuration (defaults)**
```json
{
  "memorySystem": "reasoningbank",
  "maxSolveTime": 300000,
  "reflectionInterval": 5,
  "dreamingSchedule": "after-session"
}
```

**Example 2: AgentDB with Full Features**
```json
{
  "memorySystem": "agentdb",
  "enableRL": true,
  "enableReflexion": true,
  "enableSkillLibrary": true,
  "maxSolveTime": 600000,
  "reflectionInterval": 3,
  "dreamingSchedule": "periodic",
  "maxIterations": 100,
  "attentionWindowSize": 20,
  "enableBenchmarking": true,
  "benchmarkOutputDir": "./benchmarks",
  "logLevel": "info",
  "logOutputDir": "./logs"
}
```

**Example 3: Demo Mode Configuration**
```json
{
  "memorySystem": "reasoningbank",
  "maxSolveTime": 180000,
  "reflectionInterval": 5,
  "dreamingSchedule": "manual",
  "demoMode": true,
  "demoSpeed": "realtime",
  "logLevel": "warn"
}
```

**Example 4: Performance Testing Configuration**
```json
{
  "memorySystem": "reasoningbank",
  "maxSolveTime": 60000,
  "reflectionInterval": 10,
  "dreamingSchedule": "manual",
  "maxIterations": 50,
  "enableBenchmarking": true,
  "logLevel": "error"
}
```

### 7.3 CLI Command Reference

**Full CLI Grammar:**

```bash
npx tsx src/cli.ts <command> [arguments] [options]

Commands:
  solve <puzzle-file>              Solve a single puzzle
  benchmark <suite-name>           Run benchmark suite
  dream [--sessions <ids>]         Trigger consolidation
  demo <script-name>               Execute demo script
  export <type> [--output <dir>]   Export results/metrics
  init                             Initialize POC environment
  status                           Check system health
  cleanup                          Clear temporary data

Global Options:
  --config <file>                  Configuration file (.poc-config.json)
  --log-level <level>              debug|info|warn|error (default: info)
  --help                           Show help
  --version                        Show version

Solve Options:
  --memory-system <system>         reasoningbank|agentdb (default: reasoningbank)
  --max-iterations <number>        Maximum GRASP iterations (default: 50)
  --max-solve-time <ms>            Maximum solve time in ms (default: 300000)
  --reflection-interval <number>   Iterations between reflections (default: 5)
  --enable-rl                      Enable RL learning (AgentDB only)
  --enable-reflexion               Enable reflexion memory (AgentDB only)
  --enable-skill-library           Enable skill library (AgentDB only)
  --dreaming-schedule <schedule>   after-session|periodic|manual (default: after-session)
  --output <file>                  Result output file (.json)
  --demo-mode                      Enable demo presentation mode
  --demo-speed <speed>             realtime|fast|instant (default: realtime)

Benchmark Options:
  --baseline <type>                single-shot|naive-continuous|grasp|all (default: all)
  --difficulty <level>             easy|medium|hard|expert|all (default: all)
  --count <number>                 Puzzles per difficulty (default: 50)
  --output <dir>                   Benchmark report directory

Demo Options:
  --pause-after-step               Wait for keypress after each step
  --export-recording <file>        Export demo recording (.mp4)
  --skip-act <number>              Skip specified act (testing only)

Export Options:
  --type <type>                    metrics|results|config|logs|all (default: all)
  --output <dir>                   Export directory (default: ./export)
  --format <format>                json|csv|markdown (default: json)
```

### 7.4 Error Code Reference

| Exit Code | Meaning | Example |
|-----------|---------|---------|
| 0 | Success | Puzzle solved, no errors |
| 1 | Failure | Puzzle unsolvable, critical error |
| 2 | Partial Success | Timeout but partial progress, warnings |
| 3 | Configuration Error | Invalid config, missing required field |
| 4 | Initialization Error | Component failed to initialize |
| 5 | System Error | Unexpected exception, crash |

### 7.5 Troubleshooting Guide

**Problem: System fails to initialize**
- Check configuration file syntax (valid JSON)
- Verify memory system selection matches installed adapter
- Ensure Node.js version ≥20
- Check logs in `./logs/errors/` for details

**Problem: GRASP loop not making progress**
- Increase `maxIterations` limit
- Decrease `reflectionInterval` for more frequent reflection
- Check puzzle difficulty (may be too hard for POC)
- Enable `logLevel: debug` to see iteration details

**Problem: Dreaming produces trivial patterns**
- Ensure sufficient experiences (≥20 sessions)
- Check compression threshold (may be too aggressive)
- Verify abstraction ladder has multiple levels
- Review triage filters (may be excluding important experiences)

**Problem: Demo runs too slow**
- Reduce puzzle difficulty for demo
- Set `demoSpeed: fast` or `instant`
- Skip optional visualization steps
- Increase `reflectionInterval` to reduce iterations

**Problem: Memory usage grows unbounded**
- Check event queue size (may need cleanup)
- Verify event listeners are unsubscribed properly
- Clear old correlation data
- Reduce `attentionWindowSize`

---

**End of Specification**

This specification is ready for implementation by the development team. All requirements are testable, measurable, and aligned with the POC strategy document.
