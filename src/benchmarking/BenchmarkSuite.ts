
import {
    BenchmarkResult,
    BenchmarkSuiteResult,
    BenchmarkType,
    OrchestratorConfig
} from '../types';
import { SystemOrchestrator } from '../orchestration/SystemOrchestrator';

export class BenchmarkSuite {
    private orchestrator: SystemOrchestrator;

    constructor(config: OrchestratorConfig) {
        this.orchestrator = new SystemOrchestrator(config);
    }

    public async runSuite(
        name: string,
        type: BenchmarkType,
        count: number = 5
    ): Promise<BenchmarkSuiteResult> {
        console.log(`📊 Starting Benchmark Suite: ${name} (${type})`);

        const results: BenchmarkResult[] = [];
        let solvedCount = 0;
        let totalIterations = 0;
        let totalSolveTime = 0;

        for (let i = 0; i < count; i++) {
            console.log(`   Running Test ${i + 1}/${count}...`);

            // Generate a random test puzzle
            // In real impl, load from dataset
            const grid = this.generateTestPuzzle();

            const result = await this.runSingleTest(type, grid, `puzzle-${i}`);
            results.push(result);

            if (result.success) {
                solvedCount++;
                totalSolveTime += result.solveTime;
                totalIterations += result.iterations;
            }
        }

        const avgTime = solvedCount > 0 ? totalSolveTime / solvedCount : 0;
        const avgIter = solvedCount > 0 ? totalIterations / solvedCount : 0;

        return {
            suiteName: name,
            timestamp: Date.now(),
            summary: {
                total: count,
                solved: solvedCount,
                failed: count - solvedCount,
                avgTime,
                avIterations: avgIter
            },
            details: results
        };
    }

    private async runSingleTest(type: BenchmarkType, grid: number[][], id: string): Promise<BenchmarkResult> {
        const start = Date.now();

        // We only support 'grasp-baseline' via orchestrator for this POC
        // Other types would require different logic/mocks
        let success = false;
        let iterations = 0;
        let strategies: string[] = [];

        try {
            const res = await this.orchestrator.solvePuzzle(grid);
            success = res.success;
            iterations = res.metrics.iterations;
        } catch (e) {
            console.error(`Test failed:`, e);
        }

        return {
            benchmarkType: type,
            puzzleId: id,
            difficulty: 'easy', // Mock
            success,
            solveTime: Date.now() - start,
            iterations,
            strategiesUsed: strategies,
            timestamp: Date.now()
        };
    }

    private generateTestPuzzle(): number[][] {
        // Return a mostly empty grid for POC
        // Real impl would use seed or dataset
        const grid = Array(9).fill(0).map(() => Array(9).fill(0));
        grid[0][0] = Math.floor(Math.random() * 9) + 1;
        return grid;
    }
}
