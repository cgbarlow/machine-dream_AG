
import {
    PuzzleState,
    Cell,
    Move,
    ValidationResult,
    AttentionContext,
    AttentionScore,
    Constraint,
    ProgressMetrics,
    Insight,
    InsightType,
    MoveOutcome,
    ReflectionResult
} from '../types';
import { SudokuRules } from '../engine/SudokuRules';

export class AttentionManager {
    private context: AttentionContext;
    private progressHistory: ProgressMetrics[] = [];

    // Weights (configurable in future)
    private weights = {
        uncertainty: 0.4,
        relevance: 0.3,
        importance: 0.2,
        recency: 0.1
    };

    constructor() {
        this.reset();
    }

    public reset(): void {
        // Basic initialization
        this.context = {
            currentState: {
                grid: [],
                candidates: new Map(),
                moveHistory: [],
                difficulty: 'easy'
            },
            recentMoves: [],
            lastVisited: new Map(),
            constraints: []
        };
        this.progressHistory = [];
    }

    /**
     * Updates the internal context with the latest puzzle state.
     */
    public updateContext(state: PuzzleState): void {
        this.context.currentState = state;
        // In a real implementation, we would also update the constraint network here
        this.context.constraints = this.calculateConstraints(state);
    }

    /**
     * Selects the next cell to focus on based on attention scores.
     */
    public selectFocus(state: PuzzleState): Cell {
        this.updateContext(state);
        const emptyCells = this.getEmptyCells(state.grid);

        if (emptyCells.length === 0) {
            return { row: 0, col: 0 }; // Should not happen if puzzle incomplete
        }

        const scores = emptyCells.map(cell => this.calculateAttentionScore(cell));

        // Sort descending by score
        scores.sort((a, b) => b.score - a.score);

        // Tie-breaking logic logic could go here (e.g., top 1%)
        return scores[0].cell;
    }

    /**
     * Calculates the detailed attention score for a single cell.
     */
    public calculateAttentionScore(cell: Cell): AttentionScore {
        const uncertainty = this.calculateUncertainty(cell);
        const relevance = this.calculateRelevance(cell);
        const importance = this.calculateImportance(cell);
        const recency = this.calculateRecency(cell);

        const score =
            this.weights.uncertainty * uncertainty +
            this.weights.relevance * relevance +
            this.weights.importance * importance +
            this.weights.recency * recency;

        return {
            cell,
            score,
            uncertainty,
            relevance,
            importance,
            recency
        };
    }

    // ==========================================
    // Component Calculators
    // ==========================================

    private calculateUncertainty(cell: Cell): number {
        const candidates = this.context.currentState.candidates.get(`${cell.row},${cell.col}`);
        const count = candidates ? candidates.size : 9;
        // Fewer candidates = Higher uncertainty (need to resolve it) / Higher priority
        return 1.0 / count;
    }

    private calculateRelevance(cell: Cell): number {
        if (this.context.recentMoves.length === 0) return 0;

        // Max relevance to any recent move
        let maxRel = 0;
        for (const move of this.context.recentMoves) {
            if (this.shareUnit(cell, move.cell)) {
                maxRel = 1.0;
                break;
            }
            // Distance based (simplified)
            const dist = Math.abs(cell.row - move.cell.row) + Math.abs(cell.col - move.cell.col);
            const rel = Math.max(0, 1.0 - (dist / 16)); // Normalize roughly
            if (rel > maxRel) maxRel = rel;
        }
        return maxRel;
    }

    private calculateImportance(cell: Cell): number {
        // Simplified: 1.0 if highly constrained (e.g. only 1 value possible in row), 0.0 otherwise
        // Real impl would analyze constraint network graph
        return 0.5;
    }

    private calculateRecency(cell: Cell): number {
        const key = `${cell.row},${cell.col}`;
        const lastTime = this.context.lastVisited.get(key);
        if (!lastTime) return 1.0; // Never visited = high priority to explore

        const diff = Date.now() - lastTime;
        // Exponential decay: e^(-0.001 * dt)
        return Math.exp(-0.001 * diff);
    }

    // ==========================================
    // Progress & Reflection
    // ==========================================

    public updateProgress(move: Move, outcome: ValidationResult): void {
        // Record move in context
        this.context.recentMoves.push(move);
        if (this.context.recentMoves.length > 10) {
            this.context.recentMoves.shift();
        }

        this.context.lastVisited.set(`${move.cell.row},${move.cell.col}`, Date.now());

        // Calculate metrics
        const startCells = 0; // Would be passed in real impl
        const currentFilled = 81 - this.getEmptyCells(this.context.currentState.grid).length;

        this.progressHistory.push({
            cellsFilled: currentFilled,
            percentComplete: currentFilled / 81,
            movesPerMinute: 0, // Todo
            successRate: outcome.outcome === 'success' ? 1.0 : 0.0,
            momentum: 'steady',
            plateauDuration: 0,
            currentStrategy: move.strategy,
            strategySuccessRate: 0.5,
            confidenceLevel: 0.8
        });
    }

    public shouldReflect(iteration: number, lastOutcome: MoveOutcome): boolean {
        // Reflect regularly + on failure
        if (iteration % 5 === 0) return true;
        if (lastOutcome === 'failure') return true;
        return false;
    }

    public detectInsights(): Insight[] {
        // Placeholder logic
        if (this.progressHistory.length > 5) {
            // Example heuristic: 3 successes in a row after failures
            // ...
        }
        return [];
    }

    // ==========================================
    // Helpers
    // ==========================================

    private getEmptyCells(grid: number[][]): Cell[] {
        const cells: Cell[] = [];
        if (!grid) return cells;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0) {
                    cells.push({ row: r, col: c });
                }
            }
        }
        return cells;
    }

    private shareUnit(c1: Cell, c2: Cell): boolean {
        if (c1.row === c2.row) return true;
        if (c1.col === c2.col) return true;
        const box1 = Math.floor(c1.row / 3) * 3 + Math.floor(c1.col / 3);
        const box2 = Math.floor(c2.row / 3) * 3 + Math.floor(c2.col / 3);
        return box1 === box2;
    }

    private calculateConstraints(state: PuzzleState): Constraint[] {
        // Stub: in real engine returning detailed constraint objects
        return [];
    }
}
