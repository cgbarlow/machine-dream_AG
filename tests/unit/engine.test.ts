
import { describe, it, expect, beforeEach } from 'vitest';
import { PuzzleBoard } from '../../src/engine/PuzzleBoard';

describe('PuzzleBoard (Spec 01)', () => {
    let board: PuzzleBoard;

    beforeEach(() => {
        board = new PuzzleBoard(9);
    });

    it('should initialize an empty 9x9 grid', () => {
        const state = board.getState();
        expect(state.grid.length).toBe(9);
        expect(state.grid[0].length).toBe(9);
        expect(state.grid[0][0]).toBe(0);
    });

    it('should allow valid moves', () => {
        const result = board.placeValue({ row: 0, col: 0 }, 5);
        expect(result.isValid).toBe(true);
        expect(result.outcome).toBe('success');
        expect(board.getState().grid[0][0]).toBe(5);
    });

    it('should reject invalid moves (Row Conflict)', () => {
        board.placeValue({ row: 0, col: 0 }, 5);
        const result = board.placeValue({ row: 0, col: 1 }, 5);

        expect(result.isValid).toBe(false);
        expect(result.outcome).toBe('failure');
        expect(result.error).toBeDefined();
        // Board state should remain unchanged at target
        expect(board.getState().grid[0][1]).toBe(0);
    });

    it('should reject invalid moves (Col Conflict)', () => {
        board.placeValue({ row: 0, col: 0 }, 5);
        const result = board.placeValue({ row: 1, col: 0 }, 5);
        expect(result.isValid).toBe(false);
    });

    it('should reject invalid moves (Box Conflict)', () => {
        board.placeValue({ row: 0, col: 0 }, 5);
        // (1,1) is in the same top-left box
        const result = board.placeValue({ row: 1, col: 1 }, 5);
        expect(result.isValid).toBe(false);
    });

    it('should detect completion', () => {
        expect(board.isComplete()).toBe(false);
        // We won't fill a whole board here, relying on generator tests for full fill validity
    });
});
