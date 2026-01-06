
import {
    OrchestratorConfig,
    SystemStatus,
    SolveResult
} from '../types';
import { AgentMemory } from '../memory/AgentMemory';
import { PuzzleBoard } from '../engine/PuzzleBoard';
import { GRASPController } from '../cognition/GRASPController';
import { DreamingController } from '../consolidation/DreamingController';

export class SystemOrchestrator {
    private config: OrchestratorConfig;
    private status: SystemStatus = 'initializing';

    // Components
    private memory: AgentMemory;
    private grasp!: GRASPController;
    private dreaming: DreamingController;

    constructor(config: OrchestratorConfig) {
        this.config = config;

        // Initialize components
        console.log('🚀 Initializing System Orchestrator...');
        this.memory = new AgentMemory(config);
        this.dreaming = new DreamingController(this.memory, config);

        // Note: GRASP and Board are typically instantiated per puzzle in this POC
        // but the system holds references to the singleton services (Memory, Dreaming)

        this.status = 'ready';
        console.log('✅ System Ready');
    }

    /**
     * Main entry point to solve a puzzle with full cognitive cycle.
     */
    public async solvePuzzle(puzzleGrid: number[][]): Promise<SolveResult> {
        if (this.status !== 'ready' && this.status !== 'running') {
            throw new Error(`System not ready (Status: ${this.status})`);
        }

        this.status = 'running';
        const startTime = Date.now();

        try {
            // 1. Initialize Session
            console.log('🧩 Starting Puzzle Solving Session...');
            const board = new PuzzleBoard(9);
            board.loadGrid(puzzleGrid);

            // Initialize GRASP for this specific puzzle
            this.grasp = new GRASPController(this.memory, board);

            let iteration = 0;
            let success = false;

            // 2. Run GRASP Loop (Day Cycle)
            while (iteration < this.config.maxIterations) {
                iteration++;
                const result = await this.grasp.executeIteration();

                if (result.outcome === 'success') {
                    if (board.isComplete()) {
                        success = true;
                        console.log(`🎉 Puzzle Solved in ${iteration} iterations!`);
                        break;
                    }
                } else if (result.outcome === 'failure') {
                    // In real system, we'd have backtracking here.
                    // For POC, we might just continue or stop.
                    console.log(`⚠️ Iteration ${iteration} failed: ${result.error?.message}`);
                }

                // Periodically reflect? (Managed by GRASP/Attention currently)
            }

            const duration = Date.now() - startTime;

            // 3. Run Dreaming Pipeline (Night Cycle) if configured
            if (this.config.dreamingSchedule === 'after-session') {
                this.status = 'dreaming';
                await this.dreaming.runDreamCycle('session-' + Date.now());
            }

            return {
                success,
                finalState: board.getState(),
                metrics: {
                    iterations: iteration,
                    duration,
                    insights: 0 // TODO: aggregate insights
                },
                experiences: [] // TODO: collect experiences
            };

        } catch (error) {
            this.status = 'error';
            console.error('❌ System Error:', error);
            throw error;
        } finally {
            if (this.status !== 'error') {
                this.status = 'ready';
            }
        }
    }

    public getStatus(): SystemStatus {
        return this.status;
    }
}
