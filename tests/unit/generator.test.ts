
import { describe, it, expect } from 'vitest';
import { SudokuGenerator } from '../../src/engine/SudokuGenerator';

describe('SudokuGenerator', () => {
    const generator = new SudokuGenerator();

    it('should generate a 9x9 grid', () => {
        const grid = generator.generate(30);
        expect(grid.length).toBe(9);
        expect(grid[0].length).toBe(9);
    });

    it('should have valid numbers (0-9)', () => {
        const grid = generator.generate(20);
        grid.flat().forEach(cell => {
            expect(cell).toBeGreaterThanOrEqual(0);
            expect(cell).toBeLessThanOrEqual(9);
        });
    });

    it('should adhere to Sudoku constraints (ignoring 0s)', () => {
        const grid = generator.generate(10); // Remove few to keep it dense

        // Row check
        for (let r = 0; r < 9; r++) {
            const rowValues = grid[r].filter(c => c !== 0);
            const set = new Set(rowValues);
            expect(set.size).toBe(rowValues.length);
        }
    });

    it('should produce different puzzles', () => {
        const grid1 = generator.generate(30);
        const grid2 = generator.generate(30);

        // Very unlikely to strictly equal
        expect(JSON.stringify(grid1)).not.toBe(JSON.stringify(grid2));
    });
});
