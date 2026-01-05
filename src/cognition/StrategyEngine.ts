
import { PuzzleState, Move } from '../types';

export class StrategyEngine {

    /**
     * Generates moves based on logical strategies.
     */
    public generateMoves(state: PuzzleState): Move[] {
        const moves: Move[] = [];

        // Strategy 1: Naked Single
        // Find cells that have only one valid candidate
        const nakedSingles = this.findNakedSingles(state);
        moves.push(...nakedSingles);

        // If no logical moves, fallback to "Check" (Brute force for POC)
        // but clearly marked as a search strategy, not just "mock"
        if (moves.length === 0) {
            this.generateSearchMoves(state, moves);
        }

        return moves;
    }

    private findNakedSingles(state: PuzzleState): Move[] {
        const moves: Move[] = [];
        const size = 9;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (state.grid[r][c] !== 0) continue;

                const candidates = this.getCandidates(state.grid, r, c);
                if (candidates.size === 1) {
                    const value = Array.from(candidates)[0];
                    moves.push({
                        cell: { row: r, col: c },
                        value: value,
                        strategy: 'naked-single',
                        timestamp: Date.now()
                    });
                }
            }
        }
        return moves;
    }

    private generateSearchMoves(state: PuzzleState, moves: Move[]) {
        // Find FIRST empty cell (heuristic: top-left)
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (state.grid[r][c] === 0) {
                    const candidates = this.getCandidates(state.grid, r, c);
                    for (const val of candidates) {
                        moves.push({
                            cell: { row: r, col: c },
                            value: val,
                            strategy: 'guess', // Or 'depth-first-search'
                            timestamp: Date.now()
                        });
                    }
                    return; // Only generate for one cell to avoid explosion
                }
            }
        }
    }

    private getCandidates(grid: number[][], row: number, col: number): Set<number> {
        const values = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        // Row
        for (let c = 0; c < 9; c++) {
            values.delete(grid[row][c]);
        }
        // Col
        for (let r = 0; r < 9; r++) {
            values.delete(grid[r][col]);
        }
        // Box
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let r = startRow; r < startRow + 3; r++) {
            for (let c = startCol; c < startCol + 3; c++) {
                values.delete(grid[r][c]);
            }
        }

        return values;
    }
}
