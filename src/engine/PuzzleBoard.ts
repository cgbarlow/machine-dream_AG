
import { Grid, Cell, PuzzleState, ValidationResult } from '../types';
import { SudokuRules } from './SudokuRules';

export class PuzzleBoard {
    private _grid: Grid;
    private _size: 9 | 16;

    constructor(size: 9 | 16 = 9) {
        this._size = size;
        this._grid = Array(size).fill(0).map(() => Array(size).fill(0));
    }

    /**
     * Loads a grid into the board.
     * @param grid Source grid
     */
    public loadGrid(grid: Grid): void {
        if (grid.length !== this._size || grid[0].length !== this._size) {
            throw new Error(`Invalid grid size. Expected ${this._size}x${this._size}.`);
        }
        // Deep copy to prevent external mutation
        this._grid = grid.map(row => [...row]);
    }

    /**
     * Places a value on the board.
     * @param cell Target cell
     * @param value Value to place
     * @returns Validation result
     */
    public placeValue(cell: Cell, value: number): ValidationResult {
        // Basic bounds check
        if (cell.row < 0 || cell.row >= this._size || cell.col < 0 || cell.col >= this._size) {
            return {
                move: { cell, value, strategy: 'invalid', timestamp: Date.now() },
                isValid: false,
                outcome: 'failure',
                error: new Error(`Cell out of bounds: ${cell.row},${cell.col}`),
                nextState: this.getState()
            };
        }

        // Check constraints
        if (!SudokuRules.isValidMove(this._grid, cell, value)) {
            return {
                move: { cell, value, strategy: 'check', timestamp: Date.now() },
                isValid: false,
                outcome: 'failure',
                error: new Error(`Constraint violation for value ${value} at ${cell.row},${cell.col}`),
                nextState: this.getState()
            };
        }

        // Apply move
        this._grid[cell.row][cell.col] = value;

        return {
            move: { cell, value, strategy: 'manual', timestamp: Date.now() },
            isValid: true,
            outcome: 'success',
            nextState: this.getState()
        };
    }

    /**
     * Gets the current grid state.
     * @returns Deep copy of the grid
     */
    public getGrid(): Grid {
        return this._grid.map(row => [...row]);
    }

    /**
     * Returns the full PuzzleState snapshot.
     */
    public getState(): PuzzleState {
        return {
            grid: this.getGrid(),
            candidates: new Map(), // To be implemented by candidate manager
            moveHistory: [],
            difficulty: 'easy'
        };
    }

    /**
     * Checks if the board is completely filled.
     */
    public isComplete(): boolean {
        for (let r = 0; r < this._size; r++) {
            for (let c = 0; c < this._size; c++) {
                if (this._grid[r][c] === 0) return false;
            }
        }
        return true;
    }
}
