
import { SystemOrchestrator } from './orchestration/SystemOrchestrator';
import { OrchestratorConfig } from './types';

async function main() {
    console.log('🧠 Machine Dream POC: Starting...');

    const config: OrchestratorConfig = {
        dbPath: './.agentdb',
        agentDbPath: './.agentdb',
        embeddingModel: 'Xenova/all-MiniLM-L6-v2',
        enableReasoningBank: true,
        enableReflexion: true,
        enableSkillLibrary: true,
        preset: 'large',
        rlPlugin: {
            type: 'decision-transformer',
            name: 'sudoku-solver',
            stateDim: 81,
            actionDim: 729,
            sequenceLength: 128
        },
        reflexion: {
            enabled: true,
            maxEntries: 1000,
            similarityThreshold: 0.8
        },
        skillLibrary: {
            enabled: true,
            minSuccessRate: 0.7,
            maxSkills: 50,
            autoConsolidate: true
        },
        quantization: 'scalar',
        indexing: 'hnsw',
        cacheEnabled: true,
        // Orchestrator Config
        maxIterations: 5, // Keep small for smoke test
        reflectionInterval: 2,
        dreamingSchedule: 'after-session',
        logLevel: 'info',
        demoMode: true
    };

    try {
        const orchestrator = new SystemOrchestrator(config);

        // Define a simple test puzzle (mostly empty)
        const puzzleGrid = Array(9).fill(0).map(() => Array(9).fill(0));
        puzzleGrid[0][0] = 5; // Start with one known value

        console.log('🏁 Starting End-to-End Orchestration Test...');
        const result = await orchestrator.solvePuzzle(puzzleGrid);

        console.log('✅ Orchestration Complete.');
        console.log(`Success: ${result.success}`);
        console.log(`Iterations: ${result.metrics.iterations}`);
        if (result.finalState && result.finalState.grid) {
            console.log(`Final State (Row 0): ${JSON.stringify(result.finalState.grid[0])}`);
        }

    } catch (error) {
        console.error('❌ Orchestration Failed:', error);
        process.exit(1);
    }
}

main();
