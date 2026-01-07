
import { Cell, Grid, ValidationResult } from '../types';

export class SudokuRules {
    /**
     * Checks if placing a value at a cell is valid according to Sudoku rules.
     *
     * @param grid - The Sudoku grid
     * @param cell - Target cell
     * @param value - Value to place
     * @returns True if move is valid (no constraint violations)
     */
    static isValidMove(grid: Grid, cell: Cell, value: number): boolean {
        // 0 is always valid (clearing a cell), though usually we check for non-zero in solving
        if (value === 0) return true;

        // Check row
        if (!this.isValidInRow(grid, cell.row, value)) return false;

        // Check column
        if (!this.isValidInColumn(grid, cell.col, value)) return false;

        // Check box
        if (!this.isValidInBox(grid, cell, value)) return false;

        return true;
    }

    /**
     * Checks if placing a value at given coordinates is valid.
     * Convenience method for puzzle generation.
     *
     * @param grid - The Sudoku grid
     * @param row - Row index
     * @param col - Column index
     * @param value - Value to place
     * @returns True if placement is valid
     */
    isValidPlacement(grid: Grid, row: number, col: number, value: number): boolean {
        return SudokuRules.isValidMove(grid, { row, col }, value);
    }

    /**
     * Validates entire grid for constraint satisfaction.
     *
     * @param grid - The Sudoku grid
     * @returns Validation result with all conflicts
     */
    static isValidGrid(grid: Grid): ValidationResult {
        // Basic implementation: check every non-zero cell
        // In a real optimized engine, we might do this more efficiently
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const value = grid[r][c];
                if (value !== 0) {
                    // Temporarily clear cell to check if it would be valid to place it there
                    const tempGrid = grid.map(row => [...row]);
                    tempGrid[r][c] = 0;
                    if (!this.isValidMove(tempGrid, { row: r, col: c }, value)) {
                        // For now, simple return on first failure. 
                        // Full implementation would collect all conflicts.
                        return {
                            move: { cell: { row: r, col: c }, value, strategy: 'check', timestamp: Date.now() },
                            isValid: false,
                            outcome: 'failure',
                            error: new Error(`Constraint violation at ${r},${c}`),
                            nextState: { grid, candidates: new Map(), moveHistory: [], difficulty: 'easy' }
                        };
                    }
                }
            }
        }

        return {
            move: { cell: { row: 0, col: 0 }, value: 0, strategy: 'check', timestamp: Date.now() },
            isValid: true,
            outcome: 'success',
            nextState: { grid, candidates: new Map(), moveHistory: [], difficulty: 'easy' }
        };
    }

    private static isValidInRow(grid: Grid, row: number, value: number): boolean {
        for (let c = 0; c < 9; c++) {
            if (grid[row][c] === value) return false;
        }
        return true;
    }

    private static isValidInColumn(grid: Grid, col: number, value: number): boolean {
        for (let r = 0; r < 9; r++) {
            if (grid[r][col] === value) return false;
        }
        return true;
    }

    private static isValidInBox(grid: Grid, cell: Cell, value: number): boolean {
        const boxRow = Math.floor(cell.row / 3) * 3;
        const boxCol = Math.floor(cell.col / 3) * 3;

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (grid[boxRow + r][boxCol + c] === value) return false;
            }
        }
        return true;
    }
}
